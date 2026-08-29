import { readFileSync } from 'node:fs';

function readChara(pngPath) {
  const buf = readFileSync(pngPath);
  let p = 8;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    if (type === 'tEXt') {
      let k = '', i = p + 8;
      while (buf[i] !== 0) { k += String.fromCharCode(buf[i]); i++; }
      if (k === 'chara') {
        return JSON.parse(Buffer.from(buf.toString('utf8', i + 1, p + 8 + len), 'base64').toString('utf8'));
      }
    }
    p += 8 + len + 4;
  }
  return null;
}

const which = process.argv[2] || 'm';
const path = which === 's' ? 'src/神秘复苏模拟器/神秘复苏模拟器.png' : 'src/魔法禁书目录模拟器/魔法禁书目录模拟器.png';
const d = readChara(path);
const firstMes = (d.data && d.data.first_mes) || d.first_mes || '';
console.log('=== first_mes (' + which + ') ===');
console.log('长度:', firstMes.length);
console.log('含代码块 ```:', firstMes.includes('```'));
console.log('含 <body>:', firstMes.includes('<body>'));
console.log('含 <!DOCTYPE>:', firstMes.includes('<!DOCTYPE'));
console.log('含 <html>:', firstMes.includes('<html>'));
console.log('含 mfrs-welcome-root:', firstMes.includes('mfrs-welcome-root'));
console.log('--- 前 800 字符 ---');
console.log(firstMes.substring(0, 800));
