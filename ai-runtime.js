// The optional third-party AI runtime runs in a worker, away from the DOM and the app data.
export async function CreateMLCEngine(model, options, config) {
  const worker = new Worker(new URL('./ai-worker.js', import.meta.url), { type: 'module' });
  let seq = 0,
    closed = false;
  const pending = new Map();
  worker.onmessage = ({ data }) => {
    const p = pending.get(data.id);
    if (!p) return;
    if (data.type === 'progress') options.initProgressCallback?.(data.value);
    else if (data.type === 'chunk') {
      p.queue?.push(data.value);
      p.wake?.();
    } else {
      pending.delete(data.id);
      if (data.type === 'error') p.reject(Error(String(data.message || 'L’IA locale a échoué.')));
      else p.resolve(data.value);
    }
  };
  worker.onerror = () => {
    for (const p of pending.values()) p.reject(Error('Le moteur IA local est indisponible.'));
    pending.clear();
    worker.terminate();
    closed = true;
  };
  function call(type, value, stream) {
    if (closed) return { promise: Promise.reject(Error('Le moteur IA est fermé.')) };
    const id = ++seq;
    let entry;
    const promise = new Promise((resolve, reject) => {
      entry = { resolve, reject, ...stream };
      pending.set(id, entry);
    });
    worker.postMessage({ id, type, value });
    return { promise, entry };
  }
  try {
    await call('load', { model, config }).promise;
  } catch (err) {
    worker.terminate();
    closed = true;
    throw err;
  }
  return {
    chat: {
      completions: {
        async create(request) {
          const queue = [];
          let done = false,
            error,
            wake;
          const stream = { queue, wake: () => wake?.() };
          const result = call('generate', request, stream);
          result.promise.then(
            () => {
              done = true;
              wake?.();
            },
            (err) => {
              error = err;
              done = true;
              wake?.();
            }
          );
          return (async function* () {
            while (!done || queue.length) {
              if (queue.length) {
                yield queue.shift();
                continue;
              }
              await new Promise((resolve) => (wake = resolve));
            }
            if (error) throw error;
          })();
        },
      },
    },
    interruptGenerate() {
      worker.postMessage({ type: 'stop' });
    },
    async unload() {
      closed = true;
      worker.terminate();
      for (const p of pending.values()) p.reject(Error('Le moteur IA est fermé.'));
      pending.clear();
    },
  };
}
