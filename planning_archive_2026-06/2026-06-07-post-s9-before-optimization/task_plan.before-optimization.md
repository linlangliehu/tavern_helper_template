# Task Plan: 神秘复苏模拟器角色卡优化

## RESUME HERE - 2026-06-06 23:00 CST - 对话测试与发布同步

**Current status:** in_progress。本轮按用户要求使用七个 Subagents 协作：读取 planning、9222 酒馆对话测试、问题清单、修复、新对话复测、持续记录、SP·数据库 III 日志/SQL/推演选项审查。

**目标:** 对开发版“神秘复苏模拟器”进行真实酒馆对话测试；如发现问题，记录、分析并修复；修复后新开对话复测；确认无问题后同步到“神秘复苏模拟器发布版”，提交并推送 GitHub。

**基线:** 上一轮 6.10 已完成并推送，`HEAD == origin/main == aaf14dc64e3f080528c4bcb42c5afaba9fee418a`。9222 页面历史日志中的 `check_suggestions ... VALUES -> incomplete input` 先视为历史残留，只有新一轮生成后出现新时间戳才算复发。P1 另见测试前日志基线：22:32:29 已存在 `UPDATE controlled_ghosts SET cost_text = ... , WHERE ghost_code = ... -> near "WHERE": syntax error`，也先作为清空前历史基线处理。

### 本轮阶段清单
- [x] P0：读取 planning 三文件并确认当前基线
- [x] P1：用 `npx agent-browser --cdp 9222` 进入 `http://127.0.0.1:8000/`，确认当前角色卡、版本 marker、运行日志基线
- [x] P2：对开发版“神秘复苏模拟器”执行一轮对话测试，记录输入、输出、日志、SQL、推演选项表现
- [x] P3：整理测试问题清单，按严重度拆分为可执行修复任务
- [x] P4：按问题清单修复开发版
- [x] P5：执行静态检查、构建、回归脚本
- [ ] P6：新开对话复测开发版，确认问题不复发
- [ ] P7：审查 SP·数据库 III 高级工具运行日志、SQL、推演选项
- [ ] P8：同步修复到“神秘复苏模拟器发布版”
- [ ] P9：构建、发布卡验证、提交并推送远程 GitHub

### 本轮问题清单

#### ISSUE-001：AI SQL `UPDATE ... SET ..., WHERE ...` 尾逗号导致 SQLite 语法错误

- **严重度**：P1 严重
- **状态**：待复测
- **来源 Agent**：第二 Agent 对话测试 / 主线程 P1 基线
- **影响范围**：SQL 模式 / SP·数据库 III 运行日志 / 驾驭厉鬼表写入
- **现象**：运行日志 22:32:29 出现 `UPDATE controlled_ghosts SET cost_text = '左臂皮肤纸质化，总复苏风险增加', WHERE ghost_code = '鬼档案' -> near "WHERE": syntax error`。
- **判断**：本轮手动测试输入没有新增该错误，但当前会话曾真实触发过该 SQL 形态；它不是 6.10 已修的 `VALUES -> incomplete input`，而是尾逗号直接接 `WHERE` 的新容错缺口。
- **修复方向**：在 SQL 执行前归一化阶段保守删除 `SET` 子句末尾、`WHERE` 前的单个尾逗号；数据库模板同步提示禁止 `WHERE` 前尾逗号；回归脚本加入 fixture。
- **修复落点**：`vendor/shujuku-sp-fork/index.js` 的 `tryNormalizeUpdateValues()` 已将 `SET` 尾逗号清理视为变更；开发版/发布版 `神秘复苏表格SQL_v1.json` 已补 `WHERE` 前不能写逗号的提示；`scripts/verify-sql-debug-regressions.mjs` 已加入内存 SQLite fixture。
- **验收**：`normalizeStatementValues()` 后该 SQL 可在内存 SQLite 执行；真页新一轮生成后不出现新时间戳 `near "WHERE"` / `ERROR SQL Mode` / `ERROR SqlTableService`。

#### ISSUE-002：`chronicle_text` 长度约束失败待确认

- **严重度**：P2 中等
- **状态**：观察 / 待复测
- **来源 Agent**：第七 Agent console 审查
- **影响范围**：事件纪要 / `chronicle`
- **现象**：console 曾出现 `chronicle_text -> CHECK constraint failed: LENGTH(chronicle_text) >= 200 AND LENGTH(chronicle_text) <= 600`，但 SP 运行日志未出现可靠新时间戳。
- **判断**：当前两份 SQL 模板已经明确 `chronicle_text` 必须 200-600 字且不足 200 字禁止输出 SQL；本轮先把该约束纳入回归，防止模板退化。若新对话复测中仍出现新时间戳失败，再继续加执行前拦截或字段错位诊断。

## RESUME HERE - 2026-06-06 22:20 CST - SQL incomplete VALUES 6.10

**Current outcome:** the latest SQL error observed in the 9222 SillyTavern page was `INSERT OR REPLACE INTO check_suggestions (row_id, display_text, check_type, check_basis, dice_command) VALUES -> incomplete input`. This is not the old `near "INSERT"` boundary bug. It is a newer incomplete-final-statement bug where the model output stopped at bare `VALUES`.

**Root cause:** the AI produced a truncated `INSERT/REPLACE ... VALUES` statement, and the 6.9 SQL parser accepted it as complete because the statement contained `VALUES`, had balanced parentheses, and did not end with `,` or `(`. SQLite then correctly reported `incomplete input`.

**Fix and release state:** complete and pushed. Parser fix commit `5ec1aa67b1b082fe62114884bd72d079aefbf913`; loader backfill commit `66e4c2e4a9bb353325751e6eefbb719adfd61c33`; release commit `aaf14dc64e3f080528c4bcb42c5afaba9fee418a`. Local `HEAD == origin/main == aaf14dc64e3f080528c4bcb42c5afaba9fee418a`. Release version is `6.10`; cache/version marker is `phase122-incomplete-values-6-10`; runtime marker is `mfrs-incomplete-values-6-10`.

**Browser state:** `npx agent-browser --cdp 9222` connects to `http://127.0.0.1:8000/` / `SillyTavern`. Current page marker reads `mfrs-incomplete-values-6-10`, so the 6.10 loader is active. The visible log panel still shows historical error rows at `21:22:39`, `21:23:00`, and `21:23:20`; all are the same `check_suggestions ... VALUES -> incomplete input` failure. Treat these as historical unless a new row appears after clearing the log or triggering a new generation.

**Verification already done:** `node --check vendor/shujuku-sp-fork/index.js`, `node --check scripts/verify-sql-debug-regressions.mjs`, `git diff --check`, and `node scripts/verify-sql-debug-regressions.mjs` passed. `npm run build` needed sandbox-external execution because of the known Windows `spawn EPERM`, then passed. Release YAML/PNG metadata and CDN resources were verified: YAML/loader/frontend/vendor all returned 200 and contain the new hash/cache/guard.

**Worktree boundary:** do not treat existing unrelated dirty files as part of the 6.10 release. Current known unrelated state includes `M dist/神秘复苏模拟器/界面/状态栏/index.html` plus many untracked planning, screenshot, backup, and temporary Chrome files. The 6.10 release-related files are clean after commit/push.

**Next safe continuation:** if asked to verify again, use `agent-browser --cdp 9222`, clear the running log or note the current latest timestamp, trigger one new generation/action, and check whether any new `incomplete input` row appears after that timestamp. If no new row appears, the remaining visible log is historical residue.

## 项目运行流程速览（planning 常驻）

完整流程见 `findings.md` 顶部「项目运行流程常驻参考」。每次恢复任务时先记住这条主链路：开发版内容在 `src/神秘复苏模拟器/`，发布版内容在 `src/神秘复苏模拟器发布版/`；实际首屏开局入口不是只看欢迎页 txt，而是 `src/神秘复苏模拟器/index.yaml` 的 `[显示]渲染神秘复苏开局页` 正则片段。该片段先渲染静态 `<select data-mfrs=anchor>`，再由 `src/神秘复苏模拟器/脚本/界面美化/index.ts` 打包后的 `dist/.../界面美化/index.js` 增强成三级 `.mfrs-dropdown`。

常用执行链路：修改开发版源码/世界书/`index.yaml` -> `npm run build` 生成 dist 与开发版 PNG -> 如需发布，先提交并推送包含新版 dist 的资源提交 -> 更新 `scripts/publish-card.mjs` 的 `CDN_REF` 与 `CDN_CACHE_VERSION` -> `npm run publish-card -- 神秘复苏模拟器发布版` 镜像并打包发布版 PNG -> 验证发布版 `index.yaml` 和 PNG `chara/ccv3` 元数据 -> 提交并推送发布提交。`npm run build` 在沙盒内可能因已知 `spawn EPERM` 失败，需要按权限流程沙盒外重跑。

关键验证：`git diff --check`；发布版 `版本: '4.0'`；55 个开局节点的 `name|time|loc|phase|pressure|intel|boundary` 七字段；`当前时间`、`mfrs-dropdown`、强外挂文案、后期节点关键字；PNG 需解码 `chara/ccv3` 的 base64 JSON 后再搜关键字；真实页复测用 CDP 连接 `127.0.0.1:9222` 的 SillyTavern 页面。

SQL/数据库问题验收的常驻口径：`9222` 是 Chrome CDP 端口，酒馆页面是 `http://127.0.0.1:8000/`，`localhost:5500` 仅用于本地静态资源/直接 import 验证。SQL 报错以 SillyTavern 左下角菜单 -> `SP·数据库 III` -> `高级工具` -> `运行日志` 为准；不要只看正文可见计数、console 或页面 body 文本。复测时先记录/清空该运行日志的最新时间戳，再以新时间戳后的日志行判断是否复发。

## 当前阶段：多 agent 协作修复 SQL `near "INSERT"` 复发（2026-06-06·立项记录）

**状态**：本地修复与验证完成；尚未提交、推送或发布。9222 真页仍加载旧 CDN vendor，因此日志面板中的历史/当前旧运行态 `near "INSERT"` 仍可见，需发布或回填新 vendor hash 后再做自然加载 smoke。

**目标**：用户要求通过 `127.0.0.1:9222` Chrome 观察 `http://127.0.0.1:8000/` 酒馆界面，修复日志中的 SQL `near "INSERT"` 报错，并用多 agent 协作推进。

**分工**：
- 报错解读 Agent：只读日志、DOM、console 与相关源码，输出错误原文、触发链路、最小复现 SQL 和疑似根因。
- 修复 Agent：限定在必要源码与回归脚本内修复，输出补丁策略和本地验证结果。
- Chrome DevTools MCP 测试 Agent：连接 9222 的 SillyTavern 真页，验证日志面板、数据库状态和 `near "INSERT"` 是否消失。
- planning-with-files 记录 Agent：只写 `task_plan.md`、`findings.md`、`progress.md`，记录目标、分工、基线和阶段状态。

**当前基线错误摘要**：本轮已观察到酒馆页日志面板仍有 `ERROR SQL Mode` / `ERROR SqlTableService`。核心错误为 `INSERT INTO chronicle (...) VALUES ...` 未完整闭合时拼入下一条 `INSERT OR REPLACE INTO check_suggestions (...)`，SQLite 在第二个 `INSERT` 附近报 `near "INSERT": syntax error`。可见页面上下文为 `SillyTavern`、`http://127.0.0.1:8000/`、角色 `神秘复苏模拟器`、`characterId=2`。

**本轮修复**：
- 报错解读 Agent 确认触发链路为 AI `<tableEdit>` SQL -> `extractSqlStatementsFromTableEdit_ACU()` -> SQL Mode `applyEdits()` -> `SqlTableService.applyEdits()` -> `splitSqlStatements()` -> SQLite `runBatch()`。
- 修复 Agent 在 `vendor/shujuku-sp-fork/index.js` 增加底层 `splitSqlStatements()` 残缺语句隔离：当前 SQL 未完整闭合且行首出现新的 SQL 起始时，丢弃残缺缓存并从新语句重开，避免 `chronicle` 残缺语句吞掉 `check_suggestions`。
- 既有上层 `extractSqlStatementsFromTableEdit_ACU()` 残缺语句边界修复继续保留；新回归在 `scripts/verify-sql-debug-regressions.mjs` 同时覆盖上层清洗和底层拆句。

**验证**：
- `node --check vendor/shujuku-sp-fork/index.js` 通过。
- `node --check scripts/verify-sql-debug-regressions.mjs` 通过。
- `git diff --check` 通过。
- `node scripts/verify-sql-debug-regressions.mjs` 通过，仅有 Node `node:sqlite` experimental warning。
- `npm run build` 沙箱内命中已知 Windows `spawn EPERM`；按权限流程沙箱外重跑成功，所有 webpack entry compiled successfully。
- CDP 复核 9222 真页当前仍为开发卡 `characterId=2`，运行 marker 为旧 `mfrs-sql-debug-regressions-6-7`，`dist/.../数据库/index.js` 仍指向旧 vendor 资源提交 `37a10c0817845c3276a1846d331f9c7d02efe39e`；因此页面日志仍有 `near "INSERT"` 不代表本地补丁未生效。

**边界**：本轮不提交、不推送、不发布；未更新 `scripts/publish-card.mjs` 的 `CDN_REF`/cache。若要让真页自然加载修复，需要走资源提交 -> 回填数据库 loader vendor hash/cache -> build -> publish-card -> 发布后 CDP smoke。

## 当前阶段：08:39/08:53 日志与截图复发修复（2026-06-06·本地完成，未发布）

**状态**：本地 complete；尚未提交、推送或走发布链路。

**问题拆分**：
- 推演选项重复：`<sp_choices>` 已正常渲染，但裸 `推演选项：` 兜底块没有被显示隐藏正则匹配。
- SQL `near "INSERT"`：残缺 `INSERT INTO chronicle ... VALUES` 未闭合时，解析器把下一条 `INSERT OR REPLACE INTO check_suggestions` 拼进同一语句。
- “妖魔没有出现”：当前卡内正式语义是 `厉鬼/驾驭厉鬼/鬼档案`。Debug 日志显示厉鬼档案相关表已触发；截图问题更像状态栏用 AI 面板字段 `鬼档案` 覆盖了结构化 `灵异资源.鬼拼图` / `驭鬼者状态.已驾驭厉鬼` 展示。

**修复**：
- 开发版与发布版 `index.yaml` 的 `[不发送]去除界面展示块`、`[显示]隐藏推演选项与状态面板` 已支持裸 `推演选项：` / `状态面板：`。
- `vendor/shujuku-sp-fork/index.js` 已修复残缺 SQL 遇到新 SQL 起始时的语句边界，并扩展旧纪要表名拦截到 `log_summary`、`simulation_summary`、`summary_logs`。
- `src/神秘复苏模拟器/界面/状态栏/App.vue` 已合并结构化资源摘要与正文状态面板字段，避免“鬼档案”泛称盖掉已驾驭厉鬼/鬼拼图。
- `scripts/verify-sql-debug-regressions.mjs` 已加入对应回归。

**验证**：
- `node --check vendor/shujuku-sp-fork/index.js` 通过。
- `node --check scripts/verify-sql-debug-regressions.mjs` 通过。
- `git diff --check` 通过。
- `node scripts/verify-sql-debug-regressions.mjs` 通过，仅有 Node `node:sqlite` experimental warning。
- `npm run build` 沙箱内命中已知 Windows `spawn EPERM`，沙箱外重跑成功，所有 webpack entry compiled successfully。

**边界**：本轮构建更新了状态栏 dist、开发版 PNG、发布版 PNG；根目录 `神秘复苏模拟器.png` 删除状态与未跟踪 planning/截图/备份/临时 Chrome 文件仍为既有工作区状态，未回滚。

## 当前阶段：推演选项点击交互修复（2026-06-06·已发布 6.8）

**状态**：complete。发布版已升到 `6.8`，`HEAD==origin/main==32e49c9482c4ed8ede59bae74480d0c154f6c031`。

**根因**：截图显示推演选项面板停在静态短标签状态，没有增强为可点击按钮。`enhanceChoicePanels()` 过早给 `.sp-panel-choices` 设置 `data-mfrs-choice-ready`，当选项 DOM 尚未解析完整时，后续 `MutationObserver` 会跳过重试。

**修复**：`src/神秘复苏模拟器/脚本/界面美化/index.ts` 已把 ready 标记挪到 `renderChoices(body, actions)` 成功之后；没有解析到选项或缺少 body 时不标记 ready，允许 DOM 完整后重新增强。

**验证与发布**：`npm run build` 成功，`git diff --check` 通过。资源提交 `1fe4322c828c6c425d4d9392acd5194fa01509c0` 已推送；发布提交 `32e49c9482c4ed8ede59bae74480d0c154f6c031` 已推送。`scripts/publish-card.mjs` 指向 `CDN_REF=1fe4322c828c6c425d4d9392acd5194fa01509c0`，cache 为 `phase120-choice-panel-interaction-6-8`，`releaseVersion=6.8`。

**边界**：本修复只影响界面美化的推演选项按钮增强与填入输入框逻辑；不触碰 SQL 模式、数据库模板、vendor、SQLite provider 或 SQL 预检/导出链路。session-catchup 检测到上一会话有“发布后浏览器 smoke”意图，但没有保留下可引用的 smoke 输出；如需要真实页按钮点击证据，应重新跑 CDP/浏览器 smoke。

## 当前阶段：SQL 日志问题修复（2026-06-05 立项·T0-T4 已完成）

**目标**：根据用户提供的 ACU SQL 日志与仪表盘概览，修复 SQL 模式下的表结构提示和填表失败，确保修复后不引入 14 表回退、SQLite 导出缺 sheet、MVU 真源语义混淆或发布链路残留。

**T0 基线（complete·2026-06-05）**：
- Git 基线：`main...origin/main` 同步，`HEAD==origin/main==ccfd7273799e2f5932294db42cd3d2e3bbce4da6`，`git describe` 为 `v0.0.71-dirty`。
- 发布基线：`scripts/publish-card.mjs` 为 `releaseVersion=6.5`、`CDN_REF=f7e2f64d70552f876c45d3315fc783b3334621ac`、`CDN_CACHE_VERSION=phase116-r2sql-settings-console-refresh`；发布版 `index.yaml` 为 `版本: '6.5'`。
- 工作区边界：当前仅确认 1 个 tracked diff：`dist/神秘复苏模拟器/界面/状态栏/index.html`（2 行变更）；另有既有未跟踪 planning、截图、备份、临时 Chrome 文件。本阶段不回滚、不提交这些无关项。
- 当前运行态：用户仪表盘显示当前存储模式为 SQLite；本 T0 未执行任何写入 SQL 或破坏性探测。
- 日志基线：`acu-logs-2026-06-05T07-03-29-165Z.json` 共 17 条，4 Error、13 Warn；9 条并发 API 回退警告；1 条 `玩家状态` DDL/表头不一致；`characters.row_id` 唯一约束失败重复记录 3 条；`chronicle_text` 长度约束失败重复记录 3 条；1 条 malformed/truncated command line。

### SQL 日志修复任务清单
- **T0：建立修复基线**（complete·不改业务代码）
  - 记录 Git/发布/运行态/日志统计。
  - 约束：不回滚既有无关 diff；不在真实玩家主存档里做破坏性 SQL 测试。
- **T1：修复 `玩家状态` 表头与 DDL 注释不一致**（complete）
  - 开发版与发布版数据库模板同步处理。
  - 优先保持物理列名 `death_risk` / `revival_risk` 不变，只校准表头或 DDL 注释。
  - Gate：仪表盘不再显示 `1/14 张表结构信息与表头不一致`。
- **T1 结果（2026-06-05）**：完成。开发版与发布版 `sheet_player_state` 的表头已改为 `死亡风险镜像` / `复苏风险镜像`，note/updateNode 也同步强调镜像语义；物理列名与 DDL 未改。
- **T2：修复人物表多行 INSERT 生成规则**（complete）
  - 禁止同一条多行 `VALUES` 中重复使用 `MAX(row_id)+1`。
  - 优先省略 `row_id` 并以 `name UNIQUE` 做 `ON CONFLICT(name) DO UPDATE` 幂等写入。
  - Gate：同批插入两个新人物不再出现 `UNIQUE constraint failed: characters.row_id`。
- **T2 结果（2026-06-05）**：完成。开发版与发布版 `sheet_characters` 的 init/insert 示例已改为省略 `row_id`，并使用 `ON CONFLICT(name) DO UPDATE`；SQL 模式通用说明也禁止同一多行 VALUES 重复 `MAX(row_id)+1`。
- **T3：修复事件纪要长度约束提示**（complete）
  - `chronicle_text` 必须 200-600 字，推荐 300-400 字；`summary` 维持 40 字以内。
  - 避免硬编码 `row_id=1` / `SP0001`，按现有最大值递增。
  - Gate：不再出现 `CHECK constraint failed: LENGTH(chronicle_text)`。
- **T3 结果（2026-06-05）**：完成。开发版与发布版 `sheet_chronicle` 已明确 200-600 字、推荐 300-400 字、不足 200 字禁止输出 SQL；示例改为按当前表递增生成 `row_id` 与 `code_index`。SQL 合并纪要默认 prompt 同步禁止低于 200 字和硬编码 `1/SP0001`。
- **T4：收紧 SQL 输出格式**（complete）
  - `<tableEdit>` 内只允许 SQL，不混入 Markdown 代码围栏、`</thought>`、`<content>` 等残片。
  - 可选代码兜底：解析前只提取 `<tableEdit>` 内部 SQL，并跳过非 SQL 开头行。
  - Gate：不再出现 `Skipping malformed or truncated command line`。
- **T4 结果（2026-06-05）**：完成。SQL 模式格式说明已禁止 markdown/`<content>`/`</thought>` 残片；vendor 解析层新增 SQL 内容清洗，在 SQLite 模式下会跳过 tableEdit 内 SQL 前后的包装残片，再交给 SQL provider。
- **T5：处理并发 API 配置警告**（complete·低风险配置项）
  - 二选一：补齐独立 API URL/模型，或关闭并发模式。
  - Gate：警告消失，或被明确标注为非阻塞 Warn。
- **T5 结果（2026-06-05）**：完成。并发模式缺独立 API 时只记录一次 Warn，后续同类回退降为 debug；仪表盘日志解释把“并发模式要求独立API/缺少独立API配置”归类为非阻塞配置提示，不再混入 SQL/API 失败判断。
- **T6：构建与静态校验**（complete）
  - `git diff --check`；若改 JS/vendor 则 `node --check`；必要时 `npm run build`。
  - Gate：构建产物不混入无关文件。
- **T6 结果（2026-06-05）**：完成。`node --check vendor/shujuku-sp-fork/index.js` 与 `git diff --check` 通过；`npm run build` 在沙盒内命中已知 Windows `spawn EPERM`，按权限流程沙盒外重跑成功，所有 webpack entry compiled successfully。diff 范围仍为两份数据库模板、vendor、两个数据库前端 dist，以及既有状态栏 dist 差异。
- **T7：隔离 SQL 回归测试**（complete·发布前隔离 gate 通过）
  - 在测试聊天/可恢复环境中验证 14 表、0 mismatch、人物幂等写入、纪要长度、三口径导出。
  - Gate：`getTableTemplate()`、`exportTableAsJson()`、`MysteryDatabaseFrontend.exportCurrentData()` 均保持 14 表。
- **T7 结果（2026-06-05）**：完成发布前隔离 gate。两份 SQL 模板均为 14 表、DDL 注释与表头 `ddlMismatch=0`；SQLite 内存库验证人物批量 upsert 不再冲 `row_id`，合格 `chronicle_text` 可插入，短纪要会被 CHECK 拦截；vendor 兜底函数与并发 API 提示降级逻辑均存在。CDP 只读对照显示当前真实发布页仍加载旧 marker `mfrs-r2sql-settings-console-refresh`，三口径为 14 表但 `玩家状态` 表头仍是旧的“死亡风险/复苏风险”，因此旧 CDN 页面仍会显示本轮待修 mismatch。
- **T8：仪表盘最终验收与发布判断**（complete·已发布 6.6）
  - 仪表盘无表结构 mismatch，新增 SQL 会话 0 Error。
  - 若需要发布，走既有 CDN hash/cache、PNG 元数据和真页 smoke 链路。
- **T8 结果（2026-06-05）**：完成发布链路并推送到 GitHub。最终 HEAD==origin/main==`f2ab050b60c3664e65c52dd1e574c04226a6bfbb`，发布版版本 `6.6`，`scripts/publish-card.mjs` 指向真实资源提交 `CDN_REF=a554ba8040b9c9804a0c55136c922d8716aa656d`、cache `phase118-sql-template-autocalibrate-6-6`。发布 YAML/PNG 均验证为新 hash/cache，错误 hash `a554ba88845e31772ee90f3d1fdfad5775512a39` 0 残留；CDN 数据库 loader 与数据库前端均 200。CDP 真页 smoke：发布卡 `characterId=3`，`getTableTemplate()`、`exportTableAsJson()`、`MysteryDatabaseFrontend.exportCurrentData()` 均 14 表，`missingNames=[]`、`mismatchNames=[]`，`玩家状态` 表头为 `死亡风险镜像/复苏风险镜像`。

## 上一阶段：发布版 SQLite 保留项清除（2026-06-05 立项·POST-5 修复已发布到 6.4·POST-8 定位完成·POST-9 UX 修复已发布到 6.5）

**目标**：清掉 6.3 发布后留下的 SQLite 完整 smoke 保留项。先找到不污染运行态的安全验证入口，再在发布版自然加载状态下完成 SQLite 可逆 smoke；只有复现明确 bug 时才进入代码修复。

**当前进度快照（2026-06-05）**：R2SQL-POST-0~9 任务清单已完成。最新发布版为 `6.5`，发布提交 `ccfd727` 已推送到 `origin/main`；资源提交为 `f7e2f64d70552f876c45d3315fc783b3334621ac`，vendor 修复提交为 `a41ab4483ce6f149fe19c03aebfead5dddceed2d`。真页最终状态已恢复到发布卡 `characterId=3`、`storageMode=native`、marker `mfrs-r2sql-settings-console-refresh`，模板/导出/前端导出/面板均为 14 表，设置窗关闭。当前无未完成的 R2SQL-POST 阶段；工作区仅保留既有状态栏 dist 差异和未跟踪 planning/截图/备份文件，未纳入发布提交。

**当前已知边界**：
- 发布版 6.3 native/CDN gate 已通过：`characterId=3`、`storageMode:native`、`apiMarker/hostMarker=mfrs-r2sql-template-status`，三口径均 14 表。
- 不能再直接重新 `import` 库本体做测试；该路径已触发 `jQuery_API_ACU is not a function`，并可能污染 `AutoCardUpdaterAPI` 实例。
- 完整 SQLite 行为已在 R2SQL-5 开发版真机通过；本阶段只补发布版自然加载后的最终复测缺口。
- POST-5 导出 fallback 修复已完成发布链路：vendor 修复提交 `5bd4b0e703e18ce6e32ba9904163e1cd53a501cd`，资源 loader/dist 提交 `8d4d1d267568a798f5a6c2f359257bb3630577e5`，发布提交 `3de0c78` 已推送到 `origin/main`；发布版版本为 `6.4`，CDN cache 为 `phase115-r2sql-export-fallback`。
- 发布后 CDP 已复核 native 与 sqlite 只读/切换 gate：`apiMarker/hostMarker=mfrs-r2sql-export-fallback`，`getTableTemplate()`、`AutoCardUpdaterAPI.exportTableAsJson()`、`MysteryDatabaseFrontend.exportCurrentData()` 与面板均保持 14 表；收尾已恢复 `storageMode:native`。
- 发布版 6.4 的旧设置窗“高级工具”页当前未渲染 SQL 控制台，仅看到 `advanced-optimization` 与 `advanced-log`；因此 SQL mutation smoke 入口仍需判定/定位，不能把“无入口”误判成导出 bug 复发。
- POST-8 已定位：SQL 控制台未渲染是因为设置窗在 native 状态生成后，切换到 sqlite 时同一个 `shujuku_v120-main-window` 不会重建 HTML；`createACUWindow()` 对已存在窗口只 `bringToFront`。关闭旧设置窗后重新打开，`advanced-sql`、`#shujuku_v120-sql-input`、`#shujuku_v120-sql-execute` 正常出现。用该入口补跑 SQL mutation smoke 后，SQLite 与最终 native 均保持 14 表。
- POST-9 目标：切换模式成功后自动刷新当前设置窗的高级工具页，使同一窗口内从 native 切到 sqlite 后 SQL 控制台立即出现；从 sqlite 切回 native 后 SQL 子页应移除或不可见。
- POST-9 已完成并发布到 `6.5`：vendor UX 修复提交 `a41ab4483ce6f149fe19c03aebfead5dddceed2d`；资源 loader/dist 提交 `f7e2f64d70552f876c45d3315fc783b3334621ac`；发布提交 `ccfd727` 已推送到 `origin/main`。发布版 YAML 与 PNG `chara/ccv3` 元数据均为 `6.5`，6 条 CDN 链接均指向资源提交 `f7e2f64d70552f876c45d3315fc783b3334621ac`，cache 为 `phase116-r2sql-settings-console-refresh`。发布后 CDP 复核：新 marker `mfrs-r2sql-settings-console-refresh`；同一设置窗 native -> sqlite 后 `acu-subtab-advanced-sql`、`#shujuku_v120-sql-input`、`#shujuku_v120-sql-execute` 立即出现；只读 `sqlite_master` 查询返回 14 行；同窗 sqlite -> native 后 SQL pane/input/execute 移除。最终页面已恢复 `characterId=3`、`storageMode:native`、三口径与面板均 14 表，设置窗关闭。
- 当前工作区出现若干 tracked dist 差异，来源未在本阶段确认；本阶段规划不回滚、不提交这些差异，执行前需先确认是否与用户/构建进程有关。

### R2SQL-POST 任务清单：发布版 SQLite 保留项清除

- **阶段 R2SQL-POST-0：基线保护与页面恢复**（complete·不改码）
  - 记录 Git 状态、HEAD/origin/tag、发布版版本、当前 tracked/untracked 差异。
  - 通过 CDP 只读确认发布卡仍为 `characterId=3`、`storageMode:native`、三口径 14 表、`missingCount=0`。
  - 备份/记录 IDB settings 中的 `storageMode` 原始值，准备 finally 恢复路径。
  - **复核 gate**：开始 SQLite 测试前，native 状态稳定；若页面不在发布卡或 API 未就绪，先恢复页面，不继续测试。
  - **R2SQL-POST-0 结果（2026-06-05）**：完成。Git 基线：HEAD==origin/main==`4f6d949770293e10921a377155bae51c63163f02`，HEAD tag `v0.0.65`，发布配置 `releaseVersion=6.3`、`CDN_REF=fe0679ee4152eed7c7c79769d9cddc498771333e`、cache `phase114-r2sql-template-status`。工作区已有 8 个 tracked dist 差异和多项未跟踪文件，本阶段未回滚、未提交。CDP 起点在开发卡 `characterId=2`，已通过宿主 `selectCharacterById(3)` 恢复到发布版；最终发布版 `characterId=3`、`storageMode:native`、`apiMarker/hostMarker=mfrs-r2sql-template-status`，`getTableTemplate()` 14、`exportTableAsJson()` 14、面板 `templateLoaded:true/tableCount:14/missingCount:0`。IDB settings key 为 `shujuku_v120_profile_v1____default____settings`，raw type `string`、length `128651`、FNV1a `2f8f6d53`、storageMode `native`；为避免配置内容落盘，本阶段仅记录指纹，后续切换前需重新读取原始 raw 并在 finally 中恢复。

- **阶段 R2SQL-POST-1：安全入口发现**（complete·只读/只开关设置窗）
  - 只读枚举自然加载后的公开 API、设置弹窗 DOM、SQLite radio/SQL console 是否存在，不直接 import 库本体。
  - 优先寻找可由 UI 触发的存储模式切换与 SQL 控制台；次选已存在的自然加载 API；不使用会新建库实例的测试方式。
  - 明确列出“可用入口 / 不可用入口 / 高风险入口”，并写入 `findings.md`。
  - **复核 gate**：必须找到一个可逆且不创建新 ACU 实例的入口，才能进入 POST-2；否则停止，转 POST-6 设计最小测试钩子。
  - **R2SQL-POST-1 结果（2026-06-05）**：完成。自然公开 API 中 `AutoCardUpdaterAPI` 有 81 个 key，存在 `openSettings/openVisualizer/exportTableAsJson/getTableTemplate`，但无 `executeQuery` / `setStorageMode`；`AutoCardUpdaterV2API` 当前无 key；`MysteryDatabaseFrontend` 有面板/导出/刷新入口但无 SQL/模式切换入口。被动 DOM 起点无 SQL 控制台、无 storage radio，仅有 `#acu-btn-settings`。调用自然 API `AutoCardUpdaterAPI.openSettings()` 未新建库实例，打开旧设置窗 `#shujuku_v120-popup`；其中存在 2 个可见可用的 `input[name="shujuku_v120-storage-mode"]`，`native` 当前选中、`sqlite` 可选。native 下 `#shujuku_v120-sql-input` 与 `advanced-sql` 均未渲染；源码确认 SQL 控制台只在 `isSqliteMode()` 为真时加入高级工具页，并通过 UI 事件走 provider `executeQuery/executeMutation`。storage radio change 会弹 `showCustomConfirm_ACU`，取消按钮语义为“仅切换模式”，随后保存 `settings_ACU.storageMode` 并调用 `switchStorageMode()`，失败时回退 radio/settings。**可用入口**：旧设置窗 storage radio + 自定义确认框“仅切换模式”；**不可用入口**：公开 `executeQuery/setStorageMode`、V2 API、native 下 SQL 控制台 DOM；**高风险入口**：直接重新 import 库本体、尝试闭包私有 provider。收尾已点击 `.acu-window-btn.close` 关闭设置窗；最终发布卡仍 `storageMode:native`、marker 正确、三口径 14 表、`missingCount=0`。POST-1 gate 通过，可进入 POST-2。

- **阶段 R2SQL-POST-2：可逆切换 SQLite**（complete·小步验证）
  - 使用 POST-1 找到的安全入口从 native 切到 sqlite。
  - 切换后确认 IDB/settings/radio/API 状态一致为 sqlite。
  - 若切换失败，立即恢复 native 并记录，不做写入测试。
  - **复核 gate**：切换后页面不能丢失发布卡 API；不能出现 `jQuery_API_ACU is not a function`、旧 marker、8 表持久回退。
  - **R2SQL-POST-2 结果（2026-06-05）**：完成。执行前 native 指纹：settings raw type `string`、length `132500`、FNV1a `8e0b04c5`。通过 `AutoCardUpdaterAPI.openSettings()` 打开旧设置窗，点击 `input[name="shujuku_v120-storage-mode"][value="sqlite"]`，确认框 `#shujuku_v120-custom-confirm-cancel` 选择“仅切换模式”。切换后 IDB/settings 为 `storageMode:sqlite`，sqlite radio checked，settings FNV1a `58d3e6b2`。发布卡仍为 `characterId=3`，`apiMarker/hostMarker=mfrs-r2sql-template-status`，公开 API 仍无 `executeQuery/setStorageMode`；`getTableTemplate()` 14、`exportTableAsJson()` 14、面板 `templateLoaded:true/tableCount:14/missingCount:0`。未执行 SQL、未写 probe、未重置提示词。收尾已关闭设置窗，当前页面保留在 SQLite 模式，供 POST-3 继续；POST-3 需重新打开设置窗以渲染 SQLite 下的 SQL 控制台。

- **阶段 R2SQL-POST-3：发布版 SQLite smoke**（complete·发现明确 bug）
  - 只读查询验证不提前建表：`sqlite_master` 初始业务表为 0 或符合预期。
  - 首次幂等写入触发建表，确认物理业务表为 14 张。
  - 验证 `global_state` schema：有 `game_time`，无 `current_time`。
  - 验证三口径：`getTableTemplate()`、`exportTableAsJson()`、`MysteryDatabaseFrontend.getPanelState()` 均为 14 表。
  - 清理 probe 行、临时表和任何测试数据。
  - **复核 gate**：probe 清理后再读一次；若三口径回退 8 表或 schema 异常，记录为明确 bug，进入 POST-5。
  - **R2SQL-POST-3 结果（2026-06-05）**：完成但 gate 未通过，发现明确 SQLite 导出 bug。SQLite 下重新打开设置窗后 SQL 控制台可用：`#shujuku_v120-sql-input` 与 `advanced-sql` 均渲染。初始只读 `sqlite_master` 已有 14 张业务表（不是空库），表名为 `action_suggestions/characters/check_suggestions/chronicle/clues/collected_archives/collected_rules/controlled_ghosts/ghost_archives/global_state/locations/player_state/supernatural_events/supernatural_items`。幂等写入 `UPDATE global_state SET game_time = game_time WHERE row_id = 1;` 成功、0 行受影响；写入后仍为 14 张业务表。schema 查询 `pragma_table_info('global_state')` 只返回 `game_time`，无 `current_time`。临时表 probe `acu_sql_probe` 创建/插入/查询 `ok`/drop 成功，`sqlite_temp_master` 清理后 0 行；持久 probe row 清理 `row_id IN (987654321,987654322)` 为 0 行受影响。**失败点**：SQL 操作后 `getTableTemplate()` 仍 14、面板仍 14，但 `AutoCardUpdaterAPI.exportTableAsJson()` 和 `MysteryDatabaseFrontend.exportCurrentData()` 均只导出 5 个 sheet：`sheet_check_suggestions/sheet_collected_rules/sheet_controlled_ghosts/sheet_player_state/sheet_supernatural_items`。物理表仍为 14；14 表行数查询显示多数表 0 行，非空表主要为 `check_suggestions=5`、`controlled_ghosts=1`、`player_state=1`。判定为 SQLite 模式导出口径 bug，需进入 POST-5。

- **阶段 R2SQL-POST-4：恢复 native 与收尾复核**（complete·安全恢复）
  - 使用 finally 路径恢复 `storageMode:native`。
  - 重新打开/刷新发布卡，确认 native 三口径 14 表、`missingCount=0`。
  - 更新 `task_plan.md` / `progress.md` / `findings.md`，把保留项标记为清除或升级为明确 bug。
  - **复核 gate**：最终页面必须回到发布卡 native 可玩状态；若恢复失败，优先修复运行态而不是继续测试。
  - **R2SQL-POST-4 结果（2026-06-05）**：因 POST-3 发现导出 bug，为避免发布卡停在 SQLite 测试态，已立即安全恢复 native。路径：打开旧设置窗 -> 点击 native radio -> 自定义确认框选择“仅切换模式” -> 关闭设置窗。最终 `storageMode:native`，settings FNV1a `829bbdb7`，`apiMarker/hostMarker=mfrs-r2sql-template-status`，`getTableTemplate()` 14、`exportTableAsJson()` 14、面板 `templateLoaded:true/tableCount:14/missingCount:0`；设置窗与确认框均关闭。

- **阶段 R2SQL-POST-5：若发现明确 bug，最小修复**（complete·已发布 6.4·核心导出 gate 通过）
  - 仅在 POST-3 复现发布版 SQLite bug 时启动。
  - 先判断问题属于测试入口、模式切换、SQLite 建表、模板状态口径、还是前端面板兜底。
  - 小补丁优先级：修自然加载状态读取/模式切换入口 > 修 `getTableTemplate()` 口径 > 修前端面板兜底；不改 SQL DDL，除非 schema 实证失败。
  - **复核 gate**：修复后必须重跑 POST-0~4；native、多卡隔离、发布版 CDN 不能回归。
  - **R2SQL-POST-5 结果（2026-06-05）**：完成并发布到 `6.4`。代码层最小修复已落在 `vendor/shujuku-sp-fork/index.js`：`_loadSheet()` 先写 metadata，再尝试写入数据，数据失败时保留空表结构；`exportToTableData()` 增加 fallbackData，缺 metadata 时用当前 JSON/当前 chat 模板反推 sheet meta，并在导出末尾补齐未导出的 fallback sheet。`SqlTableService.saveToChat/getCurrentData/_syncToJson()` 均改用“当前 JSON 视图 + 当前 chat 模板”的并集作为 fallback。验证链路：`node --check vendor/shujuku-sp-fork/index.js`、`git diff --check`、`npm run build`（沙盒内 EPERM，沙盒外成功）、5->14 分支模型、dist loader hash/marker 检查、发布版 YAML 与 PNG `chara/ccv3` 元数据检查均通过。提交链路：vendor 修复 `5bd4b0e703e18ce6e32ba9904163e1cd53a501cd`；资源 loader/dist `8d4d1d267568a798f5a6c2f359257bb3630577e5`；发布提交 `3de0c78` 已推送到 `origin/main`。发布后 CDP 中 native 与 sqlite 只读/切换 gate 均保持 14 表，并最终恢复 native；剩余限制是 6.4 旧设置窗未出现 SQL 控制台入口，完整 SQL mutation smoke 尚未执行。

- **阶段 R2SQL-POST-6：若没有安全入口，补最小测试钩子**（conditional pending·需用户确认）
  - 仅当 POST-1 找不到安全入口时启动。
  - 设计仅开发/验证用的受控测试入口，默认不暴露给玩家 UI，不改变普通游玩路径。
  - 测试钩子必须支持：切 sqlite、执行只读 SQL、执行可逆写入、恢复 native、自动清理。
  - **复核 gate**：测试钩子不能进入发布版玩家常规界面；如需发布代码，必须单独走构建/发布/真机复核。

- **阶段 R2SQL-POST-7：发布后最终复核与剩余入口判定**（complete·最终 native 14 表·SQL mutation 入口待定位）
  - 更新 planning 文件，记录 6.4 发布、提交链路、native/sqlite gate 结果和 SQL 控制台入口限制。
  - 只读确认 Git 与远程状态，避免误提交 planning、截图、备份或既有构建差异。
  - 只读确认真实页最终停在发布卡 native，marker 为 `mfrs-r2sql-export-fallback`，模板/导出/前端导出/面板仍为 14。
  - **复核 gate**：若最终页面仍是 native 14 表，则本轮核心导出 bug 收尾；若仍需完整 SQL mutation smoke，下一阶段先定位 6.4 SQL 控制台为何不渲染或寻找新版安全 SQL 入口。
  - **R2SQL-POST-7 结果（2026-06-05）**：完成。`git status --short --branch` 显示 `main...origin/main` 同步，仅保留既有 tracked diff `dist/神秘复苏模拟器/界面/状态栏/index.html` 与未跟踪 planning/截图/备份文件，本阶段未提交、未回滚。CDP 最终快照：`url=http://127.0.0.1:8000/`、`title=SillyTavern`、`characterId=3`、角色名 `神秘复苏模拟器发布版`、`storageMode=native`、`apiMarker/hostMarker=mfrs-r2sql-export-fallback`、`getTableTemplate()` 14、`exportTableAsJson()` 14、`MysteryDatabaseFrontend.exportCurrentData()` 14、面板 `templateStatus.templateLoaded:true/tableCount:14/missingNames:[]`。SQL 控制台仍未渲染，当前 DOM 只有 `advanced-optimization` 与 `advanced-log` 子页。

- **阶段 R2SQL-POST-8：SQL 控制台入口定位与 mutation smoke 补跑**（complete·不改码）
  - 只读源码定位 `generateAdvancedTabHTML()`、`isSqliteMode()`、`openAutoCardPopup_ACU()`、`createACUWindow()` 与 storage radio change 的关系。
  - 真机复现“同一设置窗切 sqlite 后没有 SQL 子页”和“关闭重开设置窗后 SQL 子页出现”的差异。
  - 通过旧设置窗 SQL 控制台执行 POST-3 同级别 SQL mutation smoke：物理表、schema、临时表 probe、导出/面板三口径、最终 native 恢复。
  - **R2SQL-POST-8 结果（2026-06-05）**：完成。源码确认 `generateAdvancedTabHTML()` 只有在生成 HTML 当下 `isSqliteMode()` 为真才注入 `advanced-sql`，而 `createACUWindow()` 对已存在的 `shujuku_v120-main-window` 只置顶不重建。真机复现：native 打开设置窗时只有 `advanced-optimization/advanced-log`；在同一窗口切到 sqlite 后，IDB 已为 `storageMode:sqlite` 且 radio checked，但旧 DOM 仍无 SQL 控制台；关闭旧窗口并重新打开后，`advanced-sql`、`#shujuku_v120-sql-input`、`#shujuku_v120-sql-execute` 正常出现。随后通过 SQL 控制台执行：`sqlite_master` 业务表 14；`UPDATE global_state SET game_time = game_time WHERE row_id = 1` 成功且 0 行受影响；`pragma_table_info('global_state')` 只返回 `game_time`；临时表 `acu_sql_probe` create/insert/select ok/drop 成功，`sqlite_temp_master` 清理后 0 行；持久 probe row 清理 0 行受影响。mutation 后 sqlite gate：模板 14、导出 14、前端导出 14、面板 `templateLoaded:true/tableCount:14/missingNames:[]`。最终恢复 native，设置窗关闭，发布卡仍 `characterId=3`、`storageMode:native`、marker `mfrs-r2sql-export-fallback`、三口径 14、面板 14。命令包装层曾在完整 JSON 打印后超时退出，但后续只读快照确认最终页面状态正常。

- **阶段 R2SQL-POST-9：同一设置窗切 SQLite 后 SQL 控制台自动刷新**（complete·已发布 6.5·真页同窗 smoke 通过）
  - 在库层设置窗逻辑中增加最小刷新函数：仅重建 `#acu-tab-advanced` 内容并重新绑定高级工具子页事件。
  - storage radio 切换成功后调用刷新函数；切到 sqlite 时 SQL 控制台应立即出现，切回 native 时 SQL 控制台应移除。
  - 验证：`node --check`、`git diff --check`、构建、CDP 同窗口切换 smoke、最终 native 14 表。
  - **复核 gate**：不得改 SQL DDL/schema；不得直接 import 新库污染运行态；如需发布，按资源提交 -> loader hash 回填 -> publish-card 的既有链路走。
  - **R2SQL-POST-9 结果（2026-06-05）**：完成。`vendor/shujuku-sp-fork/index.js` 增加 `bindAdvancedSubtabSwitching_ACU()`、`activateAdvancedSubtab_ACU()`、`refreshAdvancedTabForStorageMode_ACU()`，storage radio 切换成功后按目标模式刷新高级工具页；sqlite 优先激活 SQL 控制台，native 回到运行日志/非 SQL 子页。验证链路：`node --check vendor/shujuku-sp-fork/index.js` 通过；`git diff --check` 通过；`npm run build` 沙盒内因已知 Windows `spawn EPERM` 失败，沙盒外成功；loader/source/dist 均指向 vendor 提交 `a41ab4483ce6f149fe19c03aebfead5dddceed2d` 和 marker `mfrs-r2sql-settings-console-refresh`。提交链路：vendor `a41ab44`、资源 loader/dist `f7e2f64d70552f876c45d3315fc783b3334621ac`、发布 `ccfd727`，均已推送到 `origin/main`。发布版 `6.5` YAML/PNG 元数据检查通过。CDP 真页复核中，native 设置窗打开时无 SQL 控制台；同一窗口选择 sqlite + “仅切换模式”后，窗口未重建但 `#shujuku_v120-sql-input` 与 `#shujuku_v120-sql-execute` 立即出现，DOM 中 `#acu-subtab-advanced-sql` 和 `#acu-tab-sql-console` 可见；只读 `sqlite_master` 查询返回 14 行；同一窗口切回 native 后 SQL pane/input/execute 均移除。最终已关闭设置窗并恢复 `storageMode:native`，发布卡 `characterId=3`、marker `mfrs-r2sql-settings-console-refresh`、模板/导出/前端导出/面板均 14 表，`missingNames:[]`。

**停止条件**：
- 任何步骤导致发布卡 native 三口径无法恢复到 14 表，立即停止测试并优先恢复运行态。
- 连续两次入口尝试都会污染 `AutoCardUpdaterAPI` 或触发 `jQuery_API_ACU is not a function`，停止并转 POST-6，不重复同一路径。
- 如果需要修改 SQL schema/DDL，必须重新立项并先做迁移风险审查。

## 已完成阶段：6.2 SQL/SQLite 模式模板状态分裂（2026-06-04 立项·R2SQL-0~8 收尾完成·发布版 6.3 已推送）

**目标**：同时修复两层问题，根治 SQL 模式下“物理 SQLite 表/导出 API 已是 14 表，但 `getTableTemplate()` / `getPanelState()` 回退 8 表”的状态分裂。

**根因摘要**：SQL 模式写入和导出走 SQLite provider / `SqlTableService`，建表时能按当前 chat-scope 模板创建 14 张物理表；但 `AutoCardUpdaterAPI.getTableTemplate()` 仍直接解析内存 `TABLE_TEMPLATE_ACU`，该变量在 SQL 模式下可能停在库默认 8 表。神秘复苏前端 `readTemplateStatus()` 又只信 `getTableTemplate()`，所以面板误判 8 表。

**修复策略**：
- 库层真修：让 `getTableTemplate()` 返回当前真正生效的模板，优先对齐 chat-scope / active scope，而不是裸读 `TABLE_TEMPLATE_ACU`。
- 前端兜底：`readTemplateStatus()` 在模板 API 缺表时，再用 `exportTableAsJson()` 判断当前导出数据是否已经是 14 表，避免 SQL 模式短暂状态不同步造成 UI 假阴性。
- 明确不改：不让 `executeQuery()` 只读 SQL 提前建表；不改 SQL schema/DDL；不改 `current_time -> game_time` 已修复字段；不改 AM/SP 编码常量；不改 chat-scope CoreAPI proxy 已发布修复。

### R2-SQL 任务清单：库层 + 前端兜底联合修复

- **阶段 R2SQL-0：干净基线复现与环境保护**（complete·不改码）
  - 在发布版 6.2 或开发版对应资源上复现 SQL 模式状态分裂：`exportTableAsJson()` 14 表，`getTableTemplate()` / `getPanelState()` 8 表。
  - 记录当前 `storageMode`、characterId、chatId、`sqlite_master` 业务表数量、`global_state` schema、`game_time/current_time` 字段状态。
  - 确认测试数据可清理：probe 行、临时表、模式切换状态。
  - **复核 gate**：旧 `current_time` bug 未复发；只读 SQL 仍不建表；测试结束前知道如何恢复 native。
  - **R2SQL-0 结果（2026-06-04）**：完成。发布版 6.2 / `characterId=3` native 起点三口径均为 14 表。切 SQLite 后复现状态分裂：`getPanelState()` 为 `templateLoaded:false/tableCount:8/missingNames:14`，`getTableTemplate()` 为 8 表，但 `exportTableAsJson()` 为 14 表。SQL 写入触发后物理业务表为 14；`global_state` schema 只含 `game_time`、不含 `current_time`；probe 行 `row_id IN (1,2)` 清理后为 0，临时表 `acu_sql_probe` 清理后为 0。最后点击“仅切换模式”恢复 native，IndexedDB `storageMode:native`，面板回到 14 表。

- **阶段 R2SQL-1：静态审查与最小修点确认**（complete·先审不改）
  - 审查 `vendor/shujuku-sp-fork/index.js` 中 `getTableTemplate()`、`resolveTemplateForExport_ACU()`、`applyTemplateScopeForCurrentChat_ACU()`、`SqlTableService._resolveCurrentChatTemplate()` 的口径差异。
  - 审查 `src/神秘复苏模拟器/脚本/数据库前端/index.ts` 的 `readTemplateStatus()`、`normalizeTemplateNames()`、`normalizeExportedData()`。
  - 确定库层优先调用当前 active/chat 模板解析函数；前端兜底只在模板 API 缺神秘复苏 14 表时启用。
  - **复核 gate**：改动范围只落在 `getTableTemplate()` 相关 API 和神秘复苏前端状态读取；不触碰 SQL 执行/建表事务。
  - **R2SQL-1 结果（2026-06-04）**：完成。`SqlTableService._resolveCurrentChatTemplate()`、`applyTemplateScopeForCurrentChat_ACU()`、`resolveTemplateForExport_ACU('chat', ...)` 已有当前 chat/active 模板解析链路；旧 `getTableTemplate()` 只裸读 `TABLE_TEMPLATE_ACU`，前端 `readTemplateStatus()` 又只信该 API，确认最小修点为库层 `getTableTemplate()` + 前端导出兜底，不改 SQL DDL/事务。

- **阶段 R2SQL-2：库层实现 getTableTemplate 当前生效模板**（complete·小补丁）
  - 修改 `AutoCardUpdaterAPI.getTableTemplate()`：优先返回当前 chat-scope 生效模板快照；若无 chat-scope，则返回 global/profile 当前模板；最后 fallback 到 `TABLE_TEMPLATE_ACU`。
  - 可优先复用 `resolveTemplateForExport_ACU('chat', ...)` 或抽小 helper，避免复制复杂模板解析逻辑。
  - 保持返回结构与旧 API 兼容：仍返回模板对象，不改调用方协议。
  - **复核 gate**：`node --check vendor/shujuku-sp-fork/index.js` 通过；`git diff --check` 通过；native 模式 `getTableTemplate()` 仍返回当前模板；AM/SP sweep 不回退。
  - **R2SQL-2 结果（2026-06-04）**：完成。`vendor/shujuku-sp-fork/index.js` 的 `getTableTemplate()` 现在先尝试 `applyTemplateScopeForCurrentChat_ACU()`，再用 `resolveActiveTemplatePresetName_ACU({ fallbackToGlobal: true })` + `resolveTemplateForExport_ACU('chat', activePresetName)` 返回当前生效模板，最后才 fallback 到 `TABLE_TEMPLATE_ACU`。

- **阶段 R2SQL-3：前端 readTemplateStatus 加导出兜底**（complete·小补丁）
  - 修改 `readTemplateStatus(api)`：先用 `getTableTemplate()` 计算模板状态。
  - 若缺神秘复苏 14 表，且 `api.exportTableAsJson` 可用，则解析导出数据；导出数据包含 14 表时，返回 14 表状态。
  - 兜底结果需要保留清晰语义：这是“当前数据/SQL 物理表已完整”，不是强行改模板；日志可 debug 级别记录。
  - **复核 gate**：导出 API 为空、报错、非 JSON 时不崩；native 模式不被误判；面板 `missingNames` 与 14 表名单一致。
  - **R2SQL-3 结果（2026-06-04）**：完成。`src/神秘复苏模拟器/脚本/数据库前端/index.ts` 的 `readTemplateStatus()` 在模板口径缺表时，会尝试 `exportTableAsJson()` 并用 `normalizeExportedData()`/`normalizeTemplateNames()` 校验导出口径；若导出包含神秘复苏 14 表，则返回 `templateLoaded:true`、`missingNames:[]`。导出异常仅 debug 记录并回到模板口径。

- **阶段 R2SQL-4：本地构建与静态复核**（complete）
  - 运行 `npm run build`；若 Windows sandbox 仍因 `spawn EPERM` 失败，按既有权限流程沙盒外重跑。
  - 确认 `dist/神秘复苏模拟器/脚本/数据库前端/index.js` 含前端兜底逻辑。
  - 若 vendor 改动需要 CDN 发布，按三段式准备资源链路：vendor 资源提交 -> dist 回填 -> 发布提交。
  - **复核 gate**：build 成功；无 `__RESOURCE_HASH__`/localhost 意外残留进发布版；无无关 dist 噪声。
  - **R2SQL-4 结果（2026-06-04）**：完成。`npm run build` 沙盒内命中已知 Windows `spawn EPERM`，按权限流程沙盒外重跑成功；`dist/神秘复苏模拟器/脚本/数据库前端/index.js` 已包含导出口径兜底。`node --check vendor/shujuku-sp-fork/index.js`、`git diff --check` 通过；AM/SP sweep 0 命中；`__RESOURCE_HASH__` 0 命中；构建带出的无关状态栏 HTML 模块编号噪声已恢复，tracked diff 只剩 R2SQL 相关 3 文件。

- **阶段 R2SQL-5：开发版 SQL 真机验收**（complete·不发布）
  - 切到 SQLite 模式，确认初始只读查询仍不建表：`sqlite_master` 业务表为 0 或保持预期状态。
  - 执行首次写入触发建表，确认 14 张物理表存在。
  - 验证三口径一致：`getTableTemplate()`、`getPanelState()`、`exportTableAsJson()` 均显示 14 表。
  - 验证 schema：`global_state` 有 `game_time`，无 `current_time`。
  - **复核 gate**：probe 数据已删除；临时表已 drop；控制台无数据库/前端新增错误。
  - **R2SQL-5 结果（2026-06-04）**：完成。CDP 真机开发卡 `characterId=2` / `神秘复苏模拟器` 先清理旧发布卡残留窗口并运行态接管本地 patched fork，确认 `getTableTemplate()` 函数含 `applyTemplateScopeForCurrentChat_ACU` + `resolveTemplateForExport_ACU`。重新导入当前 chat 已保存的 14 表模板后，`getTableTemplate()` / `exportTableAsJson()` / `MysteryDatabaseFrontend.getPanelState()` 均为 14 表。切 SQLite 后只读 `sqlite_master` 为 0 行，未提前建表；幂等 `UPDATE global_state SET game_time = game_time WHERE row_id = 1` 触发建表，物理业务表为 14 张。`PRAGMA table_info(global_state)` 显示 `game_time`，`current_time` 0 命中；写入后 `getTableTemplate()`、面板、导出仍保持 14 表。临时表 `acu_sql_probe` 已 drop，`sqlite_temp_master` 0 行；未创建持久 probe 行，清理 `row_id IN (987654321,987654322)` 为 0 行影响。结束已切回 native，IDB/extension settings 均为 `storageMode:native`，native 下三口径仍为 14 表。

- **阶段 R2SQL-6：回归验收（native / 多卡 / 热切换）**（complete·不发布）
  - 恢复 native 后确认发布版/开发版仍 `templateLoaded:true/tableCount:14/missingNames:[]`。
  - 多卡切换：普通 Assistant 或非神秘复苏卡不被 14 表污染；切回神秘复苏仍 14 表。
  - 热切换/刷新：`CHAT_CHANGED` 后状态不回退 8 表。
  - 旧功能 smoke：世界书刷新、导出、SQL 控制台、数据库面板打开都正常。
  - **复核 gate**：没有新增跨卡污染；没有新增保存异常；native 和 sqlite 均可恢复到预期状态。
  - **R2SQL-6 结果（2026-06-04）**：完成。native 基线下开发卡 `characterId=2` 为 patched API + 14 表 + 面板 loaded；Assistant 普通卡 `characterId=0` 保持库默认 8 表且无 `TavernDB_ACU_ScopedConfig`，未被神秘复苏 14 表污染。发布版 `characterId=3` 等待脚本加载后为 14 表，切回开发卡等待后仍 14 表。观察到切卡初期可能短暂 `AutoCardUpdaterAPI` 未就绪或 8 表，但 10-12 秒内收敛到 14 表；这属于未发布 R2SQL vendor 时当前 CDN/运行态重载窗口，非持久回退。重新接管本地 patched fork 后，`reloadCurrentChat()` 后 `getTableTemplate()` / 导出 / 面板均为 14 表。旧功能 smoke 通过：`exportCurrentData()` 14 表，`refreshDatabase()` 后仍 14 表，`openPanel()` 后仍 14 表；干净窗口切 SQLite 后 SQL 控制台出现，只读 `sqlite_master` 查询成功返回 0 行（不提前建表），再切回 native 后 IDB/settings 为 native、patched fork + 14 表。部分 CDP shell wrapper 在打印完整 JSON 后超时退出，页面状态与后续复核正常。

- **阶段 R2SQL-7：发布链路**（complete）
  - 若 vendor 改动参与发布，执行三段式：资源提交（vendor + src/dist）-> 回填资源 hash 并重建 -> 发布版打包提交。
  - 更新 `scripts/publish-card.mjs` 的 `CDN_REF`、`CDN_CACHE_VERSION`、必要时 `releaseVersion`。
  - 运行 `npm run publish-card -- 神秘复苏模拟器发布版`，核验 YAML 与 PNG `chara/ccv3`。
  - **复核 gate**：发布版不含旧 hash/cache/localhost/占位符；HEAD 与 origin/main 同步；版本信息明确。
  - **R2SQL-7 结果（2026-06-04）**：完成并已推送。资源/回填/发布链路已闭合，当前 HEAD==origin/main==`4f6d949770293e10921a377155bae51c63163f02`，HEAD tag 为 `v0.0.65`。发布版版本为 `6.3`，`scripts/publish-card.mjs` 指向 `CDN_REF=fe0679ee4152eed7c7c79769d9cddc498771333e`、cache `phase114-r2sql-template-status`；发布版 YAML 为 `版本: '6.3'`。

- **阶段 R2SQL-8：发布后真机复核与收尾**（complete·SQLite 完整 smoke 受安全入口限制）
  - 真机切到发布版，从 CDN 实际加载新版 dist/vendor。
  - 重跑 SQL smoke：只读不建表、首次写入建 14 表、三口径一致、`game_time` schema 正确。
  - 清理 SQL probe，恢复 native，更新 `progress.md` / `findings.md` / `task_plan.md`。
  - **复核 gate**：确认 bug 根治且未发现本轮新增 bug；如发现新问题，记录为新阶段而不是混在发布收尾里。
  - **R2SQL-8 结果（2026-06-04）**：收尾完成。CDP 恢复并确认发布卡 `characterId=3` / `神秘复苏模拟器发布版`，IDB `storageMode:native`；`apiMarker/hostMarker=mfrs-r2sql-template-status`，`getTableTemplate()`、`exportTableAsJson()`、`MysteryDatabaseFrontend.getPanelState()` 三口径均为 14 表，`missingCount=0`。当前 UI/公开 API 不暴露安全 SQL 控制台、存储模式切换或 `executeQuery/setStorageMode` 入口；直接重新 import 库本体会触发 `jQuery_API_ACU is not a function` 并污染运行态，已停止该方案并恢复 native。因此发布后 native/CDN 真机 gate 通过，完整 SQLite post-release smoke 记录为受限未重跑；R2SQL-5 的开发版 SQLite gate 已覆盖只读不建表、首次写入建 14 表、三口径一致和 `game_time` schema。

**停止条件**：
- 若库层 `getTableTemplate()` 改动导致 native 模式模板不稳定，立即回退 R2SQL-2，不继续叠加前端兜底。
- 若前端兜底会把真实 8 表误判成 14 表，立即回退 R2SQL-3。
- 若 SQL 首次写入、`game_time` schema、跨卡隔离任一项回归失败，不发布。

## 已完成阶段：件5 数据库前端停在 8 表·chat-scope bug（2026-06-04 立项·已发布 6.2）

新玩家反馈：神秘复苏数据库前端没成功加载成 14 表，停在库默认 8 表。**已真机白盒诊断锁定根因，本轮只诊断+记录、未改代码、未发布。** HEAD 仍 `286d8b5`、发布版 6.1，与上一阶段一致。

### 件5：数据库前端停在 8 表（根因已确诊·待修）
- **现象**：真机（127.0.0.1:8000，开着神秘复苏卡）生效模板=库默认 8 表，`templateLoaded:false`，缺全部 14 表。三接口一致，非读取假象。
- **★根因（决定性实验确认）**：库 fork 的 **chat-scope 应用通道坏了，global-scope 正常**。`switchTemplatePreset(name,{scope:'global'})` 立刻变 14 表；但所有 chat-scope 写入（`importTemplateFromData(data,{scope:'chat'})`/`injectTemplatePresetToCurrentChat`/卡的 `importMysteryTemplate`）全部 return `success:true` 却实际仍 8 表，chat 数组无任何消息被写 `TavernDB_ACU_ScopedConfig` 字段。
- **机制**：`applyTemplateSnapshotToScope_ACU`(fork 9252) 先设内存 14 表，又调 `applyTemplateScopeForCurrentChat_ACU`(24998) 按 chat scope state 重算覆盖；chat scope 没落地→回退全局 8 表；返回值基于 snapshot 恒真→报 success 假象。**phase111 退避重试治不了**（它假设是时序竞态，真实是 chat-scope 路径本身坏）。
- **已排除**：库本体/前端加载 ✓、库 chat 引用与 ST 同源 ✓、chat[0] 可写 ✓、14 表 JSON 格式 ✓、预设库「神秘复苏模拟器」预设内容 ✓。详见 findings.md「2026-06-04 数据库前端停在 8 表·根因诊断」。
- **临时缓解（仅当前真机环境，不持久/未发布）**：已用 `switchTemplatePreset('神秘复苏模拟器',{scope:'global'})` 切成 14 表，三接口确认 templateLoaded:true/missing:[]，用户当前可玩。
- **★版本影响矩阵（git 实证 dist 的 autofix scope 路径）**：
  | 发布版本 | CDN commit | autofix 路径 | 是否受本 bug 影响 |
  |---|---|---|---|
  | **6.0(phase110/111) ~ 6.1(phase112)（当前在线）** | a8fae61 / 8683b76 / d2d5733 | `scope:'chat'` | **受影响**（坏的就是 chat 通道，玩家拉到的最新卡停 8 表） |
  | 6.0/phase109 及更早（≤5.x） | dd92988 / 7457a28 | 默认（global） | 不受本 bug 影响，但是另一种表现（见下） |
  - **结论：是「当前最新版」有问题，不是只影响旧版。** `scope:'chat'` 自 phase110(`a320f77`)引入，沿用至今 6.1。
  - **诚实反转**：更早版（默认 global）走的是我真机验证「切换生效」正常的通道；但 6-03 当初从 global 改 chat（phase110）的理由正是「`importTemplateFromData` 默认 global 只存预设库、不自动切生效 → autofix 停 8 表」。即老版 global 是「存了预设但要玩家手动切面板才有 14 表」的另一种表现，并非完全无恙。
  - **对修复路线的启示**：git 证据强化「路1 卡侧规避」——正确组合 = `importTemplateFromData(data,{scope:'global',presetName})` 存预设 + `switchTemplatePreset(presetName,{scope:'global'})` 切生效（两 API 均已真机验证可用，预设内容也已验证正确）。绕开坏掉的 chat-scope。代价仍是 global 为 profile 级（影响该 profile 所有聊天，与 phase110 隔离目标冲突，需权衡）。
- **★前置铁证（已完成·勿重做）**：chat-scope bug 是上游 spv3.9.5 库缺陷，**不是 fork patch 副作用**。字节级 diff：fork 仅 44 行改动全在提示词/注释区，chat-scope 核心区(9000-29999) 与上游字节一致（7 个关键函数逐一比对）。→ 修复不必怕动坏 fork。

- **★关键约束（决定路线）**：用户 **会同时玩多张数据库卡** → **路1（卡侧改 global scope）副作用成立**（14 表会串到同 profile 其它卡），原则上排除。需要保留 per-chat 隔离的方案。

- **★最终根因状态（以此为准）**：早期推断已被 R2-1 更新。
  1. ~~"库 chat 引用与页面不同源"~~ — **证伪**。真机实测只要通过 `window.SillyTavern.getContext()` 取值，库(数据库 iframe)的 chat 数组与页面 `getContext().chat` 是同一引用、同一 chat[0]（`dbFlat_eq_ctxTop:true`、`msg0Eq:true`）。运行拓扑：tavern_helper **iframe 模式**，库跑在 `TH-script--spv3.9.5·数据库` iframe；问题不在 chat 同源性，而在 fork 把 iframe 内的 `window.SillyTavern` 误当成扁平 API。
  2. ~~"IDB/settings ready 闸门永久卡死是唯一根因"~~ — **降级为启动期/伴随风险**。R2-1 断点运行里 `settingsStorageReadyForSave_ACU:true`、`configIdbCacheLoaded_ACU:true`，但 chat-scope 仍失败，说明 ready 卡死不是唯一根因。
  3. **R2-1 最新根因：host API 适配分支误判。** 当前数据库 iframe 的 `window.SillyTavern` 实际只有 `{libs,getContext}`，直接 `window.SillyTavern.chat/saveChat` 均为 `undefined`；真实可用入口在 `window.SillyTavern.getContext().chat/saveChat`。但 `attemptToLoadCoreApis_ACU` 在 iframe/userscript 模式仍把 `iframeST` 当“扁平 API”直接赋给 `SillyTavern_API_ACU`，导致 `getChatArray_ACU()` 读空数组、`saveChatToHost_ACU()` 判定 saveChat 不可用，进而 chat-scope 写入找不到 first message、保存跳过、应用时回退 global。这个点可同时解释 8 表回退和 success 假象。

### 件5 路线2任务清单：fork 根治 chat-scope（高风险·分阶段复核·R2-6完成·待发布）

**目标**：在 `vendor/shujuku-sp-fork/index.js` 内根治 chat-scope 写入/应用失败，保留 per-chat 隔离；修复后 `importTemplateFromData(data,{scope:'chat'})`、`switchTemplatePreset(name,{scope:'chat'})`、`injectTemplatePresetToCurrentChat(name)` 均应真实写入当前 chat 并使 14 表生效。

**风险原则**：路线2可以从机制上彻底修掉本问题，但不能承诺“零新 bug”。为把风险降到最低，只允许小步改动；每阶段完成后必须复核并记录，失败则回退到上一阶段，不继续叠改。

- **阶段R2-0：干净基线复现与安全备份**（complete·不改码）
  - 建立干净真机基线：重载 SillyTavern、打开神秘复苏卡、确认未被 global 14 表污染；必要时新建测试 chat/profile。
  - 备份/记录当前 `vendor/shujuku-sp-fork/index.js` hash、当前 dist CDN_REF、当前 IDB `shujuku_v120_config_v1` 关键键名和现象快照。
  - 复现三入口失败：`importTemplateFromData{chat}`、`switchTemplatePreset{chat}`、`injectTemplatePresetToCurrentChat` 均 success 但 8 表。
  - **复核 gate**：无代码 diff；复现稳定；global 通道仍可 14 表；记录 console 关键日志。若基线不稳定，暂停，不改库。
  - **R2-0 结果（2026-06-04）**：完成。当前真机为发布版卡 `characterId=3`、chatLength=1；active 模板起点为默认 8 表，无 global 14 表污染。chat[0] 已有旧 `manual_probe` 的 `TavernDB_ACU_ScopedConfig`（chat_override 14 表，templateStrLen=37306），但读取侧仍显示 8 表，这反而坐实 chat-scope 应用不生效。三入口均返回 success 但仍 8 表；`switchTemplatePreset(scope:'global')` 对照成功变 14 表，并把当前页面留在 14 表可玩状态。fork hash `B01BA510AED3A94B4261FA37BD51D30774647782389EBC122C1165C2AB0B3DE9`；发布脚本 `CDN_REF=d2d5733`、cache `phase112-game-time-rename`、releaseVersion `6.1`；IDB `shujuku_v120_config_v1/kv` 4 key 已记录在 progress/findings。未改 fork、未改发布脚本、未构建、未发布。

- **阶段R2-1：最小观测定位 host API/ready 链**（complete·仅 CDP 断点/只读探针·未改码）
  - 只在 fork 或临时 dist 加带前缀的观测日志，不改变行为：`loadSettings_ACU`、`scheduleSettingsReloadAfterIdbReady_ACU`、`ensureConfigIdbCacheLoaded_ACU`、`saveSettings_ACU`、`saveChatToHost_ACU`、`setCurrentChatTemplateScopeState_ACU`。
  - 记录 ready 标志从 false 到 true 的时间线、IDB cache loaded 状态、每次 save 被拒绝的原因。
  - **复核 gate**：能用日志解释“为什么 ready 没翻 true”；观测补丁不改变 8 表/14 表行为；控制台无新增异常。观测补丁不得进入发布。
  - **R2-1 结果（2026-06-04）**：完成，且未写入任何观测补丁，只用 CDP Debugger 断点和只读 Runtime 探针定位。live vendor 为 `gcore.jsdelivr.net/...@14a556d.../vendor/shujuku-sp-fork/index.js`，hash 与本地 fork 一致。断点复现中 chat-scope 分支进入、`shouldSaveChat:true`，但 `saveChatToHost_ACU` 看到 `SillyTavern_API_ACU.saveChat` 非函数；同时当前 `settingsReady/idbLoaded` 已为 true。只读探针确认 top 与数据库 iframe 的 `window.SillyTavern` 都只有 `libs/getContext`，直接 `saveChat/chat` 不存在，而 `getContext().saveChat` 是函数、`getContext().chat.length=1`。R2-2 应把主修复点从单纯 ready 链改为“host API 代理/桥接适配”，ready 链只作为回归保护项。

- **阶段R2-2：设计最小修复点并做静态审查**（complete·先审不改）
  - 候选修复优先围绕 host API 适配：当 `SillyTavern` 对象存在 `getContext()` 且直接 `chat/saveChat` 缺失时，像插件模式一样使用 Proxy 每次从 `getContext()` 取 `chat/saveChat/eventSource/eventTypes`；或在 ChatGateway 内增加等价 fallback。ready 链只保留为防止启动期保存误拒的次级保护。
  - 明确不碰 AM→SP 提示词 patch、不改表结构、不改卡侧业务 API。
  - 列出需要保护的不变量：settings 不丢、templatePresets 不丢、profile template 不被覆盖、worldbook 写入不受影响、global 通道行为不变、TavernHelper API 仍按 iframe 自身/parent fallback 取值。
  - **复核 gate**：改动行数和函数范围可控；能解释失败时如何降级；有回退方案；用户确认后才进 R2-3。
  - **R2-2 结果（2026-06-04）**：完成，未改业务代码。推荐 R2-3 只动 `attemptToLoadCoreApis_ACU()` 附近的 SillyTavern API 适配逻辑：抽一个小型 `getContext()` Proxy/fallback，在 userscript/iframe 模式下若 `window.SillyTavern` 有 `getContext()` 但直接 `chat/saveChat/eventSource` 缺失，就动态从 `getContext()` 取值，同时保留 `rawST[prop]` fallback。只读模拟证明该候选适配可提供 `chat array:1`、`saveChat function`、`eventSource object`、`eventTypes object`、`chatId string`、`getRequestHeaders function`、`ConnectionManagerRequestService function`、`extensionSettings object`。备选方案（只改 ChatGateway fallback）被降级，因为它只能补保存，不能补 `getChatArray_ACU()`、事件监听和生成管线。ready 链本阶段决定不在 R2-3 首版修，以避免同轮叠改存储层；后续在 R2-5 冷启动验证若仍出现 `settings_loading` 再单独处理。

- **阶段R2-3：fork 最小实现**（complete·源码补丁已落地）
  - 在 `vendor/shujuku-sp-fork/index.js` 落地 R2-2 选定的最小补丁：仅改 CoreAPI 的 SillyTavern 适配，优先复用插件分支已有 Proxy 语义；不改模板作用域函数、不改 settings ready 链、不改 AM→SP 常量。
  - 建议实现边界：在 `attemptToLoadCoreApis_ACU` 附近新增小 helper，`get` 先尝试 `rawST.getContext()` 的属性，失败/缺失再 fallback 到 `rawST[prop]`；`has` 同步支持；仅当 rawST 有 `getContext()` 且直接 core 字段缺失时包装。
  - 保持 patch 局部化，新增日志可保留为 debug-gated 或移除；不得引入轮询风暴、重复保存、无条件覆盖 settings。
  - **复核 gate**：`node --check vendor/shujuku-sp-fork/index.js` 通过；`git diff --check` 通过；diff 只触及 `attemptToLoadCoreApis_ACU` 附近；AM/SP sweep 仍通过（既有 SP patch 不被破坏）。当前页面仍加载旧 CDN `14a556d`，patched fork 的三入口真机验证转入 R2-4/R2-5。
  - **R2-3 结果（2026-06-04）**：完成。新增 `createSillyTavernContextProxy_ACU` / `shouldWrapSillyTavernContext_ACU` / `normalizeSillyTavernApi_ACU`；插件模式继续走 `getContext()` Proxy 并增加 raw fallback，userscript/iframe 模式在 `iframeST || parentST` 选中对象后，若发现 `{libs,getContext}` 骨架缺少直接 `chat/saveChat/eventSource/eventTypes`，则包装为动态 `getContext()` API。未改 dist、未构建、未发布。

- **阶段R2-4：本地构建与 dist 链路复核**（complete·开发版）
  - 更新 loader/dist 指向本地 fork 产物，按两段式发布前的资源链路要求构建。
  - 运行 `npm run build`（必要时沙盒外），确认数据库相关 dist 含新 fork 引用/逻辑。
  - **复核 gate**：build 成功；dist 没有 `__RESOURCE_HASH__` 占位符残留；无无关 dist 噪声进入提交；开发版 PNG 可打包。
  - **R2-4 结果（2026-06-04）**：完成。`src/神秘复苏模拟器/脚本/数据库/index.ts` 与 `dist/神秘复苏模拟器/脚本/数据库/index.js` 已指向 `http://localhost:5500/vendor/shujuku-sp-fork/index.js?v=r2-4-coreapi-context-proxy`，用于开发版加载 R2-3 patched fork。沙盒内 `npm run build` 因已知 `spawn EPERM` 失败，沙盒外重跑成功；`localhost:5500` 实际可返回 vendor（含 `createSillyTavernContextProxy_ACU`）和数据库 dist。发布版与 `publish-card` 未改，正式 CDN hash 回填留到 R2-7。

- **阶段R2-5：真机功能验收（单卡）**（complete·不发布）
  - 冷启动全新 chat：autofix 自动 14 表，`templateLoaded:true`，missing:[]。
  - 三入口手动复测：`importTemplateFromData{chat}`、`switchTemplatePreset{chat}`、`injectTemplatePresetToCurrentChat` 都真实写入 `TavernDB_ACU_ScopedConfig` 并生效。
  - 热切换 `CHAT_CHANGED`、刷新、重开浏览器后仍保持 chat-scope 14 表。
  - **复核 gate**：控制台 0 个本修复相关 error/warn；IDB settings 保存日志正常；不会依赖 global 污染才成功。
  - **R2-5 结果（2026-06-04）**：完成。真机开发卡 `characterId=2` 自然加载 localhost 资源，DevTools `Debugger.scriptParsed` 明确命中 `dist/.../脚本/数据库/index.js`、`dist/.../脚本/数据库前端/index.js` 与 `http://localhost:5500/vendor/shujuku-sp-fork/index.js?v=r2-4-coreapi-context-proxy`。从 `8 表 + 无 TavernDB_ACU_ScopedConfig` 基线进入开发卡后，autofix 在 1 秒采样内恢复为 14 表并写入 chat 字段（`version/template/templateArchives`）；`importTemplateFromData(...,{scope:'chat'})`、`switchTemplatePreset(...,{scope:'chat'})`、`injectTemplatePresetToCurrentChat(...)` 三入口均从 8 表基线变为 14 表并写入当前 chat；`reloadCurrentChat()` 后仍保持 14 表与 chat 字段。未发布，R2-6 继续做多卡/旧功能回归。

- **阶段R2-6：回归验收（多卡/多模式/旧功能）**（complete·不发布）
  - 多数据库卡隔离：同 profile 切到另一张数据库卡，不被神秘复苏 14 表串台；切回神秘复苏仍 14 表。
  - global 通道回归：`switchTemplatePreset(...,{scope:'global'})` 仍能正常工作，不破坏其他用户手动模板流。
  - sqlite/native 关键路径：表格建表、世界书注入、召回 SP 编码、恢复默认 SP fork 行为仍正常。
  - 历史玩家反馈回归：EJS 变量列表不报错；数据库注入世界书；`game_time` SQLite 修复仍有效。
  - **复核 gate**：单卡、多卡、刷新、热切换、sqlite/native 至少各有一次通过记录；发现任何保存相关异常则回 R2-2/R2-3，不发布。
  - **R2-6 结果（2026-06-04）**：完成。回归中先发现“发布版旧 CDN 脚本 -> 开发卡”会把开发卡重新拖回 8 表的单实例残留风险；补丁改为清理 host+iframe local 两侧 `AutoCardUpdaterAPI`/`__ACU_STAR_DB_III_LOADED__`，只信 host 上新挂载的 API，等待新实例实际注册后才打 `mfrs-r2-6-coreapi-context-proxy` marker，并让 autofix promise 完成后释放。真机复核通过：开发卡 14 表；Assistant 普通卡保持 8 表且无 `TavernDB_ACU_ScopedConfig`；发布版旧脚本干扰后切回开发卡恢复 14 表；global 通道返回 success；导出 14 表、刷新数据库/世界书 ok，刷新后仍 14 表。`npm run build` 沙盒内仍因已知 `spawn EPERM` 失败，沙盒外构建成功；`git diff --check` 与 `node --check vendor/shujuku-sp-fork/index.js` 通过。未发布，R2-7 仍需用户确认后做 CDN 回填与发布版复核。

- **阶段R2-7：三段式发布与发布后复核**（complete）
  - 第一段资源提交：fork + loader/src + dist，占位 `__RESOURCE_HASH__`；push 后拿资源 commit。
  - 第二段回填重建：把 `__RESOURCE_HASH__` 替换为资源 commit 完整 hash，重建并推送可供发布版引用的 dist commit。
  - 第三段发布提交：更新 `scripts/publish-card.mjs` 的 `CDN_REF`、`CDN_CACHE_VERSION`、`releaseVersion`，运行 `npm run publish-card -- 神秘复苏模拟器发布版`，重打包发布版 PNG。
  - 发布版核验：`index.yaml`、PNG `chara/ccv3` 解码、CDN hash/cache、版本号、无旧 hash/占位符残留。
  - **复核 gate**：发布版从 CDN 实际加载新版 fork；新玩家冷启动自动 14 表；HEAD==origin/main；planning 三件套记录最终状态。
  - **R2-7 结果（2026-06-04）**：完成并已推送。三段式链路为：资源 commit `be210de5f029c4720f5e3503d02f2bb4483b5be4`（vendor fork + loader/frontend 占位 dist）→ 回填 dist commit `6a7bb0827b95f06eab04f4bf44766867c7cc2794`（dist import `be210de...` vendor，发布版 `CDN_REF` 指向它）→ release commit `212f1980572fc705227e268b6666ae8688aefce4`（发布版 6.2，cache `phase113-chat-scope-coreapi-proxy`）。CDN 三资源均 200：database loader、database frontend、vendor fork，且内容互相闭合。发布版 YAML 与 PNG `chara/ccv3` 均为 6.2，新 hash/cache 各 6 命中，旧 `d2d5733`/`phase112`/占位符/localhost 0 命中。CDP 真机切到发布版 `characterId=3` 后实际加载 `6a7bb...` dist 与 `be210de...` vendor，`apiMarker/hostMarker=mfrs-r2-6-coreapi-context-proxy`，面板 `templateLoaded:true/tableCount:14/missing:[]`；`reloadCurrentChat()` 后 chat[0] 存在 `TavernDB_ACU_ScopedConfig`，字段 keys 为 `version/template/templateArchives`，仍 14 表。HEAD==origin/main==`212f198`。

- **路线2停止条件**：
  - 任一阶段出现无法解释的 settings/template/chat 保存异常，停止并回滚该阶段。
  - 连续 3 次修复尝试仍无法让 ready 链稳定翻 true，暂停并向用户汇报是否改走路1。
  - 若修复需要大范围重写库存储层，必须重新审批，不直接继续。

- **续接关键文件/锚点**：fork `vendor/shujuku-sp-fork/index.js` 关键行 3196/24400/24402/24428/24476/24659/24755/23543/23576/24998；卡 autofix 源 `src/神秘复苏模拟器/脚本/数据库前端/index.ts:179`；真机 CDP `127.0.0.1:9222`、页 `127.0.0.1:8000`；FIELD 常量 `TavernDB_ACU_ScopedConfig`、隔离码 `''`。

---

## 上一阶段：玩家反馈修复批次（2026-06-03 立项·**6.0/6.1 完整交付·已收尾**）

上一批玩家反馈，分多件事，均已修复并发布到 origin/main。**核心功能彻底完成、稳定上线。** 当前发布版 `版本: '6.1'`、cache `phase112-game-time-rename`、HEAD `286d8b5`（本地==远端）。详细流水见 progress.md。

### 件4：current_time SQLite 保留字 bug（已根治·已发布 6.1/phase112）
- 玩家报错：SQL Mode 下 `INSERT INTO global_state (… current_time …)` → `CHECK constraint failed: current_time GLOB '????-??-?? ??:??'`。
- 根因（已 sqlite 实证，确定性必炸）：`current_time` 是 SQLite 内建保留字（CURRENT_TIME），CHECK 里被解析为函数返回 8 字符 HH:MM:SS，永远配不上 17 字符日期模板。我自己没遇到=跑 JSON/legacy(native) 模式不执行 CHECK（storageMode 默认 native，需手动切 sqlite）。
- 方案A（彻底消除隐患）：列名 `current_time`→`game_time`，改开发版 schema 4 处（DDL/note/initNode/updateNode）。sqlite 三组实测：新值通过/非日期仍被拒/旧列名精确复现报错。
- [x] 三段提交：资源 `d2d5733`（schema源+两 dist bundle）→ 发布 `660b9ab`（CDN_REF/cache phase112 + 发布版同步 + PNG，版本 6.0）→ 版本 `286d8b5`（releaseVersion 6.0→6.1 重打包 PNG）。发布版 6.1 核验全过。经验沉淀 memory `feedback_acu_schema_traps.md`。

### 件1：EJS 报错 `EjsTemplate is not defined`（已修复·已发布 5.1）
- 根因：世界书「变量列表」条目在 EJS 模板**内部**裸用 `EjsTemplate.allVariables()`，模板沙箱内取不到外部接口 window.EjsTemplate。
- 修复：改为模板内置全局 `variables`（`_.get(variables,'stat_data',{})`）。
- [x] 已改 4 处 + DevTools 端到端验证通过。已随发布提交 `6e01b3f`（5.1）上线。

### 件2：数据库版本 xingv2.6 → spv3.9.5（已修复·已发布 5.1）
- 根因：玩家「表格不注入世界书」。旧 dist 加载 `AlbusKen/shujuku@xingv2.6`（无 WorldbookGateway 兼容层）。
- [x] loader 升 spv3.9.5、build、验证兼容层齐全。已随 `6e01b3f`（5.1）上线。

### 件3：AM/SP 编码不一致（已**根治**·路D 自托管 fork·已发布 6.0）
- 现象：玩家「召回是 SP 的头，恢复设置变 AM 的头」。
- 根因：库内置默认提示词/模板常量是 AM 编码。
- 方案路D：fork `AlbusKen/shujuku@spv3.9.5`、把默认常量 AM→SP、自托管 `vendor/shujuku-sp-fork/index.js`、3 loader 指向本仓库副本。
- [x] 阶段0-3：定位 AM 源 / patch SP / 改 loader / 构建+DevTools 验证。
- [x] 阶段4：三段式 CDN 发布（vendor 资源提交 `14a556d` → 回填重build `ed5b436` → 发布 `dd92988` 6.0/phase109）。真机验证 fork 从 CDN 加载、默认模板全 SP、红线休眠。

### 件3 后续：autofix「14 表不显示」三层根因修复（已全部发布）
DevTools 真机复测时发现 14 表不显示有三层根因，逐层修复：
- [x] **CDN 占位符**（路D 阶段4 解决）：dist 曾 import `@__RESOURCE_HASH__` 无效 URL → 回填真 hash。
- [x] **scope 用错**（发布 `a8fae61` 6.0/phase110）：autofix 调 `importTemplateFromData` 默认 scope:'global' 只存预设库不切换生效 → 改 `{scope:'chat'}`。
- [x] **时序竞态 + 热切换**（发布 `8683b76` 6.0/phase111）：①autofix 在 ACU 设置就绪前导入被库拒绝保存 → 退避重试循环；②脚本页面级注入、单例只跑一次、切聊天不重跑 → 监听 `CHAT_CHANGED` 强制重跑。真机验证冷启动+热切换均自动 14 表 SP。

### 件3 后续：完整开局端到端真机复测（已通过·纯验证未改码）
- [x] 真实 SillyTavern 走完整开局（七中·周正讲课节点），多源取证三玩家反馈全部根治：①autofix 14 表自动生效（三接口一致）；②表格注入世界书（383→415 条目，新增 `TavernDB-ACU-CustomExport-*`）；③表格记录进提示词（`ctx.extensionPrompts` 含 `<全局状态>`/`<灵异事件档案>`/MVU stat_data 块，at_depth_as_system 注入）；④剧情精准推进无干涉（4260 字接七中节点、选项+状态栏齐全、零泄漏、零脚本报错）。

## 阶段结论：6.0 版本完整交付（2026-06-03 收尾·等新需求）

**核心功能层已彻底完成并稳定上线，可正常发布给玩家。** 所有正式立项任务（v10.2 开局菜单 T1-T7→5.0；三件玩家反馈 EJS/数据库版本/AM-SP→5.1+6.0；autofix 三层修复→6.0）全部 [x] 发布到 origin/main，HEAD==origin/main==`8683b76`、发布版 `版本: '6.0'`、cache `phase111-autofix-race-chatchanged`。端到端真机复测三大反馈全部验证通过。
**后续改进：暂停，等用户提出新需求再立项。** 下方「遗留/已知」与「旧可选后续任务」均为不影响游玩的历史技术债或条件性优化（无触发条件不动）。

### 遗留/已知（不影响游玩·非待办）
- [~] 5 个 `导入模板_2026-06-03-xxx` 废模板预设（chat 持久化垃圾）：用户拍板**不清理**——库不暴露删除 API、多层存储手改有风险、不影响功能、修复后不再新增。
- [~] phase110(`a8fae61`) 带残留竞态（时好时坏），已被 phase111 修正取代。
- [~] `npx tsc --noEmit` 既有全项目类型问题（LiteralUnion/Web Bluetooth/未使用 z），非本批引入。

### 上一阶段（v10.2 开局菜单，已全部完成发布到 5.0）
- 见下方「新阶段：v10.2 对比改进」章节，T1-T7 全部 [x]。

## 已完成任务清单

- [x] 解析 `v10.2.png`，确认可借鉴点是三级开局菜单与自动填充时间/地点，而不是新增可见手填框。
- [x] 对齐项目规则：`time`/`loc` 由节点自带，不新增可见输入框。
- [x] 设计并落地三级节点结构：大类 -> 中间组 -> 具体事件。
- [x] 将节点规模从旧 17 个扩展到 55 个真实事件节点，覆盖普通人、总部、民间驭鬼者、规则地点、后期/番外五类入口。
- [x] 同步修改实际首屏入口 `src/神秘复苏模拟器/index.yaml`，避免只改欢迎页 txt。
- [x] 同步 `src/神秘复苏模拟器/世界书/自定义开局/欢迎页.txt` 为三级 `rawAnchors -> anchors`。
- [x] 修复界面增强脚本的 root selector、select/option 读取和手风琴同级关闭逻辑。
- [x] 清理蛊真人残留文案：如 `身份与根骨`、`修为与流派` 等。
- [x] 收紧特殊能力默认项，将“永久死机驾驭”标为“强外挂模式（非默认）”。
- [x] 完成开发版构建、发布版同步、PNG 元数据解码验证、CDP 片段复测、真实 SillyTavern 复测。
- [x] 完成两段式 CDN 发布并推送到 `origin/main`。

## 新阶段：v10.2 对比改进（2026-06-02 立项）

来源：再次对比 `v10.2.png` 与当前卡真实状态。旧 `v10.2_improvement_recommendations.md` 列的「首条短标签欢迎页/通用输入面板/隐藏思维链」已全部落地，本阶段只做 v10.2 有、当前卡偏弱的点。任务编号对应 TaskCreate 列表。

- [x] [高][T1] seed 确定性掷骰：已落地三处改动——`index.yaml` 新增 `[显示]渲染神秘复苏掷骰条`(id ...2007) + `[不发送]去除神秘复苏掷骰条`(id ...2008)；`脚本/界面美化/index.ts` 新增 `computeFairRoll()`+`enhanceRollBars()` 并挂进 `enhancePanels()`；规则文本 `灵异判定路由与输入锁规则.txt` 新增确定性掷骰协议、`短标签字段协议.txt` 登记 `<mfrs_roll>`、路由激活关键字加 `mfrs_roll/d100/掷骰/不确定性`。静态校验通过（YAML 可解析、正则编译/匹配/清除 OK、复算公式自洽）。实机构建+真实页验证归 T6。
- [x] [中][T2] 短标签面板按类型配色：在 `[显示]渲染神秘复苏短标签面板` 正则的 `<style>` 内按语义分 6 色系覆盖 `--sp-accent/--sp-accent-dim/--sp-border/--sp-icon`（血红=遭遇/厉鬼/鬼奴/用鬼/事件☠、黄金=压制/拼图⛓、幽蓝=鬼域/地点❖、冷青=判定/推演◈、琥珀=物品/媒介✦、紫=选项⊳），标题色/徽章/左边条整体联动，title::before 图标改 var 驱动。纯 CSS、不拆正则。YAML 可解析、CSS 配平 59/59 校验通过。实机验证归 T6。
- [x] [中][T3]（依赖 T2）面板字段折叠分层：脚本 `enhanceShortTagPanels()` 重构——提取纯函数 `renderSpLine()`，按 `SP_PRIMARY_KEY`（标题/死亡风险/复苏风险/结果/结论/建议/下一步/确认度/状态）+ 第一行分核心/次要；阈值 `字段>6 且次要≥3` 才折叠，核心直显、次要收进 `<details class=sp-secondary>`；否则全直显（行为同改造前，零回归）。`index.yaml` 补 `.sp-secondary/.sp-secondary-body` 折叠样式。校验：YAML OK、CSS 67/67 配平、长面板折叠/短面板不折叠验证通过。实机验证归 T6。
- [x] [低][T4]（依赖 T2）选项面板分支增强：脚本 `enhanceChoicePanels`/`renderChoices` 改造——新增 `splitChoiceDetail()` 解析每个选项的「死亡风险/复苏风险/风险来源/代价」明细（原 `getActionText` 直接丢弃这些信息）；每项结构从单 button 改为 `div.mfrs-choice-item`（button 填入 + 可折叠 `details.mfrs-choice-why` 风险明细，默认折叠、死亡/复苏风险分色）。补 choice CSS。校验：行动/明细正确分离、自定义/无明细不显示折叠。实机验证归 T6。
- [x] [低/独立][T5] 世界书 8192 预算精修（**完成·结论=无需改动**，零删改）：非 v10.2 对比项，是自身痛点。**测量修正结论：真正蓝灯常驻只有 4 个条目**（系统提示词/0 ~2191tok、变量输出格式 ~1349tok、变量列表 ~1018tok[EJS模板渲染后大幅缩水]、世界铁律 ~205tok）——`世界书常驻规则` 文件夹其余条目均被各自绿灯激活策略覆盖成按需（阶段J 已压得很干净）。去重明细：仅系统提示词世界观6条 vs 世界铁律有重叠（省~200-250tok 但引入隐性耦合），变量输出格式/变量列表/世界铁律均不建议动。**用户 2026-06-03 拍板不动**，保持现状。详见 progress.md。
- [x] [T6]（依赖 T1-T5）构建与真实页验证：`npm run build` 沙盒外成功（三 entry compiled successfully，无 EPERM）；dist 产物含 mfrs-roll/sp-secondary/mfrs-choice-why 等新逻辑；`git diff --check` 通过。Chrome DevTools 验证（含 T5 之外的 T1-T4）：① T1 掷骰复算逻辑三例正确（不一致→按 seed 复算46/未通过/⚠提示、一致+通过、一致+未通过）；② T2 六色系+图标计算值全部正确（☠血红/⛓黄金/❖幽蓝/◈冷青/✦琥珀/⊳紫）；③ T3 长面板折叠(直显4/折叠6)、短面板不折叠；④ T4 选项明细解析+折叠展开正确；⑤ 390px 移动端 scrollWidth==390 无横向溢出；控制台 0 错误。注：真实页跑的是旧版导入脚本，验证用新版逻辑+新版CSS在真实宿主环境注入测试页完成。
- [x] [T7]（依赖 T6）发布版同步与推送：**已完成（2026-06-03）**。两段式 CDN 发布——资源提交 `482b71a258f2911101fd2461d819558a1ac3c609`（开发版源码+dist）、发布提交 `7457a28`（发布版同步+脚本）。发布版版本 **4.0→5.0**（用户要求）；cache `phase107-deterministic-dice-5-0`。PNG `chara/ccv3` 元数据核验为 5.0+新hash+mfrs_roll，无旧值残留。HEAD==origin/main==7457a28。详见 progress.md。

执行顺序建议：T1 / T2 / T5 可并行起步 → T3、T4 接 T2 → 全部完成后 T6 → T7。

## 旧可选后续任务

- [ ] 处理既有 `npx tsc --noEmit` 全项目类型问题：`LiteralUnion`、Web Bluetooth 类型、未使用 `z`。
- [ ] 若真实用户仍反馈暗黑主题过重，考虑把“功能增强”和“暗黑皮肤”拆分，或增加低对比主题开关。
- [ ] 若继续做剧情精修，优先检查鬼邮局、鬼湖、国王组织、番外线的小剧情锚点和关键词误召回。
- [ ] 如需正式整理文档，可将 `findings.md` 顶部运行流程迁移/复制为 `docs/runtime-flow.md`，但 planning 内仍应保留速览。

## 当前 Git 与发布信息

- **当前远端 HEAD：`286d8b5 chore: release version bumped to 6.1`（2026-06-03，本地==远端==286d8b5）。**
- **最新发布：current_time→game_time 保留字修复 + 版本升 6.1**（三段提交）：
  - 资源提交 `d2d5733`：schema 源 `数据库/神秘复苏表格SQL_v1.json`（current_time→game_time 4 处）+ 两个 dist bundle（`数据库前端`/`神秘复苏数据库前端` index.js，game_time 已烧进、current_time=0）。**此即当前 CDN_REF。**
  - 发布提交 `660b9ab`：publish-card.mjs（CDN_REF→d2d5733、cache→phase112）+ 发布版 index.yaml/schema 同步 + 重打包 PNG（当时版本 6.0）。
  - 版本提交 `286d8b5`：仅把发布版 releaseVersion 6.0→6.1 并重打包 PNG（dist/CDN_REF 不变）。
- 当前发布 cache：`phase112-game-time-rename`。
- **发布版版本：`版本: '6.1'`**。index.yaml + PNG chara/ccv3 均核验为 6.1、零 6.0 残留。
- 根因/修复/为何用户没遇到：详见 progress.md 顶部 2026-06-03 current_time 条目；经验已沉淀 memory `feedback_acu_schema_traps.md`。
- 发布哈希链历史（dist 仍 import 14a556d vendor SP fork）：
  - `14a556d` vendor fork（AM→SP）/ `ed5b436` 回填重build / `dd92988` 路D发布 6.0 phase109。
  - `a320f77` autofix scope:chat / `a8fae61` 发布 phase110（**有残留竞态，已被 phase111 修正**）。
  - `533a709` autofix 竞态+热切换 / `8683b76` 发布 phase111 6.0。
- 上一轮（历史）：件1+件2 资源 `a9d9bca`、cache phase108、发布版 5.1。

## 压缩归档说明

- 2026-06-02 已执行 planning 压缩。
- 压缩前原文快照位于 `planning_archive_2026-06/`：`task_plan.before-compress.md`、`progress.before-compress.md`、`findings.before-compress.md`。
- 本文件保留运行流程速览、当前状态、已完成任务和可选后续；详细历史流水请查归档快照。

## 边界

- 不要提交本地截图、备份 JSON、`.tmp-chrome-*`、`v10.2.png`、`神秘复苏.txt`、planning 文件和归档，除非用户明确要求。
- 不要回滚用户或历史生成的未跟踪材料。
- 修改开局入口时必须同时检查实际 `index.yaml` 和世界书欢迎页 txt。
- 修改发布版 CDN 时必须先确认目标 dist 资源提交已经存在于远端。

---

## 新阶段：SQL Debug 复发问题修复清单（2026-06-05 立项，D0-D9 已完成，D10 待授权）

**目标**：基于 `acu-logs-2026-06-05T14-35-20-801Z.json` 的 9 Error / 5 Warn，彻底修复 SQL Mode 中的四类问题：`revival_risk_level='极低'` 枚举失败、模型写旧表 `log_summary`、`</thought>`/解释文字混入 SQL、API `Bad Gateway` 被概览误归类。修复必须不回退 6.6 已验证的 14 表、玩家状态表头校准、人物 row_id、纪要长度约束、SQLite/native 切换和发布链路。

**边界**：
- 当前先做任务清单，不修业务代码、不构建、不提交、不推送。
- 当前工作区存在未提交的 `vendor/shujuku-sp-fork/index.js` 试修补；执行修复前必须先审查该 diff，不能默认它已经发布或完全正确。
- 不回滚既有无关 diff，尤其是状态栏 dist 差异、planning、截图、备份文件。
- SQL 验证优先使用隔离内存库或临时表；真实页面 smoke 只做可逆探针，结束后恢复 `storageMode=native`。

### 修复任务清单

- [x] **D0：基线冻结与日志证据归档**
  - 记录 `git status --short`、`git diff --stat`、HEAD/origin、当前发布版版本/hash/cache。
  - 重新解析三份日志：`07-03`、`13-36`、`14-35 Debug`，把错误按根因去重。
  - Gate：形成“日志错误 -> 代码/模板落点 -> 回归用例”的映射，不直接进入修复。
  - **D0 结果（2026-06-05）**：完成基线冻结。`HEAD==origin/main==f2ab050b60c3664e65c52dd1e574c04226a6bfbb`，当前分支 `main`，`git describe=v0.0.77-dirty`，发布配置 `releaseVersion=6.6`、`CDN_REF=a554ba8040b9c9804a0c55136c922d8716aa656d`、`CDN_CACHE_VERSION=phase118-sql-template-autocalibrate-6-6`，发布版 YAML `版本: '6.6'`。当前 tracked diff 为 `vendor/shujuku-sp-fork/index.js` 与既有 `dist/神秘复苏模拟器/界面/状态栏/index.html`；未跟踪 planning/截图/备份文件保持边界不动。Downloads 当前只保留 `acu-logs-2026-06-05T14-35-20-801Z.json`（SHA256 `885717EF20DFEF82F33271C190262A99363A27BD5A565D8455326869EC87029C`），前两份指定日志路径当前不存在，历史结论沿用既有 findings/handoff 摘要。最新 Debug 重新解析为 1933 条：1919 debug、9 error、5 warn；严重日志按根因去重为 `risk_enum_revival_level` 3 条、`api_bad_gateway` 1 条、API 重试 warn 1 条、`old_table_log_summary` 3 条、`sql_wrapper_fragment` 6 条。

- [x] **D1：审查当前未提交 vendor 试修补**
  - 检查 `vendor/shujuku-sp-fork/index.js` 中已存在的 SQL 清洗、风险值归一化、日志分类改动。
  - 判断哪些改动可保留、哪些需要重写；不把本地未发布 diff 当作线上事实。
  - Gate：输出保留/废弃清单；`node --check vendor/shujuku-sp-fork/index.js` 通过后才继续。
  - **D1 结果（2026-06-05）**：完成审查。vendor diff 为 94 insertions / 23 deletions，`node --check vendor/shujuku-sp-fork/index.js` 与 `git diff --check` 均通过。可保留作为 D2 起点：`normalizeRiskLevelValue_ACU()`、`death_risk_level/revival_risk_level` 白名单、`INSERT OR REPLACE` 多行 VALUES 归一化、`executeMutation/applyEdits` 路径调用 `normalizeStatementValues()`。需重写/补强：风险 alias 缺 `严重/极重` 等；模板仍未显式禁止非法风险等级；`extractSqlStatementsFromTableEdit_ACU()` 只跳过开头或独立 wrapper 行，无法处理 SQL 语句之间夹入解释文字/`</thought>` 的 Debug 复发样本；当前没有 `log_summary` 旧表名来源或执行前白名单；`parseNonStreamResponse_ACU()` 仍把 Bad Gateway 记为 Unknown response format；`interpretLogEntry()` 仍会把 `no such table` 等统一归 SQL issue，缺旧表名/API 网关细分。结论：保留 D2 的归一化骨架，D3/D4/D5/D6 需要继续实现。

- [x] **D2：修复行动建议风险枚举**
  - 模板层：在开发版和发布版 `action_suggestions` 的 note/init/update 中明确 `death_risk_level` 与 `revival_risk_level` 只允许 `无/低/中/高/致命/未知`，禁止 `极低/极高/很低/严重` 等自然语言等级。
  - 执行前兜底：只针对风险枚举列做归一化，如 `极低/很低 -> 低`、`极高/极重/严重 -> 致命`、空值或无法识别 -> `未知`。
  - Gate：含 4 行 `INSERT OR REPLACE INTO action_suggestions`、`极低/极高` 的 SQL 在内存 SQLite 中可成功落库，且非风险列不被误改。
  - **D2 结果（2026-06-05）**：完成。开发版与发布版 `sheet_action_suggestions` 均新增枚举硬约束说明，`updateNode` 明确只允许 `无/低/中/高/致命/未知`；vendor 风险列归一化扩展为合法值白名单，`极低/很低/轻微/低风险 -> 低`、`极高/很高/非常高/严重/极重/致死/致命风险 -> 致命`，空值或无法识别值 -> `未知`。fixture 使用实际 vendor `normalizeStatementValues()` 归一化多行 `INSERT OR REPLACE` 后写入内存 SQLite 通过，4 行均落入合法枚举且无非法值残留。

- [x] **D3：修复旧表名 `log_summary`**
  - 搜索 prompt、默认 SQL、模板说明、vendor 合并纪要 prompt、发布版产物中所有 `log_summary` 来源。
  - 模板层明确事件纪要表名为 `chronicle`，禁止生成 `log_summary`。
  - 执行前增加表名白名单或预检：遇到 `log_summary` 时给出明确错误分类或提示词修正，不允许直接打到 SQLite 形成 `no such table`。
  - Gate：fixture 中的 `INSERT INTO log_summary ...` 不再产生 SQLite `no such table` 原始错误；仪表盘能指向“旧表名/提示词问题”。
  - **D3 结果（2026-06-05）**：完成基础修复。开发版与发布版 `sheet_chronicle` 均新增表名硬约束，说明事件纪要 SQL 表名固定为 `chronicle`，旧表 `log_summary` 不存在；vendor 的 AI SQL `applyEdits()` 在执行事务前调用 `_validateMutationTargetTables()`，从当前模板 DDL 白名单校验目标表名，遇到 `log_summary` 会抛出 `[SqlTableService] SQL 目标表 log_summary 不存在；事件纪要请写入 chronicle。请修正 SQL 表名后重试。`，不再直达 SQLite。静态搜索确认源码/模板中没有 `INSERT/UPDATE/DELETE log_summary` 示例；fixture 确认 `extractTableNamesFromStatements()` 能从 Debug 同型 SQL 中捕获 `log_summary`。仪表盘细分文案归 D5 继续完善。

- [x] **D4：升级 SQL 清洗与语句级过滤**
  - 覆盖 `<tableEdit>` 内、SQL 语句之间、SQL 语句之前/之后的 `</thought>`、`<content>`、markdown 围栏、解释文字。
  - 拆分后只执行合法 SQL 起始语句：`INSERT`、`UPDATE`、`DELETE`、`REPLACE`、`WITH`，必要时保留受控 `CREATE TEMP/DROP TEMP/SELECT` 测试路径。
  - 对被跳过残片记录 debug/warn 摘要，但不把残片交给 SQL provider。
  - Gate：两类 Debug 复现样本都不再出现 `near "<": syntax error` 或 `near "这样符合...": syntax error`。
  - **D4 结果（2026-06-06）**：完成。`extractSqlStatementsFromTableEdit_ACU()` 改为按 SQL 语句候选提取，剥离 `</thought>`/`<content>`/`<tableEdit>`/markdown 围栏，跳过 SQL 前后与语句之间的解释文字；`applyEdits()` 拆分后再经 `filterSqlEditStatements_ACU()` 过滤，仅保留合法 SQL 起始语句。fixture 覆盖 `</thought>` 开头、两条 `INSERT` 中间夹“这样符合...”解释文字、markdown fenced `INSERT OR REPLACE`，输出均不含残片并能识别 `INSERT OR REPLACE`。

- [x] **D5：SQL 预检与错误分类防线**
  - 增加 SQL Mode 执行前预检：表名必须属于 14 表；列名必须存在；风险枚举列先归一化再执行。
  - 对 `CHECK constraint`、`no such table`、`syntax error`、API 上游错误分别打标签，避免仪表盘“一锅端”。
  - Gate：同一批 fixture 能输出可读分类，且不会掩盖真正 SQLite 约束错误。
  - **D5 结果（2026-06-06）**：完成基础防线。AI SQL `applyEdits()` 执行前用当前模板 DDL 生成表/列白名单：目标表不存在时拦截，显式列名不在 DDL 中时抛出 `SQL 目标列不在当前模板中...`；风险枚举归一化仍在预检前完成。仪表盘新增并验证 5 类细分：API 网关、旧表名、SQL 语法/包装残片、SQL 约束失败、SQL 表/列不匹配。fixture 中 `log_summary`、`chronicle.bad_column`、`near "<": syntax error`、`CHECK constraint`、`Bad Gateway` 均能归到对应文案。

- [x] **D6：API `Bad Gateway` 单独处理**
  - `parseNonStreamResponse` 识别 `{error:{message:"Bad Gateway"}}`，归类为上游/API 网关错误。
  - 加入有限重试/退避或至少给出非 SQL 的运行日志说明。
  - Gate：Bad Gateway fixture 不再被仪表盘描述成 SQL 或表结构问题。
  - **D6 结果（2026-06-06）**：完成。`parseNonStreamResponse_ACU()` 识别 `data.error`，其中 `Bad Gateway` 会记录 `[parseNonStreamResponse] API upstream gateway error` 并抛出 `API上游网关错误: Bad Gateway`，不再返回 null 触发“API响应格式不正确或内容为空”。仪表盘优先把 `Bad Gateway/API上游网关错误` 归类为 API 网关问题，不再误报 SQL/表结构问题。

- [x] **D7：自动化回归用例**
  - 新增或扩展脚本测试：三份日志的最小复现 SQL、14 表模板一致性、`action_suggestions` 枚举归一化、`log_summary` 拦截、`</thought>` 夹杂 SQL 清洗、Bad Gateway 分类。
  - 使用内存 SQLite 或隔离测试库，禁止污染真实玩家存档。
  - Gate：`git diff --check`、`node --check`、相关 fixture 测试全部通过。
  - **D7 结果（2026-06-06）**：完成。新增 `scripts/verify-sql-debug-regressions.mjs`，直接读取当前 vendor 与两份 SQL 模板，覆盖 2 份模板 JSON parse、14 表一致性、关键表存在、`action_suggestions` 风险枚举归一化后写入 `node:sqlite` 内存库、`log_summary` 旧表名识别、未知列预检、`</thought>`/解释文字/markdown fenced SQL 清洗、Bad Gateway 抛错、仪表盘 5 类细分文案归类。已通过 `node --check scripts/verify-sql-debug-regressions.mjs`、`node --check vendor/shujuku-sp-fork/index.js`、`git diff --check` 和 `node scripts/verify-sql-debug-regressions.mjs`；运行时仅出现 Node `node:sqlite` experimental warning，不影响 gate。

- [x] **D8：Chrome DevTools MCP / Chrome 浏览器辅助验证**
  - 安装或确认 Chrome 浏览器辅助可用；优先连接现有 `127.0.0.1:9222` 真页，必要时启动独立 Chrome remote-debugging profile。
  - 真页验证流程：发布卡 `characterId=3`、加载新 marker、native 基线 14 表、切 sqlite、SQL 控制台可见、执行只读/临时表探针、三口径导出均 14 表、仪表盘不再报 1/14 mismatch。
  - 用 Debug 复现样本在前端日志中验证 0 个新 SQL Error；结束恢复 native 并关闭设置窗。
  - Gate：截图/日志摘要记录到 `findings.md`，不提交临时 Chrome profile。
  - **D8 结果（2026-06-06）**：完成。`agent-browser` CLI 本机不可用，但现有 Chrome DevTools 端口 `127.0.0.1:9222` 可连，使用 CDP WebSocket 对 SillyTavern 真页执行验证。页面切到发布卡 `characterId=3` / `神秘复苏模拟器发布版`，marker 为 `mfrs-r2sql-log-fixes-6-6`。native 基线：`storageMode=native`，`getTableTemplate()` / `AutoCardUpdaterAPI.exportTableAsJson()` / `MysteryDatabaseFrontend.exportCurrentData()` 均为 14 表，`missingNames=[]`、`mismatchNames=[]`，玩家状态表头为 `死亡风险镜像/复苏风险镜像`。SQLite 验证：切换到 `sqlite` 后 SQL 控制台 `#shujuku_v120-sql-input` 与执行按钮可见；`sqlite_master` 只读查询返回 14 张业务表；临时表 `acu_sql_probe` 创建、插入、读取 `ok`、DROP 后 `sqlite_temp_master` 查询 0 行。SQLite 三口径仍均 14 表且无 mismatch。收尾已恢复 `storageMode=native`，关闭设置窗，最终三口径仍 14 表。CDP 期间未捕获新的 SQL Error；捕获到 2 条既有历史数据 seed 的非阻塞 Warn（`sheet_chronicle` 旧短文本不满足 200-600 字，SyncBridge 保留空表结构），不影响本轮 gate，但已记录为运行态边界。

- [x] **D9：构建与发布前 gate**
  - `npm run build`，如沙箱因 Windows `spawn EPERM` 失败，按权限流程在沙箱外重跑。
  - 验证 dist 中新模板、新 vendor marker、新 cache 均一致；旧 hash/cache 无残留。
  - Gate：只包含本次修复相关源文件、dist、发布版产物；无状态栏等无关 diff 混入。
  - **D9 结果（2026-06-06）**：完成。构建前后均通过 `node --check vendor/shujuku-sp-fork/index.js`、`node --check scripts/verify-sql-debug-regressions.mjs`、`git diff --check` 与 `node scripts/verify-sql-debug-regressions.mjs`；回归脚本输出 `[ok] SQL Debug regressions verified: templates=2, sheets=14, risk normalization, old table preflight, SQL cleaning, Bad Gateway, dashboard classification`，仅有 Node `node:sqlite` experimental warning，不影响 gate。`npm run build` 在沙箱内命中已知 Windows `spawn EPERM`，按权限流程沙箱外重跑成功，所有 webpack entry 均 `compiled successfully`。构建后 tracked diff 收敛为两份 SQL 模板、`vendor/shujuku-sp-fork/index.js`、两份数据库前端 dist，以及既有无关 `dist/神秘复苏模拟器/界面/状态栏/index.html`；`scripts/publish-card.mjs` 无 diff，D10 发布链路未执行。计数式核对确认两份 dist 数据库前端已包含 `死亡风险镜像` 与 `旧表名 log_summary` 模板提示，vendor 中 `API上游网关错误` 分类逻辑命中 2 处。

- [x] **D10：发布链路（complete·2026-06-06）**
  - 资源提交 -> 回填 `CDN_REF/CDN_CACHE_VERSION` -> 重新 build/publish-card -> 发布版 YAML/PNG 元数据验证 -> 提交并推送。
  - 建议版本：`6.7` 或 `6.6.1`，由用户确认。
  - 参考文件不提交：planning/截图/备份/临时 Chrome 文件，以及 `酒馆助手脚本-星河璀璨·数据库.json`、`酒馆助手脚本-spv3.9.5·数据库.json`。
  - Gate：CDN 200、PNG `ccv3` 元数据含新版本/hash/cache、真页 CDP smoke 通过。
  - **D10 结果（2026-06-06）**：完成并推送到 GitHub。三段提交链：`37a10c0817845c3276a1846d331f9c7d02efe39e`（vendor/SQL 模板/数据库前端 dist/回归脚本资源提交） -> `26cbab63eb996030811bfda86d9281650a449821`（loader/dist 回填到 patched vendor，cache/marker 为 `phase119-sql-debug-regressions-6-7` / `mfrs-sql-debug-regressions-6-7`） -> `7cd0b249fde8c40afd193ace908ce2c6e56bd7e1`（发布 6.7）。`scripts/publish-card.mjs`、发布版 YAML 与 PNG `chara/ccv3` 元数据均为版本 `6.7`、CDN_REF `26cbab63eb996030811bfda86d9281650a449821`、cache `phase119-sql-debug-regressions-6-7`；旧 `6.6` / `a554ba8040b9c9804a0c55136c922d8716aa656d` / `phase118-sql-template-autocalibrate-6-6` 0 残留。push 后 `HEAD==origin/main==7cd0b249fde8c40afd193ace908ce2c6e56bd7e1`。CDN smoke：两个发布 loader 200 且含新 marker/vendor hash，patched vendor 200 且含 `API上游网关错误` 修复。CDP 真页 smoke：发布卡 `characterId=3`，marker/hostMarker `mfrs-sql-debug-regressions-6-7`，`storageMode=native`，模板/导出/前端导出/面板均 14 表，`missingNames=[]`、`mismatchNames=[]`。参考文件、planning、截图、备份、临时 Chrome profile、状态栏 HTML 既有 diff、根目录 PNG 删除均未提交。

### 防回归验收标准

- 三份日志中的已知 SQL 错误均有对应修复或明确非 SQL 分类。
- `action_suggestions` 不再因 `极低/极高` 等自然语言风险等级失败。
- `log_summary` 不再直达 SQLite 产生 `no such table`。
- 任意 `</thought>`、解释文字、代码围栏残片不再进入 SQL provider。
- API `Bad Gateway` 不再被概览误导为 SQL/表结构问题。
- 开发版、发布版、dist、PNG、CDN 真页均保持 14 表，`mismatchNames=[]`。
## 最新状态 - 2026-06-07 13:23 CST - P7 chronicle_text SQL 报错修复完成

- **Status**: P7 local/runtime fix complete；P8/P9 发布链路未执行。
- **权威口径**: SQL 报错继续以 `SillyTavern 左下角菜单 -> SP·数据库 III -> 高级工具 -> 运行日志` 为准。页面正文、console、body 文本只作辅助证据。
- **根因**: `sheet_chronicle` 有一行旧数据把第 6 列 `chronicle_text` 写成 `SP0001`，导致 SyncBridge 向 SQLite 插入时触发 `CHECK(LENGTH(chronicle_text) >= 200 AND LENGTH(chronicle_text) <= 600)`。
- **修复**: `vendor/shujuku-sp-fork/index.js` 在 SyncBridge 写入前过滤无效 `chronicle_text` 行；AI 直写 SQL 的 `applyEdits()` 事务前也会拦截 `INSERT/REPLACE INTO chronicle` 中过短或疑似编号的 `chronicle_text`。两份 `神秘复苏表格SQL_v1.json` 已提示禁止把 `SP0001/SP0002` 等编号写入第 6 列。
- **验证**: `node --check vendor\shujuku-sp-fork\index.js`、`node --check scripts\verify-sql-debug-regressions.mjs`、`git diff --check`、`node scripts\verify-sql-debug-regressions.mjs`、`npm run build` 均通过；回归脚本仅有 Node `node:sqlite` experimental warning。
- **真页复核**: CDP `9222` 探针读取 SP 运行日志，`logRowCount=0`，`CHECK constraint failed` / `ERROR SQL Mode` / `ERROR SqlTableService` / `near "INSERT"` / `near "WHERE"` / `log_summary` / `event_summary` 均为 0；当前 marker 为 `mfrs-local-p7-chronicle-direct-guard`。
- **未执行**: 未提交、未推送、未走 CDN/发布版回填链路；当前页面仍是本地 vendor import 验证态。如需正式发布，下一阶段执行资源提交 -> loader CDN_REF/cache 回填 -> build -> publish-card -> CDN/真页 smoke -> commit/push。

---

## 新阶段：Schema/CHECK 约束不合规类通用根治清单（2026-06-07 立项，执行中）

**目标**：彻底处理“SQL 能解析、表列存在，但写入值违反 schema / CHECK 约束”的大类问题。已知样本包括 `action_suggestions.revival_risk_level='极低'`、`chronicle.chronicle_text='SP0001'`、本轮日志 `supernatural_events.handling_status='爆发中'`。后续不应再让这类错误以原始 SQLite `CHECK constraint failed` 形式进入 SP·数据库 III 运行日志；必须在执行前被归一化、拦截、分类并进入回归。

**当前边界**：
- 当前按阶段执行根治清单；S0-S2 已允许修改业务代码和回归脚本，但不提交、不推送、不走发布链路。
- SQL/数据库报错验收仍以 `SillyTavern 左下角菜单 -> SP·数据库 III -> 高级工具 -> 运行日志` 为准。
- 不回滚既有本地修复和无关 dirty 文件；后续执行前必须重新冻结 `git status` 和当前 marker。
- 真实页验证必须使用可逆探针；不要污染玩家主存档。

### 通用根治任务清单

- [x] **S0：基线冻结与样本归档**
  - 读取并归档 `C:\Users\linlang\Downloads\acu-logs-2026-06-07T06-53-49-116Z.json` 的三条日志。
  - 把样本归类为 `schema_check_enum_violation`：`supernatural_events.handling_status='爆发中'` 违反 `CHECK handling_status IN (...)`。
  - 同步汇总历史同类样本：`revival_risk_level='极低'`、`chronicle_text='SP0001'`、任何长度/枚举/格式 CHECK 失败。
  - Gate：形成“表.字段 -> 非法值 -> 允许值/规则 -> 期望处理方式”的样本矩阵。
  - **S0 结果（2026-06-07）**：完成。当前分支 `main`，本地 `HEAD=3ef8d3bb6f10c3788ad707107d44b0d406221fd0`，`origin/main=295ed8bc9a11333e0c5032e4899dc3ebd066fd5c`，工作区已有业务修复相关 dirty 文件与 planning/截图/临时 Chrome 等未跟踪文件，本阶段未修改业务代码、未构建、未提交、未推送。日志 `acu-logs-2026-06-07T06-53-49-116Z.json` 大小 1789 bytes，SHA256 `CCDCE56B90D64526880586ACC1DCEA483527CB922387CB81D25559C1851465DE`，共 3 条：`SqlTableService` error 1、`SQL Mode` error 1、`shujuku_v120` warn 1，时间范围 `2026-06-07T06:04:53.705Z` 到 `2026-06-07T06:04:53.719Z`。三条均为同一 SQL：`UPDATE supernatural_events ... handling_status='爆发中' ...`，归类为 `schema_check_enum_violation`。样本矩阵如下：

| 表.字段 | 非法值 / 失败形态 | 允许值 / 规则 | 期望处理方式 |
|---|---|---|---|
| `supernatural_events.handling_status` | `爆发中` | `未处理/调查中/对抗中/已压制/已关押/失控扩散/结束` | 通用枚举预检识别；`爆发中/正在爆发/扩散中` 优先归一化为 `失控扩散`，无法判断时拦截，不进入 SQLite 原始 CHECK |
| `action_suggestions.revival_risk_level` | `极低` | `无/低/中/高/致命/未知` | 通用枚举预检识别；`极低/很低/轻微/低风险` 归一化为 `低` |
| `action_suggestions.death_risk_level` / `revival_risk_level` | `极高/严重/极重` 等自然语言等级 | `无/低/中/高/致命/未知` | 通用枚举预检识别；高危近义词归一化为 `致命`，无法判断写 `未知` 或拦截 |
| `chronicle.chronicle_text` | `SP0001` / `SP0002` 编号误填 | 200-600 字正文纪要，不能是编号、短摘要或 code_index | SyncBridge 行级校验跳过坏 seed 行；AI SQL 预检拦截直写坏值并给可读原因 |
| `chronicle.chronicle_text` | 正文短于 200 字 | `LENGTH(chronicle_text) >= 200 AND <= 600` | 长度预检拦截或跳过，不进入 SQLite 原始 CHECK |
| 所有 CHECK 枚举字段 | 模型自然语言近义词 | DDL `CHECK(... IN (...))` 自动提取出的允许值 | S1-S3 建立 constraint map 和集中别名表，避免继续逐字段补丁 |

- [x] **S1：建立 schema 约束注册表**
  - 从两份 `神秘复苏表格SQL_v1.json` 的 DDL 自动解析 14 表字段、类型、`CHECK(... IN (...))` 枚举、`LENGTH` 范围、`NOT NULL`、`UNIQUE` 等约束。
  - 生成运行时可查询的 constraint map，例如 `table.column -> enum/range/pattern/required`。
  - Gate：两份模板解析结果一致，14 表均有表/列信息；`supernatural_events.handling_status` 能自动提取允许值。
  - **S1 结果（2026-06-07）**：完成。`vendor/shujuku-sp-fork/index.js` 新增 DDL 约束注册表纯解析工具：`parseDDLConstraintRegistry_ACU()` 会解析表名、中文表名、列顺序、列类型、注释、`PRIMARY KEY`、`NOT NULL`、`UNIQUE`、`CHECK ... IN` 枚举、`LENGTH(...)` 范围、数值 `BETWEEN`/比较、`GLOB` 和 `TRIM(col) <> ''` 非空约束。`scripts/verify-sql-debug-regressions.mjs` 新增 S1 gate：两份 SQL 模板的 registry 必须完全一致且包含 14 表；已断言 `supernatural_events.handling_status` 枚举为 `未处理/调查中/对抗中/已压制/已关押/失控扩散/结束`，`action_suggestions.revival_risk_level` 枚举为 `无/低/中/高/致命/未知`，`chronicle.chronicle_text` 长度范围为 `200-600`，`global_state.world_pressure` 数值范围为 `0-100`，`chronicle.code_index` GLOB 模式和 `characters.name` UNIQUE 可解析。S1 不接入执行前拦截，S2 再使用该 registry。验证通过：`node --check vendor/shujuku-sp-fork/index.js`、`node --check scripts/verify-sql-debug-regressions.mjs`、`git diff --check`、`node scripts/verify-sql-debug-regressions.mjs`；回归脚本仅有 Node `node:sqlite` experimental warning。
  - **S1 遇到的错误**：首次回归失败为 `global_state should include columns`，原因是 DDL 逗号拆分后的片段可能以前一列行注释开头，旧注释剥离函数把整段截断。已改为逐行剥离 `--` 注释。第二次回归失败是 VM 上下文数组与 Node 主上下文数组原型不同导致 `assert/strict` 判等失败；已在回归脚本中对 registry 做 JSON 普通对象化后断言。

- [x] **S2：统一 SQL 执行前 schema 预检**
  - 在 AI SQL 进入 SQLite 前，对 `INSERT`、`REPLACE`、`UPDATE` 的显式字段和值做统一预检。
  - 预检覆盖枚举、长度、疑似字段错位、空值、明显编号误填等 CHECK 风险。
  - 原则：能确定映射的常见别名先归一化；不能确定的语句拦截并给可读错误，不交给 SQLite。
  - Gate：本轮 `handling_status='爆发中'` 不再触发原始 `CHECK constraint failed`。
  - **S2 结果（2026-06-07）**：完成。`vendor/shujuku-sp-fork/index.js` 新增 `extractSqlMutationValuesForConstraintCheck_ACU()` 与 `validateSqlStatementsAgainstConstraintRegistry_ACU()`，在 `SqlTableService.applyEdits()` 和 `executeMutation()` 进入 SQLite 前使用 S1 的 DDL constraint registry 做字段级预检；`SqlTableService._getKnownSqlConstraintRegistry()` 会从当前聊天模板与运行时 `currentJsonTableData_ACU` 收集 DDL。预检只检查能稳定解析的显式静态值，不猜表达式结果；覆盖 `CHECK ... IN` 枚举、`LENGTH` 范围、数值范围、`GLOB`、`TRIM(col) <> ''` 非空与显式 `NULL`。本阶段未做 S3 的通用枚举别名归一化，因此 `supernatural_events.handling_status='爆发中'` 会被拦截为 `[SqlTableService] SQL schema/CHECK 约束不合规: supernatural_events.handling_status="爆发中" 不在允许值 [...]。`，而不是自动改写成 `失控扩散`。`scripts/verify-sql-debug-regressions.mjs` 新增 S2 gate，固定 `handling_status='爆发中'` 不含原始 `CHECK constraint failed`，并验证合法 `失控扩散` 放行，同时覆盖 `chronicle_text='SP0001'` 编号误填、`world_pressure=120`、`code_index='P0001'`、空 `display_text` 和 `name=NULL`。验证通过：`node --check vendor/shujuku-sp-fork/index.js`、`node --check scripts/verify-sql-debug-regressions.mjs`、`git diff --check`、`node scripts/verify-sql-debug-regressions.mjs`；回归脚本仅有 Node `node:sqlite` experimental warning。

- [x] **S3：通用枚举别名归一化**
  - 为所有枚举字段建立别名表，而不只处理 `risk_level`。
  - 至少覆盖 `supernatural_events.handling_status`：`爆发中/正在爆发/扩散中 -> 失控扩散`，`处理中/交战中 -> 对抗中`，`已解决/已完结 -> 结束`，无法判断则拦截或写 `未处理/调查中` 需按字段语义决定。
  - 将别名映射集中管理，避免每次新增字段都散落手写 if。
  - Gate：枚举字段非法自然语言值要么归一化为合法值，要么被预检拦截；非枚举文本字段不被误改。
  - **S3 结果（2026-06-07）**：完成。`vendor/shujuku-sp-fork/index.js` 建立集中 `SQL_ENUM_ALIAS_RULES_ACU`，按 `table.column` 管理枚举别名，覆盖当前 DDL 中 12 个 `CHECK(... IN (...))` 枚举字段：`supernatural_events.handling_status`、`ghost_archives.containment_status`、`clues.reliability`、`clues.verification_status`、`clues.visibility`、`characters.presence_status`、`characters.life_status`、`locations.supernatural_status`、`locations.lockdown_status`、`action_suggestions.option_key`、`action_suggestions.death_risk_level`、`action_suggestions.revival_risk_level`。`tryNormalizeInsertValues()` 与 `tryNormalizeUpdateValues()` 现在捕获表名，并通过 `shouldNormalizeSqlColumnValue_ACU(tableName, colName)` 与 `normalizeConstrainedValue(colName, value, tableName)` 做表字段级归一化；`generateInserts()` 仅传入 `tblName` 共享同一套别名归一化，不提前做 S4 的 SyncBridge 行级 constraint map 校验。`handling_status='爆发中'` 会先归一化为 `失控扩散` 并通过 S2 预检；`handling_status='热闹中'` 这类无法判断的非法值保持原值并由 S2 可读拦截；`public_summary='爆发中但这里只是摘要'` 等非枚举文本字段不会被误改。`scripts/verify-sql-debug-regressions.mjs` 新增 S3 gate：跨表别名归一化、`UPDATE`/多行 `INSERT`、非枚举文本不误改、未知非法枚举仍拦截、`generateInserts()` seed 值归一化后可写入内存 SQLite。验证通过：`node --check vendor/shujuku-sp-fork/index.js`、`node --check scripts/verify-sql-debug-regressions.mjs`、`git diff --check`、`node scripts/verify-sql-debug-regressions.mjs`；回归脚本仅有 Node `node:sqlite` experimental warning。

- [x] **S4：SyncBridge / 种子数据写入前行级校验**
  - 把同一套 constraint map 用于 SyncBridge 从表格内容生成 SQLite INSERT 的路径。
  - 对历史坏行采用“跳过该行 + 可读 warn + 保留表结构”的策略，避免 seed 脏数据导致 SQLite CHECK 报错。
  - Gate：历史 `chronicle_text='SP0001'` 与未来同类坏行不会进入 SQLite 原始 CHECK 错误。
  - **S4 结果（2026-06-07）**：完成。`vendor/shujuku-sp-fork/index.js` 将 `generateInserts()` 的 SyncBridge seed 写入路径升级为通用行级校验：每行先按 S3 的 `normalizeConstrainedValue(column, value, tableName)` 做字段值归一化，再根据该 sheet 的 DDL 调用 `parseDDLConstraintRegistry_ACU()` 得到 constraint registry，并逐列复用 S2 的 `validateSqlConstraintCell_ACU()` 校验 `CHECK ... IN` 枚举、`LENGTH` 范围、数值范围、`GLOB`、`TRIM(col) <> ''` 非空与显式 `NULL`。坏行不会生成 INSERT，而是记录 `[SyncBridge] 表 sheet_xxx (...) 第 N 行 table.column... 已跳过该行以避免 SQLite CHECK 失败。`；合法行继续写入，表结构仍会保留。历史 `chronicle_text='SP0001'` 现在由通用 registry 行校验跳过，不再依赖单字段专项判断；`action_suggestions.option_key='E'`、`row_id=5`、`global_state.game_time` 格式错误、`world_pressure=120`、空 `display_text` / `dice_command` 等 seed 坏行也会被跳过并产生可读 warn。仪表盘分类补充 `SQLite CHECK 失败`，这些 SyncBridge warn 会归为 `sqlConstraintIssue`。`scripts/verify-sql-debug-regressions.mjs` 新增 S4 gate：收集 `logWarn_ACU`，验证坏 seed 行被跳过、warn 可读、合法行可写入内存 SQLite。验证通过：`node --check vendor/shujuku-sp-fork/index.js`、`node --check scripts/verify-sql-debug-regressions.mjs`、`git diff --check`、`node scripts/verify-sql-debug-regressions.mjs`；回归脚本仅有 Node `node:sqlite` experimental warning。S4 执行中一个辅助审查探针误用了 Bash heredoc (`node - <<'NODE'`) 而在 PowerShell 报解析错误，未影响实现或 gate，后续未重复该失败命令。

- [x] **S5：模板提示词同步**
  - 两份 SQL 模板中为所有枚举字段补“只允许以下值”的硬约束，不只补当前爆雷字段。
  - 对高风险字段加入禁止自然语言近义词提示，例如 `handling_status` 禁止写 `爆发中/处理中/已解决`。
  - Gate：开发版与发布版模板文案一致；dist 打包后也能检索到关键约束文案。
  - **S5 结果（2026-06-07）**：完成。开发版与发布版两份 `神秘复苏表格SQL_v1.json` 已为当前 DDL 中所有枚举字段补 `【枚举硬约束】` 文案：`supernatural_events.handling_status`、`ghost_archives.containment_status`、`clues.reliability`、`clues.verification_status`、`clues.visibility`、`characters.presence_status`、`characters.life_status`、`locations.supernatural_status`、`locations.lockdown_status`、`action_suggestions.option_key`、`action_suggestions.death_risk_level`、`action_suggestions.revival_risk_level`。高风险自然语言近义词也写入禁止清单，例如 `爆发中/处理中/已解决`、`已收容/临时控制`、`高可信/已证实/后台记录`、`现场/活着/下落不明`、`鬼域中/黄金封存`、`选项A/极低/极高/严重`。`scripts/verify-sql-debug-regressions.mjs` 已新增 S5 gate，断言两份源模板对应 sheet 的枚举提示文案完全一致并包含允许值/禁用近义词。当前阶段未构建，因此未刷新或检查 dist 产物；dist 搜索随后续 build/发布阶段执行。

- [x] **S6：错误分类与运行日志可读化**
  - 仪表盘和 SP 运行日志把此类问题统一归类为 `SQL schema/CHECK 约束不合规`。
  - 日志应显示：表名、字段名、非法值、允许值、处理结果（已归一化/已拦截/已跳过 seed 行）。
  - Gate：用户不需要读 SQLite 原始 CHECK 表达式，也能知道该改哪个字段值。
  - **S6 结果（2026-06-07）**：完成。`vendor/shujuku-sp-fork/index.js` 的枚举/字段归一化日志现在使用稳定锚点 `[SqlNormalizer] SQL schema/CHECK 约束已归一化`，并显示 `table.column`、原值、归一化值和枚举允许值；执行前预检错误现在追加 `已拦截，未进入 SQLite。`；SyncBridge seed 坏行继续显示表、中文名、行号、字段、非法值/规则，并以 `已跳过该行以避免 SQLite CHECK 失败` 收尾。仪表盘分类文案更新为 `SQL schema/CHECK 约束不合规或已处理`，`interpretLogEntry()` 能识别 `SQL schema/CHECK 约束已归一化`、`SQL schema/CHECK 约束不合规`、`已跳过该行以避免 SQLite CHECK 失败` 和原始 SQLite constraint 错误。`scripts/verify-sql-debug-regressions.mjs` 已新增 S6 gate：捕获真实 `logDebug_ACU`，验证 `handling_status="爆发中" -> "失控扩散"` 日志含字段/原值/归一化值/允许值；预检错误必须含 `已拦截，未进入 SQLite`；dashboard fixture 覆盖归一化、拦截和跳过 seed 行三种处理结果。

- [x] **S7：自动化回归覆盖全部 CHECK 约束**
  - 扩展 `scripts/verify-sql-debug-regressions.mjs`，自动枚举模板里的 CHECK 约束并生成最小 fixture。
  - 固化本轮样本：`UPDATE supernatural_events SET handling_status='爆发中' ...`。
  - 保留历史样本：风险等级、纪要长度/编号误填、未知表/未知列分类。
  - Gate：`node --check`、`git diff --check`、`node scripts/verify-sql-debug-regressions.mjs` 全通过。
  - **S7 结果（2026-06-07）**：完成。`scripts/verify-sql-debug-regressions.mjs` 新增 registry-driven CHECK fixture 生成：从当前模板 DDL 的 `parseDDLConstraintRegistry_ACU()` 自动遍历 enum、`LENGTH`、数值范围、`GLOB`、`TRIM(...) <> ''` 非空和 `NOT NULL` 约束，生成最小非法 `UPDATE table SET column=value WHERE row_id=1`，并逐条断言会被 `validateSqlStatementsAgainstConstraintRegistry_ACU()` 拦截为 `SQL schema/CHECK 约束不合规`，包含 `已拦截，未进入 SQLite`，且不出现原始 `CHECK constraint failed`。回归仍保留本轮样本 `handling_status='爆发中' -> 失控扩散`、未知非法枚举拦截、风险等级归一化、纪要长度/编号误填、未知表/未知列、SQL 残片清洗和 dashboard 分类。验证通过：`node --check scripts\verify-sql-debug-regressions.mjs`、`node --check vendor\shujuku-sp-fork\index.js`、`git diff --check`、`node scripts\verify-sql-debug-regressions.mjs`；回归脚本仅有 Node `node:sqlite` experimental warning。

- [x] **S8：真实页权威日志复测**
  - 用 CDP `9222` 连接 `http://127.0.0.1:8000/`，确认当前加载 marker。
  - 清空或记录 SP·数据库 III 高级工具运行日志最新时间戳。
  - 用本轮样本和一次自然生成流程验证：`CHECK constraint failed`、`ERROR SQL Mode`、`ERROR SqlTableService` 均不出现新时间戳行。
  - Gate：SP 运行日志中此类错误为 0；页面正文/console 只作辅助证据。
  - **S8 结果（2026-06-07）**：完成。`npx agent-browser --cdp 9222` 连接真实 SillyTavern 页面 `http://127.0.0.1:8000/`，运行态 marker/API marker 均为 `mfrs-local-s8-schema-check-regression`，SP·数据库 III 旧 UI 显示当前聊天 `神秘复苏模拟器 - 2026-06-07@15h50m00s196ms`、SQLite 模式可用、数据库状态为 `已加载 (14个表格, 5条记录)`。权威日志基线中的 5 条旧行含 `15:54:28.980/997` 原始 `CHECK constraint failed`、`ERRORSQL Mode`、`ERRORSqlTableService`，均作为 S8 前历史残留处理。可控样本 1：`UPDATE supernatural_events SET handling_status='爆发中' WHERE event_code='__S8_NONEXISTENT__';` 经 SQL 控制台执行成功且 `0 行受影响`，未新增原始 CHECK/SQL 错误。可控样本 2：临时 `INSERT INTO supernatural_events ... handling_status='爆发中' ... event_code='__S8_TEMP__'` 被执行前 schema/CHECK 预检拦截，结果区显示 `[SqlTableService] SQL schema/CHECK 约束不合规: supernatural_events.handling_status="爆发中" 不在允许值 [...]。 已拦截，未进入 SQLite。`；随后查询 `__S8_TEMP__` 为 `0 行`，确认未污染数据。自然生成 smoke：发送“我不播放音频，先把手机静音并退到门边，用鬼档案观察网页与走廊的异常变化。” 后聊天长度到 7，新增助手回复已生成。最终 SP·数据库 III -> 高级工具 -> 运行日志仅有 2 条新 SyncBridge warn，均为 `chronicle.chronicle_text` 种子坏行 `已跳过该行以避免 SQLite CHECK 失败`；新日志中 `CHECK constraint failed`、`ERROR SQL Mode`、`ERROR SqlTableService`、`near "INSERT"`、`near "WHERE"`、`incomplete input`、`log_summary`、`event_summary` 计数均为 0。本阶段未构建、未提交、未推送、未发布；只做真实页验证与 planning 更新。

- [x] **S9：发布链路（complete·2026-06-07）**
  - 若 S0-S8 通过，执行资源提交 -> loader hash/cache 回填 -> build -> publish-card -> CDN 资源验证 -> 发布版真页 smoke -> commit/push。
  - 发布前确认目标 dist 资源提交已在远端可访问。
  - Gate：发布版 YAML/PNG 元数据包含新版本、hash、cache；CDN 200；发布卡真页 marker 正确且运行日志无新 CHECK 错误。
  - **S9 结果（2026-06-07）**：完成并推送到 GitHub，发布版本为 `6.12`。提交链路闭合为资源提交 `70fbe7d9beaf7565783be9d935f499fafdd88dbc`（`fix: harden sql schema check constraints`） -> loader 回填提交 `82261c07f911452c8865625adc122cc19388c9c5`（tag `v0.0.86`，marker `mfrs-schema-check-constraints-6-12`，cache `phase124-schema-check-constraints-6-12`，指向 vendor/resource `70fbe7d...`） -> 发布提交 `9ba8f98a39d0b869f1e14b29e7a405026baba3ad`（tag `v0.0.87`，`chore: release schema check guard 6.12`）。最终 `HEAD==origin/main==9ba8f98a39d0b869f1e14b29e7a405026baba3ad`。静态验证通过：`git diff --check`、`node --check vendor\shujuku-sp-fork\index.js`、`node --check scripts\verify-sql-debug-regressions.mjs`、两份 SQL 模板 JSON parse、`node scripts\verify-sql-debug-regressions.mjs`、`npm run build`；回归脚本仅有预期 Node `node:sqlite` experimental warning。发布包 `npm run publish-card -- 神秘复苏模拟器发布版` 成功，发布版 YAML 与 PNG `chara/ccv3` 元数据均含 `6.12`、`82261c07...`、`phase124-schema-check-constraints-6-12`，不含旧 `6.10`、`66e4c2e4...`、`phase122-incomplete-values-6-10`。CDN 验证通过：release YAML、数据库 loader、数据库前端 loader、vendor 均 200；loader 含 `mfrs-schema-check-constraints-6-12`、`phase124-schema-check-constraints-6-12`、vendor hash `70fbe7d...`，vendor 含 `parseDDLConstraintRegistry_ACU`、`validateSqlStatementsAgainstConstraintRegistry_ACU` 与 `SQL schema/CHECK`。发布卡真页 smoke 通过：`characterId=3`，当前卡 `神秘复苏模拟器发布版`，marker/API marker 为 `mfrs-schema-check-constraints-6-12`；`SP·数据库 III -> 高级工具 -> 运行日志` 最新 `21:42:57.xxx` 行仅有 5 条 SyncBridge warn，均为 `chronicle.chronicle_text` 种子坏行已跳过；新日志中 `CHECK constraint failed`、`ERROR SQL Mode`、`ERROR SqlTableService`、`near "INSERT"`、`near "WHERE"`、`incomplete input`、`log_summary`、`event_summary` 计数均为 0。旧 `19:08` 的 `global_state has no column named game_time` 为历史残留，不计入本次 smoke。提交边界正确：既有 `AGENTS.md`、`dist/神秘复苏模拟器/界面/状态栏/index.html` diff，以及未跟踪 planning/截图/临时 Chrome/备份文件均未纳入发布提交。

### 防回归验收标准

- 新增任何 CHECK 约束字段后，不需要为每个字段单独等报错再补丁；运行时能从 schema 自动识别。
- 枚举字段自然语言别名不会直达 SQLite。
- 长度/编号/字段错位类 CHECK 失败不会直达 SQLite。
- 用户看到的是可读分类与字段级原因，而不是原始 `CHECK constraint failed`。
- 开发版、发布版、dist、PNG、CDN 真页保持 14 表，`missingNames=[]`、`mismatchNames=[]`。
