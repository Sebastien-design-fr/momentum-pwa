const test = require('node:test');
const assert = require('node:assert/strict');
const { context, priorityTasks, messages, localReply, createClient } = require('../coach.js');
const now = new Date(2026, 9, 14, 12);
const fixture = () => ({
  name: 'Sébastien',
  tone: 'gentle',
  tasks: [
    { id: 'done', title: 'Action terminée', category: 'Emploi', done: true, due: '2026-10-01' },
    { id: 'project', title: 'Préparer mon site', category: 'Projet', duration: 60 },
    { id: 'job', title: 'Adapter mon CV', category: 'Emploi', duration: 30, due: '2026-10-16' },
    {
      id: 'overdue',
      title: 'Appeler le garage',
      category: 'Maison',
      duration: 60,
      due: '2026-10-13',
    },
  ],
  jobs: [
    { title: 'Offre A', status: 'À étudier' },
    { title: 'Entreprise B', status: 'Envoyée', followup: '2026-10-14' },
    { title: 'Entreprise C', status: 'Refusée', followup: '2026-10-01' },
  ],
  coachHistory: [],
});
test('priorities omit completed tasks and prioritize overdue dates without changing state', () => {
  const state = fixture(),
    before = JSON.stringify(state),
    c = context(state, now);
  assert.deepEqual(
    priorityTasks(state, now).map((t) => t.id),
    ['overdue', 'job', 'project']
  );
  assert.equal(c.today, '2026-10-14');
  assert.equal(c.taskCount, 3);
  assert.deepEqual(
    c.followups.map((j) => j.title),
    ['Entreprise B']
  );
  assert.deepEqual(c.opportunities, ['Offre A']);
  assert.equal(JSON.stringify(state), before);
});
test('guided coach respects low energy, time budget, employment and actual followups', () => {
  const s = fixture();
  assert.match(localReply(s, 'Je suis peu motivé', now), /5 minutes/);
  assert.match(localReply(s, 'Je suis peu motivé', now), /Appeler le garage/);
  assert.match(localReply(s, 'J’ai seulement 8 minutes', now), /8 minutes/);
  assert.match(localReply(s, 'Comment avancer ?', now), /Entreprise B/);
  s.jobs = [];
  assert.match(localReply(s, 'Ma priorité est l’emploi', now), /Adapter mon CV/);
  assert.doesNotMatch(localReply(s, 'Ma priorité est l’emploi', now), /Action terminée/);
  assert.match(localReply(s, 'J’ai avancé aujourd’hui', now), /pas accompli/);
});
test('model prompt contains bounded context, alternates roles, includes current request once', () => {
  const s = fixture();
  s.coachHistory = [
    { role: 'coach', text: 'Orphelin' },
    { role: 'moi', text: 'Avant' },
    { role: 'coach', text: 'Réponse' },
    { role: 'moi', text: 'Maintenant' },
  ];
  const m = messages(s, 'Maintenant', now);
  assert.deepEqual(
    m.map((t) => t.role),
    ['system', 'user', 'assistant', 'user']
  );
  assert.equal(m.filter((t) => t.content === 'Maintenant').length, 1);
  assert.match(m[0].content, /Appeler le garage/);
  assert.doesNotMatch(m[0].content, /Action terminée/);
  assert.match(m[0].content, /Ne prétends jamais/);
  const sparse = messages(
    {
      coachHistory: [
        { role: 'moi', text: 'Un' },
        { role: 'moi', text: 'Deux' },
      ],
    },
    'Trois',
    now
  );
  assert.deepEqual(
    sparse.map((m) => m.role),
    ['system', 'user']
  );
});
test('no GPU or adapter: no model download, failure can retry', async () => {
  let downloads = 0;
  const client = createClient({
    loadRuntime: async () => {
      downloads++;
    },
  });
  await assert.rejects(client.load(), /WebGPU/);
  assert.equal(downloads, 0);
  assert.equal(client.ready, false);
  const unavailable = createClient({
    gpu: { requestAdapter: async () => null },
    loadRuntime: async () => {
      downloads++;
    },
  });
  await assert.rejects(unavailable.load(), /graphique/);
  assert.equal(downloads, 0);
});
const fake = () => {
  let stopped = 0,
    unloaded = 0,
    loads = 0,
    requested;
  const engine = {
    chat: {
      completions: {
        create: async (req) => {
          requested = req;
          return (async function* () {
            yield { choices: [{ delta: { content: 'Une ' } }] };
            yield { choices: [{ delta: { content: 'action.' } }] };
          })();
        },
      },
    },
    interruptGenerate() {
      stopped++;
    },
    async unload() {
      unloaded++;
    },
  };
  const client = createClient({
    gpu: { requestAdapter: async () => ({ features: new Set(['shader-f16']) }) },
    loadRuntime: async () => ({
      CreateMLCEngine: async (model) => {
        assert.match(model, /q4f16/);
        loads++;
        return engine;
      },
    }),
  });
  return { client, counts: () => ({ stopped, unloaded, loads, requested }) };
};
test('single load, streamed response and explicit memory release', async () => {
  const { client, counts } = fake();
  await Promise.all([client.load(), client.load()]);
  assert.equal(counts().loads, 1);
  assert.equal(client.ready, true);
  const streamed = [];
  assert.equal(
    await client.generate(fixture(), 'Aide-moi', (t) => streamed.push(t), now),
    'Une action.'
  );
  assert.deepEqual(streamed, ['Une ', 'Une action.']);
  assert.equal(counts().requested.stream, true);
  await client.unload();
  assert.equal(client.ready, false);
  assert.equal(counts().unloaded, 1);
  await assert.rejects(client.generate(fixture(), 'Aide-moi'), /Active/);
});
test('cancelled response is not reported as a complete answer and next response works', async () => {
  const { client, counts } = fake();
  await client.load();
  await assert.rejects(
    client.generate(fixture(), 'Question', () => client.stop(), now),
    /interrompue/
  );
  assert.equal(counts().stopped, 1);
  assert.equal(await client.generate(fixture(), 'Encore', () => {}, now), 'Une action.');
});
test('load failure does not leave the client stuck; empty responses are explicit failures', async () => {
  let attempts = 0;
  const client = createClient({
    gpu: { requestAdapter: async () => ({ features: new Set() }) },
    loadRuntime: async () => ({
      CreateMLCEngine: async (model) => {
        assert.match(model, /q4f32/);
        if (!attempts++) throw Error('network');
        return { chat: { completions: { create: async () => (async function* () {})() } } };
      },
    }),
  });
  await assert.rejects(client.load(), /network/);
  assert.equal(client.ready, false);
  await client.load();
  assert.equal(client.ready, true);
  await assert.rejects(client.generate(fixture(), 'Question'), /pas produit/);
});
