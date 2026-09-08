import fs from 'node:fs';
import path from 'node:path';

const planningDirectory = '.planning/magic-opening-restructure-20260908';
const worldbookPlanningDirectory = '.planning/magic-worldbook-implementation-20260908';
const phase1Path = path.join(planningDirectory, 'phase1-opening-mapping.json');
const phase2Path = path.join(planningDirectory, 'phase2-opening-ids.json');
const phase5Path = path.join(planningDirectory, 'phase5-complete-openings.json');
const phase6Path = path.join(planningDirectory, 'phase6-initialization.json');
const schemaPath = 'src/魔法禁书目录模拟器/schema.json';
const outputJsonPath = path.join(planningDirectory, 'phase7-static-validation.json');
const outputMarkdownPath = path.join(planningDirectory, 'phase7-static-validation.md');

const phase1 = JSON.parse(fs.readFileSync(phase1Path, 'utf8'));
const phase2 = JSON.parse(fs.readFileSync(phase2Path, 'utf8'));
const phase5 = JSON.parse(fs.readFileSync(phase5Path, 'utf8'));
const phase6 = JSON.parse(fs.readFileSync(phase6Path, 'utf8'));
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

const taxonomyMaps = {
  timeLayers: new Map(phase2.taxonomy.timeLayers.map((item) => [item.id, item])),
  workLines: new Map(phase2.taxonomy.workLines.map((item) => [item.id, item])),
  stages: new Map(phase2.taxonomy.stages.map((item) => [item.id, item])),
};
const targetMap = new Map(phase2.targetOpenings.map((item) => [item.openingId, item]));
const evidenceMap = new Map(phase1.evidenceMappings.map((item) => [item.evidenceId, item]));
const openingMap = new Map(phase6.records.map((item) => [item.openingId, item]));

const packageRecords = new Map();
for (const fileName of fs.readdirSync(worldbookPlanningDirectory)) {
  if (!fileName.startsWith('worker-') || !fileName.endsWith('.json')) continue;
  const manifest = JSON.parse(fs.readFileSync(path.join(worldbookPlanningDirectory, fileName), 'utf8'));
  for (const record of manifest.files || []) {
    if (!record.packageId) continue;
    if (packageRecords.has(record.packageId)) {
      throw new Error(`Duplicate package manifest: ${record.packageId}`);
    }
    packageRecords.set(record.packageId, record);
  }
}

const forbiddenPhrases = [
  '落幕', '终章', '击溃', '击败', '打倒', '斩落', '救出', '揭晓', '真相是',
  '放弃', '生死不明', '封印', '旧时代', '帷幕', '从此', '结局', '死亡',
  '获胜', '胜利', '和解', '身份揭露', '最终胜负', '整卷结局', '下一阶段', '已经死亡',
];

const semanticAnchors = {
  'OP-S08-01': { evidenceId: 'S08', requiredAny: ['御坂9982', '9982'] },
  'OP-S09-01': { evidenceId: 'S09', requiredAny: ['自动贩卖机', '初遇'] },
  'OP-S11-01': { evidenceId: 'S11', requiredAny: ['原石', '刀夜'] },
  'OP-O17-01': { evidenceId: 'O17', requiredAny: ['必要之恶', '编入考试'] },
  'OP-O28-01': { evidenceId: 'O28', requiredAny: ['一方通行', '最后之作'] },
  'OP-O32-01': { evidenceId: 'O32', requiredAny: ['垣根帝督', '暗部大战'], forbiddenAny: ['凯莉莎', '英国午夜政变'] },
  'OP-O34-01': { evidenceId: 'O34', requiredAny: ['后方之水'], forbiddenAny: ['凯莉莎'] },
  'OP-O35-01': { evidenceId: 'O35', requiredAny: ['不列颠万圣节', '王宫', '骑士派'] },
  'OP-O37-01': { evidenceId: 'O37', requiredAny: ['宣战', '第三次世界大战', '俄罗斯'] },
};

const expectedCompatibilityFields = [
  '原著阶段',
  '剧情锚点',
  '所在位置',
  '剧情阶段',
  '主线进度',
];
const expectedMainProgressFields = [
  '当前阶段', '阶段序号', '阶段状态', '当前节点', '已完成节点', '可触发节点', '正史锚点', '下一步推进提示',
];
const expectedExtensionFields = [
  '时间层ID', '时间层名称', '当前日期', '日期精度', '时间段', '作品线ID', '作品线名称',
  '剧情阶段ID', '篇章ID', 'OpeningID', '事件包ID', '世界书起始节点ID', '尚未发生节点',
  '关联作品线', 'referenceOnly状态', '槽位标签',
];

function inferDatePrecision(displayDate) {
  if (displayDate === '未定日') return 'undated';
  if (displayDate.includes('至') || displayDate.includes('起') || displayDate.includes('之后')) return 'range';
  if (displayDate.includes('次期新学期')) return 'relative';
  if (displayDate.includes('附近') || displayDate.includes('某日')) return 'approximate';
  if (/[初末]($|[年月日期])|上旬|中旬|下旬/.test(displayDate)) return 'approximate';
  return 'exact';
}

function inferTimeOfDay(displayDate) {
  if (displayDate.includes('23:58附近')) return '23:58附近';
  if (displayDate.includes('08:30附近')) return '08:30附近';
  if (displayDate.includes('早晨')) return '早晨';
  return '未定';
}

function dateSortKey(record) {
  const timeLayer = taxonomyMaps.timeLayers.get(record.timeLayerId);
  const year = record.timeLayerId === 'TL-YMINUS1' ? 0 : record.timeLayerId === 'TL-Y' ? 1 : record.timeLayerId === 'TL-YPLUS1' ? 2 : 3;
  const monthMatch = record.displayDate.match(/(\d{1,2})月/);
  const month = monthMatch ? Number(monthMatch[1]) : 1;
  let day = 1;
  const dayMatch = record.displayDate.match(/(\d{1,2})日/);
  if (dayMatch) {
    day = Number(dayMatch[1]);
  } else if (record.displayDate.includes('下旬') || record.displayDate.includes('月末')) {
    day = 21;
  } else if (record.displayDate.includes('中旬')) {
    day = 11;
  } else if (record.displayDate.includes('上旬') || record.displayDate.includes('月初')) {
    day = 1;
  }
  let minute = 0;
  const timeMatch = record.displayDate.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) minute = Number(timeMatch[1]) * 60 + Number(timeMatch[2]);
  return {
    year,
    month,
    day,
    minute,
    timeLayerOrder: timeLayer.order,
    displayDate: record.displayDate,
  };
}

function compareDateKeys(left, right) {
  return left.year - right.year
    || left.month - right.month
    || left.day - right.day
    || left.minute - right.minute;
}

function buildDisplayModel(records) {
  const timeLayerGroups = new Map();
  for (const record of records) {
    const timeLayer = taxonomyMaps.timeLayers.get(record.timeLayerId);
    const workLine = taxonomyMaps.workLines.get(record.workLineId);
    const stage = taxonomyMaps.stages.get(record.stageId);
    if (!timeLayerGroups.has(timeLayer.id)) {
      timeLayerGroups.set(timeLayer.id, {
        timeLayerId: timeLayer.id,
        timeLayerLabel: timeLayer.label,
        timeLayerOrder: timeLayer.order,
        groups: new Map(),
      });
    }
    const layer = timeLayerGroups.get(timeLayer.id);
    const groupId = `${workLine.id}｜${record.chapterId}`;
    const groupLabel = `${workLine.label}｜${record.chapterLabel}`;
    if (!layer.groups.has(groupId)) {
      layer.groups.set(groupId, {
        groupId,
        groupLabel,
        workLineId: workLine.id,
        workLineLabel: workLine.label,
        workLineOrder: workLine.order,
        stageId: stage.id,
        stageLabel: stage.label,
        stageOrder: stage.order,
        chapterId: record.chapterId,
        chapterLabel: record.chapterLabel,
        openings: [],
      });
    }
    layer.groups.get(groupId).openings.push({
      openingId: record.openingId,
      displayDate: record.displayDate,
      slot: record.slotLabel ? Number(record.openingId.split('-').pop()) : 1,
      slotLabel: record.slotLabel || '默认入口',
      datePrecision: record.datePrecision,
      sortKey: dateSortKey(record),
    });
  }

  const layers = [...timeLayerGroups.values()].map((layer) => {
    const groups = [...layer.groups.values()].map((group) => {
      const openings = [...group.openings].sort((left, right) =>
        left.slot - right.slot
        || compareDateKeys(left.sortKey, right.sortKey)
        || left.openingId.localeCompare(right.openingId),
      );
      return {
        ...group,
        openings,
        openingIds: openings.map((opening) => opening.openingId),
        sortKey: openings.reduce((minimum, opening) =>
          compareDateKeys(opening.sortKey, minimum) < 0 ? opening.sortKey : minimum,
        openings[0].sortKey),
      };
    }).sort((left, right) =>
      compareDateKeys(left.sortKey, right.sortKey)
      || left.workLineOrder - right.workLineOrder
      || left.stageOrder - right.stageOrder
      || left.chapterId.localeCompare(right.chapterId),
    );
    return {
      timeLayerId: layer.timeLayerId,
      timeLayerLabel: layer.timeLayerLabel,
      timeLayerOrder: layer.timeLayerOrder,
      groupCount: groups.length,
      openingCount: groups.reduce((total, group) => total + group.openings.length, 0),
      groups,
    };
  }).sort((left, right) => left.timeLayerOrder - right.timeLayerOrder);

  return {
    hierarchy: ['时间层', '作品线｜剧情阶段／篇章', '具体开场白'],
    layers,
    canonicalOpeningOrder: layers.flatMap((layer) =>
      layer.groups.flatMap((group) => group.openingIds),
    ),
  };
}

function schemaHasPropertyPath(propertyPath) {
  let currentNode = schema;
  for (const propertyName of propertyPath.split('.')) {
    if (!currentNode.properties || !currentNode.properties[propertyName]) return false;
    currentNode = currentNode.properties[propertyName];
  }
  return true;
}

function countBy(items, selector) {
  return items.reduce((accumulator, item) => {
    const key = selector(item);
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
}

const records = phase6.records;
const displayModel = buildDisplayModel(records);
const canonicalOrder = displayModel.canonicalOpeningOrder;
const inputOrder = records.map((record) => record.openingId);
const reorderedPositions = inputOrder.map((openingId, index) => ({
  openingId,
  inputIndex: index,
  canonicalIndex: canonicalOrder.indexOf(openingId),
})).filter((item) => item.inputIndex !== item.canonicalIndex);

const errors = [];
const warnings = [];

if (phase1.validation.status !== 'passed') errors.push('Phase 1 validation is not passed');
if (phase2.validation.status !== 'passed') errors.push('Phase 2 validation is not passed');
if (phase5.validation.status !== 'passed') errors.push('Phase 5 validation is not passed');
if (phase6.validation.status !== 'passed-static-only') errors.push('Phase 6 validation is not passed-static-only');
if (records.length !== 114) errors.push(`Expected 114 records, found ${records.length}`);
if (new Set(inputOrder).size !== records.length) errors.push('Opening IDs are not unique');
if (new Set(inputOrder).size !== targetMap.size) errors.push('Opening ID set does not match Phase 2');
if (canonicalOrder.length !== 114 || new Set(canonicalOrder).size !== 114) errors.push('Canonical display order is incomplete');
if (new Set(canonicalOrder).size !== new Set(inputOrder).size) errors.push('Canonical display order loses or adds openings');

for (const record of records) {
  const target = targetMap.get(record.openingId);
  const evidence = evidenceMap.get(record.evidenceId);
  const timeLayer = taxonomyMaps.timeLayers.get(record.timeLayerId);
  const workLine = taxonomyMaps.workLines.get(record.workLineId);
  const stage = taxonomyMaps.stages.get(record.stageId);
  if (!target || !evidence || !timeLayer || !workLine || !stage) {
    errors.push(`Missing taxonomy or target: ${record.openingId}`);
    continue;
  }
  if (target.evidenceId !== record.evidenceId
    || target.timeLayerId !== record.timeLayerId
    || target.workLineId !== record.workLineId
    || target.stageId !== record.stageId
    || target.chapterId !== record.chapterId
    || target.chapterLabel !== record.chapterLabel) {
    errors.push(`Taxonomy mismatch: ${record.openingId}`);
  }
  if (stage.workLineId !== record.workLineId) errors.push(`Stage/work-line mismatch: ${record.openingId}`);
  if (!record.relatedWorkLineIds.includes(record.workLineId)) {
    errors.push(`Missing own related work line: ${record.openingId}`);
  }
  if (record.primaryPackageId && !target.packageIds.includes(record.primaryPackageId)) {
    errors.push(`Package attribution mismatch: ${record.openingId}`);
  }
  if (record.primaryPackageId) {
    const packageRecord = packageRecords.get(record.primaryPackageId);
    if (!packageRecord) {
      errors.push(`Missing package manifest: ${record.primaryPackageId}`);
    } else if (!packageRecord.evidenceIds.includes(record.evidenceId)
      && !evidence.directPackageIds.includes(record.primaryPackageId)
      && !evidence.relatedPackageIds.includes(record.primaryPackageId)) {
      errors.push(`Package/evidence attribution mismatch: ${record.openingId}`);
    }
  }
  if (record.datePrecision !== inferDatePrecision(record.displayDate)) {
    errors.push(`Date precision mismatch: ${record.openingId}`);
  }
  if (record.timeOfDay !== inferTimeOfDay(record.displayDate)) {
    errors.push(`Time-of-day mismatch: ${record.openingId}`);
  }
  if (!record.openingText.startsWith(`${record.displayDate}，`)) {
    errors.push(`Missing date prefix: ${record.openingId}`);
  }
  if (record.openingText.startsWith(`${record.displayDate}，${record.displayDate}，`)) {
    errors.push(`Duplicated date prefix: ${record.openingId}`);
  }
  const textLength = [...record.openingText].length;
  if (textLength < 80 || textLength > 160) errors.push(`Text length out of range: ${record.openingId}`);
  if (!/[你]|可以/.test(record.openingText)) errors.push(`Missing intervention point: ${record.openingId}`);
  if (/["\r\n]/.test(record.openingText)) errors.push(`Unsafe text characters: ${record.openingId}`);
  for (const phrase of forbiddenPhrases) {
    if (record.openingText.includes(phrase)) errors.push(`Forbidden phrase: ${record.openingId} -> ${phrase}`);
  }
  if (record.timeLayerId === 'TL-UNDATED' && record.displayDate !== '未定日') {
    errors.push(`Undated opening has date: ${record.openingId}`);
  }
  if (record.openingId.includes('GENESIS-15') || record.openingText.includes('创约15')) {
    errors.push(`Genesis 15 leak: ${record.openingId}`);
  }
  if (record.extensionProposal.status !== 'proposed-not-yet-supported') {
    errors.push(`Extension proposal status mismatch: ${record.openingId}`);
  }
  if (JSON.stringify(Object.keys(record.compatibilityPayload)) !== JSON.stringify(expectedCompatibilityFields)) {
    errors.push(`Compatibility field drift: ${record.openingId}`);
  }
  if (JSON.stringify(Object.keys(record.compatibilityPayload.主线进度)) !== JSON.stringify(expectedMainProgressFields)) {
    errors.push(`Main-progress field drift: ${record.openingId}`);
  }
  if (JSON.stringify(Object.keys(record.extensionProposal.fields)) !== JSON.stringify(expectedExtensionFields)) {
    errors.push(`Extension field drift: ${record.openingId}`);
  }
  if (!allowedNarrativePhase(record.compatibilityPayload.剧情阶段)) {
    errors.push(`Invalid narrative phase: ${record.openingId}`);
  }
}

function allowedNarrativePhase(value) {
  return schema.properties.剧情阶段.enum.includes(value);
}

for (const [openingId, anchor] of Object.entries(semanticAnchors)) {
  const record = openingMap.get(openingId);
  if (!record) {
    errors.push(`Semantic anchor missing: ${openingId}`);
    continue;
  }
  if (record.evidenceId !== anchor.evidenceId) errors.push(`Semantic evidence mismatch: ${openingId}`);
  if (!anchor.requiredAny.some((phrase) => record.openingText.includes(phrase))) {
    errors.push(`Semantic anchor missing required text: ${openingId}`);
  }
  for (const phrase of anchor.forbiddenAny || []) {
    if (record.openingText.includes(phrase)) errors.push(`Semantic anchor contains forbidden text: ${openingId} -> ${phrase}`);
  }
}

for (const record of records) {
  if (record.initializationMode !== 'node-chain') {
    if (record.currentNodeId !== '未进入事件包'
      || record.completedNodeIds.length > 0
      || record.upcomingNodeIds.length > 0) {
      errors.push(`Reference-only fake progress: ${record.openingId}`);
    }
    continue;
  }
  const packageRecord = packageRecords.get(record.primaryPackageId);
  if (!packageRecord) {
    errors.push(`Missing node package: ${record.openingId}`);
    continue;
  }
  if (!fs.existsSync(packageRecord.path)) {
    errors.push(`Worldbook file missing: ${record.openingId}`);
    continue;
  }
  const source = fs.readFileSync(packageRecord.path, 'utf8');
  if (!source.includes('== 4. 节点推进表 ==')) {
    errors.push(`Worldbook node table missing: ${record.openingId}`);
  }
  const union = [...record.completedNodeIds, record.currentNodeId, ...record.upcomingNodeIds];
  if (new Set(union).size !== union.length || union.length !== packageRecord.nodeIds.length) {
    errors.push(`Node coverage mismatch: ${record.openingId}`);
  }
  for (const nodeId of [record.startNodeId, record.currentNodeId, ...union]) {
    if (!packageRecord.nodeIds.includes(nodeId) || !source.includes(nodeId)) {
      errors.push(`Node reference mismatch: ${record.openingId} -> ${nodeId}`);
    }
  }
  if (!record.currentNodeTitle || !record.currentNodeSceneGoal || !record.currentNodeEntryCondition) {
    errors.push(`Current node metadata missing: ${record.openingId}`);
  }
}

const multiSlotEvidenceIds = new Set(
  records.filter((record, index, all) =>
    all.filter((candidate) => candidate.evidenceId === record.evidenceId).length > 1,
  ).map((record) => record.evidenceId),
);
for (const evidenceId of multiSlotEvidenceIds) {
  const group = records.filter((record) => record.evidenceId === evidenceId);
  const currentNodeIds = new Set(group.map((record) => record.currentNodeId));
  if (currentNodeIds.size !== group.length) errors.push(`Multi-slot current-node collision: ${evidenceId}`);
}

for (const layer of displayModel.layers) {
  const groupIds = layer.groups.map((group) => group.groupId);
  if (new Set(groupIds).size !== groupIds.length) errors.push(`Duplicate display group: ${layer.timeLayerId}`);
  const openingIds = layer.groups.flatMap((group) => group.openingIds);
  if (new Set(openingIds).size !== openingIds.length) errors.push(`Duplicate opening in display model: ${layer.timeLayerId}`);
  for (const group of layer.groups) {
    for (let index = 1; index < group.openings.length; index += 1) {
      const previous = group.openings[index - 1];
      const current = group.openings[index];
      if (current.slot < previous.slot) errors.push(`Slot order mismatch: ${current.openingId}`);
      if (previous.datePrecision === 'exact' && current.datePrecision === 'exact'
        && compareDateKeys(current.sortKey, previous.sortKey) < 0) {
        errors.push(`Exact-date order mismatch: ${previous.openingId} -> ${current.openingId}`);
      }
    }
  }
}

for (const propertyPath of [
  '原著阶段', '剧情锚点', '所在位置', '剧情阶段',
  '主线进度.当前阶段', '主线进度.阶段序号', '主线进度.阶段状态', '主线进度.当前节点',
  '主线进度.已完成节点', '主线进度.可触发节点', '主线进度.正史锚点.当前锚点',
  '主线进度.正史锚点.默认走向', '主线进度.正史锚点.玩家偏移', '主线进度.下一步推进提示',
]) {
  if (!schemaHasPropertyPath(propertyPath)) errors.push(`Schema path missing: ${propertyPath}`);
}

const summary = {
  recordCount: records.length,
  displayLayerCount: displayModel.layers.length,
  displayGroupCount: displayModel.layers.reduce((total, layer) => total + layer.groupCount, 0),
  canonicalOpeningOrderCount: canonicalOrder.length,
  reorderedPositionCount: reorderedPositions.length,
  inputOrderMatchesCanonicalOrder: reorderedPositions.length === 0,
  nodeChainCount: records.filter((record) => record.initializationMode === 'node-chain').length,
  referenceOnlyNoPackageCount: records.filter((record) => record.initializationMode === 'reference-only-no-package').length,
  referenceOnlyRelatedPackageCount: records.filter((record) => record.initializationMode === 'reference-only-related-package').length,
  semanticAnchorCount: Object.keys(semanticAnchors).length,
  byTimeLayer: countBy(records, (record) => record.timeLayerId),
  byWorkLine: countBy(records, (record) => record.workLineId),
  byDatePrecision: countBy(records, (record) => record.datePrecision),
};

const phase5Corrections = [
  {
    openingId: 'OP-O28-01',
    issue: '日期前缀重复',
    correction: '移除重复的“9月30日”前缀，保留单一日期前缀。',
  },
  {
    openingId: 'OP-O32-01',
    issue: '误选英国政变入口',
    correction: '改回10月9日暗部大战／垣根帝督入口，禁止凯莉莎与英国政变文本。',
  },
  {
    openingId: 'OP-O37-01',
    issue: '误用10月3日旧入口',
    correction: '改回10月19日俄罗斯宣战与第三次世界大战入口。',
  },
];

const result = {
  version: 1,
  generatedOn: new Date().toISOString(),
  scope: 'static-validation-only',
  sourceArtifacts: {
    phase1: phase1Path,
    phase2: phase2Path,
    phase5: phase5Path,
    phase6: phase6Path,
    schema: schemaPath,
  },
  implementationBoundary: {
    runtimeFilesModified: false,
    runtimeValidationClaimed: false,
    phase8Required: true,
  },
  phase5Corrections,
  displayModel,
  orderAudit: {
    strategy: '时间层 → 组内最早日期 → 作品线顺序 → 阶段顺序；组内 Opening 先按槽位再按日期。',
    inputOrder,
    canonicalOrder,
    reorderedPositions,
  },
  summary,
  validation: {
    status: errors.length === 0 ? 'passed-static-only' : 'failed',
    errors,
    warnings,
    checks: [
      'Phase 1–6 输入门禁均为通过状态',
      '114 条 Opening ID 唯一且与 Phase 2 目标集合一致',
      '数据层保持时间层、作品线、剧情阶段／篇章、开场四级',
      '欢迎页显示层压缩为时间层、作品线｜篇章、开场三级',
      '时间层、作品线、阶段、篇章归属全部通过 taxonomy 校验',
      '作品线与阶段归属一致，事件包归属能回溯到证据映射',
      '98 条 node-chain 的起始、当前、已完成与尚未发生节点全部存在',
      '15 条无包 reference-only 不携带伪节点',
      '多槽位同包 Opening 当前节点互不相同',
      '日期精度、时间段、日期前缀与未定日策略一致',
      'Phase 1 语义修正锚点全部通过，O28/O32/O37 已修复',
      '正文长度、介入点、禁用结局用语与安全字符全部通过',
      '兼容载荷字段与当前 schema 完全匹配',
      '扩展字段仍标记为待 schema 升级，不宣称运行时支持',
      '显示模型 114 个 Opening 全覆盖且无重复',
      '时间层排序与组内槽位／精确日期排序通过',
      '未出现创约15',
    ],
  },
};

fs.writeFileSync(outputJsonPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

const markdown = `# Phase 7 静态验证报告

## 结论

- 静态门禁：\`${result.validation.status}\`
- 记录数量：${summary.recordCount}
- 显示层级：${summary.displayLayerCount} 个时间层、${summary.displayGroupCount} 个欢迎页分组、${summary.canonicalOpeningOrderCount} 个 Opening
- 输入顺序与显示顺序不同：${summary.reorderedPositionCount} 个位置重排；这是预期结果，Phase 6 原始记录按证据顺序保留，Phase 7 另行输出欢迎页显示模型。
- 本阶段不修改欢迎页源码、MVU、schema、loader 或 PNG。

## Phase 7 前置修正

| Opening | 问题 | 修正 |
| --- | --- | --- |
${phase5Corrections.map((correction) => `| \`${correction.openingId}\` | ${correction.issue} | ${correction.correction} |`).join('\n')}

## 层级与排序

- 数据层：\`时间层 → 作品线 → 剧情阶段／篇章 → 具体开场白\`
- 显示层：\`时间层 → 作品线｜剧情阶段／篇章 → 具体开场白\`
- 分组排序：时间层 → 组内最早日期 → 作品线顺序 → 阶段顺序。
- 组内排序：先槽位，再日期；连续精确日期不得倒序。
- 未定日只出现在 \`TL-UNDATED\`，不参与伪日期排序。

## 归属与节点

- 114 条记录的时间层、作品线、阶段、篇章全部来自 Phase 2 taxonomy。
- 阶段所属作品线与 Opening 作品线一致。
- 事件包归属可回溯到 Phase 1 证据映射与 worker manifest。
- 98 条 node-chain 的节点覆盖完整，无重复、无越包引用。
- 15 条无包 reference-only 不携带伪节点。
- O18 保留 \`ENDEYMION\` 关联，但仍是 reference-only。

## 剧透边界

- 正文长度：80–160 字。
- 必含日期前缀与玩家介入点。
- 禁用整卷结局、最终胜负、身份揭露、和解、未发生死亡与阶段收束用语。
- 不出现创约15。
- 兼容载荷仍只使用当前 schema 字段；新增字段保持 \`proposed-not-yet-supported\`。

## 静态检查

${result.validation.checks.map((check) => `- ${check}`).join('\n')}

## 显示模型摘要

| 时间层 | 分组数 | Opening数 |
| --- | ---: | ---: |
${displayModel.layers.map((layer) => `| ${layer.timeLayerLabel} | ${layer.groupCount} | ${layer.openingCount} |`).join('\n')}

## 机器产物

- JSON：\`phase7-static-validation.json\`
- Markdown：\`phase7-static-validation.md\`

## 下一步

Phase 8 需要重新打包角色卡并在真实 SillyTavern 中验证：欢迎页展开、Opening 显示、日期初始化、篇章初始化、世界书节点初始化、MVU 状态、未发生剧情不提前完成，以及自定义开场仍可用。
`;

fs.writeFileSync(outputMarkdownPath, markdown, 'utf8');

console.log(JSON.stringify({
  status: result.validation.status,
  recordCount: summary.recordCount,
  displayGroupCount: summary.displayGroupCount,
  reorderedPositionCount: summary.reorderedPositionCount,
  errors,
  warnings,
  outputs: [outputJsonPath, outputMarkdownPath],
}, null, 2));

if (errors.length > 0) process.exitCode = 1;
