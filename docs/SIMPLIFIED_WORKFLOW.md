# 简化版开发流程使用指南

## 概述

你的 Fork 仓库现在提供**两套开发流程**：

1. **【简化版】** — 单人开发，回归原始简单流程（推荐用于日常开发）
2. **【MFRS 完整版】** — 企业级流程，适合多 worktree 并行开发和严格发布（用于复杂场景）

本文档介绍简化版流程的使用方法。

---

## 简化版 vs MFRS 完整版对比

| 维度 | **简化版** | **MFRS 完整版** |
|------|-----------|----------------|
| **启动命令** | F5 → `【简化版】启动开发环境` | F5 → `MFRS: 开始实时开发` |
| **端口** | 固定 `5510` | 动态 `5510-5514` |
| **YAML 修改** | 直接修改 `src/神秘复苏模拟器/index.yaml` | 派生 DEV 卡到 `.local/mfrs-dev/` |
| **Worktree** | 不支持 | 自动检测目标 worktree |
| **身份验证** | 无 | 7 项 identity 检查 |
| **预检** | 仅检查端口占用 | worktree/端口/依赖/会话锁 |
| **适用场景** | 单人开发，快速迭代 | 多分支并行，发布前验证 |

---

## 简化版使用步骤

### 1. 首次启动开发环境

**按 `F5` → 选择 `【简化版】启动开发环境`**

这会依次执行：
1. ✅ 切换到开发模式（将 YAML 中的 CDN 链接改为 `http://127.0.0.1:5510/`）
2. ✅ 启动 `pnpm watch`（监听源码变化并自动编译）
3. ✅ 启动静态服务器（端口 `5510`）
4. ✅ 启动 Chrome 调试模式（端口 `9222`）

**终端输出示例：**
```
✅ 已切换到开发模式
   原始 CDN_REF: 9c5a467a3481
   所有资源将从 http://127.0.0.1:5510/ 加载

💡 提示：
   1. 现在可以修改源码，pnpm watch 会自动编译
   2. 修改后刷新酒馆页面即可看到效果
   3. 开发完成后运行 "简化版：切换回生产模式" 还原 YAML

✅ 静态服务器已启动
   地址: http://127.0.0.1:5510/
   根目录: d:\project\tavern_helper_template
```

### 2. 在酒馆中导入角色卡

导入 `src/神秘复苏模拟器/神秘复苏模拟器.png`（正式卡，YAML 已经改为本地地址）

### 3. 开发循环

1. **修改源码** → 保存
2. **`pnpm watch` 自动编译** → 终端显示 `webpack compiled`
3. **刷新酒馆页面** → 看到最新效果

### 4. 开发完成，切换回生产模式

**命令面板 → 运行任务 → `【简化版】切换回生产模式`**

这会：
- 将 YAML 中的 `http://127.0.0.1:5510/` 还原为原始 jsdelivr CDN 链接
- 移除开发模式标记注释

**现在可以：**
```bash
pnpm build              # 打包生产版本
pnpm verify:mfrs-gates  # 运行门禁验证
git add . && git commit # 提交代码
git push                # 触发 GitHub Actions 自动发布
```

---

## 常用任务快捷方式

在 VS Code 命令面板（`Ctrl+Shift+P`）中输入 `运行任务`：

| 任务名称 | 功能 |
|---------|------|
| `【简化版】启动开发环境` | 一键启动完整开发环境 |
| `【简化版】切换到开发模式` | 仅切换 YAML 为本地地址 |
| `【简化版】切换回生产模式` | 还原 YAML 为 CDN 地址 |
| `【简化版】查看当前模式` | 查看当前是开发模式还是生产模式 |

---

## 原理说明

### 开发模式 vs 生产模式

**生产模式（默认）：**
```yaml
# src/神秘复苏模拟器/index.yaml
scripts:
  - url: https://testingcf.jsdelivr.net/gh/linlangliehu/tavern_helper_template@9c5a467a3481/dist/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js
```

**开发模式：**
```yaml
# DEV_MODE_ORIGINAL_CDN_REF: 9c5a467a3481  # 自动添加，用于还原
scripts:
  - url: http://127.0.0.1:5510/dist/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js
```

### 为什么直接修改正式 YAML？

在简化版中，我们直接修改 `src/神秘复苏模拟器/index.yaml`，因为：
1. ✅ 单人开发，不需要保护正式 YAML
2. ✅ 不需要处理多 worktree 身份冲突
3. ✅ 切换模式时自动记录原始 CDN_REF，可以安全还原
4. ✅ 开发完成后一键还原，不会残留本地地址

**安全措施：**
- 开发模式会在 YAML 顶部添加 `# DEV_MODE_ORIGINAL_CDN_REF: <sha>` 注释
- 切换回生产模式时，根据这个注释还原为原始 CDN 链接
- 如果忘记切换就 commit，Git 会显示 YAML 变更，容易发现

---

## 常见问题

### Q: 端口 5510 被占用怎么办？

**手动检查：**
```powershell
netstat -ano | findstr 5510
taskkill /PID <进程ID> /F
```

### Q: 忘记切换回生产模式就 commit 了？

**查看 Git 状态：**
```bash
git diff src/神秘复苏模拟器/index.yaml
```

如果看到 `http://127.0.0.1:5510/`，运行：
```bash
node scripts/toggle-dev-mode.mjs --disable
git add src/神秘复苏模拟器/index.yaml
git commit --amend --no-edit
```

### Q: 简化版和 MFRS 完整版可以共存吗？

可以。两套任务独立，互不影响：
- 日常开发用简化版
- 发布前验证或多分支开发用 MFRS 完整版

### Q: 如何完全回到原始流程（不用 F5）？

如果你想完全手动：
1. 运行 `node scripts/toggle-dev-mode.mjs --enable`
2. 手动启动 `pnpm watch`
3. 手动启动 `node scripts/mfrs-dev-server-simple.mjs`
4. 开发完成后 `node scripts/toggle-dev-mode.mjs --disable`

---

## 与原始 StageDog 仓库的对比

| 维度 | **StageDog 原始** | **你的简化版** |
|------|------------------|---------------|
| 启动方式 | `pnpm watch` + Live Server 扩展 | F5 一键启动 |
| 端口 | 5500 (Live Server) | 5510（避免冲突） |
| YAML 修改 | 手动改正则/脚本中的链接 | 自动替换整个 YAML |
| 还原 | 手动改回 | 一键还原（记录原始 CDN_REF） |
| 门禁 | 无 | 保留（`pnpm verify:mfrs-gates`） |
| GitHub Actions | 有 | 保留（自动打包发布） |

---

## 推荐工作流

### 日常开发（单功能迭代）
```bash
# 1. F5 → 【简化版】启动开发环境
# 2. 修改源码
# 3. 看到 webpack compiled → 刷新酒馆
# 4. 完成后运行任务 → 【简化版】切换回生产模式
# 5. pnpm build && pnpm verify:mfrs-gates
# 6. git commit && git push
```

### 复杂开发（多分支并行，需要 worktree）
```bash
# 创建 feature worktree
git worktree add .claude/worktrees/feat-xxx -b feat-xxx

# 在 worktree 中开发
cd .claude/worktrees/feat-xxx
# F5 → MFRS: 开始实时开发（自动检测 worktree）

# 开发完成，回到主仓库
cd ../../..
git merge feat-xxx
pnpm verify:mfrs-gates
git push
```

---

## 下一步

- ✅ 试用简化版流程，看是否满足日常开发需求
- ✅ 如需更多自定义，可以修改 `scripts/toggle-dev-mode.mjs` 和 `scripts/mfrs-dev-server-simple.mjs`
- ✅ 发布前仍然建议运行完整门禁：`pnpm verify:mfrs-gates`（保证质量）
