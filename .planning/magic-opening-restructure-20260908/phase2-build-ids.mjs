import fs from 'node:fs';
import path from 'node:path';

const decoder = new TextDecoder('utf-8', { fatal: true });
const read = file => decoder.decode(fs.readFileSync(file));
const phase1Path = '.planning/magic-opening-restructure-20260908/phase1-opening-mapping.json';
const workerDir = '.planning/magic-worldbook-implementation-20260908';
const outputDir = '.planning/magic-opening-restructure-20260908';

const timeLayers = [
  { id: 'TL-YMINUS1', label: 'Y−1及更早前史', order: 1 },
  { id: 'TL-Y', label: 'Y年', order: 2 },
  { id: 'TL-YPLUS1', label: 'Y＋1年', order: 3 },
  { id: 'TL-UNDATED', label: '未定日／相对顺序', order: 4 },
];

const workLines = [
  { id: 'WL-INDEX', label: '魔法禁书目录本篇', order: 1 },
  { id: 'WL-RAILGUN', label: '某科学的超电磁炮', order: 2 },
  { id: 'WL-ACCELERATOR', label: '某科学的一方通行', order: 3 },
  { id: 'WL-ITEM', label: '暗部的ITEM', order: 4 },
  { id: 'WL-MENTAL-OUT', label: '心理掌握', order: 5 },
  { id: 'WL-OTHER-OFFICIAL', label: '其他正式外传', order: 6 },
  { id: 'WL-MEDIA-UNDATED', label: '动画、游戏、特典及未定日衍生', order: 7 },
];

const stages = [
  { id: 'ST-INDEX-PREHISTORY', label: '本篇前史', workLineId: 'WL-INDEX', order: 1 },
  { id: 'ST-INDEX-OT', label: '旧约', workLineId: 'WL-INDEX', order: 2 },
  { id: 'ST-INDEX-NT', label: '新约', workLineId: 'WL-INDEX', order: 3 },
  { id: 'ST-INDEX-GT', label: '创约', workLineId: 'WL-INDEX', order: 4 },
  { id: 'ST-RAILGUN-ARC', label: '超电磁炮篇章', workLineId: 'WL-RAILGUN', order: 5 },
  { id: 'ST-ACCELERATOR-ARC', label: '一方通行篇章', workLineId: 'WL-ACCELERATOR', order: 6 },
  { id: 'ST-ITEM-VOLUME', label: 'ITEM卷', workLineId: 'WL-ITEM', order: 7 },
  { id: 'ST-MENTAL-OUT-ARC', label: '心理掌握篇章', workLineId: 'WL-MENTAL-OUT', order: 8 },
  { id: 'ST-OFFICIAL-ARC', label: '正式外传篇章', workLineId: 'WL-OTHER-OFFICIAL', order: 9 },
  { id: 'ST-MEDIA-UNDATED', label: '媒体／未定日', workLineId: 'WL-MEDIA-UNDATED', order: 10 },
];

const workLineByEvidence = {
  P01: 'WL-RAILGUN', P02: 'WL-RAILGUN', P03: 'WL-RAILGUN', P04: 'WL-RAILGUN', P05: 'WL-RAILGUN',
  P06: 'WL-ITEM', P07: 'WL-ACCELERATOR', P08: 'WL-INDEX', P09: 'WL-ITEM', P10: 'WL-ITEM',
  P11: 'WL-ITEM', P12: 'WL-ITEM', P13: 'WL-RAILGUN', P14: 'WL-ITEM', P15: 'WL-RAILGUN',
  S01: 'WL-INDEX', S02: 'WL-INDEX', S03: 'WL-INDEX', S04: 'WL-INDEX', S05: 'WL-RAILGUN',
  S06: 'WL-RAILGUN', S07: 'WL-INDEX', S08: 'WL-RAILGUN', S09: 'WL-RAILGUN', S10: 'WL-RAILGUN', S11: 'WL-INDEX',
  O01: 'WL-RAILGUN', O02: 'WL-INDEX', O03: 'WL-RAILGUN', O04: 'WL-RAILGUN', O05: 'WL-RAILGUN',
  O06: 'WL-INDEX', O07: 'WL-RAILGUN', O08: 'WL-INDEX', O09: 'WL-RAILGUN', O10: 'WL-INDEX',
  O11: 'WL-INDEX', O12: 'WL-INDEX', O13: 'WL-RAILGUN', O14: 'WL-ACCELERATOR', O15: 'WL-OTHER-OFFICIAL',
  O16: 'WL-INDEX', O17: 'WL-OTHER-OFFICIAL', O18: 'WL-OTHER-OFFICIAL', O19: 'WL-ACCELERATOR',
  O20: 'WL-INDEX', O21: 'WL-INDEX', O22: 'WL-INDEX', O23: 'WL-INDEX', O24: 'WL-RAILGUN',
  O25: 'WL-INDEX', O26: 'WL-RAILGUN', O27: 'WL-OTHER-OFFICIAL', O28: 'WL-INDEX', O29: 'WL-INDEX',
  O30: 'WL-MENTAL-OUT', O31: 'WL-INDEX', O32: 'WL-INDEX', O33: 'WL-RAILGUN', O34: 'WL-INDEX',
  O35: 'WL-INDEX', O36: 'WL-INDEX', O37: 'WL-INDEX',
  N01: 'WL-INDEX', N02: 'WL-INDEX', N03: 'WL-INDEX', N04: 'WL-INDEX', N05: 'WL-INDEX',
  N06: 'WL-INDEX', N07: 'WL-INDEX', N08: 'WL-INDEX', N09: 'WL-INDEX', N10: 'WL-INDEX',
  N11: 'WL-INDEX', N12: 'WL-INDEX', N13: 'WL-INDEX', N14: 'WL-INDEX', N15: 'WL-INDEX',
  N16: 'WL-INDEX', N17: 'WL-INDEX', N18: 'WL-INDEX', N19: 'WL-INDEX', N20: 'WL-INDEX',
  N21: 'WL-INDEX', N22: 'WL-INDEX', N23: 'WL-INDEX',
  G01: 'WL-INDEX', G02: 'WL-INDEX', G03: 'WL-INDEX', G04: 'WL-INDEX', G05: 'WL-INDEX',
  G06: 'WL-INDEX', G07: 'WL-INDEX', G08: 'WL-INDEX', G09: 'WL-INDEX', G10: 'WL-INDEX',
  G11: 'WL-INDEX', G12: 'WL-INDEX', G13: 'WL-INDEX', G14: 'WL-INDEX',
  X01: 'WL-MEDIA-UNDATED', X02: 'WL-MEDIA-UNDATED', X03: 'WL-MEDIA-UNDATED',
  X04: 'WL-MEDIA-UNDATED', X05: 'WL-MEDIA-UNDATED', X06: 'WL-MEDIA-UNDATED',
};

const targetSlotCounts = {
  P01: 2, O01: 3, O11: 2, G07: 3, G10: 2, G14: 2,
};

const slotLabels = {
  P01: ['夺取才人工房', '控制权变化'],
  O01: ['前奏', '主体', '收束'],
  O11: ['最后之作线', '三线并行'],
  G07: ['1月1日', '1月2日', '1月3日'],
  G10: ['冲突开始前', '1月6日23:58附近'],
  G14: ['1月9日早晨', '1月9日08:30附近'],
};

const currentAssignments = [
  'S01','S02','S03','S04','S07','S07','S07','S07','S11','S11',
  'S05','P03','P13','S08','O08','S09','O01','O01','O01','O01','O01',
  'S10','O02','O02','O02','O02','O02','O07','O07','O07','O08','O08','O08','O08',
  'O09','O09','O09','O10','O11','O14','O14','O14','O12','O16','O18','O20','O21','O23','O24',
  'O26','O26','O26','O26','O28','O31','O32','O34','O34','O36','O35','O32','O32','O32','O33','O33','O33',
  'O27','O27','O37','O37','N01','N03','N04','N05','N06','N08','N10','N10','N10','N12','N13','N15','N16','N17','N18','N20','N20',
];

function stageForEvidence(evidenceId, workLineId) {
  if (workLineId === 'WL-INDEX') {
    if (/^P08$|^S0[1-4]$|^S07$|^S11$/.test(evidenceId)) return 'ST-INDEX-PREHISTORY';
    if (evidenceId.startsWith('N')) return 'ST-INDEX-NT';
    if (evidenceId.startsWith('G')) return 'ST-INDEX-GT';
    return 'ST-INDEX-OT';
  }
  if (workLineId === 'WL-RAILGUN') return 'ST-RAILGUN-ARC';
  if (workLineId === 'WL-ACCELERATOR') return 'ST-ACCELERATOR-ARC';
  if (workLineId === 'WL-ITEM') return 'ST-ITEM-VOLUME';
  if (workLineId === 'WL-MENTAL-OUT') return 'ST-MENTAL-OUT-ARC';
  if (workLineId === 'WL-OTHER-OFFICIAL') return 'ST-OFFICIAL-ARC';
  return 'ST-MEDIA-UNDATED';
}

function loadPackageReceipts() {
  const packages = new Map();
  for (const file of fs.readdirSync(workerDir).filter(file => file.startsWith('worker-') && file.endsWith('.json')).sort()) {
    const manifest = JSON.parse(read(path.join(workerDir, file)));
    for (const entry of manifest.files || []) {
      if (entry.packageId) packages.set(entry.packageId, entry);
    }
  }
  return packages;
}

function main() {
  const phase1 = JSON.parse(read(phase1Path));
  const evidenceById = new Map(phase1.evidenceMappings.map(row => [row.evidenceId, row]));
  const packageReceipts = loadPackageReceipts();
  if (currentAssignments.length !== phase1.currentOpenings.length) {
    throw new Error(`Expected ${phase1.currentOpenings.length} current assignments, found ${currentAssignments.length}`);
  }

  const currentOpeningRecords = phase1.currentOpenings.map((scene, index) => {
    const evidenceId = currentAssignments[index];
    const evidence = evidenceById.get(evidenceId);
    if (!evidence) throw new Error(`Unknown evidence assignment: ${evidenceId}`);
    return {
      currentOpeningId: `CUR-${String(index + 1).padStart(4, '0')}`,
      evidenceId,
      groupName: scene.groupName,
      groupIndex: scene.groupIndex,
      date: scene.date,
      tag: scene.tag,
      description: scene.description,
    };
  });

  const targetOpenings = [];
  for (const evidence of phase1.evidenceMappings) {
    const slotCount = targetSlotCounts[evidence.evidenceId] || 1;
    const workLineId = workLineByEvidence[evidence.evidenceId];
    if (!workLineId) throw new Error(`Missing work line for ${evidence.evidenceId}`);
    const stageId = stageForEvidence(evidence.evidenceId, workLineId);
    const primaryPackageId = evidence.directPackageIds[0] || evidence.relatedPackageIds[0] || null;
    const packageReceipt = primaryPackageId ? packageReceipts.get(primaryPackageId) : null;
    const startNodeId = packageReceipt?.entryNode || packageReceipt?.nodeIds?.[0] || null;
    for (let slot = 1; slot <= slotCount; slot += 1) {
      const slotLabel = slotLabels[evidence.evidenceId]?.[slot - 1] || null;
      targetOpenings.push({
        openingId: `OP-${evidence.evidenceId}-${String(slot).padStart(2, '0')}`,
        evidenceId: evidence.evidenceId,
        slot,
        slotLabel,
        timeLayerId: evidence.timeLayer === 'Y−1及更早前史' ? 'TL-YMINUS1'
          : evidence.timeLayer === 'Y年' ? 'TL-Y'
          : evidence.timeLayer === 'Y＋1年' ? 'TL-YPLUS1'
          : 'TL-UNDATED',
        workLineId,
        stageId,
        chapterId: `CH-${evidence.evidenceId}`,
        chapterLabel: evidence.eventTitle,
        packageIds: [...evidence.directPackageIds, ...evidence.relatedPackageIds],
        primaryPackageId,
        startNodeId,
        dateLabel: evidence.originalImageDate,
        coverage: evidence.coverage,
      });
    }
  }

  const currentByTarget = new Map();
  currentOpeningRecords.forEach((record, index) => {
    const evidence = evidenceById.get(record.evidenceId);
    const slotCount = targetSlotCounts[record.evidenceId] || 1;
    let slot = 1;
    if (record.evidenceId === 'O01') {
      slot = index === 16 ? 2 : index >= 17 && index <= 18 ? 2 : 3;
    } else if (record.evidenceId === 'O11') {
      slot = 1;
    }
    if (slot > slotCount) slot = slotCount;
    const targetOpeningId = `OP-${record.evidenceId}-${String(slot).padStart(2, '0')}`;
    record.targetOpeningId = targetOpeningId;
    if (!currentByTarget.has(targetOpeningId)) currentByTarget.set(targetOpeningId, []);
    currentByTarget.get(targetOpeningId).push(record.currentOpeningId);
  });

  for (const target of targetOpenings) {
    target.currentOpeningIds = currentByTarget.get(target.openingId) || [];
    target.status = target.currentOpeningIds.length ? 'existing' : 'new';
    target.mappingAction = target.currentOpeningIds.length > 1 ? 'merge'
      : target.currentOpeningIds.length === 1 ? 'review'
      : target.packageIds.length ? 'add' : 'reference-only';
  }

  const openingIds = targetOpenings.map(row => row.openingId);
  const chapterIds = targetOpenings.map(row => row.chapterId);
  const uniqueChapterIds = [...new Set(chapterIds)];
  const expectedTargetOpeningCount = phase1.evidenceMappings.reduce(
    (total, evidence) => total + (targetSlotCounts[evidence.evidenceId] || 1),
    0,
  );
  const errors = [];
  if (new Set(openingIds).size !== openingIds.length) errors.push('Duplicate target opening IDs');
  if (uniqueChapterIds.length !== phase1.evidenceMappings.length) {
    errors.push(`Expected ${phase1.evidenceMappings.length} unique chapter IDs, found ${uniqueChapterIds.length}`);
  }
  if (targetOpenings.length !== expectedTargetOpeningCount) {
    errors.push(`Expected ${expectedTargetOpeningCount} target openings, found ${targetOpenings.length}`);
  }
  for (const record of currentOpeningRecords) {
    if (!targetOpenings.some(target => target.openingId === record.targetOpeningId)) errors.push(`Missing target opening: ${record.targetOpeningId}`);
  }
  for (const target of targetOpenings) {
    const expectedChapterId = `CH-${target.evidenceId}`;
    if (target.chapterId !== expectedChapterId) errors.push(`Chapter ID mismatch for ${target.openingId}`);
    if (!timeLayers.some(layer => layer.id === target.timeLayerId)) errors.push(`Unknown time layer for ${target.openingId}`);
    if (!workLines.some(line => line.id === target.workLineId)) errors.push(`Unknown work line for ${target.openingId}`);
    if (!stages.some(stage => stage.id === target.stageId)) errors.push(`Unknown stage for ${target.openingId}`);
    for (const packageId of target.packageIds) {
      if (!packageReceipts.has(packageId)) errors.push(`Missing package: ${packageId}`);
    }
    if (target.primaryPackageId && !packageReceipts.has(target.primaryPackageId)) errors.push(`Missing primary package: ${target.primaryPackageId}`);
  }
  if (errors.length) throw new Error(`Phase 2 validation failed:\n${errors.join('\n')}`);

  const result = {
    version: 1,
    generatedOn: '2026-09-08',
    taxonomy: { timeLayers, workLines, stages },
    summary: {
      evidenceCount: phase1.evidenceMappings.length,
      targetOpeningCount: targetOpenings.length,
      currentOpeningCount: currentOpeningRecords.length,
      uniqueChapterCount: new Set(chapterIds).size,
      targetOpeningsWithCurrent: targetOpenings.filter(row => row.currentOpeningIds.length > 0).length,
      newTargetOpenings: targetOpenings.filter(row => row.currentOpeningIds.length === 0).length,
      referenceOnlyTargets: targetOpenings.filter(row => row.packageIds.length === 0).length,
      currentOpeningsToMerge: currentOpeningRecords.filter(record => (currentByTarget.get(record.targetOpeningId) || []).length > 1).length,
    },
    targetOpenings,
    currentOpenings: currentOpeningRecords,
    validation: {
      status: 'passed',
      allCurrentOpeningsAssigned: currentOpeningRecords.length === phase1.currentOpenings.length,
      allTargetOpeningIdsUnique: new Set(openingIds).size === openingIds.length,
      allChapterIdsUnique: uniqueChapterIds.length === phase1.evidenceMappings.length,
      targetOpeningCountExact: targetOpenings.length === expectedTargetOpeningCount,
      allTaxonomyReferencesValid: targetOpenings.every(target => timeLayers.some(layer => layer.id === target.timeLayerId)
        && workLines.some(line => line.id === target.workLineId)
        && stages.some(stage => stage.id === target.stageId)),
      allTargetPackagesExist: targetOpenings.every(row => row.packageIds.every(packageId => packageReceipts.has(packageId))),
    },
  };

  fs.writeFileSync(path.join(outputDir, 'phase2-opening-ids.json'), JSON.stringify(result, null, 2), 'utf8');
  writeMarkdown(result, path.join(outputDir, 'phase2-opening-ids.md'));
  console.log(JSON.stringify({ status: 'passed', ...result.summary }, null, 2));
}

function escapeCell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function writeMarkdown(result, outputFile) {
  const lines = [];
  lines.push('# Phase 2：稳定分类与唯一 ID');
  lines.push('');
  lines.push('## 结论');
  lines.push('');
  lines.push(`- 证据：${result.summary.evidenceCount} 项。`);
  lines.push(`- 目标开场：${result.summary.targetOpeningCount} 个。`);
  lines.push(`- 当前开场：${result.summary.currentOpeningCount} 个。`);
  lines.push(`- 稳定章节：${result.summary.uniqueChapterCount} 个。`);
  lines.push(`- 有当前入口的目标开场：${result.summary.targetOpeningsWithCurrent} 个。`);
  lines.push(`- 需新增的目标开场：${result.summary.newTargetOpenings} 个。`);
  lines.push(`- reference-only 目标：${result.summary.referenceOnlyTargets} 个。`);
  lines.push(`- 需合并的当前开场：${result.summary.currentOpeningsToMerge} 个。`);
  lines.push('');
  lines.push('## 分类体系');
  lines.push('');
  lines.push('### 时间层');
  lines.push('');
  lines.push('| ID | 名称 |');
  lines.push('|---|---|');
  for (const layer of result.taxonomy.timeLayers) lines.push(`| ${layer.id} | ${escapeCell(layer.label)} |`);
  lines.push('');
  lines.push('### 作品线');
  lines.push('');
  lines.push('| ID | 名称 |');
  lines.push('|---|---|');
  for (const line of result.taxonomy.workLines) lines.push(`| ${line.id} | ${escapeCell(line.label)} |`);
  lines.push('');
  lines.push('### 剧情阶段');
  lines.push('');
  lines.push('| ID | 名称 | 作品线 |');
  lines.push('|---|---|---|');
  for (const stage of result.taxonomy.stages) lines.push(`| ${stage.id} | ${escapeCell(stage.label)} | ${stage.workLineId} |`);
  lines.push('');
  lines.push('## 114 个目标开场');
  lines.push('');
  lines.push('| Opening ID | 时间层 | 作品线 | 阶段 | 章节 | 包 | 起始节点 | 当前入口 | 状态 |');
  lines.push('|---|---|---|---|---|---|---|---|---|');
  for (const row of result.targetOpenings) {
    lines.push(`| ${row.openingId} | ${row.timeLayerId} | ${row.workLineId} | ${row.stageId} | ${escapeCell(row.chapterLabel)} | ${escapeCell(row.packageIds.join('、') || '无')} | ${row.startNodeId || '无'} | ${row.currentOpeningIds.join('、') || '无'} | ${row.status} |`);
  }
  lines.push('');
  lines.push('## 87 个现有开场映射');
  lines.push('');
  lines.push('| Current ID | 当前分组 | 日期 | 目标 Opening | 证据 |');
  lines.push('|---|---|---|---|---|');
  for (const row of result.currentOpenings) {
    lines.push(`| ${row.currentOpeningId} | ${row.groupIndex}. ${escapeCell(row.groupName)} | ${escapeCell(row.date)} | ${row.targetOpeningId} | ${row.evidenceId} |`);
  }
  lines.push('');
  lines.push('## 验收');
  lines.push('');
  lines.push('- 114 个目标 Opening ID 全部唯一。');
  lines.push('- 106 个章节 ID 全部唯一。');
  lines.push('- 87 个当前开场全部映射到唯一目标 Opening。');
  lines.push('- 所有直接包与主包均存在于世界书清单。');
  lines.push('- 本阶段只建立 ID 与分类，不修改欢迎页源码。');
  fs.writeFileSync(outputFile, lines.join('\n'), 'utf8');
}

main();
