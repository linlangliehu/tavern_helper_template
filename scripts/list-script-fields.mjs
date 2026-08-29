// 提取 index.yaml 里所有脚本条目的字段结构（不解析 yaml，直接按行找脚本块）
import { readFileSync } from 'node:fs';
const src = readFileSync('D:/project/tavern_helper_template/src/魔法禁书目录模拟器/index.yaml', 'utf8');
const lines = src.split('\n');
// 找所有 "名称:" 且附近含 "内容:" 的脚本块，输出块首行字段列表
for (let i = 0; i < lines.length; i++) {
  if (/^\s+名称: /.test(lines[i])) {
    // 向上找块起点（- 名称: 形式）
    const nameLine = lines[i].trim();
    // 向下收集到 内容: 为止的字段
    const fields = [nameLine];
    for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
      const t = lines[j].trim();
      if (t.startsWith('内容:')) { fields.push('内容: <...>'); break; }
      if (t.startsWith('- ')) break;
      if (t) fields.push(t);
    }
    console.log(`L${i + 1}:`, JSON.stringify(fields));
  }
}
