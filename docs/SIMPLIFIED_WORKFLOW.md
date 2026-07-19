# 开发流程使用指南（唯一主流程）

本项目为**单人开发**，采用极简流程：**固定端口静态服务 + 直接切换 YAML 开发/生产模式 + 内置浏览器验收 + GitHub Actions 自动 bundle**。

> 历史上的 MFRS 多 worktree / 动态端口 / 身份验证 / DEV 卡派生 / 会话锁机制已于 2026-07-19 **彻底废弃**，本文档描述的就是当前**唯一**的开发流程。

- 本文档：面向使用者的**操作手册**（怎么按键、跑什么任务、遇到问题怎么办）。
- 契约与边界真源：`PROJECT_FLOW.md`（端口职责、发布流程、CDN ref 规则、硬约束）。
- 当前进度：`task_plan.md` 顶部；会话流水：`progress.md`；可复用结论：`findings.md`。

---

## 一图看懂

```
改源码 ──▶ pnpm watch 自动编译 ──▶ dist/**
                                     │
                        静态服务器(5510) 暴露 dist
                                     │
  index.yaml(dev模式) 的脚本 URL 指向 http://127.0.0.1:5510/
                                     │
              SillyTavern(8000) 加载本地 bundle
                                     │
                  内置浏览器打开 8000 看效果 / 验收
```

开发结束 → 切回生产模式 → 发布走 `publish-card` + GitHub Actions。

---

## 端口

| 端口 | 用途 |
|------|------|
| `8000` | SillyTavern 酒馆真页（业务页面） |
| `5510` | 本地静态服务器，暴露 `dist/**`（**固定端口** + CORS） |
| `6620` | `tavern_sync`（可选，角色卡/世界书 push/pull/bundle） |

---

## 日常开发步骤

### 1. 启动开发环境

**按 `F5`**（笔记本常为 `Fn+F5`）→ 运行 `启动开发环境`。

它按顺序触发任务链：

1. **切换到开发模式** — `toggle-dev-mode.mjs --enable`：把 `src/神秘复苏模拟器/index.yaml` 的 CDN URL 改为 `http://127.0.0.1:5510/`，并在 YAML 顶部备份原始 CDN_REF 到 `# DEV_MODE_ORIGINAL_CDN_REF:` 注释
2. **pnpm watch** — webpack 监听源码，持续编译到 `dist/**`
3. **静态服务器** — 固定端口 `5510` 暴露 `dist/**`

> 也可用命令面板（`Ctrl+Shift+P`）→ **运行任务** 手动单独跑上述任一任务。
> 本流程**不启动、不管理调试 Chrome**；验收用内置浏览器即可。

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
3. **刷新酒馆页面** → 看到最新效果（**无需重新导卡**）

用**内置浏览器**打开 `http://127.0.0.1:8000/` 查看画面、手动交互，或让 AI 自动化验证（点击、读快照、evaluate）。

> 若开新聊天后 vendor 脚本仍报旧 CDN 404，是旧聊天缓存了 base URL；**开一个全新聊天**即可让 localhost base 生效。

### 4. 结束开发

运行任务 **切换回生产模式**（`toggle-dev-mode.mjs --disable`）——还原 YAML 的 CDN URL、移除 `DEV_MODE_ORIGINAL_CDN_REF` 注释。

随后可进入发布流程（见下）。

---

## 常用任务

命令面板（`Ctrl+Shift+P`）→ 输入 **运行任务**：

| 任务 | 功能 |
|------|------|
| `启动开发环境` | 一键任务链：切开发模式 → watch → 静态服务器 |
| `切换到开发模式` | 仅把 YAML 改为 `http://127.0.0.1:5510/` |
| `切换回生产模式` | 还原 YAML 为 CDN 地址 |
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
```

---

## 发布流程（简版索引）

完整步骤、CDN ref 规则、发布验证最低线见 **`PROJECT_FLOW.md`**。要点：

1. 确认 YAML 已切回生产模式（`--status` 显示"生产模式"）
2. 升级 `src/神秘复苏模拟器/index.yaml` + 发布版 `index.yaml` 的 `版本:`
3. 更新 `scripts/mfrs-release-constants.mjs` 的 `RELEASE_VERSION` / `CDN_CACHE_VERSION`
4. 更新 `CHANGELOG.md`
5. `pnpm verify:mfrs-gates`（全绿）
6. **精确提交源码**（`git add <具体文件>`，**不要** `git add .`，不提交本地 `dist/**`）
7. `git push origin main` → GitHub Actions（`bundle.yaml`）自动 `rm -rf dist && pnpm install && pnpm build`，提交 `[bot] bundle` 并打自动 tag
8. 用 **GitHub MCP** 查 Actions 状态 + bot bundle 的 commit SHA
9. `git rebase origin/main`（本地 dist 有 watch 噪音时先 `git checkout HEAD -- dist/`）
10. 更新 `mfrs-release-constants.mjs` 的 `CDN_REF` = bot bundle 完整 SHA
11. `node scripts/publish-card.mjs 神秘复苏模拟器发布版 --dist-no-build` 生成发布版 PNG（自动跑 release-png 门禁）
12. 提交发布物 → 打 tag `v<版本>` → `git push origin main` + `git push origin v<版本>`

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
3. 硬刷新酒馆页面；vendor 报旧 CDN 404 时开一个全新聊天

**Q：推送被拒（rejected）？**
发布后 CI 会追加 `[bot] bundle` 提交。先 `git fetch origin` → `git rebase origin/main`（bot 只改 `dist/`，与源码改动零重叠，安全）→ 再 `git push`。

---

## 硬约束（勿破，详见 PROJECT_FLOW.md）

- 脚本库 **8 项** 名称/顺序/启用不改
- 正则数量门禁约 **33**；改 id/启用需同步 `verify-mfrs-release-png`
- **禁止**手改发布版 PNG；只走 `publish-card`
- 发布版角色卡只能由开发版同步生成
- 拟办/选项：**只填不自动发送**
- `CDN_REF` 必须是 commit SHA 或 `@v<版本>` tag，禁止 `@main`/`@master`
