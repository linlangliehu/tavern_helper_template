/* eslint-disable import-x/no-nodejs-modules */
/**
 * verify-mfrs-db-rules-prompt.mjs —— 数据库联动规则与表模板同源门禁
 *
 * native 模式实测每轮丢 25-40% 写入，失败集中在两类：AI 用英文列名（related_event /
 * identity / 当前位置…）和枚举越界。修法是在常驻蓝灯规则里把列名与枚举白名单写死，
 * 但规则文本与 神秘复苏表格SQL_v1.json 是两份数据——表结构一改，规则就会悄悄失真。
 *
 * 本门禁从模板 DDL 机械提取「14 表中文列名 + 全部 CHECK(col IN (...)) 枚举值」，
 * 断言规则文本全部覆盖，把两者钉成同源。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const templatePath = join(repoRoot, 'src', '神秘复苏模拟器', '数据库', '神秘复苏表格SQL_v1.json');
const rulesPath = join(repoRoot, 'src', '神秘复苏模拟器', '世界书', '规则', '数据库联动规则.txt');

const template = JSON.parse(readFileSync(templatePath, 'utf8'));
const rules = readFileSync(rulesPath, 'utf8');

const sheets = Object.entries(template).filter(([key]) => key.startsWith('sheet_'));
assert.equal(sheets.length, 14, `模板应有 14 张表，实际 ${sheets.length}`);

// ─────────────────────── 1. 中文列名全覆盖 ───────────────────────
const missingColumns = [];
for (const [key, sheet] of sheets) {
  const headers = (sheet.content?.[0] || []).filter(header => header !== 'row_id');
  assert.ok(headers.length > 0, `${key} 缺少表头`);
  for (const header of headers) {
    if (!rules.includes(header)) missingColumns.push(`${sheet.name}.${header}`);
  }
}
assert.deepEqual(
  missingColumns,
  [],
  `数据库联动规则.txt 缺少以下中文列名（表结构已改动？请同步「六、写表硬约束」）：\n  ${missingColumns.join('\n  ')}`,
);

// ─────────────────────── 2. 枚举白名单全覆盖 ───────────────────────
// DDL 形如：handling_status TEXT NOT NULL CHECK(handling_status IN ('未处理', '调查中', ...))
const missingEnums = [];
let enumGroupCount = 0;
for (const [, sheet] of sheets) {
  const ddl = sheet.sourceData?.ddl || '';
  for (const match of ddl.matchAll(/(\w+)\s+TEXT[^,]*?CHECK\s*\(\s*\1\s+IN\s*\(([^)]*)\)\s*\)/g)) {
    enumGroupCount += 1;
    const values = match[2]
      .split(',')
      .map(value => value.trim().replace(/^'|'$/g, ''))
      .filter(Boolean);
    for (const value of values) {
      if (!rules.includes(value)) missingEnums.push(`${sheet.name}.${match[1]} = ${value}`);
    }
  }
}
assert.ok(enumGroupCount >= 13, `应提取到至少 13 组 CHECK IN 枚举，实际 ${enumGroupCount}`);
assert.deepEqual(
  missingEnums,
  [],
  `数据库联动规则.txt 缺少以下枚举值：\n  ${missingEnums.join('\n  ')}`,
);

// ─────────────────────── 3. 关键约束条款存在性 ───────────────────────
const requiredClauses = [
  ['列名一律使用下列中文名', '缺少中文列名强制条款'],
  ['related_event→关联事件', '缺少常见英文列名错误对照'],
  ['identity→身份', '缺少 identity 错误对照（真页实测高频）'],
  ['match row_id 1-4', '缺少行动建议固定行 match 约束'],
  ['match row_id 1-5', '缺少检定建议固定行 match 约束'],
  ['20-600 字', '缺少事件纪要正文长度约束'],
  ['禁止填 SP0001', '缺少纪要编号误填正文列的禁令'],
];
for (const [needle, label] of requiredClauses) {
  assert.ok(rules.includes(needle), `${label}（未找到「${needle}」）`);
}

// ─────────────────────── 4. 固定行表清单与模板一致 ───────────────────────
// 这四张表在 table-change-adapter 的 FORBIDDEN_INSERT_TABLES 里禁止 insert，
// 规则文本必须同步声明，否则 AI 会持续输出被丢弃的 insertRow。
for (const name of ['全局状态', '玩家状态', '行动建议', '检定建议']) {
  assert.ok(
    new RegExp(`固定行表[\\s\\S]{0,400}${name}`).test(rules),
    `固定行表条款应包含「${name}」`,
  );
}

console.log(
  `verify-mfrs-db-rules-prompt: passed (14 表列名 + ${enumGroupCount} 组枚举 与规则文本同源)`,
);
