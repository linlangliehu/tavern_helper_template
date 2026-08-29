import { readFileSync } from 'node:fs';
const files = [
  'dist/魔法禁书目录模拟器/脚本/消息内面板/index.js',
  'dist/魔法禁书目录模拟器/脚本/界面美化/index.js',
  'dist/魔法禁书目录模拟器/脚本/变量结构/index.js',
];
for (const f of files) {
  const s = readFileSync(f, 'utf8');
  console.log(`\n=== ${f} (${s.length}字节) ===`);
  console.log('has能力效果(新):', s.includes('能力效果'));
  console.log('has实战运用(新):', s.includes('实战运用'));
  console.log('has副作用或代价(旧):', s.includes('副作用或代价'));
  console.log('has能力简述(旧):', s.includes('能力简述'));
  console.log('has战术分析(旧):', s.includes('战术分析'));
}
