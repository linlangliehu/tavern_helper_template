/* eslint-disable import-x/no-nodejs-modules */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

function parseArgs(argv) {
  const options = {
    files: [],
    write: false,
    backup: false,
    selfTest: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--write') {
      options.write = true;
    } else if (arg === '--backup') {
      options.backup = true;
    } else if (arg === '--self-test') {
      options.selfTest = true;
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      options.files.push(arg);
    }
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
    value.character_book,
    value.data?.character_book,
    value.book,
    value.worldbook,
    value,
  ];
  return candidates.find(candidate => candidate && typeof candidate === 'object' && candidate.entries) || null;
}

function entryTitle(entry) {
  const key = Array.isArray(entry?.key) ? entry.key.find(Boolean) : entry?.key;
  return String(entry?.comment || entry?.name || key || entry?.uid || '');
}

function isDisabledEntry(entry) {
  return entry?.disable === true || entry?.enabled === false;
}

function normalizeDisabledFlags(value) {
  const book = findBookObject(value);
  if (!book) {
    throw new Error('no worldbook entries found');
  }

  const entries = normalizeEntries(book.entries);
  let changed = 0;
  const changedEntries = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || !isDisabledEntry(entry)) continue;

    const beforeDisable = entry.disable;
    const beforeEnabled = entry.enabled;
    if (beforeDisable !== true || beforeEnabled !== false) {
      entry.disable = true;
      entry.enabled = false;
      changed += 1;
      changedEntries.push({
        title: entryTitle(entry),
        beforeDisable,
        beforeEnabled,
      });
    }
  }

  return {
    changed,
    changedEntries,
    entries: entries.length,
  };
}

function loadJsonFile(file) {
  if (!existsSync(file)) throw new Error(`File not found: ${file}`);
  return JSON.parse(readFileSync(file, 'utf8'));
}

function runSelfTest() {
  const worldbook = {
    entries: {
      a: { uid: 'a', comment: 'disabled by disable only', disable: true, content: '' },
      b: { uid: 'b', comment: 'disabled by enabled only', enabled: false, content: '' },
      c: { uid: 'c', comment: 'enabled entry', disable: false, enabled: true, content: '' },
    },
  };
  const result = normalizeDisabledFlags(worldbook);
  if (result.changed !== 2) throw new Error(`self-test expected 2 changes, got ${result.changed}`);
  if (worldbook.entries.a.disable !== true || worldbook.entries.a.enabled !== false) {
    throw new Error('self-test failed to normalize disable-only entry');
  }
  if (worldbook.entries.b.disable !== true || worldbook.entries.b.enabled !== false) {
    throw new Error('self-test failed to normalize enabled-only entry');
  }
  if (worldbook.entries.c.disable !== false || worldbook.entries.c.enabled !== true) {
    throw new Error('self-test modified an enabled entry');
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.selfTest) {
    runSelfTest();
  }
  if (options.files.length === 0) {
    if (options.selfTest) {
      console.log('normalize-worldbook-disabled-flags: self-test passed');
      return;
    }
    throw new Error(`Usage: node ${basename(process.argv[1])} [--write] [--backup] <worldbook-or-character-json>...`);
  }

  for (const file of options.files) {
    const json = loadJsonFile(file);
    const result = normalizeDisabledFlags(json);

    if (options.write && result.changed > 0) {
      if (options.backup) {
        copyFileSync(file, `${file}.before-disabled-normalize.bak`);
      }
      writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
    }

    const mode = options.write ? 'write' : 'dry-run';
    console.log(`normalize-worldbook-disabled-flags: ${file} ${mode} (${result.changed}/${result.entries} disabled entries normalized)`);
    for (const entry of result.changedEntries.slice(0, 8)) {
      console.log(`  - ${entry.title} [disable=${entry.beforeDisable}, enabled=${entry.beforeEnabled}]`);
    }
    if (result.changedEntries.length > 8) {
      console.log(`  ... ${result.changedEntries.length - 8} more`);
    }
  }
}

try {
  main();
} catch (error) {
  console.error(`normalize-worldbook-disabled-flags: failed: ${error?.message || String(error)}`);
  process.exitCode = 1;
}
