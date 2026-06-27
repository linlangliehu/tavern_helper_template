# Findings

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
  - `resetGachaPity(type)` — 保底重置函数（'rare'→pity.rare=0，'epic'→pity.epic=0，'mythic'→全部重置）
  - `getAllGachaItemDefinitions()` — 合并 builtin（只读）∪ custom（localStorage）返回完整物品列表
  - `getCustomGachaItems()` / `setCustomGachaItems()` — localStorage 自定义物品层读写
  - `addCustomGachaItem(type, itemDef)` / `removeCustomGachaItem(type, itemId)` — 自定义物品 CRUD
- **重构函数：** `buildGachaPool()` 改为消费 `getAllGachaItemDefinitions()` 合并后的目录，而非旧硬编码数组。
- **删除代码：** 旧的 SUPERNATURAL_ITEMS / CLUE_ITEMS / KNOWLEDGE_ITEMS 硬编码数组（~370 行），改为注释指向新架构。
- **架构要点：** 因 visualizer 经 CDN script-link 加载无法加载外部 JSON，builtin 目录以 JS 对象字面量内嵌，同时维护镜像 JSON 供人工编辑。

## 2026-06-26：抽卡系统架构研究 + resetGachaPity 未定义 bug（任务1 研究结论）

- **resetGachaPity 未定义 bug：** `v10_2_visualizer.js` 中 `resetGachaPity('rare'|'epic'|'mythic')` 被调用 6 次（行 4541/4544/4547/4581/4584/4587），但全文件无定义。每次抽到 ★★★/★★★★/★★★★★★ 触发保底重置时抛 ReferenceError。修复方案：实现该函数——'rare'→`pity.rare=0`，'epic'→`pity.epic=0`，'mythic'→`pity.total=0` 且 `pity.epic=0`、`pity.rare=0`。
- **抽卡代码定位（v10_2_visualizer.js，3949-5131 行，约 1183 行）：** GACHA_RARITY(3951-3959，6 档)、GACHA_ITEM_TYPE(3962-3966)、SUPERNATURAL_ITEMS(3969-4228，19 件)、CLUE_ITEMS(4231-4280，4 件)、KNOWLEDGE_ITEMS(4283-4332，4 件)、GACHA_CURRENCY(4335-4349)、货币/保底读写(4351-4417)、GACHA_POOL_TYPE(4420-4425)、buildGachaPool(4428-4476)、performSingleGacha(4478-4508)/performTenGacha(4510-4552)、syncGachaResultToDatabase(5030-5127)。
- **visualizer 加载方式（决定 JSON 外置方案）：** `scripts/publish-card.mjs` 的 `syncDirs = ['第一条消息','系统提示词','对话示例','世界书','数据库']`，**不含「脚本」目录**。故 v10_2_visualizer.js 经角色卡 YAML 的 CDN script-link 加载，不走文件同步。外置 JSON 目录无法作为独立文件在 runtime 加载，**必须以 JS 对象字面量内嵌进 visualizer**（镜像 JSON 文件供人工编辑）。
- **3 张目标表 DB 列头（JSON targetColumns 设计依据，syncGachaResultToDatabase 写入依据）：**
  - sheet_supernatural_items: `['row_id','物品名称','物品描述','物品效果','稀有度','使用次数','持续时间','获得途径','备注']`
  - sheet_clues: `['row_id','线索编码','线索描述','相关厉鬼','重要程度','发现时间','获得途径','可见摘要']`
  - sheet_collected_rules: `['row_id','规律名称','规律描述','杀人规律','触发条件','破解方法','完成度','相关厉鬼','可见摘要']`
- **双层合并架构（参考骰子商店 jerryzmtz/my-tavern-scripts）：** builtin（只读，内置 27 件物品）∪ custom（localStorage 持久化，按 id 覆盖 builtin 字段或新增自定义物品）。runtime = builtin ∪ custom，经 `getAllGachaItemDefinitions()` 提供。GachaItemDefinition schema：`{id,name,type,quality/rarity,description,icon,targetTable,targetColumns,customFields}`，灵异物品额外 `effect/effectDetail/usageLimit/duration`，线索/知识额外 `progress`。这是任务 6（自定义物品 UI 编辑器）、任务 7（目录导入导出）的架构基础。
- **抽卡池权重逻辑（buildGachaPool）：** SUPERNATURAL 池=纯灵异物品；ARCHIVE 池=线索权重×2、其余×0.5；PATTERN 池=知识权重×2、其余×0.5；ALL 池=均匀。基础权重用 `item.rarity.probability`。
- **保底机制（performSingleGacha/performTenGacha）：** 十连保底必出 ★★★（计数器 pity.rare，到 10 重置）、50 抽保底必出 ★★★★（pity.epic，到 49/50 重置）、100 抽保底必出 ★★★★★★（pity.total，到 99/100 重置）。GACHA_RARITY.X.level 用于判断档位。

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