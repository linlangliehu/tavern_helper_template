#!/usr/bin/env node
// 重建魔禁卡 index.yaml —— 以神秘复苏发布版为格式模板
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, basename, extname, relative } from 'node:path';
import { randomUUID } from 'node:crypto';

const ROOT = 'D:\\project\\tavern_helper_template';
const MJR_DIR = join(ROOT, 'src', '魔法禁书目录模拟器');
const INDEX_PATH = join(MJR_DIR, 'index.yaml');
const WB_DIR = join(MJR_DIR, '世界书');
const WELCOME_PATH = join(MJR_DIR, '自定义开局', '欢迎页.txt');
const DEV_BASE = 'http://127.0.0.1:5510/dist/魔法禁书目录模拟器/脚本';

// === 1. 递归扫描世界书文件，按文件夹分组 ===
function scanWorldBook() {
  const groups = {};
  function walk(dir) {
    for (const f of readdirSync(dir, { withFileTypes: true })) {
      const fp = join(dir, f.name);
      if (f.isDirectory()) walk(fp);
      else if (extname(f.name) === '.txt' || extname(f.name) === '.yaml') {
        const folder = relative(WB_DIR, dir).replace(/\\/g, '/');
        const stem = basename(f.name, extname(f.name));
        (groups[folder] = groups[folder] || []).push(stem);
      }
    }
  }
  walk(WB_DIR);
  return groups;
}

// === 2. 生成一个世界书条目（绿灯/蓝灯/向量化）===
// anchor: 锚点名（'世界书常驻规则'/'自定义开局规则'）或 'vector'
function entry(name, file, anchor, order) {
  const lines = [`  - 名称: ${name}`];
  const isBlue = anchor === '世界书常驻规则';
  const isGreen = anchor === '自定义开局规则';
  const isVector = anchor === 'vector';
  // 启用
  lines.push(`    启用: ${isVector ? false : true}`);
  // 激活策略（多行展开式，tavern_sync 不接受 flow 式）
  lines.push(`    激活策略:`);
  if (isVector) {
    lines.push(`      类型: 向量化`);
  } else if (isGreen) {
    lines.push(`      类型: 绿灯`);
    lines.push(`      关键字:`);
    ['自定义开局','时空锚点','开局设定','欢迎页','身份与能力','设定身份','魔法禁书目录模拟器','进入魔法禁书目录','初始化魔法禁书目录'].forEach(k => lines.push(`        - ${k}`));
  } else {
    lines.push(`      类型: 蓝灯`);
  }
  // 插入位置
  lines.push(`    插入位置:`);
  lines.push(`      类型: 角色定义之前`);
  if (order) lines.push(`      顺序: ${order}`);
  // 激活概率 + 递归（非向量化）
  lines.push(`    激活概率: 100`);
  if (!isVector) {
    lines.push(`    递归:`);
    lines.push(`      不可被其他条目激活: true`);
    lines.push(`      不可激活其他条目: true`);
  }
  // 文件 or 内容
  if (file) {
    lines.push(`    文件: ${file}`);
  } else {
    lines.push(`    内容: ''`);
  }
  return lines.join('\n');
}

// === 3. 隐藏正则（对照发布版格式）===
function hideRegex(id, name, pattern) {
  return `  - id: ${id}
    正则名称: '${name}'
    启用: true
    查找表达式: '${pattern}'
    替换为: ''
    来源:
      用户输入: true
      AI输出: true
      快捷命令: false
      世界信息: false
    作用于:
      仅格式显示: true
      仅格式提示词: false`;
}

// === 4. 生成 index.yaml ===
const groups = scanWorldBook();

// 头部
let out = [];
out.push("# yaml-language-server: $schema=https://testingcf.jsdelivr.net/gh/StageDog/tavern_sync/dist/schema/character.zh.json");
out.push('头像: 魔法禁书目录模拟器.png');
out.push("版本: '1.0.0'");
out.push('作者: 琳琅');
out.push("备注: ''");
out.push('');
out.push('第一条消息:');
out.push('  - 文件: 第一条消息/0');
out.push('');
out.push('角色描述: |-');
out.push('  【魔法禁书目录模拟器】');
out.push('  这是一个基于《魔法禁书目录》世界观的学园都市与魔法侧热血搞笑推演系统。');
out.push('  核心设定：科学与魔法是两套互不相容的体系（AIM扩散力场与魔力对立），但玩家享有主角光环豁免，可自由混用，代价以搞笑受挫呈现。');
out.push('  运行边界：世界观、规则、变量、原著锚点和正文 UI 均由世界书、系统提示词、MVU 与正则脚本承载；主体字段只保留入口定位。');
out.push('  交互目标：引导{{user}}自定义开局，并在每轮输出剧情、本轮摘要和变量更新；具体交互由开局表单和消息内折叠面板承接。');
out.push('  选项由预设或前端负责显示和交互；MVU 变量更新仍由 <UpdateVariable> 承载。');
out.push('');
out.push('锚点:');
out.push('  - &世界书常驻规则');
out.push('    启用: true');
out.push('    激活策略:');
out.push('      类型: 蓝灯');
out.push('    插入位置:');
out.push('      类型: 指定深度');
out.push('      角色: 系统');
out.push('      深度: 4');
out.push('      顺序: 14700');
out.push('    激活概率: 100');
out.push('    递归:');
out.push('      不可被其他条目激活: true');
out.push('      不可激活其他条目: true');
out.push('');
out.push('  - &自定义开局规则');
out.push('    启用: false');
out.push('    激活策略:');
out.push('      类型: 绿灯');
out.push('      关键字:');
out.push('        - 魔法禁书目录模拟器');
out.push('        - 自定义开局');
out.push('        - 进入魔法禁书目录');
out.push('        - 欢迎页');
out.push('        - 身份与能力');
out.push('        - 时空锚点');
out.push('        - 开局设定');
out.push('        - 设定身份');
out.push('    插入位置:');
out.push('      类型: 角色定义之前');
out.push('      顺序: 1');
out.push('    激活概率: 100');
out.push('');
out.push('世界书名称: 与角色卡名称相同');
out.push('条目:');

// 世界书条目 —— 按文件夹分组
const folderOrder = ['变量', '世界设定', '剧情事件/主线', '剧情事件/支线', '科学侧', '魔法侧', '物品图鉴', '角色档案'];
let nextBlueOrder = 14600;
for (const folder of folderOrder) {
  const files = groups[folder];
  if (!files) continue;
  out.push(`- 文件夹: ${folder}`);
  out.push('  条目:');
  for (const stem of files.sort()) {
    const relPath = `世界书/${folder}/${stem}`;
    let order;
    if (stem === 'initvar') {
      out.push(entry('===变量开始===', null, 'vector', 14720));
      out.push(entry(stem, relPath, '世界书常驻规则', 14710));
    } else {
      order = nextBlueOrder--;
      out.push(entry(stem, relPath, '世界书常驻规则', order));
    }
  }
  out.push('');
}

// 欢迎页条目（绿灯，自定义开局）
out.push('- 文件夹: 自定义开局');
out.push('  条目:');
out.push('  - 名称: 欢迎页');
out.push('    启用: false');
out.push('    激活策略:');
out.push('      类型: 绿灯');
out.push('      关键字:');
out.push('        - 魔法禁书目录模拟器');
out.push('        - 自定义开局');
out.push('        - 进入魔法禁书目录');
out.push('        - 欢迎页');
out.push('        - 身份与能力');
out.push('        - 时空锚点');
out.push('        - 开局设定');
out.push('        - 设定身份');
out.push('    插入位置:');
out.push('      类型: 角色定义之前');
out.push('      顺序: 1');
out.push('    激活概率: 100');
out.push('    文件: 自定义开局/欢迎页');
out.push('');

// 扩展字段区
out.push('扩展字段:');
out.push('  标签:');
out.push('    - 角色');
out.push('    - 魔法禁书目录');
out.push("  正则:");

// 隐藏正则（7个）
// - 剧情锚点正则已删：它会先于开局页渲染正则执行导致sp_start被清空
const hidePatterns = [
  ['[隐藏]隐藏更新变量协议', '<UpdateVariable>[\\s\\S]*?<\\/UpdateVariable>'],
  ['[隐藏]隐藏变量摘要', '\\[\\[MFrsVariableSummary\\]\\][\\s\\S]*?\\[\\[\\/MFrsVariableSummary\\]\\]'],
  ['[隐藏]隐藏摘要结束标记', '\\[\\[MFrsSummaryEnd\\]\\]'],
  ['[隐藏]隐藏面板标记', '\\[\\[MFrsStatus\\]\\][\\s\\S]*?\\[\\[\\/MFrsStatus\\]\\]'],
  ['[隐藏]隐藏思考标签', '<think>[\\s\\S]*?<\\/think>'],
  ['[隐藏]隐藏reasoning', '<reasoning>[\\s\\S]*?<\\/reasoning>'],
  ['[隐藏]隐藏choices', '<choices>[\\s\\S]*?<\\/choices>'],
];
for (const [name, pat] of hidePatterns) {
  out.push(hideRegex(randomUUID(), name, pat));
}

// 开局表单正则（[显示]渲染开局页）—— 替换 sp_start 为表单 HTML
out.push(`  - id: ${randomUUID()}`);
out.push(`    正则名称: '[显示]渲染魔法禁书目录开局页'`);
out.push(`    启用: true`);
out.push(`    查找表达式: '/<sp_start>\\s*([\\s\\S]*?)\\s*<\\/sp_start>/gi'`);
out.push(`    替换为: |-`);
// 读取完整HTML文档（必须含<html>/<body>标签：酒馆助手isFrontend()靠这些子串识别前端代码块）
const welcomeHtml = readFileSync(WELCOME_PATH, 'utf8').trim();
const formContent = welcomeHtml;
// 包裹```html围栏：酒馆助手检测到前端代码块后渲染为沙盒iframe，内部JS可自由执行（标准机制，见C1/C2指南）
out.push('      ```html');
for (const line of formContent.split('\n')) {
  out.push('      ' + line.replace(/\s+$/, ''));
}
out.push('      ```');
out.push(`    来源:`);
out.push(`      用户输入: true`);
out.push(`      AI输出: true`);
out.push(`      快捷命令: false`);
out.push(`      世界信息: false`);
out.push(`    作用于:`);
out.push(`      仅格式显示: true`);
out.push(`      仅格式提示词: false`);
out.push('');

// 脚本库
out.push('  酒馆助手:');
out.push('    脚本库:');
const scripts = [
  { name: 'MVU', folder: 'MVU', entry: 'index' },
  { name: '变量结构', folder: '变量结构', entry: 'index' },
  { name: 'mvu协议应用', folder: 'mvu-protocol-applier', entry: 'index' },
  { name: '界面美化', folder: '界面美化', entry: 'index' },
  { name: '固定状态栏', folder: '固定状态栏', entry: 'index' },
  { name: '消息内面板', folder: '消息内面板', entry: 'index' },
];
for (const s of scripts) {
  const url = `${DEV_BASE}/${s.folder}/${s.entry}.js`;
  out.push(`      - id: ${randomUUID()}`);
  out.push(`        名称: ${s.name}`);
  out.push(`        启用: true`);
  out.push(`        类型: 脚本`);
  out.push(`        内容: |-`);
  out.push(`          loadModule('${s.name}', '${url}');`);
}
out.push('');

writeFileSync(INDEX_PATH, out.join('\n'), 'utf8');
console.log(`重建完成: ${INDEX_PATH}`);
console.log(`行数: ${out.length}`);
console.log(`世界书分组: ${Object.keys(groups).length}`);
console.log(`世界书文件总数: ${Object.values(groups).reduce((a, b) => a + b.length, 0)}`);
