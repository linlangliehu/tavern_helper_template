/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';
import YAML from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const cardRoot = join(repoRoot, 'src', '魔法禁书目录模拟器');
const helperPath = join(cardRoot, '脚本', '界面美化', 'opening-ability.ts');
const uiPath = join(cardRoot, '脚本', '界面美化', 'index.ts');

function loadHelper(source) {
  const transpiled = transpileModule(source, {
    compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
    fileName: helperPath,
  }).outputText;
  const sandbox = vm.createContext({});
  const module = { exports: {} };
  const wrapper = vm.runInContext(`(function (module, exports) {\n${transpiled}\n})`, sandbox, {
    filename: helperPath,
  });
  wrapper(module, module.exports);
  return module.exports;
}

const helperSource = readFileSync(helperPath, 'utf8');
const { createMfrsOpeningAbilityRoster, isMfrsNoAbilityLabel } = loadHelper(helperSource);

for (const label of [
  '',
  '无能力者（Level 0）',
  '无能力者（Level 0）——但揍人的拳头意外地有力',
  '无能力',
  '未觉醒',
  '未选择能力',
  '无术式',
  '普通凡人',
]) {
  assert.equal(isMfrsNoAbilityLabel(label), true, `must identify no-ability label: ${label}`);
  assert.equal(createMfrsOpeningAbilityRoster(label, '超能力', 'Level 0', '').length, 0);
}

assert.equal(createMfrsOpeningAbilityRoster('   ', '术式', '魔法师', '').length, 0);

const imagineBreaker = createMfrsOpeningAbilityRoster('幻想杀手', '超能力', 'Level 0', '右手消除异能');
assert.equal(imagineBreaker.length, 1, 'named Level 0 ability must remain a concrete ability');
assert.equal(imagineBreaker[0].能力名称, '幻想杀手');
assert.equal(imagineBreaker[0].等级或位阶, 'Level 0');
assert.equal(imagineBreaker[0].阵营类型, '超能力');

const blankDescription = createMfrsOpeningAbilityRoster('自定义能力', '超能力', 'Level 2', '');
assert.equal(blankDescription.length, 1, 'a declared ability with a blank description must remain in the baseline');
assert.equal(blankDescription[0].能力名称, '自定义能力');
assert.equal(blankDescription[0].能力效果, '', 'description completion belongs to the first model reply');
assert.equal(blankDescription[0].实战运用, '');
assert.equal(blankDescription[0].等级或位阶, 'Level 2');
assert.equal(blankDescription[0].是否稳定, true);

const noSpell = createMfrsOpeningAbilityRoster('无术式', '术式', '未指定（无具体能力）', '');
assert.equal(noSpell.length, 0, 'a magic-side no-spell opening must not synthesize a record');
assert.deepEqual(
  createMfrsOpeningAbilityRoster('幻想杀手', '超能力', 'Level 0', '右手消除异能'),
  imagineBreaker,
  'repeated baseline construction must be deterministic',
);

const indexPath = join(cardRoot, 'index.yaml');
const index = YAML.parse(readFileSync(indexPath, 'utf8'));
const renderRule = index.扩展字段.正则.find(rule => String(rule.正则名称).includes('渲染魔法禁书目录开局页'));
assert.ok(renderRule, 'the active index must contain the welcome-page render rule');
const welcomeSource = readFileSync(join(cardRoot, '自定义开局', '欢迎页.txt'), 'utf8');
for (const [label, fragment] of [
  ['science no-ability choice', 'data-val="无能力者（Level 0）"'],
  ['magic no-spell choice', 'data-val="无术式"'],
]) {
  assert.ok(welcomeSource.includes(fragment), `source welcome page must include ${label}`);
  assert.ok(String(renderRule.替换为).includes(fragment), `active embedded welcome page must include ${label}`);
}

const uiSource = readFileSync(uiPath, 'utf8');
assert.match(
  uiSource,
  /createMfrsOpeningAbilityRoster\(/,
  'welcome baseline must use the conditional ability roster builder',
);
assert.match(
  uiSource,
  /mergeMfrsOpeningBaseline\(latestStatData, baseline\)/,
  'floor fallback must merge the trusted opening baseline',
);
assert.match(uiSource, /if \(roster\.length === 0\) return/, 'placeholder repair must preserve an empty roster');

const systemPrompt = readFileSync(join(cardRoot, '系统提示词', '0.txt'), 'utf8');
const outputRules = readFileSync(join(cardRoot, '世界书', '变量', '变量输出格式.yaml'), 'utf8');
const updateRules = readFileSync(join(cardRoot, '世界书', '变量', '变量更新规则.yaml'), 'utf8');
const worldRules = readFileSync(join(cardRoot, '世界书', '世界设定', '世界规则概览.txt'), 'utf8');
const itemCatalogue = readFileSync(join(cardRoot, '世界书', '物品图鉴', '物品大全.txt'), 'utf8');
const activeContract = [systemPrompt, outputRules, updateRules, worldRules, itemCatalogue].join('\n');

for (const [label, source] of [
  ['system prompt', systemPrompt],
  ['output rules', outputRules],
  ['update rules', updateRules],
]) {
  assert.match(
    source,
    /能力档案.{0,100}(?:\[\]|空数组)|(?:\[\]|空数组).{0,100}能力档案/s,
    `${label} must explicitly preserve an empty roster`,
  );
}
assert.match(activeContract, /Level 0.{0,80}幻想杀手/s, 'Level 0 named-ability exception must be explicit');
assert.match(activeContract, /不强制失败.{0,80}(?:反噬|透支|失灵)/s, 'player ability use must not impose a penalty');
assert.match(
  activeContract,
  /可重复使用.{0,100}(?:不|不得).{0,60}(?:扣减|扣库存|库存)/s,
  'reusable equipment must not be automatically consumed',
);
assert.match(
  activeContract,
  /未知数量.{0,40}不得.{0,20}猜测|数量为「未知」.{0,30}不得.{0,20}臆测/s,
  'unknown item counts must not be guessed',
);
assert.match(updateRules, /本轮叙事确实发生消耗/, 'item count changes must require an actual consumption event');
assert.match(
  outputRules,
  /Only update item count\/effect when a consumable is explicitly identified and a real change occurred/,
);

console.log('MJR_OPENING_ABILITY_CONTRACT_OK');
