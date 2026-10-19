'use strict';
const test = require('node:test'),
  assert = require('node:assert/strict'),
  crypto = require('node:crypto'),
  store = require('../store.js');
test('V0.8.1 data retains IDs, dates, zero alerts, Bridge flags, jobs and exchanges under the same key', () => {
  const original = {
    name: 'Sébastien',
    tone: 'firm',
    tasks: [
      {
        id: 'existing-event-id',
        title: 'Garage 🚗',
        category: 'Maison',
        done: false,
        due: '2026-10-16',
        time: '15:30',
        duration: 90,
        alert: 0,
        bridgeLaunched: true,
        calendarExported: true,
      },
      { id: 'completed', title: 'CV', category: 'Emploi', done: true },
    ],
    jobs: [
      {
        id: 'job-id',
        title: 'Entreprise A',
        link: 'https://example.com/offre',
        status: 'Entretien',
        followup: '2026-10-15',
      },
    ],
    coachHistory: [
      { role: 'moi', text: 'Mon message' },
      { role: 'coach', text: 'Mon conseil' },
    ],
    coachLastDate: '2026-10-14',
  };
  const storage = {
    getItem: (key) => {
      assert.equal(key, 'momentum.v1');
      return JSON.stringify(original);
    },
  };
  const result = store.load(storage, () => crypto.randomUUID());
  assert.equal(result.error, null);
  const sandbox = { loaded: result.state };
  const loaded = JSON.parse(JSON.stringify(sandbox.loaded));
  assert.equal(loaded.name, original.name);
  assert.equal(loaded.tone, original.tone);
  assert.deepEqual(loaded.tasks[0], original.tasks[0]);
  assert.equal(loaded.tasks[1].done, true);
  assert.equal(loaded.tasks[1].id, 'completed');
  assert.deepEqual(loaded.jobs, original.jobs);
  assert.deepEqual(loaded.coachHistory, original.coachHistory);
  assert.equal(loaded.coachLastDate, original.coachLastDate);
});

test('saved data carries the schema version and loads back unchanged', () => {
  let saved = null;
  const storage = { getItem: () => saved, setItem: (_key, value) => (saved = value) };
  const state = store.load(storage).state;
  assert.equal(state.schemaVersion, store.SCHEMA_VERSION);
  state.name = 'Alex';
  assert.equal(store.save(storage, state), true);
  assert.equal(JSON.parse(saved).schemaVersion, store.SCHEMA_VERSION);
  assert.deepEqual(store.load(storage).state, state);
});

test('unreadable data is kept aside instead of being overwritten', () => {
  const written = {};
  const storage = {
    getItem: (key) => (key === store.KEY ? '{not json' : null),
    setItem: (key, value) => (written[key] = value),
  };
  const result = store.load(storage);
  assert.equal(result.recovered, true);
  assert.equal(result.error, 'corrupt');
  assert.equal(written[store.CORRUPT_KEY], '{not json');
  assert.ok(result.state.tasks.length > 0);
});

test('malformed entries are dropped without rejecting the whole backup', () => {
  const state = store.sanitize({
    tasks: [null, 'texte', { title: '' }, { title: 'Valide', duration: 45, alert: 7 }],
    jobs: [42, { title: 'Offre', link: 'javascript:alert(1)', status: 'Inconnu' }],
    coachHistory: [
      { role: 'system', text: 'x' },
      { role: 'moi', text: 'ok' },
    ],
  });
  assert.equal(state.tasks.length, 1);
  assert.equal(state.tasks[0].duration, 60);
  assert.equal(state.tasks[0].alert, 30);
  assert.equal(state.jobs[0].link, '');
  assert.equal(state.jobs[0].status, 'À étudier');
  assert.deepEqual(state.coachHistory, [{ role: 'moi', text: 'ok' }]);
  assert.throws(() => store.sanitize([]), /Format invalide/);
});

test('storage persistence is requested only when supported', async () => {
  assert.equal(await store.requestPersistence(undefined), 'unsupported');
  assert.equal(
    await store.requestPersistence({ persisted: async () => true, persist: async () => false }),
    'granted'
  );
  assert.equal(
    await store.requestPersistence({ persisted: async () => false, persist: async () => true }),
    'granted'
  );
  assert.equal(
    await store.requestPersistence({
      persist: async () => {
        throw Error('x');
      },
    }),
    'denied'
  );
});

test('profile and suggestion log are validated and default to empty', () => {
  const empty = store.sanitize({});
  assert.deepEqual(empty.profile, { city: '', minSalary: 0, maxCommute: 0, contract: '' });
  assert.deepEqual(empty.suggestionLog, {});
  const state = store.sanitize({
    profile: { city: '  Melun ', minSalary: '42', maxCommute: -3, contract: 'Autre' },
    suggestionLog: {
      ok: { status: 'later', date: '2026-10-14' },
      badStatus: { status: 'x', date: '2026-10-14' },
      badDate: { status: 'later', date: 'hier' },
    },
  });
  assert.deepEqual(state.profile, { city: 'Melun', minSalary: 42, maxCommute: 0, contract: '' });
  assert.deepEqual(Object.keys(state.suggestionLog), ['ok']);
});

test('data saved by schema 2 loads into schema 3 without losing anything', () => {
  const v2 = { schemaVersion: 2, name: 'Alex', tasks: [{ id: 'a', title: 'Garage' }], jobs: [] };
  const state = store.load({ getItem: () => JSON.stringify(v2) }).state;
  assert.equal(state.schemaVersion, 3);
  assert.equal(state.name, 'Alex');
  assert.equal(state.tasks[0].id, 'a');
  assert.deepEqual(state.suggestionLog, {});
});
