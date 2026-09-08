import fs from 'node:fs';
import path from 'node:path';

const planningDirectory = '.planning/magic-opening-restructure-20260908';
const worldbookPlanningDirectory = '.planning/magic-worldbook-implementation-20260908';
const phase2Path = path.join(planningDirectory, 'phase2-opening-ids.json');
const phase5Path = path.join(planningDirectory, 'phase5-complete-openings.json');
const schemaPath = 'src/魔法禁书目录模拟器/schema.json';
const initializationJsonPath = path.join(planningDirectory, 'phase6-initialization.json');
const initializationMarkdownPath = path.join(planningDirectory, 'phase6-initialization.md');
const schemaExtensionProposalPath = path.join(planningDirectory, 'phase6-schema-extension-proposal.json');

const phase2 = JSON.parse(fs.readFileSync(phase2Path, 'utf8'));
const phase5 = JSON.parse(fs.readFileSync(phase5Path, 'utf8'));
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

const taxonomyMaps = {
  timeLayers: new Map(phase2.taxonomy.timeLayers.map((item) => [item.id, item])),
  workLines: new Map(phase2.taxonomy.workLines.map((item) => [item.id, item])),
  stages: new Map(phase2.taxonomy.stages.map((item) => [item.id, item])),
};

const packageRecords = new Map();
const packageSources = new Map();
for (const fileName of fs.readdirSync(worldbookPlanningDirectory)) {
  if (!fileName.startsWith('worker-') || !fileName.endsWith('.json')) continue;
  const manifest = JSON.parse(fs.readFileSync(path.join(worldbookPlanningDirectory, fileName), 'utf8'));
  for (const record of manifest.files || []) {
    if (!record.packageId) continue;
    if (packageRecords.has(record.packageId)) {
      throw new Error(`Duplicate package manifest: ${record.packageId}`);
    }
    packageRecords.set(record.packageId, record);
    packageSources.set(record.packageId, fs.readFileSync(record.path, 'utf8'));
  }
}

const slotNodeOverrides = {
  'OP-P01-02': {
    currentNodeId: 'TALENT-WORKSHOP-05',
    nodeProgressStrategy: 'explicit-node-override',
    reason: '控制权变化对应“夺取才人工房”节点，保留前一至四节点为已完成。',
  },
  'OP-O01-02': {
    currentNodeId: 'FANTASY-HAND-02',
    nodeProgressStrategy: 'narrative-window-override',
    reason: '主体槽从音频传闻与使用者异常接入，不把七月上旬旧入口伪装成整案收束。',
  },
  'OP-O01-03': {
    currentNodeId: 'FANTASY-HAND-03',
    nodeProgressStrategy: 'narrative-window-override',
    reason: '收束槽对应使用者倒下与脑波关联；此槽不宣称幻想御手全案已经结束。',
  },
  'OP-O11-02': {
    currentNodeId: 'AUGUST-31-05',
    availableEntryNodeIds: ['AUGUST-31-01', 'AUGUST-31-05', 'AUGUST-31-07'],
    nodeProgressStrategy: 'branching-multi-entry',
    reason: '三线并行存在三个入口；默认艾扎力线，最后之作线不因选择本槽自动完成。',
  },
  'OP-G07-02': {
    currentNodeId: 'GENESIS-07-02',
    nodeProgressStrategy: 'date-window-override',
    reason: '1月2日早餐后进入城市内领事馆节点。',
  },
  'OP-G07-03': {
    currentNodeId: 'GENESIS-07-05',
    nodeProgressStrategy: 'date-window-override',
    reason: '1月3日从花园斩击节点开始，保留1月1日至2日节点为已完成。',
  },
  'OP-G10-02': {
    currentNodeId: 'GENESIS-10-07',
    nodeProgressStrategy: 'time-window-override',
    reason: '23:58附近对应生命状态确认节点，前一至六节点视为已完成。',
  },
  'OP-G14-01': {
    currentNodeId: 'GENESIS-14-07',
    nodeProgressStrategy: 'time-window-override',
    reason: '1月9日早晨对应清晨照护与归路节点，不回到午夜夺体节点。',
  },
  'OP-G14-02': {
    currentNodeId: 'GENESIS-14-08',
    nodeProgressStrategy: 'time-window-override',
    reason: '08:30附近对应新学期节点，附尾节点保留为未发生。',
  },
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseNodeDetails(source, nodeId) {
  const pattern = new RegExp(
    `^${escapeRegExp(nodeId)}\\s+([^\\n]+)([\\s\\S]*?)(?=\\n[A-Z][A-Z0-9-]+\\s|\\n== |(?![\\s\\S]))`,
    'm',
  );
  const match = source.match(pattern);
  if (!match) return null;
  const block = match[2];
  return {
    title: match[1].trim(),
    entryCondition: block.match(/进入条件：([^\n]+)/)?.[1]?.trim() ?? null,
    sceneGoal: block.match(/场景目标：([^\n]+)/)?.[1]?.trim() ?? null,
    playerActions: block.match(/玩家行动：([^\n]+)/)?.[1]?.trim() ?? null,
  };
}

function determineDatePrecision(displayDate) {
  if (displayDate === '未定日') return 'undated';
  if (displayDate.includes('起') || displayDate.includes('之后')) return 'range';
  if (displayDate.includes('次期新学期')) return 'relative';
  if (displayDate.includes('附近') || displayDate.includes('某日')) return 'approximate';
  if (/[初末]($|[年月日期])|上旬|中旬|下旬/.test(displayDate)) return 'approximate';
  return 'exact';
}

function determineTimeOfDay(displayDate) {
  if (displayDate.includes('23:58附近')) return '23:58附近';
  if (displayDate.includes('08:30附近')) return '08:30附近';
  if (displayDate.includes('早晨')) return '早晨';
  return '未定';
}

function determineNarrativePhase(packageNodeIds, currentNodeId) {
  const currentIndex = packageNodeIds.indexOf(currentNodeId);
  if (currentIndex < 0) return '遭遇';
  if (currentIndex === packageNodeIds.length - 1) return '终局';
  const progress = currentIndex / Math.max(packageNodeIds.length - 1, 1);
  if (progress >= 0.7) return '高潮';
  if (progress >= 0.4) return '发展';
  return '遭遇';
}

function buildInitializationRecord(opening) {
  const timeLayer = taxonomyMaps.timeLayers.get(opening.timeLayerId);
  const workLine = taxonomyMaps.workLines.get(opening.workLineId);
  const stage = taxonomyMaps.stages.get(opening.stageId);
  if (!timeLayer || !workLine || !stage) {
    throw new Error(`Missing taxonomy for ${opening.openingId}`);
  }

  const packageRecord = opening.primaryPackageId ? packageRecords.get(opening.primaryPackageId) : null;
  if (opening.primaryPackageId && !packageRecord) {
    throw new Error(`Missing package record: ${opening.primaryPackageId}`);
  }

  const relatedPackageReferenceOnly = opening.coverage === 'reference-only' && Boolean(packageRecord);
  const noPackageReferenceOnly = opening.coverage === 'reference-only' && !packageRecord;
  const nodeChain = Boolean(packageRecord) && !relatedPackageReferenceOnly && !noPackageReferenceOnly;
  const initializationMode = nodeChain
    ? 'node-chain'
    : relatedPackageReferenceOnly
      ? 'reference-only-related-package'
      : 'reference-only-no-package';

  const override = slotNodeOverrides[opening.openingId] || null;
  const packageNodeIds = packageRecord?.nodeIds || [];
  const startNodeId = packageRecord?.entryNode || null;
  const currentNodeId = nodeChain
    ? (override?.currentNodeId || packageRecord.entryNode)
    : '未进入事件包';

  if (nodeChain && !packageNodeIds.includes(currentNodeId)) {
    throw new Error(`Current node outside package: ${opening.openingId} -> ${currentNodeId}`);
  }

  let completedNodeIds = [];
  let upcomingNodeIds = [];
  let triggerableNodeIds = [];
  const availableEntryNodeIds = override?.availableEntryNodeIds || [];
  if (nodeChain) {
    const currentIndex = packageNodeIds.indexOf(currentNodeId);
    if (override?.nodeProgressStrategy === 'branching-multi-entry') {
      completedNodeIds = [];
      upcomingNodeIds = packageNodeIds.filter((nodeId) => nodeId !== currentNodeId);
      triggerableNodeIds = availableEntryNodeIds.filter((nodeId) => nodeId !== currentNodeId);
    } else {
      completedNodeIds = packageNodeIds.slice(0, currentIndex);
      upcomingNodeIds = packageNodeIds.slice(currentIndex + 1);
      triggerableNodeIds = upcomingNodeIds.length > 0 ? [upcomingNodeIds[0]] : [];
    }
  }

  const nodeDetails = nodeChain
    ? parseNodeDetails(packageSources.get(opening.primaryPackageId), currentNodeId)
    : null;
  const playerPosition = '待玩家确认具体位置';
  const referenceOnlyMessage = relatedPackageReferenceOnly
    ? `reference-only：已关联${opening.primaryPackageId}，但不把相关路线伪装成本开场节点。`
    : 'reference-only：需先确认媒介、原载与相对顺序。';
  const currentPlotState = nodeChain
    ? `已初始化：${opening.displayDate}｜${opening.chapterLabel}｜当前节点 ${currentNodeId}。`
    : referenceOnlyMessage;
  const nextStepPrompt = nodeChain
    ? (nodeDetails?.sceneGoal || `从 ${currentNodeId} 的进入条件开始，并记录玩家偏移。`)
    : referenceOnlyMessage;
  const datePrecision = determineDatePrecision(opening.displayDate);
  const timeOfDay = determineTimeOfDay(opening.displayDate);
  const narrativePhase = nodeChain
    ? determineNarrativePhase(packageNodeIds, currentNodeId)
    : '遭遇';

  const compatibilityPayload = {
    原著阶段: stage.label,
    剧情锚点: opening.chapterLabel,
    所在位置: playerPosition,
    剧情阶段: narrativePhase,
    主线进度: {
      当前阶段: stage.label,
      阶段序号: stage.order,
      阶段状态: nodeChain ? '进行中' : '待确认',
      当前节点: currentNodeId,
      已完成节点: completedNodeIds,
      可触发节点: triggerableNodeIds,
      正史锚点: {
        当前锚点: opening.chapterLabel,
        默认走向: opening.text,
        玩家偏移: [],
      },
      下一步推进提示: nextStepPrompt,
    },
  };

  const extensionFields = {
    时间层ID: timeLayer.id,
    时间层名称: timeLayer.label,
    当前日期: opening.displayDate,
    日期精度: datePrecision,
    时间段: timeOfDay,
    作品线ID: workLine.id,
    作品线名称: workLine.label,
    剧情阶段ID: stage.id,
    篇章ID: opening.chapterId,
    OpeningID: opening.openingId,
    事件包ID: opening.primaryPackageId,
    世界书起始节点ID: startNodeId,
    尚未发生节点: upcomingNodeIds,
    关联作品线: [workLine.id],
    referenceOnly状态: initializationMode,
    槽位标签: opening.slotLabel || '默认入口',
  };

  return {
    openingId: opening.openingId,
    evidenceId: opening.evidenceId,
    slotLabel: opening.slotLabel,
    timeLayerId: timeLayer.id,
    timeLayerLabel: timeLayer.label,
    displayDate: opening.displayDate,
    datePrecision,
    timeOfDay,
    workLineId: workLine.id,
    workLineLabel: workLine.label,
    stageId: stage.id,
    stageLabel: stage.label,
    chapterId: opening.chapterId,
    chapterLabel: opening.chapterLabel,
    coverage: opening.coverage,
    initializationMode,
    primaryPackageId: opening.primaryPackageId,
    startNodeId,
    currentNodeId,
    currentNodeTitle: nodeDetails?.title || null,
    currentNodeSceneGoal: nodeDetails?.sceneGoal || null,
    currentNodeEntryCondition: nodeDetails?.entryCondition || null,
    completedNodeIds,
    upcomingNodeIds,
    triggerableNodeIds,
    availableEntryNodeIds,
    nodeProgressStrategy: override?.nodeProgressStrategy || 'linear-from-entry',
    slotNodeReason: override?.reason || null,
    playerPosition,
    currentPlotState,
    relatedWorkLineIds: [workLine.id],
    openingText: opening.text,
    compatibilityPayload,
    extensionProposal: {
      status: 'proposed-not-yet-supported',
      fields: extensionFields,
    },
  };
}

const records = phase5.openings.map(buildInitializationRecord);

function countBy(items, keySelector) {
  return items.reduce((accumulator, item) => {
    const key = keySelector(item);
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
}

function schemaHasPropertyPath(propertyPath) {
  let currentNode = schema;
  for (const propertyName of propertyPath.split('.')) {
    if (!currentNode.properties || !currentNode.properties[propertyName]) return false;
    currentNode = currentNode.properties[propertyName];
  }
  return true;
}

const compatibilityPropertyPaths = [
  '原著阶段',
  '剧情锚点',
  '所在位置',
  '剧情阶段',
  '主线进度.当前阶段',
  '主线进度.阶段序号',
  '主线进度.阶段状态',
  '主线进度.当前节点',
  '主线进度.已完成节点',
  '主线进度.可触发节点',
  '主线进度.正史锚点.当前锚点',
  '主线进度.正史锚点.默认走向',
  '主线进度.正史锚点.玩家偏移',
  '主线进度.下一步推进提示',
];

const openingIds = new Set(records.map((record) => record.openingId));
const nodeChainRecords = records.filter((record) => record.initializationMode === 'node-chain');
const referenceOnlyNoPackageRecords = records.filter(
  (record) => record.initializationMode === 'reference-only-no-package',
);
const referenceOnlyRelatedPackageRecords = records.filter(
  (record) => record.initializationMode === 'reference-only-related-package',
);

const errors = [];
if (records.length !== 114) errors.push(`record count expected 114, got ${records.length}`);
if (openingIds.size !== records.length) errors.push('opening IDs are not unique');
if (nodeChainRecords.length !== 98) errors.push(`node-chain count expected 98, got ${nodeChainRecords.length}`);
if (referenceOnlyNoPackageRecords.length !== 15) {
  errors.push(`no-package reference-only count expected 15, got ${referenceOnlyNoPackageRecords.length}`);
}
if (referenceOnlyRelatedPackageRecords.length !== 1) {
  errors.push(`related-package reference-only count expected 1, got ${referenceOnlyRelatedPackageRecords.length}`);
}

for (const propertyPath of compatibilityPropertyPaths) {
  if (!schemaHasPropertyPath(propertyPath)) errors.push(`schema path missing: ${propertyPath}`);
}

const allowedNarrativePhases = new Set(schema.properties.剧情阶段.enum);
for (const record of records) {
  if (record.displayDate !== phase5.openings.find((opening) => opening.openingId === record.openingId).displayDate) {
    errors.push(`display date drift: ${record.openingId}`);
  }
  if (!allowedNarrativePhases.has(record.compatibilityPayload.剧情阶段)) {
    errors.push(`invalid narrative phase: ${record.openingId}`);
  }
  if (record.timeLayerId === 'TL-UNDATED' && record.displayDate !== '未定日') {
    errors.push(`undated opening has a date: ${record.openingId}`);
  }
  if (record.openingId.includes('GENESIS-15') || record.openingText.includes('创约15')) {
    errors.push(`Genesis 15 leaked: ${record.openingId}`);
  }
  if (record.initializationMode === 'node-chain') {
    const packageRecord = packageRecords.get(record.primaryPackageId);
    const union = [...record.completedNodeIds, record.currentNodeId, ...record.upcomingNodeIds];
    if (!packageRecord.nodeIds.includes(record.startNodeId)) {
      errors.push(`invalid start node: ${record.openingId}`);
    }
    if (new Set(union).size !== union.length || union.length !== packageRecord.nodeIds.length) {
      errors.push(`node coverage incomplete: ${record.openingId}`);
    }
    for (const nodeId of union) {
      if (!packageRecord.nodeIds.includes(nodeId)) {
        errors.push(`node outside package: ${record.openingId} -> ${nodeId}`);
      }
    }
  } else {
    if (record.currentNodeId !== '未进入事件包') {
      errors.push(`reference-only opening has current node: ${record.openingId}`);
    }
    if (record.completedNodeIds.length > 0 || record.upcomingNodeIds.length > 0) {
      errors.push(`reference-only opening has fake progress: ${record.openingId}`);
    }
  }
}

const multiSlotEvidenceIds = new Set(
  phase5.openings.filter((opening, index, openings) =>
    openings.filter((candidate) => candidate.evidenceId === opening.evidenceId).length > 1,
  ).map((opening) => opening.evidenceId),
);
for (const evidenceId of multiSlotEvidenceIds) {
  const groupRecords = records.filter((record) => record.evidenceId === evidenceId);
  const currentNodeIds = new Set(groupRecords.map((record) => record.currentNodeId));
  if (currentNodeIds.size !== groupRecords.length) {
    errors.push(`multi-slot openings share a current node: ${evidenceId}`);
  }
}

const summary = {
  recordCount: records.length,
  nodeChainCount: nodeChainRecords.length,
  referenceOnlyNoPackageCount: referenceOnlyNoPackageRecords.length,
  referenceOnlyRelatedPackageCount: referenceOnlyRelatedPackageRecords.length,
  associatedPackageCount: nodeChainRecords.length + referenceOnlyRelatedPackageRecords.length,
  byTimeLayer: countBy(records, (record) => record.timeLayerId),
  byWorkLine: countBy(records, (record) => record.workLineId),
  byInitializationMode: countBy(records, (record) => record.initializationMode),
  byDatePrecision: countBy(records, (record) => record.datePrecision),
  byNarrativePhase: countBy(records, (record) => record.compatibilityPayload.剧情阶段),
};

const schemaExtensionProposal = {
  version: 1,
  generatedOn: new Date().toISOString(),
  status: 'proposal-only-not-applied',
  reason: 'Phase 6 只生成初始化规划产物；不修改 initvar、schema、MVU、loader、欢迎页源码或 PNG。',
  fields: [
    { path: '时间层ID', type: 'string', source: 'phase2 taxonomy' },
    { path: '时间层名称', type: 'string', source: 'phase2 taxonomy' },
    { path: '当前日期', type: 'string', source: 'phase5 displayDate' },
    { path: '日期精度', type: 'string', enum: ['exact', 'approximate', 'range', 'relative', 'undated'] },
    { path: '时间段', type: 'string', fallback: '未定' },
    { path: '作品线ID', type: 'string', source: 'phase2 taxonomy' },
    { path: '作品线名称', type: 'string', source: 'phase2 taxonomy' },
    { path: '剧情阶段ID', type: 'string', source: 'phase2 taxonomy' },
    { path: '篇章ID', type: 'string', source: 'phase2 taxonomy' },
    { path: 'OpeningID', type: 'string', source: 'phase2 target opening' },
    { path: '事件包ID', type: ['string', 'null'], source: 'worldbook manifest' },
    { path: '世界书起始节点ID', type: ['string', 'null'], source: 'worldbook manifest' },
    { path: '尚未发生节点', type: 'array', items: { type: 'string' } },
    { path: '关联作品线', type: 'array', items: { type: 'string' } },
    { path: 'referenceOnly状态', type: 'string' },
    { path: '槽位标签', type: 'string' },
  ],
  compatibilityBoundary: {
    supportedNow: compatibilityPropertyPaths,
    notClaimedAsRuntimeSupported: 'extensionProposal.fields',
  },
};

const initialization = {
  version: 1,
  generatedOn: new Date().toISOString(),
  sourcePhases: {
    taxonomy: 'phase2-opening-ids.json',
    completeOpenings: 'phase5-complete-openings.json',
    worldbookManifests: 'magic-worldbook-implementation-20260908/worker-*.json',
    schema: 'src/魔法禁书目录模拟器/schema.json',
  },
  implementationBoundary: {
    scope: 'planning-artifact-only',
    modifiedRuntimeFiles: false,
    runtimeValidationClaimed: false,
  },
  slotNodeOverrides,
  summary,
  records,
  validation: {
    status: errors.length === 0 ? 'passed-static-only' : 'failed',
    errors,
    checks: [
      '114 条初始化记录且 Opening ID 唯一',
      '时间层、作品线、剧情阶段引用均来自 Phase 2 taxonomy',
      'displayDate 与 Phase 5 完全一致',
      '98 条 node-chain 的起始节点与当前节点均存在于事件包',
      'node-chain 的已完成、当前与尚未发生节点完整覆盖事件包且无重复',
      '多槽位同包 Opening 使用不同当前节点',
      '15 条无包 reference-only 不携带伪节点',
      'O18 保留 ENDEYMION 关联但标记 reference-only，不伪装成当前节点',
      '未定日入口不写伪日期',
      '未出现创约15',
      '兼容载荷字段均存在于当前 schema',
      '扩展字段全部标记为 proposed-not-yet-supported',
    ],
  },
};

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
}

fs.writeFileSync(initializationJsonPath, `${JSON.stringify(initialization, null, 2)}\n`, 'utf8');
fs.writeFileSync(schemaExtensionProposalPath, `${JSON.stringify(schemaExtensionProposal, null, 2)}\n`, 'utf8');

const markdownRows = records.map((record) => {
  const packageAndNode = record.primaryPackageId
    ? `${record.primaryPackageId} / ${record.currentNodeId}`
    : '无包 / 未进入事件包';
  return [
    record.openingId,
    record.displayDate,
    record.workLineLabel,
    record.stageLabel,
    record.chapterLabel,
    packageAndNode,
    record.initializationMode,
  ].join(' | ');
});

const markdown = `# Phase 6 初始化数据方案

## 状态

- 产物类型：规划数据，不修改运行时源码。
- 静态门禁：${initialization.validation.status}
- 记录数量：${records.length}
- 初始化模式：node-chain ${summary.nodeChainCount}；无包 reference-only ${summary.referenceOnlyNoPackageCount}；关联包 reference-only ${summary.referenceOnlyRelatedPackageCount}
- 真机验收：未执行；后续仍需 Phase 8 在 SillyTavern 中验证。

## 输入与边界

- 分类体系：\`phase2-opening-ids.json\`
- 完整开场：\`phase5-complete-openings.json\`
- 世界书包清单：\`.planning/magic-worldbook-implementation-20260908/worker-*.json\`
- 当前 schema：\`src/魔法禁书目录模拟器/schema.json\`
- 本阶段不修改：欢迎页源码、\`index.yaml\`、PNG、dist、MVU、schema、loader。

## 初始化合同

每条记录包含：

- Opening 与证据 ID
- 时间层、日期精度、时间段
- 作品线、剧情阶段、篇章
- 事件包、起始节点、当前节点
- 已完成节点、尚未发生节点、可触发节点
- 玩家位置与当前剧情状态
- 兼容 MVU 的 \`compatibilityPayload\`
- 待 schema 升级的 \`extensionProposal\`

## 兼容载荷

只使用当前 schema 已存在的字段：

| 目标字段 | 来源 |
| --- | --- |
| \`原著阶段\` | Phase 2 \`stageLabel\` |
| \`剧情锚点\` | Phase 5 \`chapterLabel\` |
| \`所在位置\` | 统一为“待玩家确认具体位置” |
| \`剧情阶段\` | 按当前节点在事件包中的位置映射为遭遇／发展／高潮／终局 |
| \`主线进度.当前阶段\` | Phase 2 \`stageLabel\` |
| \`主线进度.阶段序号\` | Phase 2 \`stage.order\` |
| \`主线进度.阶段状态\` | node-chain 为“进行中”；reference-only 为“待确认” |
| \`主线进度.当前节点\` | 当前槽位节点或“未进入事件包” |
| \`主线进度.已完成节点\` | 槽位前置节点 |
| \`主线进度.可触发节点\` | 线性链下一节点；分支入口为可选入口 |
| \`主线进度.正史锚点.当前锚点\` | Phase 5 \`chapterLabel\` |
| \`主线进度.正史锚点.默认走向\` | Phase 5 开场正文 |
| \`主线进度.下一步推进提示\` | 当前节点场景目标 |

## 待扩展字段

\`extensionProposal.status\` 固定为 \`proposed-not-yet-supported\`，包含：

- \`时间层ID\`、\`时间层名称\`
- \`当前日期\`、\`日期精度\`、\`时间段\`
- \`作品线ID\`、\`作品线名称\`
- \`剧情阶段ID\`、\`篇章ID\`
- \`OpeningID\`、\`事件包ID\`
- \`世界书起始节点ID\`
- \`尚未发生节点\`、\`关联作品线\`
- \`referenceOnly状态\`、\`槽位标签\`

## 多槽位节点裁决

| Opening | 当前节点 | 策略 | 说明 |
| --- | --- | --- | --- |
${Object.entries(slotNodeOverrides).map(([openingId, override]) => {
  return `| \`${openingId}\` | \`${override.currentNodeId}\` | ${override.nodeProgressStrategy} | ${override.reason} |`;
}).join('\n')}

“八月三十一日三线并行”不把最后之作线自动记为完成；默认兼容节点为 \`AUGUST-31-05\`，扩展字段保留 \`AUGUST-31-01\`、\`AUGUST-31-05\`、\`AUGUST-31-07\` 三个可选入口。

## 数量分布

| 维度 | 结果 |
| --- | --- |
| 时间层 | ${JSON.stringify(summary.byTimeLayer)} |
| 作品线 | ${JSON.stringify(summary.byWorkLine)} |
| 初始化模式 | ${JSON.stringify(summary.byInitializationMode)} |
| 日期精度 | ${JSON.stringify(summary.byDatePrecision)} |
| 叙事阶段 | ${JSON.stringify(summary.byNarrativePhase)} |

## 静态门禁

${initialization.validation.checks.map((check) => `- ${check}`).join('\n')}

## 已知边界

- \`所在位置\` 统一使用“待玩家确认具体位置”，不把正文模糊场景伪装成精确地点。
- \`剧情阶段\` 使用当前 schema 的遭遇／发展／高潮／终局枚举，不把旧约／新约／创约塞进该字段。
- \`upcomingNodeIds\` 表示尚未发生或尚未完成；分支入口也会保留在未完成集合中。
- O18 关联 \`ENDEYMION\`，但初始化为 reference-only，不把剧场版前传与游戏路线伪装成同一可玩链。
- Phase 6 不声称 SillyTavern 运行时已经支持新增字段。

## 初始化记录总表

| Opening | 日期 | 作品线 | 阶段 | 篇章 | 包／当前节点 | 模式 |
| --- | --- | --- | --- | --- | --- | --- |
${markdownRows.join('\n')}
`;

fs.writeFileSync(initializationMarkdownPath, markdown, 'utf8');

console.log(JSON.stringify({
  status: initialization.validation.status,
  recordCount: records.length,
  outputs: [
    initializationJsonPath,
    initializationMarkdownPath,
    schemaExtensionProposalPath,
  ],
  errors,
}, null, 2));
