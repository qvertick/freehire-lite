// Why is a chunk on the first-load path? Prints the import edges that reach it.
//
//   node scripts/why-chunk.mjs <chunk-file-name>
//
// Walks the same graph first-load.mjs walks, and reports which file on the path
// imports the chunk asked about, plus that file's own sources. A chunk nobody
// imports directly can still be on the path — this names the edge.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, '..');

const candidates = [join(web, 'build', 'client'), join(web, '.svelte-kit', 'output', 'client')];
const clientRoot = candidates.find((dir) => {
  try {
    return statSync(join(dir, '_app', 'immutable')).isDirectory();
  } catch {
    return false;
  }
});
if (!clientRoot) {
  console.error('no built client found — run `pnpm build` first');
  process.exit(1);
}
const immutable = join(clientRoot, '_app', 'immutable');

const target = process.argv[2];
if (!target) {
  console.error('usage: node scripts/why-chunk.mjs <chunk-file-name>');
  process.exit(1);
}

function walk(dir, base = dir, out = new Map()) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, out);
    else if (entry.name.endsWith('.js')) out.set(full.slice(base.length + 1).replace(/\\/g, '/'), full);
  }
  return out;
}
const files = walk(immutable);

const specifier = /(?:^|[\s;}])(?:import|export)\s*(?:[\w*{}\s,]*?\s*from\s*)?["']([^"']+\.js)["']|import\(\s*["']([^"']+\.js)["']\s*\)/g;

function depsOf(rel) {
  const abs = files.get(rel);
  if (!abs) return [];
  const src = readFileSync(abs, 'utf8');
  const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '';
  const out = [];
  for (const m of src.matchAll(specifier)) {
    const spec = m[1] ?? m[2];
    if (!spec) continue;
    const t = spec.startsWith('/') ? spec.slice(1) : dir ? `${dir}/${spec}` : spec;
    const parts = [];
    for (const part of t.split('/')) {
      if (part === '.' || part === '') continue;
      if (part === '..') parts.pop();
      else parts.push(part);
    }
    out.push(parts.join('/'));
  }
  return out;
}

// The homepage graph: the two entry modules plus the root layout and page nodes.
const nodeFiles = [...files.keys()].filter((k) => k.startsWith('nodes/')).sort();
const roots = [...[...files.keys()].filter((k) => k.startsWith('entry/')), ...nodeFiles.slice(0, 2)];

const parent = new Map();
const seen = new Set();
const queue = [...roots];
while (queue.length) {
  const cur = queue.pop();
  if (!cur || seen.has(cur)) continue;
  seen.add(cur);
  for (const dep of depsOf(cur)) {
    if (!parent.has(dep)) parent.set(dep, cur);
    queue.push(dep);
  }
}

console.log(`graph: ${seen.size} files\n`);

/** The module list a chunk's sourcemap names, or an empty list without one. */
function sourcesOf(rel) {
  try {
    return JSON.parse(readFileSync(join(immutable, rel + '.map'), 'utf8')).sources ?? [];
  } catch {
    return [];
  }
}

// Which file on the path contains the module asked about, and who pulls it in.
const wanted = target.replace(/\.js$/, '');
for (const file of seen) {
  const sources = sourcesOf(file);
  const hit = sources.find((src) => src.includes(wanted));
  if (!hit) continue;
  const importers = [...parent.entries()].filter(([dep]) => dep === file).map(([, from]) => from);
  console.log(`${file}  contains  ${hit}`);
  for (const from of importers) {
    console.log(`  imported by: ${from}`);
    for (const src of sourcesOf(from).filter((s) => s.includes('src/'))) console.log(`    <- ${src}`);
  }
  console.log('');
}
