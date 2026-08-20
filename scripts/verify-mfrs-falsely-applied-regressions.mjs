/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const hotfixDir = join(repoRoot, 'src', '神秘复苏模拟器', '脚本', 'hotfix-generation-ended-listeners');
const rawWriterPath = join(hotfixDir, 'raw-status-writer.ts');
const controllerPath = join(hotfixDir, 'falsely-applied-controller.ts');
const hotfixPath = join(hotfixDir, 'index.ts');

function readText(path) {
  return readFileSync(path, 'utf8');
}

function loadStandaloneTsModule(path) {
  const transpiled = transpileModule(readText(path), {
    compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
    fileName: path,
  }).outputText;
  const sandbox = vm.createContext({ console });
  const module = { exports: {} };
  const wrapper = vm.runInContext(
    `(function (module, exports, require) {\n${transpiled}\n})`,
    sandbox,
    { filename: path },
  );
  wrapper(module, module.exports, specifier => {
    throw new Error(`standalone test module must not import ${specifier}`);
  });
  return module.exports;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function wrapProtocol(patches) {
  return ['<UpdateVariable>', '<JSONPatch>', JSON.stringify(patches), '</JSONPatch>', '</UpdateVariable>'].join('\n');
}

const { applyRawProtocolToMvuData, isFalselyAppliedStat } = loadStandaloneTsModule(rawWriterPath);
const {
  createDebouncedSingleFlight,
  createObjectKeyedSingleFlight,
  runProtocolApplicationController,
  selectFalselyAppliedRepairIndexes,
} = loadStandaloneTsModule(controllerPath);

const zeroData = {
  stat_data: {
    风险值: 0,
    厉鬼复苏程度: 0,
    驭鬼者状态: { 总复苏风险: 0 },
  },
};

// A. 合法归零不得被当成 schema 回退。
for (const [label, patches] of [
  ['negative delta reaches zero', [{ op: 'delta', path: '/风险值', value: -10 }]],
  [
    'positive and negative deltas net to zero',
    [
      { op: 'delta', path: '/风险值', value: 10 },
      { op: 'delta', path: '/风险值', value: -10 },
    ],
  ],
  [
    'later replace explicitly returns to zero',
    [
      { op: 'delta', path: '/风险值', value: 10 },
      { op: 'replace', path: '/风险值', value: 0 },
    ],
  ],
]) {
  assert.equal(
    isFalselyAppliedStat(clone(zeroData), wrapProtocol(patches)),
    false,
    `${label}: a legitimate zero must not replay the protocol`,
  );
}

// B. 真正从 schema 初值回退时必须命中，且遵守 patch 原顺序。
for (const [path, statData] of [
  ['/风险值', { 风险值: 0 }],
  ['/厉鬼复苏程度', { 厉鬼复苏程度: 0 }],
  ['/驭鬼者状态/总复苏风险', { 驭鬼者状态: { 总复苏风险: 0 } }],
]) {
  assert.equal(
    isFalselyAppliedStat({ stat_data: statData }, wrapProtocol([{ op: 'delta', path, value: 18 }])),
    true,
    `${path}: positive expected value with current schema default must be repaired`,
  );
}
assert.equal(
  isFalselyAppliedStat(
    clone(zeroData),
    wrapProtocol([
      { op: 'replace', path: '/风险值', value: 0 },
      { op: 'delta', path: '/风险值', value: 18 },
    ]),
  ),
  true,
  'ordered replace-then-delta must still detect the expected positive value',
);
assert.equal(
  isFalselyAppliedStat(
    { stat_data: { 风险值: 18 } },
    wrapProtocol([{ op: 'delta', path: '/风险值', value: 18 }]),
  ),
  false,
  'an already-applied positive value must not replay',
);

async function runFixture({ raw, initialData, persistResults }) {
  let data = clone(initialData);
  let marker = true;
  let writeCount = 0;
  let persistCount = 0;

  async function process() {
    const markerMatches = marker;
    const falselyApplied = markerMatches && isFalselyAppliedStat(data, raw);
    return runProtocolApplicationController({
      markerMatches,
      falselyApplied,
      clearMarker: () => {
        marker = false;
      },
      write: async () => {
        writeCount += 1;
        const result = applyRawProtocolToMvuData(data, raw);
        data = clone(result.data);
        return { verified: result.applied > 0 };
      },
      markApplied: () => {
        marker = true;
      },
      persistMarker: async () => {
        const result = persistResults[Math.min(persistCount, persistResults.length - 1)];
        persistCount += 1;
        return result;
      },
    });
  }

  return {
    process,
    snapshot: () => ({ data: clone(data), marker, writeCount, persistCount }),
  };
}

// C. 真回退只重放一次；第二次命中 marker 后只能保存、不能把 +18 变成 +36。
const replayFixture = await runFixture({
  raw: wrapProtocol([
    { op: 'delta', path: '/风险值', value: 18 },
    { op: 'replace', path: '/所在位置', value: '第七中学门外' },
  ]),
  initialData: zeroData,
  persistResults: [true, true],
});
const firstReplay = await replayFixture.process();
assert.equal(firstReplay.action, 'write');
assert.equal(firstReplay.needsRetry, false);
assert.deepEqual(replayFixture.snapshot(), {
  data: {
    stat_data: {
      风险值: 18,
      厉鬼复苏程度: 0,
      驭鬼者状态: { 总复苏风险: 0 },
      所在位置: '第七中学门外',
    },
  },
  marker: true,
  writeCount: 1,
  persistCount: 1,
});
const duplicateReplay = await replayFixture.process();
assert.equal(duplicateReplay.action, 'skip');
assert.equal(duplicateReplay.needsRetry, false);
assert.equal(replayFixture.snapshot().data.stat_data.风险值, 18);
assert.equal(replayFixture.snapshot().writeCount, 1, 'duplicate processing must not invoke the writer again');

// D. marker 第一次持久化失败时，下一次只重试保存 marker，不得重放 delta。
const persistenceFixture = await runFixture({
  raw: wrapProtocol([{ op: 'delta', path: '/风险值', value: 18 }]),
  initialData: zeroData,
  persistResults: [false, true, true],
});
const failedPersist = await persistenceFixture.process();
assert.equal(failedPersist.action, 'write');
assert.equal(failedPersist.needsRetry, true);
assert.deepEqual(persistenceFixture.snapshot(), {
  data: {
    stat_data: {
      风险值: 18,
      厉鬼复苏程度: 0,
      驭鬼者状态: { 总复苏风险: 0 },
    },
  },
  marker: true,
  writeCount: 1,
  persistCount: 1,
});
const successfulRetry = await persistenceFixture.process();
assert.equal(successfulRetry.action, 'skip');
assert.equal(successfulRetry.needsRetry, false);
assert.equal(persistenceFixture.snapshot().writeCount, 1);
assert.equal(persistenceFixture.snapshot().data.stat_data.风险值, 18);
await persistenceFixture.process();
assert.equal(persistenceFixture.snapshot().writeCount, 1, 'later duplicate events must remain idempotent');

// E. 负 delta 合法归零在 marker 命中时只能 skip，不能调用 writer。
const legitimateZeroFixture = await runFixture({
  raw: wrapProtocol([{ op: 'delta', path: '/风险值', value: -10 }]),
  initialData: zeroData,
  persistResults: [true],
});
const legitimateZero = await legitimateZeroFixture.process();
assert.equal(legitimateZero.action, 'skip');
assert.equal(legitimateZeroFixture.snapshot().writeCount, 0);
assert.equal(legitimateZeroFixture.snapshot().data.stat_data.风险值, 0);

// F. 最后一条 AI 楼只有在它确实处于生成态时跳过；稳定聊天必须包含最后 AI 楼。
const floorShape = [{ is_user: false }, { is_user: true }, { is_user: false }];
assert.deepEqual(
  clone(selectFalselyAppliedRepairIndexes(floorShape, 2)),
  [0],
  'active generation floor must be excluded from history repair',
);
assert.deepEqual(
  clone(selectFalselyAppliedRepairIndexes(floorShape, -1)),
  [0, 2],
  'stable chat must include its final AI floor in history repair',
);

// G. 重复 CHAT_CHANGED 先 debounce，扫描进行中再次触发时共享同一个 single-flight。
let nextTimer = 1;
const timers = new Map();
let scanCount = 0;
let releaseScan;
const firstScanBlocked = new Promise(resolve => {
  releaseScan = resolve;
});
const scheduler = createDebouncedSingleFlight({
  task: async () => {
    scanCount += 1;
    if (scanCount === 1) await firstScanBlocked;
  },
  delay: 800,
  schedule: callback => {
    const id = nextTimer++;
    timers.set(id, callback);
    return id;
  },
  cancel: id => timers.delete(id),
  onError: error => {
    throw error;
  },
});

scheduler.trigger();
scheduler.trigger();
assert.equal(timers.size, 1, 'back-to-back CHAT_CHANGED events must debounce to one timer');
const firstTimer = [...timers.entries()][0];
timers.delete(firstTimer[0]);
firstTimer[1]();
await Promise.resolve();
assert.equal(scanCount, 1);

scheduler.trigger();
const overlappingTimer = [...timers.entries()][0];
timers.delete(overlappingTimer[0]);
overlappingTimer[1]();
await Promise.resolve();
assert.equal(scanCount, 1, 'a second timer firing during repair must not overlap the in-flight scan');
releaseScan();
await new Promise(resolve => setImmediate(resolve));
assert.equal(scanCount, 2, 'a CHAT_CHANGED received during repair must run one trailing scan for the latest chat');

scheduler.trigger();
const laterTimer = [...timers.entries()][0];
timers.delete(laterTimer[0]);
laterTimer[1]();
await new Promise(resolve => setImmediate(resolve));
assert.equal(scanCount, 3, 'a later CHAT_CHANGED after completion may start a fresh scan');

// H. 同一 message + applicationKey 的并发协议应用必须共用一次事务。
const runByMessageAndProtocol = createObjectKeyedSingleFlight();
const messageIdentity = {};
let applicationCount = 0;
let releaseApplication;
const applicationBlocked = new Promise(resolve => {
  releaseApplication = resolve;
});
const order = [];
const firstApplication = runByMessageAndProtocol(messageIdentity, '0:abc', async () => {
  applicationCount += 1;
  order.push('A:start');
  await applicationBlocked;
  order.push('A:end');
  return false;
});
const duplicateApplication = runByMessageAndProtocol(messageIdentity, '0:abc', async () => {
  applicationCount += 1;
  return false;
});
const switchedSwipeApplication = runByMessageAndProtocol(messageIdentity, '1:def', async () => {
  applicationCount += 1;
  order.push('B:start');
  return false;
});
assert.equal(firstApplication, duplicateApplication, 'duplicate protocol application must reuse the same promise');
await new Promise(resolve => setImmediate(resolve));
assert.equal(applicationCount, 1);
assert.deepEqual(order, ['A:start'], 'a different swipe must queue behind the current message transaction');
releaseApplication();
await firstApplication;
await switchedSwipeApplication;
assert.equal(applicationCount, 2);
assert.deepEqual(order, ['A:start', 'A:end', 'B:start'], 'different application keys on one message must run serially');

// I. 生产入口必须接入控制器、精确 application key、生成态末楼保护和 retry 传播。
const hotfixSource = readText(hotfixPath);
assert.match(
  hotfixSource,
  /runProtocolApplicationController\(\{[\s\S]*?markerMatches,[\s\S]*?falselyApplied,[\s\S]*?persistMarker:/,
  'production hotfix must route marker/write decisions through the tested controller',
);
assert.match(
  hotfixSource,
  /message\.extra\[RAW_PROTOCOL_APPLIED_HASH_KEY\] !== applicationKey/,
  'history repair must ignore stale markers from a different swipe/protocol',
);
assert.match(
  hotfixSource,
  /if \(isSendUiStuck\(hostWindow\)\)[\s\S]*?activeGenerationMessageIndex/,
  'only an actively generating final AI floor may be skipped',
);
assert.match(
  hotfixSource,
  /const needsRetry = await parseAndWriteMvuMessage\(index\);[\s\S]*?scheduleMvuWriteBackRetries\(index\)/,
  'history repair must propagate marker/write failures to retry scheduling',
);
assert.match(
  hotfixSource,
  /const chatChangedRepair = createDebouncedSingleFlight\([\s\S]*?chatChangedRepair\.trigger\(\)/,
  'CHAT_CHANGED must use the tested debounce and single-flight scheduler',
);
assert.match(
  hotfixSource,
  /runProtocolApplicationSingleFlight\(message, applicationKey, async \(\) =>/,
  'same message and application key must share one protocol application transaction',
);
assert.match(
  hotfixSource,
  /const expectedSwipeId = getMessageSwipeId\(message\);[\s\S]*?getMessageSwipeId\(message\) !== expectedSwipeId[\s\S]*?getProtocolApplicationKey\(message, latestNormalized\.message\) === applicationKey/,
  'protocol transactions must stop when the active swipe or raw protocol changes',
);
assert.match(
  hotfixSource,
  /persisted && hasSameStatData\(readMessageVariablesDirectly\(chat, messageIndex, expectedSwipeId\), data\)/,
  'a persisted direct write must not be retried only because Mvu read-through cache is stale',
);
assert.match(
  hotfixSource,
  /if \(needsRetry[^)]*\)\s*\{\s*scheduleMvuWriteBackRetries\([\s\S]*?attempt \+ 1/,
  'writeback retries must be sequential and stop after success',
);
assert.match(
  hotfixSource,
  /const needsRetry = await parseAndWriteMvuMessage\(index[^)]*\);[\s\S]{0,160}?if \(needsRetry\) scheduleMvuWriteBackRetries\(index/,
  'recent raw recovery must propagate marker/write failures to sequential retry scheduling',
);
assert.match(
  hotfixSource,
  /for \(const timer of hotfixRetryTimers\) window\.clearTimeout\(timer\);\s*hotfixRetryTimers\.clear\(\);/,
  'cleanup must cancel all queued writeback and generation retries',
);
assert.match(
  hotfixSource,
  /hotfixEpoch \+= 1;[\s\S]*?clearTimeout\(installScanTimer\)[\s\S]*?chatChangedRepair\.cancel\(\)/,
  'cleanup must invalidate in-flight scans and cancel the pending install scan',
);

console.log('verify-mfrs-falsely-applied-regressions: passed');
