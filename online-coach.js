'use strict';
(function (root) {
  const ENDPOINT = 'https://text.pollinations.ai/openai',
    MODEL = 'openai-fast',
    INTERVAL = 30000;
  function problem(code, message, retryAfter = 0) {
    return Object.assign(Error(message), { code, retryAfter });
  }
  function createClient({
    fetchFn = root.fetch?.bind(root),
    buildMessages,
    maxTokensFor = () => 700,
    now = () => Date.now(),
    timeoutMs = 45000,
    timers = root,
    storage,
  } = {}) {
    let enabled = false,
      active = null,
      nextAt = 0;
    try {
      nextAt = Number(storage?.getItem('momentum.ai.anonymous.next')) || 0;
      if (nextAt > now() + 300000) nextAt = 0;
    } catch {
      /* An unavailable session store must not prevent using the coach. */
    }
    const reserve = (value) => {
      nextAt = value;
      try {
        storage?.setItem('momentum.ai.anonymous.next', String(value));
      } catch {
        /* An unavailable session store must not prevent using the coach. */
      }
    };
    return {
      get ready() {
        return enabled;
      },
      get waitSeconds() {
        return Math.max(0, Math.ceil((nextAt - now()) / 1000));
      },
      async load({ consent = false } = {}) {
        if (!consent)
          throw problem('CONSENT', 'Autorise l’envoi à Pollinations pour activer l’IA en ligne.');
        enabled = true;
      },
      async generate(state, input, onText = () => {}, date = new Date()) {
        if (!enabled) throw problem('DISABLED', 'Active d’abord l’IA en ligne.');
        if (active) throw problem('BUSY', 'Une réponse est déjà en cours.');
        const wait = Math.max(0, Math.ceil((nextAt - now()) / 1000));
        if (wait)
          throw problem(
            'COOLDOWN',
            'Le service gratuit accepte une demande toutes les 30 secondes par adresse IP. Réessaie dans ' +
              wait +
              ' s.',
            wait
          );
        if (typeof fetchFn !== 'function')
          throw problem('NETWORK', 'La connexion au service n’est pas disponible.');
        const request = { controller: new AbortController(), stopped: false, timedOut: false };
        active = request;
        reserve(now() + INTERVAL);
        const timer = timers.setTimeout(() => {
          request.timedOut = true;
          request.controller.abort();
        }, timeoutMs);
        try {
          const response = await fetchFn(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: MODEL,
              messages: buildMessages(state, input, date),
              max_tokens: Math.max(100, Math.min(1500, Number(maxTokensFor(state, input)) || 700)),
              temperature: 0.4,
              stream: false,
            }),
            signal: request.controller.signal,
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            cache: 'no-store',
            redirect: 'error',
          });
          if (request.stopped) throw problem('CANCELLED', 'Réponse interrompue.');
          if (response.status === 402 || response.status === 429) {
            const h = response.headers?.get('Retry-After');
            let seconds = Number(h);
            if (!h || !Number.isFinite(seconds))
              seconds = Math.ceil((Date.parse(h) - now()) / 1000);
            seconds = Number.isFinite(seconds) ? Math.max(1, Math.min(300, seconds)) : 30;
            reserve(now() + seconds * 1000);
            throw problem(
              'RATE_LIMIT',
              'Limite du service gratuit atteinte. Réessaie dans ' +
                seconds +
                ' s. Aucun paiement n’est effectué.',
              seconds
            );
          }
          if (!response.ok)
            throw problem('SERVICE', 'Le service gratuit est indisponible. Réessaie plus tard.');
          const payload = await response.json();
          if (request.stopped) throw problem('CANCELLED', 'Réponse interrompue.');
          const choice = payload.choices?.[0],
            content = choice?.message?.content;
          if (choice?.finish_reason === 'length')
            throw problem(
              'INCOMPLETE',
              'La réponse a atteint sa limite. Essaie une demande plus courte.'
            );
          if (typeof content !== 'string' || !content.trim() || content.length > 12000)
            throw problem('EMPTY', 'Le service n’a pas produit de réponse utilisable.');
          const answer = content.trim();
          onText(answer);
          return answer;
        } catch (e) {
          if (request.stopped) throw problem('CANCELLED', 'Réponse interrompue.');
          if (request.timedOut)
            throw problem(
              'TIMEOUT',
              'Le service met trop de temps à répondre. Réessaie plus tard.'
            );
          if (e.code) throw e;
          throw problem(
            'NETWORK',
            'La connexion au service a échoué. Les conseils guidés restent disponibles.'
          );
        } finally {
          timers.clearTimeout(timer);
          if (active === request) active = null;
        }
      },
      stop() {
        if (active) {
          active.stopped = true;
          active.controller.abort();
        }
      },
      async unload() {
        enabled = false;
        this.stop();
      },
    };
  }
  const api = { createClient };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MomentumOnlineCoach = api;
})(globalThis);
