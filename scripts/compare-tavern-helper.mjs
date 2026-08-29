// 深入查 tavern_helper 完整结构
import { readFileSync } from 'node:fs';
const PNG = 'src/魔法禁书目录模拟器/魔法禁书目录模拟器.png';
const buf = readFileSync(PNG);
let off = 8; let charaRaw = null;
while (off < buf.length) {
  const len = buf.readUInt32BE(off); off += 4;
  const type = buf.toString('latin1', off, off + 4); off += 4;
  const data = buf.slice(off, off + len); off += len; off += 4;
  if (type === 'tEXt') { const kwEnd = data.indexOf(0); if (data.toString('latin1',0,kwEnd)==='chara'){ charaRaw=data.slice(kwEnd+1).toString('latin1'); break; } }
}
let json = charaRaw; if (!json.trim().startsWith('{')) { try{ json=Buffer.from(charaRaw,'base64').toString('utf8'); }catch{} }
const chara = JSON.parse(json);
const th = chara.data?.extensions?.tavern_helper;
console.log('tavern_helper 类型:', typeof th);
if (th && typeof th === 'object') {
  console.log('tavern_helper keys:', Object.keys(th));
  console.log('tavern_helper 完整结构(截断):', JSON.stringify(th).slice(0, 600));
}
// 对比：神秘复苏卡
const PNG2 = 'src/神秘复苏模拟器/神秘复苏模拟器.png';
try {
  const buf2 = readFileSync(PNG2);
  let o2 = 8; let cr2 = null;
  while (o2 < buf2.length) { const l = buf2.readUInt32BE(o2); o2+=4; const t=buf2.toString('latin1',o2,o2+4); o2+=4; const d=buf2.slice(o2,o2+l); o2+=l; o2+=4; if(t==='tEXt'){const k=d.indexOf(0); if(d.toString('latin1',0,k)==='chara'){cr2=d.slice(k+1).toString('latin1');break;}} }
  let j2 = cr2; if(!j2.trim().startsWith('{')){try{j2=Buffer.from(cr2,'base64').toString('utf8');}catch{}}
  const c2 = JSON.parse(j2);
  const th2 = c2.data?.extensions?.tavern_helper;
  console.log('\n=== 神秘复苏卡对比 ===');
  console.log('神秘复苏 tavern_helper keys:', Object.keys(th2||{}));
  console.log('神秘复苏 script exists:', !!(th2?.script));
  if (th2?.script?.scripts) console.log('神秘复苏 脚本数:', th2.script.scripts.length, '名称:', th2.script.scripts.map(s=>s.name).join('|'));
} catch(e) { console.log('神秘复苏卡读取失败:', e.message); }
