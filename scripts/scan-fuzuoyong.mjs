// 扫描整个魔禁卡项目里所有 "副作用" 出现位置
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'D:/project/tavern_helper_template/src/魔法禁书目录模拟器';
const KEYWORDS = ['副作用', '代价'];

function walk(dir, acc = []) {
  let entries = [];
  try { entries = readdirSync(dir); } catch { return acc; }
  for (const name of entries) {
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      walk(full, acc);
    } else {
      const ext = extname(name).toLowerCase();
      if (['.ts', '.js', '.yaml', '.yml', '.txt', '.json', '.md', '.html'].includes(ext)) {
        acc.push(full);
      }
    }
  }
  return acc;
}

const files = walk(ROOT);
const hits = [];
for (const f of files) {
  let text;
  try { text = readFileSync(f, 'utf8'); } catch { continue; }
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (KEYWORDS.some(k => line.includes(k))) {
      hits.push({ file: f.replace(ROOT, '.'), line: i + 1, content: line.trim() });
    }
  });
}

console.log(`\n=== 扫描完成：${hits.length} 处命中 ===\n`);
for (const h of hits) {
  console.log(`${h.file}:${h.line}  ${h.content.slice(0, 120)}`);
}
