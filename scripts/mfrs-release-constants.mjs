/**
 * 神秘复苏模拟器发布常量（G4 单真源）
 * publish-card / verify-mfrs-release-png 共用，避免人肉传参漂移。
 */
export const REPO = 'linlangliehu/tavern_helper_template';
// v8.15.24: 拓本图录新增 + 鬼档案核心机制 + 移除 choices 协议 + 界面主题重构 + 协议重建
export const CDN_REF = '099efa8f79075e0d9b02dafcd12640b2474f3b1c';
export const CDN = `https://testingcf.jsdelivr.net/gh/${REPO}@${CDN_REF}/`;
export const CDN_CACHE_VERSION = 'v81524_20260818_01';
export const RELEASE_VERSION = '8.15.24';
export const MAGVAR_PIN = '0.171.0';
export const MAGVAR_BUNDLE_URL = `https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate@${MAGVAR_PIN}/artifact/bundle.js`;
