import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ROUND = 'magic-worldbook-implementation-20260908';
const PLAN = `.planning/${ROUND}`;
const ARTIFACTS = `.agent-artifacts/${ROUND}`;
const CARD = 'src/魔法禁书目录模拟器';
const WORLDBOOK = `${CARD}/世界书`;
const INDEX = `${CARD}/index.yaml`;
const BASELINE = `${ARTIFACTS}/baseline.json`;
const PROTECTION = `${ARTIFACTS}/protection-snapshot.json`;
const EVIDENCE = 'docs/魔禁四月至次年一月-事件证据表.md';
const REQUIRED_FIELDS = ['进入条件', '场景目标', '可见角色', '玩家行动', '结果', '下一节点'];
const APPROVED_DOCS = new Set([EVIDENCE, 'docs/魔禁剧情修改方案-四月至次年一月.md', '魔禁开发交接文档.md']);
const TEXT_EXTENSION = /\.(?:txt|md|mdc|ya?ml|json|[cm]?[jt]sx?|html?|css|scss|vue|toml|svg|csv|lock)$/i;
const hash = value => createHash('sha256').update(value).digest('hex');
const sorted = value => Array.isArray(value) ? value.map(sorted) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])])) : value;
const stable = value => JSON.stringify(sorted(value));
const unique = values => [...new Set(values)];

function absolute(relative) {
  const resolved = path.resolve(ROOT, relative);
  const local = path.relative(ROOT, resolved);
  if (local === '..' || local.startsWith(`..${path.sep}`) || path.isAbsolute(local)) throw new Error(`Path outside workspace: ${relative}`);
  return resolved;
}

function normalizeFile(file) {
  if (typeof file !== 'string' || !file.trim()) throw new Error('Expected a nonempty file path');
  return path.relative(ROOT, absolute(file.replaceAll('\\', '/'))).replaceAll('\\', '/');
}

function readBytes(file) {
  const resolved = absolute(file);
  if (fs.realpathSync(resolved).toLowerCase() !== resolved.toLowerCase()) throw new Error(`Refusing a linked input: ${file}`);
  return fs.readFileSync(resolved);
}

function decode(bytes, label = 'text') {
  if ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff)) {
    throw new Error(`${label}: UTF-16 BOM; strict UTF-8 is required`);
  }
  const offset = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(offset));
}

function readJson(file) {
  return JSON.parse(decode(readBytes(file), file));
}

function walk(directory) {
  if (!fs.existsSync(absolute(directory))) return [];
  return fs.readdirSync(absolute(directory), { withFileTypes: true }).flatMap(entry => {
    const file = `${directory}/${entry.name}`;
    if (entry.isSymbolicLink()) throw new Error(`Refusing a linked input: ${file}`);
    return entry.isDirectory() ? walk(file) : entry.isFile() ? [file] : [];
  }).sort();
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024, windowsHide: true });
}

function dirtyState() {
  const tokens = decode(git(['status', '--porcelain=v1', '-z', '--untracked-files=all'])).split('\0');
  const records = [];
  for (let cursor = 0; cursor < tokens.length; cursor += 1) {
    if (!tokens[cursor]) continue;
    const record = { status: tokens[cursor].slice(0, 2), path: tokens[cursor].slice(3) };
    if (/[RC]/.test(record.status)) record.originalPath = tokens[++cursor];
    records.push(record);
  }
  return records;
}

function writableByContentIntegration(file) {
  return file === INDEX || (file.startsWith(`${WORLDBOOK}/`) && !file.startsWith(`${WORLDBOOK}/变量/`))
    || file.startsWith(`${PLAN}/`) || file.startsWith(`${ARTIFACTS}/`) || APPROVED_DOCS.has(file);
}

function parseYaml(text, file) {
  const document = parseDocument(text, { merge: true, uniqueKeys: true, keepSourceTokens: true });
  if (document.errors.length) throw new Error(`${file}: ${document.errors.map(error => error.message).join('; ')}`);
  return { document, data: document.toJS({ maxAliasCount: 1000 }), warnings: document.warnings.map(warning => warning.message) };
}

function flattenEntries(entries, folders = []) {
  if (!Array.isArray(entries)) throw new Error(`条目 must be an array at ${folders.join('/') || 'index'}`);
  return entries.flatMap(entry => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Invalid worldbook entry');
    return Object.hasOwn(entry, '条目') ? flattenEntries(entry.条目, [...folders, entry.文件夹 || '?']) : [{ ...entry, folders }];
  });
}

function indexProtection(text) {
  const { document, data } = parseYaml(text, INDEX);
  const pairs = document.contents.items;
  const position = pairs.findIndex(pair => pair.key.value === '条目');
  if (position < 0) throw new Error('index has no 条目');
  const start = pairs[position].key.range[0];
  const end = pairs[position + 1]?.key.range[0] ?? text.length;
  const nonEntries = Object.fromEntries(Object.entries(data).filter(([key]) => key !== '条目'));
  const html = [];
  function visit(value, location = []) {
    if (typeof value === 'string' && /<(?:style|script|div|section|html)\b/i.test(value)) {
      html.push({ path: location, bytes: Buffer.byteLength(value), sha256: hash(value) });
    } else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) visit(child, [...location, key]);
    }
  }
  visit(nonEntries);
  return {
    rawNonEntriesSha256: hash(text.slice(0, start) + text.slice(end)),
    semanticNonEntriesSha256: hash(stable(nonEntries)),
    topLevel: Object.fromEntries(Object.entries(nonEntries).map(([key, value]) => [key, hash(stable(value))])),
    embeddedHtml: html,
    entries: flattenEntries(data.条目).map(entry => {
      const { 内容, ...rest } = entry;
      return { ...rest, ...(内容 === undefined ? {} : { inlineContentSha256: hash(String(内容)) }) };
    }),
  };
}

function parsePackage(text, file) {
  const identifiers = [...text.matchAll(/^\s*事件包ID\s*[：:]\s*([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*)\s*$/gm)];
  if (!identifiers.length) return null;
  const sections = [...text.matchAll(/^==\s*(\d+)[.．、]\s*(.*?)\s*==\s*$/gm)].map(match => ({ number: Number(match[1]), title: match[2], start: match.index, bodyStart: match.index + match[0].length }));
  const nodeSection = sections.find(section => section.number === 4 && /节点/.test(section.title));
  const sectionText = nodeSection ? text.slice(nodeSection.bodyStart, sections.find(section => section.start > nodeSection.start)?.start ?? text.length) : '';
  const headingPattern = /^\s*(?:#{1,6}\s+)?(?:节点(?:ID)?\s*[：:]\s*)?(?:\*\*|`|【)?([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{2,})(?:\*\*|`|】)?(?=\s|[：:|]|$)[^\r\n]*$/gm;
  const headings = [...sectionText.matchAll(headingPattern)];
  const nodes = headings.map((heading, position) => {
    const body = sectionText.slice(heading.index + heading[0].length, headings[position + 1]?.index ?? sectionText.length).trim();
    const fieldPattern = new RegExp(`^\\s*(?:[-*]\\s+)?(?:\\*\\*)?(${REQUIRED_FIELDS.join('|')})(?:\\*\\*)?\\s*[：:]\\s*(?:\\*\\*)?`, 'gm');
    const matches = [...body.matchAll(fieldPattern)];
    const fields = Object.fromEntries(matches.map((match, fieldIndex) => [match[1], body.slice(match.index + match[0].length, matches[fieldIndex + 1]?.index ?? body.length).trim()]));
    return { id: heading[1], title: heading[0].trim(), fields, sha256: hash(`${heading[0].trim()}\n${body}`), missingFields: REQUIRED_FIELDS.filter(field => !fields[field] || /^(?:TODO|TBD|待补充?|占位)[。.!！]?$/i.test(fields[field])) };
  });
  return { path: file, packageId: identifiers[0][1], declarationCount: identifiers.length, sections: sections.map(section => section.number), nodes };
}

function originalBytes(record) {
  if (fs.existsSync(absolute(record.path))) {
    const current = readBytes(record.path);
    if (hash(current) === record.sha256) return { bytes: current, origin: 'live-bytes-matching-original-baseline' };
  }
  try {
    const head = git(['show', `HEAD:${record.path}`]);
    for (const [bytes, origin] of [[head, 'git-HEAD-matching-original-baseline'], [Buffer.from(decode(head).replace(/\r?\n/g, '\r\n')), 'git-HEAD-CRLF-restored-matching-original-baseline']]) {
      if (hash(bytes) === record.sha256) return { bytes, origin };
    }
  } catch {}
  return null;
}

function writeArtifact(file, value, immutable = false) {
  const relative = normalizeFile(file);
  if (!relative.startsWith(`${ARTIFACTS}/`) || relative === BASELINE || (relative === PROTECTION && !immutable)) throw new Error(`Refusing output: ${relative}`);
  const exists = fs.existsSync(absolute(relative));
  if (immutable && exists) throw new Error(`Snapshot already exists; refusing recapture: ${relative}`);
  const content = `${JSON.stringify(value, null, 2)}\n`;
  const previous = exists ? decode(readBytes(relative), relative) : '';
  if (content === previous) return;
  if (exists) throw new Error(`Evidence output already exists; choose another --output: ${relative}`);
  const chunks = [[]];
  let length = 0;
  for (const line of content.trimEnd().split('\n')) {
    if (line.length > 7000) throw new Error('Evidence line exceeds bounded patch size');
    if (length + line.length > 8000) { chunks.push([]); length = 0; }
    chunks.at(-1).push(line);
    length += line.length + 2;
  }
  let tail = [];
  for (const [position, chunk] of chunks.entries()) {
    const patch = `*** Begin Patch\n${position ? `*** Update File: ${relative}\n@@\n${tail.map(line => ` ${line}`).join('\n')}\n` : `*** Add File: ${relative}\n`}${chunk.map(line => `+${line}`).join('\n')}\n${position ? '*** End of File\n' : ''}*** End Patch\n`;
    execFileSync(process.platform === 'win32' ? 'codex.exe' : 'apply_patch', process.platform === 'win32' ? ['--codex-run-as-apply-patch', patch] : [patch], {
      cwd: ROOT, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, windowsHide: true,
    });
    tail = [...tail, ...chunk].slice(-3);
  }
  if (hash(readBytes(relative)) !== hash(content)) throw new Error(`Evidence write mismatch: ${relative}`);
}

function captureProtection() {
  const baseline = readJson(BASELINE);
  const indexRecord = baseline.records.find(record => record.path === INDEX);
  if (!indexRecord || hash(readBytes(INDEX)) !== indexRecord.sha256) throw new Error('index no longer matches original baseline; capture refused');
  const protectedRecords = baseline.records.filter(record => !writableByContentIntegration(record.path)).map(record => ({ ...record, origin: 'original-baseline' }));
  const state = dirtyState();
  const extras = unique([...walk('dist'), ...walk('scripts'), ...state.flatMap(record => [record.path, record.originalPath].filter(Boolean))]);
  for (const file of extras) {
    if (writableByContentIntegration(file) || protectedRecords.some(record => record.path === file) || !fs.existsSync(absolute(file))) continue;
    const bytes = readBytes(file);
    protectedRecords.push({ path: file, length: bytes.length, sha256: hash(bytes), origin: 'post-start-read-only-hardening' });
  }
  const originalPackages = baseline.records.filter(record => record.packageId).map(record => {
    const original = originalBytes(record);
    const parsed = original && parsePackage(decode(original.bytes, record.path), record.path);
    if (parsed && stable(parsed.nodes.map(node => node.id).sort()) !== stable([...(record.nodeIds || [])].sort())) throw new Error(`Baseline node parser mismatch: ${record.path}`);
    return { ...record, nodeIds: record.nodeIds || [], nodeSnapshotOrigin: original?.origin ?? 'unavailable', nodes: parsed?.nodes.map(({ id, sha256, missingFields }) => ({ id, sha256, missingFields })) ?? null };
  });
  const evidenceIds = [...decode(readBytes(EVIDENCE), EVIDENCE).matchAll(/^\|\s*([A-Z]\d{2,3})\s/gm)].map(match => match[1]);
  if (evidenceIds.length !== 106 || unique(evidenceIds).length !== 106) throw new Error('Expected 106 unique evidence IDs');
  const snapshot = {
    version: 1,
    capturedAt: new Date().toISOString(),
    provenance: '开工后只读加固基线；非施工前快照。index 内容已按原 baseline SHA-256 证明仍未修改。',
    baseline: { path: BASELINE, sha256: hash(readBytes(BASELINE)), capturedAt: baseline.capturedAt, records: baseline.records.length, eventRecords: originalPackages.length, originalDirtyPaths: baseline.worktreeDirtyPaths },
    skillReceipt: { routeId: 'sillytavern-card-pipeline', snapshotVersion: '2026-08-18', documents: ['ST-A0', 'ST-A2', 'ST-D1', 'ST-D4'], adoptedCandidates: [], gate: 'finite-static-source-only', hostAcceptance: 'not-run' },
    index: { path: INDEX, originalSha256: indexRecord.sha256, matchedOriginalBaselineAtCapture: true, ...indexProtection(decode(readBytes(INDEX), INDEX)) },
    originalPackages,
    expectedEvidence: { path: EVIDENCE, sha256AtCapture: hash(readBytes(EVIDENCE)), ids: evidenceIds },
    protectedRecords: protectedRecords.sort((left, right) => left.path.localeCompare(right.path)),
    worktreeAtHardeningCapture: state,
  };
  writeArtifact(PROTECTION, snapshot, true);
  console.log(JSON.stringify({ snapshot: PROTECTION, protectedFiles: protectedRecords.length, originalPackages: originalPackages.length, oldNodes: originalPackages.reduce((total, event) => total + event.nodeIds.length, 0), embeddedHtml: snapshot.index.embeddedHtml, baselineUnchanged: true }, null, 2));
}

function nextReferences(text) {
  return [...text.matchAll(/(?<![A-Za-z0-9_-])([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)(?![A-Za-z0-9_-])/g)]
    .filter(match => /-\d{2,}$|-END-[A-Z0-9]+$/.test(match[1]))
    .map(match => {
      const before = text.slice(0, match.index).split(/[；;。\n]/).at(-1);
      const example = /(?:例如|示例(?:ID)?\s*[：:]|格式(?:示例)?\s*[：:]|占位(?:ID)?\s*[：:])\s*[`“「]?\s*$/.test(before)
        || /^\s*(?:示例|模板|格式)\s*[：:]/.test(before) || /^\s*例如\s*/.test(before);
      return { id: match[1], example };
    });
}

function coverageLevel(value) {
  const groups = {
    full: ['full', 'full-chain', 'complete', 'playable', 'playable-chain', '完整', '完整链', '完整可玩', '完整事件链'],
    skeleton: ['skeleton', 'playable-skeleton', '骨架', '可玩骨架', '节点骨架'],
    partial: ['partial', 'partial-chain', '部分', '部分覆盖', '部分链'],
    index: ['index', 'index-only', 'reference-only', '索引', '仅索引', '索引级', '索引／待核'],
    pending: ['pending', 'unverified', '待核', '待补', '证据待核'],
    unimplemented: ['unimplemented', 'not-implemented', 'none', '未实施', '未覆盖'],
  };
  return Object.entries(groups).find(([, names]) => names.includes(String(value).trim().toLowerCase()))?.[0] ?? null;
}

function coverageRank(level) {
  return { unimplemented: 0, pending: 0, index: 1, partial: 2, skeleton: 2, full: 3 }[level] ?? -1;
}

function coverageProblems(row, eventFiles, allNodes, registrations) {
  const problems = [];
  if (!row.coverage) return ['coverage is missing or unsupported'];
  if (coverageRank(row.coverage) > 0 && !eventFiles.length) problems.push('implemented coverage has no actual source target');
  if (eventFiles.some(event => !registrations.has(event.path))) problems.push('source target is not registered');
  for (const nodeId of row.nodeIds) {
    const owners = allNodes.get(nodeId) || [];
    if (owners.length !== 1 || !eventFiles.some(event => event.path === owners[0]?.path)) problems.push(`node not uniquely located in declared target: ${nodeId}`);
  }
  if (coverageRank(row.coverage) >= 2) {
    if (!row.nodeIds.length) problems.push('node-level coverage has no explicit nodeIds');
    if (row.nodeIds.some(nodeId => allNodes.get(nodeId)?.[0]?.node.missingFields.length)) problems.push('claimed playable node lacks mandatory fields');
  }
  if (row.coverage === 'full' && row.nodeIds.length < 2) problems.push('full-chain claim has fewer than two explicit nodes');
  return problems;
}

function listValue(value) {
  return value == null ? [] : Array.isArray(value) ? value : [value];
}

function referenceRow(row) {
  const source = typeof row === 'string' ? { path: row } : row;
  if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('Invalid manifest/mapping row');
  const result = {
    files: unique([...listValue(source.files), ...listValue(source.path ?? source.file)].map(file => {
      const name = typeof file === 'object' ? file.path ?? file.file : file;
      return normalizeFile(String(name).startsWith('世界书/') ? `${CARD}/${name}` : name);
    })),
    packageIds: unique(listValue(source.packageIds ?? source.packageId)),
    nodeIds: unique(listValue(source.nodeIds)),
    evidenceIds: unique(listValue(source.evidenceIds ?? source.evidenceId)),
    coverage: coverageLevel(source.coverage),
    declaredCoverage: source.coverage ?? null,
  };
  for (const key of ['packageIds', 'nodeIds', 'evidenceIds']) if (result[key].some(value => typeof value !== 'string' || !value.trim())) throw new Error(`${key} must contain nonempty strings`);
  return result;
}

function resolveRegisteredFile(key) {
  if (typeof key !== 'string' || !key.trim() || path.isAbsolute(key) || /^[A-Za-z]:/.test(key) || key.split(/[\\/]/).includes('..')) throw new Error(`Invalid relative 文件: ${key}`);
  const base = normalizeFile(`${CARD}/${key}`);
  const candidates = unique([base, ...['.txt', '.yaml', '.yml', '.json', '.md'].map(extension => base + extension)])
    .filter(file => fs.existsSync(absolute(file)) && fs.statSync(absolute(file)).isFile());
  if (candidates.length !== 1) throw new Error(`文件 must resolve uniquely (${candidates.length} matches): ${key}`);
  return candidates[0];
}

function entrySettings(entry) {
  const copy = structuredClone(entry);
  for (const key of ['名称', '文件', 'folders', 'inlineContentSha256', '内容']) delete copy[key];
  if (copy.激活策略) delete copy.激活策略.关键字;
  if (copy.插入位置) delete copy.插入位置.顺序;
  return copy;
}

function parseOptions(args) {
  const options = { final: false, capture: false, output: null, mapping: null, help: false };
  for (let cursor = 0; cursor < args.length; cursor += 1) {
    const argument = args[cursor];
    if (argument === '--final') options.final = true;
    else if (argument === '--capture-protection') options.capture = true;
    else if (argument === '--help') options.help = true;
    else if (argument === '--output' || argument === '--mapping') {
      const value = args[++cursor];
      if (!value || value.startsWith('--')) throw new Error(`Missing value: ${argument}`);
      options[argument.slice(2)] = normalizeFile(value);
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  if (options.final && options.capture) throw new Error('Choose one mode');
  if (options.output && !options.output.startsWith(`${ARTIFACTS}/`)) throw new Error('--output must stay inside the round artifact directory');
  if (options.mapping && !options.mapping.startsWith(`${ARTIFACTS}/`) && !options.mapping.startsWith(`${PLAN}/`)) throw new Error('--mapping must stay inside the round planning/artifact directories');
  return options;
}

function verify(options) {
  const report = {
    version: 1, startedAt: new Date().toISOString(), mode: options.final ? 'final-static' : 'preparation',
    status: 'pending', failure: [], pending: [], warning: [], checks: {},
    runtimeAcceptance: 'not-run',
    limitations: [
      '仅静态源码验收；不构建、不pack、不导入，不证明真实酒馆激活、递归、模型执行、剧情忠实性或玩家体验。',
      'coverage检查可定位的文件、节点、必需字段和声明一致性，不把节点数量当作原作完整性或人工内容审查。',
      '下一节点仅解析显式完整ID；自然语言目标、隐式跳转和模板占位不被冒认为已验证路由。',
      '关键词为静态字面子串风险检查；正则和宿主扫描设置仍须真实酒馆验证。',
      '补充保护哈希只证明加固捕获后未变；原baseline文件哈希才证明开工前后保持。',
    ],
  };
  const inputs = new Map();
  const texts = new Map();
  const issue = (group, code, message, details = {}, severity = 'integration') => {
    const level = severity === 'integration' ? options.final ? 'failure' : 'pending' : severity;
    report[level].push({ group, code, message, ...details });
  };
  function load(file, text = true) {
    try {
      if (!inputs.has(file)) {
        const bytes = readBytes(file);
        inputs.set(file, { path: file, bytes: bytes.length, sha256: hash(bytes), utf8: null, buffer: bytes });
      }
      const record = inputs.get(file);
      if (text && !texts.has(file)) {
        texts.set(file, decode(record.buffer, file));
        record.utf8 = true;
      }
      return text ? texts.get(file) : record.buffer;
    } catch (error) {
      issue(text ? 'encoding' : 'inputs', text ? 'TEXT_READ_OR_UTF8' : 'INPUT_READ', error.message, { path: file }, text ? 'failure' : 'integration');
      return null;
    }
  }
  function json(file) {
    const text = load(file);
    if (text === null) return null;
    try { return JSON.parse(text); }
    catch (error) { issue('manifests', 'JSON_PARSE', error.message, { path: file }); return null; }
  }
  const baseline = json(BASELINE);
  const protection = json(PROTECTION);
  if (!baseline?.records || !protection?.protectedRecords) throw new Error('Missing or invalid baseline/protection snapshot; do not recapture after integration');
  if (hash(inputs.get(BASELINE).buffer) !== protection.baseline.sha256) issue('protection', 'BASELINE_CHANGED', 'Original baseline bytes changed after hardening', { path: BASELINE }, 'failure');
  const originals = new Map(baseline.records.map(record => [record.path, record]));
  report.baseline = { ...protection.baseline, protectedFiles: protection.protectedRecords.length, hardenedAt: protection.capturedAt };
  for (const record of protection.protectedRecords) {
    const current = load(record.path, false);
    if (!current || hash(current) !== record.sha256) issue('protection', 'PROTECTED_FILE_CHANGED', 'Protected file differs from its stated baseline', { path: record.path, origin: record.origin, expected: record.sha256, actual: current && hash(current) }, 'failure');
  }
  const sourceFiles = walk(CARD);
  const eventFiles = sourceFiles.filter(file => file.startsWith(`${WORLDBOOK}/`));
  const changedFiles = sourceFiles.filter(file => {
    const bytes = load(file, TEXT_EXTENSION.test(file));
    return bytes !== null && inputs.get(file)?.sha256 !== originals.get(file)?.sha256;
  });
  for (const file of changedFiles.filter(file => !writableByContentIntegration(file))) {
    issue('protection', 'SOURCE_OUTSIDE_SCOPE', 'Changed/new card source outside the content integration scope', { path: file }, 'failure');
  }
  for (const record of baseline.records.filter(record => record.path.startsWith(`${CARD}/`))) {
    if (!sourceFiles.includes(record.path)) issue('compatibility', 'ORIGINAL_SOURCE_REMOVED', 'Original source path is missing', { path: record.path });
  }
  for (const file of unique([...walk('dist'), ...walk('scripts')])) {
    if (!protection.protectedRecords.some(record => record.path === file)) issue('protection', 'PROTECTED_TREE_ADDITION', 'File added to protected dist/scripts after hardening', { path: file }, 'failure');
  }
  for (const file of [...APPROVED_DOCS, ...walk(PLAN).filter(file => TEXT_EXTENSION.test(file))]) {
    if (fs.existsSync(absolute(file))) load(file);
  }
  let entries = [];
  const indexText = load(INDEX);
  if (indexText !== null) {
    try {
      const current = indexProtection(indexText);
      for (const key of ['rawNonEntriesSha256', 'semanticNonEntriesSha256']) {
        if (current[key] !== protection.index[key]) issue('protection', 'INDEX_NON_WORLDBOOK_CHANGED', 'index content outside 条目 changed', { path: INDEX, comparison: key }, 'failure');
      }
      if (stable(current.embeddedHtml) !== stable(protection.index.embeddedHtml)) issue('protection', 'EMBEDDED_HTML_CHANGED', 'Embedded welcome HTML changed', { path: INDEX }, 'failure');
      report.indexProtection = { originalIndexHashAtCapture: protection.index.originalSha256, currentIndexHash: inputs.get(INDEX).sha256, embeddedHtml: current.embeddedHtml };
      entries = flattenEntries(parseYaml(indexText, INDEX).data.条目);
    } catch (error) { issue('registration', 'INDEX_YAML', error.message, { path: INDEX }); }
  }
  const registrations = new Map();
  const names = new Map();
  for (const entry of entries) {
    names.set(entry.名称, (names.get(entry.名称) || 0) + 1);
    if (!Object.hasOwn(entry, '文件')) {
      if (typeof entry.内容 !== 'string') issue('registration', 'ENTRY_HAS_NO_CONTENT', 'Entry has neither 文件 nor string 内容', { entry: entry.名称 });
      continue;
    }
    if (/\.txt$/i.test(entry.文件)) issue('registration', 'FILE_KEY_TXT_EXTENSION', '文件 must omit .txt', { entry: entry.名称, fileKey: entry.文件 });
    try {
      const file = resolveRegisteredFile(entry.文件);
      const registered = registrations.get(file) || [];
      registrations.set(file, [...registered, entry]);
      const text = load(file);
      if (text !== null && /\.ya?ml$/i.test(file)) {
        try { parseYaml(text, file); } catch (error) { issue('registration', 'REGISTERED_YAML', error.message, { path: file }); }
      }
    } catch (error) { issue('registration', 'FILE_KEY_UNRESOLVED', error.message, { entry: entry.名称 }); }
  }
  for (const [file, registered] of registrations) {
    if (registered.length > 1) issue('registration', 'DUPLICATE_FILE_REGISTRATION', 'File is registered more than once', { path: file, entries: registered.map(entry => entry.名称) });
  }
  for (const [name, count] of names) if (count > 1) issue('registration', 'DUPLICATE_ENTRY_NAME', 'Entry name is not unique', { name, count });
  for (const entry of protection.index.entries.filter(entry => entry.文件)) {
    if (!entries.some(current => current.文件 === entry.文件)) issue('registration', 'ORIGINAL_REGISTRATION_REMOVED', 'Existing registration, including navigation/overview, must remain', { fileKey: entry.文件 });
  }
  report.registration = { totalEntries: entries.length, fileEntries: [...registrations.values()].reduce((total, records) => total + records.length, 0), resolvedFiles: registrations.size, nonEventFiles: [...registrations.keys()].filter(file => !file.includes('/剧情事件/')) };

  const packages = [];
  for (const file of eventFiles) {
    const text = load(file);
    if (text === null) continue;
    if (/\.ya?ml$/i.test(file) && !registrations.has(file)) {
      try { parseYaml(text, file); } catch (error) { issue('registration', 'WORLDBOOK_YAML', error.message, { path: file }); }
    }
    const event = parsePackage(text, file);
    if (!event) {
      if (/^【事件包[：:]/m.test(text)) issue('nodes', 'PACKAGE_ID_MISSING', 'Event package has no valid package ID', { path: file });
      continue;
    }
    event.change = !originals.has(file) ? 'added' : changedFiles.includes(file) ? 'modified' : 'unchanged';
    event.bytes = inputs.get(file).bytes;
    event.text = text;
    packages.push(event);
  }
  const byPackage = new Map();
  const byFile = new Map(packages.map(event => [event.path, event]));
  const allNodes = new Map();
  for (const event of packages) {
    byPackage.set(event.packageId, [...(byPackage.get(event.packageId) || []), event]);
    const severity = event.change === 'unchanged' ? 'warning' : 'integration';
    if (event.declarationCount !== 1) issue('nodes', 'PACKAGE_DECLARATION_COUNT', 'Expected one package declaration', { path: event.path, count: event.declarationCount }, severity);
    if (!registrations.has(event.path)) issue('registration', 'EVENT_NOT_REGISTERED', 'Actual event package is not registered', { path: event.path, packageId: event.packageId });
    if (event.change !== 'unchanged' && (event.sections.length !== 9 || !Array.from({ length: 9 }, (_, position) => position + 1).every(number => event.sections.includes(number)))) issue('nodes', 'NINE_SECTIONS', 'Changed event package must retain nine numbered sections', { path: event.path, sections: event.sections });
    if (event.change !== 'unchanged' && !event.nodes.length) issue('nodes', 'NO_REAL_NODES', 'Changed event package has no full node declarations in section 4', { path: event.path });
    const incomplete = event.nodes.filter(node => node.missingFields.length).map(node => ({ id: node.id, missingFields: node.missingFields }));
    if (incomplete.length) issue('nodes', 'NODE_REQUIRED_FIELDS', 'Nodes lack nonempty required fields', { path: event.path, nodes: incomplete }, severity);
    for (const node of event.nodes) {
      allNodes.set(node.id, [...(allNodes.get(node.id) || []), { path: event.path, packageId: event.packageId, node }]);
      if (!node.id.startsWith(`${event.packageId}-`)) issue('nodes', 'NODE_PACKAGE_PREFIX', 'Full node ID does not belong to its package', { path: event.path, nodeId: node.id });
    }
  }
  for (const [packageId, owners] of byPackage) if (owners.length > 1) issue('nodes', 'DUPLICATE_PACKAGE_ID', 'Package ID is not globally unique', { packageId, files: owners.map(event => event.path) });
  for (const [nodeId, owners] of allNodes) if (owners.length > 1) issue('nodes', 'DUPLICATE_NODE_ID', 'Full node ID is not globally unique', { nodeId, files: owners.map(owner => owner.path) });
  for (const original of protection.originalPackages) {
    const owners = byPackage.get(original.packageId) || [];
    if (owners.length !== 1) issue('compatibility', 'OLD_PACKAGE_ID', 'Original package ID must resolve uniquely', { packageId: original.packageId, path: original.path });
    for (const nodeId of original.nodeIds) {
      if (allNodes.get(nodeId)?.length !== 1 || allNodes.get(nodeId)?.[0].packageId !== original.packageId) issue('compatibility', 'OLD_FULL_NODE_ID', 'Original full node ID was removed, duplicated or reassigned', { packageId: original.packageId, nodeId });
    }
  }
  report.compatibility = { originalPackages: protection.originalPackages.length, originalNodes: protection.originalPackages.reduce((total, event) => total + event.nodeIds.length, 0) };
  return finishVerification({ options, report, inputs, packages, byPackage, byFile, allNodes, registrations, entries, originals, protection, sourceFiles, changedFiles, issue, load, json });
}

function finishVerification(context) {
  const { options, report, inputs, packages, byPackage, byFile, allNodes, registrations, entries, protection, sourceFiles, changedFiles, issue, load, json } = context;
  const referenceResults = [];
  const keywordAdditions = [];
  let configuredPackages = 0;
  for (const event of packages) {
    const severity = event.change === 'unchanged' ? 'warning' : 'integration';
    for (const node of event.nodes) {
      for (const reference of nextReferences(node.fields.下一节点 || '')) {
        const endingText = event.text.split(/^==\s*9[.．、][^\n]*==\s*$/m)[1] || '';
        const ending = /-END-[A-Z0-9]+$/.test(reference.id) && new RegExp(`^\\s*(?:[-*]\\s+)?${reference.id}(?:\\s|[：:])`, 'm').test(endingText);
        const resolved = reference.example || allNodes.get(reference.id)?.length === 1 || ending;
        referenceResults.push({ from: node.id, to: reference.id, example: reference.example, resolved });
        if (!resolved) issue('references', 'NEXT_NODE_UNRESOLVED', 'Explicit next-node ID is not declared', { path: event.path, from: node.id, to: reference.id }, severity);
      }
      if (/^\s*(?:转至|进入)?\s*\d{1,3}\s*$/.test(node.fields.下一节点 || '')) issue('references', 'SHORT_NEXT_NODE', 'Unqualified numeric next-node reference needs a full ID', { path: event.path, nodeId: node.id }, severity);
    }
    const registered = registrations.get(event.path) || [];
    for (const entry of registered) {
      const keywords = entry.激活策略?.关键字 || [];
      const old = protection.index.entries.find(record => record.文件 === entry.文件);
      if (!Array.isArray(keywords) || keywords.some(keyword => typeof keyword !== 'string')) {
        issue('config', 'KEYWORD_TYPE', '关键字 must be an array of strings', { path: event.path });
        continue;
      }
      if (event.packageId === 'DARK-BATTLE' && keywords.includes('独立纪念日')) issue('config', 'DARK_BATTLE_WRONG_KEYWORD', 'Remove 独立纪念日 from DARK-BATTLE during integration', { path: event.path });
      if (event.packageId === 'CORONZON' && keywords.includes('创约')) issue('config', 'CORONZON_WRONG_KEYWORD', 'Remove 创约 from CORONZON during integration', { path: event.path });
      if (event.change !== 'unchanged' || !old || stable(keywords) !== stable(old.激活策略?.关键字) || stable(entrySettings(old)) !== stable(entrySettings(entry))) {
        configuredPackages += 1;
        if (entry.启用 !== true || entry.激活策略?.类型 !== '绿灯' || entry.激活概率 !== 100 || entry.递归?.不可被其他条目激活 !== true || entry.递归?.不可激活其他条目 !== true || entry.插入位置?.类型 !== '角色定义之前' || !Number.isFinite(entry.插入位置?.顺序) || !keywords.length) {
          issue('config', 'EVENT_ACTIVATION_CONTRACT', 'Changed packages require enabled green-light, keywords, 100%, both recursion guards and existing insertion policy', { path: event.path, entry: entry.名称 });
        }
        if (old && stable(entrySettings(old)) !== stable(entrySettings(entry))) issue('config', 'EXISTING_EVENT_CONFIG_CHANGED', 'Settings other than keywords/order/name differ from the original registration', { path: event.path });
      }
      for (const keyword of keywords.filter(keyword => !old?.激活策略?.关键字?.includes(keyword))) keywordAdditions.push({ keyword, entry: entry.名称, path: event.path });
    }
  }
  for (const file of changedFiles.filter(file => file.startsWith(`${WORLDBOOK}/`))) {
    for (const [position, line] of (load(file) || '').split('\n').entries()) {
      if (/(?:主线进度[.／/]剧情阶段|剧情阶段["”]?\s*[=:：]\s*["“]?\d)/.test(line)) issue('schema', 'NUMERIC_NARRATIVE_PHASE', 'Use 主线进度.阶段序号; 剧情阶段 is a narrative enum, not a number', { path: file, line: position + 1 });
      const ordinal = line.match(/阶段序号["”]?\s*[=:：]\s*["“]?(-?\d+(?:\.\d+)?)/);
      if (ordinal && (!Number.isInteger(Number(ordinal[1])) || Number(ordinal[1]) < 0)) issue('schema', 'INVALID_STAGE_ORDINAL', '阶段序号 must be a nonnegative integer; no maximum of 7 is imposed', { path: file, line: position + 1 });
    }
  }
  report.references = { checked: referenceResults.filter(reference => !reference.example).length, excludedExamples: referenceResults.filter(reference => reference.example).length, details: referenceResults };
  report.activation = { checkedChangedPackageRegistrations: configuredPackages };
  report.schemaContract = { stageOrdinal: '主线进度.阶段序号', type: 'nonnegative-integer', upperBound: null, narrativePhase: '剧情阶段: 序章/遭遇/发展/高潮/终局', source: `${CARD}/schema.ts` };
  const generic = new Set(['创约', '新约', '旧约', '主线', '事件', '剧情', '阶段', '学园都市', '魔法', '科学', '前史', '一月', '十二月', '能力者', '上条当麻', '御坂美琴']);
  const allKeywords = entries.flatMap(entry => Array.isArray(entry.激活策略?.关键字) ? entry.激活策略.关键字.filter(keyword => typeof keyword === 'string').map(keyword => ({ keyword, entry: entry.名称 })) : []);
  const collisions = [];
  for (const addition of keywordAdditions) {
    if (generic.has(addition.keyword) || /^[\p{Script=Han}]{1,2}$/u.test(addition.keyword)) issue('keywords', 'GENERIC_NEW_KEYWORD', 'New keyword may activate too broadly', addition, 'warning');
    if (/^GT[1-9]\d*$/i.test(addition.keyword)) issue('keywords', 'UNPADDED_GT_KEYWORD', 'Prefer a full Chinese volume title or GENESIS-01; GT1 can match GT10–GT14', addition, 'warning');
    if (addition.keyword.startsWith('/')) { issue('keywords', 'REGEX_KEYWORD_RUNTIME', 'Regex keyword semantics are not executed by this static tool', addition, 'warning'); continue; }
    for (const other of allKeywords) if (other.entry !== addition.entry && other.keyword.length > addition.keyword.length && other.keyword.toLowerCase().includes(addition.keyword.toLowerCase())) collisions.push({ ...addition, collidesWith: other });
  }
  if (collisions.length) issue('keywords', 'KEYWORD_SUBSTRING_COLLISIONS', 'New literal keywords are substrings of another entry keyword', { count: collisions.length, sample: collisions.slice(0, 100) }, 'warning');
  report.keywordRisk = { added: keywordAdditions, substringCollisions: collisions.length, sampleLimit: 100 };

  const expected = protection.expectedEvidence.ids;
  const liveEvidence = [...(load(EVIDENCE) || '').matchAll(/^\|\s*([A-Z]\d{2,3})\s/gm)].map(match => match[1]);
  if (stable([...liveEvidence].sort()) !== stable([...expected].sort())) issue('evidence', 'EVIDENCE_SOURCE_ID_SET', 'Evidence table IDs no longer equal the captured 106 IDs', { path: EVIDENCE });
  for (const prefix of unique(expected.map(identifier => identifier[0]))) {
    const numbers = expected.filter(identifier => identifier[0] === prefix).map(identifier => Number(identifier.slice(1))).sort((left, right) => left - right);
    if (numbers.some((number, position) => number !== position + 1)) issue('evidence', 'EVIDENCE_ID_CONTINUITY', 'Evidence IDs are not contiguous within their prefix', { prefix });
  }
  function targetsFor(row, source) {
    const targets = [];
    for (const file of row.files) {
      if (!file.startsWith(`${WORLDBOOK}/`) || !fs.existsSync(absolute(file))) issue('manifests', 'DECLARED_FILE_MISSING', 'Declared worldbook file cannot be located', { path: source, target: file });
      else { load(file); targets.push(byFile.get(file) || { path: file, packageId: null, nodes: [] }); }
    }
    for (const packageId of row.packageIds) {
      const owners = byPackage.get(packageId) || [];
      if (owners.length !== 1) issue('manifests', 'DECLARED_PACKAGE_UNRESOLVED', 'Declared package ID must resolve uniquely', { path: source, packageId });
      else targets.push(owners[0]);
    }
    return [...new Map(targets.map(target => [target.path, target])).values()];
  }
  const workerFiles = [...walk(PLAN), ...walk(ARTIFACTS)].filter(file => /^worker-[^/]+\.json$/.test(path.posix.basename(file)));
  const claims = new Map();
  const workerRows = [];
  if (workerFiles.length !== 5) issue('manifests', 'WORKER_RECEIPTS_PENDING', 'Expected five content-worker receipts; preparation does not assume completion', { found: workerFiles.length });
  for (const file of workerFiles) {
    const document = json(file);
    if (!document) continue;
    if (document.status && !['complete', 'completed', 'done', 'ready'].includes(document.status)) issue('manifests', 'WORKER_STILL_WRITING', 'Worker receipt is not marked complete', { path: file, status: document.status });
    const rows = Array.isArray(document) ? document : document.packages ?? document.files ?? document.events;
    if (!Array.isArray(rows)) { issue('manifests', 'WORKER_SCHEMA', 'Expected an array or packages/files/events array', { path: file }); continue; }
    for (const raw of rows) {
      try {
        const row = referenceRow(raw);
        const targets = targetsFor(row, file);
        const problems = coverageProblems(row, targets, allNodes, registrations);
        if (problems.length) issue('manifests', 'WORKER_COVERAGE_EVIDENCE', 'Worker coverage is not structurally substantiated', { path: file, files: row.files, problems });
        for (const identifier of row.evidenceIds) if (!expected.includes(identifier)) issue('evidence', 'WORKER_UNKNOWN_EVIDENCE_ID', 'Worker references an unknown evidence ID', { path: file, evidenceId: identifier });
        for (const target of targets) claims.set(target.path, [...(claims.get(target.path) || []), { worker: file, row }]);
        workerRows.push({ worker: file, ...row, resolvedFiles: targets.map(target => target.path) });
      } catch (error) { issue('manifests', 'WORKER_ROW_SCHEMA', error.message, { path: file }); }
    }
  }
  for (const [file, owners] of claims) if (unique(owners.map(owner => owner.worker)).length > 1) issue('manifests', 'WORKER_OWNERSHIP_OVERLAP', 'Multiple workers claim the same file', { path: file, workers: unique(owners.map(owner => owner.worker)) });
  for (const event of packages.filter(event => event.change !== 'unchanged')) if (!claims.has(event.path)) issue('manifests', 'CHANGED_PACKAGE_NO_RECEIPT', 'Changed event package is not covered by a worker receipt', { path: event.path, packageId: event.packageId });
  report.workers = { files: workerFiles, normalizedRows: workerRows };

  const mappingCandidates = options.mapping ? [options.mapping] : [ARTIFACTS, PLAN].flatMap(directory => ['evidence-mapping.json', 'coverage-mapping.json', 'implementation-mapping.json', 'mapping.json'].map(name => `${directory}/${name}`)).filter(file => fs.existsSync(absolute(file)));
  const mappedRows = [];
  if (mappingCandidates.length !== 1 || !fs.existsSync(absolute(mappingCandidates[0] || ARTIFACTS))) issue('evidence', 'FINAL_MAPPING_PENDING', 'Exactly one final mapping is required; absent mapping is never passed', { candidates: mappingCandidates });
  else {
    const mappingFile = mappingCandidates[0];
    const document = json(mappingFile);
    const rows = Array.isArray(document) ? document : document?.mapping ?? document?.entries ?? document?.rows;
    if (!Array.isArray(rows)) issue('evidence', 'MAPPING_SCHEMA', 'Expected an array or mapping/entries/rows array', { path: mappingFile });
    else for (const raw of rows) {
      try {
        const row = referenceRow(raw);
        const targets = targetsFor(row, mappingFile);
        const problems = coverageProblems(row, targets, allNodes, registrations);
        if (!row.evidenceIds.length) problems.push('row has no evidenceId/evidenceIds');
        for (const target of targets) {
          const workerClaims = claims.get(target.path) || [];
          const explicit = byFile.get(target.path)?.text.match(/^\s*覆盖(?:级别|层级|状态)\s*[：:]\s*(.+)$/m)?.[1];
          const sourceCoverage = explicit && coverageLevel(explicit);
          if (sourceCoverage && coverageRank(row.coverage) > coverageRank(sourceCoverage)) problems.push(`coverage exceeds explicit source level: ${target.path}`);
          if (workerClaims.length && workerClaims.every(claim => claim.row.coverage && coverageRank(row.coverage) > coverageRank(claim.row.coverage))) problems.push(`coverage exceeds worker receipt: ${target.path}`);
          for (const identifier of row.evidenceIds) if (coverageRank(row.coverage) > 0 && !workerClaims.some(claim => claim.row.evidenceIds.includes(identifier))) problems.push(`worker does not map ${identifier} to ${target.path}`);
        }
        if (problems.length) issue('evidence', 'MAPPING_COVERAGE_EVIDENCE', 'Final coverage claim is not structurally substantiated', { path: mappingFile, evidenceIds: row.evidenceIds, problems });
        for (const evidenceId of row.evidenceIds) mappedRows.push({ evidenceId, ...row, resolvedFiles: targets.map(target => target.path), structurallySupported: !problems.length });
      } catch (error) { issue('evidence', 'MAPPING_ROW_SCHEMA', error.message, { path: mappingFile }); }
    }
  }
  const mappedIds = mappedRows.map(row => row.evidenceId);
  const missingIds = expected.filter(identifier => !mappedIds.includes(identifier));
  const extraIds = unique(mappedIds.filter(identifier => !expected.includes(identifier)));
  const duplicateIds = unique(mappedIds.filter((identifier, position) => mappedIds.indexOf(identifier) !== position));
  if (mappedRows.length && (missingIds.length || extraIds.length || duplicateIds.length)) issue('evidence', 'FINAL_MAPPING_ID_SET', 'Final mapping must cover exactly 106 unique evidence IDs', { missingIds, extraIds, duplicateIds });
  if (mappingCandidates.length === 1 && !mappedRows.length) issue('evidence', 'FINAL_MAPPING_EMPTY', 'Final mapping has no valid rows', { path: mappingCandidates[0] });
  const countCoverage = rows => rows.reduce((counts, row) => { const level = row.coverage || 'unknown'; counts[level] = (counts[level] || 0) + 1; return counts; }, {});
  report.evidenceMapping = { candidates: mappingCandidates, expected: expected.length, mapped: mappedRows.length, missingIds, extraIds, duplicateIds, byCoverage: countCoverage(mappedRows), rows: mappedRows };

  const oldNodes = new Map(protection.originalPackages.flatMap(event => event.nodes || []).map(node => [node.id, node.sha256]));
  const oldIds = new Set(protection.originalPackages.flatMap(event => event.nodeIds));
  const packageStats = packages.map(event => ({
    path: event.path, packageId: event.packageId, change: event.change, bytes: event.bytes, nodes: event.nodes.length,
    registered: registrations.get(event.path)?.length === 1,
    coverage: claims.get(event.path)?.map(claim => claim.row.coverage).filter(Boolean).sort((left, right) => coverageRank(left) - coverageRank(right))[0] ?? (event.change === 'unchanged' ? 'legacy-unclassified' : 'unknown'),
  }));
  const currentNodes = packages.flatMap(event => event.nodes);
  report.statistics = {
    packages: packages.length, addedPackages: packages.filter(event => event.change === 'added').length, modifiedPackages: packages.filter(event => event.change === 'modified').length,
    nodes: currentNodes.length, addedNodes: currentNodes.filter(node => !oldIds.has(node.id)).length,
    modifiedExistingNodes: currentNodes.some(node => oldIds.has(node.id) && !oldNodes.has(node.id)) ? null : currentNodes.filter(node => oldNodes.has(node.id) && oldNodes.get(node.id) !== node.sha256).length,
    removedOldNodes: [...oldIds].filter(identifier => !allNodes.has(identifier)),
    eventBytes: packageStats.reduce((total, event) => total + event.bytes, 0),
    baselineEventBytes: protection.originalPackages.reduce((total, event) => total + event.length, 0),
    changedEventBytes: packageStats.filter(event => event.change !== 'unchanged').reduce((total, event) => total + event.bytes, 0),
    worldbookBytes: [...inputs.values()].filter(input => input.path.startsWith(`${WORLDBOOK}/`)).reduce((total, input) => total + input.bytes, 0),
    byCoverage: countCoverage(packageStats), changedByCoverage: countCoverage(packageStats.filter(event => event.change !== 'unchanged')),
    largestPackages: [...packageStats].sort((left, right) => right.bytes - left.bytes).slice(0, 10), packagesDetail: packageStats,
  };
  report.changedSourcePaths = changedFiles;
  const unstable = [];
  for (const input of inputs.values()) {
    try { if (hash(readBytes(input.path)) !== input.sha256) unstable.push(input.path); }
    catch { unstable.push(input.path); }
  }
  if (stable(sourceFiles) !== stable(walk(CARD))) unstable.push(`${CARD}/ (inventory)`);
  const latestWorkers = [...walk(PLAN), ...walk(ARTIFACTS)].filter(file => /^worker-[^/]+\.json$/.test(path.posix.basename(file)));
  if (stable(workerFiles) !== stable(latestWorkers)) unstable.push('worker receipt inventory');
  if (unstable.length) issue('inputs', 'INPUTS_CHANGED_DURING_CHECK', 'Inputs changed during the finite read; rerun after integration', { paths: unstable }, 'pending');
  report.inputs = [...inputs.values()].map(({ buffer, ...record }) => record).sort((left, right) => left.path.localeCompare(right.path));
  report.finishedAt = new Date().toISOString();
  for (const group of ['inputs', 'encoding', 'protection', 'registration', 'nodes', 'compatibility', 'references', 'config', 'keywords', 'schema', 'manifests', 'evidence']) {
    const counts = Object.fromEntries(['failure', 'pending', 'warning'].map(level => [level, report[level].filter(finding => finding.group === group).length]));
    report.checks[group] = { ...counts, status: counts.failure ? 'failed' : counts.pending ? 'pending' : counts.warning ? 'passed-with-warnings' : 'passed' };
  }
  report.status = unstable.length ? 'inconclusive-inputs-changing' : report.failure.length ? 'failed' : report.pending.length ? 'pending' : options.final ? 'passed-static-only' : 'ready-for-final-static';
  const output = options.output || `${ARTIFACTS}/verification-${options.final ? 'final' : 'preparation'}-${Date.now()}.json`;
  writeArtifact(output, report);
  console.log(JSON.stringify({ status: report.status, failure: report.failure.length, pending: report.pending.length, warning: report.warning.length, packages: report.statistics.packages, addedPackages: report.statistics.addedPackages, modifiedPackages: report.statistics.modifiedPackages, nodes: report.statistics.nodes, eventBytes: report.statistics.eventBytes, evidenceMapped: report.evidenceMapping.mapped, report: output }, null, 2));
  return unstable.length ? 2 : report.failure.length ? 1 : report.pending.length && options.final ? 2 : 0;
}

try {
  const options = parseOptions(process.argv.slice(2));
  if (options.help) {
    console.log('Usage: node .planning/magic-worldbook-implementation-20260908/verify-worldbook.mjs [--final] [--mapping <round-local.json>] [--output <new-artifact.json>]');
    console.log('Default: preparation; missing registrations/worker receipts/mapping remain pending. --final: enforce integration gates.');
    console.log('--capture-protection is capture-once; never recapture the existing protection snapshot.');
  } else if (options.capture) {
    captureProtection();
  } else {
    process.exitCode = verify(options);
  }
} catch (error) {
  console.error(`Worldbook verification aborted: ${error.message}`);
  process.exitCode = 1;
}
