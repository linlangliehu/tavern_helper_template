#!/usr/bin/env node

console.error('[prepare-mfrs-beta-local-test] 已废弃：旧 5500 / production build / β 卡流程不再可用。');
console.error('[prepare-mfrs-beta-local-test] 当前开发请按 PROJECT_FLOW.md：F5 → watch → 固定 5510 → 8000 真页验收。');
console.error('[prepare-mfrs-beta-local-test] 需要开发卡时运行：node tavern_sync.mjs bundle 神秘复苏模拟器');
process.exitCode = 1;
