/**
 * 神秘复苏模拟器发布常量（G4 单真源）
 * publish-card / verify-mfrs-release-png 共用，避免人肉传参漂移。
 */
export const REPO = 'linlangliehu/tavern_helper_template';
// v8.13.20: BF4 worldbook cleanup + stub deprecation (dist @de42f2c2de8e)
export const CDN_REF = 'de42f2c2de8ede196fb059a622afd312b9be48ab';
export const CDN = `https://testingcf.jsdelivr.net/gh/${REPO}@${CDN_REF}/`;
export const CDN_CACHE_VERSION =
  'phase168-4-0-final-baseline-6-28-p5-4-hotfix14-mvu-v81320-bf4-worldbook';
export const RELEASE_VERSION = '8.13.20';
export const MAGVAR_PIN = '0.171.0';
export const MAGVAR_BUNDLE_URL = `https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate@${MAGVAR_PIN}/artifact/bundle.js`;
