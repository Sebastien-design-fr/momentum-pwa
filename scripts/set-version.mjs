// Usage: node scripts/set-version.mjs 0.12.1
// package.json is the single source of truth; this rewrites every file that embeds the version.
import { readFileSync, writeFileSync } from 'node:fs';

const next = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(next ?? '')) {
  console.error('Usage: node scripts/set-version.mjs <major.minor.patch>');
  process.exit(1);
}
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const prev = pkg.version;
const edit = (file, replacements) => {
  let text = readFileSync(file, 'utf8');
  for (const [pattern, value] of replacements) text = text.replace(pattern, value);
  writeFileSync(file, text);
};
const assetVersion = [/\?v=\d+\.\d+\.\d+/g, `?v=${next}`];
const label = [/MOMENTUM v\d+\.\d+\.\d+/g, `MOMENTUM v${next}`];

edit('index.html', [assetVersion, label, [/· v\d+\.\d+\.\d+/g, `· v${next}`]]);
edit('app.js', [assetVersion, label]);
edit('sw.js', [assetVersion, [/momentum-v[\d.]+-core-\d+/, `momentum-v${next}-core-1`]]);
edit('package.json', [[/"version": "[^"]+"/, `"version": "${next}"`]]);
console.log(`Version ${prev} -> ${next}`);
