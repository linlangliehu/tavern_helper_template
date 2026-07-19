# Project Flow: 神秘复苏模拟器运行流程

本文件是项目常驻流程文件，回答"项目怎么开发、怎么验证、怎么发布、哪些边界不能踩"，不回答"当前做到哪一步"。当前进度以 `task_plan.md` 顶部为准；会话流水写入 `progress.md`；可复用结论写入 `findings.md`；发布后体验回归清单见 `4.0功能基线回归清单.md`。

> **本项目为单人开发，采用极简流程**：固定端口静态服务 + 直接切换 YAML 开发/生产模式 + 内置浏览器验收 + GitHub Actions 自动 bundle。历史上的 MFRS 多 worktree / 动态端口 / 身份验证 / DEV 卡派生机制已废弃。

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
|------|------|------|
| `8000` | SillyTavern | 酒馆真页（业务页面） |
| `5510` | `scripts/mfrs-dev-server-simple.mjs` | 本地静态服务，暴露 `dist/**`（固定端口 + CORS） |
| `6620` | `tavern_sync`（可选） | 角色卡/世界书 push/pull/bundle |

## 开发流程（日常）

### 启动

**按键盘 F5**（笔记本常为 Fn+F5）= 启动开发环境。它触发任务链：

1. **切换到开发模式** → `toggle-dev-mode.mjs --enable`：把 `src/神秘复苏模拟器/index.yaml` 的 CDN URL 改为 `http://127.0.0.1:5510/`，并备份原始 CDN_REF 到注释
2. **pnpm watch** → 源码编译到 `dist/**`
3. **静态服务器** → 固定端口 5510 暴露 `dist/**`

也可用命令面板"运行任务"手动跑上述任务。

### 生成开发卡并导入

首次需要生成带 localhost URL 的开发卡并导入酒馆：

```bash
node tavern_sync.mjs bundle 神秘复苏模拟器
# 产物：src/神秘复苏模拟器/神秘复苏模拟器.png（脚本 URL 指向 127.0.0.1:5510）
```

在 SillyTavern 导入 `src/神秘复苏模拟器/神秘复苏模拟器.png`。

> 注意：`src/神秘复苏模拟器/神秘复苏模拟器.png`（开发卡，localhost）与 `src/神秘复苏模拟器发布版/…png`（发布卡，CDN）不同，开发时别导错。

### 看效果

用**内置浏览器**或你自己的浏览器打开 `http://127.0.0.1:8000/`。改源码 → watch 自动编译 → 刷新酒馆页面即可看到效果，无需重新导卡。

> 若开新聊天后 vendor 脚本仍报旧 CDN 404，是旧聊天缓存了 base URL；开一个全新聊天即可让 localhost base 生效。

### 结束

开发完成后运行任务**切换回生产模式**（`toggle-dev-mode.mjs --disable`）还原 YAML 的 CDN URL，再进入发布流程。

## 发布流程

发布是两阶段的（CDN_REF 需要 push 后的 bot bundle commit SHA）。

### 阶段 1：本地准备与提交

1. 确认 YAML 已切回生产模式（`toggle-dev-mode.mjs --status` 显示"生产模式"）
2. 升级版本号：`src/神秘复苏模拟器/index.yaml` + `src/神秘复苏模拟器发布版/index.yaml` 的 `版本:`
3. 更新 `scripts/mfrs-release-constants.mjs` 的 `RELEASE_VERSION` 和 `CDN_CACHE_VERSION`（CDN_REF 暂留旧值，阶段 2 更新）
4. 更新 `CHANGELOG.md`
5. 跑门禁：`pnpm verify:mfrs-gates`（全绿才继续）
6. 精确提交源码（**不要** `git add .`，不提交本地 `dist/**`）

### 阶段 2：等 bot bundle 并发布

7. `git push origin main`（若落后远程先 `git merge origin/main`）
8. push 触发 `.github/workflows/bundle.yaml`：bot 在 CI 一致环境 `pnpm install && pnpm build` 重建 dist，提交 `[bot] bundle` 并打自动 tag
9. **用 GitHub MCP 查 Actions workflow 状态和 bot bundle 的 commit SHA**（替代手动 `git fetch` 轮询）
10. `git merge origin/main --ff-only` 同步 bot bundle 到本地（本地 dist 有 watch 噪音时先 `git checkout HEAD -- dist/`）
11. 更新 `scripts/mfrs-release-constants.mjs` 的 `CDN_REF` = bot bundle 完整 SHA
12. `node scripts/publish-card.mjs 神秘复苏模拟器发布版 --dist-no-build` 生成发布版 PNG
13. release-png 门禁自动校验（version/refs/cache/regex/scripts）
14. 提交发布物（constants + 发布版 index.yaml + 发布版 PNG）
15. 打发布 tag `git tag v<版本号>` → `git push origin main` + `git push origin v<版本号>`

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

- 酒馆页面 `http://127.0.0.1:8000/`；用内置浏览器打开可看画面、手动交互、AI 自动化验证（点击、读快照、evaluate）
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
