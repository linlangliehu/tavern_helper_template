# Phase 0 · 契约回归清单（T0.5）

每个 Phase 结束、发版前必须全勾。基线：发布版 **8.10.0 / a37fe0b**。  
**Phase4 静态总检时间**：2026-07-12（源码+门禁；ST 实机 CDP 仍依赖本地 dist / 未发版）

## A. 黑名单零 diff

- [x] `世界书/**` 无改动  
- [x] `世界书/变量/**`、变量结构脚本无改动  
- [x] `数据库/**` SQL JSON 无改动  
- [x] `table-change-adapter` 业务逻辑无改动  
- [x] `index.yaml` → `正则:` 段无改动（33 条名单不变）  
- [x] `index.yaml` → `脚本库:` 顺序/启用/名称不变  
- [x] `hotfix-generation-ended-listeners` **源码**协议逻辑无改动（`src` 无 diff；误触的 dist 已还原）  
- [x] `mvu` / MagVarUpdate 入口无改动  

> 允许改动的白名单：`消息内面板` / `界面美化` / `固定状态栏` / `v10_2_visualizer` / `global.css` / archive-ui 门禁 / 对应 dist。

## B. 挂载与槽位

- [x] `#mfrs-fixed-status-host` 仍 `insertBefore(#send_form|#form_sheld)`（源码静态）  
- [x] `#mfrs-fixed-dashboard-slot` **order 10**  
- [x] `#mfrs-fixed-frontend-slot` **order 20**  
- [x] dashboard 收 `.acu-embedded-dashboard-container`（visualizer 契约未改）  
- [x] frontend 收 `.acu-wrapper`  
- [x] 仅卡名/头像 ∈ {神秘复苏模拟器, 神秘复苏模拟器发布版} 时挂载  
- [x] 切到其他卡后 host 清理钩子仍在（`__mfrsFixedStatusCleanup__` / `__mfrsDatabaseFrontendCleanup__`）  

> 实机挂载/清理：需本地 dist 注入后手测（CDN 仍为 8.10.0）。

## C. 数据只读映射（字段路径不增删）

- [x] 死亡风险 ← `风险值`  
- [x] 复苏风险 ← `驭鬼者状态.总复苏风险` / `厉鬼复苏程度`  
- [x] 状态 / 所在位置 / 主线进度.当前阶段  
- [x] `当前灵异事件.{事件代号,危害等级,发生地点,鬼域状态,处理状态}`  
- [x] 驾驭厉鬼列表、在场人物、行动 A–D 仍可用  
- [x] **未**引入生命/饱食/理智等新 MVU 字段  

## D. 交互契约

- [x] 行动按钮只写入 `#send_textarea`，无 `generate()`  
- [x] 用户消息不注入（`is_user` / cleanup 用户楼）  
- [x] 历史楼 brand paused / 非 last 无刷屏动效（CSS 仍在）  
- [x] `prefers-reduced-motion: reduce` 覆盖 message/theme/fixed/visualizer  
- [x] Tab / 行动触控目标 ≥ 44px 标记存在  

## E. 数据库前端功能

- [x] 14 表 / 召回 / 一致性 / 抽卡 API 表面门禁通过（`verify-mfrs-database-frontend-p3`）  
- [x] 档案柜导航 / fixed 10·20 门禁通过  
- [x] `MysteryDatabaseFrontend` API 仍挂载  
- [x] aurora 默认 + 卷宗 token 与消息区一致（`#3d6b66`/`#6b2a26`/`#c8c0ae`）  

## F. 构建与验证脚本

- [x] `pnpm build` 通过  
- [x] `verify-mfrs-archive-ui-regressions --stage phase5` PASS (186)  
- [x] `verify-mfrs-mvu-hotfix-regressions` PASS  
- [x] `verify-mfrs-database-frontend-p3` PASS  
- [x] `verify-mfrs-release-png` self-test + 发布版 8.10.0/`a37fe0b`/cache 通过  
- [ ] 发版时 CDN 指针与 cache 版本已更新且可访问 — **延期**，需用户批准 8.11.0 / `publish-card`  

## G. 方案验收（第三版 §11）

- [x] 无鬼眼、无法阵、无「鬼眼封案」主视觉（源码+门禁）  
- [x] 桌面三栏壳 `mfrs-msg-tri` 已实现  
- [x] 顶条 / 拟办意见 / 风险死亡·复苏语义保留  
- [x] 档案柜与消息区同一线框语言（token 对齐）  
- [x] 历史无刷屏；RM 钩子在  
- [x] 契约零改动（黑名单 src 无 diff）  
- [x] 固定前端挂载/槽位源码未破坏  
- [ ] ST 实机全视口截图验收 — **待**本地 dist 或 8.11.0 发版后补 EVIDENCE  

---

## 基线实测摘录（Phase0，改造前）

| 项 | 结果 |
|----|------|
| host + 10/20 | PASS |
| 用户消息无 mfrs | PASS |
| 历史 brand paused / 最新 running | PASS |
| 44px tab/action | PASS |
| 仍有眼/阵/鬼眼封案 | **预期（P1 前）** |
| 无三栏壳 | **预期（P2 前）** |
