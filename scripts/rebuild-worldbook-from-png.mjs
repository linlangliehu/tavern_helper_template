/* eslint-disable import-x/no-nodejs-modules */
/**
 * 从干净 PNG（chara/ccv3 内嵌 character_book）重建外部 worldbook JSON。
 *
 * 用途：SillyTavern 运行态 world_info 从外部 worldbook JSON 加载（非卡内嵌）。
 * 当外部 JSON 被某张内嵌污染的卡导入覆盖而漂回污染态（383/5/40613）时，
 * normalize-worldbook-disabled-flags.mjs 只补双禁用标志、不改 disabled 数量，无法修复。
 * 本脚本用干净 PNG 内嵌的 character_book.entries 直接替换外部 JSON 的 entries（保留外部顶层元数据）。
 *
 * 用法：
 *   node scripts/rebuild-worldbook-from-png.mjs <clean.png> <external.json> [external2.json ...]
 *
 * 例：
 *   node scripts/rebuild-worldbook-from-png.mjs "E:/SillyTavern/data/banyan/characters/神秘复苏模拟器发布版5.png" "E:/SillyTavern/data/banyan/worlds/神秘复苏模拟器发布版.json"
 */
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';

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

function isPngBuffer(buffer) {
  return buffer.length >= 8
    && buffer[0] === 0x89
    && buffer[1] === 0x50
    && buffer[2] === 0x4e
    && buffer[3] === 0x47
    && buffer[4] === 0x0d
    && buffer[5] === 0x0a
    && buffer[6] === 0x1a
    && buffer[7] === 0x0a;
}

function loadPngCharacterMetadata(file, buffer) {
  const results = [];
  let offset = 8;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buffer.length) break;
    if (type === 'tEXt') {
      const data = buffer.subarray(dataStart, dataEnd);
      const separator = data.indexOf(0);
      if (separator > 0) {
        const key = data.subarray(0, separator).toString('latin1').toLowerCase();
        if (key === 'chara' || key === 'ccv3') {
          const encoded = data.subarray(separator + 1).toString('latin1');
          const decoded = Buffer.from(encoded, 'base64').toString('utf8');
          results.push({ key, value: JSON.parse(decoded) });
        }
      }
    }
    offset = dataEnd + 4;
  }
  return results;
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node rebuild-worldbook-from-png.mjs <clean.png> <external.json> [external2.json ...]');
  process.exit(1);
}

const pngPath = args[0];
const targets = args.slice(1);

const pngBuffer = readFileSync(pngPath);
if (!isPngBuffer(pngBuffer)) {
  console.error(`not a PNG: ${pngPath}`);
  process.exit(1);
}
const metas = loadPngCharacterMetadata(pngPath, pngBuffer);
if (metas.length === 0) {
  console.error(`no chara/ccv3 PNG tEXt metadata found in ${pngPath}`);
  process.exit(1);
}

// 优先用 chara，fallback ccv3
const chara = metas.find(m => m.key === 'chara') || metas[0];
const cleanBook = findBookObject(chara.value);
if (!cleanBook) {
  console.error(`no character_book in ${pngPath}#${chara.key}`);
  process.exit(1);
}
const cleanEntries = normalizeEntries(cleanBook.entries);
// 与 verify-worldbook-pollution-gate.mjs 的 isEntryDisabled 保持一致：
// PNG chara 的禁用条目可能只有 enabled=false 而无 disable=true（SillyTavern 原生形状），
// 只认 disable===true 会把干净源误判成污染。
const isDisabled = entry => entry.disable === true || entry.enabled === false;

const cleanEntriesObj = {};
for (const entry of cleanEntries) {
  const uid = entry.uid != null ? entry.uid : Object.keys(cleanEntriesObj).length;
  const normalized = { ...entry };
  // 外部 worldbook JSON 的严格 gate 要求禁用条目同时 disable=true && enabled=false；
  // PNG chara 可能只有 enabled=false，写回前补齐双标志，省掉单独 normalize 步骤。
  if (isDisabled(normalized)) {
    normalized.disable = true;
    normalized.enabled = false;
  }
  cleanEntriesObj[String(uid)] = normalized;
}

const disabled = cleanEntries.filter(isDisabled).length;
const maxEnabled = cleanEntries
  .filter(entry => !isDisabled(entry))
  .reduce((max, entry) => Math.max(max, String(entry.content || '').length), 0);
console.log(`clean source ${pngPath}#${chara.key}: ${cleanEntries.length} entries, ${disabled} disabled, max enabled ${maxEnabled}`);

if (disabled !== 33 || maxEnabled > 5851) {
  console.error(`ERROR: clean source is NOT clean (expected 383/33/max 5851). aborting.`);
  process.exit(2);
}

const stamp = Date.now();
for (const target of targets) {
  const bak = `${target}.before-rebuild.${stamp}.bak`;
  copyFileSync(target, bak);
  console.log(`backed up ${target} -> ${bak}`);
  const external = JSON.parse(readFileSync(target, 'utf8'));
  const extBook = findBookObject(external) || external;
  const oldCount = normalizeEntries(extBook.entries || {}).length;
  extBook.entries = cleanEntriesObj;
  writeFileSync(target, JSON.stringify(external, null, 4), 'utf8');
  console.log(`rebuilt ${target}: ${oldCount} -> ${cleanEntries.length} entries (uid-object)`);
}
console.log('done.');
