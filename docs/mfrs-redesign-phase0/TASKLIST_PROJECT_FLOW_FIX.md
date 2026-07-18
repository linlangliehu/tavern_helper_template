# 项目运行流程改造任务清单

**状态**：P0–P9 全部完成：真页身份恢复通过；实时会话已收尾

**对应计划**：基于 `findings.md` 的 PROJECT-FLOW-FIX 分析与上游教程对比

**实施基线**：`origin/main@75f4a9a`（与 HUD-UX-NEXT 同一 worktree，或另立独立 worktree）

## 执行规则

- 按 P0 → P9 顺序执行；每个阶段完成后更新本文件、`task_plan.md` 和 `progress.md`。
- 不得修改正式业务源码、`src/神秘复苏模拟器/index.yaml`、发布版 YAML/PNG、`publish-card.mjs`、`webpack.config.ts` 的默认行为、`tavern_sync.yaml` 的正式配置。
- 不得启动、停止或接管用户已运行的 watch；新增任务只在新启动时生效。
- 不得连接主 Chrome；调试 Chrome 继续使用 `%TEMP%\chrome-debug` 独立 profile。
- 不得运行 production build、`publish-card` 或发布动作；本任务只改开发流程，不发布。
- 每个阶段必须能在不破坏现有发布链路的前提下独立合并。
- 所有新增脚本/配置文件使用精确 `git add`，不得 `git add .`。

## 不可触碰边界

| 项 | 是否可改 |
|---|---|
| `src/神秘复苏模拟器/index.yaml`（正式开发真源） | 否 |
| `src/神秘复苏模拟器发布版/**` | 否 |
| `scripts/publish-card.mjs` | 否 |
| `scripts/mfrs-release-constants.mjs` | 否 |
| `.github/workflows/bundle.yaml` | 否 |
| `webpack.config.ts` 默认行为 | 否（只允许新增可选 env guard） |
| `tavern_sync.yaml` 正式配置 | 否 |
| 业务源码（`src/神秘复苏模拟器/脚本/**`） | 否（P5 只加 dev-only marker，不改变运行时语义） |
| 现有门禁脚本 | 否 |

## P0：流程文档基线与四条链路矩阵

**目标**：把当前隐式链路写成显式契约，不修改任何代码。

- [x] **P0.1 重写 `PROJECT_FLOW.md` 运行链路章节**
  - 拆为四条独立链路：开发编译链、角色卡同步链、真页资源加载链、正式发布链。
  - 增加端口职责表（8000/9222/5510/6620/6621）。
  - 增加 worktree 身份不变量声明。
  - 明确 Fn+F5 当前不会启动 Live Server，也不会切换 CDN。
  - 明确 `tavern_sync` 脚本是配置同步器，不是 bundle 加载器。
  - 完成条件：文档可独立证明 T6 旧 bundle 根因；新人读完能区分四条链路。

- [x] **P0.2 增加"流程矩阵"章节**
  - 日常实时开发 / 发布候选验收 / 正式发布 / 线上只读复核四列。
  - 每列写明：源码位置、构建方式、资源来源、卡类型、是否允许发布、进入条件、退出条件。
  - 完成条件：四种模式互不混淆。

- [x] **P0.3 增加 worktree 身份检查清单**
  - 列出 T6 前必须一致的五项：源码 worktree、watch cwd、dist 所属、静态服务器 root、Network loader 来源。
  - 写明任一项不一致时的处置：停止、报告、不自动接管。
  - 完成条件：清单可作为 P2 预检脚本的验收基准。

- [x] **P0.4 提交规划文档**
  - 精确暂存 `PROJECT_FLOW.md`、本任务清单、`task_plan.md`、`findings.md`、`progress.md`。
  - 提交信息带 `[skip ci]`。
  - 完成条件：`HEAD == origin/main`；无新 tag；无业务源码 diff。

## P1：本地静态服务器与身份探针

**目标**：替代来源不明的 Live Server，让静态服务根目录可证明属于当前 worktree。

- [x] **P1.1 新增 `scripts/mfrs-dev-server.mjs`**
  - 只绑定 `127.0.0.1`。
  - 根目录固定为启动时传入的 workspace 路径。
  - CORS：`Access-Control-Allow-Origin: *`、`Access-Control-Allow-Methods: GET, HEAD, OPTIONS`。
  - JS MIME：`text/javascript; charset=utf-8`。
  - `Cache-Control: no-store`。
  - 处理 `OPTIONS` 预检。
  - 禁止目录穿越（`..` 解析）。
  - 不开放到 `0.0.0.0`。
  - 完成条件：`http://127.0.0.1:<port>/dist/神秘复苏模拟器/脚本/消息内面板/index.js` 返回当前 worktree 的 dev bundle。

- [x] **P1.2 实现 `/__mfrs_dev_identity` 端点**
  - 返回 JSON：
    ```json
    {
      "workspace": "D:/project/.../feat-hud-gacha-mode-toggle",
      "branch": "worktree-feat-hud-gacha-mode-toggle",
      "commit": "5dacd2e",
      "startedAt": "2026-07-18T...",
      "pid": 12345,
      "port": 5510
    }
    ```
  - 数据来自启动时传入的参数和 `git rev-parse`。
  - 完成条件：浏览器或 MCP 可通过该端点证明静态服务归属。

- [x] **P1.3 端口分配策略**
  - 默认 `5510`。
  - 若 `5510` 被占用，自动尝试 `5511`、`5512`，最多 5 个。
  - 启动日志必须打印最终端口和根目录。
  - 完成条件：多个 worktree 并行启动不会共享同一端口。

- [x] **P1.4 自检与失败处理**
  - 启动后自请求 `/__mfrs_dev_identity` 和一个已知 dist 文件。
  - 失败时退出非零码，不留下半启动状态。
  - 完成条件：端口冲突或路径错误时任务直接失败。

## P2：工作树预检脚本

**目标**：在启动 watch/静态服务/Chrome 前，证明当前 workspace 身份正确。

- [x] **P2.1 新增 `scripts/mfrs-dev-preflight.mjs`**
  - 只读检查，不修改任何文件。
  - 检查项：
    1. 当前目录是 git worktree（`git rev-parse --show-toplevel`）。
    2. 当前分支和 HEAD 短 SHA。
    3. `node_modules` 是否存在且非空（不 install）。
    4. `6620`、`6621`、`5510-5514` 是否被占用，被谁占用（PID + workspace 如可识别）。
    5. `.local/mfrs-dev-session.json` 是否存在，是否属于当前 worktree。
    6. `dist/神秘复苏模拟器/脚本/消息内面板/index.js` 是否存在（首次启动允许不存在）。
  - 输出结构化 JSON 和人类可读摘要。
  - 完成条件：预检能在 1 秒内完成；失败时给出明确冲突来源。

- [x] **P2.2 预检退出码约定**
  - `0`：全部通过。
  - `1`：当前 workspace 不是预期 worktree。
  - `2`：端口冲突且占用者不属于当前 worktree。
  - `3`：依赖缺失（`node_modules` 为空）。
  - `4`：其他 worktree 持有会话锁。
  - 完成条件：VS Code task 可根据退出码决定是否继续。

- [x] **P2.3 不自动接管**
  - 预检发现冲突时只报告，不 kill 现有进程。
  - 报告内容：占用者 PID、workspace、branch、启动时间（如可读取）。
  - 完成条件：用户看到冲突后能自行决定停止哪个环境。

## P3：VS Code 任务拆分与 Fn+F5 重新定义

**目标**：把单一"开始任务"拆成可独立运行的明确步骤。

- [x] **P3.1 新增 `.vscode/tasks.json` 任务定义**
  - 保留现有任务作为"仅附加 Chrome"入口。
  - 新增任务：
    1. `MFRS: 开发环境预检`（运行 `mfrs-dev-preflight.mjs`）。
    2. `MFRS: 启动当前工作树静态服务`（运行 `mfrs-dev-server.mjs`，isBackground）。
    3. `MFRS: 开始目标工作树 watch`（`pnpm watch`，isBackground）。
    4. `MFRS: 启动调试 Chrome`（保留现有 CMD）。
    5. `MFRS: 开始实时开发`（dependsOn 1→2→3→4，sequence）。
    6. `MFRS: 结束实时开发`（终止本次任务启动的进程，不动主 Chrome）。
  - 完成条件：每个任务可独立运行；复合任务按序启动。

- [x] **P3.2 更新 `.vscode/launch.json`**
  - 保留现有 `编译代码并调试酒馆网页 (Chrome)`。
  - 新增 `MFRS: 实时开发当前工作树`，`preLaunchTask: MFRS: 开始实时开发`。
  - 保留 `仅附加到 Chrome` 不变。
  - 完成条件：Fn+F5 默认走新流程；旧流程仍可选。

- [x] **P3.3 任务输出隔离**
  - 每个后台任务使用独立 panel，不共享 `shared`。
  - 启动日志必须打印 workspace、branch、commit、端口。
  - 完成条件：从 VS Code 终端面板能直接看出哪个 worktree 在运行。

- [x] **P3.4 结束任务的清理语义**
  - `MFRS: 结束实时开发` 只终止本次启动的 watch、静态服务、同步进程。
  - 不关闭调试 Chrome（由用户选择）。
  - 不关闭主 Chrome。
  - 删除本次会话锁（P6）。
  - 完成条件：结束后 `.local/mfrs-dev-session.json` 被清理；其他 worktree 的进程不受影响。

## P4：本地开发卡派生器

**目标**：让酒馆加载当前 worktree 的 dev bundle，不修改正式 `index.yaml`。

- [x] **P4.1 新增 `scripts/prepare-mfrs-dev-card.mjs`**
  - 读取 `src/神秘复苏模拟器/index.yaml`。
  - 在内存中替换项目脚本 URL：
    - `https://testingcf.jsdelivr.net/gh/linlangliehu/tavern_helper_template@<sha>/dist/...`
    - → `http://127.0.0.1:<port>/dist/...`
  - 不修改磁盘上的正式 YAML。
  - 完成条件：派生内容只在内存或 `.local/` 中存在。

- [x] **P4.2 派生卡元数据**
  - 角色名称改为：`神秘复苏模拟器 · DEV · <branch短名>`。
  - 版本改为：`dev-<branch短名>-<短SHA>`。
  - 增加描述字段说明这是本地开发卡，不可发布。
  - 完成条件：酒馆中能一眼区分本地开发卡和正式卡。

- [x] **P4.3 Bundle 输出到 `.local/`**
  - 输出路径：`.local/mfrs-dev/神秘复苏模拟器-DEV-<branch短名>.png`。
  - `.local/` 加入 `.gitignore`（如尚未）。
  - 不写回 `src/`。
  - 完成条件：`git status` 不显示派生产物；正式仓库目录保持 clean。

- [x] **P4.4 通过 tavern_sync 推送或直接导入**
  - 优先使用 `tavern_sync.mjs push` 推送到酒馆（需 6620 已连接）。
  - 备选：直接生成 PNG 让用户手动导入。
  - 推送时使用独立配置名，不覆盖正式"神秘复苏模拟器"。
  - 完成条件：酒馆中出现独立本地开发卡，loader URL 指向当前静态服务。

- [x] **P4.5 派生卡结构验证**
  - 校验 7 个项目脚本 URL 均指向 `http://127.0.0.1:<port>/dist/...`。
  - 校验正则数量仍为 33。
  - 校验脚本数量仍为 8。
  - 校验 mvu 仍指向 MagVarUpdate CDN（不本地化第三方依赖）。
  - 完成条件：派生卡结构门禁通过；不因本地化破坏契约。

## P5：Bundle 身份标记

**目标**：让运行时可直接证明 bundle 来源，不靠字符串猜测。

- [x] **P5.1 新增 dev-only 身份注入**
  - 在 `webpack.config.ts` 中通过 `DefinePlugin` 注入 `__MFRS_DEV_BUILD__`。
  - 值来自 `git rev-parse --short HEAD`、`git rev-parse --abbrev-ref HEAD`、`new Date().toISOString()`。
  - 仅在 `argv.mode === 'development'` 时注入；production 不注入。
  - 完成条件：dev bundle 中存在 `__MFRS_DEV_BUILD__`；production bundle 中不存在。

- [x] **P5.2 入口登记**
  - 每个入口在初始化时向 `window.__mfrsRuntimeBuilds__` 登记：
    ```js
    window.__mfrsRuntimeBuilds__ ??= {};
    window.__mfrsRuntimeBuilds__['消息内面板'] = __MFRS_DEV_BUILD__;
    ```
  - production bundle 登记 `{ mode: 'production', commit: CDN_REF, ... }`。
  - 不改变业务行为，只增加只读元数据。
  - 完成条件：MCP 可读取 `window.__mfrsRuntimeBuilds__` 验证所有入口来源一致。

- [x] **P5.3 身份验证脚本**
  - 新增 `scripts/verify-mfrs-runtime-identity.mjs`。
  - 通过 CDP 或 MCP 读取 `window.__mfrsRuntimeBuilds__`。
  - 断言：所有入口 commit 相同、等于当前 worktree HEAD、mode 为 development。
  - 失败时报告哪个入口来自旧 commit 或 production CDN。
  - 完成条件：脚本可作为 T6 前置门禁。

## P6：watch 所有权锁

**目标**：避免多个 worktree 同时抢夺 6620/6621/5510。

- [x] **P6.1 会话锁文件 `.local/mfrs-dev-session.json`**
  - 内容：
    ```json
    {
      "workspace": "...",
      "branch": "...",
      "commit": "...",
      "pid": 12345,
      "ports": { "static": 5510, "sync": 6620, "hmr": 6621 },
      "startedAt": "..."
    }
    ```
  - 启动 `MFRS: 开始实时开发` 时写入。
  - 结束时删除。
  - 完成条件：同一时间只有一个 worktree 持有锁。

- [x] **P6.2 预检识别锁冲突**
  - P2 预检读取锁文件。
  - 若锁属于其他 worktree：报告占用者信息，退出码 4。
  - 若锁属于当前 worktree 但进程已不存在：清理并继续。
  - 完成条件：不会出现两个 worktree 同时操作酒馆。

- [x] **P6.3 不自动 kill**
  - 锁冲突时只报告，不杀进程。
  - 由用户决定停止哪个环境。
  - 完成条件：用户主控权不被剥夺。

## P7：webpack 副作用门禁

**目标**：让开发构建可选跳过 schema dump 和 tavern sync，不改变默认行为。

- [x] **P7.1 增加 env guard**
  - `webpack.config.ts` 中：
    - `schema_dump`：若 `process.env.MFRS_SKIP_SCHEMA_DUMP === '1'`，则不调用 `dump_debounced`。
    - `tavern_sync`：若 `process.env.MFRS_SKIP_TAVERN_SYNC === '1'`，则不启动 `pnpm sync watch`。
    - `watch_tavern_helper`：若 `process.env.MFRS_SKIP_HMR_SERVER === '1'`，则不启动 6621。
  - 默认行为不变（不设 env 时与现在一致）。
  - 完成条件：现有 `pnpm watch` 和 `pnpm build` 行为不变。

- [x] **P7.2 开发任务使用 env guard**
  - `MFRS: 开始目标工作树 watch` 任务中：
    - 若 P4 派生卡由独立任务推送，则 watch 可设 `MFRS_SKIP_TAVERN_SYNC=1`。
    - 否则保留 `tavern_sync watch`。
  - schema dump 默认保留（dev 也需要 schema.json）。
  - 完成条件：开发构建副作用可控且显式。

- [x] **P7.3 不新增 webpack 配置文件**
  - 不创建 `webpack.dev-target.config.ts`。
  - 不改变 entry 扫描逻辑。
  - 只通过 env guard 控制副作用。
  - 完成条件：`webpack.config.ts` 默认输出与 P7 前一致。

## P8：流程文档最终化与 README 更新

**目标**：让文档与新流程完全对齐。

- [x] **P8.1 更新 `PROJECT_FLOW.md` 实施细节**
  - 写入新的任务名称和端口分配。
  - 写入 `.local/` 派生卡路径约定。
  - 写入会话锁机制。
  - 写入身份标记验证流程。
  - 完成条件：文档可作为新会话恢复入口。

- [x] **P8.2 更新 `README.md` 开发流程章节**
  - 增加"实时开发当前 worktree"快速开始。
  - 增加"结束实时开发"步骤。
  - 增加"多 worktree 并行"注意事项。
  - 完成条件：新人按 README 能正确启动。

- [x] **P8.3 更新 `findings.md` 和 `progress.md`**
  - 记录改造完成结论。
  - 记录与上游教程的对齐情况。
  - 完成条件：规划文件反映最终状态。

## P9：T6 恢复验收

**目标**：用新流程恢复 HUD-UX-NEXT 的 T6 真页验收。

- [x] **P9.1 在 feature worktree 启动新流程**
  - 在 `D:\project\tavern_helper_template\.claude\worktrees\feat-hud-gacha-mode-toggle` 打开 VS Code。
  - 运行 `MFRS: 开发环境预检`。
  - 运行 `MFRS: 开始实时开发`。
  - 完成条件：预检通过；watch、静态服务、调试 Chrome 均启动且身份正确。

- [x] **P9.2 生成并导入本地开发卡**
  - 运行 `scripts/prepare-mfrs-dev-card.mjs`。
  - 通过 tavern_sync 推送或手动导入 `.local/mfrs-dev/神秘复苏模拟器-DEV-*.png`。
  - 完成条件：酒馆中出现本地开发卡；loader URL 指向 `127.0.0.1:5510`。

- [x] **P9.3 运行时身份验证**
  - 通过 MCP 读取 `window.__mfrsRuntimeBuilds__`。
  - 运行 `scripts/verify-mfrs-runtime-identity.mjs`。
  - 完成条件：所有入口来自 `5dacd2e`（feature worktree HEAD）；mode 为 development。

- [x] **P9.4 恢复 T6.1–T6.7**
  - 按 `TASKLIST_HUD_UX_NEXT.md` 执行 T6。
  - 完成条件：T6 全部通过；无旧 bundle 残留；无孤儿实例。

- [x] **P9.5 结束实时开发**
  - 运行 `MFRS: 结束实时开发`。
  - 确认会话锁清理、静态服务停止、watch 停止。
  - 不关闭主 Chrome。
  - 完成条件：`.local/mfrs-dev-session.json` 删除；端口释放；仓库 clean。

## 完成统计

- 总任务：**44**
- P0：4 / P1：4 / P2：3 / P3：4 / P4：5 / P5：3 / P6：3 / P7：3 / P8：3 / P9：5 / 文档与规则：7
- 已完成：**44**（P0–P9 全部）
- 进行中：**0**
- 待执行：**0**

## 验收门槛

- 现有发布链路（`pnpm build` → `publish-card` → CDN/PNG/tag）行为完全不变。
- 现有门禁（`verify:mfrs-gates`、archive-ui、frontend）全部通过。
- 现有正式 `index.yaml` 和发布版 YAML/PNG 无任何修改。
- 新流程下，T6 可在 feature worktree 通过 MCP 验证 bundle 来源。
- 多 worktree 并行时不会互相抢占端口或会话锁。
