/**
 * 神秘复苏模拟器发布常量（G4 单真源）
 * publish-card / verify-mfrs-release-png 共用，避免人肉传参漂移。
 */
export const REPO = 'linlangliehu/tavern_helper_template';
// v8.15.10: 事件纪要正文污染防御、AI 写表列名/枚举硬约束、
//           表名前缀兼容、写入审计探针与自动编号覆写根因修复。
export const CDN_REF = '785d351d2b9bd0197a8f5f96408afb0ae0cf3dc9';
export const CDN = `https://testingcf.jsdelivr.net/gh/${REPO}@${CDN_REF}/`;
export const CDN_CACHE_VERSION = 'v81510_20260814_01';
export const RELEASE_VERSION = '8.15.10';
export const MAGVAR_PIN = '0.171.0';
export const MAGVAR_BUNDLE_URL = `https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate@${MAGVAR_PIN}/artifact/bundle.js`;
