import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const indexPath = resolve(rootDir, 'src/魔法禁书目录模拟器/index.yaml');
const welcomePath = resolve(rootDir, 'src/魔法禁书目录模拟器/自定义开局/欢迎页.txt');
const args = new Set(process.argv.slice(2));
const shouldSync = args.has('--sync');
const shouldBumpVersion = args.has('--bump-version');

function readText(path) {
  return readFileSync(path, 'utf8');
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function collectCounts(text) {
  return {
    length: text.length,
    layers: countMatches(text, /class="mw-time-layer"/g),
    groups: countMatches(text, /class="mw-event-group"/g),
    openings: countMatches(text, /data-act="scene"/g),
    openingIds: countMatches(text, /data-opening-id=/g),
    compatibilityPayloads: countMatches(text, /data-compat=/g),
    metadataPayloads: countMatches(text, /data-meta=/g),
    customButton: text.includes('id="sceneCustomBtn"'),
    customInput: text.includes('id="sceneCustomInput"'),
    genesis15: text.includes('创约15'),
  };
}

function gitShow(path) {
  return execFileSync('git', ['show', `HEAD:${path}`], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
}

function toRegexFragment(welcome) {
  const styleStart = welcome.indexOf('<style>');
  const bodyEnd = welcome.lastIndexOf('</body>');
  if (styleStart < 0 || bodyEnd < 0 || bodyEnd <= styleStart) {
    throw new Error('Welcome page does not contain the expected style/body fragment');
  }
  return normalizeWhitespace(welcome.slice(styleStart, bodyEnd))
    .replace('</style>\n</head>\n<body>\n', '</style>\n\n')
    .replace(/\s+$/u, '');
}

function normalizeWhitespace(fragment) {
  return fragment.split('\n').map(line => line.trim()).join('\n');
}

function locateTargetBlock(lines) {
  const targetNameLine = lines.findIndex(line => line.includes('[显示]渲染魔法禁书目录开局页'));
  if (targetNameLine < 0) throw new Error('Target regex is missing');
  const replacementLine = lines.findIndex((line, index) => index > targetNameLine && line === '    替换为: |-');
  if (replacementLine < 0) throw new Error('Target replacement block header is missing');
  const nextLine = lines.findIndex((line, index) => index > replacementLine && /^    来源:/.test(line));
  if (nextLine < 0) throw new Error('Target replacement block is not terminated by 来源');
  return { targetNameLine, replacementLine, nextLine };
}

function decodeBlock(lines, start, end) {
  const indent = '        ';
  const content = lines.slice(start + 1, end).map(line => {
    if (line === '') return '';
    if (!line.startsWith(indent)) throw new Error('Replacement block has unexpected indentation');
    return line.slice(indent.length);
  });
  return content.join('\n');
}

function encodeBlock(content) {
  const indent = '        ';
  return [
    '    替换为: |-',
    ...content.split('\n').map(line => line === '' ? '' : indent + line),
  ];
}

function validateFragment(fragment, label) {
  const counts = collectCounts(fragment);
  const expected = {
    layers: 4,
    groups: 106,
    openings: 114,
    openingIds: 114,
    compatibilityPayloads: 114,
    metadataPayloads: 114,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (counts[key] !== value) {
      throw new Error(`${label} ${key} expected ${value}, got ${counts[key]}`);
    }
  }
  if (!counts.customButton || !counts.customInput) throw new Error(`${label} custom opening controls are missing`);
  if (counts.genesis15) throw new Error(`${label} contains Genesis 15`);
}

const indexRaw = readText(indexPath);
const welcomeRaw = readText(welcomePath);
const parsedIndex = YAML.parse(indexRaw);
const targetRegex = parsedIndex.扩展字段.正则.find(item => item.正则名称 === '[显示]渲染魔法禁书目录开局页');
if (!targetRegex) throw new Error('Target regex is not present in parsed YAML');

const lines = indexRaw.split(/\r?\n/u);
const eol = indexRaw.includes('\r\n') ? '\r\n' : '\n';
const block = locateTargetBlock(lines);
const currentReplacement = targetRegex.替换为;
const rawReplacement = decodeBlock(lines, block.replacementLine, block.nextLine);
if (rawReplacement.replace(/\s+$/u, '') !== currentReplacement) {
  throw new Error('Raw replacement block and parsed replacement differ');
}
const oldWelcome = gitShow('src/魔法禁书目录模拟器/自定义开局/欢迎页.txt');
const oldFragment = toRegexFragment(oldWelcome);
const normalizedOldFragment = normalizeWhitespace(oldFragment);
const latestFragment = toRegexFragment(welcomeRaw);
const normalizedLatestFragment = normalizeWhitespace(latestFragment);

console.log(JSON.stringify({
  current: collectCounts(currentReplacement),
  oldWelcomeAsFragment: collectCounts(oldFragment),
  latestWelcome: collectCounts(welcomeRaw),
  latestFragment: collectCounts(latestFragment),
  currentMatchesOldWelcomeFragment: currentReplacement === oldFragment,
  currentMatchesNormalizedOldWelcomeFragment: currentReplacement === normalizedOldFragment,
  latestFragmentChanges: latestFragment !== currentReplacement,
  latestNormalizedFragmentLength: normalizedLatestFragment.length,
}, null, 2));

if (!shouldSync) process.exit(0);

validateFragment(latestFragment, 'Latest welcome fragment');
const replacementBlock = encodeBlock(latestFragment);
lines.splice(block.replacementLine, block.nextLine - block.replacementLine, ...replacementBlock);
const versionLine = lines.findIndex(line => /^版本: /.test(line));
if (shouldBumpVersion) {
  if (versionLine < 0 || lines[versionLine] !== "版本: '1.1.0'") {
    throw new Error(`Expected version 1.1.0 before bump, got ${versionLine < 0 ? 'missing' : lines[versionLine]}`);
  }
  lines[versionLine] = "版本: '1.1.1'";
}
const nextRaw = lines.join(eol);
const nextParsed = YAML.parse(nextRaw);
const nextTarget = nextParsed.扩展字段.正则.find(item => item.正则名称 === '[显示]渲染魔法禁书目录开局页');
if (nextTarget.替换为 !== latestFragment) throw new Error('Synced replacement does not round-trip through YAML');
if (shouldBumpVersion && nextParsed.版本 !== '1.1.1') throw new Error('Version bump did not round-trip through YAML');
writeFileSync(indexPath, nextRaw, 'utf8');

console.log(`Synced welcome regex fragment: ${latestFragment.length} characters`);
if (shouldBumpVersion) console.log('Card version bumped to 1.1.1');
