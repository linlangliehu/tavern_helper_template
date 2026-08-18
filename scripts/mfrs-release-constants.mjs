/**
 * 神秘复苏模拟器发布常量（G4 单真源）
 * publish-card / verify-mfrs-release-png 共用，避免人肉传参漂移。
 */
export const REPO = 'linlangliehu/tavern_helper_template';
// v8.15.26: HUD沉浸模式提示词编辑弹窗z-index抬升 + 拓本图录/鬼档案/协议重建/界面美化
export const CDN_REF = 'f9535cea2b473f843d087ab493112dbbc908c7f0';
export const CDN = `https://testingcf.jsdelivr.net/gh/${REPO}@${CDN_REF}/`;
export const CDN_CACHE_VERSION = 'v81526_20260819_01';
export const RELEASE_VERSION = '8.15.26';
export const MAGVAR_PIN = '0.171.0';
export const MAGVAR_BUNDLE_URL = `https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate@${MAGVAR_PIN}/artifact/bundle.js`;
