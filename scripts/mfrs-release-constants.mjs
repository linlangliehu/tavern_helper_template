/**
 * 神秘复苏模拟器发布常量（G4 单真源）
 * publish-card / verify-mfrs-release-png 共用，避免人肉传参漂移。
 */
export const REPO = 'linlangliehu/tavern_helper_template';
// v8.15.30: 修复 MVU「假性已应用」stat_data 重载退回初值（历史假性已应用楼层重写 + 阻止新增）
export const CDN_REF = '8ff362d08355f5f0e25496b90ae8025ce35c9c79';
export const CDN = `https://testingcf.jsdelivr.net/gh/${REPO}@${CDN_REF}/`;
export const CDN_CACHE_VERSION = 'v81530_20260820_01';
export const RELEASE_VERSION = '8.15.30';
export const MAGVAR_PIN = '0.171.0';
export const MAGVAR_BUNDLE_URL = `https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate@${MAGVAR_PIN}/artifact/bundle.js`;
