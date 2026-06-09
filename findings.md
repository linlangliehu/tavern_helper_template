# Findings

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
HEAD==origin/main==0ca57a5
tag==v0.0.102
releaseVersion==6.13
CDN_REF==868c535e150f55f68fc076ad7fa76a58513ef13c
CDN_CACHE_VERSION==phase125-sql-defense-depth-6-13
database marker==mfrs-sql-defense-depth-6-13
```

## 版本变更保留表

| 版本 | 主题 | 关键证据 | 验证/结论 |
|---|---|---|---|
| `6.13 final` | SQL 防御纵深体系 + 数据库前端自动重载修复 | SQL resource `53bf616`；frontend fix `868c535`；release `0ca57a5`；tag `v0.0.102` | 当前有效发布态；发布版 YAML 为 `6.13`，CDN 指向 `868c535` |
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
9. 验证 YAML、PNG `chara`、PNG `ccv3` 元数据，确认没有 localhost、旧 hash 或旧 cache 残留。
10. 提交发布版同步结果并推送到 GitHub 远程仓库。
11. 验证 CDN 200 与发布卡真页运行态。

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
