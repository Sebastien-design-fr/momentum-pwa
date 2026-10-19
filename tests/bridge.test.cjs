'use strict';
const { test } = require('node:test'),
  assert = require('node:assert/strict');
const { build, url } = require('../bridge.js');
const task = {
  id: 'test-id',
  title: 'Appeler le garage & café 🗓',
  due: '2026-10-15',
  time: '23:30',
  duration: 90,
  alert: 0,
};
test('zero alert, midnight rollover and exact JSON transfer', () => {
  const data = build(task);
  assert.equal(data.alert, 0);
  assert.equal(data.end, '2026-10-16 01:00');
  assert.equal(data.alertISO, data.startISO);
  assert.equal((new Date(data.endISO) - new Date(data.startISO)) / 60000, 90);
  assert.deepEqual(JSON.parse(new URL(url(data)).searchParams.get('text')), data);
  assert.equal(data.notes, 'Momentum-ID: test-id');
});
test('all supported durations and alerts', () => {
  for (const duration of [30, 60, 90, 120])
    for (const alert of [0, 15, 30, 60, 1440]) {
      const data = build({ ...task, duration, alert });
      assert.equal((new Date(data.startISO) - new Date(data.alertISO)) / 60000, alert);
    }
});
test('reject impossible dates, times and unsupported inputs', () => {
  for (const patch of [
    { due: '2026-02-30' },
    { time: '25:00' },
    { duration: -1 },
    { alert: 5 },
    { title: '' },
    { id: '' },
  ])
    assert.throws(() => build({ ...task, ...patch }));
});
test('DST gap rejected and elapsed duration maintained across clock changes', () => {
  assert.throws(() => build({ ...task, due: '2026-03-29', time: '02:30' }));
  const data = build({ ...task, due: '2026-10-25', time: '01:30', duration: 120 });
  assert.equal((new Date(data.endISO) - new Date(data.startISO)) / 60000, 120);
});
