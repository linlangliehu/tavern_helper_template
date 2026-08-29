import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir, depth = 0, out = []) {
  if (depth > 4) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    out.push({ path: p, isDir: statSync(p).isDirectory() });
    if (statSync(p).isDirectory()) walk(p, depth + 1, out);
  }
  return out;
}

const base = 'D:/tmp/pi-github-repos/anh-chu';
console.log('exists:', statSync(base).isDirectory());
const entries = walk(base);
const items = entries.filter(e => e.isDir).slice(0, 10);
console.log('dirs:', items.map(e => e.path));
