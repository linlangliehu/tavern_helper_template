/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const mfrsRoot = join(repoRoot, 'src', '\u795e\u79d8\u590d\u82cf\u6a21\u62df\u5668');
const releaseRoot = join(repoRoot, 'src', '\u795e\u79d8\u590d\u82cf\u6a21\u62df\u5668\u53d1\u5e03\u7248');
const hotfixDir = join(mfrsRoot, '\u811a\u672c', 'hotfix-generation-ended-listeners');
const hotfixPath = join(hotfixDir, 'index.ts');
const normalizerPath = join(hotfixDir, 'protocol-normalizer.js');
const messagePanelPath = join(mfrsRoot, '\u811a\u672c', '\u6d88\u606f\u5185\u9762\u677f', 'index.ts');
const dbLoaderPath = join(mfrsRoot, '\u811a\u672c', '\u6570\u636e\u5e93', 'index.ts');
const dbFrontendPath = join(mfrsRoot, '\u811a\u672c', '\u6570\u636e\u5e93\u524d\u7aef', 'index.ts');
const dbFrontendVisualizerPath = join(mfrsRoot, '\u811a\u672c', '\u6570\u636e\u5e93\u524d\u7aef', 'v10_2_visualizer.js');
const fixedStatusPath = join(mfrsRoot, '\u811a\u672c', '\u56fa\u5b9a\u72b6\u6001\u680f', 'index.ts');
const themePath = join(mfrsRoot, '\u811a\u672c', '\u754c\u9762\u7f8e\u5316', 'index.ts');
const distDbLoaderPath = join(repoRoot, 'dist', '\u795e\u79d8\u590d\u82cf\u6a21\u62df\u5668', '\u811a\u672c', '\u6570\u636e\u5e93', 'index.js');
const distDbFrontendPath = join(repoRoot, 'dist', '\u795e\u79d8\u590d\u82cf\u6a21\u62df\u5668', '\u811a\u672c', '\u6570\u636e\u5e93\u524d\u7aef', 'index.js');
const distHotfixPath = join(repoRoot, 'dist', '\u795e\u79d8\u590d\u82cf\u6a21\u62df\u5668', '\u811a\u672c', 'hotfix-generation-ended-listeners', 'index.js');

const { normalizeMfrsUpdateVariableProtocol } = require(normalizerPath);

function readText(path) {
  return readFileSync(path, 'utf8');
}

const hotfixSource = readText(hotfixPath);
const initvarSource = readText(join(mfrsRoot, '\u4e16\u754c\u4e66', '\u53d8\u91cf', 'initvar.yaml'));

assert.ok(
  hotfixSource.includes('function seedMissingStatPaths'),
  'hotfix must seed missing MagVar paths before parseMessage',
);
assert.ok(
  hotfixSource.includes('seedMissingStatPaths(readOldMvuData'),
  'hotfix must call seedMissingStatPaths on oldData before parseMessage',
);
assert.ok(
  hotfixSource.includes('行动建议'),
  'hotfix seed must cover 行动建议',
);
assert.ok(
  hotfixSource.includes('最近行动判定') && hotfixSource.includes('DEFAULT_ACTION_JUDGEMENT'),
  'hotfix seed must cover 最近行动判定',
);
assert.ok(
  /行动建议:\s*\[\]/.test(initvarSource),
  'initvar must seed 行动建议: [] so MagVar replace path exists on new chats',
);
assert.ok(
  /最近行动判定:[\s\S]*?类型:\s*未判定/.test(initvarSource),
  'initvar must seed 最近行动判定 defaults',
);
assert.ok(
  hotfixSource.includes('function recoverSendUiAfterEmptyGeneration'),
  'hotfix must recover send UI after empty AI reply',
);
assert.ok(
  hotfixSource.includes('function forceRecoverSendUi'),
  'hotfix must force-recover send UI after every generation end',
);
assert.ok(
  hotfixSource.includes('activateSendButtons'),
  'hotfix empty-reply recovery must call activateSendButtons',
);
assert.ok(
  hotfixSource.includes("forceRecoverSendUi(hostWindow, 'generation_ended_always'"),
  'hotfix must always unlock send after GENERATION_ENDED',
);
assert.ok(
  hotfixSource.includes('handleGenerationStopped'),
  'hotfix must listen for GENERATION_STOPPED empty-reply recovery',
);

function extractPatchArrayText(message) {
  const updateMatch = String(message).match(/<UpdateVariable\b[^>]*>\s*([\s\S]*?)\s*<\/UpdateVariable>/i);
  assert.ok(updateMatch, 'message should contain <UpdateVariable>');
  const patchMatch = updateMatch[1].match(/<JSONPatch\b[^>]*>\s*([\s\S]*?)\s*<\/JSONPatch>/i);
  assert.ok(patchMatch, 'UpdateVariable should contain nested <JSONPatch>');
  const arrayMatch = patchMatch[1].match(/(\[[\s\S]*\])/);
  assert.ok(arrayMatch, 'JSONPatch should contain a JSON array');
  return arrayMatch[1];
}

function decodePointerSegment(segment) {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

function readContainer(root, parts) {
  let current = root;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}

function writeValue(root, pointer, value, mode) {
  const parts = pointer.split('/').slice(1).map(decodePointerSegment);
  const fullParts = ['stat_data', ...parts];
  const key = fullParts.pop();
  assert.ok(key, `patch path should have a final segment: ${pointer}`);
  const parent = readContainer(root, fullParts);
  assert.ok(parent && typeof parent === 'object', `patch parent should exist: ${pointer}`);

  if (mode === 'insert') {
    assert.ok(Array.isArray(parent), `insert parent should be an array: ${pointer}`);
    if (key === '-') parent.push(value);
    else parent.splice(Number(key), 0, value);
    return;
  }

  parent[key] = value;
}

function applyPatches(oldData, patchText) {
  const next = JSON.parse(JSON.stringify(oldData));
  const patches = JSON.parse(patchText);
  for (const patch of patches) {
    if (patch.op === 'replace') {
      writeValue(next, patch.path, patch.value, 'replace');
    } else if (patch.op === 'delta') {
      const parts = patch.path.split('/').slice(1).map(decodePointerSegment);
      const fullParts = ['stat_data', ...parts];
      const key = fullParts.pop();
      const parent = readContainer(next, fullParts);
      parent[key] = Number(parent[key] || 0) + Number(patch.value || 0);
    } else if (patch.op === 'insert') {
      writeValue(next, patch.path, patch.value, 'insert');
    } else {
      throw new Error(`unsupported op in regression applier: ${patch.op}`);
    }
  }
  return next;
}

function runSample(name, message, expected) {
  const normalized = normalizeMfrsUpdateVariableProtocol(message);
  const patchText = extractPatchArrayText(normalized.message);
  const next = applyPatches({
    initialized_lorebooks: {},
    stat_data: {
      '\u59d3\u540d': '\u672a\u77e5',
      '\u98ce\u9669\u503c': 0,
      '\u5f53\u524d\u7075\u5f02\u4e8b\u4ef6': {
        '\u4e8b\u4ef6\u4ee3\u53f7': '\u672a\u7acb\u6848\u7075\u5f02\u4e8b\u4ef6',
        '\u9b3c\u57df\u72b6\u6001': '\u672a\u786e\u8ba4',
      },
      '\u884c\u52a8\u5efa\u8bae': [],
      '\u89c4\u5f8b\u63a8\u7406\u8bb0\u5f55': [],
    },
  }, patchText);

  assert.equal(next.stat_data['\u59d3\u540d'], expected.name, `${name}: name`);
  assert.equal(next.stat_data['\u98ce\u9669\u503c'], expected.risk, `${name}: risk`);
  assert.equal(next.stat_data['\u5f53\u524d\u7075\u5f02\u4e8b\u4ef6']['\u4e8b\u4ef6\u4ee3\u53f7'], expected.eventCode, `${name}: event code`);
  assert.equal(next.stat_data['\u5f53\u524d\u7075\u5f02\u4e8b\u4ef6']['\u9b3c\u57df\u72b6\u6001'], expected.domain, `${name}: domain`);
  assert.equal(next.stat_data['\u884c\u52a8\u5efa\u8bae'].length, expected.actionCount, `${name}: action suggestions`);
  assert.equal(next.stat_data['\u89c4\u5f8b\u63a8\u7406\u8bb0\u5f55'].length, expected.ruleCount, `${name}: rule records`);
  return normalized;
}

const nestedSample = [
  '<UpdateVariable>',
  '<JSONPatch>',
  '[',
  '  { "op": "replace", "path": "/\u59d3\u540d", "value": "\u6d4b\u8bd5\u89d2\u8272" },',
  '  { "op": "delta", "path": "/\u98ce\u9669\u503c", "value": 5 },',
  '  { "op": "replace", "path": "/\u5f53\u524d\u7075\u5f02\u4e8b\u4ef6/\u4e8b\u4ef6\u4ee3\u53f7", "value": "\u6572\u95e8\u9b3c\u5a92\u4ecb\u4f20\u64ad\u4e8b\u4ef6" },',
  '  { "op": "replace", "path": "/\u5f53\u524d\u7075\u5f02\u4e8b\u4ef6/\u9b3c\u57df\u72b6\u6001", "value": "\u672a\u786e\u8ba4" },',
  '  { "op": "replace", "path": "/\u884c\u52a8\u5efa\u8bae", "value": [{ "\u9009\u9879": "A", "\u601d\u8def": "\u89c2\u5bdf\u95e8\u7f1d" }] }',
  ']',
  '</JSONPatch>',
  '</UpdateVariable>',
].join('\n');

const legacyDirectSample = nestedSample
  .replace(/<JSONPatch>\n/i, '')
  .replace(/\n<\/JSONPatch>/i, '')
  .replace('\u6d4b\u8bd5\u89d2\u8272', '\u65e7\u683c\u5f0f\u89d2\u8272')
  .replace('\u672a\u786e\u8ba4', '\u7591\u4f3c\u9b3c\u57df');

const legacyAddSample = [
  '<UpdateVariable>',
  '[',
  '  { "op": "add", "path": "/\u59d3\u540d", "value": "add\u517c\u5bb9\u89d2\u8272" },',
  '  { "op": "add", "path": "/\u98ce\u9669\u503c", "value": 5 },',
  '  { "op": "add", "path": "/\u5f53\u524d\u7075\u5f02\u4e8b\u4ef6/\u4e8b\u4ef6\u4ee3\u53f7", "value": "\u6572\u95e8\u9b3c\u5a92\u4ecb\u4f20\u64ad\u4e8b\u4ef6" },',
  '  { "op": "add", "path": "/\u5f53\u524d\u7075\u5f02\u4e8b\u4ef6/\u9b3c\u57df\u72b6\u6001", "value": "\u7591\u4f3c\u9b3c\u57df" },',
  '  { "op": "add", "path": "/\u884c\u52a8\u5efa\u8bae/-", "value": { "\u9009\u9879": "A", "\u601d\u8def": "\u4fdd\u6301\u8ddd\u79bb" } },',
  '  { "op": "add", "path": "/\u89c4\u5f8b\u63a8\u7406\u8bb0\u5f55", "value": { "\u65f6\u95f4\u70b9": "\u5f53\u524d", "\u884c\u4e3a": "\u542c\u95e8", "\u89c2\u5bdf\u7ed3\u679c": "\u6572\u51fb", "\u63a8\u65ad": "\u5a92\u4ecb", "\u662f\u5426\u89e6\u53d1\u89c4\u5f8b": false, "\u98ce\u9669\u7b49\u7ea7": "\u4e2d" } }',
  ']',
  '</UpdateVariable>',
].join('\n');

const nested = runSample('nested JSONPatch', nestedSample, {
  name: '\u6d4b\u8bd5\u89d2\u8272',
  risk: 5,
  eventCode: '\u6572\u95e8\u9b3c\u5a92\u4ecb\u4f20\u64ad\u4e8b\u4ef6',
  domain: '\u672a\u786e\u8ba4',
  actionCount: 1,
  ruleCount: 0,
});
assert.equal(nested.stats.legacyWrapped, 0, 'nested sample should not be legacy-wrapped');

const legacy = runSample('legacy direct-array', legacyDirectSample, {
  name: '\u65e7\u683c\u5f0f\u89d2\u8272',
  risk: 5,
  eventCode: '\u6572\u95e8\u9b3c\u5a92\u4ecb\u4f20\u64ad\u4e8b\u4ef6',
  domain: '\u7591\u4f3c\u9b3c\u57df',
  actionCount: 1,
  ruleCount: 0,
});
assert.equal(legacy.stats.legacyWrapped, 1, 'legacy direct-array should be wrapped into JSONPatch');

const legacyAdd = runSample('legacy direct-array with op:add', legacyAddSample, {
  name: 'add\u517c\u5bb9\u89d2\u8272',
  risk: 5,
  eventCode: '\u6572\u95e8\u9b3c\u5a92\u4ecb\u4f20\u64ad\u4e8b\u4ef6',
  domain: '\u7591\u4f3c\u9b3c\u57df',
  actionCount: 1,
  ruleCount: 1,
});
assert.equal(legacyAdd.stats.legacyWrapped, 1, 'legacy add sample should be wrapped');
assert.equal(legacyAdd.stats.addToInsert, 2, 'legacy add sample should convert two array appends to insert');
assert.equal(legacyAdd.stats.addToReplace, 4, 'legacy add sample should convert scalar/object set add operations to replace');

assert.ok(hotfixSource.includes('normalizeMfrsUpdateVariableProtocol(rawMessage)'), 'hotfix should normalize before parseMessage');
assert.ok(hotfixSource.includes('mvu.parseMessage(normalized.message, oldData)'), 'hotfix should call parseMessage with message text and old data');
assert.ok(
  hotfixSource.includes('writeMvuDataWithVerification(hostWindow, chat, messageIndex, newData, messageOption)'),
  'hotfix should write parsed MVU data back through verified writeback',
);
assert.equal(hotfixSource.includes('parseMessage(lastMessageIndex'), false, 'hotfix must not pass message index to parseMessage');
assert.ok(hotfixSource.includes('RAW_PROTOCOL_EXTRA_KEY'), 'hotfix should preserve raw protocol before cleaning mes');
assert.ok(hotfixSource.includes('getTavernEventName'), 'hotfix should register real runtime event names');
assert.ok(hotfixSource.includes('MysteryMessagePanel?.refreshMessage'), 'hotfix should refresh message panel after MVU writeback');
assert.ok(hotfixSource.includes('writeMvuDataWithVerification'), 'hotfix should verify MVU writeback after replaceMvuData');
assert.ok(hotfixSource.includes('assignMessageVariablesDirectly'), 'hotfix should have a direct chat variables fallback');
assert.ok(hotfixSource.includes('hostWindow.TavernHelper?.[key]'), 'hotfix should find TavernHelper runtime variable APIs');
assert.ok(hotfixSource.includes('persistDirectMessageVariables'), 'hotfix should persist direct chat variables fallback');
assert.ok(hotfixSource.includes('context.saveChat()'), 'hotfix should save chat after direct variable mutation');
assert.ok(hotfixSource.includes('scheduleMvuWriteBackRetries'), 'hotfix should retry writeback after generation event settles');
assert.ok(hotfixSource.includes('recoverRecentRawProtocolMessages'), 'hotfix should recover existing raw protocol messages on install');
assert.ok(hotfixSource.includes('verified: writeResult.verified'), 'hotfix logs should include writeback verification result');
assert.ok(hotfixSource.includes('persisted: writeResult.persisted'), 'hotfix logs should include direct fallback persistence result');

const messagePanelSource = readText(messagePanelPath);
assert.ok(messagePanelSource.includes('MysteryMessagePanel'), 'message panel should expose a refresh API');
assert.ok(messagePanelSource.includes('refreshMessage: processOneMessage'), 'message panel should expose per-message refresh');
assert.ok(messagePanelSource.includes('s.思路'), 'message panel action buttons should render Chinese MVU suggestion text');
assert.ok(messagePanelSource.includes('s.选项'), 'message panel action buttons should render Chinese MVU suggestion option keys');
assert.ok(messagePanelSource.includes('mfrs-msg-action-meta'), 'message panel action buttons should show suggestion risk/gain metadata');
assert.ok(messagePanelSource.includes('MutationObserver'), 'message panel should observe final message DOM replacements');
assert.ok(messagePanelSource.includes('scheduleBurstRefresh'), 'message panel should retry refresh after generation/render events');
assert.ok(messagePanelSource.includes('tavern_events.GENERATION_ENDED'), 'message panel should refresh after generation ended');

// ── v8.7.4 static gates ──

// BUG-002: protocol-normalizer must NOT list /驭鬼者状态/已驾驭厉鬼 in ARRAY_APPEND_PATHS
const normalizerSource = readText(normalizerPath);
assert.equal(
  normalizerSource.includes("'/\u9a6d\u9b3c\u8005\u72b6\u6001/\u5df2\u9a7e\u9a6d\u5389\u9b3c'"),
  false,
  'protocol-normalizer must NOT list /\u9a6d\u9b3c\u8005\u72b6\u6001/\u5df2\u9a7e\u9a6d\u5389\u9b3c in ARRAY_APPEND_PATHS (BUG-002)',
);

// BUG-002: yaml contract must declare replace semantics for 已驾驭厉鬼
for (const root of [mfrsRoot, releaseRoot]) {
  const variableOutput = readText(join(root, '\u4e16\u754c\u4e66', '\u53d8\u91cf', '\u53d8\u91cf\u8f93\u51fa\u683c\u5f0f.yaml'));
  assert.ok(
    variableOutput.includes('\u9a6d\u9b3c\u8005\u72b6\u6001/\u5df2\u9a7e\u9a6d\u5389\u9b3c'),
    `${root} variable output format must mention /\u9a6d\u9b3c\u8005\u72b6\u6001/\u5df2\u9a7e\u9a6d\u5389\u9b3c replace contract`,
  );
  assert.ok(
    /\u5df2\u9a7e\u9a6d\u5389\u9b3c[\s\S]{0,200}?replace/s.test(variableOutput),
    `${root} variable output format must declare replace semantics for \u5df2\u9a7e\u9a6d\u5389\u9b3c`,
  );
  const variableRules = readText(join(root, '\u4e16\u754c\u4e66', '\u53d8\u91cf', '\u53d8\u91cf\u66f4\u65b0\u89c4\u5219.yaml'));
  assert.ok(
    /\u5df2\u9a7e\u9a6d\u5389\u9b3c[\s\S]{0,200}?op:"replace"/s.test(variableRules),
    `${root} variable update rules must declare replace-only for \u5df2\u9a7e\u9a6d\u5389\u9b3c`,
  );
}

// BUG-002: render-layer dedup fallback
assert.ok(
  messagePanelSource.includes('rawGhostList') && messagePanelSource.includes('findIndex'),
  'message panel must deduplicate ghost list by \u4ee3\u53f7 (BUG-002 render fallback)',
);

// BUG-001: is_user attribute filtering
assert.ok(
  messagePanelSource.includes('isUserMessage'),
  'message panel must expose isUserMessage helper (BUG-001)',
);
assert.ok(
  messagePanelSource.includes("getAttribute('is_user')"),
  'message panel isUserMessage must check is_user attribute (BUG-001)',
);
assert.ok(
  messagePanelSource.includes('cleanupUserMessages'),
  'message panel must expose cleanupUserMessages (BUG-001)',
);

// BUG-003: legacy pseudo-logo needs text avoidance; Phase 2 entity brand occupies its own flow row.
const themeSource = readText(themePath);
const hasLegacyPseudoLogo = themeSource.includes('.mes[is_user="false"] .mes_text::after');
const hasEntityBrand = messagePanelSource.includes('class="mfrs-msg-brand"');
assert.ok(hasLegacyPseudoLogo || hasEntityBrand, 'message branding must retain a visible BUG-003 replacement');
if (hasLegacyPseudoLogo) {
  assert.ok(
    /mfrs-msg-narrative-wrapper[\s\S]*?padding:\s*4[0-9]px\s+22px\s+16px/s.test(themeSource),
    'legacy pseudo-logo requires narrative wrapper padding-top >= 40px (BUG-003)',
  );
} else {
  const narrativePadding = themeSource.match(
    /mfrs-msg-narrative-wrapper[\s\S]*?padding:\s*(\d+)px\s+(\d+)px\s+(\d+)px(?:\s+(\d+)px)?/s,
  );
  assert.ok(narrativePadding, 'entity brand narrative wrapper must keep explicit padding (BUG-003)');
  const top = Number(narrativePadding[1]);
  const right = Number(narrativePadding[2]);
  const bottom = Number(narrativePadding[3]);
  const left = Number(narrativePadding[4] ?? narrativePadding[2]);
  assert.ok(
    top === 18 && right === 22 && bottom >= 16 && left >= 22,
    'entity brand must keep normal top padding and reserve any Phase 3 binding-line inset (BUG-003)',
  );
  assert.ok(
    messagePanelSource.includes('mesText.insertBefore(nextBrand, wrapper ?? mesText.firstChild)'),
    'entity brand must occupy a dedicated flow row before narrative text (BUG-003)',
  );
}

// BUG-004: tab ARIA roles
assert.ok(
  messagePanelSource.includes('role="tablist"'),
  'message panel tabs must have role=tablist (BUG-004)',
);
assert.ok(
  messagePanelSource.includes('role="tab"'),
  'message panel tab buttons must have role=tab (BUG-004)',
);
assert.ok(
  messagePanelSource.includes('role="tabpanel"'),
  'message panel content areas must have role=tabpanel (BUG-004)',
);
assert.ok(
  messagePanelSource.includes('aria-selected'),
  'message panel tabs must have aria-selected (BUG-004)',
);

for (const root of [mfrsRoot, releaseRoot]) {
  const variableOutput = readText(join(root, '\u4e16\u754c\u4e66', '\u53d8\u91cf', '\u53d8\u91cf\u8f93\u51fa\u683c\u5f0f.yaml'));
  const systemPrompt = readText(join(root, '\u7cfb\u7edf\u63d0\u793a\u8bcd', '0.txt'));
  const indexYaml = readText(join(root, 'index.yaml'));
  assert.ok(variableOutput.includes('<UpdateVariable>') && variableOutput.includes('<JSONPatch>'), 'variable output contract should include nested JSONPatch skeleton');
  assert.ok(variableOutput.includes('Never place the JSON array directly under <UpdateVariable>'), 'variable output contract should forbid direct-array UpdateVariable');
  assert.ok(variableOutput.includes('Never output op:"add"'), 'variable output contract should forbid op:add');
  assert.ok(systemPrompt.includes('\u56fa\u5b9a\u53d8\u91cf\u66f4\u65b0\u9aa8\u67b6'), 'system prompt should carry first-turn update skeleton');
  assert.ok(systemPrompt.includes('\u7981\u6b62\u8f93\u51fa `op:"add"`'), 'system prompt should forbid op:add');
  assert.match(indexYaml, /\u540d\u79f0: '\[mvu_update\]\u53d8\u91cf\u66f4\u65b0\u89c4\u5219'[\s\S]{0,120}?\u6fc0\u6d3b\u7b56\u7565: \{ \u7c7b\u578b: \u84dd\u706f \}/, 'MVU update rules should be constant for first-turn requests');
}

for (const path of [dbLoaderPath, dbFrontendPath]) {
  const source = readText(path);
  assert.equal(source.includes('@52b2e62'), false, `${path} should not hardcode stale vendor ref`);
  assert.equal(source.includes('import.meta.url'), false, `${path} should not rely on webpack-rewritten import.meta.url`);
  assert.equal(source.includes('@main/'), false, `${path} should not fall back to @main vendor`);
  assert.ok(source.includes('__mfrsScriptResourceUrls__'), `${path} should read runtime script URLs registered by the card wrapper`);
  assert.ok(source.includes('performance') && source.includes('getEntriesByType'), `${path} should keep performance resource fallback`);
  assert.ok(source.includes('databaseScriptCacheVersion'), `${path} should carry the current vendor cache marker`);
}

const dbFrontendSource = readText(dbFrontendPath);
assert.equal(
  dbFrontendSource.includes("import './v10_2_visualizer.js'"),
  false,
  'database frontend must not statically execute the ACU visualizer on non-MFRS cards',
);
assert.ok(dbFrontendSource.includes('loadAcuFrontendRuntime'), 'database frontend should defer ACU visualizer loading');
assert.ok(dbFrontendSource.includes('cleanupMfrsDatabaseFrontend'), 'database frontend should clean stale MFRS DOM/globals');
assert.ok(dbFrontendSource.includes('__mfrsDatabaseFrontendCleanup__'), 'database frontend should expose a cleanup hook');
assert.ok(
  dbFrontendSource.includes('!isMysteryRevivalCardActive(hostWindow)'),
  'database frontend should branch away from non-MFRS cards',
);

const fixedStatusSource = readText(fixedStatusPath);
assert.ok(fixedStatusSource.includes('__mfrsFixedStatusCleanup__'), 'fixed status should expose a cleanup hook');
assert.ok(fixedStatusSource.includes('cleanupFixedStatusBar'), 'fixed status should remove its host on cleanup');
assert.ok(fixedStatusSource.includes('!isMysteryRevivalCardActive()'), 'fixed status should not mount on non-MFRS cards');
assert.ok(fixedStatusSource.includes('CHAT_CHANGED'), 'fixed status should react to chat/card changes');

const dbFrontendVisualizerSource = readText(dbFrontendVisualizerPath);
assert.ok(dbFrontendVisualizerSource.includes('cleanup: cleanupInterface'), 'ACU visualizer should expose cleanup');
assert.ok(
  dbFrontendVisualizerSource.includes('unregisterTableUpdateCallback(UpdateController.handleUpdate)'),
  'ACU visualizer cleanup should unregister table update rerender callback',
);

for (const root of [mfrsRoot, releaseRoot]) {
  const indexYaml = readText(join(root, 'index.yaml'));
  assert.ok(indexYaml.includes('__mfrsScriptResourceUrls__'), `${root} script wrappers should register runtime script URLs`);
  assert.match(
    indexYaml,
    /名称: spv3\.9\.5·数据库[\s\S]{0,900}?__mfrsScriptResourceUrls__[\s\S]{0,300}?await import/,
    `${root} database loader wrapper should register its URL before import`,
  );
  assert.match(
    indexYaml,
    /名称: 神秘复苏数据库前端[\s\S]{0,900}?__mfrsScriptResourceUrls__[\s\S]{0,300}?await import/,
    `${root} database frontend wrapper should register its URL before import`,
  );
}

for (const path of [distDbLoaderPath, distDbFrontendPath, distHotfixPath]) {
  if (!existsSync(path)) continue;
  const source = readText(path);
  assert.equal(source.includes('@52b2e62'), false, `${path} should not contain stale vendor ref`);
  assert.equal(source.includes('file:///'), false, `${path} should not contain webpack build-machine file URLs`);
  assert.equal(source.includes('@main/'), false, `${path} should not fall back to @main vendor`);
}

console.log('verify-mfrs-mvu-hotfix-regressions: passed');
