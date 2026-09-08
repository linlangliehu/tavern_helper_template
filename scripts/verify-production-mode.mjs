#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const yamlPaths = [
  join(repoRoot, 'src/神秘复苏模拟器/index.yaml'),
  join(repoRoot, 'src/魔法禁书目录模拟器/index.yaml'),
];
const cdnRefPattern =
  /https:\/\/(?:(?:testingcf|cdn)\.)?jsdelivr\.net\/gh\/linlangliehu\/tavern_helper_template@[0-9a-f]{7,40}\//;
const errors = [];

for (const yamlPath of yamlPaths) {
  const displayName = yamlPath.slice(repoRoot.length + 1);
  let content;
  try {
    content = readFileSync(yamlPath, 'utf8');
  } catch (error) {
    errors.push(`${displayName}: 无法读取 (${error.message})`);
    continue;
  }

  if (content.includes('# DEV_MODE_ORIGINAL_CDN_REF:')) {
    errors.push(`${displayName}: 残留开发模式标记 # DEV_MODE_ORIGINAL_CDN_REF`);
  }
  if (content.includes('http://127.0.0.1:5510/')) {
    errors.push(`${displayName}: 残留本地开发地址 http://127.0.0.1:5510/`);
  }
  if (!cdnRefPattern.test(content)) {
    errors.push(`${displayName}: 缺少锁定 commit SHA 的 jsDelivr CDN 引用`);
  }
}

if (errors.length > 0) {
  console.error('[verify-production-mode] failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`verify-production-mode: passed (${yamlPaths.length} YAML files)`);
