# Findings

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
- 发布链路：`scripts/publish-card.mjs` 维护 `CDN_REF`、`CDN_CACHE_VERSION` 和 `releaseVersion`，把开发版镜像到发布版并调用 `tavern_sync.mjs bundle` 生成 PNG；已知它只自动替换 localhost/127.0.0.1 链接，已有 jsdelivr 旧 hash/cache 需要额外检查或手动替换。

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

**已知缺陷：** `publish-card.mjs` 的 `syncYaml` 函数（第 100-119 行）只替换 `localhost/127.0.0.1` 链接（第 104-109 行），不会替换已有的 jsdelivr CDN 链接。发布版 YAML 中如果已经是 CDN 格式，需要手动 sed 替换或改进脚本逻辑。

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
