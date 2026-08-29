import { readFileSync } from 'node:fs';
const buf = readFileSync('src/魔法禁书目录模拟器/魔法禁书目录模拟器.png');
let off = 8; let charaRaw = null;
while (off < buf.length) {
  const len = buf.readUInt32BE(off); off += 4;
  const type = buf.toString('latin1', off, off + 4); off += 4;
  const data = buf.slice(off, off + len); off += len; off += 4;
  if (type === 'tEXt') { const kwEnd = data.indexOf(0); if (data.toString('latin1',0,kwEnd)==='chara'){ charaRaw=data.slice(kwEnd+1).toString('latin1'); break; } }
}
let json = charaRaw; if (!json.trim().startsWith('{')) { try{ json=Buffer.from(charaRaw,'base64').toString('utf8'); }catch{} }
const chara = JSON.parse(json);
const all = JSON.stringify(chara);
function H(n){ let c=0,i=0; while((i=all.indexOf(n,i))>=0){c++;i+=n.length;} return c; }
console.log('实战运用:', H('实战运用'));
console.log('能力效果:', H('能力效果'));
console.log('战斗场景(无冒号):', H('战斗场景'));
console.log('非战斗:', H('非战斗'));
console.log('---旧字段残留(应0)---');
console.log('副作用或代价:', H('副作用或代价'));
console.log('能力简述:', H('能力简述'));
console.log('战术分析:', H('战术分析'));
console.log('---lore保留---');
console.log('限制/副作用:', H('限制/副作用'));
