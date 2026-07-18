import { registerMfrsRuntimeBuild } from '../_runtime_identity';

registerMfrsRuntimeBuild('数据库');

const databaseScriptName = 'spv3.9.5·数据库';
// 自托管 fork（vendor/shujuku-sp-fork/index.js，已把库默认提示词的 AM 编码改为 SP）。
// 从运行时实际加载 URL 解析发布 ref，确保 loader 和 vendor 始终来自同一个 bundle。
const databaseVendorPath = 'vendor/shujuku-sp-fork/index.js';
const databaseLoaderDistPath = 'dist/神秘复苏模拟器/脚本/数据库/index.js';
const databaseScriptCacheVersion = 'phase164-4-0-final-baseline-6-28-p5-4-hotfix13-mvu-v859';
const databaseScriptMarker = 'mfrs-4-0-final-baseline-6-28-p5-4-hotfix13-mvu-v859';
const databaseInstanceFlag = '__ACU_STAR_DB_III_LOADED__';
let databaseScriptLoadSeq = 0;

type DatabaseHostWindow = Window & {
  AutoCardUpdaterAPI?: Record<string, unknown>;
  __mfrsDatabaseScriptMarker__?: string;
  __mfrsScriptResourceUrls__?: Record<string, string>;
};

function getHostWindow() {
  try {
    return (window.parent ?? window) as DatabaseHostWindow;
  } catch {
    return window as DatabaseHostWindow;
  }
}

function wait(milliseconds: number) {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

function safeDecodeUrl(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizePathForMatch(value: string) {
  return safeDecodeUrl(value).replace(/\\/g, '/');
}

function isUsableHttpUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isMatchingScriptUrl(value: unknown, distPath: string) {
  if (!isUsableHttpUrl(value)) return false;
  return normalizePathForMatch(String(value)).includes(normalizePathForMatch(distPath));
}

function getCandidateScriptUrlsFromDocument(doc: Document | undefined | null) {
  if (!doc) return [];
  const candidates: string[] = [];
  const currentScript = doc.currentScript as HTMLScriptElement | null;
  if (currentScript?.src) candidates.push(currentScript.src);
  for (const script of Array.from(doc.querySelectorAll<HTMLScriptElement>('script[src]'))) {
    if (script.src) candidates.push(script.src);
  }
  return candidates;
}

function getCandidateScriptUrlsFromPerformance(targetWindow: Window | undefined | null) {
  try {
    return targetWindow?.performance
      ?.getEntriesByType?.('resource')
      ?.map(entry => entry.name)
      ?.reverse() ?? [];
  } catch {
    return [];
  }
}

function getCandidateScriptUrlsFromStack() {
  const stack = new Error().stack ?? '';
  return Array.from(stack.matchAll(/https?:\/\/[^\s)]+/g)).map(match => match[0]);
}

function resolveRuntimeScriptUrl(label: string, distPath: string) {
  const hostWindow = getHostWindow();
  const localWindow = window as DatabaseHostWindow;
  const candidates = [
    hostWindow.__mfrsScriptResourceUrls__?.[label],
    localWindow.__mfrsScriptResourceUrls__?.[label],
    ...getCandidateScriptUrlsFromDocument(document),
    ...getCandidateScriptUrlsFromDocument(hostWindow.document),
    ...getCandidateScriptUrlsFromPerformance(window),
    ...getCandidateScriptUrlsFromPerformance(hostWindow),
    ...getCandidateScriptUrlsFromStack(),
  ];

  return candidates.find(candidate => isMatchingScriptUrl(candidate, distPath)) ?? null;
}

function buildRepositoryResourceUrl(currentScriptUrl: string, resourcePath: string) {
  const parsed = new URL(currentScriptUrl);
  const href = `${parsed.origin}${parsed.pathname}`;
  const decodedHref = normalizePathForMatch(href);
  const distIndex = decodedHref.indexOf('/dist/');
  if (distIndex >= 0) {
    return `${href.slice(0, distIndex + 1)}${resourcePath}?v=${databaseScriptCacheVersion}`;
  }

  return `${parsed.origin}/${resourcePath}?v=${databaseScriptCacheVersion}`;
}

function buildDatabaseScriptBaseUrl() {
  const currentScriptUrl = resolveRuntimeScriptUrl(databaseScriptName, databaseLoaderDistPath);
  if (!currentScriptUrl) {
    throw new Error(`[${databaseScriptName}] 无法确认当前 loader URL，已拒绝回退到 @main 以避免加载错版本 vendor。`);
  }

  return buildRepositoryResourceUrl(currentScriptUrl, databaseVendorPath);
}

function buildDatabaseScriptUrl() {
  return `${buildDatabaseScriptBaseUrl()}&mfrs_loader=${Date.now()}_${databaseScriptLoadSeq++}`;
}

function clearPreviousDatabaseInstance() {
  const hostWindow = getHostWindow();
  const localWindow = window as DatabaseHostWindow;
  const targets = hostWindow === localWindow ? [hostWindow] : [hostWindow, localWindow];

  for (const target of targets) {
    const targetRecord = target as DatabaseHostWindow & Record<string, unknown>;
    delete target.AutoCardUpdaterAPI;
    delete target.__mfrsDatabaseScriptMarker__;
    delete targetRecord[databaseInstanceFlag];
  }
}

async function waitForRegisteredDatabaseApi(attempts = 30, interval = 100) {
  const hostWindow = getHostWindow();
  for (let attempt = 0; attempt < attempts; attempt++) {
    const api = hostWindow.AutoCardUpdaterAPI;
    if (api && typeof api === 'object') return api;
    await wait(interval);
  }
  return null;
}

function tagDatabaseApi(api: Record<string, unknown> | null) {
  const hostWindow = getHostWindow();
  if (!api || typeof api !== 'object') {
    delete hostWindow.__mfrsDatabaseScriptMarker__;
    return;
  }

  hostWindow.__mfrsDatabaseScriptMarker__ = databaseScriptMarker;
  Object.defineProperty(api, '__mfrsDatabaseScriptMarker__', {
    configurable: true,
    value: databaseScriptMarker,
  });
}

async function loadDatabaseScript() {
  console.info(`[${databaseScriptName}] 正在加载数据库本体`);

  try {
    clearPreviousDatabaseInstance();
    await import(/* webpackIgnore: true */ buildDatabaseScriptUrl());
    tagDatabaseApi(await waitForRegisteredDatabaseApi());
    console.info(`[${databaseScriptName}] 数据库本体已加载`);
  } catch (error) {
    console.error(`[${databaseScriptName}] 数据库本体加载失败，请检查网络、酒馆助手和数据库本体版本`, error);
    throw error;
  }
}

loadDatabaseScript();
