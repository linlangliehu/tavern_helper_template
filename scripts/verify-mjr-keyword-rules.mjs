/* eslint-disable import-x/no-nodejs-modules */
// MJR 1.1.9 P2：「蓝灯概要 + 绿灯详细图鉴」拆分的关键字门禁（见 角色卡制作经验.md 2.26）。
// 规则：① 不用泛词；② 不被第一条消息命中（否则开局即触发，优化失效）；③ 每个关键字都能在详细正文里找到；
// ④ 每个绿灯详细条目都有对应的蓝灯概要，且详细条目必须是绿灯、有关键字。
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cardDir = join(root, 'src', '魔法禁书目录模拟器');

export const PAIRS = [
  { summary: '魔法术式概要', detail: '魔法术式图鉴' },
  { summary: '超能力概要', detail: '超能力图鉴' },
  { summary: '配角概要', detail: '配角总览' },
  { summary: '物品概要', detail: '物品大全' },
];

// 与关键字完全相同才算违规（「符文魔法」允许，「符文」不允许）。
export const BANNED = [
  '魔法',
  '魔术',
  '术式',
  '符文',
  '灵装',
  '魔法阵',
  '超能力',
  '超能力者',
  '能力',
  '能力者',
  '能力等级',
  '学园都市',
  'AIM',
  '科学',
  '妹妹',
];

/** 纯函数：返回违规列表 [{entry, keyword, rule}]，便于自测。 */
export function checkKeywordRules({ entries, readBody, firstMessages }) {
  const violations = [];
  const byName = new Map(entries.map(e => [e.名称, e]));
  const firstText = firstMessages.join('\n').toLowerCase();
  const banned = new Set(BANNED.map(w => w.toLowerCase()));

  for (const { summary, detail } of PAIRS) {
    const s = byName.get(summary);
    const d = byName.get(detail);
    if (!s || s.启用 === false || s.激活策略?.类型 !== '蓝灯') {
      violations.push({ entry: summary, keyword: '-', rule: '④ 缺少启用的蓝灯概要' });
    }
    if (!d || d.启用 === false || d.激活策略?.类型 !== '绿灯') {
      violations.push({ entry: detail, keyword: '-', rule: '④ 详细条目必须是启用的绿灯' });
      continue;
    }
    const keywords = d.激活策略.关键字 ?? [];
    if (keywords.length === 0) violations.push({ entry: detail, keyword: '-', rule: '④ 绿灯条目没有关键字' });
    const body = readBody(d).toLowerCase();
    for (const raw of keywords) {
      const k = String(raw).trim().toLowerCase();
      if (banned.has(k)) violations.push({ entry: detail, keyword: raw, rule: '① 泛词' });
      if (firstText.includes(k)) violations.push({ entry: detail, keyword: raw, rule: '② 第一条消息命中' });
      if (!body.includes(k)) violations.push({ entry: detail, keyword: raw, rule: '③ 详细正文里找不到' });
    }
  }
  return violations;
}

function flatten(list, out = []) {
  for (const e of list ?? []) {
    if (e.条目) flatten(e.条目, out);
    else out.push(e);
  }
  return out;
}

function readEntryBody(entry) {
  if (entry.内容) return entry.内容;
  if (!entry.文件) return '';
  for (const ext of ['.txt', '.md', '.yaml', '']) {
    const p = join(cardDir, entry.文件 + ext);
    if (existsSync(p)) return readFileSync(p, 'utf8');
  }
  return '';
}

// 自测：确认四条规则都能抓到违规。
{
  const fake = [
    { 名称: '魔法术式概要', 激活策略: { 类型: '蓝灯' } },
    { 名称: '魔法术式图鉴', 激活策略: { 类型: '绿灯', 关键字: ['魔法', '神裂', '不存在'] }, 内容: '魔法 神裂' },
    { 名称: '超能力图鉴', 激活策略: { 类型: '蓝灯' } },
  ];
  const v = checkKeywordRules({ entries: fake, readBody: readEntryBody, firstMessages: ['神裂登场'] });
  const has = (entry, keyword, rule) => v.some(x => x.entry === entry && x.keyword === keyword && x.rule.startsWith(rule));
  assert.ok(has('魔法术式图鉴', '魔法', '①'), 'self-test: banned word');
  assert.ok(has('魔法术式图鉴', '神裂', '②'), 'self-test: first message hit');
  assert.ok(has('魔法术式图鉴', '不存在', '③'), 'self-test: keyword missing from body');
  assert.ok(has('超能力概要', '-', '④'), 'self-test: missing summary');
  assert.ok(has('超能力图鉴', '-', '④'), 'self-test: detail not green');
}

const data = YAML.parse(readFileSync(join(cardDir, 'index.yaml'), 'utf8'));
const msgDir = join(cardDir, '第一条消息');
const firstMessages = readdirSync(msgDir)
  .filter(f => f.endsWith('.txt'))
  .map(f => readFileSync(join(msgDir, f), 'utf8'));
const entries = flatten(data.条目);
const violations = checkKeywordRules({ entries, readBody: readEntryBody, firstMessages });

if (violations.length > 0) {
  console.error(`verify-mjr-keyword-rules: ${violations.length} violation(s)`);
  for (const v of violations) console.error(`  ${v.entry} | ${v.keyword} | ${v.rule}`);
  process.exit(1);
}
const total = PAIRS.reduce((n, p) => n + (entries.find(e => e.名称 === p.detail)?.激活策略?.关键字?.length ?? 0), 0);
console.log(`verify-mjr-keyword-rules: OK (${PAIRS.length} pairs, ${total} keywords, ${firstMessages.length} first message(s))`);
