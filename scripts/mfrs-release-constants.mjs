/**
 * 神秘复苏模拟器发布常量（G4 单真源）
 * publish-card / verify-mfrs-release-png 共用，避免人肉传参漂移。
 */
export const REPO = 'linlangliehu/tavern_helper_template';
// v8.13.31: MAINT-29 黄金储备正式路径 + drawer watcher 生命周期
export const CDN_REF = '8ee8c584fc60ce502d590c672883872589b31e44';
export const CDN = `https://testingcf.jsdelivr.net/gh/${REPO}@${CDN_REF}/`;
export const CDN_CACHE_VERSION = 'v81331_20260716_01';
export const RELEASE_VERSION = '8.13.31';
export const MAGVAR_PIN = '0.171.0';
export const MAGVAR_BUNDLE_URL = `https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate@${MAGVAR_PIN}/artifact/bundle.js`;
