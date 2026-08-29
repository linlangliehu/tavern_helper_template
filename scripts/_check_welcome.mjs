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

const d = readChara(process.argv[2]);
const bk = (d.data && d.data.character_book) || d.character_book;
const entries = (bk && bk.entries) || [];
console.log('总条目数:', entries.length);
for (const e of entries) {
  const name = e.comment || e.name || '';
  if (name.includes('欢迎')) {
    console.log('--- 欢迎页条目 ---');
    console.log('comment/name:', name);
    console.log('constant(常驻):', e.constant);
    console.log('selective(绿灯):', e.selective);
    console.log('disable:', e.disable);
    console.log('insertion_order:', e.insertion_order);
    console.log('content前150:', (e.content || '').substring(0, 150));
    console.log('content长度:', (e.content || '').length);
  }
}
