import { readFileSync } from 'node:fs';
const base = 'dist/魔法禁书目录模拟器/脚本';
const files = ['MVU','变量结构','固定状态栏','界面美化','消息内面板','mvu-protocol-applier'];
console.log('本地 dist 6脚本字段状态对比 CDN(应与CDN不同=本地是新版):');
for (const f of files) {
  const s = readFileSync(`${base}/${f}/index.js`, 'utf8');
  const hasNew = s.includes('能力效果') || s.includes('实战运用');
  const hasOld = s.includes('副作用或代价') || s.includes('能力简述') || s.includes('战术分析');
  console.log(`  ${f.padEnd(20)} ${s.length.toString().padStart(7)}B  新字段:${hasNew?'✓':' '} 旧字段:${hasOld?'残留':'  无'}`);
}
