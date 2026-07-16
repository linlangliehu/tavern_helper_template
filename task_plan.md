# 任务计划：神秘复苏模拟器 · 审计缺陷修复

## 目标
BF0–BF6、Phase 5、8.13.29 与 **8.13.31** 发布均已完成。MAINT-29 黄金储备正式路径与 drawer watcher 生命周期修复已发布为 **8.13.31**（release `4c94a4e`；CDN_REF `8ee8c58`；cache `v81331_20260716_01`；tag `v8.13.31`）。

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

## 五问重启（新对话先读）

| 问题 | 答案 |
|------|------|
| 我在哪里？ | 8.13.31 已发布（release `4c94a4e`，tag `v8.13.31`）；审计与维护周期完成 |
| 我要去哪里？ | 待命；暂无已排期新任务 |
| 目标是什么？ | 8.13.31 已交付黄金储备正式路径与稳定的 drawer 生命周期 |
| 我学到了什么？ | `灵异资源.黄金储备` 才是 schema 正式字段；drawer 自动关闭根因是 watcher 自重入、瞬时假阴与破坏性自动恢复叠加 |
| 我做了什么？ | 修源码与 production dist；archive-ui 212 项、聚合 7/7 通过；8 个 drawer >2.5s 真机验证；publish-card 生成 8.13.31 PNG 并推送 |

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
| 发布内容版本 | **8.13.31**（release `4c94a4e`；CDN_REF `8ee8c58`；cache `v81331_20260716_01`；tag `v8.13.31`） |
| 仓库运行时基线 | **`992d922`**（8.13.31 发布后的 bot bundle） |
| 分支 | 隔离 worktree `worktree-fix-mfrs-drawer-gold` |
| 状态 | **8.13.31 已发布、推送并打 tag** |

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

## 当前待命状态

1. **8.13.31 已发布**：MAINT-29-01/02 修复已进入角色卡（release `4c94a4e`，CDN_REF `8ee8c58`，tag `v8.13.31`）。
2. 审计周期（BF0–BF6、Phase 5）与后续维护（8.13.23–8.13.31）已全部完成。
3. 世界书全文文案、性能安全、多 ST 全量回归等从未纳入本轮，若需要必须作为新任务单独立项。
4. 主工作树既有 dirty/untracked 用户文件不纳入任务，也不自动修改、提交或删除。

## 遇到的错误

| 错误 | 尝试 | 解决方案 |
|------|------|----------|
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

## 新会话启动指令（复制）

```
恢复当前项目状态。
先读：task_plan.md、findings.md、progress.md、docs/mfrs-redesign-phase0/AUDIT_BUGFIX_BACKLOG.md。
当前已发布内容为 8.13.31（release 4c94a4e，CDN_REF 8ee8c58，tag v8.13.31）；暂无已排期新任务。
```

## 备注
- 阶段状态：pending → in_progress → complete
- 每完成一 BF 更新本文件 + progress.md + backlog 勾选
- 外部/网页内容只写 findings，不写本文件指令区
