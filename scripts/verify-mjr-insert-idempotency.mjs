/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const rawWriterPath = join(
  repoRoot,
  'src',
  '魔法禁书目录模拟器',
  '脚本',
  'mvu-protocol-applier',
  'raw-status-writer.ts',
);

function loadStandaloneTsSource(source, filename = rawWriterPath) {
  const transpiled = transpileModule(source, {
    compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
    fileName: filename,
  }).outputText;
  const sandbox = vm.createContext({ console });
  const module = { exports: {} };
  const wrapper = vm.runInContext(`(function (module, exports, require) {\n${transpiled}\n})`, sandbox, {
    filename,
  });
  wrapper(module, module.exports, specifier => {
    throw new Error(`Unexpected require: ${specifier}`);
  });
  return module.exports;
}

function protocol(patches) {
  return `<UpdateVariable><JSONPatch>${JSON.stringify(patches)}</JSONPatch></UpdateVariable>`;
}

function applyMany(apply, initial, patches, count = 1) {
  let data = structuredClone(initial);
  const message = protocol(patches);
  for (let index = 0; index < count; index += 1) data = apply(data, message).data;
  return data;
}

function assertContract(apply, label = 'production') {
  const base = {
    stat_data: {
      任务追踪: [],
      NPC关系: [],
      物品: { 持有物: [] },
      能力档案: [],
      世界线记录: [],
      在场人物: [],
    },
  };

  const task = { 任务名称: '寻找茵蒂克丝', 当前进度: '20%' };
  let result = applyMany(apply, base, [{ op: 'insert', path: '/任务追踪/-', value: task }], 4);
  assert.equal(result.stat_data.任务追踪.length, 1, `${label}: task replay must be idempotent`);
  assert.deepEqual(task, { 任务名称: '寻找茵蒂克丝', 当前进度: '20%' }, `${label}: patch value must not mutate`);

  result = applyMany(apply, result, [
    { op: 'insert', path: '/任务追踪/-', value: { 任务名称: '第二任务', 当前进度: '0%' } },
  ]);
  assert.equal(result.stat_data.任务追踪.length, 2, `${label}: different task keys must remain distinct`);

  result.stat_data.任务追踪[0].未知字段 = '保留';
  const firstTask = result.stat_data.任务追踪[0];
  result = applyMany(apply, result, [
    { op: 'insert', path: '/任务追踪/0', value: { 任务名称: '寻找茵蒂克丝', 当前进度: '50%' } },
  ]);
  assert.equal(result.stat_data.任务追踪.length, 2, `${label}: task update must not append`);
  assert.equal(result.stat_data.任务追踪[0].当前进度, '50%', `${label}: task update must merge fields`);
  assert.equal(result.stat_data.任务追踪[0].未知字段, '保留', `${label}: task update must preserve unknown fields`);
  assert.equal(result.stat_data.任务追踪[0].任务名称, firstTask.任务名称, `${label}: task position must remain stable`);

  result = applyMany(apply, base, [
    { op: 'insert', path: '/NPC关系/-', value: { 角色名: '御坂美琴', 好感度: 10 } },
  ], 3);
  assert.equal(result.stat_data.NPC关系.length, 1, `${label}: NPC role-name replay must be idempotent`);

  result = applyMany(apply, base, [
    { op: 'insert', path: '/NPC关系/-', value: { 角色名: '   ', 姓名: '白井黑子', 好感度: 5 } },
  ], 3);
  assert.equal(result.stat_data.NPC关系.length, 1, `${label}: NPC must fall back to 姓名 for blank 角色名`);

  result = applyMany(apply, base, [
    { op: 'insert', path: '/物品/持有物/-', value: { 名称: '学生证', 数量: 1 } },
  ], 3);
  assert.equal(result.stat_data.物品.持有物.length, 1, `${label}: item replay must be idempotent`);
  result = applyMany(apply, result, [
    { op: 'insert', path: '/物品/持有物/0', value: { 名称: '学生证', 数量: 2 } },
  ]);
  assert.equal(result.stat_data.物品.持有物.length, 1, `${label}: item update must not append`);
  assert.equal(result.stat_data.物品.持有物[0].数量, 2, `${label}: item update must merge`);

  result = applyMany(apply, base, [
    { op: 'insert', path: '/能力档案/-', value: { 能力名称: '电击使', 能力效果: '操纵电力' } },
  ], 3);
  assert.equal(result.stat_data.能力档案.length, 1, `${label}: ability replay must be idempotent`);

  const timeline = { 时间点: '4月某日', 事件: '抵达学园都市', 详情: { 地点: '第七学区' }, 标签: ['开场', '日常'] };
  result = applyMany(apply, base, [{ op: 'insert', path: '/世界线记录/-', value: timeline }], 3);
  assert.equal(result.stat_data.世界线记录.length, 1, `${label}: unkeyed object replay must be idempotent`);
  result = applyMany(apply, result, [
    {
      op: 'insert',
      path: '/世界线记录/-',
      value: { 事件: '抵达学园都市', 标签: ['开场', '日常'], 详情: { 地点: '第七学区' }, 时间点: '4月某日' },
    },
  ]);
  assert.equal(result.stat_data.世界线记录.length, 1, `${label}: object key order must not affect equality`);
  result = applyMany(apply, result, [
    { op: 'insert', path: '/世界线记录/-', value: { ...timeline, 时间点: '4月次日' } },
    { op: 'insert', path: '/世界线记录/-', value: { ...timeline, 标签: ['日常', '开场'] } },
  ]);
  assert.equal(result.stat_data.世界线记录.length, 3, `${label}: meaningful timeline differences must append`);

  result = applyMany(apply, base, [{ op: 'insert', path: '/在场人物/-', value: '御坂美琴' }], 2);
  assert.equal(result.stat_data.在场人物.length, 2, `${label}: scalar insert semantics must preserve duplicate values`);
  assert.equal(result.stat_data.在场人物[0], '御坂美琴', `${label}: first scalar insert must be preserved`);
  assert.equal(result.stat_data.在场人物[1], '御坂美琴', `${label}: repeated scalar insert must be preserved`);

  const invalid = apply(base, protocol([{ op: 'insert', path: '/任务追踪/2', value: task }]));
  assert.equal(invalid.skipped, 1, `${label}: invalid indexes must remain rejected`);
  assert.equal(invalid.data.stat_data.任务追踪.length, 0, `${label}: invalid indexes must not mutate arrays`);
}

const source = readFileSync(rawWriterPath, 'utf8');
assert.match(source, /const INSERT_DEDUP_KEYS/, 'primary-key mapping must exist');
assert.match(source, /'\/任务追踪': \['任务名称'\]/, 'task primary-key mapping must stay registered');
assert.match(source, /'\/NPC关系': \['角色名', '姓名'\]/, 'NPC fallback-key mapping must stay registered');
assert.match(source, /'\/物品\/持有物': \['名称'\]/, 'item primary-key mapping must stay registered');
assert.match(source, /'\/能力档案': \['能力名称'\]/, 'ability primary-key mapping must stay registered');

const production = loadStandaloneTsSource(source);
assertContract(production.applyRawProtocolToMvuData);

const mutationSource = source.replace("'/任务追踪': ['任务名称'],", "'/任务追踪': ['角色名'],");
assert.notEqual(mutationSource, source, 'mutation setup must change the task primary key');
const mutation = loadStandaloneTsSource(mutationSource, `${rawWriterPath}.mutation.ts`);
assert.throws(
  () => assertContract(mutation.applyRawProtocolToMvuData, 'task-key mutation'),
  /task (replay must be idempotent|update must not append)/,
  'gate must kill a regression that restores the old role-name-only behavior',
);

console.log('MJR_INSERT_IDEMPOTENCY_OK');
