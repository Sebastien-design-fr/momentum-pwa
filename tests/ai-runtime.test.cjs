'use strict';
const test = require('node:test'),
  assert = require('node:assert/strict'),
  path = require('node:path'),
  { pathToFileURL } = require('node:url');
test('worker proxy streams ordered chunks, keeps progress separate, interrupts and terminates', async () => {
  const previous = global.Worker,
    instances = [];
  class FakeWorker {
    constructor(url, options) {
      assert.match(url.pathname, /ai-worker\.js$/);
      assert.equal(options.type, 'module');
      this.sent = [];
      instances.push(this);
    }
    postMessage(message) {
      this.sent.push(message);
      queueMicrotask(() => {
        if (message.type === 'load') {
          this.onmessage({ data: { id: message.id, type: 'progress', value: { progress: 1 } } });
          this.onmessage({ data: { id: message.id, type: 'done' } });
        }
        if (message.type === 'generate') {
          for (const s of ['Bon', 'jour'])
            this.onmessage({
              data: {
                id: message.id,
                type: 'chunk',
                value: { choices: [{ delta: { content: s } }] },
              },
            });
          this.onmessage({ data: { id: message.id, type: 'done' } });
        }
      });
    }
    terminate() {
      this.terminated = true;
    }
  }
  global.Worker = FakeWorker;
  try {
    const { CreateMLCEngine } = await import(
      pathToFileURL(path.join(__dirname, '../ai-runtime.js')).href
    );
    let progress;
    const engine = await CreateMLCEngine(
      'model-fixture',
      { initProgressCallback: (x) => (progress = x) },
      {}
    );
    assert.equal(progress.progress, 1);
    const stream = await engine.chat.completions.create({
      messages: [{ role: 'user', content: 'Message fictif' }],
      stream: true,
    });
    let text = '';
    for await (const value of stream) text += value.choices[0].delta.content;
    assert.equal(text, 'Bonjour');
    engine.interruptGenerate();
    assert.equal(instances[0].sent.at(-1).type, 'stop');
    await engine.unload();
    assert.equal(instances[0].terminated, true);
    assert.equal(
      instances[0].sent.some((x) => JSON.stringify(x).includes('accessToken')),
      false
    );
  } finally {
    global.Worker = previous;
  }
});
