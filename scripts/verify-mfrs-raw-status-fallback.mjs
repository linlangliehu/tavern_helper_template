/* eslint-disable import-x/no-nodejs-modules */
/**
 * G8：现场档案实时更新链路回归门禁。
 *
 * 覆盖三段：
 *  A. 双 applier 语义一致性 —— hotfix 侧 applyRawProtocolToMvuData 与 HUD 侧
 *     applyUpdateProtocolToStatData 对同一组 JSONPatch 必须产出相同 stat_data，
 *     且与本文件内的 reference applier 一致（防两侧实现独立漂移）。
 *  B. 静态结构断言 —— hotfix 兜底分支、raw 快照/清洗顺序、HUD raw 合成引用。
 *  C. 数据库固定行回归红线 —— 固定行表（row_id 受 CHECK 约束）的 updateCell
 *     在 ROW_NOT_FOUND 时不得自动提升为 insertRow，否则会撞物理表 UNIQUE。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';
import YAML from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const mfrsRoot = join(repoRoot, 'src', '神秘复苏模拟器');
const scriptRoot = join(mfrsRoot, '脚本');
const hotfixDir = join(scriptRoot, 'hotfix-generation-ended-listeners');
const hotfixPath = join(hotfixDir, 'index.ts');
const rawWriterPath = join(hotfixDir, 'raw-status-writer.ts');
const panelDir = join(scriptRoot, '消息内面板');
const panelPath = join(panelDir, 'index.ts');
const rawStatusDataPath = join(panelDir, 'raw-status-data.ts');
const adapterPath = join(scriptRoot, '数据库前端', 'table-change-adapter.ts');
const templatePath = join(mfrsRoot, '数据库', '神秘复苏表格SQL_v1.json');
const initvarPath = join(mfrsRoot, '世界书', '变量', 'initvar.yaml');

function readText(path) {
  return readFileSync(path, 'utf8');
}

/**
 * 最小 TS 模块加载器：转成 CommonJS 后在 vm 里跑，并按相对路径递归解析 import。
 * HUD 的 raw-status-data.ts 直接复用 hotfix 的 raw-status-writer.ts（共享单一 applier），
 * 因此这里必须支持跨目录相对 import，否则门禁只能测到桩实现。
 */
const tsModuleCache = new Map();
// 所有被测模块共用一个 realm，且比较前统一 clone 回本 realm，
// 否则 deepStrictEqual 会因为跨 realm 的 Object/Array 原型不同而误报。
const sandbox = vm.createContext({ console });

function loadTsModule(path) {
  const resolved = path.endsWith('.ts') || path.endsWith('.js') ? path : `${path}.ts`;
  if (tsModuleCache.has(resolved)) return tsModuleCache.get(resolved);

  const transpiled = transpileModule(readText(resolved), {
    compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
    fileName: resolved,
  }).outputText;

  const module = { exports: {} };
  tsModuleCache.set(resolved, module.exports);
  const localRequire = specifier => {
    assert.ok(specifier.startsWith('.'), `gate loader only resolves relative imports, got: ${specifier}`);
    return loadTsModule(join(dirname(resolved), specifier));
  };
  const wrapper = vm.runInContext(
    `(function (module, exports, require) {\n${transpiled}\n})`,
    sandbox,
    { filename: resolved },
  );
  wrapper(module, module.exports, localRequire);
  tsModuleCache.set(resolved, module.exports);
  return module.exports;
}

/** 加载不落盘的 mutation 源码；raw-status-writer 无外部 import，适合行为 mutation proof。 */
function loadStandaloneTsSource(source, filename) {
  const transpiled = transpileModule(source, {
    compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
    fileName: filename,
  }).outputText;
  const mutationSandbox = vm.createContext({ console });
  const module = { exports: {} };
  const wrapper = vm.runInContext(
    `(function (module, exports, require) {\n${transpiled}\n})`,
    mutationSandbox,
    { filename },
  );
  wrapper(module, module.exports, specifier => {
    throw new Error(`mutation loader does not resolve imports: ${specifier}`);
  });
  return module.exports;
}

const { applyRawProtocolToMvuData } = loadTsModule(rawWriterPath);
const { applyUpdateProtocolToStatData } = loadTsModule(rawStatusDataPath);
const { applyTableChangePlan, previewTableChangePlan } = loadTsModule(adapterPath);
const templateData = JSON.parse(readText(templatePath));

// ────────────────────────────────────────────────────────────────
// A. 双 applier 语义一致性
// ────────────────────────────────────────────────────────────────

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function decodePointer(pointer) {
  if (!String(pointer).startsWith('/')) return [];
  return String(pointer)
    .slice(1)
    .split('/')
    .map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function isContainer(value) {
  return value !== null && typeof value === 'object';
}

/** reference applier：与两侧生产实现独立编写，用于三方交叉验证。 */
function referenceApply(statData, patches) {
  const root = { stat_data: clone(statData) };

  const parentOf = (parts, create) => {
    let current = root;
    for (const part of parts.slice(0, -1)) {
      if (!isContainer(current)) return null;
      let next = current[part];
      if (!isContainer(next)) {
        if (!create) return null;
        next = {};
        current[part] = next;
      }
      current = next;
    }
    return isContainer(current) ? current : null;
  };

  const indexOf = (key, length, allowEnd) => {
    if (!/^\d+$/u.test(key)) return null;
    const index = Number(key);
    if (index < 0 || index > length || (!allowEnd && index >= length)) return null;
    return index;
  };

  for (const patch of patches) {
    const op = String(patch.op ?? '').toLowerCase();
    const path = decodePointer(patch.path);
    if (!path.length) continue;
    const full = ['stat_data', ...path];
    const key = full[full.length - 1];
    const create = op === 'replace' || op === 'delta' || op === 'insert';
    const parent = parentOf(full, create);
    if (!parent) continue;

    if (op === 'replace') {
      parent[key] = clone(patch.value);
    } else if (op === 'delta') {
      const previous = Number(parent[key] ?? 0);
      const delta = Number(patch.value ?? 0);
      if (Number.isFinite(previous) && Number.isFinite(delta)) parent[key] = previous + delta;
    } else if (op === 'insert') {
      if (!Array.isArray(parent)) continue;
      const index = key === '-' ? parent.length : indexOf(key, parent.length, true);
      if (index === null) continue;
      parent.splice(index, 0, clone(patch.value));
    } else if (op === 'remove') {
      if (Array.isArray(parent)) {
        const index = indexOf(key, parent.length, false);
        if (index === null) continue;
        parent.splice(index, 1);
      } else if (Object.prototype.hasOwnProperty.call(parent, key)) {
        delete parent[key];
      }
    } else if (op === 'move') {
      const from = decodePointer(patch.from);
      if (!from.length) continue;
      const fromFull = ['stat_data', ...from];
      const fromKey = fromFull[fromFull.length - 1];
      const fromParent = parentOf(fromFull, false);
      if (!fromParent) continue;
      let moved;
      if (Array.isArray(fromParent)) {
        const index = indexOf(fromKey, fromParent.length, false);
        if (index === null) continue;
        moved = fromParent[index];
        fromParent.splice(index, 1);
      } else {
        if (!Object.prototype.hasOwnProperty.call(fromParent, fromKey)) continue;
        moved = fromParent[fromKey];
        delete fromParent[fromKey];
      }
      const destination = parentOf(full, false);
      if (!destination) continue;
      if (Array.isArray(destination)) {
        const index = key === '-' ? destination.length : indexOf(key, destination.length, true);
        if (index === null) continue;
        destination.splice(index, 0, moved);
      } else {
        destination[key] = moved;
      }
    }
  }
  return root.stat_data;
}

function wrapProtocol(patches) {
  return ['<UpdateVariable>', '<JSONPatch>', JSON.stringify(patches, null, 2), '</JSONPatch>', '</UpdateVariable>'].join(
    '\n',
  );
}

const NAME = '姓名';
const RISK = '风险值';
const EVENT = '当前灵异事件';
const EVENT_CODE = '事件代号';
const DOMAIN = '鬼域状态';
const ACTIONS = '行动建议';
const RULES = '规律推理记录';
const RIDER = '驭鬼者状态';
const GHOSTS = '已驾驭厉鬼';
const OPTION = '选项';
const IDEA = '思路';
const TEMP = '临时标记';
const ARCHIVED = '归档标记';
const SLASH_KEY = 'a/b';
const TILDE_KEY = 'c~d';

const baseStatData = {
  [NAME]: '未知',
  [RISK]: 10,
  [EVENT]: { [EVENT_CODE]: '未立案', [DOMAIN]: '未确认' },
  [ACTIONS]: [{ [OPTION]: 'A', [IDEA]: '旧思路' }],
  [RULES]: [],
  [RIDER]: { [GHOSTS]: [{ '代号': 'G1' }] },
  [TEMP]: '待归档',
  [SLASH_KEY]: 'slash-old',
  [TILDE_KEY]: 'tilde-old',
};

const consistencyCases = [
  {
    name: 'replace scalar / nested / array root',
    patches: [
      { op: 'replace', path: `/${NAME}`, value: '张三' },
      { op: 'replace', path: `/${EVENT}/${EVENT_CODE}`, value: '敲门鬼事件' },
      { op: 'replace', path: `/${ACTIONS}`, value: [{ [OPTION]: 'A', [IDEA]: '新思路' }] },
    ],
  },
  {
    name: 'delta numeric accumulation',
    patches: [
      { op: 'delta', path: `/${RISK}`, value: 7 },
      { op: 'delta', path: `/${RISK}`, value: -3 },
    ],
  },
  {
    name: 'insert append and positional',
    patches: [
      { op: 'insert', path: `/${RULES}/-`, value: { r: 1 } },
      { op: 'insert', path: `/${RULES}/-`, value: { r: 2 } },
      { op: 'insert', path: `/${RULES}/0`, value: { r: 0 } },
    ],
  },
  {
    name: 'remove object key and array element',
    patches: [
      { op: 'remove', path: `/${TEMP}` },
      { op: 'remove', path: `/${ACTIONS}/0` },
    ],
  },
  {
    name: 'move object key to object key',
    patches: [{ op: 'move', from: `/${TEMP}`, path: `/${ARCHIVED}` }],
  },
  {
    name: 'move array element into array tail',
    patches: [
      { op: 'insert', path: `/${RULES}/-`, value: { r: 'x' } },
      { op: 'insert', path: `/${RULES}/-`, value: { r: 'y' } },
      { op: 'move', from: `/${RULES}/0`, path: `/${RULES}/-` },
    ],
  },
  {
    name: 'RFC-6901 escapes ~1 and ~0',
    patches: [
      { op: 'replace', path: '/a~1b', value: 'slash-new' },
      { op: 'replace', path: '/c~0d', value: 'tilde-new' },
    ],
  },
  {
    name: 'deep replace inside nested array element',
    patches: [{ op: 'replace', path: `/${RIDER}/${GHOSTS}/0/代号`, value: 'G2' }],
  },
  {
    name: 'invalid ops are ignored without throwing',
    patches: [
      { op: 'add', path: `/${NAME}`, value: '不应生效' },
      { op: 'remove', path: `/${ACTIONS}/99` },
      { op: 'move', from: '/不存在', path: `/${ARCHIVED}` },
      { op: 'delta', path: `/${NAME}`, value: 'NaN' },
      { op: 'replace', path: '', value: 1 },
      { op: 'replace', path: `/${NAME}`, value: '最后生效' },
    ],
  },
];

for (const testCase of consistencyCases) {
  const raw = wrapProtocol(testCase.patches);
  const expected = referenceApply(baseStatData, testCase.patches);

  const hudResult = clone(applyUpdateProtocolToStatData(clone(baseStatData), raw));
  assert.deepEqual(hudResult, expected, `HUD applier mismatch vs reference: ${testCase.name}`);

  const writerResult = applyRawProtocolToMvuData({ stat_data: clone(baseStatData) }, raw);
  const writerStat = clone(writerResult.data.stat_data);
  assert.deepEqual(writerStat, expected, `hotfix applier mismatch vs reference: ${testCase.name}`);
  assert.deepEqual(
    writerStat,
    hudResult,
    `hotfix and HUD appliers diverge (they must stay semantically identical): ${testCase.name}`,
  );

  // 两侧都不得原地改写入参（HUD 每帧复用同一 stat_data 对象）。
  assert.deepEqual(
    clone(baseStatData),
    baseStatData,
    `applier must not mutate its input stat_data: ${testCase.name}`,
  );
}

// P7-B1：真实复杂 oldData + 混合 patch 回归。
// 直接以 initvar.yaml 的 36 根为真源，并保留曾触发 MagVarUpdate 部分解析的
// 「规律推理记录.是否触发规律」字段。若未来又把 Mvu.parseMessage 当权威路径，
// 两个 delta 会被静默丢弃，而 replace/insert 仍会造成“看似成功”的假象。
const fullInitvarStatData = YAML.parse(readText(initvarPath));
assert.equal(Object.keys(fullInitvarStatData).length, 36, 'P7 fixture must start from all 36 initvar root keys');

const realisticOldData = {
  initialized_lorebooks: { '变量更新规则': true },
  schema: '没有用别管这个',
  stat_data: {
    ...clone(fullInitvarStatData),
    [RISK]: 25,
    [RULES]: [
      {
        '时间点': '敲门声停在门外时',
        '行为': '透支鬼档案试图完整拓印',
        '观察结果': '档案污染，敲门声在脑内响起',
        '推断': '敲门鬼会沿灵异探测反向侵蚀',
        '确认等级': '已验证',
        '是否触发规律': true,
        '风险等级': '致命',
      },
    ],
    [RIDER]: {
      '总复苏风险': 25,
      [GHOSTS]: [
        {
          '代号': '未命名厉鬼',
          '复苏进度': 25,
          '是否死机': false,
        },
      ],
    },
  },
};
const realisticOldSnapshot = clone(realisticOldData);
const realisticActions = ['A', 'B', 'C', 'D'].map(option => ({
  [OPTION]: option,
  [IDEA]: `真实行动建议 ${option}`,
  '主要风险': option === 'C' ? '复苏越界' : '高风险',
  '预期收益': '验证复杂混合 patch',
  '死亡风险': '高',
  '复苏风险': '极高',
}));
const realisticPatches = [
  { op: 'delta', path: `/${RISK}`, value: 60 },
  { op: 'delta', path: `/${RIDER}/总复苏风险`, value: 65 },
  { op: 'replace', path: '/状态', value: '重伤/濒临复苏' },
  {
    op: 'replace',
    path: '/最近行动判定',
    value: {
      '类型': 'use-ghost',
      '行动': '彻底透支实力强行阻击极高危厉鬼',
      '依据': ['未点燃鬼烛', '恐怖程度存在绝对鸿沟'],
      '触发项': ['主动承受高阶灵异反噬'],
      '结果': '完全失败',
      '代价': '重伤吐血，复苏临界',
      '死亡风险变化': '+60',
      '复苏风险变化': '+65',
      '资源代价': '无',
      '后续建议': '立刻中断能力',
      '可见结论': '灵异对抗不能无脑硬拼',
    },
  },
  { op: 'replace', path: `/${ACTIONS}`, value: realisticActions },
  {
    op: 'insert',
    path: `/${RULES}/-`,
    value: {
      '时间点': '本轮验收',
      '行为': '继续透支',
      '观察结果': '复苏风险继续上涨',
      '推断': '必须立即中断能力',
      '确认等级': '已验证',
      '是否触发规律': true,
      '风险等级': '致命',
    },
  },
  {
    op: 'replace',
    path: `/${RIDER}/${GHOSTS}`,
    value: [
      {
        '代号': '未命名厉鬼',
        '复苏进度': 90,
        '是否死机': false,
        '压制关系': '被敲门鬼完全碾压，濒临厉鬼复苏',
      },
    ],
  },
];
const realisticRaw = wrapProtocol(realisticPatches);
function assertRealisticFixtureShape(data, label = 'P7 fixture') {
  assert.ok(
    data.stat_data[RULES].some(record => Object.prototype.hasOwnProperty.call(record, '是否触发规律')),
    `${label} must retain 规律推理记录.是否触发规律 regression trigger`,
  );
}

function assertRealisticApplier(apply, label = 'P7 fixture') {
  const result = apply(realisticOldData, realisticRaw);
  const data = clone(result.data);
  assert.equal(result.applied, realisticPatches.length, `${label} must apply every mixed JSONPatch operation`);
  assert.equal(result.skipped, 0, `${label} must not silently skip any mixed JSONPatch operation`);
  assert.equal(data.stat_data[RISK], 85, `${label} must apply death-risk delta 25 + 60 = 85`);
  assert.equal(data.stat_data[RIDER]['总复苏风险'], 90, `${label} must apply revival-risk delta 25 + 65 = 90`);
  assert.equal(data.stat_data['状态'], '重伤/濒临复苏', `${label} must apply scalar replace`);
  assert.equal(data.stat_data[ACTIONS].length, 4, `${label} must replace all four action suggestions`);
  assert.equal(data.stat_data[RULES].length, 2, `${label} must append the rule record exactly once`);
  assert.equal(data.stat_data[RIDER][GHOSTS][0]['复苏进度'], 90, `${label} must replace ghost progress`);
  return data;
}

assertRealisticFixtureShape(realisticOldData);
const realisticData = assertRealisticApplier(applyRawProtocolToMvuData);
assert.deepEqual(realisticOldData, realisticOldSnapshot, 'P7 authoritative applier must not mutate complete oldData');

const realisticHudResult = clone(applyUpdateProtocolToStatData(clone(realisticOldData.stat_data), realisticRaw));
assert.deepEqual(
  realisticHudResult,
  realisticData.stat_data,
  'P7 complete mixed fixture must stay identical between hotfix and HUD appliers',
);

// applied/skipped 计数必须真实反映生效 patch 数，hotfix 用它决定是否写回。
const countingRaw = wrapProtocol([
  { op: 'replace', path: `/${NAME}`, value: '计数' },
  { op: 'delta', path: `/${RISK}`, value: 2 },
  { op: 'remove', path: `/${ACTIONS}/99` },
  { op: 'add', path: `/${NAME}`, value: '无效' },
]);
const counting = applyRawProtocolToMvuData({ stat_data: clone(baseStatData) }, countingRaw);
assert.equal(counting.applied, 2, 'applyRawProtocolToMvuData must count only effective patches');
assert.equal(counting.skipped, 2, 'applyRawProtocolToMvuData must count rejected patches as skipped');

// 无协议块 / 坏 JSON 时 applied 必须为 0，避免 hotfix 拿空 patch 触发无意义写回。
for (const [label, raw] of [
  ['no protocol block', '普通正文，没有协议块。'],
  ['malformed json', '<UpdateVariable><JSONPatch>[{ "op": "replace", </JSONPatch></UpdateVariable>'],
  ['empty patch array', '<UpdateVariable><JSONPatch>[]</JSONPatch></UpdateVariable>'],
]) {
  const result = applyRawProtocolToMvuData({ stat_data: clone(baseStatData) }, raw);
  assert.equal(result.applied, 0, `applied must be 0 for ${label}`);
  assert.deepEqual(clone(result.data.stat_data), baseStatData, `stat_data must stay untouched for ${label}`);
  assert.deepEqual(
    clone(applyUpdateProtocolToStatData(clone(baseStatData), raw)),
    baseStatData,
    `HUD applier must stay untouched for ${label}`,
  );
}

// 多个 UpdateVariable 块必须按顺序累积（一轮回复可能被模型拆成两段）。
const multiBlockRaw = [
  wrapProtocol([{ op: 'delta', path: `/${RISK}`, value: 5 }]),
  '中间正文',
  wrapProtocol([{ op: 'delta', path: `/${RISK}`, value: 5 }]),
].join('\n');
assert.equal(clone(applyUpdateProtocolToStatData(clone(baseStatData), multiBlockRaw))[RISK], 20, 'HUD applier must accumulate across multiple UpdateVariable blocks');
assert.equal(
  clone(applyRawProtocolToMvuData({ stat_data: clone(baseStatData) }, multiBlockRaw).data.stat_data)[RISK],
  20,
  'hotfix applier must accumulate across multiple UpdateVariable blocks',
);

// 缺失父路径必须自动补建（首轮 stat_data 尚未 seed 的字段）。
const seedRaw = wrapProtocol([{ op: 'replace', path: '/新根/子节点', value: 'v' }]);
const seeded = applyRawProtocolToMvuData({ stat_data: {} }, seedRaw);
assert.equal(seeded.applied, 1, 'hotfix applier must auto-create missing parent paths');
assert.deepEqual(clone(seeded.data.stat_data), { '新根': { '子节点': 'v' } });

// stat_data 缺失/类型错误时必须重建为对象而不是抛错。
for (const broken of [{}, { stat_data: null }, { stat_data: [] }, { stat_data: 'x' }]) {
  const result = applyRawProtocolToMvuData(broken, seedRaw);
  assert.equal(typeof result.data.stat_data, 'object', 'stat_data must be normalized to an object');
  assert.equal(Array.isArray(result.data.stat_data), false, 'stat_data must not be an array');
}

// ────────────────────────────────────────────────────────────────
// B. 静态结构断言
// ────────────────────────────────────────────────────────────────

const hotfixSource = readText(hotfixPath);
const panelSource = readText(panelPath);

function assertAuthoritativeHotfixContract(source, label = 'hotfix') {
  assert.ok(
    source.includes('applyRawProtocolToMvuData(oldData, normalized.message)'),
    `${label} must use the local authoritative JSONPatch applier`,
  );
  assert.equal(
    /mvu\??\.parseMessage\s*\(|mvu\.parseMessage\s*\(/.test(source),
    false,
    `${label} must not call Mvu.parseMessage for JSONPatch`,
  );
  assert.match(
    source,
    /const needsRetry = await parseAndWriteMvuMessage\([^;]+;\s*if \(needsRetry\) scheduleMvuWriteBackRetries/,
    `${label} must only schedule retries after verified=false`,
  );
}

assertAuthoritativeHotfixContract(hotfixSource);

assert.ok(
  /import\s*\{[^}]*applyRawProtocolToMvuData[^}]*\}\s*from\s*'\.\/raw-status-writer'/.test(hotfixSource),
  'hotfix must import applyRawProtocolToMvuData from ./raw-status-writer (#8)',
);
assert.ok(
  hotfixSource.includes('applyRawProtocolToMvuData(oldData, normalized.message)'),
  'hotfix must always apply the raw protocol to oldData (#8)',
);
// 根因 v2：JSONPatch 写回一律以本地 applyRawProtocolToMvuData 为权威，
// 不再依赖 mvu.parseMessage（其 delta 解析在「是否触发规律」字段下会丢失）。
assert.ok(
  hotfixSource.includes('applyRawProtocolToMvuData(oldData, normalized.message)'),
  'hotfix must apply raw protocol to oldData as authoritative JSONPatch writeback (#8)',
);
assert.ok(
  /applyRawProtocolToMvuData[\s\S]{0,900}?writeMvuDataWithVerification\(hostWindow, chat, messageIndex, fallback\.data, messageOption\)/.test(
    hotfixSource,
  ),
  'raw fallback must write back through writeMvuDataWithVerification (#8)',
);
assert.ok(
  /applyRawProtocolToMvuData[\s\S]{0,1200}?refreshMessagePanel\(hostWindow, messageOption\.message_id\)/.test(
    hotfixSource,
  ),
  'raw fallback must refresh the message panel after writeback (#8)',
);
assert.ok(
  hotfixSource.includes('function resolveProtocolMessageIndex(') &&
    hotfixSource.includes('!candidate.is_user && !messageHasDisplayableContent(candidate)') &&
    hotfixSource.includes('hasInternalProtocol(readMessageTextForMvu(previous))'),
  'P7 lifecycle gate: trailing empty AI message must resolve to its adjacent protocol-bearing AI message',
);
assert.ok(
  hotfixSource.includes('async function removeTrailingEmptyAiPlaceholder(') &&
    hotfixSource.includes('placeholderIndex !== chat.length - 1') &&
    hotfixSource.includes('protocolMessageIndex !== placeholderIndex - 1') &&
    hotfixSource.includes('typeof context?.deleteLastMessage') &&
    hotfixSource.includes('await context.deleteLastMessage()'),
  'P7 lifecycle gate: only the final empty AI directly following the current protocol reply may be deleted',
);
assert.match(
  hotfixSource,
  /const removedTrailingPlaceholder = await removeTrailingEmptyAiPlaceholder\([\s\S]{0,400}?if \(!removedTrailingPlaceholder\) \{[\s\S]{0,300}?recoverSendUiAfterEmptyGeneration/,
  'P7 lifecycle gate: a deleted placeholder must not trigger the empty-generation warning path',
);
assert.ok(
  hotfixSource.includes('RAW_PROTOCOL_APPLIED_HASH_KEY') &&
    hotfixSource.includes('getProtocolApplicationKey(message, normalized.message)') &&
    hotfixSource.includes('message.extra?.[RAW_PROTOCOL_APPLIED_HASH_KEY] === applicationKey'),
  'P7 idempotency gate: protocol application must be guarded by swipe + protocol fingerprint',
);
assert.match(
  hotfixSource,
  /if \(writeResult\.verified\) \{[\s\S]{0,300}?RAW_PROTOCOL_APPLIED_HASH_KEY[\s\S]{0,300}?persistDirectMessageVariables/,
  'P7 idempotency gate: application fingerprint may only be persisted after verified writeback',
);
assert.ok(
  hotfixSource.includes('return !writeResult.verified || !markerPersisted;'),
  'P7 idempotency gate: marker persistence failure must remain retryable without reapplying delta',
);

// ── P7-B4 mutation proof（全部在内存执行，不改工作区源码） ──

const parseMessageMutation = hotfixSource.replace(
  'const fallback = applyRawProtocolToMvuData(oldData, normalized.message);',
  [
    'const mvu = getMvuApi(hostWindow);',
    'const parsed = await mvu.parseMessage(normalized.message, oldData);',
    'const fallback = { data: parsed, applied: 1, skipped: 0 };',
  ].join('\n'),
);
assert.notEqual(parseMessageMutation, hotfixSource, 'mutation setup must inject Mvu.parseMessage authoritative path');
assert.throws(
  () => assertAuthoritativeHotfixContract(parseMessageMutation, 'parseMessage mutation'),
  /must use the local authoritative JSONPatch applier|must not call Mvu\.parseMessage/,
  'gate must reject restoring Mvu.parseMessage as JSONPatch authority',
);

const unconditionalRetryMutation = hotfixSource.replace(
  /if \(needsRetry\) scheduleMvuWriteBackRetries\(([^;]+)\);/,
  'scheduleMvuWriteBackRetries($1);',
);
assert.notEqual(unconditionalRetryMutation, hotfixSource, 'mutation setup must remove the retry condition');
assert.throws(
  () => assertAuthoritativeHotfixContract(unconditionalRetryMutation, 'unconditional retry mutation'),
  /must only schedule retries/,
  'gate must reject unconditional retries that double-apply delta',
);

const deltaMutationSource = readText(rawWriterPath).replace(
  "if (op === 'delta') {",
  "if (op === '__mutation_delta_disabled__') {",
);
assert.notEqual(deltaMutationSource, readText(rawWriterPath), 'mutation setup must disable the production delta branch');
const deltaMutationModule = loadStandaloneTsSource(deltaMutationSource, `${rawWriterPath}.delta-mutation.ts`);
assert.throws(
  () => assertRealisticApplier(deltaMutationModule.applyRawProtocolToMvuData, 'delta mutation'),
  /death-risk delta|revival-risk delta|every mixed JSONPatch operation/,
  'realistic fixture must kill a mutation that disables delta',
);

const triggerFieldMutation = clone(realisticOldData);
for (const record of triggerFieldMutation.stat_data[RULES]) delete record['是否触发规律'];
assert.throws(
  () => assertRealisticFixtureShape(triggerFieldMutation, 'trigger-field mutation'),
  /must retain 规律推理记录\.是否触发规律/,
  'fixture-shape gate must reject deleting the real MagVarUpdate trigger field',
);

// #9：清洗前必须先幂等快照 raw，否则协议块被删后 HUD 失去兜底数据源。
const cleanStart = hotfixSource.indexOf('async function cleanProtocolBlocks');
assert.notEqual(cleanStart, -1, 'cleanProtocolBlocks must exist');
const cleanEnd = hotfixSource.indexOf('\n}', hotfixSource.indexOf('const cleanedMes', cleanStart));
assert.notEqual(cleanEnd, -1, 'cleanProtocolBlocks body must be locatable');
const cleanBody = hotfixSource.slice(cleanStart, cleanEnd);
const snapshotAt = cleanBody.indexOf('snapshotRawProtocolMessage(message)');
const replaceAt = cleanBody.indexOf('.replace(');
assert.notEqual(snapshotAt, -1, 'cleanProtocolBlocks must snapshot the raw protocol message (#9)');
assert.notEqual(replaceAt, -1, 'cleanProtocolBlocks must strip protocol blocks (#9)');
assert.ok(
  snapshotAt < replaceAt,
  'cleanProtocolBlocks must snapshot raw BEFORE stripping protocol blocks, otherwise the HUD fallback loses its source (#9)',
);

// ── 跨窗口 throwing getter 防护 ──
//
// 酒馆助手给脚本 iframe 注入的 SillyTavern/Mvu 是 throwing getter：
//   Object.defineProperty(window, 'SillyTavern', { get: () => {
//     const SillyTavern = _.get(window.parent, 'SillyTavern');
//     const getContext = () => ({ ...SillyTavern.getContext(), ... });
//     return { ...getContext(), getContext };   // ← getter 内部立即调用
//   }})
// 宿主未就绪时**读属性本身**就抛 TypeError，`?.` 与后置 try 都拦不住。
// 真页曾因此让整个 hotfix 每轮在入口处静默死亡（无任何 [Hotfix] 日志）。
assert.ok(
  /function safeRead<T>\(read: \(\) => T\): T \| undefined/.test(hotfixSource),
  'hotfix must define safeRead() to guard cross-window property access',
);

const ctxStart = hotfixSource.indexOf('function getSillyTavernContext');
assert.notEqual(ctxStart, -1, 'getSillyTavernContext must exist');
const ctxBody = hotfixSource.slice(ctxStart, hotfixSource.indexOf('\n}', ctxStart));
assert.ok(
  !/\[\s*hostWindow\.SillyTavern\s*,/.test(ctxBody),
  'getSillyTavernContext must NOT read hostWindow.SillyTavern bare inside an array literal — ' +
    'the expression is evaluated outside try/catch and a throwing getter kills the whole handler',
);
assert.ok(
  ctxBody.includes('safeRead(() => hostWindow.SillyTavern)'),
  'getSillyTavernContext must read hostWindow.SillyTavern through safeRead',
);
assert.ok(
  ctxBody.includes('safeRead(() => st?.getContext?.())'),
  'getSillyTavernContext must invoke getContext through safeRead',
);

for (const [fn, expr] of [
  ['getMvuApi', 'safeRead(() => hostWindow.Mvu)'],
  ['getRuntimeFunction', 'safeRead(() => hostWindow[key])'],
]) {
  const start = hotfixSource.indexOf(`function ${fn}`);
  assert.notEqual(start, -1, `${fn} must exist`);
  const body = hotfixSource.slice(start, hotfixSource.indexOf('\n}', start));
  assert.ok(body.includes(expr), `${fn} must guard cross-window reads via safeRead`);
}

// 事件回调护栏：handler 抛出会中断 ST 的 emit 链，必须在绑定处统一收敛。
assert.ok(
  /function guardHotfixHandler\(/.test(hotfixSource),
  'hotfix must define guardHotfixHandler() so listener exceptions cannot kill a turn silently',
);
const bindStart = hotfixSource.indexOf('function bindHotfixListener');
assert.notEqual(bindStart, -1, 'bindHotfixListener must exist');
const bindBody = hotfixSource.slice(bindStart, hotfixSource.indexOf('\nfunction registerEventListeners', bindStart));
assert.ok(
  bindBody.includes('guardHotfixHandler(eventName, rawHandler)'),
  'bindHotfixListener must wrap every handler with guardHotfixHandler',
);

// 上下文暂不可用时必须重试，否则本轮协议永久丢失。
assert.ok(
  /function scheduleGenerationEndedRetry\(/.test(hotfixSource),
  'hotfix must schedule a retry when the ST context is not ready at GENERATION_ENDED',
);
const pipeStart = hotfixSource.indexOf('async function runGenerationEndedPipeline');
assert.notEqual(pipeStart, -1, 'runGenerationEndedPipeline must exist');
const pipeHead = hotfixSource.slice(pipeStart, pipeStart + 1200);
assert.ok(
  pipeHead.includes('scheduleGenerationEndedRetry(eventMessageId)'),
  'the empty-context branch must schedule a retry instead of dropping the turn',
);

assert.ok(
  /import\s*\{[^}]*applyUpdateProtocolToStatData[^}]*\}\s*from\s*'\.\/raw-status-data'/.test(panelSource),
  'message panel must import applyUpdateProtocolToStatData from ./raw-status-data',
);
for (const [fn, note] of [
  ['readLatestHudStatusData', 'HUD status read must synthesize the latest raw protocol'],
  ['getPanelRenderKey', 'panel render key must include the raw-derived data so HUD re-renders on new raw'],
]) {
  const start = panelSource.indexOf(`function ${fn}(`);
  assert.notEqual(start, -1, `${fn} must exist in message panel`);
  const body = panelSource.slice(start, panelSource.indexOf('\n}', start));
  assert.ok(body.includes('applyUpdateProtocolToStatData'), `${fn} must call applyUpdateProtocolToStatData — ${note}`);
}
assert.ok(
  /const resolvedData = raw \? applyUpdateProtocolToStatData\(data, raw\) : data/.test(panelSource),
  'brand row must resolve its data through the same raw applier as the HUD (shared parse)',
);
assert.ok(
  panelSource.includes('readLatestHudStatusData()') && /refreshHudPanels[\s\S]{0,400}?readLatestHudStatusData\(\)/.test(panelSource),
  'refreshHudPanels must source its data from readLatestHudStatusData',
);

// ────────────────────────────────────────────────────────────────
// C. 数据库固定行回归红线（#10）
// ────────────────────────────────────────────────────────────────

function buildSheet(uid) {
  const template = templateData[uid];
  assert.ok(template, `template must contain ${uid}`);
  return {
    uid,
    name: template.name,
    sourceData: { ddl: template.sourceData.ddl },
    content: [template.content[0].slice()],
  };
}

/** 固定行表：row_id 被 CHECK 钉死在一个小范围内，物理表里这些行由模板预置。 */
const FIXED_ROW_TABLES = [
  {
    uid: 'sheet_global_state',
    match: { row_id: 1 },
    set: {
      game_time: '2004-07-01 09:00',
      current_location: '老旧公寓走廊',
      current_city: '大昌市',
      canon_stage: '敲门鬼事件前',
      canon_anchor: '公寓开局',
      main_phase: '开局接入',
      world_pressure: 12,
      hq_attention: 0,
      public_exposure: 0,
    },
  },
  {
    uid: 'sheet_player_state',
    match: { row_id: 1 },
    set: {
      name: '测试角色',
      identity_text: '普通人',
      location_name: '老旧公寓走廊',
      status_text: '健康',
      death_risk: 10,
      revival_risk: 0,
      controlled_ghosts: '无',
      ghost_pieces: '无',
      resources_text: '拼图：无；物品：无；黄金：未准备',
      last_action: '开局接入',
    },
  },
  {
    uid: 'sheet_action_suggestions',
    match: { row_id: 2 },
    set: {
      option_key: 'B',
      idea_text: '撤离现场',
      main_risk: '可能错过线索',
      expected_gain: '降低死亡风险',
      death_risk_level: '低',
      revival_risk_level: '无',
    },
  },
  {
    uid: 'sheet_check_suggestions',
    match: { row_id: 3 },
    set: {
      display_text: '观察走廊动静，判断敲门声是否正在靠近。',
      check_type: '观察',
      check_basis: '需要在恐慌中分辨声音来源',
      dice_command: '检定 <user> 感知',
    },
  },
];

for (const { uid, match, set } of FIXED_ROW_TABLES) {
  const sheet = buildSheet(uid);

  const plan = { action: 'updateCell', table: sheet.name, match, set };
  const currentData = { mate: { type: 'chatSheets', version: 1 }, [uid]: sheet };

  const preview = previewTableChangePlan(plan, currentData, templateData);
  assert.notEqual(
    preview.action,
    'insertRow',
    `${sheet.name}: updateCell on a missing fixed row must NOT be promoted to insertRow — ` +
      'the snapshot can be empty while the physical table still holds the row, and INSERT then hits ' +
      `UNIQUE constraint failed: ${uid.replace(/^sheet_/, '')}.row_id (#10)`,
  );

  const calls = [];
  const api = {
    async insertRow(options) {
      calls.push(['insertRow', options]);
      return 1;
    },
    async updateCell(options) {
      calls.push(['updateCell', options]);
      return true;
    },
  };
  await applyTableChangePlan(api, plan, clone(currentData), templateData);
  assert.equal(
    calls.filter(([kind]) => kind === 'insertRow').length,
    0,
    `${sheet.name}: applyTableChangePlan must not issue insertRow for a fixed-row updateCell (#10)`,
  );
}

// 非固定行表（row_id 无 CHECK 上界）不受此约束影响，仍可正常 insert。
const eventsSheet = buildSheet('sheet_supernatural_events');
const eventsData = {
  event_code: '敲门鬼媒介传播事件',
  danger_level: '未知',
  location_name: '七中',
  ghost_domain_status: '未确认',
  known_laws: '无',
  suspected_laws: '听到敲门声后可能被标记',
  wrong_inferences: '无',
  death_count: 0,
  spread_trend: '局部',
  handling_status: '调查中',
  public_summary: '走廊出现规律敲门声，尚未确认来源。',
};
const eventInsertCalls = [];
const eventInsert = await applyTableChangePlan(
  {
    async insertRow(options) {
      eventInsertCalls.push(options);
      return 1;
    },
  },
  { action: 'insertRow', table: eventsSheet.name, data: eventsData },
  { mate: { type: 'chatSheets', version: 1 }, sheet_supernatural_events: eventsSheet },
  templateData,
);
assert.equal(eventInsert.ok, true, 'non-fixed-row tables must still accept insertRow');
assert.equal(eventInsertCalls.length, 1, 'non-fixed-row insertRow must reach the CRUD api');

// 镜像源不得再把核心表包在"仅空表补种"分支里，否则数据库永远停在开局快照（#10）。
const mirrorSource = readText(join(scriptRoot, '数据库前端', 'mvu-core-mirror.ts'));
for (const table of ['global_state', 'player_state']) {
  assert.equal(
    new RegExp(`!sheetHasEffectiveRows\\(findSheetByTableName\\(currentData, \\['${table}'`).test(mirrorSource),
    false,
    `mvu-core-mirror must keep mirroring ${table} every turn, not only when the sheet is empty (#10)`,
  );
}

console.log('verify-mfrs-raw-status-fallback: passed');
