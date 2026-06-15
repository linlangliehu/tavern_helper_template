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

function parseTaggedChoices(text) {
  const match = text.match(/<choices>\s*([\s\S]*?)\s*<\/choices>/i);
  assert.ok(match, 'raw message should retain tagged <choices>');
  return JSON.parse(match[1]);
}

function parseTaggedPatch(text) {
  const match = text.match(/<UpdateVariable>[\s\S]*?<JSONPatch>\s*([\s\S]*?)\s*<\/JSONPatch>[\s\S]*?<\/UpdateVariable>/i);
  assert.ok(match, 'raw message should retain tagged <UpdateVariable>/<JSONPatch>');
  return JSON.parse(match[1]);
}

const storyToken = 'MFRS_OUTPUT_CLEAN_STORY_TOKEN';
const sample = [
  `${storyToken}: corridor narration stays visible.`,
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
  '<Analysis>Lin Che stays still and watches the corridor.</Analysis>',
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

const displayRegexes = loadDisplayRegexes();
const displayed = applyDisplayFormatting(sample, displayRegexes);
const statusAppSource = readFileSync(statusAppPath, 'utf8');
const visualizerSource = readFileSync(visualizerPath, 'utf8');

assert.ok(displayed.includes(storyToken), 'normal narration should remain visible');
assert.ok(displayed.includes('sp-panel-choices'), 'sp_choices panel should still render');
assert.ok(displayed.includes('sp-panel-status'), 'sp_status panel should still render');
assert.equal(displayed.includes('Title: choices'), false, 'internal sp_choices title should be hidden');
assert.equal(displayed.includes('Name: Lin Che'), false, 'English Name label should be localized');
assert.equal(displayed.includes('Status: alive'), false, 'English Status label should be localized');
assert.equal(displayed.includes('Location: old residential corridor'), false, 'English Location label should be localized');
assert.ok(displayed.includes('姓名：Lin Che'), 'localized Name field should remain visible');
assert.ok(displayed.includes('状态：alive'), 'localized Status field should remain visible');
assert.ok(displayed.includes('所在位置：old residential corridor'), 'localized Location field should remain visible');
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
assert.ok(statusAppSource.includes('<sp_status>'), 'status bar should parse <sp_status> fallback');
assert.ok(statusAppSource.includes('spStatusKeyMap'), 'status bar should map English sp_status keys');
assert.ok(statusAppSource.includes('displayLocation'), 'status bar should display MVU/sp_status location fallback');
assert.ok(statusAppSource.includes('mirrorCoreStateToDatabase'), 'status bar should mirror key 4.0 tables from MVU/sp_status when database is empty');
assert.ok(statusAppSource.includes('acu_mfrs_core_state_crud_mirror'), 'core state mirror should have a localStorage kill switch');
assert.ok(visualizerSource.includes('renderMfrsTableFallback'), 'database dashboard should provide MVU fallback for empty key tables');
assert.ok(visualizerSource.includes('数据库尚未落盘'), 'database dashboard fallback should label readonly non-persisted summaries');
assert.ok(visualizerSource.includes('tableHasEffectiveRows'), 'database dashboard should treat row_id-only tables as empty for fallback');

console.log('verify-output-cleaning-regressions: passed');
