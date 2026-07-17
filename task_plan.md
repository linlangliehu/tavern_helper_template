# 任务计划：神秘复苏模拟器 · 审计缺陷修复

## 目标
BF0–BF6、Phase 5、8.13.29、8.13.31 与 **8.13.36** 发布均已完成。沉浸 HUD 中栏工作区已交付档案预览、记忆 CRUD、抽卡嵌入与记忆删除安全链（release `0726289`；CDN_REF `9c5a467a3481…`；cache `v81336_20260716_01`；tag `v8.13.36` → bot bundle `296c14cd`）。

下一阶段已规划三项 HUD 交互调整：抽卡键直达中栏完整系统、移除左栏玩家状态全库入口、增加默认/沉浸双向可见切换。详细计划见 `docs/mfrs-redesign-phase0/PLAN_HUD_UX_NEXT.md`；T0–T5 已完成，下一项为 T6 Chrome DevTools 真页验收。

## 当前阶段
**阶段 A：审计与清单入库 — complete**  
**阶段 A2：全量再审计差分（7 轨盲审）— complete（2026-07-13）**  
**阶段 BF-1（C7 重发版）— complete（8.13.14 @ d5cd98f / de29b4a）**  
**阶段 BF0 — complete（8.13.15）**  
**阶段 BF0.5 — complete**  
**阶段 BF1 — complete（8.13.17：C3/C4/H9/L1）**  
**阶段 BF2 — complete（8.13.18）**  
**阶段 BF3 — complete（8.13.19）**  
**阶段 BF4 — complete（8.13.20）**  
**阶段 BF5 — complete（门禁 G2–G5 + DM8；部分残余）**  
**阶段 BF5.5：8.13.21 上线后只读审查 — complete（双路复核通过，`84df0b5` 已 push）**  
**Phase 5 已完成 — 审计 backlog 已全部修复、关单或明确归档；8.13.22 已发布（`v8.13.22` → `e568cce`）**
**8.13.29 已发布 — 沉浸式按键审查修复已进入角色卡（release `410454b`；CDN dist `95981c9`）**
**8.13.31 已发布 — MAINT-29 黄金储备 + drawer watcher（release `4c94a4e`；CDN_REF `8ee8c58`；tag `v8.13.31`）**
**阶段 HUD-CENTER-RELEASE：沉浸 HUD 中栏改造发版 — complete（8.13.36）**
**阶段 WORKSPACE-CLEANUP：主工作树本地文件归档与清理 — complete（2026-07-17）**
**阶段 HUD-UX-NEXT-PLAN：抽卡完整面板、左栏精简与模式切换规划 — complete（2026-07-17）**
**阶段 HUD-UX-NEXT：三项交互调整实施 — in_progress（T0–T5 complete；T6 pending）**

## 五问重启（新对话先读）

| 问题 | 答案 |
|------|------|
| 我在哪里？ | 8.13.36 已发布；HUD 三项交互调整的 T0–T5 已完成，源码、自动化契约和源码提交检查点均已通过 |
| 我要去哪里？ | 在 `worktree-feat-hud-gacha-mode-toggle` 从 T6.1 开始 Chrome DevTools 桌面/390px 真页与生命周期验收，再按 Phase 6 完成 production 和发布 |
| 目标是什么？ | 抽卡键直达中栏完整系统、移除左栏玩家状态全库入口、增加默认/沉浸双向切换 |
| 我学到了什么？ | 大型 JavaScript 中的 HTML/CSS template 会被 `better-tailwindcss` 全文件 lint 误判；应将插件模板误报与普通 ESLint 规则分开核对，并与 `origin/main` 基线对照，不能把误报当成新增源码缺陷 |
| 我做了什么？ | 完成 T0–T5：单源 renderer/embedded API、右侧抽卡直达稳定 host、完整句柄清理、左栏指定入口删除、双向模式按钮、H7–H11/I1–I5 门禁，以及源码/提交链/静态检查三重检查点 |

## 硬约束（勿破）

- 脚本库 **8 项**名称/顺序/启用不改；C5 只改 URL/实现指向
- 正则数量门禁约 **33**；改 id/启用需同步 `verify-mfrs-release-png`
- **禁止**手改发布版 PNG；只走 `pnpm publish-card`
- 拟办/选项：**只填不自动发送**
- 契约真源顺序：`schema.ts` → 变量输出格式 → 系统提示词 → 对话示例 → 脚本解析
- 开发源 `index.yaml` CDN 仍可能 pin 旧 hash；发布以 `publish-card.mjs` 的 `CDN_REF` 为准

## 当前基线

| 项 | 值 |
|----|-----|
| 发布内容版本 | **8.13.36**（release `0726289`；CDN_REF `9c5a467a3481…`；cache `v81336_20260716_01`；tag `v8.13.36` → `296c14cd`） |
| 仓库运行时基线 | **`296c14cd`**（8.13.36 发布后的 bot bundle） |
| 实施基线 | `origin/main@75f4a9a`；worktree `D:\project\tavern_helper_template\.claude\worktrees\feat-hud-gacha-mode-toggle`；分支 `worktree-feat-hud-gacha-mode-toggle` |
| 工作树状态 | 实施 worktree 已完成 T0–T5；`75f4a9a..5dacd2e` 功能提交链白名单精确，一行 archive-ui lint 清理随 T5 规划同步，不含 dist/PNG/版本/package/lockfile；主工作树的 10 个 watch dev dist 未触碰 |
| 下一阶段 | **HUD-UX-NEXT T0–T5 complete；T6 pending，下一项 T6.1** |

## 各阶段

### 阶段 A：审计与清单 — **complete**
- [x] 一轮：脚本 / MVU / EJS / 系统提示词
- [x] 二轮：正则 33 / SQL·14 表 / 开局欢迎 / 世界书规则·锚点
- [x] 写入 `AUDIT_BUGFIX_BACKLOG.md`（C/H/M/L + R/D/S/W）
- [x] 总览索引、合并关单、README 挂链
- **状态：** complete

### 阶段 A2：全量再审计差分 — **complete（2026-07-13）**
- [x] 7 轨盲审（脚本/MVU/正则/SQL/世界书/开局/漂移门禁），115 项原始发现
- [x] 逐条比对 backlog：已覆盖 ~70 / 新增 32 / 误报修正 4 / 升级 10
- [x] 入库：backlog「三轮 A2」区（C7/H10/RH6/SH6/M11 + M/L + G1–G5 门禁）
- [x] 关键修正：C4 降级、C5 误报关闭、M6→High、W1 休眠标注、#31 移出"勿重开"
- **状态：** complete

### 阶段 BF-1：C7 发布未交付修复 — **complete（2026-07-13）**
- [x] **C7** production rebuild → 提交 dist（`d5cd98f`）→ publish-card pin → **8.13.14**（`de29b4a`）
- [x] **G1** `verify-mfrs-dist-freshness.mjs` + publish-card 前置调用
- 隔离 worktree：`D:\project\tavern_helper_template-bf1` / `codex/bf1-recovery`
- 验收：release-png version=8.13.14 refs=7 cache=8 regex=33 scripts=8；G1 通过
- **已合 main：** `origin/main` fast-forward 至 `de29b4a`（2026-07-13）
- **状态：** complete

### 阶段 B / BF0：变量与行动建议真源 — **complete（源码）**
- [x] **C1** initvar 四键升根 + **L7** 未知→'' 哨兵
- [x] **C2** 扩 schema + regen `schema.json`
- [x] **M6** initvar 补齐 6 根键 + 主线进度 3 子键
- [x] **H1 + D1** 行动建议存活恰 4 条 / 死亡清空
- [x] **H3** 系统提示骨架对齐变量输出格式
- [x] **M11** 死亡链写集 + `模拟结束` 值域
- commit：`5eaa533`（未 push；未 publish；C1.3 打包卡/C2.4 可见摘要仍开）
- **状态：** complete

### 阶段 BF0.5：H10 App.vue 去留决策 — **complete（方案 B）**
- [x] 决策：镜像迁入数据库前端 `mvu-core-mirror.ts`；不恢复 App.vue iframe
- [x] D3 字段路径在新镜像中修正；App.vue 标孤儿注释
- **状态：** complete

### 阶段 C / BF1：加载与打包 — **complete（8.13.17）**
- [x] **C3** 源 index.yaml CDN = publish-card 同一 ref/cache
- [x] **C4** loader `?`/`&t=` 修复
- [x] ~~C5~~ 误报关闭；stub 目录已在 BF4 加废弃头注释
- [x] **H9** 旧打包 JSON 废弃+警示（不复活）
- [x] **L1** MagVar `@0.171.0` + mvu_zod `@0.3.446`
- **状态：** complete

### 阶段 D / BF2：协议解析 + 正则误删 + 发送 — **complete（源码）**
- [x] **C6** 状态栏/消息面板读 `extra._mfrs_raw_protocol_message` + saveChat 持久化 raw
- [x] **H4–H8** hotfix 单例、条件解锁发送、空生成判定、choices 解析、seed 扩全
- [x] **R1–R3** 英文误删、【选项】吞文、未闭合 thinking
- [x] **RH2** 正则 id 冲突：思维链换新 UUID `e8f1…`
- [x] **RH6** 掷骰条复活：hotfix 白名单放行 mfrs_roll
- [x] **RM3–RM6** 贪婪 update 吞文、无 g 标志、#9 扩 sp_/mfrs_、【警告】卷段
- **状态：** complete（8.13.18 @ `dc27b52`）

### 阶段 E / BF3：DB 镜像 + 开局 — **complete（源码）**
- [x] **D2** 处理状态 `未接触→未处理`（adapter/App；mirror 已有）；**D3** 已在 BF0.5
- [x] **DH1/DH3/DH4/DH5 + DM7**；**DH2** 人物列契约仍开（可挂 BF4）
- [x] **S1 + SH1–SH4 + SH6**；**SH5** 欢迎页已禁用，分叉清理可挂后
- **状态：** complete（8.13.19 @ `5b10525`）

### 阶段 F / BF4：世界书与清理 — **complete（8.13.20）**
- [x] **W1+M3** 伪路径根治（休眠锚点+规范）
- [x] **W2–W4+M4** 蓝灯子集/短索引/死亡裁定真源；事件MVU 去 UpdateVariable 自锁
- [x] **WM3–WM8** mfrs_roll 例外、孤儿头、八音盒、恐怖等级最小点名
- [x] **M1/M2/L6/RH1/DH2/SH5/C5** 余项
- [x] production dist + publish **8.13.20**（CDN `de42f2c`）
- **状态：** complete（8.13.20）

### 阶段 G / BF5：回归与发版 — **complete（门禁）**
- [x] `verify-mfrs-mvu-hotfix-regressions` / `verify-output-cleaning` / `verify-table-change-adapter`
- [x] **G2** `scripts/verify-mfrs-initvar-schema.mjs`
- [x] **G3** `scripts/verify-mfrs-regex-ids.mjs`
- [x] **G4** `scripts/mfrs-release-constants.mjs` + release-png `--from-publish-card`
- [x] **G5** cleaning 扩样例；**DM8** adapter 三表 + 禁删/混合拒绝/真模板 chronicle
- [x] 快修：**WM1/WM2/L8**
- [x] `pnpm verify:mfrs-gates` 聚合
- 历史残余 H2、M5/M7–M10、RH3–5、RM1–2/RM7–9、DM1–6/DM9、DL*、SM* 等已在 BF6 与 Phase 5 完成、关单或归档
- **状态：** complete（门禁）；发版见 progress

### 阶段 BF5.5：8.13.21 上线后只读审查 — **complete**
- [x] A git：behind 1 bot bundle（已 FF）；dev PNG 哈希=origin/main（非手改）；无未提交业务码
- [x] B 变更/硬约束：范围 `d2f8ae7..077b0b2`；4 条硬约束全未破坏；index.yaml 8 项仅 pin 更新；正则 33 未动
- [x] C 门禁：`verify:mfrs-gates` 6/6 PASS（release-png version=8.13.21 refs=7 cache=8 regex=33 scripts=8）
- [x] 结论入库 backlog「BF5 上线后审查」区 + progress；提交 push `84df0b5`
- **状态：** complete

### 阶段 BF6：正则/清洗残余 + 发布链加固 — **complete（8.13.22）**

**批 β · 正则/清洗残余（与 G3 同域，风险低）**
- [x] **RM7** #14/#15（JSONPatch/draft/pacing/修改确认）补 prompt 去除 + hotfix 清洗，止残渣回传 AI
- [x] **RM8** #10/#11 ↔ hotfix L491/493 逐字清单同步（防 RH6 式不同步）；注释互指 — **done（BF6 低风险子集）**：G3 加白名单同步断言（display⊆hotfix 不变式）+ hotfix 互指注释；负向测试验证漂移→fail
- [x] **RM9** #3/#4 `$` 兜底截断时勿删到消息尾 — **done（commit `4ffc47f`，实机验证）**
- [x] **RH3** hotfix `recoverRecentRawProtocolMessages` 补调 `cleanProtocolBlocks`（导入旧档漏洗）— **done（实机验证）**
- [x] **RH4** #25 sp 标签列表 ↔ #11 广义 `(sp|mfrs)_` 对齐 — **done**（并入 RM8 的 G3 断言）
- [x] **RH5** 收窄 #20–22 Name/Status/Location 英行改写：仅闭合 `<sp_status>` 内中文化，标签外正文不改 — **done（`baf44da`）**
- [x] **RM1** 裸 choices/JSONPatch 锚加入 CJK 正文边界 — **done（`4ffc47f`）**
- [x] **RM2** 关键词高亮勿改写 `【本轮摘要】` 内字段 — **done（`4ffc47f`）**

**批 δ · 发布链流程加固（本次审查产出）**
- [x] **P1** publish-card build 后加 `verify-mfrs-release-png --from-publish-card` 硬门禁（与 G1 同级 die-on-fail）— **done**：`verifyReleasePng(card)` 每卡 bundle 后调用；错 ref→exit1→die；dry-run 验证跳过；聚合门禁 6/6 绿
- [x] **P0** `verify:mfrs-dist-freshness` script 补默认 `--ref` 或标注为发布守卫（非独立门禁）— **done**：加 `--no-build` 只读模式 + `--ref` 默认 CDN_REF；副产揭示 HEAD dist≠pin（webpack module-id，功能等价，Low）
- [x] **P2** 可选：release-png 额外校验 CDN_REF == HEAD 实际 commit — **done**：改软警告（不 fail），避免误伤"pin 后又 bot bundle"正常态
- [x] **P3** initvar-schema 校验解引用 `$defs` 再收集键（防将来 `$ref` 假阴）— **done**：加 `resolveRef`；当前 $defs 均标量，前瞻防御无行为变化

**硬约束（本批必守）**
- 正则总数仍须=33（RM/RH 只改现有 id 的表达式/启用，不增删条目；改后同步 `verify:mfrs-regex-ids` + `verify:mfrs-release-png`）
- 脚本库 8 项名称/顺序/启用不动
- 清洗改动必过 `verify-output-cleaning-regressions`（G5）+ hotfix 回归
- 发版只走 `pnpm publish-card`；禁手改 PNG

**回归门槛（已完成）**：`pnpm verify:mfrs-gates` 全绿 → production build → publish 8.13.22
- **状态：** complete；production dist=`158dcc29107f`，发布提交=`e568cce`，tag=`v8.13.22`

**8.13.22 发布清单 — complete**
- [x] `CDN_REF=158dcc29107fe17db1a89b8ca6e92585c2acbe8b`（已 push，`origin/main` 可达）
- [x] cache=`v81322_20260714_01`，版本=`8.13.22`
- [x] 开发/发布 YAML：7 refs / 8 markers；33 regex / 8 scripts 结构保持
- [x] `RELEASE_8.13.22.md` 与 README/backlog/planning 记录完成
- [x] 独立门禁及发布后聚合门禁通过
- [x] publish-card 生成发布版 YAML/PNG
- [x] release commit/push/tag 与最终验收（`e568cce` / `v8.13.22`）

**H2 后续处理**：Phase 5 已完成四套风险语义文档化；live 路径无需为此另开 8.13.23 重构。


### 阶段 MAINT-29：8.13.29 发布后维护 — **complete（8.13.31 已发布）**

- [x] **MAINT-29-01**：`buildHudResourceSectionsHtml()` 优先读取 schema 正式字段 `灵异资源.黄金储备`，保留 `黄金/鬼钱/顶层黄金` 旧存档 alias。
- [x] **MAINT-29-02**：统一已知 drawer selector；overlay watcher 改为 epoch + timer ownership + opening grace + stable-close debounce；自动恢复只做非破坏性 release，显式关闭仍保留主动关闭语义。
- [x] drawer trigger 同时支持 `.drawer-toggle` 自身、祖先和子元素，覆盖 8 个设置入口的实际 DOM 形态。
- [x] `verify:mfrs-archive-ui` 独立门禁新增，phase5 共 **212 checks**；接入 `verify:mfrs-gates` 后聚合 **7/7 PASS**。
- [x] production `pnpm build` 完成；目标 dist 已更新。
- [x] SillyTavern 真机：8 个 drawer 均保持 >2.5s；快速切换 last-action-wins；原生关闭后 HUD 自动非破坏性释放；“关闭面板”主动关闭正常；黄金显示无 `[object Object]`。
- [x] commit / push / publish / tag — **8.13.31 已发布（release `4c94a4e`；tag `v8.13.31`）**。
- **状态：** complete（8.13.31 已发布）

### 阶段 HUD-CENTER-RELEASE：沉浸 HUD 中栏改造发版 — **complete（8.13.36 已发布）**

- [x] Task #1–#5 源码与真页验收完成；功能提交 `7155b09`、`a8244ae`、`116612e` 已推送功能分支。
- [x] 发布前聚合门禁与数据库前端专项门禁通过；worktree 干净。
- [x] 核对现有 `v8.13.32`–`v8.13.35` 标签与 autotag 约定；新内容版本确定为 **8.13.36**。
- [x] production build 并提交推送目标 dist；远端可达 `CDN_REF=9c5a467a34818ed4a4bd758e3ce6b76f160a1d3f`，G1 重构建一致。
- [x] 更新 release constants、开发版 YAML pin/cache 与发布记录；已通过 `pnpm publish-card` 生成发布版 YAML/PNG。
- [x] 验证版本、cache、33 条正则、8 项脚本、角色卡数据结构与 PNG chara/ccv3 一致性。
- [x] 验证 7 个实际 CDN URL 均 HTTP 200，且内容 SHA256 与 `CDN_REF` 对应 dist 一致。
- [x] 提交并推送发布物：release `0726289` 已进入 `main`；自动 bundle `296c14cd` 已生成并成为 `origin/main`。
- [x] 创建并核对 release tag：`v8.13.36` → `296c14cd`；发布 PNG、7 个 CDN URL 与最终导入路径均已验收。
- **状态：** complete（8.13.36 已发布；CDN_REF `9c5a467a3481…`）

### 阶段 WORKSPACE-CLEANUP：主工作树本地文件归档与清理 — **complete（2026-07-17）**

- [x] 确认 watch 已停止、`HEAD == origin/main`，且源码目录无未提交修改。
- [x] 对 46 个未跟踪本地文件做源/目标路径、数量与 SHA-256 预检。
- [x] 迁移至 `D:\project-local-assets\tavern_helper_template` 并逐文件校验哈希。
- [x] 为这些本地资产写入 `.git/info/exclude`，防止以后误放回仓库时污染状态。
- [x] 精确恢复 10 个 dev/watch dist 文件，不改业务源码。
- [x] 提交并推送 `planning_archive_2026-07/EXECUTION_PLAN_2026-07-14-81322-era.md` 与规划记录，提交信息带 `[skip ci]`。
- [x] 验证主工作树 clean、`v8.13.36` 不变、无 `v8.13.37`，功能 worktree 保持 clean。
- **状态：** complete

### 阶段 HUD-UX-NEXT-PLAN：抽卡完整面板、左栏精简与模式切换规划 — **complete（2026-07-17）**

- [x] Phase 0：核对抽卡完整面板、左栏玩家状态入口和默认/沉浸模式的真实调用链与允许 API。
- [x] 设计右侧“抽卡”直接在中栏呈现完整系统面板的复用边界，替换现有部分面板契约。
- [x] 明确只移除左栏“打开全库 · 玩家状态”入口，不删除玩家状态数据或全库能力。
- [x] 设计默认模式 ↔ 沉浸式模式的可见切换按钮、状态语义、持久化与退出路径。
- [x] 列出静态门禁、production build 与 Chrome DevTools 真页验收清单。
- [x] 详细计划：`docs/mfrs-redesign-phase0/PLAN_HUD_UX_NEXT.md`。
- [x] 可执行任务清单：`docs/mfrs-redesign-phase0/TASKLIST_HUD_UX_NEXT.md`（T0–T7，共 44 项）。
- **状态：** complete（本轮只规划，业务源码未改）

### 阶段 HUD-UX-NEXT：三项交互调整实施 — **in_progress（T0–T5 complete；T6 pending）**

- [x] Phase 1：数据库前端完整抽卡面板增加单源 embedded mount API，并保留 overlay 兼容入口。
- [x] Phase 2：右侧抽卡键直接挂载完整面板，移除简版状态、事件与 CSS。
- [x] Phase 3：移除左栏玩家状态全库按钮，增加默认/沉浸双向可见切换。
- [x] Phase 4：同步 archive-ui 与 database frontend 门禁。
- [x] 源码提交检查点：审查单源/所有权/状态唯一性，运行静态与聚合门禁，并核对既有提交链白名单。
- [ ] Phase 5：Chrome DevTools 桌面/390px 真页及生命周期验收。
- [ ] Phase 6：production build、精确提交、publish-card、CDN/tag 验收。
- **T1 审查：** 3 个 Medium 已全部关闭：宿主使用可信 document identity + 可信 realm `Element` + 原生 `Node.prototype.nodeType` getter 做品牌校验；异步 continuation 全部检查 current owner；商店/详情/编辑器使用所属文档、幂等 handle 与父实例统一回收。两份 JS `node --check`、frontend（21 项动态生命周期检查）、archive-ui（232 checks）及 `git diff --check` 均通过；独立反模式与代码质量复核均 APPROVE、无 High/Medium。
- **T2 审查：** gacha slot 改为稳定 host，`hudGachaPanelHandle` 持有唯一实例；可信 realm/root 品牌校验、失败 API identity latch、普通 refresh 保留、设置/全库/切视图/unmount/deactivate/hot reload/pagehide 清理均已覆盖，旧简版 marker 为 0。frontend 21 项动态检查、目标语法检查和 `git diff --check` 通过；双路复核无 High/Medium。
- **T3 审查：** `buildHudDossierHtml()` 只删除“打开全库 · 玩家状态”；默认最新 AI 三栏的 7 键导航保持独立，其下新增展开图标 + “沉浸模式”，复用唯一 `hudImmersivePreferred`、`toggleHudImmersive()` 与快捷键。沉浸顶栏旧 shell 可幂等迁移为收起图标 + “默认模式”；进入/退出双向聚焦、mode 刷新恢复、非 latest 历史楼隐藏、60px 桌面/≤900px 右轨和 ≤640px 整行布局均完成。`git diff --check` 与双路代码质量复核通过，无 High/Medium。
- **T4 审查：** archive-ui 旧 H7–H11 已替换为完整面板 host/mount/destroy、重试、刷新保留、清理和旧 marker 缺席契约；新增 I1–I5 覆盖 `buildHudDossierHtml()` 范围内的左栏精简，以及默认/沉浸双向按钮、单一 preference、快捷键、焦点和响应式布局。门禁使用 TypeScript AST 精确定位函数/分支/调用/赋值，从 AST 提取 CSS template 并按最终声明验证，同时屏蔽 HTML comments、限定静态字符串拼接。frontend 21 项动态检查、archive-ui 237 checks、聚合门禁、`node --check` 与 `git diff --check` 全部通过；独立反模式与质量复核均 APPROVE，仅既有 CDN_REF warning。
- **T5 审查：** overlay/embedded 单源、抽卡句柄所有权和唯一 `hudImmersivePreferred` 状态真源均通过审查；`git diff --check`、4 份目标 JS `node --check`、`index.ts` TypeScript transpile、frontend 21 项、archive-ui 237 checks、聚合门禁全部 PASS，archive-ui ESLint errors 为 0。v10 全文件 `better-tailwindcss` 会误扫 JavaScript template 内的非 Tailwind HTML/CSS；排除该已知插件误报后，非 Tailwind 规则与 `origin/main` 基线一致。`75f4a9a..5dacd2e` 提交链白名单精确，不含 dist/PNG/版本/package/lockfile，功能提交已推送且无需重复提交；独立 verification、反模式与质量复核均 APPROVE。
- **状态：** in_progress（T0–T5 complete；T6 pending；28/44 complete，16 pending）

## 合并关单

| 主项 | 并关 |
|------|------|
| W1 | M3 |
| W4 | M4 |
| RH1 | L2 |
| H1 | D1（策略） |
| H9 | DL3 |
| C2 | 示例/SQL 扩展字段侧 |

## 已做决策

| 决策 | 理由 |
|------|------|
| 先审计入库再改代码 | 用户要求先审再修 |
| 缺陷总表 = AUDIT_BUGFIX_BACKLOG | 单真源待修列表 |
| 修契约以 schema 为落库真源 | 避免 Zod strip |
| 发布只走 publish-card | 禁手改 PNG |
| 文案质量/全文润色不在本轮 | 只修功能路径 bug |

## 当前任务状态

1. **8.13.36 已发布**：沉浸 HUD 中栏工作区已进入角色卡（release `0726289`，CDN_REF `9c5a467a3481`，tag `v8.13.36`）。
2. **HUD-UX-NEXT 已完成 T0–T5，T6 pending**：完整抽卡面板现由单一 renderer 同时服务 overlay 与 embedded；右侧抽卡键直接挂载中栏完整系统；左栏指定玩家状态全库入口已删除，默认最新 AI 三栏与沉浸顶栏已形成双向可见模式切换和焦点交接；archive-ui H7–H11/I1–I5 已同步为新契约，frontend 21 项、archive-ui 237 checks 与聚合门禁全绿；源码、静态检查和 `75f4a9a..5dacd2e` 提交链白名单均已完成检查。下一项为 T6.1 真页验收，Phase 5–6 见 `PLAN_HUD_UX_NEXT.md`。
3. 后续实施使用 `D:\project\tavern_helper_template\.claude\worktrees\feat-hud-gacha-mode-toggle` / `worktree-feat-hud-gacha-mode-toggle`，基线为 `origin/main@75f4a9a`；不使用旧 `feat-immersive-center-workspaces`。
4. 用户原有 watch 仍在运行（webpack watch PID `21824`），非本任务启动且不阻塞 T3 源码阶段；主工作树的 10 个 dist 修改是其产物，T7 前由用户停止 watch。

## 遇到的错误

| 错误 | 尝试 | 解决方案 |
|------|------|----------|
| PowerShell 向 Node stdin 传递 JS 时把中文属性名 `版本` 转为 `??` | 1 次 here-string，Node 语法阶段失败 | JS 源保持 ASCII，使用 `data['\\u7248\\u672c']` 访问 YAML 中文键 |
| YAML 静态预检的 `node -e` 被 PowerShell 解析正则中的 `&` | 1 次内联双引号命令，脚本未执行 | 改用 PowerShell here-string 经 stdin 传给 Node，避免 shell 解析 JS 正则 |
| 发版恢复时组合查询 package/tag 历史超时 | 1 次并行组合命令，14 秒超时 | 拆成小范围 `package.json` 当前值与目标提交查询，不重复全历史扫描 |
| 规划同步首次 SHA-256 比较使用 PowerShell 泛型静态方法语法失败 | 1 次，未修改文件 | 改为分别计算 `Get-FileHash` 后比较字符串；三文件根目录/worktree 哈希一致 |
| planning-with-files `check-complete.ps1` 无法识别本项目中文阶段格式 | 1 次，返回 `0/0 phases` | 不采信该结果；改用 HUD 阶段未勾选项/`in_progress` 定向扫描与 `git diff --check` 验收 |
| 主会话组合执行多条 `rg`，其中无匹配查询按约定返回 exit 1，导致整组只读命令被误判失败 | 1 次；仅查询，未修改文件 | 拆分需要允许“无匹配”的查询并单独解释 exit 1，不把它当作源码失败 |
| 审查代理在 PowerShell 命令文本中使用反引号，触发 PowerShell 解析失败 | 1 次；命令未成功执行，未修改文件 | 改用无反引号的字面量/独立命令读取源码，后续校验正常完成 |
| 单文件暂存白名单检查把 PowerShell 标量字符串按字符索引，误报文件不匹配 | 1 次，未 commit/push | 用 `@(git diff --cached --name-only)` 强制数组后检查完整文件名 |
| 迁移预检脚本中的 PowerShell 制表符转义与工具层 JavaScript 模板字符串冲突 | 1 次，脚本未执行且未修改文件 | 移除反引号转义，改用普通分隔文本后重跑只读预检 |
| Windows PowerShell 旧版 .NET 不支持 `Convert.ToHexString` | 1 次，预检在汇总哈希显示阶段停止，未修改文件 | 改用兼容的 `BitConverter.ToString(...).Replace('-', '')` |
| 迁移命令的源路径复核表达式缺少右括号 | 1 次，PowerShell 解析阶段停止，未执行迁移 | 修正括号并从完整源/目标预检重新执行 |
| 历史执行计划有 3 处 Markdown 行尾双空格，`git diff --cached --check` 报错 | 1 次，未提交 | 移除不承载内容的行尾空格，重新暂存并复检 |
| HUD-UX 文档发现的 3 个并行子任务被 CC Switch 本地代理返回 HTTP 503/429 | 连续 3 次，未修改文件 | 停止重复失败；主会话完成全部定向源码、文档与门禁读取并交叉核对 |
| 规划收尾的全文件行尾扫描命中 `task_plan.md` 既有 Markdown 双空格硬换行 | 1 次；`git diff --check` 已通过 | 不改历史格式；改为检查本轮 diff 与新计划文件自身 |
| HUD-UX 任务清单初稿统计写为 42 项，编号实数为 44 项 | 1 次，未进入实施 | 用编号正则复核后统一修正总数与待执行数为 44 |
| T3 主线程两次把带引号 selector 的 `rg` / 固定字符串组合交给 PowerShell，分别被解析为 `unclosed group` 或额外路径参数 | 2 次；均为只读查询，未修改文件 | 停止复用该组合，改用严格 UTF-8 读取后的 `Select-String` / 独立字面量检查 |
| T3 实现代理首次在 Node 内联命令中直接写中文路径，路径被代码页转换为 `?` | 1 次；命令未找到文件且未写入 | 改由 `git diff` 提供已解析路径，并使用 Unicode/宿主侧路径传递完成只读核对 |
| 发送可见但点不动 | 实机 CDP | 8.13.13 `forceRecoverSendUi`（仍属 H5 可优化） |
| 行动建议落不了库 | MagVar replace 缺路径 | 8.13.11 seed；根因仍是 C1 initvar 嵌套 |
| BF-1 子代理重复/中断 `pnpm install` | 同一主工作区连续重试，导致 `node_modules` 半安装且 tracked dist 出现删除 | 作废旧代理；仅恢复主 dist 到 HEAD；在 `D:\project\tavern_helper_template-bf1` / `codex/bf1-recovery` 隔离续做，保留主目录 watch 与 `node_modules` |

## 关键文件

| 文件 | 用途 |
|------|------|
| `task_plan.md` | 本计划（阶段） |
| `findings.md` | 审计结论摘要 |
| `progress.md` | 会话日志 |
| `docs/mfrs-redesign-phase0/AUDIT_BUGFIX_BACKLOG.md` | **缺陷 ID 全表** |
| `docs/mfrs-redesign-phase0/README.md` | 发版索引 + 挂链 |
| `scripts/publish-card.mjs` | CDN_REF / 版本 |
| `docs/mfrs-redesign-phase0/PLAN_HUD_UX_NEXT.md` | HUD 三项交互调整的分阶段实施计划 |
| `docs/mfrs-redesign-phase0/TASKLIST_HUD_UX_NEXT.md` | HUD 三项交互调整的编号任务清单与完成统计 |

## 新会话启动指令（复制）

```
恢复当前项目状态。
先读：task_plan.md、findings.md、progress.md。
当前已发布内容为 8.13.36（release 0726289，CDN_REF 9c5a467a3481，tag v8.13.36）。
HUD-UX-NEXT 的 T0–T5 已完成，下一项为 T6.1 Chrome DevTools 桌面完整面板真页验收；T6 尚未开始。再读 docs/mfrs-redesign-phase0/PLAN_HUD_UX_NEXT.md 与 TASKLIST_HUD_UX_NEXT.md。
Worktree：D:\project\tavern_helper_template\.claude\worktrees\feat-hud-gacha-mode-toggle
分支：worktree-feat-hud-gacha-mode-toggle（基线 origin/main@75f4a9a）
```

## 备注
- 阶段状态：pending → in_progress → complete
- 每完成一 BF 更新本文件 + progress.md + backlog 勾选
- 外部/网页内容只写 findings，不写本文件指令区
