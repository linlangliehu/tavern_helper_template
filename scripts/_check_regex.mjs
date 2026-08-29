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
        return JSON.parse(Buffer.from(v, 'base64').toString('utf8'));
      }
    }
    p += 8 + len + 4;
  }
  return null;
}

const d = readChara(process.argv[2]);
const regs = (d.extensions && d.extensions.regex_scripts) || [];
console.log('正则脚本数量:', regs.length);
for (const r of regs) {
  const name = r.scriptName || r.name || '';
  const find = r.findRegex || r.find_regex || '';
  const replace = r.replaceString || r.replace_string || '';
  const isWelcome = /欢迎|开局|sp_start|welcome|form|开局页|渲染/i.test(name + find);
  console.log('---');
  console.log('名称:', name);
  console.log('查找:', String(find).substring(0, 120));
  console.log('替换前80:', String(replace).substring(0, 80));
  console.log('疑似欢迎页注入:', isWelcome);
}
