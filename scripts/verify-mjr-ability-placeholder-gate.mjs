/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const cardRoot = join(repoRoot, 'src', '魔法禁书目录模拟器');
const rawWriterPath = join(cardRoot, '脚本', 'mvu-protocol-applier', 'raw-status-writer.ts');

function loadStandaloneTsSource(source, filename = rawWriterPath) {
  const transpiled = transpileModule(source, {
    compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
    fileName: filename,
  }).outputText;
  const sandbox = vm.createContext({ console });
  const module = { exports: {} };
  const wrapper = vm.runInContext(`(function (module, exports, require) {\n${transpiled}\n})`, sandbox, {
    filename,
  });
  wrapper(module, module.exports, specifier => {
    throw new Error(`Unexpected require: ${specifier}`);
  });
  return module.exports;
}

function protocol(patches) {
  return `<UpdateVariable><JSONPatch>${JSON.stringify(patches)}</JSONPatch></UpdateVariable>`;
}

function readPngCharacterData(pngPath) {
  const buffer = readFileSync(pngPath);
  assert.ok(buffer.length >= 8, 'candidate PNG must not be empty');
  assert.equal(buffer.toString('latin1', 0, 8), '\u0089PNG\r\n\u001a\n', 'candidate must be a PNG file');
  const chunks = new Map();
  let offset = 8;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('latin1', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'tEXt') {
      const keywordEnd = data.indexOf(0);
      const keyword = data.toString('latin1', 0, keywordEnd);
      if (keyword === 'chara' || keyword === 'ccv3')
        chunks.set(keyword, data.subarray(keywordEnd + 1).toString('latin1'));
    }
    offset += length + 12;
  }
  assert.ok(chunks.has('chara'), 'candidate PNG must contain a chara chunk');
  assert.ok(chunks.has('ccv3'), 'candidate PNG must contain a ccv3 chunk');
  const decode = raw => {
    const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    return JSON.parse(text);
  };
  return { chara: decode(chunks.get('chara')), ccv3: decode(chunks.get('ccv3')) };
}

function assertSanitizer(apply, label = 'production') {
  const electric = {
    能力名称: '电击使',
    阵营类型: '超能力',
    等级或位阶: 'Level 5',
    能力效果: '以自身电磁场定向操纵电流与铁磁物质。',
    实战运用: '战斗中可用电磁力偏转金属；日常中可重启电子门锁。',
  };
  const teleport = {
    能力名称: '空间移动',
    阵营类型: '超能力',
    等级或位阶: 'Level 4',
    能力效果: '计算坐标后将自身或接触物短距离转移到目标点。',
    实战运用: '战斗中可瞬移到死角；日常中可跨越封闭天桥。',
  };
  const base = { stat_data: { 能力档案: [electric, teleport] } };
  const placeholder = '依设定与剧情判定';
  const combatPlaceholder = '随剧情展开；战斗与日常分别描述';

  let result = apply(
    base,
    protocol([
      {
        op: 'replace',
        path: '/能力档案',
        value: [
          {
            能力名称: '空间移动',
            阵营类型: '超能力',
            能力效果: placeholder,
            实战运用: combatPlaceholder,
          },
          { 能力名称: '矢量操作', 阵营类型: '超能力', 能力效果: placeholder, 实战运用: combatPlaceholder },
        ],
      },
    ]),
  ).data;
  assert.equal(
    result.stat_data.能力档案[0].能力效果,
    teleport.能力效果,
    `${label}: whole-array replace must preserve old substantive value by stable identity`,
  );
  assert.equal(
    result.stat_data.能力档案[0].实战运用,
    teleport.实战运用,
    `${label}: whole-array replace must preserve old combat guide by stable identity`,
  );
  assert.equal(result.stat_data.能力档案[1].能力效果, '', `${label}: unmatched ability must become empty`);
  assert.equal(result.stat_data.能力档案[1].实战运用, '', `${label}: unmatched combat guide must become empty`);

  result = apply(
    base,
    protocol([
      {
        op: 'replace',
        path: '/能力档案/0',
        value: { 能力名称: '空间移动', 阵营类型: '超能力', 能力效果: placeholder, 实战运用: combatPlaceholder },
      },
    ]),
  ).data;
  assert.equal(
    result.stat_data.能力档案[0].能力效果,
    teleport.能力效果,
    `${label}: single-object replace must match by ability name, not array index`,
  );
  assert.equal(
    result.stat_data.能力档案[1].能力效果,
    teleport.能力效果,
    `${label}: unrelated ability must remain untouched`,
  );

  result = apply(
    base,
    protocol([
      {
        op: 'insert',
        path: '/能力档案/-',
        value: { 能力名称: '电击使', 阵营类型: '超能力', 能力效果: placeholder, 实战运用: combatPlaceholder },
      },
    ]),
  ).data;
  assert.equal(result.stat_data.能力档案.length, 2, `${label}: sanitized insert must keep idempotent merge`);
  assert.equal(
    result.stat_data.能力档案[0].能力效果,
    electric.能力效果,
    `${label}: existing insert identity must preserve old value`,
  );

  const aliasInput = {
    op: 'add',
    path: '/能力档案/-',
    value: { 能力名称: '幻想杀手', 阵营类型: '灵装', 能力效果: placeholder, 实战运用: combatPlaceholder },
  };
  result = apply(base, protocol([aliasInput])).data;
  assert.equal(result.stat_data.能力档案.length, 3, `${label}: add must behave as array insert`);
  assert.equal(result.stat_data.能力档案[2].能力效果, '', `${label}: add alias must sanitize new ability`);
  assert.deepEqual(
    aliasInput.value,
    { 能力名称: '幻想杀手', 阵营类型: '灵装', 能力效果: placeholder, 实战运用: combatPlaceholder },
    `${label}: patch input must remain immutable`,
  );

  const emptyTargetBase = {
    stat_data: {
      能力档案: [electric, { ...teleport, 能力效果: '', 实战运用: '' }],
    },
  };
  result = apply(emptyTargetBase, protocol([{ op: 'replace', path: '/能力档案/1/能力效果', value: placeholder }])).data;
  assert.equal(
    result.stat_data.能力档案[1].能力效果,
    '',
    `${label}: field path must not inherit another ability by array index`,
  );

  result = apply(base, protocol([{ op: 'replace', path: '/能力档案/0/能力效果', value: placeholder }])).data;
  assert.equal(
    result.stat_data.能力档案[0].能力效果,
    electric.能力效果,
    `${label}: field path must preserve its own old substantive value`,
  );

  const duplicateNameBase = {
    stat_data: {
      能力档案: [
        { 能力名称: '双生能力', 阵营类型: '超能力', 能力效果: '科学侧效果', 实战运用: '科学侧用法' },
        { 能力名称: '双生能力', 阵营类型: '术式', 能力效果: '魔法侧效果', 实战运用: '魔法侧用法' },
      ],
    },
  };
  result = apply(
    duplicateNameBase,
    protocol([
      {
        op: 'replace',
        path: '/能力档案',
        value: [{ 能力名称: '双生能力', 阵营类型: '术式', 能力效果: placeholder, 实战运用: combatPlaceholder }],
      },
    ]),
  ).data;
  assert.equal(
    result.stat_data.能力档案[0].能力效果,
    '魔法侧效果',
    `${label}: camp must disambiguate duplicate ability names`,
  );

  const substantive = { 能力名称: '电击使', 阵营类型: '超能力', 能力效果: '新实质效果', 实战运用: '新实质用法' };
  result = apply(base, protocol([{ op: 'replace', path: '/能力档案/0', value: substantive }])).data;
  assert.equal(result.stat_data.能力档案[0].能力效果, '新实质效果', `${label}: substantive new value must pass`);

  const nonAbilityTask = { 任务名称: '寻找茵蒂克丝', 任务描述: placeholder };
  result = apply(
    { stat_data: { 任务追踪: [] } },
    protocol([{ op: 'insert', path: '/任务追踪/-', value: nonAbilityTask }]),
  ).data;
  assert.equal(
    result.stat_data.任务追踪[0].任务描述,
    placeholder,
    `${label}: sanitizer must be scoped to ability text fields`,
  );
}

const source = readFileSync(rawWriterPath, 'utf8');
assert.match(source, /function sanitizeAbilityPatch\(/, 'ability sanitizer must exist in the authoritative writer');
assert.match(source, /function findExistingAbility\(/, 'stable ability identity matching must exist');
assert.match(source, /requestedOp === 'add'/, 'add/insert alias must be normalized');

const uiSource = readFileSync(join(cardRoot, '脚本', '界面美化', 'index.ts'), 'utf8');
assert.doesNotMatch(uiSource, /generateRaw/, 'dead generateRaw path must stay removed');
assert.doesNotMatch(uiSource, /MFRS_ABILITY_FIX_KEY/, 'old attempt counter must stay removed');
assert.match(
  uiSource,
  /能力效果: \(isScienceSide \? abilityD : magicD\) \|\| ''/,
  'opening ability baseline must use an empty string',
);

for (const yamlName of ['变量更新规则.yaml', '变量输出格式.yaml']) {
  const yamlSource = readFileSync(join(cardRoot, '世界书', '变量', yamlName), 'utf8');
  assert.doesNotMatch(yamlSource, /依设定与剧情判定/, `${yamlName} must not expose the old exact placeholder`);
  assert.doesNotMatch(
    yamlSource,
    /随剧情展开；战斗与日常分别描述/,
    `${yamlName} must not expose the old exact combat placeholder`,
  );
}

const packageSource = readFileSync(join(repoRoot, 'package.json'), 'utf8');
assert.match(
  packageSource,
  /"build": "node scripts\/verify-mjr-ability-placeholder-gate\.mjs && node scripts\/verify-production-mode\.mjs && webpack --mode production"/,
  'ability placeholder gate must run before production build',
);

const indexPath = join(cardRoot, 'index.yaml');
const indexSource = readFileSync(indexPath, 'utf8');
const versionMatch = indexSource.match(/^版本:\s*['"]([^'"]+)['"]\s*$/m);
assert.ok(versionMatch, 'index.yaml must declare a quoted card version');
const expectedVersion = versionMatch[1];

const candidatePngPath = join(cardRoot, '魔法禁书目录模拟器.png');
const candidateCard = readPngCharacterData(candidatePngPath);
assert.equal(
  String(candidateCard.chara?.data?.character_version ?? ''),
  expectedVersion,
  'chara chunk version must match index.yaml',
);
assert.equal(
  String(candidateCard.ccv3?.data?.character_version ?? ''),
  expectedVersion,
  'ccv3 chunk version must match index.yaml',
);

const loaderScripts = candidateCard.chara?.data?.extensions?.tavern_helper?.scripts;
assert.ok(Array.isArray(loaderScripts), 'candidate card must embed Tavern Helper scripts');
assert.equal(loaderScripts.length, 1, 'candidate card must embed exactly one script loader');
const loaderContent = String(loaderScripts[0]?.content ?? '');
const loaderUrls = [...loaderContent.matchAll(/https?:\/\/[^\s'")]+/g)].map(match => match[0]);
assert.equal(loaderUrls.length, 6, 'script loader must reference all six production modules');
for (const url of loaderUrls) {
  assert.match(
    url,
    /^http:\/\/127\.0\.0\.1:5510\/dist\/魔法禁书目录模拟器\/|https:\/\/(?:testingcf\.)?jsdelivr\.net\/gh\/linlangliehu\/tavern_helper_template@[0-9a-f]{7,40}\/dist\/魔法禁书目录模拟器\//,
    `loader URL must be a locked candidate or production address: ${url}`,
  );
}
assert.doesNotMatch(loaderContent, /localhost/, 'candidate loader must not use localhost');

const production = loadStandaloneTsSource(source);
assertSanitizer(production.applyRawProtocolToMvuData);

const mutationSource = source.replace(
  'const safePatch = sanitizeAbilityPatch(root, patch, pathParts);',
  'const safePatch = patch;',
);
assert.notEqual(mutationSource, source, 'mutation setup must disable the sanitizer');
const mutation = loadStandaloneTsSource(mutationSource, `${rawWriterPath}.mutation.ts`);
assert.throws(
  () => assertSanitizer(mutation.applyRawProtocolToMvuData, 'mutation'),
  /whole-array replace must preserve old substantive value by stable identity/,
  'gate must kill a regression that bypasses the sanitizer',
);

console.log('MJR_ABILITY_PLACEHOLDER_GATE_OK');
