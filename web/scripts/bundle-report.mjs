#!/usr/bin/env node
// Inspect the built client bundle: which chunks are big, and which modules each
// big chunk actually contains (read from its sourcemap).
//
//   node scripts/bundle-report.mjs [dir]
//
// The dir defaults to web/.svelte-kit/output/client.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(here, '..', '.svelte-kit', 'output', 'client');
const chunkDir = join(root, '_app', 'immutable', 'chunks');

function listChunks() {
  const out = [];
  for (const name of readdirSync(chunkDir)) {
    if (!name.endsWith('.js')) continue;
    const path = join(chunkDir, name);
    const size = statSync(path).size;
    const mapPath = path + '.map';
    let sources = [];
    let mapSize = 0;
    if (readFileSync) {
      try {
        const raw = readFileSync(mapPath, 'utf8');
        mapSize = statSync(mapPath).size;
        const map = JSON.parse(raw);
        sources = map.sources ?? [];
      } catch {
        /* no map */
      }
    }
    out.push({ name, size, mapSize, sources });
  }
  return out;
}

function group(sources) {
  // Collapse to the first meaningful path segment so a chunk's makeup reads as
  // "node_modules/<pkg>" or "src/lib/<area>" rather than 400 file names.
  const groups = new Map();
  for (const s of sources) {
    let key;
    // pnpm stores a package under .pnpm/<name>@<version>/node_modules/<name>;
    // the real package name is the last node_modules segment before the file.
    const nm = s.lastIndexOf('node_modules/');
    if (nm >= 0) {
      const rest = s.slice(nm + 'node_modules/'.length);
      const parts = rest.split('/');
      key = 'node_modules/' + (parts[0].startsWith('@') ? parts[0] + '/' + parts[1] : parts[0]);
    } else {
      const m = s.match(/web\/src\/(lib\/[^/]+|routes\/[^/]+)/);
      key = m ? m[1] : s.split('/').slice(-2).join('/');
    }
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  return [...groups.entries()].sort((a, b) => b[1] - a[1]);
}

const chunks = listChunks().sort((a, b) => b.size - a.size);
const total = chunks.reduce((n, c) => n + c.size, 0);

console.log(`chunks: ${chunks.length}   total: ${(total / 1024 / 1024).toFixed(2)} MB raw\n`);

const TOP = Number(process.env.TOP ?? 6);
for (const c of chunks.slice(0, TOP)) {
  console.log(`${(c.size / 1024).toFixed(0).padStart(7)} kB  ${c.name}  (${c.sources.length} modules)`);
  for (const [key, n] of group(c.sources).slice(0, 8)) {
    console.log(`            ${String(n).padStart(4)}  ${key}`);
  }
  console.log('');
}
