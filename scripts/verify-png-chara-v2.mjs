// 正确解析 PNG chunks 提取 chara（UTF-8），验证字段
import { readFileSync } from 'node:fs';
const PNG = 'src/魔法禁书目录模拟器/魔法禁书目录模拟器.png';
const buf = readFileSync(PNG);
console.log(`PNG 大小: ${(buf.length / 1024).toFixed(1)} KB`);

// PNG signature 8 bytes
if (buf.slice(0, 8).toString('hex') !== '89504e470d0a1a0a') {
  console.log('不是有效 PNG'); process.exit(1);
}
let off = 8;
let charaRaw = null;
while (off < buf.length) {
  const len = buf.readUInt32BE(off); off += 4;
  const type = buf.toString('latin1', off, off + 4); const typeStart = off; off += 4;
  const data = buf.slice(off, off + len); off += len;
  off += 4; // CRC
  if (type === 'tEXt' || type === 'iTXt' || type === 'zTXt') {
    const kwEnd = data.indexOf(0);
    const keyword = data.toString('latin1', 0, kwEnd);
    if (keyword === 'chara') {
      if (type === 'tEXt') {
        // latin1 之后转 utf8
        charaRaw = data.slice(kwEnd + 1).toString('latin1');
      } else if (type === 'iTXt') {
        // iTXt: keyword\0 cflag(1) cmethod(1) lang\0 trans\0 text
        let p = kwEnd + 1;
        const cflag = data[p]; p++;
        p++; p++; // method
        // skip lang and trans null-terminated
        while (data[p] !== 0) p++; p++;
        while (data[p] !== 0) p++; p++;
        charaRaw = data.slice(p).toString('utf8');
      }
      console.log(`找到 chara 在 ${type} chunk，${(charaRaw||'').length} 字符`);
      break;
    }
  }
}
if (!charaRaw) { console.log('未找到 chara chunk'); process.exit(0); }

// charaRaw 可能是 base64 也可能是 JSON
let json = charaRaw;
if (json.trim().startsWith('{')) {
  // JSON 直接
} else {
  try { json = Buffer.from(charaRaw, 'base64').toString('utf8'); } catch {}
}
const chara = JSON.parse(json);
console.log('chara keys:', Object.keys(chara));
const desc = chara.description || '';
const sys = chara.system_prompt || '';
const fm = chara.first_mes || '';
const alts = chara.alternate_greetings || [];
const mesEx = chara.mes_example || '';
const cb = chara.character_book;
const entries = cb?.entries || [];
console.log(`description=${desc.length}字 system=${sys.length}字 first_mes=${fm.length}字 mes_example=${mesEx.length}字 世界书条目=${entries.length}`);

function count(s) { return (s.match(new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g')) || []).length; }
// 用更稳的：直接 includes 计数
function hits(hay, needle){ let n=0,i=0; while((i=hay.indexOf(needle,i))>=0){n++;i+=needle.length;} return n; }
const all = desc + '\n' + sys + '\n' + fm + '\n' + mesEx;
console.log('\n=== 旧字段残留（应全部0）===');
console.log('副作用或代价:', hits(all,'副作用或代价'));
console.log('能力简述:', hits(all,'能力简述'));
console.log('战术分析:', hits(all,'战术分析'));
console.log('物品.副作用(JSON字段名):', hits(mesEx,'"副作用"'));
console.log('\n=== 新字段就位 ===');
console.log('能力效果:', hits(all,'能力效果'));
console.log('实战运用:', hits(all,'实战运用'));
console.log('\n=== 世界书条目抽查 ===');
// 变量更新规则条目
const rules = entries.find(e => (e.comment||e.name||'').includes('变量更新规则'));
if (rules) console.log('变量更新规则条目含实战运用:', hits(JSON.stringify(rules),'实战运用'), '含副作用:', hits(JSON.stringify(rules),'副作用'));
