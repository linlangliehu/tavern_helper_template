/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const indexPath = join(repoRoot, 'src', '\u795e\u79d8\u590d\u82cf\u6a21\u62df\u5668', 'index.yaml');
const statusAppPath = join(repoRoot, 'src', '\u795e\u79d8\u590d\u82cf\u6a21\u62df\u5668', '\u754c\u9762', '\u72b6\u6001\u680f', 'App.vue');
const visualizerPath = join(repoRoot, 'src', '\u795e\u79d8\u590d\u82cf\u6a21\u62df\u5668', '\u811a\u672c', '\u6570\u636e\u5e93\u524d\u7aef', 'v10_2_visualizer.js');
const dbFrontendPath = join(repoRoot, 'src', '\u795e\u79d8\u590d\u82cf\u6a21\u62df\u5668', '\u811a\u672c', '\u6570\u636e\u5e93\u524d\u7aef', 'index.ts');
const themeScriptPath = join(repoRoot, 'src', '\u795e\u79d8\u590d\u82cf\u6a21\u62df\u5668', '\u811a\u672c', '\u754c\u9762\u7f8e\u5316', 'index.ts');
const hotfixPath = join(repoRoot, 'src', '\u795e\u79d8\u590d\u82cf\u6a21\u62df\u5668', '\u811a\u672c', 'hotfix-generation-ended-listeners', 'index.ts');
const vendorPath = join(repoRoot, 'vendor', 'shujuku-sp-fork', 'index.js');

const EXT = '\u6269\u5c55\u5b57\u6bb5';
const REGEX = '\u6b63\u5219';
const NAME = '\u6b63\u5219\u540d\u79f0';
const ENABLED = '\u542f\u7528';
const FIND = '\u67e5\u627e\u8868\u8fbe\u5f0f';
const REPLACE = '\u66ff\u6362\u4e3a';
const APPLIES_TO = '\u4f5c\u7528\u4e8e';
const DISPLAY_ONLY = '\u4ec5\u683c\u5f0f\u663e\u793a';

const requiredCleanupNames = [
  '[\u663e\u793a]\u9690\u85cf\u88f8 choices JSON\uff08\u7531\u6b63\u6587 sp \u9762\u677f\u66ff\u4ee3\uff09',
  '[\u663e\u793a]\u9690\u85cf\u88f8 JSON Patch',
  '[\u663e\u793a]\u9690\u85cf\u72ec\u7acb JSONPatch \u6807\u7b7e',
  '[\u663e\u793a]\u9690\u85cf\u5185\u90e8\u8349\u7a3f\u4e0e\u786e\u8ba4\u5757',
  '[\u663e\u793a]\u9690\u85cf\u82f1\u6587\u8c03\u8bd5\u6458\u8981',
  '[\u663e\u793a]\u9690\u85cf\u5916\u8bed\u4e2d\u95f4\u7a3f',
  '[\u663e\u793a]\u6e05\u7406\u77ed\u6807\u7b7e\u5185\u90e8\u82f1\u6587\u6807\u9898',
  '[\u663e\u793a]\u77ed\u6807\u7b7e Name \u5b57\u6bb5\u4e2d\u6587\u5316',
  '[\u663e\u793a]\u77ed\u6807\u7b7e Status \u5b57\u6bb5\u4e2d\u6587\u5316',
  '[\u663e\u793a]\u77ed\u6807\u7b7e Location \u5b57\u6bb5\u4e2d\u6587\u5316',
];

function parseRegexExpression(expression) {
  const value = String(expression ?? '').trim();
  if (!value) throw new Error('Empty regex expression');

  if (!value.startsWith('/')) {
    return new RegExp(value, 'g');
  }

  for (let index = value.length - 1; index > 0; index -= 1) {
    if (value[index] === '/' && value[index - 1] !== '\\') {
      const body = value.slice(1, index);
      const flags = value.slice(index + 1) || 'g';
      return new RegExp(body, flags);
    }
  }

  throw new Error(`Invalid regex literal: ${value}`);
}

function loadDisplayRegexes() {
  const card = YAML.parse(readFileSync(indexPath, 'utf8'));
  const entries = card?.[EXT]?.[REGEX];
  assert.ok(Array.isArray(entries), 'index.yaml should contain regex entries');

  for (const requiredName of requiredCleanupNames) {
    assert.ok(entries.some(entry => entry?.[NAME] === requiredName && entry?.[ENABLED] === true), `${requiredName} should be enabled`);
  }

  return entries
    .filter(entry => entry?.[ENABLED] === true && entry?.[APPLIES_TO]?.[DISPLAY_ONLY] === true)
    .map(entry => ({
      name: entry[NAME],
      regex: parseRegexExpression(entry[FIND]),
      replacement: entry[REPLACE] == null ? '' : String(entry[REPLACE]),
    }));
}

function applyDisplayFormatting(text, regexes) {
  return regexes.reduce((current, entry) => current.replace(entry.regex, entry.replacement), text);
}

function stripThinkingBlocks(text) {
  let source = String(text || '')
    .replace(/<think[^>]*>[\s\S]*?<\/think>/gi, '')
    .replace(/<thinking[^>]*>[\s\S]*?<\/thinking>/gi, '')
    .replace(/<thought[^>]*>[\s\S]*?<\/thought>/gi, '')
    .replace(/<reasoning[^>]*>[\s\S]*?<\/reasoning>/gi, '')
    .replace(/<\/(?:think|thinking|thought|reasoning)>/gi, '');
  const openPattern = /<(?:think|thinking|thought|reasoning)\b[^>]*>/i;
  let openMatch = openPattern.exec(source);
  while (openMatch) {
    const prefix = source.slice(0, openMatch.index);
    const rest = source.slice(openMatch.index + openMatch[0].length);
    const protocolPatterns = [
      /<UpdateVariable\b[^>]*>[\s\S]*?<\/UpdateVariable>/i,
      /<choices\b[^>]*>[\s\S]*?<\/choices>/i,
      /<sp_status\b[^>]*>[\s\S]*?<\/sp_status>/i,
      /<sp_clue_deduce\b[^>]*>[\s\S]*?<\/sp_clue_deduce>/i,
      /<sp_choices\b[^>]*>[\s\S]*?<\/sp_choices>/i,
    ];
    let keepIndex = -1;
    for (const pattern of protocolPatterns) {
      const protocolMatch = pattern.exec(rest);
      if (protocolMatch && (keepIndex < 0 || protocolMatch.index < keepIndex)) keepIndex = protocolMatch.index;
    }
    source = keepIndex >= 0 ? `${prefix}${rest.slice(keepIndex)}` : prefix;
    openMatch = openPattern.exec(source);
  }
  return source
    .replace(/<\/?(?:think|thinking|thought|reasoning)[^>]*>/gi, '')
    .trim();
}

function stripRuntimeVariableNoise(text) {
  return String(text || '')
    .replace(/<status_current_variable\b[^>]*>[\s\S]*?<\/status_current_variable>/gi, '')
    .replace(/<status_current_variable\b[^>]*>[\s\S]*?<\/status/gi, '')
    .replace(/<runtime_state_summary\b[^>]*>[\s\S]*?<\/runtime_state_summary>/gi, '')
    .replace(/\{\{\s*format_message_variable::stat_data\s*\}\}/gi, '')
    .replace(/^\s*Variable reading notes:[^\r\n]*(?:\r?\n|$)/gim, '');
}

function extractVisibleNarrationText(text) {
  return stripRuntimeVariableNoise(stripThinkingBlocks(text))
    .replace(/<sp_status\b[^>]*>[\s\S]*?<\/sp_status>/gi, ' ')
    .replace(/<sp_clue_deduce\b[^>]*>[\s\S]*?<\/sp_clue_deduce>/gi, ' ')
    .replace(/<choices\b[^>]*>[\s\S]*?<\/choices>/gi, ' ')
    .replace(/<sp_choices\b[^>]*>[\s\S]*?<\/sp_choices>/gi, ' ')
    .replace(/<UpdateVariable\b[^>]*>[\s\S]*?<\/UpdateVariable>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function shouldRejectDestructiveSanitize(originalText, cleanedText) {
  const originalNarration = extractVisibleNarrationText(originalText);
  if (originalNarration.length < 200) return false;
  const cleanedNarration = extractVisibleNarrationText(cleanedText);
  return cleanedNarration.length < 80;
}

function parseTaggedChoices(text) {
  const match = stripThinkingBlocks(text).match(/<choices>\s*([\s\S]*?)\s*<\/choices>/i);
  assert.ok(match, 'raw message should retain tagged <choices>');
  return JSON.parse(match[1]);
}

function extractUpdateVariablePatchArrayText(inner) {
  const source = String(inner || '')
    .replace(/<Analysis\b[^>]*>[\s\S]*?<\/Analysis>/gi, '')
    .trim();
  const jsonPatchMatches = source.matchAll(/<JSONPatch\b[^>]*>\s*([\s\S]*?)\s*<\/JSONPatch>/gi);
  for (const jsonPatchMatch of jsonPatchMatches) {
    const arrayMatch = jsonPatchMatch[1].match(/(\[[\s\S]*\])/);
    if (arrayMatch) return arrayMatch[1];
  }
  const legacyArrayMatch = source.replace(/<\/?JSONPatch\b[^>]*>/gi, '').match(/(\[[\s\S]*\])/);
  return legacyArrayMatch ? legacyArrayMatch[1] : '';
}

function parseTaggedPatch(text, { expectJsonPatch = true } = {}) {
  const match = stripThinkingBlocks(text).match(/<UpdateVariable>\s*([\s\S]*?)\s*<\/UpdateVariable>/i);
  assert.ok(match, 'raw message should retain tagged <UpdateVariable>');
  if (expectJsonPatch) assert.ok(/<JSONPatch>/i.test(match[1]), 'raw UpdateVariable should use a nested <JSONPatch> tag');
  assert.equal(/<Analysis>/i.test(match[1]), false, 'raw UpdateVariable should not contain an Analysis tag');
  const payload = extractUpdateVariablePatchArrayText(match[1]);
  assert.ok(payload.startsWith('['), 'UpdateVariable JSONPatch payload should contain a JSON array');
  assert.ok(payload.endsWith(']'), 'UpdateVariable JSONPatch payload should end with a JSON array');
  return JSON.parse(payload);
}

function parseUpdateVariableActionSuggestionSample(text) {
  const match = text.match(/<UpdateVariable>\s*([\s\S]*?)\s*<\/UpdateVariable>/i);
  assert.ok(match, 'sample should contain UpdateVariable');
  const arrayText = extractUpdateVariablePatchArrayText(match[1]);
  assert.ok(arrayText, 'sample UpdateVariable should contain a JSON patch array');
  const patch = JSON.parse(arrayText);
  const actionPatch = patch.find(item => item.path === '/\u884c\u52a8\u5efa\u8bae');
  assert.ok(actionPatch, 'sample should carry /行动建议 in UpdateVariable');
  const choices = actionPatch.value.map(item => ({
    key: item['\u9009\u9879'],
    text: item['\u601d\u8def'],
    source: item['\u4e3b\u8981\u98ce\u9669'],
  }));
  if (!choices.some(item => item.key === 'D')) {
    choices.push({ key: 'D', text: '\u81ea\u5b9a\u4e49\u884c\u52a8', source: '\u81ea\u5b9a\u4e49\u884c\u52a8' });
  }
  return choices;
}

const storyToken = 'MFRS_OUTPUT_CLEAN_STORY_TOKEN';
const sample = [
  `${storyToken}: corridor narration stays visible.`,
  '【本轮摘要】',
  '位置：旧住宅走廊',
  '事件：敲门异常；观察中；鬼域未确认',
  '状态：存活；死亡风险低；复苏风险0',
  '线索：敲门声仍是唯一可见媒介',
  '资源：手电筒可用',
  '下一步：keep distance and verify the sound interval',
  '<sp_choices>',
  'Title: choices',
  'A: hold position <risk death="5" revive="0" source="sound">',
  'B: check the phone <risk death="8" revive="0" source="light">',
  'C: retreat along the wall <risk death="12" revive="0" source="movement">',
  'D: custom action <risk death="0" revive="0" source="custom">',
  '</sp_choices>',
  '<sp_status>',
  'Name: Lin Che',
  'Location: old residential corridor',
  'Status: alive',
  '</sp_status>',
  '<choices>',
  '[',
  '  { "key": "A", "text": "hold position", "risk": { "death": 5, "revive": 0, "source": "sound" } },',
  '  { "key": "B", "text": "check the phone", "risk": { "death": 8, "revive": 0, "source": "light" } },',
  '  { "key": "C", "text": "retreat along the wall", "risk": { "death": 12, "revive": 0, "source": "movement" } },',
  '  { "key": "D", "text": "custom action", "risk": { "death": 0, "revive": 0, "source": "custom" } }',
  ']',
  '</choices>',
  '{',
  '  "A": { "key": "A", "text": "hold position", "risk.death": 5, "risk.revive": 0, "risk.source": "sound" },',
  '  "B": { "key": "B", "text": "check the phone", "risk.death": 8, "risk.revive": 0, "risk.source": "light" },',
  '  "C": { "key": "C", "text": "retreat along the wall", "risk.death": 12, "risk.revive": 0, "risk.source": "movement" },',
  '  "D": { "key": "D", "text": "custom action", "risk.death": 0, "risk.revive": 0, "risk.source": "custom" }',
  '}',
  '[',
  '  { "op": "replace", "path": "/Name", "value": "Lin Che" },',
  '  { "op": "replace", "path": "/Location", "value": "old residential corridor" }',
  ']',
  '<JSONPatch>',
  '[',
  '  { "op": "replace", "path": "/standalone_path", "value": "should be hidden" }',
  ']',
  '</JSONPatch>',
  '<draft>',
  'La luz del tel\u00e9fono m\u00f3vil recorre el pasillo y revela una sombra pegada a la pared antes de que el personaje decida moverse.',
  '</draft>',
  '<pacing_rules>Keep pressure slow and do not resolve the anomaly too early.</pacing_rules>',
  '<\u4fee\u6539\u786e\u8ba4>Internal patch confirmed and should not be visible.</\u4fee\u6539\u786e\u8ba4>',
  'Lin Che wakes up in a corridor. The primary anomaly is a knocking sound, and the visible evidence points to a nearby door.',
  'La luz del tel\u00e9fono m\u00f3vil ilumina el pasillo, la pared mojada y el riesgo de acercarse a las opciones del estado.',
  '<UpdateVariable>',
  '<JSONPatch>',
  '[',
  '  { "op": "replace", "path": "/recent_action", "value": { "result": "watch corridor" } }',
  ']',
  '</JSONPatch>',
  '</UpdateVariable>',
].join('\n');

const parsedChoices = parseTaggedChoices(sample);
assert.equal(parsedChoices.length, 4);
assert.equal(parsedChoices[0].key, 'A');
assert.equal(parsedChoices[3].risk.death, 0);

const parsedPatch = parseTaggedPatch(sample);
assert.equal(parsedPatch.length, 1);
assert.equal(parsedPatch[0].op, 'replace');

const updateVariableOnlySample = [
  'Only markdown narration and variable patch are present.',
  '<UpdateVariable>',
  '<JSONPatch>',
  '[',
  '  { "op": "replace", "path": "/\u884c\u52a8\u5efa\u8bae", "value": [',
  '    { "\u9009\u9879": "A", "\u601d\u8def": "\u7559\u5728\u539f\u5730\u89c2\u5bdf", "\u4e3b\u8981\u98ce\u9669": "\u53ef\u80fd\u9519\u8fc7\u6551\u547d\u7a97\u53e3" },',
  '    { "\u9009\u9879": "B", "\u601d\u8def": "\u9760\u8fd1\u58f0\u97f3\u6e90\u5934", "\u4e3b\u8981\u98ce\u9669": "\u53ef\u80fd\u63a5\u89e6\u5389\u9b3c" },',
  '    { "\u9009\u9879": "C", "\u601d\u8def": "\u6cbf\u5899\u64a4\u79bb", "\u4e3b\u8981\u98ce\u9669": "\u53ef\u80fd\u88ab\u8ffd\u8e2a" }',
  '  ] }',
  ']',
  '</JSONPatch>',
  '</UpdateVariable>',
].join('\n');
const fallbackChoices = parseUpdateVariableActionSuggestionSample(updateVariableOnlySample);
assert.equal(fallbackChoices.length, 4, 'UpdateVariable-only action suggestions should deterministically yield A-D');
assert.equal(fallbackChoices[0].key, 'A');
assert.equal(fallbackChoices[3].text, '\u81ea\u5b9a\u4e49\u884c\u52a8');
const legacyDirectUpdateVariableSample = updateVariableOnlySample
  .replace(/<JSONPatch>\n/i, '')
  .replace(/\n<\/JSONPatch>/i, '');
const legacyDirectChoices = parseUpdateVariableActionSuggestionSample(legacyDirectUpdateVariableSample);
assert.equal(legacyDirectChoices.length, 4, 'legacy direct-array UpdateVariable action suggestions should remain compatible');
const legacyDirectPatch = parseTaggedPatch(legacyDirectUpdateVariableSample, { expectJsonPatch: false });
assert.equal(legacyDirectPatch[0].path, '/\u884c\u52a8\u5efa\u8bae', 'legacy direct-array UpdateVariable should still parse');

const thinkingPollutedProtocolSample = [
  '<think>',
  'I should output <choices> JSON block and <UpdateVariable> with full initialization.',
  '<choices>not json</choices>',
  '<UpdateVariable>not json</UpdateVariable>',
  '</think>',
  'Visible narration.',
  '<choices>',
  '[{ "key": "A", "text": "listen quietly", "risk": { "death": 2, "revive": 0, "source": "quiet" } }]',
  '</choices>',
  '<UpdateVariable>',
  '<JSONPatch>',
  '[{ "op": "replace", "path": "/\u884c\u52a8\u5efa\u8bae", "value": [] }]',
  '</JSONPatch>',
  '</UpdateVariable>',
].join('\n');
const thinkingChoices = parseTaggedChoices(thinkingPollutedProtocolSample);
assert.equal(thinkingChoices[0].key, 'A', 'thinking-block protocol mentions must not shadow real choices');
const thinkingPatch = parseTaggedPatch(thinkingPollutedProtocolSample);
assert.equal(thinkingPatch[0].path, '/\u884c\u52a8\u5efa\u8bae', 'thinking-block protocol mentions must not shadow real UpdateVariable');

const unclosedThinkingDirectOptionsSample = [
  '<think>The model forgot to close the thinking tag.',
  'I need to output <choices> JSON and <sp_choices> later.',
  '<UpdateVariable>',
  '[',
  '  { "key": "A", "text": "observe quietly", "risk": { "death": 2, "revive": 0, "source": "quiet observation" } },',
  '  { "key": "B", "text": "leave the corridor", "risk": { "death": 1, "revive": 0, "source": "retreat" } }',
  ']',
  '</UpdateVariable>',
].join('\n');
const unclosedThinkingCleaned = stripThinkingBlocks(unclosedThinkingDirectOptionsSample);
assert.equal(unclosedThinkingCleaned.startsWith('<UpdateVariable>'), true, 'unclosed thinking blocks should keep the first valid protocol payload');
assert.equal(unclosedThinkingCleaned.includes('The model forgot'), false, 'unclosed thinking prose should be removed from raw/display parsing');
assert.equal(unclosedThinkingCleaned.includes('<choices> JSON'), false, 'fake protocol mentions inside unclosed thinking should be removed');

const closedThinkingRuntimeNoiseSample = [
  '<think>',
  'The model thinks through protocol details and mentions <choices>not json</choices>.',
  '</think>',
  '<status_current_variable>',
  'Treat the current MVU stat_data as the binding world state.',
  '<runtime_state_summary>',
  '死亡风险: 0/100',
  '</runtime_state_summary>',
  '{{format_message_variable::stat_data}}',
  'Variable reading notes: internal schema guidance should not be visible.',
  '</status',
  `${storyToken}: 九点四十七分。走廊尽头传来三声沉闷敲击，正文必须保留。`,
  '空荡的教学楼像被抽干了人的气息，只剩日光灯在头顶发出细微的电流声。',
  '周明站在304教室门口，书包肩带勒着掌心，手机屏幕上的时间没有任何异常。',
  'The preserved narration continues with concrete scene detail, not protocol scaffolding, so the sanitizer must not collapse the reply into tags only.',
  'He can still smell chalk dust and damp concrete while the stairwell door waits in the dark, which is visible story text the player needs to read.',
  '<sp_status>',
  '姓名：周明',
  '</sp_status>',
  '<choices>',
  '[{ "key": "A", "text": "observe", "risk": { "death": 2, "revive": 0, "source": "corridor" } }]',
  '</choices>',
].join('\n');
const closedThinkingCleaned = stripRuntimeVariableNoise(stripThinkingBlocks(closedThinkingRuntimeNoiseSample));
assert.ok(closedThinkingCleaned.includes(storyToken), 'closed thinking cleanup should preserve post-thinking narration');
assert.equal(closedThinkingCleaned.includes('status_current_variable'), false, 'runtime variable scaffold should be removed');
assert.equal(closedThinkingCleaned.includes('runtime_state_summary'), false, 'runtime summary scaffold should be removed');
assert.equal(closedThinkingCleaned.includes('format_message_variable'), false, 'format variable macro should be removed');
assert.equal(closedThinkingCleaned.includes('The model thinks'), false, 'closed thinking prose should be removed');

const destructiveCleanedProtocolOnly = [
  '<sp_status>',
  'Name: 未知',
  '</sp_status>',
  '<choices>',
  '[{ "key": "A", "text": "observe", "risk": { "death": 2, "revive": 0, "source": "corridor" } }]',
  '</choices>',
].join('\n');
assert.equal(
  shouldRejectDestructiveSanitize(closedThinkingRuntimeNoiseSample, destructiveCleanedProtocolOnly),
  true,
  'raw sanitizer should reject protocol-only output when a complete reply contains visible narration',
);

const displayRegexes = loadDisplayRegexes();
const displayed = applyDisplayFormatting(sample, displayRegexes);
const statusAppSource = readFileSync(statusAppPath, 'utf8');
const visualizerSource = readFileSync(visualizerPath, 'utf8');
const dbFrontendSource = readFileSync(dbFrontendPath, 'utf8');
const themeScriptSource = readFileSync(themeScriptPath, 'utf8');
const hotfixSource = readFileSync(hotfixPath, 'utf8');
const vendorSource = readFileSync(vendorPath, 'utf8');
const legacyPlaceholder = `StatusPlaceHolderI${'m'}pl`;

assert.ok(displayed.includes(storyToken), 'normal narration should remain visible');
assert.ok(displayed.includes('【本轮摘要】'), 'current-turn summary should remain visible');
assert.equal(displayed.includes('sp-panel-choices'), false, 'legacy sp_choices panel should not render');
assert.equal(displayed.includes('sp-panel-status'), false, 'legacy sp_status panel should not render');
assert.equal(displayed.includes('<sp_choices>'), false, 'legacy sp_choices tag should be hidden in display output');
assert.equal(displayed.includes('<sp_status>'), false, 'legacy sp_status tag should be hidden in display output');
assert.equal(displayed.includes('Title: choices'), false, 'internal sp_choices title should be hidden');
assert.equal(displayed.includes('Name: Lin Che'), false, 'English Name label should be localized');
assert.equal(displayed.includes('Status: alive'), false, 'English Status label should be localized');
assert.equal(displayed.includes('Location: old residential corridor'), false, 'English Location label should be localized');
assert.equal(displayed.includes('姓名：Lin Che'), false, 'legacy localized sp_status field should not remain visible');
assert.equal(displayed.includes('状态：alive'), false, 'legacy localized sp_status field should not remain visible');
assert.equal(displayed.includes('所在位置：old residential corridor'), false, 'legacy localized sp_status field should not remain visible');
assert.equal(displayed.includes('<choices>'), false, 'tagged choices block should be hidden in display output');
assert.equal(displayed.includes('risk.death'), false, 'naked choices JSON should be hidden in display output');
assert.equal(displayed.includes('"op": "replace"'), false, 'naked JSON Patch should be hidden in display output');
assert.equal(displayed.includes('/standalone_path'), false, 'standalone JSONPatch tag should be hidden in display output');
assert.equal(displayed.includes('<draft>'), false, 'draft block should be hidden in display output');
assert.equal(displayed.includes('pacing_rules'), false, 'pacing rules block should be hidden in display output');
assert.equal(displayed.includes('\u4fee\u6539\u786e\u8ba4'), false, 'modification confirmation block should be hidden in display output');
assert.equal(displayed.includes('Lin Che wakes up in a corridor'), false, 'English debug summary should be hidden in display output');
assert.equal(displayed.includes('tel\u00e9fono m\u00f3vil'), false, 'foreign-language draft should be hidden in display output');
assert.equal(displayed.includes('<UpdateVariable>'), false, 'tagged variable update should be hidden in display output');
assert.equal(displayed.includes('<JSONPatch>'), false, 'tagged JSONPatch should be hidden in display output');
const openingDisplayed = applyDisplayFormatting('<sp_start>\nOPENING_START_TOKEN\n</sp_start>', displayRegexes);
assert.ok(openingDisplayed.includes('mfrs-welcome-root'), 'opening custom character panel should render');
assert.ok(openingDisplayed.includes('进入神秘复苏世界'), 'opening custom character submit button should remain visible');
assert.equal(openingDisplayed.includes('<sp_start>'), false, 'opening panel tag should be consumed by its renderer');
const inputPanelDisplayed = applyDisplayFormatting('<sp_input>\nDescribe a complex action.\n</sp_input>', displayRegexes);
assert.ok(inputPanelDisplayed.includes('复杂行动输入面板'), 'sp_input should render as the complex action input panel');
assert.ok(inputPanelDisplayed.includes('写入行动草稿'), 'sp_input action button should remain visible');
assert.ok(inputPanelDisplayed.includes('Describe a complex action.'), 'sp_input seed text should remain visible');
assert.equal(inputPanelDisplayed.includes('<sp_input>'), false, 'sp_input tag should be consumed by its renderer');
assert.ok(statusAppSource.includes('<sp_status>'), 'status bar should parse <sp_status> fallback');
assert.ok(statusAppSource.includes('spStatusKeyMap'), 'status bar should map English sp_status keys');
assert.ok(statusAppSource.includes('displayLocation'), 'status bar should display MVU/sp_status location fallback');
assert.ok(statusAppSource.includes('item.id'), 'status bar should accept id as a structured choices key alias');
assert.ok(statusAppSource.includes('parseUpdateVariableActionSuggestions'), 'status bar should parse /行动建议 from UpdateVariable when <choices> is missing');
assert.ok(statusAppSource.includes('function mirrorActionSuggestionsToMvu'), 'status bar should write parsed 行动建议 back to MVU as dual insurance');
assert.ok(statusAppSource.includes('mirrorActionSuggestionsToMvu(nextOptions)'), 'status bar watchEffect should call MVU action suggestion writeback');
assert.ok(statusAppSource.includes('function stripThinkingBlocks'), 'status bar should strip thinking blocks before parsing protocol tags');
assert.ok(statusAppSource.includes('extractUpdateVariableJsonPatchArrayText'), 'status bar should prefer nested JSONPatch inside UpdateVariable');
assert.ok(statusAppSource.includes('coerceDirectActionOptionsPatchArray'), 'status bar should coerce direct action-option arrays inside UpdateVariable');
assert.ok(statusAppSource.includes('mirrorCoreStateToDatabase'), 'status bar should mirror key 4.0 tables from MVU/sp_status when database is empty');
assert.ok(statusAppSource.includes('acu_mfrs_core_state_crud_mirror'), 'core state mirror should have a localStorage kill switch');
assert.ok(statusAppSource.includes('coreStateMirrorRetryTimer'), 'core state mirror should retry when MysteryDatabaseFrontend is injected late');
assert.ok(statusAppSource.includes('lastMirroredChoicesSignature = \'\''), 'choices mirror should clear its signature after a failed write so it can retry');
assert.ok(visualizerSource.includes('renderMfrsTableFallback'), 'database dashboard should provide MVU fallback for empty key tables');
assert.ok(visualizerSource.includes('数据库尚未落盘'), 'database dashboard fallback should label readonly non-persisted summaries');
assert.ok(visualizerSource.includes('tableHasEffectiveRows'), 'database dashboard should treat row_id-only tables as empty for fallback');
assert.equal(dbFrontendSource.includes("reloadDatabaseScriptForCurrentCard(hostWindow, 'api_missing')"), false, 'database frontend should not self-reclaim a missing API from a hardcoded legacy vendor URL');
assert.equal(dbFrontendSource.includes("reloadDatabaseScriptForCurrentCard(hostWindow, 'api_owner_mismatch')"), false, 'database frontend should not replace an active runtime API because of a stale marker mismatch');
assert.ok(dbFrontendSource.includes('function isUsableDatabaseApi'), 'database frontend should identify active usable runtime APIs before cleanup');
assert.ok(dbFrontendSource.includes('if (!isUsableDatabaseApi(target.AutoCardUpdaterAPI))'), 'database frontend reload cleanup should not delete an active usable AutoCardUpdaterAPI');
assert.ok(dbFrontendSource.includes('apiBeforeCleanup'), 'database frontend should snapshot the active API before running legacy frontend cleanup');
assert.ok(dbFrontendSource.includes('hostWindow.AutoCardUpdaterAPI = apiBeforeCleanup'), 'database frontend should restore the active API if legacy cleanup removed it');
assert.ok(themeScriptSource.includes('hideRawProtocolParagraphs'), 'theme script should hide raw protocol paragraphs after SillyTavern renders stripped tags');
assert.ok(themeScriptSource.includes('/行动建议'), 'theme script should hide visible UpdateVariable action suggestion JSON paths');
assert.ok(themeScriptSource.includes('MFRS_INLINE_PROTOCOL_TAG_PATTERN'), 'theme script should catch inline protocol tag names in natural-language paragraphs');
assert.ok(themeScriptSource.includes('choices|sp_[a-z_]+|mfrs_[a-z_]+|UpdateVariable|JSONPatch|Analysis'), 'theme script should hide natural-language mentions of internal protocol tag names');
assert.ok(hotfixSource.includes('(?!(?:sp_start|sp_input)\\b)'), 'hotfix runtime cleanup should preserve opening and input panels');
const inlineProtocolLeakSample = '行动建议：按 A/B/C/D 写入 4 行，风险与 <choices> 一致。';
assert.ok(/<\/?\s*(?:choices|sp_[a-z_]+|mfrs_[a-z_]+|UpdateVariable|JSONPatch|Analysis)\b/i.test(inlineProtocolLeakSample), 'inline display guard should catch natural-language <choices> leaks');
assert.ok(vendorSource.includes('sanitizeLatestAiMessageRawProtocol_ACU'), 'vendor should sanitize latest AI raw message before auto table update');
assert.ok(vendorSource.includes('sanitizeMfrsRawProtocolMessage_ACU'), 'vendor should expose raw protocol sanitizer');
assert.ok(vendorSource.includes('stripMfrsThinkingBlocks_ACU'), 'vendor should strip model thinking blocks before protocol parsing');
assert.ok(vendorSource.includes('hasUnclosedMfrsThinkingTag_ACU'), 'vendor should detect unclosed thinking blocks before destructive message saves');
assert.ok(vendorSource.includes('stripMfrsRuntimeVariableNoise_ACU'), 'vendor should remove leaked runtime variable scaffolds before saving raw');
assert.ok(vendorSource.includes('shouldRejectDestructiveMfrsRawSanitize_ACU'), 'vendor should reject sanitizer output that would eat visible narration');
assert.ok(vendorSource.includes('stripMfrsThinkingBlocks_ACU(content).match(/<UpdateVariable'), 'vendor UpdateVariable parser should ignore thinking-block tag mentions');
assert.ok(vendorSource.includes('stripMfrsRuntimeVariableNoise_ACU(stripMfrsThinkingBlocks_ACU(content))'), 'vendor raw sanitizer should remove thinking/runtime noise before protocol repair');
assert.ok(vendorSource.includes('allowUnclosedThinkingSalvage'), 'vendor should delay unclosed-thinking salvage until late stabilization retries');
assert.ok(vendorSource.includes('[8000, 15000]'), 'vendor should include late stabilization retries before salvaging unclosed thinking payloads');
assert.ok(vendorSource.includes('extractMfrsUpdateVariableJsonPatchArrayText_ACU'), 'vendor should prefer nested JSONPatch inside UpdateVariable');
assert.ok(vendorSource.includes('coerceMfrsDirectActionOptionsPatchArray_ACU'), 'vendor should coerce direct action-option arrays inside UpdateVariable');
assert.ok(vendorSource.includes('const protocolPatterns = ['), 'vendor should recover valid protocol payloads after unclosed thinking tags');
assert.ok(vendorSource.includes('buildMfrsChoicesProtocolPatch_ACU'), 'vendor should synthesize missing short tags/choices from UpdateVariable');
assert.ok(vendorSource.includes('repairMfrsTaggedChoicesBlock_ACU'), 'vendor should repair malformed existing <choices> JSON blocks');
assert.ok(vendorSource.includes('repairMfrsUpdateVariableBlock_ACU'), 'vendor should repair UpdateVariable payloads');
assert.ok(vendorSource.includes('<JSONPatch>'), 'vendor should normalize repaired UpdateVariable payloads to nested JSONPatch');
assert.ok(vendorSource.includes('repairMfrsChoicesOrder_ACU'), 'vendor should move <choices> before <sp_choices> when the model outputs the old order');
assert.ok(vendorSource.includes('sanitizeMfrsMessageObjectRawProtocol_ACU'), 'vendor should sanitize both message mes and swipe content');
assert.ok(vendorSource.includes('swipes[swipeId] = cleanedContent'), 'vendor sanitizer should write cleaned raw back to the active swipe');
assert.ok(vendorSource.includes('scheduleMfrsRawProtocolSanitizeRetries_ACU'), 'vendor should retry raw cleanup after streaming finalization');
assert.ok(vendorSource.includes('ACU_RUNTIME_STATE_KEY'), 'vendor should keep a host-window runtime singleton state for hot runtime injection');
assert.ok(vendorSource.includes('ACU_RUNTIME_INSTANCE_ID'), 'vendor should stamp every injected runtime instance with a unique id');
assert.ok(vendorSource.includes('isActiveRuntimeInstance_ACU()'), 'vendor event/timer callbacks should check the active runtime instance before mutating chat');
assert.ok(vendorSource.includes('registerRuntimeEventListener_ACU(SillyTavern_API_ACU.eventTypes.GENERATION_ENDED'), 'GENERATION_ENDED should use runtime-guarded registration');
assert.equal(
  vendorSource.includes('SillyTavern_API_ACU.eventSource.on(SillyTavern_API_ACU.eventTypes.GENERATION_ENDED'),
  false,
  'GENERATION_ENDED must not be registered with a bare listener that survives hot runtime reinjection',
);
assert.ok(vendorSource.includes('scheduleRuntimeTimeout_ACU(() =>'), 'late raw cleanup retries should be runtime-aware timers');
assert.ok(vendorSource.includes('buildMfrsChronicleFallbackPlan_ACU'), 'vendor should synthesize a valid chronicle row when MFRS chronicle remains empty');
assert.ok(vendorSource.includes('shouldApplyMfrsChronicleFallback_ACU'), 'vendor chronicle fallback should only run for the empty target chronicle table');
assert.ok(vendorSource.includes('buildMfrsClueFallbackPlan_ACU'), 'vendor should synthesize a valid clue row when MFRS clues remain empty');
assert.ok(vendorSource.includes('shouldApplyMfrsClueFallback_ACU'), 'vendor clue fallback should only run for the empty target clues table');
assert.ok(vendorSource.includes('buildMfrsCriticalCrudFallbackPlans_ACU'), 'vendor should merge local critical-table fallback plans before validation');
assert.ok(vendorSource.includes('skipCoveredPlans: true'), 'vendor should add missing local fallback plans before critical coverage validation');
assert.ok(vendorSource.includes('Critical local fallbacks must cross update-group boundaries'), 'critical local fallbacks should not be blocked by per-group targetSheetKeys');
assert.ok(vendorSource.includes('const hasOpeningSignal = hasMfrsOpeningFallbackSignals_ACU(sourceMessages, dynamicContent)'), 'clue fallback should be eligible from Task 20/opening signals even when protocol cleanup leaves little evidence text');
assert.ok(vendorSource.includes('function validateCriticalCrudPlanCoverage_ACU(plans, targetSheetKeys = null, data = currentJsonTableData_ACU)'), 'critical coverage validation should accept an explicit data snapshot');
assert.ok(vendorSource.includes('const missingKeys = getMissingCriticalCrudPlanSheetKeys_ACU(data)'), 'critical coverage validation should evaluate missing tables against the supplied snapshot');
assert.ok(vendorSource.includes('const validationData = await exportCrudPlanDataSnapshot_ACU(frontendApi)'), 'CRUD Plan validation should use a fresh frontend export before checking critical coverage');
assert.ok(vendorSource.includes('validateCriticalCrudPlanCoverage_ACU(plans, targetSheetKeys, validationData || currentJsonTableData_ACU)'), 'critical coverage validation should receive update-group scope and fresh exported data');
assert.ok(vendorSource.includes('scopedTargetKeys.has(sheetKey)'), 'non-local critical tables should only block within the current update group');
assert.ok(vendorSource.includes('isMfrsLocalFallbackCrudSheet_ACU(currentJsonTableData_ACU?.[k])'), 'critical local fallback tables should persist even when targetSheetKeys is narrower');
assert.ok(vendorSource.includes('tryApplyMfrsCrudPlanAiFailureFallback_ACU'), 'vendor should apply deterministic MFRS fallback when the CRUD Plan helper API fails before returning plans');
assert.ok(vendorSource.includes('shouldAttemptMfrsCrudPlanAiFailureFallback_ACU'), 'vendor should route empty/upstream CRUD Plan helper failures into deterministic fallback');
assert.ok(vendorSource.includes('const fallbackBaseData = await exportCrudPlanDataSnapshot_ACU(frontendApi)'), 'AI failure fallback should rebuild deterministic plans from a fresh frontend snapshot');
assert.ok(vendorSource.includes('syncCrudPlanDataSnapshotToRuntime_ACU(fallbackBaseData)'), 'AI failure fallback should sync fresh frontend data into runtime before applying local plans');
assert.ok(vendorSource.includes('forceOpeningSignal: true'), 'AI failure fallback should force all deterministic opening fallback tables after a scoped CRUD Plan helper failure');
assert.equal(vendorSource.includes("resetCrudPlanRuntimeStateToBatchSnapshot_ACU(progressContext, 'mfrs local fallback after CRUD Plan AI failure')"), false, 'AI failure fallback must preserve fresh partially-applied rows before filling gaps');
assert.ok(vendorSource.includes('const shouldForceOpeningFallback = hasMfrsOpeningFallbackSignals_ACU(sourceMessages, dynamicContent)'), 'opening fallback should derive a shared force flag from runtime evidence');
assert.ok(vendorSource.includes('targetSheetKeys: shouldForceOpeningFallback ? null : targetSheetKeys'), 'opening fallback should cross update-group boundaries when filling clean-opening core tables');
assert.ok(vendorSource.includes('forceOpeningSignal: shouldForceOpeningFallback'), 'preflight/post-apply fallback should force deterministic opening rows when evidence is present');
assert.ok(vendorSource.includes('getCrudPlanEffectiveRowCount_ACU(afterData, sheetKey) > 0'), 'fallback diff detection should treat fresh rows as modified even if ordinary diff tracking misses them');
assert.ok(vendorSource.includes('buildMfrsGlobalStateFallbackPlan_ACU'), 'vendor should locally initialize global_state for clean MFRS opening fallback');
assert.ok(vendorSource.includes('buildMfrsPlayerStateFallbackPlan_ACU'), 'vendor should locally initialize player_state for clean MFRS opening fallback');
assert.ok(vendorSource.includes('buildMfrsSupernaturalEventFallbackPlan_ACU'), 'vendor should locally initialize supernatural_events for clean MFRS opening fallback');
assert.ok(vendorSource.includes('buildMfrsActionSuggestionFallbackPlans_ACU'), 'vendor should locally mirror A/B/C/D action suggestions after CRUD Plan helper failure');
assert.ok(vendorSource.includes('buildMfrsCheckSuggestionFallbackPlans_ACU'), 'vendor should locally initialize check suggestions after CRUD Plan helper failure');
assert.ok(vendorSource.includes('targetSheetKeys: null'), 'CRUD Plan helper failure fallback should persist all deterministic MFRS fallback tables, not just the failed update group');
assert.ok(vendorSource.includes('事件纪要/chronicle'), 'CRUD Plan prompt should include chronicle as a 4.0 key table');
assert.ok(vendorSource.includes("'chronicle'"), 'MFRS critical CRUD tables should include the chronicle SQL table');
assert.ok(vendorSource.includes("'clues'"), 'MFRS critical CRUD tables should keep the clues SQL table');
assert.ok(vendorSource.includes('myactivity\\.google\\.com\\/product\\/gemini'), 'vendor sanitizer should remove Gemini activity prompt lines');
assert.equal(vendorSource.includes(legacyPlaceholder), false, 'vendor source must not contain the complete legacy placeholder literal');
assert.ok(vendorSource.includes('StatusPlaceHolderI[m]pl'), 'vendor should match legacy placeholder via split regex only');

console.log('verify-output-cleaning-regressions: passed');
