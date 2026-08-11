/**
 * 神秘复苏模拟器发布常量（G4 单真源）
 * publish-card / verify-mfrs-release-png 共用，避免人肉传参漂移。
 */
export const REPO = 'linlangliehu/tavern_helper_template';
// v8.14.17: 人物/地点改从 stat_data 数据镜像（只补新行、不覆盖 ACU/用户已有细节），
//           视线不再依赖 ACU 填表独立 API 就能入库并出现在 HUD。
export const CDN_REF = 'e72c94d9df3b7072bd22b7d7a9ef3273f7f15069';
export const CDN = `https://testingcf.jsdelivr.net/gh/${REPO}@${CDN_REF}/`;
export const CDN_CACHE_VERSION = 'v81417_20260812_01';
export const RELEASE_VERSION = '8.14.17';
export const MAGVAR_PIN = '0.171.0';
export const MAGVAR_BUNDLE_URL = `https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate@${MAGVAR_PIN}/artifact/bundle.js`;
