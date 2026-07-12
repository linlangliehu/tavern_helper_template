# Task Plan: 神秘复苏模拟器 · 动效再强一档（8.10.0）

## 当前状态

**2026-07-12：Phase 1–6 完成，Phase 7 发布进行中。**

- 基线：origin/main v8.9.0 鬼眼封案
- 本轮：在 8.9 结构上叠加 latest-only 动效 + reduced-motion + 44px + host 壳 + 状态栏 ambient 降噪
- 未改 MVU/世界书/SQL/AI 契约

## Phase 7：发布 8.10.0

- [x] 源码叠加动效（保 8.9 结构）
- [x] production build + verify 门禁
- [ ] 资源提交（src+dist）并 push
- [ ] 更新 publish-card CDN_REF/cache/releaseVersion=8.10.0
- [ ] publish-card + 发布提交

## 主改文件

- `脚本/界面美化/index.ts` — narrative ambient + RM
- `脚本/消息内面板/index.ts` — panel ambient/blood/risk/44px + RM
- `脚本/固定状态栏/index.ts` — dual-slot shell + order 10/20
- `脚本/数据库前端/v10_2_visualizer.js` — RM only
- `界面/状态栏/global.css` / `App.vue` — weaker ambient + RM
