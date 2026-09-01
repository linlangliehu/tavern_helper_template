const fs = require('fs');
const p = require('path');
const ROOT = p.resolve(__dirname, '..');
const y = require(p.join(ROOT, 'node_modules', 'js-yaml'));

const CARD = p.join(ROOT, 'src', '魔法禁书目录模拟器', 'index.yaml');
let failed = false;
const fail = msg => { console.log('FAIL:', msg); failed = true; };

try {
  const d = y.load(fs.readFileSync(CARD, 'utf8'));
  console.log('YAML_OK');

  // 顶层结构完整性
  const REQUIRED = ['头像', '版本', '作者', '第一条消息', '角色描述', '世界书名称', '条目', '扩展字段'];
  const missing = REQUIRED.filter(k => !(k in d));
  if (missing.length) fail('缺少顶层键: ' + missing.join(', '));

  // 世界书条目（文件夹 → 条目 两级结构）
  const folders = d.条目 || [];
  const entries = folders.flatMap(f => f.条目 || []);
  console.log('世界书文件夹:', folders.length, '组');
  console.log('世界书条目:', entries.length, '条');
  const badEntry = entries.find(e => !e.名称);
  if (badEntry) fail('存在无名称条目');

  // [initvar] 通道标记（2026-09-05 修复后必须存在，防回归）
  const iv = entries.find(e => String(e.名称 || '').includes('[initvar]'));
  if (!iv) fail('未找到 comment 含 [initvar] 的条目（MagVar 世界书初始化通道会空转）');
  else console.log('initvar 通道:', iv.名称, '| 启用:', iv.启用);

  // 正则（位于 扩展字段.正则）
  const regs = d.扩展字段?.正则;
  if (!Array.isArray(regs)) fail('扩展字段.正则 不是数组');
  else {
    console.log('正则:', regs.length, '条');
    const r = regs.find(x => x['正则名称'] && x['正则名称'].includes('渲染魔法禁书目录开局页'));
    if (!r) fail('未找到开局页渲染正则');
    else {
      console.log('开局正则: 找到');
      console.log('查找:', String(r['查找表达式'] || '').substring(0, 50));
      console.log('替换为长度:', String(r['替换为'] || '').length);
      console.log('仅格式显示:', r['作用于']?.['仅格式显示'] ?? null);
      if (!String(r['查找表达式'] || '').includes('sp_start')) fail('开局正则查找表达式不含 sp_start');
      if (!String(r['替换为'] || '').length) fail('开局正则替换为空');
      if (r['作用于']?.['仅格式显示'] !== true) fail('开局正则未设仅格式显示');
    }
  }
} catch (e) {
  console.log('YAML_ERR:', e.message, e.mark ? '@line' + e.mark.line : '');
  process.exit(1);
}

if (failed) process.exit(1);
