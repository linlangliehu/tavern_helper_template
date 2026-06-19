/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { basename, extname } from 'node:path';

const DEFAULT_MAX_ENABLED_LENGTH = 5851;

const TITLES = {
  welcome: '\u6b22\u8fce\u9875',
  chapterIndex: '\u539f\u8457\u7ae0\u8282\u7d22\u5f15',
  plotAnchorPrefix: '\u5c0f\u5267\u60c5\u951a\u70b9-',
  eventIndexPrefix: '\u4e8b\u4ef6\u7d22\u5f15-',
  exactAnchorPrefix: '\u7cbe\u786e\u951a\u70b9-',
  expectedMaxTitle: '\u9b3c\u5974\u4e0e\u884d\u751f\u7269\u89c4\u5219',
};

function parseArgs(argv) {
  const options = {
    files: [],
    maxEnabledLength: DEFAULT_MAX_ENABLED_LENGTH,
    expectedEntries: null,
    expectedDisabled: null,
    expectedMaxTitle: '',
    requireDualDisabled: false,
    printJson: false,
    selfTest: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--self-test') {
      options.selfTest = true;
    } else if (arg === '--json') {
      options.printJson = true;
    } else if (arg === '--require-dual-disabled') {
      options.requireDualDisabled = true;
    } else if (arg === '--max-enabled-length') {
      options.maxEnabledLength = Number(argv[++index]);
    } else if (arg === '--expect-entries') {
      options.expectedEntries = Number(argv[++index]);
    } else if (arg === '--expect-disabled') {
      options.expectedDisabled = Number(argv[++index]);
    } else if (arg === '--expect-max-title') {
      options.expectedMaxTitle = argv[++index] || '';
    } else if (arg === '--expect-mfrs-runtime') {
      options.maxEnabledLength = DEFAULT_MAX_ENABLED_LENGTH;
      options.expectedEntries = 383;
      options.expectedDisabled = 33;
      options.expectedMaxTitle = TITLES.expectedMaxTitle;
      options.requireDualDisabled = true;
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      options.files.push(arg);
    }
  }

  if (!Number.isFinite(options.maxEnabledLength) || options.maxEnabledLength <= 0) {
    throw new Error('--max-enabled-length must be a positive number');
  }
  return options;
}

function normalizeEntries(rawEntries) {
  if (Array.isArray(rawEntries)) return rawEntries;
  if (rawEntries && typeof rawEntries === 'object') return Object.values(rawEntries);
  return [];
}

function findBookObject(value) {
  if (!value || typeof value !== 'object') return null;
  const candidates = [
    { kind: 'character_book', book: value.character_book },
    { kind: 'character_book', book: value.data?.character_book },
    { kind: 'worldbook', book: value.book },
    { kind: 'worldbook', book: value.worldbook },
    { kind: 'worldbook', book: value },
  ];
  return candidates.find(candidate => candidate.book && typeof candidate.book === 'object' && candidate.book.entries) || null;
}

function entryTitle(entry) {
  const key = Array.isArray(entry?.key) ? entry.key.find(Boolean) : entry?.key;
  return String(entry?.comment || entry?.name || key || entry?.uid || '');
}

function entryContentLength(entry) {
  return String(entry?.content || '').length;
}

function isEntryDisabled(entry) {
  return entry?.disable === true || entry?.enabled === false;
}

function hasRequiredDisabledFlags(entry, bookKind) {
  if (bookKind === 'character_book' && entry?.disable == null) {
    return entry?.enabled === false;
  }
  return entry?.disable === true && entry?.enabled === false;
}

function isDangerousTitle(title) {
  return title === TITLES.welcome
    || title === TITLES.chapterIndex
    || title.startsWith(TITLES.plotAnchorPrefix)
    || title.startsWith(TITLES.eventIndexPrefix)
    || title.startsWith(TITLES.exactAnchorPrefix);
}

function summarizeBook(input, label, options) {
  const found = findBookObject(input);
  assert.ok(found, `${label}: no worldbook entries found`);
  const entries = normalizeEntries(found.book.entries);
  assert.ok(entries.length > 0, `${label}: worldbook entries should not be empty`);

  const normalized = entries.map((entry, index) => {
    const title = entryTitle(entry);
    const disabled = isEntryDisabled(entry);
    return {
      index,
      uid: entry?.uid,
      title,
      contentLength: entryContentLength(entry),
      disabled,
      enabled: !disabled,
      disable: entry?.disable,
      rawEnabled: entry?.enabled,
      dualDisabled: disabled ? hasRequiredDisabledFlags(entry, found.kind) : true,
    };
  });
  const enabled = normalized.filter(entry => entry.enabled);
  const disabled = normalized.filter(entry => entry.disabled);
  const dangerous = normalized.filter(entry => isDangerousTitle(entry.title));
  const enabledDangerous = dangerous.filter(entry => entry.enabled);
  const dualDisabledViolations = options.requireDualDisabled
    ? disabled.filter(entry => !entry.dualDisabled)
    : [];
  const largestEnabled = [...enabled].sort((a, b) => b.contentLength - a.contentLength)[0] || null;
  const oversizeEnabled = enabled.filter(entry => entry.contentLength > options.maxEnabledLength);

  const errors = [];
  if (options.expectedEntries != null && entries.length !== options.expectedEntries) {
    errors.push(`entries=${entries.length}, expected ${options.expectedEntries}`);
  }
  if (options.expectedDisabled != null && disabled.length !== options.expectedDisabled) {
    errors.push(`disabled=${disabled.length}, expected ${options.expectedDisabled}`);
  }
  if (enabledDangerous.length > 0) {
    errors.push(`enabled dangerous entries: ${enabledDangerous.map(entry => `${entry.title}(${entry.contentLength})`).join(', ')}`);
  }
  if (oversizeEnabled.length > 0) {
    const top = [...oversizeEnabled].sort((a, b) => b.contentLength - a.contentLength).slice(0, 8);
    errors.push(`enabled entries over ${options.maxEnabledLength}: ${top.map(entry => `${entry.title}(${entry.contentLength})`).join(', ')}`);
  }
  if (options.expectedMaxTitle && largestEnabled?.title !== options.expectedMaxTitle) {
    errors.push(`max enabled title=${largestEnabled?.title || '<none>'}, expected ${options.expectedMaxTitle}`);
  }
  if (dualDisabledViolations.length > 0) {
    const top = dualDisabledViolations.slice(0, 8);
    errors.push(`disabled entries missing disable=true + enabled=false: ${top.map(entry => `${entry.title}[disable=${entry.disable}, enabled=${entry.rawEnabled}]`).join(', ')}`);
  }

  return {
    label,
    kind: found.kind,
    entries: entries.length,
    enabled: enabled.length,
    disabled: disabled.length,
    maxEnabledLength: options.maxEnabledLength,
    largestEnabled,
    dangerousCount: dangerous.length,
    enabledDangerous,
    oversizeEnabled: oversizeEnabled.slice(0, 12),
    dualDisabledViolations: dualDisabledViolations.slice(0, 12),
    ok: errors.length === 0,
    errors,
  };
}

function loadJsonFile(file) {
  if (!existsSync(file)) throw new Error(`File not found: ${file}`);
  return JSON.parse(readFileSync(file, 'utf8'));
}

function extractPngTextChunks(file) {
  const buffer = readFileSync(file);
  if (buffer.length < 8 || buffer.toString('latin1', 0, 8) !== '\x89PNG\r\n\x1a\n') {
    throw new Error(`${file}: not a PNG file`);
  }
  const chunks = [];
  let offset = 8;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buffer.length) break;
    if (type === 'tEXt') {
      const data = buffer.subarray(dataStart, dataEnd);
      const separator = data.indexOf(0);
      if (separator >= 0) {
        chunks.push({
          keyword: data.subarray(0, separator).toString('latin1'),
          text: data.subarray(separator + 1).toString('latin1'),
        });
      }
    }
    offset = dataEnd + 4;
  }
  return chunks;
}

function loadPngCharacterFile(file) {
  const chunks = extractPngTextChunks(file);
  const chunk = chunks.find(item => item.keyword.toLowerCase() === 'ccv3')
    || chunks.find(item => item.keyword.toLowerCase() === 'chara');
  if (!chunk) throw new Error(`${file}: no chara/ccv3 metadata found`);
  return JSON.parse(Buffer.from(chunk.text, 'base64').toString('utf8'));
}

function loadInputFile(file) {
  if (!existsSync(file)) throw new Error(`File not found: ${file}`);
  if (extname(file).toLowerCase() === '.png') return loadPngCharacterFile(file);
  return loadJsonFile(file);
}

function assertSummary(summary) {
  if (!summary.ok) {
    throw new Error(`${summary.label}: ${summary.errors.join('; ')}`);
  }
}

function runSelfTest() {
  const safeBook = {
    entries: {
      1: {
        uid: 1,
        comment: TITLES.welcome,
        content: 'x'.repeat(40000),
        disable: true,
        enabled: false,
      },
      2: {
        uid: 2,
        comment: TITLES.expectedMaxTitle,
        content: 'x'.repeat(DEFAULT_MAX_ENABLED_LENGTH),
        disable: false,
        enabled: true,
      },
    },
  };
  const unsafeBook = {
    entries: [
      {
        uid: 1,
        comment: TITLES.chapterIndex,
        content: 'x'.repeat(33925),
        disable: false,
        enabled: true,
      },
    ],
  };
  const missingEnabledFalseBook = {
    entries: [
      {
        uid: 1,
        comment: TITLES.welcome,
        content: 'x'.repeat(40000),
        disable: true,
      },
      {
        uid: 2,
        comment: TITLES.expectedMaxTitle,
        content: 'x'.repeat(DEFAULT_MAX_ENABLED_LENGTH),
        disable: false,
        enabled: true,
      },
    ],
  };
  assertSummary(summarizeBook(safeBook, 'self-test-safe', {
    maxEnabledLength: DEFAULT_MAX_ENABLED_LENGTH,
    expectedEntries: 2,
    expectedDisabled: 1,
    expectedMaxTitle: TITLES.expectedMaxTitle,
    requireDualDisabled: true,
  }));
  const unsafeSummary = summarizeBook(unsafeBook, 'self-test-unsafe', {
    maxEnabledLength: DEFAULT_MAX_ENABLED_LENGTH,
    expectedEntries: null,
    expectedDisabled: null,
    expectedMaxTitle: '',
    requireDualDisabled: false,
  });
  assert.equal(unsafeSummary.ok, false, 'unsafe self-test should fail');
  assert.ok(unsafeSummary.errors.some(error => error.includes('enabled dangerous entries')));
  const missingEnabledFalseSummary = summarizeBook(missingEnabledFalseBook, 'self-test-missing-enabled-false', {
    maxEnabledLength: DEFAULT_MAX_ENABLED_LENGTH,
    expectedEntries: 2,
    expectedDisabled: 1,
    expectedMaxTitle: TITLES.expectedMaxTitle,
    requireDualDisabled: true,
  });
  assert.equal(missingEnabledFalseSummary.ok, false, 'dual-disabled self-test should fail when enabled=false is missing');
  assert.ok(missingEnabledFalseSummary.errors.some(error => error.includes('missing disable=true + enabled=false')));
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.selfTest) {
    runSelfTest();
  }
  if (options.files.length === 0) {
    if (options.selfTest) {
      console.log('verify-worldbook-pollution-gate: self-test passed');
      return;
    }
    throw new Error(`Usage: node ${basename(process.argv[1])} [--expect-mfrs-runtime] [--json] <worldbook-json-or-character-png>...`);
  }

  const summaries = options.files.map(file => summarizeBook(loadInputFile(file), file, options));
  for (const summary of summaries) assertSummary(summary);

  if (options.printJson) {
    console.log(JSON.stringify(summaries, null, 2));
  } else {
    for (const summary of summaries) {
      console.log(`verify-worldbook-pollution-gate: ${summary.label} passed (${summary.entries} entries, ${summary.disabled} disabled, max enabled ${summary.largestEnabled?.contentLength ?? 0})`);
    }
  }
}

try {
  main();
} catch (error) {
  console.error(`verify-worldbook-pollution-gate: failed: ${error?.message || String(error)}`);
  process.exitCode = 1;
}
