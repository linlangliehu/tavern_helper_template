#!/usr/bin/env node
/**
 * 生成「[显示]渲染魔法禁书目录开局页」正则脚本，注入 index.yaml。
 * 机制：匹配首消息的 <sp_start>...</sp_start>，替换为欢迎页.txt 的完整表单 HTML。
 * 参考神秘复苏模拟器发布版 index.yaml 第 5799 行的正则脚本。
 */
const fs = require('fs');
const path = require('path');

const ROOT = 'D:\\project\\tavern_helper_template\\src\\魔法禁书目录模拟器';
const WELCOME = path.join(ROOT, '自定义开局', '欢迎页.txt');
const YAML = path.join(ROOT, 'index.yaml');

// 1. 读取欢迎页.txt
const welcome = fs.readFileSync(WELCOME, 'utf8');

// 2. 提取 <style> 到 </body> 之间的内容（含 style + body 内容，去掉 DOCTYPE/html/head/body 外壳）
const styleStart = welcome.indexOf('<style>');
const bodyEnd = welcome.indexOf('</body>');
if (styleStart < 0 || bodyEnd < 0) {
  console.error('无法在欢迎页.txt 中找到 <style> 或 </body>');
  process.exit(1);
}
// 提取 <style>...</style> + <body>...</body> 内部（去掉 <body> 标签本身，保留内容到 </body> 之前）
const styleEnd = welcome.indexOf('</style>') + '</style>'.length;
const styleBlock = welcome.substring(styleStart, styleEnd);

const bodyStart = welcome.indexOf('<body>') + '<body>'.length;
const bodyContent = welcome.substring(bodyStart, bodyEnd); // 不含 <body></body> 标签

// 3. 拼接替换内容：style + 表单内容（body 内的 HTML）
const replacement = styleBlock + '\n' + bodyContent;

// 4. YAML 转义：替换内容作为 |- 多行字符串，需要转义特殊字符
//    YAML 的 |- 块标量只关心缩进，内容里的特殊字符原样保留
//    但需要确保没有行以比锚点缩进更少的空格开头（会导致块提前结束）
//    最安全：给每行加 8 空格缩进（比"替换为: |-"多 6 空格）
const indent = '        '; // 8 空格（YAML |- 块内容缩进）
const escapedReplacement = replacement.split(/\r?\n/).map(line => {
  // 空行只保留缩进空格（YAML 块内空行可为空或缩进）
  if (line.trim() === '') return indent;
  // 去掉行首空格后统一加 8 空格缩进，保证 YAML 块不提前结束
  return indent + line.replace(/^[ \t]*/, '');
}).join('\n');

// 5. 替换内容块已由第4步生成：escapedReplacement（含8空格缩进，可直接用于 |- 块）。直接复用，不再重定义。

// 6. 注入 index.yaml：定位已存在的开局渲染正则（id 9a1402da），替换其「替换为: |-」块内容
let yaml = fs.readFileSync(YAML, 'utf8');
const lines = yaml.split(/\r?\n/);

// 找开局渲染正则的「替换为: |-」行
let replaceIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].indexOf('9a1402da') !== -1 && lines[i].indexOf('id:') !== -1) {
    // 找到正则条目，往后找「替换为: |-」
    for (let j = i + 1; j < lines.length && !/^\s{2,4}酒馆助手:/.test(lines[j]) && !/^  - id:/.test(lines[j]); j++) {
      if (/^\s*替换为: \|-\s*$/.test(lines[j])) { replaceIdx = j; break; }
    }
    break;
  }
}

if (replaceIdx < 0) {
  console.error('index.yaml 中未找到开局渲染正则(9a1402da)的「替换为: |-」块');
  process.exit(1);
}

console.log('开局渲染正则替换为行:', replaceIdx + 1);
console.log('新替换内容字符数:', escapedReplacement.length);

// 「替换为: |-」块内容从 replaceIdx+1 开始，持续到缩进回退到 <=「替换为」缩进(4) 的行
const blockIndent = 8; // 「替换为: |-」下面内容缩进8空格
let endIdx = replaceIdx + 1;
while (endIdx < lines.length) {
  const line = lines[endIdx];
  if (line.trim() === '') { endIdx++; continue; }
  // 缩进回退到 <=4（与「替换为」同级或更少）则块结束
  const m = line.match(/^(\s*)/);
  if (m[1].length <= 4) break;
  endIdx++;
}

const before = lines.slice(0, replaceIdx + 1);
const after = lines.slice(endIdx);
const newLines = [...before, ...escapedReplacement.split(/\r?\n/), ...after];

fs.writeFileSync(YAML, newLines.join('\n'), 'utf8');
console.log('✅ 已更新「[显示]渲染魔法禁书目录开局页」正则的替换为块到 index.yaml');
console.log('新 index.yaml 行数:', newLines.length);
console.log('新 index.yaml 行数:', newLines.length);
