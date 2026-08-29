import { readFileSync, readdirSync } from 'node:fs';
const dir = 'D:/project/tavern_helper_template/src/魔法禁书目录模拟器/世界书/变量/';
const files = readdirSync(dir);
const target = files.find(f => f.startsWith('变量输出格式'));
if (!target) { console.log('NOT FOUND'); process.exit(); }
const p = dir + target;
console.log('file:', target, 'path:', p);
console.log('size:', readFileSync(p, 'utf8').length);
console.log(readFileSync(p, 'utf8').slice(0, 5000));
