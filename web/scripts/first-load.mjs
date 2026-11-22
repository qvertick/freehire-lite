#!/usr/bin/env node
// What the homepage actually downloads, and how big it is.
//
//   node scripts/first-load.mjs [route]
//
// Walks the CLIENT bundle the way the browser does: from the two entry modules,
// through the route node of the requested page, following every static import.
// Dynamic imports are counted but not followed (they are the lazy chunks the
// reader may never open), except the route node itself, which the router always
// loads.
//
// This is the number that decides whether a page feels heavy: bytes matter less
// than requests, because HTTP/1.1 runs six at a time.
//
// Before the rewrite this read SvelteKit's SERVER manifest, which counts the
// server's chunks and not the browser's — the two are different builds. It also
// looked for the client output under .svelte-kit/output/client, while
// adapter-node's real output is build/client.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, '..');

// The built client, wherever this build put it.
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

/** Every file under the immutable dir, keyed by its path relative to it. */
function walk(dir, base = dir, out = new Map()) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, out);
    else if (entry.name.endsWith('.js')) out.set(full.slice(base.length + 1).replace(/\\/g, '/'), full);
  }
  return out;
}

const files = walk(immutable);

// Static and dynamic specifiers, resolved against the importing file's folder.
const specifier = /(?:^|[\s;}])(?:import|export)\s*(?:[\w*{}\s,]*?\s*from\s*)?["']([^"']+\.js)["']|import\(\s*["']([^"']+\.js)["']\s*\)/g;

function depsOf(rel) {
  const abs = files.get(rel);
  if (!abs) return { static: [], dynamic: [] };
  const src = readFileSync(abs, 'utf8');
  const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '';
  const resolveSpec = (spec) => {
    const target = spec.startsWith('/') ? spec.slice(1) : dir ? `${dir}/${spec}` : spec;
    // Collapse "./x" and "../x" one segment at a time.
    const parts = [];
    for (const part of target.split('/')) {
      if (part === '.' || part === '') continue;
      if (part === '..') parts.pop();
      else parts.push(part);
    }
    return parts.join('/');
  };
  const statics = new Set();
  const dynamics = new Set();
  for (const m of src.matchAll(specifier)) {
    const spec = m[1] ?? m[2];
    if (!spec) continue;
    (m[1] ? statics : dynamics).add(resolveSpec(spec));
  }
  return { static: [...statics], dynamic: [...dynamics] };
}

// The entry modules, and the route node of the page asked for.
const entries = [...files.keys()].filter((k) => k.startsWith('entry/'));

const route = process.argv[2] ?? '/';

// The route nodes: node 0 is the root layout, node 1 the page itself for the
// homepage. SvelteKit numbers them in route order, so the homepage's node is
// the second one.
const nodeFiles = [...files.keys()].filter((k) => k.startsWith('nodes/')).sort();

const roots = [
  ...entries,
  ...nodeFiles.slice(0, route === '/' ? 2 : 3),
];

const seen = new Set();
const queue = [...roots];
const dynamicSeen = new Set();
const rows = [];

while (queue.length) {
  const current = queue.pop();
  if (!current || seen.has(current)) continue;
  seen.add(current);
  const { static: s, dynamic: d } = depsOf(current);
  for (const dep of s) queue.push(dep);
  for (const dep of d) dynamicSeen.add(dep);
}

for (const rel of seen) {
  const abs = files.get(rel);
  if (!abs) continue;
  let size = 0;
  try {
    size = statSync(abs).size;
  } catch {
    /* not on disk */
  }
  rows.push({ rel, size });
}

rows.sort((a, b) => b.size - a.size);
const bytes = rows.reduce((sum, r) => sum + r.size, 0);

console.log(`route ${route}   client root: ${clientRoot}`);
console.log(`static files: ${rows.length}   total: ${(bytes / 1024).toFixed(0)} kB raw`);
console.log(`lazy chunks reachable but NOT loaded: ${dynamicSeen.size}\n`);

/** Collapse a chunk's sourcemap sources to "node_modules/<pkg>" or "src/lib/<area>". */
function group(sources) {
  const groups = new Map();
  for (const s of sources) {
    let key;
    const nm = s.lastIndexOf('node_modules/');
    if (nm >= 0) {
      const parts = s.slice(nm + 'node_modules/'.length).split('/');
      key = 'node_modules/' + (parts[0].startsWith('@') ? parts[0] + '/' + parts[1] : parts[0]);
    } else {
      const m = s.match(/web\/src\/(lib\/[^/]+|routes\/[^/]+)/);
      key = m ? m[1] : s.split('/').slice(-2).join('/');
    }
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  return [...groups.entries()].sort((a, b) => b[1] - a[1]);
}

/** The module list a chunk's sourcemap names, or an empty list without one. */
function sourcesOf(rel) {
  try {
    return JSON.parse(readFileSync(join(immutable, rel + '.map'), 'utf8')).sources ?? [];
  } catch {
    return [];
  }
}

for (const r of rows.slice(0, 8)) {
  console.log(`${(r.size / 1024).toFixed(1).padStart(9)} kB  ${r.rel}`);
  const sources = sourcesOf(r.rel);
  if (sources.length) {
    for (const [key, n] of group(sources).slice(0, 5)) {
      console.log(`${''.padStart(11)}${String(n).padStart(4)}  ${key}`);
    }
  }
  console.log('');
}
console.log(`... plus ${Math.max(0, rows.length - 8)} more files`);

// Which of the app's own modules the first load pulls in. This is the list that
// decides what is worth splitting out of a shared module: a table every page
// imports costs every page, whether the page reads it or not.
const appModules = new Map();
for (const r of rows) {
  for (const s of sourcesOf(r.rel)) {
    const m = s.match(/web\/src\/(.+)$/);
    if (!m) continue;
    appModules.set(m[1], (appModules.get(m[1]) ?? 0) + 1);
  }
}
console.log(`\napp modules in the first load: ${appModules.size}`);
for (const name of ['lib/facets.ts', 'lib/filterSections.ts', 'lib/filterSearch.ts', 'lib/collections.ts', 'lib/labels.ts']) {
  console.log(`  ${appModules.has(name) ? 'yes' : ' NO'}  ${name}`);
}
console.log('\nheaviest app modules by chunk count:');
for (const [name, n] of [...appModules.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log(`  ${String(n).padStart(4)}  ${name}`);
}
