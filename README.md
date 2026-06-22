# 神秘复苏模拟器

基于 SillyTavern 的《神秘复苏》世界观角色扮演模拟器，包含完整的数据库系统、实时状态追踪和自动化规则引擎。

## 项目简介

本项目是一个完整的 SillyTavern 角色卡工程，包含：
- **角色卡本体**：系统提示词、世界书、对话示例、开局表单
- **前端界面**：状态栏、专用面板、选项系统、数据库展示
- **脚本系统**：MVU 变量框架、数据库前端、自动更新、界面美化
- **数据库引擎**：14 张表的自动填表系统（基于 shujuku-sp-fork）
- **自动化工作流**：自动打包、版本管理、CDN 发布

## 快速开始

### 玩家使用

1. 下载最新角色卡：[神秘复苏模拟器发布版.png](src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png)（v6.28.3）
2. 在 SillyTavern 中导入角色卡
3. 选择支持的 AI 模型（推荐 Claude Opus/Sonnet）
4. 开始游玩

### 开发者使用

无论哪种方式, 请阅读[教程文档](https://stagedog.github.io/青空莉/工具经验/实时编写前端界面或脚本/)来了解如何使用.

#### 本地开发

```bash
# 克隆仓库
git clone https://github.com/linlangliehu/tavern_helper_template.git
cd tavern_helper_template

# 安装依赖
pnpm install

# 启动开发环境（VSCode 按 F5）
# 会自动运行 pnpm watch 并启动 Chrome 调试
```

开发环境会在 `http://127.0.0.1:8000/` 打开 SillyTavern，实时编译 `src/` 到 `dist/`。

#### 创建自己的仓库

基于本项目创建自己的角色卡：

- 点击网页右上角绿色 `Use this template` 按钮
- 或 Fork 后手动启用 Actions 工作流

配置工作流权限：`Settings → Actions → General` 中设置 `Read and write permissions`，勾选 `Allow GitHub Actions to create and approve pull requests`

## 版本历史

### v6.28.3（2026-06-22）- 当前版本
- **修复**：优化协议块清洗时机，确保内存与界面同步
  - 新增 MESSAGE_RECEIVED 监听器，在消息保存时立即清洗
  - 防止界面渲染时内存仍含协议块的问题
- **技术细节**：CDN ref `@1861e16`

### v6.28.2（2026-06-22）
- **修复**：固定状态栏动态加载后不初始化的问题
  - 移除 jQuery ready 回调，改为立即执行初始化
  - 解决脚本动态加载时页面已 ready 导致状态栏不显示的问题
- **技术细节**：CDN ref `@d4b1d23`

### v6.28.1（2026-06-22）
- **修复**：放宽事件纪要 chronicle_text CHECK 约束（200→20 字）
  - 解决 AI 输出过短文本时数据库拒绝写入的问题
- **技术细节**：CDN ref `@f3b60c9`

### v6.28.0 系列（2026-06 P5 线）
- **核心修复**：hotfix-generation-ended 监听器补丁
  - 注册 MVU 和数据库自动更新的 GENERATION_ENDED 监听器
  - 修复 AI 生成后未触发自动填表的问题
- **数据保护**：事件纪要追加式守卫
  - 禁止 DELETE 已有纪要行
  - 禁止改写已有行的 code_index
  - CRUD Plan + SQL 双路径保护
- **性能**：数据库写入成功率 78.6%（11/14 张表）

## 项目特性

### 核心功能
- ✅ **完整的世界观系统**：基于《神秘复苏》小说设定
- ✅ **实时状态追踪**：固定状态栏显示当前事件、位置、风险值等
- ✅ **自动数据库**：14 张表自动填充，包含行动建议、厉鬼档案、事件纪要等
- ✅ **MVU 变量框架**：解析 AI 输出的结构化数据
- ✅ **专用面板**：选项系统、风险标签、数据库展示
- ✅ **自动更新**：通过 CDN 自动更新前端界面和脚本

### 技术架构
- **前端**：Vue 3 + TypeScript + Sass
- **构建**：Webpack 5 + pnpm
- **CI/CD**：GitHub Actions 自动打包和版本管理
- **CDN**：jsdelivr（testingcf 镜像）
- **数据库**：shujuku-sp-fork（SQLite）

## 已知问题

### 数据库相关
- **3 张表初始化损坏**（v6.28.3）
  - 灵异物品、收录规律：vendor 初始化 bug，表头被截断
  - 状态：不影响核心游玩流程，标记为长期任务
  
### 固定状态栏
- **初始化失败**（已在 v6.28.2 修复）
  - 症状：Console 重复警告"找不到输入区容器"
  - 根因：动态加载脚本时页面已 ready，jQuery 回调不触发
  - 修复：移除 ready 回调，立即执行初始化

### 协议块清洗
- **内存与界面不同步**（已在 v6.28.3 修复）
  - 症状：界面显示已清洗，但 chat[i].mes 仍含协议块
  - 根因：界面美化脚本只隐藏 DOM，未写回内存
  - 修复：在 MESSAGE_RECEIVED 时立即清洗内存

## 开发指南

### 项目结构

```
tavern_helper_template/
├── src/
│   ├── 神秘复苏模拟器/              # 开发版角色卡（主工作目录）
│   │   ├── 系统提示词/
│   │   ├── 世界书/
│   │   ├── 对话示例/
│   │   ├── 第一条消息/
│   │   ├── 脚本/                    # 前端脚本
│   │   │   ├── 数据库前端/          # 数据库展示和操作
│   │   │   ├── 固定状态栏/          # 状态栏组件
│   │   │   ├── 界面美化/            # 样式和布局
│   │   │   └── hotfix-generation-ended-listeners/  # 监听器补丁
│   │   └── index.yaml               # 角色卡配置
│   └── 神秘复苏模拟器发布版/         # 发布版（由 publish-card 自动同步）
├── vendor/
│   └── shujuku-sp-fork/             # 数据库引擎 fork
├── scripts/
│   ├── publish-card.mjs             # 发布脚本
│   ├── verify-*.mjs                 # 回归测试
│   └── cdp-evaluate.mjs             # Chrome DevTools Protocol 工具
├── dist/                            # 构建产物（bot 自动生成）
├── .github/workflows/               # CI/CD 工作流
│   ├── bundle.yaml                  # 自动打包
│   ├── bump_deps.yaml               # 依赖更新
│   └── sync_template.yaml           # 模板同步
└── PROJECT_FLOW.md                  # 开发流程文档
```

### 开发流程

#### 1. 修改开发版
```bash
# 只改 src/神秘复苏模拟器/，不要手工改发布版
vim src/神秘复苏模拟器/世界书/规则/某个规则.txt
```

#### 2. 实时验证
- 在 VSCode 按 F5 启动调试
- Chrome 打开 `http://127.0.0.1:8000/`
- pnpm watch 自动编译

#### 3. 构建发布
```bash
# 构建 production 版本
pnpm build

# 同步到发布版
pnpm run publish-card -- 神秘复苏模拟器发布版
```

#### 4. 提交推送
```bash
# 从 origin/main 切 worktree（推荐）
git worktree add -b fix-something .codex-fix origin/main
cd .codex-fix
# ... 改动 ...
git add <具体文件>
git commit -m "fix: 描述"
git push -u origin fix-something

# 快速合并（小改动）
git checkout main
git merge fix-something --no-ff
git push origin main
git branch -d fix-something
git push origin --delete fix-something

# PR 流程（大改动）
# 在 GitHub 创建 PR: compare/main...fix-something
# 合并后自动触发 bot bundle
```

#### 5. bot 自动构建
- push 到 main 后，GitHub Actions 自动运行 `bundle.yaml`
- bot 提交 `[bot] bundle` 并打 tag（如 `v0.0.236`）
- 更新 `scripts/publish-card.mjs` 的 `CDN_REF` 为 bot bundle commit

#### 6. CDN 验证
```bash
# 验证资源可访问
node -e "require('https').get(encodeURI('https://testingcf.jsdelivr.net/gh/linlangliehu/tavern_helper_template@<commit>/dist/神秘复苏模拟器/脚本/数据库前端/index.js'), r => console.log(r.statusCode))"

# 验证角色卡 worldbook
node scripts/verify-worldbook-pollution-gate.mjs --expect-mfrs-runtime "src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png"
```

### 回归测试

```bash
# SQL 调试回归（确保历史 bug 不复现）
node scripts/verify-sql-debug-regressions.mjs

# 表变更适配器（chronicle 守卫）
node scripts/verify-table-change-adapter.mjs

# Worldbook 污染检查（确保 CDN ref 正确）
node scripts/verify-worldbook-pollution-gate.mjs --expect-mfrs-runtime "src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png"
```

### Chrome DevTools Protocol

项目包含 CDP 工具用于真页验证：

```bash
# 使用 MCP（推荐）
# 在 .mcp.json 配置 chrome-devtools 指向 http://127.0.0.1:9222

# 使用裸 CDP（fallback）
node scripts/cdp-evaluate.mjs "document.title"
```

## 如果只在本地使用

这意味着:

- 你将不能利用 jsdelivr 实现前端界面或脚本的自动更新;
- 也不能享受本模板提供的自动打包、自动更新功能:
  - 上传代码后, 自动打包 `src` 文件夹中的代码到 `dist` 文件夹中;
  - 自动更新成最新的编写模板, 自动更新酒馆和酒馆助手的参考文件……

但你本地依旧能很方便地使用这个模板.

## 如果创建为新仓库

### Git 配置

在创建好仓库后, 你可以把仓库网址发给 AI, 问 AI 该**怎么启用 `core.symlinks`**, 然后克隆到本地使用; 或者, 你可以游玩 [Learn Git Branching](https://learngitbranching.js.org/?locale=zh_CN) 来学习 git 分支和合并.

```bash
# 启用 merge 策略（解决 dist 冲突）
git config --global merge.ours.driver true

# 忽略 launch.json 本地改动（避免暴露酒馆地址）
git update-index --skip-worktree .vscode/launch.json
```

### 示例文件夹

请不要删除`示例`文件夹, AI 需要参考其中的代码; 但你可以在 `webpack.config.ts` 中将 54 行左右的 `{示例,src}/` 改为 `src/` 来避免打包它们.

## 自动化工作流

本仓库在 `.github/workflows` 文件夹中设置了几个 CI 工作流来为你带来自动打包、自动更新功能, 你也可以在网页上方的 `Actions` 中手动运行它们:

### bundle.yaml（自动打包）

- 每次 push 到 main 时自动运行（忽略 `dist/**` 改动）
- 自动 `rm -rf dist && pnpm install && pnpm build`
- bot 提交 `[bot] bundle` 并用 `v` 前缀打新 tag
- **重要**：source PR 只提交 source + 测试，dist 留给 bot 在 CI 一致环境重建

### bump_deps.yaml（依赖更新）

- 每三天一次, 自动更新第三方库依赖和酒馆助手 `@types` 文件夹

### sync_template.yaml（模板同步）

- 在你基于模板仓库创建新仓库后, 你的新仓库将不再和模板仓库有关联, 因此我设置了这个工作流用于同步模板仓库的更新 (如编程助手编写规则、MCP、slash_command.txt 文件等):
  - 发现模板仓库更新后, 这个工作流将会自动创建一个 pull request 来同步更新, 而**你需要手动批准 pull request, 因此建议你时常查看 github 的邮件通知;**
  - 如果模板仓库中有文件是你不想继续同步的, 可以在 `.github/.templatesyncignore` 中添加它.

## CDN 自动更新

### 前端界面或脚本的自动更新

由于你所制作的前端界面或脚本将被打包在 github 仓库中, 你将能用 jsdelivr 链接来访问它们, 而这个链接可以在前端界面或脚本中直接使用.

由此你就可以为用户创建这样一个自动更新的前端界面:

```html
<body>
  <script>
    $('body').load('https://testingcf.jsdelivr.net/gh/linlangliehu/tavern_helper_template@1861e16/dist/神秘复苏模拟器/界面/状态栏/index.html?v=phase164-4-0-final-baseline-6-28-p5-4-hotfix13')
  </script>
</body>
```

或一个自动更新的脚本:

```typescript
import 'https://testingcf.jsdelivr.net/gh/linlangliehu/tavern_helper_template@1861e16/dist/神秘复苏模拟器/脚本/数据库前端/index.js?v=phase164-4-0-final-baseline-6-28-p5-4-hotfix13'
```

**注意**：
- `@<commit>` 是 CDN ref，指向包含最新 dist 的 bot bundle commit
- `?v=<version>` 是 cache version，用于强制刷新浏览器缓存
- 中文路径必须用 `encodeURI()` 编码，否则 curl 会返回 400

更多请见于[文档](https://stagedog.github.io/青空莉/工具经验/实时编写前端界面或脚本/进阶技巧).

### CDN ref 管理

发布新版本时，按以下流程更新 CDN ref：

1. 提交 source 改动到 main
2. 等待 bot 自动构建（commit `[bot] bundle`）
3. 更新 `scripts/publish-card.mjs` 的 `CDN_REF` 为 bot bundle commit
4. 运行 `pnpm run publish-card`，会自动：
   - 镜像开发版到发布版
   - 替换所有 localhost/127.0.0.1 为 CDN
   - 替换旧 jsdelivr hash/cache 为当前 CDN
   - 添加 `?v=<cache-version>` 到资源 URL
5. 提交发布版 YAML 和 PNG

## 贡献指南

欢迎提交 Issue 和 PR！

### Issue
- Bug 报告：描述复现步骤、预期行为、实际行为
- 功能建议：说明使用场景和预期效果

### Pull Request
- Fork 仓库并创建分支
- 遵循项目代码风格
- 补充必要的测试和文档
- 提交前运行回归测试

## 常见问题

### Q: 为什么 dist 文件总是冲突？
A: 已在 `.gitattributes` 中配置 `dist/** merge=ours`，运行 `git config --global merge.ours.driver true` 启用。dist 由 bot 自动重建，本地冲突可直接使用当前版本。

### Q: 如何验证 CDN 资源是否正确？
A: 使用 `node -e "require('https').get(encodeURI('<url>'), r => console.log(r.statusCode))"`，中文路径必须 `encodeURI()`。

### Q: worldbook 污染检查失败怎么办？
A: 运行 `node scripts/verify-worldbook-pollution-gate.mjs --expect-mfrs-runtime "<png-path>"`，检查是否有旧 CDN ref、localhost 或错误的 marker/cache 残留。

### Q: 数据库表初始化失败？
A: 已知 bug（灵异物品、收录规律表头截断），不影响核心功能。长期修复计划见 `task_plan.md` 任务 E。

## 许可证

[Aladdin](LICENSE)
