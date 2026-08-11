/**
 * 神秘复苏模拟器发布常量（G4 单真源）
 * publish-card / verify-mfrs-release-png 共用，避免人肉传参漂移。
 */
export const REPO = 'linlangliehu/tavern_helper_template';
// v8.15.0: 人物/地点改从 stat_data 数据镜像（只补新行、不覆盖 ACU/用户已有细节），
//          视线不再依赖 ACU 填表独立 API 就能入库并出现在 HUD。
export const CDN_REF = '4a850a301622a0d8f991e73c0b492e6a84209958';
export const CDN = `https://testingcf.jsdelivr.net/gh/${REPO}@${CDN_REF}/`;
export const CDN_CACHE_VERSION = 'v81500_20260812_01';
export const RELEASE_VERSION = '8.15.0';
export const MAGVAR_PIN = '0.171.0';
export const MAGVAR_BUNDLE_URL = `https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate@${MAGVAR_PIN}/artifact/bundle.js`;
