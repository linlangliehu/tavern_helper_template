/**
 * 神秘复苏模拟器发布常量（G4 单真源）
 * publish-card / verify-mfrs-release-png 共用，避免人肉传参漂移。
 */
export const REPO = 'linlangliehu/tavern_helper_template';
// v8.15.28: 抽卡物品「使用」按钮消耗逻辑 + 数字格式剩余次数兼容 + 现场档案使用按钮 UI
export const CDN_REF = 'd049bf635a539d1f13514dfd4a5ad276507491fe';
export const CDN = `https://testingcf.jsdelivr.net/gh/${REPO}@${CDN_REF}/`;
export const CDN_CACHE_VERSION = 'v81528_20260820_01';
export const RELEASE_VERSION = '8.15.28';
export const MAGVAR_PIN = '0.171.0';
export const MAGVAR_BUNDLE_URL = `https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate@${MAGVAR_PIN}/artifact/bundle.js`;
