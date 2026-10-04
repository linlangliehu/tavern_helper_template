/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';
import YAML from 'yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cardRoot = join(root, 'src', '魔法禁书目录模拟器');
const helperPath = join(cardRoot, '脚本', '界面美化', 'opening-baseline.ts');
const source = readFileSync(helperPath, 'utf8');
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
const { mergeMfrsOpeningBaseline } = module.exports;

const initvar = YAML.parse(readFileSync(join(cardRoot, '世界书', '变量', 'initvar.yaml'), 'utf8'));
const welcome = readFileSync(join(cardRoot, '自定义开局', '欢迎页.txt'), 'utf8');
const opening = welcome.match(/data-opening-id="OP-O14-01"[^>]*data-compat="([^"]*)"[^>]*data-meta="([^"]*)"/);
assert.ok(opening, 'OP-O14-01 must provide a compatibility baseline');
const decode = value =>
  value.replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
const compatibility = JSON.parse(decode(opening[1]));
const metadata = JSON.parse(decode(opening[2]));
const baseline = {
  姓名: '验收玩家',
  性别: '女',
  年龄: '18岁',
  阵营: '科学侧（学园都市）',
  身份: '某高中学生',
  ...compatibility,
  开局地点: metadata.playerPosition,
  能力档案: [],
};

const initialized = mergeMfrsOpeningBaseline(initvar, baseline);
assert.equal(initialized.所在位置, metadata.playerPosition);
assert.equal(initialized.剧情阶段, '遭遇');
assert.equal(initialized.能力档案.length, 0);
assert.equal(initialized.主线进度.当前阶段, compatibility.主线进度.当前阶段);
assert.equal(initialized.主线进度.阶段序号, 3);
assert.equal(initialized.主线进度.阶段状态, '进行中');
assert.equal(initialized.主线进度.当前节点, 'NECROMANCER-01');
assert.deepEqual(initialized.主线进度.可触发节点, ['NECROMANCER-02']);
assert.equal(initialized.主线进度.正史锚点.当前锚点, '死灵术师篇');
assert.notEqual(initialized.主线进度.正史锚点.默认走向, '等待玩家开局地点与身份确定');
assert.notEqual(initialized.主线进度.下一步推进提示, '等待玩家确认开局地点、阵营与身份');

const progressed = mergeMfrsOpeningBaseline(
  {
    ...initialized,
    阵营: '玩家后续选择',
    能力档案: [{ 能力名称: '玩家能力', 能力效果: '已有实质内容' }],
    主线进度: {
      ...initialized.主线进度,
      阶段状态: '进行中',
      当前节点: 'NECROMANCER-02',
      已完成节点: ['NECROMANCER-01'],
      可触发节点: [],
    },
    世界线记录: [],
  },
  baseline,
);
assert.equal(progressed.阵营, '玩家后续选择');
assert.equal(progressed.能力档案[0].能力名称, '玩家能力');
assert.equal(progressed.主线进度.当前节点, 'NECROMANCER-02');
assert.deepEqual(progressed.主线进度.已完成节点, ['NECROMANCER-01']);
assert.deepEqual(progressed.主线进度.可触发节点, []);
assert.deepEqual(progressed.世界线记录, []);

const advancedWithStaleStatus = mergeMfrsOpeningBaseline(
  {
    ...initialized,
    主线进度: {
      ...initialized.主线进度,
      阶段状态: '未启动',
      当前节点: 'NECROMANCER-02',
      已完成节点: [],
      可触发节点: [],
    },
  },
  baseline,
);
assert.equal(advancedWithStaleStatus.主线进度.当前节点, 'NECROMANCER-02');
assert.deepEqual(advancedWithStaleStatus.主线进度.已完成节点, []);
assert.deepEqual(advancedWithStaleStatus.主线进度.可触发节点, []);

const uiSource = readFileSync(join(cardRoot, '脚本', '界面美化', 'index.ts'), 'utf8');
assert.match(uiSource, /mergeMfrsOpeningBaseline\(latestStatData, baseline\)/);
assert.doesNotMatch(uiSource, /if \(roster\.length > 0\) return/);

console.log('MJR_OPENING_BASELINE_OK');
