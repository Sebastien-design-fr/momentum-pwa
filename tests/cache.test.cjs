'use strict';
const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  path = require('node:path');
test('activation retains current app, model and unrelated caches', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
  const current = source.match(/const CACHE = '([^']+)'/)[1],
    handlers = {},
    deleted = [];
  const self = {
    addEventListener: (name, cb) => (handlers[name] = cb),
    clients: { claim: async () => {} },
    location: { origin: 'https://example.test', href: 'https://example.test/momentum/sw.js' },
  };
  const caches = {
    keys: async () => [
      'momentum-v8',
      'momentum-v8-bridge-1',
      'momentum-v8-bridge-2',
      current,
      'webllm/model',
      'another-pwa',
    ],
    delete: async (key) => deleted.push(key),
  };
  vm.runInNewContext(source, { self, caches, URL });
  let activation;
  handlers.activate({ waitUntil: (p) => (activation = p) });
  await activation;
  assert.deepEqual(deleted, ['momentum-v8', 'momentum-v8-bridge-1', 'momentum-v8-bridge-2']);
});
