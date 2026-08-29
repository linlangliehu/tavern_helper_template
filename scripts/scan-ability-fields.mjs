// 扫描能力档案字段全引用：副作用/代价 + 能力简述 + 战术分析（评估改名成本 + 碰撞检查）
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'D:/project/tavern_helper_template/src/魔法禁书目录模拟器';
const TERMS = {
  '副作用/代价': ['副作用', '代价'],
  '能力简述(拟改名→能力效果)': ['能力简述'],
  '战术分析(拟改造成→实战运用)': ['战术分析'],
  '能力效果(碰撞检查)': ['能力效果'],
  '实战运用(碰撞检查)': ['实战运用'],
};

function walk(dir, acc = []) {
  let entries = [];
  try { entries = readdirSync(dir); } catch { return acc; }
  for (const name of entries) {
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walk(full, acc);
    else {
      const ext = extname(name).toLowerCase();
      if (['.ts', '.js', '.yaml', '.yml', '.txt', '.json', '.md', '.html'].includes(ext)) acc.push(full);
    }
  }
  return acc;
}

const files = walk(ROOT);
for (const [label, kws] of Object.entries(TERMS)) {
  const hits = [];
  for (const f of files) {
    let text;
    try { text = readFileSync(f, 'utf8'); } catch { continue; }
    text.split(/\r?\n/).forEach((line, i) => {
      if (kws.some(k => line.includes(k))) hits.push({ f: f.replace(ROOT, '.'), l: i + 1, c: line.trim() });
    });
  }
  console.log(`\n=== ${label}：${hits.length} 处 ===`);
  for (const h of hits) console.log(`  ${h.f}:${h.l}  ${h.c.slice(0, 100)}`);
}
