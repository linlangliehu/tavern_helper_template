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
const sp = chara.data?.system_prompts;
console.log('system_prompts type:', Array.isArray(sp) ? `array(${sp.length})` : typeof sp);
if (Array.isArray(sp)) {
  sp.forEach((p,i)=>console.log(`  [${i}] name=${p.name||''} identifier=${p.identifier||''} role=${p.role||''} content_len=${(p.content||'').length}`));
}
// mes_example
const me = chara.data?.mes_example;
console.log('mes_example type:', typeof me, 'len:', (me||'').length);
// 全 data.system_prompts content + mes_example 合并搜
const probe = (Array.isArray(sp)?sp.map(p=>p.content||'').join('\n'):'') + '\n' + (me||'');
function H(n){ let c=0,i=0; while((i=probe.indexOf(n,i))>=0){c++;i+=n.length;} return c; }
console.log('\n=== system_prompts[].content + mes_example 里 ===');
console.log('能力效果:', H('能力效果'));
console.log('实战运用:', H('实战运用'));
console.log('战斗场景：', H('战斗场景：'));
console.log('非战斗场景：', H('非战斗场景：'));
console.log('副作用或代价(残留):', H('副作用或代价'));
console.log('能力简述(残留):', H('能力简述'));
console.log('战术分析(残留):', H('战术分析'));
// depth_prompt
const dp = chara.data?.extensions?.depth_prompt;
console.log('\ndepth_prompt:', JSON.stringify(dp)?.slice(0,200));
