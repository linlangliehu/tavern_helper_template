/**
 * 神秘复苏模拟器发布常量（G4 单真源）
 * publish-card / verify-mfrs-release-png 共用，避免人肉传参漂移。
 */
export const REPO = 'linlangliehu/tavern_helper_template';
// v8.15.6: SQLite 新开卡首轮丢写修复链（热路径补建/预检补壳/模板重建物理库/
//          ROW_NOT_FOUND 补种/CRUD 写路径自愈）+ 线索编号补零。
export const CDN_REF = '4086244f9156441ab5fb74a6ae45ef929da6c557';
export const CDN = `https://testingcf.jsdelivr.net/gh/${REPO}@${CDN_REF}/`;
export const CDN_CACHE_VERSION = 'v81506_20260813_01';
export const RELEASE_VERSION = '8.15.6';
export const MAGVAR_PIN = '0.171.0';
export const MAGVAR_BUNDLE_URL = `https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate@${MAGVAR_PIN}/artifact/bundle.js`;
