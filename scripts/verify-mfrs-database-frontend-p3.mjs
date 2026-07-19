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

function sourceSlice(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  const end = start < 0 ? -1 : source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end <= start) {
    throw new Error(`${label} source boundaries missing: ${startMarker} -> ${endMarker}`);
  }
  return source.slice(start, end);
}

function countOccurrences(source, marker) {
  return source.split(marker).length - 1;
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

const gachaPanelSource = sourceSlice(
  visualizerSource,
  'const gachaPanelMounts = new WeakMap();',
  'const showGachaItemDetail = (item, ownerDocument = getHostDocument(), onDestroy = null) => {',
  'gacha panel implementation',
);
const gachaHostGuardSource = sourceSlice(
  gachaPanelSource,
  'const isGachaPanelHostElement = (value, trustedDocument = getHostDocument()) => {',
  'const createGachaPanelLifecycle =',
  'gacha host validation',
);
const gachaLifecycleHelpersSource = sourceSlice(
  gachaPanelSource,
  'const createGachaPanelLifecycle =',
  'const createGachaPanelInstance =',
  'gacha lifecycle helpers',
);
const gachaFactorySource = sourceSlice(
  gachaPanelSource,
  'const createGachaPanelInstance =',
  'const showGachaPanel = () => {',
  'gacha panel instance factory',
);
const gachaShowSource = sourceSlice(
  gachaPanelSource,
  'const showGachaPanel = () => {',
  'const mountGachaPanel = (container, options = {}) => {',
  'gacha overlay entry',
);
const gachaMountSource = sourceSlice(
  visualizerSource,
  'const mountGachaPanel = (container, options = {}) => {',
  'const showGachaItemDetail = (item, ownerDocument = getHostDocument(), onDestroy = null) => {',
  'gacha embedded entry',
);
const gachaDestroySource = sourceSlice(
  gachaLifecycleHelpersSource,
  'const destroy = () => {',
  'const requestClose = () => {',
  'gacha destroy lifecycle',
);
const gachaRequestCloseSource = sourceSlice(
  gachaLifecycleHelpersSource,
  'const requestClose = () => {',
  'return { bindHandle, isCurrentOwner, destroy, requestClose };',
  'gacha user close lifecycle',
);
const gachaActionSource = sourceSlice(
  gachaFactorySource,
  "dialog.on('click.mfrsGachaPanel', '[data-mfrs-action]'",
  'return handle;',
  'gacha action dispatcher',
);
const gachaCustomActionSource = sourceSlice(
  gachaActionSource,
  "case 'gacha-custom-editor':",
  "case 'gacha-export':",
  'gacha custom editor action',
);
const gachaShopActionSource = sourceSlice(
  gachaActionSource,
  "case 'gacha-shop':",
  "case 'gacha-history-toggle':",
  'gacha shop action',
);
const gachaDetailActionSource = sourceSlice(
  gachaFactorySource,
  "$card.on('click.mfrsGachaPanel'",
  '$resultItems.append($card);',
  'gacha item detail action',
);
const gachaEmbeddedCssSource = sourceSlice(
  visualizerSource,
  '.acu-gacha-panel--embedded {',
  '.acu-edit-textarea {',
  'gacha embedded CSS',
);
const gachaShopSource = sourceSlice(
  visualizerSource,
  'const showFragmentShop = (onBalanceChange = null, ownerDocument = getHostDocument(), onDestroy = null) => {',
  'const GACHA_POOL_TYPE = {',
  'gacha fragment shop',
);
const gachaDetailSource = sourceSlice(
  visualizerSource,
  'const showGachaItemDetail = (item, ownerDocument = getHostDocument(), onDestroy = null) => {',
  'const showCustomItemEditor = (ownerDocument = getHostDocument(), onDestroy = null) => {',
  'gacha item detail overlay',
);
const gachaCustomEditorSource = sourceSlice(
  visualizerSource,
  'const showCustomItemEditor = (ownerDocument = getHostDocument(), onDestroy = null) => {',
  'const getNextClueCode = async () => {',
  'gacha custom editor overlay',
);
const gachaImportSource = sourceSlice(
  visualizerSource,
  'const importGachaSnapshotFromFile = (onImported = null, options = {}) => {',
  'const validateGachaCatalog = () => {',
  'gacha snapshot import lifecycle',
);

assert.equal(
  countOccurrences(visualizerSource, 'const createGachaPanelInstance ='),
  1,
  'gacha panel must keep one shared instance factory',
);
assert.equal(
  countOccurrences(visualizerSource, '<span>\u795e\u79d8\u590d\u82cf\u62bd\u5361\u7cfb\u7edf</span>'),
  1,
  'full gacha panel title/template must have one source',
);
assertContains(gachaFactorySource, '<span>\u795e\u79d8\u590d\u82cf\u62bd\u5361\u7cfb\u7edf</span>', 'shared gacha panel template');
assert.equal(
  countOccurrences(gachaPanelSource, 'createGachaPanelInstance({'),
  2,
  'overlay and embedded must be the only callers of the shared gacha factory',
);
assertPattern(
  gachaShowSource,
  /return createGachaPanelInstance\(\{\s*container: body,\s*presentation: 'overlay'\s*\}\);/,
  'showPanel overlay compatibility entry',
);
assertPattern(
  gachaMountSource,
  /const handle = createGachaPanelInstance\(\{[\s\S]*?container,[\s\S]*?presentation: 'embedded'/,
  'mountPanel embedded shared-factory entry',
);
assertContains(visualizerSource, 'showPanel: showGachaPanel,', 'MFRS showPanel public API');
assertContains(visualizerSource, 'mountPanel: mountGachaPanel,', 'MFRS mountPanel public API');

assertContains(gachaHostGuardSource, 'trustedDocument = getHostDocument()', 'trusted host document default');
assertContains(gachaHostGuardSource, 'value?.ownerDocument !== trustedDocument', 'trusted host document identity check');
assertContains(gachaHostGuardSource, 'trustedDocument?.defaultView?.Element', 'trusted-realm Element constructor');
assertContains(gachaHostGuardSource, 'trustedDocument?.defaultView?.Node', 'trusted-realm Node constructor');
assertContains(gachaHostGuardSource, "Object.getOwnPropertyDescriptor(NodeCtor?.prototype, 'nodeType')?.get", 'native Node brand getter');
assertContains(gachaHostGuardSource, 'value instanceof ElementCtor', 'trusted-realm Element prototype check');
assertContains(gachaHostGuardSource, 'nodeTypeGetter.call(value) === 1', 'native Node element-type brand check');
assert.ok(!gachaHostGuardSource.includes('value?.ownerDocument?.defaultView'), 'candidate document must not provide DOM constructors');
assert.ok(!gachaHostGuardSource.includes('value instanceof Element;'), 'gacha host validation must not use local-realm Element');
assertContains(gachaShowSource, 'isGachaPanelHostElement(body)', 'overlay host brand validation');
assertContains(gachaMountSource, 'isGachaPanelHostElement(container)', 'embedded host brand validation');

assertContains(gachaPanelSource, 'const gachaPanelMounts = new WeakMap();', 'gacha mount ownership WeakMap');
assertContains(gachaMountSource, 'const previous = gachaPanelMounts.get(container);', 'same-host previous mount lookup');
assertContains(gachaMountSource, 'if (previous) previous.destroy();', 'same-host previous mount destroy');
assertContains(gachaMountSource, 'gachaPanelMounts.set(container, handle);', 'same-host current mount ownership');
assertPattern(
  gachaMountSource,
  /onDestroy:\s*\(destroyedHandle\) => \{\s*if \(gachaPanelMounts\.get\(container\) === destroyedHandle\) gachaPanelMounts\.delete\(container\);/,
  'destroyed mount ownership cleanup',
);

assertContains(gachaFactorySource, 'handle = { root: dialog[0], destroy };', 'gacha mount handle shape');
assertContains(gachaFactorySource, 'container.appendChild(dialog[0]);', 'gacha root host attachment');
assertPattern(gachaFactorySource, /return handle;\s*\};/, 'gacha factory handle return');
assertContains(gachaMountSource, 'return handle;', 'mountPanel handle return');
assertPattern(gachaDestroySource, /if \(!alive\) return false;\s*alive = false;/, 'idempotent gacha destroy');
assert.ok(!gachaDestroySource.includes('onClose'), 'programmatic destroy must not emit embedded onClose');
assertPattern(
  gachaRequestCloseSource,
  /if \(!isCurrentOwner\(\) \|\| !destroy\(\)\) return false;\s*if \(isEmbedded && typeof onClose === 'function'\)/,
  'embedded user close destroys before onClose',
);
assert.equal(countOccurrences(gachaLifecycleHelpersSource, 'onClose();'), 1, 'onClose must only run through the user-close path');
assertContains(gachaLifecycleHelpersSource, 'mounts.get(container) === handle', 'embedded current-owner lifecycle guard');
assertContains(gachaFactorySource, 'secondaryRegistry.destroyAll();', 'main destroy releases secondary overlays');
assertContains(gachaFactorySource, 'dialog.stop(true, true);', 'main destroy stops root animation');
assertContains(gachaFactorySource, "dialog.find('*').stop(true, true);", 'main destroy stops descendant animations');
assertContains(gachaActionSource, "case 'gacha-close': requestClose(); break;", 'gacha close action ownership path');
assertContains(gachaActionSource, 'if (!isCurrentOwner()) return;', 'gacha action current-owner guard');
assert.ok(
  countOccurrences(gachaFactorySource, 'await syncGachaResultToDatabase') === 2
    && countOccurrences(gachaFactorySource, 'if (!isCurrentOwner()) return;') >= 5,
  'single and ten pull async continuations must be owner guarded',
);
assertContains(gachaActionSource, 'if (!isCurrentOwner()) break;', 'reset confirmation continuation owner guard');
assertContains(gachaImportSource, 'if (!isAlive()) return;', 'FileReader import owner guard before state writes');
assert.ok(
  gachaImportSource.indexOf('if (!isAlive()) return;') < gachaImportSource.indexOf('importGachaScopedSnapshot(snapshot);'),
  'FileReader import must check liveness before snapshot mutation',
);

assertContains(
  gachaFactorySource,
  "acu-gacha-panel--${presentation}${isEmbedded ? '' : ' acu-edit-overlay'}",
  'embedded root excludes main overlay class',
);
assertContains(
  visualizerSource,
  '.acu-gacha-panel--overlay > .acu-edit-dialog { max-width: 900px; max-height: 90vh; overflow: hidden; }',
  'gacha overlay 90vh compatibility layout',
);
assertContains(gachaEmbeddedCssSource, 'position: relative !important;', 'embedded root document-flow position');
assertContains(gachaEmbeddedCssSource, 'position: static !important;', 'embedded dialog document-flow position');
assertContains(gachaEmbeddedCssSource, 'max-height: none !important;', 'embedded panel unlimited document height');
assertContains(gachaEmbeddedCssSource, 'overflow-x: clip !important;', 'embedded panel horizontal overflow containment');
assert.ok(!/position:\s*fixed/.test(gachaEmbeddedCssSource), 'embedded panel must not use fixed positioning');
assert.ok(!gachaEmbeddedCssSource.includes('90vh'), 'embedded panel must not inherit the overlay viewport cap');
assert.ok(!/overflow-x:\s*(?:auto|scroll)/.test(gachaEmbeddedCssSource), 'embedded panel must not add horizontal scrolling');

assertPattern(
  gachaCustomActionSource,
  /if \(!isEmbedded\) \{\s*destroy\(\);\s*showCustomItemEditor\(container\.ownerDocument\);\s*\} else \{\s*trackSecondary/,
  'custom editor keeps embedded panel and closes legacy overlay panel',
);
assertContains(gachaCustomEditorSource, '<div class="acu-edit-overlay">', 'custom editor remains a secondary overlay');
assertContains(gachaCustomEditorSource, 'const closeEditor = () => editorHandle.destroy();', 'custom editor idempotent close path');
assertContains(gachaCustomEditorSource, '$(doc.body).append(editor);', 'custom editor uses owner document body');
assertContains(gachaCustomEditorSource, 'return editorHandle;', 'custom editor returns destroy handle');
assertContains(gachaShopActionSource, 'trackSecondary(release => showFragmentShop(', 'fragment shop remains owned by parent panel');
assert.ok(!gachaShopActionSource.includes('destroy()'), 'fragment shop action must not destroy its parent gacha panel');
assertContains(gachaShopSource, '<div class="acu-edit-overlay"', 'fragment shop remains a secondary overlay');
assertContains(gachaShopSource, '$(doc.body).append(shopDialog);', 'fragment shop uses owner document body');
assertContains(gachaShopSource, "if (action === 'shop-close') { closeShop(); return; }", 'fragment shop idempotent close path');
assertContains(gachaShopSource, 'return handle;', 'fragment shop returns destroy handle');
assertContains(gachaDetailActionSource, 'trackSecondary(release => showGachaItemDetail(item, container.ownerDocument, release));', 'gacha detail remains owned by parent panel');
assert.ok(!gachaDetailActionSource.includes('destroy()'), 'item detail action must not destroy its parent gacha panel');
assertContains(gachaDetailSource, '<div class="acu-edit-overlay">', 'item detail remains a secondary overlay');
assertContains(gachaDetailSource, '$(doc.body).append(detailDialog);', 'item detail uses owner document body');
assertContains(gachaDetailSource, 'const closeDetail = () => handle.destroy();', 'item detail idempotent close path');
assertContains(gachaDetailSource, 'return handle;', 'item detail returns destroy handle');

let dynamicGachaChecks = 0;
const dynamicGachaCheck = (label, assertion) => {
  assertion();
  dynamicGachaChecks++;
};

const foreignElementRealm = {};
vm.runInNewContext(`
  class TrustedNode {
    #nodeType;
    constructor(nodeType) { this.#nodeType = nodeType; }
    get nodeType() { return this.#nodeType; }
  }
  class TrustedElement extends TrustedNode {
    constructor(ownerDocument) {
      super(1);
      this.ownerDocument = ownerDocument;
    }
    appendChild() {}
  }
  const trustedDocument = { defaultView: { Element: TrustedElement, Node: TrustedNode } };
  const foreignDocument = { defaultView: { Element: TrustedElement, Node: TrustedNode } };
  const missingDefaultViewDocument = {};
  const selfBrandedDocument = { defaultView: { Element: Object, Node: TrustedNode } };
  this.trustedDocument = trustedDocument;
  this.realElement = new TrustedElement(trustedDocument);
  this.foreignElement = new TrustedElement(foreignDocument);
  this.noDefaultView = new TrustedElement(missingDefaultViewDocument);
  this.selfBrandedPlainObject = { ownerDocument: selfBrandedDocument, appendChild() {}, nodeType: 1 };
  this.forgedPrototype = { ownerDocument: trustedDocument, appendChild() {} };
  Object.setPrototypeOf(this.forgedPrototype, TrustedElement.prototype);
`, foreignElementRealm, { filename: 'foreign-gacha-element-realm.js' });

const hostGuardContext = {
  getHostDocument: () => foreignElementRealm.trustedDocument,
};
vm.runInNewContext(
  `${gachaHostGuardSource}\nconst gachaPanelMounts = new WeakMap();\nconst createGachaPanelInstance = () => ({ destroy() {} });\n${gachaMountSource}\nthis.mountGachaPanel = mountGachaPanel;`,
  hostGuardContext,
  { filename: `${visualizerPath}:gacha-host-guard` },
);

const mountHostError = {
  name: 'TypeError',
  message: '[MFRS] mountPanel(container) 需要可用的 DOM 元素宿主',
};

dynamicGachaCheck('trusted host-realm Element is accepted', () => {
  const handle = hostGuardContext.mountGachaPanel(foreignElementRealm.realElement);
  assert.equal(typeof handle.destroy, 'function');
});
dynamicGachaCheck('foreign untrusted document Element is rejected', () => {
  assert.throws(() => hostGuardContext.mountGachaPanel(foreignElementRealm.foreignElement), mountHostError);
});
dynamicGachaCheck('missing defaultView is rejected', () => {
  assert.throws(() => hostGuardContext.mountGachaPanel(foreignElementRealm.noDefaultView), mountHostError);
});
dynamicGachaCheck('candidate-provided Element Object brand is rejected', () => {
  assert.throws(() => hostGuardContext.mountGachaPanel(foreignElementRealm.selfBrandedPlainObject), mountHostError);
});
dynamicGachaCheck('forged trusted Element prototype is rejected', () => {
  assert.throws(() => hostGuardContext.mountGachaPanel(foreignElementRealm.forgedPrototype), mountHostError);
});

const lifecycleContext = { console };
vm.runInNewContext(
  `${gachaLifecycleHelpersSource}\nthis.helpers = { createGachaPanelLifecycle, createGachaSecondaryHandle, createGachaSecondaryRegistry };`,
  lifecycleContext,
  { filename: `${visualizerPath}:gacha-lifecycle-helpers` },
);
const { createGachaPanelLifecycle, createGachaSecondaryHandle, createGachaSecondaryRegistry } = lifecycleContext.helpers;

const ownerContainer = {};
const ownerMounts = new Map();
let ownerCleanupCount = 0;
let ownerDestroyCount = 0;
let ownerCloseCount = 0;
const ownerLifecycle = createGachaPanelLifecycle({
  container: ownerContainer,
  isEmbedded: true,
  mounts: ownerMounts,
  cleanup: () => { ownerCleanupCount++; },
  onDestroy: () => { ownerDestroyCount++; },
  onClose: () => { ownerCloseCount++; },
});
const ownerHandle = { destroy: ownerLifecycle.destroy };
ownerLifecycle.bindHandle(ownerHandle);
ownerMounts.set(ownerContainer, ownerHandle);

dynamicGachaCheck('registered embedded owner is current', () => assert.equal(ownerLifecycle.isCurrentOwner(), true));
ownerMounts.set(ownerContainer, { destroy() {} });
dynamicGachaCheck('replaced embedded owner becomes stale', () => assert.equal(ownerLifecycle.isCurrentOwner(), false));
dynamicGachaCheck('stale owner cannot request close', () => assert.equal(ownerLifecycle.requestClose(), false));
dynamicGachaCheck('stale close has no callbacks', () => {
  assert.deepEqual([ownerCleanupCount, ownerDestroyCount, ownerCloseCount], [0, 0, 0]);
});
ownerMounts.set(ownerContainer, ownerHandle);
dynamicGachaCheck('current owner can request close once', () => assert.equal(ownerLifecycle.requestClose(), true));
dynamicGachaCheck('user close releases and emits once', () => {
  assert.deepEqual([ownerCleanupCount, ownerDestroyCount, ownerCloseCount], [1, 1, 1]);
});
dynamicGachaCheck('closed owner is no longer alive', () => assert.equal(ownerLifecycle.isCurrentOwner(), false));
dynamicGachaCheck('panel destroy is idempotent', () => assert.equal(ownerLifecycle.destroy(), false));

let programmaticCloseCount = 0;
const overlayLifecycle = createGachaPanelLifecycle({
  container: {},
  isEmbedded: false,
  mounts: new Map(),
  cleanup: () => {},
  onClose: () => { programmaticCloseCount++; },
});
overlayLifecycle.bindHandle({ destroy: overlayLifecycle.destroy });
dynamicGachaCheck('programmatic destroy succeeds once', () => assert.equal(overlayLifecycle.destroy(), true));
dynamicGachaCheck('programmatic destroy does not emit onClose', () => assert.equal(programmaticCloseCount, 0));

const secondaryRegistry = createGachaSecondaryRegistry();
let secondaryCleanupCount = 0;
let secondaryHandle = null;
secondaryHandle = createGachaSecondaryHandle({
  root: {},
  cleanup: () => { secondaryCleanupCount++; },
  onDestroy: () => secondaryRegistry.release(secondaryHandle),
});
secondaryRegistry.track(secondaryHandle);
dynamicGachaCheck('secondary registry tracks live owner', () => assert.equal(secondaryRegistry.size, 1));
dynamicGachaCheck('secondary self-close succeeds', () => assert.equal(secondaryHandle.destroy(), true));
dynamicGachaCheck('secondary self-close cleans ownership', () => {
  assert.deepEqual([secondaryCleanupCount, secondaryRegistry.size], [1, 0]);
});
dynamicGachaCheck('secondary destroy is idempotent', () => assert.equal(secondaryHandle.destroy(), false));

let destroyAllCount = 0;
for (let i = 0; i < 2; i++) {
  secondaryRegistry.track(createGachaSecondaryHandle({ root: {}, cleanup: () => { destroyAllCount++; } }));
}
dynamicGachaCheck('secondary registry owns all live overlays', () => assert.equal(secondaryRegistry.size, 2));
secondaryRegistry.destroyAll();
dynamicGachaCheck('parent destroy releases all secondary overlays', () => {
  assert.deepEqual([destroyAllCount, secondaryRegistry.size], [2, 0]);
});

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

console.log(`verify-mfrs-database-frontend-p3: passed (${dynamicGachaChecks} dynamic gacha lifecycle checks)`);
