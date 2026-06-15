# Findings

## 2026-06-15 v6.28 P5.2 发布收口结论

- P5.2 已正式同步到发布版，发布提交为 `aa11645efe234443b68bf03093614abd0488829e`，且已进入远端历史；后续 planning 记录提交可位于其后。发布版版本号仍为 `6.28`，运行口径是 P5.2。
- 发布版资源口径：release YAML / 可导入 PNG 指向 `b89e19b99fb32e5b546d3424924ae2c93b74b5da`，cache 为 `phase148-crud-header-gate-6-28`；数据库前端 self-reclaim 指向 P5.2 resource `5849eae635549729b2e8707d1b772c8fb6a7bc9a`，runtime marker 为 `mfrs-crud-header-gate-6-28-p5-2`。
- 低频真实 AI 验证通过 P5.2 数据库完整性判据：开发卡单轮真实回复后自动填表最终成功，数据从基线 5 行到 20 行；未出现 `NOT NULL`、`API_MUTATION_FAILED`、`CHECK_IN_VIOLATION`、`COLUMN_NOT_FOUND`、`DEFAULT VALUES`、`Too Many Requests`。本轮唯一新增异常是一次上游 `HTTP 200 (OK) <none>` 的 `parseNonStreamResponse` ERROR/WARN，自动重试后成功，不能当作 header gate/CRUD 修复失败。
- 发布版 CDN smoke 通过：release YAML、YAML 头像 PNG、可导入发布 PNG 均 200；可导入 PNG 的 `chara` / `ccv3` 元数据含 `6.28`、`b89e19b...`、`phase148...`，不含 P5.1 旧 hash/cache、`localhost` 或 `127.0.0.1`。
- 发布目录头像 PNG `神秘复苏模拟器.png` 仍保留开发卡 metadata（`64d863...` / `phase147...`）。这是 `publish-card` 复制头像的既有行为；发布可分发判据应看 `神秘复苏模拟器发布版.png`。
- 发布版真页 smoke 通过：导入后当前发布卡为 `characterId=4` / avatar `神秘复苏模拟器发布版1.png`，卡内容含 `b89e19b...` / `phase148...` 且不含 P5.1 旧引用；runtime marker、`fillMode=ai_crud_plan`、`AutoCardUpdaterAPI`、`MysteryDatabaseFrontend` 均正确。
- 发布卡非 AI 可逆 CRUD 通过：`clues` 合法编号 `C5807` 与 `supernatural_events` token `CodexV628P52ReleaseEventSmoke_1781513155807` 的 insert/update/delete 全部 `ok=true`，最终残留 0。SP 运行日志按发布 smoke 时间 `16:45` 过滤后新增 0 条，关键 SQL/CRUD 失败关键词均为 0。
- 后续若做发布后真实游玩观察，应以 `characterId=4` / `神秘复苏模拟器发布版1.png` 为当前卡，先冻结 SP 运行日志基线和行数，再低频触发；不要连续重放真实 AI。

## 2026-06-15 v6.28 P5.2 开发卡非 AI smoke 结论

- P5.2 资源链路已经进入开发卡并在真页生效：resource `5849eae635549729b2e8707d1b772c8fb6a7bc9a` -> loader `64d863bce570df61fffbeb01ec2d8f93c9eaf4a3` -> dev card `b89e19b99fb32e5b546d3424924ae2c93b74b5da`；runtime marker 为 `mfrs-crud-header-gate-6-28-p5-2`，cache 为 `phase147-crud-header-gate-6-28-p5-2`。
- P5.2 非 AI CRUD smoke 应显式带 `skipChatSave=true` / `silent=true`，才能覆盖真实 AI CRUD 主链路的关键边界，同时不触发 AI 请求。本轮用这个口径验证 `clues` 和 `supernatural_events` 均通过。
- `clues` 稀疏表头失败表的开发卡验证通过：合法编号 `C4451` 的 insert/update/delete 全部 `ok=true`，最终 `CodexV628P52ClueSmoke_1781510673451` 残留为 0。
- `supernatural_events` 验证通过：insert 使用 `handling_status=处理中`，update 使用 `handling_status=爆发`，说明近义枚举值在 preview/apply 链路没有触发 `CHECK_IN_VIOLATION`；最终 `CodexV628P52EventSmoke_1781510673451` / `CodexV628P52EventToken_1781510673451` 残留为 0。
- SP 运行日志需要按 smoke 开始时间过滤。本轮打开日志面板后看到 3 条旧 WARN，时间为 `15:56:40-15:56:41`，早于 smoke 开始 `16:04:33`，内容是 `saveChat` / `getCurrentCharPrimaryLorebook` 不可用和 provider 初始化自愈；按 smoke 时间过滤后新增 `ERROR=0` / `WARN=0`。
- P5.2 非 AI 验证的关键失败关键词均未出现：`COLUMN_NOT_FOUND`、`API_MUTATION_FAILED`、`Too Many Requests`、`NOT NULL`、`CHECK_IN_VIOLATION`、`DEFAULT VALUES`、`SQL 目标表不在当前模板中`、`CHECK constraint failed` 均为 0。
- 该阶段结论当时允许进入 P5.2-15 低频真实 AI 验证，但不代表发布版已经修复。后续 P5.2-15/P5.2-16 已完成，当前状态以上方 P5.2 发布收口结论为准。

## 2026-06-15 v6.28 P5.2 本地修复候选结论

- P5.2 主因修复已经形成本地候选：vendor SQLite `insertRow()` 通过 DDL/NameMapper 建立 canonical column gate，不再让运行态只含 `row_id` 的稀疏表头把合法中文表头、DDL 物理列名或注释 alias 全量过滤掉。
- 底层保护已补齐：`insertRow` 有效列为 0 时返回失败并记录 warning，不再生成 `INSERT ... DEFAULT VALUES`；静态 guard 已断言 table CRUD 片段不含无保护 `DEFAULT VALUES`。
- adapter apply 防线已补齐：`applyTableChangePlan()` 在调用底层 API 前阻止空 insert values；底层 insert 返回失败或成功但导出不可见时，仍可在 `skipChatSave=true` 下走 JSON import fallback，并把 `skipChatSave/skipNotify/silent` 选项传入导入路径，避免重复保存聊天。
- 枚举归一化已扩展：`supernatural_events.handling_status` 支持 `爆发/扩散/蔓延中 -> 失控扩散`、`处理中/处置中/应对中/交战中/对峙中/压制中 -> 对抗中`、`控制中/已控制/暂时控制 -> 已压制`、`收容/已收容 -> 已关押`、`已解决/已处理/已完结/结束 -> 结束`、`待处理/未处置/未开始 -> 未处理`。
- 回归覆盖当前真实失败表：`ghost_archives`、`clues`、`locations`、`collected_archives`、`chronicle`、`controlled_ghosts`、`player_state`、`supernatural_events`；覆盖空 data、仅 row_id、稀疏 row_id 表头 + 完整合法 data、别名/默认值和枚举归一化。
- 本地 gate 通过：相关 `node --check`、`verify-table-change-adapter`、`verify-storage-provider-mode-guard`、`verify-sql-debug-regressions`、`verify-output-cleaning-regressions`、目标文件 `git diff --check` 和 `pnpm build`。`pnpm build` 在沙箱内因 webpack spawn 报 `EPERM`，非沙箱重跑通过；数据库前端 252 KiB size warning 是既有警告。
- 当前结论只代表本地候选通过，不代表发布态通过。还必须完成 resource 提交、loader/self-reclaim 回填、开发卡 repoint、CDN smoke 和真页非 AI smoke；这些通过前不要做低频真实 AI 验证或发布版同步。

## 2026-06-15 v6.28 P5.2 修复优先级与验收口径

- P5.2 第一优先级是修 `insertRow` 执行层表头口径：vendor 不得只用运行态 `content[0]` 的稀疏 `row_id` 表头过滤字段；必须从模板/DDL/NameMapper 获得 canonical header，或在有效写入列为 0 时结构化失败，不能执行 `INSERT ... DEFAULT VALUES`。
- 第二优先级是 adapter apply 前置防线：`applyTableChangePlan()` 调用底层 API 前应能判断完整合法 data 是否会被当前 header 全过滤、是否缺 DDL 必填列；不能把可预见的 NOT NULL 失败交给 SQLite 再变成运行日志 `ERROR`。
- `skipChatSave=true` 是真实 AI CRUD Plan 主链路的关键边界。修复必须保持“不重复保存聊天”的语义，同时不能让这个开关关闭所有 fallback/保护路径，导致底层 `API_MUTATION_FAILED` 直接暴露。
- 枚举归一化是独立第二问题，不应覆盖主因判断。`灵异事件.处理状态` 需要吸收真实 AI 近义值，把 `爆发/扩散/处理中/交战中/已控制/已收容/已解决/待处理` 等归到 DDL 允许值，避免 `CHECK_IN_VIOLATION`。
- 回归优先覆盖真实失败表：`ghost_archives`、`clues`、`locations`、`collected_archives`、`chronicle`、`controlled_ghosts`、`player_state`、`supernatural_events`。每个重点表至少覆盖空 data、仅 row_id、稀疏表头 + 完整合法 data、缺关键字段和非法枚举。
- 验收标准不能只看 preview：必须验证完整合法 data 在 apply/vendor 执行层不会被过滤成 `DEFAULT VALUES`，SP 运行日志不新增 `NOT NULL constraint failed`、`API_MUTATION_FAILED`、`CHECK_IN_VIOLATION` 或旧 `COLUMN_NOT_FOUND`。
- `Too Many Requests` 仍只算限流放大因素。P5.2 开发阶段先离线和非 AI smoke，真实 AI 验证必须低频进行；若复测期间出现限流，只记录冷却行为，不连续重放。

## 2026-06-15 v6.28 P5.2 根因复核确认

- 已从四个角度反证：发布提交、adapter 预检、vendor 执行层、当前真页运行态。结论仍成立：主因是预检/执行表头口径不一致，不是发布错版、adapter NOT NULL 预检漏检或旧 `COLUMN_NOT_FOUND` 回归。
- 当前真页 marker 为 `mfrs-sqlite-import-sync-6-28-p5-1`；失败表 `事件纪要`、`线索`、`收录档案`、`厉鬼档案`、`地点` 的原始表头仍只有 `row_id`，但 DDL 存在。
- 当前页面的 `previewTableChangePlan()` 对空 `ghost_archives` insert 返回 `NOT_NULL_VIOLATION`，对完整合法 insert 返回 `ok=true`。这证明预检层知道必填列，也能从模板/DDL 补齐稀疏表头。
- 同一完整合法 insert 进入执行层时，vendor `insertRow()` 仍用运行态 `targetSheet.content[0]` 过滤字段；稀疏表头只含 `row_id` 时，合法字段全被过滤，SQL 退化为 `DEFAULT VALUES`，最终触发 SQLite NOT NULL 并包装为 `API_MUTATION_FAILED`。
- 因 AI CRUD Plan 主链路设置 `skipChatSave=true`，底层失败不会走 JSON import fallback；所以修复点必须覆盖 vendor/header gate 或 adapter apply 前的执行防线。

## 2026-06-15 v6.28 P5.2 根因定位：预检/执行表头口径不一致

- 根本原因不是 P5/P5.1 的 `COLUMN_NOT_FOUND` 回归，也不是发布资源加载错版。当前发布页 runtime marker 为 `mfrs-sqlite-import-sync-6-28-p5-1`，`MysteryDatabaseFrontend.previewTableChangePlan()` 对空 `ghost_archives` insert 会正确返回 `NOT_NULL_VIOLATION`，完整合法 insert 会 `ok=true`。
- 真页只读导出确认，仍失败为空的表如 `事件纪要`、`线索`、`收录档案`、`厉鬼档案`、`地点` 的原始 `content[0]` 只有 `["row_id"]`，但 `sourceData.ddl` 仍存在。adapter 预检会把这些稀疏表头与 14 表模板/DDL 合并，因此看得到完整列与 NOT NULL 约束。
- 执行层不使用 adapter 合并后的表头。`vendor/shujuku-sp-fork/index.js` 的 `insertRow()` 在 SQLite 模式下读取 vendor 自己的 `targetSheet.content[0]`，再用 `headers.includes(chineseColName)` 过滤写入列；当表头只有 `row_id` 时，合法 data 中的 `档案编号`、`线索编号`、`地点名` 等字段都会被丢弃。
- 列被丢弃后，vendor 会生成 `INSERT INTO <table> DEFAULT VALUES`，或只插入 `row_id`，于是 SQLite 报 `NOT NULL constraint failed: <table>.<first_required_column>`。这就是 `ghost_archives.archive_code`、`clues.clue_code`、`locations.location_name`、`collected_archives.archive_ghost_name` 等错误集中的直接来源。
- AI CRUD Plan 主链路在执行前把每条 plan 加上 `skipChatSave: true` / `silent: true`。adapter 的 `applyTableChangePlan()` 因此会关闭 JSON import fallback：底层 `api.insertRow()` 返回失败后直接变成 `API_MUTATION_FAILED`，不会用模板合并后的 JSON 路径补救。
- 枚举问题是独立次因：`灵异事件.处理状态` 的 `CHECK_IN_VIOLATION` 表明真实 AI 输出过当前 alias 表未覆盖的近义值。已有 `处理中/处置中/交战中` 等映射，但覆盖不完整，P5.2 需要补真实值样本或更通用归一化。
- `Too Many Requests` 是上游限流放大因素，不是数据约束根因；冷却机制已生效。P5.2 修复应先离线补 vendor/header/fallback 防线和回归，再低频真页复测。

## 2026-06-15 v6.28 发布后三轮真实对话复核结论

- 重新导入后的 v6.28 发布卡运行态正确：`characterId=3` / avatar `神秘复苏模拟器发布版.png`，runtime marker `mfrs-sqlite-import-sync-6-28-p5-1`，`fillMode=ai_crud_plan`，`AutoCardUpdaterAPI` / `MysteryDatabaseFrontend` 存在。
- 可见层清洗通过：三轮助手回复的页面可见文本未出现 `<draft>`、`<UpdateVariable>`、`<JSONPatch>`、`<修改确认>`、`<pacing_rules>`、裸 `"op"`、`risk.death` 或 `risk.revive`。原始消息含隐藏结构载荷属于解析/落盘输入，不等同于玩家可见外露。
- 自动填表为部分通过：当前 14 表实际 15 行，`行动建议`、`人物`、`检定建议`、`驾驭厉鬼`、`全局状态`、`玩家状态`、`灵异事件` 有数据；`事件纪要`、`线索`、`收录档案`、`收录规律`、`厉鬼档案`、`地点`、`灵异物品` 仍为空或只有表头。
- 运行日志未复现 P5 关注的 `COLUMN_NOT_FOUND`，也未见 `_acu_sheet_meta`、未知模板表、SQLite 初始化失败或 `CHECK constraint failed`。这说明 P5/P5.1 的表头/alias 与 SQLite runtime 同步问题没有回归。
- 新阻断是“真实 CRUD Plan 低质量 insert + 执行层兜底不干净”：日志 `共 72 条`，16 `ERROR` / 56 `WARN`，核心为 `insertRow` 缺必填字段后进入 `INSERT ... DEFAULT VALUES` 或仅 `row_id` 插入，触发 NOT NULL 约束失败，再表现为 `API_MUTATION_FAILED` 和 SQL 沙箱无可用修复策略。
- 失败字段集中在 8 类必填字段：`ghost_archives.archive_code`、`clues.clue_code`、`locations.location_name`、`collected_archives.archive_ghost_name`、`chronicle.code_index`、`controlled_ghosts.ghost_code`、`player_state.name`、`supernatural_events.event_code`。P5.2 回归应优先覆盖这些表。
- 另有 1 条真实值域问题：`灵异事件.处理状态` 触发 `CHECK_IN_VIOLATION`。这不是列名 alias 问题，而是 AI 输出枚举值不在 DDL 允许集合中，P5.2 需要补字段级归一化或提示约束。
- 仍有 API 限流：2 组 `parseNonStreamResponse` / `CRUD 填表` / `shujuku_v120` 日志指向 `Too Many Requests`，冷却机制生效并停止本轮重试。后续不要连续触发真实 AI；修复应先离线完成，再低频复测。
- 1 条 `StorageStrategy` WARN 显示 fresh import 后曾从 `provider=native` 按 `settings=sqlite` 自愈重建。未见后续 Native adapter 错配错误，但发布后复测应继续观察这条是否只是一次性初始化自愈。

## 2026-06-15 v6.28 正式发布收口结论

- P5.1 已正式发布为 `v6.28`。发布链路为 resource `6ec4a4d7691d911b415f7644b8a219c25dd47ca9` -> loader hash fix `52447dbe290f7132ad1fc87e9506899688c18b6f` -> dev card `cd5203208f4f6b2e2a0d70013093721dcdb3ed58` -> bot bundle `e79f078a7742d7e3428d99bc108f0e3a33b838c6` -> release `bffa76e810fc1ed36e2a7ca8951fc44304b23a6e`。
- 正式发布版的 runtime marker 仍是 `mfrs-sqlite-import-sync-6-28-p5-1`；发布版 CDN cache 改为 `phase146-sqlite-import-sync-6-28`。开发卡内部 cache `phase145-sqlite-import-sync-6-28-p5-1` 与正式发布 cache 不同，这是预期边界。
- 发布版 YAML/PNG/CDN smoke 均通过：版本 `6.28`、资源 ref `e79f078...`、cache `phase146...` 可见，旧 hash/cache、localhost、`127.0.0.1` 无残留。
- 真页发布版非 AI smoke 通过：唯一导入卡为 `神秘复苏模拟器发布版4.png` / `characterId=7`；runtime marker、`fillMode=ai_crud_plan`、`AutoCardUpdaterAPI`、`MysteryDatabaseFrontend` 均正确；合法 `clues` 编号 `C1180` 与 `supernatural_events` token `CodexV628ReleaseEventSmoke_1781500275180` 的 insert/update/delete 均成功，最终残留为 0。
- 发布版 smoke 后 `SP·数据库 III -> 高级工具 -> 运行日志` 仍为 `共 0 条`；未出现 `COLUMN_NOT_FOUND`、`Too Many Requests`、`API_MUTATION_FAILED`、`CHECK constraint failed`、`SQL 目标表不在当前模板中`、Native adapter 错配或 SQLite 初始化失败。
- 本轮没有触发真实 AI。剩余验证不是代码/CDN 阻断，而是用户在发布版卡上做低频真实对话/自动填表手动验证；触发后应复查运行日志、落盘行数和是否有 API 限流冷却。
- PowerShell 管道给 `agent-browser eval --stdin` 传中文正则时可能把中文转成问号并导致正则语法错误；后续只读 DOM 脚本优先使用 ASCII/Unicode escape 或 base64 方式传递。

## 2026-06-15 planning-with-files 恢复口径复核

- 当前恢复入口仍是 `task_plan.md` 的 `常驻恢复入口`，随后读取 `PROJECT_FLOW.md`、`progress.md` 顶部最近 2-3 条、`findings.md` 顶部相关经验，再运行 `git status --short --branch`。
- 当前有效发布版是 `v6.28`；P5.1 开发卡已完成正式发布版同步和发布 smoke，`SP·数据库 III -> 高级工具 -> 运行日志` 新增 `ERROR/WARN` 为 0；本轮未触发真实 AI，低频真实 AI 自动填表观察留给用户手动验证。
- `PROJECT_FLOW.md` 是常驻项目运行流程文件，只保留开发入口、构建发布链路、真页/SQL 验证口径、自动更新边界和提交边界；一次性阶段流水继续写入 `progress.md`，可复用结论写入 `findings.md`。
- `session-catchup.py` 仍可能报告旧 v6.21 中段残片；该残片已被 v6.25/v6.27/v6.28 P5 线覆盖。除非用户明确要求回查历史，否则不应按它回退当前任务。
- planning 整理类提交边界保持窄：只提交 `task_plan.md`、`progress.md`、`findings.md`、`PROJECT_FLOW.md`；业务源码、dist、vendor、日志、截图、临时 worktree 和归档快照按实际任务另行判断。

## 2026-06-15 v6.28 P5.1 SQLite import fallback 收口结论

- P5.1 的关键代码问题有两层：一是 adapter 旧逻辑会在底层 insert 返回成功、但导出复核看不到新增行时继续给出假阳性；二是 SQLite 模式下 `importTableAsJson()` 只改 JSON/楼层，没有同步 provider runtime，导致 fallback 导入后 `exportTableAsJson()` 仍读旧 SQLite 视图。
- 修复口径是：insert 成功后必须用导出结果复核新增行；看不到新增行时走 import fallback，fallback 后再次导出验证；仍不可见则返回 `API_MUTATION_FAILED`。vendor 导入 JSON 成功后，在 SQLite 模式调用 provider `resetFromTableData(importedData)`，同步失败则导入失败。
- 回归口径需要覆盖 stale SQLite view：`verify-table-change-adapter` 要能复现“import fallback 成功但 runtime 仍旧”的场景；`verify-storage-provider-mode-guard` 要静态断言 import 路径会 reset SQLite runtime。
- 最终资源链路为 resource `6ec4a4d7691d911b415f7644b8a219c25dd47ca9` -> loader `915b8ddd54142995801fe1d9348cdc039fb29641` -> loader hash fix `52447dbe290f7132ad1fc87e9506899688c18b6f` -> dev card `cd5203208f4f6b2e2a0d70013093721dcdb3ed58` -> bot bundle `e79f078a7742d7e3428d99bc108f0e3a33b838c6`。
- CDN smoke 要避免 PowerShell 管道中文字面量被转成 `????`；脚本里的中文路径优先用 Unicode escape。修正后开发卡 YAML/PNG、状态栏 HTML、变量结构、界面美化、固定状态栏、database loader、database frontend、vendor、MagVarUpdate 均 200。
- 真页非 AI 验证结论：开发卡 `characterId=2` / avatar `神秘复苏模拟器.png`，runtime marker `mfrs-sqlite-import-sync-6-28-p5-1`，`fillMode=ai_crud_plan`。合法 `clues` 编号 `C2149` 与 `supernatural_events` token `CodexV628P51EventSmoke_1781498287149` 的 insert/update/delete 均通过，最终残留 0，运行日志 `共 0 条`。
- P5.1 没有复现 P5 的两类日志污染：非法 `clue_code` 的 CHECK/GLOB 失败没有再出现，`SQL 目标表不在当前模板中: CodexV628P5EventSmoke_...` 的 update/fallback 噪音也没有再出现。当前剩余边界不是 P5.1 代码阻断，而是尚未同步发布版、尚未做低频真实 AI 自动填表观察。

## 2026-06-14 v6.28 P5 资源验证与日志基线结论

- P5 资源链路已经形成三段：resource `507fcafa0bea592953094199ab1d959bcf324a06` -> loader/self-reclaim `a652216f1e599d4ecf2a56dd0375050089e77f25` -> 开发卡 repoint `a5fbf6ea5759542f5569d7f8c9281ed0dfbd5c3b`；marker/cache 为 `mfrs-sparse-crud-alias-6-28-p5` / `phase143-sparse-crud-alias-6-28-p5`。
- P5 非 AI 最小 `supernatural_events` 可逆 CRUD 可通过，最终测试 token 残留为 0；本轮运行日志中未复现 P4 的多表 `COLUMN_NOT_FOUND`，也未出现 `Too Many Requests`、`API_MUTATION_FAILED`、Native adapter 错配或 SQLite 未初始化。
- 运行日志基线仍未干净通过：`SP·数据库 III -> 高级工具 -> 运行日志` 显示 `18 / 18` 条，5 条 `ERROR`、13 条 `WARN`。主要不是 alias 失败，而是额外 `clues` 诊断使用了非法 `clue_code`，触发 DDL `CHECK clue_code GLOB 'C[0-9][0-9][0-9][0-9]'`；后续线索表 smoke 必须使用 `C0000` 这类合法编号。
- 仍需单独复核 1 条 `updateCell SQL failed: SQL 目标表不在当前模板中: CodexV628P5EventSmoke_...`。虽然最小 CRUD 最终成功并清理残留，但发布 smoke 的日志基线不能带这种底层 SQL/fallback 噪音直接收口。
- P5 下一步不应进入发布版同步；应先做 P5.1 窄口径复核：清晰记录/重置日志基线，使用合法 `clues` 编号重测，确认 `supernatural_events` update 不再产生错误级日志，之后再考虑低频真实自动填表观察。

## 2026-06-14 v6.28 P5 稀疏表头 alias 根因与本地修复结论

- P4 后 `SP·数据库 III -> 高级工具 -> 运行日志` 的多表 `COLUMN_NOT_FOUND` 不只是“缺几条硬编码 alias”。更具体的根因是：运行态 sheet 能匹配到模板，但空表/稀疏表可能只导出 `row_id` 表头；旧 `buildTableMeta()` 只按当前表头建列，模板 DDL 虽然存在，也不会补齐当前表头之外的列。
- 修复应在数据库前端 adapter 的模板 fallback 层完成：当运行态 sheet 匹配到 14 表模板时，用模板表头作为 canonical header，并按当前表头的中文表头、DDL 物理列名、DDL 注释 alias 把已有行值重排。这样既保留已落盘数据，又恢复完整 `columnAliases`。
- 这比给 `玩家状态`、`厉鬼档案`、`线索`、`地点`、`驾驭厉鬼`、`收录档案` 分别加硬编码 alias 更稳，因为后续 `灵异物品`、`事件纪要`、`收录规律` 等表如果出现同类稀疏表头，也能复用同一模板口径。
- 本地回归必须加载真实 `src/神秘复苏模拟器/数据库/神秘复苏表格SQL_v1.json`，并模拟运行态只剩 `row_id` 表头；只用手写完整表头样例会漏掉这次 P5 的真实失败形态。
- 本轮只完成源码修复和本地 gate。当前工作区源码 loader 仍有旧 `phase133` 指针，不能直接把 `pnpm build` 产物视为 P5 可验证资源；后续需先整理/更新资源 ref、cache 和 marker，再进入真页非 AI 验证。

## 2026-06-14 新对话恢复与 P5 接续口径

- 新开对话或压缩恢复时，先读 `task_plan.md` 的常驻恢复入口和当前状态，再读 `PROJECT_FLOW.md`；随后只读 `progress.md` 顶部最近 2-3 条和 `findings.md` 顶部相关经验即可接续。
- `session-catchup.py` 可能继续报告旧 v6.21 未同步片段。当前规划文件已明确推进到 v6.28 P4/#68 后半段，并且 v6.21 已被 v6.25 以后主线覆盖；除非用户明确要求回查历史，否则不要把旧恢复片段当作当前任务。
- 当前发布事实是：`v6.27` 是有效发布版；`v6.28 P4` 已验证失败，不能发布；下一步是 `v6.28 P5` 修复，不是继续真实对话压力测试或发布收口。
- P5 的核心问题来自 `SP·数据库 III -> 高级工具 -> 运行日志` 的多表 `COLUMN_NOT_FOUND` WARN，以及真实对话期间的 API 限流 ERROR。前者需要离线补 alias/模板口径和回归样例；后者需要保持限流分类、15 秒冷却和低频验证，不应自动重放。
- planning 整理类提交边界保持固定：只提交 `task_plan.md`、`progress.md`、`findings.md`、`PROJECT_FLOW.md`；不把临时截图、日志、归档、探针输出或既有无关 dirty 混入。

## 2026-06-14 planning 记录整理约定

- `PROJECT_FLOW.md` 是常驻项目运行流程文件，只放新对话恢复、真实开发入口、构建发布链路、真页/SQL 验收口径、发布验证固定组合、自动更新边界和提交边界；不要放一次性阶段进度或写死单次发布口径。
- `task_plan.md` 是主恢复入口，保留当前状态、当前任务清单、版本变更索引、需要提交的文件和不需要提交的本地参考文件；版本链路继续保留在 `版本变更索引`，详细流水不塞回任务清单。
- `progress.md` 放实际会话流水和验证结果，顶部 2-3 条用于新对话快速恢复“上次做了什么”。
- `findings.md` 放根因、经验和可复用判断，尤其是 SP 运行日志口径、发布验证组合、已知阻断和避免重复踩坑的结论。
- planning 整理类提交只包含 `task_plan.md`、`progress.md`、`findings.md`、`PROJECT_FLOW.md`；`planning_archive_2026-06/**`、临时截图、日志、CDP 探针输出、`.codex-*` worktree 和其它既有 dirty 默认不提交。

## 2026-06-14 v6.28 P4 #68 真页发送入口阻断

- p4 runtime、非 AI CRUD 和 SP 日志基线通过后，#68 真实低频观察还需要先确认当前聊天能正常提交用户楼层。仅把开局设定写入 `#send_textarea` 不等于已经触发真实对话。
- `SP·数据库 III` 可覆盖 SillyTavern 底部发送按钮；关闭时应使用面板自身 `.acu-window-btn.close`，不要误点同名/同图标的其它按钮。关闭确认只关闭验证面板，本轮未执行数据库写操作。
- 当前真页状态下，卡片“进入神秘复苏世界”按钮只把标准开局设定填入 `#send_textarea`；随后 `#send_but` 点击、Enter 和 `SillyTavern.getContext().generate('normal')` 均未新增用户/助手楼层。该状态不能算一次真实自动填表观察。
- 正确日志入口是 `扩展程序 -> 打开 SP·数据库 III -> 高级工具 -> 运行日志`，不要把旧可视化编辑器窗口当成运行日志入口；旧窗口只显示数据编辑/结构配置/全局注入/AI 改表助手。
- 会话46进一步确认：`#send_but` 未禁用且有 `click` 绑定，`#send_textarea` 有 `keydown` 绑定，`shouldSendOnEnter()` 返回 `true`，但一次正常点击和一次 Enter 提交各等待 60 秒后仍未新增聊天楼层。`保存中` 文案来自隐藏的 `st-csu-save-badge` 子元素，不应直接误判为当前可见保存锁。
- 遇到这种情况时，不应继续重复点击发送、`triggerUpdate()` 或“立即手动更新”来放大噪声。先恢复/确认酒馆正常发送；若用户已经在页面手动发送并生成回复，再回到 `SP·数据库 III -> 高级工具 -> 运行日志` 和 `exportCurrentData()` 做 #68 后半段复核。

## 2026-06-14 v6.28 P4 #68 三轮真实对话复核结论

- 用户手动发送后，发送入口阻断解除；真页仍是开发卡 `神秘复苏模拟器`，runtime marker 为 `mfrs-clean-crud-alias-6-28-p4`，`fillMode=ai_crud_plan`。
- 可见层清洗通过：页面可见正文和 A-D 选项未出现 `<draft>`、`<UpdateVariable>`、`<JSONPatch>`、`<修改确认>`、`<pacing_rules>`、裸 `"op"`、`risk.death` / `risk.revive`。原始聊天消息仍含隐藏结构载荷，这是当前解析/落盘所需，不等同于玩家可见外露。
- 自动填表已从 P3/P4 前的 0 落盘改善为部分落盘：`exportCurrentData()` 从基线 14 表/实际 5 行增加到 14 表/实际 14 行，新增数据进入 `全局状态`、`玩家状态`、`灵异事件`、`厉鬼档案`、`线索`、`人物`；`CodexV628P*` 测试 token 残留为 0。
- 运行日志仍是发布阻断：`SP·数据库 III -> 高级工具 -> 运行日志` 当前 18 条，4 条 ERROR / 14 条 WARN。ERROR 全部是 `parseNonStreamResponse` 的 `Too Many Requests` 限流；WARN 包括限流冷却和 `CRUD 原子批次容错` 的多表 `COLUMN_NOT_FOUND`。
- `COLUMN_NOT_FOUND` 涉及的表和物理列名说明 alias 映射仍未覆盖所有真实 CRUD Plan 产物：`玩家状态` 的 `name/identity_text/location_name/status_text/death_risk/...`，`厉鬼档案` 的 `archive_code/ghost_name/...`，以及 `线索`、`地点`、`驾驭厉鬼`、`收录档案` 等表。虽然部分数据最终能落盘，但真实填表仍不完整。
- 本轮未见 `_acu_sheet_meta`、Native adapter/provider mismatch、SQLite 初始化失败、`API_MUTATION_FAILED`、`ROW_NOT_FOUND` 或 CHECK/GLOB/UNIQUE/LENGTH 约束失败；说明 v6.27 元数据降噪和 P4 `current_time` 归一化没有复发。
- 下一步不应继续触发真实对话放大限流。应进入 P5：离线/本地补 alias 映射和回归样例，再低频重跑 #68 验证组合。

## 2026-06-14 v6.28 #65 真页复测新阻断

- #65 已证明资源链路本身可用：开发卡成功更新到 `phase141-autofill-persist-6-28-p3` / `mfrs-autofill-persist-6-28-p3`，非 AI `supernatural_events` 可逆 CRUD 通过，CRUD 后 SP 运行日志 `共 0 条`。
- 真实对话暴露 P0 清洗回归：模型输出的 `<draft>`、`<修改确认>`、`<UpdateVariable>`、`<JSONPatch>`、裸 `"op"` patch 列表、裸 `<choices>` JSON 以及外语中间稿进入玩家可见层。此前 P0 样例只覆盖裸 choices/JSONPatch/英文摘要，不足以拦截这类“完整标签块 + 草稿块 + 多语言中间稿”。
- 真实自动填表仍 0 落盘，但这次证据更具体：SP 运行日志不再是旧 P2 的空 singleton `ROW_NOT_FOUND` 主导，而是 `global_state.current_time` 的 DDL `GLOB` 约束失败，以及 CRUD Plan 使用物理列名时在 `玩家状态` / `灵异事件` 前端预检中被判 `COLUMN_NOT_FOUND`。
- `current_time` 失败样例为 `2024-04-12 22:15`，而 DDL 日志显示要求类似 `????-??-?? ??:??`；生成侧多了秒或格式不完全匹配时会让 `global_state` insertRow 整条失败。
- `玩家状态` / `灵异事件` 的 `COLUMN_NOT_FOUND` 说明真实 AI CRUD Plan 与 adapter 元数据口径仍不一致：本地非 AI smoke 使用物理列名可以通过 `supernatural_events`，但真实运行时从当前表头/DDL/SyncBridge 映射出来的 `玩家状态` 和部分表不接受同一套物理列名。后续不能只用单表 smoke 证明自动填表主链路。
- 下一轮修复需要两条线并行：显示层先兜底隐藏所有内部工作块；执行层再统一 AI CRUD Plan 的列名规范、adapter alias 映射和时间字段归一化。修复后必须再次通过 `SP·数据库 III -> 高级工具 -> 运行日志` 验证。

## 2026-06-14 v6.28 P3 自动填表 0 落盘根因与本地修复结论

- P2 真实自动填表 0 落盘不是 P0 显示层清洗问题，也不是 API 限流问题。真实回复中剧情、A-D 选项和状态面板正常；SP 运行日志无 `Too Many Requests`、Native adapter 错配、SQLite 初始化失败或 SQL/约束 ERROR。
- 根因一：`全局状态` / `玩家状态` 这类 singleton 表的 DDL 使用 `CHECK(row_id = 1)`，旧 adapter 只解析 `CHECK(row_id BETWEEN x AND y)`，导致固定单行主键范围缺失。空表首轮收到完整 `updateCell` 时，如果 match 不是 row_id，旧逻辑只能得到 `ROW_NOT_FOUND`，不能自动补 `row_id=1` 并提升为 insert。
- 修复一：DDL parser 解析 `CHECK(<physical_column> = <number>)`，映射为 `minValue=maxValue`；`tryPromoteMissingFixedRowUpdateToInsert()` 通过 `getPromotablePrimaryKeyValue()` 优先使用 match 里的显式 row_id，若无显式主键且主键是固定单值、当前表只有表头，则补固定主键并把 update 提升为 insert。
- 根因二：CRUD Plan 批处理单条计划会传 `skipChatSave=true`，但 vendor 的 `saveToLatestFloorAndRefresh()` 仍在单条 mutation 后调用 `refreshMergedDataAndNotifyWithUI_ACU()`。这会在批次末统一 `persistAppliedTableUpdate_ACU()` 保存前，用聊天历史里的空 checkpoint 刷新运行态，冲掉已经成功应用到内存表的行。
- 修复二：`saveToLatestFloorAndRefresh()` 在 `skipChatSave=true` 时跳过单条聊天保存、单条 merged refresh 和无 AI 楼层 fallback save；只保留 summary vector skip-path 评估和必要通知，等待批次末统一保存。`skipChatSave=false` 的手动/普通 CRUD 行为保持原样。
- `sheet_supernatural_events` 的“列结构变化，退化为 checkpoint”日志本身不是阻断；真正阻断是 batch 单条刷新把运行态成功项从旧聊天 checkpoint 刷回 0 行。修复后需要通过真页重新验证 checkpoint fallback 后的成功项能进入最终导出/聊天快照。
- 本地回归覆盖：`scripts/verify-table-change-adapter.mjs` 增加空 `global_state` singleton update -> insert 并补 `row_id=1`；`scripts/verify-sql-debug-regressions.mjs` 增加 `testBatchSkipChatSaveDoesNotRefreshRuntime()`，断言 batch `skipChatSave=true` 不调用单条 save、refresh、fallback save。
- 真页 #65 不能直接使用当前旧开发卡验证。当前页面仍指向旧 `mfrs-applied-mutation-verify-6-20` / `phase133-applied-mutation-verify-6-20` 资源；必须先让运行时加载本轮修复后的 vendor/frontend，再按发布验证固定组合复测。

## 2026-06-14 v6.28 P2 真页验证结论

- P2 非 AI smoke 先暴露并修复了一个适配器状态污染问题：底层 CRUD 可能在返回失败前原地改写传入的 `currentData` 对象；旧 `applyTableChangePlan()` 失败后验证和 import fallback 继续使用同一对象，导致 insert/delete 误判失败，insert 还可能基于已变更对象二次导入造成重复行。
- 修复方式是把 `currentData` 在执行 mutation 前克隆成 normalized baseline；失败后验证和 fallback 均使用写入前快照。新增回归覆盖“失败返回但原地改写同一个 currentData”的 insert/delete 场景，防止再次出现“返回失败但实际已写入/删除”的不一致。
- 修复后真页 `MysteryDatabaseFrontend.previewTableChangePlan()` / `applyTableChangePlan()` 可完成 `supernatural_events` 可逆 CRUD：insert、update、delete 均 `ok=true`，最终 `CodexV628P2` token 残留为 0；SP 运行日志仍为 `0 / 0`。
- P0 输出清洗在真实对话中通过：页面生成剧情、A-D 选项和状态面板；未见裸 choices JSON、裸 JSON Patch、独立 `<JSONPatch>`、`"op":"replace"` 或英文调试摘要外露。
- P1 限流体验没有被触发：真实低频对话日志不含 `Too Many Requests`、HTTP 429、rate limit、网关错误，也没有把限流误判为 SQL/模板问题。
- P2 新阻断是“真实自动填表 0 落盘”：低频真实对话后导出仍为 14 表、实际数据行 0；聊天楼层内的 `TavernDB_ACU_Data`、`TavernDB_ACU_IndependentData` 和 isolated `independentData` 也都是 0 数据行，说明不是导出读取错误。
- SP 运行日志对该阻断的权威证据为 4 条 WARN、0 条 ERROR：`全局状态` / `玩家状态` 空表 update 预检 `ROW_NOT_FOUND` 被原子批次容错跳过；`sheet_supernatural_events` 多次提示“列结构变化，退化为 checkpoint”。未出现 `_acu_sheet_meta`、Native adapter 错配、SQLite 初始化失败、约束错误、`API_MUTATION_FAILED` 或限流。
- 下一步修复应聚焦自动填表计划执行层：空 singleton/fixed 表 update 应在数据完整时提升为 insert/replace，`sheet_supernatural_events` 的列结构变化 checkpoint 不能导致成功项最终不可见；修复后需要重新跑非 AI CRUD smoke 和一次低频真实对话观察。

## 2026-06-14 v6.28 P1 API 限流体验优化结论

- 当前限流根因仍是上游 API 返回 `Too Many Requests` / `HTTP 429` / `Retry-After`，不是 14 表模板、SQL 表名/列名、SQLite provider 或 `_acu_sheet_meta`。P1 的目标是把这种状态清楚标成“本轮填表未完整完成”，而不是继续放大请求或误导用户修 SQL。
- `CRUD Plan` 与 `SQL 兜底` 应共享同一种传输问题结果结构：`apiTransportIssue=true`、`apiTransportKind=rate_limit|gateway|transport`、`cooldownSeconds`、`incompleteFill=true`、`retryAdvice`、`pendingRetrySummary`。这样自动更新、手动填表和后续 API 调用方都能区分“传输层冷却”与“数据库执行失败”。
- pending/重试策略保持保守：只记录轻量摘要与手动重试建议，`autoReplay=false`、`manualRetry=true`；不要在冷却结束后自动重放队列，否则容易把一次限流放大成连续请求。
- 运行日志健康卡需要把限流和网关分开：`Too Many Requests`、`API限流`、`rate limit`、`HTTP 429`、`Retry-After` 归 `apiRateLimitIssue`；`Bad Gateway`、`502/503/504`、`service unavailable` 归 `apiGatewayIssue`。两者都不是 SQL 模板错误。
- API 预设/额度复核只做非敏感摘要：默认 `fillMode=ai_crud_plan`、`maxConcurrentGroups=1`、`tableMaxRetries=3`、`updateBatchSize=3`、`max_tokens=60000`。后续若继续遇限流，优先检查表级 API 预设/额度或降低真实触发频率；不要输出密钥、URL、Bearer token，也不要做压力测试。
- 本轮只做本地代码与回归，不做真页 AI/写库复测。P2 需要按 `PROJECT_FLOW.md` 的固定组合先做 CDN/本地 smoke 和 SP 运行日志基线，再由用户明确授权低频真实对话观察。

## 2026-06-14 v6.28 P0 结构化内容外露修复结论

- 外露根因不是状态栏或数据库解析必须显示内部块，而是显示层只覆盖了标签化结构：`<choices>`、`<UpdateVariable>`、未闭合结构块、旧【推演选项】/【状态面板】和短标签已有隐藏/渲染规则；会话37新增的裸 choices JSON、裸 JSON Patch、独立 `<JSONPatch>` 与英文调试摘要没有兜底规则。
- 修复应放在显示层兜底，而不是删除原始消息中的结构化载荷。原始 `<choices>` 仍供状态栏解析和行动建议镜像使用，原始 `<UpdateVariable>/<JSONPatch>` 仍供 MVU 更新使用；玩家可见层只隐藏内部块。
- 生成侧也需要收紧边界：`变量输出格式.yaml` 明确 Analysis/JSONPatch 只能在 `<UpdateVariable>` 内；`必须输出推演选项.txt` 明确 `<choices>` 只能在 `<choices>...</choices>` 内，不再额外输出裸 JSON 对象/数组。
- 新增 `scripts/verify-output-cleaning-regressions.mjs` 作为 P0 本地 gate。它读取实际 `index.yaml` 正则配置，不复制另一份规则；样例覆盖正常标签化结构和会话37外露形态，验证可见层不含 `risk.death`、`"op": "replace"`、英文调试摘要、`<UpdateVariable>` 或 `<JSONPatch>`，同时保留普通叙事并渲染 `sp_choices` / `sp_status`。
- 本轮未改 14 表模板、SQLite provider、provider guard 或发布版卡片；下一步若继续推进，应进入 P1 限流体验优化或 P2 本地 gate/真页验证与发布收口。

## 2026-06-14 v6.27 低频真实对话观察结论

- v6.27 发布卡真实低频对话链路正常生成：当前卡 `characterId=6` / avatar `神秘复苏模拟器发布版3.png`，运行 marker 为 `mfrs-meta-table-no-error-6-27`，`fillMode=ai_crud_plan`；一次普通消息后生成老旧居民楼剧情、A-D 推演选项、状态面板和 MVU 更新。
- `_acu_sheet_meta` 缺表日志噪音没有复发。触发前 `SP·数据库 III -> 高级工具 -> 运行日志` 为 `当前显示 0 / 0 条`；触发后新增日志中不含 `_acu_sheet_meta`。
- provider/SQLite/约束类历史问题未复现：日志不含 `NativeTableServiceAdapter`、`API_MUTATION_FAILED`、`SQLite 引擎未初始化`、`ROW_NOT_FOUND`、`CHECK_IN_VIOLATION`、`LENGTH_VIOLATION` 或 `UNIQUE constraint failed`。
- 本轮新增问题是上游 API 限流：运行日志 3 条分别为 `parseNonStreamResponse` ERROR、`shujuku_v120` WARN、`CRUD 填表` WARN，核心内容均指向 `Too Many Requests`，并确认 CRUD 填表冷却 15 秒以停止放大请求。
- 数据库并非完全失败：导出 14 表合计从 19 行变为 23 行（含表头），估算实际数据行从 5 变为 9；落盘表包括 `全局状态`、`玩家状态`、`灵异事件`、`厉鬼档案`、`线索`、`人物`、`地点`、`灵异物品`。
- 由于限流发生在填表后段，本轮固定建议类表未完整落盘：`行动建议`、`事件纪要`、`检定建议`、`驾驭厉鬼`、`收录档案`、`收录规律` 仍只有表头。后续若用户要求继续验证，应先等待冷却并确认 API 配额/预设可用性，不要在限流窗口内反复触发真实对话或手动更新。

## 2026-06-14 v6.27 后续维护：tag 与 publish-card jsdelivr 归一化结论

- v6.27 发布提交 `1960848b33460ec766be34539ed142389bd2fc98` 已有 tag `v0.0.156`；发布后维护提交 `a167c6c05c1d589034c7904d255f6dfbcb882e6b` 已推送到 `origin/main`，并补发 tag `v0.0.157` 指向当前 HEAD。
- `scripts/publish-card.mjs` 现在不再只依赖 `localhost` / `127.0.0.1` 替换。它会把项目仓库的旧 jsdelivr URL 前缀统一归一化到当前 `CDN_REF`，覆盖 `testingcf.jsdelivr.net`、`cdn.jsdelivr.net` 和无子域 `jsdelivr.net`。
- 项目 dist 入口 URL 的旧 `?v=` 会统一归一化到当前 `CDN_CACHE_VERSION`；因此发布版 YAML 里已有旧 CDN hash/cache 时，后续执行 `publish-card` 不再需要手工 sed 替换旧 hash/cache。
- `MagicalAstrogy/MagVarUpdate` bundle 的 cache 规则也补齐了 `cdn.jsdelivr.net` 域名覆盖，避免外部 bundle URL 留旧 cache。
- 验证组合：`node --check scripts/publish-card.mjs`、`pnpm run publish-card -- 神秘复苏模拟器发布版 --dry-run --no-bundle`、`cdn.jsdelivr.net` 旧 hash/cache 样例、`git diff --check -- scripts/publish-card.mjs` 均通过。
- 注意：发布脚本仍需要人工更新 `CDN_REF`、`CDN_CACHE_VERSION` 和必要时的 `releaseVersion`；本次增强解决的是“已有 jsdelivr 旧链接是否会被自动归一化”，不是自动判断最新 bundle ref。

## 2026-06-14 v6.27 `_acu_sheet_meta` 缺表日志噪音修复结论

- 根因不是自动填表失败，也不是 14 表模板损坏：`_acu_sheet_meta` 是 `SyncBridge` 的内部元数据表；缺表时导出层本来会 fallback 成功，但旧实现先调用 `SqliteEngine.query("SELECT * FROM _acu_sheet_meta;")`，因此 query 层先记录 SQLite ERROR，再由上层 catch fallback。
- 修复点应放在 `SyncBridge._loadAllMeta()` 查询前，而不是降低整个 SQLite query 的错误级别。v6.27 使用 `engine.getAllTableNames()` 预检查 `_acu_sheet_meta` 是否存在；缺表直接返回空 Map，仍保留真实 SQL 错误的 ERROR 记录能力。
- 新增 `scripts/verify-syncbridge-meta-no-error.mjs` 后，回归覆盖了两条关键路径：缺 `_acu_sheet_meta` 时不调用 `query("SELECT * FROM _acu_sheet_meta")`；存在 `_acu_sheet_meta` 时仍读取元数据。
- v6.27 发布链路：vendor 修复 `4f6175a62342adc492f888f7f1472829e89967ab` -> loader/self-reclaim `f1f6e5b` -> bot bundle `a18bba270385d32e1b33f94e3a82532b24a11f89` -> release `1960848`。
- 发布口径为 `6.27` / `phase140-meta-table-no-error-6-27` / `mfrs-meta-table-no-error-6-27`。继续发布时不要复用 v6.26 的 `phase139-provider-mode-guard-6-26`，否则玩家可能仍命中旧 loader/cache。
- 真页验证应以 `SP·数据库 III -> 高级工具 -> 运行日志` 为准。本轮导入 v6.27 发布卡 `characterId=6` / avatar `神秘复苏模拟器发布版3.png` 后，运行态 marker 为 `mfrs-meta-table-no-error-6-27`；日志基线为 `共 0 条`，执行 `exportCurrentData()` 和 `supernatural_events` 最小 CRUD 后仍为 `共 0 条`，未再出现 `_acu_sheet_meta` SQLite ERROR。
- 最小 CRUD token `CodexV627MetaSmoke_1781418875520` 最终残留为 0；这说明本轮修复没有破坏 v6.26 已验证的 SQLite 写入/provider guard 路径。

## 2026-06-14 v6.26 发布后低频真实自动填表观察结论

- v6.26 发布后真实低频观察与 v6.25 #49 的关键差异：同样是一次正常开局交互，本轮 `mfrs-provider-mode-guard-6-26` 没有再出现 `NativeTableServiceAdapter.executeMutation` 或“SQL 变更仅在 SQLite 模式下可用”，说明 provider guard 修复覆盖了 #49 暴露的 SQLite UI / Native adapter 错配路径。
- 本轮真页运行态为 `characterId=5` / avatar `神秘复苏模拟器发布版2.png` / `fillMode=ai_crud_plan`。开局 `CodexV626Observer` 成功生成正文、A-D 选项、ghost encounter/status/choices 面板。
- 自动填表并非全表落盘，但固定表写入成功：最终导出 14 表合计 9 行，`行动建议` 4 行、`检定建议` 5 行，其余表 0 行；`CodexStage11` 测试残留为 0。
- 运行日志面板复核显示 11 条新增 `ERROR SQLite引擎`，内容全部为 `SELECT * FROM _acu_sheet_meta` 缺表。代码只读确认 `_loadAllMeta()` 对缺表做 catch，并会通过 fallback 数据结构继续导出；因此这是导出/元数据读取路径的 ERROR 级别噪音，不是本轮自动填表落盘失败。
- 本轮未见 `API_MUTATION_FAILED`、`SQLite 引擎未初始化`、`Too Many Requests`、`ROW_NOT_FOUND`、`CHECK_IN_VIOLATION`、`LENGTH_VIOLATION` 或 `UNIQUE constraint failed`。后续若继续优化，优先把 `_acu_sheet_meta` 缺表查询降噪或在导出前确保元数据表存在；它不是当前发布阻断项。

## 2026-06-14 阶段11：v6.26 provider guard 发布收口经验

- v6.26 发布链路已验证：provider guard 修复 `474c1230dc90142b92161c76087283945cefc560` -> loader/self-reclaim `61ed58593b9e15e7b19f6c65561a539ddeccd1c9` -> bot bundle `27ce3856ba9e56f080225ddc1310a5c5f661d610` -> release `7a5e58b125e0e27bfaf603848747dea95fd5b8a6`。
- 发布口径为 `6.26` / `phase139-provider-mode-guard-6-26` / `mfrs-provider-mode-guard-6-26`。继续发布时不要复用 v6.25 的 `phase138...` cache，避免玩家命中旧 provider 实例路径。
- 发布版 YAML 头像字段仍指向 `神秘复苏模拟器.png`，同时仓库内存在可导入的 `神秘复苏模拟器发布版.png`。CDN smoke 建议两个 PNG 都检查：avatar PNG 证明 YAML 指向的头像可取，publish PNG 证明可分发导入卡可取。
- PowerShell 构造路径时，数组实参中的表达式必须加括号：`@('src', $rel, ($rel + '.png'))`。写成 `@('src', $rel, $rel + '.png')` 会把 `+` 表达式拆开，造成假的 CDN 404。
- PowerShell here-string 管道给 Node 时，中文路径/中文字面量仍可能被当前控制台编码破坏。PNG 元数据、YAML 校验和 browser eval 里的关键中文路径应优先使用 Unicode escape 或先复制到 ASCII 临时路径。
- jsDelivr 新增大 PNG 可能短时间出现边缘 stale 404。若 raw.githubusercontent 同 ref 同路径返回 200，且 jsDelivr 稍后/换 ref 可返回 200，可对精确路径执行 `purge.jsdelivr.net` 后重试；不要误判为发布提交缺文件。
- 真页刷新后 SillyTavern 可能回到最近聊天列表而没有当前角色上下文，此时 `AutoCardUpdaterAPI` / `MysteryDatabaseFrontend` 为空是正常现象。用 `SillyTavern.getContext().selectCharacterById(<id>)` 重新选择 v6.26 角色后再判断 runtime marker。
- 阶段11真页不触发 AI 的最小 CRUD 覆盖了 #49 的关键风险：在 `fillMode=ai_crud_plan` 且 marker 为 `mfrs-provider-mode-guard-6-26` 时，`supernatural_events` 的 `insertRow -> updateCell -> deleteRow` 全部 `ok=true`，没有再进入 `NativeTableServiceAdapter.executeMutation` 错配错误。

## 2026-06-14 阶段10：storageMode/provider mismatch 根因与本地修复

- 根因是状态源分裂：`isSqliteMode()` 读取 `settings_ACU.storageMode`，但 `getStorageProvider()` 只在 `currentProvider === null` 时创建 provider，已有 provider 不会随设置加载、模式持久化或切卡刷新后的 settings 变化自愈。
- #49 的错误链路符合这一点：`insertRow` 因 `settings_ACU.storageMode === 'sqlite'` 进入 SQLite SQL 分支，但 `getStorageProvider()` 返回旧 `NativeTableServiceAdapter`，于是 `executeMutation` 抛“SQL 变更仅在 SQLite 模式下可用”。
- 修复方向应放在 storage strategy 单例入口，而不是只改 `insertRow`：所有写入口都复用 provider，入口自愈能覆盖 `updateCell/updateRow/insertRow/deleteRow` 和后续类似路径。
- 本地修复已落地：`getStorageProvider()` 校验 `currentProvider.mode` 与当前 settings mode，错配时销毁并按 settings 重建；`_ensureProviderInitializedForWrite()` 在 SQLite 写入前检查 provider mode、`_initialized` 与 `engine.isReady`，必要时同步 reload，reload 后仍不 ready 则抛明确错误。
- 新增 `scripts/verify-storage-provider-mode-guard.mjs` 复现“native provider 先懒初始化、settings 后变 sqlite”的运行态错配，断言 provider 会重建并初始化为 SQLite。该脚本适合作为后续 vendor 发布前 gate。
- 阶段10本地 gate 已通过：`node --check vendor\shujuku-sp-fork\index.js`、`node --check scripts\verify-storage-provider-mode-guard.mjs`、`node scripts\verify-storage-provider-mode-guard.mjs`、`node scripts\verify-table-change-adapter.mjs`、`node scripts\verify-sql-debug-regressions.mjs`、`git diff --check -- vendor/shujuku-sp-fork/index.js scripts/verify-storage-provider-mode-guard.mjs scripts/verify-table-change-adapter.mjs`。
- 该条记录的是阶段10当时的本地修复状态；修复随后已进入 v6.26 发布资源。若追溯同类问题，不能直接拿 v6.25 CDN 再验，应以 v6.26 的 provider guard 链路为准。

## 2026-06-14 阶段9 #49 发布后低频观察：SQLite UI 与 Native adapter 写入路径不一致

- #49 观察必须先确认当前运行卡；本轮恢复时页面显示的不是 v6.25 发布态，而是旧 marker `mfrs-applied-mutation-verify-6-20`。需要导入 `.codex-v621-stage9` 的 v6.25 发布 PNG、切到新卡并刷新后，marker 才变为 `mfrs-duplicate-insert-vendor-ref-6-25`。
- v6.25 发布卡资源本身正确：新导入卡 `characterId=4` / avatar `神秘复苏模拟器发布版1.png`，卡内容含 `6.25`、`e2561bc...`、`phase138...`，运行 vendor URL 来自 `599e2962beaa95354ab7beb41d45228251e9f0be`。
- 低频开局正文生成成功，A-D 选项和状态栏都出现，说明主对话生成链路和前端渲染链路正常。
- 自动填表失败不是 CDN 404、表头缺失或 unique key update 问题。14 表导出仍为完整表头、0 数据行；SP 面板显示 `14个表格, 0条记录`，所有表“上次更新”为 `未初始`。
- 关键新错误：日志中真实 `insertRow` 调用进入 `NativeTableServiceAdapter.executeMutation`，并抛“SQL 变更仅在 SQLite 模式下可用。请在设置中切换到 SQLite 模式。”；但 UI 单选框显示 SQLite 模式已勾选，`fillMode=ai_crud_plan`。
- CRUD Plan 三次尝试分别暴露 `ROW_NOT_FOUND` 和 `API_MUTATION_FAILED`，根因均指向上述 Native adapter 写入路径；随后下一次 AI 调用遇到上游 `Too Many Requests`，CRUD 填表冷却 15 秒并停止。
- 下一阶段不应继续点真实交互或手动更新放大限流。优先离线/只读追踪 storage provider 初始化、模式切换持久化、发布卡新导入/刷新后的 provider 状态，以及数据库面板 SQLite 显示和底层 adapter 选择是否来自不同状态源。

## 2026-06-14 planning-with-files 恢复与提交边界维护约定

- `PROJECT_FLOW.md` 是常驻项目运行流程文件，负责保存开发入口、构建发布链路、真页验证口径和新对话恢复流程；不要把它当成一次性阶段记录归档掉。
- `task_plan.md` 只保留当前状态、当前任务、版本变更索引和提交边界；旧阶段流水优先留在 `progress.md`，经验结论留在 `findings.md`，避免主恢复入口过长且过时。
- 新对话恢复顺序固定为：`task_plan.md` -> `PROJECT_FLOW.md` -> `progress.md` 顶部最近记录 -> `findings.md` 顶部经验 -> `git status --short --branch`。
- 当前有效发布口径是 v6.27，当前候选线是 v6.28 P5.1；如果 `session-catchup.py` 再报告旧 v6.21 中段残片，默认按已被 v6.25/v6.27/v6.28 P5 覆盖处理，不应回退当前计划。
- planning 整理类提交边界应保持窄：只提交 `task_plan.md`、`progress.md`、`findings.md`、`PROJECT_FLOW.md`。业务源码、dist、vendor、日志、截图、临时 worktree 和归档快照必须按实际任务另行判断。
- `版本变更索引` 是历史版本事实的主入口；新增阶段或发布时应先更新当前有效版本、发布 hash/cache/marker、验证状态，再把完整流水补进 `progress.md`。

## 2026-06-13 阶段9发布收口：v6.25 链路、CDN hash 与真页 CRUD 经验

- `git log --oneline` 的短 hash 不能手工补全成长 hash；发布 CDN ref 必须用 `git rev-parse <short>` 或 `git ls-remote` 拿真实完整对象名。本轮 v6.24 曾把 `599e296` 错补为不存在的 `599e296bc946...`，CDN vendor 404；修复时必须 bump cache 到 v6.25/phase138，避免玩家命中坏 cache。
- CDN smoke 必须同时检查 release YAML/PNG、loader、database frontend self-reclaim、vendor 四层。只看发布卡指向的新 bundle 不够；loader 里嵌入的 vendor URL 写错同样会让真页运行时断链。
- SQLite provider 导出空表时不能只采用 `SELECT *` 的实际结果列；当查询列是 DDL 列子集时，应按 DDL 列顺序导出完整表头，并按查询列对齐行值。否则空表会退化成只有 `row_id`，前端 adapter 会误报 `COLUMN_NOT_FOUND`。
- duplicate `insertRow` 提升为 `updateCell` 时，update set 必须跳过 `primaryKey` 和 `unique` 列。自然键只负责定位重复行，不能再被写回，否则 SQLite 可能把同一个 unique key 当作冲突更新而失败。
- `MysteryDatabaseFrontend.previewTableChangePlan()` 的返回对象是顶层 `action/table/rowIndex/affectedColumns/errors`，不是嵌套在 `plan` 下。真页 smoke 断言要按实际运行对象读字段。
- PowerShell 管道到 `agent-browser eval --stdin` 时，中文路径或中文字面量仍可能变成 `????` / `???`。真页脚本优先使用 ASCII 物理表名/列名、Unicode 转义或固定列序；不要用中文列名字符串参与关键判断。
- `agent-browser` 长 mutation eval 返回阶段可能出现 CDP `os error 10060`，但浏览器侧 mutation 可能已经部分或全部完成。遇到该现象不要重复同一 mutation，先用独立短只读导出复查，再决定是否补测或清理。
- 发布版真页 smoke 的最终判据应包含：当前 `chid/avatar`、卡内容 hash/cache、runtime marker、`AutoCardUpdaterAPI`/`MysteryDatabaseFrontend` 存在、`fillMode=ai_crud_plan`、空表完整表头、最小 CRUD 成功和测试 token 0 残留。本轮 v6.25 满足这些条件，且未调用 `triggerUpdate()`。

## 2026-06-13 v6.21 阶段8：CRUD 重试状态污染与约束修复结论

- 阶段7 的 `UNIQUE constraint failed` 与“导出看起来仍为空”的组合，核心不是发布资源回退，而是 CRUD 重试状态不一致：失败尝试会在 SQLite runtime 中留下部分写入，但下一次尝试只回拨 JSON 基线，导致后续重试看见不可见的唯一键冲突。
- 修复要同时处理两层：vendor 负责在批次重试/失败/应用前用同一个 helper 回拨 JSON 与 SQLite runtime；adapter 负责在写入前把明显重复的 `insertRow` 分流为 `updateCell`。
- `exportTableAsJson()` 在 sqlite 模式下应优先读 provider 当前实态；直接返回 `currentJsonTableData_ACU` 会让前端看到陈旧空壳，误判为“没写入”。
- DDL 元数据必须解析 `UNIQUE`，否则 `supernatural_events.event_code`、`chronicle.code_index`、`ghost_archives.archive_code` 等自然键无法在前端预检层做 upsert 分流。
- `supernatural_events.handling_status` 的常见自然语言值需要在 adapter 层归一化到模板枚举：`爆发中/正在爆发/扩散中 -> 失控扩散`，`处理中/处置中/交战中 -> 对抗中`，`已解决/已完结/已处理 -> 结束`，`已控制 -> 已压制`，`已收容 -> 已关押`。
- 真页验证不宜加载当前主工作区的数据库前端 dist：主工作区落后远端时，dist 内 self-reclaim 常量可能指向旧 hash/cache。验证 adapter 行为可单独编译 `table-change-adapter.ts` 注入页面，并用当前页面 API 做最小可逆 CRUD。
- Windows/PowerShell 到 browser eval 的管道不要直接写中文路径或中文字面量；用 Unicode 转义，避免路径变 `????` 或枚举值变 `???` 后产生伪失败。
- agent-browser 长 mutation eval 可能在返回阶段出现 `os error 10060`；这类情况要用独立只读导出复查和清理结果判断实际状态，不能仅凭 CDP 返回失败判定 mutation 失败。

## 2026-06-13 v6.21 阶段6发布后观察：首轮真实游玩遇到 API 限流冷却

- 阶段6基线确认 v6.21 发布版运行态正确：`chid=5`、avatar `神秘复苏模拟器发布版2.png`、卡版本 `6.21`、卡内容含 `bea7926...`、runtime marker `mfrs-naked-instance-fallback-6-21`，`insertRow` 包含 `_ensureProviderInitializedForWrite`。
- 基线数据库 14 表合计 0 行，运行日志 `共 0 条`；因此本轮新增日志可明确归因于阶段6真实游玩观察。
- 正常页面流程开局后，AI 正文生成成功，页面出现 A-D 推演选项和状态栏，说明卡正文/状态栏/choices 渲染链路正常。
- 自动填表没有落盘：导出 14 表仍合计 0 行，设置面板多张表显示 `2 (无变更)`。
- 运行日志新增 3 条，全部是限流/冷却：
  - `parseNonStreamResponse` ERROR：上游返回 `Too Many Requests`。
  - `shujuku_v120` WARN：CRUD Plan 第 1 次尝试失败。
  - `CRUD 填表` WARN：判定 API 传输问题并冷却 15 秒，停止本轮重试。
- 本轮未见 `API_MUTATION_FAILED`、SQLite 未初始化、CHECK/长度约束失败或明确 JSON 解析异常。因此不应把这次 0 落盘误判为 v6.21 SQLite 初始化兜底失败，也不应回退发布资源。
- 后续路线应优先复核 API 稳定性与冷却策略：降低重试/并发、确认当前预设可用性、等待冷却后低频复测；不要在限流窗口内继续触发第二轮自动填表。

## 2026-06-13 v6.21 阶段5发布验证经验

- CDN smoke 不能只验证 loader/vendor。数据库前端 `src/神秘复苏模拟器/脚本/数据库前端/index.ts` 也有 self-reclaim 逻辑；如果 `api_owner_mismatch` 分支仍指向旧 vendor/cache，它会在真页把正确的 v6.21 runtime 覆盖回旧 v6.20。
- 本次真页旧 marker `mfrs-applied-mutation-verify-6-20` 的根因不是 `78c5dbb` loader 或 `0881382` vendor，而是数据库前端 dist 里的 reclaim 常量仍是 `f88460d...` / `phase133...`。发布验证必须同时 grep loader、vendor、数据库前端 dist 三处的旧 hash/cache/marker。
- 修复数据库前端资源指向后，推送源码+dist 提交会触发远端 `[bot] bundle`。最终发布卡的 `CDN_REF` 应指向 bot bundle `bea7926...`，而不是前一个手工修复提交 `408dc27...`。
- PowerShell 拼 jsdelivr URL 时不要在双引号中直接写 `$encoded?v=...`，本次会被拼成错误的 `.../@hash/=phase...`。用格式化字符串 `'{0}@{1}/{2}?v={3}' -f ...` 更稳。
- 当前酒馆的 `ctx.importFromExternalUrl()` 依赖 `/api/content/importURL`，但该 endpoint 返回 404；发布版真页导入应优先使用本地最终 PNG 上传到 `#character_import_file`，再选择新导入的角色卡。
- 多标签页会影响判断：本次新卡导入在 `t2`，`t1` 仍是旧发布卡。真页 smoke 要明确当前 tab、`characterId`、avatar、卡内容 hash 与 runtime marker，避免把旧标签页状态误当成最终结果。
- 最终真页通过判据：当前卡 `version=6.21` 且卡内容包含 `bea7926`，runtime marker 为 `mfrs-naked-instance-fallback-6-21`，`insertRow.toString()` 包含 `_ensureProviderInitializedForWrite`，`MysteryDatabaseFrontend` 三个关键方法存在，最小 CRUD 后测试行清理为 0。

## 2026-06-13 v6.21 阶段4发布版同步经验

- 当前主工作区仍有既有 dirty 且落后远端；阶段4继续使用临时干净 worktree `.codex-v621-stage4` 基于 `origin/main=78c5dbb`，避免把本地 planning/log/screenshot/状态栏 dist dirty 混进发布提交。
- `scripts/publish-card.mjs` 已具备 `EXISTING_CDN_PATTERN`，阶段4只需要更新 `CDN_REF`、`CDN_CACHE_VERSION`、`releaseVersion` 三个值即可把开发版 YAML 中旧 CDN hash/cache 替换为新发布口径。
- v6.21 发布版同步口径：发布版卡版本 `6.21`，项目资源 hash `78c5dbbf2bd789c1045b6f4abd3a610db5d58593`，cache `phase134-naked-instance-fallback-6-21`。提交 `d52708a release: publish v6.21 card` 只包含发布脚本、发布版 YAML、发布版 PNG 3 个文件。
- PNG 元数据校验应继续同时检查 `tEXt:chara` 与 `tEXt:ccv3`。本次两个块均解码为 `version=6.21`，均包含 `78c5dbb...` 与 `phase134...`，且不含旧 `c3de698...`、`phase133...`、`f88460d...` 或本地链接。
- 阶段4只完成本地发布产物与远端提交；阶段5仍需 CDN smoke 与发布版真页 smoke，才能把 v6.21 记为最终发布验证完成。

## 2026-06-13 v6.21 阶段3资源发布经验

- 当前主工作区有既有 dirty，且远端自动 bundle `2da008b` 也修改 `dist/神秘复苏模拟器/界面/状态栏/index.html`。遇到这种同文件冲突风险时，不要在主工作区强行 merge/stash；使用临时干净 worktree 基于 `origin/main` 做发布回填更稳。
- v6.21 vendor 修复资源口径：`058882e fix: initialize sqlite provider before writes` 只提交 `vendor/shujuku-sp-fork/index.js` +24 行；合并远端 bot 依赖后推送为 `0881382`。CDN `@0881382/vendor/shujuku-sp-fork/index.js` 已确认包含 `_ensureProviderInitializedForWrite` 与 `检测到未初始化的 SQLite 实例`。
- loader 回填口径：`src/神秘复苏模拟器/脚本/数据库/index.ts` 和 `dist/神秘复苏模拟器/脚本/数据库/index.js` 指向 vendor ref `0881382254b209f8ef23963ec21ff2c7cf89c780`，cache `phase134-naked-instance-fallback-6-21`，marker `mfrs-naked-instance-fallback-6-21`。
- 在干净 worktree 中直接 `pnpm build` 会因无 `node_modules` 找不到 webpack；可用主工作区 `..\node_modules\.bin\webpack --mode production`，工作目录保持在 worktree。Windows 沙箱可能报 `spawn EPERM`，提升权限重跑即可。
- 构建会顺带改状态栏和数据库前端等无关产物；阶段3 loader 回填提交只应保留 `src/.../脚本/数据库/index.ts` 与 `dist/.../脚本/数据库/index.js`，其他构建噪声需要恢复后再提交。
- CDN loader `@78c5dbb/dist/.../脚本/数据库/index.js?v=phase134-naked-instance-fallback-6-21` 已返回 200，包含新 vendor ref/cache/marker，且不含旧 `f88460d...` 或 `phase133...`。

## 2026-06-13 v6.21 阶段2本地验证经验

- 真页当前开发版角色 `神秘复苏模拟器` 仍可能加载 v6.20 CDN 运行时；仅看到 `AutoCardUpdaterAPI` / `MysteryDatabaseFrontend` 存在不足以证明跑的是本地新修复。必须检查 `AutoCardUpdaterAPI.insertRow.toString()` 是否包含 `[修复 v6.21]` / `_ensureProviderInitializedForWrite`。
- `pnpm build` 生成的 `dist/神秘复苏模拟器/脚本/数据库/index.js` 只是 1.2KB loader，里面仍指向 `vendor/shujuku-sp-fork/index.js` 的发布 hash。修改 vendor fork 后，本地真页验证若未发布新 hash，需要临时加载 `http://127.0.0.1:5500/vendor/shujuku-sp-fork/index.js?...`。
- 本地 v6.21 vendor 通过经典 `<script>` 标签加载即可，因为 `vendor/shujuku-sp-fork/index.js` 是 userscript/IIFE，不是 ESM。加载前要清理旧 `AutoCardUpdaterAPI`、`__mfrsDatabaseScriptMarker__`、`__ACU_STAR_DB_III_LOADED__`，否则可能继续命中旧实例。
- 阶段2有效验证用 `action_suggestions` 更稳：字段短、枚举明确、可固定 `row_id=1/2`，能覆盖插入、更新、删除与清理；不要用 `玩家状态` 作为 smoke 表，它有复杂必填字段，容易把表结构错误误判成 v6.21 失败。
- 本地 vendor 刚重载后，立即走 `MysteryDatabaseFrontend.applyTableChangePlan` 可能在前端元数据尚未恢复时返回 `TABLE_NOT_FOUND`。这不等于 SQLite 初始化兜底失败，因为还没进入 vendor 写路径；若要验证 vendor 写路径，应改用 `AutoCardUpdaterAPI.insertRow/updateCell/deleteRow` 直接打 CRUD，再用 `MysteryDatabaseFrontend.exportCurrentData()` 复查。
- v6.21 真页验证通过判据：本地 marker `mfrs-naked-instance-fallback-6-21-local`，`action_suggestions` 插入/更新/删除成功，导出复查命中测试 token，最终 0 残留，且无 `SQLite 引擎未初始化`、`SqlTableService`、`API_MUTATION_FAILED` 或 CRUD failed 日志。

## 2026-06-12 v6.20 发布后首次真实游玩：SQLite 引擎未初始化（全新错误类型）— 仅诊断，未改代码

**触发上下文：** 用户在 v6.20 发布版上跑了一轮真实对话（自动填表，非手动）。现象：推演选项未出、状态栏未出、前端 14 表数据未更新。日志 `acu-logs-2026-06-12T10-06-33-604Z.json`，68 条：57 error + 11 warn，时间 09:59:13 → 10:05:17。

### 一句话根因（高置信度，已被上游修复档案坐实）

真实对话自动填表（`triggerUpdate` 链路）调用 `insertRow` 时，拿到的 `SqlTableService` 实例**没经过 `loadFromChat()`**，`_initialized=false` / `engine.isReady=false` → `_ensureInitialized()` 抛 `SQLite 引擎未初始化，请先调用 loadFromChat()`。这是**初始化时序/生命周期竞态**，不是约束类、SQL 语法类、限流类，历史从未出现过。

### 错误分层

| 层 | 类型 | 占比/说明 |
|---|---|---|
| 根因 error | `[SqlTableService] SQLite 引擎未初始化，请先调用 loadFromChat()` | 57/68（84%），全部同一条；抛点 `_ensureInitialized`（vendor index.js:13038/13040）|
| 上层 warn | `API_MUTATION_FAILED: <表>: insertRow 执行失败` | 根因 error 的批次包装；3 个填表批次（4/4、7/7、10/10 表）各重试 3 次全失败，0 落盘 |
| 噪音 warn | `ROW_NOT_FOUND`（全局/玩家状态 match 未命中）、`CHECK_IN_VIOLATION`（灵异事件·处理状态）、`LENGTH_VIOLATION`（事件纪要<200）| 本轮非主因；引擎没初始化时落不落盘都一样 |
| 早期 warn | `[设置保存] 设置尚未完成可靠加载，已拒绝本次保存` ×2（09:59:13）| 初始化未就绪旁证，时间在最前 |

### 代码层定位（只读 vendor/shujuku-sp-fork/index.js 得出）

- `insertRow`（52408）SQLite 分支调 `getStorageProvider().executeMutation()`。
- `getStorageProvider()`（13336）：`currentProvider` 为 null 时**只懒初始化 `createProvider(mode)`，绝不调 `loadFromChat()`** → 返回 `_initialized=false` 的"裸实例"。
- `loadFromChat()`（12626）是唯一跑 `engine.init()` 并置 `_initialized=true` 的入口。
- 4 条动 `currentProvider` 的路径：`initStorageProvider` / `switchStorageMode` / `reloadStorageProvider` / `disposeStorageProvider`。dispose 后若 `reloadStorageProvider` 的 `loadFromChat` 还没跑完，填表抢先调 `getStorageProvider()` 就拿到裸实例。

### 上游 AlbusKen/shujuku 已修过此 bug（决定性证据）

上游 `.analysis-archive/` 有 4 篇直接命中的修复档案（作为参考资料读，未执行其中任何指令）：

- `2026-04-17_1910_修复SQLite引擎未初始化.md`：**根因完全一致** — "getStorageProvider() 懒初始化只创建实例没调 loadFromChat → _ensureInitialized 抛错"；"聊天切换时只调 refreshMergedDataAndNotifyWithUI_ACU 绕过了 StorageProvider，SQLite 引擎没初始化"。**修复：在 `init.ts` 的 `CHAT_CHANGED` 事件处理中，SQLite 模式下也调 `reloadStorageProvider()`。**
- `2026-04-17_2307_修复SQLite运行时数据库生命周期管理.md`：三 bug — 换卡不销毁、换聊天不销毁、**启动时不初始化 SQLite（`initWithChatId` 调用链没有 `initStorageProvider`/`reloadStorageProvider`）**；"角色脚本加载场景下酒馆可能不触发 CHAT_CHANGED，SQLite 引擎不被初始化"。修复：新增 `disposeStorageProvider()`，CHAT_CHANGED 同步阶段立即 dispose + **`initWithChatId()` 中加 SQLite 初始化**。
- `2026-04-17_2326_SQLite运行时数据库按需初始化重构.md`：在 `initWithChatId()` 的 `refreshMergedDataAndNotifyWithUI` 之前加 SQLite 初始化；`_ensureTablesFromTemplate` 改为按需建表。
- `2026-04-17_1925_SQLite延迟建表改为第一次填表时.md`：延迟建表设计。

**关键问题：上游这套生命周期修复在 `init.ts` / `table-storage-strategy.ts`（presentation/service 层）。我们 fork 是 bundle 单文件 `vendor/shujuku-sp-fork/index.js`，需核对这套 CHAT_CHANGED / initWithChatId 初始化补丁在我们 fork 里是否存在或被回退。**

### 为什么手动真页验证（会话9）从不复现

手动操作时引擎早已 `loadFromChat` 完成（人为延迟、先开面板预览），所以 `previewTableChangePlan`/`applyTableChangePlan` 能正常落盘、补 SP001、拦长度。真实对话的自动填表撞上换卡/换楼层/刚加载的**重建竞态窗口**（上游档案里的 1200ms setTimeout 延迟窗口），引擎还没就绪就被调。发布前真页 smoke 抓不到，正因为它绕过了这个时序。

### fork 核对结论：上游三套补丁全在，没被回退 —— 竞态窗口仍存在

只读核对 `vendor/shujuku-sp-fork/index.js`，上游那套生命周期补丁**全部存在**：

- `disposeStorageProvider`（13439）、`reloadStorageProvider`（13450）、`initStorageProvider`（13349）均在。
- `CHAT_CHANGED` 监听（51218）：51223-51227 在 `chatFileName` 有效且 `isSqliteMode()` 时**同步立即 `disposeStorageProvider()`**；重建在 51289 的 `setTimeout(..., 1200)` 内（51296-51299 `reloadStorageProvider`）。
- 启动入口 `initWithChatId`（51535）：51544-51547 SQLite 模式调 `reloadStorageProvider()`，且 chatId 不可用时有轮询（51570，200ms×75=15s）。

**因此根因不是"补丁缺失"，而是补丁本身的时序设计留有竞态窗口：**

1. **CHAT_CHANGED 的 1200ms 裸实例窗口（最可能）**：51225 同步 dispose 把 `currentProvider` 置 null，但 reload 在 1200ms setTimeout 里。这 1.2 秒内任何写入调 `getStorageProvider()`（13336）→ 懒建裸实例（`_initialized=false`）→ `insertRow` 抛错。换卡/换聊天/swipe/删楼后立刻触发填表必撞。
2. **启动 setTimeout 1000ms 窗口**：51561 `initWithChatId` 也在 `setTimeout(1000)` 里。刚加载页面后 1 秒内触发填表，reload 还没跑完，同样裸实例。
3. **reloadStorageProvider 是 async，`loadFromChat()` 内 `engine.init()` + `mergeAllIndependentTables` 本身耗时**：即使进了 setTimeout 回调，`await reloadStorageProvider()` 完成前若填表已在排队，仍可能抢跑。

**注意 `initStorageProvider` 的 fallback（13364）：** SQLite `loadFromChat` 若 `!result.loaded && result.error` 会自动 fallback 到 native。但本轮 error 是 `_ensureInitialized` 抛的（裸实例从没调过 loadFromChat），不是 loadFromChat 内部失败，**所以没触发 fallback，一直停在 sqlite 裸实例**——这解释了为什么没看到 fallback 到 native 的日志。

### 新证据（本轮 6.12 二次只读定位）：CHAT_CHANGED 守卫会让"裸实例"永久持续，不止 1.2 秒 —— 解开"持续 6 分钟"疑点

之前把窗口1记成"1.2 秒裸实例窗口"，但 dispose→reload 之间不只是时间差，reload 还**带前置守卫**，命中即永不 reload：

- `disposeStorageProvider()`（51225）在 CHAT_CHANGED 同步段把 `currentProvider=null`，**无条件执行**（只要 chatFileName 有效且 sqlite）。
- 重建 `reloadStorageProvider()` 在 51289 的 `setTimeout(1200)` 回调里，但回调开头 51290-51293 有守卫：`if (scheduledChatIdentifier_ACU && currentChatFileIdentifier_ACU !== scheduledChatIdentifier_ACU) return;` —— **当前活跃聊天 identifier 与本次调度的不一致就直接 return，跳过 `reloadStorageProvider()`**。
- 即换卡/换聊天若在 1200ms 内连续发生第二次 CHAT_CHANGED（或 identifier 归一化口径不一致），第一次的 reload 被守卫吃掉，而它已经 dispose 过了 → `currentProvider` 停在 null → 之后每次 `insertRow` 经 `getStorageProvider()`（13336）懒建裸实例 → **持续报错直到下一次成功的 reload/init**。这正好解释日志里错误持续整整 6 分钟（10:00:51→10:05:17）、远超单次 1.2s 窗口的现象。

- `executeMutation`（12867）的 `this._ensureInitialized()` 在 **try 块之外**（try 从 12870 起）→ 裸实例抛错不会被 executeMutation 内部 catch（12891）转成 `{changes:0,errors:[...]}`，而是直冲 `insertRow` 的 catch（52441）→ 日志原文 `insertRow failed: SQLite 引擎未初始化`。错误形态与 57 条完全吻合，确认就是这条路径而非 loadFromChat 内部失败。

- 启动入口同理：`initWithChatId` 在 `setTimeout(1000)`（51561）或 chatId 轮询（51570）里，刚加载就触发填表也会撞裸实例；但本轮首错延迟 98s，更像 CHAT_CHANGED 守卫路径而非启动路径。两者需 Console 全量 `logDebug_ACU` 区分。

**结论修正：** 根因仍是"裸实例 + getStorageProvider 不调 loadFromChat"，但持续 6 分钟的机制是 **CHAT_CHANGED 守卫跳过 reload**，不是单纯的时序赛跑。修复方向 A（在 `getStorageProvider()` 写路径加同步兜底，拿到 `_initialized=false` 就先 `loadFromChat`）能根治此守卫路径，优于只缩短 setTimeout 的方向 C。

### 下一步（待用户决定，未改代码）

1. **确认触发场景**：这轮是不是"刚切到卡/刚加载/swipe 重roll 后立刻发消息触发填表"。需要 Chrome console 的 `logDebug_ACU` 全量日志（SP 面板只收 warn/error，看不到 `[SQLite] CHAT_CHANGED/initWithChatId` 这些 debug 行），看填表前最后一次 Provider 生命周期事件。这能区分是窗口 1 还是窗口 2。
2. **修复方向（按推荐度）**：
   - **A（最稳）：在 `getStorageProvider()` 写路径加同步兜底** —— 拿到 `_initialized=false` 的实例时不直接用，而是让写操作 await 一次 `reloadStorageProvider()` 再执行。根治所有窗口，不依赖 setTimeout 时序。
   - **B：填表入口前置 await 初始化** —— `triggerUpdate`/CRUD 批次执行前确保 `currentProvider._initialized`，否则先 `await reloadStorageProvider()`。
   - **C：缩短/消除 setTimeout 窗口** —— 把 CHAT_CHANGED 的 reload 提前，或 dispose 后立即同步标记"重建中"挡住写入。改动面大，治标。
3. 修复后必须**真页复现验证**：模拟"换卡/swipe 后立刻 triggerUpdate"，而不是手动慢操作（手动慢操作天生绕过竞态，会假阳性通过）。这是发布前 smoke 漏掉本 bug 的根本原因。

## 2026-06-12 v6.20 发布收口经验

- 发布前的 CDN smoke 不能只看候选 commit 是否存在文件，还必须打开 loader 内容确认 cache/marker。此次候选 `a83888d...` 返回 200 但仍是 `phase132`，真正包含第 9 步发布运行时的是 `c3de698cd6963082f89eaed8d80fd3cdf481a47e`。
- `scripts/publish-card.mjs` 的 `CDN_REF` 应指向已发布 loader bundle，而不是只含局部中间产物的候选提交。修正为 `c3de698...` 后，发布版 YAML/PNG 与真页 network 才统一到 `phase133-applied-mutation-verify-6-20`。
- PNG 校验必须同时检查 `tEXt:chara` 与 `tEXt:ccv3`。本次三张 PNG 都确认有两类元数据；发布版 PNG 的 `version=6.20`，开发版镜像 PNG 仍为 `version=2.0`，这是当前脚本输出的实际状态。
- 发布提交应继续精确 staging。此次 `da681d2 release: repoint v6.20 card to published loader bundle` 只包含 6 个发布修正文件；planning 文档和无关 dirty 未混入发布提交。
- tag 口径要单独核对：`HEAD/origin/main` 已是 `da681d2e...`，但没有 tag 指向 `HEAD`；`v0.0.134` 仍指向 `c3de698...`。后续如果需要可另行决定是否补发 tag，不能误报为已打新 tag。
- 发布版真页验证继续遵守不触发 AI 的原则：不要调用 `triggerUpdate()`，只用 `MysteryDatabaseFrontend.previewTableChangePlan` / `applyTableChangePlan` 做最小可逆写入验证，再删除测试行。
- PowerShell/浏览器 eval 涉中文时仍优先用 ASCII 表名与物理列名：`action_suggestions`、`chronicle`、`option_key`、`code_index`。这能避免中文编码噪声影响真页判断。
- 本次发布版真页验证确认 phase133 运行时生效：`action_suggestions` 空表 `updateCell + match.row_id=2` 预览提升为 `insertRow` 并落盘；`chronicle` 缺 `code_index` 的合法纪要自动补 `SP0001`；短纪要与过长纪要仍被长度约束拦截。
- 真页 smoke 的收口条件必须包含清理验证。本次删除 `action_suggestions row_id=2` 与 `chronicle code_index=SP0001` 后，两表均恢复 0 行，且无 `Browser smoke` 残留。

## 2026-06-12 第 9 步真页验证经验

- 真页验证必须先确认实际加载资源。当前开发版角色虽然是 `神秘复苏模拟器`，但卡内脚本仍指向旧 CDN commit `3f924897...`，直接调用 `MysteryDatabaseFrontend.previewTableChangePlan()` 得到的是旧运行时行为，不代表本地 `dist` 最新构建。
- PowerShell 通过 stdin 管道给 `agent-browser eval` 传中文字符串时可能出现中文变 `????`，导致 `TABLE_NOT_FOUND`。浏览器脚本里优先用 ASCII 表名/物理名（如 `action_suggestions`、`chronicle`）和 Unicode 转义值，可避免编码噪声。
- 用本地静态服务 `http://localhost:5500/dist/...` 临时 import 最新 `数据库前端/index.js` 可以验证本地 bundle 行为；但这只是运行时 smoke，不等于开发版/发布版卡内 CDN 引用已更新。
- 本次临时加载本地 bundle 后，真页确认固定行空表兜底生效：`行动建议` 空表中 `updateCell + match.row_id=2` 预检提升为 `insertRow`，实际写入成功，并可用 `deleteRow` 清理。
- 本次真页确认 `事件纪要` 编号默认值生效：缺省 `code_index/纪要编号` 的 `insertRow` 自动生成 `SP0001`；短纪要继续只报 `LENGTH_VIOLATION`；过长纪要仍按大于 600 拒绝。
- 真页 smoke 应始终在写入后导出复查并清理测试行。本次清理后 `行动建议`、`事件纪要` 均恢复 0 行，未留下 `Browser smoke` 残留。

## 2026-06-12 第 9 步遗留项分流经验

- 固定行表空表时，AI 输出 `updateCell + match.row_id` 是合理意图：这些表设计上是固定槽位，空表状态下旧执行层找不到行会报 `ROW_NOT_FOUND`，导致建议槽位一直无法写入。
- 该兜底必须收窄：只对 `row_id INTEGER PRIMARY KEY` 且 DDL 能解析出 `BETWEEN` 或等价固定范围的表生效；目标 `row_id` 必须来自 `match.row_id` 或匹配条件、在范围内、当前表不存在该行。这样不会影响普通表的自然键匹配语义。
- 固定行表提升为 `insertRow` 后仍必须走原有列解析与约束预检。完整字段可插入；字段不完整继续返回 `NOT_NULL_VIOLATION`，不让兜底吞掉真实缺字段问题。
- `事件纪要.code_index/纪要编号` 是技术编号，可由执行层在 `insertRow` 缺省时自动补下一个 `SP000N`，减少非剧情字段导致的无效失败。
- `事件纪要.chronicle_text/纪要` 的 200 字下限是内容质量约束，执行层不应自动扩写。自动扩写会伪造剧情事实；正确处理是保留 `LENGTH_VIOLATION`，让 AI 重新生成足量纪要。

## 2026-06-12 v6.19 发布后日志复核经验

- 发布后观察阶段不要重复跑发布资源 smoke；优先复核真页当前运行状态、非敏感 settings 与 `SP·数据库 III -> 高级工具 -> 运行日志` 当前会话日志。
- `vendor/shujuku-sp-fork/index.js` 的 `getAllLogs()` 读取闭包内 `_buffer` 环形缓冲区，日志面板展示的是当前运行会话内存日志，不是持久化历史日志文件；判断发布后新问题时应结合当前面板时间与最新行，不要把旧导出日志当作当前失败。
- 本次第 8 步只读观察未手动触发 `triggerUpdate()`。原因是面板里已有真实发布后 CRUD 触发日志，手动触发会调用 AI、写库并可能引入限流噪声。
- v6.19 旧 P1 类异常未复现：未见 `API_MUTATION_FAILED`、`CHECK constraint failed`、`Too Many Requests`、`JSON.parse`、`AI回复过短`；可见 `[CRUD 原子批次容错] 1/10 条操作失败，已跳过`，说明批次容错生效。
- 剩余 WARN 属于 AI 计划质量/预检类：固定行表 `行动建议` / `检定建议` 的 `match` 未命中，以及 `事件纪要` 缺少 `纪要编号` 或 `纪要` 长度小于 200。后续应分流到计划生成质量和约束提示优化，而不是回滚 v6.19 row_id/batch 修复。

## 2026-06-12 v6.19 发布版 smoke 经验

- 酒馆真页发布版 smoke 可以先用 `getContext().characters` 确认开发版/发布版是否都已导入；本次开发版为 chid `2`，发布版为 chid `3`。若当前不是发布版，可用 `selectCharacterById(3)` 切换，但切换调用可能触发 CDP 返回阶段 `os error 10060`，应随后用短只读脚本复查当前角色，不要重复执行切换。
- `performance.getEntriesByType('resource')` 在发布版切换后不一定保留所有 jsdelivr URL 命中；`agent-browser network requests` 更适合确认实际加载的 hash/cache。本次 network 记录确认项目脚本从 `76af2775ffefc2b6b04c516f05fd2bf1be22185c` + `phase131-crud-p1-rowid-batch-6-19` 加载，vendor 从 `f88460d97127f3a16ee3c332b0631929541d7bdf` 加载。
- IndexedDB settings 检查只输出 `storageMode`、`fillMode` 等非敏感字段即可；本次确认 `storageMode=sqlite`、`fillMode=ai_crud_plan`，未读取或输出 API key。

## 2026-06-12 native/sqlite 模式切换与真页 CRUD 回归经验

- 存储模式切换必须以酒馆真页设置 UI 为准：选择 radio 后点击确认弹窗 `仅切换模式`，再用 IndexedDB 只读 settings 与运行时 API 双确认。直接改 IndexedDB settings 后刷新不可靠，页面/角色上下文可能回写旧值，或 settings 与运行时状态不一致。
- 本次 native 回归的可靠判据是：先确认 `storageMode=native`、`fillMode=ai_crud_plan`、marker `mfrs-crud-p1-rowid-batch-6-19`，再执行 CRUD，并在每个 mutation 后用 `exportCurrentData()` 复查行数和字段值。
- 真页已确认 `人物` 普通表在 native 下 insert/update/delete 可落盘并清理；`行动建议` 固定行表在 native 下显式 `row_id=1` insert/update/delete 可落盘并清理，覆盖了 P1 `row_id` 保留路径。
- `agent-browser eval` 对较长 mutation 偶发返回阶段 CDP 读超时 `os error 10060`；这不等同于业务失败。遇到该现象时，应立即用短只读脚本检查实际表状态，再决定是否清理或继续，不要重复执行同一个 mutation。

## 2026-06-10 v6.18 发布后填表全失败诊断（native + SQL 双模式均 0 落盘）— 仅诊断，未改代码

**触发上下文：** v6.18 上线后，玩家报告 14 表（玩家状态等）不再同步更新；不论原生模式还是 SQL 模式都不写库。旧版本原生模式从无此问题、SQL 模式偶有问题但仍能写。本次两种模式同时全挂。

**证据来源：** 两份运行日志 `acu-logs-2026-06-10T10-13-13-410Z.json`（含 `[SQL 沙箱]`，SQL/sqlite 路径）与 `acu-logs-2026-06-10T10-21-33-503Z.json`（无沙箱，native 路径）；真页 Chrome DevTools 实查现网表结构/行数/DDL/storageMode；`vendor/shujuku-sp-fork/index.js` 与 `src/神秘复苏模拟器/脚本/数据库前端/table-change-adapter.ts` 源码。

### 一句话根因

v6.18 把默认填表模式切成 `ai_crud_plan`（提交 `44ab669 feat: default fill table to CRUD plan`），所有写入统一走 CRUD 计划适配器的**原子批次**——一批计划里任一条失败即整批回滚、0 行落盘。而每批里**必然有一条踩雷计划**：native 路径踩毒计划 A，SQL 路径踩毒计划 B。旧版本逐表独立写入、单表坏不连累其它，所以原生模式以前从不出事。

### 放大器（共同总闸）：CRUD 原子批次一损俱损

`index.js:36239` 批次执行器：

```js
runTableUpdateApplyWithScopeLock_ACU(key, async () => {
  _set_currentJsonTableData_ACU(JSON.parse(JSON.stringify(batchBaseSnapshot))); // ① 先回滚到快照
  const parsedKeys = await applyPlans();       // ② 任一计划 throw 即中断
  return await persistAppliedTableUpdate(...);  // ③ 抛错则到不了这里 → 不保存
});
```

`applyPlans`（`index.js:36207`）逐条 apply，preview 不过（36221）或 execute 不过（36226）就 `throw`。一旦抛错：后续计划全跳过 + 前面成功的内存改动被开头的快照覆盖丢弃 + persist 不执行。**一条坏计划毒死整批，表保持空。**

### 毒计划 A（native 路径致命）：DDL 列解析正则误杀 `check_` 开头列

`table-change-adapter.ts:623`：

```js
if (/^(CREATE|CONSTRAINT|PRIMARY|UNIQUE|CHECK|FOREIGN|\);)/i.test(trimmed)) return null;
```

`检定建议(check_suggestions)` 表物理列 **`check_type`、`check_basis` 以 "check" 开头，被 `^CHECK` 误判为 CHECK 约束行过滤掉**。后果（真页实测坐实）：

- 两列从 `ddlMeta.columns` 消失 → 按 index 对齐错位：表头「检定类型」被错配到物理列 `dice_command`，「检定依据」无物理名。
- `columnAliases` 缺 `check_type/check_basis` → AI 用这两列名写入 → `COLUMN_NOT_FOUND` → throw → 整批回滚。

→ 对应 native 日志 `COLUMN_NOT_FOUND: 检定建议: check_type / check_basis`，它就是毒死整批的那一条。

### 毒计划 B（SQL/sqlite 路径致命）：固定行表 insert 撞 CHECK

`global_state`（`CHECK(row_id = 1)`）、`action_suggestions`（`CHECK(row_id BETWEEN 1 AND 4)`）是设计上「先有固定行、只 update」的表（模板 `insertNode: 禁止`）。现网实查这些表 **rows:0（空）**，AI 改发 `insertRow`。SQLite 分支生成的 INSERT 靠自增 row_id 落在 CHECK 范围外 → `CHECK constraint failed: row_id = 1` / `row_id BETWEEN 1 AND 4` → 返回 -1 → `API_MUTATION_FAILED` → throw → 整批回滚。

→ 对应 SQL 日志 `[SQL 沙箱] ... CHECK constraint failed: row_id = 1`。

### 噪音 + 二次失败：`insertRow` 位置参数约定不匹配

适配器调用（`table-change-adapter.ts:258`）：

```js
await api.insertRow(insertOptions, insertValues); // 第一参 = {tableName, skipChatSave, silent}
```

但 `parseInsertRowArgs_ACU`（`index.js:52048`）见第一参是 plain object 就当「选项包」，去里面找 `.data/.values/.rowData` → 没有 → 报 `insertRow: data must be an object` 返回 -1。第二行 `insertRow({...insertOptions, data})`（260）重试才对。

- native：第二次能救回内存写入（但仍被原子批次拖死）。
- sqlite：第二次进 SQL 又撞毒计划 B 的 CHECK。

→ 两份日志满屏 `insertRow: data must be an object` 的来源。

### 伴生现象

- `LENGTH_VIOLATION: 事件纪要: 纪要 长度不能小于 200`：AI 写的纪要太短，也是一条毒计划。
- `HTTP 200 Too Many Requests` → `CRUD 填表已冷却 15 秒`：v6.18 修复②限流冷却确实生效，但前面已全败，冷却只是雪上加霜。

### 现网状态快照（真页实查）

- `storageMode = native`，`fillMode = ai_crud_plan`（settings 在 IndexedDB 以 JSON 字符串存储，242416 字符）。
- 除 `检定建议` 有 5 行外，其余 13 张业务表 **rows 全为 0**（全局状态/玩家状态/灵异事件/线索/人物/地点/行动建议/事件纪要等均空）——印证写入意图从未落盘。
- ⚠️ 安全：该 settings 记录含明文 `apiConfig.apiKey` 与反代 `apiConfig.url`，诊断中已避开，未复述具体值；勿原样外传该 storage。

### 为什么「这次原生模式也挂」

| | 旧版本 | v6.18 |
|---|---|---|
| 默认写入 | 逐表独立、容错 | CRUD 计划原子批次 |
| 单表/单计划失败 | 只丢该项，其它照常落盘 | **整批回滚，0 落盘** |
| native 是否受影响 | 否（不走 CRUD 严格校验） | 是（同样过严格校验 + 原子批次） |

默认模式一换，native 与 SQL 被绑进同一原子事务，各自的毒计划（A/B）都能让整批归零。

### 诚实标注

- 两份日志路径不同（一份 SQL 沙箱、一份 native），说明测试期间切过模式；但终点一致：CRUD 计划整批失败、0 行落盘，与毒计划 A/B 一一对应。
- 本节仅诊断，未改任何代码。修复方向（待确认后再做）：① 列解析正则改为只匹配「行级约束关键字 + 后随定义」而非误吃 `check_` 列名；② 固定行表 insert 应退化为「行不存在则按固定 row_id 插入 / 行存在则 update」；③ `insertRow` 适配器调用统一为单参选项包 `{tableName, data, ...}`；④ CRUD 批次考虑「部分成功也落盘 + 失败项反馈」而非全有或全无。

---

## 2026-06-10 v6.17 真页验收结论（第 1 步收口）— 验收不通过

**测试环境：** 开发版卡（已修复卡 YAML loader 至 v6.17，marker `mfrs-sql-fallback-cooldown-6-17`），酒馆主 API gemini-3.1-pro-preview（上游代理），SP 日志基线 2026-06-10 10:02 +08:00。

### 结论总览

- `ai_crud_plan` 默认模式确实生效（确认 fillMode 未设置时回落 CRUD 计划模式）。
- 但本轮真实对话自动填表 **15 次 AI 调用（5 批次 × 3 重试）全部失败，0 行写入，写入意图丢失**；另两次手动 `triggerUpdate` 各 3 次尝试也全失败。合计 ~21 次填表 AI 调用，成功 0 次。
- SQL 兜底通道实测**不可达**（见问题 4），限流冷却（阶段 7 主特性）因此无法验证。

### 发现的问题（按优先级）

1. **CRUD 计划 JSON 提取过严（高频失败根因）**
   - 实测响应（reqid 1821）：模型输出缺开头 `[` 和 `<tableChangePlan>` 标签，但有结尾 `]</tableChangePlan>`；内容以 `{...},\n{...}` 开始。
   - `JSON.parse` 解析完第一个对象即在逗号处报 `Unexpected non-whitespace character after JSON at position 234`（与日志 234/281/418/344/323/608/210/200/258 全部吻合）。
   - 需要类比 SQL 时代提取器的挽救逻辑：剥标签、缺 `[` 时补包裹、逐对象挽救解析。

2. **CRUD 重试链路没有限流冷却**
   - 上游代理返回 HTTP 200 + body `{"error":{"message":"Too Many Requests"},"quota_error":false}`；`parseNonStreamResponse_ACU` 正确识别分类（这部分 v6.17 生效）。
   - 但 CRUD 分支收到限流后 2 秒内继续下一次尝试，5 个批次连环 15 连击。阶段 7 的 15-120 秒指数退避只挂在旧 SQL 分支，CRUD 分支完全没接入。
   - 首轮限流发生率 8/15 ≈ 53%。

3. **`AI回复过短` 阈值误判合法 CRUD 计划**
   - 418 字符的合法 JSON 计划被 500 字符阈值拒绝。该阈值为 SQL/正文回复设计，CRUD JSON 计划天然较短，需按模式区分。

4. **SQL 兜底通道（`ai_sql`）实际不可达 —— 阶段 7 验收级缺陷**
   - `fillMode` 在 vendor 中只有默认值定义和 getter，**没有任何设置 UI**。
   - 直接向 IndexedDB `shujuku_v120_config_v1/kv/shujuku_v120_profile_v1____default____settings` 写入 `fillMode:'ai_sql'`，重载后填表仍走 CRUD 计划；且 fillMode 键随后被运行实例的设置保存动作清除（两次复现）。疑似设置保存/加载链路只保留 UI 已知字段或存在覆盖竞态，待修复时一并排查。
   - 结果：「显式选择 ai_sql 走 SQL 兜底」「SQL 限流冷却」当前用户均无法触达。

5. **CRUD 填表 prompt 仍然臃肿**
   - 单次填表请求体 ~217KB，`prompt_tokens=57878`，背景设定把整个欢迎页 HTML/CSS 都带上。阶段 5 的"减少无关上下文注入"在 CRUD 模式没有收紧，限流与该体量直接相关。

6. **开发版卡 YAML loader 漂移（已修复）**
   - 开发版 `src/神秘复苏模拟器/index.yaml` 6 个脚本 loader 钉死 `c164fd35/phase125`（6.13 资源）；v6.17 loader 回填只改了 `src/**/脚本/**/index.ts`。已替换为 `576e7b0/phase129` 并由 tavern_sync watch 自动推送，真页 marker 已是 6.17。
   - **流程教训：发布回填 loader 时，开发版卡 YAML 的脚本库 URL 也必须同步**，否则真页验收跑的是旧代码。

### 对比指标（本轮实测）

| 指标 | 数值 |
|---|---|
| 主对话生成 | 1 次成功（流式 ~24s） |
| 自动填表 AI 调用 | 15 次（5 批 × 3 重试），全失败 |
| 手动 triggerUpdate | 2 轮 × 3 次，全失败 |
| 填表成功率 | 0/21 |
| 失败分类（首轮 15 次） | JSON 解析 6、限流 8、回复过短 1 |
| 单次填表 prompt | ~217KB 请求体 / 57878 prompt tokens |
| 限流响应形态 | HTTP 200 + Too Many Requests body（代理特性） |
| 数据一致性 | 无脏数据写入（失败均在解析/预检前拦截）✓ |

### 已知无害项（本轮再次出现，忽略）

- `[SyncBridge] sheet_chronicle chronicle_text 长度无效（6 字 < 200-600）已跳过`：旧数据问题，每次加载必现 2 条，非本轮引入。


## 2026-06-09 项目理解快照（完成）

- `CLAUDE.md` 指向 `.cursor/rules/*.mdc`，这些规则是理解项目开发规范的第一入口。
- 项目核心不是单纯模板，而是 Tavern Helper / SillyTavern 角色卡、前端界面、脚本、世界书、MVU 变量和数据库扩展的综合工程。
- 当前主线项目为 `src/神秘复苏模拟器/`；发布镜像为 `src/神秘复苏模拟器发布版/`。
- 当前工作区基线：`main...origin/main`，dirty 项主要是 `.claude/worktrees/**`、`acu-logs-*.json`、`planning_archive_2026-06/**`、`tavern_current_view.png`，按既有规则默认视为本地参考。
- 现有 planning 已高度压缩为恢复索引；历史长流水应读 `planning_archive_2026-06/**`，不要靠摘要猜细节。

- 开发规则：前端界面项目是同时有 `index.ts` 与 `index.html` 的目录；脚本项目是只有 `index.ts` 的目录。代码加载时使用 `$(() => {})`，不要依赖 `DOMContentLoaded`。
- 构建入口：`webpack.config.ts` 会扫描 `{示例,src}/**/index.{ts,tsx,js,jsx}`，有 `index.html` 的入口打包为 `dist/**/index.html`，无 HTML 的入口打包为 `dist/**/index.js`。
- 常用命令：`pnpm watch` 实时开发，`pnpm build` 生产构建，`pnpm sync` 调 `tavern_sync.mjs`，`pnpm run publish-card -- 神秘复苏模拟器发布版` 同步发布版。
- MVU 状态：`src/神秘复苏模拟器/schema.ts` 定义 `Schema`，状态栏通过 `界面/状态栏/store.ts` 的 `defineMvuDataStore(Schema, { type: 'message', message_id: getCurrentMessageId() })` 访问消息楼层变量。
- 角色卡入口：`src/神秘复苏模拟器/index.yaml` 聚合第一条消息、系统提示词、脚本、界面和世界书。世界书规模约 386 个文件，主要分布在人物、灵异事件、原著剧情锚点、地点、厉鬼档案、灵异物品、规则、势力等目录。
- 运行时脚本：`脚本/变量结构` 注册 MVU schema；`脚本/数据库` 加载自托管 `vendor/shujuku-sp-fork/index.js`；`脚本/数据库前端` 暴露 `MysteryDatabaseFrontend` 并自动校正神秘复苏 14 表模板；`脚本/固定状态栏` 在输入区上方显示最新状态摘要；`脚本/界面美化` 注入宿主页面主题和开局/选项交互增强。
- 发布链路：`scripts/publish-card.mjs` 维护 `CDN_REF`、`CDN_CACHE_VERSION` 和 `releaseVersion`，把开发版镜像到发布版并调用 `tavern_sync.mjs bundle` 生成 PNG；历史上它只自动替换 localhost/127.0.0.1 链接，已有 jsdelivr 旧 hash/cache 需要额外检查或手动替换。该缺陷已在 v6.27 后续维护提交 `a167c6c` 修复，后续仍需复核 YAML/PNG 元数据无旧 hash/cache 残留。

## 2026-06-09 发布版前端 404 诊断

发布版 `src/神秘复苏模拟器发布版/index.yaml` 和 `scripts/publish-card.mjs` 曾写入错误的 `CDN_REF`：`c61cae79c95498f1aee9e5e27e13e3e12cb6a3f4`，但本地 git 不存在这个完整对象。真实的 `c61cae7` 完整 hash 是 `c61cae707d06ce8b9dce7bc63d97a26e26a5834f`。

验证结果：

- 错误 URL：`@c61cae79c95498f1aee9e5e27e13e3e12cb6a3f4/dist/.../脚本/数据库前端/index.js` 返回 `404`。
- 正确 URL：`@c61cae707d06ce8b9dce7bc63d97a26e26a5834f/dist/.../脚本/数据库前端/index.js` 返回 `200`。

结论：发布版前端不加载、14 表格不显示的直接原因是发布版 CDN 链接指向了错误的 commit hash，远程脚本加载失败。开发版能加载，是因为开发版走本地/实时调试链路或旧的有效资源链路，不依赖这个错误的发布版 CDN_REF。

## 已知 AI 输出质量问题（非代码 bug）

SQLite 模式下，AI 生成 SQL 时可能出现以下输出缺陷。v6.13/6.14 防御层会正确拦截并报错，**不会写入脏数据**，但写入意图会丢失。这些是 **AI 输出质量问题**，不是代码逻辑 bug。

1. **VALUES 列数不匹配**（2026-06-09 新发现）
   - 样本：`INSERT INTO chronicle (row_id, code_index, time_span, related_event, summary, chronicle_text) VALUES ((SELECT ...), (SELECT ...),) ON CONFLICT...`
   - 问题：列列表 6 个字段，VALUES 只有 2 个值 + 尾逗号，但有闭合括号
   - 错误：`near ")": syntax error`
   - 根因：AI 输出截断，但尾部符号仍然补全
   - 防御：沙箱拦截 + 错误反馈触发 AI 重试（方案 2.3 + 3.3）
   - 当前状态：**已正确拦截，无脏数据写入**；如频繁出现需优化 prompt 或切换模型

2. **思维链泄露**
   - 样本：`<tableEdit>让我确认DDL结构... INSERT INTO ...`
   - 防御：提取器过滤非 SQL 前缀（方案 2.1 禁止事项 + 方案 4 挽救逻辑）

3. **单行多语句未分号**
   - 样本：`INSERT ... VALUES (...) INSERT ... VALUES (...)`（同行无分号）
   - 防御：v6.14 方案 4.2 单行多语句预处理

结论：当前防御层足够稳健，**错误不会导致数据污染**。如错误频繁影响用户体验，可选方案：
- 切换到输出质量更好的模型（Claude/GPT-4）
- 进一步加固 prompt（方案 2 增强版）
- 增加列数验证预检（投入产出比低，沙箱已拦截）

## 已知无害 warn（不要再当新 bug 排查）

SP·数据库 III 运行日志里下面两类 `warn` 已确认无害，数据不丢、不影响角色卡本体、不影响 CDN 自动更新。再次看到时直接忽略，除非频率高到淹没真正的 error，或确实出现数据丢失。

1. `[shujuku_v120] Skipping malformed or truncated command line: 已过滤 N 段非 SQL 内容 (不完整语句:N)`
   - 触发：SQLite 模式下，主填表 AI 在 `<tableEdit>` 里写的 SQL（如 `INSERT INTO chronicle ...`）偶尔输出残缺，被 SQL 提取器 `extractSqlStatementsFromTableEdit_ACU`（`vendor/.../index.js:6769`→`7176`/过滤 `7263-7281`）剔除残片。
   - 不丢数据：被剔除的是残缺尾巴，完整 SQL 或其他写入路径已落库；真页实测 chronicle 纪要齐全。
   - 推断根因（强推断，未 100% 坐实）：第三方反代 `gcli.ggchan.dev` + 假流式 Gemini 长输出截断，或模型自身写残。填表 max_tokens 已是 60000（ACU API 预设「GG」实测），不是额度瓶颈。
2. `[表格增量] sheet_xxx: 列结构变化，退化为 checkpoint`
   - 触发：`buildTableDelta_ACU`（`index.js:5693`）检测列结构变化，放弃行级增量改写完整快照。设计内正常降级，数据一条不少。

结论：维持现状（方案 D 不动）。改动方案见下方「2026-06-08 acu-logs warn 调查结论」。改 SQL prompt（方案 B）需动 vendor + 走发布流程 + 填表回归，风险收益不成正比；填表 token 调高（方案 C）已排除（60000 充足）。改动均不影响原生模式（SQL 路径被 `isSqliteMode()` 隔离）。

## 常驻结论

本项目是 Tavern Helper / SillyTavern 的角色卡、脚本、界面与数据库扩展工程。日常开发以 `src/神秘复苏模拟器/` 为开发版入口，以 `src/神秘复苏模拟器发布版/` 为发布版镜像入口。构建产物进入 `dist/**`，发布包由 `scripts/publish-card.mjs` 写入发布版 YAML/PNG 元数据。

`task_plan.md` 的第一优先常驻项是“项目运行基本流程”。以后恢复 planning 时，应先确认 VSCode `Fn+F5` -> `pnpm watch` -> Chrome 9222 -> Chrome DevTools MCP -> 开发版先改 -> 发布版同步这条真实链路，再看版本历史和提交边界。

当前有效发布态以 live git 为准：

```text
HEAD==origin/main==e297002（待 push + CI 打标）
tag==（待 CI 自动打标）
releaseVersion==6.15
CDN_REF==c61cae707d06ce8b9dce7bc63d97a26e26a5834f
CDN_CACHE_VERSION==phase127-sql-prompt-optimize-6-15
database marker==mfrs-sql-prompt-optimize-6-15
```

## 版本变更保留表

| 版本 | 主题 | 关键证据 | 验证/结论 |
|---|---|---|---|
| `6.15` | SQL Prompt 精简优化：列数不匹配防护合并到现有规则 | resource `c61cae7`；release `e297002` | **当前有效发布态**；120 字符增量（1.4%），避免臃肿，预计降低 30-40% 列数不匹配错误 |
| `6.14` | SQL 提取器增强：单行多语句切分 + 挽救逻辑修复 | resource `ea0d4f0`；release `f96da7d` | 已被 6.15 覆盖；修复单行多语句处理缺陷、挽救循环盲区、增强诊断日志 |
| `6.13 final` | SQL 防御纵深体系 + 数据库前端自动重载修复 | SQL resource `53bf616`；frontend fix `868c535`；release `0ca57a5`；tag `v0.0.102` | 已被 6.14 覆盖；发布版 YAML 为 `6.13`，CDN 指向 `868c535` |
| `6.13 early` | 四层防御：静态预检、运行时沙箱、模板白名单、人工审核；另有错误分类与提示词增强 | `vendor/shujuku-sp-fork/index.js`、`scripts/verify-sql-debug-regressions.mjs`；initial resource `53bf616` | 功能进入当前 6.13；早期 release 链路被后续 hash/cache 回填覆盖 |
| `6.12` | Schema/CHECK 约束通用防线 | resource `70fbe7d`、loader `82261c0`、release `9ba8f98`、tag `v0.0.87` | 已正式发布；后续被 6.13 覆盖 |
| `6.11` | `UPDATE ... SET ..., WHERE` 尾逗号与中间修复链路 | `mfrs-update-trailing-comma-6-11`、`phase123-update-trailing-comma-6-11` | 中间链路，最终由 6.12/6.13 覆盖 |
| `6.10` | `INSERT ... VALUES` 截断导致 `incomplete input` | parser `5ec1aa`、loader `66e4c2e`、release `aaf14dc` | 已发布，历史错误行需按时间戳区分 |
| `6.9` | SQL 边界解析导致 `near "INSERT"` | parser `2bcf063`、loader `ac583a3`、release `e2224ec` | 已发布，确认第二条 SQL 不再被残缺语句吞并 |
| `6.8` | 推演选项点击交互 | resource `1fe4322`、release `32e49c9` | 已发布，修复 `.sp-panel-choices` 过早 ready |
| `6.7` | SQL Debug 四类复发修复 | resource `37a10c`、loader `26cbab6`、release `7cd0b24` | 已发布，覆盖风险枚举、旧表名、SQL 残片、Bad Gateway 分类 |
| `6.6` | SQL 模板自动校准 | resource `a554ba8`、release `f2ab050` | 已发布，保持 14 表与表头校准 |
| `6.5` | R2SQL 设置窗 SQL 控制台刷新 | vendor `a41ab44`、resource `f7e2f64`、release `ccfd727` | 已发布，同一设置窗 native/sqlite 切换后高级工具页刷新 |
| `6.4` | R2SQL 导出 fallback | vendor `5bd4b0e`、loader `8d4d1d2`、release `3de0c78` | 已发布，修复导出 fallback |
| `6.3` | R2SQL 模板状态与 14 表一致性 | resource `fe0679e`、release `4f6d949` | 已发布，模板/导出/面板 14 表一致 |

## 项目运行与发布流程

本项目采用教程中的实时编写闭环，并在此基础上增加角色卡发布链路。

### 实时开发流程

1. 从 `初始模板/**/新建为src文件夹中的文件夹/` 复制到 `src/`，重命名为目标项目。
2. 在酒馆中导入对应 `初始模板/**/导入到酒馆中/*实时修改*` 配置，并把链接替换为本地打包结果链接。
3. 在 VSCode 中按 `Fn+F5`，启动调试配置 `编译代码并调试酒馆网页 (Chrome)`。
4. VSCode `preLaunchTask` 会执行 `开始任务`：先运行 `pnpm watch` 监听源码并编译，再运行 `.vscode/start-chrome-debug.cmd` 启动 Chrome 调试模式。
5. Chrome 以 `--remote-debugging-port=9222` 打开，并进入酒馆地址 `http://127.0.0.1:8000/`；终端里会显示 `开始监听源代码并编译` 和 `启动 Chrome (调试模式)` 两个任务。
6. 后续制作和修改角色卡时，首选 Chrome DevTools MCP 接入该 9222 Chrome，检查酒馆真页渲染、Console、Network、交互和数据库运行日志。
7. Go Live / Live Server 暴露 `http://localhost:5500/dist/**` 是教程通用方案；本项目当前实际入口以 VSCode `Fn+F5` 组合调试任务为准。

关键结论：

- 前端界面调试产物是 `dist/**/index.html`。
- 脚本和流式楼层界面调试产物是 `dist/**/index.js`。
- `pnpm watch` 的产物只用于实时开发，正式发布必须重新跑 `pnpm build`。
- 制作和修改时先只动开发版角色卡 `src/神秘复苏模拟器/`；确认完成后再同步到发布版角色卡 `src/神秘复苏模拟器发布版/`。
- SQL/数据库验收仍以 `SP·数据库 III -> 高级工具 -> 运行日志` 为权威入口。

### 固定发布链路

1. 修改源码、SQL 模板、vendor、世界书或工具脚本。
2. 用 Chrome DevTools MCP 在开发版真页完成验收。
3. 运行静态与回归检查。
4. `pnpm build` 生成 production `dist/**` 与 PNG。
5. 提交并推送资源提交，供 GitHub/jsdelivr 使用。
6. 回填 loader 的资源 hash、cache、marker，再构建并提交 loader 回填。
7. 更新 `scripts/publish-card.mjs` 的 `CDN_REF`、`CDN_CACHE_VERSION`、`releaseVersion`。
8. 执行 `pnpm run publish-card -- 神秘复苏模拟器发布版`，将开发版镜像到发布版，并把本地链接替换成 jsdelivr CDN 链接。
9. **手动检查并更新发布版 YAML 中的 CDN 链接**（publish-card.mjs 只替换 localhost，不处理已有 jsdelivr 链接）：
   ```bash
   # 替换旧 CDN hash 和 cache version
   sed -i 's|<旧hash>|<新hash>|g' "src/神秘复苏模拟器发布版/index.yaml"
   sed -i 's|<旧cache>|<新cache>|g' "src/神秘复苏模拟器发布版/index.yaml"
   # 重新生成 PNG
   node tavern_sync.mjs bundle 神秘复苏模拟器发布版
   ```
10. 验证 YAML、PNG `chara`、PNG `ccv3` 元数据，确认没有 localhost、旧 hash 或旧 cache 残留。
11. 提交发布版同步结果并推送到 GitHub 远程仓库。
12. 验证 CDN 200 与发布卡真页运行态。

**历史缺陷（已在 v6.27 后续维护 `a167c6c` 修复）：** `publish-card.mjs` 的旧 `syncYaml` 函数只替换 `localhost/127.0.0.1` 链接，不会替换已有的 jsdelivr CDN 链接。现在脚本会归一化项目仓库的 `testingcf.jsdelivr.net` / `cdn.jsdelivr.net` / 无子域 jsdelivr 旧 hash，并统一项目 dist 入口的 `?v=` cache。

### 发布版自动更新资源

- 发布版角色卡应通过 GitHub/jsdelivr CDN 加载前端界面、脚本或美化样式，而不是加载本地 `localhost`。
- 本项目用 `scripts/publish-card.mjs` 执行该转换：同步开发版目录到发布版，将 `localhost` / `127.0.0.1` 链接替换为 `testingcf.jsdelivr.net/gh/linlangliehu/tavern_helper_template@<CDN_REF>/...`，并追加 `CDN_CACHE_VERSION`。
- GitHub 远程仓库推送成功后，发布版角色卡可通过 CDN 获取更新后的 `dist/**` 资源；若缓存未刷新，按需 purge 对应 jsdelivr URL。

### 发布会自动更新角色卡

- 教程里的自动更新角色卡需要三项基础信息：最新角色卡文件、最新版本号、玩家当前版本号。
- 本项目的最新角色卡文件由 `tavern_sync.yaml` + `scripts/publish-card.mjs` / GitHub Actions 生成，发布版路径是 `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`。
- 最新版本号来自发布版 `index.yaml` 的 `版本:` 字段，并应同步进入 PNG 的 `chara` / `ccv3` 元数据。
- 仅远程界面、脚本、美化样式变化时，发布版角色卡可通过 CDN 自动获取新版资源；卡本体内容变化时需要更新发布版 PNG，并让玩家或卡内更新入口导入新版角色卡。
- 若后续实现卡内更新入口，当前版本可通过酒馆助手/SillyTavern 的当前角色接口（如 `getCharacter`）读取，新版 PNG 可通过角色卡导入接口（如 `importRawCharacter`）导入；这属于角色卡本体更新路径，不同于 CDN 资源自然刷新。
- `.github/workflows/bundle.yaml` 会在推送后自动 `pnpm build`、提交 `[bot] bundle`，并自动打 tag，帮助 jsdelivr 更快更新缓存。

## 2026-06-08 acu-logs warn 调查结论（只读，未改代码）

调查对象：`acu-logs-2026-06-08T10-47-52-168Z.json`，11 条全 `warn`、无 `error`。

权威结论（真页 + vendor 代码双向确认）：

- **当前数据库运行在 SQLite 模式。** 真页 `SP·数据库 III → 高级工具 → SQL 控制台` 标题旁有绿色徽章「SQLite 模式」。判据是 `settings_ACU.storageMode==='sqlite'`（vendor `index.js:89401` / `4985-4996`）。
- **`mate.type` 不能用来判断存储模式。** 它恒为 `chatSheets`（楼层数据容器格式标识，`index.js:11064` 强制校验），sqlite 模式下同样是 `chatSheets`。早期我据此误判为 native，已纠正。
- **两类 warn 都不丢数据、不影响角色卡本体、不影响 CDN 自动更新。**

第一类 warn（6 条，tag `shujuku_v120`，"已过滤 N 段非 SQL 内容/不完整语句"）：

- 产生位置：`index.js:7280`，过滤逻辑 `7263-7281`，完整性判定 `isLikelyCompleteSqlStatement_ACU`（`7325`）/ `hasIncompleteInsertValues_ACU`（`7341`）。
- 触发源：**事件纪要合并子任务**（"填表美杜莎"独立 AI），SQLite 模式用 prompt 常量 `DEFAULT_MERGE_SUMMARY_PROMPT_SQL_ACU`（`index.js:1220`），输出 `<tableEdit>` 内 `INSERT INTO chronicle (row_id, code_index, time_span, related_event, summary, chronicle_text) VALUES (...)`。日志样本 `'2011-05-10 21:15 p.m.', | '大昌市论坛敲门声传播事件',` 正是 `time_span, related_event` 两列值。
- prompt 选择逻辑：`settings_ACU.mergeSummaryPrompt || (isSqliteMode() ? SQL版 : DSL版)`，见 `index.js:42485 / 42710 / 86092 / 86284`。`mergeSummaryPrompt` 是持久化可自定义字段。
- 为何不丢数据：被截断过滤的是"合并/压缩已有纪要"的结果，原始 6 条纪要（SP0001~SP0006）本就已在库；真页查 `sheet_chronicle` 实测 6 条齐全、时间线 21:14→21:22 连续。
- 主对话变量写入走 MVU `<UpdateVariable>`/`<JSONPatch>`（与纪要合并子任务是两条独立路径）。

第二类 warn（4 条，tag `表格增量`，"sheet_supernatural_items 列结构变化，退化为 checkpoint"）：

- 产生位置：`buildTableDelta_ACU`（`index.js:5693`），约定见 `5622`。
- 含义：表格增量(delta)检测到列结构变化，放弃行级增量、改写完整快照(checkpoint)。设计内正常降级，数据一条不少；代价仅存储体积/写入速度。与 SQL 防御链路无关。

让第一类 warn 消失的候选方向（均未执行，待用户决定）：

- A. 把纪要合并切回 native DSL（`insertRow`）prompt：但当前是 SQLite 模式，DSL 与 SQL 存储不匹配，需先确认整体是否要留在 sqlite。
- B. 收紧/加固 SQL 合并 prompt（`DEFAULT_MERGE_SUMMARY_PROMPT_SQL_ACU`），减少长 INSERT 被截断：属改 vendor 代码。
- C. 提高生成 token 上限：环境/预设侧，减少截断本身。
- D. 不动，视为无害噪声：零成本。

与历史 bug 的关系：第一类同属"SQL 语句边界与截断类"根因大类（6.9/6.10/6.11），但形态是 v6.13 防御层正常拦截（warn 级），非 error，是修复生效后的预期日志；第二类不属于任何历史 SQL bug 类型。

## SQL/数据库根因大类

### 约束不合规类

代表样本：

- `supernatural_events.handling_status='爆发中'`，违反枚举。
- `action_suggestions.revival_risk_level='极低'`，违反风险等级枚举。
- `chronicle.chronicle_text='SP0001'` 或正文过短，违反长度 CHECK。
- `ghost_archives.archive_code='G0002'` 重复，触发 UNIQUE 冲突。

当前防线：

- 从 SQL 模板 DDL 自动解析 constraint registry。
- 执行前预检 `INSERT`、`REPLACE`、`UPDATE` 的显式静态值。
- 对可确定的自然语言枚举别名做集中归一化。
- v6.13 增加 UNIQUE/FK/NOT NULL/PRIMARY KEY/复合约束识别、ON CONFLICT 改写、运行时沙箱、自动修复、模板白名单和高风险审计。

### SQL 语句边界与截断类

代表样本：

- 残缺 `INSERT INTO chronicle (...) VALUES` 吞并下一条 SQL，导致 `near "INSERT"`。
- 裸 `VALUES` 或截断 UPSERT 导致 `incomplete input`。
- `UPDATE ... SET ..., WHERE` 尾逗号导致语法错误。

当前防线：

- `<tableEdit>` 提取后只保留 SQL 候选。
- split/filter 双层处理残缺 final statement。
- 新 SQL 起始 token 出现时重启边界，保留后续完整 SQL。
- 回归脚本固定覆盖 `near "INSERT"`、裸 `VALUES`、截断 UPSERT、尾逗号等场景。

### 旧表名/未知列类

代表样本：

- `log_summary`、`simulation_summary`、`summary_logs`、`event_summary` 被模型当作事件纪要表。
- 未知列或旧列名被写入当前 14 表。

当前防线：

- 从当前模板 DDL 建表/列白名单。
- AI SQL 进入 SQLite 前校验目标表与显式列名。
- 事件纪要只允许 `chronicle`。

### API 网关类

代表样本：

- `{"error":{"message":"Bad Gateway"}}` 被误判为响应格式错误或 SQL 问题。

当前防线：

- `parseNonStreamResponse_ACU()` 识别 `data.error`。
- `Bad Gateway` 归入 API 上游网关错误，不混入 SQL 分类。

## 权威验证口径

- 酒馆页面：`http://127.0.0.1:8000/`。
- 推荐真页工具：Chrome DevTools MCP。
- CDP 端口：`9222`，由 VSCode `Fn+F5` 流程中的 `启动 Chrome (调试模式)` 任务打开。
- 替代验证命令：`npx agent-browser --cdp 9222`，仅表示当前 Codex CLI 环境的等价 CDP 访问方式，不是项目默认流程。
- SQL/数据库错误权威入口：`SP·数据库 III -> 高级工具 -> 运行日志`。
- 判断是否复发时，只看清空后或记录基线时间戳后的新日志行。
- 旧日志可能残留历史错误，不能把历史残留算作新版本失败。

## 提交与本地参考边界

需要提交的文件按任务精确 staging：

- 代码变更：相关 `src/**`、`util/**`、`@types/**`、`vendor/**`、`scripts/**`。
- 构建/发布变更：对应 `dist/**`、`src/神秘复苏模拟器发布版/index.yaml`、`src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`、`scripts/publish-card.mjs`。
- 角色卡内容变更：优先提交开发版 `src/神秘复苏模拟器/**`；发布版 `src/神秘复苏模拟器发布版/**` 应由发布同步脚本生成后再提交。
- 自动更新链路变更：对应 `tavern_sync.yaml`、`.github/workflows/**`、更新入口脚本、发布版版本号和远端卡 URL。
- 配置/依赖变更：对应 `package.json`、`pnpm-lock.yaml`、`webpack.config.ts`、`eslint.config.mjs` 等。
- planning 变更：根目录 `task_plan.md`、`findings.md`、`progress.md`。

不需要提交的本地参考文件：

- `.claude/worktrees/**`、临时 Chrome profile、CDP 日志、`acu-logs-*.json`、临时截图、调试 PNG、`planning_archive_2026-06/**` 新增快照。
- `node_modules/`、`.kilo/node_modules/`、`.kilocode/node_modules/`、IDE 自动生成文件。
- 本地参考资料和临时导出 JSON，除非用户明确要求作为正式项目资产。

## 归档索引

- 本次压缩前完整 planning：`planning_archive_2026-06/2026-06-08-post-v6-13-before-planning-optimization/`。
- 6.12 发布后压缩前原文：`planning_archive_2026-06/2026-06-07-post-s9-before-optimization/`。
- 更早的 2026-06-02 压缩归档：`planning_archive_2026-06/*.before-compress.md`。

## 2026-06-09 骰子系统方案研究结论

研究对象：`jerryzmtz/my-tavern-scripts` 仓库，入口由根目录 `--.json` 指向：

- GitHub 仓库：`jerryzmtz/my-tavern-scripts`
- 发布资源：`dist/骰子系统/stable.js`
- 源码入口：`src/骰子系统/index.ts`

关键结论：

- 骰子系统是前端增强层，不是数据库本体；它依赖数据库本体暴露的 `AutoCardUpdaterAPI`。
- 初始化方式：远程 `import(stable.js)` 后执行自执行脚本，挂载 `window.AcuDice`，DOM ready 后运行 `init()`。
- 数据读取依赖 `getCurrentData()` 或 `exportTableAsJson()`。
- 数据写入默认走 CRUD API：`updateCell()`、`insertRow()`、`deleteRow()`。
- 骰子系统不会默认让 AI 输出 SQL；普通按钮、抽卡、数值更新、状态变化等确定性操作不请求 AI。
- SQL/SQLite 细节被当作数据库后端实现细节处理。前端只做 DDL 兼容解析与本地约束校验。

骰子系统对 SQL 模式的关键兼容策略：

- 从 `sourceData.ddl` 解析真实 SQL 表名。
- 解析 DDL 列名、注释 alias、`NOT NULL`、`CHECK(... IN (...))`、`LENGTH(...)`、`row_id`。
- CRUD 写入前先做本地约束校验，提前给出可行动错误。
- `updateCell` 失败时，某些场景有 JSON 楼层 fallback，但仍不让 AI 生成 SQL。

与本项目当前 AI-SQL 填表链路的区别：

- 当前 SQL 填表链路：`DDL + 当前数据 + 上下文 -> AI -> SQL -> SQLite 执行`，会触发 API 请求，容易被 `Too Many Requests` 放大。
- 骰子系统链路：`前端已知操作 -> CRUD API -> 数据库`，不走 AI，不触发 SQL prompt 限流。

综合推荐：

- 不应完全替换当前 AI 填表；当前方案在“理解剧情并自动判断更新内容”上仍有优势。
- 应采用混合架构：AI 负责输出结构化变更计划，前端负责 DDL 校验和 CRUD 执行；SQL 保留为高级兜底。
- 确定性操作优先迁移到 CRUD，减少无意义 AI 请求。
- API 限流应分类处理，不能混入 SQL 错误反馈重试。

### 可吸收进神秘复苏前端的骰子系统能力

优先吸收：

- CRUD 直写数据库：适合所有确定性操作，是稳定性收益最大的部分。
- DDL 约束校验：适合保存前阻止 `NOT NULL`、`CHECK`、长度、`row_id` 类错误。
- 公共 API：可做成 `window.MFRS`，供正则按钮、楼层界面、世界书脚本调用。
- 事件监听和自动刷新：监听聊天切换、消息更新、数据库更新后刷新界面。
- 历史记录与审计：适合改造成推演日志、灵异判定记录、数据库写入记录。

适合改造成神秘复苏玩法：

- 掷骰/检定：改造成生存判定、复苏风险判定、厉鬼压制、鬼域对抗、关押成功率等。
- 抽卡/商店：改造成总部资源兑换、灵异物品获取、事件结算奖励、档案权限或库存系统。
- 检定历史：改造成事件判定记录、灵异对抗记录、推演日志。

不建议直接照搬：

- 骰子系统整套 UI：跑团/抽卡导向强，直接搬入神秘复苏会割裂。
- 冲突检测逻辑：骰子系统用于避免与可视化前端同时启用，本项目前端自身是主界面，不应照搬“不能同时启用”的限制。
- 大段骰子系统内置预设、素材和文档：会增加体积和维护成本，应只抽取架构思想和必要 API 模式。

实现方向：

- 第一优先级是“稳定层”：CRUD API、DDL 校验、错误分类。
- 第二优先级是“智能层”：AI 变更计划 + CRUD 执行。
- 第三优先级是“玩法层”：灵异判定、资源奖励、日志审计。
- 所有玩法能力必须用神秘复苏语义重写，不保留外置骰子系统的外观和文案。

## 2026-06-09 大步一：基础确认与现状盘点

执行范围：阶段 0「基线冻结与接口确认」和阶段 1「现有填表链路盘点」。本次只做调查与 planning 更新，未修改业务代码。

### 基线

- 当前工作区：`main...origin/main`，`HEAD == origin/main == cde40b5f308d7ee423bbb014d59be4dd13e09043`。
- 当前发布版：`6.15`。
- 当前发布资源：`CDN_REF = c61cae707d06ce8b9dce7bc63d97a26e26a5834f`，`CDN_CACHE_VERSION = phase127-sql-prompt-optimize-6-15`。
- 发布版 `src/神秘复苏模拟器发布版/index.yaml` 已指向 `c61cae707...` 与 `phase127...`。
- SP 运行日志基线：只把 `2026-06-09 18:02:58 +08:00` 之后的新运行日志作为后续验证依据；当前 `acu-logs-2026-06-09T03-16-20-219Z.json` 与 `acu-logs-2026-06-09T04-37-31-071Z.json` 只算历史参考。
- 注意：开发版 `src/神秘复苏模拟器/脚本/数据库/index.ts` 与 `src/神秘复苏模拟器/脚本/数据库前端/index.ts` 仍写着旧资源 `53bf6168...`、`phase125-sql-defense-depth-6-13`、`mfrs-sql-defense-depth-6-13`。这不是本次要修的内容，但进入实现前需要复核开发版/发布版资源边界，避免误判版本。

### 数据库本体 API

`vendor/shujuku-sp-fork/index.js` 已经暴露混合方案需要的基础 API：

- 更新通知：`registerTableUpdateCallback`、`unregisterTableUpdateCallback`、`_notifyTableUpdate`。
- 读取：`exportTableAsJson`。
- 写入：`updateCell`、`insertRow`、`deleteRow`。
- 刷新：`refreshDataAndWorldbook`。

结论：基础方案不是被数据库本体卡住。数据库已经有 CRUD 能力，当前缺的是神秘复苏前端自己的兼容/适配层：表名 alias、列名 alias、row_id/自然键行定位、DDL 约束校验、批量写入队列、错误分类和限流冷却。

### SQL/AI 链路

SQL 模式的关键链路仍在数据库本体内：

- `isSqliteMode()` 判定 SQLite/SQL 模式。
- `prepareAIInput_ACU()` 组装 AI 输入。
- `callCustomOpenAI_ACU()` 请求上游模型。
- `parseAndApplyTableEdits_ACU()` 与 `extractSqlStatementsFromTableEdit_ACU()` 解析并执行 AI 输出。
- `SQL_ERROR_FEEDBACK` 重试链路会在 SQL 错误后把错误反馈给 AI。

结论：`Too Many Requests` 的主要放大器是 SQL 模式下的 AI 请求和错误反馈重试链路，不是 14 表加载失败，也不是数据库文件损坏。原生/确定性 CRUD 操作不会默认进入这条 AI-SQL 回路。

### 神秘复苏前端现状

- `src/神秘复苏模拟器/脚本/数据库前端/index.ts` 目前类型化的公开能力主要是打开可视化器、导入模板、刷新、导出和读取模板；尚未把 `updateCell/insertRow/deleteRow` 作为神秘复苏前端自己的稳定适配接口暴露出来。
- `src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js` 当前读库经 `exportTableAsJson`，保存路径集中在 `saveDataToDatabase`，包括全局保存、单元格编辑、插入/卡片保存等入口；这是第一批迁移到 CRUD 的候选。
- `src/神秘复苏模拟器/界面/状态栏/App.vue` 的 `<choices>` 解析、风险变化和按钮操作主要通过 `updateVariablesWith` 写 MVU；add/remove ghost/item 也是 MVU 操作，不是数据库写入。未来是否镜像到数据库，需要先定义 MVU 与数据库的主从关系。
- 世界书规则已经明确：MVU 是即时真实状态，数据库是长期镜像；数据库写入建议应短，不应把长 SQL 暴露给玩家。这支持“AI 判断 + 前端校验 CRUD 执行”的混合设计。

### 迁移优先级

1. 可视化器手动编辑、保存、新增、删除：已知表/行/列/值，适合优先改成 CRUD。
2. `行动建议` / `<choices>` 镜像：如果决定把 4 个选项同步进数据库，应走确定性 CRUD。
3. 状态、资源、厉鬼、物品等 MVU 镜像：先明确主从策略，再做 CRUD。
4. 自动剧情理解：改为 AI 输出结构化 `tableChangePlan` JSON，前端本地校验并执行 CRUD。
5. SQL 模式：保留为高级维护、迁移和复杂兜底，不再作为普通自动填表默认路径。

## 2026-06-09 大步二：协议与前端 CRUD 执行层

执行范围：阶段 2「定义 AI 变更计划协议」、阶段 3「前端 CRUD 执行器」、阶段 4「DDL 与数据约束校验」，以及阶段 5 的前端执行落点。本次已修改业务代码，但没有切换旧 AI-SQL 默认链路。

### 新增代码

- `src/神秘复苏模拟器/脚本/数据库前端/table-change-adapter.ts`
  - 定义 `TableChangePlan` / `TableChangeResult` / `TableChangeError`。
  - 从当前导出数据和内置模板合并表信息，解析表名、DDL 物理表名、表头、DDL 注释 alias。
  - 支持按用户可见表名、sheet uid、DDL 物理表名定位表。
  - 支持按中文表头、DDL 物理列名、DDL 注释 alias 定位列。
  - 支持按 `rowIndex`、`row_id`、自然键/多条件 `match` 定位行。
  - 支持 `previewTableChangePlan()` 无副作用预检和 `applyTableChangePlan()` 执行 CRUD。
- `src/神秘复苏模拟器/脚本/数据库前端/index.ts`
  - 扩展 `MysteryDatabaseFrontend`：
    - `getTableChangeSchema()`
    - `getTableMetadata()`
    - `previewTableChangePlan(plan)`
    - `applyTableChangePlan(plan)`
  - `applyTableChangePlan` 已串行排队，避免并发写库踩踏。
  - 成功执行后触发可视化器重绘，但不改变现有 v10.2 可视化器默认保存路径。
- `dist/神秘复苏模拟器/脚本/数据库前端/index.js`
  - `pnpm build` 生成的生产产物。

### tableChangePlan 最小协议

成功示例：更新行动建议 A 的风险。

```json
{
  "action": "updateCell",
  "table": "行动建议",
  "match": { "row_id": 1 },
  "set": {
    "主要风险": "可能触发敲门声靠近",
    "死亡风险": "中",
    "复苏风险": "无"
  },
  "reason": "本轮选项 A 是接近声音源头调查，存在中等死亡风险。",
  "confidence": 0.82
}
```

成功示例：插入人物。

```json
{
  "action": "insertRow",
  "table": "characters",
  "data": {
    "name": "张伟",
    "identity_text": "七中学生",
    "faction_text": "普通人",
    "location_name": "七中教学楼",
    "presence_status": "在场",
    "life_status": "存活",
    "supernatural_ability": "无",
    "relations_text": "同校学生",
    "known_info": "听到敲门声后出现恐慌。"
  },
  "reason": "正文明确出现新人物并给出位置与状态。",
  "confidence": 0.76
}
```

负面示例：禁止 SQL。

```json
{
  "action": "updateCell",
  "table": "行动建议",
  "match": { "row_id": 1 },
  "set": {
    "SQL": "UPDATE action_suggestions SET death_risk_level='中' WHERE row_id=1;"
  }
}
```

负面示例：禁止无法唯一定位。

```json
{
  "action": "deleteRow",
  "table": "人物",
  "match": { "life_status": "存活" },
  "reason": "会命中多行，必须补充姓名或 row_id。"
}
```

### 错误分类

当前前端执行层会返回结构化错误，不直接进入 AI 重试：

- `INVALID_PLAN`
- `TABLE_NOT_FOUND`
- `ROW_NOT_FOUND`
- `MULTIPLE_ROWS_MATCHED`
- `COLUMN_NOT_FOUND`
- `NOT_NULL_VIOLATION`
- `CHECK_IN_VIOLATION`
- `LENGTH_VIOLATION`
- `API_UNAVAILABLE`
- `API_MUTATION_FAILED`

这些错误适合后续阶段 5 只把失败项和局部上下文回传 AI，而不是把错误塞进 SQL_ERROR_FEEDBACK。

### 当前边界

- 已有执行层，不代表旧自动填表已经切到新链路；数据库本体内的 `prepareAIInput_ACU`、`callCustomOpenAI_ACU`、`parseAndApplyTableEdits_ACU`、`SQL_ERROR_FEEDBACK` 仍保持原状。
- DDL 解析已覆盖 `CREATE TABLE`、列定义、`NOT NULL`、`CHECK(... IN (...))`、`LENGTH(...)`、`PRIMARY KEY`；复杂 `CHECK BETWEEN/GLOB/TRIM` 与自动 row_id 推断后续再补。
- `applyTableChangePlan()` 目前适合确定性前端操作和后续 AI JSON 计划执行，不建议直接让玩家手写复杂计划。

### 2026-06-09 补充验证发现

- 新增 `scripts/verify-table-change-adapter.mjs` 后，确认适配层已经能覆盖当前大步二最关键的行为：表 alias、列 alias、`row_id` 行定位、危险多行匹配阻断、DDL `CHECK IN` 与 `LENGTH` 预检、CRUD API 参数转换。
- 验证脚本暴露的是脚本断言问题，不是运行时代码问题：第一次失败是样例文本未超过长度限制；第二次失败是 `vm` 跨上下文对象原型导致 `deepStrictEqual` 不适合直接比较。已改成稳定字段断言。
- 结论：大步二不只是“API 暴露出来”，而是有了可重复的本地回归门。后续迁移确定性入口时，可以先扩展这个脚本，再接入真实入口，避免把错误推到酒馆真页才发现。

## 2026-06-09 大步三：确定性入口迁移第一批

本次迁移对象是 `src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js` 的手动可视化编辑入口。

已迁移入口：

- 单元格编辑：已知表名、行号、列名和值，直接转为 `tableChangePlan.updateCell`。
- 整体编辑：把同一行的多个列变更合并成 `set`，直接转为 `tableChangePlan.updateCell`。
- 删除行提交：把待删除集合转为 `tableChangePlan.deleteRow`，先全量 preview，再 apply。

关键设计：

- 默认启用 CRUD 迁移；可用 `localStorage.acu_mfrs_visualizer_crud_migration = 'false'` 关闭。
- CRUD 失败不硬失败：会 toast 暴露结构化错误，然后回退旧 `saveDataToDatabase` 快照保存。
- 删除行优先使用 `row_id` 匹配，缺少 `row_id` 才使用 content 行索引，避免多行删除时索引漂移。

未迁移入口：

- 插入新行仍保留旧路径。原因是当前 UI 的语义是“在当前位置后插入空白占位行”，而底层 CRUD `insertRow` 更适合“追加一条完整合法行”。神秘复苏 14 表大量列有 `NOT NULL` / `CHECK` / `LENGTH` 约束，直接插入空行会把本地校验变成常态失败。

后续建议：

- 如果要迁移新增行，应先改 UI：从“空白占位行”改为“新增表单”，用户填完必填列后再调用 `insertRow`。
- 下一批迁移比新增行更适合先做 `行动建议` / `<choices>` 镜像，因为它天然有 4 条固定 row_id 和确定字段，CRUD 语义更稳。

## 2026-06-09 大步三：确定性入口迁移第二批

本次迁移对象是 `src/神秘复苏模拟器/界面/状态栏/App.vue` 解析出的 `<choices>` / A-B-C-D 推演选项到数据库 `行动建议` 表的镜像。

关键发现：

- `行动建议` 表是阶段 6 中最适合第二批迁移的入口：表结构固定 4 行，`row_id` 1-4 对应 A-D，字段与状态栏选项天然一致。
- 这个入口不需要 AI 理解，也不需要 SQL；状态栏已经能从当前楼层消息中解析选项文本和风险数值，因此可以直接构造成 `tableChangePlan.updateCell`。
- 状态栏和数据库前端是不同入口，不能直接模块导入数据库适配器；更稳的连接方式是弱连接顶层 `window.MysteryDatabaseFrontend.applyTableChangePlan()`。
- 镜像失败不应该打断玩家体验：状态栏的主职责是展示选项和填入输入框，因此数据库 API 缺失或写库失败只应跳过/记录 `console.warn`，不弹 toast。
- 风险数值到数据库枚举的映射必须在前端完成，避免把 `death=10`、`revive=5` 之类内部数值写进只允许 `无/低/中/高/致命/未知` 的列。

已落地设计：

- 默认启用 `<choices>` -> `行动建议` CRUD 镜像；可用 `localStorage.acu_mfrs_choices_crud_mirror = 'false'` 关闭。
- 只在 A/B/C/D 四项齐全时镜像，避免把半截选项写入数据库。
- 同一组选项只写一次，减少重复 CRUD 写库。
- 写入顺序为 row_id 1-4；优先 `updateCell`，如果目标行不存在则尝试完整 `insertRow` 补行。
- 优先使用 MVU `/行动建议` 里的“思路/主要风险/预期收益”，否则从 `<choices>` 文本、风险来源和固定兜底文案生成数据库字段。
- 文本写入前截断到 80 字符以内，配合 DDL `LENGTH` 约束避免常态失败。

当前边界：

- 这次只镜像“展示给玩家的推演选项”，没有把玩家点击选项后产生的风险值/MVU 状态变化写进数据库。
- 点击选项后的状态镜像需要先明确主从关系：当前 MVU 是即时状态源，数据库更像长期镜像/审计层，不能贸然双写。
- 还没有做酒馆真页验收；需要实测当前楼层输出 `<choices>` 后，`行动建议` 表刷新且 SP 运行日志没有新增 SQL/AI 错误。

## 2026-06-09 大步三补充：固定行 row_id 范围校验

本次补充对象是 `table-change-adapter.ts` 的 DDL 约束解析层。

发现：

- `行动建议` 与 `检定建议` 都是固定行表，DDL 用 `CHECK(row_id BETWEEN 1 AND 4/5)` 限制行号。
- 迁移 `<choices>` 镜像后，状态栏补行逻辑虽然只会写 1-4，但适配层本身还没有理解这个约束；后续如果迁移 `检定建议` 或其他固定行表，越界 row_id 应该在本地预检阶段就被拦截。
- 原 `insertRow` 校验只检查非主键列，对显式传入的 `row_id` 没有做范围约束；这会让补行类操作少一道前端保险。

已落地：

- 新增 `CHECK_RANGE_VIOLATION` 错误码。
- 解析数值型 `CHECK(<column> BETWEEN min AND max)`，目前覆盖 `row_id` 这类固定行约束。
- `insertRow` 若显式包含主键列，也会校验主键列的范围。
- `getTableMetadata()` 现在能暴露 `minValue` / `maxValue`，后续 UI 可用它判断固定行数量。
- 验证脚本新增越界 row_id 样例，确认 `row_id: 5` 写入 `行动建议` 会在本地被拦截。

边界：

- 这不是完整 SQL CHECK 解析器；`TRIM(...) <> ''`、`GLOB` 等复杂表达式仍未覆盖。
- row_id 自动生成或推断仍不在本次范围内。

## 2026-06-09 大步五验证结论：CRUD fallback 与发布边界

- 真实页验证确认，神秘复苏数据库前端最新 dist 能在 `http://127.0.0.1:8000/` 的 `神秘复苏模拟器` 当前角色页上返回完整 14 表。
- 底层 `AutoCardUpdaterAPI.insertRow/updateCell/deleteRow` 在 SQLite 模式下可能返回失败或不稳定；这不是数据库模板损坏，也不是 14 表加载问题，而是底层 SQLite mutation 路径与当前表格结构/调用形态之间的兼容问题。
- 前端适配器的有效修复是：先做表名/列名/行定位/DDL 约束校验，再尝试底层 CRUD；底层 mutation 失败时，克隆当前导出 JSON，执行最小行级变更，并通过 `importTableAsJson` 写回。这个路径不触发 AI，也不触发 SQL 生成，因此不会放大 `Too Many Requests`。
- 真页普通表验证已覆盖 `人物/characters` 的 insert、update、delete，临时行最终清理为 0。
- 真页固定行验证已覆盖 `行动建议/action_suggestions` 的 row_id 1-4 补行、row_id=2 更新、row_id=5 越界拦截，并恢复原始表状态。
- 发布边界：本轮没有切换旧自动填表主链路到 `AI_CHANGE_PLAN_CRUD`，也没有移除 SQL 模式。当前完成的是确定性前端操作和 choices 镜像的稳定 CRUD 层。
- 回滚方式：`localStorage.acu_mfrs_visualizer_crud_migration = 'false'` 可关闭可视化器 CRUD 迁移；`localStorage.acu_mfrs_choices_crud_mirror = 'false'` 可关闭 choices 镜像。

## 2026-06-09 大步三阶段 7：SQL 兜底与 API 限流边界

- 阶段 7 的核心边界是“SQL 保留但不默认”：普通自动填表默认走 `ai_crud_plan`，旧 `ai_sql` 仍可由用户显式选择，用于高级维护、迁移或 CRUD plan 无法表达的复杂批量操作。
- `Too Many Requests`、HTTP 429、`Retry-After`、502/503/504 网关错误属于 API 传输层问题，不是 SQL 语法/约束问题。它们不应进入 `SQL_ERROR_FEEDBACK`，否则会把上游限流误当成 SQL 可修复错误，导致 prompt 变长并继续放大请求。
- 旧 SQL 分支现在先检查 API 传输冷却窗口；遇到限流/网关错误会登记指数退避冷却并立即停止本轮重试，避免连续批量填表时把多个批次全部推向同一个限流上游。
- 非流式 API 响应解析也需要保留 `HTTP <status>` 和 `Retry-After` 信息，否则日志面板和冷却逻辑无法可靠区分“模型输出坏了”和“上游暂时不可用”。
- 调试面板当前把限流归入 `apiGatewayIssue`，因为现有 dashboard 没有单独的 rate-limit 文案；后续若做更细 UI，可新增独立 `apiRateLimitIssue` 分类。
## 2026-06-09 大步五 v6.17 发布验证结论

- v6.17 的资源链路采用两段式发布：先提交阶段 7 业务资源 `44ab669`，等待 `[bot] bundle` 生成 `550a89f`；再把数据库 loader 和数据库前端 loader 回填到 `550a89f` / `phase129-sql-fallback-cooldown-6-17`，生成最终发布资源 bundle `576e7b0`。
- 发布版 `index.yaml` 的卡版本为 `6.17`，6 条加载链接均指向 `576e7b0d5df759b46c4837ba99b8d84540da179c` 与 `phase129-sql-fallback-cooldown-6-17`。
- 发布版 PNG 的 `chara` 与 `ccv3` 元数据均为 `version=6.17`；均包含新 hash/cache，不包含 `d06dabb`、`c61cae7`、`53bf6168`、`phase125/127/128` 或 localhost/127.0.0.1。
- CDN smoke 显示发布版数据库 loader、数据库前端、状态栏 HTML，以及 loader 指向的 vendor 均返回 200。
- `rg` 在发布版世界书历史测试记录中仍能找到 localhost 文本；这是测试记录正文，不是运行时资源加载链接，不影响发布版 CDN 链路判定。
