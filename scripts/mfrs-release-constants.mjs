/**
 * 神秘复苏模拟器发布常量（G4 单真源）
 * publish-card / verify-mfrs-release-png 共用，避免人肉传参漂移。
 */
export const REPO = 'linlangliehu/tavern_helper_template';
// v8.14.15: 修复固定状态栏生命周期泄漏、开局厉鬼双根映射、复苏终局契约、发布目录唯一成品门禁
export const CDN_REF = '85cb68233d793b634ed0a57662a5235442d31ac2';
export const CDN = `https://testingcf.jsdelivr.net/gh/${REPO}@${CDN_REF}/`;
export const CDN_CACHE_VERSION = 'v81415_20260726_01';
export const RELEASE_VERSION = '8.14.15';
export const MAGVAR_PIN = '0.171.0';
export const MAGVAR_BUNDLE_URL = `https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate@${MAGVAR_PIN}/artifact/bundle.js`;
