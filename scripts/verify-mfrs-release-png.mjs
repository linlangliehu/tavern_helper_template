/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';

const EXPECTED_SCRIPT_NAMES = [
  'mvu',
  'hotfix-generation-ended-listeners',
  '\u53d8\u91cf\u7ed3\u6784',
  '\u754c\u9762\u7f8e\u5316',
  '\u56fa\u5b9a\u72b6\u6001\u680f',
  'spv3.9.5\u00b7\u6570\u636e\u5e93',
  '\u795e\u79d8\u590d\u82cf\u6570\u636e\u5e93\u524d\u7aef',
  '\u6d88\u606f\u5185\u9762\u677f',
];
const PROJECT_REPO = 'linlangliehu/tavern_helper_template';
const REQUIRED_CHUNKS = ['chara', 'ccv3'];

function parseArgs(argv) {
  const options = {
    files: [],
    expectedVersion: '',
    expectedRef: '',
    expectedCache: '',
    selfTest: false,
    printJson: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--expect-version') options.expectedVersion = argv[++index] || '';
    else if (arg === '--expect-ref') options.expectedRef = argv[++index] || '';
    else if (arg === '--expect-cache') options.expectedCache = argv[++index] || '';
    else if (arg === '--self-test') options.selfTest = true;
    else if (arg === '--json') options.printJson = true;
    else if (arg.startsWith('--')) throw new Error(`Unknown option: ${arg}`);
    else options.files.push(arg);
  }
  return options;
}

function extractTextChunks(buffer, label) {
  assert.ok(buffer.length >= 8 && buffer.toString('latin1', 0, 8) === '\x89PNG\r\n\x1a\n', `${label}: not a PNG file`);
  const chunks = [];
  let offset = 8;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    assert.ok(dataEnd + 4 <= buffer.length, `${label}: truncated ${type} chunk`);
    if (type === 'tEXt') {
      const data = buffer.subarray(dataStart, dataEnd);
      const separator = data.indexOf(0);
      if (separator >= 0) {
        chunks.push({
          keyword: data.subarray(0, separator).toString('latin1').toLowerCase(),
          text: data.subarray(separator + 1).toString('latin1'),
        });
      }
    }
    offset = dataEnd + 4;
  }
  return chunks;
}

function decodeCharacterChunk(chunk, label) {
  try {
    const jsonText = Buffer.from(chunk.text, 'base64').toString('utf8');
    return { card: JSON.parse(jsonText), jsonText };
  } catch (error) {
    throw new Error(`${label}:${chunk.keyword}: invalid base64 JSON (${error?.message || String(error)})`);
  }
}

function collectMatches(text, pattern) {
  return [...text.matchAll(pattern)].map(match => match[1]);
}

function summarizeCard(card, jsonText, label, options) {
  const data = card?.data;
  assert.ok(data && typeof data === 'object', `${label}: missing data object`);
  const regexScripts = data.extensions?.regex_scripts;
  const scripts = data.extensions?.tavern_helper?.scripts;
  assert.ok(Array.isArray(regexScripts), `${label}: extensions.regex_scripts must be an array`);
  assert.ok(Array.isArray(scripts), `${label}: extensions.tavern_helper.scripts must be an array`);

  const scriptNames = scripts.map(script => script?.name);
  const scriptText = scripts.map(script => String(script?.content || '')).join('\n');
  const projectRefs = collectMatches(
    scriptText,
    /https:\/\/(?:testingcf|cdn)\.jsdelivr\.net\/gh\/linlangliehu\/tavern_helper_template@([^/'"\s]+)/g,
  );
  const cacheMarkers = collectMatches(scriptText, /[?&]v=([^&'"\s)]+)/g);
  const forbiddenLinks = jsonText.match(/(?:localhost|127\.0\.0\.1|@main\b)/gi) || [];

  assert.equal(String(data.character_version || ''), options.expectedVersion, `${label}: product version`);
  assert.equal(regexScripts.length, 33, `${label}: regex script count`);
  assert.equal(scripts.length, 8, `${label}: Tavern Helper script count`);
  assert.deepEqual(scriptNames, EXPECTED_SCRIPT_NAMES, `${label}: Tavern Helper script order`);
  scripts.forEach((script, index) => {
    assert.equal(script?.enabled, true, `${label}: script ${EXPECTED_SCRIPT_NAMES[index]} must be enabled`);
    assert.equal(script?.type, 'script', `${label}: script ${EXPECTED_SCRIPT_NAMES[index]} type`);
  });
  assert.equal(projectRefs.length, 7, `${label}: project CDN ref count`);
  assert.deepEqual([...new Set(projectRefs)], [options.expectedRef], `${label}: project CDN ref`);
  assert.equal(cacheMarkers.length, 8, `${label}: cache marker count`);
  assert.deepEqual([...new Set(cacheMarkers)], [options.expectedCache], `${label}: cache marker`);
  assert.equal(forbiddenLinks.length, 0, `${label}: forbidden local/branch links: ${forbiddenLinks.join(', ')}`);

  const mvuContent = String(scripts[0]?.content || '');
  assert.ok(mvuContent.includes('MagVarUpdate@0.171.0/artifact/bundle.js'), `${label}: first script must load pinned MagVarUpdate@0.171.0`);
  for (const [index, script] of scripts.entries()) {
    const content = String(script?.content || '');
    if (index === 0) {
      assert.equal(content.includes(`${PROJECT_REPO}@`), false, `${label}: mvu script must not count as a project ref`);
    } else {
      assert.ok(content.includes(`${PROJECT_REPO}@${options.expectedRef}/`), `${label}: ${scriptNames[index]} ref`);
    }
    assert.ok(content.includes(`?v=${options.expectedCache}`), `${label}: ${scriptNames[index]} cache`);
  }

  return {
    keyword: label.split(':').at(-1),
    version: String(data.character_version),
    regexScripts: regexScripts.length,
    scripts: scripts.length,
    scriptNames,
    projectRef: options.expectedRef,
    projectRefCount: projectRefs.length,
    cache: options.expectedCache,
    cacheCount: cacheMarkers.length,
  };
}

function verifyPngBuffer(buffer, label, options) {
  for (const field of ['expectedVersion', 'expectedRef', 'expectedCache']) {
    assert.ok(options[field], `${label}: missing --${field.replace(/[A-Z]/g, value => `-${value.toLowerCase()}`)}`);
  }
  const chunks = extractTextChunks(buffer, label);
  const summaries = [];
  for (const keyword of REQUIRED_CHUNKS) {
    const matches = chunks.filter(chunk => chunk.keyword === keyword);
    assert.equal(matches.length, 1, `${label}: expected exactly one tEXt:${keyword} chunk`);
    const { card, jsonText } = decodeCharacterChunk(matches[0], label);
    summaries.push(summarizeCard(card, jsonText, `${label}:${keyword}`, options));
  }
  assert.deepEqual(
    { ...summaries[0], keyword: undefined },
    { ...summaries[1], keyword: undefined },
    `${label}: chara and ccv3 release summaries must match`,
  );
  return { label, chunks: summaries };
}

function makeSyntheticCard(options) {
  const scripts = EXPECTED_SCRIPT_NAMES.map((name, index) => ({
    name,
    enabled: true,
    type: 'script',
    content:
      index === 0
        ? `import 'https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate@0.171.0/artifact/bundle.js?v=${options.expectedCache}';`
        : `import 'https://testingcf.jsdelivr.net/gh/${PROJECT_REPO}@${options.expectedRef}/dist/script-${index}.js?v=${options.expectedCache}';`,
  }));
  return {
    data: {
      character_version: options.expectedVersion,
      extensions: {
        regex_scripts: Array.from({ length: 33 }, (_, index) => ({ id: `regex-${index}` })),
        tavern_helper: { scripts },
      },
    },
  };
}

function makePngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  // The verifier deliberately ignores CRC values; zero is sufficient for its parser self-test.
  chunk.writeUInt32BE(0, 8 + data.length);
  return chunk;
}

function makeCharacterTextChunk(keyword, card) {
  const encoded = Buffer.from(JSON.stringify(card), 'utf8').toString('base64');
  return makePngChunk('tEXt', Buffer.from(`${keyword}\0${encoded}`, 'latin1'));
}

function makeSyntheticPng(chara, ccv3, options = {}) {
  const chunks = [];
  if (!options.omitChara) chunks.push(makeCharacterTextChunk('chara', chara));
  if (options.duplicateChara) chunks.push(makeCharacterTextChunk('chara', chara));
  if (!options.omitCcv3) chunks.push(makeCharacterTextChunk('ccv3', ccv3));
  chunks.push(makePngChunk('IEND', Buffer.alloc(0)));
  return Buffer.concat([Buffer.from('\x89PNG\r\n\x1a\n', 'latin1'), ...chunks]);
}

function assertMutationFails(card, options, mutate, messagePattern) {
  const copy = structuredClone(card);
  mutate(copy);
  assert.throws(() => summarizeCard(copy, JSON.stringify(copy), 'self-test:mutation', options), messagePattern);
}

function runSelfTest() {
  const options = {
    expectedVersion: '9.9.9',
    expectedRef: 'abcdef1',
    expectedCache: 'self-test-cache',
  };
  const card = makeSyntheticCard(options);
  summarizeCard(card, JSON.stringify(card), 'self-test:valid', options);
  verifyPngBuffer(makeSyntheticPng(card, structuredClone(card)), 'self-test:dual-chunk-valid', options);
  assertMutationFails(
    card,
    options,
    value => {
      value.data.character_version = '0.0.0';
    },
    /product version/,
  );
  assertMutationFails(
    card,
    options,
    value => {
      value.data.extensions.regex_scripts.pop();
    },
    /regex script count/,
  );
  assertMutationFails(
    card,
    options,
    value => {
      value.data.extensions.tavern_helper.scripts.reverse();
    },
    /script order/,
  );
  assertMutationFails(
    card,
    options,
    value => {
      value.data.extensions.tavern_helper.scripts[1].content =
        value.data.extensions.tavern_helper.scripts[1].content.replace('@abcdef1/', '@main/');
    },
    /project CDN ref|forbidden local\/branch links/,
  );
  assertMutationFails(
    card,
    options,
    value => {
      value.data.extensions.tavern_helper.scripts[2].content =
        value.data.extensions.tavern_helper.scripts[2].content.replace('self-test-cache', 'stale-cache');
    },
    /cache marker/,
  );
  assertMutationFails(
    card,
    options,
    value => {
      value.data.extensions.tavern_helper.scripts[3].content += '\n// http://localhost:5500/dev.js';
    },
    /forbidden local\/branch links/,
  );
  assertMutationFails(
    card,
    options,
    value => {
      value.data.extensions.tavern_helper.scripts[3].content += '\n// http://127.0.0.1:5500/dev.js';
    },
    /forbidden local\/branch links/,
  );
  assert.throws(
    () => verifyPngBuffer(makeSyntheticPng(card, card, { omitCcv3: true }), 'self-test:missing-ccv3', options),
    /exactly one tEXt:ccv3 chunk/,
  );
  assert.throws(
    () => verifyPngBuffer(makeSyntheticPng(card, card, { duplicateChara: true }), 'self-test:duplicate-chara', options),
    /exactly one tEXt:chara chunk/,
  );
  const mismatchedCcv3 = structuredClone(card);
  mismatchedCcv3.data.extensions.tavern_helper.scripts.reverse();
  assert.throws(
    () => verifyPngBuffer(makeSyntheticPng(card, mismatchedCcv3), 'self-test:mismatched-ccv3', options),
    /script order/,
  );
  console.log('verify-mfrs-release-png: self-test passed (valid dual chunks + 10 rejected mutations)');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.selfTest) runSelfTest();
  if (options.files.length === 0) {
    if (options.selfTest) return;
    throw new Error(
      `Usage: node ${basename(process.argv[1])} --expect-version <version> --expect-ref <sha> --expect-cache <marker> <png>`,
    );
  }
  const results = options.files.map(file => {
    if (!existsSync(file)) throw new Error(`File not found: ${file}`);
    return verifyPngBuffer(readFileSync(file), file, options);
  });
  if (options.printJson) console.log(JSON.stringify(results, null, 2));
  else {
    for (const result of results) {
      const summary = result.chunks[0];
      console.log(
        `verify-mfrs-release-png: ${result.label} passed (chara+ccv3, version=${summary.version}, refs=${summary.projectRefCount}, cache=${summary.cacheCount}, regex=${summary.regexScripts}, scripts=${summary.scripts})`,
      );
    }
  }
}

try {
  main();
} catch (error) {
  console.error(`verify-mfrs-release-png: failed: ${error?.message || String(error)}`);
  process.exitCode = 1;
}
