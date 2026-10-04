/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as parseYaml } from 'js-yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cardRoot = join(root, 'src', '魔法禁书目录模拟器');
const welcomePath = join(cardRoot, '自定义开局', '欢迎页.txt');
const welcome = readFileSync(welcomePath, 'utf8');
const card = parseYaml(readFileSync(join(cardRoot, 'index.yaml'), 'utf8'));
const matrix = JSON.parse(readFileSync(join(root, 'docs', 'MJR_P1_事件簇矩阵.json'), 'utf8'));

const requiredMetaFields = [
  'timeLayer',
  'clusterId',
  'clusterLabel',
  'media',
  'viewpoint',
  'entryType',
  'relation',
  'datePrecision',
  'coverage',
];

function decodeHtml(value) {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

const scenes = [
  ...welcome.matchAll(
    /<div data-act="scene"[^>]*data-opening-id="([^"]+)"[^>]*data-compat="([^"]*)"[^>]*data-meta="([^"]*)"/g,
  ),
].map(match => ({
  openingId: match[1],
  encodedCompat: match[2],
  compat: JSON.parse(decodeHtml(match[2])),
  encodedMeta: match[3],
  meta: JSON.parse(decodeHtml(match[3])),
}));
const sceneById = new Map(scenes.map(scene => [scene.openingId, scene]));
const matrixById = new Map(matrix.entries.map(entry => [entry.openingId, entry]));

assert.ok(scenes.length > 0, 'welcome page must contain scene entries');
assert.equal(sceneById.size, scenes.length, 'welcome opening IDs must be unique');
assert.equal(matrixById.size, matrix.entries.length, 'matrix opening IDs must be unique');
assert.equal(scenes.length, matrix.entries.length, 'welcome and matrix entry counts must match');

const embeddedWelcome = card.扩展字段?.正则?.find(rule => rule['正则名称']?.includes('渲染魔法禁书目录开局页'))?.[
  '替换为'
];
assert.equal(typeof embeddedWelcome, 'string', 'index.yaml must embed the welcome-page renderer');
const embeddedOpeningIds = [...embeddedWelcome.matchAll(/data-act="scene"[^>]*data-opening-id="([^"]+)"/g)].map(
  match => match[1],
);
assert.equal(new Set(embeddedOpeningIds).size, embeddedOpeningIds.length, 'embedded opening IDs must be unique');
assert.deepEqual(
  [...embeddedOpeningIds].sort(),
  [...sceneById.keys()].sort(),
  'embedded and maintained welcome opening ID sets must match exactly',
);

for (const scene of scenes) {
  const { openingId, encodedCompat, encodedMeta, compat, meta } = scene;
  const matrixEntry = matrixById.get(openingId);
  assert.ok(matrixEntry, `${openingId}: matrix entry is missing`);
  for (const field of requiredMetaFields) {
    assert.ok(meta[field], `${openingId}: welcome metadata is missing ${field}`);
    assert.equal(matrixEntry[field], meta[field], `${openingId}: matrix ${field} differs from welcome metadata`);
  }
  for (const field of ['displayDate', 'workLineId', 'primaryPackageId', 'chapterId', 'initializationMode']) {
    assert.equal(matrixEntry[field], meta[field], `${openingId}: matrix ${field} differs from welcome metadata`);
  }
  assert.ok(
    embeddedWelcome.includes(`data-opening-id="${openingId}"`),
    `${openingId}: embedded welcome entry is missing`,
  );
  assert.ok(
    embeddedWelcome.includes(`data-opening-id="${openingId}"`) &&
      embeddedWelcome.includes(`data-compat="${encodedCompat}"`) &&
      embeddedWelcome.includes(`data-meta="${encodedMeta}"`),
    `${openingId}: embedded opening data differs from the maintained welcome page`,
  );
}

assert.equal(matrix.summary.entries, scenes.length, 'matrix summary entry count must match welcome entries');
assert.equal(matrix.summary.clusters, new Set(scenes.map(scene => scene.meta.clusterId)).size);

const rules = parseYaml(readFileSync(join(cardRoot, '世界书', '变量', '变量更新规则.yaml'), 'utf8'))['变量更新规则'];
const outputContract = parseYaml(
  readFileSync(join(cardRoot, '世界书', '变量', '变量输出格式.yaml'), 'utf8'),
).update_output_contract;
const mainlineRules = (rules['主线推进'] ?? []).join('\n');
const sideStoryRules = (rules['支线触发'] ?? []).join('\n');
const outputInstructions = outputContract.must_output;

assert.match(mainlineRules, /每轮最多推进一个主要节点/, 'mainline must limit each turn to one major node');
assert.match(
  sideStoryRules,
  /支线不得覆盖.*当前锚点.*当前节点/,
  'side stories must preserve the mainline anchor and node',
);
assert.match(
  outputInstructions,
  /First-reply initialization:[\s\S]*当前节点/,
  'first reply must initialize the selected opening anchor',
);
assert.match(outputInstructions, /Replace \/主线进度\/已完成节点 and \/主线进度\/可触发节点 as WHOLE arrays/);
assert.match(outputInstructions, /支线 must never overwrite 当前锚点\/当前节点/);
assert.match(outputInstructions, /First-reply initialization:[\s\S]*阶段序号[\s\S]*阶段状态[\s\S]*所在位置/);
assert.match(
  outputInstructions,
  /selected opening provides corresponding values/,
  'first reply must not retain initvar defaults when the opening specifies values',
);

const necromancerOpening = sceneById.get('OP-O14-01');
assert.ok(necromancerOpening, 'OP-O14-01 must exist');
assert.equal(necromancerOpening.compat.主线进度.阶段序号, 3, 'NECROMANCER opening must use coarse phase 3');
assert.equal(
  necromancerOpening.compat.主线进度.当前阶段,
  '阶段3·旧约·九月上旬科学侧外传',
  'NECROMANCER opening phase label must match its event package',
);
assert.equal(necromancerOpening.compat.主线进度.阶段状态, '进行中');
assert.equal(necromancerOpening.compat.主线进度.正史锚点.当前锚点, '死灵术师篇');
assert.equal(necromancerOpening.compat.主线进度.当前节点, 'NECROMANCER-01');
assert.deepEqual(necromancerOpening.compat.主线进度.已完成节点, []);
assert.deepEqual(necromancerOpening.compat.主线进度.可触发节点, ['NECROMANCER-02']);
assert.equal(necromancerOpening.compat.所在位置, '第七学区·冥土追魂医院病房走廊');
assert.equal(necromancerOpening.meta.playerPosition, necromancerOpening.compat.所在位置);
assert.notEqual(necromancerOpening.compat.主线进度.正史锚点.默认走向, '等待玩家开局地点与身份确定');
assert.notEqual(necromancerOpening.compat.主线进度.下一步推进提示, '等待玩家确认开局地点、阵营与身份');
const necromancerPackage = readFileSync(join(cardRoot, '世界书', '剧情事件', '主线', '主线事件·死灵术师.txt'), 'utf8');
assert.match(necromancerPackage, /^所属阶段：阶段3·旧约·九月上旬科学侧外传$/m);
assert.match(necromancerPackage, /^【事件包：死灵术师篇】$/m);

console.log(`MJR_P1_CONTRACT_OK entries=${scenes.length} clusters=${matrix.summary.clusters}`);
