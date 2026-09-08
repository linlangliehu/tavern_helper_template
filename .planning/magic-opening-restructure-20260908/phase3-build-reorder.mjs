import fs from 'node:fs';

const decoder = new TextDecoder('utf-8', { fatal: true });
const read = file => decoder.decode(fs.readFileSync(file));
const inputPath = '.planning/magic-opening-restructure-20260908/phase2-opening-ids.json';
const outputJsonPath = '.planning/magic-opening-restructure-20260908/phase3-current-reorder.json';
const outputMarkdownPath = '.planning/magic-opening-restructure-20260908/phase3-current-reorder.md';

const displayStageLabels = {
  'ST-INDEX-PREHISTORY': '前史',
  'ST-INDEX-OT': '旧约',
  'ST-INDEX-NT': '新约',
  'ST-INDEX-GT': '创约',
};

function unique(values) {
  return [...new Set(values)];
}

function escapeCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function welcomeGroupLabel(target, labels) {
  const workLineLabel = labels.workLine[target.workLineId];
  const stageLabel = displayStageLabels[target.stageId];
  return stageLabel
    ? `${workLineLabel}｜${stageLabel}·${target.chapterLabel}`
    : `${workLineLabel}｜${target.chapterLabel}`;
}

function buildLabels(phase2) {
  return {
    timeLayer: Object.fromEntries(phase2.taxonomy.timeLayers.map(row => [row.id, row.label])),
    workLine: Object.fromEntries(phase2.taxonomy.workLines.map(row => [row.id, row.label])),
    stage: Object.fromEntries(phase2.taxonomy.stages.map(row => [row.id, row.label])),
  };
}

function buildCurrentRecords(phase2, labels) {
  const targetById = new Map(phase2.targetOpenings.map(row => [row.openingId, row]));
  const targetOrderById = new Map(phase2.targetOpenings.map((row, index) => [row.openingId, index + 1]));

  return phase2.currentOpenings.map((current, currentIndex) => {
    const target = targetById.get(current.targetOpeningId);
    if (!target) throw new Error(`Unknown target opening: ${current.targetOpeningId}`);
    return {
      currentOpeningId: current.currentOpeningId,
      sourceIndex: currentIndex + 1,
      evidenceId: current.evidenceId,
      targetOpeningId: target.openingId,
      targetOrder: targetOrderById.get(target.openingId),
      timeLayerId: target.timeLayerId,
      timeLayerLabel: labels.timeLayer[target.timeLayerId],
      workLineId: target.workLineId,
      workLineLabel: labels.workLine[target.workLineId],
      stageId: target.stageId,
      stageLabel: labels.stage[target.stageId],
      chapterId: target.chapterId,
      chapterLabel: target.chapterLabel,
      slot: target.slot,
      slotLabel: target.slotLabel,
      oldGroupIndex: current.groupIndex,
      oldGroupName: current.groupName,
      oldDate: current.date,
      oldTag: current.tag,
      oldDescription: current.description,
      preserveText: true,
      migrationAction: target.currentOpeningIds.length > 1 ? 'merge' : 'review',
    };
  });
}

function buildChapterGroups(records, phase2, labels) {
  const grouped = new Map();
  for (const record of records) {
    if (!grouped.has(record.chapterId)) {
      grouped.set(record.chapterId, []);
    }
    grouped.get(record.chapterId).push(record);
  }

  const groups = [...grouped.entries()].map(([chapterId, chapterRecords]) => {
    const targetOpeningIds = unique(chapterRecords.map(record => record.targetOpeningId));
    const targets = targetOpeningIds.map(id => phase2.targetOpenings.find(target => target.openingId === id));
    const primaryTarget = targets[0];
    return {
      chapterId,
      targetOpeningIds,
      timeLayerId: primaryTarget.timeLayerId,
      timeLayerLabel: labels.timeLayer[primaryTarget.timeLayerId],
      workLineId: primaryTarget.workLineId,
      workLineLabel: labels.workLine[primaryTarget.workLineId],
      stageId: primaryTarget.stageId,
      stageLabel: labels.stage[primaryTarget.stageId],
      chapterLabel: primaryTarget.chapterLabel,
      welcomeGroupLabel: welcomeGroupLabel(primaryTarget, labels),
      currentOpeningIds: chapterRecords.map(record => record.currentOpeningId),
      oldGroupKeys: unique(chapterRecords.map(record => `${record.oldGroupIndex}|${record.oldGroupName}`)),
      oldGroupNames: unique(chapterRecords.map(record => record.oldGroupName)),
      minTargetOrder: Math.min(...chapterRecords.map(record => record.targetOrder)),
    };
  });

  groups.sort((left, right) => left.minTargetOrder - right.minTargetOrder);
  groups.forEach((group, index) => {
    group.groupDisplayOrder = index + 1;
    group.action = group.oldGroupKeys.length > 1 ? 'merge-old-groups' : 'relabel';
  });

  const groupByChapterId = new Map(groups.map(group => [group.chapterId, group]));
  for (const group of groups) {
    const chapterRecords = records
      .filter(record => record.chapterId === group.chapterId)
      .sort((left, right) => left.targetOrder - right.targetOrder
        || left.sourceIndex - right.sourceIndex);
    chapterRecords.forEach((record, index) => {
      record.newGroupOrder = group.groupDisplayOrder;
      record.newGroupLabel = group.welcomeGroupLabel;
      record.newPath = [
        record.timeLayerLabel,
        record.workLineLabel,
        `${displayStageLabels[record.stageId] ? `${displayStageLabels[record.stageId]}·` : ''}${record.chapterLabel}`,
      ];
      record.newOpeningOrderInGroup = index + 1;
      record.newOpeningLabel = record.slotLabel
        ? `${record.slotLabel}｜${record.oldDate}`
        : record.oldDate;
    });
  }

  records.sort((left, right) => left.newGroupOrder - right.newGroupOrder
    || left.newOpeningOrderInGroup - right.newOpeningOrderInGroup);
  records.forEach((record, index) => {
    record.newDisplayOrder = index + 1;
  });

  return { groups, groupByChapterId };
}

function buildOldGroupAudit(records) {
  const grouped = new Map();
  for (const record of records) {
    const key = `${record.oldGroupIndex}|${record.oldGroupName}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(record);
  }

  const nameCounts = new Map();
  for (const record of records) {
    nameCounts.set(record.oldGroupName, (nameCounts.get(record.oldGroupName) || 0) + 1);
  }

  return [...grouped.entries()].map(([key, groupRecords], index) => {
    const [groupIndex, groupName] = key.split('|');
    const chapterIds = unique(groupRecords.map(record => record.chapterId));
    const workLineIds = unique(groupRecords.map(record => record.workLineId));
    const timeLayerIds = unique(groupRecords.map(record => record.timeLayerId));
    const issues = [];
    if (chapterIds.length > 1) issues.push('cross-chapter');
    if (workLineIds.length > 1) issues.push('cross-work-line');
    if (timeLayerIds.length > 1) issues.push('cross-time-layer');
    if ((nameCounts.get(groupName) || 0) > groupRecords.length) issues.push('duplicate-old-name');
    return {
      oldGroupKey: key,
      oldGroupIndex: Number(groupIndex),
      oldGroupName: groupName,
      auditOrder: index + 1,
      currentOpeningIds: groupRecords.map(record => record.currentOpeningId),
      currentOpeningCount: groupRecords.length,
      evidenceIds: unique(groupRecords.map(record => record.evidenceId)),
      targetOpeningIds: unique(groupRecords.map(record => record.targetOpeningId)),
      newChapterIds: chapterIds,
      newWorkLineIds: workLineIds,
      newTimeLayerIds: timeLayerIds,
      issues,
      action: chapterIds.length > 1 ? 'split' : 'relabel',
    };
  }).sort((left, right) => left.oldGroupIndex - right.oldGroupIndex
    || left.oldGroupName.localeCompare(right.oldGroupName, 'zh-Hans-CN'));
}

function validate(phase2, records, groups, oldGroups) {
  const errors = [];
  const currentIds = records.map(record => record.currentOpeningId);
  const displayOrders = records.map(record => record.newDisplayOrder);
  const timeLayerOrderById = new Map(phase2.taxonomy.timeLayers.map(row => [row.id, row.order]));
  const expectedCurrentIds = phase2.currentOpenings.map(row => row.currentOpeningId);

  if (records.length !== 87) errors.push(`Expected 87 current openings, found ${records.length}`);
  if (currentIds.length !== new Set(currentIds).size) errors.push('Duplicate current opening IDs');
  if (new Set(currentIds).size !== new Set(expectedCurrentIds).size) errors.push('Current opening ID set mismatch');
  if (displayOrders.length !== 87 || displayOrders.some((order, index) => order !== index + 1)) errors.push('Invalid display order');
  if (groups.length !== new Set(groups.map(group => group.chapterId)).size) errors.push('Duplicate chapter group IDs');
  if (groups.map(group => group.welcomeGroupLabel).length !== new Set(groups.map(group => group.welcomeGroupLabel)).size) errors.push('Duplicate welcome group labels');
  if (groups.reduce((total, group) => total + group.currentOpeningIds.length, 0) !== 87) errors.push('Chapter group coverage mismatch');
  if (groups.some(group => group.targetOpeningIds.length === 0)) errors.push('Empty chapter group');
  if (oldGroups.length !== 39) errors.push(`Expected 39 old groups, found ${oldGroups.length}`);
  if (oldGroups.reduce((total, group) => total + group.currentOpeningCount, 0) !== 87) errors.push('Old group coverage mismatch');
  if (records.some(record => !record.preserveText)) errors.push('Legacy text preservation disabled');
  if (records.some((record, index) => index > 0
    && timeLayerOrderById.get(record.timeLayerId) < timeLayerOrderById.get(records[index - 1].timeLayerId))) {
    errors.push('Time layer order regression');
  }
  if (records.some(record => record.newGroupOrder < 1 || record.newGroupOrder > groups.length)) errors.push('Invalid group order');
  if (records.some(record => record.newOpeningOrderInGroup < 1)) errors.push('Invalid opening order in group');

  if (errors.length) throw new Error(`Phase 3 validation failed:\n${errors.join('\n')}`);
}

function summarize(records, groups, oldGroups) {
  const byTimeLayer = {};
  for (const group of groups) byTimeLayer[group.timeLayerId] = (byTimeLayer[group.timeLayerId] || 0) + 1;
  const currentByTimeLayer = {};
  for (const record of records) currentByTimeLayer[record.timeLayerId] = (currentByTimeLayer[record.timeLayerId] || 0) + 1;
  return {
    currentOpeningCount: records.length,
    existingTargetOpeningCount: unique(records.map(record => record.targetOpeningId)).length,
    newWelcomeChapterCount: groups.length,
    oldWelcomeGroupCount: oldGroups.length,
    preservedCurrentOpeningCount: records.filter(record => record.preserveText).length,
    splitOldGroupCount: oldGroups.filter(group => group.action === 'split').length,
    crossWorkLineOldGroupCount: oldGroups.filter(group => group.issues.includes('cross-work-line')).length,
    duplicateOldNameGroupCount: oldGroups.filter(group => group.issues.includes('duplicate-old-name')).length,
    mergedNewChapterCount: groups.filter(group => group.action === 'merge-old-groups').length,
    relabeledNewChapterCount: groups.filter(group => group.action === 'relabel').length,
    newChapterCountByTimeLayer: byTimeLayer,
    currentOpeningCountByTimeLayer: currentByTimeLayer,
  };
}

function writeMarkdown(result, outputFile) {
  const lines = [];
  lines.push('# Phase 3：现有 87 项开场重排');
  lines.push('');
  lines.push('## 结论');
  lines.push('');
  lines.push(`- 保留并重排现有开场：${result.summary.currentOpeningCount} 条。`);
  lines.push(`- 覆盖目标 Opening：${result.summary.existingTargetOpeningCount} 个。`);
  lines.push(`- 新欢迎页章节分组：${result.summary.newWelcomeChapterCount} 个。`);
  lines.push(`- 旧欢迎页分组：${result.summary.oldWelcomeGroupCount} 个，其中 ${result.summary.splitOldGroupCount} 个需要拆分。`);
  lines.push(`- 跨作品线混组：${result.summary.crossWorkLineOldGroupCount} 个旧分组。`);
  lines.push(`- 新分组中 ${result.summary.mergedNewChapterCount} 个需要合并旧分组，${result.summary.relabeledNewChapterCount} 个为单旧分组改名。`);
  lines.push('- 排序规则：先按时间层，再沿用 Phase 1/2 的共同时间轴顺序；作品线用于分类归属，不强制打断时间轴。');
  lines.push('- 本阶段只生成迁移编排，不重写正文、不新增开场、不修改欢迎页源码。');
  lines.push('');
  lines.push('## 时间层分布');
  lines.push('');
  lines.push('| 时间层 | 新章节数 | 现有开场数 |');
  lines.push('|---|---:|---:|');
  for (const layer of result.taxonomy.timeLayers) {
    lines.push(`| ${escapeCell(layer.label)} | ${result.summary.newChapterCountByTimeLayer[layer.id] || 0} | ${result.summary.currentOpeningCountByTimeLayer[layer.id] || 0} |`);
  }
  lines.push('');
  lines.push(`## ${result.summary.newWelcomeChapterCount} 个新欢迎章节分组`);
  lines.push('');
  lines.push('| 顺序 | 时间层 | 新分组 | 目标 Opening | 旧入口数 | 旧分组 | 处理 |');
  lines.push('|---:|---|---|---|---:|---|---|');
  for (const group of result.chapterGroups) {
    lines.push(`| ${group.groupDisplayOrder} | ${escapeCell(group.timeLayerLabel)} | ${escapeCell(group.welcomeGroupLabel)} | ${group.targetOpeningIds.join('、')} | ${group.currentOpeningIds.length} | ${escapeCell(group.oldGroupNames.join('、'))} | ${group.action} |`);
  }
  lines.push('');
  lines.push(`## ${result.summary.currentOpeningCount} 条现有开场迁移表`);
  lines.push('');
  lines.push('| 新顺序 | Current ID | 旧分组 | 旧日期 | 目标 Opening | 新分组 | 组内顺序 | 处理 |');
  lines.push('|---:|---|---|---|---|---|---:|---|');
  for (const record of result.currentOpenings) {
    lines.push(`| ${record.newDisplayOrder} | ${record.currentOpeningId} | ${record.oldGroupIndex}. ${escapeCell(record.oldGroupName)} | ${escapeCell(record.oldDate)} | ${record.targetOpeningId} | ${escapeCell(record.newGroupLabel)} | ${record.newOpeningOrderInGroup} | ${record.migrationAction} |`);
  }
  lines.push('');
  lines.push(`## ${result.summary.oldWelcomeGroupCount} 个旧分组审计`);
  lines.push('');
  lines.push('| 旧分组 | 旧入口数 | 新章节 | 作品线 | 问题 | 处理 |');
  lines.push('|---|---:|---|---|---|---|');
  for (const group of result.oldGroups) {
    lines.push(`| ${group.oldGroupIndex}. ${escapeCell(group.oldGroupName)} | ${group.currentOpeningCount} | ${group.newChapterIds.join('、')} | ${group.newWorkLineIds.join('、')} | ${group.issues.join('、') || '无'} | ${group.action} |`);
  }
  lines.push('');
  lines.push('## 验收');
  lines.push('');
  lines.push('- 87 个现有 Current ID 全部保留且唯一。');
  lines.push('- 87 条显示顺序连续为 1–87。');
  lines.push('- 时间层顺序无回退，作品线与阶段分类全部来自 Phase 2。');
  lines.push('- 新章节分组覆盖全部 87 条旧入口，无空分组。');
  lines.push('- 39 个旧分组全部完成拆分、合并或改名审计。');
  lines.push('- 旧正文标记为保留，Phase 4 再处理剧透式改写。');
  lines.push('- 不新增 Phase 5 的缺失开场。');
  fs.writeFileSync(outputFile, lines.join('\n'), 'utf8');
}

function main() {
  const phase2 = JSON.parse(read(inputPath));
  if (phase2.validation.status !== 'passed') throw new Error('Phase 2 input validation is not passed');
  const labels = buildLabels(phase2);
  const currentRecords = buildCurrentRecords(phase2, labels);
  const { groups, groupByChapterId } = buildChapterGroups(currentRecords, phase2, labels);
  const oldGroups = buildOldGroupAudit(currentRecords);
  validate(phase2, currentRecords, groups, oldGroups);

  const result = {
    version: 1,
    generatedOn: '2026-09-08',
    sourcePhase: 'phase2-opening-ids.json',
    appliedToSource: false,
    taxonomy: phase2.taxonomy,
    orderingRule: {
      primary: 'time-layer-order',
      secondary: 'phase1-shared-chronology-order',
      classification: 'work-line-and-stage',
      note: '外传按实际日期保留在共同时间轴中；作品线用于分类归属，不强制连续排列。',
    },
    summary: summarize(currentRecords, groups, oldGroups),
    chapterGroups: groups.map(group => ({
      ...group,
      currentOpeningIds: [...group.currentOpeningIds],
      oldGroupKeys: [...group.oldGroupKeys],
      oldGroupNames: [...group.oldGroupNames],
    })),
    currentOpenings: currentRecords,
    oldGroups,
    validation: {
      status: 'passed',
      allCurrentOpeningsPreserved: currentRecords.length === 87,
      allCurrentIdsUnique: currentRecords.length === new Set(currentRecords.map(record => record.currentOpeningId)).size,
      displayOrderContinuous: currentRecords.every((record, index) => record.newDisplayOrder === index + 1),
      timeLayerOrderValid: !currentRecords.some((record, index) => index > 0
        && phase2.taxonomy.timeLayers.find(layer => layer.id === record.timeLayerId).order
        < phase2.taxonomy.timeLayers.find(layer => layer.id === currentRecords[index - 1].timeLayerId).order),
      allChapterGroupsCoverCurrentOpenings: groups.reduce((total, group) => total + group.currentOpeningIds.length, 0) === 87,
      allOldGroupsAudited: oldGroups.length === 39,
      noNewOpeningsAdded: unique(currentRecords.map(record => record.targetOpeningId)).length === 52,
      legacyTextPreserved: currentRecords.every(record => record.preserveText),
      welcomeGroupLabelsUnique: groups.length === new Set(groups.map(group => group.welcomeGroupLabel)).size,
    },
  };

  fs.writeFileSync(outputJsonPath, JSON.stringify(result, null, 2), 'utf8');
  writeMarkdown(result, outputMarkdownPath);
  console.log(JSON.stringify({ status: 'passed', ...result.summary, validation: result.validation }, null, 2));
}

main();
