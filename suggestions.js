'use strict';
// Pure rules that turn the user's own data into at most three task ideas. No DOM, network or AI.
(function (root) {
  const MAX = 3;
  const LOG_LIMIT = 200;
  const DISMISS_DAYS = 7;
  const OPEN_STATUSES = ['Candidature préparée', 'Envoyée', 'Entretien'];
  const normalize = (s) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  const pad = (n) => String(n).padStart(2, '0');
  const day = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (iso, n) => {
    const [y, m, d] = iso.split('-').map(Number);
    return day(new Date(y, m - 1, d + n, 12));
  };
  const label = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d, 12).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  };
  // Monday of the current week, so the weekly idea keeps one key all week.
  const weekStart = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d, 12);
    return day(new Date(y, m - 1, d - ((date.getDay() + 6) % 7), 12));
  };

  function hidden(entry, today) {
    if (!entry) return false;
    if (entry.status === 'accepted') return true;
    if (entry.status === 'later') return entry.date >= today;
    if (entry.status === 'dismissed') return addDays(entry.date, DISMISS_DAYS) > today;
    return false;
  }

  function suggest(state, now = new Date()) {
    const today = day(now);
    const log = state.suggestionLog || {};
    const open = (state.tasks || []).filter((t) => !t.done);
    const openTitles = new Set(open.map((t) => normalize(t.title)));
    const jobs = state.jobs || [];
    const list = [];
    const add = (s) => {
      if (hidden(log[s.key], today)) return;
      if (s.kind !== 'reschedule' && openTitles.has(normalize(s.title))) return;
      list.push(s);
    };

    for (const j of jobs) {
      if (j.followup && j.followup <= today && OPEN_STATUSES.includes(j.status))
        add({
          key: `followup:${j.id}:${j.followup}`,
          kind: 'followup',
          title: `Faire le point sur ${j.title}`,
          category: 'Emploi',
          due: today,
          reason: `Le suivi prévu le ${label(j.followup)} est arrivé. Relis ton dernier échange avant de relancer.`,
        });
    }
    for (const t of open) {
      if (t.due && t.due < today)
        add({
          key: `reschedule:${t.id}:${t.due}`,
          kind: 'reschedule',
          taskId: t.id,
          title: t.title,
          category: t.category,
          due: today,
          reason: `Cette action était prévue le ${label(t.due)}. Garde-la pour aujourd’hui ou choisis une autre date.`,
        });
    }
    for (const j of jobs) {
      if (j.status === 'À étudier')
        add({
          key: `study:${j.id}`,
          kind: 'study',
          title: `Étudier l’offre ${j.title}`,
          category: 'Emploi',
          due: '',
          reason: 'Quinze minutes suffisent pour décider si tu prépares une candidature.',
        });
    }
    const active = jobs.some((j) => j.status === 'À étudier' || OPEN_STATUSES.includes(j.status));
    if (!active) {
      const city = state.profile?.city;
      add({
        key: `search:${weekStart(today)}`,
        kind: 'search',
        title: 'Chercher une offre qui te correspond',
        category: 'Emploi',
        due: '',
        reason: city
          ? `Aucune piste en cours. Vingt minutes pour une offre près de ${city}.`
          : 'Aucune piste en cours. Vingt minutes pour trouver une seule offre compatible.',
      });
    }
    if (!open.length)
      add({
        key: `starter:${today}`,
        kind: 'starter',
        title: 'Bouger ou prendre l’air 20 minutes',
        category: 'Bien-être',
        due: '',
        reason: 'Ta liste est vide : une petite pause aide à repartir.',
      });
    return list.slice(0, MAX);
  }

  // Remembers the user's answer; the oldest entries are dropped to keep storage small.
  function record(state, key, status, now = new Date()) {
    state.suggestionLog = state.suggestionLog || {};
    delete state.suggestionLog[key];
    state.suggestionLog[key] = { status, date: day(now) };
    const keys = Object.keys(state.suggestionLog);
    for (const old of keys.slice(0, Math.max(0, keys.length - LOG_LIMIT)))
      delete state.suggestionLog[old];
  }

  const api = { suggest, record };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MomentumSuggestions = api;
})(globalThis);
