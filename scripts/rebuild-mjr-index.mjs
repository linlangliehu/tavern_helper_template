// 重建 魔法禁书目录模拟器 index.yaml（发布版结构）
// 结构：锚点 + 世界书名称 + 条目(文件夹分组) + 扩展字段(标签/正则/酒馆助手)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:/project/tavern_helper_template';
const CARD = 'src/魔法禁书目录模拟器';
const cardDir = path.join(ROOT, CARD);

// 1. 扫描世界书目录
function scanWorldBook() {
  const wbDir = path.join(cardDir, '世界书');
  const groups = {};
  function walk(dir, folder) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const f of items) {
      const fp = path.join(dir, f.name);
      if (f.isDirectory()) {
        walk(fp, f.name);
      } else if (f.name.endsWith('.txt') || f.name.endsWith('.yaml')) {
        const name = f.name.replace(/\.(txt|yaml)$/, '');
        const rel = path.relative(wbDir, fp).replace(/\\/g, '/').replace(/\.(txt|yaml)$/, '');
        if (!groups[folder]) groups[folder] = [];
        groups[folder].push({ name, file: '世界书/' + rel });
      }
    }
  }
  walk(wbDir, '');
  return groups;
}

// 2. 扫描脚本
function scanScripts() {
  const sDir = path.join(cardDir, '脚本');
  const scripts = [];
  for (const f of fs.readdirSync(sDir, { withFileTypes: true })) {
    if (f.isDirectory()) scripts.push({ name: f.name, file: `脚本/${f.name}/index` });
  }
  return scripts;
}

const groups = scanWorldBook();
const scripts = scanScripts();

// 3. 锚点定义
let out = `# yaml-language-server: $schema=https://testingcf.jsdelivr.net/gh/StageDog/tavern_sync/dist/schema/character.zh.json
头像: 魔法禁书目录模拟器.png
版本: '0.1.0'
作者: 魔禁卡开发组
备注: '基于《魔法禁书目录》世界观的科学侧/魔法侧双阵营角色模拟卡'

第一条消息:
  - 文件: 第一条消息/0

角色描述: |-
  【魔法禁书目录模拟器】
  这是一个基于《魔法禁书目录》世界观的学园都市/魔法侧双阵营角色模拟系统。
  学园都市孕育超能力者（Level 0-6），魔法侧传承十字教与灵装术式。
  本作尊重原著：能力者AIM力场与魔力不相容，强行混用伤身；玩家作为主角享有主角光环豁免，代价以搞笑受挫/出糗/体力透支呈现，不判死亡、不设风险值。
  不做解密、不做风险值、不做失败收场。科学与魔法自由混搭，热血搞笑与主线支线剧情并重。

`;

// 锚点
out += `锚点:\n`;
out += `  - &世界书常驻规则\n    启用: true\n    激活策略:\n      类型: 蓝灯\n    插入位置:\n      类型: 指定深度\n      角色: 系统\n      深度: 4\n      顺序: 14700\n    激活概率: 100\n    递归:\n      不可被其他条目激活: true\n      不可激活其他条目: true\n\n`;
out += `  - &自定义开局规则\n    启用: false\n    激活策略:\n      类型: 绿灯\n      关键字:\n        - 魔法禁书目录模拟器\n        - 自定义开局\n        - 进入魔法禁书目录\n        - 欢迎页\n        - 身份与能力\n        - 时空锚点\n        - 开局设定\n        - 设定身份\n    插入位置:\n      类型: 角色定义之前\n      顺序: 1\n    激活概率: 100\n\n`;

// 世界书名称 + 条目
out += `世界书名称: 与角色卡名称相同\n`;
out += `条目:\n`;

const blueNames = ['变量列表', '变量更新规则', '世界规则概览', '原著剧情锚点总览', '主线剧情导航', '主线事件·禁书降临', '主线事件·绝对能力者进化'];
// 按 folder 顺序输出
const folderOrder = ['变量', '世界设定', '剧情事件', '科学侧', '魔法侧', '物品图鉴', '角色档案'];
// 自定义开局里的欢迎页单独处理
for (const folder of folderOrder) {
  const entries = groups[folder] || [];
  if (!entries.length) continue;
  out += `- 文件夹: ${folder}\n  条目:\n`;
  // 剧情事件文件夹下有主线/支线子文件夹，需合并
  let allEntries = entries;
  if (folder === '剧情事件') {
    // 主线/支线子目录已被 walk 展开成 folder=主线/支线，需重新收集
    allEntries = [...(groups['主线']||[]), ...(groups['支线']||[])];
  }
  for (const e of allEntries) {
    const isBlue = blueNames.includes(e.name);
    out += `  - 名称: ${e.name}\n`;
    if (isBlue) {
      out += `    启用: true\n    激活策略:\n      <<: *世界书常驻规则\n    插入位置:\n      类型: 角色定义之前\n      顺序: 1\n    激活概率: 100\n    文件: ${e.file}\n\n`;
    } else {
      out += `    启用: true\n    激活策略:\n      类型: 绿灯\n      关键字:\n        - ${e.name}\n    插入位置:\n      类型: 角色定义之前\n      顺序: 1\n    激活概率: 100\n    文件: ${e.file}\n\n`;
    }
  }
}

// 自定义开局文件夹（欢迎页，启用false）
out += `- 文件夹: 自定义开局\n  条目:\n`;
out += `  - 名称: 欢迎页\n    启用: false\n    激活策略:\n      <<: *自定义开局规则\n    插入位置:\n      类型: 角色定义之前\n      顺序: 1\n    激活概率: 100\n    文件: 自定义开局/欢迎页\n\n`;

// 4. 扩展字段
out += `扩展字段:\n`;
out += `  标签:\n`;
out += `    - 二次元\n    - 角色扮演\n    - 魔法禁书目录\n    - 超电磁炮\n    - 学园都市\n    - 科学侧\n    - 魔法侧\n    - 热血\n    - 搞笑\n    - 模拟器\n\n`;

// 正则（在扩展字段下，缩进2）
out += `  正则:\n`;
const hideRegexes = [
  ['[隐藏]隐藏更新变量协议', '/<UpdateVariable>[\\s\\S]*?<\\/UpdateVariable>/gi'],
  ['[隐藏]隐藏系统摘要', '/<本轮摘要>[\\s\\S]*?<\\/本轮摘要>/gi'],
  ['[隐藏]隐藏时间戳', '/\\[MFrsTime\\][\\s\\S]*?\\[\\/MFrsTime\\]/gi'],
  ['[隐藏]隐藏面板占位', '/\\[\\[MFrsStatus\\]\\][^\\[]*\\[\\/MFrsStatus\\]\\]/gi'],
  ['[隐藏]隐藏sp容器', '/<sp_start>[\\s\\S]*?<\\/sp_start>/gi'],
  ['[隐藏]隐藏choices', '/<choices>[\\s\\S]*?<\\/choices>/gi'],
  ['[隐藏]隐藏草稿', '/<draft>[\\s\\S]*?<\\/draft>/gi'],
  ['[隐藏]隐藏节奏', '/<pacing_rules>[\\s\\S]*?<\\/pacing_rules>/gi'],
  ['[隐藏]隐藏修改确认', '/<修改确认>[\\s\\S]*?<\\/修改确认>/gi'],
];
for (const [name, find] of hideRegexes) {
  const uuid = crypto.randomUUID();
  out += `    - 正则名称: "${name}"\n      id: ${uuid}\n      启用: true\n      查找表达式: '${find}'\n      替换为: ''\n      来源:\n        用户输入: true\n        AI输出: true\n        快捷命令: false\n        世界信息: false\n      作用于:\n        仅格式显示: true\n        仅格式提示词: false\n      最大深度: 3\n\n`;
}

// 开局表单显示正则
const welcomePath = path.join(cardDir, '自定义开局', '欢迎页.txt');
let welcomeHtml = '';
try {
  const raw = fs.readFileSync(welcomePath, 'utf8');
  const styleMatch = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (styleMatch && bodyMatch) {
    welcomeHtml = `<style>${styleMatch[1]}</style>\n${bodyMatch[1]}`;
  } else {
    welcomeHtml = raw.replace(/<!DOCTYPE[^>]*>/gi,'').replace(/<\/?html[^>]*>/gi,'').replace(/<head[^>]*>[\s\S]*?<\/head>/gi,'').replace(/<\/?body[^>]*>/gi,'').replace(/<\/?meta[^>]*>/gi,'').trim();
  }
} catch (e) { console.error('读取欢迎页失败:', e.message); process.exit(1); }

const welcomeLines = welcomeHtml.split('\n').map(line => {
  const trimmed = line.replace(/^\s+/, '');
  return '        ' + trimmed;
}).join('\n');
const welcomeRegexUuid = crypto.randomUUID();
out += `    - 正则名称: '[显示]渲染魔法禁书目录开局页'\n      id: ${welcomeRegexUuid}\n      启用: true\n      查找表达式: '/<sp_start>\\s*([\\s\\S]*?)\\s*<\\/sp_start>/gi'\n      替换为: |-\n${welcomeLines}\n      来源:\n        用户输入: false\n        AI输出: true\n        快捷命令: false\n        世界信息: false\n      作用于:\n        仅格式显示: true\n        仅格式提示词: false\n\n`;

// 5. 酒馆助手脚本库（在扩展字段下，发布版格式：类型:脚本 + 内容内联）
out += `  酒馆助手:\n    脚本库:\n`;
import crypto from 'node:crypto';
const BASE = 'http://127.0.0.1:5510/dist/魔法禁书目录模拟器';
const enc = s => encodeURIComponent(s).replace(/%2F/g, '/');
// mvu 特殊：从 MagVar CDN 加载
const mvuUuid = crypto.randomUUID();
out += `      - 名称: MVU\n        id: ${mvuUuid}\n        启用: true\n        类型: 脚本\n        内容: |-\n          import 'https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate@0.171.0/artifact/bundle.js?v=v81540_20260821_03';\n\n`;
const loaderJs = `const loadModule = async (label, url) => {\n  const maxAttempts = 20;\n  for (let attempt = 1; attempt <= maxAttempts; attempt++) {\n    try {\n      await import(\`\${url}\${url.includes('?') ? '&' : '?'}t=\${Date.now()}\`);\n      console.info(\`[\${label}] 已加载\`);\n      return;\n    } catch (error) {\n      console.warn(\`[\${label}] 加载失败 (\${attempt}/\${maxAttempts})\`, error);\n      await new Promise(resolve => setTimeout(resolve, 1000));\n    }\n  }\n  console.error(\`[\${label}] 加载失败，请检查本地服务器(5510)是否运行\`);\n};\n`;
for (const s of scripts) {
  if (s.name === 'MVU') continue;
  const uuid = crypto.randomUUID();
  const url = BASE + '/脚本/' + enc(s.name) + '/index.js';
  out += `      - 名称: ${s.name}\n        id: ${uuid}\n        启用: true\n        类型: 脚本\n        内容: |-\n`;
  const lines = (loaderJs + `loadModule('${s.name}', '${url}');\n`).split('\n');
  for (const line of lines) {
    if (line === '') { out += '\n'; } else { out += `          ${line}\n`; }
  }
  out += '\n';
}

fs.writeFileSync(path.join(cardDir, 'index.yaml'), out, 'utf8');
console.log('index.yaml 重建完成（发布版结构）');
let total = 0;
for (const f of Object.keys(groups)) total += groups[f].length;
console.log('世界书条目数:', total, '(+欢迎页)');
console.log('脚本数:', scripts.length);
console.log('欢迎页HTML字符数:', welcomeHtml.length);
console.log('文件总行数:', out.split('\n').length);
