// 读 index.yaml 脚本段 (1570-1660 行附近)
import { readFileSync } from 'node:fs';
const lines = readFileSync('D:/project/tavern_helper_template/src/魔法禁书目录模拟器/index.yaml', 'utf8').split('\n');
console.log('总行数:', lines.length);
// 打印 1560-1680 行
for (let i = 1559; i < Math.min(1680, lines.length); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
