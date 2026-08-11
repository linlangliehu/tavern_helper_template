/* eslint-disable import-x/no-nodejs-modules */
/**
 * verify-mfrs-mvu-core-mirror.mjs —— 人物/地点 stat_data 镜像门禁
 *
 * 覆盖 mvu-core-mirror.ts 的 buildCharacterPlans / buildLocationPlans：
 *  1. 「姓名-身份」字符串解析（- / – / —）
 *  2. 无分隔符时整串当姓名、身份占位「未知」
 *  3. 已存在行（name / location_name 业务键）跳过 —— 只补不覆盖契约
 *  4. 新行生成合法占位字段（阵营/生死/能力/关系=未知、在场=在场）
 *  5. 地点来源优先级（发生地点 > 所在位置 > 开局地点）与去重
 *  6. 鬼域状态=已确认 → 鬼域影响；否则 → 疑似灵异
 *  7. 同轮 stat_data 内重复姓名/地点去重
 *  8. 空 stat_data / 空在场人物 / 空地点 → 无计划
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const mirrorPath = join(
  repoRoot,
  'src',
  '神秘复苏模拟器',
  '脚本',
  '数据库前端',
  'mvu-core-mirror.ts',
);

function loadMirror() {
  const source = readFileSync(mirrorPath, 'utf8');
  const transpiled = transpileModule(source, {
    compilerOptions: {
      module: ModuleKind.CommonJS,
      target: ScriptTarget.ES2022,
    },
    fileName: mirrorPath,
  }).outputText;

  const module = { exports: {} };
  vm.runInNewContext(transpiled, { module, exports: module.exports }, { filename: mirrorPath });
  return module.exports;
}

const { buildCharacterPlans, buildLocationPlans } = loadMirror();
assert.equal(typeof buildCharacterPlans, 'function', 'buildCharacterPlans must be exported');
assert.equal(typeof buildLocationPlans, 'function', 'buildLocationPlans must be exported');

// ─────────────────────── 测试数据 ───────────────────────
const characterSheet = {
  uid: 'sheet_characters',
  name: '人物',
  content: [
    ['row_id', '姓名', '身份', '阵营', '所在地点', '在场状态', '生死状态', '灵异能力', '关系', '已知情报'],
    [1, '杨间', '学生', '无正式势力', '七中', '在场', '存活', '未觉醒', '同学:赵磊', '七中普通学生'],
  ],
};

const emptyLocationSheet = {
  uid: 'sheet_locations',
  name: '地点',
  content: [
    ['row_id', '地点名', '城市', '地点类型', '灵异状态', '封锁状态', '相关事件', '关键描述', '可交互内容'],
  ],
};

const seededLocationSheet = {
  uid: 'sheet_locations',
  name: '地点',
  content: [
    ['row_id', '地点名', '城市', '地点类型', '灵异状态', '封锁状态', '相关事件', '关键描述', '可交互内容'],
    [1, '大昌市第七中学', '大昌市', '学校', '鬼域影响', '未封锁', '七中敲门事件', '七中校园', '探索'],
  ],
};

const makeCurrentData = (characters, locations) => ({
  mate: { type: 'chatSheets', version: 1 },
  sheet_characters: characters,
  sheet_locations: locations,
});

// ─────────────────────── 人物镜像 ───────────────────────
{
  const stat = {
    在场人物: ['周正-讲台上的刑警', '杨间-学生', '王珊珊-学生', '张伟'],
  };
  const plans = buildCharacterPlans(stat, makeCurrentData(characterSheet, emptyLocationSheet), '七中高三教室');

  // 杨间已在表中 → 跳过；周正/王珊珊/张伟 → 插入
  assert.equal(plans.length, 3, `应插入 3 个新人物，实际 ${plans.length}`);
  const byName = Object.fromEntries(plans.map(p => [p.data.name, p.data]));

  // 周正：解析姓名+身份
  assert.equal(byName['周正'].name, '周正');
  assert.equal(byName['周正'].identity_text, '讲台上的刑警');
  // 张伟：无分隔符整串姓名、身份占位
  assert.equal(byName['张伟'].name, '张伟');
  assert.equal(byName['张伟'].identity_text, '未知');
  // 王珊珊：姓名+身份
  assert.equal(byName['王珊珊'].name, '王珊珊');
  assert.equal(byName['王珊珊'].identity_text, '学生');

  // 占位字段全部合法
  for (const name of ['周正', '王珊珊', '张伟']) {
    const row = byName[name];
    assert.equal(row.presence_status, '在场', `${name} 在场状态应为在场`);
    assert.equal(row.life_status, '未知', `${name} 生死状态应为未知（不臆断存活）`);
    assert.equal(row.faction_text, '未知', `${name} 阵营应为未知`);
    assert.equal(row.supernatural_ability, '未知', `${name} 灵异能力应为未知`);
    assert.equal(row.relations_text, '未知', `${name} 关系应为未知`);
    assert.equal(row.location_name, '七中高三教室', `${name} 所在地点应来自 stat.所在位置`);
    assert.ok(row.known_info && row.known_info.length <= 400, `${name} 已知情报应有值且不超 400`);
    // 只补不覆盖：全部是 insertRow，不对已有行产生 updateCell
    assert.equal(plans.every(p => p.action === 'insertRow'), true, '镜像人物全部应为 insertRow');
  }
  assert.ok(!byName['杨间'], '杨间已在表中，不得产生计划');
}

// 同轮 stat_data 内同一姓名去重（第二次出现不重复插入）
{
  const stat = { 在场人物: ['周正-刑警', '周正-刑警', '周正'] };
  const plans = buildCharacterPlans(stat, makeCurrentData(characterSheet, emptyLocationSheet), '七中');
  assert.equal(plans.length, 1, `同轮重复姓名应去重，实际 ${plans.length}`);
  assert.equal(plans[0].data.name, '周正');
}

// 破折号变体：– 与 — 都能拆分
{
  const stat = { 在场人物: ['李军–值班保安', '王芳—食堂阿姨', '陈涛-学生'] };
  const plans = buildCharacterPlans(stat, makeCurrentData(characterSheet, emptyLocationSheet), '七中');
  assert.equal(plans.length, 3);
  const byName = Object.fromEntries(plans.map(p => [p.data.name, p.data]));
  assert.equal(byName['李军'].identity_text, '值班保安');
  assert.equal(byName['王芳'].identity_text, '食堂阿姨');
  assert.equal(byName['陈涛'].identity_text, '学生');
}

// 空在场人物 / 空 stat → 无计划
{
  assert.equal(buildCharacterPlans({ 在场人物: [] }, makeCurrentData(characterSheet, emptyLocationSheet), '七中').length, 0);
  assert.equal(buildCharacterPlans({}, makeCurrentData(characterSheet, emptyLocationSheet), '七中').length, 0);
  assert.equal(buildCharacterPlans({ 在场人物: ['', '  '] }, makeCurrentData(characterSheet, emptyLocationSheet), '七中').length, 0);
}

// ─────────────────────── 地点镜像 ───────────────────────
{
  // 鬼域状态=已确认 → 鬼域影响；发生地点与开局地点相同 → 去重；所在位置不同 → 插入
  const stat = {
    所在位置: '七中高三教室',
    开局地点: '大昌市第七中学',
    势力关系: { 所属城市: '大昌市' },
    当前灵异事件: { 鬼域状态: '已确认', 发生地点: '大昌市第七中学', 事件代号: '七中敲门事件' },
  };
  const plans = buildLocationPlans(stat, makeCurrentData(characterSheet, emptyLocationSheet), '七中敲门事件');
  assert.equal(plans.length, 2, `应插入 2 个地点（发生地与开局地去重），实际 ${plans.length}`);
  const byName = Object.fromEntries(plans.map(p => [p.data.location_name, p.data]));

  assert.equal(byName['大昌市第七中学'].supernatural_status, '鬼域影响', '鬼域已确认应映射为鬼域影响');
  assert.equal(byName['大昌市第七中学'].lockdown_status, '未封锁');
  assert.equal(byName['大昌市第七中学'].city_name, '大昌市');
  assert.equal(byName['大昌市第七中学'].related_event, '七中敲门事件');
  assert.equal(byName['七中高三教室'].supernatural_status, '鬼域影响', '鬼域已确认应对所有候选地点生效');
  assert.ok(!byName['七中高三教室'] || byName['七中高三教室'].description, 'description 应有值');
  assert.ok(plans.every(p => p.action === 'insertRow'), '镜像地点全部应为 insertRow');
}

// 鬼域状态未确认 → 疑似灵异
{
  const stat = {
    所在位置: '七中高三教室',
    势力关系: { 所属城市: '大昌市' },
    当前灵异事件: { 鬼域状态: '未确认', 发生地点: '七中高三教室' },
  };
  const plans = buildLocationPlans(stat, makeCurrentData(characterSheet, emptyLocationSheet), 'E1');
  assert.equal(plans.length, 1);
  assert.equal(plans[0].data.supernatural_status, '疑似灵异', '鬼域未确认应映射为疑似灵异');
}

// 已存在地点跳过（只补不覆盖）
{
  const stat = {
    所在位置: '大昌市第七中学',
    势力关系: { 所属城市: '大昌市' },
    当前灵异事件: { 鬼域状态: '已确认', 发生地点: '大昌市第七中学' },
  };
  const plans = buildLocationPlans(stat, makeCurrentData(characterSheet, seededLocationSheet), 'E1');
  assert.equal(plans.length, 0, `已存在地点应跳过，实际 ${plans.length}`);
}

// 空地点来源 → 无计划
{
  const plans = buildLocationPlans(
    { 势力关系: { 所属城市: '大昌市' }, 当前灵异事件: {} },
    makeCurrentData(characterSheet, emptyLocationSheet),
    'E1',
  );
  assert.equal(plans.length, 0);
}

console.log('verify-mfrs-mvu-core-mirror: passed');