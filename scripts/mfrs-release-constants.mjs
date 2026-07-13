/**
 * 神秘复苏模拟器发布常量（G4 单真源）
 * publish-card / verify-mfrs-release-png 共用，避免人肉传参漂移。
 */
export const REPO = 'linlangliehu/tavern_helper_template';
// v8.13.21: BF5 gates G2-G5 + DM8 + WM1/2/L8 (dist @f2b7db2cab55)
export const CDN_REF = 'f2b7db2cab5527b143d5942c63463011318747db';
export const CDN = `https://testingcf.jsdelivr.net/gh/${REPO}@${CDN_REF}/`;
export const CDN_CACHE_VERSION =
  'phase168-4-0-final-baseline-6-28-p5-4-hotfix14-mvu-v81321-bf5-gates';
export const RELEASE_VERSION = '8.13.21';
export const MAGVAR_PIN = '0.171.0';
export const MAGVAR_BUNDLE_URL = `https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate@${MAGVAR_PIN}/artifact/bundle.js`;
