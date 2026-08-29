// 校验打包出的 PNG chara 内容：确认副作用已删 + 新字段就位
import { readFileSync } from 'node:fs';
const PNG = 'src/魔法禁书目录模拟器/魔法禁书目录模拟器.png';
const buf = readFileSync(PNG);
const sizeKB = (buf.length / 1024).toFixed(1);
console.log(`PNG 大小: ${sizeKB} KB (${buf.length} bytes)`);

// 从 PNG 尾部提取 chara JSON（iTXt 或 tEXt chunk，或末尾 base64）
const text = buf.toString('latin1');
// tavern_sync 通常把 chara 存为 tEXt/iTXt chunk，keyword 'chara'
let charaJson = null;
// 简单方案：找 "chara" 关键字后的 base64 或 JSON
const m = text.match(/chara[\x00-\x20]+([A-Za-z0-9+/=]+)/);
// 更可靠：找 JSON 特征 {"name"
const idx = text.indexOf('{"name"');
if (idx >= 0) {
  // 从 idx 往后取一段，找完整 JSON（tavern_sync chara 是 JSON 不是 base64? 试两种）
  let end = text.indexOf('"}', idx);
  // chara 可能很长，用更稳的方式：找 unicode "}" 平衡
  charaJson = text.slice(idx, idx + 200);
  console.log('chara 开头片段:', charaJson.slice(0, 120));
}
// 直接搜关键字段
function count(sub) { let n = 0, i = 0; while ((i = text.indexOf(sub, i)) >= 0) { n++; i += sub.length; } return n; }
console.log('=== 副作用残留检查 ===');
console.log('副作用或代价:', count('副作用或代价'));
console.log('能力简述(旧名):', count('能力简述'));
console.log('战术分析(旧名):', count('战术分析'));
console.log('=== 新字段就位检查 ===');
console.log('能力效果(新名):', count('能力效果'));
console.log('实战运用(新名):', count('实战运用'));
console.log('=== 物品副作用 ===');
console.log('物品副作用字段(应0):', (text.match(/"副作用"/g) || []).length);
