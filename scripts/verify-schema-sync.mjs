import { readFileSync } from 'node:fs';
const j = JSON.parse(readFileSync('src/魔法禁书目录模拟器/schema.json', 'utf8'));
const a = j.properties.能力档案.items.properties;
console.log('能力档案字段:', Object.keys(a));
const m = j.properties.物品.properties.持有物.items.properties;
console.log('物品字段:', Object.keys(m));
// 碰撞检查
console.log('副作用残留?', JSON.stringify(a).includes('副作用'), JSON.stringify(m).includes('副作用'));
