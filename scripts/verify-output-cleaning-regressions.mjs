/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const indexPath = join(repoRoot, 'src', '\u795e\u79d8\u590d\u82cf\u6a21\u62df\u5668', 'index.yaml');

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
  '[\u663e\u793a]\u9690\u85cf\u82f1\u6587\u8c03\u8bd5\u6458\u8981',
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
  'Lin Che wakes up in a corridor. The primary anomaly is a knocking sound, and the visible evidence points to a nearby door.',
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

assert.ok(displayed.includes(storyToken), 'normal narration should remain visible');
assert.ok(displayed.includes('sp-panel-choices'), 'sp_choices panel should still render');
assert.ok(displayed.includes('sp-panel-status'), 'sp_status panel should still render');
assert.equal(displayed.includes('<choices>'), false, 'tagged choices block should be hidden in display output');
assert.equal(displayed.includes('risk.death'), false, 'naked choices JSON should be hidden in display output');
assert.equal(displayed.includes('"op": "replace"'), false, 'naked JSON Patch should be hidden in display output');
assert.equal(displayed.includes('/standalone_path'), false, 'standalone JSONPatch tag should be hidden in display output');
assert.equal(displayed.includes('Lin Che wakes up in a corridor'), false, 'English debug summary should be hidden in display output');
assert.equal(displayed.includes('<UpdateVariable>'), false, 'tagged variable update should be hidden in display output');
assert.equal(displayed.includes('<JSONPatch>'), false, 'tagged JSONPatch should be hidden in display output');

console.log('verify-output-cleaning-regressions: passed');
