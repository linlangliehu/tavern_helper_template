# Project Flow: 神秘复苏模拟器运行流程

本文件是项目常驻流程文件，回答"项目怎么开发、怎么验证、怎么发布、哪些边界不能踩"，不回答"当前做到哪一步"。当前进度以 `task_plan.md` 顶部为准；会话流水写入 `progress.md`；可复用结论写入 `findings.md`；发布后体验回归清单见 `4.0功能基线回归清单.md`。

> **本项目为单人开发，采用极简流程**：固定端口静态服务 + 直接切换 YAML 开发/生产模式 + VS Code 调试 Chrome（CDP 9225）验收 + GitHub Actions 自动 bundle。历史上的 MFRS 多 worktree / 动态端口 / 身份验证 / DEV 卡派生机制已废弃。

## 项目定位

- 仓库：`D:\project\tavern_helper_template`
- 类型：Tavern Helper / SillyTavern 的角色卡、脚本、界面与数据库扩展工程
- 开发版角色卡：`src/神秘复苏模拟器/`
- 发布版角色卡：`src/神秘复苏模拟器发布版/`
- 数据库 fork：`vendor/shujuku-sp-fork/index.js`
- 数据库前端：`src/神秘复苏模拟器/脚本/数据库前端/`
- 发布常量单真源：`scripts/mfrs-release-constants.mjs`（CDN_REF / cache / version）
- 发布脚本：`scripts/publish-card.mjs`
- 自动打包工作流：`.github/workflows/bundle.yaml`
- 角色卡同步配置：`tavern_sync.yaml`

## 端口职责

| 端口 | 进程 | 职责 |
| --- | --- | --- |
| `8000` | SillyTavern | 酒馆真页（业务页面） |
| `5510` | `scripts/mfrs-dev-server-simple.mjs` | 本地静态服务，暴露 `dist/**`（固定端口 + CORS） |
| `6621` | webpack Socket.IO HMR | **默认开启**：watch 编译完成后推送 `iframe_updated`，酒馆页面热重载（改代码免手工刷新） |
| `6620` | `tavern_sync watch all -f` | **默认开启**：watch 派生 tavern_sync，角色卡/世界书实时同步 |
| `9225` | 独立调试 Chrome（由 VS Code 启动） | CDP 远程调试端口：`chrome-devtools` MCP 与 `scripts/cdp-evaluate.mjs` 连此端口做 DOM/快照/截图/交互验收；`--user-data-dir=.vscode/chrome-debug-profile` 独立 profile，不碰日常 Chrome |

> 如需关闭默认监听，显式设置环境变量 `TAVERN_HELPER_DISABLE_HMR_SERVER=1`（HMR）或 `TAVERN_HELPER_DISABLE_TAVERN_SYNC=1`（tavern_sync）后再启动 watch。

## 开发流程（日常）

### 启动

**按键盘 F5**（笔记本常为 Fn+F5）= 启动开发环境。`preLaunchTask` 跑任务链，三者就绪后 VS Code 以调试模式启动独立 Chrome：

1. **切换到开发模式** → `toggle-dev-mode.mjs --enable`：把 `src/神秘复苏模拟器/index.yaml` 的 CDN URL 改为 `http://127.0.0.1:5510/`，并备份原始 CDN_REF 到注释
2. **pnpm watch** → 只监听源码并编译到 `dist/**`（等 `webpack … compiled` 就绪）
3. **静态服务器** → 固定端口 5510 暴露 `dist/**`（等 `Static server running` 就绪）
4. **VS Code 启动调试 Chrome** → `--remote-debugging-port=9225 --user-data-dir=.vscode/chrome-debug-profile`，打开 `http://127.0.0.1:8000/`

也可用命令面板"运行任务"手动跑 1–3（不含浏览器）。

实际运行链路：

```text
修改开发版源码
    ↓
pnpm watch 自动编译到 dist/**
    ↓
静态服务器通过 127.0.0.1:5510 提供 dist
    ↓
开发卡的 index.yaml 从 5510 加载本地资源
    ↓
SillyTavern 运行在 127.0.0.1:8000
    ↓
VS Code 调试 Chrome（CDP 9225）打开酒馆页面，AI 通过 chrome-devtools 连 9225 验收，人可设断点调试
```

### 生成开发卡并导入

首次使用，或修改世界书、系统提示词、第一条消息、对话示例、正则、脚本列表/顺序/启用状态、角色卡元数据等会写入 PNG 的内容后，需要重新生成开发卡并导入酒馆：

```bash
node tavern_sync.mjs bundle 神秘复苏模拟器
# 产物：src/神秘复苏模拟器/神秘复苏模拟器.png（脚本 URL 指向 127.0.0.1:5510）
```

在 SillyTavern 导入 `src/神秘复苏模拟器/神秘复苏模拟器.png`。

> 注意：`src/神秘复苏模拟器/神秘复苏模拟器.png`（开发卡，localhost）与 `src/神秘复苏模拟器发布版/…png`（发布卡，CDN）不同，开发时别导错。

### 看效果

在 VS Code 调试 Chrome 中打开 `http://127.0.0.1:8000/`（CDP `127.0.0.1:9225`）。改源码 → watch 自动编译 → **HMR（6621）自动推送热重载，酒馆页面无需手动刷新**即可看到新效果。

> 前提：酒馆「酒馆助手 → 实时监听 → 允许监听」开关需开启（HMR 服务 6621 默认已启动）。
> 若开新聊天后 vendor 脚本仍报旧 CDN 404，是旧聊天缓存了 base URL；开一个全新聊天即可让 localhost base 生效。

### 结束

开发完成后运行任务**结束开发环境**（`pnpm stop-dev`）。它会停止当前仓库的 `pnpm watch` 与 5510 静态服务器，并把 YAML 还原为生产 CDN。随后运行 `toggle-dev-mode.mjs --status` 确认生产模式，再进入发布流程。

## 发布流程

发布是两阶段的（CDN_REF 需要 push 后的 bot bundle commit SHA）。

### 阶段 1：本地准备与提交

1. 确认 YAML 已切回生产模式（`toggle-dev-mode.mjs --status` 显示"生产模式"）
2. 升级开发版 `src/神秘复苏模拟器/index.yaml` 的版本号；不要手工修改发布版，阶段 2 由 `publish-card` 镜像生成
3. 更新 `scripts/mfrs-release-constants.mjs` 的 `RELEASE_VERSION` 和 `CDN_CACHE_VERSION`（CDN_REF 暂留旧值，阶段 2 更新）
4. 更新 `CHANGELOG.md`
5. 跑源码门禁：`pnpm verify:mfrs-source-gates`（不检查尚未生成的新发布 PNG）
6. 精确提交源码（**不要** `git add .`，不提交本地 `dist/**`）

### 阶段 2：等 bot bundle 并发布

1. 先 `git fetch origin`。若当前分支没有尚未推送的本地提交，执行 `git merge --ff-only origin/main`；若已有本地提交，执行 `git rebase origin/main`。随后 `git push origin main`
2. push 触发 `.github/workflows/bundle.yaml`：bot 在 CI 一致环境 `pnpm install && pnpm build` 重建 dist，提交 `[bot] bundle` 并打自动 tag
3. **用 GitHub MCP 查 Actions workflow 状态和 bot bundle 的 commit SHA**（替代手动 `git fetch` 轮询）
4. 同步 bot bundle 到本地（本地 dist 有 watch 噪音时先 `git checkout HEAD -- dist/`）：没有新增本地提交时执行 `git merge --ff-only origin/main`；已有新增本地提交时执行 `git rebase origin/main`
5. 更新 `scripts/mfrs-release-constants.mjs` 的 `CDN_REF` = bot bundle 完整 SHA
6. `node scripts/publish-card.mjs 神秘复苏模拟器发布版 --dist-no-build` 生成发布版 PNG
7. 跑完整门禁：`pnpm verify:mfrs-gates`（包含 release-png 的 version/refs/cache/regex/scripts 校验）
8. 提交发布物（constants + 发布版镜像内容 + 发布版 index.yaml + 发布版 PNG）
9. 打发布 tag `git tag v<版本号>` → `git push origin main` + `git push origin v<版本号>`

> `--dist-no-build`：dist 已由 CI bot 权威构建并推送（CDN_REF 指向该 commit），G1 门禁只校验 `dist == CDN_REF` 一致性，跳过本地 `pnpm build`。这规避了本地 `pnpm install` 依赖漂移导致 dist 重建带 webpack module-id 噪音的已知问题。

### dist 由 CI 重建（重要）

`bundle` Action 在每次 push 到 `main`（`paths-ignore: dist/**`）后自动 `rm -rf dist && pnpm install && pnpm build`。**因此源码合并到 main 后 dist 会自动重建，无需手动 `pnpm build` 或提交 dist。** 本地 dist 只用于开发，发布 dist 一律以 bot bundle 为真源。

## CDN ref 规则（强制）

- `CDN_REF` 必须是 commit SHA（对应 `[bot] bundle` commit）或 `@v<版本号>` tag，**禁止** `@main` / `@master` branch ref
- 历史原因：jsdelivr 对 branch ref 解析会锁死在旧 SHA，用 SHA/tag ref 可完全绕开
- 任何角色卡字段、YAML、正则脚本引用 jsdelivr 资源必须用 `@<SHA>` 或 `@v<版本号>`
- 检测到发布版引用 `@main` URL 视为发布阻断缺陷

## 发布验证最低线

- `git status --short --branch` 与 `git diff --stat` 已确认；精确 staging，不用 `git add .`
- `pnpm verify:mfrs-gates` 全绿（initvar-schema / regex-ids / mvu-hotfix / output-cleaning / table-change / archive-ui / release-png）
- 发布版 YAML 与 PNG 不含旧 hash/cache、localhost 链接、旧版本号残留
- 发布版 PNG 元数据 `tEXt:chara` 与 `tEXt:ccv3` 含新版本/refs/cache/regex/scripts
- CDN smoke：release YAML/PNG、loader、database frontend、vendor 和关键脚本返回 200

## 硬约束（勿破）

- 脚本库 **8 项** 名称/顺序/启用不改
- 正则数量门禁约 **33**；改 id/启用需同步 `verify-mfrs-release-png`
- **禁止**手改发布版 PNG；只走 `publish-card`
- 发布版角色卡只能由开发版同步生成；不要手工散改发布版
- 拟办/选项：**只填不自动发送**
- 契约真源顺序：`schema.ts` → 变量输出格式 → 系统提示词 → 对话示例 → 脚本解析

## 真页调试工具

- 酒馆页面 `http://127.0.0.1:8000/`，由 VS Code 调试 Chrome（CDP `127.0.0.1:9225`）打开；AI 用 `chrome-devtools` MCP 连 9225 看画面、做 DOM/快照/点击/evaluate 等自动化验收，人可设断点调试
- TS/Vue 源码断点依赖 `sourceMapPathOverrides`：`src://tavern_helper_template/*` 必须映射到 `${workspaceFolder}/*`，这是 webpack `devtoolModuleFilenameTemplate` 实际生成的 source 前缀
- 如 `chrome-devtools` 不可用，裸 CDP 工具 `node scripts/cdp-evaluate.mjs`（默认连 9225，可用 `--port` 覆盖）作为备用
- SQL/数据库问题以 `SP·数据库 III -> 高级工具 -> 运行日志` 为权威入口
- 不要主动调用 `triggerUpdate()` / 点"立即手动更新"，除非目标就是真实 AI 写库观察

## 协作顺序

1. 先只改开发版 `src/神秘复苏模拟器/`
2. 用开发卡 + 静态服务 5510 在 `http://127.0.0.1:8000/` 验收
3. 确认开发版通过后，发布时由 `publish-card` 自动同步发布版 `src/神秘复苏模拟器发布版/`

## Planning 文件分工

- `task_plan.md`：当前状态、任务清单、版本变更索引、提交边界
- `PROJECT_FLOW.md`（本文件）：常驻运行/发布流程，不写会话进度
- `progress.md`：会话流水，默认只读顶部最近 2-3 条
- `findings.md`：可复用结论和根因
- `4.0功能基线回归清单.md`：完整体验回归清单
