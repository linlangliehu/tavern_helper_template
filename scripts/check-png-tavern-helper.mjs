// 提取新卡 PNG 的 chara，查 tavern_helper 脚本库是否嵌入
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
console.log('chara.data.extensions keys:', Object.keys(chara.data?.extensions||{}));
console.log('tavern_helper exists:', !!th);
if (th) {
  const s = th.script;
  console.log('tavern_helper.script exists:', !!s);
  if (s && s.scripts) {
    console.log('脚本库数量:', s.scripts.length);
    s.scripts.forEach((x,i)=>console.log(`  [${i}] ${x.name} enabled=${x.enabled} urlHint=${(x.content||'').match(/https?:\/\/[^'"\s)]+/)?.[0]?.slice(0,80)}`));
  }
}
// 也查顶层是否有 extensions.tavern_helper
console.log('\n顶层 chara.extensions?', Object.keys(chara.extensions||{}));
