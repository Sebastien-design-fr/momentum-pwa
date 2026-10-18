'use strict';
const test = require('node:test'),
  assert = require('node:assert/strict');
const { suggest, record } = require('../suggestions.js');
const now = new Date(2026, 9, 14, 10);
const base = (extra = {}) => ({
  tone: 'balanced',
  tasks: [{ id: 't1', title: 'Appeler le garage', category: 'Maison', done: false }],
  jobs: [],
  suggestionLog: {},
  profile: {},
  ...extra,
});

test('a due follow-up becomes a task for today, before anything else', () => {
  const state = base({
    jobs: [
      { id: 'j1', title: 'Technico-commercial — ACME', status: 'Envoyée', followup: '2026-10-13' },
      { id: 'j2', title: 'Offre B', status: 'À étudier', followup: '' },
    ],
  });
  const [first, second] = suggest(state, now);
  assert.equal(first.kind, 'followup');
  assert.equal(first.due, '2026-10-14');
  assert.equal(first.category, 'Emploi');
  assert.match(first.title, /ACME/);
  assert.equal(second.kind, 'study');
});

test('at most three suggestions, each with a stable key and a reason', () => {
  const state = base({
    tasks: [
      { id: 't2', title: 'Ancienne tâche', category: 'Projet', done: false, due: '2026-10-10' },
    ],
    jobs: [
      { id: 'j1', title: 'A', status: 'Envoyée', followup: '2026-10-12' },
      { id: 'j2', title: 'B', status: 'Entretien', followup: '2026-10-13' },
      { id: 'j3', title: 'C', status: 'À étudier', followup: '' },
      { id: 'j4', title: 'D', status: 'À étudier', followup: '' },
    ],
  });
  const list = suggest(state, now);
  assert.equal(list.length, 3);
  assert.equal(new Set(list.map((s) => s.key)).size, 3);
  for (const s of list) assert.ok(s.reason && s.title && s.key);
  assert.deepEqual(
    suggest(state, now).map((s) => s.key),
    list.map((s) => s.key)
  );
});

test('an overdue task is offered for rescheduling, not duplicated', () => {
  const state = base({
    tasks: [
      { id: 't2', title: 'Rappeler Paul', category: 'Maison', done: false, due: '2026-10-10' },
    ],
    jobs: [{ id: 'j1', title: 'X', status: 'Envoyée', followup: '' }],
  });
  const overdue = suggest(state, now).find((s) => s.kind === 'reschedule');
  assert.equal(overdue.taskId, 't2');
  assert.equal(overdue.due, '2026-10-14');
});

test('later hides a suggestion until tomorrow, dismissed for a week, accepted for good', () => {
  const state = base({ jobs: [{ id: 'j1', title: 'X', status: 'À étudier', followup: '' }] });
  const key = suggest(state, now).find((s) => s.kind === 'study').key;
  const has = (when) => suggest(state, when).some((s) => s.key === key);
  record(state, key, 'later', now);
  assert.equal(has(now), false);
  assert.equal(has(new Date(2026, 9, 15, 9)), true);
  record(state, key, 'dismissed', now);
  assert.equal(has(new Date(2026, 9, 20, 9)), false);
  assert.equal(has(new Date(2026, 9, 22, 9)), true);
  record(state, key, 'accepted', now);
  assert.equal(has(new Date(2027, 0, 1, 9)), false);
});

test('a suggestion already present as an open task is not proposed again', () => {
  const state = base({
    tasks: [{ id: 't3', title: 'Étudier l’offre X', category: 'Emploi', done: false }],
    jobs: [{ id: 'j1', title: 'X', status: 'À étudier', followup: '' }],
  });
  assert.equal(
    suggest(state, now).some((s) => s.kind === 'study'),
    false
  );
});

test('an empty list still gets a gentle starter and a job search idea', () => {
  const kinds = suggest(base({ tasks: [] }), now).map((s) => s.kind);
  assert.ok(kinds.includes('search'));
  assert.ok(kinds.includes('starter'));
});

test('the search idea uses the saved city, and the log stays bounded', () => {
  const state = base({ tasks: [], profile: { city: 'Melun' } });
  assert.match(suggest(state, now).find((s) => s.kind === 'search').reason, /Melun/);
  for (let i = 0; i < 400; i++) record(state, 'k' + i, 'later', now);
  assert.ok(Object.keys(state.suggestionLog).length <= 200);
});
