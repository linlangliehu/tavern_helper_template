/* eslint-disable import-x/no-nodejs-modules */
// 悬浮变量编辑器门禁：离线测试纯逻辑（editor-core.ts），并确认脚本已接入加载器。
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';
import { z } from 'zod';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cardRoot = join(root, 'src', '魔法禁书目录模拟器');
const corePath = join(cardRoot, '脚本', '变量编辑器', 'editor-core.ts');
const transpiled = transpileModule(readFileSync(corePath, 'utf8'), {
  compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
  fileName: corePath,
}).outputText;
const module = { exports: {} };
// 用 runInThisContext：和测试代码同一个 realm，deepStrictEqual 才能比较返回的数组/对象
vm.runInThisContext(`(function (module, exports) {\n${transpiled}\n})`, { filename: corePath })(module, module.exports);
const core = module.exports;

const sample = () => ({
  姓名: '上条当麻',
  偏移等级: 0,
  在场: true,
  NPC关系: [
    { 角色名: '茵蒂克丝', 好感度: 50 },
    { 角色名: '御坂美琴', 好感度: 30 },
  ],
});

// 1. 按路径改值：不改动入参，返回新对象
const base = sample();
const edited = core.setAtPath(base, ['NPC关系', 1, '好感度'], 45);
assert.equal(edited.NPC关系[1].好感度, 45);
assert.equal(base.NPC关系[1].好感度, 30, 'setAtPath must not mutate the original');
assert.throws(() => core.setAtPath(base, ['不存在的字段'], 1), /路径不存在/, 'must not add new fields');
assert.throws(() => core.setAtPath(base, ['NPC关系', 5], {}), /路径不存在/, 'must not append array items');

// 2. 只允许删除数组项
assert.equal(core.canRemoveAtPath(base, ['NPC关系', 0]), true);
assert.equal(core.canRemoveAtPath(base, ['姓名']), false, 'object fields are fixed by schema');
assert.equal(core.canRemoveAtPath(base, []), false);
const removed = core.removeArrayItem(base, ['NPC关系', 0]);
assert.deepEqual(
  removed.NPC关系.map(item => item.角色名),
  ['御坂美琴'],
);
assert.equal(base.NPC关系.length, 2, 'removeArrayItem must not mutate the original');
assert.throws(() => core.removeArrayItem(base, ['姓名']), /只能删除数组项/);

// 3. 输入按原值类型转换，非法输入不写入
assert.deepEqual(core.coerceInput(3, ' 12 '), { ok: true, value: 12 });
assert.deepEqual(core.coerceInput(3, 'abc'), { ok: false });
assert.deepEqual(core.coerceInput(3, ''), { ok: false });
assert.deepEqual(core.coerceInput(true, false), { ok: true, value: false });
assert.deepEqual(core.coerceInput('a', '42'), { ok: true, value: '42' }, 'string fields stay strings');

// 4. 改动清单
const changes = core.diffValues(base, edited);
assert.equal(changes.length, 1);
assert.equal(core.formatPath(changes[0].path), 'NPC关系[1].好感度');
assert.equal(core.diffValues(base, removed).length, 1, 'array length change counts as one change');
assert.equal(core.diffValues(base, sample()).length, 0);

// 5. JSON 草稿解析
assert.equal(core.parseJsonDraft('{"a":1}').ok, true);
assert.equal(core.parseJsonDraft('[1,2]').ok, false, 'stat_data must be an object');
assert.match(core.parseJsonDraft('{bad').message, /JSON 格式错误/);

// 6. 结构校验失败时拒绝写入（用小型 zod 结构模拟卡片 Schema）
const schema = z.object({ 姓名: z.string(), 偏移等级: z.number() });
assert.equal(core.validateDraft(schema, { 姓名: 'x', 偏移等级: 1 }).ok, true);
const invalid = core.validateDraft(schema, { 姓名: 'x', 偏移等级: '很高' });
assert.equal(invalid.ok, false);
assert.equal(invalid.issues[0].path, '偏移等级');

// 7. 面板位置限制在屏幕内
const clamped = core.clampLayout({ x: 5000, y: -50, width: 9000, height: 50 }, { width: 800, height: 600 });
assert.deepEqual(clamped, { x: 752, y: 0, width: 800, height: 160 });

// 8. 接入：入口存在、使用卡片 Schema 校验、不用 innerHTML/eval；加载器包含该模块
const entrySource = readFileSync(join(cardRoot, '脚本', '变量编辑器', 'index.ts'), 'utf8');
// 用 includes 而非正则：verify-script-deps 会把正则里的 `from '...'` 误当成包导入
assert.ok(entrySource.includes("import { Schema } from '../../schema'"), 'editor must import the card Schema');
assert.match(entrySource, /validateDraft\(Schema, draft\)/, 'apply must validate against the card Schema');
assert.doesNotMatch(
  entrySource,
  /innerHTML|insertAdjacentHTML|\beval\(|new Function/,
  'editor must not inject HTML or eval',
);
const indexSource = readFileSync(join(cardRoot, 'index.yaml'), 'utf8');
assert.match(
  indexSource,
  /loadModule\('变量编辑器', '[^']+\/dist\/魔法禁书目录模拟器\/脚本\/变量编辑器\/index\.js'\)/,
  'script loader must load the variable editor',
);

console.log('MJR_VARIABLE_EDITOR_GATE_OK');
