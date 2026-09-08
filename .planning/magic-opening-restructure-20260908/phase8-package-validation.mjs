import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const planningDir = resolve(rootDir, '.planning/magic-opening-restructure-20260908');
const phase6Path = resolve(planningDir, 'phase6-initialization.json');
const pngPath = resolve(rootDir, 'src/魔法禁书目录模拟器/魔法禁书目录模拟器.png');
const welcomePath = resolve(rootDir, 'src/魔法禁书目录模拟器/自定义开局/欢迎页.txt');
const distScriptPath = resolve(rootDir, 'dist/魔法禁书目录模拟器/脚本/界面美化/index.js');

function extractPngCharacter(file) {
  const buffer = readFileSync(file);
  if (buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error('PNG signature is invalid');
  }
  let offset = 8;
  const chunks = [];
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('latin1', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    const end = offset + 12 + length;
    if (end > buffer.length) throw new Error('PNG chunk is truncated');
    if (type === 'tEXt') {
      const separator = data.indexOf(0);
      if (separator >= 0) {
        chunks.push({
          keyword: data.subarray(0, separator).toString('latin1'),
          text: data.subarray(separator + 1).toString('latin1'),
        });
      }
    }
    offset = end;
    if (type === 'IEND') break;
  }
  const chunk = chunks.find(item => item.keyword.toLowerCase() === 'ccv3')
    ?? chunks.find(item => item.keyword.toLowerCase() === 'chara');
  if (!chunk) throw new Error('PNG has no chara/ccv3 payload');
  const raw = chunk.text.trim().startsWith('{')
    ? chunk.text
    : Buffer.from(chunk.text, 'base64').toString('utf8');
  return { character: JSON.parse(raw), payloadKeyword: chunk.keyword, chunkCount: chunks.length };
}

function decodeHtmlEntities(value) {
  return String(value)
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

function normalizeWhitespace(value) {
  return value.split('\n').map(line => line.trim()).join('\n');
}

function toRegexFragment(welcome) {
  const styleStart = welcome.indexOf('<style>');
  const bodyEnd = welcome.lastIndexOf('</body>');
  if (styleStart < 0 || bodyEnd < 0 || bodyEnd <= styleStart) {
    throw new Error('Source welcome does not contain the expected style/body fragment');
  }
  return normalizeWhitespace(welcome.slice(styleStart, bodyEnd))
    .replace('</style>\n</head>\n<body>\n', '</style>\n\n')
    .replace(/\s+$/u, '');
}

const phase6 = JSON.parse(readFileSync(phase6Path, 'utf8'));
if (phase6.validation?.status !== 'passed-static-only') throw new Error('Phase 6 gate is not passed');

const { character, payloadKeyword, chunkCount } = extractPngCharacter(pngPath);
const characterData = character.data ?? character;
if (characterData.character_version !== '1.1.1') {
  throw new Error(`Expected card version 1.1.1, got ${characterData.character_version}`);
}

const entries = Object.values(characterData.character_book?.entries ?? {});
const welcomeEntry = entries.find(entry => (entry.comment ?? entry.name ?? '') === '欢迎页');
if (!welcomeEntry) throw new Error('Packaged welcome entry is missing');

const sourceWelcome = readFileSync(welcomePath, 'utf8');
const packagedWelcome = welcomeEntry.content ?? '';
if (packagedWelcome !== sourceWelcome) throw new Error('Packaged welcome differs from source welcome');

const regexScripts = characterData.extensions?.regex_scripts ?? [];
const packagedRegex = regexScripts.find(item => item.scriptName === '[显示]渲染魔法禁书目录开局页');
if (!packagedRegex) throw new Error('Packaged welcome display regex is missing');
const expectedRegexReplacement = toRegexFragment(sourceWelcome);
if (packagedRegex.replaceString !== expectedRegexReplacement) {
  throw new Error('Packaged welcome display regex differs from transformed source welcome');
}
if (packagedRegex.disabled !== false || packagedRegex.markdownOnly !== true || packagedRegex.promptOnly !== false) {
  throw new Error('Packaged welcome display regex has an invalid enabled/destination state');
}

const sceneMatches = [...packagedWelcome.matchAll(/<div[^>]*data-act="scene"[^>]*>/g)];
const sceneIds = sceneMatches.map(match => match[0].match(/data-opening-id="([^"]*)"/)?.[1]);
const uniqueSceneIds = new Set(sceneIds);
if (sceneMatches.length !== 114) throw new Error(`Expected 114 packaged openings, got ${sceneMatches.length}`);
if (uniqueSceneIds.size !== 114) throw new Error('Packaged opening IDs are not unique');

const records = new Map(phase6.records.map(record => [record.openingId, record]));
const compatPayloads = [];
const metaPayloads = [];
sceneMatches.forEach(match => {
  const tag = match[0];
  const openingId = tag.match(/data-opening-id="([^"]*)"/)?.[1];
  const date = decodeHtmlEntities(tag.match(/data-date="([^"]*)"/)?.[1] ?? '');
  const desc = decodeHtmlEntities(tag.match(/data-desc="([^"]*)"/)?.[1] ?? '');
  const compatRaw = decodeHtmlEntities(tag.match(/data-compat="([^"]*)"/)?.[1] ?? '');
  const metaRaw = decodeHtmlEntities(tag.match(/data-meta="([^"]*)"/)?.[1] ?? '');
  const record = records.get(openingId);
  if (!record) throw new Error(`Packaged opening has no Phase 6 record: ${openingId}`);
  if (date !== record.displayDate) throw new Error(`Date mismatch for ${openingId}`);
  if (desc !== record.openingText) throw new Error(`Opening text mismatch for ${openingId}`);
compatPayloads.push(JSON.parse(compatRaw));
  metaPayloads.push(JSON.parse(metaRaw));
});

const allowedCompatTopKeys = new Set(['原著阶段', '剧情锚点', '所在位置', '剧情阶段', '主线进度']);
const allowedProgressKeys = new Set([
  '当前阶段',
  '阶段序号',
  '阶段状态',
  '当前节点',
  '已完成节点',
  '可触发节点',
  '正史锚点',
  '下一步推进提示',
]);
compatPayloads.forEach((payload, index) => {
  const unexpectedTop = Object.keys(payload).filter(key => !allowedCompatTopKeys.has(key));
  if (unexpectedTop.length) throw new Error(`Unexpected compatibility fields at ${sceneIds[index]}: ${unexpectedTop.join(', ')}`);
  const progress = payload['主线进度'];
  if (!progress || typeof progress !== 'object') throw new Error(`Missing main progress at ${sceneIds[index]}`);
  const unexpectedProgress = Object.keys(progress).filter(key => !allowedProgressKeys.has(key));
  if (unexpectedProgress.length) throw new Error(`Unexpected progress fields at ${sceneIds[index]}: ${unexpectedProgress.join(', ')}`);
});

metaPayloads.forEach((meta, index) => {
  const record = records.get(sceneIds[index]);
  if (meta.openingId !== sceneIds[index]) throw new Error(`Metadata ID mismatch at ${sceneIds[index]}`);
  if (meta.currentNodeId !== record.currentNodeId) throw new Error(`Metadata node mismatch at ${sceneIds[index]}`);
  if (meta.initializationMode !== record.initializationMode) throw new Error(`Metadata mode mismatch at ${sceneIds[index]}`);
});

const packagedWorldbookText = entries.map(entry => entry.content ?? '').join('\n');
const nodeChainRecords = phase6.records.filter(record => record.initializationMode === 'node-chain');
const requiredNodeIds = new Set(nodeChainRecords.flatMap(record => [
  record.startNodeId,
  record.currentNodeId,
  ...record.completedNodeIds ?? [],
  ...record.upcomingNodeIds ?? [],
  ...record.triggerableNodeIds ?? [],
  ...record.availableEntryNodeIds ?? [],
].filter(Boolean)));
const missingNodeIds = [...requiredNodeIds].filter(nodeId => !packagedWorldbookText.includes(nodeId));
if (missingNodeIds.length) throw new Error(`Packaged worldbook is missing node IDs: ${missingNodeIds.join(', ')}`);

const layerCount = (packagedWelcome.match(/class="mw-time-layer"/g) ?? []).length;
const groupCount = (packagedWelcome.match(/class="mw-event-group"/g) ?? []).length;
if (layerCount !== 4) throw new Error(`Expected 4 packaged time layers, got ${layerCount}`);
if (groupCount !== 106) throw new Error(`Expected 106 packaged groups, got ${groupCount}`);
if (packagedWelcome.includes('创约15')) throw new Error('Packaged welcome contains Genesis 15');
if (!packagedWelcome.includes('id="sceneCustomBtn"')) throw new Error('Packaged custom opening button is missing');
if (!packagedWelcome.includes('id="sceneCustomInput"')) throw new Error('Packaged custom opening input is missing');

const regexSceneMatches = [...packagedRegex.replaceString.matchAll(/<div[^>]*data-act="scene"[^>]*>/g)];
const regexSceneIds = regexSceneMatches.map(match => match[0].match(/data-opening-id="([^"]*)"/)?.[1]);
const uniqueRegexSceneIds = new Set(regexSceneIds);
if (regexSceneMatches.length !== 114) throw new Error(`Expected 114 openings in display regex, got ${regexSceneMatches.length}`);
if (uniqueRegexSceneIds.size !== 114) throw new Error('Display regex opening IDs are not unique');
const regexLayerCount = (packagedRegex.replaceString.match(/class="mw-time-layer"/g) ?? []).length;
const regexGroupCount = (packagedRegex.replaceString.match(/class="mw-event-group"/g) ?? []).length;
if (regexLayerCount !== 4) throw new Error(`Expected 4 time layers in display regex, got ${regexLayerCount}`);
if (regexGroupCount !== 106) throw new Error(`Expected 106 display groups in display regex, got ${regexGroupCount}`);
if (packagedRegex.replaceString.includes('创约15')) throw new Error('Display regex contains Genesis 15');
if (!packagedRegex.replaceString.includes('id="sceneCustomBtn"')) throw new Error('Display regex custom opening button is missing');
if (!packagedRegex.replaceString.includes('id="sceneCustomInput"')) throw new Error('Display regex custom opening input is missing');
if (!existsSync(distScriptPath)) throw new Error('Development dist script is missing');
const distScript = readFileSync(distScriptPath, 'utf8');
if (!distScript.includes('dataset.compat') || !distScript.includes('dataset.meta') || !distScript.includes('【开局初始化】')) {
  throw new Error('Development dist script does not contain Phase 8 initialization logic');
}
const extensionText = JSON.stringify(characterData.extensions ?? {});
if (!extensionText.includes('http://127.0.0.1:5510/dist/魔法禁书目录模拟器/脚本/界面美化/index.js')) {
  throw new Error('Card does not reference the Phase 8 development interface script');
}

const pngBuffer = readFileSync(pngPath);
const report = {
  version: 1,
  generatedOn: new Date().toISOString(),
  status: 'passed-offline-static',
  runtimeAcceptance: 'pending-user-sillytavern-import',
  artifact: {
    path: pngPath,
    sizeBytes: statSync(pngPath).size,
    sha256: createHash('sha256').update(pngBuffer).digest('hex'),
    payloadKeyword,
    pngChunkCount: chunkCount,
  },
  card: {
    name: characterData.name,
    version: characterData.character_version,
    spec: character.spec,
    specVersion: character.spec_version,
    worldbookEntryCount: entries.length,
  },
  checks: [
    'PNG signature and text chunks parse successfully',
    'chara/ccv3 payload decodes to valid JSON',
    'Card version is 1.1.1',
    'Packaged welcome exactly matches source welcome',
    'Packaged display regex exactly matches transformed source welcome',
    '114 unique openings are embedded',
    '114 unique openings are embedded in the display regex',
    'All compatibility and metadata payloads parse as JSON',
    'Compatibility fields match the current schema contract',
    'Metadata matches Phase 6 initialization records',
    'All node-chain IDs are present in the packaged worldbook',
    '4 time layers and 106 display groups are embedded',
    '4 time layers and 106 display groups are embedded in the display regex',
    'Genesis 15 is absent',
    'Custom opening controls are preserved',
    'Development interface script is present and contains Phase 8 logic',
  ],
  counts: {
    layers: layerCount,
    groups: groupCount,
    openings: sceneMatches.length,
    uniqueOpeningIds: uniqueSceneIds.size,
    regexOpenings: regexSceneMatches.length,
    uniqueRegexOpeningIds: uniqueRegexSceneIds.size,
    compatibilityPayloads: compatPayloads.length,
    metadataPayloads: metaPayloads.length,
    nodeChainRecords: nodeChainRecords.length,
    requiredNodeIds: requiredNodeIds.size,
  },
};
writeFileSync(resolve(planningDir, 'phase8-package-validation.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
const reportMd = [
  '# Phase 8 打包静态验证报告',
  '',
  `- 状态：${report.status}`,
  `- 生成时间：${report.generatedOn}`,
  `- 产物：\`${pngPath}\``,
  `- 大小：${(report.artifact.sizeBytes / 1024).toFixed(1)} KB`,
  `- SHA256：\`${report.artifact.sha256}\``,
  `- 版本：\`${report.card.version}\``,
  `- 时间层 / 分组 / Opening：${report.counts.layers} / ${report.counts.groups} / ${report.counts.openings}`,
  `- 正则时间层 / 分组 / Opening：${regexLayerCount} / ${regexGroupCount} / ${regexSceneMatches.length}`,
  `- 自定义开场控件：保留`,
  `- 创约15：不存在`,
  `- 真实 SillyTavern 验收：${report.runtimeAcceptance}`,
  '',
  '## 通过项',
  ...report.checks.map(item => `- ${item}`),
  '',
].join('\n');
writeFileSync(resolve(planningDir, 'phase8-package-validation.md'), reportMd, 'utf8');
console.log(`Phase 8 package validation passed: ${layerCount} layers, ${groupCount} groups, ${sceneMatches.length} openings`);
