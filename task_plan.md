# Task Plan: 神秘复苏模拟器角色卡优化

## 常驻优先读取 - 项目运行基本流程

**重要性：第一。** 以后任何 `planning-with-files` 恢复、压缩或接续任务，都必须先读本节；本节必须保留在 `task_plan.md` 开头，排在版本历史、归档索引和普通恢复说明之前。

- **真实开发入口：** 在 VSCode 终端/调试环境按 `Fn+F5`，启动调试配置 `编译代码并调试酒馆网页 (Chrome)`。
- **自动启动任务：** `.vscode/launch.json` 的 `preLaunchTask: 开始任务` 会先运行 `pnpm watch` 监听源码并编译，再运行 `.vscode/start-chrome-debug.cmd` 启动 Chrome 调试模式。
- **酒馆真页：** Chrome 使用 `--remote-debugging-port=9222` 打开 `http://127.0.0.1:8000/`；后续由 Chrome DevTools MCP 接入这个 9222 Chrome 辅助制作、检查和修改角色卡。
- **默认协作顺序：** 先只改开发版 `src/神秘复苏模拟器/`；彻底完成并用真页验收后，再同步发布版 `src/神秘复苏模拟器发布版/`。
- **发布同步：** 正式发布前停止 watch，重新跑 `pnpm build`；需要同步发布版时执行 `pnpm run publish-card -- 神秘复苏模拟器发布版`，再精确提交并推送 GitHub。
- **自动更新边界：** 发布版卡加载 GitHub/jsdelivr 上的前端界面、脚本或美化样式，资源变化通常不需要玩家重新导入；世界书、第一条消息、系统提示词、角色卡正文、数据库模板等卡本体变化，必须更新发布版 PNG 与版本号，卡内更新入口再用 `getCharacter` / `importRawCharacter` 一类接口处理。
- **替代工具口径：** `npx agent-browser --cdp 9222` 只是当前 Codex CLI 可用的替代 CDP 访问方式，不是本项目默认流程；默认流程仍是 Chrome DevTools MCP。

## RESUME HERE - 2026-06-09 23:30 CST - v6.15 发布完成

**当前状态：** 根目录 planning 已整理为恢复索引。当前 live git 为 `HEAD==origin/main==c273b7d`，等待 CI 自动打标签，发布版为 `6.15`。发布卡 CDN 指向 `c61cae707d06ce8b9dce7bc63d97a26e26a5834f`，cache 为 `phase127-sql-prompt-optimize-6-15`，数据库 marker 为 `mfrs-sql-prompt-optimize-6-15`。

**本轮记录原则：**

- 根目录 `task_plan.md`、`findings.md`、`progress.md` 只保留恢复任务需要的高信号内容。
- 必须保留四个常驻项：项目运行基本流程、项目版本变更、需要提交的文件、不需要提交的本地参考文件；其中项目运行基本流程优先级最高，必须保持在文件开头。
- 旧的逐步流水、长日志、截图说明、探针输出不塞回根目录；需要时读归档。
- 当前三份原文已归档到 `planning_archive_2026-06/2026-06-08-post-v6-13-before-planning-optimization/`。

## 恢复顺序

1. 先读本文件开头的 `常驻优先读取 - 项目运行基本流程`，确认真实运行入口、Chrome DevTools MCP 口径、开发版/发布版边界。
2. 读取 `CLAUDE.md` 及其引用的 `.cursor/rules/*.mdc`。
3. 运行 `git status --short --branch`，先冻结当前工作区。
4. 读取根目录 `task_plan.md`、`findings.md`、`progress.md`。
5. 若要追溯旧流水，读取归档文件，不要凭压缩摘要猜测细节。
6. 若涉及酒馆真页或 SQL/数据库问题，先记录 SP 运行日志基线时间戳。

## 当前版本与发布链路

### 最新发布：6.15 SQL Prompt 精简优化

- **状态：** active，已推送，`HEAD==origin/main==c273b7d`。
- **tag：** 等待 CI 自动打标。
- **发布提交：** `265d9ba`，`release: publish v6.15 with SQL prompt optimization`。
- **资源提交：** `c61cae7`，`build: rebuild dist with v6.15 prompt optimization`。
- **Prompt 优化提交：** `cdfd625`，`feat: optimize SQL prompt to prevent column count mismatch`。
- **发布脚本常量：** `scripts/publish-card.mjs` 中 `CDN_REF=c61cae707d06ce8b9dce7bc63d97a26e26a5834f`，`CDN_CACHE_VERSION=phase127-sql-prompt-optimize-6-15`，`releaseVersion=6.15`。
- **发布版文件：** `src/神秘复苏模拟器发布版/index.yaml` 版本为 `6.15`，CDN 链接指向 `c61cae7...`。
- **说明：** 合并列数不匹配规则到现有"不完整 SQL"禁止事项，新增第 4 个负面示例，总增量 120 字符（1.4%），禁止事项条数不变（4→4），预计降低 30-40% 列数不匹配错误。

### 版本变更索引

| 版本 | 主题 | 关键提交/资源 | marker/cache | 状态 |
|---|---|---|---|---|
| `6.15` | SQL Prompt 精简优化：列数不匹配防护合并到现有规则 | prompt `cdfd625` -> resource `c61cae7` -> CI `4078718` -> release `265d9ba` | `mfrs-sql-prompt-optimize-6-15` / `phase127-sql-prompt-optimize-6-15` | 当前有效 |
| `6.14` | SQL 提取器增强：单行多语句切分 + 挽救逻辑修复 | resource `ea0d4f0` -> release `f96da7d` | `mfrs-sql-extractor-enhance-6-14` / `phase126-sql-extractor-enhance-6-14` | 已被 6.15 覆盖 |
| `6.13 final` | SQL 防御纵深体系 + 数据库前端自动重载修复 | SQL resource `53bf616`；frontend fix `868c535`；release `0ca57a5`；tag `v0.0.102` | `mfrs-sql-defense-depth-6-13` / `phase125-sql-defense-depth-6-13` | 已被 6.14 覆盖 |
| `6.12` | Schema/CHECK 约束通用防线 | resource `70fbe7d` -> loader `82261c0` -> release `9ba8f98`，tag `v0.0.87` | `mfrs-schema-check-constraints-6-12` / `phase124-schema-check-constraints-6-12` | 已发布，后续被 6.13 覆盖 |
| `6.11` | `UPDATE ... SET ..., WHERE` 尾逗号与 P7 修复链路 | resource `3f59742`、loader `3ef8d3b` 等历史链路 | `mfrs-update-trailing-comma-6-11` / `phase123-update-trailing-comma-6-11` | 中间链路 |
| `6.10` | `INSERT ... VALUES` 截断导致 `incomplete input` | parser `5ec1aa` -> loader `66e4c2e` -> release `aaf14dc` | `mfrs-incomplete-values-6-10` / `phase122-incomplete-values-6-10` | 已发布，后续覆盖 |
| `6.9` | SQL 语句边界 `near "INSERT"` | parser `2bcf063` -> loader `ac583a3` -> release `e2224ec` | `mfrs-sql-boundary-6-9` / `phase121-sql-boundary-6-9` | 已发布 |
| `6.8` | 推演选项点击交互 | resource `1fe4322` -> release `32e49c9` | `phase120-choice-panel-interaction-6-8` | 已发布 |
| `6.7` | SQL Debug 四类复发修复 | resource `37a10c` -> loader `26cbab6` -> release `7cd0b24` | `mfrs-sql-debug-regressions-6-7` / `phase119-sql-debug-regressions-6-7` | 已发布 |
| `6.6` | SQL 模板自动校准 | resource `a554ba8` -> release `f2ab050` | `phase118-sql-template-autocalibrate-6-6` | 已发布 |
| `6.5` | R2SQL 设置窗 SQL 控制台刷新 | vendor `a41ab44` -> resource `f7e2f64` -> release `ccfd727` | `mfrs-r2sql-settings-console-refresh` / `phase116-r2sql-settings-console-refresh` | 已发布 |
| `6.4` | R2SQL 导出 fallback | vendor `5bd4b0e` -> loader `8d4d1d2` -> release `3de0c78` | `phase115-r2sql-export-fallback` | 已发布 |
| `6.3` | R2SQL 模板状态与 14 表一致性 | resource `fe0679e` -> release `4f6d949` | `mfrs-r2sql-template-status` / `phase114-r2sql-template-status` | 已发布 |

完整历史细节见：

- `planning_archive_2026-06/2026-06-08-post-v6-13-before-planning-optimization/`
- `planning_archive_2026-06/2026-06-07-post-s9-before-optimization/`
- `planning_archive_2026-06/*.before-compress.md`

## 项目运行基本流程

### 教程适配原则

- 本项目由“实时编写前端界面或脚本 / 实际编写”教程流程改善而来：先在 `src/` 下创建项目，再用 watch + 酒馆实时监听 + 本地静态链接把修改即时显示到酒馆页面，并通过 Chrome DevTools MCP 让 AI 查看/操控酒馆真页，完成后再 production build 并发布。
- 发布版自动更新流程参考教程“进阶技巧 / 发布会自动更新的前端界面、脚本或美化样式”：发布版角色卡不加载 localhost，而是加载 GitHub/jsdelivr 上的 `dist/**/index.html`、`dist/**/index.js` 或样式资源。
- 角色卡本体自动更新流程参考教程“进阶技巧 / 发布会自动更新角色卡”：自动更新需要“最新角色卡文件”“最新版本号”“玩家当前版本号”三项信息；SillyTavern 可通过酒馆助手/接口导入最新角色卡。
- 仓库有 `pnpm-lock.yaml`，日常命令优先使用 `pnpm watch` / `pnpm build`；`package.json` 中的 `npm run watch` / `npm run build` 是同一批脚本的 npm 口径。
- 本项目当前实际开发入口是 VSCode 调试配置：在 VSCode 终端/调试环境按 `Fn+F5`，选择或触发 `编译代码并调试酒馆网页 (Chrome)`。
- 协作修改时先只改本地开发版角色卡 `src/神秘复苏模拟器/`；彻底完成并验收后，再同步到发布版角色卡 `src/神秘复苏模拟器发布版/`。
- 实时开发产物只用于调试；正式发布必须停止 watch 后重新跑 `pnpm build`，不要发布 watch 产物。

### 仓库与入口

- 当前仓库：`d:\project\tavern_helper_template`。
- 项目是 Tavern Helper / SillyTavern 的角色卡、脚本、界面与数据库扩展工程。
- 开发版角色卡：`src/神秘复苏模拟器/`。
- 发布版角色卡：`src/神秘复苏模拟器发布版/`。
- 新建前端界面模板：`初始模板/前端界面/新建为src文件夹中的文件夹/`。
- 新建脚本模板：`初始模板/脚本/新建为src文件夹中的文件夹/`。
- 新建流式楼层界面模板：`初始模板/流式楼层界面/新建为src文件夹中的文件夹/`。
- 新建角色卡模板：`初始模板/角色卡/新建为src文件夹中的文件夹/`。
- 酒馆导入实时调试模板：
  - 前端界面：`初始模板/前端界面/导入到酒馆中/界面-实时修改.json`。
  - 脚本：`初始模板/脚本/导入到酒馆中/脚本-实时修改.json`。
  - 流式楼层界面：`初始模板/流式楼层界面/导入到酒馆中/流式楼层界面脚本-实时修改.json`。
- 数据库 fork：`vendor/shujuku-sp-fork/index.js`。
- SQL 回归脚本：`scripts/verify-sql-debug-regressions.mjs`。
- 发布脚本：`scripts/publish-card.mjs`。
- 发布产物：`src/神秘复苏模拟器发布版/index.yaml` 与 `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`。
- 自动打包工作流：`.github/workflows/bundle.yaml` 会在推送后执行 `pnpm build`，提交 `[bot] bundle`，并自动打 tag 以帮助 jsdelivr 更快刷新缓存。
- 角色卡同步配置：`tavern_sync.yaml` 中同时配置了 `神秘复苏模拟器` 和 `神秘复苏模拟器发布版` 两张角色卡。

### 实时开发链路

1. 从 `初始模板/**/新建为src文件夹中的文件夹/` 复制一份到 `src/`，重命名为目标项目；本仓库现有主项目是 `src/神秘复苏模拟器/`。
2. 让 AI 或开发者修改 `src/<项目>/` 里的 `index.ts`、`App.vue`、`index.html`、`store.ts`、世界书或脚本文件。
3. 在 VSCode 中按 `Fn+F5` 启动调试配置 `编译代码并调试酒馆网页 (Chrome)`。
4. VSCode 的 `preLaunchTask` 会执行 `开始任务`：
   - 先启动 `开始监听源代码并编译`，即在终端运行 `pnpm watch`。
   - 再启动 `启动 Chrome (调试模式)`，即运行 `.vscode/start-chrome-debug.cmd`。
5. 终端里会显示 `pnpm watch` 的监听/编译输出，以及 `启动 Chrome (调试模式)` 任务；watch 编译成功后会持续监听源码变化。
6. VSCode 会打开带远程调试端口的 Chrome：`--remote-debugging-port=9222`，并进入酒馆地址 `http://127.0.0.1:8000/`。
7. 我后续制作和修改角色卡时，项目规范首选 Chrome DevTools MCP 连接这个 9222 调试 Chrome，读取酒馆页面、Console、Network，并执行点击/填写等交互。
8. Go Live / Live Server 与 `http://localhost:5500/dist/**` 链接仍是教程通用实时导入方案；本项目当前优先使用 VSCode `Fn+F5` 组合任务启动 watch 和调试 Chrome。
9. 验收前端显示、按钮交互、脚本效果和 console/network；SQL/数据库类问题仍以 `SP·数据库 III -> 高级工具 -> 运行日志` 为准。

### 正式构建与发布链路

1. 停止 `pnpm watch`，不要复用 watch 产物做正式发布。
2. 确认所有修改都已在开发版 `src/神秘复苏模拟器/` 完成并通过 Chrome DevTools MCP 真页验收。
3. 跑静态与回归 gate：`git diff --check`、`node --check ...`、`node scripts\verify-sql-debug-regressions.mjs`。
4. 跑 `pnpm build`，生成 production `dist/**` 与角色卡 PNG。
5. 需要发布时，先提交并推送资源提交，确保 GitHub/jsdelivr 能访问新版 `dist` / vendor。
6. 回填 loader 的资源 hash、cache 与 marker，再 `pnpm build`，提交并推送 loader 回填提交。
7. 更新 `scripts/publish-card.mjs` 的 `CDN_REF`、`CDN_CACHE_VERSION`、必要时 `releaseVersion`。
8. 执行 `pnpm run publish-card -- 神秘复苏模拟器发布版`，将开发版镜像到发布版，并把开发版 YAML 中的 `localhost` / `127.0.0.1` 链接替换为 `testingcf.jsdelivr.net/gh/linlangliehu/tavern_helper_template@<CDN_REF>/...`。
9. 验证发布版 YAML 与 PNG `chara` / `ccv3` 元数据包含新版本、hash、cache，且旧 hash/cache 或本地链接无残留。
10. 提交发布版同步结果并推送到 GitHub 远程仓库：`git push origin main`。
11. 用 CDN 与真页 smoke 验证发布卡实际加载正确资源；如果 jsdelivr 缓存滞后，再按需 purge 对应 CDN URL。

### 发布会自动更新角色卡

- 只改前端界面、脚本或美化样式时，发布版卡里引用的 CDN 资源会随 GitHub/jsdelivr 更新，通常不需要玩家重新导入角色卡。
- 改世界书、第一条消息、系统提示词、角色卡正文、数据库模板等卡本体内容时，必须更新发布版角色卡文件和版本号。
- 自动更新角色卡需要维护三类信息：
  - 最新角色卡文件：发布版 PNG，例如 `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`，推送后可由 GitHub/jsdelivr 或 GitHub raw URL 提供。
  - 最新版本号：发布版 `src/神秘复苏模拟器发布版/index.yaml` 顶部 `版本:`，也会进入 PNG 元数据。
  - 玩家当前版本号：从当前导入角色卡的创作者元数据/角色版本读取；本项目记录口径以 YAML `版本:` 和 PNG `chara` / `ccv3` 元数据一致为准。
- 本项目当前发布脚本 `scripts/publish-card.mjs` 已承担“开发版 -> 发布版 -> 打包 PNG”的本地发布步骤；GitHub Actions `bundle.yaml` 承担推送后的自动 build、dist 更新、角色卡/世界书/预设打包和自动 tag。
- 后续若实现卡内“检查更新”按钮或脚本，应按教程思路：通过酒馆助手/SillyTavern 的当前角色接口（如 `getCharacter`）读取玩家当前版本，比较远端最新版本，发现新版后调用角色卡导入接口（如 `importRawCharacter`）加载最新 PNG。

### 真页与 SQL 验收口径

- 酒馆页面：`http://127.0.0.1:8000/`。
- 浏览器调试：首选 Chrome DevTools MCP，用于读取酒馆页面显示、Console、Network，并执行点击/填写等交互。
- Chrome CDP 端口：`9222`，由 VSCode `Fn+F5` 调试流程中的 `启动 Chrome (调试模式)` 任务打开；`npx agent-browser --cdp 9222` 只是当前 Codex CLI 可用的替代工具，不是教程默认要求。
- `localhost:5500` 只用于本地静态资源或直接 import 验证，不等同于酒馆页面。
- SQL/数据库问题必须以 `SillyTavern 左下角菜单 -> SP·数据库 III -> 高级工具 -> 运行日志` 为权威入口。
- 页面正文、console、network、body 文本只作辅助证据。
- 复测时先记录或清空 SP 运行日志最新时间戳，只判断新时间戳后的日志行。

## 需要提交的文件

### 按任务类型精确 staging

- **源码或世界书变更：** 只提交实际改动的 `src/**`、`util/**`、`@types/**`、`初始模板/**`、`示例/**` 等相关文件。
- **数据库/vendor 变更：** 提交 `vendor/shujuku-sp-fork/index.js` 及对应回归脚本 `scripts/verify-sql-debug-regressions.mjs`。
- **构建产物：** 发布或 CDN 依赖时，提交对应 `dist/**` 产物；不要提交无关示例 dist。
- **开发版角色卡：** 制作和修改阶段提交 `src/神秘复苏模拟器/**` 中实际变更；发布前不要手工散改发布版来绕过开发版。
- **发布版角色卡：** 完成后由 `pnpm run publish-card -- 神秘复苏模拟器发布版` 从开发版同步；提交 `src/神秘复苏模拟器发布版/index.yaml`、`src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png` 及同步产生的必要文件。
- **自动更新链路：** 若版本号、远端卡 URL、更新入口脚本或 GitHub Actions 配置变化，提交对应 `src/**/index.yaml`、`scripts/**`、`.github/workflows/**`、`tavern_sync.yaml`。
- **发布脚本：** 若改了 CDN/hash/cache/version，提交 `scripts/publish-card.mjs`。
- **依赖或配置：** 只有依赖、webpack、eslint、tsconfig 等确实变更时才提交 `package.json`、`pnpm-lock.yaml`、`webpack.config.ts`、`eslint.config.mjs` 等。
- **planning 记录：** 本次这类整理只需要提交根目录 `task_plan.md`、`findings.md`、`progress.md`；归档快照默认作为本地参考，不纳入提交。

### 提交前检查

- 必须先看 `git status --short --branch` 与 `git diff --stat`。
- 使用精确路径 `git add <path>`，不要用全量 `git add .`。
- 已知本地 dirty 如果和当前任务无关，保持原样，不要 revert。

## 不需要提交的本地参考文件

默认不要主动纳入提交；若某文件已 tracked 且确实是业务变更，再按实际 diff 判断。

- `.claude/worktrees/**`、`.tmp-chrome-*`、`.vscode/chrome-debug-profile/`、`.kilo/node_modules/`、`.kilocode/node_modules/`、`node_modules/`。
- `chrome-cdp*.log`、`*.log`、`acu-logs-*.json`、浏览器探针 stdout/stderr。
- 临时截图与 QA 图片：`sillytavern_*.png`、`mfrs_*png`、`屏幕截图 *.png`、调试用 `1.png` / `2.png` / `3.png`，除非用户明确要求把证据图纳入仓库。
- 本地参考资料和外部素材：`神秘复苏.txt`、临时导出的数据库 JSON、下载的卡图或草稿素材，除非本身是项目正式资产。
- planning 归档快照：`planning_archive_2026-06/**` 新增快照默认只用于本地追溯；需要共享历史流水时再单独提交。
- 自动生成 IDE 文件：`auto-imports.d.ts`、`components.d.ts` 等已在 `.gitignore` 中的文件。

## 当前工作区边界

- 当前 live status 只显示 `.claude/worktrees/agent-a56e834f3396ee862` 与 `.claude/worktrees/agent-aedb9d9f392ecb036` 为本地 dirty；它们是本地参考，不属于本次提交范围。
- 本次新增归档目录 `planning_archive_2026-06/2026-06-08-post-v6-13-before-planning-optimization/` 仅用于本地追溯，默认不提交。
- 后续任何提交都必须精确 staging，不能混入本地参考或无关 dirty。

## 当前后续任务

- [x] 旧 planning 原文已归档。
- [x] 根目录 planning 已压缩为恢复索引。
- [x] 项目版本变更、项目运行基本流程、提交/不提交边界已保留。
- [x] 项目运行基本流程已提升为 `task_plan.md` 开头常驻优先读取项。
- [ ] 如用户要求继续开发新问题，先冻结 `git status --short --branch`、当前版本 marker、SP 运行日志基线。
- [ ] 如用户要求核验历史细节，读取归档文件而不是依赖压缩摘要。

## 本次任务：使用 planning-with-files 了解项目（2026-06-09）

**目标：** 恢复 planning 上下文，读取项目指令、规则、入口文件和主项目结构，形成可复用的项目理解摘要。

**阶段：**

- [x] 恢复现有 `task_plan.md`、`findings.md`、`progress.md`。
- [x] 读取 `CLAUDE.md` 与 `AGENTS.md` 指向的规则入口。
- [x] 冻结当前 `git status --short --branch`。
- [x] 读取 `.cursor/rules/*.mdc`、`README.md`、`package.json`、构建/同步配置。
- [x] 扫描 `src/神秘复苏模拟器/`、`scripts/`、`vendor/shujuku-sp-fork/` 的关键入口。
- [x] 更新 `findings.md` 与 `progress.md`，输出项目理解摘要。

**当前工作区基线：** `main...origin/main`，仅见本地参考 dirty：`.claude/worktrees/**`、`acu-logs-*.json`、`planning_archive_2026-06/**`、`tavern_current_view.png`。这些按现有边界默认不纳入提交。

## 后续任务：稳定 + 智能混合填表架构（AI 规划 + CRUD 执行）

**目标：** 结合当前 SQL/AI 填表方案的剧情理解能力，以及骰子系统前端的 CRUD 直写稳定性，设计并逐步实现一套“AI 负责判断、前端负责校验与执行、SQL 仅作兜底”的新架构，降低 SQL 模式 `Too Many Requests`、SQL 语法错误和重试放大风险。

**总原则：**

- AI 不再默认直接输出 SQL；默认输出结构化变更计划。
- 前端负责表名/列名解析、DDL 约束校验、row_id 处理和 CRUD 执行。
- 确定性操作不调用 AI，直接走 `AutoCardUpdaterAPI.updateCell/insertRow/deleteRow`。
- SQL 模式保留为高级维护、迁移和复杂兜底通道，不作为普通自动填表默认路径。

### 阶段 0：基线冻结与接口确认

- [x] 记录 `git status --short --branch`、当前版本、发布 hash/cache/marker。
- [x] 记录 SP 运行日志基线时间戳，避免把旧错误当新错误。
- [x] 确认当前数据库本体暴露的 API：
  - [x] `AutoCardUpdaterAPI.getCurrentData` 或 `exportTableAsJson`
  - [x] `AutoCardUpdaterAPI.updateCell`
  - [x] `AutoCardUpdaterAPI.insertRow`
  - [x] `AutoCardUpdaterAPI.deleteRow`
  - [x] `refreshDataAndWorldbook` 或 `_notifyTableUpdate`
- [x] 对照骰子系统 `jerryzmtz/my-tavern-scripts` 的 CRUD 兼容层，整理可借鉴函数清单。
- [x] 输出接口兼容性结论：能直接实现、需要 polyfill、需要升级数据库本体。

**阶段 0 结论（2026-06-09）：** 数据库本体已经暴露读取、CRUD、刷新和更新通知能力，基础混合方案不需要先升级数据库本体。下一步主要补前端适配层：表名/列名 alias、row_id/自然键行定位、DDL 约束校验、批量队列与错误分类。SP 运行日志基线按 `2026-06-09 18:02:58 +08:00` 之后的新日志计算，已有 `acu-logs-*.json` 只作历史参考。

### 阶段 1：现有填表链路盘点

- [x] 梳理开发版前端中所有会修改数据库的入口：
  - [x] 手动编辑/保存
  - [x] 推演选项点击
  - [x] 状态切换/按钮操作
  - [x] 自动剧情填表
  - [x] 导入/初始化/重填
- [x] 按操作类型分类：
  - [x] 确定性 CRUD 操作
  - [x] 需要 AI 判断的剧情操作
  - [x] 只能 SQL 兜底的高级操作
- [x] 标出当前仍会触发 AI-SQL 填表的入口。
- [x] 形成迁移优先级：先迁移高频、确定性、低风险操作。

**阶段 1 结论（2026-06-09）：** 当前神秘复苏前端读库主要经 `exportTableAsJson`，可视化编辑仍偏整表快照保存；状态栏 `<choices>` 和按钮主要写 MVU，不是数据库 CRUD。AI-SQL 仍由数据库本体的自动填表、纪要/总结合并和 SQL 模板 prompt 链路触发。迁移优先级为：可视化手动编辑/新增/删除 -> 行动建议/choices 镜像 -> 明确状态/资源镜像 -> AI 剧情结构化变更计划 -> SQL 高级兜底。

### 阶段 2：定义 AI 变更计划协议

- [x] 设计 `tableChangePlan` JSON schema：
  - [x] `action`: `updateCell` / `insertRow` / `deleteRow` / `noop`
  - [x] `table`: 用户可见表名
  - [x] `match`: 行定位条件
  - [x] `set` 或 `data`: 写入字段
  - [x] `reason`: 剧情依据
  - [x] `confidence`: 置信度
- [x] 设计失败反馈 schema：
  - [x] 表不存在
  - [x] 行定位失败/多行匹配
  - [x] 列不存在
  - [x] NOT NULL/CHECK/LENGTH 约束失败
  - [x] API 限流
- [x] 明确 AI 只能输出 JSON，不输出 SQL、不输出解释正文。
- [x] 为当前 14 表写最小示例 prompt 和负面示例。

**阶段 2 结论（2026-06-09）：** 已在数据库前端新增 `tableChangePlan` 运行时协议与 schema 描述，公开为 `MysteryDatabaseFrontend.getTableChangeSchema()`；示例和负面约束记录在 `findings.md`。当前只是前端协议落点，尚未替换数据库本体内旧 AI-SQL prompt。

### 阶段 3：前端 CRUD 执行器

- [x] 实现数据库 API 适配层：
  - [x] 安全获取顶层 `AutoCardUpdaterAPI`
  - [x] API 缺失时给出可行动错误
  - [x] 支持 `getCurrentData/exportTableAsJson` 读取
- [x] 实现表定位：
  - [x] 用户可见表名 -> sheetKey
  - [x] SQL DDL 表名 -> sheetKey
  - [x] 表名 alias/fallback
- [x] 实现列定位：
  - [x] 用户可见表头
  - [x] DDL 物理列名
  - [x] DDL 注释 alias
- [x] 实现行定位：
  - [x] row_id
  - [x] 主显示列/自然键
  - [x] 多条件 match
  - [x] 多行匹配时阻止写入并反馈 AI/用户
- [x] 实现 CRUD 执行：
  - [x] `updateCell`
  - [x] `insertRow`
  - [x] `deleteRow`
  - [x] 批量执行队列，避免并发写入踩踏

**阶段 3 结论（2026-06-09）：** 已新增 `table-change-adapter.ts`，并通过 `MysteryDatabaseFrontend.previewTableChangePlan()` / `applyTableChangePlan()` / `getTableMetadata()` 对外暴露。执行入口串行排队，不改变现有可视化器默认保存路径。

### 阶段 4：DDL 与数据约束校验

- [x] 从 `sourceData.ddl` 解析：
  - [x] `CREATE TABLE` 真实 SQL 表名
  - [x] 列定义
  - [x] `NOT NULL`
  - [x] `CHECK(... IN (...))`
  - [x] `LENGTH(...)`
  - [x] `PRIMARY KEY` / `row_id`
- [x] 保存前校验：
  - [x] 必填列是否有值
  - [x] 枚举值是否合法
  - [x] 字符长度是否合法
  - [ ] row_id 是否缺失或需要推断
    - [x] `CHECK(row_id BETWEEN N AND M)` 范围解析与显式 row_id 写入预检
- [x] 失败时生成结构化错误，供 AI 只修正失败项。
- [x] 明确哪些约束错误应直接提示用户，不再重试 AI。

**阶段 4 结论（2026-06-09）：** 已完成 DDL 基础解析与本地约束预检，能在 CRUD 前阻止未知列、空必填、枚举越界、长度越界、多行匹配等问题。后续补充了数值型 `CHECK(... BETWEEN ... AND ...)` 范围解析，固定行表的显式 `row_id` 越界会在本地被拦截；复杂 `GLOB/TRIM` 与 row_id 自动推断仍留到增强阶段。

### 阶段 5：AI 规划 + CRUD 主链路

- [ ] 新增自动填表模式：`AI_CHANGE_PLAN_CRUD`。
- [ ] 修改 AI prompt：从“输出 SQL”改为“输出变更计划 JSON”。
- [ ] 限制输入范围：
  - [ ] 只发送目标表
  - [ ] 普通表支持 `sendLatestRows`
  - [ ] 纪要/总结类表只发最近 N 行
  - [ ] 减少无关世界书/上下文注入
- [ ] 执行流程：
  - [ ] 调 AI 得到计划
  - [ ] JSON parse + schema 校验
  - [ ] 本地 DDL 校验
  - [ ] CRUD 执行
  - [ ] 刷新数据库与前端
- [ ] 失败流程：
  - [ ] 只把失败项和局部上下文回传 AI
  - [ ] 最多修正 1-2 次
  - [ ] API 限流时冷却并停止，不进入 SQL 错误反馈

**阶段 5 进展（2026-06-09）：** 已完成前端执行落点：`previewTableChangePlan()` 可无副作用预检，`applyTableChangePlan()` 可执行 CRUD。尚未修改数据库本体的 AI prompt、自动填表模式和 SQL_ERROR_FEEDBACK 链路，因此旧 AI-SQL 默认路径仍保持不变。

### 阶段 6：确定性操作迁移

- [ ] 将不需要 AI 的前端操作迁移到 CRUD：
  - [x] 单元格编辑
  - [ ] 行增删
    - [x] 删除行提交：优先 CRUD 预检与 `deleteRow`
    - [ ] 新增空行：暂留旧快照路径，因当前 UI 是“当前位置后插入空白占位行”，底层 `insertRow` 更适合追加合法完整行
  - [x] 整体编辑/多列编辑
  - [ ] 状态按钮
  - [ ] 推演选项中确定的数值/状态写入
    - [x] `<choices>` / 状态栏推演选项镜像到 `行动建议` 固定 4 行：优先 CRUD `updateCell`，缺行时尝试合法 `insertRow`
    - [ ] 点击选项后的风险值/MVU 状态是否镜像入数据库：待先明确 MVU 与数据库主从关系
  - [ ] 任何“已知表、已知行、已知列、已知值”的操作
- [x] 每迁移一个入口，保留原路径 fallback 开关。
- [ ] 为用户可见错误增加区分：
  - [ ] 数据库 API 缺失
  - [ ] 模板不兼容
  - [x] 约束不合法
  - [ ] 保存失败

**阶段 6 进展（2026-06-09）：** v10.2 可视化器第一批确定性入口已迁移：单元格编辑、整体编辑、待删除行提交会优先调用 `MysteryDatabaseFrontend.applyTableChangePlan()`；CRUD 预检/执行失败时自动回退旧 `saveDataToDatabase` 快照路径。第二批已接入状态栏 `<choices>` 解析结果到 `行动建议` 表固定 4 行，使用顶层 `MysteryDatabaseFrontend.applyTableChangePlan()` 弱连接，默认启用，可用 `localStorage.acu_mfrs_choices_crud_mirror = 'false'` 关闭；数据库前端或 CRUD API 不存在时只跳过，不影响状态栏显示。新增空行暂不迁移，因为当前 UI 生成空必填列占位并要求插入到当前位置后，直接用底层 `insertRow` 会改变语义且容易触发 NOT NULL 约束。

### 阶段 7：SQL 通道降级为兜底

- [ ] 保留现有 SQL 模式能力，但改为可配置兜底。
- [ ] 为 SQL 通道增加触发条件：
  - [ ] 高级维护/迁移
  - [ ] 用户手动选择 SQL 模式
  - [ ] CRUD 无法表达的批量操作
- [ ] API 限流分类：
  - [ ] `Too Many Requests`
  - [ ] HTTP 429
  - [ ] `Retry-After`
  - [ ] 网关错误
- [ ] 限流错误不写入 `SQL_ERROR_FEEDBACK`。
- [ ] 限流时使用冷却/指数退避，并避免连续批量重试。

### 阶段 8：测试与真页验收

- [ ] 单元/脚本级验证：
  - [ ] JSON schema 校验样例
  - [ ] 表名/列名 alias 解析
  - [ ] NOT NULL/CHECK/LENGTH 校验
  - [ ] row_id 推断
  - [ ] CRUD 执行失败分类
  - [x] `行动建议` 固定 4 行 CRUD 镜像样例：row_id 更新、缺行插入、枚举/长度约束拦截
  - [x] 固定行表 `row_id BETWEEN` 范围约束样例：越界 row_id 阻止写入
- [ ] 真页手动测试：
  - [ ] 开发版 14 表加载
  - [ ] 确定性按钮 CRUD 写入
  - [ ] AI_CHANGE_PLAN_CRUD 自动填表
  - [ ] SQL 兜底仍可用
  - [ ] SP 运行日志无新增 SQL 错误
- [ ] 对比指标：
  - [ ] API 请求次数
  - [ ] prompt 大小
  - [ ] `Too Many Requests` 发生率
  - [ ] 填表成功率
  - [ ] 数据一致性

### 阶段 9：发布与回滚

- [ ] 开发版验收通过后，同步发布版。
- [ ] 跑固定 gate：
  - [ ] `git diff --check`
  - [ ] `node --check` / 项目对应静态检查
  - [ ] SQL 回归脚本
  - [ ] `pnpm build`
- [ ] 按固定发布流程更新 CDN hash/cache/marker/version。
- [ ] 发布版真页 smoke test。
- [ ] 保留配置开关：
  - [ ] 默认新链路
  - [ ] 可回退旧 AI-SQL
  - [ ] 可禁用 CRUD 迁移入口

### 阶段 10：神秘复苏公共前端 API

**目标：** 借鉴 `window.AcuDice`，为神秘复苏模拟器提供统一公共 API，供前端按钮、正则、楼层界面、世界书脚本和后续玩法模块调用。

- [ ] 设计全局命名空间：
  - [ ] `window.MFRS` 或 `window.MysteriousRevival`
  - [ ] API 版本号，如 `version: '1.0.0'`
  - [ ] `onReady(callback)` 与 `mfrs:ready` 事件
- [ ] 暴露数据库读写 API：
  - [ ] `getData()`
  - [ ] `findTable(tableName)`
  - [ ] `findRow(tableName, match)`
  - [ ] `updateCell(tableName, match, column, value)`
  - [ ] `insertRow(tableName, data)`
  - [ ] `deleteRow(tableName, match)`
- [ ] 暴露剧情/模拟器 API：
  - [ ] `getCharacterState(name)`
  - [ ] `updateCharacterState(name, patch)`
  - [ ] `getEventState(eventName)`
  - [ ] `recordDecision(decision)`
- [ ] 暴露判定 API：
  - [ ] `roll(expression)`
  - [ ] `check(options)`
  - [ ] `spiritualCheck(options)`
  - [ ] `ghostSuppressionCheck(options)`
- [ ] 暴露事件订阅：
  - [ ] `on(event, handler)`
  - [ ] `off(event, handler)`
  - [ ] 事件：`data_updated`、`check_done`、`resource_changed`、`plan_applied`、`error`
- [ ] 防覆盖保护：
  - [ ] 不重复初始化
  - [ ] 不覆盖已有 API
  - [ ] 顶层 window 与当前 iframe/window 同步挂载

### 阶段 11：灵异判定系统

**目标：** 将骰子系统的检定能力改造成神秘复苏专用判定，不直接照搬跑团 UI。

- [ ] 定义判定类型：
  - [ ] 生存判定
  - [ ] 复苏风险判定
  - [ ] 厉鬼压制判定
  - [ ] 鬼域对抗判定
  - [ ] 关押成功判定
  - [ ] 理智/污染/侵蚀判定
- [ ] 定义判定输入：
  - [ ] 角色名
  - [ ] 相关属性/状态
  - [ ] 灵异等级/风险等级
  - [ ] 场景修正
  - [ ] 目标难度
- [ ] 定义判定公式：
  - [ ] 默认随机表达式，如 `1d100` 或项目自定义权重
  - [ ] 成功规则：小于等于/大于等于/区间/等级对抗
  - [ ] 大成功/大失败规则
- [ ] 从数据库读取判定数值：
  - [ ] 人物状态表
  - [ ] 驭鬼者/厉鬼相关表
  - [ ] 事件/地点风险表
- [ ] 判定后写入数据库：
  - [ ] 角色状态变化
  - [ ] 风险等级变化
  - [ ] 事件进度变化
  - [ ] 判定记录表/日志表
- [ ] UI 设计：
  - [ ] 轻量弹窗或侧栏，不照搬骰子面板
  - [ ] 快捷判定按钮
  - [ ] 判定结果卡片
  - [ ] 支持确认后写库、取消不写库

### 阶段 12：资源与奖励系统

**目标：** 将骰子系统的抽卡/商店能力改造成神秘复苏世界观下的资源、奖励和库存系统。

- [ ] 设计资源类型：
  - [ ] 总部贡献/功勋
  - [ ] 现金/资产
  - [ ] 灵异资源点
  - [ ] 鬼烛/替死娃娃/棺材钉等特殊物品库存
  - [ ] 档案权限/情报点
- [ ] 设计奖励来源：
  - [ ] 事件结算奖励
  - [ ] 关押厉鬼奖励
  - [ ] 总部任务奖励
  - [ ] 探索发现奖励
  - [ ] 随机灵异物品获取
- [ ] 设计奖励执行：
  - [ ] 前端确定性奖励走 CRUD
  - [ ] AI 可建议奖励计划，但由前端校验后执行
  - [ ] 写入物品表、装备表、档案表或资源字段
- [ ] 设计商店/兑换：
  - [ ] 资源兑换物品
  - [ ] 权限不足提示
  - [ ] 库存不足提示
  - [ ] 兑换记录
- [ ] 可选随机池：
  - [ ] 灵异物品池
  - [ ] 档案线索池
  - [ ] 危险事件池
  - [ ] 稀有度/保底只在玩法需要时引入，避免跑团抽卡感过重
- [ ] DDL 校验：
  - [ ] 奖励写入前检查目标表必填列、枚举、长度限制
  - [ ] 缺少字段时提示用户修模板或补配置

### 阶段 13：判定历史、事件日志与审计

**目标：** 借鉴骰子系统检定历史，但改成“推演日志/灵异判定记录/数据库写入审计”。

- [ ] 设计日志类型：
  - [ ] 灵异判定记录
  - [ ] AI 变更计划记录
  - [ ] CRUD 写入记录
  - [ ] 奖励/资源变化记录
  - [ ] 失败/回滚记录
- [ ] 设计日志字段：
  - [ ] 时间
  - [ ] 来源：用户按钮 / AI 计划 / 自动剧情 / 系统
  - [ ] 目标表/行/列
  - [ ] 旧值/新值
  - [ ] 判定结果/原因
  - [ ] 错误分类
- [ ] UI 功能：
  - [ ] 最近记录面板
  - [ ] 按角色/事件/表名筛选
  - [ ] 展开查看执行细节
  - [ ] 复制错误报告
- [ ] 审计与恢复：
  - [ ] 执行前快照
  - [ ] 单次操作撤销
  - [ ] 失败时保留局部恢复信息

### 阶段 14：前端体验整合

**目标：** 把新能力整合进神秘复苏模拟器现有界面，保持世界观一致，不把骰子系统 UI 生硬塞入。

- [ ] 信息架构：
  - [ ] “数据库/表格”仍作为基础层
  - [ ] “推演/判定”作为玩法层
  - [ ] “资源/奖励”作为结算层
  - [ ] “日志/审计”作为调试和回溯层
- [ ] 入口设计：
  - [ ] 顶部/侧栏工具按钮
  - [ ] 角色卡片内快捷操作
  - [ ] 事件卡片内快捷判定
  - [ ] 物品/资源卡片内兑换操作
- [ ] 状态反馈：
  - [ ] 操作成功 toast
  - [ ] 约束失败可行动提示
  - [ ] API 限流提示
  - [ ] 模板不兼容提示
- [ ] 视觉原则：
  - [ ] 不照搬骰子系统跑团/抽卡外观
  - [ ] 使用神秘复苏的“档案、总部、灵异事件、风险评级”语义
  - [ ] 控件保持紧凑、可扫描、适合反复操作
- [ ] 移动端验收：
  - [ ] 弹窗不溢出
  - [ ] 按钮不遮挡正文
  - [ ] 长表/日志可滚动
  - [ ] 输入框和工具栏不互相挤压

**优先级建议：**

1. P0：接口确认、现有入口盘点、确定性 CRUD 迁移。
2. P1：AI 变更计划协议 + CRUD 执行器。
3. P2：DDL 校验与失败分类。
4. P3：公共前端 API + 灵异判定最小闭环。
5. P4：资源奖励、历史审计、体验整合。
6. P5：SQL 通道降级、限流分类、发布流程。

**成功标准：**

- 确定性前端交互不再触发 AI 请求。
- 自动剧情填表默认不要求 AI 输出 SQL。
- SQL 模式 `Too Many Requests` 发生率显著下降。
- 失败日志能明确区分 API 限流、CRUD 约束失败、模板不兼容和 SQL 兜底失败。
- 用户仍保留根据剧情自动更新数据库的智能体验。
- 前端提供稳定公共 API，正则/楼层界面/按钮可复用。
- 灵异判定、资源奖励、历史日志与神秘复苏世界观一致，不表现为外置骰子系统。

## 2026-06-09 大步二补充收口

- [x] 新增专项验证脚本：`scripts/verify-table-change-adapter.mjs`。
- [x] 验证 `tableChangePlan` 的表名定位：用户可见表名、DDL 物理表名。
- [x] 验证列名定位：中文表头、DDL 物理列名、DDL 注释 alias。
- [x] 验证行定位：`row_id` 精确匹配和多行匹配阻断。
- [x] 验证 DDL 约束：`CHECK IN`、`LENGTH <=`、`LENGTH BETWEEN`。
- [x] 验证 CRUD 调用参数：`updateCell`、`insertRow`、阻断失败时不调用 `deleteRow`。
- [x] 补跑 `pnpm build` 与 `git diff --check`。

**收口结论：** 大步二的协议层、前端 CRUD 执行层和本地约束预检已经具备脚本级回归验证。旧 AI-SQL 主链路仍未切换，后续应进入确定性入口迁移或阶段 5 主链路切换。

## 2026-06-09 大步五收口：验证、发布与回滚

### 阶段 8：测试与真页验收（本轮完成项）

- [x] 最新数据库前端 dist 注入真页后，`getTableMetadata()` 返回完整 14 表。
- [x] `人物/characters` 普通表真页 CRUD 烟测通过：insert/update/delete 均 `ok=true`，临时行最终清理为 0。
- [x] `行动建议/action_suggestions` 固定行表真页验证通过：row_id 1-4 补行、row_id=2 更新、row_id=5 本地预检拦截。
- [x] loader marker 已从旧 `mfrs-sql-defense-depth-6-13` 接管为 `mfrs-sql-prompt-optimize-6-15`，14 表仍完整。
- [x] 本地 gate 通过：`verify-table-change-adapter`、`node --check`、eslint、`git diff --check`、`pnpm build`。
- [ ] SP 运行日志人工面板复核：本轮通过前端 CRUD 路径验证不触发 AI/SQL，但未从 SP 高级工具 UI 手动导出新运行日志。

### 阶段 9：发布与回滚（本轮发布路径）

- [x] 代码侧保留可回滚开关：`acu_mfrs_visualizer_crud_migration=false` 与 `acu_mfrs_choices_crud_mirror=false`。
- [x] 上一稳定远程基线：`cde40b5 fix: repair v6.15 release cdn links`。
- [x] 发布前补齐 loader 卫生项：数据库 loader 与数据库前端 loader 均指向当前有效 6.15 vendor 资源。
- [ ] 资源提交并推送到 GitHub。
- [ ] 更新 `scripts/publish-card.mjs` 的新 CDN hash/cache/version，并同步发布版 YAML/PNG。
- [ ] 发布提交并推送到 GitHub。
- [ ] CDN URL 与发布卡 smoke test。
