# Progress Log

## 2026-06-15 CST（会话61）：P5.2 低频真实 AI、发布同步与发布 smoke 收口

**状态：** 用户明确要求继续完成 `P5.2-15` 到 `P5.2-17`。本轮执行 1 次低频真实 AI 触发、发布版同步、CDN smoke、发布版真页非 AI smoke 和 planning 收口；没有调用 `triggerUpdate()`，没有点击“立即手动更新”，没有做压力重试。

**恢复与边界：**
- 已读取 `task_plan.md`、`PROJECT_FLOW.md`、`progress.md`、`findings.md`，并按技能要求运行 `session-catchup.py`；catchup 仍报告旧 v6.21 残片，按当前 planning 口径忽略。
- 主工作区仍为 `main...origin/main [behind 55]` 且有大量既有 dirty；发布同步在干净 worktree `.codex-v628-p5-resource` 上完成，主工作区只更新 planning 文件。
- CDP 目标为 `http://127.0.0.1:8000/`；发布前开发卡运行态为 `characterId=2` / avatar `神秘复苏模拟器.png` / marker `mfrs-crud-header-gate-6-28-p5-2` / `fillMode=ai_crud_plan`。

**P5.2-15 低频真实 AI 验证：**
- 基线：开发卡当前 14 张业务表合计 5 行，SP 运行日志只有 3 条 15:56 初始化旧 WARN。
- 发送 1 条普通玩家消息：`我叫周明，18岁男，普通学生，开局地点是七中教学楼，没有驾驭厉鬼，随身只有手机和一串钥匙。请开始推演。`
- AI 回复后真实自动填表最终成功，导出数据为 20 行，覆盖 10 张业务表；可见层 `<draft>`、`<UpdateVariable>`、`<JSONPatch>`、`<修改确认>`、`<pacing_rules>`、裸 `"op"`、`risk.death`、`risk.revive` 计数均为 0。
- SP 运行日志新增 2 行：`16:26:49` 一次 `CRUD Plan 第 1 次尝试失败: API上游返回错误 HTTP 200 (OK) <none>` WARN 和对应 `parseNonStreamResponse` ERROR；随后页面提示 `数据库增量更新成功`。
- P5.2 目标失败关键词均为 0：`NOT NULL`、`API_MUTATION_FAILED`、`CHECK_IN_VIOLATION`、`COLUMN_NOT_FOUND`、`DEFAULT VALUES`、`Too Many Requests`、`CHECK constraint failed`、`SQL 目标表不在当前模板中`。本轮把上游 `<none>` 视为 transient API 噪音，不作为 header gate/CRUD 修复失败。

**P5.2-16 发布版同步与 CDN smoke：**
- 在 `.codex-v628-p5-resource` 更新 `scripts/publish-card.mjs`：`CDN_REF=b89e19b99fb32e5b546d3424924ae2c93b74b5da`，`CDN_CACHE_VERSION=phase148-crud-header-gate-6-28`，`releaseVersion=6.28`。
- `node --check scripts/publish-card.mjs` 通过；`pnpm run publish-card -- 神秘复苏模拟器发布版` 成功，替换 13 处链接并生成 `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`。
- 精确提交并推送发布版同步：`aa11645efe234443b68bf03093614abd0488829e release: publish v6.28 p5.2 card`；`origin/main` 已指向该提交。
- CDN smoke：release YAML、YAML 头像 PNG、可导入发布 PNG 均 200；release YAML 含 `版本: '6.28'`、`b89e19b...`、`phase148...`，不含 P5.1 旧 hash/cache、`localhost` 或 `127.0.0.1`。
- 可导入 `神秘复苏模拟器发布版.png` 的 PNG `chara` / `ccv3` 元数据含 `6.28`、`b89e19b...`、`phase148...`，不含旧 P5.1 hash/cache 或本地链接。发布目录头像 PNG 仍保留开发卡 metadata（指向 `64d863...` / `phase147...`），这是 `publish-card` 复制头像的既有行为；发布判据以可导入发布 PNG 为准。
- 从远端 release YAML 抽取的 8 个资源 URL 全部 200；数据库前端远端脚本包含 marker `mfrs-crud-header-gate-6-28-p5-2` 和 self-reclaim resource `5849eae635549729b2e8707d1b772c8fb6a7bc9a`。数据库 loader 仍先加载 P5.1 vendor，但数据库前端会 self-reclaim 到 P5.2 vendor，这是开发卡真页验证时的实际运行口径。

**发布版真页非 AI smoke：**
- 通过 `#character_import_file` 上传本地发布 PNG 后新增发布卡：`characterId=4` / avatar `神秘复苏模拟器发布版1.png` / name `神秘复苏模拟器发布版`。
- 发布卡运行态：卡内容含 `b89e19b...` / `phase148...` 且不含 P5.1 旧引用；runtime marker `mfrs-crud-header-gate-6-28-p5-2`，`fillMode=ai_crud_plan`，`AutoCardUpdaterAPI` / `MysteryDatabaseFrontend` 均存在。
- `clues` smoke：合法编号 `C5807`，insert/update/delete 的 preview/apply 全部 `ok=true`，最终残留 0。
- `supernatural_events` smoke：`event_code=CodexV628P52ReleaseEventSmoke_1781513155807`，token `CodexV628P52ReleaseEventToken_1781513155807`；insert 使用 `handling_status=处理中`，update 使用 `handling_status=爆发`，preview/apply 全部 `ok=true`，最终残留 0。
- SP 运行日志面板仍显示 `共 5 条`，均为 P5.2-15 的旧 transient API/初始化日志；按发布 smoke 开始时间 `16:45` 过滤后新增 0 条。`COLUMN_NOT_FOUND`、`API_MUTATION_FAILED`、`Too Many Requests`、`NOT NULL`、`CHECK_IN_VIOLATION`、`DEFAULT VALUES`、`SQL 目标表不在当前模板中`、`CHECK constraint failed` 均为 0。

**结论：** P5.2-15、P5.2-16、P5.2-17 已完成。当前有效发布版仍显示版本号 `6.28`，但运行口径已是 P5.2 发布提交 `aa11645` / release cache `phase148-crud-header-gate-6-28`。后续若用户要发布后真实游玩观察，应先冻结当前发布卡 `characterId=4`、日志基线和行数，再低频触发。

## 2026-06-15 CST（会话60）：P5.2 开发卡真页非 AI smoke 通过

**状态：** 用户要求继续上一个对话未完成任务。本轮继续 `v6.28 P5.2`，未触发真实 AI，未调用 `triggerUpdate()`，未点击“立即手动更新”，未发送会触发 AI 的聊天消息；只做开发卡非 AI CRUD smoke、SP 运行日志复核和 planning 收口。

**恢复与资源链路复核：**
- 已读取 `task_plan.md`、`PROJECT_FLOW.md`、`progress.md`、`findings.md`；`session-catchup.py` 仍报告旧 v6.21 残片，按当前 planning 口径忽略。
- 工作区仍为 `main...origin/main [behind 55]`，大量既有 dirty 保留不动；本轮只更新 planning 文件。
- `.codex-v628-p5-resource` 最近三段提交为 `5849eae fix: guard sqlite sparse header mutations` -> `64d863b release: point p5.2 loaders to guarded sqlite resource` -> `b89e19b release: repoint p5.2 dev card to guarded loaders`；`git ls-remote origin refs/heads/main` 返回 `b89e19b99fb32e5b546d3424924ae2c93b74b5da`。

**真页运行态：**
- CDP `9222` 当前页为 `http://127.0.0.1:8000/`。
- 当前开发卡为 `characterId=2` / avatar `神秘复苏模拟器.png` / name `神秘复苏模拟器`。
- runtime marker 为 `mfrs-crud-header-gate-6-28-p5-2`，卡内含 `phase147-crud-header-gate-6-28-p5-2` 与 loader ref `64d863bce570df61fffbeb01ec2d8f93c9eaf4a3`，不含旧 `phase133-applied-mutation-verify-6-20`。
- `fillMode=ai_crud_plan`，`AutoCardUpdaterAPI` / `MysteryDatabaseFrontend` 均存在。

**非 AI CRUD smoke：**
- 使用 `MysteryDatabaseFrontend.previewTableChangePlan()` / `applyTableChangePlan()`，每条 plan 显式带 `skipChatSave=true` / `silent=true`，模拟真实 AI CRUD 主链路但不触发 AI。
- `clues` smoke：合法 `clue_code=C4451`，token `CodexV628P52ClueSmoke_1781510673451`；insert/update/delete 的 preview/apply 全部 `ok=true`，最终 `clueCode=0`、`clueToken=0`。
- `supernatural_events` smoke：`event_code=CodexV628P52EventSmoke_1781510673451`，token `CodexV628P52EventToken_1781510673451`；insert 使用 `handling_status=处理中`，update 使用 `handling_status=爆发`，preview/apply 全部 `ok=true`，最终 `eventCode=0`、`eventToken=0`。

**SP 运行日志：**
- 打开 `AutoCardUpdaterAPI.openSettings()` 后进入 `SP·数据库 III -> 高级工具 -> 运行日志`。
- 面板当前总计 `共 3 条`，均为 `15:56:40-15:56:41` 的旧 WARN：`saveChat 不可用`、`getCurrentCharPrimaryLorebook 不可用`、`provider=native, settings=sqlite` 自愈重建；这些早于本轮 smoke 开始时间 `16:04:33`。
- 按本轮 smoke 开始时间过滤后新增日志行数为 0；新增 `ERROR=0`、`WARN=0`。
- 关键失败关键词均为 0：`COLUMN_NOT_FOUND`、`API_MUTATION_FAILED`、`Too Many Requests`、`NOT NULL`、`CHECK_IN_VIOLATION`、`DEFAULT VALUES`、`SQL 目标表不在当前模板中`、`CHECK constraint failed`。

**结论：** P5.2 开发卡非 AI 验证通过；P5.2-13 和 P5.2-14 已完成。下一步是 P5.2-15 低频真实 AI 验证，但默认不执行，除非用户明确要求；真实 AI 通过后再进入 P5.2-16 发布版同步。

## 2026-06-15 CST（会话59）：P5.2 本地修复候选复核与 gate 通过

**状态：** 用户要求继续上一轮未完成任务。本轮按 `planning-with-files-zh` 恢复上下文，确认当前接续点为 `v6.28 P5.2`，不是旧 v6.21 残片；未触发真页 AI，未调用 `triggerUpdate()`，未点击“立即手动更新”，未做真页写库 `apply`。

**恢复与边界：**
- 已读取 `task_plan.md`、`PROJECT_FLOW.md`、`progress.md` 顶部和 `findings.md` 顶部；`session-catchup.py` 仍报告旧 v6.21 残片，按当前 planning 口径忽略。
- 已冻结工作区：`main...origin/main [behind 55]`，大量既有 dirty 仍存在；本轮只复核当前 P5.2 相关改动和 planning 文件，不回退无关改动，不使用 `git add .`。
- 代码复核确认：`vendor/shujuku-sp-fork/index.js` 已加入 `buildSqliteMutationColumnGate_ACU()` / `resolveSqliteMutationColumn_ACU()`，SQLite `insertRow()` 不再按稀疏运行态 header 过滤合法字段；有效列为 0 时返回失败并阻止 `DEFAULT VALUES`。`table-change-adapter.ts` 已在 apply 前阻止空 insert values，并允许 `skipChatSave=true` 失败后走带 `skipChatSave/skipNotify` 的 JSON import fallback。

**本地验证结果：**
- `node --check scripts/verify-table-change-adapter.mjs` 通过。
- `node --check scripts/verify-storage-provider-mode-guard.mjs` 通过。
- `node --check scripts/verify-sql-debug-regressions.mjs` 通过。
- `node --check scripts/verify-output-cleaning-regressions.mjs` 通过。
- `git diff --check -- vendor/shujuku-sp-fork/index.js src/神秘复苏模拟器/脚本/数据库前端/table-change-adapter.ts dist/神秘复苏模拟器/脚本/数据库前端/index.js scripts/verify-table-change-adapter.mjs scripts/verify-sql-debug-regressions.mjs scripts/verify-storage-provider-mode-guard.mjs src/神秘复苏模拟器/index.yaml` 通过。
- `node scripts/verify-table-change-adapter.mjs` 通过。
- `node scripts/verify-storage-provider-mode-guard.mjs` 通过。
- `node scripts/verify-output-cleaning-regressions.mjs` 通过。
- `node scripts/verify-sql-debug-regressions.mjs` 通过；仅输出 Node SQLite ExperimentalWarning。
- `pnpm build` 第一次在沙箱内因 webpack 配置 spawn 子进程报 `EPERM`；按权限规则用非沙箱权限重跑后通过。仅保留数据库前端 `252 KiB` 既有 webpack performance warning。

**已更新 planning：**
- `task_plan.md` 已把 P5.2-03 到 P5.2-12 标为完成，并新增 `6.28 P5.2` 本地候选版本索引行。
- `findings.md` 顶部补充 P5.2 本地修复候选结论。

**下一步：** 从 P5.2-13 开始：在干净 worktree 或精确 staging 中形成 resource 提交，等待 bot bundle，回填 loader/self-reclaim hash、cache、marker，更新开发卡 YAML/PNG；之后做 CDN smoke 与真页非 AI smoke。未完成这些前，不进入真实 AI 验证或发布版同步。

## 2026-06-15 CST（会话58）：制作 P5.2 修复任务清单

**状态：** 用户要求把已确认的问题制作成修复任务清单。本轮只整理 planning 文件，未修改业务代码，未触发真页 AI，未调用 `triggerUpdate()`，未点击“立即手动更新”，未执行写库 `apply`。

**已完成：**
- 已按 `planning-with-files` 恢复流程读取 `task_plan.md`、`progress.md`、`findings.md`；运行 `session-catchup.py` 后仍只报告旧 v6.21 残片，按当前 planning 口径忽略。
- 已冻结 `git status --short --branch`：主工作区仍为 `main...origin/main [behind 52]`，存在大量既有 dirty；本轮只处理 planning 文件，不回退无关改动，不使用 `git add .`。
- 已把 `task_plan.md` 的 `P5.2 初始任务清单` 扩展为 `P5.2 修复任务清单`，覆盖工作边界、失败证据、根因反证、vendor/header gate、adapter apply 防线、`skipChatSave=true` 批次路径、枚举归一化、真实表回归、本地 gate、资源链路、真页 smoke、低频真实 AI 验证和发布版收口。
- 已在 `findings.md` 顶部补充 P5.2 修复优先级与验收口径，明确第一优先级是阻止稀疏表头把合法 insert 过滤成 `DEFAULT VALUES`，第二优先级是补 `灵异事件.处理状态` 枚举归一化。

**下一步：** 从 P5.2-03 开始执行：先设计并落地 vendor/header gate 与 adapter apply 双防线，再补回归脚本。未通过本地 gate 和开发卡非 AI smoke 前，不进入真实 AI 验证。

## 2026-06-15 CST（会话57）：P5.2 根因反证复核

**状态：** 用户要求复核根因是否找错。本轮只读复核 planning、发布 worktree、发布代码、离线最小复现和当前真页运行态；未发送消息，未调用 `triggerUpdate()`，未点击“立即手动更新”，未执行写库 `apply`。

**复核结论：** 根因没有找错。主因仍是 adapter 预检层和 vendor `insertRow()` 执行层的表头口径不一致，而不是发布错版、adapter NOT NULL 预检漏检、旧 `COLUMN_NOT_FOUND` 回归或单纯 AI 生成空 data。

**反证结果：**
- 发布 worktree 仍为 `bffa76e810fc1ed36e2a7ca8951fc44304b23a6e`，即当前远程发布提交；真页 marker 仍为 `mfrs-sqlite-import-sync-6-28-p5-1`。
- 离线复现中，稀疏 `row_id` 表头下空 `ghost_archives` insert 被 adapter 返回 10 个 `NOT_NULL_VIOLATION`，首个字段为 `档案编号`；完整合法 `ghost_archives` insert 预检 `ok=true`。
- 同一完整合法 plan 进入 `applyTableChangePlan()` 后，adapter 传给底层 `api.insertRow()` 的 data 是完整中文列键，但因 AI 主链路 `skipChatSave=true`，底层失败后不会走 import fallback，只返回 `API_MUTATION_FAILED`。
- 真页只读导出确认失败表当前状态：`事件纪要`、`线索`、`收录档案`、`厉鬼档案`、`地点` 的原始表头仍只有 `row_id`，且 `sourceData.ddl` 存在；当前页面自己的 preview 也表现为“空 insert 拦截、完整 insert 通过”。
- vendor 代码路径确认：SQLite `insertRow()` 用 `targetSheet.content[0]` 过滤列；表头只有 `row_id` 时，合法字段不在 headers 中，`colNames.length=0`，SQL 形态退化为 `INSERT INTO <table> DEFAULT VALUES`。

**下一步仍是：** P5.2-03 修执行层防线：vendor 或 adapter apply 路径必须使用 canonical header/DDL 元数据，或在有效列为 0 / 缺 DDL 必填字段时结构化失败；不能让稀疏运行态表头把合法 data 过滤成 `DEFAULT VALUES` SQL。

## 2026-06-15 CST（会话56）：P5.2 根因定位

**状态：** 用户要求找出发布后三轮真实对话问题的根本原因。本轮只读复核 planning、发布 worktree、当前酒馆页运行态与 adapter/vendor 代码；未发送新消息，未调用 `triggerUpdate()`，未点击“立即手动更新”，未修改业务代码。

**复核内容：**
- 已读取 `task_plan.md`、`progress.md`、`findings.md`、`PROJECT_FLOW.md`，运行 `session-catchup.py`；catchup 仍是旧 v6.21 残片，按当前 planning 口径忽略。
- `.codex-v628-p5-resource` 当前 `HEAD=bffa76e810fc1ed36e2a7ca8951fc44304b23a6e`，即当前远程发布提交。
- 发布代码确认：`MysteryDatabaseFrontend.previewTableChangePlan/applyTableChangePlan` 会传入内置 14 表模板；adapter 的 `validateColumnValues()` 对 insert 会检查非主键 NOT NULL 列；vendor `insertRow()` 在 SQLite 模式下若有效列为 0，会执行 `INSERT INTO <table> DEFAULT VALUES`。
- 本地最小复现确认：空 `ghost_archives` / `clues` insert、仅 `row_id` insert、稀疏 `row_id` 表头下缺必填 insert，adapter 均返回 `NOT_NULL_VIOLATION`；完整合法 `ghost_archives` insert 在 adapter 预检为 `ok=true`。
- 关键穿透复现：完整合法 `ghost_archives` plan 在稀疏 `row_id` 表头下，adapter 传给底层 `api.insertRow()` 的 data 是完整中文列键，但 vendor 表头过滤会接受 0 个字段；AI 主链路设置 `skipChatSave=true`，所以 adapter 不走 import fallback，最终返回 `API_MUTATION_FAILED`。
- 当前真页只读导出确认：`事件纪要`、`线索`、`收录档案`、`厉鬼档案`、`地点` 的原始表头仍只有 `row_id`，但 `sourceData.ddl` 存在；`玩家状态`、`灵异事件`、`驾驭厉鬼` 等已落盘表为完整表头。

**根因结论：** 新阻断的主因是预检与执行层表头口径不一致。P5/P5.1 只让 adapter 预检层能用模板补齐稀疏表头；vendor `insertRow()` 执行层仍按运行态 `content[0]` 过滤列，导致合法字段被丢弃后进入 `DEFAULT VALUES`/仅 `row_id` SQL，触发 NOT NULL，再被包装成 `API_MUTATION_FAILED`。枚举近义词覆盖不足与上游限流是独立次因。

## 2026-06-15 CST（会话55）：v6.28 发布后手动三轮真实对话复核

**状态：** 用户报告已手动进行三轮真实对话。本轮只读复核当前发布卡运行态、页面可见层、数据库导出和 `SP·数据库 III -> 高级工具 -> 运行日志`；未发送新消息，未调用 `triggerUpdate()`，未点击“立即手动更新”，未修改业务代码。

**运行态：**
- 当前酒馆页 `http://127.0.0.1:8000/`，当前卡为重新导入后的发布版：`characterId=3`，avatar `神秘复苏模拟器发布版.png`，角色名 `神秘复苏模拟器发布版`。
- 卡版本在角色列表显示 `6.28`；runtime marker 为 `mfrs-sqlite-import-sync-6-28-p5-1`，`fillMode=ai_crud_plan`，`AutoCardUpdaterAPI` / `MysteryDatabaseFrontend` 均存在。
- 当前聊天长度 7，符合开局 + 3 轮用户/助手消息。最近 3 条助手消息原始内容含隐藏结构载荷，这是落盘解析所需；页面可见层未出现 `<draft>`、`<UpdateVariable>`、`<JSONPatch>`、`<修改确认>`、`<pacing_rules>`、裸 `"op"`、`risk.death` 或 `risk.revive`。

**数据库落盘：**
- `MysteryDatabaseFrontend.exportCurrentData()` 当前返回 14 表、实际 15 行。
- 已落盘表：`行动建议` 4 行、`人物` 2 行、`检定建议` 5 行、`驾驭厉鬼` 1 行、`全局状态` 1 行、`玩家状态` 1 行、`灵异事件` 1 行。
- 仍为空/只有表头：`事件纪要`、`线索`、`收录档案`、`收录规律`、`厉鬼档案`、`地点`、`灵异物品`。

**运行日志：**
- 日志面板显示 `共 72 条`，精确 log row 统计为 16 `ERROR` / 56 `WARN`。
- 模块分布：`SQL 沙箱` 28、`shujuku_v120` 16、`自动修复` 14、`CRUD 原子批次容错` 6、`设置保存` 3、`parseNonStreamResponse` 2、`CRUD 填表` 2、`StorageStrategy` 1。
- 关键词：`API_MUTATION_FAILED` 6 条日志行，`NOT NULL constraint failed` 28 条日志行，`Too Many Requests` 6 条日志行，`CHECK_IN_VIOLATION` 1 条日志行。
- 未复现：`COLUMN_NOT_FOUND=0`、`_acu_sheet_meta=0`、`SQL 目标表不在当前模板中=0`、`CHECK constraint failed=0`、SQLite 初始化失败 `0`。
- 失败表计数：`厉鬼档案` 3、`线索` 3、`地点` 2、`收录档案` 2、`事件纪要` 1、`灵异事件` 1、`玩家状态` 1、`驾驭厉鬼` 1。
- NOT NULL 字段：`ghost_archives.archive_code` 6、`clues.clue_code` 6、`locations.location_name` 4、`collected_archives.archive_ghost_name` 4、`chronicle.code_index` 2、`controlled_ghosts.ghost_code` 2、`player_state.name` 2、`supernatural_events.event_code` 2。
- 另有 1 条 `StorageStrategy` WARN：`Provider 模式与设置不一致，按当前设置重建: provider=native, settings=sqlite`；本轮没有后续 Native adapter 错配失败，但需要作为复测观察项保留。

**结论：** v6.28 发布卡三轮真实对话复核未通过发布后完整性目标。可见层清洗通过，自动填表从 0 落盘改善为部分落盘，且 P5 关注的 `COLUMN_NOT_FOUND` 没有复发；但真实 CRUD Plan 仍会生成空 data/仅 row_id 的 insert，导致必填字段缺失、SQL fallback 报 ERROR、部分表未落盘。下一步应进入 P5.2，优先修 `insertRow` 缺必填字段防线、枚举归一化和失败表回归；不要继续连续触发真实 AI 放大限流。

## 2026-06-15 CST（会话54）：v6.28 P5.1 正式发布版同步与发布 smoke 收口

**状态：** 用户要求执行可选下一步：把 P5.1 从开发卡同步到发布版，并完成发布版 YAML/PNG、CDN、真页 smoke 验证。本轮接续 `.codex-v628-p5-resource` 已完成的发布工作，只补做最终 SP 运行日志确认与 planning 收口；未调用 `triggerUpdate()`，未点击“立即手动更新”，未发送会触发 AI 的聊天消息。

**发布同步与本地 gate：**
- `scripts/publish-card.mjs` 发布配置已切到 `CDN_REF=e79f078a7742d7e3428d99bc108f0e3a33b838c6`、`CDN_CACHE_VERSION=phase146-sqlite-import-sync-6-28`、`releaseVersion=6.28`。
- `pnpm run publish-card -- 神秘复苏模拟器发布版` 已完成；发布提交 `bffa76e810fc1ed36e2a7ca8951fc44304b23a6e` 已推送。
- 本地 gate 已通过：`node --check scripts/publish-card.mjs`、`node --check scripts/verify-table-change-adapter.mjs`、`node --check scripts/verify-storage-provider-mode-guard.mjs`、`verify-table-change-adapter`、`verify-storage-provider-mode-guard`、`verify-sql-debug-regressions`、`verify-output-cleaning-regressions`、`git diff --check`。

**发布版产物与 CDN smoke：**
- 发布版 `index.yaml`、`神秘复苏模拟器.png`、`神秘复苏模拟器发布版.png` 已同步到 `6.28`；PNG `chara` / `ccv3` 均包含 `e79f078...` 与 `phase146...`，不含旧 hash/cache、localhost 或 `127.0.0.1`。
- CDN smoke 使用 release ref `bffa76e810fc1ed36e2a7ca8951fc44304b23a6e` 通过：release YAML、发布版 PNG、YAML 头像 PNG、状态栏 HTML、变量结构、界面美化、固定状态栏、database loader、database frontend、vendor、MagVarUpdate 均 200；loader/frontend marker 存在，vendor 含 `resetFromTableData`。

**真页发布版非 AI smoke：**
- 为避免同名导入被去重，导入唯一发布 PNG 后当前卡为 `神秘复苏模拟器发布版4.png` / `characterId=7`，角色名仍为 `神秘复苏模拟器发布版`。
- 运行态确认：marker `mfrs-sqlite-import-sync-6-28-p5-1`，`fillMode=ai_crud_plan`，`AutoCardUpdaterAPI` 与 `MysteryDatabaseFrontend` 存在。
- 清空 `SP·数据库 III -> 高级工具 -> 运行日志` 基线后，合法 `clues` 编号 `C1180` 与 `supernatural_events` token `CodexV628ReleaseEventSmoke_1781500275180` 的 insert/update/delete preview/apply 均 `ok=true`；最终 `clueCode=0`、`clueToken=0`、`eventCode=0`。
- CRUD 后重新打开/读取运行日志，面板摘要仍为 `共 0 条`；`COLUMN_NOT_FOUND=0`、`Too Many Requests=0`、`API_MUTATION_FAILED=0`、`CHECK constraint failed=0`、`SQL 目标表不在当前模板中=0`。

**注意：**
- `session-catchup.py` 仍报告旧 v6.21 残片；按当前 planning 口径继续视为过期上下文。
- 一次 agent-browser DOM 只读脚本因 PowerShell 管道把中文正则转成问号而失败；已改用 Unicode escape 重跑成功，不影响页面验证结论。

**结论：** `v6.28` 发布版同步与发布 smoke 已收口，当前有效发布版更新为 `v6.28`。自动化范围内未发现剩余问题；剩余项是用户在 `神秘复苏模拟器发布版4.png` / `characterId=7` 上做低频真实 AI 对话/自动填表手动验证。

## 2026-06-15 CST（会话53）：v6.28 P5.1 开发卡资源链路与真页非 AI 验证收口

**状态：** 用户要求继续完成下一步并完成 P5.1。本轮继续使用 `planning-with-files-zh`；资源链路在临时 worktree `.codex-v628-p5-resource` 完成，主工作区只更新 planning 文件。本轮未发布正式版，未调用 `triggerUpdate()`，未点击“立即手动更新”，未发送会触发 AI 的聊天消息。

**恢复与提交：**
- 已读取 `task_plan.md`、`progress.md`、`findings.md`、`PROJECT_FLOW.md`，并运行 `session-catchup.py`；恢复脚本仍报告旧 v6.21 残片，按当前 planning 规则忽略。
- `.codex-v628-p5-resource` 从 `origin/main` rebase 后，修正 rebase 残留旧 hash：loader/self-reclaim 从旧 `ce47e0c...` 改为 P5.1 resource `6ec4a4d7691d911b415f7644b8a219c25dd47ca9`，提交 `52447dbe290f7132ad1fc87e9506899688c18b6f`。
- 开发卡 YAML/PNG 重新指向最新 loader 修正提交 `52447dbe290f7132ad1fc87e9506899688c18b6f`，提交 `cd5203208f4f6b2e2a0d70013093721dcdb3ed58`；推送后 bot bundle 为 `e79f078a7742d7e3428d99bc108f0e3a33b838c6`。

**本地与 CDN 验证：**
- `pnpm build` 通过；仅保留数据库前端 `252 KiB` 既有 webpack size warning。
- `git diff --check` 通过；提交前 worktree 干净。
- CDN/resource smoke 通过：开发卡 YAML/PNG、状态栏 HTML、变量结构、界面美化、固定状态栏、database loader、database frontend、vendor、MagVarUpdate 均返回 200。
- PNG `chara` / `ccv3` 解码后均包含 `52447dbe290f7132ad1fc87e9506899688c18b6f` 与 `phase145-sqlite-import-sync-6-28-p5-1`；不含旧 `5e21c9...`、`phase144-sparse-insert-verify-6-28-p5-1` 或本地链接。
- database loader / database frontend 均包含 vendor ref `6ec4a4d7691d911b415f7644b8a219c25dd47ca9` 与 marker `mfrs-sqlite-import-sync-6-28-p5-1`；vendor 静态内容包含 `resetFromTableData` 与 `importTableAsJson`。

**真页非 AI smoke：**
- 通过 SillyTavern 导入端点重新导入开发 PNG，返回 `file_name=神秘复苏模拟器`；当前角色为 `characterId=2` / avatar `神秘复苏模拟器.png`。
- 刷新后重新选择角色，runtime marker 为 `mfrs-sqlite-import-sync-6-28-p5-1`；`AutoCardUpdaterAPI` / `MysteryDatabaseFrontend` 存在，`getFillMode()` 返回 `ai_crud_plan`。
- 打开 `SP·数据库 III -> 高级工具 -> 运行日志`，清空旧基线后为 `共 0 条`。
- 合法 `clues` smoke 使用 `clue_code=C2149`，执行 insert/update/delete 的 preview/apply 全部 `ok=true`，最终 `clueCode/clueToken` 残留为 0。
- `supernatural_events` smoke 使用 `event_code=CodexV628P51EventSmoke_1781498287149`，执行 insert/update/delete 的 preview/apply 全部 `ok=true`，最终 `eventCode` 残留为 0。
- 复查运行日志仍为 `共 0 条`；`ERROR=0`、`WARN=0`、`COLUMN_NOT_FOUND=0`、`Too Many Requests=0`、`API_MUTATION_FAILED=0`、`CHECK constraint failed=0`、`SQL 目标表不在当前模板中=0`。

**结论：** P5.1 开发卡非 AI 验证完成，之前的非法 `clues` 编号污染与 `supernatural_events` update 噪音均未复现；SQLite import fallback runtime 同步修复进入资源链路。当前有效发布版仍是 `v6.27`；本轮未同步发布版、未正式发布、未做低频真实 AI 自动填表观察。

## 2026-06-15 CST（会话52）：补全 v6.28 P5 / P5.1 任务清单

**状态：** 用户要求制作 P5 的完整任务清单。本轮使用 `planning-with-files-zh` 恢复当前 planning 上下文，只整理任务拆解，不修改业务代码，不启动本地服务，不触发真页 AI/写库。

**恢复确认：**
- 已读取 `planning-with-files-zh` 技能说明。
- 已按项目中文编码规则读取 `task_plan.md`、`progress.md`、`findings.md`，均为严格 UTF-8 解码。
- 已运行 `session-catchup.py`；恢复脚本仍报告旧 v6.21 残片。当前规划文件明确该上下文已被 v6.25/v6.27/v6.28 P5 覆盖，因此本轮继续按 `v6.28 P5.1` 处理。
- 已查看 planning 文件 diff 统计；当前 planning dirty 主要集中在 `task_plan.md`、`progress.md`、`findings.md`，本轮只新增 P5 清单和本条进度记录。

**本轮更新：**
- 在 `task_plan.md` 的 `当前任务清单` 下新增 `P5 完整任务清单（v6.28 P5 / P5.1）`。
- 清单把已完成的 P5 恢复、根因收窄、源码修复、本地 gate、资源链路、CDN smoke、真页 runtime、最小非 AI CRUD 和日志基线复核拆成 P5-00 到 P5-14。
- 清单把未完成的 P5.1 降噪/复核拆成 P5.1-01 到 P5.1-12，覆盖合法 `clues` smoke、`updateCell SQL failed` 来源复核、必要修复与回归、资源回填、真页非 AI 固定组合、发布判定、可选低频真实观察和最终记录。

**当前接续点：**
- 仍处于 `v6.28 P5.1`。
- 下一步不是发布版同步，而是先建立干净 `SP·数据库 III -> 高级工具 -> 运行日志` 基线，使用合法 `clues` 编号重跑窄口径 smoke，并确认或处理 `updateCell SQL failed` 的错误级日志来源。

## 2026-06-15 CST（会话51）：整理 planning-with-files 当前恢复口径与常驻流程

**状态：** 用户要求使用 `planning-with-files` 记录当前进度，并整理 planning 记录，保留版本变更、项目运行基本流程、要提交的文件、不需要提交的文件；项目运行基本流程继续作为常驻文件，确保新开对话可以继续任务。本轮只整理规划/流程文件，不修改业务代码，不启动本地服务，不触发真页 AI/写库。

**恢复确认：**
- 已读取 `planning-with-files` 与 `planning-with-files-zh` 技能说明。
- 已按项目中文编码规则读取 `task_plan.md`、`progress.md`、`findings.md`、`PROJECT_FLOW.md`、`CLAUDE.md`，均为严格 UTF-8 解码，无乱码结论。
- 已运行 `session-catchup.py`；恢复脚本仍报告旧 v6.21 中段残片。当前 `task_plan.md` 已推进到 v6.28 P5.1，且 v6.21 已被后续 v6.25/v6.27/P5 链路覆盖，因此本轮继续按当前规划处理，不回退旧阶段。
- 已冻结工作区：主工作区 `main...origin/main [behind 41]`，有大量既有 dirty；本轮只更新 planning/流程文件。

**整理结果：**
- `task_plan.md` 继续作为新对话主恢复入口：保留当前有效发布版 `v6.27`、当前候选线 `v6.28 P5.1`、当前任务清单、版本变更索引、需要提交/不需要提交文件边界。
- `PROJECT_FLOW.md` 继续作为常驻项目运行流程文件：保留真实开发入口、构建发布链路、真页验证口径、发布验证固定组合、自动更新边界和提交边界；不写入一次性阶段流水。
- `findings.md` 修正旧的 planning 恢复口径，明确当前有效发布版为 `v6.27`，当前候选线为 `v6.28 P5.1`；旧 v6.21 catchup 残片默认按过期上下文处理。

**当前任务快照：**
- 已完成：P5 稀疏表头 alias 修复、资源链路、构建产物回填、开发卡 repoint、CDN/resource smoke、真页 runtime、最小 `supernatural_events` 非 AI CRUD smoke。
- 当前阻断：`SP·数据库 III -> 高级工具 -> 运行日志` 基线未干净通过，显示 `18 / 18` 条，5 `ERROR` / 13 `WARN`；主要来自非法 `clues` 测试编号的 CHECK 约束失败，以及 1 条 `updateCell SQL failed` 的底层 SQL/fallback 噪音。
- 下一步：进入 P5.1 窄口径复核/降噪，使用合法 `clues` 编号重跑线索表 smoke，确认或处理 `updateCell SQL failed: SQL 目标表不在当前模板中: CodexV628P5EventSmoke_...`，再重新建立干净运行日志基线。

**提交边界：**
- 本轮整理类改动只应包含 `task_plan.md`、`progress.md`、`findings.md`、`PROJECT_FLOW.md`。
- 不纳入业务源码、dist、vendor、`.codex-*` worktree、`planning_archive_2026-06/**`、临时截图、日志、删除的历史数据库 JSON 或其它既有无关 dirty。

## 2026-06-14 CST（会话50）：v6.28 P5 资源链路与非 AI smoke 完成，运行日志基线未干净通过

**状态：** 用户要求完成下一步：整理并更新 P5 资源 ref/cache/marker，回填构建产物，然后按 `PROJECT_FLOW.md` 做非 AI CRUD smoke 和 `SP·数据库 III -> 高级工具 -> 运行日志` 基线复核。本轮继续使用既有 Chrome CDP `9222` 真页；未启动本地后台服务，未调用 `triggerUpdate()`，未点击“立即手动更新”，未发送会触发 AI 的聊天消息。

**恢复确认：**
- 已读取 `planning-with-files-zh`、`agent-browser/core`、`task_plan.md`、`PROJECT_FLOW.md`、`progress.md` 顶部、`findings.md` 顶部，并运行 `session-catchup.py`。
- `session-catchup.py` 仍报告旧 v6.21 残片；按当前 planning 规则忽略。
- 主工作区为 `main...origin/main [behind 41]`，有大量既有 dirty；P5 资源链路在临时 worktree `.codex-v628-p5-resource` 完成，本轮只更新 planning 记录。

**P5 资源链路：**
- 临时 worktree `.codex-v628-p5-resource` 基于 P4 开发卡提交 `29e3938bc5020075d1aa049a31745b69aabf7bbc`，当前 clean，HEAD 为 `a5fbf6e release: repoint v6.28 dev card to p5 loaders`。
- P5 resource 提交：`507fcafa0bea592953094199ab1d959bcf324a06`，更新 `table-change-adapter.ts`、`scripts/verify-table-change-adapter.mjs`、数据库前端 dist，修复稀疏表头只剩 `row_id` 时的 14 表模板表头重建和 alias 重排。
- P5 loader/self-reclaim 提交：`a652216f1e599d4ecf2a56dd0375050089e77f25`，marker/cache 为 `mfrs-sparse-crud-alias-6-28-p5` / `phase143-sparse-crud-alias-6-28-p5`。
- P5 开发卡 repoint 提交：`a5fbf6ea5759542f5569d7f8c9281ed0dfbd5c3b`，更新开发卡 YAML/PNG；PNG `chara` / `ccv3` 均包含 P5 loader/cache，且不含 P4 旧 hash/cache。

**资源与真页验证：**
- CDN/resource smoke 已通过：开发卡 YAML/PNG、状态栏 HTML、变量脚本、界面美化、固定状态栏、数据库 loader、数据库前端 self-reclaim、vendor、MagVarUpdate 均返回 200；P5 hash/cache/marker 存在，P4/P3/P2/phase133 旧值、本地 `localhost` / `127.0.0.1` 不残留。
- 真页通过酒馆官方导入端点覆盖开发卡后，当前角色为 `characterId=2` / avatar `神秘复苏模拟器.png`，runtime marker 为 `mfrs-sparse-crud-alias-6-28-p5`，`fillMode=ai_crud_plan`，`AutoCardUpdaterAPI` / `MysteryDatabaseFrontend` 存在。
- 最小 `supernatural_events` 可逆 CRUD smoke 通过：token `CodexV628P5EventSmoke_1781455195336`，insert/update/delete 的 preview/apply 均 `ok=true`，`exportCurrentData()` 复查残留为 0，未出现 `COLUMN_NOT_FOUND`。

**额外诊断发现：**
- 额外 `clues` 诊断使用了 `Codex...` 形式的 `clue_code`，不符合当前 DDL `CHECK clue_code GLOB 'C[0-9][0-9][0-9][0-9]'`，因此日志出现 CHECK 约束失败；这不能作为 P5 alias 修复失败证据，但说明后续 `clues` smoke 必须使用合法编号如 `C1234` 形态。
- 同一轮还出现 1 条 `updateCell SQL failed`，日志把 `CodexV628P5EventSmoke_1781455195336` 当作 SQL 目标表，说明最小 smoke 虽最终成功清理，但运行日志仍有底层 SQL/fallback 噪音需要单独复核。

**SP 运行日志复核：**
- 权威入口：`扩展程序 -> 打开 SP·数据库 III -> 高级工具 -> 运行日志`。
- 当前面板显示 `18 / 18` 条，统计为 5 条 `ERROR`、13 条 `WARN`。
- 关键词复核：`COLUMN_NOT_FOUND=0`、`Too Many Requests=0`、`API_MUTATION_FAILED=0`、`NativeTableServiceAdapter=0`、`SQLite 引擎未初始化=0`。
- 主要日志：4 条 `clues` INSERT 的 `CHECK constraint failed: clue_code GLOB 'C[0-9][0-9][0-9][0-9]'`，对应 8 条 SQL 沙箱 WARN；1 条 `SQL 目标表不在当前模板中: CodexV628P5EventSmoke_1781455195336`；1 条 `Provider 模式与设置不一致，按当前设置重建: provider=native, settings=sqlite`；4 条“设置尚未完成可靠加载，已拒绝本次保存”WARN。

**结论：** P5 稀疏表头 alias 主修复已通过本地 gate、资源链路、CDN smoke、真页 runtime 和最小 `supernatural_events` CRUD；P4 的多表 `COLUMN_NOT_FOUND` 与限流问题没有在本轮非 AI smoke 中复现。但 `SP·数据库 III -> 高级工具 -> 运行日志` 基线不是干净状态，因此 P5 不能按发布 smoke 收口。下一步应做 P5.1：用合法 `clues` 编号重跑窄口径 smoke，复核/处理 `updateCell` 底层 SQL 日志噪音，重新记录运行日志基线。

## 2026-06-14 CST（会话49）：进入 v6.28 P5，补齐稀疏表头下的 CRUD Plan alias 回归

**状态：** 用户要求继续下一步进入 `v6.28 P5`。本轮按 `PROJECT_FLOW.md` 和 planning 文件执行：未启动本地后台服务，未调用 `triggerUpdate()`，未点击“立即手动更新”，未触发真实 AI/写库，只做源码修复和本地回归。

**恢复确认：**
- 已读取 `planning-with-files-zh` 技能说明、`task_plan.md`、`PROJECT_FLOW.md`、`progress.md` 顶部、`findings.md` 顶部，并运行 `session-catchup.py`。
- `session-catchup.py` 仍报告旧 v6.21 残片；按 `task_plan.md` 常驻恢复入口视为过期上下文，不覆盖当前 `v6.28 P5` 状态。
- 当前工作区仍是 `main...origin/main [behind 38]`，有大量既有 dirty；本轮只在当前 P5 相关文件上增量修改，不回退无关变更。

**P5 修复内容：**
- 根因收窄为：P4 的模板 fallback 只在运行态表头完整时能恢复 DDL 物理列名/中文表头/注释 alias；如果 SQLite/导出层把空表或稀疏表导出成只含 `row_id` 的表头，`buildTableMeta()` 仍只建立 `row_id` 一列，真实 CRUD Plan 的 `name`、`archive_code`、`clue_code`、`location_name`、`ghost_code`、`archive_ghost_name` 等物理列会被前端预检判 `COLUMN_NOT_FOUND`。
- 已修改 `src/神秘复苏模拟器/脚本/数据库前端/table-change-adapter.ts`：当运行态 sheet 能匹配到 14 表模板时，用模板表头重建运行态 content，并按 DDL 物理列名、中文表头、DDL 注释 alias 把已有行值重排到正确列位；同时覆盖表头缺列、物理列名表头和顺序错位。
- 已修改 `scripts/verify-table-change-adapter.mjs`：加载真实 `src/神秘复苏模拟器/数据库/神秘复苏表格SQL_v1.json`，新增 P5 回归，模拟 `玩家状态`、`厉鬼档案`、`线索`、`地点`、`驾驭厉鬼`、`收录档案` 运行态只有 `row_id` 表头时，物理列名和中文注释 alias 的 CRUD Plan 都不再产生 `COLUMN_NOT_FOUND`。

**本地验证：**
- `node scripts/verify-table-change-adapter.mjs` 通过。
- `git diff --check -- src/神秘复苏模拟器/脚本/数据库前端/table-change-adapter.ts scripts/verify-table-change-adapter.mjs` 通过。
- `node --check scripts/verify-table-change-adapter.mjs` 通过。
- `node scripts/verify-sql-debug-regressions.mjs` 通过；仅输出 Node SQLite ExperimentalWarning。
- `node scripts/verify-output-cleaning-regressions.mjs` 通过。

**未做 / 下一步：**
- 本轮未运行 `pnpm build`，因为当前主工作区源码里的数据库 loader 仍是旧 `phase133` / `mfrs-applied-mutation-verify-6-20` 指针；直接构建会生成旧资源链路，不适合作为 P5 真页验证产物。
- 下一步应先整理/推进资源链路：确认 P5 应基于哪条 P4/P5 资源 ref 更新 loader、database frontend 和开发卡 cache/marker，再构建/回填 dist；之后按 `PROJECT_FLOW.md` 重跑非 AI CRUD smoke 和 `SP·数据库 III -> 高级工具 -> 运行日志` 基线。
- 低频真实自动填表观察仍只在用户明确要求时执行，且要避开限流窗口。

## 2026-06-14 CST（会话48）：整理 planning-with-files 当前恢复口径与常驻流程边界

**状态：** 用户要求继续使用 `planning-with-files` 记录当前进度，并整理 planning 记录，保留版本变更、项目运行基本流程、要提交/不提交文件；项目运行基本流程作为常驻文件，确保新开对话可以继续任务。本轮只处理规划/流程文件，不修改业务代码，不启动本地服务，不触发真页 AI/写库。

**恢复确认：**
- 已读取 `planning-with-files-zh` 技能说明。
- 已按项目中文编码规则读取 `CLAUDE.md`、`task_plan.md`、`progress.md`、`findings.md`、`PROJECT_FLOW.md`，均为严格 UTF-8 解码，无乱码结论。
- `session-catchup.py` 仍报告旧 v6.21 中段残片；当前 `task_plan.md` / `progress.md` / `findings.md` 已推进到 v6.28 P4/#68 后半段，因此该恢复提示按常驻流程视为过期上下文，不覆盖当前状态。

**整理结果：**
- `task_plan.md` 继续作为主恢复入口，保留当前状态、当前任务清单、版本变更索引、需要提交的文件、不需要提交的本地参考文件，并把接续口径明确为：P4 验证失败，下一工作阶段是 `v6.28 P5`。
- `PROJECT_FLOW.md` 继续作为常驻项目运行流程文件，保留真实开发入口、构建发布链路、真页/SQL 验收口径、发布验证固定组合、自动更新边界和提交边界；不写入一次性阶段流水。
- `progress.md` 顶部记录本次整理会话；`findings.md` 顶部补充新对话恢复与 P5 接续经验。

**当前任务状态：**
- 当前有效发布版仍为 `v6.27`。
- 当前候选线不是可发布状态；`v6.28 P4` 已完成 #66/#67/#68 验证，但 #68 未通过。
- 下一步应进入 `v6.28 P5`：补齐 CRUD Plan 对 `玩家状态`、`厉鬼档案`、`线索`、`地点`、`驾驭厉鬼`、`收录档案` 等表的物理列名/中文表头/DDL 注释 alias 映射，并加本地回归；修复后再按 `PROJECT_FLOW.md` 的发布验证固定组合低频复核。

**提交边界：**
- 本轮整理类改动只应包含 `task_plan.md`、`progress.md`、`findings.md`、`PROJECT_FLOW.md`。
- 不纳入 `.codex-*` worktree、`planning_archive_2026-06/**`、临时截图、`acu-logs-*.json`、`snapshot_logs_after_trigger.txt`、`tavern_current_*`、删除的历史数据库 JSON、`--.json` 或其它既有无关 dirty。

**校验：**
- `git diff --check -- task_plan.md progress.md findings.md PROJECT_FLOW.md` 无输出，通过。
- `git status --short -- task_plan.md progress.md findings.md PROJECT_FLOW.md` 仅显示：`M findings.md`、`M progress.md`、`M task_plan.md`、`?? PROJECT_FLOW.md`。

## 2026-06-14 CST（会话47）：#68 后半段复核 — 三轮真实对话后自动填表部分落盘，但日志新增 ERROR/WARN

**状态：** 用户手动完成三轮真实对话后，继续按 `PROJECT_FLOW.md` 的 #68 后半段做只读复核。本轮未发送新消息，未调用 `triggerUpdate()`，未点击“立即手动更新”，未修改业务代码。

**真页状态：**
- 真页仍为 `http://127.0.0.1:8000/`，开发卡 `characterId=2` / avatar `神秘复苏模拟器.png`。
- runtime marker：`mfrs-clean-crud-alias-6-28-p4`；`fillMode=ai_crud_plan`。
- 聊天长度 7，最后一条为助手回复；底部输入框为空。

**可见层复核：**
- 页面可见文本未命中 `<draft>`、`<UpdateVariable>`、`<JSONPatch>`、`<修改确认>`、`<pacing_rules>`、裸 `"op"`、`risk.death` / `risk.revive` 等内部块。
- 页面可见的助手正文是剧情文本，并正常显示 A-D 选项。
- 原始聊天消息中仍保留隐藏的 `<draft>` / `<UpdateVariable>` / `<JSONPatch>` 等结构载荷；本轮判定为“可见层清洗通过，原始载荷保留符合现有设计”。

**导出落盘复核：**
- `MysteryDatabaseFrontend.exportCurrentData()`：14 张业务表、总行 28、实际数据行 14。
- 与 #68 基线实际数据行 5 相比，本轮真实对话后新增约 9 行。
- 有数据表分布：
  - `sheet_global_state`: 1
  - `sheet_player_state`: 1
  - `sheet_supernatural_events`: 1
  - `sheet_ghost_archives`: 1
  - `sheet_clues`: 5
  - `sheet_characters`: 5
- 仍为空表：`sheet_locations`、`sheet_supernatural_items`、`sheet_action_suggestions`、`sheet_chronicle`、`sheet_check_suggestions`、`sheet_controlled_ghosts`、`sheet_collected_archives`、`sheet_collected_rules`。
- `CodexV628P4Smoke_` / `CodexV628P3Smoke_` / `CodexV628P2` 测试 token 残留为 0。

**SP 运行日志复核：**
- 权威入口：`扩展程序 -> 打开 SP·数据库 III -> 高级工具 -> 运行日志`。
- 当前日志：`当前显示 18 / 18 条`，按时间戳切分为 4 条 `ERROR`、14 条 `WARN`。
- 4 条 `ERROR` 全部来自 `parseNonStreamResponse`，核心为上游 API 限流：`Too Many Requests`。
- 8 条限流相关 `WARN`：`CRUD Plan 第 1 次尝试失败: API限流` 与 `CRUD 填表 API 传输问题，停止本轮重试`，并进入 15 秒冷却。
- 6 条 `COLUMN_NOT_FOUND` 相关 `WARN` 来自 `CRUD 原子批次容错`，涉及 `玩家状态`、`厉鬼档案`、`线索`、`地点`、`驾驭厉鬼`、`收录档案` 等表的物理列名不匹配。
- 未见 `_acu_sheet_meta`、`NativeTableServiceAdapter` 错配、SQLite 初始化失败、`API_MUTATION_FAILED`、`ROW_NOT_FOUND`、CHECK/GLOB/UNIQUE/LENGTH 约束失败。

**结论：** #68 后半段已完成观察，但不能通过发布收口。P4 修复使真实自动填表从 0 落盘提升到部分落盘，可见层清洗也通过；剩余阻断是运行日志新增限流 ERROR，以及多表 `COLUMN_NOT_FOUND` 预检 WARN 导致自动填表不完整。下一步应进入 P5 修复/优化：继续补齐 CRUD Plan 列名 alias 映射，并保持 API 限流只提示和冷却，不在发布验证中继续放大请求。

## 2026-06-14 CST（会话46）：继续 #68，正确日志入口复核通过但真页发送仍阻断

**状态：** 用户要求继续完成 #68。本轮严格按 `PROJECT_FLOW.md` 执行：未启动本地后台服务，未调用 `triggerUpdate()`，未点击“立即手动更新”，未修改业务代码；只复用既有 Chrome CDP `9222` 真页。

**恢复与基线：**
- 已读取 `task_plan.md`、`PROJECT_FLOW.md`、`progress.md`、`findings.md` 并运行 `session-catchup.py`；恢复脚本仍只报告旧 v6.21 残片，按当前 planning 规则忽略。
- 当前真页：`http://127.0.0.1:8000/`，开发卡 `characterId=2` / avatar `神秘复苏模拟器.png`，runtime marker `mfrs-clean-crud-alias-6-28-p4`，`fillMode=ai_crud_plan`。
- 触发前导出基线：14 张业务表、总行 19、实际数据行 5，全部来自 `sheet_check_suggestions`；聊天长度 1，`#send_textarea` 内仍有 1057 字开局设定。
- 通过正确入口 `扩展程序 -> 打开 SP·数据库 III -> 高级工具 -> 运行日志` 复核日志基线：`当前显示 0 / 0 条`，Debug 未采集。

**发送尝试：**
- 只执行一次正常点击 `#send_but`，等待 60 秒；聊天长度仍为 1，输入框仍未清空。
- 只执行一次正常 `#send_textarea` 聚焦后 Enter 提交，等待 60 秒；聊天长度仍为 1，输入框仍未清空。
- 只读诊断确认：`#send_but` 未禁用、未被遮挡，按钮有 `click` 绑定，`#send_textarea` 有 `keydown` 绑定，`SillyTavern.getContext().shouldSendOnEnter()` 返回 `true`；`保存中` 徽标实际为隐藏子元素，不是当前阻断的可见保存锁。

**复查结果：**
- 两次正常提交尝试均未新增用户/助手楼层，未触发真实 AI，未触发自动填表。
- 复查导出仍为 14 表、实际数据行 5；没有新增写库结果。
- 复查 `SP·数据库 III -> 高级工具 -> 运行日志` 仍为 `当前显示 0 / 0 条`，无新增 ERROR/WARN。

**结论：** #68 仍未完成，阻断点进一步收窄为当前酒馆真页“正常发送动作未提交用户楼层”。下一步需要先由用户在页面手动确认能否发送当前输入框内容，或把“真页发送链路不工作”作为独立阻断任务排查；在没有生成真实回复前，不能判定 P4 的真实可见层、自动填表落盘或运行日志新增项。

## 2026-06-14 CST（会话45）：整理 planning-with-files 记录与常驻流程文件

**状态：** 用户要求使用 `planning-with-files` 记录当前进度，并整理 planning 记录，保留版本变更、项目运行基本流程、要提交/不提交文件；项目运行基本流程作为常驻文件，确保新开对话可继续任务。本轮只整理文档，不改业务代码，不启动服务，不触发真页 AI/写库。

**整理内容：**
- `task_plan.md`：保留 `常驻恢复入口`、`当前状态`、`版本变更索引`、`需要提交的文件`、`不需要提交的本地参考文件`；压缩 `当前任务清单`，把历史流水改为版本段摘要和 v6.28 #50-#68 状态。
- `PROJECT_FLOW.md`：继续作为常驻项目运行流程文件，保留新对话恢复、真实开发入口、协作顺序、实时开发链路、正式构建发布链路、自动更新边界、真页与 SQL 验收口径、发布验证固定组合和提交边界；去掉写死的单次发布口径，改为引用 `task_plan.md` 的当前状态/版本索引。
- `findings.md`：补充 planning 整理约定，明确四个文件各自职责，避免后续把一次性进度塞进常驻流程。

**当前任务状态：**
- 当前有效发布版仍为 `v6.27`；版本链路与维护 tag 保留在 `task_plan.md` 的 `版本变更索引`。
- 当前候选线为 `v6.28 P4`；#66/#67 已完成，#68 固定验证组合已完成 CDN/resource smoke、runtime marker、非 AI CRUD 和 SP 日志基线。
- #68 剩余一次低频真实对话观察。当前阻断是真页发送入口未把 `#send_textarea` 内容提交成用户楼层，聊天长度仍为 1，未触发真实 AI/自动填表。

**提交边界：**
- 本轮整理类改动只应包含 `task_plan.md`、`progress.md`、`findings.md`、`PROJECT_FLOW.md`。
- 不纳入 `.codex-*` worktree、`planning_archive_2026-06/**`、临时截图、`acu-logs-*.json`、`snapshot_logs_after_trigger.txt`、`tavern_current_*`、删除的历史数据库 JSON、`--.json` 或其它既有无关 dirty。

## 2026-06-14 CST（会话44）：继续 #66-#68，p4 修复已验证到发送前，#68 被真页发送入口阻断

**状态：** 用户要求“继续完成 #66-#68，完成参考 planning-with-files 记录的项目流程，不要做多余操作”。本轮按 `PROJECT_FLOW.md` 执行：未启动本地后台服务，未调用 `triggerUpdate()`，未点击“立即手动更新”，未改业务代码。

**恢复确认：**
- 已读取 `task_plan.md`、`progress.md`、`findings.md`、`PROJECT_FLOW.md` 与 `CLAUDE.md`；`session-catchup.py` 仍只提示旧 v6.21 残留，按常驻流程忽略。
- 当前 CDP 入口为既有 `9222` 真页标签：`http://127.0.0.1:8000/`。
- 真页 baseline：runtime marker `mfrs-clean-crud-alias-6-28-p4`，`fillMode=ai_crud_plan`，`AutoCardUpdaterAPI` / `MysteryDatabaseFrontend` 存在。
- `SP·数据库 III -> 高级工具 -> 运行日志` 基线为 `共 0 条`，WARN=0，ERROR=0。
- `MysteryDatabaseFrontend.exportCurrentData()` baseline 为 15 表、实际数据行 5，均为 `检定建议`；`CodexV628P4Smoke_` 残留为 0。

**#66/#67 状态落账：**
- 依据当前远端 p4 链路与真页 smoke，#66 可见层清洗回归修复已完成：p4 覆盖 `<draft>`、`<修改确认>`、`<pacing_rules>`、`<UpdateVariable>/<JSONPatch>`、裸 choices JSON 与英文/外语中间稿隐藏；本地回归和资源 smoke 已通过。
- #67 真实 CRUD Plan 执行修复已完成：p4 增强物理列名/中文表头/DDL 注释 alias 映射，并对 `global_state.current_time` 做执行层安全归一化；非 AI `supernatural_events` 可逆 CRUD 与 SP 日志基线已通过。

**#68 真实低频观察尝试：**
- 先尝试底部正常聊天输入框发送普通行动消息；因 `SP·数据库 III` 面板覆盖发送按钮，先关闭面板。关闭过程中出现“确定要关闭吗？未保存的修改将丢失。”确认；接受后只是关闭验证面板，未执行数据库写操作。
- 当前聊天停留在卡片首条开局表单，底部输入框直接发送没有新增用户楼层；随后按卡片正常 UI 填写开局表单：姓名 `林槐`、`24/男`、身份 `普通人（卷入灵异事件）`、资源 `手机、手电筒、钥匙、一小块黄金饰品`、背景 `普通居民，对灵异几乎一无所知，只听说过一些都市怪谈。`。
- 点击“进入神秘复苏世界”后，卡片按预期把标准开局设定写入 `#send_textarea`，但无遮挡 `#send_but` 点击、Enter 发送以及酒馆正常 `SillyTavern.getContext().generate('normal')` 入口均未把输入提交为用户楼层。
- 观察结果：聊天长度始终为 1，最后一条仍是初始助手消息，`#send_textarea` 仍保留 1057 字符开局设定；未触发 AI 回复，未进入自动填表。

**结果：**
- #68 未完成，不能判定“真实回复可见层是否无内部块外露”或“真实自动填表是否有落盘”。
- 复查导出仍为 15 表、实际数据行 5，`CodexV628P4Smoke_` 残留 0，说明本轮发送失败没有误触发写库或留下测试残留。
- 下一步应先恢复/确认真页正常发送当前 `#send_textarea` 内容；若用户可在页面手动发送一次，再继续按固定组合复查玩家可见正文、A-D 选项/状态面板、SP 运行日志和 `exportCurrentData()` 落盘。

## 2026-06-14 CST（会话43）：#65 重跑 P2/P3 验证组合，发现新阻断

**状态：** 用户要求继续完成 `#65 重跑 P2 验证组合`。本轮严格按 `PROJECT_FLOW.md` 执行：未启动临时本地静态服务，未调用 `triggerUpdate()`，未点击“立即手动更新”；SQL/数据库日志只以 `SP·数据库 III -> 高级工具 -> 运行日志` 为权威入口。

**资源链路：**
- 临时干净 worktree：`.codex-v628-p3-verify`。
- 远端最终 HEAD：`6c2fed32ad625b14f129811da9495f45739cbf03`，tag `v0.0.160`；未等到额外 `[bot] bundle`。
- 三段链路：资源提交 `3c269d7` -> loader 回填 `f7b6187` -> 开发卡 repoint `6c2fed3`。
- cache/marker：`phase141-autofill-persist-6-28-p3` / `mfrs-autofill-persist-6-28-p3`。
- CDN/resource smoke 通过：开发卡 YAML、开发卡 PNG、状态栏 HTML、变量结构、界面美化、固定状态栏、数据库 loader、数据库前端、vendor、MagVarUpdate 均可访问；PNG `tEXt:chara` 与 `tEXt:ccv3` 均含新 loader/cache，且不含旧 `phase133` / `mfrs-applied-mutation-verify-6-20`。

**真页加载：**
- 起初真页仍是旧 runtime：`characterId=2` / avatar `神秘复苏模拟器.png` / marker `mfrs-applied-mutation-verify-6-20`，不能作为 #65 结果。
- `node tavern_sync.mjs push 神秘复苏模拟器 -f` 按项目同步入口尝试执行，但现有调试同步服务器已占用 `6620`，报 `EADDRINUSE`；未杀进程，未另起后台服务。
- 改用酒馆官方导入端点：浏览器直接 fetch CDN PNG，再 POST `/api/characters/import`，带 `preserved_name=神秘复苏模拟器.png` 覆盖当前开发卡；返回 `{"file_name":"神秘复苏模拟器"}`。
- 刷新并切回 `characterId=2` 后确认：卡数据含 `phase141` 且不含 `phase133`，运行 marker 为 `mfrs-autofill-persist-6-28-p3`，`AutoCardUpdaterAPI` / `MysteryDatabaseFrontend` 存在，`AutoCardUpdaterAPI.getFillMode()` 为 `ai_crud_plan`。

**非 AI smoke：**
- `MysteryDatabaseFrontend.checkTemplateStatus()`：14 表完整，missing/mismatch 均为空。
- `supernatural_events` 可逆 CRUD 通过：
  - 首次脚本因 PowerShell 管道把中文列名转成 `????`，预检失败且没有写入；改用 DDL 物理列名 + Unicode 枚举重跑。
  - token `CodexV628P3Smoke_1781434247343`：insert preview/apply `ok=true`，update preview/apply `ok=true`，delete preview/apply `ok=true`。
  - 导出复查最终 token 残留 0。
- CRUD 后打开 `SP·数据库 III -> 高级工具 -> 运行日志`，面板显示 `共 0 条`。

**低频真实对话观察：**
- 触发前基线：当前聊天 1 层；数据库实际数据行合计 5（均为 `检定建议` 固定行）；运行日志 `共 0 条`。
- 开局表单第一次点击只生成/保存用户开局设定，未自动生成助手回复；随后通过酒馆正常 `generate('normal')` 得到一条 `...` 助手消息，未产生有效填表。
- 第二条普通行动消息通过正常发送按钮发送：秦实，18 岁普通人，夜里在大昌市居民楼用手机手电筒观察墙上湿脚印并保持距离。
- AI 回复生成完成，但可见层出现严重外露：
  - `<draft>...</draft>` 内部草稿直接可见，且包含西班牙语中间稿 `La luz del teléfono móvil...`。
  - `<修改确认>`、`<UpdateVariable>`、`<JSONPatch>`、裸 `"op"` patch 列表可见。
  - 裸 `<choices>` JSON 可见，含 `risk.death` / `risk.revive` 等内部字段。
- 自动填表未落盘：导出仍为 14 表，实际数据行合计仍 5；`行动建议`、`玩家状态`、`全局状态`、`灵异事件` 等均未新增数据。

**SP 运行日志复核：**
- 权威入口 `SP·数据库 III -> 高级工具 -> 运行日志` 显示 `共 5 条`，其中 1 条 ERROR、4 条 WARN。
- 关键 ERROR：`insertRow SQL failed`，`global_state.current_time` 写入 `2024-04-12 22:15`，不满足 DDL `CHECK current_time GLOB '????-??-?? ??:??'`。
- 关键 WARN：
  - CRUD Plan 第一次尝试失败，3/3 批次全部失败。
  - `玩家状态` 使用 `name`、`identity_text`、`location_name`、`status_text`、`death_risk` 等物理列名时被前端预检报 `COLUMN_NOT_FOUND`。
  - `灵异事件` 使用 `event_code`、`danger_level`、`location_name`、`ghost_domain_status` 等物理列名时被前端预检报 `COLUMN_NOT_FOUND`。
  - `SyncBridge` 报 `玩家状态` DDL 与表头不完全匹配，将按位置映射继续加载。

**结论：** #65 已执行但未通过。P3 解决了“真页加载旧资源”的前置阻塞，且非 AI CRUD smoke 通过；但发布仍阻断于两类问题：P0 显示层清洗在真实回复中回归失效，P3 真实 CRUD Plan 仍因列名映射/日期格式约束失败而 0 落盘。

**下一步：**
1. #66 修复可见层清洗回归，覆盖 `<draft>`、`<修改确认>`、`<UpdateVariable>/<JSONPatch>`、裸 choices JSON 与外语/英文中间稿。
2. #67 修复真实 CRUD Plan 执行失败：列名 alias 映射与 `current_time` 格式归一化。
3. #68 修复后重跑固定验证组合。

## 2026-06-14 CST（会话42）：接续 P2，完成 P3 本地修复记录并准备 #65 真页验证

**状态：** 用户要求“接下来继续完成P2”。按 `planning-with-files` 恢复后确认：P2 已在会话41执行，但因真实自动填表 0 落盘未通过发布门槛；当前实际应继续 v6.28 P3（#61-#65）。本轮未调用 `triggerUpdate()`，未点击“立即手动更新”，未触发真实 AI 对话。

**恢复与边界：**
- 已读取 `task_plan.md`、`progress.md`、`findings.md` 和 `PROJECT_FLOW.md`；`session-catchup.py` 仍只报告旧 v6.21 残片，按当前计划规则忽略。
- `git status --short --branch` 显示主工作区仍 `main...origin/main [behind 32]` 且有大量既有 dirty；本轮不回退无关改动，不使用 `git add .`。
- 当前 P3 相关改动集中在 `vendor/shujuku-sp-fork/index.js`、`src/神秘复苏模拟器/脚本/数据库前端/table-change-adapter.ts`、`scripts/verify-table-change-adapter.mjs`、`scripts/verify-sql-debug-regressions.mjs` 和数据库前端 dist。

**P3 本地修复确认：**
- #61 已冻结 P2 失败证据：真页开发卡 `characterId=2` / avatar `神秘复苏模拟器.png`，14 表实际数据行 0，SP 运行日志为 4 WARN / 0 ERROR，核心是 `全局状态` / `玩家状态` 空表 `ROW_NOT_FOUND`，以及 `sheet_supernatural_events` 列结构变化退化 checkpoint；聊天楼层 isolatedData 中 checkpoint 仍为 0 行。
- #62 已修复：`table-change-adapter.ts` 现在解析 `CHECK(row_id = 1)` 为 `minValue=maxValue`；空 singleton 表收到完整 `updateCell` 且 match 未带 row_id 时，如果表里只有表头，可自动补固定主键并提升为 `insertRow`。
- #63 已修复：`vendor/shujuku-sp-fork/index.js` 的 `saveToLatestFloorAndRefresh()` 在 `skipChatSave=true` 的 batch/import 单条操作中不再执行单条聊天保存、单条 merged refresh 或无 AI 楼层 fallback save，避免批次末统一保存前被旧聊天 checkpoint 刷回 0 行。
- #64 已补回归：`verify-table-change-adapter` 覆盖空 `global_state` update 提升 insert；`verify-sql-debug-regressions` 覆盖 batch `skipChatSave=true` 不调用单条 save/refresh/fallback。

**当前阻塞：**
- #65 尚未完成。当前真页开发卡仍加载旧 `mfrs-applied-mutation-verify-6-20` / `phase133-applied-mutation-verify-6-20` 资源，且开发版 loader 仍写旧 vendor CDN；现在直接真页验证会测旧资源，不能证明 P3 修复。

**下一步：**
1. 复跑本地 gate：语法检查、adapter/sql 回归、storage/meta/output 回归、`pnpm build`、`git diff --check`。
2. 让真页加载本轮修复后的 vendor/frontend（资源提交/loader 回填/开发卡 repoint，或本地调试链路），确认 runtime marker 不再是旧 v6.20。
3. 再执行 #65：真页非 AI CRUD smoke、`SP·数据库 III -> 高级工具 -> 运行日志`、用户明确允许后的低频真实对话观察。

**流程修正：**
- 曾短暂尝试把 loader 指向 `127.0.0.1:8787` 并启动本地静态服务来做临时真页 import 验证；用户指出应严格按项目流程执行。已停止该方案，并把 `src/神秘复苏模拟器/脚本/数据库/index.ts`、`src/神秘复苏模拟器/脚本/数据库前端/index.ts` 与对应 `dist` 产物里的临时本机 URL / marker 撤回。
- 已重新 `pnpm build` 同步产物，构建通过，仅有数据库前端 249 KiB 的既有体积 warning；`rg` 复核 `127.0.0.1:8787`、`mfrs-autofill-persist-local-6-28-p3`、`phase141-autofill-persist-local-6-28-p3` 在相关 source/dist 中均无残留。
- 后续 #65 只按 `PROJECT_FLOW.md` 执行：开发入口走 `Fn+F5 / pnpm watch` 或正式资源提交 + loader 回填 + 开发卡 repoint；数据库日志验证仍以 `SP·数据库 III -> 高级工具 -> 运行日志` 为权威入口。

## 2026-06-14 CST（会话41）：继续完成 v6.28 P2 真页验证，发现真实自动填表 0 落盘

**状态：** 用户要求“接下来继续完成P2”。本轮按 `planning-with-files` 恢复上下文，继续 #59-#60；未调用 `triggerUpdate()`，未点击“立即手动更新”。执行了本地 gate、真页不触发 AI smoke，并在冷却窗口外只发送一次真实开局消息。

**本地 gate / 构建：**
- 已确认 #59 的本地 gate 通过：`node --check vendor/shujuku-sp-fork/index.js`、`node --check scripts/verify-sql-debug-regressions.mjs`、`node --check scripts/verify-output-cleaning-regressions.mjs`、`node scripts/verify-sql-debug-regressions.mjs`、`node scripts/verify-output-cleaning-regressions.mjs`、`node scripts/verify-table-change-adapter.mjs`、`node scripts/verify-storage-provider-mode-guard.mjs`、`node scripts/verify-syncbridge-meta-no-error.mjs`、`pnpm build` 均通过；`pnpm build` 仅有数据库前端 `index.js` 约 249 KiB 的既有体积 warning。
- 真页非 AI smoke 首次暴露 `applyTableChangePlan()` 的新问题：底层 CRUD 返回失败前会原地改写传入的 `currentData` 对象，导致适配器失败后验证拿到的不是写入前基线；insert 会被误判失败并可能触发 import fallback 重复写入，delete 也会被误判失败。
- 已修复 `src/神秘复苏模拟器/脚本/数据库前端/table-change-adapter.ts`：`applyTableChangePlan()` 在执行底层 mutation 前先克隆一份 normalized baseline，失败后验证与 import fallback 均使用写入前快照。
- 已增强 `scripts/verify-table-change-adapter.mjs`：新增 insert/delete “API 返回失败但原地改写同一个 currentData 对象”的回归，断言适配器识别已生效且不触发二次 import。
- 修复后重跑 `node scripts/verify-table-change-adapter.mjs` 通过，`pnpm build` 通过，`git diff --check -- src/神秘复苏模拟器/脚本/数据库前端/table-change-adapter.ts scripts/verify-table-change-adapter.mjs dist/神秘复苏模拟器/脚本/数据库前端/index.js` 通过。

**真页不触发 AI smoke：**
- 真页开发版卡：`characterId=2`，avatar `神秘复苏模拟器.png`，`fillMode=ai_crud_plan`，`MysteryDatabaseFrontend.previewTableChangePlan/applyTableChangePlan/exportCurrentData` 均存在。
- 权威日志入口：`SP·数据库 III -> 高级工具 -> 运行日志`。基线清空为 `当前显示 0 / 0 条`。
- 基线导出：14 表，合计 14 行（均为表头），实际数据行 0。
- 修复后用 `supernatural_events` 执行可逆 CRUD：
  - insert token `CodexV628P2Async_1781427319957`：页面异步轮询结果 `ok=true`，`insertedRowIndex=2`，导出可见 1 条当前 token 行。
  - update：`ok=true`，`handling_status=已压制`，`public_summary` 更新成功。
  - delete：`ok=true`，当前 token 残留 0。
  - 清理早先超时探针 `CodexV628P2FixedStep_1781426971718`：`ok=true`，最终所有 `CodexV628P2` 残留 0；14 表回到仅表头。
- CRUD 后 SP 运行日志为 `当前显示 0 / 0 条`，无 `_acu_sheet_meta`、Native adapter、SQLite 初始化、约束、`API_MUTATION_FAILED` 或限流错误。

**低频真实对话观察：**
- 触发前冻结：14 表实际数据行 0；SP 运行日志 `当前显示 0 / 0 条`。
- 只发送一次普通开局：`CodexV628P2Observer`，22/M，普通人，老旧公寓走廊，手机和小金件，无驾驭厉鬼。
- AI 回复生成成功：老旧公寓走廊剧情、拖行鬼影遭遇、A-D 推演选项、状态面板均出现；页面可见层未发现裸 choices JSON、裸 JSON Patch、`<JSONPatch>`、`"op":"replace"` 或英文调试摘要外露。
- 自动填表结束后导出仍为 14 表、实际数据行 0；当前聊天楼层里的 `TavernDB_ACU_Data` / `TavernDB_ACU_IndependentData` / isolated `independentData` 也均为 0 数据行，确认不是导出读错。
- SP 运行日志新增 4 条 WARN、0 条 ERROR：
  - 3 条 `[表格增量] sheet_supernatural_events: 列结构变化，退化为 checkpoint`。
  - 1 条 `[CRUD 原子批次容错] 2/4 条操作失败，已跳过: 预检失败: ROW_NOT_FOUND: 全局状态...; 玩家状态...`。
- 未出现 `_acu_sheet_meta`、Native adapter/provider mismatch、SQLite 初始化失败、SQL/约束错误、`API_MUTATION_FAILED`、`Too Many Requests` / 429 或网关错误。

**结论：** P2 非 AI smoke 已通过，P0 显示层清洗在真实回复中通过，P1 限流分类没有被触发且未误报 SQL/模板错误。但真实自动填表仍未落盘，主要新问题是空表 `updateCell` 未命中全局/玩家状态，以及 `sheet_supernatural_events` 列结构变化退化 checkpoint 后没有形成可见数据行。v6.28 还不能进入发布收口，下一步应修复真实自动填表 0 落盘问题。

## 2026-06-14 CST（会话40）：完成 v6.28 P1 API 限流提示与手动重试体验优化

**状态：** 用户要求“继续完成P1”。本轮按 `planning-with-files` 恢复上下文并执行 #55-#58；未触发真页 AI、未调用 `triggerUpdate()`、未点击“立即手动更新”，也未同步发布版或发布资源。

**已完成：**
- #55 复核链路：确认 `parseNonStreamResponse_ACU()` 已识别 `Too Many Requests`、`HTTP 429`、`Retry-After`；`executeCrudPlanFill_ACU()` 和 SQL 兜底命中传输问题后登记冷却并停止本轮重试，保持“遇限流即停止放大请求”。
- #56 提示增强：新增统一结构化结果 helper，API 传输问题会返回 `apiTransportIssue`、`apiTransportKind`、`cooldownSeconds`、`incompleteFill`、`retryAdvice`；自动更新 UI 遇该状态显示 warning 和“本轮填表未完整完成，冷却后手动重试”，不再显示普通数据库更新失败。
- #57 pending/重试策略：手动填表编排会透传传输问题结构化状态，并带 `pendingRetrySummary`；该摘要明确 `autoReplay=false`、`manualRetry=true`，只提示冷却后手动重试，不做自动队列重放。
- #58 API 预设/额度策略：只读复核默认自动填表参数为 `fillMode=ai_crud_plan`、`maxConcurrentGroups=1`、`tableMaxRetries=3`、`updateBatchSize=3`、`max_tokens=60000`；本轮不输出密钥、不做压力测试，并在运行日志健康卡文案中引导检查 API 预设与额度。
- 运行日志健康卡新增 `apiRateLimitIssue`，把 `Too Many Requests` / `HTTP 429` / `Retry-After` 从 `Bad Gateway` 类网关错误中拆出；SQL 表名/列名不匹配提示不再吞掉这类限流证据。

**验证：**
- `node --check vendor/shujuku-sp-fork/index.js`：通过。
- `node --check scripts/verify-sql-debug-regressions.mjs`：通过。
- `node scripts/verify-sql-debug-regressions.mjs`：通过，覆盖 API 限流结构化结果、Bad Gateway 解析、dashboard 分类等；Node 仍提示 `node:sqlite` ExperimentalWarning。
- `node --check scripts/verify-output-cleaning-regressions.mjs`：通过。
- `node scripts/verify-output-cleaning-regressions.mjs`：通过。
- `node scripts/verify-table-change-adapter.mjs`：通过。
- `git diff --check -- vendor/shujuku-sp-fork/index.js scripts/verify-sql-debug-regressions.mjs scripts/verify-output-cleaning-regressions.mjs task_plan.md progress.md findings.md`：通过。

**遇到的问题与处理：**
- 第一次只读片段抓取时 PowerShell 字符串里的 `$path:$start` 被解释成变量命名空间，已改为 `${path}:$start` 重跑成功。
- 新增结构化结果回归后，`extractFunction()` 先把解构参数 `{ channel... }` 误判为函数体，导致 VM `Unexpected token 'function'`；已把提取逻辑改为从函数签名右括号之后寻找函数体 `{`。
- 新文案断言第一次发现“自动填表 未完整完成”中间多一个空格；已收紧为“自动填表未完整完成”并重新跑全套 gate。

**边界：** 本轮没有改 14 表模板、SQLite provider guard、发布版卡片或发布资源；没有做真页 AI/写库复测。下一步进入 P2：本地 gate 复核后按固定组合做不触发 AI 的真页 smoke，再由用户决定是否在冷却窗口外做一次低频真实对话观察。

## 2026-06-14 CST（会话39）：完成 v6.28 P0 结构化内容外露修复

**状态：** 用户要求“现在完成P0”。本轮按 `planning-with-files` 恢复上下文，只处理 #50-#54；未触发真页 AI、未调用 `triggerUpdate()`、未点击“立即手动更新”，也未同步发布版或发布资源。

**已完成：**
- #50 样例冻结：把会话37外露形态纳入新回归样例，包括裸 choices JSON、裸 JSON Patch、独立 `<JSONPatch>`、英文调试摘要，以及正常 `<choices>`、`<sp_choices>`、`<sp_status>`、`<UpdateVariable>`。
- #51 链路追踪：确认既有 `index.yaml` 已隐藏 `<choices>`、完整/未闭合 `<UpdateVariable>`、旧【推演选项】/【状态面板】和短标签，但未覆盖模型漏标签时的裸 JSON/JSON Patch/英文摘要；状态栏仍从原始 `<choices>` 读取，数据库自动填表不依赖可见层文本。
- #52 边界设计：结构化数据保留在原始消息和规定标签内，显示层只展示剧情正文、`<sp_choices>`/`<sp_status>` 渲染面板与必要玩家可见文本；裸 JSON、Patch、英文摘要都作为内部载荷兜底隐藏。
- #53 实现：`src/神秘复苏模拟器/index.yaml` 新增 4 条“仅格式显示”正则，分别隐藏裸 choices JSON、裸 JSON Patch、独立 `<JSONPatch>` 和英文调试摘要；`变量输出格式.yaml` 与 `必须输出推演选项.txt` 增加生成侧约束，禁止结构化载荷在规定标签外单独输出。
- #54 回归：新增 `scripts/verify-output-cleaning-regressions.mjs`，直接解析开发版 `index.yaml` 正则并按顺序应用，验证内部块在可见层消失，正常叙事保留，`sp_choices` / `sp_status` 仍被渲染，原始 `<choices>` 与 `<UpdateVariable>` 可解析。

**验证：**
- `node --check scripts/verify-output-cleaning-regressions.mjs`：通过。
- `node scripts/verify-output-cleaning-regressions.mjs`：通过，输出 `verify-output-cleaning-regressions: passed`。
- `node scripts/verify-table-change-adapter.mjs`：通过，输出 `verify-table-change-adapter: passed`。
- `git diff --check -- "src/神秘复苏模拟器/index.yaml" "src/神秘复苏模拟器/世界书/变量/变量输出格式.yaml" "src/神秘复苏模拟器/世界书/规则/必须输出推演选项.txt" scripts/verify-output-cleaning-regressions.mjs`：无空白错误；仅提示 `变量输出格式.yaml` 下次 Git touch 时 CRLF 会规范化为 LF。

**边界：** 本轮没有改 14 表模板、SQLite provider、provider guard 或发布版卡片。后续进入 P1/P2 前，仍应避免短时间内反复触发真实 AI/写库请求。

## 2026-06-14 CST（会话38）：按修复建议制定 v6.28 候选任务清单

**状态：** 用户要求“按照你的建议制作任务清单”。本轮只整理规划，不修改业务代码，不触发真页 AI，不调用 `triggerUpdate()`，不点击“立即手动更新”。

**已完成：**
- 按 `planning-with-files` 恢复 `task_plan.md`、`progress.md`、`findings.md` 当前上下文。
- `session-catchup.py` 仍报告旧 v6.21 残片，按当前计划规则忽略，不回退当前 v6.27 主线。
- 更新 `task_plan.md` 的 `当前任务清单`，新增 `下一阶段任务清单（v6.28 候选）`。

**新增任务范围：**
- P0：#50-#54，优先修复玩家可见的结构化内容外露，包括样例冻结、清洗链路追踪、结构化块边界设计、隐藏/过滤实现、输出清洗回归。
- P1：#55-#58，再优化 API 限流后的提示、冷却、手动重试/pending 队列和 API 预设/额度策略。
- P2：#59-#60，最后执行本地 gate 与真页低频验证。

**边界：** 新任务清单明确暂不动 14 表模板、SQLite provider 或 provider guard，除非后续验证出现新的数据库层证据。

## 2026-06-14 CST（会话37）：v6.27 低频真实对话观察完成，出现 API 限流冷却

**状态：** 用户要求进行一轮真实对话，测试是否还有其它问题。本轮按发布验证固定组合的可选低频真实观察执行：未调用 `triggerUpdate()`，未点击“立即手动更新”，只发送一条普通聊天消息，随后用 `SP·数据库 III -> 高级工具 -> 运行日志` 复核新增 ERROR/WARN。

**触发前基线：**
- 真页：`http://127.0.0.1:8000/`，CDP `9222`。
- 当前卡：`characterId=6`，avatar `神秘复苏模拟器发布版3.png`；卡内容含 `6.27` 与 bundle `a18bba270385d32e1b33f94e3a82532b24a11f89`。
- 运行态：`marker=mfrs-meta-table-no-error-6-27`，`fillMode=ai_crud_plan`，`AutoCardUpdaterAPI` 与 `MysteryDatabaseFrontend` 存在。
- 数据库基线：`MysteryDatabaseFrontend.exportCurrentData()` 返回 14 表，合计 19 行（含表头），估算实际数据行 5。
- 运行日志基线：`SP·数据库 III -> 高级工具 -> 运行日志` 显示 `当前显示 0 / 0 条`，导出/清空按钮禁用。

**低频交互：**
- 只发送一次普通消息：设定林澈，男，22 岁，普通人，老旧居民楼走廊开局，未驾驭厉鬼，携带手机和小金饰；行动为贴墙静止、压低呼吸、观察走廊尽头和门外声音来源。
- AI 回复自然结束，页面生成大昌市老旧居民楼剧情、A-D 推演选项、状态面板和 MVU 更新。
- 页面状态面板可见 `林澈`、`代号：敲门声`、老旧居民楼走廊、健康、死亡风险镜像 5、手机/小金饰等信息。

**数据复查：**
- 导出复查返回 14 表，合计 23 行（含表头），估算实际数据行 9；相比基线净增约 4 条实际数据行。
- 有数据表：`全局状态`、`玩家状态`、`灵异事件`、`厉鬼档案`、`线索`、`人物`、`地点`、`灵异物品`。
- `行动建议`、`事件纪要`、`检定建议`、`驾驭厉鬼`、`收录档案`、`收录规律` 本轮导出仍只有表头；说明本轮自动填表存在部分落盘，但未完整覆盖固定建议表。

**运行日志复核：**
- 权威入口 `SP·数据库 III -> 高级工具 -> 运行日志` 显示 `当前显示 3 / 3 条`。
- 新增日志：
  - `15:19:23.063 ERROR parseNonStreamResponse`：`API upstream rate limit error: {"error":{"message":"Too Many Requests"},"quota_error":false}`。
  - `15:19:23.082 WARN shujuku_v120`：`CRUD Plan 第 1 次尝试失败: API限流: API上游返回错误 HTTP 200 (OK) Too Many Requests`。
  - `15:19:23.105 WARN CRUD 填表`：`API 传输问题，停止本轮重试...CRUD 填表已冷却 15 秒，避免继续放大 API 请求`。
- 未出现 `_acu_sheet_meta`、`NativeTableServiceAdapter`、`API_MUTATION_FAILED`、`SQLite 引擎未初始化`、`ROW_NOT_FOUND`、`CHECK_IN_VIOLATION`、`LENGTH_VIOLATION` 或 `UNIQUE constraint failed`。

**结论：** v6.27 页面生成链路、状态面板和部分数据库落盘正常；`_acu_sheet_meta` 日志噪音没有复发，provider/SQLite/约束类错误也未复现。新增问题是上游 API `Too Many Requests`，导致 CRUD 填表在第一轮失败后进入 15 秒冷却，本轮自动填表没有完整落盘固定建议表。当前不建议立刻继续触发真实对话或手动更新放大限流。

## 2026-06-14 CST（会话36）：v6.27 后续维护 tag 与 publish-card jsdelivr 归一化完成

**状态：** 用户要求继续完成两个可选项：补发/确认指向当前 HEAD 的 tag，以及增强 `scripts/publish-card.mjs` 自动替换已有 jsdelivr 旧 hash/cache。本轮继续使用干净 worktree `.codex-v626-meta-noise`，未触发真页 AI、未调用 `triggerUpdate()`、未点击“立即手动更新”。

**tag 处理：**
- 先确认 v6.27 发布提交 `1960848b33460ec766be34539ed142389bd2fc98` 已有远端 tag `v0.0.156`。
- 发布后维护提交完成后，远端 `origin/main` 更新为 `a167c6c05c1d589034c7904d255f6dfbcb882e6b`。
- GitHub `bundle` workflow 对 `a167c6c` 运行成功，但未自动生成新 tag；已补发并确认 `v0.0.157 -> a167c6c05c1d589034c7904d255f6dfbcb882e6b`。

**脚本增强：**
- 修改 `scripts/publish-card.mjs`：
  - 文档说明从“只替换 localhost / 127.0.0.1”更新为“同时替换已有 jsdelivr 旧 hash/cache”。
  - `EXISTING_CDN_PATTERN` 现在支持项目仓库的 `testingcf.jsdelivr.net`、`cdn.jsdelivr.net` 和无子域 `jsdelivr.net` 旧 URL。
  - 项目 dist 入口 `index.js` / `index.html` 的旧 `?v=` 会统一归一化为当前 `CDN_CACHE_VERSION`。
  - `MagicalAstrogy/MagVarUpdate` bundle cache 规则也支持 `testingcf` / `cdn` / 无子域 jsdelivr。
  - 新增 `replaceAndCount()`，让 dry-run 输出的替换数量覆盖 hash/cache 归一化。
- 提交：`a167c6c05c1d589034c7904d255f6dfbcb882e6b fix: normalize jsdelivr urls when publishing cards`，已推送到 `origin/main`。

**验证：**
- `node --check scripts/publish-card.mjs`：通过。
- `pnpm run publish-card -- 神秘复苏模拟器发布版 --dry-run --no-bundle`：通过，未写文件；输出 `同步 index.yaml 并替换 13 处链接，保留版本 6.27`。
- `cdn.jsdelivr.net` 旧 hash/cache 内联样例：通过，能归一化为 `testingcf.jsdelivr.net` 当前 `CDN_REF` + `phase140-meta-table-no-error-6-27`。
- `git diff --check -- scripts/publish-card.mjs`：通过。
- 维护 worktree 最终 `HEAD == origin/main == a167c6c`，`git tag --points-at HEAD` 返回 `v0.0.157`。

**遇到的问题：**
- 第一次 `cdn.jsdelivr.net` 内联样例失败，原因是样例里复制的 jsdelivr 域名模式只覆盖 `testingcf` / 无子域，没有覆盖 `cdn.jsdelivr.net`；已回到脚本修复正则为 `(?:(?:testingcf|cdn)\\.)?jsdelivr.net` 后重测通过。

**结论：** 两个可选项完成。v6.27 发布资源本身仍以 `1960848` / `v0.0.156` 为发布提交口径；当前远端维护 HEAD 为 `a167c6c` / `v0.0.157`，发布脚本后续可自动处理已有 jsdelivr 旧 hash/cache。

## 2026-06-14 CST（会话35）：v6.27 `_acu_sheet_meta` 缺表 ERROR 日志噪音修复发布完成

**状态：** 用户要求完成可选项“处理 `_acu_sheet_meta` 缺表被记录为 ERROR 的日志噪音”。本轮使用干净 worktree `.codex-v626-meta-noise` 完成代码修复、发布链路和真页验证；未调用 `triggerUpdate()`，未点击“立即手动更新”，未发送会触发 AI 的聊天。

**代码修复：**
- 根因确认：`SyncBridge._loadAllMeta()` 会执行 `SELECT * FROM _acu_sheet_meta;`；缺表时 `_loadAllMeta()` catch 并 fallback 成功，但 `SqliteEngine.query()` 在抛出前已记录 `[SQLite引擎] query 执行失败`，导致 SP 运行日志出现预期 fallback 的 ERROR 噪音。
- 修改 `vendor/shujuku-sp-fork/index.js`：在 `_loadAllMeta()` 查询前使用 `engine.getAllTableNames()` 检查 `_acu_sheet_meta` 是否存在；缺表时直接返回空 `Map`，不再调用 `engine.query()`。
- 新增 `scripts/verify-syncbridge-meta-no-error.mjs`：覆盖缺 `_acu_sheet_meta` 时不调用 query 且返回空 Map，以及存在 `_acu_sheet_meta` 时仍读取元数据。

**本地 gate：**
- `node --check vendor\shujuku-sp-fork\index.js`：通过。
- `node --check scripts\verify-syncbridge-meta-no-error.mjs`：通过。
- `node scripts\verify-syncbridge-meta-no-error.mjs`：通过。
- `node scripts\verify-storage-provider-mode-guard.mjs`：通过。
- `node scripts\verify-table-change-adapter.mjs`：通过。
- `node scripts\verify-sql-debug-regressions.mjs`：通过。
- `git diff --check -- vendor/shujuku-sp-fork/index.js scripts/verify-syncbridge-meta-no-error.mjs`：通过。

**发布链路：**
- 修复提交：`4f6175a62342adc492f888f7f1472829e89967ab`，提交信息 `fix: silence missing sqlite meta table export noise`。
- loader/self-reclaim 回填提交：`f1f6e5b release: point v6.27 loaders to meta noise fix`。
- 远端 `[bot] bundle`：`a18bba270385d32e1b33f94e3a82532b24a11f89`。
- 发布卡提交：`1960848 release: publish v6.27 card`，已推送到 `origin/main`。
- cache/marker：`phase140-meta-table-no-error-6-27` / `mfrs-meta-table-no-error-6-27`。

**发布版产物与 CDN smoke：**
- `src/神秘复苏模拟器发布版/index.yaml`：版本为 `6.27`，6 处项目资源 URL 指向 `a18bba270385d32e1b33f94e3a82532b24a11f89`，cache 为 `phase140-meta-table-no-error-6-27`，不含 v6.26 `27ce3856...` / `phase139...` / localhost / 127.0.0.1。
- `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`：`tEXt:chara` 与 `tEXt:ccv3` 均包含 `6.27`、`a18bba270385d32e1b33f94e3a82532b24a11f89`、`phase140...`，且不含 v6.26 `27ce3856...` / `phase139...`。
- CDN smoke 通过项：`release_yaml`、`release_avatar_png`、`release_publish_png`、`status_html`、`variables`、`beautify`、`fixed_status`、`database_loader`、`database_frontend`、`vendor` 均返回 200。

**真页验证（不触发 AI）：**
- 导入并切换 v6.27 发布卡：`characterId=6`，avatar `神秘复苏模拟器发布版3.png`；卡内容含 `6.27`、`a18bba2...`、`phase140...`，不含 v6.26 残留。
- 刷新后重新选择 `characterId=6`，运行态 marker 为 `mfrs-meta-table-no-error-6-27`，`fillMode=ai_crud_plan`，`AutoCardUpdaterAPI` 与 `MysteryDatabaseFrontend` 存在。
- 通过 `SP·数据库 III -> 高级工具 -> 运行日志` 打开日志面板，基线为 `共 0 条`。
- 执行 `MysteryDatabaseFrontend.exportCurrentData()`：返回 14 表、0 行；运行日志仍为 `共 0 条`，无 `_acu_sheet_meta` / SQLite ERROR。
- 最小 CRUD 使用 `supernatural_events`，测试 token `CodexV627MetaSmoke_1781418875520`：
  - 预检 insert：`ok=true`，无 errors。
  - insertRow：`ok=true`，导出可见 1 行。
  - updateCell：`ok=true`，导出可见更新。
  - deleteRow：`ok=true`。
  - 独立导出复查：`CodexV627MetaSmoke_` 残留为 0；最终 14 表总数据行数为 5，均非本轮测试残留。
- CRUD 与导出后运行日志仍为 `共 0 条`，无 `_acu_sheet_meta`、`NativeTableServiceAdapter`、`API_MUTATION_FAILED`、`Too Many Requests` 或 SQLite 错误。

**结论：** v6.27 已成为当前有效发布版；本轮可选项完成。`_acu_sheet_meta` 缺表不再在 SP 运行日志中记录为 ERROR，发布验证固定组合第 1-3 步已完成。

## 2026-06-14 CST（会话34）：v6.26 发布后低频真实自动填表观察完成

**状态：** 用户明确要求执行可选项 `v6.26 发布后低频真实自动填表观察`。本轮只延续一次正常开局交互观察；未调用 `triggerUpdate()`，未点击“立即手动更新”，未做压力测试，未修改业务代码。

**恢复与基线：**
- 按 `planning-with-files` 重新读取 `task_plan.md`、`progress.md`、`findings.md`、`PROJECT_FLOW.md`，并运行 `session-catchup.py`。恢复报告仍是旧 v6.21 残片，按当前计划规则忽略。
- `git status --short --branch` 仍显示主工作区 `main...origin/main [behind 27]` 且有大量既有 dirty；本轮只更新 planning 文件，不处理无关 dirty。
- 真页仍为 `http://127.0.0.1:8000/` / CDP `9222`，当前发布卡为 `characterId=5`，avatar `神秘复苏模拟器发布版2.png`，chatId `神秘复苏模拟器发布版 - 2026-06-14@12h35m42s129ms`。
- 运行态确认 marker 为 `mfrs-provider-mode-guard-6-26`，`fillMode=ai_crud_plan`，`AutoCardUpdaterAPI` 与 `MysteryDatabaseFrontend` 存在。
- 触发前上一轮已冻结数据库基线：14 表完整表头，实际数据行合计 0；运行日志面板已在 `SP·数据库 III -> 高级工具 -> 运行日志` 清空作为本轮基线。

**低频交互：**
- 开局表单：姓名 `CodexV626Observer`，年龄/性别 `18/M`，身份 `普通人（卷入灵异事件）`，初始资源 `phone, one small gold item`，背景为低频 v6.26 发布后观察。
- 点击“进入神秘复苏世界”后只发送一次正常开局消息，随后等待 AI 回复完成。
- AI 正文生成成功，页面出现大昌市锦绣小区开局剧情、A-D 选项、ghost encounter/status/choices 状态面板；未继续发送第二条消息。

**数据复查：**
- `MysteryDatabaseFrontend.exportCurrentData()` 复查最终 14 表实际数据行合计 9。
- 非空表：
  - `行动建议` 4 行：A/B/C/D 四个行动选项已落盘。
  - `检定建议` 5 行：撤离、封堵、调查、手机交流、黄金小挂件试探等检定建议已落盘。
- 其余 12 表为 0 行；`CodexStage11` 测试残留为 0，`CodexV626Observer` 未作为数据库单元格残留出现（只在页面状态面板/正文中出现）。

**运行日志复核：**
- 按用户确认的路径打开 `SP·数据库 III -> 高级工具 -> 运行日志`，当前显示 11 / 11 条，全部为 `ERROR SQLite引擎`：
  - `[shujuku_v120] [SQLite引擎] query 执行失败: SELECT * FROM _acu_sheet_meta; | 错误: no such table: _acu_sheet_meta`
- 未出现 v6.25 #49 的 `NativeTableServiceAdapter.executeMutation` / “SQL 变更仅在 SQLite 模式下可用”。
- 未出现 `API_MUTATION_FAILED`、`SQLite 引擎未初始化`、`Too Many Requests`、`ROW_NOT_FOUND`、`CHECK_IN_VIOLATION`、`LENGTH_VIOLATION`、`UNIQUE constraint failed`。
- 只读代码确认 `_acu_sheet_meta` 是 `SyncBridge` 内部元数据表；`exportToTableData()` 会先 `_loadAllMeta()`，缺表时 catch 并回退到 fallback 数据结构，因此本轮导出成功但日志记录了 noisy ERROR。

**结论：** v6.26 发布后低频真实观察通过主目标：AI 正文、A-D 选项、状态面板生成成功，自动填表至少写入固定表 9 行，v6.25 #49 暴露的 SQLite UI / Native adapter provider mismatch 未复现。剩余观察项是 `_acu_sheet_meta` 缺表被记录为 ERROR 的日志噪音，可作为后续非阻断优化，不属于本轮发布阻断。

## 2026-06-14 CST（会话33）：发布验证固定组合写入 PROJECT_FLOW

**状态：** 用户要求完善 `planning-with-files` 记录的项目流程，把后续发布验证固定组合写进去。本轮只修改规划/流程文档，未修改业务代码，未运行构建，未触发真页 AI 或写库。

**已完成：**
- 更新 `PROJECT_FLOW.md`，新增 `发布验证固定组合` 小节。
- 固定后续发布验证默认顺序：
  1. CDN smoke。
  2. 不触发 AI 的最小 CRUD smoke。
  3. `SP·数据库 III -> 高级工具 -> 运行日志` 新增 ERROR/WARN 复核。
  4. 可选低频真实自动填表观察，仅在用户明确要求时执行。
- 更新 `发布验证最低线`，明确默认执行固定组合第 1-3 步，第 4 步只在用户要求真实自动填表观察时执行。

**边界：** 未调用 `triggerUpdate()`，未点击“立即手动更新”，未发送聊天消息，未触发真实 AI。

## 2026-06-14 CST（会话32）：阶段11完成 — v6.26 provider guard 发布收口与真页 smoke 通过

**状态：** 用户要求完成阶段11进入发布收口阶段。本轮在干净 worktree `.codex-v625-stage11` 继续执行；未调用 `triggerUpdate()`，未点击“立即手动更新”，未发送聊天消息，未触发真实 AI，只做发布链路、CDN smoke 和不触发 AI 的最小 CRUD 验证。主工作区既有 dirty 未回退、未混入发布。

**发布链路：**
- 基线 worktree：`.codex-v625-stage11`，基于 v6.25 发布提交 `72b5e0b` 后续链路继续。
- provider guard 修复提交：`474c1230dc90142b92161c76087283945cefc560`，提交信息 `fix: guard storage provider mode mismatch`。
- loader/self-reclaim 回填提交：`61ed58593b9e15e7b19f6c65561a539ddeccd1c9`，提交信息 `release: point v6.26 loaders to provider guard`。
- 远端 `[bot] bundle`：`27ce3856ba9e56f080225ddc1310a5c5f661d610`。
- 发布卡提交：`7a5e58b125e0e27bfaf603848747dea95fd5b8a6`，提交信息 `release: publish v6.26 card`，已推送到 `origin/main`。
- cache/marker：`phase139-provider-mode-guard-6-26` / `mfrs-provider-mode-guard-6-26`。

**发布版产物校验：**
- `src/神秘复苏模拟器发布版/index.yaml`：版本为 `6.26`，6 处项目资源 URL 指向 `27ce3856ba9e56f080225ddc1310a5c5f661d610`，cache 为 `phase139-provider-mode-guard-6-26`，不含 v6.25 `e2561bc...` / `phase138...` / localhost / 127.0.0.1。
- `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`：`tEXt:chara` 与 `tEXt:ccv3` 均包含 `6.26`、`27ce3856...`、`phase139...`，且不含 v6.25 `e2561bc...` / `phase138...`。
- `git diff --check` 针对发布脚本、发布版 YAML 和发布版 PNG 通过。

**CDN smoke：**
- 通过项：`release_yaml`、`release_avatar_png`、`release_publish_png`、`status_html`、`variables`、`beautify`、`fixed_status`、`database_loader`、`database_frontend`、`vendor` 均返回 200。
- `database_loader` 与 `database_frontend` 均包含 vendor ref `474c1230dc90142b92161c76087283945cefc560`、cache `phase139-provider-mode-guard-6-26`、marker `mfrs-provider-mode-guard-6-26`，且不含 v6.25 vendor `599e2962...`、`phase138...`、`mfrs-duplicate-insert-vendor-ref-6-25`。
- vendor `@474c1230.../vendor/shujuku-sp-fork/index.js` 返回 200，包含 `_ensureProviderInitializedForWrite`、`currentProvider.mode`、`reloadStorageProvider`。

**真页 smoke（不触发 AI）：**
- 酒馆真页：`http://127.0.0.1:8000/`，CDP `9222`。
- 导入 v6.26 发布 PNG 后新增发布卡：`characterId=5`，avatar `神秘复苏模拟器发布版2.png`，chatId `神秘复苏模拟器发布版 - 2026-06-14@12h17m03s605ms`。
- 当前卡内容含 `6.26`、`27ce3856ba9e56f080225ddc1310a5c5f661d610`、`phase139-provider-mode-guard-6-26`，不含 v6.25 残留。
- 刷新后需重新选择 v6.26 角色；最终运行态确认 marker 为 `mfrs-provider-mode-guard-6-26`，`AutoCardUpdaterAPI` 与 `MysteryDatabaseFrontend` 存在，`fillMode=ai_crud_plan`，`insertRow` 源码包含 `_ensureProviderInitializedForWrite`。
- 最小 CRUD 使用 `supernatural_events`，测试 token `CodexStage11Smoke_1781411029683`：
  - 预检 insert：`ok=true`，无 errors。
  - insertRow：`ok=true`，导出可见，`处理状态=对抗中`。
  - updateCell：`ok=true`，`死亡人数=1`，`处理状态=失控扩散`，摘要更新成功。
  - deleteRow：`ok=true`，rowIndex=1。
  - 独立导出复查：`CodexStage11Smoke_` 残留为 0；当前 14 表总数据行数为 5，均非本轮测试残留。

**遇到的问题与处理：**
- PNG 元数据校验第一次用 PowerShell here-string 直接传中文路径到 Node，路径变成 `??????????`。改用 Node 内部 Unicode escape 构造路径后通过。
- Node `fetch` 版 CDN smoke 超时无输出。改用 PowerShell `Invoke-WebRequest` 分项检查，定位更清晰。
- PowerShell 数组里写 `$rel + '.png'` 被拆成多个路径实参，导致一次 `release_publish_png` 假 404。改为 `($rel + '.png')` 后完整 CDN smoke 通过。
- jsDelivr 对新 PNG 曾出现边缘 stale 404；对该路径执行 purge 后，带/不带 cache 连续复测均为 200。

**结论：** 阶段11发布收口完成。v6.26 已成为当前有效发布版，provider guard 已经进入发布 CDN 链路，并通过真页不触发 AI 的最小 CRUD smoke；#49 暴露的 SQLite UI / Native adapter 错配已有发布态验证覆盖。

## 2026-06-14 CST（会话31）：阶段10 storageMode/provider mismatch 本地修复完成

**状态：** 用户要求继续完成阶段10。本轮没有触发真实 AI、没有调用 `triggerUpdate()`、没有点击“立即手动更新”、没有输出 API key/API URL/Bearer token；只做离线代码追踪、本地修复和非 AI gate。

**根因定位：**
- #49 的报错链路为：`insertRow` 先按 `isSqliteMode()` 进入 SQLite SQL 分支，但随后 `getStorageProvider().executeMutation(...)` 返回的是旧 `NativeTableServiceAdapter` 实例。
- `isSqliteMode()` 读取 `settings_ACU.storageMode`；`getStorageProvider()` 只在 `currentProvider` 为空时按当前设置创建 provider，之后不校验 `currentProvider.mode` 是否仍等于设置值。
- 因此在设置加载、早期懒初始化、切卡/刷新或 fallback 之后，可能出现 `settings_ACU.storageMode === 'sqlite'` 但 `currentProvider.mode === 'native'` 的错配；UI/设置显示 SQLite，真实写入仍打到 Native adapter。

**代码修复：**
- 修改 `vendor/shujuku-sp-fork/index.js`：
  - `getStorageProvider()` 现在每次读取当前 `storageMode`，若发现 `currentProvider.mode !== settings mode`，会记录 WARN、销毁旧 provider，并按当前设置重建。
  - `_ensureProviderInitializedForWrite()` 现在以 `getCurrentStorageMode()` 为准；SQLite 写入前同时检查 provider mode、`_initialized` 和 `engine.isReady`，必要时同步 `reloadStorageProvider()`。
  - reload 后若仍不是 ready 的 SQLite provider，会抛出明确错误，避免 SQLite 分支继续调用 `NativeTableServiceAdapter.executeMutation`。
- 新增 `scripts/verify-storage-provider-mode-guard.mjs`：
  - 抽取 vendor 的 storage strategy 片段到 VM 中，用 stub provider 复现“先 native 懒初始化，随后设置变为 sqlite”的错配。
  - 断言 `getStorageProvider()` 会按设置重建 sqlite provider，写前 guard 会完成 SQLite 初始化，切回 native 也会销毁旧 sqlite provider。

**验证：**
- `node --check vendor\shujuku-sp-fork\index.js`：通过。
- `node --check scripts\verify-storage-provider-mode-guard.mjs`：通过。
- `node scripts\verify-storage-provider-mode-guard.mjs`：通过，输出 `verify-storage-provider-mode-guard: passed`。
- `node scripts\verify-table-change-adapter.mjs`：通过，输出 `verify-table-change-adapter: passed`。
- `node scripts\verify-sql-debug-regressions.mjs`：通过；仅有 Node SQLite experimental warning，不阻断。
- `git diff --check -- vendor/shujuku-sp-fork/index.js scripts/verify-storage-provider-mode-guard.mjs scripts/verify-table-change-adapter.mjs`：通过。

**遇到的问题：**
- 新增回归脚本第一次运行失败：VM stub 的 `getCurrentStorageMode()` 依赖 `this.settings_ACU`，而 vendor 片段以普通函数调用，`this` 为 `undefined`。已改为闭包读取 `context.settings_ACU`，重跑通过。
- `git diff --stat` 仍显示 planning、adapter、vendor 等大量既有 dirty；本轮只新增 provider guard 和 `verify-storage-provider-mode-guard.mjs`，未回退无关改动。

**下一步：** 阶段10本地修复已完成，但尚未发布到 GitHub/CDN，也未在真页加载新版 vendor 做发布态 smoke。如继续推进，应新增发布收口阶段：精确提交 vendor + 新回归脚本，推送生成资源 ref，回填 loader/self-reclaim hash/cache/marker，发布版同步，并做 CDN smoke + 不触发 AI 的真页最小 CRUD 验证。

## 2026-06-14 CST（会话30）：阶段9可选任务 #49 发布后低频真实自动填表观察完成

**状态：** 用户明确要求执行阶段9可选任务 #49。本轮只做一次正常低频开局交互观察；未调用 `triggerUpdate()`，未点击“立即手动更新”，未输出 API key/API URL/Bearer token。观察完成后因出现新错误与 API 限流，按计划停止，不继续重复触发。

**恢复与选卡：**
- 恢复时当前页面不是 v6.25 发布态，而是开发版/旧运行态：`characterId=2`，marker `mfrs-applied-mutation-verify-6-20`。
- 当前酒馆角色列表里没有上一轮记录的 `chid=8` v6.25 发布卡；已从 `.codex-v621-stage9/src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png` 导入 v6.25 发布 PNG。
- 新导入发布卡为 `characterId=4` / avatar `神秘复苏模拟器发布版1.png`；角色卡内容含 `6.25`、bundle `e2561bc642c7864139537c3ce737f8ac96166157`、cache `phase138-duplicate-insert-vendor-ref-6-25`。
- 切换并刷新后，运行态确认：marker `mfrs-duplicate-insert-vendor-ref-6-25`，`fillMode=ai_crud_plan`，`AutoCardUpdaterAPI` 与 `MysteryDatabaseFrontend` 均存在。

**基线：**
- `MysteryDatabaseFrontend.exportCurrentData()` 返回 14 张表完整表头；实际数据行合计 0。
- SP 数据库面板显示：当前聊天 `神秘复苏模拟器发布版 - 2026-06-14@11h06m12s845ms`，数据库状态为已加载 `14个表格, 0条记录`。
- 自动更新开启，SQLite 模式单选框显示为已勾选；`AutoCardUpdaterAPI.getFillMode()` 为 `ai_crud_plan`。

**低频交互：**
- 填写开局表单：姓名 `CodexObserver`，年龄/性别 `18/M`，身份 `普通人（卷入灵异事件）`，初始资源 `phone, one small gold item`，背景 `local resident with no prior supernatural knowledge, caught in a low-risk observation test`。
- 点击“进入神秘复苏世界”后，页面先把开局设定写入发送框；随后点击酒馆发送按钮完成同一次正常开局交互。
- AI 正文生成成功，页面出现新剧情、A-D 选项和状态摘要；最后一条 AI 回复含 `CodexObserver`、`金苑敲门声`、`choices` 与 `status`。

**结果：**
- 自动填表未落盘：复查 14 张表仍只有表头，实际数据行合计 0；数据库面板所有表“上次更新”为 `未初始`。
- SP 运行日志共 15 条，关键链路：
  - `11:15:00`：CRUD Plan 第 1 次尝试失败，`global_state/player_state` 预检 `ROW_NOT_FOUND`，`supernatural_events/ghost_archives` `API_MUTATION_FAILED`。
  - `11:15:14`：第 2 次尝试失败，4/4 insertRow 均 `API_MUTATION_FAILED`。
  - `11:15:29`：第 3 次尝试失败，仍为 `ROW_NOT_FOUND` + `API_MUTATION_FAILED`。
  - 多条 ERROR 根因：`NativeTableServiceAdapter.executeMutation` 抛“SQL 变更仅在 SQLite 模式下可用。请在设置中切换到 SQLite 模式。”，调用栈来自 v6.25 vendor `599e2962.../vendor/shujuku-sp-fork/index.js?...phase138...`。
  - `11:15:32`：`parseNonStreamResponse` 报上游 `Too Many Requests`；`CRUD 填表` 判定 API 传输问题并冷却 15 秒，停止本轮重试。

**结论：**
- v6.25 发布资源链路与运行 marker 正确，真实正文生成链路可用。
- #49 没有通过自动填表验收；新分流问题是 storageMode/provider mismatch：UI 显示 SQLite 模式时，真实 CRUD 写入仍进入 Native adapter。
- 下一步应新增阶段10离线/只读复盘 storage provider 初始化和模式切换状态，不要在 API 冷却窗口内重复真实 AI/写库触发。

## 2026-06-14 CST（会话29）：planning-with-files 记录整理与常驻流程固化

**状态：** 用户要求使用 `planning-with-files` 记录当前进度，并整理规划记录，保留版本变更、项目运行基本流程、要提交和不需要提交的文件边界，同时确保新开对话可以继续任务。本轮只整理规划/流程文件，未执行构建、发布、真页写库或 AI 触发。

**本轮整理：**
- 已按 `planning-with-files-zh` 恢复流程读取 `task_plan.md`、`progress.md`、`findings.md`、`PROJECT_FLOW.md`，并运行 `session-catchup.py`。
- `session-catchup.py` 仍报告旧 v6.21 中段残片；按当前计划规则判定已被 v6.25 主线覆盖，未把旧残片回滚进当前状态。
- `task_plan.md` 已将 `当前状态` 收敛为 v6.25 口径：阶段9 #37-48 已完成，release `72b5e0b`、bundle `e2561bc`、vendor `599e2962`，当前无发布资源阻断项。
- `task_plan.md` 保留 `版本变更索引`，并明确本轮规划整理只应提交 `task_plan.md`、`progress.md`、`findings.md`、`PROJECT_FLOW.md`。
- `PROJECT_FLOW.md` 已作为常驻文件补充新对话恢复流程、当前发布口径快照、CDN/真页验证最低线和提交边界速记。
- `findings.md` 顶部补充 planning 维护约定，避免后续新对话把旧流水或旧 catchup 误当成当前任务。

**当前任务清单快照：**
- 已完成：阶段9 v6.25 发布收口与真页 smoke；本轮 planning 记录整理与常驻流程固化。
- 未完成/待用户确认：阶段9 #49 发布后低频真实自动填表观察；可选补发指向 `HEAD` 的 tag；可选增强 `scripts/publish-card.mjs` 自动替换旧 jsdelivr hash/cache。
- 当前不要做：不要主动调用 `triggerUpdate()`，不要做 AI/写库压力测试，不要回退无关 dirty，不要使用 `git add .`。

**当前工作区提醒：**
- `git status --short --branch` 显示主工作区 `main...origin/main [behind 23]`，并有既有 dirty 与临时文件。
- 本轮只处理 planning 文件；业务源码、dist、vendor、日志、截图、归档和 `.codex-*` worktree 保持原状。

## 2026-06-13 CST（会话28）：阶段9完成 — v6.25 发布收口与真页 smoke 通过

**状态：** 用户要求继续完成阶段9。已在干净 worktree `.codex-v621-stage9` 完成阶段9任务 #37-48；未调用 `triggerUpdate()`，未做真实 AI/写库压力测试，未输出 API key/API URL/Bearer token。任务 #49 保留为用户明确确认后的低频真实自动填表观察。

**发布链路：**
- 基线：基于 `origin/main=ffe2b79` 创建/复用干净 worktree，主工作区既有 dirty 未混入发布。
- 阶段8修复移植后先进入 v6.22/v6.23 口径；v6.23 CDN 与真页 smoke 暴露 SQLite 空表导出只剩 `row_id` 的新问题。
- v6.23 修复 SQLite 空表导出表头：`16f3f54 fix: preserve sqlite export headers`；loader/self-reclaim 回填 `91302b6`，bot bundle `3c003a6`，发布提交 `61e9d72`。
- v6.23 真页 CRUD smoke 又发现重复 `insertRow` 提升 `updateCell` 时把 unique key 也放入 update set，导致同一自然键被再次写回。
- 修复 adapter：`3205b68 fix: skip unique keys in duplicate insert updates`，bot bundle 真实完整 hash 为 `599e2962beaa95354ab7beb41d45228251e9f0be`。
- v6.24 曾生成 `da5a25b` / `5513ab7`，但 CDN smoke 发现 loader/self-reclaim 使用了错误完整 hash `599e296bc946f83ba9225cd49f88b1851f870e01`，vendor URL 返回 404。为避开已发布 cache，未复用 v6.24，直接提升 v6.25。
- v6.25 最终链路：vendor/resource `599e2962beaa95354ab7beb41d45228251e9f0be` -> loader/self-reclaim 修正 `0c5de37` -> bot bundle `e2561bc642c7864139537c3ce737f8ac96166157` -> release `72b5e0b9d94b4a38281fca44b433db45cd7a96a9`。
- v6.25 cache/marker：`phase138-duplicate-insert-vendor-ref-6-25` / `mfrs-duplicate-insert-vendor-ref-6-25`。

**本地 gate 与构建：**
- `git diff --check` 针对 adapter、loader/self-reclaim、发布脚本/YAML 均通过。
- `node scripts\verify-table-change-adapter.mjs` 通过。
- `node scripts\verify-sql-debug-regressions.mjs` 通过；仅有 Node SQLite experimental warning，不阻断。
- `node --check dist\神秘复苏模拟器\脚本\数据库\index.js` 与 `node --check dist\神秘复苏模拟器\脚本\数据库前端\index.js` 通过。
- `..\node_modules\.bin\webpack.cmd --mode production` 成功；数据库前端 `249 KiB` 体积 warning 为既有 warning，不阻断。

**发布版产物校验：**
- `scripts/publish-card.mjs` 更新到 `CDN_REF=e2561bc642c7864139537c3ce737f8ac96166157`、`CDN_CACHE_VERSION=phase138-duplicate-insert-vendor-ref-6-25`、`releaseVersion=6.25`。
- `pnpm run publish-card -- 神秘复苏模拟器发布版` 成功，发布版 YAML 替换 6 处项目资源链接。
- 发布版 PNG `tEXt:chara` 与 `tEXt:ccv3` 均包含 `6.25`、`e2561bc...`、`phase138...`；均不含 v6.24 `da5a25b...`、`phase137...` 或错误 vendor full hash `599e296bc946...`。

**CDN smoke：**
- `release_yaml`、`release_png`、`status_html`、`variables`、`beautify`、`fixed_status`、`database_loader`、`database_frontend`、`vendor` 全部 `status=200`。
- `database_loader` / `database_frontend` 均包含真实 vendor ref `599e2962beaa95354ab7beb41d45228251e9f0be`、`phase138...`、`mfrs-duplicate-insert-vendor-ref-6-25`，且不含 v6.24 坏 hash/cache/marker。
- `vendor @599e2962...` 返回 200，包含 `_exportSheet` 与 `shouldUseDdlColumns`。

**真页 smoke：**
- Chrome CDP `9222`，真页 `http://127.0.0.1:8000/`，当前 tab `t2`。
- 导入 v6.25 PNG 后新增发布版卡 `chid=8`，avatar `神秘复苏模拟器发布版5.png`；卡内容含 `6.25`、`e2561bc...`、`phase138...`。
- 选中 `chid=8` 后运行态确认：marker `mfrs-duplicate-insert-vendor-ref-6-25`，`AutoCardUpdaterAPI` 存在，`MysteryDatabaseFrontend` 存在，`fillMode=ai_crud_plan`，`insertRow` 含 `_ensureProviderInitializedForWrite`。
- SQLite 空表导出复查：14 表均完整表头；`灵异事件` 表头 12 列：`row_id/事件代号/危害等级/发生地点/鬼域状态/已知杀人规律/猜测杀人规律/错误推断/死亡人数/扩散趋势/处理状态/可见摘要`。
- 最小可逆 CRUD：
  - 预清理 `CodexStage9Smoke_` 残留为 0。
  - 插入 `supernatural_events` 测试事件 `CodexStage9Smoke_V625_step` 返回 `ok=true`；导出可见，`死亡人数=0`，`处理中 -> 对抗中`。
  - 重复 `insertRow` 预检返回 `action=updateCell`、`rowIndex=1`，影响列不含唯一键 `事件代号`。
  - 重复写入后导出复查：`死亡人数=1`、`处理状态=失控扩散`；补充一个仅含 `event_code + public_summary` 的重复 insert 返回 `ok=true`，摘要更新成功，证明 unique key 提升 update 路径可用。
  - 删除测试行返回 `ok=true`；最终 `CodexStage9Smoke_` 残留为 0。

**注意事项：**
- `session-catchup.py` 仍只报告旧 v6.21 残片，已按计划文件规则忽略。
- agent-browser 长 mutation eval 仍可能在返回阶段出现 CDP `os error 10060`；本轮均用短 mutation + 独立只读导出复查判断实际状态。
- PowerShell/agent-browser stdin 中不要直接用中文列名做索引；本轮最终 CRUD 复查改用物理列名或固定列序，避免 `???` 编码噪声。

## 2026-06-13 CST（会话27）：阶段9任务清单制定 — 发布收口待执行

**状态：** 用户询问下一阶段需要做什么，并要求制作任务清单、列出当前任务。已更新 `task_plan.md`，新增阶段9任务 #37-49。未修改业务源码，未运行构建或真页操作。

**阶段9定位：**
- 阶段9不是继续修阶段8代码，而是发布收口。
- 核心目标是在干净 worktree 基于 `origin/main=ffe2b79` 精确移植阶段8修复，避免当前主工作区 `main...origin/main [behind 6]` 和既有无关 dirty 污染发布。
- 发布链路要覆盖：移植修复 -> 静态 gate -> production build -> 资源提交/远端 bundle -> loader/self-reclaim 回填 -> 发布版同步 -> PNG/YAML 校验 -> CDN smoke -> 真页 smoke。
- 默认仍不调用 `triggerUpdate()`，不进行 AI/写库压力测试；低频真实自动填表观察被放到任务 #49，需在发布 smoke 后按边界执行。

**新增任务：**
- #37 冻结发布基线。
- #38 创建或复用干净发布 worktree。
- #39 精确移植阶段8修复。
- #40 更新发布口径。
- #41 执行干净 worktree 静态 gate。
- #42 执行 production build。
- #43 提交并推送资源修复。
- #44 回填 loader 与 self-reclaim。
- #45 同步发布版角色卡。
- #46 校验发布版产物。
- #47 CDN smoke。
- #48 真页 smoke。
- #49 发布后低频观察分流。

**当前工作区提醒：**
- `git status --short --branch` 仍显示主工作区 `main...origin/main [behind 6]`，并有既有 dirty。
- 阶段8相关 diff stat 当前集中在：`vendor/shujuku-sp-fork/index.js`、`src/神秘复苏模拟器/脚本/数据库前端/table-change-adapter.ts`、`dist/神秘复苏模拟器/脚本/数据库前端/index.js`、`scripts/verify-table-change-adapter.mjs`、planning 文件。
- `session-catchup.py` 仍报告旧 v6.21 中段残片；按 `task_plan.md` 规则，此上下文已被后续主线覆盖，不作为阶段9依据。

## 2026-06-13 CST（会话26）：阶段8完成 — CRUD 写入/约束失败修复与验证收口

**状态：** 用户要求继续完成阶段8。已完成阶段8任务 #27-36；未触发真实 AI，未调用 `triggerUpdate()`，未输出 API key/API URL/Bearer token。阶段8下一步不再是继续本地修复，而是如用户继续推进，应新增阶段9发布收口。

**根因与修复：**
- `executeCrudPlanFill_ACU` 重试时原本只把 `currentJsonTableData_ACU` 回拨到批次基线，没有同步回拨 SQLite 内存库。失败尝试中已写入 SQLite、但未成功持久化的行会在下一次尝试变成不可见的 `UNIQUE constraint failed`。
- `vendor/shujuku-sp-fork/index.js` 新增 `SqlTableService.resetFromTableData(data)`，并新增 `resetCrudPlanRuntimeStateToBatchSnapshot_ACU(progressContext, reason)`；CRUD/SQL 批次基线回拨现在同时重置 JSON 视图和 SQLite runtime。`exportTableAsJson()` 在 sqlite 模式下优先读取 provider 当前实态，失败才 fallback JSON。
- `table-change-adapter.ts` 新增 DDL `UNIQUE` 元数据解析；重复 `insertRow` 若命中已有 primary key 或 unique key，会提升为 `updateCell`，避免固定行和 `supernatural_events.event_code` 重复 insert 撞唯一约束。
- `table-change-adapter.ts` 对 `supernatural_events.handling_status` 增加枚举近义词归一化：如 `爆发中 -> 失控扩散`、`处理中 -> 对抗中`、`已解决 -> 结束`、`已控制 -> 已压制`、`已收容 -> 已关押`。
- `scripts/verify-table-change-adapter.mjs` 已扩展覆盖：固定行重复 insert 提升 update、空表仍真实 insert、`supernatural_events.event_code` unique 重复提升 update、`handling_status` 近义词归一化。

**本地 gate：**
- `node --check vendor\shujuku-sp-fork\index.js` 通过。
- `node --check scripts\verify-table-change-adapter.mjs` 通过。
- `node scripts\verify-table-change-adapter.mjs` 通过。
- `node scripts\verify-sql-debug-regressions.mjs` 通过；仅有 Node SQLite experimental warning，不阻断。
- `git diff --check -- vendor/shujuku-sp-fork/index.js src/神秘复苏模拟器/脚本/数据库前端/table-change-adapter.ts dist/神秘复苏模拟器/脚本/数据库前端/index.js scripts/verify-table-change-adapter.mjs task_plan.md progress.md findings.md PROJECT_FLOW.md` 通过。
- `pnpm build` 成功；仍有数据库前端 `index.js 249 KiB` 超过 webpack 推荐大小的既有 warning，不阻断。

**真页最小验证（任务 #36）：**
- 真页仍为 `http://127.0.0.1:8000/` / `t2`，运行 marker `mfrs-naked-instance-fallback-6-21`，`fillMode=ai_crud_plan`。
- 为避免当前主工作区落后远端导致本地 dist self-reclaim 指向旧资源，本轮没有加载本地数据库前端 dist；改为把本地 `table-change-adapter.ts` 单独编译后注入 `window.__codexStage8Adapter`，再使用现有页面 `AutoCardUpdaterAPI` 做最小可逆 CRUD。
- 插入测试事件 `CodexStage8Event_*` 成功，导出可见，rowIndex=2。
- 对同一 `event_code` 再执行 `insertRow` 计划时，本地 adapter 的只读 preview 返回 `action=updateCell`、`rowIndex=2`，证明 unique 重复提升逻辑在真页数据+模板下生效。
- 第二步 mutation 的 CDP 返回阶段出现 `os error 10060`，但独立只读复查确认实际已更新：测试行 `death_count=1`，`处理状态=对抗中`，说明 `处理中` 已归一化并写入。
- 清理后最终只读复查：`residualCodex=0`。当前真实数据已有非测试行：全局状态/玩家状态/行动建议/检定建议/灵异事件等表出现阶段7后真实内容；本轮未删除这些非测试行。

**验证中遇到的问题与处理：**
- `session-catchup.py` 仍报告旧 v6.21 中段残片；按 `task_plan.md` 规则判定为已被主线覆盖，未回退。
- PowerShell 管道向 Node 传中文路径时曾把路径转成 `????`；已改用 Unicode 转义路径。
- agent-browser eval 中直接写中文字符串会被 stdin 编码转成 `???`，导致本地预检误报 `CHECK_IN_VIOLATION`；后续 eval 均改用 Unicode 转义。
- 长 mutation eval 在返回阶段可能 CDP 超时；按项目既有经验改为“短 mutation + 独立只读复查 + 清理”判断实际状态。

**修改文件：**
- `src/神秘复苏模拟器/脚本/数据库前端/table-change-adapter.ts`
- `dist/神秘复苏模拟器/脚本/数据库前端/index.js`
- `vendor/shujuku-sp-fork/index.js`
- `scripts/verify-table-change-adapter.mjs`
- `task_plan.md`
- `progress.md`

**下一步建议：** 如继续推进，新增阶段9发布收口。当前主工作区仍 `main...origin/main [behind 6]` 且有既有无关 dirty；发布应继续精确 staging，必要时用临时干净 worktree。

## 2026-06-13 CST（会话25）：阶段8执行中 — 任务 #27 证据冻结完成

**状态：** 用户要求继续完成阶段8。已开始执行阶段8，当前完成任务 #27，尚未触发真实 AI、未调用 `triggerUpdate()`。

**任务 #27 证据冻结：**
- 真页标签：`t2`，地址 `http://127.0.0.1:8000/`。
- 运行 marker：`mfrs-naked-instance-fallback-6-21`。
- 当前页面已存在阶段7低频复测后的第二轮 A-D 选项，例如 A「利用手机屏幕反射或侧头余光，寻找身后声音的源头」。
- SP 运行日志仍显示 `共 29 条`，关键链路：
  - `21:38:08` 第 1 次 CRUD Plan 尝试失败：`global_state` / `player_state` / `supernatural_events` insertRow 失败；`supernatural_events.event_code` 触发 `UNIQUE constraint failed`。
  - `21:38:25` 第 2 次尝试失败：固定行表 match 未命中，`supernatural_events.handling_status` 触发 `CHECK_IN_VIOLATION`。
  - `21:38:42` 第 3 次尝试失败：`global_state.row_id` / `player_state.row_id` 触发 `UNIQUE constraint failed`，`handling_status` 仍有枚举约束问题。
  - `21:38:44` 之后再次触发 `Too Many Requests`，CRUD 填表停止本轮重试并冷却 30 秒。
- `MysteryDatabaseFrontend.exportCurrentData()` 可见导出仍为 14 表合计 0 行：
  `global_state/player_state/supernatural_events/ghost_archives/clues/characters/locations/supernatural_items/action_suggestions/chronicle/check_suggestions/controlled_ghosts/collected_archives/collected_rules = 0`。

**下一步：** 执行任务 #28，追踪真实运行链路，先读现行 vendor 与 `table-change-adapter` 源码，不继续点击页面或触发写库。

## 2026-06-13 CST（会话24）：阶段8任务清单细化

**状态：** 用户要求继续制作阶段8任务清单，并列出当前所有任务。已根据阶段7结论更新 `task_plan.md`。

**本次 planning 更新：**
- 在 `当前状态` 中新增阶段8计划状态：阶段8当前未开始执行，目标是离线/本地复盘并修复 CRUD 写入与约束错误，不继续触发真实 AI 压测。
- 将阶段8从原 #27-32 粗清单细化为 #27-36：
  - #27 冻结阶段7证据。
  - #28 追踪真实运行链路。
  - #29 构造最小离线复现。
  - #30 修复固定行表写入分流。
  - #31 修复唯一键重复处理。
  - #32 修复枚举约束归一化。
  - #33 解释并修复 sandbox/持久化状态一致性。
  - #34 补充回归脚本。
  - #35 执行本地 gate。
  - #36 真页最小验证与记录。

**当前执行边界：**
- 本轮只整理任务清单，没有修改业务源码。
- 不调用 `triggerUpdate()`，不继续 AI/写库压力测试，不输出 API key/API URL/Bearer token。
- 旧 `session-catchup.py` 报告的 v6.21 中段残片仍按 `task_plan.md` 规则处理：该上下文已被后续主线覆盖，当前以阶段7完成和阶段8清单为准。

## 2026-06-13 CST（会话23）：阶段7完成 — API 限流复核后分流到 CRUD 写入/约束修复

**状态：** 用户要求继续完成阶段7。已从会话22暂停点恢复，在 `t2` 真页完成任务 #22-26。未调用 `triggerUpdate()`；只做了一次正常剧情选项低频复测（点击 A 选项并用酒馆发送按钮发送）。

**任务 #22：只读 API 预设与填表参数检查**
- 当前填表模式：`ai_crud_plan`。
- 主 API：`custom`，当前模型 `gemini-3-flash-preview-search`，流式开启；只确认 API URL/API key 存在性，不输出敏感值。
- SP API 预设共 6 个：`GG`、`lucky API`、`跑路`、`魔女岛`、`桃桃`、`小明`，均为 custom 模式且存在 URL/key；未输出 URL/key。
- 表格/剧情专用 API 预设当前为空字符串，即没有显式绑定专用预设。
- 自动更新参数：`autoUpdateThreshold=3`，`autoUpdateFrequency=1`，`updateBatchSize=3`，`autoUpdateTokenThreshold=500`。

**任务 #23：限流保护行为复核**
- 运行日志与源码一致确认：`Too Many Requests` / `HTTP 429` / `rate limit` 会被归类为 `API限流`。
- 命中 API 传输问题后，CRUD 填表会停止本轮重试并注册冷却，避免继续放大请求。
- 冷却参数来自 `vendor/shujuku-sp-fork/index.js`：基础冷却 `15000ms`，最大 `120000ms`；连续触发会指数退避，本轮复测后冷却显示为 `30 秒`。

**任务 #24：低频复测**
- 复测策略：等待旧 15 秒冷却已结束后，仅执行一次正常剧情交互；选择 A「保持沉默，死死盯住后门，观察影子是否会移动」，并点击酒馆发送按钮。
- AI 回复成功，页面出现新一轮 A-D 推演选项，说明主对话生成链路可用。
- 复测前后使用 `MysteryDatabaseFrontend.exportCurrentData()` / `AutoCardUpdaterAPI.exportTableAsJson()` 检查，14 表可见导出仍合计 0 行，未形成可见持久化落盘。

**任务 #25：是否调整运行参数**
- 本轮不调整 API 预设、批次或冷却配置。
- 原因：复测不是单纯 API 可用性问题；运行日志出现 `API_MUTATION_FAILED`、`UNIQUE constraint failed`、`CHECK_IN_VIOLATION`，降低批次或切换 API 不能直接修复写入/约束问题，继续触发会放大限流。

**任务 #26：分流结论**
- 阶段7完成，结论为：API 限流保护本身生效，但低频复测暴露新的 CRUD 写入/约束问题。
- 新增日志链路：
  - `21:38:08`：第 1 次 CRUD Plan 尝试失败，`global_state` / `player_state` / `supernatural_events` insertRow 失败。
  - `21:38:25`：第 2 次尝试失败，`global_state` / `player_state` 出现 `ROW_NOT_FOUND`，`supernatural_events.handling_status` 出现 `CHECK_IN_VIOLATION`。
  - `21:38:42`：第 3 次尝试失败，`global_state.row_id` / `player_state.row_id` 出现 `UNIQUE constraint failed`，`supernatural_events.handling_status` 仍为枚举约束问题。
  - `21:38:44`：随后再次触发 `Too Many Requests`，CRUD 填表停止本轮重试并冷却 `30 秒`。
- 后续应进入阶段8：CRUD 写入/约束失败复盘。重点不是回退 v6.21 资源，也不是继续 API 压测，而是定位 CRUD Plan 对固定行表 insert/update 分流、sandbox/持久化状态一致性、以及枚举约束提示/预检的缺口。

**不要做的事：**
- 暂停进一步 AI/写库触发，避免继续放大限流。
- 不要调用 `triggerUpdate()`。
- 不要输出 API key、API URL、Bearer token。
- 不要调整发布资源或回退 v6.21。

## 2026-06-13 CST（会话22）：阶段7暂停 — 用户要求记录进度以便新对话接续

**状态：** 用户要求暂停阶段7任务，将当前进度写入 planning 文件，确保新开对话可以无缝继续。阶段7尚未开始浏览器探针操作，只完成了 planning 上下文恢复。

**阶段7当前进度：**
- 任务 #22（只读检查 API 预设与填表参数形态）：**未开始**。上一个会话已创建 `update_plan` 将 #22 标记为 in_progress，但实际未执行浏览器只读探针。
- 任务 #23（复核限流保护行为）：**未开始**。
- 任务 #24（制定低频复测策略）：**未开始**。
- 任务 #25（调整运行参数）：**未开始**。
- 任务 #26（复测后分流）：**未开始**。

**恢复上下文（新对话必读）：**
- 酒馆真页：Chrome CDP `9222`，地址 `http://127.0.0.1:8000/`。
- 当前发布卡在 tab `t2`，`chid=5`，avatar `神秘复苏模拟器发布版2.png`，版本 `6.21`。
- 运行 marker：`mfrs-naked-instance-fallback-6-21`，`insertRow.toString()` 包含 `_ensureProviderInitializedForWrite`。
- 14 表合计 0 行；SP 运行日志有 1 ERROR + 2 WARN（均来自阶段6的 `Too Many Requests`）。
- 页面当前状态：已执行一次开局（输入角色「林舟」），出现 A-D 推演选项和状态栏。不要误以为是干净新开局。
- 远端 `origin/main = ffe2b799c5de49ae312e9f4c6cdba0620297c89f`。
- 主工作区 `main...origin/main [behind 6]`，有既有 dirty；v6.21 阶段3-5 均在临时干净 worktree 完成。

**阶段7下一步操作（新对话从这里继续）：**
1. 切到 `t2`：`npx agent-browser --cdp 9222 tab t2`
2. 只读运行态探针：检查 API 预设名、自动更新开关、重试/批次/冷却相关配置；只返回非敏感摘要（boolean/长度/预设名），不输出 API key 或 URL。
3. 复核 `Too Many Requests` 是否被归入 API 传输问题、是否停止本轮重试、冷却时间是否生效。
4. 制定低频复测策略：等冷却后只做一次轻量交互或正常操作复测。
5. 如需要调整运行参数（降低重试、减少批次、延长冷却），只本地确认，不改发布资源，不输出敏感信息。
6. 复测后分流：API 恢复且落盘则补记通过；持续限流则标记 API 可用性阻断；出现新错误则新建修复阶段。

**不要做的事：**
- 不要主动调用 `triggerUpdate()`，除非用户明确要求。
- 不要输出 API key、API URL、Bearer token。
- 不要回退或清理无关 dirty。
- 不要使用 `git add .`。

## 2026-06-13 CST（会话21）：阶段6执行中 — 任务 #16 基线已冻结

**状态：** 用户要求继续完成阶段6。已恢复 `task_plan.md` / `progress.md` / `findings.md` / `PROJECT_FLOW.md`，确认阶段6按任务 #16-21 执行。`session-catchup.py` 报告的是旧阶段未同步片段，与当前 v6.21 最终状态不一致；本轮以当前 planning 文件与真页运行态为准。

**任务 #16 基线：**
- 浏览器：Chrome CDP `9222`，当前 tab 为 `t2`，URL `http://127.0.0.1:8000/`。
- 真页角色：`chid=5`，角色名 `神秘复苏模拟器发布版`，avatar `神秘复苏模拟器发布版2.png`，卡版本 `6.21`。
- 资源/运行态：卡内容包含 `bea7926e9a0f5e81645e9c6bb38f118e70aca8ae`，无 `phase133` / `f88460d` / `78c5dbb` / `408dc270` / `c3de698` 残留；runtime marker 为 `mfrs-naked-instance-fallback-6-21`。
- API：`AutoCardUpdaterAPI.getFillMode() = ai_crud_plan`；`MysteryDatabaseFrontend.previewTableChangePlan/applyTableChangePlan/exportCurrentData` 均存在；`insertRow.toString()` 包含 `_ensureProviderInitializedForWrite`。
- 远端：`origin/main = ffe2b799c5de49ae312e9f4c6cdba0620297c89f`。
- 工作区：主工作区仍 `main...origin/main [behind 6]` 且有既有 dirty；本轮不处理、不回退。
- 数据库只读导出：14 表存在，合计 0 行；`action_suggestions`、`chronicle`、`global_state`、`player_state` 均 0 行；未发现 `Browser smoke`、`SP0001`、`CodexV621`、`CodexDirectVerifyV621`、`NativeRegression`、`Phase5Smoke`、`smoke` 残留。
- SP 运行日志面板：`高级工具 -> 运行日志` 当前显示 `共 0 条`，Debug 采集未开启；阶段6只统计此基线之后的新 warn/error。

**任务 #17-20 观察结果：**
- 正常页面流程已执行：填写开局表单（林舟，18/男，普通学生，无厉鬼，手机/现金少量，七中普通学生背景），点击「进入神秘复苏世界」后使用酒馆发送按钮提交开局消息；未调用 `triggerUpdate()`。
- 第一轮 AI 正常生成，页面出现 A-D 推演选项与状态栏：地点为大昌市第七中学教室，状态健康，出现敲门声异常，选项 A-D 可见。
- 观察器捕获到自动填表启动与表更新回调；设置面板中多个表的「上次更新」推进到 `2 (无变更)`。
- SP 运行日志基线后新增 3 条：1 条 ERROR、2 条 WARN，全部指向 API 限流/冷却：
  - `parseNonStreamResponse`：`API upstream rate limit error ... Too Many Requests`
  - `shujuku_v120`：`CRUD Plan 第 1 次尝试失败 ... Too Many Requests`
  - `CRUD 填表`：`API 传输问题，停止本轮重试 ... CRUD 填表已冷却 15 秒`
- 未出现 `API_MUTATION_FAILED`、SQLite 未初始化、CHECK 约束、长度约束或可见 JSON 解析异常。
- 为避免继续放大限流，本轮未推进第二轮交互。
- 数据一致性复查：最终 14 表仍存在，合计 0 行；无 smoke token、`SP0001`、`CodexV621`、`NativeRegression`、`Phase5Smoke` 残留；无重复固定行。

**阶段6结论：** 发布资源链路和前端运行态正确；真实游玩首轮可生成选项/状态栏，但自动填表没有落盘，阻断原因是上游 `Too Many Requests` 触发冷却。按任务 #20 分流，应进入 API 稳定性/冷却策略复核，而不是回退 v6.21 资源或修 SQLite 初始化。

**下一步：** 新增阶段7：API 限流与冷却策略复核。先只读检查当前 API 预设与冷却参数形态（不输出密钥/URL），再决定是否降低并发/重试、延长冷却或切换可用预设后做低频复测。

---

## 2026-06-13 CST（会话20）：阶段6待观察验证任务清单已整理

**状态：** 用户要求根据“待观察验证”制作任务清单。已将原本两条泛化待观察项拆成阶段6任务 #16-21，并写入 `task_plan.md`。

**新增阶段6任务：**
- 任务 #16：冻结观察基线，记录当前角色、avatar、卡版本、runtime marker、远端提交、SP 日志时间戳，并确认无测试行残留。
- 任务 #17：真实游玩观察，用正常流程触发 1-2 轮交互，观察推演选项、状态栏、数据库镜像是否正常；默认不主动调用 `triggerUpdate()`。
- 任务 #18：SP 运行日志复核，只统计基线之后的新日志，重点分类 mutation、SQLite 初始化、CHECK/长度约束、限流/网关、JSON 解析异常。
- 任务 #19：数据一致性复查，重点检查 `action_suggestions`、`chronicle`、玩家状态/全局状态相关表，无 smoke token、重复固定行或测试残留。
- 任务 #20：结果分流，无新增错误则通过；AI 计划质量类 WARN 转 prompt/计划质量优化；mutation/约束错误转具体修复；限流/网关/JSON 问题转 API 稳定性复核。
- 任务 #21：记录收口，把观察结果写入 planning 文件；如出现可复现问题，新增后续阶段。

**当前继续点：** v6.21 发布本身无阻断；下一步若继续验证，应从任务 #16 冻结观察基线开始。

---

## 2026-06-13 CST（会话19）：v6.21 阶段5发布验证完成

**状态：** 阶段5已完成。发布验证过程中发现数据库前端自恢复逻辑仍引用 v6.20 旧 vendor/cache，已修复、重新发布并完成 CDN 与真页 smoke。未触发 `triggerUpdate()`。

**阶段5阻断与修复：**
- CDN 初检与直接导入确认：`78c5dbb` loader 与 `0881382` vendor 本身正确，vendor 的 `insertRow/updateCell` 均包含 `_ensureProviderInitializedForWrite()`。
- 真页仍出现旧 marker `mfrs-applied-mutation-verify-6-20`，根因是 `dist/神秘复苏模拟器/脚本/数据库前端/index.js` 的 `api_owner_mismatch` self-reclaim 仍指向旧 vendor `f88460d...`、旧 cache `phase133...`、旧 marker `mfrs-applied-mutation-verify-6-20`。
- 使用临时干净 worktree `.codex-v621-stage5` 基于 `origin/main=d52708a` 修复 `src/神秘复苏模拟器/脚本/数据库前端/index.ts`，将 reclaim URL 改为 `0881382254b209f8ef23963ec21ff2c7cf89c780`，marker 改为 `mfrs-naked-instance-fallback-6-21`。
- `..\node_modules\.bin\webpack --mode production` 构建成功；仅提交预期文件：
  - `src/神秘复苏模拟器/脚本/数据库前端/index.ts`
  - `dist/神秘复苏模拟器/脚本/数据库前端/index.js`
- 修复提交：`408dc27 fix: point database frontend reclaim to v6.21 vendor`。
- 推送后远端生成 bot bundle：`bea7926 [bot] bundle`，只改数据库前端 dist。

**最终发布同步：**
- 将 `scripts/publish-card.mjs` 的 `CDN_REF` 更新为 `bea7926e9a0f5e81645e9c6bb38f118e70aca8ae`，`CDN_CACHE_VERSION` 保持 `phase134-naked-instance-fallback-6-21`，版本保持 `6.21`。
- `pnpm run publish-card -- 神秘复苏模拟器发布版` 成功。
- 发布版 YAML 6 条项目资源 URL 均指向 `bea7926...` 与 `phase134...`。
- 发布版 PNG `tEXt:chara` 与 `tEXt:ccv3` 均为 `version=6.21`，均包含 `bea7926...` 与 `phase134...`，且不含旧 `408dc270`、`78c5dbb`、`c3de698`、`f88460d`、`phase133`、`localhost` 或 `127.0.0.1`。
- 最终发布提交：`ffe2b79 release: repoint v6.21 card to frontend reclaim fix`，已推送到 `origin/main`。

**CDN smoke：**
- release YAML/PNG `@ffe2b79` 返回 200；PNG `chara/ccv3` 元数据校验通过。
- resource bundle `@bea7926` 下状态栏 HTML、变量结构、界面美化、固定状态栏、数据库 loader、数据库前端均返回 200。
- 数据库 loader 与数据库前端均包含 `0881382`、`phase134-naked-instance-fallback-6-21`、`mfrs-naked-instance-fallback-6-21`，不含旧 `phase133/f88460d/78c5dbb/408dc270`。
- vendor `@0881382/vendor/shujuku-sp-fork/index.js` 返回 200，包含 `_ensureProviderInitializedForWrite`。

**真页 smoke：**
- `/api/content/importURL` 在当前酒馆返回 404，因此改用本地最终 PNG 通过 `#character_import_file` 上传导入。
- 新导入发布卡为 `chid=5`，avatar `神秘复苏模拟器发布版2.png`，卡内容包含 `bea7926`，无旧 hash/cache 残留。
- 刷新并重新选择 `chid=5` 后，运行时 marker 为 `mfrs-naked-instance-fallback-6-21`，`AutoCardUpdaterAPI.getFillMode()` 为 `ai_crud_plan`。
- `AutoCardUpdaterAPI.insertRow/updateCell/deleteRow` 均存在，`insertRow.toString()` 包含 `_ensureProviderInitializedForWrite` / v6.21 兜底。
- `MysteryDatabaseFrontend.previewTableChangePlan/applyTableChangePlan/exportCurrentData` 均存在。
- `action_suggestions` 最小 CRUD 验证通过：insert -> updateCell -> deleteRow 均 `ok=true`，最终行数 0，测试 token 无残留。

**当前最终口径：**
- `origin/main = ffe2b799c5de49ae312e9f4c6cdba0620297c89f`
- 最终发布卡版本：`6.21`
- 最终资源 ref：`bea7926e9a0f5e81645e9c6bb38f118e70aca8ae`
- vendor ref：`0881382254b209f8ef23963ec21ff2c7cf89c780`
- cache/marker：`phase134-naked-instance-fallback-6-21` / `mfrs-naked-instance-fallback-6-21`

---

## 2026-06-13 CST（会话18）：v6.21 阶段4发布版同步完成

**状态：** 阶段4已完成。使用临时干净 worktree `.codex-v621-stage4` 基于 `origin/main=78c5dbb` 完成发布脚本更新、发布版同步、PNG 元数据校验、精确提交与推送。未触发 `triggerUpdate()`。

**完成任务：**

1. **任务 #10（已完成）：更新发布脚本**
   - 修改 `scripts/publish-card.mjs`：
     - `CDN_REF = 78c5dbbf2bd789c1045b6f4abd3a610db5d58593`
     - `CDN_CACHE_VERSION = phase134-naked-instance-fallback-6-21`
     - `releaseVersion = 6.21`
   - gate：
     - `git diff --check -- scripts/publish-card.mjs` 通过。
     - `node --check scripts/publish-card.mjs` 通过。

2. **任务 #11（已完成）：执行发布同步并验证本地发布产物**
   - `pnpm run publish-card -- 神秘复苏模拟器发布版` 成功。
   - 输出发布版 PNG：`src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`。
   - 发布版 `index.yaml` 更新为 `版本: '6.21'`。
   - 发布版 6 条项目资源 URL 均指向 `78c5dbb...` 与 `phase134-naked-instance-fallback-6-21`。
   - PNG `tEXt:chara` 与 `tEXt:ccv3` 均解码为 `version=6.21`，均包含 `78c5dbb...` 与 `phase134...`，且不含旧 `c3de698...`、`phase133...`、`f88460d...`、`localhost` 或 `127.0.0.1`。

3. **任务 #12（已完成）：精确提交并推送发布版同步**
   - 提交前 diff 只包含 3 个文件：
     - `scripts/publish-card.mjs`
     - `src/神秘复苏模拟器发布版/index.yaml`
     - `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`
   - 提交：`d52708a release: publish v6.21 card`。
   - 已推送到 `origin/main`。
   - 远端确认：`origin/main = d52708ad0af0007b16bb2a07ee15888571f501b8`。

**下一步：**
- 阶段5（任务 #13-15）：CDN smoke 测试 release YAML/PNG、loader、vendor 与关键脚本；发布版真页 smoke 验证当前角色/marker/API/network；最后更新 v6.21 最终发布状态。

---

## 2026-06-13 CST（会话17）：v6.21 阶段3资源发布完成

**状态：** 阶段3已完成。已提交 vendor 修复、处理远端 bot 依赖提交、推送资源提交、确认 CDN vendor 可访问、回填 loader hash/cache/marker、构建并提交 loader 回填。未触发 `triggerUpdate()`。

**完成任务：**

1. **任务 #6（已完成）：提交 vendor fork 修复**
   - gate：
     - `git diff --check -- vendor/shujuku-sp-fork/index.js` 通过。
     - `node --check vendor/shujuku-sp-fork/index.js` 通过。
   - 精确提交 `vendor/shujuku-sp-fork/index.js`，提交：`058882e fix: initialize sqlite provider before writes`。
   - 提交只包含 1 个文件：`vendor/shujuku-sp-fork/index.js`，+24 行。

2. **任务 #7（已完成）：处理远端差异并推送资源提交**
   - 远端先有 `cd0e47c [bot] Bump deps`，只改 `package.json` 与 `pnpm-lock.yaml`，与 vendor 修复不冲突。
   - 本地 merge 后提交：`0881382 Merge remote-tracking branch 'origin/main'`。
   - 已推送到 `origin/main`。
   - 推送后 GitHub Actions 生成 `2da008b [bot] bundle`，只改 `dist/神秘复苏模拟器/界面/状态栏/index.html`。

3. **任务 #8（已完成）：确认 CDN 资源可访问并回填 loader**
   - CDN vendor `@0881382/vendor/shujuku-sp-fork/index.js?v=phase134-naked-instance-fallback-6-21` 返回 200。
   - 确认 vendor 内容包含 `_ensureProviderInitializedForWrite` 与 `检测到未初始化的 SQLite 实例`。
   - 为避免当前主工作区既有 dirty 与 `2da008b` 的状态栏 dist 冲突，使用临时干净 worktree `.codex-v621-stage3` 基于 `origin/main=2da008b` 做 loader 回填。
   - 回填 `src/神秘复苏模拟器/脚本/数据库/index.ts`：
     - vendor ref：`0881382254b209f8ef23963ec21ff2c7cf89c780`
     - cache：`phase134-naked-instance-fallback-6-21`
     - marker：`mfrs-naked-instance-fallback-6-21`

4. **任务 #9（已完成）：构建并提交 loader 回填**
   - `pnpm build` 在临时 worktree 因无 `node_modules` 不能直接运行；改用主工作区 `..\node_modules\.bin\webpack --mode production`。
   - 沙箱内首次构建遇到 Windows `spawn EPERM`，提升权限重跑成功。
   - 仅保留并提交两个预期文件：
     - `src/神秘复苏模拟器/脚本/数据库/index.ts`
     - `dist/神秘复苏模拟器/脚本/数据库/index.js`
   - 提交：`78c5dbb release: point v6.21 loader to sqlite init fallback resource`。
   - 已推送到 `origin/main`。
   - CDN loader `@78c5dbb/dist/.../脚本/数据库/index.js?v=phase134-naked-instance-fallback-6-21` 返回 200，包含新 vendor ref/cache/marker，且不含旧 `f88460d...` / `phase133...`。
   - 推送后短等并 fetch，未出现额外 `[bot] bundle`；本次 dist loader 已随提交纳入，暂无 bot 差异。

**当前远端口径：**
- `origin/main = 78c5dbbf2bd789c1045b6f4abd3a610db5d58593`
- loader commit：`78c5dbb`
- vendor resource ref：`0881382254b209f8ef23963ec21ff2c7cf89c780`
- cache：`phase134-naked-instance-fallback-6-21`
- marker：`mfrs-naked-instance-fallback-6-21`

**注意事项：**
- 主工作区当前 `main` 仍停在 `0881382`，显示 `main...origin/main [behind 2]`，因为本轮为避免既有 dirty 冲突，用临时 worktree 完成并推送了 loader 回填。
- 阶段4开始前需要基于 `origin/main=78c5dbb` 工作；若继续在当前主工作区操作，要先处理本地 dirty 与 `dist/神秘复苏模拟器/界面/状态栏/index.html` 的冲突风险，或继续使用干净 worktree。

---

## 2026-06-13 CST（会话16）：v6.21 阶段2本地验证完成

**状态：** 阶段2已完成。真页当前角色为开发版 `神秘复苏模拟器`（chid 2），先确认页面旧运行时仍是 v6.20，不含 v6.21 写前初始化兜底；随后通过 `http://127.0.0.1:5500/vendor/shujuku-sp-fork/index.js` 临时加载本地 vendor fork，确认 `insertRow` 函数字符串包含 `[修复 v6.21] 写操作前确保 Provider 已初始化`。未调用 `triggerUpdate()`，未触发 AI。

**完成验证：**

1. **任务 #4（已完成）：真页最小写入验证**
   - 使用简单表 `action_suggestions`，避开上轮误用 `玩家状态` 导致的复杂必填字段干扰。
   - 运行 marker：`mfrs-naked-instance-fallback-6-21-local`。
   - `previewTableChangePlan(insertRow)` 返回 `ok=true`，无 errors。
   - `applyTableChangePlan(insertRow)` 返回 `ok=true`，`insertedRowIndex=1`。
   - `exportCurrentData()` 复查命中测试行 `CodexV621_1781335121453`。
   - `applyTableChangePlan(deleteRow)` 清理成功，最终 `action_suggestions` 行数恢复 0，测试 token 无残留。
   - 操作期间未捕获 `SQLite 引擎未初始化`、`SqlTableService`、`API_MUTATION_FAILED`、`insertRow failed` 或 `deleteRow failed`。

2. **任务 #5（已完成/低成本复测）：本地 vendor 重载后直接 CRUD 验证**
   - 重新加载本地 v6.21 vendor 后，立即走数据库前端 `applyTableChangePlan` 时，前端元数据尚未恢复，提前返回 `TABLE_NOT_FOUND`；该失败没有进入 SQLite 写路径，也没有产生残留。
   - 随后使用 `AutoCardUpdaterAPI` 直接验证 `insertRow -> updateCell -> deleteRow`，并用 `MysteryDatabaseFrontend.exportCurrentData()` 复查：
     - `insertRow('action_suggestions', row_id=2)` 返回 `1`，导出命中测试行 `CodexDirectVerifyV621_1781335442773`。
     - `updateCell('action_suggestions', 1, 'idea_text', ...)` 返回 `true`，导出命中 `_updated` 值。
     - `deleteRow('action_suggestions', 1)` 返回 `true`，最终行数恢复 0，测试 token 无残留。
   - 操作期间未捕获 SQLite 未初始化或 API mutation 错误。

**阶段2结论：** v6.21 本地 vendor 在真页可执行，简单表可逆写入、更新、删除均通过；上轮阻断确认为测试表选择错误。阶段2可以收口，下一步进入阶段3资源发布：提交 vendor 修复、处理 `main...origin/main [behind 1]` 的远端差异、推送并等待 CDN/bundle。

---

## 2026-06-13 CST（会话15）：v6.21 修复执行 — 阶段1完成 + 阶段2验证中断

**状态：** 用户选择「直接修复」，已完成代码修改与本地构建，真页验证时发现测试用例选错表结构（玩家状态表有复杂必填字段），用户要求暂停并记录 planning 进度。**下一步：改用简单表验证或跳过可选验证直接进入提交流程。**

**本会话完成（任务 #1-3 / 共15项）：**

1. **任务 #1（已完成）：** 读取 vendor/shujuku-sp-fork/index.js，确认修改位置
   - insertRow（52370）、updateRow（52278）、deleteRow（52445）、updateCell（52161）四个写操作入口
   - getStorageProvider()（13336）懒建裸实例路径
   - executeMutation()（12868）调 `_ensureInitialized()` 抛错路径

2. **任务 #2（已完成）：** 添加初始化兜底逻辑
   - 新增 `_ensureProviderInitializedForWrite()` 函数（13345-13358行）：
     ```javascript
     async function _ensureProviderInitializedForWrite() {
         const provider = getStorageProvider();
         if (provider.mode === 'sqlite' && !provider._initialized) {
             logDebug_ACU('[StorageStrategy] 检测到未初始化的 SQLite 实例，触发同步重建...');
             await reloadStorageProvider();
             logDebug_ACU('[StorageStrategy] SQLite 实例已同步重建完成');
         }
     }
     ```
   - 在 insertRow、updateRow、deleteRow、updateCell 四个写操作 try 块首行添加 `await _ensureProviderInitializedForWrite();`
   - 修改统计：+24 行
   - 标记：`[修复 v6.21]`

3. **任务 #3（已完成）：** 本地构建 bundle
   - `pnpm build` 成功，所有模块编译通过
   - 无构建错误，仅数据库前端 247 KiB 超推荐限制（预期）

**任务 #4（验证中断）：** 真页导入开发版并进行最小写入验证
- Chrome 9222 调试环境已连接，当前角色「神秘复苏模拟器」
- 尝试使用 `MysteryDatabaseFrontend.applyTableChangePlan` 测试 insertRow
- 发现玩家状态表有 12 个必填字段（姓名、身份、所在地点等），测试用例选错表
- Console 错误：`COLUMN_NOT_FOUND`（属性/值列不存在）+ 多个 `NOT_NULL_VIOLATION`
- **验证未完成，等待用户决定是否改用简单表（如事件纪要）或跳过可选验证**

**修复版本信息：**
- 版本：6.21
- 主题：SQLite 引擎裸实例初始化兜底修复
- Cache：phase134-naked-instance-fallback-6-21
- Marker：mfrs-naked-instance-fallback-6-21

**待完成任务（#4-15 / 共12项）：**
- 阶段2本地验证：任务 #4（真页最小写入验证，可选）、任务 #5（快速换卡竞态测试，可选）
- 阶段3资源发布：任务 #6-9（提交 vendor、推送、回填 loader、提交 loader）
- 阶段4发布版同步：任务 #10-12（更新发布脚本、执行同步、提交发布版）
- 阶段5发布验证：任务 #13-15（CDN smoke、真页 smoke、更新文档）

**下次恢复指南：**
1. 先读 `task_plan.md` 恢复入口 + `PROJECT_FLOW.md` 确认流程
2. 再读本文件（progress.md）顶部本条目，确认 v6.21 代码已改完且已构建
3. 决策：A）改用简单表（事件纪要/行动建议）完成任务 #4；B）跳过可选验证直接进入任务 #6 提交流程
4. `git status --short` 确认当前改动仅限 `vendor/shujuku-sp-fork/index.js`（+24行）

---

## 2026-06-13 CST（会话14）：SQLite 引擎未初始化 — 暂停盘点（已确认根因 + 5 项待证疑点 + 决策点）

**状态：** 应用户要求暂停深入排查，汇总会话12/13 已确认的问题与仍未查明的疑点。**仍未改代码。** 等待用户在「继续收集证据 / 直接修复 / 先修复再观察」三者间选择。

**已确认问题（高置信度）：**
- 错误本体：`acu-logs-2026-06-12T10-06-33-604Z.json` 57 条 `[SqlTableService] SQLite 引擎未初始化，请先调用 loadFromChat()`，跨度约 6 分钟；本轮无推演选项/状态栏/前端 14 表更新。
- 根因类别：`getStorageProvider()`（13336）懒建 `_initialized=false` 裸实例，从不调 `loadFromChat()`；`insertRow`→`executeMutation`→`_ensureInitialized()`（13040）抛错。

**已定位机制（会话13 突破，本轮复述确认）：**
- 持续 6 分钟 = CHAT_CHANGED 同步段无条件 `disposeStorageProvider()`（51225，置 null）+ 1200ms 后 `reloadStorageProvider()` 被身份守卫（51290-51293：`currentChatFileIdentifier_ACU !== scheduledChatIdentifier_ACU` 即 return）永久跳过 → 此后每次写入都拿裸实例。
- 未回退 native = `_ensureInitialized()` 在 `executeMutation` try 块外（12868），裸实例错直冲 `insertRow` catch（52441），不进 `executeMutation` catch，也不满足 `initStorageProvider` 的 fallback 条件（13364：`!result.loaded && result.error` 只管 loadFromChat 内部失败）。

**仍未查明的 5 项疑点（按优先级）：**
1. 【中】守卫是否真命中 — 需 Console 看 `Skip delayed chat refresh` 或 `重建内存数据库...` + 两个 identifier 实际值。
2. 【中】今天真页测试未复现 — 快速换卡后点「立即手动更新」无反应、未触发 DB 操作；按钮绑定/空表/需先发消息触发 AI 填表，待确认。
3. 【低】首错延迟 98s 链路 — CHAT_CHANGED 守卫路径 vs 启动 `initWithChatId` setTimeout 路径，需 debug 日志区分。
4. 【低】`initWithChatId` 轮询（51570，200ms×75=15s）是否超时 — 需 `chatId became available/still not available` 行。
5. 【低】`settings_ACU.storageMode` 实际值是否真为 `sqlite` — 需 `console.log(window.settings_ACU?.storageMode)`。

**缺失证据：** Chrome DevTools Console 完整 `logDebug_ACU` 日志（SP 运行日志面板只收 warn/error，看不到 `[SQLite]`/`CHAT_CHANGED`/`Skip delayed chat refresh` debug 行）。或真页复现：刷新→进聊天→快速连续换卡两次→立即发消息→看是否报错。

**修复方向（无需等证据即可实施）：** A 最稳=在 `getStorageProvider()` 写路径加同步兜底，拿到 `_initialized=false` 实例时先 `await reloadStorageProvider()` 再执行写操作。根治守卫跳过/时间窗/轮询失败所有路径，不依赖 setTimeout 时序与 identifier 归一化一致性。

**决策点（待用户选）：** A 继续收集证据（指导真页复现/取 Console 日志）；B 直接实施修复方向 A；C 先修复再观察 SP 日志。

---

## 2026-06-12 CST（会话13）：SQLite 引擎未初始化 — 二次只读定位（解开「持续6分钟」疑点）

**状态：** 在会话12诊断盘点基础上，继续只读分析 `vendor/shujuku-sp-fork/index.js`，查明「错误持续6分钟」与「未回退native」两大疑点的代码层机制。**仍未改代码**。

**新定位成果（已确认）：**

1. **解开「持续6分钟」疑点 — CHAT_CHANGED 的 reload 被身份守卫永久跳过：**
   - `disposeStorageProvider()`（51225）在 CHAT_CHANGED 同步段无条件执行（只要 chatFileName 有效且 sqlite），把 `currentProvider=null`。
   - 重建 `reloadStorageProvider()` 在 `setTimeout(1200)` 内（51289），但回调开头 51290-51293 **带身份守卫**：`if (scheduledChatIdentifier_ACU && currentChatFileIdentifier_ACU !== scheduledChatIdentifier_ACU) return;`
   - 守卫命中 → 本次 reload 被跳过，dispose 后**永不 reload** → `currentProvider` 停在 null → 此后每次 `insertRow` 经 `getStorageProvider()`（13336）懒建裸实例 `_initialized=false` → 持续抛错。
   - 这正解释日志里错误持续整整 6 分钟（10:00:51→10:05:17），不是单纯 1.2s 时间窗，而是 reload 被永久跳过导致裸实例长期持续。
   - 典型触发场景：换卡/换聊天/swipe 在 1200ms 内连续发生两次 CHAT_CHANGED，或 identifier 归一化口径不一致导致守卫判断失败。

2. **解开「未回退native」疑点 — `_ensureInitialized` 在 try 块外，错误不被 catch 吞：**
   - `executeMutation`（12867）的 `this._ensureInitialized()` 在 **try 块之外**（try 从 12870 起）。
   - 裸实例抛错不会被 `executeMutation` 内部 catch（12891）转成 `{changes:0, errors:[...]}`，而是直冲 `insertRow` 的 catch（52441）→ 日志原文 `insertRow failed: SQLite 引擎未初始化`。
   - 错误抛点不在 `loadFromChat()` 内部，所以 `initStorageProvider` 的 SQLite→native fallback（13364：`if (!result.loaded && result.error)`）**根本没机会触发**——fallback 只处理 loadFromChat 内部失败，不处理"从没调过 loadFromChat"的裸实例错。
   - 这完整解释为何日志无 fallback 痕迹，也无 `getCurrentStorageMode()` 切到 native 的迹象。

3. **代码层证据链完整闭合：**
   - `getCurrentStorageMode()`（5079）从 `settings_ACU?.storageMode` 读取，默认 `'native'`；只要 settings 已加载就返回有效值，不依赖 Provider 生命周期。
   - `isSqliteMode()`（5088）= `getCurrentStorageMode() === 'sqlite'`，纯读取设置，不关心 Provider 是否初始化。
   - `loadSettings_ACU()`（27078）置 `settingsStorageReadyForSave_ACU=true`（27264）后才允许保存，初始化未完成时 `saveSettings_ACU` 拒绝（27040 warn `设置尚未完成可靠加载`）。
   - 日志开头 2 条 `设置尚未完成可靠加载` warn（09:59:13）表明初始化早期设置还在加载中，但这**不影响读取 storageMode**（读取只需 settings_ACU 对象存在，不要求 settingsStorageReadyForSave=true）。

**仍未确认（需 Console debug 日志）：**
- 守卫是否真命中：需验证日志里 `scheduledChatIdentifier_ACU` 与 `currentChatFileIdentifier_ACU` 在 reload 回调时是否真不一致。
- 首错延迟 98s 的具体触发链路（CHAT_CHANGED 守卫路径 vs 启动 setTimeout 路径）：需 Console 完整 `logDebug_ACU` 看填表前最后一次 Provider 生命周期事件。
- `initWithChatId` 轮询（51570，200ms×75=15s）是否真超时未完成：需 debug 日志确认是否有 `chatId became available` 或 `still not available` 行。

**修复方向更新（按推荐度）：**
- **A（最稳，根治）：** 在 `getStorageProvider()` 写路径加同步兜底 — 拿到 `_initialized=false` 的实例时，写操作前先 await 一次 `reloadStorageProvider()` 再执行。根治所有窗口（时间窗/守卫跳过/启动轮询失败），不依赖 setTimeout 时序和 identifier 归一化一致性。
- **B（局部）：** 填表入口前置 await 初始化 — `triggerUpdate`/CRUD 批次执行前确保 `currentProvider._initialized`，否则先 `await reloadStorageProvider()`。只保护填表链路，不保护其他 executeMutation 调用点。
- **C（治标）：** 缩短/消除 setTimeout 窗口或修正 identifier 守卫逻辑。改动面大，且不能根治轮询失败等其他路径。

**下一步（用户确认后再做）：**
- 拿 Chrome DevTools Console 完整 `logDebug_ACU` 日志（运行日志面板只收 warn/error），确认填表前最后一次 Provider 生命周期事件、守卫条件是否命中、chatId 轮询是否超时。
- 修复后必须**真页复现验证**：模拟"换卡/swipe 后立刻 triggerUpdate"，而不是手动慢操作（手动慢操作天生绕过竞态，会假阳性通过）。

**已同步到 planning 文件：**
- `findings.md` 已补充「新证据：CHAT_CHANGED 守卫让裸实例永久持续」段落，包含守卫机制、executeMutation try 块外抛错、结论修正。
- `task_plan.md` 已更新任务清单【当前阻断·最高优先级】条目，记录会话13 新定位（解开「持续6分钟」疑点）、仍未确认项、修复方向 A 最稳。

---

## 2026-06-12 CST（会话12）：v6.20 发布后首次真实游玩 SQLite 引擎未初始化 — 盘点（仅诊断，未改代码）

**状态：** 用户跑了一轮真实测试对话，本轮无推演选项、无状态栏、前端 14 表数据未更新。读取本轮 SP 运行日志 `acu-logs-2026-06-12T10-06-33-604Z.json` 诊断。当前仅完成诊断与根因方向确认，**未改任何代码**，并已应用户要求暂停深入排查，先记录盘点。

**日志事实（已确认）：**
- 日志 68 条：57 error + 11 warn，时间 09:59:13 → 10:05:17。
- 57 条完全相同的 error：`[shujuku_v120] insertRow failed: Error: [SqlTableService] SQLite 引擎未初始化，请先调用 loadFromChat()`。
- 资源口径：vendor `f88460d...`、frontend `c3de698...`、cache `phase133-applied-mutation-verify-6-20` — 确认跑的是 v6.20 发布资源，不是旧 bundle。
- warn：2 条 `[设置保存] 设置尚未完成可靠加载，已拒绝本次保存`（09:59:13）；9 条 `CRUD Plan 第 N 次尝试失败`（批次 4/4、7/7、10/10 表全失败）。

**根因方向（已确认类别）：**
- 抛点：`vendor/shujuku-sp-fork/index.js` `_ensureInitialized()` 约 13038 行：`if (!this._initialized || !this.engine.isReady) throw`。
- 唯一会跑 `engine.init()` 并置 `_initialized=true` 的入口是 `loadFromChat()`（约 12626 行）。
- `getStorageProvider()`（约 13336 行）懒创建实例但**从不调用 `loadFromChat()`** → 产生 `_initialized=false` 的「裸实例」。
- `insertRow` SQLite 分支（约 52408 行）直接 `getStorageProvider().executeMutation(...)`，命中裸实例即抛。
- 后果链：插入全失败 → API_MUTATION_FAILED → 0 行落盘 → 无推演选项/状态栏/前端数据。
- 这是**全新错误类型**，项目历史从未出现（历史是 row_id/CHECK/参数绑定/计划质量类，不是引擎生命周期类）。
- 上游 `AlbusKen/shujuku` 修过同一 bug（`.analysis-archive/` 4 篇归档，根因描述一致：懒初始化只建实例不调 loadFromChat）。
- fork 内对应生命周期补丁**全部存在、未被回退**：`initStorageProvider` SQLite→native fallback（约 13349/13364）、CHAT_CHANGED 同步 dispose（约 51225）+ 延迟 reload（约 51299，1200ms）、`initWithChatId` SQLite init（约 51547）+ chatId 轮询（约 51570，200ms×75）。

**未确认疑点（盘点保留）：**
1. error 持续整整 6 分钟（10:00:51 → 10:05:17）。若只是「dispose→reload 之间 1.2s 窗口」，第 10:04 的第 3 批次不应仍失败 → 简单时间窗理论被推翻。
2. 首条 error 出现在开始后约 98s，不是切卡瞬间，时序待解释。
3. 命中裸实例本应触发 13364 的 SQLite→native fallback，但日志无 fallback 迹象 → fallback 为何没生效未知。
4. 开头 2 条「设置尚未完成可靠加载」warn 与 SQLite 未初始化是否同因（settings 加载链断裂）尚未坐实。
5. 备选根因未排除：`initWithChatId` 轮询失败 / `reloadStorageProvider` 内部异常被吞，导致实例长期停在未初始化态。

**下一步（用户确认方向后再做）：**
- 查 `getCurrentStorageMode` / `isSqliteMode` 实现 + settings 加载链，判断是否 settings 未可靠加载导致初始化分支没走。
- 取 Chrome DevTools Console 完整 debug 日志（运行日志面板只收 warn/error，不含 logDebug_ACU），用于区分 3 条候选路径（1.2s 窗口 / 启动轮询失败 / 设置未加载链路失败）。
- 注意：IndexedDB settings 含明文 `apiConfig.apiKey` 与反代 `apiConfig.url`，只读时只确认字段存在，不输出具体值。

---

## 2026-06-12 CST（会话11）：planning-with-files 记录整理完成

**状态：** 用户要求整理 `planning-with-files` 记录，保留版本变更、项目运行基本流程、需要提交的文件、不需要提交的文件，并让新对话可以继续任务。

**已完成整理：**
- 新增常驻流程文件 `PROJECT_FLOW.md`，集中记录项目定位、真实开发入口、实时开发链路、正式构建与发布链路、自动更新边界、真页与 SQL 验收口径。
- 重写 `task_plan.md` 为新对话恢复入口：保留当前 v6.20 状态、任务清单、版本变更索引、需要提交的文件、不需要提交的本地参考文件和归档索引。
- 在 `task_plan.md` 顶部明确恢复顺序：先读 `PROJECT_FLOW.md`，再读 `task_plan.md` / `progress.md` / `findings.md`，再跑 `git status --short --branch`。
- 记录 `session-catchup.py` 可能报告旧 P1 残片；该上下文已被 v6.19/v6.20 覆盖，除非用户明确要求回查历史，否则以当前 v6.20 状态为准。

**当前继续点：** v6.20 发布收口已完成；下一步仅剩发布后实际游玩观察和 SP 运行日志只读复核。

---

## 2026-06-12 CST（会话10）：当前进度清单快照已记录

**状态：** 用户要求用 `planning-with-files` 记录当前进度。已复核 `task_plan.md`、`progress.md`、`findings.md`：当前主线停在 v6.20 发布后观察阶段，发布收口本体已经完成。

**已完成：**
- 第 7 步：v6.19 真页 CRUD/native 回归验证完成。
- v6.19 发布收口 1-6：发布版同步、精确提交、推送、CDN smoke、真页发布版 smoke 完成。
- 第 8 步：v6.19 发布后只读观察与 SP 日志复核完成。
- 第 9 步：固定行空表 `updateCell -> insertRow`、`chronicle` 自动补 `SP0001`、长度约束分流处理完成。
- 第 9 步真页验证：本地 bundle smoke、最小写入验证、测试行清理完成。
- v6.20 发布收口：PNG 元数据校验、精确提交、推送、CDN smoke、发布版真页验证全部完成。
- 当前远端口径：`HEAD = origin/main = da681d2e015b27aeb87f304b4028dc9d63afeb49`，运行资源为 `c3de698...` + `phase133-applied-mutation-verify-6-20`。

**未完成 / 待观察：**
- v6.20 发布后实际游玩观察：关注真实触发下是否还有 AI 计划质量类 WARN。
- SP 运行日志继续观察：关注新的 `API_MUTATION_FAILED`、CHECK 约束失败、限流、JSON 解析异常。
- 可选决策：当前没有 tag 指向 `HEAD`，`v0.0.134` 仍指向 loader bundle `c3de698...`；是否补发 tag 以后单独决定。
- 可选改进：`publish-card.mjs` 对已有 jsdelivr 链接替换仍需保持人工复核，后续可做自动化增强。

**注意事项：**
- 不要主动调用 `triggerUpdate()`，除非明确要做真实 AI/写库触发测试。
- 不要回退无关 dirty。
- 不要把 planning 文档或既有无关本地改动混入发布提交。

---

## 2026-06-12 CST（会话9）：v6.20 发布收口完成

**状态：** 用户要求继续完成 PNG 元数据校验、精确提交、推送和真页验证。当前 v6.20 发布收口已完成，发布修正已推送到 `origin/main`。

**资源 ref 修正：**
- 第一次 CDN smoke 发现候选 `a83888d...` 下 loader 仍是 `phase132`，不含第 9 步发布运行时。
- 已将 `scripts/publish-card.mjs` 的 `CDN_REF` 修正为 `c3de698cd6963082f89eaed8d80fd3cdf481a47e`。
- 重新执行 `pnpm run publish-card -- 神秘复苏模拟器发布版`；沙箱内 PNG copyfile `EPERM`，提升权限重跑成功。

**PNG 元数据校验：**
- `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`：`version=6.20`，含 `c3de698cd6963082f89eaed8d80fd3cdf481a47e` 与 `phase133-applied-mutation-verify-6-20`。
- `src/神秘复苏模拟器/神秘复苏模拟器.png`：`version=2.0`。
- `src/神秘复苏模拟器发布版/神秘复苏模拟器.png`：`version=2.0`。
- 三张 PNG 均有 `tEXt:chara` 与 `tEXt:ccv3`，且均不含旧 ref、`phase132`、`phase131`、`6.19`、`localhost`、`127.0.0.1`。

**提交与远端：**
- 精确提交：`da681d2 release: repoint v6.20 card to published loader bundle`。
- `HEAD` 与 `origin/main` 均为 `da681d2e015b27aeb87f304b4028dc9d63afeb49`。
- 提交只包含 6 个文件：`scripts/publish-card.mjs`、开发版 `index.yaml`、开发版 PNG、发布版 `index.yaml`、发布版镜像 PNG、发布版 PNG。
- 当前无 tag 指向 `HEAD`；`v0.0.134` 仍指向 `c3de698cd6963082f89eaed8d80fd3cdf481a47e`。

**CDN smoke：**
- release YAML at `da681d2...` 返回 200，含 `c3de698...` 与 `phase133-applied-mutation-verify-6-20`，无旧残留。
- release PNG 返回 200，长度 `7761558`。
- database loader 与 database frontend loader at `c3de698...` 返回 200，均含 phase133、marker 与 vendor ref；database frontend loader 还含 `previewTableChangePlan` 与 `applyTableChangePlan`。
- 状态栏、变量结构、界面美化、固定状态栏 HEAD checks 均 200。

**发布版真页验证：**
- 通过 `npx agent-browser --cdp 9222` 连接 `http://127.0.0.1:8000/`，当前角色为 `神秘复苏模拟器发布版`（characterId/chid `3`，avatar `神秘复苏模拟器发布版.png`）。
- 运行 marker 为 `mfrs-applied-mutation-verify-6-20`；`MysteryDatabaseFrontend.previewTableChangePlan` 与 `applyTableChangePlan` 均存在。
- 未触发 `triggerUpdate()`。
- Network 确认脚本从 `c3de698...` + `phase133-applied-mutation-verify-6-20` 加载，vendor 从 `f88460d97127f3a16ee3c332b0631929541d7bdf` 加载。

**真页数据验证与清理：**
- 初始 `action_suggestions` 与 `chronicle` 均为 0 行，无 `Browser smoke` 残留。
- `action_suggestions`：`updateCell + match.row_id=2` 预览提升为 `insertRow`，apply `ok=true`，只落一行 `row_id=2`，无重复。
- `chronicle`：过长正例正确被 `LENGTH_VIOLATION > 600` 拦截；短文本负例只报 `LENGTH_VIOLATION`；401 字正例缺 `code_index` 自动补 `SP0001`，apply `ok=true`，只落一行。
- 已删除 `action_suggestions row_id=2` 与 `chronicle code_index=SP0001`；最终两表均 0 行，无测试残留。

**工作区注意：** 发布修正文件已提交干净。剩余 dirty 为 planning 文档和既有无关本地改动，不要 revert，也不要混入发布提交。

**下一步：** v6.20 进入发布后观察；后续只读复核 SP 运行日志和实际游玩触发下的 WARN/ERROR。

---

## 2026-06-12 CST（会话8）：第 9 步真页本地 bundle smoke 完成

**状态：** 用户要求继续完成真页验证。当前已完成不触发 AI 的真页最小验证，测试写入已清理，尚未进入 v6.20 发布同步。

**真页基线：**
- 通过 `npx agent-browser --cdp 9222` 连接 `http://127.0.0.1:8000/`。
- 当前角色为开发版 `神秘复苏模拟器`（avatar `神秘复苏模拟器.png`），`fillMode=ai_crud_plan`，`AutoCardUpdaterAPI` 与 `MysteryDatabaseFrontend` 均存在，14 表模板完整。
- 当前开发版卡内资源仍指向旧 CDN commit `3f924897...` + `phase131-crud-p1-rowid-batch-6-19`；直接对旧运行时预检会返回旧行为：`行动建议 updateCell` 仍是 `ROW_NOT_FOUND`，`事件纪要 insertRow` 仍报 `纪要编号` `NOT_NULL_VIOLATION`。

**本地新 bundle 加载：**
- `http://localhost:5500/dist/神秘复苏模拟器/脚本/数据库前端/index.js` 可访问，返回 200，长度约 231619。
- 在当前页面临时 `import('http://localhost:5500/dist/.../数据库前端/index.js?v=phase132-local-step9-smoke&t=...')`，成功替换 `MysteryDatabaseFrontend` 兼容 API。
- 此方式只验证本地构建出的第 9 步 bundle，不代表卡内 CDN 引用已经更新。

**预检结果：**
- 空 `行动建议` 表上 `updateCell + match.row_id=2 + 完整 set` 被解析为 `action=insertRow`，`ok=true`，affectedColumns 包含 `row_id`。
- `事件纪要` 缺 `纪要编号` 的 `insertRow` 会把 `纪要编号` 加入 affectedColumns；短 `纪要` 只返回 `LENGTH_VIOLATION`，不再返回 `NOT_NULL_VIOLATION`。
- 过长测试纪要 645 字返回 `LENGTH_VIOLATION` 大于 600，说明上下限仍生效；改用 480 字纪要后可通过。

**实际写入与清理：**
- `行动建议` 写入结果：`ok=true`，实际插入 row `row_id=2`、`选项=B`、`死亡风险=低`、`复苏风险=无`。
- `事件纪要` 写入结果：`ok=true`，自动生成 `纪要编号=SP0001`，纪要长度 480。
- 随后分别用 `deleteRow` 清理 `行动建议 row_id=2` 与 `事件纪要 code_index=SP0001`，两个删除均 `ok=true`。
- 清理后 `行动建议` 与 `事件纪要` 行数均恢复为 0，未发现 `Browser smoke` 残留。

**下一步：** 进入 v6.20 发布同步准备。必须先让卡内资源 URL 指向包含第 9 步修复的新 dist，再做 CDN smoke 与发布版真页 smoke；否则旧 CDN 运行时会继续表现为第 8 步 WARN。

---

## 2026-06-12 CST（会话7）：第 9 步遗留项分流代码处理完成

**状态：** 用户要求完成第 9 步。当前已完成代码侧分流、本地回归与构建，尚未做真页开发版 smoke，也未发布 v6.20。

**处理范围：**
- 固定行表 `行动建议` / `检定建议` 的空表 `match.row_id` 未命中：在执行层只对有 `row_id INTEGER PRIMARY KEY` 且 DDL 能解析出固定范围的表启用兜底。若 `updateCell` 找不到目标行、`match.row_id` 在允许范围内、当前表确实不存在该行，则把完整字段的计划提升为 `insertRow`，并把 `row_id` 写入 data。字段不完整仍按 `NOT_NULL_VIOLATION` 拒绝。
- `事件纪要` 缺少 `纪要编号/code_index`：`insertRow` 时若未提供，执行层自动根据现有 `SP0001/SP0002...` 生成下一个编号。
- `事件纪要.纪要` 长度小于 200：继续保留 `LENGTH_VIOLATION`，不自动扩写，避免执行层伪造未发生的剧情事实。

**已修改文件：**
- `src/神秘复苏模拟器/脚本/数据库前端/table-change-adapter.ts`
- `scripts/verify-table-change-adapter.mjs`
- `dist/神秘复苏模拟器/脚本/数据库前端/index.js`（由 `pnpm build` 重新生成）

**本地验证：**
- `node scripts\verify-table-change-adapter.mjs`：通过。
- `node scripts\verify-sql-debug-regressions.mjs`：通过；仅有 Node SQLite experimental warning，不阻断。
- `pnpm build`：沙箱内首次因 webpack 子进程 `spawn EPERM` 失败；提升权限重跑成功。构建有数据库前端 bundle 体积 warning：`index.js (246 KiB)` 超过 244 KiB，不阻断。

**下一步：** 进行不触发 AI 的真页开发版 smoke / 手动最小计划验证，再决定是否发布 v6.20。验证重点是空固定行表提升 insert、`事件纪要` 自动补 `SP000N`、短纪要继续预检失败。

---

## 2026-06-12 CST（会话6）：第 8 步 v6.19 发布后观察与日志复核完成

**状态：** 用户要求继续完成第 8 步。当前只做发布后只读观察与日志复核，未手动触发 `triggerUpdate()`，因为当前运行会话里已经存在实际发布后 CRUD 触发日志，继续触发会调用 AI、写库并可能造成限流噪声。

**真页运行状态：**
- 酒馆真页仍为 `http://127.0.0.1:8000/`，当前标题 `SillyTavern`。
- 当前发布版运行 marker 为 `mfrs-crud-p1-rowid-batch-6-19`。
- 运行时 `fillMode=ai_crud_plan`，`AutoCardUpdaterAPI` 与 `MysteryDatabaseFrontend` 均存在。
- IndexedDB settings 只读复核仅输出非敏感字段：`storageMode=sqlite`、`fillMode=ai_crud_plan`、`hasApiKey=true`、`hasApiUrl=true`；未读取或输出 API key/API URL 具体值。

**SP 运行日志面板：**
- 日志来源确认为当前会话内存环形缓冲区：`vendor/shujuku-sp-fork/index.js` 的 `getAllLogs()` 从闭包内 `_buffer` 读取，未挂到 `window`，不是持久化历史日志文件。
- 已打开 `MysteryDatabaseFrontend` 高级工具日志面板；面板状态为实时更新，当前显示 `2 / 2` 条日志，0 条 ERROR，2 条 WARN。
- 未发现 v6.19 P1 旧致命类异常复现：`API_MUTATION_FAILED=0`、`CHECK constraint failed=0`、`Too Many Requests=0`、`JSON.parse=0`、`AI回复过短=0`。
- 当前 WARN 属于计划质量/预检类：`ROW_NOT_FOUND`（行动建议/检定建议 match 未命中）、`NOT_NULL_VIOLATION`（事件纪要缺少纪要编号）、`LENGTH_VIOLATION`（事件纪要纪要长度小于 200）。
- 正向信号：出现 `[CRUD 原子批次容错] 1/10 条操作失败，已跳过`，说明 v6.19 的批次容错已经在真实发布后会话里生效，单条失败没有拖垮整批。

**结论：** 第 8 步发布后观察完成。v6.19 发布资源链路与运行 marker 正确，旧 P1 类异常未复现；剩余问题不再是 row_id/CHECK/整批回滚类发布阻断，而是 AI 计划质量与表约束预检提示需要后续分流处理。

**下一步：** 进入后续实际游玩观察/第 9 步遗留项分流；优先处理固定行表 match 未命中，以及事件纪要必填字段、长度约束的计划生成质量。

---

## 2026-06-12 CST（会话5）：v6.19 发布收口 1-6 完成

**状态：** 用户要求完成发布收口 1-6。当前发布版同步、提交推送、tag、CDN smoke 与酒馆真页发布版 smoke 均已完成。

**发布同步：**
- `scripts/publish-card.mjs` 已更新为 `CDN_REF=76af2775ffefc2b6b04c516f05fd2bf1be22185c`、`CDN_CACHE_VERSION=phase131-crud-p1-rowid-batch-6-19`、`releaseVersion=6.19`。
- `pnpm build` 沙箱内因 webpack 子进程 `spawn EPERM` 失败，提升权限后成功。
- `pnpm run publish-card -- 神秘复苏模拟器发布版` 沙箱内首次复制 PNG `EPERM`，提升权限重跑成功。
- 发布版 `index.yaml` 确认为 `6.19`，6 个资源 URL 指向 `76af2775ffefc2b6b04c516f05fd2bf1be22185c`，cache 为 `phase131-crud-p1-rowid-batch-6-19`，无旧 hash/cache 或本地链接残留。
- 发布版 PNG `chara` 与 `ccv3` 均确认含 `6.19`、`76af2775ffefc2b6b04c516f05fd2bf1be22185c`、`phase131-crud-p1-rowid-batch-6-19`，且无 `6.18`、`77b510a`、`phase130`、本地链接残留。

**提交与远端：**
- 精确提交发布文件：`1d38950 release: publish v6.19 card`。
- 仅提交 4 个文件：`scripts/publish-card.mjs`、发布版 `index.yaml`、发布版 `神秘复苏模拟器.png`、发布版 `神秘复苏模拟器发布版.png`。
- 已推送 `git push origin main`；`origin/main=1d389501a88f9919556668247fc766bc75a0163f`。
- GitHub tag `v0.0.129` 指向 `1d38950`；本次未出现额外 `[bot] bundle` 提交。

**CDN smoke：**
- release YAML、release PNG、状态栏 HTML、变量结构 JS、界面美化 JS、固定状态栏 JS、数据库 JS、数据库前端 JS 均返回 200。
- release YAML 含 `6.19` 与 `phase131-crud-p1-rowid-batch-6-19`。
- 数据库 JS 与数据库前端 JS 均含 `phase131-crud-p1-rowid-batch-6-19` 与 marker `mfrs-crud-p1-rowid-batch-6-19`。

**酒馆真页发布版 smoke：**
- 通过 `npx agent-browser --cdp 9222` 连接 `http://127.0.0.1:8000/`。
- 当前角色已切到 `神秘复苏模拟器发布版`（chid `3`，avatar `神秘复苏模拟器发布版.png`）。
- `AutoCardUpdaterAPI` 与 `MysteryDatabaseFrontend` 均已挂载；运行 marker 为 `mfrs-crud-p1-rowid-batch-6-19`；`AutoCardUpdaterAPI.getFillMode()` 为 `ai_crud_plan`。
- IndexedDB settings 只读检查仅输出非敏感字段：`storageMode=sqlite`、`fillMode=ai_crud_plan`；确认存在 API key 但未读取或输出值。
- Network 记录确认 5 个项目脚本从 `76af2775ffefc2b6b04c516f05fd2bf1be22185c` + `phase131-crud-p1-rowid-batch-6-19` 加载为 200，vendor 从 `f88460d97127f3a16ee3c332b0631929541d7bdf` + `phase131-crud-p1-rowid-batch-6-19` 加载为 200。

**工作区注意：**
- 保留无关 dirty 文件不动，包括 `.claude/worktrees/**`、日志/截图、删除的 JSON、`dist/神秘复苏模拟器/界面/状态栏/index.html` 等。
- `.git/index.lock` 仍可能出现残留警告；如后续需要 git 写操作，先确认没有 git 进程，再只处理 `.git/index.lock`。

**下一步：** v6.19 进入发布后观察；重点关注实际游玩中的 prompt 瘦身、CRUD 限流冷却和 SP 运行日志面板。

---

## 2026-06-12 CST（会话4）：第 7 步 native 模式回归通过，已切回 sqlite

**状态：** 用户要求继续完成第 7 步。当前第 7 步已完成，下一步进入 v6.19 最终发布、发布版同步与 CDN smoke。

**环境确认：**
- 酒馆真页 `http://127.0.0.1:8000/`，CDP `9222`。
- 运行 marker：`mfrs-crud-p1-rowid-batch-6-19`。
- `AutoCardUpdaterAPI` 与 `MysteryDatabaseFrontend` 均已挂载。
- `fillMode` 与 `AutoCardUpdaterAPI.getFillMode()` 均为 `ai_crud_plan`。

**native 切换：**
- 通过设置 UI 选择 `原生模式 (JSON/DSL)`，并点击确认弹窗 `仅切换模式`。
- IndexedDB 只读确认 `storageMode=native` 后才开始回归。
- 直接写 IndexedDB settings 后刷新不可靠；页面/角色上下文会回到 sqlite 或运行时状态未真正切换，后续必须优先通过 UI 确认切换。

**native 回归结果：**
- 普通表 `人物`：`insertRow` 写入 `NativeRegression_1781235793990`，`updateCell` 更新 `已知情报=NativeRegression_update_confirmed_1781235793990`，`deleteRow` 删除成功；最终 `sheet_characters` 行数回到 0，无 `NativeRegression_` 残留。
- 固定行表 `行动建议`：显式 `row_id=1` 的 `insertRow` 返回 `ok=true`，随后 `updateCell` 更新 `思路=NativeRegression_action_updated`、`死亡风险=中`，最后 `deleteRow` 删除成功；最终 `sheet_action_suggestions` 行数回到 0，无 `NativeRegression` 残留。
- 验证后通过设置 UI 选择 `SQLite 模式 (SQL)` 并点击 `仅切换模式`，最终只读确认 `storageMode=sqlite`、`fillMode=ai_crud_plan`、marker 不变、测试残留为空。

**工具现象：**
- `agent-browser eval` 在部分较长 `applyTableChangePlan` mutation 返回阶段出现 CDP 读超时 `os error 10060`，但独立只读导出确认 mutation 已实际落盘。
- 后续这类真页 CRUD 回归宜拆成“单个 mutation + 独立只读验证”，不要只依赖一次长脚本返回。

**下一步：**
1. 发布 v6.19 最终版。
2. 同步发布版 `神秘复苏模拟器发布版`。
3. 精确提交并推送发布结果。
4. CDN smoke + 发布版真页 smoke。

---

## 2026-06-11 CST（会话3续）：任务 1-6 完成，开发版卡已指向 P1 bundle

**状态：** 用户要求的任务清单 1-6 已完成。当前停在真页验证之前。

**完成内容：**
- 确认远端多出的提交 `1a72c82 [bot] bundle` 只更新开发版 PNG；本地 PNG blob 与远端一致后，已对齐本地 `main`。
- `pnpm build` 成功。
- 资源修复提交并推送：`f88460d fix: tolerate crud batch failures and explicit row_id`，tag `v0.0.126`。
- CI 没有额外 bot commit，但已打 tag，说明 build 后无新差异。
- 发现 loader 仍硬编码旧 vendor `c3e5a70/phase130`，因此追加 loader 回填提交：`3f92489 release: point v6.19 loaders to P1 resource`，tag `v0.0.127`。
- 开发版卡 repoint 提交：`97050d2 release: repoint v6.19 dev card to P1 bundle`。
- CI 生成最终 bundle：`76af277 [bot] bundle`，tag `v0.0.128`，已 fast-forward 到本地 `main`。

**当前资源口径：**
- 开发版卡 7 个 load URL 指向 `3f9248973f5ee9d33e89fb72cf0bcfa2037a4a72`。
- loader 内部 vendor URL 指向 `f88460d97127f3a16ee3c332b0631929541d7bdf`。
- cache：`phase131-crud-p1-rowid-batch-6-19`。
- marker：`mfrs-crud-p1-rowid-batch-6-19`。

**下一步：**
1. 真页确认开发版卡加载 `76af277`/`phase131` 资源与 `mfrs-crud-p1-rowid-batch-6-19` marker。
2. 记录 SP 运行日志基线时间戳。
3. 真页重测完整 CRUD 链路，固定行表必须复查行数真正落盘。
4. native 模式回归。

---

## 2026-06-11 CST（会话3续）：静态 gate 通过，下一步 pnpm build

**状态：** A 路线第一步已完成。当前停在 `pnpm build` 之前。

**已执行静态 gate：**
- `git diff --check`：通过，无输出。
- `node --check vendor/shujuku-sp-fork/index.js`：通过，无输出。
- `node scripts/verify-sql-debug-regressions.mjs`：通过，输出 `[ok] SQL Debug regressions verified...`；仅有 Node SQLite experimental warning，不阻断。

**下一步：**
1. 运行 `pnpm build`，把三组 P1 修复打进 `dist`。
2. 复查 `git status --short --branch` 与 `git diff --stat`，确认只精确提交 vendor、adapter、必要 dist 与 planning 更新。
3. 提交、推送，等待 GitHub Actions 生成新 bundle。
4. repoint 开发版卡 load URL 到新 bundle 后再真页验证。

---

## 2026-06-11 CST（会话3）：P1 根因彻底定位 — 三组修复未提交，真页跑旧 bundle

**状态：** 根因 100% 确认。决定走 A 路线（静态 gate → build → 推送 → repoint 开发版卡 → 真页验证）。当前停在静态 gate 之前，等待恢复后继续。

**决定性发现（推翻前两会话的"测试数据不完整"判断）：**
真页 evaluate 直接 dump 运行中的 `insertRow` 源码，确认**页面加载的 bundle 是旧版 vendor `a4f5aa3`（v6.18），不含任何 P1 修复**。线上代码无条件 `if (englishColName === 'row_id' || colName === 'row_id') continue;` 总是跳过 row_id。所以：
- `check_suggestions` 失败：row_id 被跳过 → 自增越界 `CHECK(row_id BETWEEN 1 AND 5)`
- `action_suggestions` 返回 1 是假象：复查行数仍为 0，未真正落盘
- **前两会话一直在读本地源码（含修复）却测旧 bundle，因此反复误判**

**本地工作区三组未提交修复（`git diff` 实证，均只在工作区、未进任何 commit）：**

1. **vendor `applyPlans` 批次容错改造（index.js:36206 起）** — findings.md "原子批次一损俱损"总闸的真正修复：
   - 旧：任一计划 throw → 整批回滚 → 0 落盘
   - 新：单条失败记入 `failedPlans` 并 continue；仅当**全失败且 modifiedKeySet 为空**才 throw；部分成功正常 persist
2. **vendor `insertRow` 的 `hasExplicitRowId`（index.js:52389 起）** — 显式传 row_id 时不跳过该列，满足固定行表 CHECK
3. **adapter `toApiInsertValues`（table-change-adapter.ts:318）** — `if (column.primaryKey && values[column.header] == null) delete` — 仅在值为 null 时删 primaryKey，保留 AI 显式传入的 row_id

**重要修正：** vendor 最新提交是 `a4f5aa3`（v6.18）；上一会话 RESUME 写的"P0+P2 已推送 9bc5d47"只涉及 adapter 那条线（`9bc5d47` 是 adapter 提交），**vendor 的两处修复（批次容错 + hasExplicitRowId）从未提交**。`git log vendor/` 印证。

**待验证风险：** 三处修复**全部未经真页验证**（之前测的都是旧代码）。走 A 即用"开发版卡加载新 bundle"作为开发版验证环节。

**下一步（恢复后从这里继续）：**
1. 静态 gate：`git diff --check`、`node --check vendor/shujuku-sp-fork/index.js`、`node scripts/verify-sql-debug-regressions.mjs`
2. `pnpm build` 把三处修复打进 dist
3. 提交 vendor + adapter + dist，推送，等 GitHub Actions 出新 bundle
4. repoint 开发版卡 load URL 到新 bundle commit
5. 真页重测：完整数据走 CRUD 全链路，确认 4 张固定行表 + 批次容错；复查行数真正落盘（不能只看返回值）
6. native 模式回归
7. 攒齐后发布 v6.19 最终版 + 发布版同步 + CDN smoke

---

## 2026-06-11 CST（会话2）：P1 排查行动建议/检定建议 insertRow 返回 -1 — 根因定位中

**状态：** 代码分析完成，根因方向已锁定，尚未修改代码。

**已完成分析：**

1. **P1 修复回顾：** 上一会话在两处做了修改：
   - `table-change-adapter.ts:toApiInsertValues()` — 原逻辑 `if (column.primaryKey) delete values[column.header]` 改为 `if (column.primaryKey && values[column.header] == null) delete values[column.header]`，即：AI plan.data 里显式带了 row_id 值就保留传给 vendor。
   - `vendor/shujuku-sp-fork/index.js:insertRow` SQLite 路径 — 新增 `hasExplicitRowId` 检测，显式传入时不跳过 row_id 列。

2. **全局状态/玩家状态通过原因：** 测试时手动传了完整 data（含 row_id=1），toApiInsertValues 保留了它，vendor 正确写入 INSERT SQL 带 row_id=1，CHECK(row_id=1) 通过。

3. **行动建议/检定建议失败的关键线索（待验证）：**
   - `行动建议` DDL: `CHECK(row_id BETWEEN 1 AND 4)`，JSON headers 含 `"row_id"`
   - `检定建议` DDL: `CHECK(row_id BETWEEN 1 AND 5)`，JSON headers 含 `"row_id"`
   - vendor name mapper 在 12499 行显式跳过 row_id：`if (comment && colName !== 'row_id')`
   - 因此 `reverseColumnMap` 没有 `action_suggestions.row_id` 的映射
   - `getChineseColumnName('action_suggestions', 'row_id')` fallback 返回 `'row_id'`（原样）
   - JSON headers 第一列确实是字符串 `"row_id"`
   - 所以 `!headers.includes(chineseColName)` → `!headers.includes('row_id')` 应该为 false（即通过）
   - **headers 里有 "row_id"，不应被过滤掉** — 这排除了 name mapper 问题

4. **待排查的下一步假设：**
   - 假设 A：`行动建议` 有其他 NOT NULL + CHECK 列（如 option_key IN('A','B','C','D')），如果 AI plan.data 里的值违反了这些约束，SQLite INSERT 会失败
   - 假设 B：上一会话的测试是否只传了 `{row_id: 1}` 而没传其余 NOT NULL 列？如果是，SQL 会报 NOT NULL 约束失败
   - 假设 C：adapter 的 `validateColumnValues` 预检在 insertRow 时对 NOT NULL 列做了什么？可能 errors 不为空就中止了
   - **需要确认：上一会话真页测试时传入的完整 data 内容**

**根因方向判断：**
- 高概率是**假设 B** — 上一会话测试 `行动建议` insertRow 时可能只传了 `{row_id: 1}` 缺少其他 NOT NULL 列（option_key, idea_text 等），导致 SQLite 报 NOT NULL constraint failed 或 CHECK constraint failed
- 也可能是 adapter 的 `validateColumnValues` 检测到缺少 NOT NULL 列后在 errors 里标记了错误，而 `applyTableChangePlan` 在有 errors 时拒绝执行

**下一步行动：**
1. 读取 `applyTableChangePlan` 中 errors 非空时的处理逻辑 — 确认是否会阻止执行
2. 确认真实场景中 AI 生成的 insertRow plan.data 是否会包含所有必需列
3. 如果根因是测试数据不完整（只传 row_id），则 P1 修复本身可能已正确；需要用完整数据重新验证
4. 如果根因是 adapter 预检阻止了执行，则需调整预检逻辑对 insertRow 的容错

---

## 2026-06-11 CST：P1 修复代码完成，真页部分验证通过

**状态：** 代码已写入、构建通过。真页部分验证完成，部分表仍失败待排查。

**P1 修复内容（固定行表 insertRow 撞 CHECK 约束）：**
- `table-change-adapter.ts:toApiInsertValues()` — 新增逻辑：当固定行表（primaryKey 列有 maxValue 约束且 maxValue 小）时保留 row_id 值传入 vendor
- `vendor/shujuku-sp-fork/index.js:insertRow` — SQLite 路径新增逻辑：当 normalizedData 显式提供 row_id 值时不跳过，写入 INSERT SQL

**真页验证结果：**
- SQLite 模式已确认激活（fillMode=ai_crud_plan）
- `全局状态` insertRow 带 row_id=1 → 返回 1（成功，CHECK(row_id=1) 通过）
- `玩家状态` insertRow 带 row_id=1 → 返回 1（成功）
- `行动建议` insertRow 带 row_id=1 → 返回 -1（失败，待排查）
- `检定建议` insertRow 带 row_id=1 → 返回 -1（失败，待排查）
- triggerUpdate 全量测试：CRUD 3次尝试均失败（第1次 ROW_NOT_FOUND 行动建议 match 未命中；第2-3次 全局状态 insertRow 执行失败）

**下一步：**
- 任务#1：排查行动建议/检定建议 insertRow 返回 -1 的原因（列名映射？adapter 传参路径？）
- 任务#2：修复后重新验证
- 后续：native 回归 → P3 → 提交推送 → 发布

**行为修正记录：** 已写入 feedback memory — 绝不输出"让我查看X"类裸文本中间步骤然后停住；每次回复必须带工具调用直到有最终结论。

---

## 2026-06-10 CST：v6.19 P0+P2 CRUD adapter fixes 已推送

**来源会话：** `4af5b960-99c3-4612-904b-cb2c88ec99c9`

**已完成：**
- ACU 数据库同步问题诊断：对比 native vs SQL 模式日志，定位 14 张表中玩家状态等表在 SQL 模式下不同步的原因
- P0+P2 CRUD adapter 修复代码完成并推送
- GitHub Actions bundle commit 确认通过
- 开发版卡通过重新导入 PNG 更新
- 提交链：`9bc5d47 feat: v6.19 P0+P2 CRUD adapter fixes` → `6ba438a release: repoint v6.19 dev card load URLs to bundle 9bc5d47`

**未完成：**
- sqlite 运行时 provider 验证（多次被 Claude Code 空转打断）
- P1 修复（待定）
- P3 修复（待定）
- 攒齐后发布 v6.19 最终版

---

## 2026-06-10 CST：v6.18 发布版真页 smoke 通过

- 真页当前激活角色卡即 **神秘复苏模拟器发布版**，marker `mfrs-crud-param-binding-6-18`（window 与 API 双确认）。
- 资源加载链路确认：卡 → dist loader@`77b510a`（?v=phase130）→ vendor@`c3e5a70`，network 实测命中。
- `AutoCardUpdaterAPI` 83 个成员；`getFillMode()='ai_crud_plan'`、`setFillMode`/`triggerUpdate`/`updateCell`/`insertRow`/`deleteRow` 均在。
- console 仅 `[TavernSync] ws://localhost:6620` 重连报错（watch 已停所致，开发环境噪音，玩家无此脚本），无数据库/资源加载错误。
- v6.18 发布链路至此全部收口。

---

## 2026-06-10 CST：v6.18 发布完成

- 资源提交 `a4f5aa3` → CI bundle `c3e5a70` → loader 回填 `6f42f4a` → CI bundle `77b510a` → 发布 `3b4fa4c`+`8d28fcc`。
- CDN smoke 通过：状态栏 html / 数据库 loader / 数据库前端 loader / vendor 4 个 URL 全 200。
- 修复⑥（`_inlineSqlParams`）已上线。

---

## 2026-06-10 CST：第 1 步重跑验收 — 修复⑥参数绑定 bug，真页填表成功

- 根因：`SqlTableService.executeMutation` 参数绑定丢失，`?` 按 NULL 求值 → 全部 CRUD 0 行。
- 修复：`_inlineSqlParams` 安全内插。
- 真页验收：`triggerUpdate()` 全量填表 success=true，8 张表写入，首次即成功。
- 对比上轮 0/21 → 本轮 1/1。

---

完整历史流水见：
- `planning_archive_2026-06/2026-06-08-post-v6-13-before-planning-optimization/`
- 旧 progress.md 条目已归档
