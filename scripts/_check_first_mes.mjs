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
      const v = buf.toString('utf8', i + 1, p + 8 + len);
      if (k === 'chara') {
        const d = JSON.parse(Buffer.from(v, 'base64').toString('utf8'));
        return d;
      }
    }
    p += 8 + len + 4;
  }
  return null;
}

const card = process.argv[2];
const d = readChara(card);
if (!d) { console.log('未找到 chara'); process.exit(1); }
console.log('=== ' + card + ' ===');
console.log('first_mes 长度:', (d.first_mes || '').length);
console.log('first_mes 含 <form:', (d.first_mes || '').includes('<form'));
console.log('first_mes 含 <input:', (d.first_mes || '').includes('<input'));
console.log('first_mes 含 sp_start:', (d.first_mes || '').includes('sp_start'));
console.log('first_mes 含 <style:', (d.first_mes || '').includes('<style'));
console.log('description 含 <form:', (d.description || '').includes('<form'));
console.log('description 长度:', (d.description || '').length);
console.log('first_mes 前 400 字符:');
console.log((d.first_mes || '').substring(0, 400));
