'use strict';
// Local data layer: validation, schema migrations and storage. No DOM access.
(function (root) {
  const KEY = 'momentum.v1';
  const CORRUPT_KEY = KEY + '.corrupt';
  // 1: V0.1–V0.11 (no explicit version). 2: adds `schemaVersion`. 3: adds `profile` and `suggestionLog`.
  const SCHEMA_VERSION = 3;
  const CATEGORIES = ['Emploi', 'Maison', 'Bien-être', 'Projet'];
  const JOB_STATUSES = ['À étudier', 'Candidature préparée', 'Envoyée', 'Entretien', 'Refusée'];
  const TONES = ['balanced', 'gentle', 'firm'];
  const DURATIONS = [30, 60, 90, 120];
  const ALERTS = [0, 15, 30, 60, 1440];
  const DAY = /^\d{4}-\d{2}-\d{2}$/;
  const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

  const defaultId = () => globalThis.crypto.randomUUID();

  function seed(newId = defaultId) {
    return sanitize(
      {
        name: '',
        tone: 'balanced',
        tasks: [
          {
            id: newId(),
            title: 'Consacrer 20 minutes à ma recherche d’emploi',
            category: 'Emploi',
            done: false,
          },
          {
            id: newId(),
            title: 'Bouger ou prendre l’air 20 minutes',
            category: 'Bien-être',
            done: false,
          },
        ],
        jobs: [],
        coachHistory: [],
        coachLastDate: '',
      },
      newId
    );
  }

  function sanitizeTask(t, newId) {
    return {
      id: String(t.id || newId()),
      title: String(t.title || '').slice(0, 120),
      category: CATEGORIES.includes(t.category) ? t.category : 'Projet',
      done: !!t.done,
      due: DAY.test(t.due || '') ? t.due : '',
      duration: DURATIONS.includes(Number(t.duration)) ? Number(t.duration) : 60,
      alert: ALERTS.includes(Number(t.alert)) ? Number(t.alert) : 30,
      calendarExported: !!t.calendarExported,
      bridgeLaunched: !!t.bridgeLaunched,
      time: CLOCK.test(t.time || '') ? t.time : '14:00',
    };
  }

  function sanitizeJob(j, newId) {
    return {
      id: String(j.id || newId()),
      title: String(j.title || '').slice(0, 150),
      link: typeof j.link === 'string' && /^https?:\/\//i.test(j.link) ? j.link.slice(0, 2000) : '',
      status: JOB_STATUSES.includes(j.status) ? j.status : 'À étudier',
      followup: DAY.test(j.followup || '') ? j.followup : '',
    };
  }

  const SUGGESTION_STATUSES = ['accepted', 'later', 'dismissed'];
  const CONTRACTS = ['', 'CDI', 'CDD', 'Intérim', 'Freelance', 'Peu importe'];

  function sanitizeProfile(p) {
    const x = p && typeof p === 'object' ? p : {};
    const number = (value, max) => {
      const n = Math.round(Number(value));
      return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
    };
    return {
      city: String(x.city || '')
        .trim()
        .slice(0, 100),
      minSalary: number(x.minSalary, 1000),
      maxCommute: number(x.maxCommute, 300),
      contract: CONTRACTS.includes(x.contract) ? x.contract : '',
    };
  }

  function sanitizeSuggestionLog(log) {
    const out = {};
    if (!log || typeof log !== 'object' || Array.isArray(log)) return out;
    for (const [key, entry] of Object.entries(log).slice(-200)) {
      if (entry && SUGGESTION_STATUSES.includes(entry.status) && DAY.test(entry.date || ''))
        out[key.slice(0, 120)] = { status: entry.status, date: entry.date };
    }
    return out;
  }

  // Accepts any stored or imported version and returns the current schema.
  function sanitize(x, newId = defaultId) {
    if (!x || typeof x !== 'object' || Array.isArray(x)) throw Error('Format invalide');
    const list = (value, max) => (Array.isArray(value) ? value.slice(0, max) : []);
    return {
      schemaVersion: SCHEMA_VERSION,
      name: String(x.name || '').slice(0, 45),
      tone: TONES.includes(x.tone) ? x.tone : 'balanced',
      tasks: list(x.tasks, 500)
        .filter((t) => t && typeof t === 'object')
        .map((t) => sanitizeTask(t, newId))
        .filter((t) => t.title),
      jobs: list(x.jobs, 500)
        .filter((j) => j && typeof j === 'object')
        .map((j) => sanitizeJob(j, newId))
        .filter((j) => j.title),
      coachHistory: (Array.isArray(x.coachHistory) ? x.coachHistory.slice(-60) : [])
        .filter((m) => m && ['moi', 'coach'].includes(m.role))
        .map((m) => ({ role: m.role, text: String(m.text || '').slice(0, 1200) })),
      coachLastDate: typeof x.coachLastDate === 'string' ? x.coachLastDate.slice(0, 10) : '',
      profile: sanitizeProfile(x.profile),
      suggestionLog: sanitizeSuggestionLog(x.suggestionLog),
    };
  }

  // Unreadable data is kept aside instead of being overwritten by the next save.
  function load(storage, newId = defaultId) {
    let raw;
    try {
      raw = storage.getItem(KEY);
    } catch {
      return { state: seed(newId), recovered: false, error: 'storage' };
    }
    if (raw == null) return { state: seed(newId), recovered: false, error: null };
    try {
      return { state: sanitize(JSON.parse(raw), newId), recovered: false, error: null };
    } catch {
      try {
        storage.setItem(CORRUPT_KEY, raw);
      } catch {
        // Nothing more can be done without storage space.
      }
      return { state: seed(newId), recovered: true, error: 'corrupt' };
    }
  }

  function save(storage, state) {
    try {
      storage.setItem(KEY, JSON.stringify({ ...state, schemaVersion: SCHEMA_VERSION }));
      return true;
    } catch {
      return false;
    }
  }

  // Asks Safari/Chromium not to evict local data under storage pressure.
  async function requestPersistence(storageManager) {
    if (!storageManager?.persist) return 'unsupported';
    try {
      if (await storageManager.persisted?.()) return 'granted';
      return (await storageManager.persist()) ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  }

  const api = {
    KEY,
    CORRUPT_KEY,
    SCHEMA_VERSION,
    CATEGORIES,
    CONTRACTS,
    JOB_STATUSES,
    DURATIONS,
    ALERTS,
    seed,
    sanitize,
    load,
    save,
    requestPersistence,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MomentumStore = api;
})(globalThis);
