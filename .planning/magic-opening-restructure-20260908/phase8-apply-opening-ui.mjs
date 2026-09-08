import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const planningDir = resolve(rootDir, '.planning/magic-opening-restructure-20260908');
const phase6Path = resolve(planningDir, 'phase6-initialization.json');
const phase7Path = resolve(planningDir, 'phase7-static-validation.json');
const welcomePath = resolve(rootDir, 'src/魔法禁书目录模拟器/自定义开局/欢迎页.txt');

const phase6 = JSON.parse(readFileSync(phase6Path, 'utf8'));
const phase7 = JSON.parse(readFileSync(phase7Path, 'utf8'));
const originalHtml = readFileSync(welcomePath, 'utf8');

if (phase6.validation?.status !== 'passed-static-only') {
  throw new Error(`Phase 6 gate failed: ${phase6.validation?.status}`);
}
if (phase7.validation?.status !== 'passed-static-only') {
  throw new Error(`Phase 7 gate failed: ${phase7.validation?.status}`);
}

const records = new Map(phase6.records.map(record => [record.openingId, record]));
if (records.size !== 114) throw new Error(`Expected 114 initialization records, got ${records.size}`);

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const compactList = value => (Array.isArray(value) ? value : [value]);
const stringifyAttribute = value => escapeHtml(JSON.stringify(value));

const openingMeta = record => ({
  timeLayerId: record.timeLayerId,
  timeLayerLabel: record.timeLayerLabel,
  displayDate: record.displayDate,
  datePrecision: record.datePrecision,
  timeOfDay: record.timeOfDay,
  workLineId: record.workLineId,
  workLineLabel: record.workLineLabel,
  stageId: record.stageId,
  stageLabel: record.stageLabel,
  chapterId: record.chapterId,
  chapterLabel: record.chapterLabel,
  openingId: record.openingId,
  slotLabel: record.slotLabel || '默认入口',
  initializationMode: record.initializationMode,
  primaryPackageId: record.primaryPackageId,
  startNodeId: record.startNodeId,
  currentNodeId: record.currentNodeId,
  currentNodeTitle: record.currentNodeTitle,
  currentNodeSceneGoal: record.currentNodeSceneGoal,
  completedNodeIds: compactList(record.completedNodeIds ?? []),
  upcomingNodeIds: compactList(record.upcomingNodeIds ?? []),
  triggerableNodeIds: compactList(record.triggerableNodeIds ?? []),
  playerPosition: record.playerPosition,
  currentPlotState: record.currentPlotState,
  relatedWorkLineIds: compactList(record.relatedWorkLineIds ?? []),
});

const sceneHtml = (group, opening) => {
  const record = records.get(opening.openingId);
  if (!record) throw new Error(`Missing Phase 6 record for ${opening.openingId}`);
  const slotLabel = record.slotLabel || '默认入口';
  const attributes = [
    'data-act="scene"',
    `data-opening-id="${escapeHtml(record.openingId)}"`,
    `data-date="${escapeHtml(record.displayDate)}"`,
    `data-tag="${escapeHtml(group.groupLabel)}"`,
    `data-desc="${escapeHtml(record.openingText)}"`,
    `data-compat="${stringifyAttribute(record.compatibilityPayload)}"`,
    `data-meta="${stringifyAttribute(openingMeta(record))}"`,
    `data-slot="${escapeHtml(slotLabel)}"`,
  ].join(' ');

  return [
    `            <div ${attributes}>`,
    '              <div class="mw-scene-head">',
    `                <span class="mw-scene-date">${escapeHtml(record.displayDate)}</span>`,
    `                <span class="mw-scene-tag">${escapeHtml(group.groupLabel)}</span>`,
    `                <span class="mw-scene-slot">${escapeHtml(slotLabel)}</span>`,
    '              </div>',
    `              <div class="mw-scene-desc">${escapeHtml(record.openingText)}</div>`,
    '            </div>',
  ].join('\n');
};

const groupHtml = group => {
  const displayDates = group.openings.map(opening => records.get(opening.openingId)?.displayDate);
  if (displayDates.some(date => !date)) throw new Error(`Group ${group.groupId} has an unresolved opening`);
  const firstDate = displayDates[0];
  const lastDate = displayDates[displayDates.length - 1];
  const range = firstDate === lastDate ? firstDate : `${firstDate}—${lastDate}`;

  return [
    `          <div class="mw-event-group" data-event="${escapeHtml(group.groupLabel)}">`,
    `            <button type="button" class="mw-event" data-act="event" data-event="${escapeHtml(group.groupLabel)}" aria-expanded="false">`,
    `              <span class="mw-event-name">${escapeHtml(group.groupLabel)}</span>`,
    `              <span class="mw-event-range">${escapeHtml(range)}</span>`,
    `              <span class="mw-event-count">${group.openings.length}</span>`,
    '              <span class="mw-event-arrow" aria-hidden="true">▶</span>',
    '            </button>',
    '            <div class="mw-event-body">',
    ...group.openings.map(opening => sceneHtml(group, opening)),
    '            </div>',
    '          </div>',
  ].join('\n');
};

const layerHtml = layer => [
  `        <div class="mw-time-layer" data-time-layer="${escapeHtml(layer.timeLayerId)}">`,
  '          <div class="mw-time-layer-head">',
  `            <span class="mw-time-layer-title">${escapeHtml(layer.timeLayerLabel)}</span>`,
  `            <span class="mw-time-layer-count">${layer.openingCount}</span>`,
  '          </div>',
  '          <div class="mw-time-layer-body">',
  ...layer.groups.map(groupHtml),
  '          </div>',
  '        </div>',
].join('\n');

const sceneListStartMarker = '      <div class="mw-scenes" id="sceneList">';
const afterSceneListMarker = '      <div style="margin-top:10px">';
const sceneListStart = originalHtml.indexOf(sceneListStartMarker);
const afterSceneList = originalHtml.indexOf(afterSceneListMarker, sceneListStart);
if (sceneListStart < 0 || afterSceneList < 0) {
  throw new Error('Welcome sceneList block or custom-opening marker not found');
}

const generatedBlock = [
  sceneListStartMarker,
  ...phase7.displayModel.layers.map(layerHtml),
  '      </div>',
].join('\n');
const updatedHtml = originalHtml.slice(0, sceneListStart) + generatedBlock + originalHtml.slice(afterSceneList);
writeFileSync(welcomePath, updatedHtml, 'utf8');

const layerCount = phase7.displayModel.layers.length;
const groupCount = phase7.displayModel.layers.reduce((total, layer) => total + layer.groups.length, 0);
const openingCount = phase7.displayModel.layers.reduce(
  (total, layer) => total + layer.groups.reduce((layerTotal, group) => layerTotal + group.openings.length, 0),
  0,
);
const openingIds = phase7.displayModel.layers.flatMap(layer =>
  layer.groups.flatMap(group => group.openings.map(opening => opening.openingId)),
);
const uniqueOpeningIds = new Set(openingIds);
const undatedRecords = [...records.values()].filter(record => record.timeLayerId === 'TL-UNDATED');
const invalidUndated = undatedRecords.filter(record => record.displayDate !== '未定日');
const missingCompat = [...records.values()].filter(record => !record.compatibilityPayload);

if (layerCount !== 4) throw new Error(`Expected 4 time layers, got ${layerCount}`);
if (groupCount !== 106) throw new Error(`Expected 106 display groups, got ${groupCount}`);
if (openingCount !== 114) throw new Error(`Expected 114 openings, got ${openingCount}`);
if (uniqueOpeningIds.size !== openingCount) throw new Error('Opening IDs are not unique');
if (missingCompat.length) throw new Error(`Missing compatibility payload: ${missingCompat.map(record => record.openingId).join(', ')}`);
if (invalidUndated.length) throw new Error(`Invalid undated display date: ${invalidUndated.map(record => `${record.openingId}:${record.displayDate}`).join(', ')}`);
if (updatedHtml.includes('创约15')) throw new Error('Generated welcome page contains Genesis 15');
if (!updatedHtml.includes('id="sceneCustomBtn"')) throw new Error('Custom opening button missing');
if (!updatedHtml.includes('id="sceneCustomInput"')) throw new Error('Custom opening input missing');
if ((updatedHtml.match(/data-act="scene"/g) ?? []).length !== 114) throw new Error('Generated scene count mismatch');
if ((updatedHtml.match(/class="mw-event-group"/g) ?? []).length !== 106) throw new Error('Generated group count mismatch');
if ((updatedHtml.match(/class="mw-time-layer"/g) ?? []).length !== 4) throw new Error('Generated time layer count mismatch');

const sha256 = value => createHash('sha256').update(value, 'utf8').digest('hex');
const report = {
  version: 1,
  generatedOn: new Date().toISOString(),
  status: 'passed-source-static-only',
  checks: [
    'Phase 6 and Phase 7 gates are passed-static-only',
    '4 time layers generated',
    '106 work-line/chapter groups generated',
    '114 unique openings generated',
    'Every opening has compatibility and metadata payloads',
    'Undated openings keep the literal 未定日 label',
    'Genesis 15 is absent',
    'Custom opening controls remain intact',
  ],
  counts: {
    layers: layerCount,
    groups: groupCount,
    openings: openingCount,
    uniqueOpeningIds: uniqueOpeningIds.size,
  },
  hashes: {
    welcomeBefore: sha256(originalHtml),
    welcomeAfter: sha256(updatedHtml),
  },
};
writeFileSync(resolve(planningDir, 'phase8-opening-ui.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`Phase 8 opening UI applied: ${layerCount} layers, ${groupCount} groups, ${openingCount} openings`);
