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
assert.deepEqual(invalid.issues[0].parts, ['偏移等级']);

// 6b. 只拦截改动字段上的校验问题；AI 写回的旧值不合规时不阻止写入（补丁式，借鉴参考卡）
const issues = [
  { path: '阵营', parts: ['阵营'], message: 'bad enum' },
  { path: '能力档案[0].是否稳定', parts: ['能力档案', 0, '是否稳定'], message: 'bad bool' },
];
assert.deepEqual(core.issuesForChanges(issues, [{ path: ['姓名'], before: 'a', after: 'b' }]), []);
assert.equal(core.issuesForChanges(issues, [{ path: ['阵营'], before: 'x', after: 'y' }]).length, 1);
assert.equal(
  core.issuesForChanges(issues, [{ path: ['能力档案'], before: [], after: [] }]).length,
  1,
  'array-level change must include nested issues',
);
const patchedBase = { 姓名: '旧', 阵营: '科学侧（学园都市）', 列表: [1, 2] };
const patched = core.applyChanges(patchedBase, [{ path: ['姓名'], before: '旧', after: '新' }]);
assert.deepEqual(patched, { 姓名: '新', 阵营: '科学侧（学园都市）', 列表: [1, 2] }, 'untouched fields stay as-is');
assert.equal(patchedBase.姓名, '旧', 'applyChanges must not mutate the base');

// 7. 面板位置限制在屏幕内
const clamped = core.clampLayout({ x: 5000, y: -50, width: 9000, height: 50 }, { width: 800, height: 600 });
assert.deepEqual(clamped, { x: 752, y: 0, width: 800, height: 160 });

// 7b. 分类：与消息末尾面板对应，字段都必须真实存在于 schema.ts，枚举选项与 schema 一致
assert.deepEqual(
  core.SECTIONS.map(section => section.id),
  ['玩家', '能力', '任务', '地点', '关系'],
);
const schemaSource = readFileSync(join(cardRoot, 'schema.ts'), 'utf8');
for (const section of core.SECTIONS) {
  for (const field of section.fields) {
    assert.ok(
      new RegExp(`^  ${field}: `, 'm').test(schemaSource),
      `section ${section.id}: field ${field} missing in schema.ts`,
    );
  }
}
for (const [field, options] of Object.entries(core.ENUM_OPTIONS)) {
  const enumText = `${field}: z.enum([${options.map(option => `'${option}'`).join(', ')}])`;
  assert.ok(schemaSource.includes(enumText), `ENUM_OPTIONS.${field} must match schema.ts`);
}
assert.equal(core.itemLabel({ 能力名称: '幻想杀手' }, 0), '1. 幻想杀手');
assert.equal(core.itemLabel({ 角色名: '茵蒂克丝' }, 2), '3. 茵蒂克丝');
assert.equal(core.itemLabel('白井黑子', 1), '2. 白井黑子');
assert.equal(core.itemLabel({}, 4), '5.');

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

// Real generated field definitions must recover malformed AI scalar types.
const schemaJson = JSON.parse(readFileSync(join(cardRoot, 'schema.json'), 'utf8'));
for (const [path, oldValue, raw, expected] of [
  [['能力档案', 0, '是否稳定'], '是', 'true', true],
  [['能力档案', 0, '是否稳定'], '否', 'false', false],
  [['NPC关系', 0, '好感度'], '20', '37', 37],
  [['主线进度', '阶段序号'], '5', '6', 6],
  [['年龄'], 18, '20岁', '20岁'],
]) {
  const spec = core.fieldInputSpec(schemaJson, path, oldValue);
  assert.deepEqual(core.coerceInput(oldValue, raw, spec.kind), { ok: true, value: expected });
}
assert.equal(core.coerceInput('20', '', 'number').ok, false);
assert.deepEqual(core.fieldInputSpec(schemaJson, ['阵营'], null).options, ['科学侧', '魔法侧', '']);

// Execute the actual recovery entry point with a message store and controlled timers.
// No browser process, network, source rewrite or build output is involved.
const scheduled = [];
const chat = [];
let writes = 0;
const host = {
  setTimeout: callback => {
    scheduled.push(callback);
    return scheduled.length;
  },
  clearTimeout() {},
  document: { querySelector: () => null },
  SillyTavern: { getContext: () => ({ chat, saveChat: async () => {} }) },
  Mvu: {
    getMvuData: ({ message_id }) => structuredClone(chat[message_id].variables[chat[message_id].swipe_id ?? 0]),
    replaceMvuData: async (data, { message_id }) => {
      writes++;
      chat[message_id].variables[chat[message_id].swipe_id ?? 0] = structuredClone(data);
    },
  },
};
host.parent = host;
const context = vm.createContext({ window: host, console: { info() {}, debug() {}, warn() {}, error() {} } });
const cache = new Map();
function loadRuntime(filename) {
  if (cache.has(filename)) return cache.get(filename);
  let source = readFileSync(filename, 'utf8');
  if (filename.replaceAll('\\', '/').endsWith('mvu-protocol-applier/index.ts')) {
    source =
      source.replace(/^installHotfix\(\);\s*$/m, '') +
      '\nexport const testRecovery = { parseAndWriteMvuMessage, repairFalselyAppliedFloors, cleanProtocolBlocks };';
  }
  const output = transpileModule(source, {
    compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
    fileName: filename,
  }).outputText;
  const loaded = { exports: {} };
  cache.set(filename, loaded.exports);
  vm.runInContext(`(function(module,exports,require){${output}\n})`, context, { filename })(
    loaded,
    loaded.exports,
    specifier => {
      if (specifier === '../_runtime_identity') return { registerMfrsRuntimeBuild() {} };
      const target = join(dirname(filename), specifier.endsWith('.js') ? specifier : `${specifier}.ts`);
      return loadRuntime(target);
    },
  );
  return loaded.exports;
}
const guard = loadRuntime(join(cardRoot, '脚本', '_manual_variable_edit.ts'));
const recovery = loadRuntime(join(cardRoot, '脚本', 'mvu-protocol-applier', 'index.ts')).testRecovery;
const protocol = value =>
  `<UpdateVariable><JSONPatch>${JSON.stringify([{ op: 'replace', path: '/所在位置', value }])}</JSONPatch></UpdateVariable>`;
const message = { mes: protocol('AI地点'), swipe_id: 0, extra: {}, variables: [{ stat_data: { 所在位置: '初始' } }] };
chat.push(message);
await recovery.parseAndWriteMvuMessage(0);
assert.equal(message.variables[0].stat_data.所在位置, 'AI地点', 'normal AI updates still execute');
const writesBeforeManual = writes;
guard.beginManualVariableEdit(message);
message.variables[0].stat_data.所在位置 = '手动地点';
assert.equal(guard.hasManualVariableEdit(message), true);
await recovery.parseAndWriteMvuMessage(0);
await recovery.repairFalselyAppliedFloors();
for (const callback of scheduled.splice(0)) callback();
await new Promise(resolve => setImmediate(resolve));
assert.equal(writes, writesBeforeManual, 'queued retries and repair must not write over a manual edit');
assert.equal(message.variables[0].stat_data.所在位置, '手动地点');
assert.equal(
  guard.hasManualVariableEdit(JSON.parse(JSON.stringify(message))),
  true,
  'guard persists through serialization',
);
// New protocol on the same swipe invalidates only the old guard.
message.mes = protocol('新协议地点');
assert.equal(guard.hasManualVariableEdit(message), false);
await recovery.parseAndWriteMvuMessage(0);
assert.equal(message.variables[0].stat_data.所在位置, '新协议地点');
message.extra._mfrs_raw_protocol_message = protocol('AI地点');
await recovery.cleanProtocolBlocks(0);
await recovery.parseAndWriteMvuMessage(0);
assert.equal(message.variables[0].stat_data.所在位置, '新协议地点', 'cleaning retains the new same-swipe protocol');
// New swipe must not inherit the previous swipe guard.
guard.beginManualVariableEdit(message);
message.swipe_id = 1;
message.variables[1] = { stat_data: { 所在位置: '新分支初值' } };
assert.equal(guard.hasManualVariableEdit(message), false);
await recovery.parseAndWriteMvuMessage(0);
assert.equal(message.variables[1].stat_data.所在位置, '新协议地点');
// A queued recovery must re-check the guard immediately before its write.
message.mes = protocol('排队中的旧协议');
const writesBeforeQueued = writes;
const queued = recovery.parseAndWriteMvuMessage(0);
const undoQueuedGuard = guard.beginManualVariableEdit(message);
await queued;
assert.equal(writes, writesBeforeQueued, 'a manual edit cancels recovery queued before it');
undoQueuedGuard();
const rollback = guard.beginManualVariableEdit(message);
rollback();
assert.equal(guard.hasManualVariableEdit(message), false, 'failed write rolls back the provisional guard');
const legacy = { swipe_id: 0, extra: { _mjr_variable_editor_swipe: 0 } };
assert.equal(guard.hasManualVariableEdit(legacy), true);
legacy.swipe_id = 1;
assert.equal(guard.hasManualVariableEdit(legacy), false);

console.log('MJR_VARIABLE_EDITOR_GATE_OK');
