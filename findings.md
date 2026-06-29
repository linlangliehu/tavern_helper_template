# Findings

## 2026-06-29：v8.4 输出层职责划分 — 正文摘要 + 数据库前端交互

**用户体验目标：** MUV/MVU 变量仍可占正文内容，但不能占用大量聊天篇幅；正文只保留剧情和 `【本轮摘要】`。完整状态、线索、行动建议、灵异物品和厉鬼档案交给神秘复苏数据库前端展示与交互。

**新职责边界：**
- 正文：剧情 + `【本轮摘要】`，摘要最多 6 行，字段为位置、事件、状态、线索、资源、下一步。
- 后台协议：`<choices>` 和 `<UpdateVariable>` 继续输出，供状态栏/MVU/数据库同步使用，但显示层和生成后清洗应隐藏。
- 数据库前端：负责主要交互。`行动建议` 表行可点“选择”填入输入框；`灵异物品` 表行可点“使用”填入使用物品行动文本。
- 旧面板：`<sp_status>`、`<sp_choices>`、`<sp_clue_deduce>`、`<sp_ghost_encounter>`、`<sp_item_use>`、`<mfrs_*>` 文本判定大面板不再作为正向输出要求。旧内容应由显示正则和 hotfix 清洗整段删除，而不是剥标签保留内部文本。

**实现要点：**
- 数据库前端填充输入框时记录 `_mfrsDbInsertedPrompt`，再次点击会替换上一次数据库前端插入内容，避免连续点击造成输入框无限堆叠。
- 行动建议表同时作为选项面板来源；这不是和 `<choices>` 重叠，而是把后台选项镜像成数据库前端可点击按钮。
- 灵异物品表的按钮根据表头读取 `物品名/物品名称`、`效果/物品效果`、`副作用`、`使用限制`；缺失字段时只生成已知部分。
- 旧 `<sp_*>/<mfrs_*>` 清洗正则必须支持带属性标签并用同名闭合反向引用：`<((?:sp|mfrs)_[a-z_]+)\b[^>]*>...<\/\1>`，否则旧面板带属性时会漏清。

**验证经验：**
- `verify-output-cleaning-regressions.mjs` 的旧断言“sp_choices/sp_status 应渲染”为 v8.4 后的反向要求：旧 sp 面板应隐藏，`【本轮摘要】` 应保留。
- `verify-worldbook-pollution-gate` 对启用条目长度敏感；本轮 `数据库联动规则` 一度到 5870，超过 5851，被压缩回 gate 上限内。
- PNG 元数据 grep 到旧 `<sp_*>` 或 `【推演选项：】` 不一定是正向污染，需区分负向规则、兼容正则、禁用旧模板和开场 `<sp_start>`。

## 2026-06-29：碎片商店 / 自定义编辑器渲染问题根因

**碎片商店无 `frag-buy`：** 后续验证确认不是渲染失败。`showFragmentShop()` 会渲染 27 行物品，但只有“未拥有且碎片余额足够”的商品按钮才带 `data-mfrs-action="frag-buy"`。余额不足时按钮是 disabled 的“残屑不足”，已拥有时是 disabled 的“已拥有”。因此检查商店是否正常渲染不能只数 `frag-buy`，还要数 `.frag-row`、`.frag-buy-btn` 和按钮文本状态。

**自定义编辑器无 `data-mfrs-action`：** 这是事件委托重构留下的真 bug。v8.0 删除了 `bindItemActions()` 函数定义，但 `showCustomItemEditor()` 内还残留两处调用：表单保存后刷新列表、编辑器初始绑定。打开编辑器时抛 `ReferenceError: bindItemActions is not defined`，导致编辑器 DOM 后续未完整渲染，表现为 tab/新增/导出/导入/AI生成按钮和物品列表都缺失。修复方式是删除残留调用，依赖容器级 `editor.on('click', '[data-mfrs-action]', ...)` 委托处理动态列表。

**MFRS API 暴露边界：** v8.2 修复后 API 在脚本执行 iframe 内可用，但主窗口控制台不一定能直接访问。v8.3 将挂载目标改为 `getHost()` 返回的父窗口，同时在 iframe 内回填 `window.MFRS = host.MFRS`，保证父窗口和脚本窗口都能访问同一 API 对象。

## 2026-06-29：事件委托替代逐个绑定 — jQuery .off().on() 重构模式

**背景：** 第四优先级将碎片商店、抽卡面板、自定义编辑器中的 23 个 `.off('click').on('click')` 逐个绑定重构为 `data-mfrs-action` 属性 + 容器级委托 handler。

**重构模式：**
1. **按钮标记：** 给每个可点击按钮加 `data-mfrs-action="action-name"` 属性，替代 id 选择器绑定。
2. **容器委托：** 在弹层容器上挂单个 `container.on('click', '[data-mfrs-action]', handler)`，handler 内用 `$(e.currentTarget).data('mfrs-action')` 或 `e.target` 分发到命名函数。
3. **命名函数提取：** 把内联匿名回调提取为 `doSinglePull`/`doTenPull`/`toggleHistory`/`doExport`/`doImport`/`doAIGen` 等命名函数，委托 handler 只做分发。
4. **`$(this)` 陷阱：** 委托 handler 内 `this` 是匹配的委托元素（非 e.currentTarget），用 `dialog.find('#id')` 显式查找更安全。
5. **动态元素例外：** `showGachaResult` 中的卡片 `$card.on('click')` 和 hover 是每次抽卡后动态创建的元素，不适用 data-mfrs-action（无固定容器），保留为即时绑定。
6. **hover 委托：** 逐行 `$('.custom-item-row').on('mouseenter', ...)` 改为 `editor.on('mouseenter', '.custom-item-row', ...)`，避免每次 tab 切换/导入后重新绑定。
7. **死代码清理：** 重构时移除了 `bindItemActions()` 函数及其所有调用点（tab 切换后、导入后、删除后），以及从未触发的 `#gacha-fragment-shop-btn` handler。

**验证方法：**
- 源码：grep `data-mfrs-action` = 28，grep `.off('click').on('click')` = 0
- dist bundle（minified）：grep `data-mfrs-action` = 25（3 个因 minification 合并），grep `.off('click').on('click')` = 0，grep 委托 handler = 3
- 构建通过 ≠ 运行时正确，事件委托重构后仍需真机回归（点击每个按钮确认分发正确）

**经验：** 事件委托减少绑定数量和内存，但 `$(this)` 语义变化是最容易出错的地方。重构后必须验证每个 action 的分发路径，特别是依赖 `$(this)` 做 DOM 查找的回调。

## 2026-06-28：AI生成在“假流式”自定义 OpenAI 源下必须显式 should_stream=true

**现象：** 发布版 7.4 真页点击自定义编辑器「AI生成」后按钮长时间停在“生成中...”，表单不出现，`TavernHelper.generateRaw:start` 已触发但无 success/error。此前 v7.2 调用层、v7.3 parseLoose、v7.4 字段补全都已发布，问题不在裸调/解析/字段补全三层本身。

**根因证据：**
- 当前 ST API：`mainApi=openai`、`chat_completion_source=custom`、`custom_url=https://gcli.ggchan.dev/v1`、模型 `假流式-gemini-3.1-pro-preview-search`。
- 原生 `ctx.generateRaw` 最小非流式请求发到 `/api/backends/chat-completions/generate`，HTTP 200，但响应为 `choices[0].message.content=""`、`finish_reason:"length"`、`completion_tokens:1`，随后 `script.js:4088` 抛 `No message generated`。
- `TavernHelper.generateRaw` 默认把 `stream` 映射为 `e.should_stream ?? false`；原 AI生成代码没有传 `should_stream`，所以走非流式路径。
- 同一当前 API 源用 `TavernHelper.generateRaw({ should_stream:true, ... })` 可成功返回文本；UI 路径临时强制 `should_stream:true` 后，真实 AI生成成功返回 JSON，表单出现并可保存。

**修复策略：** AI生成按钮调用 `TavernHelper.generateRaw` 时显式传 `should_stream: true`。这与当前“假流式”源的实际能力一致，也避免非流式 quiet/json_schema 路径返回空 content 或悬挂。

**附带字段兼容：** 真机 AI 返回了 `emoji:"🪡"` 而非 schema 里的 `icon`，且漏 `effectDetail`。v7.4 字段补全能防 undefined，但会显示 `❓` 和空 effectDetail。应在数据层补 `emoji→icon` 别名，并在 `effectDetail` 缺失/空白时用 `effect` 回填，保证预填表单更完整。

## 2026-06-28：AI 生成容错三层链路（generateRaw → parseLoose → 字段补全）

**背景：** 任务8 AI 生成自定义物品（`v10_2_visualizer.js` L5514-5693）在真机上连续暴露三层问题，分别由 v7.2/v7.3/v7.4 修复。三层串联才完整，单修任一层都不够。

**三层根因 + 修复：**
1. **调用层（v7.2 `ca4895f`）：** 裸调 `generateRaw({...})` 在 iframe/CDN-script-link 闭包顶层作用域不可达 → `ReferenceError`（被 catch 吞，弹"AI 生成失败: generateRaw is not defined"）。`generateRaw` 是酒馆助手接口（`@types/function/generate.d.ts`），**必须经 `window.TavernHelper.generateRaw`**（或 `parent.TavernHelper`）取引用；`getCore()` 只暴露 `$`/`getDB` 不含 generate 系列。修复：`const th = (window.parent||window).TavernHelper; if (!th||typeof th.generateRaw!=='function') throw...; await th.generateRaw({...})`。**同型经验：** 酒馆助手 `@types/function/*` 接口在 iframe 闭包里都不在顶层可达，一律走 `window.TavernHelper.*`。同时 v7.2 修了货币监听器事件名：`eventSource.on('MESSAGE_RECEIVED',...)` 大写死键永不触发——ST 的 `eventTypes.MESSAGE_RECEIVED` **值是小写** `"message_received"`，emit 用常量值、`on()` 按精确字符串匹配。监听器**永远**用 `eventTypes.XXX` 动态取值，别硬编码大写字面量。
2. **解析层（v7.3 `a9e9425`）：** `generateRaw` 传了 `json_schema`，但后端不一定支持结构化输出，会用 ` ```json ... ``` ` 代码块包裹或在 JSON 前后附带说明文字 → `JSON.parse` 失败。修复：加 `parseLoose`——先剥离围栏正则 `^```(?:json)?\s*([\s\S]*?)\s*```$`，直接 parse 失败再手动扫描提取首个平衡 `{...}` 对象（处理字符串转义/嵌套）。**经验：** 不能假设后端尊重 `json_schema`，AI 输出永远要做宽松解析兜底。
3. **数据层（v7.4 `5f085b3`）：** 解析成功的对象仍可能缺漏必填字段（后端不强制 schema 时 AI 可能漏字段）→ `showItemForm` 把 `existingItem` 当编辑模式渲染，name/icon/effect 三个字段没用 `||''` 兜底，**字面渲染 `undefined`**；rarity select 选错默认项。修复：调 `showItemForm` 前按 schema 补全默认值（name→'未命名物品'/icon→'❓'/rarity 枚举校验降级 COMMON/各文本字段非字符串→''/类型特有 usageLimit→1、duration→'短暂'、progress→0.1 clamp [0.05,0.5]）。**注意 id 已有守护**（L5651-5654 `!item.id || !startsWith('custom_')` → 重生成），补全块不必再加（会成死代码）。

**经验总结：** AI 生成链路要按"调用→解析→数据"三层分别容错，每层独立兜底。真机复测时三层要一起验：点 AI生成 → spinner → **预填表单完整可编辑**（非空白/undefined）→ 保存成功。

## 2026-06-27：抽卡系统“调用未定义函数”系统性 bug（getFragments / showFragmentShop）

**根因模式：** 抽卡系统（`src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js` 抽卡块，约 3950-5450 行）在实现时多处引用了某函数名，但定义用了另一个名、或根本没写定义。webpack production build **不会报错**（未定义的运行时引用在 minify 后才暴露为 ReferenceError），所以“build 通过”不等于“无此 bug”。真机运行时这些 handler 多在 jQuery click 内联里，异常被吞，表现为**按钮点击毫无反应**而非明显报错——必须靠 Chrome DevTools MCP `evaluate_script` 主动 `jQuery('#x').trigger('click')` 捕获，或看 console。

**已知三例（同型）：**
1. `resetGachaPity('rare'|'epic'|'mythic')` — 任务1 已修（添加定义）。
2. `getFragments()` — 正确定义名是 `getGachaFragments`（L4426），3 处调用（L4796 面板渲染 + L5006/5055 抽卡后刷新）。**🎁 面板打开即炸、按钮无反应的直接根因。** 本轮修复：3 处 replace_all 改名。
3. `showFragmentShop()` — 2 处调用（L5018/5131 碎片商店按钮），从未定义。任务3 原描述称有此 UI，实际只有调用无实现。本轮修复：补全商店弹窗（调 `exchangeWithFragments`，按 `GACHA_FRAGMENT.cost` 定价）。

**预防方法（每次改抽卡块后必跑）：** 用 node 脚本全量扫描抽卡块内“非点号前缀的裸函数调用”，与全文 `const/let/function` 定义词典比对，排除：CSS 函数（gradient/rgba/translateY...）、jQuery/数组方法（.find/.on/.push...）、JS 内置（Math/JSON/parseInt...）、关键字。输出“调用 N 次但定义行=❌未定义”的符号即为疑似。本轮扫描最终命中 getFragments / showFragmentShop 两个真 bug（其余 18 个疑似均为误判）。

**排查动作模板：** 真机按钮无反应时 → `mcp__chrome-devtools__evaluate_script` 跑 `jQuery('#btnId').trigger('click')` 包 try/catch → 看 `e.message` + `e.stack`，stack 里的 bundle URL 行号即定位。比翻源码猜快得多。

## 2026-06-26：任务1 完成 - 物品目录双层架构 + resetGachaPity bug 修复

- **任务1 实施完成：** 物品目录外置 + 双层合并架构 + resetGachaPity 未定义 bug 修复。
- **新增文件：** `src/神秘复苏模拟器/数据/gacha-items.json` — 27 件物品定义的 source-of-truth。
- **新增函数：**
  - `resetGachaPity(type)` — 保底重置函数（rare→pity.rare=0，epic→pity.epic=0，mythic→全部重置）。修复前该函数被调用 6 次但全文件无定义，每次保底重置抛 ReferenceError。
  - `getAllGachaItemDefinitions()` — 合并 builtin（只读）∪ custom（localStorage）返回完整物品列表
  - `getCustomGachaItems()` / `setCustomGachaItems()` — localStorage 自定义物品层读写
  - `addCustomGachaItem(type, itemDef)` / `removeCustomGachaItem(type, itemId)` — 自定义物品 CRUD
- **重构函数：** `buildGachaPool()` 改为消费 `getAllGachaItemDefinitions()` 合并后的目录，而非旧硬编码数组。抽卡池权重：SUPERNATURAL 池纯灵异物品；ARCHIVE 池线索权重×2、其余×0.5；PATTERN 池知识权重×2、其余×0.5；ALL 池均匀（基础权重用 item.rarity.probability）。
- **保底机制：** 十连保底必出 ★★★（pity.rare 到 10 重置）、50 抽保底必出 ★★★★（pity.epic 到 49/50 重置）、100 抽保底必出 ★★★★★★（pity.total 到 99/100 重置）。
- **删除代码：** 旧的 SUPERNATURAL_ITEMS / CLUE_ITEMS / KNOWLEDGE_ITEMS 硬编码数组（~370 行），改为注释指向新架构。
- **架构要点（决定 JSON 外置方案）：** visualizer 经角色卡 YAML 的 CDN script-link 加载，不走文件同步（publish-card.mjs syncDirs 不含「脚本」目录），故 builtin 目录必须以 JS 对象字面量内嵌，镜像 JSON 文件供人工编辑。
- **双层合并架构（参考 jerryzmtz/my-tavern-scripts）：** builtin（只读，内置 27 件）∪ custom（localStorage，按 id 覆盖或新增）。GachaItemDefinition schema：`{id,name,type,quality/rarity,description,icon,targetTable,targetColumns,customFields}`，灵异物品额外 `effect/effectDetail/usageLimit/duration`，线索/知识额外 `progress`。任务 6（自定义物品 UI 编辑器）、任务 7（目录导入导出）的架构基础。
- **3 张目标表 DB 列头（syncGachaResultToDatabase 写入依据）：**
  - sheet_supernatural_items: `[row_id,物品名称,物品描述,物品效果,稀有度,使用次数,持续时间,获得途径,备注]`
  - sheet_clues: `[row_id,线索编码,线索描述,相关厉鬼,重要程度,发现时间,获得途径,可见摘要]`
  - sheet_collected_rules: `[row_id,规律名称,规律描述,杀人规律,触发条件,破解方法,完成度,相关厉鬼,可见摘要]`

## 2026-06-25：row_id 问题彻底解决 - 14/14 表全部使用数字 row_id

- **修复根因链路：**
  1. **vendor row_id 自动分配**（commit `52b2e62`）：原生模式下 insertRow 函数检测 `headers[0] === 'row_id'` 且 `newRow[0]` 为空时，自动从现有行中找到 max row_id 并分配 max+1。
  2. **fallback plan 字段名修复**（commit `aa50677`）：`buildMfrsClueFallbackPlan_ACU` 和 `buildMfrsChronicleFallbackPlan_ACU` 使用中文字段名（线索编号、纪要编号、时间跨度等）和 `row_id: 1` 初始值。
  3. **CDN ref 更新**（commit `36082bc`）：`publish-card.mjs` 的 `CDN_REF` 从 `c087823` 更新到 `aa50677`。
  4. **角色卡重新打包**：本地 `npm run build` + `npm run publish-card` 完整构建链路打包包含所有最新修复的角色卡。

- **真页验证结果（2026-06-25）：** 14/14 表 row_id 全部为正常数字，零空字符串。
  - sheet_clues: [1] ✅（之前是 [""]）
  - sheet_chronicle: [1, 2] ✅（之前是 [""]，且只有 1 行）
  - sheet_collected_archives: [1, 2] ✅（之前包含 ""）
  - 其他 11 张表全部正常（已确认无回归）

- **数据完整性提升：**
  - chronicle 增加到 2 行（之前只有 1 行）
  - collected_archives 增加到 2 行
  - delta 模式稳定工作，无 checkpoint 退化警告

- **检查方法：** 使用 Chrome DevTools MCP `mcp__chrome-devtools__evaluate_script` 直接读取 `MysteryDatabaseFrontend.exportCurrentData()` 结果。

## 2026-06-24：数据库实际已成功写入 13/14 表——getTableData() 不可靠，exportTableAsJson() 才是正确检查方法

- **重大修正：** 之前用 `acu.getTableData(tableName)` 返回 null 判定"14/14 表为空"是错误的。`getTableData()` 读的是内存缓存（可能未刷新），实际数据存储在 IndexedDB (`auto-card-updater-db`, version 1) 中。
- **正确检查方法：** `acu.exportTableAsJson(tableName)` 返回包含所有表的完整对象，每个表有 `content` 数组（row 0 为表头，后续为数据行）。通过检查 `content.length` 和 `content[0]` 可以确认表头和数据。
- **实际数据库写入结果：** 13/14 表有数据（93%），唯一空表 sheet_collected_rules 是正常游戏状态。表头全部完整（灵异物品 9 列、收录规律 10 列等），v6.29 vendor 修复生效。
- **AI 不直接输出 SQL 是正常行为：** AI 输出 MVU patches + `<sp_*>` 协议块，shujuku_v120 的 fallback 机制从这些协议块中提取信息，生成本地 CRUD plan，成功写入数据库。console 显示 `[MFRS 关键表兜底] 已在校验前补入 N 条本地 fallback plan`。
- **部分 CRUD 操作失败（非阻断）：**
  - `COLUMN_NOT_FOUND: visible_summary` — 表头列名是中文"可见摘要"，但 fallback plan 用英文键名 `visible_summary`。
  - `CHECK_IN_VIOLATION` — 线索表的可信度/验证状态值不在允许列表中（实际数据合规，错误可能来自后续更新操作）。
  - `row_id` 不稳定 — sheet_chronicle 和 sheet_clues 的 row_id 为空字符串，退化为 checkpoint 模式。
- **tableApiPreset 和 plotApiPreset 为空字符串**（不是 null）：数据库写入不依赖这两个 preset，fallback 机制直接从 AI 输出提取数据。
- **IndexedDB 数据库列表：** `SillyTavern_ChatCompletions` (v2), `SillyTavern_Prompts` (v2), `SillyTavern_TextCompletions` (v2), `TavernDB_ACU_VectorHotCache` (v2), `auto-card-updater-db` (v1), `shujuku_v120_config_v1` (v1)。

## 2026-06-24：at_depth depth/role 保真修复在 SillyTavern 运行时确认

- **导入方法：** Chrome DevTools MCP 的 upload_file 工具可以直接将 PNG 上传到 SillyTavern 的导入按钮，SillyTavern 会自动处理导入流程。同名卡存在时自动加序号。
- **ccv3 顶层 depth/role 验证：** 新导入的卡在 `characters[id].data.character_book.entries` 中，数据库联动规则条目确认包含顶层 depth: 4, role: 0。旧卡无顶层 depth/role，只有 extensions 里有。
- **convertCharacterBook 转换验证：** position 从 after_char 变为 4（at_depth），depth/role 正确保留。全部 378 条 at_depth 条目正确映射。
- **extensionPrompts 槽位：** `customDepthWI_4_0`（depth=4, role=0）已注册，content 在实际生成请求时才填充。
- **convertCharacterBook 的 fallback 行为：** 即使旧卡 PNG ccv3 顶层无 depth/role，convertCharacterBook 仍会从 extensions.depth/role 读取并填充。因此旧卡在功能上也能工作，但新卡的区别在于 ccv3 顶层就有这些字段，不依赖 extensions fallback。

## 2026-06-23：Chrome DevTools MCP 配置与加载

- 全局 `chrome-devtools` MCP 配置的 `cwd` 必须指向有效目录。`~/code` 在 Windows 上解析到不存在的 `C:\Users\linlang\code`，导致 `os error 267` 启动失败。改为 `D:\project\tavern_helper_template` 后解决。
- `list_mcp_resources` 返回空不代表 MCP 未加载——chrome-devtools MCP 提供 tools 而非 resources，正确判据是工具列表是否暴露 `mcp__chrome_devtools__*`。
- Codex 运行中的旧会话不会动态暴露新 MCP tool schema；修改配置后需要重启/恢复会话。

## 2026-06-22：tavern_sync at_depth 字段保真修复

- **根因：** v6.30 已把数据库联动规则从绿灯改为蓝灯常驻，但该规则还需要按 SillyTavern 的 at-depth 机制以系统角色、depth 4 注入。`tavern_sync` 之前只把 `depth/role` 写在 `extensions`，没有写到 ccv3 条目顶层。
- **源码修复点：** `tavern_sync.mjs` 的 `to_character_book()` 现在检测 `entry.position === 4`，并为该条目设置顶层 `depth = entry.depth ?? 4`、`role = entry.role ?? 0`。
- **角色卡配置修复点：** 开发版与发布版 `index.yaml` 的"数据库联动规则"均已加 `插入位置: 指定深度 / 角色: 系统 / 深度: 4 / 顺序: 14700`，同时保留蓝灯常驻策略。

## 2026-06-22：CDN ref 修复流程 + publish-card 统一替换机制

- **publish-card 统一替换所有 CDN ref：** `scripts/publish-card.mjs` 配置中的 `CDN_REF` 会统一替换开发版 yaml 中的所有 CDN 链接，不能为单个资源设置不同的 commit hash。
- **正确的 CDN 部署流程：** 1. 提交 source → 2. 等 bot 自动构建 dist → 3. 使用最终的 bundle commit 作为 CDN ref → 4. 修改 `publish-card.mjs` 中的 `CDN_REF` → 5. 运行 `pnpm run publish-card` → 6. 提交发布版 yaml 和 PNG。
- **教训：** 修复 CDN ref 前必须先更新 `publish-card.mjs` 配置，再运行 publish-card，否则会反向替换。

## 2026-06-21：CDP 直读替代 + characterId 运行态源

- **CDP 替代法：** 当 Codex 会话未加载 chrome-devtools MCP 时，可用 `scripts/cdp-evaluate.mjs`（Node 24 内置 WebSocket 连 9222 page target 发 `Runtime.evaluate`）替代。
- **运行态 world_info 源是卡内嵌 ccv3：** `characters[id].data.character_book.entries` 是数据源，不是全局 `world_info`（后者是 HTMLSelectElement 下拉框 DOM）。
- **角色数组索引随重启漂移：** 不要硬编码索引，应按 avatar 文件名或角色名匹配定位。
- **SillyTavern 重启后运行态自动恢复：** 完成 reload + 异步角色数据加载后，运行态自动从干净磁盘文件重载，恢复为 383/33/5851。

## 历史发现压缩索引（旧条目，按版本号回查）

以下旧发现已压缩，详细内容见 `planning_archive_2026-06/` 或 git 历史。

- **2026-06-22 hotfix 清洗时机问题**：界面美化脚本清洗但未写回内存；hotfix 清洗在 GENERATION_ENDED 后执行，界面已渲染完成。
- **2026-06-22 数据库前端 2 表损坏 bug**：灵异物品、收录规律表头截断（已由 v6.29 修复）；事件纪要 CHECK 约束过严（已由 v6.28.1 修复）。
- **2026-06-21 worldbook 回弹根因**：外部 JSON 污染覆盖；6 张污染源卡已删除；外部 JSON 双禁用字段格式修复。
- **2026-06-21 source PNG 污染修复**：HEAD 干净时 `git checkout HEAD -- <png>` 是最安全路径。
- **2026-06-20 及更早**：testCrudPlanDiffTrackingGuards 断言失效、bundle Action 自动重建 dist、chronicle 守卫干净 PR、doubao status 0 治理决策等。详细见 `planning_archive_2026-06/`。
