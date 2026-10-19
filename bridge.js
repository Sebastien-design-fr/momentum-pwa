'use strict';
// Pure payload builder: no network, storage or calendar access.
(function (root) {
  function build(task) {
    if (!task || !task.id || !String(task.title || '').trim()) throw Error('Tâche invalide.');
    const due = task.due,
      time = task.time || '14:00';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
      throw Error('Date ou heure invalide.');
    const start = new Date(due + 'T' + time + ':00');
    const local = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    // Reject impossible dates and nonexistent local times during DST transitions.
    if (Number.isNaN(start.getTime()) || local(start) !== due + ' ' + time)
      throw Error('Cette date ou heure locale n’existe pas.');
    const duration = Number(task.duration ?? 60),
      alert = Number(task.alert ?? 30);
    if (![30, 60, 90, 120].includes(duration) || ![0, 15, 30, 60, 1440].includes(alert))
      throw Error('Durée ou alerte invalide.');
    const end = new Date(start.getTime() + duration * 60000);
    return {
      version: 1,
      title: String(task.title).trim().slice(0, 120),
      id: String(task.id),
      start: local(start),
      end: local(end),
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      duration,
      alert,
      alertISO: new Date(start.getTime() - alert * 60000).toISOString(),
      notes: 'Momentum-ID: ' + task.id,
    };
  }
  function url(data) {
    return (
      'shortcuts://run-shortcut?name=' +
      encodeURIComponent('MOMENTUM Bridge') +
      '&input=text&text=' +
      encodeURIComponent(JSON.stringify(data))
    );
  }
  const api = { build, url };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MomentumBridge = api;
})(globalThis);
