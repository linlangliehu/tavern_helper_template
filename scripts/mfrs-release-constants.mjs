/**
 * 神秘复苏模拟器发布常量（G4 单真源）
 * publish-card / verify-mfrs-release-png 共用，避免人肉传参漂移。
 */
export const REPO = 'linlangliehu/tavern_helper_template';
// v8.14.16: 修复现场档案不随对话实时更新（跨窗口 throwing getter 导致 hotfix 每轮入口静默死亡、
//           HUD raw 兜底 applier 路径失配成死代码、数据库核心表改按业务键每轮 upsert）
export const CDN_REF = 'e72c94d9df3b7072bd22b7d7a9ef3273f7f15069';
export const CDN = `https://testingcf.jsdelivr.net/gh/${REPO}@${CDN_REF}/`;
export const CDN_CACHE_VERSION = 'v81416_20260811_01';
export const RELEASE_VERSION = '8.14.16';
export const MAGVAR_PIN = '0.171.0';
export const MAGVAR_BUNDLE_URL = `https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate@${MAGVAR_PIN}/artifact/bundle.js`;
