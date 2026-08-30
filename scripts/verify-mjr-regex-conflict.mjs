import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// TavernWeave 离线正则验证：证明 sp_start 双正则冲突
// 读取魔禁 index.yaml 的正则区 + 首消息，模拟 SillyTavern 执行顺序

const ROOT = 'D:/project/tavern_helper_template/src/魔法禁书目录模拟器';
const indexPath = path.join(ROOT, 'index.yaml');
const firstMesPath = path.join(ROOT, '第一条消息/0.txt');

const indexYaml = fs.readFileSync(indexPath, 'utf8');
const firstMes = fs.readFileSync(firstMesPath, 'utf8');

// 提取首消息里的 sp_start 内容
const spStartMatch = firstMes.match(/<sp_start>([\s\S]*?)<\/sp_start>/);
const spStartBlock = spStartMatch ? spStartMatch[0] : '<sp_start>未找到</sp_start>';
console.log('=== 首消息 sp_start 块 ===');
console.log(JSON.stringify(spStartBlock.slice(0, 120) + '...'));

// 提取所有匹配 sp_start 的正则（按 index.yaml 顺序）
const lines = indexYaml.split('\n');
const spStartRegexes = [];
let current = null;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const nameRaw = line.match(/^\s*-?\s*正则名称:\s*(.+?)\s*$/);
  if (nameRaw) {
    if (current) spStartRegexes.push(current);
    // 兼容带引号与「[标签]」前缀的名称（如 '[显示]渲染魔法禁书目录开局页'）
    const nm = nameRaw[1].replace(/^'/, '').replace(/'$/, '').replace(/^\[[^\]]*\]\s*/, '').trim();
    current = { name: nm, lineNo: i + 1, findExpr: '', replaceWith: '', markdownOnly: false };
  }
  if (current) {
    const findMatch = line.match(/^\s*查找表达式:\s*'?(.+?)'?\s*$/);
    if (findMatch) current.findExpr = findMatch[1].trim();
    const repMatch = line.match(/^\s*替换为:\s*(.+?)\s*$/);
    if (repMatch) current.replaceWith = repMatch[1].trim().slice(0, 60);
    if (line.includes('仅格式显示: true')) current.markdownOnly = true;
  }
}
if (current) spStartRegexes.push(current);

// 筛选匹配 sp_start 的正则
const spStartRules = spStartRegexes.filter(r => r.findExpr.includes('sp_start'));
console.log('\n=== 匹配 sp_start 的正则（按执行顺序）===');
spStartRules.forEach((r, i) => {
  console.log(`[${i}] 行${r.lineNo} ${r.name}`);
  console.log(`    查找: ${r.findExpr}`);
  console.log(`    替换: ${r.replaceWith === "''" ? "(删除/空字符串)" : r.replaceWith + '...'}`);
  console.log(`    仅格式显示: ${r.markdownOnly}`);
});

// 模拟 SillyTavern 执行顺序（按 index.yaml 顺序）
console.log('\n=== 模拟执行顺序 ===');
let display = spStartBlock;
console.log('初始 display:', JSON.stringify(display.slice(0, 80) + '...'));
for (const rule of spStartRules) {
  console.log(`\n执行: ${rule.name} (行${rule.lineNo})`);
  // 解析正则字面量 /pattern/flags
  let regex;
  try {
    const m = rule.findExpr.match(/^\/(.+)\/([gimsuy]*)$/);
    if (m) {
      regex = new RegExp(m[1], m[2]);
    } else {
      regex = new RegExp(rule.findExpr, 'g');
    }
  } catch (e) {
    console.log('  正则编译失败:', e.message);
    continue;
  }
  const before = display;
  const isDelete = rule.replaceWith === "''" || rule.replaceWith === '' || rule.replaceWith === '""';
  if (isDelete) {
    display = display.replace(regex, '');
    console.log('  动作: 删除（替换为空）');
  } else {
    display = display.replace(regex, '[表单HTML已替换]');
    console.log('  动作: 替换为表单');
  }
  console.log('  结果:', display === '' ? '(空！)' : JSON.stringify(display.slice(0, 80) + '...'));
  if (display === '') {
    console.log('  ⚠️ sp_start 已被删除，后续正则将匹配不到！');
  }
}

console.log('\n=== 最终结论 ===');
if (spStartRules.length >= 2) {
  const first = spStartRules[0];
  if (first.replaceWith === "''" || first.replaceWith === '') {
    console.log('🔴 阻断冲突确认：第一个 sp_start 正则「' + first.name + '」(行' + first.lineNo + ')会删除 sp_start，');
    console.log('   导致后续的开局表单正则匹配不到，表单永远不显示。');
  }
}
