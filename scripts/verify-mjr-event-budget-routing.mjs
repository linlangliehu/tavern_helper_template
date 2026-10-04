/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const helperPath = join(root, 'src', '魔法禁书目录模拟器', '脚本', '界面美化', 'event-budget.ts');
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

const { routeMfrsEventPackageBudget } = module.exports;
const event = content => ({ content, ignoreBudget: false });
const unrelated = { name: '变量更新规则', content: '---\n变量更新规则:', ignoreBudget: false };
const entries = [
  unrelated,
  event('【事件包：死灵术师】\n事件包ID：NECROMANCER\n正文'),
  event('【事件包：天使坠落】\n事件包ID：ANGEL-FALL\n正文'),
];

const selected = routeMfrsEventPackageBudget(entries, 'NECROMANCER');
assert.equal(selected.length, entries.length);
assert.strictEqual(selected[0], unrelated, 'non-event entries must remain untouched');
assert.equal(selected[1].ignoreBudget, true);
assert.equal(selected[2].ignoreBudget, false);

const cleared = routeMfrsEventPackageBudget(selected, null);
assert.equal(cleared[1].ignoreBudget, false);
assert.equal(cleared[2].ignoreBudget, false);

const unchanged = routeMfrsEventPackageBudget(cleared, 'UNKNOWN');
assert.equal(unchanged[1].ignoreBudget, false);
assert.equal(unchanged[2].ignoreBudget, false);

const eventDir = join(root, 'src', '魔法禁书目录模拟器', '世界书', '剧情事件');
const sourceEventFiles = readdirSync(eventDir, { recursive: true, withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.endsWith('.txt'))
  .map(entry => join(entry.parentPath ?? eventDir, entry.name));
assert.ok(sourceEventFiles.length > 0, 'event source files must exist');
const sourceEvents = sourceEventFiles.map(file => event(readFileSync(file, 'utf8')));
const sourceRouted = routeMfrsEventPackageBudget(sourceEvents, 'NECROMANCER');
assert.equal(
  sourceRouted.filter(entry => entry.ignoreBudget).length,
  sourceEvents.some(entry => entry.content.includes('事件包ID：NECROMANCER')) ? 1 : 0,
  'the real event header layout must route exactly one package',
);

console.log('MJR_EVENT_BUDGET_ROUTING_OK');
