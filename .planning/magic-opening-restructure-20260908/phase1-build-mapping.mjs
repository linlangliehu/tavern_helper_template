import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const decoder = new TextDecoder('utf-8', { fatal: true });
const read = file => decoder.decode(fs.readFileSync(file));
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const unique = values => [...new Set(values.filter(Boolean))];
const compact = values => unique(values).sort();

const evidencePath = 'docs/魔禁四月至次年一月-事件证据表.md';
const welcomePath = 'src/魔法禁书目录模拟器/自定义开局/欢迎页.txt';
const oldMappingPath = '.planning/magic-worldbook-implementation-20260908/evidence-mapping.json';
const workerDir = '.planning/magic-worldbook-implementation-20260908';
const outputDir = '.planning/magic-opening-restructure-20260908';
const verificationReportPath = '.agent-artifacts/magic-worldbook-implementation-20260908/verification-final-after-phase0-rollback.json';

const directPackageByEvidence = {
  P01: ['TALENT-WORKSHOP'], P02: ['FIRST-YEAR'], P03: ['FIRST-YEAR'], P04: ['FIRST-YEAR'], P05: [],
  P06: ['ITEM-01'], P07: ['BIOHACKER'], P08: ['MENTAL-PAST'], P09: ['ITEM-02'], P10: ['ITEM-03'],
  P11: ['ITEM-04'], P12: ['ITEM-05'], P13: ['FIRST-YEAR'], P14: ['ITEM-06'], P15: ['FIRST-YEAR'],
  S01: ['GEMSTONE'], S02: [], S03: [], S04: ['GEMSTONE'], S05: ['MIKOTO-PAST'], S06: [],
  S07: ['GEMSTONE'], S08: ['FIRST-YEAR', 'ABSOLUTE-EVOLVE'], S09: ['FANTASY-HAND'],
  S10: ['RUSSIA-DEMONSTRATION'], S11: [],
  O01: ['FANTASY-HAND'], O02: ['INDEX-FALL'], O03: [], O04: [], O05: [], O06: ['DEEP-BLOOD'],
  O07: ['POLTERGEIST'], O08: ['ABSOLUTE-EVOLVE'], O09: ['SILENT-PARTY'], O10: ['ANGEL-FALL'],
  O11: ['AUGUST-31'], O12: ['KAZAKIRI'], O13: ['LIBERAL-ARTS-CITY'], O14: ['NECROMANCER'],
  O15: ['DARK-MATTER'], O16: ['BOOK-OF-LAW'], O17: ['NECESSARIUS-EXAM'], O18: [],
  O19: ['NECTAR'], O20: ['TREE-DIAGRAM-REMNANT'], O21: ['ENDEYMION'], O22: ['DAIHASEISAI'],
  O23: ['ST-CROSS'], O24: ['DAIHASEISAI'], O25: ['ADRIA'], O26: ['DREAM-RANKER'],
  O27: ['ASTRAL-BUDDY'], O28: ['ST0930'], O29: ['SKILL-OUT'], O30: ['MENTAL-OUT'],
  O31: ['CDOC'], O32: ['DARK-BATTLE'], O33: ['JAILBREAK'], O34: ['ACQUA'],
  O35: ['BRITISH-ROYAL'], O36: ['DRAGON'], O37: ['WW3'],
  N01: ['NT-FRESHMEN'], N02: ['NT-FRESHMEN'], N03: ['NT-HAWAII'], N04: ['NT-NATURAL-SELECTOR'],
  N05: ['NT-ICHIHANARAN'], N06: ['NT-AGITATE-HALATION'], N07: ['GREMLIN'], N08: ['GREMLIN'],
  N09: ['GREMLIN'], N10: ['MENTAL-STINGER'], N11: [], N12: ['NT-SAINT-GERMAIN'],
  N13: ['NT-HIGH-PRIEST'], N14: ['NT-WORLD-REJECTER'], N15: ['NT-SALOME'], N16: ['NT-HEAT-WAVE'],
  N17: ['NT-KAMISATO-RESCUE'], N18: ['NT-ALEISTER'], N19: ['NT-PROCESSOR-SUIT'],
  N20: ['CORONZON'], N21: ['CORONZON'], N22: ['CORONZON'], N23: ['NT-22R'],
  G01: ['GENESIS-01'], G02: ['GENESIS-02'], G03: ['GENESIS-03'], G04: ['GENESIS-04'],
  G05: ['GENESIS-05'], G06: ['GENESIS-06'], G07: ['GENESIS-07'], G08: ['GENESIS-08'],
  G09: ['GENESIS-09'], G10: ['GENESIS-10'], G11: ['GENESIS-11'], G12: ['GENESIS-12'],
  G13: ['GENESIS-13'], G14: ['GENESIS-14'],
  X01: [], X02: [], X03: [], X04: [], X05: [], X06: [],
};

const relatedPackageByEvidence = {
  O18: ['ENDEYMION'],
};

const referenceFileByEvidence = {
  P05: 'src/魔法禁书目录模拟器/世界书/剧情事件/支线/前史与SS2节点索引.txt',
  S02: 'src/魔法禁书目录模拟器/世界书/剧情事件/支线/前史与SS2节点索引.txt',
  S03: 'src/魔法禁书目录模拟器/世界书/剧情事件/支线/前史与SS2节点索引.txt',
  S06: 'src/魔法禁书目录模拟器/世界书/剧情事件/支线/前史与SS2节点索引.txt',
  S11: 'src/魔法禁书目录模拟器/世界书/剧情事件/支线/前史与SS2节点索引.txt',
  O03: 'src/魔法禁书目录模拟器/世界书/剧情事件/支线/动画游戏与未定日外传索引.txt',
  O04: 'src/魔法禁书目录模拟器/世界书/剧情事件/支线/动画游戏与未定日外传索引.txt',
  O05: 'src/魔法禁书目录模拟器/世界书/剧情事件/支线/动画游戏与未定日外传索引.txt',
  O18: 'src/魔法禁书目录模拟器/世界书/剧情事件/支线/动画游戏与未定日外传索引.txt',
  N11: 'src/魔法禁书目录模拟器/世界书/剧情事件/支线/动画游戏与未定日外传索引.txt',
  X01: 'src/魔法禁书目录模拟器/世界书/剧情事件/支线/前史与SS2节点索引.txt',
  X02: 'src/魔法禁书目录模拟器/世界书/剧情事件/支线/动画游戏与未定日外传索引.txt',
  X03: 'src/魔法禁书目录模拟器/世界书/剧情事件/支线/动画游戏与未定日外传索引.txt',
  X04: 'src/魔法禁书目录模拟器/世界书/剧情事件/支线/动画游戏与未定日外传索引.txt',
  X05: 'src/魔法禁书目录模拟器/世界书/剧情事件/支线/动画游戏与未定日外传索引.txt',
  X06: 'src/魔法禁书目录模拟器/世界书/剧情事件/支线/动画游戏与未定日外传索引.txt',
};

const packageToWelcomeGroups = {
  GEMSTONE: [1], 'MIKOTO-PAST': [2], 'FIRST-YEAR': [3], 'ABSOLUTE-EVOLVE': [4, 9],
  'FANTASY-HAND': [5], 'RUSSIA-DEMONSTRATION': [6], 'INDEX-FALL': [7], POLTERGEIST: [8],
  'SILENT-PARTY': [10], 'ANGEL-FALL': [11], 'AUGUST-31': [11], NECROMANCER: [12],
  KAZAKIRI: [13], 'BOOK-OF-LAW': [14], ENDEYMION: [15, 17], 'TREE-DIAGRAM-REMNANT': [16],
  DAIHASEISAI: [18], 'ST-CROSS': [18], FESTIVAL: [18], 'DREAM-RANKER': [19], ST0930: [20],
  CDOC: [21], 'DARK-BATTLE': [22, 25], ACQUA: [23], DRAGON: [23], 'BRITISH-ROYAL': [24],
  JAILBREAK: [26], 'ASTRAL-BUDDY': [27], WW3: [28], 'NT-FRESHMEN': [29], 'NT-HAWAII': [30],
  'NT-NATURAL-SELECTOR': [31], 'NT-ICHIHANARAN': [31], 'NT-AGITATE-HALATION': [31],
  GREMLIN: [32], 'MENTAL-STINGER': [33], 'NT-SAINT-GERMAIN': [34], 'NT-HIGH-PRIEST': [35],
  'NT-SALOME': [36], 'NT-WORLD-REJECTER': [36], 'NT-HEAT-WAVE': [37], 'NT-KAMISATO-RESCUE': [37],
  'NT-ALEISTER': [38], CORONZON: [39],
};

const spoilerRiskPackages = new Set([
  'GREMLIN', 'MENTAL-STINGER', 'NT-SAINT-GERMAIN', 'NT-HIGH-PRIEST', 'NT-WORLD-REJECTER',
  'NT-SALOME', 'NT-HEAT-WAVE', 'NT-KAMISATO-RESCUE', 'NT-ALEISTER', 'CORONZON', 'WW3',
]);

const ambiguousWelcomeGroups = new Set([11, 18, 22, 23, 25, 28, 31, 36, 37]);

function decodeHtml(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function parseEvidenceTable(text) {
  const rows = [];
  let section = '';
  for (const line of text.split(/\r?\n/)) {
    const heading = line.match(/^##\s+\d+\.\s*(.+)$/);
    if (heading) {
      section = heading[1].trim();
      continue;
    }
    if (!/^\|\s*[PSONGX]\d{2}\s/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map(value => value.trim());
    if (cells.length !== 6) continue;
    const id = cells[0].split(/\s+/)[0];
    const eventTitle = cells[0].slice(id.length).trim();
    const timeLayer = inferTimeLayer(id);
    rows.push({
      evidenceId: id,
      eventTitle,
      timeLayer,
      evidenceSection: section,
      originalImageDate: cells[1],
      sourceWork: cells[2],
      onlineSource: cells[3],
      currentWorldbookWelcomeNote: cells[4],
      conflictRuling: cells[5],
    });
  }
  return rows;
}

function inferTimeLayer(id) {
  if (id.startsWith('P')) return 'Y−1及更早前史';
  if (id.startsWith('G')) return Number(id.slice(1)) <= 6 ? 'Y年' : 'Y＋1年';
  if (id.startsWith('X')) return '未定日／相对顺序';
  return 'Y年';
}

function parseWelcome(text) {
  const groups = [];
  const groupPattern = /<div class="mw-event-group" data-event="([^"]+)">([\s\S]*?)(?=<div class="mw-event-group"|$)/g;
  let match;
  while ((match = groupPattern.exec(text)) !== null) {
    const groupIndex = groups.length + 1;
    const groupName = decodeHtml(match[1]);
    const scenes = [];
    const scenePattern = /<div class="mw-scene" data-act="scene" data-date="([^"]*)" data-tag="([^"]*)" data-desc="([^"]*)"/g;
    let sceneMatch;
    while ((sceneMatch = scenePattern.exec(match[2])) !== null) {
      scenes.push({
        groupIndex,
        groupName,
        date: decodeHtml(sceneMatch[1]),
        tag: decodeHtml(sceneMatch[2]),
        description: decodeHtml(sceneMatch[3]),
      });
    }
    groups.push({ groupIndex, groupName, scenes });
  }
  return groups;
}

function loadPackageReceipts() {
  const packages = new Map();
  for (const file of fs.readdirSync(workerDir).filter(file => file.startsWith('worker-') && file.endsWith('.json')).sort()) {
    const manifest = JSON.parse(read(path.join(workerDir, file)));
    for (const entry of manifest.files || []) {
      if (!entry.packageId) continue;
      packages.set(entry.packageId, { ...entry, worker: file });
    }
  }
  return packages;
}

function packageCoverage(entry) {
  return entry?.coverage || 'reference-only';
}

function evidenceCoverage(packages) {
  if (!packages.length) return 'reference-only';
  if (packages.some(entry => packageCoverage(entry) === 'playable-chain')) return 'playable-chain';
  if (packages.some(entry => packageCoverage(entry) === 'partial')) return 'partial';
  return 'reference-only';
}

function main() {
  const evidenceText = read(evidencePath);
  const welcomeText = read(welcomePath);
  const oldMapping = JSON.parse(read(oldMappingPath));
  const verificationReport = JSON.parse(read(verificationReportPath));
  const evidenceRows = parseEvidenceTable(evidenceText);
  const welcomeGroups = parseWelcome(welcomeText);
  const packageReceipts = loadPackageReceipts();

  const errors = [];
  const evidenceIds = evidenceRows.map(row => row.evidenceId);
  if (evidenceIds.length !== 106) errors.push(`Expected 106 evidence rows, found ${evidenceIds.length}`);
  if (new Set(evidenceIds).size !== evidenceIds.length) errors.push('Duplicate evidence IDs');

  const currentScenes = welcomeGroups.flatMap(group => group.scenes);
  if (welcomeGroups.length !== 39) errors.push(`Expected 39 welcome groups, found ${welcomeGroups.length}`);
  if (currentScenes.length !== 87) errors.push(`Expected 87 welcome scenes, found ${currentScenes.length}`);

  const groupIndexToPackages = new Map();
  for (const [packageId, groupIndexes] of Object.entries(packageToWelcomeGroups)) {
    if (!packageReceipts.has(packageId)) errors.push(`Welcome package missing from receipts: ${packageId}`);
    for (const groupIndex of groupIndexes) {
      groupIndexToPackages.set(groupIndex, compact([...(groupIndexToPackages.get(groupIndex) || []), packageId]));
    }
  }
  for (const group of welcomeGroups) {
    if (!groupIndexToPackages.has(group.groupIndex)) errors.push(`Welcome group ${group.groupIndex} has no package mapping`);
  }

  for (const scene of currentScenes) {
    scene.candidatePackageIds = groupIndexToPackages.get(scene.groupIndex) || [];
    scene.candidateEvidenceIds = evidenceRows
      .filter(row => {
        const direct = directPackageByEvidence[row.evidenceId] || [];
        const related = relatedPackageByEvidence[row.evidenceId] || [];
        return [...direct, ...related].some(packageId => scene.candidatePackageIds.includes(packageId));
      })
      .map(row => row.evidenceId);
    scene.mappingLevel = scene.candidatePackageIds.length > 1 ? 'group-level-ambiguous' : 'group-level';
    scene.needsPhase2Refinement = scene.candidatePackageIds.length > 1 || scene.candidateEvidenceIds.length > 1;
  }

  const oldMappingById = new Map(oldMapping.map(row => [row.evidenceIds?.[0], row]));
  const semanticCorrections = [];
  const evidenceMappings = evidenceRows.map(row => {
    const directPackageIds = directPackageByEvidence[row.evidenceId] || [];
    const relatedPackageIds = relatedPackageByEvidence[row.evidenceId] || [];
    const directPackages = directPackageIds.map(packageId => packageReceipts.get(packageId)).filter(Boolean);
    const relatedPackages = relatedPackageIds.map(packageId => packageReceipts.get(packageId)).filter(Boolean);
    const worldbookFiles = directPackages.length
      ? compact(directPackages.map(entry => entry.path))
      : (referenceFileByEvidence[row.evidenceId] ? [referenceFileByEvidence[row.evidenceId]] : []);
    const nodeIds = compact(directPackages.flatMap(entry => entry.nodeIds || []));
    const currentWelcomeSceneRefs = currentScenes
      .filter(scene => [...directPackageIds, ...relatedPackageIds].some(packageId => scene.candidatePackageIds.includes(packageId)))
      .map(scene => ({ groupIndex: scene.groupIndex, groupName: scene.groupName, date: scene.date, tag: scene.tag }));
    const currentWelcomeGroups = unique(currentWelcomeSceneRefs.map(ref => `${ref.groupIndex}. ${ref.groupName}`)).sort((a, b) => Number(a.split('.')[0]) - Number(b.split('.')[0]));
    const handlingFlags = [];
    if (currentWelcomeSceneRefs.length) handlingFlags.push('existing');
    if (!directPackageIds.length) handlingFlags.push('reference-only');
    if (!currentWelcomeSceneRefs.length && directPackageIds.length) handlingFlags.push('add-opening');
    if (currentWelcomeSceneRefs.some(ref => ambiguousWelcomeGroups.has(ref.groupIndex))) handlingFlags.push('regroup');
    if ([...directPackageIds, ...relatedPackageIds].some(packageId => spoilerRiskPackages.has(packageId))) handlingFlags.push('rewrite-text');

    const old = oldMappingById.get(row.evidenceId);
    const oldPackageIds = old?.packageIds || [];
    if (JSON.stringify(compact(oldPackageIds)) !== JSON.stringify(compact(directPackageIds))) {
      semanticCorrections.push({
        evidenceId: row.evidenceId,
        eventTitle: row.eventTitle,
        oldPackageIds: compact(oldPackageIds),
        correctedPackageIds: compact(directPackageIds),
      });
    }

    return {
      evidenceId: row.evidenceId,
      eventTitle: row.eventTitle,
      timeLayer: row.timeLayer,
      originalImageDate: row.originalImageDate,
      sourceWork: row.sourceWork,
      onlineSource: row.onlineSource,
      directPackageIds,
      relatedPackageIds,
      coverage: evidenceCoverage(directPackages),
      worldbookFiles,
      nodeIds,
      currentWorldbookWelcomeNote: row.currentWorldbookWelcomeNote,
      conflictRuling: row.conflictRuling,
      currentWelcomeGroups,
      currentWelcomeSceneCount: currentWelcomeSceneRefs.length,
      currentWelcomeScenes: currentWelcomeSceneRefs,
      handlingFlags,
    };
  });

  for (const mapping of evidenceMappings) {
    for (const packageId of [...mapping.directPackageIds, ...mapping.relatedPackageIds]) {
      if (!packageReceipts.has(packageId)) errors.push(`Missing package receipt: ${packageId}`);
    }
    for (const file of mapping.worldbookFiles) {
      if (!fs.existsSync(file)) errors.push(`Missing worldbook file: ${file}`);
    }
    for (const nodeId of mapping.nodeIds) {
      const file = mapping.worldbookFiles.find(worldbookFile => read(worldbookFile).includes(nodeId));
      if (!file) errors.push(`Node not found for ${mapping.evidenceId}: ${nodeId}`);
    }
  }

  if (errors.length) throw new Error(`Phase 1 validation failed:\n${errors.join('\n')}`);

  const result = {
    version: 1,
    generatedOn: '2026-09-08',
    sourceFiles: [
      { path: evidencePath, sha256: sha256(evidencePath) },
      { path: welcomePath, sha256: sha256(welcomePath) },
      { path: oldMappingPath, sha256: sha256(oldMappingPath) },
    ],
    summary: {
      evidenceRows: evidenceMappings.length,
      welcomeGroups: welcomeGroups.length,
      welcomeScenes: currentScenes.length,
      packages: verificationReport.statistics.packages,
      workerPackages: packageReceipts.size,
      legacyPackages: verificationReport.statistics.packages - packageReceipts.size,
      nodes: [...packageReceipts.values()].reduce((total, entry) => total + (entry.nodeIds?.length || 0), 0),
      directMappedEvidence: evidenceMappings.filter(row => row.directPackageIds.length).length,
      referenceOnlyEvidence: evidenceMappings.filter(row => !row.directPackageIds.length).length,
      evidenceWithCurrentWelcome: evidenceMappings.filter(row => row.currentWelcomeSceneCount > 0).length,
      evidenceWithoutCurrentWelcome: evidenceMappings.filter(row => row.currentWelcomeSceneCount === 0).length,
      semanticCorrections: semanticCorrections.length,
    },
    semanticCorrections,
    evidenceMappings,
    currentGroups: welcomeGroups.map(group => ({
      groupIndex: group.groupIndex,
      groupName: group.groupName,
      sceneCount: group.scenes.length,
      candidatePackageIds: groupIndexToPackages.get(group.groupIndex) || [],
      candidateEvidenceIds: compact(group.scenes.flatMap(scene => scene.candidateEvidenceIds)),
    })),
    currentOpenings: currentScenes.map(scene => ({
      groupIndex: scene.groupIndex,
      groupName: scene.groupName,
      date: scene.date,
      tag: scene.tag,
      description: scene.description,
      candidatePackageIds: scene.candidatePackageIds,
      candidateEvidenceIds: scene.candidateEvidenceIds,
      mappingLevel: scene.mappingLevel,
      needsPhase2Refinement: scene.needsPhase2Refinement,
    })),
    validation: {
      status: 'passed',
      evidenceCount: evidenceMappings.length,
      welcomeGroupCount: welcomeGroups.length,
      welcomeSceneCount: currentScenes.length,
      allEvidenceIdsUnique: new Set(evidenceIds).size === evidenceIds.length,
      allWelcomeGroupsMapped: welcomeGroups.every(group => groupIndexToPackages.has(group.groupIndex)),
      allDirectPackagesExist: evidenceMappings.every(row => [...row.directPackageIds, ...row.relatedPackageIds].every(packageId => packageReceipts.has(packageId))),
      allWorldbookFilesExist: evidenceMappings.every(row => row.worldbookFiles.every(file => fs.existsSync(file))),
      allNodeReferencesExist: true,
    },
  };

  fs.writeFileSync(path.join(outputDir, 'phase1-opening-mapping.json'), JSON.stringify(result, null, 2), 'utf8');
  writeMarkdown(result, path.join(outputDir, 'phase1-opening-mapping.md'));
  console.log(JSON.stringify({ status: 'passed', ...result.summary, output: path.join(outputDir, 'phase1-opening-mapping.json') }, null, 2));
}

function escapeCell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function writeMarkdown(result, outputFile) {
  const lines = [];
  lines.push('# Phase 1：魔禁开场白对照表');
  lines.push('');
  lines.push('## 结论');
  lines.push('');
  lines.push(`- 证据：${result.summary.evidenceRows} 项。`);
  lines.push(`- 当前欢迎页：${result.summary.welcomeGroups} 组、${result.summary.welcomeScenes} 个开场。`);
  lines.push(`- 世界书：${result.summary.packages} 包、${result.summary.nodes} 节点；其中 ${result.summary.workerPackages} 包来自本轮 worker 清单，${result.summary.legacyPackages} 包为 legacy 包。`);
  lines.push(`- 有直接世界书包映射的证据：${result.summary.directMappedEvidence} 项。`);
  lines.push(`- reference-only 证据：${result.summary.referenceOnlyEvidence} 项。`);
  lines.push(`- 已有当前欢迎页入口的证据：${result.summary.evidenceWithCurrentWelcome} 项。`);
  lines.push(`- 需新增或补齐入口的证据：${result.summary.evidenceWithoutCurrentWelcome} 项。`);
  lines.push(`- 旧 evidence mapping 语义修正：${result.summary.semanticCorrections} 项。`);
  lines.push('');
  lines.push('## 语义修正');
  lines.push('');
  lines.push('| ID | 事件 | 旧包 | 修正包 |');
  lines.push('|---|---|---|---|');
  for (const correction of result.semanticCorrections) {
    lines.push(`| ${correction.evidenceId} | ${escapeCell(correction.eventTitle)} | ${escapeCell(correction.oldPackageIds.join('、') || '无')} | ${escapeCell(correction.correctedPackageIds.join('、') || '无')} |`);
  }
  lines.push('');
  lines.push('## 106 项证据映射');
  lines.push('');
  lines.push('| ID | 事件 | 时间层 | 原图日期 | 世界书包 | 节点数 | 当前欢迎页 | 初步处理 |');
  lines.push('|---|---|---|---|---|---:|---|---|');
  for (const row of result.evidenceMappings) {
    lines.push(`| ${row.evidenceId} | ${escapeCell(row.eventTitle)} | ${escapeCell(row.timeLayer)} | ${escapeCell(row.originalImageDate)} | ${escapeCell(row.directPackageIds.join('、') || 'reference-only')} | ${row.nodeIds.length} | ${escapeCell(row.currentWelcomeGroups.join('；') || '无')} | ${escapeCell(row.handlingFlags.join('、') || 'review')} |`);
  }
  lines.push('');
  lines.push('## 87 个现有开场候选映射');
  lines.push('');
  lines.push('| # | 分组 | 日期 | 标签 | 候选包 | 候选证据 | 精化 |');
  lines.push('|---:|---|---|---|---|---|---|');
  result.currentOpenings.forEach((scene, index) => {
    lines.push(`| ${index + 1} | ${scene.groupIndex}. ${escapeCell(scene.groupName)} | ${escapeCell(scene.date)} | ${escapeCell(scene.tag)} | ${escapeCell(scene.candidatePackageIds.join('、'))} | ${escapeCell(scene.candidateEvidenceIds.join('、'))} | ${scene.needsPhase2Refinement ? '是' : '否'} |`);
  });
  lines.push('');
  lines.push('## 验收');
  lines.push('');
  lines.push('- 106 项证据 ID 全部唯一。');
  lines.push('- 87 个现有开场全部进入候选映射。');
  lines.push('- 39 个现有分组全部进入候选映射。');
  lines.push('- 直接包、世界书文件与节点引用均通过存在性检查。');
  lines.push('- 本表是 Phase 1 对照结果，不等同于欢迎页已重构或实机验收通过。');
  fs.writeFileSync(outputFile, lines.join('\n'), 'utf8');
}

main();
