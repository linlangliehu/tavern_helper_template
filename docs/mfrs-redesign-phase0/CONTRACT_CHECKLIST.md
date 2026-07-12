# 契约回归清单（α 基线 + β 专节）

每个 Phase 结束、发版前必须全勾。  
**α 已发布基线**：8.11.0 / `12a05b5…` / cache `…-v8110-archive-hud`（历史 Phase4 曾记 8.10.0/a37fe0b）。  
**β 目标**：全屏壳 + 本地 dist 验收 →（批准后）8.12.0。  
**β0 冻结**：2026-07-12 · D1 / C1 / 本地 dist 优先。

---

## A. 黑名单零 diff

- [x] `世界书/**` 无改动（α 发版时）  
- [x] `世界书/变量/**`、变量结构脚本无改动  
- [x] `数据库/**` SQL JSON 无改动  
- [x] `table-change-adapter` 业务逻辑无改动  
- [x] `index.yaml` → `正则:` 段无改动（**33** 条）  
- [x] `index.yaml` → `脚本库:` 顺序/启用/名称不变（**8** 项）  
- [x] `hotfix-generation-ended-listeners` **源码**协议逻辑无改动  
- [x] `mvu` / MagVarUpdate 入口无改动  
- [ ] **β 每阶段结束重勾**：黑名单 `git diff --name-only` 仍为空  

> 白名单见 `WHITELIST.md`：消息内面板（α+β）/ 界面美化 / 固定状态栏（视觉）/ visualizer CSS / archive-ui 门禁 / docs / 对应 dist；发版仅 P5。

---

## B. 挂载与槽位（固定 host · 继承）

- [x] `#mfrs-fixed-status-host` 仍 `insertBefore(#send_form|#form_sheld)`  
- [x] `#mfrs-fixed-dashboard-slot` **order 10**  
- [x] `#mfrs-fixed-frontend-slot` **order 20**  
- [x] dashboard 收 `.acu-embedded-dashboard-container`  
- [x] frontend 收 `.acu-wrapper`  
- [x] 仅卡名/头像 ∈ {神秘复苏模拟器, 神秘复苏模拟器发布版} 时挂载  
- [x] 切卡清理钩子：`__mfrsFixedStatusCleanup__` / `__mfrsDatabaseFrontendCleanup__`  
- [ ] **β**：全屏 ON 时 host **不 remove**，仅视觉隐藏或归「柜」层  

---

## C. 数据只读映射（字段路径不增删）

- [x] 死亡风险 ← `风险值`  
- [x] 复苏风险 ← `驭鬼者状态.总复苏风险` / `厉鬼复苏程度`  
- [x] 状态 / 所在位置 / 主线进度.当前阶段  
- [x] `当前灵异事件.{事件代号,危害等级,发生地点,鬼域状态,处理状态}`  
- [x] 驾驭厉鬼列表、在场人物、行动 A–D 仍可用  
- [x] **未**引入生命/饱食/理智等新 MVU 字段  
- [ ] **β**：顶/左/拟办仍只读同源路径；资源只读展开不写 MVU  

---

## D. 交互契约

- [x] 行动/拟办只写入 `#send_textarea`，无 `generate()`  
- [x] 用户消息不注入（`is_user` / cleanup 用户楼）  
- [x] 历史楼 brand paused / 非 last 无刷屏动效  
- [x] `prefers-reduced-motion: reduce` 覆盖  
- [x] Tab / 行动触控目标 ≥ 44px  
- [ ] **β**：壳内发送可走 `#send_but`；**拟办不得**触发发送  
- [ ] **β**：禁止 2.5s 强制滚底（美化 2.0 反模式）  

---

## E. 数据库前端功能

- [x] 14 表 / 召回 / 一致性 / 抽卡 API 门禁  
- [x] 档案柜导航 / fixed 10·20 门禁  
- [x] `MysteryDatabaseFrontend` API 仍挂载  
- [x] aurora 默认 + 卷宗 token（`#3d6b66`/`#6b2a26`/`#c8c0ae`）  
- [ ] **β C1**：仅「柜」展开后 CRUD 仍可用  

---

## F. 构建与验证脚本

### α / 8.11.0（历史）

- [x] `pnpm build`  
- [x] `verify-mfrs-archive-ui-regressions --stage phase5`  
- [x] `verify-mfrs-mvu-hotfix-regressions`  
- [x] `verify-mfrs-database-frontend-p3`  
- [x] `verify-mfrs-release-png` → **8.11.0** / `12a05b5` / v8110 cache / regex=33 / scripts=8  

### β（待实现后勾）

- [ ] archive-ui 扩展：`#mfrs-hud-shell`、restore、卡过滤、无 generate  
- [ ] mvu-hotfix / frontend-p3 / build 全绿  
- [ ] 本地 dist 手测 14 项（见 `TASKLIST_BETA.md` §4B）  
- [ ] EVIDENCE 全屏/退出/柜开截图  
- [ ] **8.12.0** CDN/cache — **仅用户批准后**  

---

## G. 方案验收 · α（第三版 / 8.11）

- [x] 无鬼眼、无法阵、无「鬼眼封案」主视觉  
- [x] 桌面三栏壳 `mfrs-msg-tri`  
- [x] 顶条 / 拟办 / 双风险语义  
- [x] 档案柜与消息区 token 对齐  
- [x] 历史无刷屏；RM 钩子  
- [x] 黑名单 src 无 diff（发版时）  
- [x] 固定前端挂载/槽位未破坏  

---

## H. 路径 β 专节（第四版 · β0 起必须跟）

### H1 壳与生命周期

- [x] 存在 `#mfrs-hud-shell`：`position:fixed; inset:0`；卷宗 token（源码+门禁）  
- [x] **D1**：`syncHudImmersiveWithCard` 卡激活自动 mount（源码）  
- [x] 壳内「退出沉浸」→ unmount（源码）  
- [x] mount 保存 `#chat` parent + nextSibling；unmount 还原（源码+门禁）  
- [x] activate/deactivate/cleanup/pagehide 路径 unmount/destroy（源码）  
- [ ] 非神秘复苏卡：无 shell 残留（**待本地 dist 手测**）  

### H2 与 α / host 共存

- [x] 全屏 ON：CSS 隐藏 α 左/右/brand（源码）  
- [ ] 全屏 OFF：α 8.11 行为可用（**待手测**）  
- [x] 全屏 ON：固定 host 不删、默认隐藏；柜 class 浮层（源码）  
- [x] **C1**：导航「柜」→ 浮层 + 遮罩/关闭/Esc；默认关（源码）  

### H3 交互与 z-index

- [x] 输入代理：壳 textarea ↔ `#send_textarea`（源码+门禁）  
- [x] 发送 → `#send_but`；拟办路径无 send（门禁）  
- [x] 用户楼无注入（α 契约继承）  
- [x] 壳 z 10000 / 柜 10020 / 遮罩层（源码）  
- [ ] **ACU 仍可点**（**待手测**）  
- [x] ≤800 侧抽屉 + 顶栏切换（源码）  
- [x] Esc 先关柜/抽屉（源码）  

### H4 本地 dist 验收闸门（发版前）

- [ ] `pnpm build` 产物可经 `http://127.0.0.1:5500/dist/神秘复苏模拟器/脚本/<模块>/index.js` 加载  
- [ ] 开发卡临时本地链 **未** 提交进发布版  
- [ ] `TASKLIST_BETA.md` §4B 手测 14 项通过  
- [ ] 用户明确批准后才执行 8.12.0 `publish-card`  

### H5 脚本库 / 正则硬约束

- [ ] 脚本库仍 **8** 项、顺序与名称不变、**无**第 9 项  
- [ ] 正则仍 **33** 条  
- [ ] 不新增 content 替换类途尽正则  

---

## 基线实测摘录（Phase0 α 改造前 · 历史）

| 项 | 结果 |
|----|------|
| host + 10/20 | PASS |
| 用户消息无 mfrs | PASS |
| 历史 brand paused / 最新 running | PASS |
| 44px tab/action | PASS |
| 仍有眼/阵/鬼眼封案 | 预期（P1 前）→ 8.11 已消除 |
| 无三栏壳 | 预期（P2 前）→ 8.11 已有 α |

---

## β0 出口（本阶段）

- [x] `DECISION.md`：D1 / C1 / 本地 dist / β 主路径  
- [x] `WHITELIST.md`：β 允许项与纪律  
- [x] 本文 H 节：β 契约勾选骨架  
- [x] 本地 URL 模板已写死  
- [x] **确认** 不改 `index.yaml` 脚本库/正则、不新增脚本项（实现期纪律）  

**下一阶段**：`TASKLIST_BETA.md` Phase β1（壳 + reparent）。  
