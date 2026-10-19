'use strict';
const { sanitize, seed } = MomentumStore;
const loaded = MomentumStore.load(localStorage);
let state = loaded.state;
const $ = (id) => document.getElementById(id),
  save = () => {
    if (MomentumStore.save(localStorage, state)) return true;
    feedback('Enregistrement local impossible. Libère de l’espace puis réessaie.');
    return false;
  };
const actionsById = new Map();
function onAction(id, handler) {
  actionsById.set(id, handler);
}
window.MomentumActions = {
  run(el, event) {
    if (el.disabled) return;
    return actionsById.get(el.id)?.(event);
  },
  navigate: (id) => navigate(id),
  coach: (key) => coachSend(coachPrompts[key]),
};
let confirmationResolve = null,
  confirmationTrigger = null;
function askConfirmation(title, message, verb) {
  if (confirmationResolve) return Promise.resolve(false);
  confirmationTrigger = document.activeElement;
  $('dialog-title').textContent = title;
  $('dialog-description').textContent = message;
  $('dialog-accept').textContent = verb;
  return new Promise((resolve) => {
    confirmationResolve = resolve;
    $('confirm-dialog').showModal();
    document.body.classList.add('dialog-open');
    $('dialog-cancel').focus();
  });
}
function closeConfirmation(accepted) {
  if (!confirmationResolve) return;
  const resolve = confirmationResolve;
  confirmationResolve = null;
  $('confirm-dialog').close();
  document.body.classList.remove('dialog-open');
  confirmationTrigger?.focus?.();
  resolve(accepted);
}
onAction('dialog-cancel', () => closeConfirmation(false));
onAction('dialog-accept', () => closeConfirmation(true));
$('confirm-dialog').addEventListener('cancel', (e) => {
  e.preventDefault();
  closeConfirmation(false);
});
onAction('feedback-close', () => {
  $('feedback-area').hidden = true;
});
const addText = (parent, tag, text, cls) => {
  const el = document.createElement(tag);
  el.textContent = text;
  if (cls) el.className = cls;
  parent.append(el);
  return el;
};
const fmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
$('today').textContent = fmt.format(new Date());
function navigate(id) {
  document.querySelectorAll('.screen').forEach((s) => (s.hidden = s.id !== id));
  document.querySelectorAll('[data-nav]').forEach((b) => {
    const active = b.dataset.nav === id;
    b.classList.toggle('active', active);
    if (active) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  document.title =
    ({
      home: 'Aujourd’hui',
      tasks: 'Actions',
      coach: 'Coach',
      jobs: 'Emploi',
      settings: 'Réglages',
    }[id] || 'MOMENTUM') + ' — MOMENTUM v0.15.0';
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function makeTask(t, compact = false) {
  const row = document.createElement('div');
  row.className = 'task';
  const check = document.createElement('input');
  check.type = 'checkbox';
  check.checked = t.done;
  check.setAttribute('aria-label', 'Terminer : ' + t.title);
  check.addEventListener('change', () => {
    t.done = check.checked;
    save();
    render();
  });
  const label = document.createElement('label');
  label.className = 'task-check';
  label.append(check);
  row.append(label);
  const wrapper = document.createElement('div');
  wrapper.className = 'text';
  addText(wrapper, 'div', t.title, t.done ? 'done' : '');
  addText(wrapper, 'span', t.category, 'tag');
  if (t.due) {
    addText(
      wrapper,
      'span',
      '📅 ' +
        new Date(t.due + 'T12:00:00').toLocaleDateString('fr-FR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }) +
        ' · ' +
        (t.time || '14:00'),
      'extra'
    );
    if (t.bridgeLaunched)
      addText(
        wrapper,
        'span',
        'Demande envoyée à Raccourcis (enregistrement Apple non confirmé)',
        'extra'
      );
  }
  if (t.due && !compact) {
    const send = document.createElement('button');
    send.type = 'button';
    send.className = 'btn small ghost calendar';
    send.textContent = t.bridgeLaunched ? 'Renvoyer à Calendrier' : 'Envoyer à Calendrier';
    send.addEventListener('click', () => {
      try {
        MomentumPlanner.validate({
          title: t.title,
          day: t.due,
          clock: t.time,
          duration: t.duration,
          alert: t.alert,
        });
        launchAppleBridge(t);
      } catch (err) {
        feedback(err.message);
      }
    });
    wrapper.append(send);
  }
  row.append(wrapper);
  if (compact) return row;
  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'icon-btn';
  edit.textContent = '✎';
  edit.setAttribute('aria-label', 'Modifier ' + t.title);
  edit.addEventListener('click', () => openEdit('task', t));
  row.append(edit);
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'danger';
  del.textContent = '×';
  del.setAttribute('aria-label', 'Supprimer ' + t.title);
  del.addEventListener('click', async () => {
    if (
      !(await askConfirmation(
        'Supprimer cette action ?',
        t.title +
          ' sera supprimée de MOMENTUM. Un événement déjà créé dans Calendrier restera intact.',
        'Supprimer'
      ))
    )
      return;
    state.tasks = state.tasks.filter((x) => x.id !== t.id);
    save();
    render();
  });
  row.append(del);
  return row;
}
function render() {
  const done = state.tasks.filter((x) => x.done).length,
    total = state.tasks.length;
  $('count-done').textContent = `${done}/${total}`;
  $('count-jobs').textContent = state.jobs.length;
  renderUpcoming();
  renderSuggestions();
  showImpulse();
  const pct = total ? Math.round((done / total) * 100) : 0;
  $('pct').textContent = pct + ' %';
  $('bar').style.width = pct + '%';
  for (const id of ['home-tasks', 'task-list']) {
    const node = $(id);
    node.replaceChildren();
    const list =
      id === 'home-tasks'
        ? MomentumCoach.priorityTasks(state).slice(0, 3)
        : [...MomentumCoach.priorityTasks(state), ...state.tasks.filter((t) => t.done)];
    if (!list.length)
      addText(
        node,
        'div',
        total
          ? 'Tes actions sont accomplies. Tu peux souffler.'
          : 'Ajoute ta première action pour commencer.',
        'empty'
      );
    else list.forEach((t) => node.append(makeTask(t, id === 'home-tasks')));
  }
  const node = $('job-list');
  node.replaceChildren();
  if (!state.jobs.length) addText(node, 'div', 'Aucune offre enregistrée pour le moment.', 'empty');
  state.jobs.forEach((j) => {
    const div = document.createElement('div');
    div.className = 'job';
    addText(div, 'strong', j.title);
    addText(div, 'p', j.status + (j.followup ? ' · Suivi : ' + j.followup : ''), 'muted small');
    const actions = document.createElement('div');
    actions.className = 'actions';
    if (j.link) {
      const a = document.createElement('a');
      a.href = j.link;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'btn small secondary';
      a.textContent = 'Voir l’annonce ↗';
      actions.append(a);
    }
    const sel = document.createElement('select');
    sel.setAttribute('aria-label', 'Statut de ' + j.title);
    sel.className = 'job-status';
    ['À étudier', 'Candidature préparée', 'Envoyée', 'Entretien', 'Refusée'].forEach((s) => {
      const o = document.createElement('option');
      o.textContent = s;
      o.selected = j.status === s;
      sel.append(o);
    });
    sel.addEventListener('change', () => {
      j.status = sel.value;
      save();
      render();
    });
    actions.append(sel);
    const follow = document.createElement('input');
    follow.type = 'date';
    follow.value = j.followup || '';
    follow.setAttribute('aria-label', 'Date de suivi pour ' + j.title);
    follow.className = 'job-followup';
    follow.addEventListener('change', () => {
      j.followup = follow.value;
      save();
      render();
    });
    actions.append(follow);
    const editJob = document.createElement('button');
    editJob.type = 'button';
    editJob.className = 'btn small ghost';
    editJob.textContent = 'Modifier';
    editJob.setAttribute('aria-label', 'Modifier ' + j.title);
    editJob.addEventListener('click', () => openEdit('job', j));
    actions.append(editJob);
    const remove = document.createElement('button');
    remove.className = 'btn small ghost';
    remove.textContent = 'Supprimer';
    remove.addEventListener('click', async () => {
      if (
        await askConfirmation(
          'Supprimer cette offre ?',
          j.title + ' sera supprimée de MOMENTUM. Cette suppression est définitive.',
          'Supprimer'
        )
      ) {
        state.jobs = state.jobs.filter((x) => x.id !== j.id);
        save();
        render();
      }
    });
    actions.append(remove);
    div.append(actions);
    node.append(div);
  });
}
$('task-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const title = $('task-title').value.trim();
  if (!title) {
    fieldError('task-title', 'task-form-error', 'Indique le nom de l’action.');
    return;
  }
  fieldError('task-title', 'task-form-error', '');
  const task = sanitize({
    tasks: [{ id: crypto.randomUUID(), title, category: $('task-category').value }],
  }).tasks[0];
  state.tasks.unshift(task);
  if (!save()) {
    state.tasks.shift();
    return;
  }
  $('task-title').value = '';
  render();
  feedback('Action ajoutée. Touche ✎ pour choisir une date et l’envoyer à Calendrier.');
});
$('job-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const title = $('job-title').value.trim(),
    link = $('job-link').value.trim();
  if (!title) {
    fieldError('job-title', 'job-form-error', 'Indique le poste ou l’entreprise.');
    return;
  }
  fieldError('job-title', 'job-form-error', '');
  if (link && !/^https?:\/\//i.test(link)) {
    feedback('Utilise un lien commençant par https://');
    fieldError('job-link', 'job-form-error', 'Utilise un lien commençant par https://');
    return;
  }
  state.jobs.unshift({
    id: crypto.randomUUID(),
    title,
    link,
    status: $('job-status').value,
    followup: $('job-followup').value,
  });
  $('job-form').reset();
  save();
  render();
});
function employmentAdvice() {
  const today = new Date().toLocaleDateString('en-CA');
  const followups = state.jobs.filter(
    (j) =>
      j.followup &&
      j.followup <= today &&
      ['Envoyée', 'Entretien', 'Candidature préparée'].includes(j.status)
  );
  if (followups.length)
    return `À vérifier aujourd'hui : ${followups[0].title} (${followups[0].status}). Consulte l'historique avant toute relance.`;
  const pending = state.jobs.filter((j) => j.status === 'À étudier');
  if (pending.length)
    return `Étudie d'abord « ${pending[0].title} » pendant 15 minutes : CDI, rémunération, trajet réel et missions. Décide ensuite si tu prépares une candidature.`;
  return 'Consacre 20 minutes à rechercher une seule offre compatible avec tes critères. Ajoute-la ici pour assurer son suivi.';
}
onAction('job-daily-action', () => {
  $('job-advice').textContent = employmentAdvice();
});
onAction('job-review', () => {
  const jobs = state.jobs.filter(
    (j) =>
      j.status === 'À étudier' ||
      (j.followup && j.followup <= new Date().toLocaleDateString('en-CA'))
  );
  $('job-advice').textContent = jobs.length
    ? jobs
        .map((j) => j.title + ' — ' + j.status + (j.followup ? ' (' + j.followup + ')' : ''))
        .slice(0, 5)
        .join(' • ')
    : 'Aucune offre en attente ou relance datée. Rien n’a été recherché automatiquement.';
});
onAction('home-all', () => navigate('tasks'));
onAction('home-add', () => {
  navigate('tasks');
  $('task-title').focus();
});
onAction('home-plan', () => {
  navigate('tasks');
  $('smart-text').focus();
});
let impulse = 0,
  impulseTarget = 'tasks';
function showImpulse() {
  const c = MomentumCoach.context(state),
    task = c.tasks[0];
  const suggestions = [];
  if (c.followups.length)
    suggestions.push({
      title: 'Une candidature à suivre.',
      text:
        'Vérifie ton dernier échange pour « ' +
        c.followups[0].title +
        ' » avant de préparer une relance.',
      target: 'jobs',
    });
  if (task)
    suggestions.push({
      title: 'Un petit pas sur ta priorité.',
      text:
        '« ' +
        task.title +
        ' »' +
        (task.due && task.due <= c.today ? ' — la date prévue est arrivée.' : '.') +
        ' Commence par 10 minutes.',
      target: 'tasks',
    });
  if (c.opportunities.length)
    suggestions.push({
      title: 'Une piste à explorer.',
      text: 'Examine « ' + c.opportunities[0] + ' » pendant 15 minutes et choisis la suite.',
      target: 'jobs',
    });
  suggestions.push({
    title: task ? 'Prends un moment pour toi.' : 'Une petite action suffit.',
    text: task
      ? 'Une pause ou un peu d’air peut aider à repartir. Le coach peut adapter ton prochain pas.'
      : 'Ta liste est à jour. Choisis une nouvelle action utile, à ton rythme.',
    target: task ? 'coach' : 'tasks',
  });
  const chosen = suggestions[impulse % suggestions.length];
  impulseTarget = chosen.target;
  $('impulse-title').textContent = chosen.title;
  $('impulse-text').textContent = chosen.text;
  $('impulse-go').textContent =
    chosen.target === 'jobs'
      ? 'Voir cette candidature'
      : chosen.target === 'coach'
        ? 'Choisir avec le coach'
        : 'Voir mes actions';
}
onAction('new-impulse', () => {
  impulse++;
  showImpulse();
});
onAction('impulse-go', () => navigate(impulseTarget));
const coachPrompts = {
  blocked: 'Je tourne en rond. Aide-moi à choisir une petite prochaine action.',
  low: 'Je suis peu motivé aujourd’hui. Propose une action très courte.',
  job: 'Ma priorité est l’emploi. Que puis-je faire maintenant ?',
  win: 'J’ai avancé aujourd’hui. Aide-moi à choisir la suite.',
};
$('profile-name').value = state.name;
$('coach-tone').value = state.tone;
onAction('save-settings', () => {
  state.name = $('profile-name').value.trim().slice(0, 45);
  state.tone = $('coach-tone').value;
  save();
  $('settings-status').textContent = 'Préférences enregistrées.';
});
onAction('export-data', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }),
    url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = 'momentum-sauvegarde.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('import-file').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > 1_000_000) throw Error('Fichier trop volumineux');
    const imported = sanitize(JSON.parse(await file.text()));
    if (
      !(await askConfirmation(
        'Importer cette sauvegarde ?',
        'Les données actuelles seront remplacées. Exporte une sauvegarde si tu souhaites les conserver.',
        'Importer'
      ))
    )
      return;
    state = imported;
    clearCoachDraft();
    save();
    $('profile-name').value = state.name;
    $('coach-tone').value = state.tone;
    render();
    renderCoach();
    $('settings-status').textContent = 'Sauvegarde importée.';
  } catch (err) {
    $('settings-status').textContent = 'Import impossible : ' + err.message;
  } finally {
    e.target.value = '';
  }
});
onAction('reset-data', async () => {
  if (
    await askConfirmation(
      'Réinitialiser MOMENTUM ?',
      'Toutes les tâches, offres et préférences locales seront effacées. Les événements Apple resteront intacts. Cette suppression est définitive.',
      'Réinitialiser'
    )
  ) {
    state = seed();
    clearCoachDraft();
    save();
    $('profile-name').value = '';
    $('coach-tone').value = 'balanced';
    render();
    renderCoach();
    $('settings-status').textContent = 'Données réinitialisées.';
  }
});
// Conseils guidés contextuels et conversation locale facultative.
const dailyKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
function coachReply(input) {
  return MomentumCoach.localReply(state, input);
}
function renderCoach() {
  const recent = [...state.coachHistory].reverse().find((m) => m.role === 'coach');
  $('coach-message').textContent =
    recent?.text ||
    'Qu’est-ce qui compte pour toi aujourd’hui ? Dis-moi ce qui te bloque ou choisis une situation ci-dessous.';
  const log = $('coach-log');
  log.replaceChildren();
  state.coachHistory.slice(-20).forEach((m) => {
    const line = document.createElement('div');
    line.className = 'coach-line ' + (m.role === 'moi' ? 'mine' : 'bot');
    addText(line, 'small', m.role === 'moi' ? 'Toi' : 'Momentum');
    addText(line, 'div', m.text);
    log.append(line);
  });
}
let coachBusy = false,
  coachDraft = null;
const onlineAI = MomentumOnlineCoach.createClient({
  fetchFn: (...args) => fetch(...args),
  buildMessages: MomentumCoach.messages,
  storage: typeof sessionStorage === 'undefined' ? undefined : sessionStorage,
});
function coachMode() {
  const ready = onlineAI.ready;
  $('coach-mode').textContent = ready
    ? 'IA en ligne · Pollinations'
    : 'Conseils guidés · hors ligne';
  $('coach-ai-enable').hidden = ready;
  $('coach-ai-disable').hidden = !ready;
  $('coach-ai-caution').hidden = !ready;
}
function setCoachBusy(value) {
  coachBusy = value;
  $('coach-input').disabled = value;
  $('coach-form').querySelector('button').disabled = value;
  document.querySelectorAll('[data-coach]').forEach((b) => (b.disabled = value));
  $('coach-ai-stop').hidden = !value || !onlineAI.ready;
  $('coach-ai-stop').disabled = false;
  $('coach-ai-stop').textContent = 'Arrêter la réponse';
  $('coach-ai-disable').disabled = value;
}
async function coachSend(input) {
  const text = String(input || '')
    .trim()
    .slice(0, 500);
  if (!text || coachBusy) return;
  const localAnswer = MomentumCoach.directReply(state, text),
    localPlan =
      MomentumPlanner.isRequest(text) ||
      (coachDraft &&
        (MomentumPlanner.isScheduleFollowup(text) ||
          MomentumPlanner.parse(text, new Date(), coachDraft).negated ||
          /^(?:annule|oublie)(?: cette| la)? proposition[.!]?$/i.test(text)));
  if (onlineAI.ready && onlineAI.waitSeconds && !localAnswer && !localPlan) {
    $('coach-ai-status').textContent =
      'Le service gratuit accepte une demande toutes les 30 secondes. Réessaie dans ' +
      onlineAI.waitSeconds +
      ' s ; ton message reste dans la saisie.';
    if (!$('coach-input').value) $('coach-input').value = text;
    return;
  }
  const requestState = state;
  setCoachBusy(true);
  requestState.coachHistory.push({ role: 'moi', text });
  save();
  renderCoach();
  $('coach-message').textContent = onlineAI.ready
    ? 'Je prépare ta réponse…'
    : 'Je prépare une réponse guidée…';
  let reply;
  coachMode();
  try {
    const draft = MomentumPlanner.parse(text, new Date(), coachDraft),
      exact = MomentumCoach.directReply(requestState, text);
    if (exact) reply = exact;
    else if (coachDraft && draft.negated) {
      clearCoachDraft();
      reply = 'Proposition annulée. Aucune tâche ni aucun événement n’a été créé.';
    } else if (coachDraft && /^(?:annule|oublie)(?: cette| la)? proposition[.!]?$/i.test(text)) {
      clearCoachDraft();
      reply = 'Proposition annulée. Aucune tâche ni aucun événement n’a été créé.';
    } else if (
      MomentumPlanner.isRequest(text) ||
      (coachDraft && MomentumPlanner.isScheduleFollowup(text))
    ) {
      showCoachDraft(draft);
      reply =
        'J’ai préparé une proposition de créneau. ' +
        (draftProblem(draft) || 'Vérifie les détails, puis touche « Ajouter à Calendrier ».');
    } else
      reply = onlineAI.ready
        ? await onlineAI.generate(requestState, text, (t) => {
            if (state === requestState) $('coach-message').textContent = t;
          })
        : coachReply(text);
  } catch (err) {
    if (state !== requestState) return;
    if (!$('coach-input').value) $('coach-input').value = text;
    if (err.message === 'Réponse interrompue.') {
      $('coach-ai-status').textContent = 'Réponse interrompue. Tu peux reformuler ton message.';
      $('coach-message').textContent = 'Prends ton temps. Je suis prêt pour ton prochain message.';
      return;
    }
    $('coach-ai-status').textContent = err.message + ' Aucun service payant n’est utilisé.';
    $('coach-mode').textContent = 'Conseils guidés de secours';
    if (['writing', 'other'].includes(MomentumCoach.intent(text, requestState).topic)) {
      $('coach-message').textContent = err.message;
      return;
    }
    reply = coachReply(text);
  } finally {
    setCoachBusy(false);
  }
  if (state !== requestState) return;
  requestState.coachHistory.push({ role: 'coach', text: reply });
  requestState.coachHistory = requestState.coachHistory.slice(-60);
  save();
  renderCoach();
  $('coach-message').textContent = reply;
}
$('coach-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = $('coach-input').value;
  if (!text.trim()) {
    fieldError('coach-input', 'coach-input-error', 'Écris ton message pour continuer.');
    return;
  }
  fieldError('coach-input', 'coach-input-error', '');
  $('coach-input').value = '';
  return coachSend(text);
});
onAction('coach-ai-enable', async () => {
  if (!$('coach-cloud-consent').checked) {
    $('coach-ai-status').textContent = 'Autorise l’envoi des messages pour activer l’IA en ligne.';
    $('coach-cloud-consent').focus();
    return;
  }
  await onlineAI.load({ consent: true });
  $('coach-ai-status').textContent =
    'IA en ligne activée pour cette session. Gratuit, sans compte ; une demande toutes les 30 secondes par adresse IP.';
  coachMode();
});
$('coach-cloud-consent').addEventListener('change', async () => {
  if (!$('coach-cloud-consent').checked) {
    await onlineAI.unload();
    $('coach-ai-status').textContent =
      'Autorisation retirée. Aucun nouveau message ne sera envoyé au service.';
    coachMode();
  }
});
onAction('coach-ai-stop', () => {
  onlineAI.stop();
  $('coach-ai-stop').disabled = true;
  $('coach-ai-stop').textContent = 'Arrêt en cours…';
  $('coach-message').textContent = 'J’arrête cette réponse. Cela peut prendre quelques instants.';
});
onAction('coach-ai-disable', async () => {
  await onlineAI.unload().catch(() => {});
  $('coach-ai-status').textContent =
    'Retour aux conseils guidés. Aucun nouveau message ne sera envoyé au service.';
  coachMode();
});
// One delegated listener replaces inline handlers so the page can run under a strict CSP.
document.addEventListener('click', (event) => {
  const target = event.target.closest?.('button, a');
  if (!target || target.disabled) return;
  if (target.dataset.nav) navigate(target.dataset.nav);
  else if (target.dataset.coach) coachSend(coachPrompts[target.dataset.coach]);
  else if (target.id && actionsById.has(target.id)) window.MomentumActions.run(target, event);
});
onAction('home-coach', () => navigate('coach'));
coachMode();
function feedback(message) {
  $('app-feedback').textContent = message;
  $('feedback-area').hidden = false;
}
function fieldError(id, target, message) {
  const node = $(id);
  node.setAttribute('aria-invalid', message ? 'true' : 'false');
  node.setAttribute('aria-describedby', target);
  $(target).textContent = message;
  if (message) node.focus();
}
function draftProblem(c) {
  try {
    MomentumPlanner.validate(c);
    return c.issues?.[0] || '';
  } catch (err) {
    return c.issues?.[0] || err.message;
  }
}
function clearCoachDraft() {
  coachDraft = null;
  $('coach-draft').hidden = true;
  $('coach-create-task').hidden = false;
}
function showCoachDraft(c) {
  coachDraft = c;
  $('coach-draft').hidden = false;
  $('coach-create-task').hidden = true;
  for (const [field, key] of [
    ['title', 'title'],
    ['date', 'day'],
    ['time', 'clock'],
    ['duration', 'duration'],
    ['alert', 'alert'],
  ])
    $('draft-' + field).value = String(c[key] ?? '');
  updateDraftStatus(c);
  $('coach-draft').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function readDraft() {
  return {
    ...coachDraft,
    title: $('draft-title').value,
    day: $('draft-date').value,
    clock: $('draft-time').value,
    duration: Number($('draft-duration').value) || null,
    alert: $('draft-alert').value === '' ? null : Number($('draft-alert').value),
    issues: [],
  };
}
function updateDraftStatus(c) {
  const problem = draftProblem(c);
  $('draft-status').textContent =
    problem || 'Prêt à enregistrer. Le raccourci Apple recevra ce créneau.';
  $('draft-status').classList.toggle('error', !!problem);
  $('draft-confirm').disabled = !!problem;
  for (const field of ['title', 'date', 'time', 'duration', 'alert']) {
    $('draft-' + field).setAttribute('aria-describedby', 'draft-status');
    $('draft-' + field).setAttribute(
      'aria-invalid',
      problem && !$('draft-' + field).value ? 'true' : 'false'
    );
  }
}
for (const id of ['draft-title', 'draft-date', 'draft-time', 'draft-duration', 'draft-alert'])
  $(id).addEventListener('input', () => {
    if (!coachDraft) return;
    coachDraft = readDraft();
    updateDraftStatus(coachDraft);
  });
onAction('draft-cancel', () => {
  clearCoachDraft();
  $('coach-action-status').textContent = 'Proposition annulée. Aucune action enregistrée.';
});
onAction('coach-create-task', () => {
  const recent = [...state.coachHistory].reverse().find((x) => x.role === 'moi');
  if (!recent) {
    $('coach-action-status').textContent = 'Écris d’abord l’action que tu souhaites prévoir.';
    return;
  }
  showCoachDraft(MomentumPlanner.parse(recent.text));
  $('coach-action-status').textContent = 'Complète le créneau ci-dessous.';
  $('coach-draft').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});
function savePlannedAction(c) {
  const valid = MomentumPlanner.validate(c);
  if (state.tasks.some((t) => MomentumPlanner.same(t, valid)))
    throw Error('Une action identique existe déjà pour ce créneau. Retrouve-la dans Actions.');
  const item = {
    id: crypto.randomUUID(),
    title: valid.title,
    category: valid.category,
    done: false,
    due: valid.day,
    time: valid.clock,
    duration: valid.duration,
    alert: valid.alert,
  };
  MomentumBridge.build(item);
  state.tasks.unshift(item);
  if (!save()) {
    state.tasks.shift();
    throw Error('Enregistrement impossible. Aucun événement n’a été demandé.');
  }
  render();
  return item;
}
onAction('draft-confirm', () => {
  if (!coachDraft) return;
  try {
    const item = savePlannedAction(readDraft());
    clearCoachDraft();
    $('coach-action-status').textContent =
      'Action enregistrée. Demande envoyée à Raccourcis Apple ; vérifie Calendrier.';
    feedback('Action enregistrée. Ouverture de Raccourcis Apple.');
    const launched = launchAppleBridge(item);
    if (!launched)
      $('coach-action-status').textContent =
        'Action enregistrée. Réessaie l’envoi à Calendrier depuis Actions.';
  } catch (err) {
    $('draft-status').textContent = err.message;
    $('draft-status').classList.add('error');
  }
});

if (state.coachLastDate !== dailyKey()) {
  state.coachLastDate = dailyKey();
  save();
}
if (loaded.recovered)
  feedback(
    'Tes données étaient illisibles. Une copie a été conservée sur cet appareil et une liste vide a été créée.'
  );
MomentumStore.requestPersistence(navigator.storage);
renderCoach();
render();
// A new service worker takes over on its own; the banner offers the reload that shows the new code.
function watchForUpdates() {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) $('update-banner').hidden = false;
  });
  navigator.serviceWorker
    .register('./sw.js')
    .then((registration) => {
      const check = () => registration.update().catch(() => {});
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      check();
    })
    .catch(() => {});
}
if ('serviceWorker' in navigator && location.protocol.startsWith('http'))
  window.addEventListener('load', watchForUpdates);
onAction('update-apply', () => location.reload());

// Planification V0.3. Dates interprétées en heure locale de l'iPhone.
let planCandidate = null;
const dateStr = (d) =>
  [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
const stripAccents = (s) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
function parseIntent(raw) {
  const c = MomentumPlanner.parse(raw);
  c.weather =
    c.weather || /tond|pelouse|jardin|laver.*voiture|nettoy.*voiture/.test(stripAccents(raw));
  c.reason = c.day
    ? 'Vérifie le créneau avant de l’ajouter à Calendrier.'
    : 'Choisis une date et une heure pour prévoir cette action.';
  return c;
}
function forecastStatus(hours) {
  const p = hours.precipitation || [],
    pop = hours.precipitation_probability || [],
    wind = hours.wind_speed_10m || [],
    time = hours.time || [];
  const now = new Date();
  let candidates = [];
  for (let i = 0; i < time.length; i++) {
    const d = new Date(time[i]);
    if (d < now || d.getHours() < 10 || d.getHours() > 17) continue;
    if ((p[i] ?? 0) > 0.15 || (pop[i] ?? 100) > 30 || (wind[i] ?? 100) > 30) continue;
    // Écarter au moins les deux heures précédentes si les données sont présentes.
    if (i >= 2 && [i - 1, i - 2].some((k) => (p[k] ?? 0) > 0.35)) continue;
    candidates.push({
      date: dateStr(d),
      time: String(d.getHours()).padStart(2, '0') + ':00',
      score: (pop[i] ?? 0) + (wind[i] ?? 0) / 3,
    });
  }
  candidates.sort((a, b) => a.score - b.score || a.date.localeCompare(b.date));
  return candidates[0] || null;
}
async function loadWeather(city) {
  const place = await fetch(
    'https://geocoding-api.open-meteo.com/v1/search?name=' +
      encodeURIComponent(city) +
      '&count=5&language=fr&format=json',
    { signal: AbortSignal.timeout(9000) }
  );
  if (!place.ok) throw Error('Service météo indisponible');
  const found = (await place.json()).results || [];
  const location = found.find((x) => x.country_code === 'FR') || found[0];
  if (!location) throw Error('Ville introuvable. Vérifie son orthographe.');
  const query = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    hourly: 'precipitation,precipitation_probability,wind_speed_10m',
    forecast_days: '7',
    timezone: location.timezone || 'Europe/Paris',
  });
  const resp = await fetch('https://api.open-meteo.com/v1/forecast?' + query, {
    signal: AbortSignal.timeout(9000),
  });
  if (!resp.ok) throw Error('Prévisions indisponibles');
  return { location, hourly: (await resp.json()).hourly };
}
function showCandidate(c, explanation) {
  planCandidate = c;
  $('smart-preview').hidden = false;
  $('plan-title').value = c.title;
  $('plan-date').value = c.day || '';
  $('plan-time').value = c.clock || '';
  $('plan-duration').value = String(c.duration ?? 60);
  $('plan-alert').value = String(c.alert ?? 30);
  $('smart-explanation').classList.remove('error');
  $('smart-explanation').textContent =
    explanation + (c.issues?.length ? ' ' + c.issues.join(' ') : '');
}
$('smart-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = $('smart-text').value.trim();
  if (!text) {
    fieldError('smart-text', 'smart-form-error', 'Décris l’action que tu souhaites prévoir.');
    return;
  }
  fieldError('smart-text', 'smart-form-error', '');
  const c = parseIntent(text);
  if (c.weather) {
    $('weather-report').textContent = 'Consultation de la météo…';
    try {
      const data = await loadWeather(weatherCity());
      const best = forecastStatus(data.hourly);
      if (best && !c.day) {
        c.day = best.date;
        c.clock = best.time;
      }
      const msg = best
        ? 'Créneau météo suggéré : ' +
          best.date +
          ' à ' +
          best.time +
          '. Vérifie les conditions réelles avant de commencer.'
        : 'Aucun créneau suffisamment sec identifié dans les prévisions. Choisis une date manuellement.';
      $('weather-report').textContent = data.location.name + ' : ' + msg;
      showCandidate(c, msg);
    } catch (err) {
      $('weather-report').textContent = 'Météo non disponible : ' + err.message;
      showCandidate(c, 'Météo non vérifiée : sélectionne une date manuellement.');
    }
  } else
    showCandidate(
      c,
      c.reason || 'J’ai repéré une date. Vérifie la proposition avant de confirmer.'
    );
});
onAction('weather-check', async () => {
  const node = $('weather-report');
  node.textContent = 'Consultation de la météo…';
  try {
    const d = await loadWeather(weatherCity());
    const best = forecastStatus(d.hourly);
    node.textContent =
      d.location.name +
      ' : ' +
      (best
        ? 'Prochain créneau sec possible : ' + best.date + ' vers ' + best.time + '.'
        : 'Aucun créneau idéal sur 7 jours selon nos critères.');
  } catch (err) {
    node.textContent = 'Météo indisponible : ' + err.message;
  }
});
onAction('plan-cancel', () => {
  $('smart-preview').hidden = true;
  planCandidate = null;
});
onAction('plan-confirm', () => {
  if (!planCandidate) return;
  try {
    const item = savePlannedAction({
      ...planCandidate,
      title: $('plan-title').value,
      day: $('plan-date').value,
      clock: $('plan-time').value,
      duration: Number($('plan-duration').value) || null,
      alert: $('plan-alert').value === '' ? null : Number($('plan-alert').value),
    });
    $('smart-preview').hidden = true;
    $('smart-text').value = '';
    planCandidate = null;
    $('weather-report').textContent =
      'Action enregistrée. Demande envoyée à Raccourcis Apple ; vérifie Calendrier.';
    feedback('Action enregistrée. Ouverture de Raccourcis Apple.');
    launchAppleBridge(item);
  } catch (err) {
    $('smart-explanation').textContent = err.message;
    $('smart-explanation').classList.add('error');
    const id = !$('plan-title').value
      ? 'plan-title'
      : !$('plan-date').value
        ? 'plan-date'
        : !$('plan-time').value
          ? 'plan-time'
          : 'plan-date';
    $(id).setAttribute('aria-invalid', 'true');
    $(id).setAttribute('aria-describedby', 'smart-explanation');
    $(id).focus();
  }
});
function renderUpcoming() {
  const node = $('home-upcoming');
  node.replaceChildren();
  const list = state.tasks
    .filter((x) => !x.done && x.due)
    .sort((a, b) => (a.due + a.time).localeCompare(b.due + b.time))
    .slice(0, 3);
  if (!list.length) {
    node.textContent = 'Aucune tâche datée pour le moment.';
    return;
  }
  for (const t of list) addText(node, 'div', `${t.due} ${t.time || '14:00'} · ${t.title}`);
}
// Opening Shortcuts does not acknowledge a Calendar write.
function launchAppleBridge(task) {
  let data;
  try {
    data = MomentumBridge.build(task);
  } catch (err) {
    feedback(err.message);
    return false;
  }
  const previous = !!task.bridgeLaunched;
  task.bridgeLaunched = true;
  if (!save()) {
    task.bridgeLaunched = previous;
    feedback('Action conservée, mais Raccourcis n’a pas été lancé. Réessaie depuis Actions.');
    return false;
  }
  render();
  try {
    window.location.assign(MomentumBridge.url(data));
    feedback('Demande envoyée à Raccourcis Apple. Vérifie Calendrier.');
    return true;
  } catch {
    feedback('Action conservée. Raccourcis n’a pas pu être ouvert. Réessaie depuis Actions.');
    return false;
  }
}

// Weather city: the field wins, then the saved profile. No personal default is shipped.
function weatherCity() {
  const city = $('weather-city').value.trim() || state.profile.city;
  if (!city) throw Error('Indique ta ville ou enregistre-la dans ton profil.');
  return city;
}

// Search profile and plan.
function renderSearchPlan() {
  const p = state.profile;
  const parts = [];
  if (p.contract) parts.push(p.contract);
  if (p.minSalary) parts.push(p.minSalary + ' k€ minimum');
  if (p.maxCommute)
    parts.push(p.maxCommute + ' min de trajet maximum' + (p.city ? ' depuis ' + p.city : ''));
  else if (p.city) parts.push('autour de ' + p.city);
  $('search-plan').textContent = parts.length
    ? 'Tes critères : ' +
      parts.join(', ') +
      '. Vérifie chaque annonce : MOMENTUM ne recherche pas d’offres automatiquement.'
    : 'Ajoute tes critères (ville, salaire, trajet, contrat) dans Réglages pour guider ta recherche. MOMENTUM ne recherche pas d’offres automatiquement.';
  if (!$('weather-city').value) $('weather-city').value = p.city;
}
function fillProfileFields() {
  const p = state.profile;
  $('search-city').value = p.city;
  $('search-salary').value = p.minSalary || '';
  $('search-commute').value = p.maxCommute || '';
  $('search-contract').value = p.contract;
}
onAction('save-profile', () => {
  state.profile = sanitize({
    profile: {
      city: $('search-city').value,
      minSalary: $('search-salary').value,
      maxCommute: $('search-commute').value,
      contract: $('search-contract').value,
    },
  }).profile;
  if (!save()) return;
  fillProfileFields();
  $('weather-city').value = state.profile.city;
  renderSearchPlan();
  render();
  $('profile-status').textContent = 'Profil enregistré sur cet appareil.';
});

// Edit dialog shared by tasks, jobs and accepted coach ideas.
let editing = null;
const editDialog = $('edit-dialog');
function openEdit(kind, item, options = {}) {
  editing = { kind, item, ...options };
  const isTask = kind === 'task';
  $('edit-heading').textContent = options.isNew
    ? 'Ajouter cette action'
    : isTask
      ? 'Modifier l’action'
      : 'Modifier l’offre';
  $('edit-title').value = item.title;
  $('edit-task-fields').hidden = !isTask;
  $('edit-job-fields').hidden = isTask;
  if (isTask) {
    $('edit-category').value = item.category;
    $('edit-date').value = item.due || '';
    $('edit-time').value = item.time || '14:00';
    $('edit-duration').value = String(item.duration || 60);
    $('edit-alert').value = String(item.alert ?? 30);
  } else {
    $('edit-link').value = item.link || '';
    $('edit-status').value = item.status;
    $('edit-followup').value = item.followup || '';
  }
  $('edit-error').textContent = '';
  editDialog.showModal();
  document.body.classList.add('dialog-open');
  $('edit-title').focus();
}
function closeEdit() {
  if (editDialog.open) editDialog.close();
  document.body.classList.remove('dialog-open');
  editing = null;
}
onAction('edit-cancel', closeEdit);
editDialog.addEventListener('cancel', (e) => {
  e.preventDefault();
  closeEdit();
});
$('edit-form').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!editing) return;
  const { kind, item } = editing;
  const title = $('edit-title').value.trim();
  const fail = (message, id) => {
    $('edit-error').textContent = message;
    $(id).setAttribute('aria-invalid', 'true');
    $(id).focus();
  };
  if (!title) return fail('Indique un titre.', 'edit-title');
  if (kind === 'task') {
    const due = $('edit-date').value,
      time = $('edit-time').value;
    if (due && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
      return fail('Choisis une heure valide.', 'edit-time');
    const next = {
      title,
      category: $('edit-category').value,
      due,
      time: time || '14:00',
      duration: Number($('edit-duration').value),
      alert: Number($('edit-alert').value),
    };
    const slotChanged = next.due !== (item.due || '') || next.time !== item.time;
    Object.assign(item, next, slotChanged ? { bridgeLaunched: false } : {});
    if (editing.isNew) state.tasks.unshift(item);
  } else {
    const link = $('edit-link').value.trim();
    if (link && !/^https?:\/\//i.test(link))
      return fail('Utilise un lien commençant par https://', 'edit-link');
    Object.assign(item, {
      title,
      link,
      status: $('edit-status').value,
      followup: $('edit-followup').value,
    });
  }
  if (editing.suggestionKey) MomentumSuggestions.record(state, editing.suggestionKey, 'accepted');
  if (!save()) return;
  closeEdit();
  render();
});

// Coach ideas on the home screen: nothing is added until the user accepts.
function renderSuggestions() {
  const list = MomentumSuggestions.suggest(state);
  $('suggestions').hidden = !list.length;
  const node = $('suggestion-list');
  node.replaceChildren();
  for (const s of list) {
    const card = document.createElement('div');
    card.className = 'suggestion';
    addText(card, 'strong', s.title);
    addText(card, 'p', s.reason, 'muted small');
    const actions = document.createElement('div');
    actions.className = 'actions';
    const button = (label, cls, handler) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn small ' + cls;
      b.textContent = label;
      b.addEventListener('click', handler);
      actions.append(b);
    };
    button('Ajouter', '', () => acceptSuggestion(s));
    button('Modifier', 'secondary', () => editSuggestion(s));
    button('Plus tard', 'ghost', () => {
      MomentumSuggestions.record(state, s.key, 'later');
      if (save()) render();
    });
    card.append(actions);
    node.append(card);
  }
}
function suggestionTask(s) {
  return sanitize({
    tasks: [{ id: crypto.randomUUID(), title: s.title, category: s.category, due: s.due }],
  }).tasks[0];
}
function acceptSuggestion(s) {
  if (s.kind === 'reschedule') {
    const t = state.tasks.find((x) => x.id === s.taskId);
    if (t) Object.assign(t, { due: s.due, bridgeLaunched: false });
  } else state.tasks.unshift(suggestionTask(s));
  MomentumSuggestions.record(state, s.key, 'accepted');
  if (save()) {
    render();
    feedback('Action ajoutée à ta liste.');
  }
}
function editSuggestion(s) {
  if (s.kind === 'reschedule') {
    const t = state.tasks.find((x) => x.id === s.taskId);
    if (t) openEdit('task', t, { suggestionKey: s.key });
    return;
  }
  openEdit('task', suggestionTask(s), { isNew: true, suggestionKey: s.key });
}
fillProfileFields();
renderSearchPlan();
onAction('open-shortcuts', () => {
  location.assign('shortcuts://');
});
onAction('import-data', () => $('import-file').click());

$('smart-text').addEventListener('input', () => {
  $('smart-text').style.height = 'auto';
  $('smart-text').style.height = Math.min($('smart-text').scrollHeight || 100, 240) + 'px';
});
