# 审计缺陷待修清单（总表）

**日期**：2026-07-12  
**来源**：  
- 一轮：脚本 · MVU · EJS · 系统提示词  
- 二轮：正则 33 · SQL/14 表 · 开局/欢迎页 · 世界书规则与锚点路径  
**基线发布版**：8.13.13（`28777ad` / `…-v81313-always-unlock-send`）  
**范围**：`src/神秘复苏模拟器`  
**状态**：全部 **待修**（未开工）

> 说明：本清单只收录已核实或高置信交叉对照缺陷，不保证穷尽全部运行时 bug。  
> 修完一项请改为 `[x]` 并注明 PR/commit；发版后在对应 `RELEASE_*.md` 交叉引用。  
> 与一轮重复的项（如 initvar 嵌套、schema 窄、行动建议 0–4）**不重复编号**，见 C1/C2/H1 等。  
> **M3 ⊂ W1**（伪路径）、**L2 ⊂ RH1**（正则命名）、**M4 ⊂ W4**（阶段双源）— 修时合并关单。

---

## 0. 总览索引（待修 = 未勾选）

| 前缀 | 领域 | Critical | High | Medium | Low | 合计项（约） |
|------|------|----------|------|--------|-----|--------------|
| **C** | 脚本加载/initvar/schema/协议 | C1–C6 | — | — | — | 6 组 |
| **H** | 契约/hotfix/面板 | — | H1–H9 | — | — | 9 组 |
| **M/L** | EJS/宿主/文档 | — | — | M1–M10 | L1–L4 | 14 |
| **R** | 正则 33 | R1–R3 | RH1–RH5 | RM1–RM2 | — | 10 |
| **D** | SQL / 14 表 / 镜像 | D1–D3 | DH1–DH5 | DM1–DM6 | DL1–DL3 | 17 |
| **S** | 开局 / 欢迎页 | S1 | SH1–SH5 | SM1–SM4 | SL1 | 11 |
| **W** | 世界书规则 / 锚点 | W1 | W2–W4 | WM1–WM3 | — | 7 |
| **A2 三轮新增** | 发布链/孤儿UI/正则/DB守卫/世界书/门禁 | C7 | H10 RH6 SH6 M11 | RM3–RM6 WM4–WM6 DM7–DM9 | L5–L9 RM7–RM9 WM7–WM8 DL4–DL6 SL2–SL3 | 32 + 门禁 G1–G5 |

**P0 必先修（A2 修订顺序）**：**C7（发布未交付，最优先）** → C1 → C2 → H10（App.vue 去留决策，D3/H2.2 先决） → R1–R3+RH6 → D2–D3 → S1+SH6 → C3 → D1/H1+M11

**合并关单提示**

| 修此项时一并关 | 被合并项 |
|----------------|----------|
| W1 | M3 |
| W4 | M4 |
| RH1 | L2 |
| H1 | D1（策略对齐） |
| C2 | 对话示例扩展字段、DH 风险三套中的 schema 侧 |

---

## 修单优先级约定

| 批次 | 范围 | 目标 |
|------|------|------|
| **P0** | Critical C1–C6 + R1–R3 + D1–D3 + S1 | 路径/契约/加载/正则误删/DB 镜像错读/开局校验 |
| **P1** | High H1–H9 + RH/DH/SH/W2–W4 | 输出契约 + hotfix/正则 id + 规则激活 + 开局字段 |
| **P2** | Medium M/RM/DM/SM/WM | 伪路径批量、枚举别名、双表、宿主生命周期 |
| **P3** | Low L/DL/SL | 文档/版本 pin/边角 |

**建议真源顺序（修契约时遵守）**

1. `schema.ts`（可落库字段）  
2. `世界书/变量/变量输出格式.yaml`  
3. `系统提示词/0.txt` + `必须输出推演选项.txt`  
4. `对话示例/0.txt`  
5. 脚本解析：raw protocol + MVU；清洗只影响显示  

---

## 一轮 · P0 Critical（C*）

### C1 · initvar 运行时字段嵌错层 — **源已修（BF0；C1.3 打包卡待 H9/publish）**

- [x] **C1.1** 将 `规律推理记录` / `最近行动判定` / `行动建议` / `在场人物` 从 `当前灵异事件` **提升到根级** — **BF0 2026-07-13**
  - 文件：`世界书/变量/initvar.yaml`
  - 对照：`schema.ts` L170–182
- [x] **C1.2** 确认 `当前灵异事件` 内仅保留事件字段（事件代号、危害等级、规律列表等）
- [ ] **C1.3** 同步打包卡 initvar（`神秘复苏模拟器.json` / 发布版）与源文件一致（下次 publish-card 镜像；打包卡整体见 H9）

**验收**：新开局 `stat_data` 根上存在 `/行动建议`、`/最近行动判定`；MagVar `replace` 不依赖 hotfix 也能写中。

---

### C2 · Schema 窄于提示词/示例/SQL — **源已修（BF0；C2.4 可见摘要可选）**

- [x] **C2.1** 扩展 `ActionSuggestionSchema`：增加 `死亡风险`、`复苏风险`（枚举与 SQL 一致：无/低/中/高/致命/未知） — **BF0**
  - 文件：`schema.ts` → 重生 `schema.json`
- [x] **C2.2** 扩展 `ActionJudgementSchema`：增加 `触发项`、`资源代价`、`后续建议`
- [x] **C2.3** 扩展 `ReasoningRecordSchema`：增加 `确认等级`
- [ ] **C2.4** 评估 `当前灵异事件.可见摘要`：入 schema **或** 从规则/UI 删除（BF0 未改，仍可选）
- [x] **C2.5** 全链路选扩 schema：输出格式/系统提示/SQL 枚举已对齐可落库字段

**验收**：模型按 `变量输出格式` 写出的字段经 `Schema.parse` 后仍保留；状态栏/消息面板能读到风险枚举。

---

### C3 · 开发源 `index.yaml` CDN 过期 — **已修 8.13.16**

- [x] **C3.1** 源 `index.yaml` 与 `publish-card` 对齐同一 `CDN_REF` `@91154c7` + cache `v81316` — **BF1/8.13.16**
- [x] **C3.2** 开发卡与发布卡同 pin；localhost 仍可用（手动改 URL）

**验收**：开发卡与发布卡加载同一代 dist（或明确本地 5500）；改源可见效果。

---

### C4 · CDN loader 双 `?` 破坏 query — **已修 8.13.16**

- [x] **C4.1** 开发源脚本库 loader：`url.includes('?') ? '&' : '?'` + `t=` — **BF1/8.13.16**
- [x] **C4.2** 发布版经 publish-card 从开发源镜像同步

**验收**：运行时 `import` URL 仅为 `...?v=cache&t=ts`，无第二 `?`。

---

### C5 · 数据库前端入口可能指向瘦 stub — **已处置（误报+清理）**

- [x] **C5.1–C5.3** live URL 已是 `数据库前端/`；stub `神秘复苏数据库前端` 加废弃头注释 — **BF4**
  - 文件：`index.yaml` 脚本库项「神秘复苏数据库前端」

**验收**：`MysteryAcuVisualizer` / 表镜像 API 可用；全库/柜路径非空壳。

---

### C6 · 协议清洗早于 UI 解析且状态栏不读 raw — **已修（BF2）**

- [x] **C6.1** `界面/状态栏/App.vue` `extractOptions()` 优先读 `extra._mfrs_raw_protocol_message`，再 mes，再 MVU `行动建议`
- [x] **C6.2** `消息内面板` `getLatestAiMessageRawText` 同样优先 raw extra
- [x] **C6.3** 可选：hotfix 延后 strip 至 MVU 写回 + 镜像完成；或保证 raw 持久化 `saveChat`
- [x] **C6.4** 空生成判定用清洗前快照 / raw，不用清洗后空 `mes`

**验收**：仅输出 `<choices>`+`<UpdateVariable>` 时，HUD/状态栏仍能出 A–D；清洗后显示无协议块。

---

## 一轮 · P1 High（H*）

### H1 · `/行动建议` 条数契约冲突 — **待修**

- [x] **H1.1** 统一：存活时 **恰好 A–D 4 条**；死亡时禁止 `<choices>`，`/行动建议` 置 `[]` — **BF0**
- [x] **H1.2** 改 `变量更新规则.yaml`、`事件MVU联动规则.txt`、`变量输出格式.yaml` 中「0–4」表述

---

### H2 · 风险表示三套并行 — **待修**

- [ ] **H2.1** 唯一主格式：`<choices>.risk` 数字 + MVU 枚举映射表（文档化）
- [ ] **H2.2** 改 `App.vue` `commitStartData` 开局注入：禁止可见【推演选项】与 `<risk>` 旧标签，改为 `<choices>` + `<UpdateVariable>`
- [ ] **H2.3** 对齐 `normalizeOptionRiskDelta` 与枚举→数字映射

---

### H3 · 系统提示骨架弱于变量输出格式 — **待修**

- [x] **H3.1** 系统提示骨架并入：`delta` 风险、`/在场人物`、完整 `最近行动判定` / `行动建议` 字段 — **BF0**
- [x] **H3.2** 与 `变量输出格式.yaml` 同源（示例已含扩展字段，未再改示例）

---

### H4 · Hotfix 监听器可重复注册 — **已修（BF2）**

- [x] **H4.1** 幂等安装：`off` 再 `on`，或 `__mfrsHotfixInstalled__` 硬门闩
- [x] **H4.2** 提供 `__mfrsHotfixCleanup__`，CHAT_CHANGED / 重载可卸

文件：`脚本/hotfix-generation-ended-listeners/index.ts`

---

### H5 · `forceRecoverSendUi` 过激 — **已修（BF2）**

- [x] **H5.1** 仅在发送卡住时恢复（send 隐/stop 显、空 mes、超时），非每轮盲点 stop
- [x] **H5.2** 与 H4 叠加后防 thrash；可 debounce

---

### H6 · 清洗后假空生成 — **已修（BF2）**

- [x] **H6.1** `recoverSendUiAfterEmptyGeneration` 基于清洗前 / raw 判定
- [x] **H6.2** 系统提示强调正文+【本轮摘要】不可省略

---

### H7 · 消息内面板不解析 `<choices>` 主格式 — **已修（BF2）**

- [x] **H7.1** 增加与 `App.vue` 同构的 `parseStructuredChoices`（key/text/risk）
- [x] **H7.2** 回退链：MVU → 表 → raw `<choices>` → mes JSONPatch

文件：`脚本/消息内面板/index.ts`

---

### H8 · Hotfix seed 覆盖不全 — **已修（BF2）**

- [x] **H8.1** `seedMissingStatPaths` 扩到 schema 默认全集（至少：在场人物、规律推理记录、收录*、可见档案、主线进度数组、运行期 flags）
- [x] **H8.2** 与 C1 修完后的 initvar 对齐，避免双源默认值

---

### H9 · 源与打包卡协议漂移 — **已处置（废弃旧 JSON，不复活）**

- [x] **H9.1–H9.2** 旧 `神秘复苏模拟器.json`（2026-06-03）移出可用名：`神秘复苏模拟器.json.deprecated-2026-06-03` + `DO_NOT_IMPORT_PACK_JSON.md`
- [x] **H9.3** 发布真源仍为 `publish-card` PNG；不把 deprecated JSON 当同步目标

---

## 一轮 · P2 Medium（M*）

- [x] **M1** EJS 摘要先统一解包 `stat_data.stat_data` 再读风险/状态 — **BF4**
- [x] **M2** EJS 包 try/catch + 失败 fallback — **BF4**
- [x] **M3** 世界书锚点伪路径 → **并入 W1 关单** — **BF4**
- [x] **M4** 统一阶段真源 → **并入 W4 关单** — **BF4**
- [ ] **M5** 双驾驭厉鬼 / 双灵异物品：提示词明确运行期只写 `驭鬼者状态.已驾驭厉鬼`、`灵异资源.灵异物品`
- [x] **M6** initvar 补种：`可见档案`、`剧情阶段`、`is_dead` / scene flags、主线 `权限层级`/`已开放主题`/`锁定主题` — **BF0**
- [ ] **M7** 固定状态栏 vs 数据库前端 cleanup：CHAT_CHANGED 勿互撕 host（`removeFixedStatusHost: false` 当仍在本卡）
- [ ] **M8** 明确 `<choices>`→MVU/DB 镜像唯一 owner（hotfix 或真实前端或挂载 Vue 状态栏）
- [ ] **M9** `protocol-normalizer`：`/行动建议` 禁止当 array-append；`add`→`replace` 整表
- [ ] **M10** 消息内面板 `getVariables`/`getChatMessages` 与 hotfix 同解析链；关键 catch 打 warn

---

## 一轮 · P3 Low（L*）

- [x] **L1** MagVar pin `MagVarUpdate@0.171.0`；mvu_zod pin `tavern_resource@0.3.446`；`脚本/MVU` 标死代码对照 — **BF1 2026-07-13**
- [x] **L2** 正则/注释中「由 sp 面板替代」→ **并入 RH1 关单** — **BF4**
- [ ] **L3** 系统提示注明仅开局允许 `sp_start`/`sp_input`
- [ ] **L4** 可选：EJS `<%-` 过滤模板定界符防二次注入

---

## 二轮 · 正则（R*）

### Critical

- [x] **R1** 收窄/禁用 `[显示]隐藏英文调试摘要` / `[显示]隐藏外语中间稿`：勿按 corridor/risk/choices 等词整段删英文正文 — **BF2**
- [x] **R2** `#8`/`#2` 面板隐藏：禁止裸 `【选项】` 标题匹配；仅 `【推演选项` / `【状态面板` / 带冒号标题；限制吞到 EOF — **BF2**
- [x] **R3** `#33` 未闭合思维链：禁止 `$` 吃掉整段正文/摘要/协议；与 hotfix `stripThinkingBlocks` 对齐 — **BF2**

### High

- [x] **RH1** 正则名「由正文 sp 面板替代」→「由 HUD/数据库前端消费」— **BF4**
- [x] **RH2** 正则 **id 冲突**：`…2004` / `…2005` 被开局渲染与思维链共用 → 换新 UUID 后发版 — **BF2**（思维链 → `e8f1…f60/f61`）
- [ ] **RH3** prompt 侧协议 strip `最大深度: 3`：评估提高或依赖 hotfix 持久清洗 mes
- [ ] **RH4** `#25` sp 标签列表与 `#11` 广义 `(sp|mfrs)_` 对齐
- [ ] **RH5** 禁用或收窄 `#19–22` Name/Status/Location 英行改写（短标签 UI 已关）

### Medium

- [ ] **RM1** 裸 choices / 裸 JSONPatch 显示清理：锚到文末/摘要后，降低正文假阳性
- [ ] **RM2** 关键词高亮勿改写 `【本轮摘要】` 内字段

---

## 二轮 · SQL / 数据库（D*）

### Critical

- [x] **D1** `action_suggestions` 固定 4 行 vs MVU：策略对齐——**存活** MVU 恰 4 条与表 4 行一致；**死亡** MVU `[]` + 无 choices（表可仍占位，镜像层后续随 H10）— **BF0 规则侧**
- [x] **D2** `处理状态`：`未接触→未处理` 对齐 mirror/adapter/App；禁默认「调查中」— **BF3**
  - 文件：`table-change-adapter.ts`、`App.vue` normalizeHandlingStatus；mirror 已正确
- [x] **D3** 核心表镜像字段路径 — **BF0.5 在 mvu-core-mirror 正确实现**（`主线进度.世界压力.*`、`已死亡人数`、`势力关系.所属城市`、`最近行动判定.行动`）；App.vue 死代码未改

### High

- [x] **DH1** `检定建议`：明确 **SQL-only**；HUD 只读 `check_suggestions` 表 — **BF3**
- [x] **DH2** 联动规则人物列对齐 DDL；线索补可见性 — **BF4（文档）**
  - 文件：`世界书/规则/数据库联动规则.txt` vs `characters` DDL
- [x] **DH3** 驾驭厉鬼：修 frontend-config 错 path；adapter 别名 恐怖等级/使用能力/是否死机 — **BF3**
- [x] **DH4** `收录档案.archive_status` DDL CHECK + 禁「收录成功」→已收录；规则同步 — **BF3**
- [x] **DH5** 行动建议模板 content 补 A–D 种子行 — **BF3**

### Medium

- [ ] **DM1** 事件纪要 20–600 vs 联动「200–600」统一
- [ ] **DM2** adapter 枚举别名扩展（关押/可靠度/在场/生死/风险等级/option_key）
- [ ] **DM3** global/player 单行表模板种子 `row_id=1`
- [ ] **DM4** 前端 mysteryTables / 一致性 path 对齐 14 表与真实 schema
- [ ] **DM5** `player_state.controlled_ghosts` 文本镜像 vs `驾驭厉鬼` 表：联动规则写清何时更谁
- [ ] **DM6** `check_suggestions` updateNode 示例占位符列序/typo 修正（避免教坏 AI 列顺序）

### Low

- [ ] **DL1** 联动规则「14 表」列表编号/第 15 条措辞清理
- [ ] **DL2** `ghost_archives.archive_code` G#### 与 `controlled_ghosts.ghost_code` 自由名：文档勿混用规则
- [ ] **DL3** 打包卡旧【推演选项】/状态面板 blob → **并入 H9 关单**

---

## 二轮 · 开局 / 欢迎页（S*）

### Critical

- [x] **S1** `fillWelcomeStart` 必填校验（姓名/身份/背景/锚点等）；`type=button` 不靠 HTML required — **BF3**
  - 文件：`脚本/界面美化/index.ts`；开局 HTML 在 `index.yaml` 正则「渲染神秘复苏开局页」

### High

- [x] **SH1** `第一条消息/0.txt` 种子清单与真实表单字段对齐 — **BF3**
- [x] **SH2** 身份 option 用短 `value` — **BF3**
- [x] **SH3** 开局报文写明 JSONPatch 合法路径；勿写 `/当前时间` — **BF3**
- [x] **SH4** 开局确认后首轮强制：`【本轮摘要】`+`<choices>`+`<UpdateVariable>` — **BF3**
- [x] **SH5** 欢迎页保持 `启用:false` + 文件头标明真源=开局正则 — **BF4**

### Medium

- [ ] **SM1** 欢迎页 CSS 变量缺失、外链 CDN、parent textarea 假设
- [ ] **SM2** 时空锚点改为必选或强制自定义说明
- [ ] **SM3** 欢迎时自动弹数据库仪表盘：延后或可关
- [ ] **SM4** `sp_input` 标明遗留/可选，不依赖模型自发

### Low

- [ ] **SL1** `index.yaml` 角色描述补一句：`choices` → HUD / 数据库前端（勿写推演选项面板）

---

## 二轮 · 世界书规则 / 锚点（W*）

### Critical

- [x] **W1** 改写规范 + 5 休眠小剧情锚点伪路径 → `规律推理记录[insert/-].*` + `当前灵异事件.错误推断` — **BF4**（条目仍 `启用:false`）  
  - **关单同时勾 M3**

### High

- [x] **W2** 安全子集：死亡裁定/必须输出推演/正文摘要 → **蓝灯**；事件MVU 去掉 `UpdateVariable` 自锁触发词 — **BF4**（灵异对抗等仍绿灯）
- [x] **W3** 常驻短索引改指已启用全书核心索引 + 蓝灯 — **BF4**
- [x] **W4** 死亡裁定真源改为 `主线进度.当前阶段/阶段状态`；**关单同时勾 M4** — **BF4**

### Medium

- [x] **WM1** 偏移等级 0–4 vs 0–5 统一 — **BF5**（锚点规范补 5 级）
- [x] **WM2** 世界线偏移交叉引用「主线阶段推进规则 第五节」修正 — **BF5**
- [x] **WM3** `mfrs_*` 禁面板 vs 允许 `mfrs_roll` 写清例外 — **BF4**（短标签协议已有/强化）

---

## 三轮 · A2 再审计新增（2026-07-13，7 轨盲审差分）

> 方法：7 条独立盲审轨（脚本/MVU/正则/SQL/世界书/开局/漂移门禁，禁读既有清单）+ 主会话独立抽查复核。
> 原始发现 115 项 → 与本清单逐条比对：已覆盖 ~70、**新增 32、误报/降级 4、升级/扩容 10**。
> 明细工作台：`.tmp-research/a2-diff-workbench.md`（临时，入库后可删）。

### A2 对既有条目的修正（就地生效）

| 条目 | 修正 | 依据 |
|------|------|------|
| **C4** | Critical → **Medium**：jsDelivr 忽略多余 query，双 `?` 仅使 `t=` 缓存穿透失效，加载不失败 | SA-13 实测 |
| **C5** | **误报关闭**：两版 index.yaml 第 7 项 URL 解码均=`数据库前端/index.js`（完整实现）；stub 目录无任何入口引用。改为 Low 清理项（删 stub 或加防误用注释） | SA-11 + 主会话 URL 解码验证 |
| **M6** | Medium → **High** 并扩容：根级缺 `剧情阶段`/`is_supernatural_scene`/`has_entered_supernatural`/`revive_streak`/`is_dead`/`可见档案` 六键 + `主线进度` 缺 `权限层级`/`已开放主题`/`锁定主题`；normalizer 白名单 `/可见档案/*` 4 条路径无落点 | MV-02/13、WB-16 |
| **L1** | Low → **Medium** 并扩容：MagVar bundle 与 `mvu_zod.js` **无 @commit 浮动依赖**（两版同病），`?v=` 锁不住内容；`脚本/MVU/` 目录死代码与 yaml 内联 URL 不一致一并清理 | SA-12/16 |
| **W1** | 降低紧迫性标注：5 个小剧情锚点条目均 `启用:false` 且规范模板是孤儿 → 伪路径**当前休眠**（~148 处）；改为"启用前必修"，模板根治仍留 BF4 | WB-02 |
| **C3** | 证据升级：dev pin `47a5fe5` **无 消息内面板 dist**（文件 07-01 才存在）→ 开发卡 HUD 必 404；hotfix pin `1fa42d8` bundle 用 `Mvu.parseMessage(i,{})` 错误签名 → 开发卡 MVU 写回坏；6 脚本 pin 落后 20+ 提交且 hotfix 与其余错位一个 phase | SA-01/02/03、DR-05 |
| **D3** | 清单扩容：+`current_city`（读 当前城市/城市，应 `势力关系.所属城市`）、+`last_action`（读 最近行动，应 `最近行动判定.行动`） | DB-02/05 |
| **DH2** | 扩为多表列契约核对：+线索表职责漏 `visibility`（NOT NULL，按规则插入必违规）、+叙述名 现象/死亡风险 无别名（表头为 表现/死亡风险镜像） | DB-08/09 |
| **H2** | 扩容：风险实为 **4 套语义**（0-100 绝对值/choices 数字增量/带符号字符串/中文档位）+ 显示单位分裂（X/100 vs X%）；+`总复苏风险` op 矛盾（对话示例教 replace 绝对值 30，输出格式/对抗判定教 delta）；+`riskLevelFromDelta` 阈值与文档 delta 标度错位 | MV-09/14、DB-12 |
| **RH3** | 扩容：hotfix `recoverRecentRawProtocolMessages` 只补 MVU 不调 `cleanProtocolBlocks`（index.ts:457-469）→ 导入旧档漏洗；sp_start 原文深度>3 回流 prompt | RX-07、ST-15 |
| **SH1/SH3** | 扩容：开局报文教写"当前时间"但 schema/initvar 无时间字段（仅 DB `game_time`）→ AI 会发明非法路径；`消耗代价` 在 sp_start 轨无采集恒"无" | ST-10/11 |
| **SH5** | 双源 → **三源**：欢迎页 txt / live 正则表单 / App.vue 表单，身份枚举三套互不一致 | ST-05 |
| **W3** | 扩容：常驻短索引**自身**也几乎不激活（绿灯+触发词全是元词汇+递归禁止被拉起） | WB-05 |
| **WM3** | 扩容：`mfrs_roll` 完整语法只在绿灯条目，首骰前触发词不出现 → 首骰格式无来源（冷启动） | WB-18 |
| **H9** | 扩为打包卡整体处置：已 **废弃** `神秘复苏模拟器.json.deprecated-2026-06-03` + 警示文档；发布仍只走 PNG | DR-03/07、ST-13 |
| **H1/D1** | 补充：App.vue 行动建议镜像 all-or-nothing、中途失败残留旧值、无清空机制（若 App.vue 保留则同批修） | DB-14 |
| **H4** | 补充：`GENERATION_STOPPED` 超联合类型 as-cast，同样无去重卸载 | SA-15 |
| **D2** | 补充：归一化两层语义分叉（App.vue `未接触→调查中` vs adapter `待处理→未处理`），修复时两层同修 | DB-22 |
| **DH3/DH4** | 补充：MVU 驭鬼者/收录条目缺 DB NOT NULL 列 `public_summary` → 直接镜像必违规 | DB-23 |
| **progress 备忘关闭** | "dist 可能有手改"已核实：工作区 dist 为当前 src 的 **dev-mode rebuild**（webpack eval+内嵌 sourcemap），非手改、src 不落后 | DR-04 |

### A2 新增 Critical

- [x] **C7 · v8.13.13 发布 PNG 指向未重建 dist —— always-unlock 修复未实际交付** — **已修 8.13.14**
  - [x] **C7.1** 事实：`publish-card.mjs` CDN_REF=`28777ad`，但该 commit 只改 `index.ts`+门禁，未含 dist rebuild；`dist@28777ad` 无 `generation_ended_always`/`forceRecoverSendUi` 标记（=0）；修复 bundle 在 `f692384`（bot bundle，发布后），无发布物指向它
  - [x] **C7.2** 修复：production rebuild → 提交 dist `d5cd98f` → `publish-card` pin → **8.13.14** `de29b4a`（`codex/bf1-recovery`）
  - [x] **C7.3** 纪律：发布前 worktree production build；hotfix dist 含 `generation_ended_always`
  - [x] **C7.4** 门禁 G1 已落地（见下）
  - 严重度理由：8.13.13 的招牌修复对用户不存在；`verify-mfrs-release-png` 只验 PNG 内自洽，验不出此病

### A2 新增 High

- [x] **H10 · App.vue 状态栏是发布链孤儿；MVU→DB 核心镜像零 owner** — **BF0.5 方案 B（2026-07-13）**
  - 决策：不恢复 App.vue 加载；核心镜像迁入 `脚本/数据库前端/mvu-core-mirror.ts`（GENERATION_ENDED/MESSAGE_RECEIVED）
  - 开局：界面美化；选项 UI：消息内面板；App.vue 保留源码但标注孤儿（`界面/状态栏/index.ts` 注释）
  - 仍开：C6.1/D3/H2.2/DM9 等对 App.vue 死代码的细修可降优先或随删除批次；镜像路径已按 D3 正确字段实现
- [x] **RH6 · 掷骰条被自家 hotfix 击杀** — **BF2**：hotfix 白名单放行 `mfrs_roll`（不再 strip 自闭合骰条）；#27 显示正则可渲染
- [x] **SH6 · 开局提交按钮无内联兜底** — **BF3**：`mfrs-submit` 加 onclick 内联校验+填入（与 ghost 加减同级兜底）
- [x] **M11 · 死亡链断裂（与 W4/H1 同批）** — **BF0 文档侧**：系统提示/必须输出推演选项/变量更新规则统一写集 `状态+is_dead+阶段状态=模拟结束+行动建议[]`；主线阶段推进规则值域补「模拟结束」；`<death/>` 仍仅 App.vue（H10 后处理）

### A2 新增 Medium

- [x] **RM3** 正则 #1/#6 改非贪婪闭合标签匹配 — **BF2**
- [x] **RM4** #7 关键词高亮/#23 警告渲染加 `g` — **BF2**
- [x] **RM5** **复核"#31 OFF 正确"立场**：#9 未闭合结构块扩 `sp_/mfrs_`（排除 start/input/roll）；#31 保持 OFF — **BF2**
- [x] **RM6** #23 警告渲染终止 lookahead 对齐本轮摘要/choices/UV — **BF2**
- [x] **WM4** 阶段7 等孤儿记录加维护头标注 — **BF4**（不改历史断言正文）
- [x] **WM5** 死亡写 `阶段状态=模拟结束` ∉ 推进规则封闭值域（并入 M11，值域已补）— **BF0**
- [x] **WM6** 最小：变量更新规则点名 `已驾驭厉鬼[].恐怖等级`；DB 规则旁注 MVU 字段名 — **BF4**（不机械替换原著「恐怖程度」叙述词）
- [x] **DM7** adapter 守卫：禁删表 `TABLE_DELETE_FORBIDDEN`；固定/单行表 `TABLE_INSERT_FORBIDDEN`（已有 row 时）— **BF3**
- [x] **DM8** 门禁缺口：`verify-table-change-adapter` 补 characters/supernatural_items/collected_rules；禁删 collected_rules；非法枚举 CHECK；混合 LENGTH 整计划拒绝；chronicle 真模板 — **BF5**
- [ ] **DM9** [App.vue] `visibleSummary` 回退链末尾 `getCurrentMessageId()` → `public_summary`/`clue_text` 可能被写成楼层号（数字字符串化非空，兜底文案永不生效）
- [ ] **WB-06 附注（并入 W2）** 事件MVU联动规则触发词 `UpdateVariable` 恰被 #1 正则从 prompt 剥离 → 触发词自锁死环；灵异对抗判定触发词在最需要的回合（接触媒介/进鬼域）不出现

### A2 新增 Low

- [ ] **L5** schema.json 为有损投影：丢 default/0-100 夹取/`revive_streak` 下界（`z.toJSONSchema({io:'input'})` 局限）→ 以 schema.json 做校验会放过越界值；文档化或换 dump 方式
- [x] **L6** `对话示例/0.txt:1` `<<START>` → `<START>` — **BF4**
- [x] **L7** initvar `姓名`/`开局地点` 改为 `''`（随 C1）— **BF0**
- [x] **L8** 对话示例 `类型:"medium"`→`investigate`；摘要死亡风险改为「低」— **BF5**
- [ ] **L9** 版本叙事脱节：更新日志停 v0.0.1，与 dev `2.0`/发布 `8.13.13`/cache `v81313` 四套并存
- [ ] **RM7** #14/#15（JSONPatch/draft/pacing_rules/修改确认）只有显示隐藏、无 prompt 去除、hotfix 也不洗 → 残渣全深度回传 AI（token 膨胀+固化坏习惯）
- [ ] **RM8** #10/#11 与 hotfix L491/L493 逐字符重复清洗：维护时两处清单必须同步（RH6 即不同步后果）；注释互指
- [ ] **RM9** #3/#4 召回清洗 `$` 兜底：截断注入时删到消息尾
- [x] **WM7** `音乐盒诅咒` 伪路径改 `灵异资源.灵异物品` — **BF4**
- [x] **WM8** 7 孤儿文件头加「维护/勿接入运行时」— **BF4**
- [ ] **DL4** chronicle 修订三方矛盾：模板 note 禁 updateNode vs adapter 放行正文 updateCell vs verify 断言修订通过 → 契约文字与实现择一
- [ ] **DL5** [App.vue] `nextClueCode='C'+messageId%10000` 可撞 AI 已建编号 → duplicate-insert 静默覆盖旧线索
- [ ] **DL6** 驾驭厉鬼/收录档案/收录规律三表模板无 SQL 示例（其余 11 表有）→ AI 生成列序无锚
- [ ] **SL2** `openDashboard({welcome:true})` 参数被实现丢弃（签名无参），welcome 分支行为不存在（SM3 修时一并）
- [ ] **SL3** 开局杂项：App.vue 身份词表不识别 sp_start 轨身份（全落 default）；`getValue('ghostName')` 查不存在选择器；锚点空地点回退文案自相矛盾

### A2 新增门禁（BF5 落地，对应盲区）

- [x] **G1** dist 新鲜度：publish-card 前置校验 — **已落地** `scripts/verify-mfrs-dist-freshness.mjs`
- [x] **G2** initvar↔schema 结构校验 — **BF5** `scripts/verify-mfrs-initvar-schema.mjs`
- [x] **G3** 正则 id 唯一性 + 查找表达式可编译 — **BF5** `scripts/verify-mfrs-regex-ids.mjs`
- [x] **G4** release-png ↔ publish-card 对账 — **BF5** `scripts/mfrs-release-constants.mjs` + `--from-publish-card`
- [x] **G5** 输出清洗门禁扩样例 — **BF5** `verify-output-cleaning-regressions.mjs`

---

## 建议实施阶段（可拆 PR，A2 修订版）

| Phase | 任务 ID | 产出 |
|-------|---------|------|
| **BF-1（完成）** | C7 + G1 | **8.13.14** `@d5cd98f` / release `de29b4a`；G1 门禁已挂 publish-card |
| **BF0（源码已落）** | C1 + C2 + M6 + H1 + H3 + D1 + M11 + L7 | initvar/schema/规则/系统提示已改；待 commit + 下次 publish |
| **BF0.5（决策）** | H10 | App.vue 去留（决定 D3/H2.2/DM9/DL5 修复对象） |
| **BF1** | C3 + C4 + H9（含打包卡处置） + L1 | 加载/pin/打包（C5 已改误报关闭，仅余 stub 清理） |
| **BF2** | C6 + H4–H8 + R1–R3 + RH2 + RH6 + RM3–RM6 | **已发 8.13.18**（`dc27b52`） |
| **BF3** | D2–D3 + DH* + DM7 + S1 + SH6 + SH* | **已发 8.13.19**（`5b10525`） |
| **BF4** | W1–W4 + WM3–WM8 + M1–M4 + RH1 + DH2 + SH5 + C5 + L6 | **已发 8.13.20**（`de42f2c`）；余 RM7–9/DM9/DL*/WM1–2 可挂 BF5 |
| **BF5** | 回归门禁 + G2–G5 + DM8 + WM1/2/L8 | **门禁完成**；`pnpm verify:mfrs-gates`；可选 8.13.21 交付文案 |

---

## 门禁 / 回归（修完对应项后跑）

- [ ] `node scripts/verify-mfrs-mvu-hotfix-regressions.mjs`
- [ ] `node scripts/verify-output-cleaning-regressions.mjs`（含英文正文/思维链/选项标题用例）
- [ ] `node scripts/verify-table-change-adapter.mjs`
- [ ] `node scripts/verify-mfrs-release-png.mjs`（发版时；regex=33 若改 id/启用需同步门禁）
- [ ] 实机：新开局校验 → 一轮生成 → A–D → 发送不卡 → DB 全局/事件镜像正确 → 英文正文不被正则吃掉

---

## 审计覆盖状态

| 区域 | 状态 |
|------|------|
| 脚本 / MVU / EJS / 系统提示词 | **已审**（一轮）→ C/H/M/L |
| 正则 33 / SQL 14 表 / 开局欢迎 / 世界书规则与锚点路径 | **已审**（二轮）→ R/D/S/W |
| 厉鬼/人物/地点/势力**全文剧情质量** | **未审**（非功能路径） |
| 实机全量回归 / 多 ST 版本 / 性能安全 | **未审** |

---

## BF5 上线后审查（2026-07-13，8.13.21 只读双路复核）

两路独立只读审查（主会话 + 子代理）结论一致：**8.13.21 可安全上线**。

- Git：本地仅 behind origin/main 1 个 `[bot] bundle`（可 FF）；工作树 dev PNG 哈希 = origin/main 完全一致（bot 产物，非手改）；无未提交业务代码。
- 变更面（`d2f8ae7..077b0b2`）：仅门禁脚本 G2–G5/DM8 + 3 处文案（WM1/WM2/L8）+ pin 更新；`table-change-adapter.ts`/`schema`/`initvar` 本体未改。
- 硬约束 4 条全未破坏：脚本库 8 项仅 pin 更新（名称/id/启用/顺序不变）；正则 33/33；PNG 只走 publish-card；无自动发送。
- 门禁：`pnpm verify:mfrs-gates` 6/6 PASS（release-png：version=8.13.21 refs=7 cache=8 regex=33 scripts=8）。
- L8 示例 `medium→investigate`/`死亡风险未结算→死亡风险低`：`类型`=`z.string()`、`死亡风险`枚举含"低"，均不会被 schema strip。

### 新增流程/门禁质量项（非阻塞）

| ID | 严重度 | 位置 | 现象 | 修复方向 | 状态 |
|----|--------|------|------|----------|------|
| **P1** | Medium | `scripts/publish-card.mjs` | release-png 门禁未被 publish-card/CI 调用，仅靠人工跑 `verify:mfrs-gates`；publish-card 仅内联调 G1 dist-freshness。理论上可 publish 出 ref/cache 未对齐的 PNG 而不被自动拦截 | build 后追加 `verify-mfrs-release-png --from-publish-card` 的 spawnSync 硬门禁，与 G1 同级 die-on-fail | **done（BF6）** — `verifyReleasePng(card)` 每卡 bundle 后调用，错 ref→exit1→die；dry-run/no-bundle 跳过 |
| **P2** | Low | `scripts/verify-mfrs-release-png.mjs:47-56` | `--from-publish-card` 为自证式校验：能抓 PNG 陈旧，但常量本身写错抓不出（G4 单真源固有局限） | 可选：额外校验 CDN_REF == HEAD/dist 实际 commit | **done（BF6）** — 改为**软警告**（不 fail）：pin≠HEAD 时报落后提交数+非 bundle 数；硬校验会误伤"发版 pin 后又 bot bundle"正常态，故软化 |
| **P3** | Low | `scripts/verify-mfrs-initvar-schema.mjs:60-66` | `$ref` 子节点 `resolved=null` 直接跳过；将来 initvar 实例化 `$ref` 嵌套对象时会假阴（误判"未知路径"） | schema 含 `$ref` 时先解引用 `$defs` 再收集键 | **done（BF6）** — 加 `resolveRef`（本地 `$defs`/`definitions` 指针+防循环）；当前 $defs 均标量无行为变化，属前瞻防御 |
| **P0** | Low | `package.json` `verify:mfrs-dist-freshness` | 该 script 未带 `--ref`，独立/CI 裸跑在参数校验阶段即报错；且脚本内部 `runProductionBuild()` 会触发 `pnpm build`，非只读 | 说明其为 publish-card 发布时守卫（非独立门禁），或补默认 `--ref`+`--no-build` 只读模式 | **done（BF6）** — 加 `--no-build` 只读模式；`--ref` 默认回退 CDN_REF；package script 带 `--no-build`；publish-card 仍走完整 build 校验。**副产**：只读模式揭示 HEAD dist≠pin dist（纯 webpack module-id `672↔248`，功能等价，Low/无害） |

> 备注：P0/P1 同域（发布链门禁接入不完整）。release-png 是唯一能拦"PNG 与 pin 不一致"的守卫，却不在自动发布路径上——建议 8.13.22 顺带流程加固。

---

## 明确不在本清单（除非另开）

- 世界书剧情正文润色、厉鬼档案扩写（文案质量）  
- 新增业务玩法字段（C2 仅补**已声明**契约字段）  
- 手改发布版 PNG（禁止；只走 `publish-card`）  
- 改脚本库 8 项顺序/启用/名称（C5 误报已关闭；仅剩 stub 目录清理）  
- 无故重开 `#18/#24/#30` 正则（OFF 正确；**#31 移出本条** → 见 RM5 复核：关闭造成流式裸露间隙）

---

## 变更记录

| 日期 | 说明 |
|------|------|
| 2026-07-12 | 初版：脚本/MVU/EJS/系统提示词（C/H/M/L） |
| 2026-07-12 | 二轮：正则/SQL/开局/世界书（R/D/S/W）入清单 |
| 2026-07-12 | 整理：总览索引、合并关单、补 DL/DM5–6/SL1 |
| 2026-07-13 | **三轮 A2**：7 轨盲审差分入库——新增 C7/H10/RH6/SH6/M11 + 32 项 + 门禁 G1–G5；修正 C4 降级、C5 误报关闭、M6/L1 升级、W1 休眠标注、多项证据扩容 |
| 2026-07-13 | **BF-1 关单**：C7+G1 → 8.13.14（`d5cd98f`/`de29b4a`，分支 `codex/bf1-recovery`，待合 main） |
| 2026-07-13 | **BF5 上线后审查**：8.13.21 双路只读复核通过（6 门禁全绿/硬约束未破坏）；新增流程门禁质量项 P0–P3（release-png/dist-freshness 接入 + $ref 假阴 + 自证式局限） |

*关联：`TASKLIST_BETA.md`、`RELEASE_8.13.14.md`、`task_plan.md`。*
