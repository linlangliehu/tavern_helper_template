# 版本更新日志

本文档记录《神秘复苏模拟器》角色卡的版本历史和重要更新。

## [v8.15.34] - 2026-08-21

### 优化
- **HUD 系统面板「全库工具」按钮组改为可折叠**：系统面板底部的「打开全库编辑」「全库 · 总览页」「全库 · 召回页」「全库 · 一致性」四个按钮从平铺布局改为 `<details>` 折叠块（标题「全库工具」），默认收起仅占一行，点击展开后显示按钮组。减少日常游玩时的误触，同时保留全部原有功能入口。新增配套 CSS（`mfrs-hud-system-fold` 样式：顶部分隔线、折叠摘要与主体的内边距/字号规范）。

## [v8.15.30] - 2026-08-20

### 修复
- **MVU「假性已应用」stat_data 重载退回初值**：重载后 `message.extra._mfrs_raw_protocol_applied_hash` 标记留存，但 MVU `stat_data` 退回 schema 初值（风险值=0、收录档案空），hotfix 命中标记 → 永久跳过写回 → stat_data 卡死在初值，下游记忆面板"暂无记录"、HUD 风险显示 0。两层修复：
  - **层面 A — 阻止新增假性已应用**（`hotfix-generation-ended-listeners/index.ts` `parseAndWriteMvuMessage` 跳过分支前 pre-check）：标记命中时调 `isFalselyAppliedStat` 判定，仅当协议含白名单 delta≠0（`/风险值`、`/厉鬼复苏程度`、`/驭鬼者状态/总复苏风险`，schema default 均 0）且字段仍为 0 时清标记、落到正常写回；真·已应用楼层（字段已有累积值）维持原跳过，不重复写回、不重复累积。
  - **层面 B — 修复历史假性已应用**（新增 `repairFalselyAppliedFloors` + `CHAT_CHANGED` 监听）：切卡/重载后扫全楼层，只对"标记在且假性"的楼层调 `parseAndWriteMvuMessage` 重写，跳过最后一条 AI 楼避免与正在进行的 `GENERATION_ENDED` 竞态；首装时（`installHotfix`）也跑一次扫描。
- 新增辅助函数 `isFalselyAppliedStat` + `extractWhitelistedDeltaPatches`（白名单 delta 提取，复用 `applyRawProtocolToMvuData` 的 `<UpdateVariable>/<JSONPatch>` 解析口径）。写回链路只读 `<UpdateVariable>` 协议 + `stat_data`，不读不写 `mes`/预设标签，不影响预设。

## [v8.15.28] - 2026-08-20

### 修复
- **抽卡物品「使用」按钮不消耗物品**：现场档案/抽卡结果卡片的「使用」按钮原先只加收录进度并填入提示词，使用后物品仍保留可重复使用。新增 `consumeGachaItemFromStatData` 按 schema 契约消耗：knowledge 从 `stat_data.收录规律` 移除对应行、clue 从 `可见档案.未验证猜测` 移除字符串、supernatural 扣减 `灵异资源.灵异物品` 剩余次数（归 0 移除）。消耗走权威写回 `writeStatDataToMvu`（读旧→改→replaceMvuData→读回校验→chat.variables 兜底），失败仅降级不阻断收录进度与提示词。
- **数字格式剩余次数漏消耗**：schema `剩余次数: z.union([z.number(), z.string()])` 允许数字和字符串两种格式，AI/开局写入数字 `5`、抽卡同步写字符串 `"5次"`。原消耗逻辑只 `match(/^(\d+)次$/)`，数字 `5` 被当无限使用跳过永不消耗。修复 supernatural 分支先判 `typeof === 'number'` 直接 `rawUsage - 1`（保持数字格式），再回退字符串 `"N次"` 逻辑。

### 新增
- **现场档案「使用」按钮 UI**：左栏现场档案新增「持有物品」区块，展示抽卡所得的灵异物品/收录规律/线索与猜测三类，每项带「使用」按钮。点击弹出居中弹窗选择目标厉鬼档案，选定后写库（knowledge 更新已知规律+档案完整度；clue 加收录进度）并填入提示词同步 AI。
- **抽卡结果卡片「使用」按钮**：`showGachaResult` 每张结果卡片底部新增「使用」按钮，复用同一弹窗与消耗链路（`openItemUseDialog` → `executeItemUseOnGhost` → `fillChatInputForItemUse`），作为即时入口与兜底。
- **`MFRS.consumeItem` API**：对外暴露物品消耗入口，供消息内面板使用按钮调用。
- **灵异物品剩余次数显示**：现场档案灵异物品行新增「剩余次数」标签（名称+类型+次数+效果）。

## [v8.15.26] - 2026-08-19

### 修复
- **HUD沉浸模式提示词编辑弹窗关闭按钮被遮挡**：`#completion_prompt_manager_popup_edit` 在 HUD 沉浸模式下被 `#mfrs-hud-shell`（z-index: 10000）遮挡，导致编辑弹窗底部的关闭/保存/重置按钮无法点击。修复方式：将 `#completion_prompt_manager_popup_edit` 加入 HUD yield 抬升选择器列表（z-index: 10080）、`isHudCoverableExternalOverlay` 白名单（放宽 position: static 门槛）和 `collectHudCoverableOverlays` 扫描列表，确保编辑弹窗打开时自动触发 yield 并被抬升到 HUD 之上。

## [v8.15.24] - 2026-08-18

### 新增
- **拓本图录表（sheet_rubbing_collection）**：适配开局厉鬼"鬼拓本"，记录鬼拓本接触厉鬼规律、受害痕迹、灵异媒介或鬼域残留后拓印的规律及其融合/分解状态。新增 schema `RubbingEntrySchema`、SQL 模板第 15 张表、数据库前端召回规则、记忆编辑器配置和 table-change-adapter 禁删保护。
- **鬼档案核心机制**：玩家选择"鬼档案"作为开局厉鬼时，鬼档案自动出现在收录档案中（收录进度 100），收录进度达 100 后触发复苏转移（鬼档案死机，复苏代价由已收录厉鬼承担）。变量更新规则新增完整鬼档案机制章节。
- **协议重建（从摘要重建 UpdateVariable）**：当 AI 消息缺少 `<UpdateVariable>` 但包含【本轮摘要】时，`reconstructUpdateVariableFromSummary` 自动从摘要提取位置、状态、风险数值并重建最小 JSONPatch 协议块，避免变量冻结。

### 变更
- **移除 `<choices>` 协议**：选项的显示和交互改由预设或前端负责，AI 不再输出 `<choices>` 标签。`<UpdateVariable>` 中仍必须 replace `/行动建议` 保持 MVU 变量一致。系统提示词、世界书规则（必须输出推演选项、数据库联动、事件 MVU 联动、死亡裁定、灵异判定路由、灵异对抗判定、短标签字段协议）、对话示例均已同步移除 `<choices>` 引用。
- **界面美化精简**：移除全局主题覆盖（body/top-bar/send_form/left-nav/scrollbar/selection），改为 CSS 变量适配酒馆主题（`var(--SmartThemeTextColor)` / `var(--SmartThemeBodyColor)` / `var(--SmartThemeQuoteColor)`），仅保留 MFRS 专属组件样式。
- **App.vue 状态栏主题适配**：硬编码颜色改为 `var(--mfrs-*)` 语义变量，复用酒馆主题色。
- **欢迎页主题适配**：开局欢迎页 CSS 变量改为 `var(--SmartThemeBodyColor)` / `var(--SmartThemeTextColor)` / `var(--SmartThemeQuoteColor)` fallback。
- **灵异物品格式规范化**：`/灵异资源/灵异物品` 每项必须为对象 `{ 名称, 类型, 剩余次数, 效果, 副作用 }`；黄金写入 `/灵异资源/黄金储备` 字符串。
- **数据库联动规则**：14 表→15 表，新增拓本图录镜像职责；行动建议不再要求与 `<choices>` 一致，改为与 MVU `/行动建议` 一致。

### 修复
- **门禁同步**：recallTableRules 期望值 10→11、模板表 14→15、schema 根键 36→37、archive-ui actions 渲染断言更新（actions slot 清空 + actions host 隐藏，选项由预设负责）。

### 验证
- ✅ `pnpm verify:mfrs-source-gates` 13/13 全绿
- ✅ 真页运行时验收：CDP 9225 确认 HUD 沉浸模式左右面板渲染正常（左栏 9 区块、右栏 7 导航、状态卡片完整、抽卡宿主就绪）

## [v8.15.20] - 2026-08-15

### 修复
- **JSONPatch 写回改为本地 applier 唯一权威**：v8.15.18 的 fallback 只在 `parseMessage` 完全无变化时才触发，覆盖不到「部分成功」的情况。真实对话证明：当 `stat_data.规律推理记录` 含 `是否触发规律` 字段时，`Mvu.parseMessage` 会让 replace/insert 生效而静默丢弃 delta，`hasSameStatData=false` 导致 fallback 不触发，复苏风险与死亡风险因此永远无法累积。修复方式：`<UpdateVariable><JSONPatch>` 一律经本地 `applyRawProtocolToMvuData` 写回，不再调用 `mvu.parseMessage`。
- **尾随空 AI 楼层导致协议漏处理**：`GENERATION_ENDED` 偶发指向真实回复之后追加的空 AI 楼，使前一楼的协议既未快照到 `extra` 也未从 `mes` 清洗，正文还会被空楼遮蔽。新增 `resolveProtocolMessageIndex` 回溯相邻协议楼层，并由 `removeTrailingEmptyAiPlaceholder` 在严格 guard 下删除该占位楼。
- **协议应用幂等**：按 `swipe:FNV1a(协议文本)` 指纹标记，同一协议只应用一次；marker 仅在写回验证通过后落盘，保存失败只重试保存、不重复应用 delta。

### 验证
- ✅ 门禁全绿（新增真实 36 根 `initvar` fixture 与混合 patch 回归、权威路径/幂等静态断言、四类 mutation proof）
- ✅ 真页真实对话验收：混合协议 `25+60=85` / `25+65=90`；终局 `99+11=100`，`状态=厉鬼复苏`、`is_dead=true`、`阶段状态=模拟结束`、`行动建议=[]`
- ✅ 生命周期验收：注入空占位楼后自动删除（9→10→9），终局变量与协议指纹不变
- ✅ 幂等验收：重复 `GENERATION_ENDED` + 250/1000/2500ms 重试 + `saveChat` + reload 后终态不变

## [v8.15.18] - 2026-08-15

### 修复
- **MVU `<UpdateVariable>` 楼层写回根因修复**：`Mvu.parseMessage` 只能解析 MagVarUpdate 原生宏指令格式（`/set`、`/delta`），无法识别本项目使用的 `<UpdateVariable><JSONPatch>` 格式，导致每次返回 `clone(oldData)`，`hasSameStatData=true` 后静默跳过，所有楼层变量永不更新。修复方式：当 `parseMessage` 未产生有效变化时 fallback 到本地 `applyRawProtocolToMvuData` 直接应用 JSONPatch。
- **MVU 写回重试幂等门禁**：验收中发现 `runGenerationEndedPipeline` 原先无条件调用 `scheduleMvuWriteBackRetries`，每次重试都重新 apply delta → 重复累积。修复：`parseAndWriteMvuMessage` 改为返回 `Promise<boolean>`，仅 `verified=false` 时返回 `true`，调用方按返回值决定是否调度重试。

### 验证
- ✅ 门禁全绿（新增 P3-S1/S2/S3/I1/I2/B1/B2/B3 共 8 条断言）
- ✅ 真页零 LLM 成本验收（注入测试协议块，delta +10 写回正确，3 次重试后不重复累积＝10，幂等通过）

## [v8.15.14] - 2026-08-14

### 修复
- **HUD 数据库回调按 API 实例自愈重绑**：修复数据库 loader 热重载替换 `AutoCardUpdaterAPI` 后，消息内面板 HUD 永远收不到新实例表更新通知的问题。`registerHudDatabaseUpdateCallback` 从布尔标记改为按 API 实例绑定，实例替换时自动从旧实例解绑再绑新实例。`refreshAll` 同步自愈回调注册并强制刷新 HUD。

### 验证
- ✅ 门禁全绿（含 archive-ui phase5 242 checks，新增 G8aa 检查项验证 API 实例替换自愈重绑）
- ✅ 源码门禁 20 项全绿

## [v8.15.12] - 2026-08-14

### 修复
- **native 冷启动物化固定表 seedRows**：修复 native 模式新聊天首轮固定表（全局状态/玩家状态/行动建议/检定建议）未物化模板预置行导致 `ROW_NOT_FOUND` 的问题。根因是 `NativeTableServiceAdapter.loadFromChat` 只委托 `loadOrCreateJsonTableFromChatHistory_ACU`，而模板预置行被 `parseTableTemplateJson_ACU({stripSeedRows:true})` 剥成 header-only + `table.seedRows` 字段挂载，content 不含预置行。在 vendor native provider 加载层补种：全新聊天物化全部固定表；部分历史只补缺表；已有行不覆盖、重复加载不重复插入、用户清空的 header-only checkpoint 不复活。

### 验证
- ✅ 新增 `verify-mfrs-native-seed-rows.mjs` 行为门禁（6 用例：initialized/partial/idempotent/cleared/existing/provider-isolation）
- ✅ Mutation proof：破坏物化条件和 marker 接线两种 mutation 均导致门禁失败，恢复后 PASS
- ✅ 真页验收（开发版）：四表行数 1/1/4/5 正确物化，row_id 序列 1..N，无 ROW_NOT_FOUND

## [v8.15.10] - 2026-08-14

### 修复
- **事件纪要正文污染防御**：阻止事件纪要正文被特殊编号值覆写，并移除自动编号识别失败时猜测最后一列的危险回退。
- **AI 写表约束补强**：补充 14 张表的中文列名、枚举白名单及事件纪要正文写入规则，降低列名和约束错误。
- **表名前缀兼容**：兼容提示词中的「序号:表名」格式，仍要求剥离后匹配真实表名。
- **写入审计与 DDL 防御**：增加 native 写入守卫、AutoCardUpdaterAPI 写入审计探针，并修复空 DDL 覆盖模板 DDL 的问题。

### 验证
- ✅ 源码门禁全绿：initvar-schema / regex-ids / MVU / output-cleaning / table-change / archive-ui / raw-status-fallback / chronicle-runtime / db-rules-prompt / storage-provider-mode-guard / sqlite-cold-start
- ✅ 发布卡门禁通过：release-png（CCV3、版本号、CDN 引用、缓存版本、正则 ID）

## [v8.15.6] - 2026-08-13

### 修复
- **SQLite 新开卡首轮丢写五层修复链**：热路径 loadFromChat 补建模板缺失表；CRUD 预检为快照缺失的模板表补表头壳；chat_override 模板应用后强制重建 SQLite 物理库；CoreMirror 固定表 ROW_NOT_FOUND 降级 insertRow 补种；vendor 四个 CRUD 写路径表解析自愈（运行时视图收窄时按模板补建重试）。新开卡首轮 14 张表全部可写，控制台不再出现 TABLE_NOT_FOUND/ROW_NOT_FOUND。
- **线索编号补零**：CoreMirror 生成的 clue_code 补零到 C0000 格式，满足线索表 CHECK 约束。

## [v8.15.0] - 2026-08-12

### 新增
- **人物/地点 stat_data 镜像**：人物、地点不再依赖 ACU 填表独立 API 入库，改为每轮从本轮 `<UpdateVariable>` 的 `stat_data` 直接镜像
  - 人物来源 `stat_data.在场人物`：按「姓名-身份」解析，按 `姓名` 业务键**只补新行**；已存在行（ACU/用户已有详细情报）一律跳过，不覆盖
  - 地点来源优先级 `发生地点 > 所在位置 > 开局地点`，按 `地点名` 业务键去重；`鬼域状态=已确认` 映射为 `灵异状态=鬼域影响`
  - 新行使用保守占位值（阵营/生死/能力/关系=未知、在场状态=在场），避免对剧情人物作错误断言
- **镜像门禁**：新增 `verify-mfrs-mvu-core-mirror.mjs`，覆盖姓名解析、去重、已存在跳过、占位字段合法性与鬼域映射

### 验证结果
- ✅ 门禁全绿：initvar-schema / regex-ids(33) / mvu-hotfix / output-cleaning / table-change / archive-ui(241) / raw-status-fallback / mvu-core-mirror
- ✅ 真页验证（开发版）：GENERATION_ENDED 后全局状态/玩家状态/行动建议随本轮 stat_data 更新；已有 ACU 人物不被镜像占位覆盖；HUD 正确显示线索/厉鬼档案/人物/地点

---

## [v8.14.0] - 2026-07-19

### 新增
- **抽卡系统直达中栏**：点击右侧「抽卡」导航后，中栏正文直接切换为「神秘复苏抽卡系统」完整功能面板，不再显示摘要 + 单抽/十连简版 + 「完整面板」二次入口
  - 新增 `MFRS.mountPanel(container, { onClose })` 嵌入式挂载 API，返回 `{ root, destroy }` 所有权句柄
  - `MFRS.showPanel()` 保留为兼容入口（body overlay）
- **默认/沉浸双向模式切换**：默认三栏视图新增可见「沉浸模式」按钮；沉浸 HUD 顶栏保留「默认模式」按钮，两者均支持 `Ctrl+Shift+G` 快捷键
- **简化开发流程**：新增单人开发简化工作流（固定端口 5510 + 直接切换 YAML 开发/生产模式），保留 F5 便利性、发布门禁与 CDP 调试

### 变更
- 移除沉浸 HUD 左栏「打开全库 · 玩家状态」按钮（保留玩家状态表、镜像与其他全库入口）

### 技术细节
- Cache version: `v81400_20260719_01`
- 主要文件：`src/神秘复苏模拟器/脚本/消息内面板/index.ts`、`src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js`

### 验证结果
- ✅ 门禁全绿：initvar-schema / regex-ids(33) / mvu-hotfix / output-cleaning / table-change / archive-ui(237) / release-png
- ✅ 真页验证：抽卡系统完整融入中栏，无独立弹窗；默认↔沉浸模式切换正常

---

## [v6.28.3] - 2026-06-22

### 修复
- **优化协议块清洗时机**：确保内存与界面同步
  - 新增 `MESSAGE_RECEIVED` 监听器，在消息保存到 chat 时立即清洗协议块
  - 保留 `GENERATION_ENDED` 中的 MVU 解析和防御性二次清洗
  - 解决了界面显示已清洗但内存仍含协议块的问题

### 技术细节
- CDN ref: `@1861e16`
- Cache version: `phase164-4-0-final-baseline-6-28-p5-4-hotfix13`
- 修改文件: `src/神秘复苏模拟器/脚本/hotfix-generation-ended-listeners/index.ts`

### 验证结果
- ✅ 界面显示无协议块泄漏
- ✅ 数据库 11/14 张表成功写入（78.6%）
- ⚠️ 3 张表损坏（灵异物品、收录规律、事件纪要）为已知问题

---

## [v6.28.2] - 2026-06-22

### 修复
- **固定状态栏初始化失败**
  - 移除 jQuery `$(callback)` ready 回调封装
  - 改为脚本加载时立即执行 `retryMount()`
  - 解决动态加载脚本时页面已 ready 导致回调不触发的问题

### 问题背景
- Console 重复警告 `[MFRS Fixed Status] 找不到输入区容器，稍后重试`（15+ 次）
- 状态栏 DOM 结构正确但未实际渲染

### 技术细节
- CDN ref: `@d4b1d23`
- Cache version: `phase164-4-0-final-baseline-6-28-p5-4-hotfix13`
- 修改文件: `src/神秘复苏模拟器/脚本/固定状态栏/index.ts`

---

## [v6.28.1] - 2026-06-22

### 修复
- **放宽事件纪要 CHECK 约束**
  - `chronicle_text` 字段最小长度从 200 字放宽到 20 字
  - 解决 AI 输出过短文本时 SQLite 拒绝写入的问题

### 问题背景
- Console 警告：`表 sheet_chronicle (事件纪要) 第 1 行 chronicle.chronicle_text 长度无效（当前 6 字，要求 200-600 字）`
- AI 可能输出简短的代号或编号（如 "A-001"），不符合原 200 字要求

### 技术细节
- CDN ref: `@f3b60c9`
- Cache version: `phase164-4-0-final-baseline-6-28-p5-4-hotfix13`
- 修改文件: `vendor/shujuku-sp-fork/index.js`（DDL 定义）

---

## [v6.28.0 系列] - 2026-06 P5 线

### 核心修复：hotfix-generation-ended 监听器补丁

#### 问题背景
- MagVarUpdate bundle 和数据库自动更新逻辑未注册 `GENERATION_ENDED` 监听器
- AI 生成完成后 MVU 未消费 `<UpdateVariable>` 块
- 数据库未自动填表

#### 修复方案
1. 监听 `GENERATION_ENDED` 事件
2. 触发 MVU 解析当前消息的 `<UpdateVariable>` 块
3. 触发数据库自动更新逻辑
4. 清洗 mes 字段，移除 `<UpdateVariable>` 和 `<choices>` 块

#### 技术细节
- 新增文件: `src/神秘复苏模拟器/脚本/hotfix-generation-ended-listeners/index.ts`
- 注册双路径监听器：
  - `eventSource.on('GENERATION_ENDED', handleGenerationEnded)`
  - `hostWindow.eventOn(tavern_events.GENERATION_ENDED, handleGenerationEnded)`
- 等待依赖初始化：最多 30 次 × 500ms = 15 秒

---

## [v0.0.235] - release-chronicle-guard

### 新增功能：事件纪要追加式守卫

#### 保护规则
- ❌ 禁止 DELETE 已有纪要行
- ❌ 禁止改写已有行的 `code_index`
- ✅ 允许 INSERT 新行
- ✅ 允许 UPDATE 已有行的其他字段（title、chronicle_text、remarks）

#### 技术架构
- **CRUD Plan 层**：`table-change-adapter.ts` 的 `validateChronicleAppendOnly()`
- **SQL 层**：`vendor/shujuku-sp-fork/index.js` 的 `validateChronicleAppendOnlyInMutationStatements_ACU()`
- **双路径保护**：即使 CRUD Plan 被绕过，SQL 层仍会拦截

#### 测试覆盖
- ✅ 回归测试：`scripts/verify-table-change-adapter.mjs`
- ✅ SQL 调试回归：`scripts/verify-sql-debug-regressions.mjs`
- ✅ Player state scope 隔离回归

#### 技术细节
- PR: #15 `chronicle-append-guard`
- Merge commit: `dbcbdd9`
- Tag: `v0.0.235`
- Bot bundle: `8fdcc4a`
- CDN ref: `@8fdcc4a`
- Cache version: `phase164`
- Marker: `mfrs-4-0-final-baseline-6-28-p5-4-hotfix13`

---

## [v0.0.234] - b-sql-regr-fix

### 修复：SQL 回归测试失效断言

#### 问题背景
- hotfix13 的 `9954c98` 移除了 p5.4 fallback 机制
- 但 `testCrudPlanDiffTrackingGuards` 中仍有 23 处断言依赖该机制
- 导致回归测试失败

#### 修复内容
- 删除 23 处失效断言
- 保留 7 处仍有效的断言
- 对齐旧名到 vendor 现名

#### 技术细节
- PR: #14
- Merge commit: `8fdcc4a`
- Bot bundle tag: `v0.0.234`
- 修改文件: `scripts/verify-sql-debug-regressions.mjs`（1 文件 +5/-102）

---

## [v0.0.233] - chronicle 守卫 source 提交

### 技术细节
- Bot bundle commit: `aff097f`
- Tag: `v0.0.233`
- 基于 PR #13 的 source 提交
- Dist 由 bot 自动重建

---

## 历史版本（6.3 - 6.27）

详细链路保留在 `findings.md` 的版本变更保留表和历史归档中。

### 主要修复
- Task 20 协议块泄漏修复
- 开局表单锁定修复
- 事件纪要落库收口
- SQL 兜底限流
- SQL 参数/边界/约束修复
- R2SQL（规律到 SQL）转换优化

### Phase 标记
- `phase115` - `phase164`：多个迭代版本
- 最终稳定在 `phase164-4-0-final-baseline-6-28-p5-4-hotfix13`

---

## 已知问题

### 数据库相关
1. **3 张表初始化损坏**（长期）
   - 灵异物品、收录规律：vendor 初始化 bug，表头被截断为 `["row_id"]`
   - 影响：可选功能不可用，但不影响核心游玩流程
   - 状态：已记录为长期任务（task_plan.md 任务 E）

2. **事件纪要 CHECK 约束过严**（已在 v6.28.1 修复）
   - ~~原约束：200-600 字~~
   - 新约束：20-600 字
   - AI 可能输出简短代号（如 "A-001"）现已支持

### 固定状态栏
- **初始化失败**（已在 v6.28.2 修复）
  - ~~动态加载脚本时 jQuery ready 回调不触发~~
  - 改为立即执行初始化

### 协议块清洗
- **内存与界面不同步**（已在 v6.28.3 修复）
  - ~~界面美化脚本只隐藏 DOM，未写回内存~~
  - 新增 MESSAGE_RECEIVED 监听器立即清洗

---

## 升级指南

### 从 v6.27 或更早版本升级到 v6.28.3

1. **下载最新角色卡**
   - 从 `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png` 获取最新版本

2. **重新导入角色卡**
   - ⚠️ **不要**直接覆盖 `E:/SillyTavern/data/banyan/characters/*.png`
   - ✅ **必须**通过 SillyTavern UI 正式导入
   - 原因：文件级覆盖会导致角色索引、聊天绑定或 runtime 识别异常

3. **验证升级成功**
   - 打开 Console（F12）
   - 查找日志：`[Hotfix] 已注册 MESSAGE_RECEIVED 监听器`
   - 查找日志：`[Hotfix] 已注册 GENERATION_ENDED 监听器`
   - 确认资源加载：`@1861e16`

4. **清理旧数据（可选）**
   - 如果遇到数据库异常，可在 `SP·数据库 III` 中重置模板

### 从 v6.28.0 系列升级到 v6.28.3

小版本升级，直接重新导入角色卡即可。

---

## 技术栈版本

- **前端框架**: Vue 3.5.33
- **TypeScript**: 6.0.0-dev
- **构建工具**: Webpack 5, pnpm
- **数据库**: shujuku-sp-fork (SQLite)
- **CDN**: jsdelivr (testingcf 镜像)
- **CI/CD**: GitHub Actions

---

## 贡献者

感谢所有为本项目做出贡献的开发者！

- 主要开发: linlangliehu
- 数据库引擎: shujuku-sp-fork
- 基础模板: StageDog/tavern_helper_template

---

## 反馈与支持

- **Bug 报告**: 请在 GitHub Issues 提交，附上复现步骤和 Console 日志
- **功能建议**: 欢迎提交 Issue 讨论
- **技术支持**: 参考 `PROJECT_FLOW.md` 和 `4.0功能基线回归清单.md`

---

## 许可证

[Aladdin License](LICENSE)
