// 检查 scripts/ 里引用的外部包是否都在 package.json 中声明。
// 目的：防止本地残留的 node_modules 掩盖未声明依赖，导致 CI 全新安装后 ERR_MODULE_NOT_FOUND。
import { readdirSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scriptsDir = join(root, 'scripts');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const declared = new Set(
  Object.keys({
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.optionalDependencies,
    ...pkg.peerDependencies,
  }),
);

const walk = dir =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(join(dir, entry.name));
    return /\.(mjs|cjs|js|ts)$/.test(entry.name) ? [join(dir, entry.name)] : [];
  });

const importPattern = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)['"]([^'"]+)['"]/gm;
const missing = new Map();
const files = walk(scriptsDir);

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1];
    if (/^(\.|\/|node:|[A-Za-z]:)/.test(specifier)) continue;
    const name = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];
    if (builtinModules.includes(name) || declared.has(name)) continue;
    if (!missing.has(name)) missing.set(name, new Set());
    missing.get(name).add(relative(root, file));
  }
}

if (missing.size > 0) {
  console.error('verify-script-deps: scripts/ 引用了 package.json 未声明的包：');
  for (const [name, users] of missing) console.error(`- ${name}: ${[...users].join(', ')}`);
  process.exit(1);
}

console.log(`verify-script-deps: passed (${files.length} files)`);
