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
const indexPath = join(frontendDir, 'index.ts');
const configPath = join(frontendDir, 'frontend-config.js');
const visualizerPath = join(frontendDir, 'v10_2_visualizer.js');
const smokePath = join(repoRoot, 'mfrs-database-frontend-smoke.md');

const indexSource = readFileSync(indexPath, 'utf8');
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

assertContains(indexSource, "import './frontend-config.js';", 'index import order');
assertContains(indexSource, "import './v10_2_visualizer.js';", 'index import order');
assert.ok(
  indexSource.indexOf("import './frontend-config.js';") < indexSource.indexOf("import './v10_2_visualizer.js';"),
  'frontend-config must load before v10_2_visualizer',
);

const frontendConfig = loadFrontendConfig();
assert.equal(frontendConfig.dashboardSlots.length, 7, 'dashboard slot config should stay externalized');
assert.equal(frontendConfig.recallTableRules.length, 10, 'recall table rules should cover 10 key tables');
assert.equal(frontendConfig.consistencyRules.length, 6, 'consistency rules should cover 6 core domains');
for (const key of ['legacyDashboardKeywords', 'dashboardSlots', 'recallTableRules', 'consistencyRules']) {
  assert.ok(Array.isArray(frontendConfig[key]), `${key} should be an array in frontend-config`);
}

assertContains(visualizerSource, 'const MFRS_FRONTEND_CONFIG = getFrontendConfig();', 'visualizer config split');
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
  "const statusSlot = ensureSlot(FIXED_STATUS_SLOT_ID, '30');",
  'host.append(dashboardSlot, frontendSlot, statusSlot);',
]) {
  assertContains(visualizerSource, marker, 'fixed three-slot layout guard');
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
