'use strict';
const test = require('node:test'),
  assert = require('node:assert/strict');
const { createClient } = require('../online-coach.js');
const buildMessages = (s, t) => [
  { role: 'system', content: 'Consignes' },
  { role: 'user', content: t },
];
const ok = (text) => ({
  ok: true,
  status: 200,
  json: async () => ({
    choices: [
      { finish_reason: 'stop', message: { content: text, reasoning_content: 'Ne pas afficher' } },
    ],
  }),
});
test('no request before explicit consent; POST only and no credentials or prompts in URL', async () => {
  const calls = [];
  const c = createClient({
    buildMessages,
    fetchFn: async (...args) => {
      calls.push(args);
      return ok('Une réponse.');
    },
  });
  await assert.rejects(c.load(), /Autorise/);
  await assert.rejects(c.generate({}, 'privé'), /Active/);
  assert.equal(calls.length, 0);
  await c.load({ consent: true });
  const texts = [];
  assert.equal(await c.generate({}, 'Question test', (s) => texts.push(s)), 'Une réponse.');
  assert.deepEqual(texts, ['Une réponse.']);
  assert.equal(calls.length, 1);
  const [url, options] = calls[0];
  assert.equal(url, 'https://text.pollinations.ai/openai');
  assert.equal(options.method, 'POST');
  assert.equal(options.credentials, 'omit');
  assert.equal(options.referrerPolicy, 'no-referrer');
  assert.deepEqual(Object.keys(options.headers), ['Content-Type']);
  assert.equal(JSON.parse(options.body).messages[1].content, 'Question test');
  await c.unload();
  assert.equal(c.ready, false);
});
test('local cooldown prevents repeated requests without automatic retries', async () => {
  let time = 100000,
    calls = 0;
  const c = createClient({
    buildMessages,
    now: () => time,
    fetchFn: async () => {
      calls++;
      return ok('Réponse');
    },
  });
  await c.load({ consent: true });
  await c.generate({}, 'Un');
  await assert.rejects(c.generate({}, 'Deux'), (e) => e.code === 'COOLDOWN' && e.retryAfter === 30);
  assert.equal(calls, 1);
  time += 30000;
  await c.generate({}, 'Deux');
  assert.equal(calls, 2);
});
test('402 never triggers a payment, a key request or a second service', async () => {
  const urls = [];
  const c = createClient({
    buildMessages,
    fetchFn: async (url) => {
      urls.push(url);
      return {
        status: 402,
        ok: false,
        headers: { get: () => '45' },
        json: async () => ({ payment: 'https://example.org/pay' }),
      };
    },
  });
  await c.load({ consent: true });
  await assert.rejects(
    c.generate({}, 'Bonjour'),
    (e) => e.code === 'RATE_LIMIT' && e.retryAfter === 45
  );
  assert.deepEqual(urls, ['https://text.pollinations.ai/openai']);
  assert.equal(c.ready, true);
  assert.equal(c.waitSeconds, 45);
});
test('service failures and invalid or truncated replies remain explicit', async () => {
  for (const response of [
    { ok: false, status: 503 },
    { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: '' } }] }) },
    {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ finish_reason: 'length', message: { content: 'Incomplet' } }],
      }),
    },
  ]) {
    const c = createClient({ buildMessages, fetchFn: async () => response });
    await c.load({ consent: true });
    let displayed = false;
    await assert.rejects(c.generate({}, 'Test', () => (displayed = true)));
    assert.equal(displayed, false);
  }
});
test('cancellation and timeout abort the request and never display a late response', async () => {
  let started, release;
  const waiting = new Promise((r) => (release = r));
  const c = createClient({
    buildMessages,
    fetchFn: async () => {
      started = true;
      await waiting;
      return ok('Trop tard');
    },
  });
  await c.load({ consent: true });
  let shown = false;
  const pending = c.generate({}, 'Question', () => (shown = true));
  assert.equal(started, true);
  c.stop();
  release();
  await assert.rejects(pending, /interrompue/);
  assert.equal(shown, false);
  const d = createClient({
    buildMessages,
    timeoutMs: 1,
    fetchFn: async (u, o) =>
      new Promise((_, reject) =>
        o.signal.addEventListener('abort', () => reject(Error('aborted')))
      ),
  });
  await d.load({ consent: true });
  await assert.rejects(d.generate({}, 'Test'), (e) => e.code === 'TIMEOUT');
});
test('cooldown persistence is separate from momentum data and storage failure is harmless', async () => {
  const keys = [];
  const storage = {
    getItem: (k) => {
      keys.push(k);
      throw Error('blocked');
    },
    setItem: (k) => {
      keys.push(k);
      throw Error('blocked');
    },
  };
  const c = createClient({ buildMessages, storage, fetchFn: async () => ok('OK') });
  await c.load({ consent: true });
  await c.generate({}, 'Question');
  assert.ok(keys.every((k) => k === 'momentum.ai.anonymous.next'));
});
