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

const { buildActionSuggestionPlans, buildCharacterPlans, buildLocationPlans } = loadMirror();
assert.equal(typeof buildActionSuggestionPlans, 'function', 'buildActionSuggestionPlans must be exported');
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

// ─────────────────────── 行动建议终态镜像 ───────────────────────
const actionSheet = {
  uid: 'sheet_action_suggestions',
  name: '行动建议',
  content: [
    ['row_id', '选项', '思路', '主要风险', '预期收益', '死亡风险', '复苏风险'],
    [1, 'A', '点燃红色鬼烛', '消耗资源', '抵抗袭击', '高', '无'],
    [2, 'B', '翻窗逃走', '可能被标记', '拉开距离', '高', '无'],
    [3, 'C', '继续收录厉鬼', '厉鬼复苏', '补全档案', '致命', '致命'],
    [4, 'D', '自定义行动', '未知', '未知', '未知', '未知'],
  ],
};

// 终态 stat.行动建议=[] 且表中有上一轮 4 行 → 生成 4 个清空 plan，写入明确终态哨兵。
{
  const stat = { 状态: '厉鬼复苏', is_dead: true, 行动建议: [], 主线进度: { 阶段状态: '模拟结束' } };
  const plans = buildActionSuggestionPlans(stat, { sheet_action_suggestions: actionSheet });
  assert.equal(plans.length, 4, `终态应刷新 4 行行动建议，实际 ${plans.length}`);
  assert.ok(plans.every(p => p.action === 'updateCell' && p.table === '行动建议'));
  assert.ok(plans.every(p => p.set.idea_text === '模拟已结束'), '终态四行思路均应为模拟已结束');
  assert.ok(plans.every(p => p.set.main_risk === '无' && p.set.expected_gain === '无'));
  assert.equal(JSON.stringify(plans.map(p => p.match.row_id)), JSON.stringify([1, 2, 3, 4]));
}

// 开局首轮 stat.行动建议=[] 且表里无数据行 → 不生成占位 plan，保持空表。
{
  const emptyActionSheet = { ...actionSheet, content: [actionSheet.content[0]] };
  const plans = buildActionSuggestionPlans({ 行动建议: [] }, { sheet_action_suggestions: emptyActionSheet });
  assert.equal(plans.length, 0, '首轮空表不得写入终态哨兵');
}

// 正常 A/B/C/D 建议仍按原逻辑更新 4 行。
{
  const suggestions = ['A', 'B', 'C', 'D'].map(key => ({
    选项: key,
    思路: key === 'D' ? '自定义行动' : `正常行动${key}`,
    主要风险: '未知',
    预期收益: '推进调查',
    死亡风险: '中',
    复苏风险: '无',
  }));
  const plans = buildActionSuggestionPlans({ 行动建议: suggestions }, { sheet_action_suggestions: actionSheet });
  assert.equal(plans.length, 4);
  assert.equal(plans[0].set.idea_text, '正常行动A');
  assert.equal(plans[3].set.idea_text, '自定义行动');
}

// 固定表种子行缺失自愈：runMirrorOnce 必须在 updateCell 命中 ROW_NOT_FOUND 且
// set 携带 row_id 时降级 insertRow 补种（SQLite 竞态窗口建表无 seedRows 的自愈路径）。
{
  const mirrorSource = readFileSync(mirrorPath, 'utf8');
  assert.match(
    mirrorSource,
    /ROW_NOT_FOUND/,
    'runMirrorOnce 应检测 ROW_NOT_FOUND 并降级补种',
  );
  assert.match(
    mirrorSource,
    /action:\s*'insertRow'\s*as\s*const,\s*data:\s*plan\.set/,
    'ROW_NOT_FOUND 降级应以 plan.set 整行数据执行 insertRow',
  );
}

console.log('verify-mfrs-mvu-core-mirror: passed');