'use strict';
const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const version = JSON.parse(read('package.json')).version;

test('every versioned asset URL matches package.json', () => {
  for (const file of ['index.html', 'app.js', 'sw.js']) {
    const found = [...read(file).matchAll(/\?v=(\d+\.\d+\.\d+)/g)].map((m) => m[1]);
    assert.ok(found.length > 0, file + ' has versioned URLs');
    assert.deepEqual([...new Set(found)], [version], file);
  }
});

test('visible labels and the cache name carry the same version', () => {
  assert.match(read('index.html'), new RegExp('<title>[^<]*v' + version.replace(/\./g, '\\.')));
  assert.match(read('index.html'), new RegExp('MOMENTUM v' + version.replace(/\./g, '\\.')));
  assert.match(read('app.js'), new RegExp('MOMENTUM v' + version.replace(/\./g, '\\.')));
  assert.match(
    read('sw.js'),
    new RegExp("CACHE = 'momentum-v" + version.replace(/\./g, '\\.') + '-')
  );
});

test('every script and stylesheet used by the page is precached by the service worker', () => {
  const sw = read('sw.js');
  const used = [...read('index.html').matchAll(/(?:src|href)="(\.\/[^"?]+\.(?:js|css))\?v=/g)].map(
    (m) => m[1]
  );
  assert.ok(used.length >= 6);
  for (const asset of used)
    assert.ok(sw.includes("'" + asset + '?v='), asset + ' missing from sw.js');
});
