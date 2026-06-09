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

**当前状态：** 根目录 planning 已整理为恢复索引。当前 live git 为 `HEAD==origin/main==c273b7d`，等待 CI 自动打标签，发布版为 `6.15`。发布卡 CDN 指向 `c61cae79c95498f1aee9e5e27e13e3e12cb6a3f4`，cache 为 `phase127-sql-prompt-optimize-6-15`，数据库 marker 为 `mfrs-sql-prompt-optimize-6-15`。

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
- **发布脚本常量：** `scripts/publish-card.mjs` 中 `CDN_REF=c61cae79c95498f1aee9e5e27e13e3e12cb6a3f4`，`CDN_CACHE_VERSION=phase127-sql-prompt-optimize-6-15`，`releaseVersion=6.15`。
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
