'use strict';
const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm');
function app({ failStorage = false, initial, fetchFn } = {}) {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8'),
    nodes = new Map(),
    urls = [],
    alerts = [];
  let id = 0;
  class Element {
    constructor() {
      this.value = '';
      this.hidden = false;
      this.dataset = {};
      this.style = {};
      this.children = [];
      this.events = {};
      this.textContent = '';
      this.classList = { add() {}, toggle() {} };
    }
    addEventListener(n, f) {
      this.events[n] = f;
    }
    append(...n) {
      this.children.push(...n);
    }
    replaceChildren(...n) {
      this.children = n;
    }
    setAttribute() {}
    removeAttribute() {}
    focus() {}
    scrollIntoView() {}
    querySelector() {
      return this.submit || (this.submit = new Element());
    }
    async fire(n, event = {}) {
      const e = { preventDefault() {}, ...event };
      if (n === 'click' && this.id) return await sandbox.window.MomentumActions.run(this, e);
      await this.events[n]?.(e);
    }
  }
  for (const m of html.matchAll(/\bid="([^"]+)"/g))
    nodes.set(m[1], Object.assign(new Element(), { id: m[1] }));
  const nav = ['home', 'tasks', 'coach', 'jobs', 'settings'].map((id) =>
      Object.assign(new Element(), { dataset: { nav: id } })
    ),
    prompts = ['blocked', 'low', 'job', 'win'].map((id) =>
      Object.assign(new Element(), { dataset: { coach: id } })
    );
  const document = {
    addEventListener() {},
    getElementById: (id) => nodes.get(id) || null,
    createElement: () => new Element(),
    querySelectorAll: (s) =>
      s === '.screen'
        ? nav.map((n) => Object.assign(nodes.get(n.dataset.nav), { id: n.dataset.nav }))
        : s === '[data-nav]'
          ? nav
          : s === '[data-coach]'
            ? prompts
            : [],
  };
  let data = JSON.stringify(
    initial || {
      name: 'Test',
      tone: 'balanced',
      tasks: [],
      jobs: [],
      coachHistory: [],
      coachLastDate: '2026-10-14',
    }
  );
  const NativeDate = Date;
  class FixedDate extends NativeDate {
    constructor(...args) {
      super(...(args.length ? args : [2026, 9, 14, 10]));
    }
    static now() {
      return new FixedDate().getTime();
    }
  }
  const location = {
    protocol: 'https:',
    assign: (url) => {
      const payload = JSON.parse(new URL(url).searchParams.get('text'));
      assert.ok(
        JSON.parse(data).tasks.some((t) => t.id === payload.id),
        'persist matching task before Apple launch'
      );
      urls.push(url);
    },
  };
  const sandbox = {
    fetch: fetchFn,
    AbortController,
    clearTimeout() {},
    document,
    Date: FixedDate,
    Intl,
    URL,
    URLSearchParams,
    AbortSignal,
    crypto: { randomUUID: () => `test-id-${++id}` },
    navigator: {},
    localStorage: {
      getItem: (key) => {
        assert.equal(key, 'momentum.v1');
        return data;
      },
      setItem: (key, value) => {
        assert.equal(key, 'momentum.v1');
        if (failStorage) throw Error('quota');
        data = value;
      },
    },
    window: { location, scrollTo() {}, addEventListener() {} },
    location,
    alert: (s) => alerts.push(s),
    confirm: () => true,
    setTimeout() {},
    console,
  };
  vm.createContext(sandbox);
  for (const file of [
    'store.js',
    'suggestions.js',
    'bridge.js',
    'planner.js',
    'coach.js',
    'schedule.js',
    'online-coach.js',
    'app.js',
  ])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), sandbox, {
      filename: file,
    });
  return {
    nodes,
    urls,
    alerts,
    stored: () => JSON.parse(data),
    memory: () => JSON.parse(vm.runInContext('JSON.stringify(state)', sandbox)),
    evaluate: (code) => vm.runInContext(code, sandbox),
    send: async (text) => {
      nodes.get('coach-input').value = text;
      await nodes.get('coach-form').fire('submit');
    },
  };
}
test('chat prepares but never writes a task or Calendar event before one confirmation', async () => {
  const a = app();
  await a.send(
    'Ajoute appeler le garage demain à 15h pendant 30 minutes avec une alerte 15 minutes avant'
  );
  assert.equal(a.stored().tasks.length, 0);
  assert.equal(a.urls.length, 0);
  assert.equal(a.nodes.get('coach-draft').hidden, false);
  assert.equal(a.nodes.get('draft-title').value, 'appeler le garage');
  assert.equal(a.nodes.get('draft-date').value, '2026-10-15');
  assert.equal(a.nodes.get('draft-time').value, '15:00');
  assert.equal(a.nodes.get('draft-confirm').disabled, false);
  await a.nodes.get('draft-confirm').fire('click');
  assert.equal(a.stored().tasks.length, 1);
  assert.equal(a.urls.length, 1);
  const url = new URL(a.urls[0]);
  assert.equal(url.protocol, 'shortcuts:');
  assert.equal(url.searchParams.get('name'), 'MOMENTUM Bridge');
  const payload = JSON.parse(url.searchParams.get('text'));
  assert.equal(payload.title, 'appeler le garage');
  assert.equal(payload.duration, 30);
  assert.equal(payload.alert, 15);
  assert.match(payload.start, /2026-10-15 15:00/);
  assert.equal(a.stored().tasks[0].bridgeLaunched, true);
  await a.nodes.get('draft-confirm').fire('click');
  assert.equal(a.urls.length, 1);
  await a.send('Ajoute appeler le garage demain à 15h pendant 30 minutes');
  await a.nodes.get('draft-confirm').fire('click');
  assert.equal(a.stored().tasks.length, 1);
  assert.equal(a.urls.length, 1);
  assert.match(a.nodes.get('draft-status').textContent, /existe déjà/);
});
test('follow-up fills missing fields, edited zero alert survives, cancellation never creates anything', async () => {
  const a = app();
  await a.send('Ajoute appeler le garage');
  assert.equal(a.nodes.get('draft-confirm').disabled, true);
  await a.send('demain à 15h');
  assert.equal(a.nodes.get('draft-title').value, 'appeler le garage');
  assert.equal(a.nodes.get('draft-confirm').disabled, false);
  a.nodes.get('draft-alert').value = '0';
  await a.nodes.get('draft-alert').fire('input');
  assert.equal(a.nodes.get('draft-confirm').disabled, false);
  await a.nodes.get('draft-confirm').fire('click');
  assert.equal(a.stored().tasks[0].alert, 0);
  const b = app();
  await b.send('Ajoute le garage demain à 15h');
  await b.nodes.get('draft-cancel').fire('click');
  await b.nodes.get('draft-confirm').fire('click');
  assert.equal(b.urls.length, 0);
  assert.equal(b.stored().tasks.length, 0);
});
test('storage failure prevents Calendar launch and restores the task list', async () => {
  const a = app({ failStorage: true });
  await a.send('Ajoute appeler le garage demain à 15h');
  await a.nodes.get('draft-confirm').fire('click');
  assert.equal(a.urls.length, 0);
  assert.equal(a.memory().tasks.length, 0);
  assert.equal(a.stored().tasks.length, 0);
  assert.match(a.nodes.get('draft-status').textContent, /Enregistrement impossible/);
});

test('a negated follow-up cancels a pending proposal without Calendar dispatch', async () => {
  const a = app();
  await a.send('Ajoute appeler le garage demain à 15h');
  await a.send('Ne programme pas cette action demain à 16h');
  assert.equal(a.nodes.get('coach-draft').hidden, true);
  await a.nodes.get('draft-confirm').fire('click');
  assert.equal(a.urls.length, 0);
  assert.equal(a.stored().tasks.length, 0);
});

test('the home screen proposes a task from a due follow-up and adds it only on Ajouter', async () => {
  const initial = {
    name: 'Test',
    tone: 'balanced',
    tasks: [],
    jobs: [{ id: 'j1', title: 'ACME', status: 'Envoyée', followup: '2026-10-13' }],
    coachHistory: [],
    coachLastDate: '2026-10-14',
  };
  const a = app({ initial });
  const list = a.nodes.get('suggestion-list');
  assert.equal(a.nodes.get('suggestions').hidden, false);
  assert.ok(list.children.length >= 1);
  assert.equal(a.stored().tasks.length, 0);
  const card = list.children[0];
  const actions = card.children.at(-1);
  const labels = actions.children.map((b) => b.textContent);
  assert.deepEqual(labels, ['Ajouter', 'Modifier', 'Plus tard']);
  await actions.children[0].fire('click');
  const tasks = a.stored().tasks;
  assert.equal(tasks.length, 1);
  assert.match(tasks[0].title, /ACME/);
  assert.equal(tasks[0].due, '2026-10-14');
  assert.equal(a.urls.length, 0, 'accepting an idea never opens Calendar');
  assert.equal(
    a.nodes.get('suggestion-list').children.some((c) => /ACME/.test(c.children[0]?.textContent)),
    false
  );
});

test('Plus tard hides an idea without creating a task, and a task can be added without a date', async () => {
  const a = app({
    initial: { tasks: [], jobs: [{ id: 'j1', title: 'ACME', status: 'À étudier' }] },
  });
  const first = a.nodes.get('suggestion-list').children[0];
  await first.children.at(-1).children[2].fire('click');
  assert.equal(a.stored().tasks.length, 0);
  assert.equal(Object.keys(a.stored().suggestionLog).length, 1);
  a.nodes.get('task-title').value = 'Ranger le garage';
  await a.nodes.get('task-form').fire('submit');
  const task = a.stored().tasks[0];
  assert.equal(task.title, 'Ranger le garage');
  assert.equal(task.due, '');
  assert.equal(a.urls.length, 0);
});

test('a coaching intention does not open a calendar proposal or create a task', async () => {
  const a = app();
  await a.send('Je dois me remotiver');
  assert.equal(a.nodes.get('draft-title').value, '');
  assert.doesNotMatch(
    a.nodes.get('coach-message').textContent,
    /préparé une proposition de créneau/
  );
  assert.equal(a.stored().tasks.length, 0);
  assert.equal(a.urls.length, 0);
});
test('a dated coaching question leaves a pending calendar proposal unchanged', async () => {
  const a = app();
  await a.send('Ajoute appeler le garage demain à 15h');
  await a.send('Demain, comment améliorer ma motivation ?');
  assert.equal(a.nodes.get('draft-title').value, 'appeler le garage');
  assert.equal(a.nodes.get('draft-time').value, '15:00');
  assert.doesNotMatch(a.nodes.get('coach-message').textContent, /préparé une proposition/);
  assert.equal(a.stored().tasks.length, 0);
  assert.equal(a.urls.length, 0);
});
test('personal writing asks for real facts instead of inventing a career or saving an event', async () => {
  const a = app();
  await a.send('Rédige mon CV complet');
  assert.match(a.nodes.get('coach-message').textContent, /faits réels/);
  assert.equal(a.stored().tasks.length, 0);
  assert.equal(a.urls.length, 0);
});

test('online consent is explicit, cooldown preserves input, and calendar commands remain local', async () => {
  let calls = 0;
  const a = app({
    fetchFn: async () => {
      calls++;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              finish_reason: 'stop',
              message: { content: 'Merci pour ton invitation. Je ne pourrai pas venir.' },
            },
          ],
        }),
      };
    },
  });
  await a.nodes.get('coach-ai-enable').fire('click');
  await a.send('Bonjour');
  assert.equal(calls, 0);
  a.nodes.get('coach-cloud-consent').checked = true;
  await a.nodes.get('coach-ai-enable').fire('click');
  assert.equal(calls, 0);
  await a.send('Rédige un refus poli.');
  assert.equal(calls, 1);
  assert.match(a.nodes.get('coach-message').textContent, /Merci pour ton invitation/);
  const before = a.stored().coachHistory.length;
  await a.send('Plus chaleureux.');
  assert.equal(calls, 1);
  assert.equal(a.nodes.get('coach-input').value, 'Plus chaleureux.');
  assert.equal(a.stored().coachHistory.length, before);
  await a.send('Ajoute appeler le garage demain à 15h');
  assert.equal(calls, 1);
  assert.equal(a.nodes.get('coach-draft').hidden, false);
  assert.equal(a.urls.length, 0);
  a.nodes.get('coach-cloud-consent').checked = false;
  await a.nodes.get('coach-cloud-consent').fire('change');
  assert.match(a.nodes.get('coach-mode').textContent, /hors ligne/);
  await a.send('Rédige un autre message');
  assert.equal(calls, 1);
});

test('AI planning yields cards without side effects, each click dispatches exactly one unchanged Bridge payload', async () => {
  const events = [
    {
      title: 'Lire 🚗',
      day: '2026-10-15',
      clock: '15:00',
      duration: 30,
      alert: 0,
      category: 'Projet',
    },
    {
      title: 'Marche',
      day: '2026-10-15',
      clock: '16:00',
      duration: 60,
      alert: 15,
      category: 'Bien-être',
    },
  ];
  let calls = 0;
  const a = app({
    fetchFn: async (_url, options) => {
      calls++;
      const body = JSON.parse(options.body);
      assert.equal(body.max_tokens, 1500);
      assert.match(body.messages[0].content, /momentum-plan/);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              finish_reason: 'stop',
              message: {
                content:
                  'Deux créneaux proposés.\n```momentum-plan\n' +
                  JSON.stringify({ events }) +
                  '\n```',
              },
            },
          ],
        }),
      };
    },
  });
  a.nodes.get('coach-cloud-consent').checked = true;
  await a.nodes.get('coach-ai-enable').fire('click');
  await a.send('Propose un planning pour demain');
  assert.equal(calls, 1);
  assert.equal(a.stored().tasks.length, 0);
  assert.equal(a.urls.length, 0);
  assert.equal(a.stored().coachPlan.length, 2);
  assert.doesNotMatch(a.nodes.get('coach-message').textContent, /momentum-plan/);
  const first = () => a.nodes.get('coach-plan-list').children[0].children.at(-1).children[0];
  await first().fire('click');
  assert.equal(a.urls.length, 1);
  assert.equal(a.stored().tasks.length, 1);
  assert.equal(a.stored().coachPlan[0].taskId, a.stored().tasks[0].id);
  const payload = JSON.parse(new URL(a.urls[0]).searchParams.get('text'));
  assert.equal(payload.title, 'Lire 🚗');
  assert.equal(payload.alert, 0);
  assert.equal(payload.duration, 30);
  await first().fire('click');
  assert.equal(a.urls.length, 1);
  assert.equal(a.stored().tasks.length, 1);
  await a.nodes.get('coach-plan-list').children[1].children.at(-1).children[0].fire('click');
  assert.equal(a.urls.length, 2);
  assert.equal(a.stored().tasks.length, 2);
  assert.equal(calls, 1);
  const resumed = app({ initial: a.stored() });
  assert.equal(
    resumed.nodes.get('coach-plan-list').children[0].children.at(-1).children[0].disabled,
    true
  );
  assert.equal(resumed.urls.length, 0);
});
test('invalid AI slots can be edited once, storage failures never dispatch Calendar, dismissed slots leave saved tasks intact', async () => {
  const entry = {
    title: 'Lecture',
    day: '2026-10-15',
    clock: '15:00',
    duration: 45,
    alert: null,
    category: 'Projet',
  };
  const a = app({ initial: { tasks: [], jobs: [], coachPlan: [entry] } });
  const controls = a.nodes.get('coach-plan-list').children[0].children.at(-1).children;
  assert.equal(controls[0].disabled, true);
  await controls[0].fire('click');
  assert.equal(a.urls.length, 0);
  await controls[1].fire('click');
  assert.equal(a.nodes.get('draft-title').value, 'Lecture');
  a.nodes.get('draft-duration').value = '30';
  a.nodes.get('draft-alert').value = '0';
  await a.nodes.get('draft-alert').fire('input');
  await a.nodes.get('draft-confirm').fire('click');
  assert.equal(a.urls.length, 1);
  assert.equal(a.stored().coachPlan[0].alert, 0);
  assert.ok(a.stored().coachPlan[0].taskId);
  await a.nodes.get('coach-plan-dismiss').fire('click');
  assert.equal(a.stored().coachPlan.length, 0);
  assert.equal(a.stored().tasks.length, 1);
  const b = app({
    failStorage: true,
    initial: { tasks: [], jobs: [], coachPlan: [{ ...entry, duration: 30, alert: 0 }] },
  });
  await b.nodes.get('coach-plan-list').children[0].children.at(-1).children[0].fire('click');
  assert.equal(b.urls.length, 0);
  assert.equal(b.memory().tasks.length, 0);
});
