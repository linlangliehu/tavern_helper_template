import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:\\project\\tavern_helper_template';
const CARD_ROOT = join(ROOT, 'src', '魔法禁书目录模拟器');
const WELCOME_PATH = join(CARD_ROOT, '自定义开局', '欢迎页.txt');
const MATRIX_PATH = join(ROOT, 'docs', 'MJR_P1_事件簇矩阵.json');
const APPLY = process.argv.includes('--apply');

const META_FIELDS = [
  'timeLayer',
  'clusterId',
  'clusterLabel',
  'media',
  'viewpoint',
  'entryType',
  'relation',
  'datePrecision',
  'coverage',
];

const SPECIAL_CLUSTERS = [
  [/最后之作|八月三十一日/, 'CL-0831'],
  [/大霸星祭七日背景|超炮大霸星祭/, 'CL-DAIHASEISAI'],
  [/使徒十字/, 'CL-ST-CROSS'],
  [/死灵术师/, 'CL-NECROMANCER'],
  [/神之饮物/, 'CL-NECTAR'],
  [/静默派对/, 'CL-SILENT-PARTY'],
  [/越狱/, 'CL-JAILBREAK'],
  [/僧正|真格雷姆林/, 'CL-N13-HIGH-PRIEST'],
];

const EXACT_DAY_IDS = new Set([
  'OP-O11-01',
  'OP-O11-02',
  'OP-O12-01',
  'OP-O20-01',
  'OP-O22-01',
  'OP-O23-01',
  'OP-O28-01',
]);

const DISPLAY_REWRITES = new Map([
  ['OP-O09-01', ['8月24日', '8月下旬—9月上旬']],
  ['OP-O14-01', ['9月1日', 'Y年9月上旬']],
  ['OP-O33-01', ['10月12日', '10月中旬附近']],
  ['OP-N13-01', ['12月1日', '12月上旬']],
]);

function decode(value) {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

function encode(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function attributes(line) {
  const output = {};
  for (const match of line.matchAll(/([\w-]+)="([^"]*)"/g)) {
    output[match[1]] = decode(match[2]);
  }
  return output;
}

function setAttribute(line, name, value) {
  const encoded = encode(value);
  const pattern = new RegExp(` ${name}="[^"]*"`);
  if (pattern.test(line)) return line.replace(pattern, ` ${name}="${encoded}"`);
  return line.replace(/>\s*$/, ` ${name}="${encoded}">`);
}

function stableClusterId(label) {
  for (const [pattern, id] of SPECIAL_CLUSTERS) {
    if (pattern.test(label)) return id;
  }
  const digest = createHash('sha1').update(label).digest('hex').slice(0, 10).toUpperCase();
  return `CL-EVT-${digest}`;
}

function timeLayer(value) {
  return (
    {
      'TL-YMINUS1': 'Y-1',
      'TL-Y': 'Y',
      'TL-YPLUS1': 'Y+1',
      'TL-UNDATED': 'unknown',
    }[value] ?? 'unknown'
  );
}

function mediaFor(row) {
  if (row.chapterId?.startsWith('CH-X')) return 'mixed';
  if (['CH-O03', 'CH-O07', 'CH-O09'].includes(row.chapterId)) return 'anime';
  if (row.chapterId === 'CH-O05') return 'game';
  if (row.chapterId === 'CH-O21') return 'movie';
  if (row.chapterId === 'CH-O33') return 'manga';
  if (['CH-O24', 'CH-O26', 'CH-O18'].includes(row.chapterId)) return 'mixed';
  if (row.workLineId === 'WL-ITEM' || row.workLineId === 'WL-INDEX') return 'novel';
  if (row.workLineId === 'WL-RAILGUN') return 'manga';
  if (row.workLineId === 'WL-ACCELERATOR') return 'mixed';
  if (row.workLineId === 'WL-MENTAL-OUT') return 'manga';
  return 'mixed';
}

function viewpointFor(row) {
  if (row.clusterId === 'CL-0831') {
    return row.currentNodeId === 'AUGUST-31-01' ? 'accelerator' : 'ensemble';
  }
  if (row.clusterId === 'CL-DAIHASEISAI') {
    if (row.chapterId === 'CH-O22') return 'ensemble';
    if (row.chapterId === 'CH-O24') return 'misaka';
  }
  return (
    {
      'WL-INDEX': 'kamijo',
      'WL-RAILGUN': 'misaka',
      'WL-ACCELERATOR': 'accelerator',
      'WL-ITEM': 'item',
      'WL-MENTAL-OUT': 'shokuhou',
      'WL-MEDIA-UNDATED': 'ensemble',
      'WL-OTHER-OFFICIAL': 'ensemble',
    }[row.workLineId] ?? 'ensemble'
  );
}

function entryTypeFor(row) {
  if (row.initializationMode === 'reference-only-no-package') return 'reference';
  if (row.chapterLabel && /(过去|往事|回忆)/.test(row.chapterLabel)) return 'memory';
  if (row.chapterLabel?.includes('大霸星祭七日背景')) return 'prelude';
  if (row.chapterLabel && /(后续|收尾|余波|善后|尾声)/.test(row.chapterLabel)) return 'aftermath';
  return 'main';
}

function datePrecisionFor(row) {
  if (
    ['exact-day', 'official-range', 'relative-time', 'media-window', 'project-window', 'unknown'].includes(
      row.originalPrecision,
    )
  ) {
    return row.originalPrecision;
  }
  if (row.displayDate?.includes('未定') || row.originalPrecision === 'undated') return 'unknown';
  if (EXACT_DAY_IDS.has(row.openingId)) return 'exact-day';
  if (row.openingId === 'OP-O09-01') return 'media-window';
  if (['OP-O14-01', 'OP-O19-01'].includes(row.openingId)) return 'relative-time';
  if (['OP-O33-01', 'OP-N13-01'].includes(row.openingId)) return 'project-window';
  if (row.displayDate && /(某日|上旬|中旬|下旬|附近|Y−1|Y\+1)/.test(row.displayDate)) return 'relative-time';
  if (row.originalPrecision === 'exact') return 'official-range';
  if (
    row.originalPrecision === 'approximate' ||
    row.originalPrecision === 'range' ||
    row.originalPrecision === 'relative'
  ) {
    return 'relative-time';
  }
  return 'unknown';
}

function coverageFor(row) {
  if (row.initializationMode === 'reference-only-no-package') return 'reference-only';
  if (row.initializationMode === 'reference-only-related-package') return 'partial';
  return 'full-playable';
}

function relationFor(row, rowsByCluster) {
  if (row.entryType === 'memory') return 'recall-of';
  if (['CL-0831', 'CL-DAIHASEISAI'].includes(row.clusterId)) return 'parallel';
  const siblings = rowsByCluster.get(row.clusterId) ?? [];
  if (siblings.length === 1) return 'standalone';
  return siblings[0].openingId === row.openingId ? 'precedes' : 'follows';
}

function rangeForGroup(label, current) {
  if (label.includes('D子／前一年大霸星祭调查')) return 'Y−1年9月中旬';
  if (label.includes('最后之作')) return 'Y年8月30日深夜—31日';
  if (label.includes('死灵术师')) return 'Y年9月上旬';
  if (label.includes('静默派对')) return 'Y年8月下旬—9月上旬';
  if (label.includes('大霸星祭七日背景') || label.includes('超炮大霸星祭')) return 'Y年9月19日—25日';
  if (label.includes('使徒十字')) return 'Y年9月19日主体／20日凌晨余波';
  if (label.includes('神之饮物')) return 'Y年9月中旬附近';
  if (label.includes('越狱')) return 'Y年10月中旬附近';
  if (label.includes('僧正')) return 'Y年12月上旬';
  return current;
}

function displayDateFor(row, meta) {
  const rewrite = DISPLAY_REWRITES.get(row.openingId);
  return rewrite ? rewrite[1] : meta.displayDate;
}

const source = readFileSync(WELCOME_PATH, 'utf8');
const lines = source.split(/\r?\n/);
const rows = [];
let currentGroup = '';

for (const line of lines) {
  const groupMatch = line.match(/class="mw-event-group"[^>]*data-event="([^"]+)"/);
  if (groupMatch) currentGroup = decode(groupMatch[1]);
  const sceneMatch = line.match(/<div data-act="scene"[^>]*data-opening-id="([^"]+)"[^>]*data-meta="([^"]*)"/);
  if (!sceneMatch) continue;
  const meta = JSON.parse(decode(sceneMatch[2]));
  const row = {
    openingId: sceneMatch[1],
    groupLabel: currentGroup,
    timeLayerId: meta.timeLayerId,
    displayDate: meta.displayDate,
    originalPrecision: meta.datePrecision,
    workLineId: meta.workLineId,
    chapterId: meta.chapterId,
    chapterLabel: meta.chapterLabel,
    primaryPackageId: meta.primaryPackageId,
    currentNodeId: meta.currentNodeId,
    startNodeId: meta.startNodeId,
    initializationMode: meta.initializationMode,
  };
  row.displayDate = displayDateFor(row, meta);
  row.clusterId = stableClusterId(currentGroup);
  row.timeLayer = timeLayer(row.timeLayerId);
  row.media = mediaFor(row);
  row.viewpoint = viewpointFor(row);
  row.entryType = entryTypeFor(row);
  row.coverage = coverageFor(row);
  row.datePrecision = datePrecisionFor(row);
  rows.push(row);
}

const rowsByCluster = new Map();
for (const row of rows) {
  if (!rowsByCluster.has(row.clusterId)) rowsByCluster.set(row.clusterId, []);
  rowsByCluster.get(row.clusterId).push(row);
}
for (const row of rows) row.relation = relationFor(row, rowsByCluster);

const rowByOpening = new Map(rows.map(row => [row.openingId, row]));
const output = [];
currentGroup = '';
let currentSceneOpeningId = '';

for (let line of lines) {
  const groupMatch = line.match(/class="mw-event-group"[^>]*data-event="([^"]+)"/);
  if (groupMatch) {
    currentGroup = decode(groupMatch[1]);
    const clusterId = stableClusterId(currentGroup);
    line = setAttribute(line, 'data-cluster-id', clusterId);
    line = setAttribute(line, 'data-cluster-label', currentGroup);
  }

  if (line.includes('class="mw-event"') && currentGroup) {
    line = setAttribute(line, 'data-cluster-id', stableClusterId(currentGroup));
  }

  const sceneMatch = line.match(/<div data-act="scene"[^>]*data-opening-id="([^"]+)"[^>]*data-meta="([^"]*)"/);
  if (sceneMatch) {
    currentSceneOpeningId = sceneMatch[1];
    const row = rowByOpening.get(sceneMatch[1]);
    const meta = JSON.parse(decode(sceneMatch[2]));
    meta.displayDate = row.displayDate;
    Object.assign(meta, {
      timeLayer: row.timeLayer,
      clusterId: row.clusterId,
      clusterLabel: row.groupLabel,
      media: row.media,
      viewpoint: row.viewpoint,
      entryType: row.entryType,
      relation: row.relation,
      datePrecision: row.datePrecision,
      coverage: row.coverage,
    });
    line = line.replace(/data-meta="[^"]*"/, `data-meta="${encode(JSON.stringify(meta))}"`);
    const rewrite = DISPLAY_REWRITES.get(row.openingId);
    if (rewrite) line = setAttribute(line, 'data-date', row.displayDate).split(rewrite[0]).join(rewrite[1]);
  }

  if (line.includes('class="mw-scene-date"')) {
    const row = rowByOpening.get(currentSceneOpeningId);
    if (row) line = line.replace(/(<span class="mw-scene-date">)[^<]*/, `$1${row.displayDate}`);
  }

  if (line.includes('class="mw-event-range"')) {
    const range = rangeForGroup(currentGroup, '');
    if (range) line = line.replace(/(<span class="mw-event-range">)[^<]*/, `$1${range}`);
  }

  output.push(line);
}

const matrix = {
  schemaVersion: 1,
  generatedAt: '2026-10-02',
  source: 'src/魔法禁书目录模拟器/自定义开局/欢迎页.txt',
  baseline: '1.1.6',
  navigation: 'timeLayer -> cluster -> viewpoint/media/entryType -> opening',
  fields: META_FIELDS,
  summary: {
    entries: rows.length,
    timeLayers: [...new Set(rows.map(row => row.timeLayer))],
    clusters: new Set(rows.map(row => row.clusterId)).size,
    coverage: Object.fromEntries([
      ...rows.reduce((map, row) => map.set(row.coverage, (map.get(row.coverage) ?? 0) + 1), new Map()),
    ]),
    datePrecision: Object.fromEntries([
      ...rows.reduce((map, row) => map.set(row.datePrecision, (map.get(row.datePrecision) ?? 0) + 1), new Map()),
    ]),
  },
  entries: rows.map(row => ({
    openingId: row.openingId,
    timeLayer: row.timeLayer,
    clusterId: row.clusterId,
    clusterLabel: row.groupLabel,
    workLineId: row.workLineId,
    media: row.media,
    viewpoint: row.viewpoint,
    entryType: row.entryType,
    relation: row.relation,
    displayDate: row.displayDate,
    datePrecision: row.datePrecision,
    coverage: row.coverage,
    primaryPackageId: row.primaryPackageId,
    chapterId: row.chapterId,
    initializationMode: row.initializationMode,
  })),
};

if (APPLY) {
  writeFileSync(WELCOME_PATH, output.join('\n'), 'utf8');
  writeFileSync(MATRIX_PATH, `${JSON.stringify(matrix, null, 2)}\n`, 'utf8');
  console.log(`Updated welcome metadata: ${rows.length} entries`);
  console.log(`Wrote event-cluster matrix: ${MATRIX_PATH}`);
} else {
  console.log(JSON.stringify(matrix.summary, null, 2));
  console.log('Dry run only. Re-run with --apply to write the welcome page and matrix.');
}
