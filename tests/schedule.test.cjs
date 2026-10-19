'use strict';
const test = require('node:test'),
  assert = require('node:assert/strict');
const S = require('../schedule.js'),
  P = require('../planner.js'),
  Store = require('../store.js');
const event = (over = {}) => ({
  title: 'Garage & café 🚗',
  day: '2026-10-21',
  clock: '15:00',
  duration: 30,
  alert: 0,
  category: 'Maison',
  ...over,
});
const packet = (events) =>
  'Voici ton planning.\n```momentum-plan\n' + JSON.stringify({ events }) + '\n```';
test('extracts multiple Unicode slots and zero alert without displaying technical JSON', () => {
  const x = S.extract(
    packet([event(), event({ title: 'Lecture', clock: '16:00', duration: 60, alert: 15 })])
  );
  assert.equal(x.events.length, 2);
  assert.equal(x.events[0].alert, 0);
  assert.equal(x.events[0].title, 'Garage & café 🚗');
  assert.equal(x.text, 'Voici ton planning.');
  assert.equal(x.issue, '');
});
test('plain prose, broken or excessive packets never become executable slots', () => {
  assert.deepEqual(S.extract('Demain, marche 30 minutes.'), {
    text: 'Demain, marche 30 minutes.',
    events: [],
    issue: '',
  });
  for (const raw of [
    'Texte\n```momentum-plan\n{',
    'Texte\n```momentum-plan\n{}\n```',
    packet([null]),
    packet(Array.from({ length: 7 }, () => event())),
    packet([event()]) + packet([event()]),
  ]) {
    const x = S.extract(raw);
    assert.equal(x.events.length, 0);
    assert.ok(x.issue);
    assert.doesNotMatch(x.text, /momentum-plan|"events"/);
  }
});
test('missing or unsupported fields stay invalid rather than becoming silent defaults', () => {
  const now = new Date(2026, 9, 19, 10);
  for (const over of [
    { day: null },
    { clock: '25:00' },
    { duration: 45 },
    { duration: '30' },
    { alert: null },
    { alert: '0' },
    { day: '2026-02-31' },
    { day: '2026-10-18' },
    { day: '2027-03-28', clock: '02:30' },
  ]) {
    const [slot] = S.extract(packet([event(over)])).events;
    assert.throws(() => P.validate(slot, now));
  }
  assert.equal(P.validate(S.extract(packet([event()])).events[0], now).alert, 0);
});
test('planning instructions are bounded, use local date and previous slots only on planning turns', () => {
  const base = () => [
    { role: 'system', content: 'Base' },
    { role: 'user', content: 'Question' },
  ];
  const state = { coachPlan: [event()] };
  const now = new Date(2026, 9, 19, 10);
  assert.equal(S.wantsPlan('Propose un planning pour demain'), true);
  assert.equal(S.wantsPlan('Organise ma semaine'), true);
  assert.equal(S.wantsPlan('Finalement plus tard', state), true);
  assert.equal(S.wantsPlan('Rédige un refus poli', state), false);
  assert.doesNotMatch(
    S.messages(base, state, 'Rédige un refus poli', now)[0].content,
    /momentum-plan|Garage/
  );
  const prompt = S.messages(base, state, 'Propose mon planning', now)[0].content;
  assert.match(prompt, /2026-10-19/);
  assert.match(prompt, /momentum-plan/);
  assert.match(prompt, /Garage/);
});
test('schema upgrade preserves pending and sent slots, IDs, zero alert, and previous records', () => {
  const old = Store.sanitize({
    schemaVersion: 3,
    name: 'Alex',
    tasks: [{ id: 'task1', title: 'Action' }],
    coachPlan: [{ ...event(), taskId: 'task1' }, event({ alert: null })],
  });
  assert.equal(old.schemaVersion, 4);
  assert.equal(old.tasks[0].id, 'task1');
  assert.equal(old.coachPlan[0].taskId, 'task1');
  assert.equal(old.coachPlan[0].alert, 0);
  assert.equal(old.coachPlan[1].alert, null);
  let raw;
  assert.equal(
    Store.save(
      {
        setItem: (_k, v) => {
          raw = v;
        },
      },
      old
    ),
    true
  );
  assert.deepEqual(Store.load({ getItem: () => raw }).state, old);
  assert.deepEqual(Store.sanitize({ schemaVersion: 3 }).coachPlan, []);
});
