import { readFileSync } from 'node:fs';
const PNG = 'src/魔法禁书目录模拟器/魔法禁书目录模拟器.png';
const buf = readFileSync(PNG);
let off = 8; let charaRaw = null;
while (off < buf.length) { const len = buf.readUInt32BE(off); off+=4; const t=buf.toString('latin1',off,off+4); off+=4; const d=buf.slice(off,off+len); off+=len; off+=4; if(t==='tEXt'){const k=d.indexOf(0); if(d.toString('latin1',0,k)==='chara'){charaRaw=d.slice(k+1).toString('latin1');break;}} }
let json = charaRaw; if(!json.trim().startsWith('{')){try{json=Buffer.from(charaRaw,'base64').toString('utf8');}catch{}}
const chara = JSON.parse(json);
const s = chara.data?.extensions?.tavern_helper?.scripts;
console.log('脚本库总数:', Array.isArray(s) ? s.length : typeof s);
if (Array.isArray(s)) {
  s.forEach((x,i)=>{
    const urlM = (x.content||'').match(/https?:\/\/[^'"\s)]+/g) || [];
    console.log(`[${i}] ${x.name} | enabled=${x.enabled} | urls=${urlM.slice(0,2).map(u=>u.slice(0,70)).join(' ; ')}`);
  });
}
