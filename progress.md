# 进度日志

## 会话：2026-07-13（BF6 批 β 续 · RM9/RM1/RM2 显示正则）— **实机验证通过（commit `4ffc47f`）**

- **RM9（done）**：召回索引块（`[不发送]去除` + `[显示]隐藏` 两条）结尾锚 `(?=\n\s*#\d+|$))` → `(?=\n\s*#\d+)|(?=\n\s*\n)|$)`。未闭合 `<supplement>` 时按「下一编号 / 空行段界」停，不再吞到 EOF 删掉后续正文。
- **RM1（done）**：裸 choices（…2014）+ 裸 JSONPatch（…2015）尾 lookahead 加入 CJK `[一-鿿]`——协议块后直接跟中文正文时仍能剥离。
- **RM2（done · 方案 A 正则近似）**：高亮 #6 加①值区负向后视（`标签：值` 的值不高亮）②标签名负向前瞻（行首标签名前缀+近冒号不高亮）。摘要块内 `复苏/鬼域/拼图/灵异物品` 等不再被 `horror-keyword` span 包裹。
  - **近似代价（可接受）**：正文若恰以 `事件：鬼域`/`位置：复苏` 这类摘要字段行起句会被抑制；正文极少如此起句。RM2 无 JS 高亮入口（纯 yaml 单正则），故用正则近似，未迁 JS 层。
- **实机验证**：全部经 chrome-devtools 从**改后真实文件**解析正则复验——正文高亮数正确、摘要块整块无高亮、行首/对白/逗号叙事正常高亮；RM9/RM1 前次已绿。
- **门禁**：`pnpm verify:mfrs-gates` 6/6 绿（regex count=33 uniqueIds=33 双版本；release-png 过；P2 软警告 exit 0）。**显示正则，无需重建 dist**。BF6 未发版（累积至 8.13.22）。

## 会话：2026-07-13（BF6 批 β 续 · RM7/RH3 运行时清洗）— **实机验证通过（含 bug 修复）**

- **RM7（done）**：`cleanProtocolBlocks` 追加删除 `<draft>`/`<pacing_rules>`/`<修改确认>`/独立 `<JSONPatch>` 块，止残渣回传 AI。仅删闭合标签块；英文/外语调试摘要不删（避免误删正文英文对白）。
- **RH3（done）**：`recoverRecentRawProtocolMessages` 补写 MVU 后加 `cleanProtocolBlocks(index)`，导入旧档也清洗 mes；snapshot 幂等保 raw。
- **⭐ 实机验证抓到并修复真 bug（chrome-devtools 运行时注入验证）**：
  - `<修改确认>` 中文标签用 `\b` 匹配**失败**（中文非 `\w`，word boundary 不成立）→ 块删不掉。已改为 `<修改确认(?:\s[^>]*)?>` 去 `\b` + 属性容错。draft/pacing 是 ASCII，`\b` 正常无需改。
  - 修复后 devtools 复验：12 项全绿——6 类协议块（draft/pacing/修改确认[含带属性]/独立JSONPatch/choices/UpdateVariable）全删；4 类正文（中文头/英文对白/本轮摘要/结尾）全留；无残留标签。
  - RH3 验证：新旧档首次快照写 raw+清洗 mes+正文留 ✓；已有 raw 时快照幂等不覆盖 ✓。
  - **注**：真机 CDN pin 仍是 8.13.21（f2b7db2，不含 RM7/RH3），故用本地 production 源码的清洗链在 devtools 运行时验证，未改用户卡、未发版。
- **验证价值**：静态门禁（G5/mvu-hotfix）测不到运行时清洗，实机验证在提交前抓到中文 `\b` bug。
- **production dist 重建**（eval=0）；`pnpm verify:mfrs-gates` 6/6 绿。提交仅含 hotfix src+dist+progress（状态栏 html 的 module-id 噪声已弃）。BF6 仍未发版。

## 会话：2026-07-13（BF6 批 β 低风险子集 · RM8/RH4）— **done（未发版）**

用户选"先做低风险子集"（不改运行时清洗行为）。

- **RM8/RH4（done）**：hotfix 清洗白名单 ↔ 显示正则同步守护。
  - `hotfix-generation-ended-listeners/index.ts`：cleanProtocolBlocks 前加互指注释（白名单 {sp_start,sp_input,mfrs_roll}，与显示正则 id …2025 同步）。纯注释。
  - `verify-mfrs-regex-ids.mjs`（G3）：加 `extractSpMfrsWhitelist` + `verifySpMfrsWhitelistSync`——从 hotfix 源与显示正则各提取白名单，断言**不变式 display ⊆ hotfix**（hotfix 可多列自闭合的 mfrs_roll）。任一方漂移→fail（防 RH6 式）。
  - 验证：插桩确认断言真执行（hotfixSet={sp_start,sp_input,mfrs_roll}）；**负向测试**：篡改显示正则加 sp_FAKE→G3 exit=1 fail，还原→pass。聚合门禁 6/6 绿。
  - **副发现（已记 backlog）**：hotfix 白名单含 mfrs_roll 而显示正则 #10 不含属**无害**——掷骰条实际输出自闭合 `<mfrs_roll .../>`（成对匹配的显示正则天然不碰）；文档里的成对 `<mfrs_roll>` 全是行内代码引用非协议。
- **留下一批（改运行时清洗，需实机验证）**：RM7（hotfix 补删 draft/pacing/修改确认/JSONPatch 残渣）、RM9（`$` 兜底截断勿删到尾）、RH3（导入旧档补洗）、RH5（收窄 #19–22 英行改写）、RM1/RM2。
- **待办**：hotfix .ts 仅注释改动，dist 重建留发版前统一做（G1 强制 production build）。BF6 未发版。

## 会话：2026-07-13（BF6 · P1 release-png 接入 publish-card）— **in_progress**

- **P1（done）**：`scripts/publish-card.mjs` 加 `verifyReleasePng(card)`——每卡 `runBundle` 后校验发布 PNG 的 version/ref/cache/regex/scripts 与 `mfrs-release-constants.mjs` 单真源对齐；失败 `die`。
  - 位置：仿既有 `verifyDistFreshness`（G1）；调用点在每卡 `if (!NO_BUNDLE){ runBundle(); if(!DRY_RUN) verifyReleasePng(card); }`。
  - 验证：`node --check` 通过；`--dry-run` 正确跳过（不改文件）；门禁真值测试——正常 exit=0 / 错 ref(`--expect-ref deadbeef`) exit=1；聚合 `verify:mfrs-gates` 6/6 全绿无回归。
  - 效果：发布链现自动拦"PNG 与 pin 不一致"，消除人工遗漏（原只 G1 自动）。
- **下一**：批 β 正则残余（RM7–9/RH3–5/RM1–2）。BF6 未发版。

### 追加（同会话）· P0/P2/P3 流程门禁质量项 — **done**

- **P0**（`verify-mfrs-dist-freshness.mjs` + `package.json`）：加 `--no-build` 只读模式（跳 `runProductionBuild`，仅比对 committed dist ↔ CDN_REF）；`--ref` 默认回退 `CDN_REF`；package script 带 `--no-build`。publish-card 仍传完整参数走 build 校验，未受影响。self-test 加 2 断言。
  - **副产发现（Low/无害）**：只读模式揭示仓库 HEAD 已提交 dist ≠ CDN_REF(`f2b7db2`) dist。字符级比对确认唯一差异是 webpack module-id `672↔248`（全局替换后字节全等，功能 100% 等价）；`[bot] bundle fcd4a82` 在 pin 后 3 分钟重建所致。线上 CDN 拉 pin 版，用户不受影响。
- **P2**（`verify-mfrs-release-png.mjs`）：加 `warnIfPinDivergesFromHead`——pin≠HEAD 时 `console.warn` 报落后提交数 + 非 bundle 数，**不 fail**（exit 0）。原设想的硬校验 `CDN_REF==HEAD` 会误伤"发版 pin 后又 bot bundle"正常态（P0 已证实），故改软警告。现状实测：warn "pin 落后 HEAD 4 提交含 3 非 bundle" + exit 0。
- **P3**（`verify-mfrs-initvar-schema.mjs`）：加 `resolveRef`（解本地 `$defs`/`definitions` 指针 + 防循环）；`schemaObjectKeys` 传 root 并解引用。当前 schema.json 的 3 个 `$defs` 均标量（number/string），无行为变化——前瞻防御，防将来 `$defs` 含 object 时假阴。
- 回归：`node --check` 三脚本 OK；各 self-test 过；`pnpm verify:mfrs-gates` **6/6 全绿**（release-png 带 P2 warn，exit 0）。未发版。

## 会话：2026-07-13（8.13.21 上线后只读审查）— **complete**

双路独立只读审查（主会话 + 子代理），**结论一致：8.13.21 可安全上线**。

- **A git**：本地 `main` behind origin/main 1 个 `fcd4a82 [bot] bundle`（可 FF）；工作树仅 dev PNG，哈希 = origin/main 完全一致（`b7696690…`，bot 产物非手改）；**无未提交业务代码**。
- **B 变更/硬约束**：范围 `d2f8ae7..077b0b2`；业务源码仅 3 txt（WM1 偏移 0–5 / WM2 引用 / L8 示例 `medium→investigate`+`死亡风险低`），余为新增只读门禁脚本。`index.yaml` 8 项**仅 pin 更新**（`de42f2c`→`f2b7db2`、cache `v81320`→`v81321`），名称/id/启用/顺序未动；正则 33 未动；`table-change-adapter.ts` 本体未改（DM8 是新增测试覆盖）。L8 改动合法（`类型`=z.string()、`死亡风险`枚举含"低"）。**4 条硬约束全未破坏**。
- **C 门禁**：`pnpm verify:mfrs-gates` **6/6 PASS**（initvar-schema rootKeys=36 / regex-ids 33-33 / mvu-hotfix / output-cleaning / table-adapter / release-png version=8.13.21 refs=7 cache=8 regex=33 scripts=8）。G1 dist-freshness 只读模式无法跑（缺 `--ref` + 内部 build）。
- **新增质量项**（入 backlog「BF5 上线后审查」区）：
  - **P1**（Medium）release-png 门禁未接入 publish-card/CI，靠人工
  - **P2**（Low）release-png `--from-publish-card` 自证式，抓不出常量写错
  - **P3**（Low）initvar-schema 校验对 `$ref` 子节点跳过 → 将来假阴
  - **P0**（Low）package `verify:mfrs-dist-freshness` 裸跑必错 + 内部 build，非只读门禁
- **下一步**：本地 `git pull` FF；用户重导 8.13.21 PNG；可选 8.13.22 = H2 + RM7–9/RH3–5，顺带 P1 流程加固。

## 会话：2026-07-13（BF5 门禁 G2–G5 + DM8）— **complete（门禁）**

- **G2** `verify-mfrs-initvar-schema.mjs`：initvar↔schema 36 根键 + 层级/C1 回归
- **G3** `verify-mfrs-regex-ids.mjs`：33 条 id 唯一 + 查找表达式可编译（dev+pub）
- **G4** `mfrs-release-constants.mjs` 单真源；publish-card / release-png 共用；`--from-publish-card`
- **G5** cleaning 扩：中英混排、长英文对白、双 UV、【警告】长正文、未闭合 sp_
- **DM8** adapter：characters/items/rules 插入+别名；禁删 collected_rules；items/characters 可删；非法枚举；混合 LENGTH 拒绝；chronicle 真模板
- 快修：**WM1** 偏移 0–5；**WM2** 交叉引用；**L8** medium→investigate + 摘要死亡风险
- `pnpm verify:mfrs-gates`；hotfix/cleaning/adapter/release-png 全绿
- 功能 commit：`ddd2676`；status dist pin：`f2b7db2`
- **8.13.21** pin `f2b7db2` / cache `…-v81321-bf5-gates`；G1 + release-png 通过
- **下一步：** 用户重导 PNG；继续残余 H2/RM7–9 等

## 会话：2026-07-13（BF4 世界书与清理 + 8.13.20）— **complete**

- **W1/M3**：148 伪路径清零（休眠锚点+规范）
- **W2–W4/M4**：死亡/摘要/选项蓝灯；短索引蓝灯+已启用路由；死亡裁定真源主线进度；事件MVU 去 UpdateVariable
- **WM3–8 / M1–2 / L6 / RH1 / DH2 / SH5 / C5**：见 backlog
- 功能 commit：`de42f2c`（含 production dist）已 push
- **8.13.20** pin `de42f2c` / cache `…-v81320-bf4-worldbook`；G1 + release-png 通过
- **下一步：** 用户重导 PNG → BF5

## 会话：2026-07-13（BF3 + 8.13.19）— **complete**

- **D2/DH1/DH3–5/DM7/S1/SH1–4/SH6** 源码 + production dist
- 功能 commit：`5b10525` 已 push
- **8.13.19** pin `5b10525` / cache `…-v81319-bf3-db-open`；G1 + release-png 通过
- **下一步：** 用户重导 PNG → BF4

## 会话：2026-07-13（BF2 协议/正则/发送 + 8.13.18）— **complete**

- **C6** raw extra：消息面板 + App.vue 优先读；hotfix 清洗后 `saveChat`
- **H4–H8 / RH6 / R1–R3 / RH2 / RM3–RM6** 见 backlog 勾选
- 功能 commit：`dc27b52`（含 production dist）已 push
- **8.13.18** pin `dc27b52` / cache `…-v81318-bf2-protocol`；G1 + release-png 通过
- **下一步：** 用户重导 PNG → BF3

## 会话：2026-07-13（BF1 H9/L1 + 8.13.17）— **complete**

- H9：旧打包 JSON 改名为 `.deprecated-2026-06-03` + `DO_NOT_IMPORT_PACK_JSON.md`
- L1：MagVar `@0.171.0`；mvu_zod `@0.3.446`；publish/verify 同步
- **8.13.17** `21fecba` dist / release push；G1 + release-png 通过
- BF1 仅余 C5 stub 清理（Low）

## 会话：2026-07-13（8.13.16 + BF1 C3/C4）— **complete**

- pin `CDN_REF=91154c7`；cache `v81316-bf05-core-mirror`
- 开发源 `index.yaml` 全脚本同 pin + C4 loader 双 `?` 修复
- publish 8.13.16；G1 + release-png 通过
- H9/L1 仍开

## 会话：2026-07-13（BF0.5 · H10 方案 B）— **complete（源码）**

### H10 决策：方案 B
- 不恢复 App.vue 加载
- 新增 `脚本/数据库前端/mvu-core-mirror.ts`：GENERATION_ENDED/MESSAGE_RECEIVED 后镜像 global/player/event/clue/行动建议
- 字段路径按 D3 修正；处理状态 `未接触→未处理`
- `界面/状态栏/index.ts` 孤儿注释

**待：** commit + production dist（数据库前端）+ 可选 8.13.16

## 会话：2026-07-13（BF0 · 变量与行动建议真源）— **complete（源码）**

### 阶段 BF0 — **committed `5eaa533`**

**改动：**
- C1+L7+M6：`initvar.yaml` 四键升根；姓名/开局地点 `''`；补 flags/`可见档案`/主线权限键
- C2：`schema.ts` + `schema.json` 扩展字段
- H1+D1+M11+H3：规则/系统提示/输出格式统一
- hotfix seed 同步；`AUDIT_BUGFIX_BACKLOG.md` 入库并勾选

**已完成后续：** push `5eaa533`；dist `107b3ff`；**8.13.15** publish（G1 通过，release-png pass）

**未做：** C1.3 旧打包卡；C2.4 可见摘要

**下一步：** 用户重导 8.13.15 → BF0.5 H10 或 BF1

## 会话：2026-07-13（BF-1 · C7 重发版 + G1 门禁）— **complete**

### 阶段 BF-1 — **complete**

**交付：**
- 隔离 worktree `D:\project\tavern_helper_template-bf1` / 分支 `codex/bf1-recovery`
- 基线：`origin/main@e068087`（含 bot Bump deps；此前 f692384 已有 always-unlock 的 bot bundle dist）
- `d5cd98f`：production dist（状态栏 html 重建）+ G1 `verify-mfrs-dist-freshness.mjs` + publish-card 前置 + package.json script
- `de29b4a`：CDN_REF→`d5cd98f`、cache `…-v81314-c7-dist-rebuild`、版本 **8.13.14**、publish PNG + RELEASE
- 验收：G1 通过；`verify-mfrs-release-png` version=8.13.14 refs=7 cache=8 regex=33 scripts=8
- hotfix dist 含 `generation_ended_always`（28777ad 无此标记）

**主目录：**
- 未碰 `node_modules` / 未停 watch
- 规划/backlog 已勾 C7/G1；A2 审计文档等本地 dirty 未随发版提交
- **已合 main：** `origin/main` FF → `de29b4a`（2026-07-13）；用户自行重导 8.13.14 PNG

**下一步：** BF0（C1 initvar 升根）

## 会话：2026-07-13（A2 全量再审计差分）

### 阶段 A2 — **complete**

**操作：**
1. 7 条独立盲审轨并行（Explore 子代理，禁读既有清单）：脚本 SA×16 / MVU MV×18 / 正则 RX×15 / SQL DB×25 / 世界书 WB×18 / 开局 ST×16 / 漂移门禁 DR×7 = 115 项
2. 主会话独立复核关键论断：schema/initvar 对账（36 根键）、dist@28777ad 能力探针、发布版 URL 解码、恐怖程度 75 处计数、`<<START>` 字节验证、RX-05 掷骰击杀链
3. 与 backlog 逐条差分：已覆盖 ~70 / **新增 32 / 误报修正 4 / 升级扩容 10**
4. 入库：backlog「三轮 A2」区（C7、H10、RH6、SH6、M11、RM3–9、WM4–8、DM7–9、DL4–6、L5–9、SL2–3、G1–G5 门禁）+ 对既有条目 20 处就地修正
5. 更新 task_plan（A2 complete、新 BF-1/BF0.5 阶段、BF 表重排）、findings（A2 差分区）

**关键结论：**
- **C7（Critical 新增）**：8.13.13 发布 pin `28777ad` 无 dist rebuild → always-unlock 修复未交付用户。BF-1 最优先
- **H10（决策）**：App.vue 状态栏发布链孤儿，MVU→DB 核心镜像零 owner → 决定 BF3 一半条目的修复对象
- **误报**：C5（stub 未被加载）关闭；C4 降 Medium；W1 休眠标注；"#31 勿重开"立场撤销（RM5 复核）
- **工作区注意**：dist hotfix 当前是 dev-mode 构建（eval+sourcemap），发布前必须 production rebuild，勿直接提交

**创建/修改：**
- `docs/mfrs-redesign-phase0/AUDIT_BUGFIX_BACKLOG.md`（三轮 A2 区 + 就地修正 + BF 表 A2 修订版）
- `task_plan.md`、`findings.md`、`progress.md`（本文件）
- `.tmp-research/a2-diff-workbench.md`（差分工作台，临时）

**未改：** 业务源码（A2 仍是审计阶段，无代码 fix）

### 下一步：BF-1（C7 重发版）→ BF0

## 会话：2026-07-12（审计 + 清单 + 文件规划交接）

### 背景续接（本会话前已存在）
- 路径 β HUD 已发 8.12.x–8.13.x
- **8.13.11** seed 行动建议路径
- **8.13.12** P2 双保险
- **8.13.13** 生成结束始终解锁发送（`28777ad` + release `5767796`）
- 用户侧：发送「能看见点不动」已用 always-unlock 缓解

### 阶段 A：审计与清单 — **complete**

**操作：**
1. 说明 UI 归属（脚本+界面/状态栏，非世界书）
2. 一轮审计：脚本 / MVU / EJS / 系统提示词 → Critical/High/Medium/Low
3. 二轮审计：正则 33 / SQL 14 / 开局欢迎 / 世界书规则与锚点
4. 写入并整理 `docs/mfrs-redesign-phase0/AUDIT_BUGFIX_BACKLOG.md`
5. README 挂链；planning-with-files 三文件就位

**创建/修改的文件：**
- `docs/mfrs-redesign-phase0/AUDIT_BUGFIX_BACKLOG.md`（新建/扩充）
- `docs/mfrs-redesign-phase0/README.md`（索引）
- `task_plan.md`（本交接计划）
- `findings.md`（审计摘要）
- `progress.md`（本日志）

**未改：** 业务源码修复、publish（审计阶段无代码 fix）

### 阶段 B / BF0 — **pending**
- 下一会话从 **C1 initvar 升根** 开始

## 测试结果

| 测试 | 输入 | 预期 | 实际 | 状态 |
|------|------|------|------|------|
| 8.13.13 release-png | expect 8.13.13 / 28777ad | pass | pass（发版时） | 已过 |
| 二轮审计回归用例 | — | — | 未跑修复后回归 | 待 BF5 |
| initvar 根路径 | 新开局 | 根上有行动建议 | 源仍嵌套（C1 未修） | 待修 |
| 英文正文 + 正则 | 英文 corridor 叙事 | 保留 | 审计认为 R1 会误删 | 待修 |

## 错误日志

| 时间 | 错误 | 尝试 | 方案 |
|------|------|------|------|
| 历史 | 发送 mutex 卡 | CDP+hotfix | 8.13.13 always unlock；H5 仍可优化 |
| 历史 | 行动建议空 | seed | 8.13.11；C1 根因未修 |
| 本会话 | 无修复失败 | — | 仅审计 |

## 工作树备忘（交接时）

- 分支：`main`（behind origin 1：f692384 [bot] bundle — **开工先 pull**）
- 未提交相关：`AUDIT_BUGFIX_BACKLOG.md`、`task_plan.md`、`findings.md`、`progress.md`、`README.md` 等
- 杂项 untracked（勿当缺陷源）：`.tmp-research/`、截图、`5.10号途尽更新/` 等
- ~~可能有 dist hotfix 本地修改：提交前核对是否应进 BF 修复~~ **已核实（DR-04）**：工作区 dist 是 src 的 dev-mode rebuild（eval+sourcemap），非手改；**发布前先 `pnpm build` production，勿把 dev 构建提交**

## 五问重启检查

| 问题 | 答案 |
|------|------|
| 我在哪里？ | BF-1 完成（8.13.14）；BF0 未开 |
| 我要去哪里？ | BF0→BF0.5→BF1–BF5 |
| 目标是什么？ | 按 backlog 修功能路径 bug 并回归发版 |
| 我学到了什么？ | findings.md + AUDIT_BUGFIX_BACKLOG.md |
| 我做了什么？ | 两轮+A2 审计 + BF-1 重发 + 本三文件 |

## 新会话最小步骤

1. 确认 `codex/bf1-recovery` 是否已合 main；`git pull`（如 behind）
2. 读 `task_plan.md` → `findings.md` → `progress.md` → `AUDIT_BUGFIX_BACKLOG.md`
3. BF0：`initvar.yaml` C1+L7 → `schema.ts` C2 → M6 → H1/D1 → H3 → M11
4. 每完成一组：勾 backlog + 更新本 progress + task_plan 阶段状态
5. 勿重跑全量审计，除非用户要求
6. 注意：规划文件多在**主目录本地 dirty**；发版代码在 `codex/bf1-recovery`

---
*每个 BF 阶段完成或遇错时更新*
