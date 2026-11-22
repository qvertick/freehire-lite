// How big is each generated export? The generated contracts file is one module,
// so ANY import from it drags ALL of it into the bundle — a 3-line constant and
// a 96 kB alias table travel together. This measures the exports so the big
// ones can be split into their own module.
//
//   node scripts/export-size.mjs [file]

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve(process.argv[2] ?? 'src/lib/generated/contracts.ts');
const lines = readFileSync(file, 'utf8').split('\n');

const out = [];
let i = 0;
while (i < lines.length) {
  const m = /^(?:export )?(?:const|function|let|var)\s+(\w+)/.exec(lines[i]);
  if (!m) {
    i++;
    continue;
  }
  const start = i;
  let depth = 0;
  let started = false;
  let end = i;
  for (let j = i; j < lines.length; j++) {
    for (const ch of lines[j]) {
      if ('{[('.includes(ch)) {
        depth++;
        started = true;
      } else if ('}])'.includes(ch)) depth--;
    }
    if (started && depth <= 0) {
      end = j;
      break;
    }
  }
  out.push({ name: m[1], len: lines.slice(start, end + 1).join('\n').length, line: start + 1 });
  i = end + 1;
}

out.sort((a, b) => b.len - a.len);
for (const o of out.slice(0, 16)) {
  console.log(String(o.len).padStart(8), '  line', String(o.line).padStart(5), ' ', o.name);
}
