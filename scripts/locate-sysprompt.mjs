// 定位系统提示词/对话示例在 chara 的位置 + 确认双场景指引进 PNG
import { readFileSync } from 'node:fs';
const PNG = 'src/魔法禁书目录模拟器/魔法禁书目录模拟器.png';
const buf = readFileSync(PNG);
let off = 8; let charaRaw = null;
while (off < buf.length) {
  const len = buf.readUInt32BE(off); off += 4;
  const type = buf.toString('latin1', off, off + 4); off += 4;
  const data = buf.slice(off, off + len); off += len; off += 4;
  if (type === 'tEXt') {
    const kwEnd = data.indexOf(0);
    if (data.toString('latin1', 0, kwEnd) === 'chara') { charaRaw = data.slice(kwEnd + 1).toString('latin1'); break; }
  }
}
let json = charaRaw;
if (!json.trim().startsWith('{')) { try { json = Buffer.from(charaRaw,'base64').toString('utf8'); } catch {} }
const chara = JSON.parse(json);

const all = JSON.stringify(chara);
function hits(n){ let c=0,i=0; while((i=all.indexOf(n,i))>=0){c++;i+=n.length;} return c; }

// 找系统提示词：在 ST v3 里通常在 data.extensions 或顶层 prompt / description
console.log('顶层 chara keys:', Object.keys(chara));
console.log('data keys:', Object.keys(chara.data || {}));
const ext = chara.data?.extensions || {};
console.log('data.extensions keys:', Object.keys(ext));
// depth_prompt / system_prompt?
console.log('chara.data.system_prompt 长度:', (chara.data?.system_prompt||'').length);
console.log('chara.data.mes_example 长度:', (chara.data?.mes_example||'').length);
console.log('chara.data.description 长度:', (chara.data?.description||'').length);

// 把 system_prompt + mes_example + description 合并搜
const sys = chara.data?.system_prompt || '';
const mes = chara.data?.mes_example || '';
const desc = chara.data?.description || '';
const probe = sys + '\n' + mes + '\n' + desc;
function H(n){ let c=0,i=0; while((i=probe.indexOf(n,i))>=0){c++;i+=n.length;} return c; }
console.log('\n=== system/mes_example/description 里 ===');
console.log('能力效果:', H('能力效果'));
console.log('实战运用:', H('实战运用'));
console.log('战斗场景：:', H('战斗场景：'));
console.log('非战斗场景：:', H('非战斗场景：'));
console.log('副作用或代价(残留):', H('副作用或代价'));
console.log('能力简述(残留):', H('能力简述'));
console.log('战术分析(残留):', H('战术分析'));
