# 开发流程使用指南（唯一主流程）

本项目为**单人开发**，采用极简流程：**固定端口静态服务 + 直接切换 YAML 开发/生产模式 + VS Code 调试 Chrome（CDP 9225）验收 + GitHub Actions 自动 bundle**。

> 历史上的 MFRS 多 worktree / 动态端口 / 身份验证 / DEV 卡派生 / 会话锁机制已于 2026-07-19 **彻底废弃**，本文档描述的就是当前**唯一**的开发流程。

- 本文档：面向使用者的**操作手册**（怎么按键、跑什么任务、遇到问题怎么办）。
- 契约与边界真源：`PROJECT_FLOW.md`（端口职责、发布流程、CDN ref 规则、硬约束）。
- 当前进度：`task_plan.md` 顶部；会话流水：`progress.md`；可复用结论：`findings.md`。

---

## 一图看懂

```text
改源码 ──▶ pnpm watch 自动编译 ──┬─▶ dist/** ──▶ 静态服务器(5510) ──▶ 开发卡 YAML 加载 local bundle ──▶ SillyTavern(8000)
                                 ├─▶ tavern_sync watch(6620) ──▶ 同步角色卡/世界书/预设
                                 └─▶ HMR(6621) ──▶ 推送酒馆助手热重载 ──────────────────────────────▶ SillyTavern(8000)

VS Code 调试 Chrome(CDP 9225) 打开酒馆页面 ──▶ AI 用 chrome-devtools 连 9225 验收
```

开发结束 → 切回生产模式 → 发布走 `publish-card` + GitHub Actions。

---

## 端口

| 端口 | 用途 |
| ------ | ------ |
| `8000` | SillyTavern 酒馆真页（业务页面） |
| `5510` | 本地静态服务器，暴露 `dist/**`（**固定端口** + CORS） |
| `6620` | `tavern_sync watch`（**默认开启**）：同步 `tavern_sync.yaml` 中配置的角色卡/世界书/预设 |
| `6621` | webpack HMR（**默认开启**）：编译完成后推送更新事件，让酒馆页面热重载 |
| `9225` | 独立调试 Chrome CDP（由 VS Code 启动）；`chrome-devtools` MCP 与 `scripts/cdp-evaluate.mjs` 连此端口验收；`--user-data-dir=.vscode/chrome-debug-profile` 独立 profile |

如需关闭其中一个默认监听，显式设置 `TAVERN_HELPER_DISABLE_TAVERN_SYNC=1` 或 `TAVERN_HELPER_DISABLE_HMR_SERVER=1` 后再启动 watch。

---

## 日常开发步骤

### 1. 启动开发环境

**按 `F5`**（笔记本常为 `Fn+F5`）→ 启动调试。

`preLaunchTask` 按顺序跑任务链，三者就绪后 VS Code 以调试模式启动独立 Chrome：

1. **切换到开发模式** — `toggle-dev-mode.mjs --enable`：把 `src/神秘复苏模拟器/index.yaml` 的 CDN URL 改为 `http://127.0.0.1:5510/`，并在 YAML 顶部备份原始 CDN_REF 到 `# DEV_MODE_ORIGINAL_CDN_REF:` 注释
2. **pnpm watch** — webpack 只监听源码，持续编译到 `dist/**`（等 `webpack … compiled`）
3. **静态服务器** — 固定端口 `5510` 暴露 `dist/**`（等 `Static server running`）
4. **VS Code 启动调试 Chrome** — `--remote-debugging-port=9225 --user-data-dir=.vscode/chrome-debug-profile`，打开 `http://127.0.0.1:8000/`

> 也可用命令面板（`Ctrl+Shift+P`）→ **运行任务** 手动单独跑 1–3（任务名 `启动开发服务`），不含浏览器。
> AI 真页验收通过 `chrome-devtools` MCP 连 `http://127.0.0.1:9225`；人可在 VS Code 对 TS/Vue 源码设断点。

### 2. 导入开发卡（首次 / 卡内容变动时）

生成带 localhost URL 的开发卡并导入酒馆：

```bash
node tavern_sync.mjs bundle 神秘复苏模拟器
# 产物：src/神秘复苏模拟器/神秘复苏模拟器.png（脚本 URL 指向 127.0.0.1:5510）
```

在 SillyTavern 导入 `src/神秘复苏模拟器/神秘复苏模拟器.png`。

> ⚠️ **别导错卡**：`src/神秘复苏模拟器/…png` 是**开发卡**（localhost）；`src/神秘复苏模拟器发布版/…png` 是**发布卡**（CDN）。开发时导开发卡。

### 3. 开发循环

1. **改源码** → 保存
2. **pnpm watch 自动编译** → 终端出现 `webpack … compiled`
3. **6621 HMR 推送热重载** → 看到最新效果（**无需重新导卡**；如酒馆实时监听开关关闭，则手动刷新调试 Chrome）

VS Code 调试 Chrome（CDP `127.0.0.1:9225`）已打开 `http://127.0.0.1:8000/`，可看画面、手动交互，或让 AI 用 `chrome-devtools` 连 9225 做自动化验证（点击、读快照、evaluate）。

> 若开新聊天后 vendor 脚本仍报旧 CDN 404，是旧聊天缓存了 base URL；**开一个全新聊天**即可让 localhost base 生效。

### 4. 结束开发

运行任务 **结束开发环境**（`pnpm stop-dev`）——停止当前仓库的 `pnpm watch` 与 5510 静态服务器，还原 YAML 的 CDN URL并移除 `DEV_MODE_ORIGINAL_CDN_REF` 注释。

随后可进入发布流程（见下）。

---

## 常用任务

命令面板（`Ctrl+Shift+P`）→ 输入 **运行任务**：

| 任务 | 功能 |
| ------ | ------ |
| `启动开发服务` | 一键任务链：切开发模式 → watch → 静态服务器（不含浏览器；浏览器由 F5 调试配置启动） |
| `切换到开发模式` | 仅把 YAML 改为 `http://127.0.0.1:5510/` |
| `切换回生产模式` | 还原 YAML 为 CDN 地址 |
| `结束开发环境` | 停止当前仓库 watch/5510 并还原 YAML 为生产模式 |
| `查看当前模式` | 显示当前是开发模式还是生产模式（含当前 ref） |
| `pnpm watch` | 仅启动源码监听编译 |
| `静态服务器` | 仅启动固定端口 5510 静态服务 |

对应命令行：

```bash
node scripts/toggle-dev-mode.mjs --enable    # 切开发
node scripts/toggle-dev-mode.mjs --disable   # 切生产
node scripts/toggle-dev-mode.mjs --status    # 查看模式
node scripts/mfrs-dev-server-simple.mjs      # 启动静态服务器（固定 5510）
pnpm watch                                   # 源码监听编译
pnpm stop-dev                                # 停止 watch/5510 并恢复生产模式
```

---

## 发布流程（简版索引）

完整步骤、CDN ref 规则、发布验证最低线见 **`PROJECT_FLOW.md`**。要点：

1. 确认 YAML 已切回生产模式（`--status` 显示"生产模式"）
2. 只升级开发版 `src/神秘复苏模拟器/index.yaml` 的版本；发布版由阶段 2 的 `publish-card` 镜像生成
3. 更新 `scripts/mfrs-release-constants.mjs` 的 `RELEASE_VERSION` / `CDN_CACHE_VERSION`
4. 更新 `CHANGELOG.md`
5. `pnpm verify:mfrs-source-gates`（源码门禁全绿，不检查尚未生成的新发布 PNG）
6. **精确提交源码**（`git add <具体文件>`，**不要** `git add .`，不提交本地 `dist/**`）
7. `git push origin main` → GitHub Actions（`bundle.yaml`）自动 `rm -rf dist && pnpm install && pnpm build`，提交 `[bot] bundle` 并打自动 tag
8. 用 **GitHub MCP** 查 Actions 状态 + bot bundle 的 commit SHA
9. 先 `git fetch origin`（本地 dist 有 watch 噪音时先 `git checkout HEAD -- dist/`）：没有新增本地提交时执行 `git merge --ff-only origin/main`；已有新增本地提交时执行 `git rebase origin/main`
10. 更新 `mfrs-release-constants.mjs` 的 `CDN_REF` = bot bundle 完整 SHA
11. `node scripts/publish-card.mjs 神秘复苏模拟器发布版 --dist-no-build` 生成发布版镜像和 PNG
12. `pnpm verify:mfrs-gates` 跑完整门禁（含 release-png）
13. 提交发布物 → 打 tag `v<版本>` → `git push origin main` + `git push origin v<版本>`

> `--dist-no-build`：dist 已由 CI bot 权威构建（CDN_REF 指向该 commit），跳过本地 build，只校验 `dist == CDN_REF` 一致性，规避本地依赖漂移的 webpack module-id 噪音。

---

## 原理：开发模式 vs 生产模式

**生产模式（默认，可提交）：**
```yaml
# src/神秘复苏模拟器/index.yaml
loadLocalModule('数据库前端', 'https://testingcf.jsdelivr.net/gh/linlangliehu/tavern_helper_template@<SHA>/dist/…/index.js?v=…');
```

**开发模式（本地验收用，禁止提交）：**
```yaml
# DEV_MODE_ORIGINAL_CDN_REF: <SHA>   ← 自动添加，用于还原
loadLocalModule('数据库前端', 'http://127.0.0.1:5510/dist/…/index.js?v=…');
```

**为什么直接改正式 YAML 安全：**
- 单人开发，无多 worktree 身份冲突，不需要派生 DEV 卡
- 切换时自动记录原始 CDN_REF 到注释，可一键还原
- 忘记还原就 commit 时，`git diff` 会显示 `127.0.0.1:5510`，容易发现并拦截

---

## 提交前自检（重要）

⚠️ 每次提交前务必确认没把开发态污染带进去：

```bash
node scripts/toggle-dev-mode.mjs --status   # 必须显示"生产模式"
git diff --name-status HEAD                  # 确认变更清单
```

必须排除的三类污染：
- ❌ **dev 模式 YAML** — `index.yaml` 含 `127.0.0.1:5510` 或 `DEV_MODE_ORIGINAL_CDN_REF`（切回生产 + `git checkout` 恢复）
- ❌ **本地 dist 噪音** — `pnpm watch`/`build` 产生的 `dist/**` 与 CI bot bundle 有依赖漂移（`git checkout HEAD -- dist/`）
- ❌ **本地导出物** — 如 `酒馆助手脚本-*.json`（不提交，保留 untracked）

发布 dist 一律以 **CI bot bundle 为真源**，本地 dist 只用于开发。

---

## 常见问题

**Q：端口 5510 被占用？**
```powershell
Get-NetTCPConnection -LocalPort 5510 -State Listen | Select-Object OwningProcess
Stop-Process -Id <进程ID>
```

**Q：忘记切回生产模式就 commit 了？**
```bash
node scripts/toggle-dev-mode.mjs --disable
git checkout -- src/神秘复苏模拟器/index.yaml   # 或
git add src/神秘复苏模拟器/index.yaml && git commit --amend --no-edit
```

**Q：改了源码但酒馆没变化？**
1. 看 `pnpm watch` 终端是否出现 `webpack … compiled`
2. 确认 `--status` 是开发模式（否则酒馆加载的是 CDN 而非本地）
3. 调试 Chrome 里重载酒馆页面（AI 可用 `chrome-devtools` 的 `navigate_page` reload）；vendor 报旧 CDN 404 时开一个全新聊天

**Q：推送被拒（rejected）？**
发布后 CI 会追加 `[bot] bundle` 提交。先 `git fetch origin`；没有新增本地提交时执行 `git merge --ff-only origin/main`，已有新增本地提交时执行 `git rebase origin/main`，再 `git push`。bot 只改 `dist/`，同步前仍应确认并恢复本地 watch/build 噪音。

---

## 硬约束（勿破，详见 PROJECT_FLOW.md）

- 脚本库 **8 项** 名称/顺序/启用不改
- 正则数量门禁约 **33**；改 id/启用需同步 `verify-mfrs-release-png`
- **禁止**手改发布版 PNG；只走 `publish-card`
- 发布版角色卡只能由开发版同步生成
- 拟办/选项：**只填不自动发送**
- `CDN_REF` 必须是 commit SHA 或 `@v<版本>` tag，禁止 `@main`/`@master`
