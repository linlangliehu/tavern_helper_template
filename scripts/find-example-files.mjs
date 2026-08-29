import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir, depth = 0, out = []) {
  if (depth > 3) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    out.push({ path: p, isDir: statSync(p).isDirectory() });
    if (statSync(p).isDirectory()) walk(p, depth + 1, out);
  }
  return out;
}

const base = 'D:/tmp/pi-github-repos/bc3c7e13677ba4ff425051b00ae8f1592202abb4c09f46a750164d2f4bec8c3e';
const entries = walk(base);
const items = entries.filter(e => {
  const n = e.path;
  return n.includes('示例') || n.includes('角色卡') || n.includes('世界书') || n.includes('yaml') || n.includes('角色');
});
console.log('files:', items.map(e => e.path).slice(0, 30));
