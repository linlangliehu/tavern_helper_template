/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const frontendDir = join(
  repoRoot,
  'src',
  '\u795e\u79d8\u590d\u82cf\u6a21\u62df\u5668',
  '\u811a\u672c',
  '\u6570\u636e\u5e93\u524d\u7aef',
);
const fixedStatusPath = join(
  repoRoot,
  'src',
  '\u795e\u79d8\u590d\u82cf\u6a21\u62df\u5668',
  '\u811a\u672c',
  '\u56fa\u5b9a\u72b6\u6001\u680f',
  'index.ts',
);
const indexPath = join(frontendDir, 'index.ts');
const adapterPath = join(frontendDir, 'table-change-adapter.ts');
const configPath = join(frontendDir, 'frontend-config.js');
const visualizerPath = join(frontendDir, 'v10_2_visualizer.js');
const smokePath = join(repoRoot, 'mfrs-database-frontend-smoke.md');

const fixedStatusSource = readFileSync(fixedStatusPath, 'utf8');
const indexSource = readFileSync(indexPath, 'utf8');
const adapterSource = readFileSync(adapterPath, 'utf8');
const configSource = readFileSync(configPath, 'utf8');
const visualizerSource = readFileSync(visualizerPath, 'utf8');
const smokeSource = readFileSync(smokePath, 'utf8');

function assertContains(source, marker, label) {
  assert.ok(source.includes(marker), `${label} missing marker: ${marker}`);
}

function assertPattern(source, pattern, label) {
  assert.ok(pattern.test(source), `${label} missing pattern: ${pattern}`);
}

function loadFrontendConfig() {
  const fakeWindow = {};
  fakeWindow.parent = fakeWindow;
  vm.runInNewContext(configSource, { window: fakeWindow, console, Object }, { filename: configPath });
  return fakeWindow.MFRS_DATABASE_FRONTEND_CONFIG;
}

assertContains(indexSource, 'loadAcuFrontendRuntime', 'index runtime loader');
assertContains(indexSource, String.raw`/* webpackMode: "eager" */ './frontend-config.js'`, 'index runtime frontend-config import');
assertContains(indexSource, String.raw`/* webpackMode: "eager" */ './v10_2_visualizer.js'`, 'index runtime visualizer import');
assert.ok(
  indexSource.indexOf("('./frontend-config.js')") < indexSource.indexOf("('./v10_2_visualizer.js')")
    || indexSource.indexOf(String.raw`'./frontend-config.js'`) < indexSource.indexOf(String.raw`'./v10_2_visualizer.js'`),
  'frontend-config must still load before v10_2_visualizer in the runtime loader',
);

const frontendConfig = loadFrontendConfig();
assert.equal(frontendConfig.dashboardSlots.length, 7, 'dashboard slot config should stay externalized');
assert.equal(frontendConfig.recallTableRules.length, 10, 'recall table rules should cover 10 key tables');
assert.equal(frontendConfig.consistencyRules.length, 6, 'consistency rules should cover 6 core domains');
for (const key of ['legacyDashboardKeywords', 'dashboardSlots', 'recallTableRules', 'consistencyRules']) {
  assert.ok(Array.isArray(frontendConfig[key]), `${key} should be an array in frontend-config`);
}

for (const rule of frontendConfig.recallTableRules.filter(rule => ['sheet_clues', 'sheet_characters', 'sheet_locations', 'sheet_ghost_archives'].includes(rule.key))) {
  assert.ok(Array.isArray(rule.archivePreview?.detailHeaders) && rule.archivePreview.detailHeaders.length > 0, `${rule.key} must define archive preview detail headers`);
}
const clueRule = frontendConfig.recallTableRules.find(rule => rule.key === 'sheet_clues');
assert.deepEqual(
  JSON.parse(JSON.stringify(clueRule?.archivePreview?.visibility)),
  { header: '可见性', allowed: ['玩家可见'], missing: 'deny' },
  'clue archive/recall visibility must fail closed to 玩家可见 only',
);
for (const key of ['sheet_chronicle', 'sheet_collected_archives', 'sheet_collected_rules']) {
  const rule = frontendConfig.recallTableRules.find(item => item.key === key);
  assert.ok(rule?.memoryEditor?.tabLabel, `${key} must define memory editor config`);
  assert.ok(Array.isArray(rule.memoryEditor?.hiddenHeaders) && rule.memoryEditor.hiddenHeaders.includes('row_id'), `${key} memory editor must hide row_id`);
}
assert.ok(
  frontendConfig.recallTableRules.find(rule => rule.key === 'sheet_chronicle')?.memoryEditor?.readonlyOnEdit?.includes('纪要编号'),
  'chronicle code must remain readonly on edit',
);

assertContains(visualizerSource, 'isRecallRowVisible(headers, row, rule)', 'recall must filter visibility before text construction');
assertContains(visualizerSource, 'const buildRecallRowIdentity', 'recall must use stable row identity');
assertContains(visualizerSource, 'sanitizePinnedRecallItems(baseItems)', 'auto recall must sanitize legacy pinned items');
assertContains(visualizerSource, 'sanitizePinnedRecallItems(items)', 'recall UI must sanitize pinned items');
assertContains(adapterSource, 'const MEMORY_MUTATION_TABLES', 'adapter must scope strict mutation tables');
assertContains(indexSource, 'createMemoryMutationExecutor', 'frontend keeps memory delete executor private');
assertContains(indexSource, 'confirmedMemoryDeleteCapability', 'frontend captures the closure capability token');
assertContains(indexSource, 'memoryDeleteCapability', 'frontend holds a named capability handle for confirmed delete');
assertContains(indexSource, 'previewMemoryChange:', 'frontend exposes strict memory preview');
assertContains(indexSource, 'applyMemoryChange:', 'frontend exposes strict memory apply');
assertContains(indexSource, 'requestConfirmedMemoryDelete:', 'frontend exposes human-confirmed delete request');
assertContains(indexSource, "getActiveMemoryWorkbenchState", 'frontend checks active memory workbench');
assertContains(indexSource, 'getMemoryRowTitle(table, latestData, rowId)', 'delete execution re-resolves authoritative row');
assertContains(indexSource, "action: 'deleteRow'", 'delete uses a fixed internal plan action');
assertContains(visualizerSource, 'confirmDanger:', 'visualizer exposes confirmation-only helper');
assertContains(visualizerSource, 'escapeHtml(message)', 'dialog escapes dynamic confirmation text');


assertContains(visualizerSource, 'const MFRS_DASHBOARD_SLOTS = MFRS_FRONTEND_CONFIG.dashboardSlots || [];', 'dashboard config split');
assertContains(visualizerSource, 'const MFRS_RECALL_TABLE_RULES = MFRS_FRONTEND_CONFIG.recallTableRules || [];', 'recall config split');
assertContains(visualizerSource, 'const MFRS_CONSISTENCY_RULES = MFRS_FRONTEND_CONFIG.consistencyRules || [];', 'consistency config split');
assert.ok(!visualizerSource.includes('const MFRS_RECALL_TABLE_RULES = ['), 'recall rules should not be re-inlined in visualizer');
assert.ok(!visualizerSource.includes('const MFRS_CONSISTENCY_RULES = ['), 'consistency rules should not be re-inlined in visualizer');

for (const marker of [
  "const TAB_GLOBAL = 'acu_tab_mfrs_global_search'",
  "const TAB_RECALL = 'acu_tab_mfrs_recall'",
  "const TAB_CONSISTENCY = 'acu_tab_mfrs_consistency'",
  'renderGlobalPanel',
  'renderRecallPanel',
  'renderConsistencyPanel',
  'buildRowInteractionHtml',
]) {
  assertContains(visualizerSource, marker, 'P1/P2 frontend surface');
}
for (const marker of [
  'buildAutoRecallResult',
  'buildAutoRecallPrompt',
  'registerAutoRecallInjection',
  'GENERATION_AFTER_COMMANDS',
  'injectPrompts',
  'autoPlotRecallEnabled',
  'autoMemoryRecallEnabled',
  'data-recall-action="toggle-auto-plot"',
  'data-recall-action="toggle-auto-memory"',
  '本轮自动召回',
  '<自动剧情记忆召回>',
]) {
  assertContains(visualizerSource, marker, 'automatic recall injection surface');
}
assertPattern(
  visualizerSource,
  /isVirtualTab[\s\S]{0,180}TAB_DASHBOARD[\s\S]{0,180}TAB_GLOBAL[\s\S]{0,180}TAB_RECALL[\s\S]{0,180}TAB_CONSISTENCY/,
  'virtual tab guard',
);

for (const marker of [
  'getActiveGachaChatScope',
  'getGachaScopedStorageKey',
  'getGachaScopedSnapshot',
  'importGachaScopedSnapshot',
  'resetGachaScopedData',
  'validateGachaCatalog',
  'buildGachaEconomySummary',
  'exportChatData: getGachaScopedSnapshot',
  'importChatData: importGachaScopedSnapshot',
  'resetChatData: resetGachaScopedData',
  'validateCatalog: validateGachaCatalog',
  'getEconomySummary: buildGachaEconomySummary',
]) {
  assertContains(visualizerSource, marker, 'gacha scoped maintenance');
}

for (const scopedKey of [
  'STORAGE_KEY_GACHA_CURRENCY',
  'STORAGE_KEY_GACHA_PITY',
  'STORAGE_KEY_GACHA_HISTORY',
  'STORAGE_KEY_CURRENCY_LOG',
  'STORAGE_KEY_GACHA_FRAGMENTS',
  'STORAGE_KEY_GACHA_OWNED',
]) {
  assertPattern(
    visualizerSource,
    new RegExp(`getGachaScopedStorageKey\\(${scopedKey}\\)|scopeKey\\(${scopedKey}\\)`),
    `${scopedKey} should remain scoped to current chat`,
  );
}
assertContains(visualizerSource, "const STORAGE_KEY_CUSTOM_GACHA_ITEMS = 'mfrs_custom_gacha_items';", 'custom catalog global key');
assert.ok(
  !/getGachaScopedStorageKey\(STORAGE_KEY_CUSTOM_GACHA_ITEMS\)/.test(visualizerSource),
  'custom gacha catalog must remain global, not chat-scoped',
);

for (const marker of [
  "const FIXED_DASHBOARD_HOST_ID = 'mfrs-fixed-status-host'",
  "const FIXED_DASHBOARD_SLOT_ID = 'mfrs-fixed-dashboard-slot'",
  "const FIXED_FRONTEND_SLOT_ID = 'mfrs-fixed-frontend-slot'",
  "const FIXED_STATUS_SLOT_ID = 'mfrs-fixed-status-slot'",
  "const dashboardSlot = ensureSlot(FIXED_DASHBOARD_SLOT_ID, '10');",
  "const frontendSlot = ensureSlot(FIXED_FRONTEND_SLOT_ID, '20');",
  'child.id === FIXED_STATUS_SLOT_ID',
  'host.append(dashboardSlot, frontendSlot);',
]) {
  assertContains(visualizerSource, marker, 'fixed dashboard/frontend layout guard');
}

for (const marker of [
  "const dashboardSlotId = 'mfrs-fixed-dashboard-slot';",
  "const frontendSlotId = 'mfrs-fixed-frontend-slot';",
  'function removeStatusUi',
  'host.append(dashboardSlot, frontendSlot);',
]) {
  assertContains(fixedStatusSource, marker, 'fixed status UI removal guard');
}
for (const removedMarker of [
  'function summaryInnerHtml',
  'function detailInnerHtml',
  'data-action="open-status"',
  '\u795e\u79d8\u590d\u82cf14\u8868',
  '\u751f\u5b58\u72b6\u6001',
]) {
  assert.ok(!fixedStatusSource.includes(removedMarker), `fixed status UI should not return: ${removedMarker}`);
}

for (const marker of [
  '总览',
  '一致性',
  '抽卡',
  '召回',
  '固定状态栏',
  '不要发送消息',
  'manualUpdate',
  'triggerUpdate',
  'source commit',
  'publish-card',
]) {
  assertContains(smokeSource, marker, 'smoke checklist coverage');
}

console.log('verify-mfrs-database-frontend-p3: passed');
