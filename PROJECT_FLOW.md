# Project Flow: 神秘复苏模拟器常驻运行流程

此文件是项目常驻流程文件。新对话继续任务时，先读 `task_plan.md`，再读本文件，确认实际运行入口和发布边界。不要把本文件归档替换成一次性会话记录；阶段进度写入 `task_plan.md` / `progress.md` / `findings.md`。

## 新对话恢复流程

1. 读取 `task_plan.md` 的 `常驻恢复入口`、`当前状态`、`当前任务清单`、`版本变更索引`、`需要提交的文件`、`不需要提交的本地参考文件`。
2. 读取本文件，确认开发入口、构建发布链路、真页验证口径和自动更新边界。
3. 读取 `progress.md` 顶部最近 2-3 条，确认上次实际执行到哪里。
4. 需要背景时读取 `findings.md` 顶部相关经验；旧长流水按版本号回查，不凭记忆补细节。
5. 运行 `git status --short --branch`，先区分当前任务文件和既有无关 dirty。
6. 如果 `session-catchup.py` 报旧 v6.21 中段残片，按 `task_plan.md` 当前状态处理：默认已被 v6.25/v6.27 和当前 v6.28 候选线覆盖，除非用户要求回查历史。

## 项目定位

- 仓库：`D:\project\tavern_helper_template`
- 项目类型：Tavern Helper / SillyTavern 的角色卡、脚本、界面与数据库扩展工程。
- 开发版角色卡：`src/神秘复苏模拟器/`
- 发布版角色卡：`src/神秘复苏模拟器发布版/`
- 数据库 fork：`vendor/shujuku-sp-fork/index.js`
- 数据库前端：`src/神秘复苏模拟器/脚本/数据库前端/`
- 发布脚本：`scripts/publish-card.mjs`
- 自动打包工作流：`.github/workflows/bundle.yaml`
- 角色卡同步配置：`tavern_sync.yaml`
- 当前有效发布版、当前候选线、远端 HEAD/tag、资源 bundle、vendor ref 与 marker/cache 均以 `task_plan.md` 的 `当前状态` 和 `版本变更索引` 为准；本文件只保留常驻流程，不固定一次性发布口径。

## 真实开发入口

- 在 VSCode 终端/调试环境按 `Fn+F5`。
- 启动调试配置：`编译代码并调试酒馆网页 (Chrome)`。
- `.vscode/launch.json` 的 `preLaunchTask: 开始任务` 会先运行 `pnpm watch`，再运行 `.vscode/start-chrome-debug.cmd`。
- Chrome 使用 `--remote-debugging-port=9222` 打开 `http://127.0.0.1:8000/`。
- 默认浏览器调试入口是 Chrome DevTools MCP；`npx agent-browser --cdp 9222` 只是当前 Codex CLI 可用的替代 CDP 工具。

## 协作顺序

1. 先只改开发版 `src/神秘复苏模拟器/`。
2. 用真实酒馆页面 `http://127.0.0.1:8000/` 验收。
3. SQL/数据库问题以 `SP·数据库 III -> 高级工具 -> 运行日志` 为权威入口。
4. 确认开发版完成并通过真页验收后，再同步发布版 `src/神秘复苏模拟器发布版/`。
5. 不要手工散改发布版来绕过开发版。

## 实时开发链路

1. 修改 `src/<项目>/` 里的 `index.ts`、`App.vue`、`index.html`、`store.ts`、世界书或脚本文件。
2. 在 VSCode 中按 `Fn+F5` 启动调试配置。
3. `pnpm watch` 持续监听并编译源码。
4. Chrome 调试窗口打开酒馆页面 `http://127.0.0.1:8000/`。
5. 使用 Chrome DevTools MCP 或 `npx agent-browser --cdp 9222` 检查页面、Console、Network 和交互。
6. `localhost:5500` / Live Server 只用于本地静态资源或临时 import 验证，不等同于发布卡实际资源链路。

## 正式构建与发布链路

1. 停止 `pnpm watch`，不要复用 watch 产物做正式发布。
2. 确认开发版 `src/神秘复苏模拟器/` 已完成并通过真页验收。
3. 跑静态与回归 gate：
   - `git diff --check`
   - `node --check ...`
   - `node scripts\verify-sql-debug-regressions.mjs`
   - 按变更范围补跑相关验证脚本，例如 `node scripts\verify-table-change-adapter.mjs`
4. 跑 `pnpm build`，生成 production `dist/**` 与角色卡 PNG。
5. 需要发布 CDN 资源时，先提交并推送资源提交，等待 GitHub/jsdelivr 能访问新版 `dist` / vendor。
6. 回填 loader 的资源 hash、cache 与 marker，再 `pnpm build`，提交并推送 loader 回填提交。
7. 更新 `scripts/publish-card.mjs` 的 `CDN_REF`、`CDN_CACHE_VERSION`、必要时 `releaseVersion`。脚本会把 `localhost` / `127.0.0.1` 和已有项目 jsdelivr 旧 hash/cache 归一化到当前 CDN；仍要人工确认这三个配置值本身正确。
8. 执行 `pnpm run publish-card -- 神秘复苏模拟器发布版`，将开发版镜像到发布版。
9. 验证发布版 YAML 与 PNG `chara` / `ccv3` 元数据包含新版本、hash、cache，且旧 hash/cache 或本地链接无残留；即使 `publish-card` 已自动归一化旧 jsdelivr 链接，也必须保留这一步人工/脚本复核。
10. 精确提交发布版同步结果并推送到 GitHub 远程仓库。
11. 用 CDN 与真页 smoke 验证发布卡实际加载正确资源。

## 自动更新边界

- 只改前端界面、脚本或美化样式时，发布版卡引用的 CDN 资源会随 GitHub/jsdelivr 更新，通常不需要玩家重新导入角色卡。
- 改世界书、第一条消息、系统提示词、角色卡正文、数据库模板等卡本体内容时，必须更新发布版 PNG 与版本号。
- 发布版最新角色卡文件是 `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`。
- 发布版最新版本号来自 `src/神秘复苏模拟器发布版/index.yaml` 顶部 `版本:`，也应进入 PNG 的 `chara` / `ccv3` 元数据。
- 后续若实现卡内“检查更新”，应通过当前角色接口读取玩家当前版本，比较远端最新版本，再调用角色卡导入接口加载最新 PNG。

## 真页与 SQL 验收口径

- 酒馆页面：`http://127.0.0.1:8000/`
- Chrome CDP 端口：`9222`
- 页面正文、console、network、body 文本只作辅助证据。
- SQL/数据库问题必须以 `SP·数据库 III -> 高级工具 -> 运行日志` 为权威入口。
- 复测时先记录或清空 SP 运行日志最新时间戳，只判断新时间戳后的日志行。
- 不要主动调用 `triggerUpdate()`，除非目标就是做真实 AI 调用、写库和限流风险测试。

## 发布验证固定组合

后续发布验证默认按以下组合执行。除非用户明确要求真实 AI/写库观察，否则第 1-3 步不应调用 `triggerUpdate()`、不应点击“立即手动更新”、不应发送会触发 AI 的聊天消息。

1. CDN smoke：确认 release YAML、发布版可导入 PNG、YAML 头像 PNG、loader、database frontend self-reclaim、vendor 和关键脚本均返回 200；同时检查新版本 hash/cache/marker 存在，旧版本 hash/cache/marker、localhost、127.0.0.1 不残留。
2. 最小 CRUD smoke：在真页确认当前角色、avatar、runtime marker、`AutoCardUpdaterAPI`、`MysteryDatabaseFrontend`、`fillMode` 后，用 `MysteryDatabaseFrontend.previewTableChangePlan()` / `applyTableChangePlan()` 执行一条可逆测试（插入、更新、删除），再用 `exportCurrentData()` 独立复查测试 token 残留为 0。
3. 运行日志面板复核：打开 `SP·数据库 III -> 高级工具 -> 运行日志`，记录或清空当前日志基线，只看新增 `ERROR` / `WARN`。重点排查 provider 错配、SQLite 初始化失败、SQL/约束失败、`API_MUTATION_FAILED`、`Too Many Requests` 等新问题；没有新增错误才算发布 smoke 收口。
4. 可选低频真实自动填表观察：只有用户明确要求时才执行。触发前先冻结版本、日志基线和数据行数；触发后用运行日志面板分析自动填表链路，并用 `exportCurrentData()` 复查落盘与测试残留。

## 发布验证最低线

- `git status --short --branch` 与 `git diff --stat` 已确认。
- 精确 staging，不用 `git add .`。
- PNG 元数据检查 `tEXt:chara` 与 `tEXt:ccv3`。
- 发布版 YAML 与 PNG 不含旧 hash/cache、本地链接、旧版本号残留；`publish-card` 已支持旧 jsdelivr hash/cache 自动归一化，但这仍是发布验证必查项。
- 默认执行“发布验证固定组合”的第 1-3 步；第 4 步只在用户明确要求真实自动填表观察时执行。
- CDN smoke 确认 release YAML/PNG、loader、database frontend self-reclaim、vendor 和关键脚本返回 200。
- 真页 smoke 确认当前角色、avatar、runtime marker、关键 API、network 资源链路。
- 写入类真页验证必须清理测试行，并用 `exportCurrentData()` 复查无残留。

## 提交边界速记

- 发布或修复提交必须精确 staging；主工作区有无关 dirty 时，不要用 `git add .`，必要时使用临时干净 worktree。
- 发布版角色卡只能由开发版同步生成；不要手工散改发布版来绕过开发版。
- planning 整理类提交只包含 `task_plan.md`、`progress.md`、`findings.md`、`PROJECT_FLOW.md`。
- 临时日志、截图、CDP 探针输出、`.codex-*` worktree、`planning_archive_2026-06/**` 默认不提交，除非用户明确要求共享证据。
