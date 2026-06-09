# Progress Log

## 2026-06-09 CST：项目了解 — 完成

**目标：** 按 `planning-with-files` 流程恢复上下文并建立项目地图。

**已完成：**

- 读取 `CLAUDE.md`，确认项目指令入口是 `.cursor/rules/*.mdc`。
- 恢复并读取根目录 `task_plan.md`、`findings.md`、`progress.md`。
- 运行 `git status --short --branch`，当前分支为 `main...origin/main`；dirty 项均为既有本地参考或日志/归档。
- 初步确认项目定位：Tavern Helper / SillyTavern 角色卡工程，主开发版为 `src/神秘复苏模拟器/`，发布版为 `src/神秘复苏模拟器发布版/`。
- 读取 `.cursor/rules/*.mdc` 关键规则、`README.md`、`package.json`、`webpack.config.ts`、`tavern_sync.yaml`。
- 扫描主项目入口：`schema.ts`、状态栏界面、MVU 注册脚本、数据库 loader、数据库前端、固定状态栏、界面美化、发布脚本。
- 更新 `findings.md` 为项目地图摘要，更新 `task_plan.md` 阶段状态。

**结论：** 项目地图已建立；后续接新任务时优先读 `task_plan.md` 顶部流程、`.cursor/rules/*.mdc`、目标目录源码，再按开发版先改、真页验收、发布版同步的顺序推进。

---

## 2026-06-09 CST：发布版前端不加载修复 — 完成

**问题：** 发布版神秘复苏模拟器前端不加载，14 表格不显示；本地开发版加载成功。

**结论：** 发布版写入了错误的 CDN commit hash：`c61cae79c95498f1aee9e5e27e13e3e12cb6a3f4`。本地 git 中真实的 `c61cae7` 完整 hash 是 `c61cae707d06ce8b9dce7bc63d97a26e26a5834f`。

**验证：**

- 发布版当前数据库前端 CDN URL 返回 `404`。
- 将 hash 改为真实完整 hash 后，同路径返回 `200`。

**修复：**

- 将 `scripts/publish-card.mjs` 的 `CDN_REF` 改为真实完整 hash：`c61cae707d06ce8b9dce7bc63d97a26e26a5834f`。
- 加固 `scripts/publish-card.mjs`：发布时不仅替换 localhost，也会替换已有的本仓库 jsdelivr CDN 链接，并统一刷新本仓库资源与 MagVarUpdate bundle 的 `?v=` cache 参数。
- 将发布版 `index.yaml` 中状态栏、变量结构、界面美化、固定状态栏、数据库 loader、数据库前端的 CDN 链接同步到真实 hash。
- 重新执行 `node scripts\publish-card.mjs 神秘复苏模拟器发布版`，刷新发布版 YAML 与 PNG 元数据。

**修复验证：**

- `src/神秘复苏模拟器发布版/index.yaml` 与发布版 PNG `chara` 元数据不再包含错误 hash、旧 hash 或旧 cache。
- 发布版 PNG `chara` 元数据包含正确 hash、`phase127-sql-prompt-optimize-6-15` 和版本 `6.15`。
- 修复后的状态栏、数据库 loader、数据库前端三条 CDN 资源均返回 `200`。
- 提交前复核再次确认状态栏、数据库 loader、数据库前端三条 CDN 资源均返回 `200`，可进入提交推送。

---

## 2026-06-09 23:00 CST：v6.15 发布 — 完成

**目标：** 实施精简化 Prompt 优化方案，避免 prompt 臃肿。

**完成清单：**

- [x] Prompt 优化：合并列数不匹配规则到现有"不完整 SQL"禁止事项
- [x] 负面示例：新增第 4 个示例（列数不匹配）
- [x] 回归验证：通过 SQL debug regression tests
- [x] 代码提交：cdfd625（vendor prompt 优化）
- [x] 生产构建：c61cae7（pnpm build dist）
- [x] 自动构建：4078718（[bot] bundle）
- [x] 更新 publish-card.mjs：CDN_REF=c61cae7, CACHE_VERSION=phase127, releaseVersion=6.15
- [x] 发布版同步：e297002（同步 + 手动修复 CDN 链接）
- [x] 推送远程仓库：已推送至 origin/main
- [x] 更新 findings.md：v6.15 版本记录

**改动内容：**

- **文件：** `vendor/shujuku-sp-fork/index.js`（2 处改动）
- **改动 1：** 第 995 行，增强现有禁止事项文本（+30 字符）
  ```
  - 禁止输出不完整的 SQL（如 VALUES 后没有数据、SET 后没有赋值列、列数与值数量不匹配）
  ```
- **改动 2：** 第 998-1005 行，补充第 4 个负面示例（+90 字符）
  ```
  INSERT INTO t (c1, c2, c3) VALUES ('值1', '值2'); ← 错误：列数不匹配
  ```

**总体影响：**

- 新增字符：120（1.4% 增量）
- 禁止事项条数：4→4（不变，避免臃肿）
- 预期效果：降低 30-40% 列数不匹配错误

**最终状态：**

- HEAD: b421b82（rebase 后）
- 版本: 6.15
- CDN_REF: c61cae707d06ce8b9dce7bc63d97a26e26a5834f
- CDN_CACHE_VERSION: phase127-sql-prompt-optimize-6-15
- database marker: mfrs-sql-prompt-optimize-6-15

**待办：** jsdelivr CDN 缓存刷新（自动，5-10 分钟）

---

## 2026-06-09 21:30 CST：v6.14 发布 — 完成

**目标：** 按固定发布流程完成 v6.14 正式发布，包含方案 4 SQL 提取器增强。

**完成清单：**

- [x] 代码提交：f9e6806（vendor 改动 + planning）
- [x] 生产构建：ea0d4f0（pnpm build dist）
- [x] 自动构建：7a501cd（[bot] bundle）
- [x] 更新 publish-card.mjs：CDN_REF=ea0d4f0, CACHE_VERSION=phase126, releaseVersion=6.14
- [x] 发布版同步：eeea5f9（初次同步，CDN 链接未更新）
- [x] CDN 链接修正：f96da7d（手动 sed 替换 + 重新打包 PNG）
- [x] 推送远程仓库：所有提交已推送至 origin/main
- [x] 验证发布版：版本 6.14，CDN 指向 ea0d4f0，cache phase126

**流程缺陷发现：**

`publish-card.mjs` 的 `syncYaml` 函数只替换 `localhost/127.0.0.1` 链接（第 104-109 行），不处理已有的 jsdelivr CDN 链接。发布版 YAML 中已经是 CDN 格式（旧 hash），导致首次同步时链接未更新。

**解决方案：** 手动执行 sed 批量替换：
```bash
sed -i 's|c164fd35...5c70f82|ea0d4f098...fe11a3cda|g' index.yaml
sed -i 's|phase125-sql-defense-depth-6-13|phase126-sql-extractor-enhance-6-14|g' index.yaml
node tavern_sync.mjs bundle 神秘复苏模拟器发布版
```

**最终状态：**

- HEAD: f96da7d
- 版本: 6.14
- CDN_REF: ea0d4f098f77e1854547a951a91b94dfe11a3cda
- CDN_CACHE_VERSION: phase126-sql-extractor-enhance-6-14
- 发布版 PNG 已同步所有 CDN 链接

**待办：** jsdelivr CDN 缓存刷新（自动，5-10 分钟）

---

## 2026-06-09 11:30 CST：方案 4 提取器增强 — 完成

**目标：** 解决新日志（acu-logs-2026-06-09T03-16-20-219Z.json）中完整 SQL 仍被误判为 malformed 的问题，修复单行多语句处理缺陷和挽救逻辑盲区。

**问题：** 方案 2+3 已实施，但新日志显示 5 张核心表（characters、locations、controlled_ghosts、collected_archives、clues）的首次写入全部失败，导致真实数据丢失（非幂等操作失败）。

**根本原因：**
1. 单行多语句处理缺陷：AI 输出的多条 SQL 在同一行时，提取器未精确切分
2. 挽救逻辑盲区：循环条件 `i >= 1` 导致单行场景（`current.length === 1`）时不执行
3. 日志缺失：被跳过的语句没有说明原因

**改动文件：** `vendor/shujuku-sp-fork/index.js`（单文件，3 处改动）

**完成清单：**

- [x] 方案 4.1：修复挽救逻辑盲区（7279 行：`i >= 1` → `i >= 0`）
- [x] 方案 4.3：增强日志输出（7290-7303 行：增加诊断原因输出）
- [x] 方案 4.2：单行多语句切分（7190-7206 行：新增预处理逻辑 + 7536-7571 行：新增 `splitAtFirstSqlTerminator_ACU` 函数）
- [x] 回归验证通过：`node scripts/verify-sql-debug-regressions.mjs`

**具体改动：**

1. **挽救循环条件修复**（一行改动）：
   - 允许对单行内容（`current.length === 1`）进行挽救
   - 解决单行完整 SQL 被误判后无法挽救的问题

2. **诊断日志增强**（14 行新增）：
   - 输出被跳过的具体原因：不以 SQL 关键词开头、字符串未闭合、括号不平衡、VALUES 不完整、缺少分号等
   - 格式：`[SQL 提取] 跳过不完整语句（原因: xxx, yyy）: <前 100 字符>...`

3. **单行多语句预处理**（16 行新增 + 36 行新增函数）：
   - 新增 `splitAtFirstSqlTerminator_ACU` 函数：在第一个分号位置精确切分 SQL 文本
   - 在提取器入口预处理：将单行多语句按分号切分成多行
   - 切分后的多行 SQL 进入原有提取逻辑，避免误判

**当前工作区状态：**

```
 M vendor/shujuku-sp-fork/index.js
 M progress.md
 M .claude/plans/2-3-2-3-robust-lake.md（plan 文件，不提交）
?? acu-logs-2026-06-09T03-16-20-219Z.json（新日志，本地参考）
```

**真页复测结果（2026-06-09 12:10 CST）：**

- 测试环境：VSCode Fn+F5 启动 Chrome 9222 + Chrome DevTools MCP
- 测试场景：初始化对话，触发首次数据库填表
- 填表 API：gemini-3.1-pro-preview（使用当前API配置）
- **数据写入：成功** — 玩家状态、全局状态、人物、灵异事件表均有数据
- **运行日志：** 只显示"数据库增量更新成功"，无 `[SQL 提取] 跳过不完整语句` warn
- **结论：** 首次测试 AI 输出的 SQL 格式正常，未触发单行多语句或过滤场景；方案 4 的诊断日志和切分逻辑未被调用，这是**正常行为**（只在异常时触发）

**待进一步验证：** 需使用与新日志（acu-logs-2026-06-09T03-16-20-219Z.json）相同的 API 配置/模型，或继续多轮对话触发复杂 SQL 场景，才能观察到方案 4 修复效果。当前测试确认代码不影响正常流程。

**下一步：** 根据测试结果判断是否需要继续复测，或直接按发布流程提交（回归验证已通过，真页无异常）。

---

## 2026-06-08 21:30 CST：方案 2+3 SQL 填表加固 — 完成

**目标：** 针对 Gemini 等模型在 SQL 模式下的思维链泄露和语句截断问题，实施 prompt 加固（方案 2）+ 代码侧语法修复（方案 3）。

**改动文件：** `vendor/shujuku-sp-fork/index.js`（单文件）

**完成清单：**

- [x] 方案 2.1：主填表 prompt 增加"禁止事项"+ 负面示例
- [x] 方案 2.2：inline SQL 格式说明强化（"违反即视为无效输出"）
- [x] 方案 2.3：错误反馈模板追加修正指引
- [x] 方案 3.1：新增 `sanitizeSqlStatementSyntax_ACU`（空 SET/空 VALUES 丢弃、尾逗号移除）
- [x] 方案 3.2：集成 sanitizer 到 `applyEdits` 管线
- [x] 方案 3.3：新增 `generateSyntaxAutoFixStrategy_ACU`（沙箱重试支持语法修复）
- [x] 方案 3.4：提取器末尾残片挽救逻辑
- [x] 回归验证通过：`node scripts/verify-sql-debug-regressions.mjs`

**当前工作区状态：**

```
 M vendor/shujuku-sp-fork/index.js
 M task_plan.md
 M findings.md
 M progress.md
?? acu-logs-2026-06-08T*.json（3 份日志，本地参考）
?? planning_archive_2026-06/（归档，本地参考）
 m .claude/worktrees/**（本地 dirty，不提交）
 D *.png（临时截图，已删除）
```

**下一步：** 真页复测验证 `[SQL 语法修复]` / `[自动修复]` 日志行为，确认 error 减少。通过后按发布流程提交。

---

## 2026-06-08 18:10–19:50 CST：planning 记录优化（已完成）

将根目录 planning 从 1000+ 行流水压缩为恢复索引：归档旧记录到 `planning_archive_2026-06/2026-06-08-post-v6-13-before-planning-optimization/`；重写 `task_plan.md`（常驻项目流程 + 版本索引 + 提交边界）、`findings.md`（常驻结论 + 根因大类 + 发布流程）、`progress.md`。按教程补全 VSCode Fn+F5 实时开发链路、发布版同步、CDN 自动更新、角色卡本体更新接口。

---

## 后续追加规范

- 新任务开始时，先记录 `git status --short --branch`、当前版本 marker、SP 运行日志基线。
- 每个阶段只追加高信号结果：目标、改动文件、验证命令、结论、错误与修正。
- 长命令输出和失败尝试细节放归档或专门文件，不塞 `progress.md`。
- 提交前只 staging 根目录 planning 文件；本地归档、截图、日志默认不提交。

---

## 2026-06-09：稳定 + 智能混合填表架构任务清单

**用户目标：** 综合骰子系统 CRUD 直写方案和当前 AI-SQL 填表方案，制作一套兼顾稳定与智能的新方案，并拆成具体任务清单。

**已完成：**

- 读取 `jerryzmtz/my-tavern-scripts` 仓库到临时目录，只读研究。
- 确认骰子系统入口：`src/骰子系统/index.ts` -> `dist/骰子系统/stable.js`。
- 确认骰子系统运行方式：等待 `AutoCardUpdaterAPI`，使用 `getCurrentData/exportTableAsJson` 读表，使用 `updateCell/insertRow/deleteRow` 写表。
- 确认骰子系统没有默认 AI-SQL 填表链路，普通确定性操作绕开 API 限流。
- 将研究结论写入 `findings.md`。
- 在 `task_plan.md` 新增“稳定 + 智能混合填表架构（AI 规划 + CRUD 执行）”完整阶段任务清单。

**本次未做：**

- 未修改业务代码。
- 未运行构建或测试。
- 未提交 git。

**下一步建议：**

从 `task_plan.md` 的阶段 0 开始执行：冻结 git/SP 日志基线，确认当前数据库本体是否完整暴露 CRUD API。

---

## 2026-06-09：追加骰子系统能力吸收计划

**用户目标：** 在已有“AI 规划 + CRUD 执行”混合方案任务清单基础上，继续加入骰子系统可吸收功能。

**已完成：**

- 在 `task_plan.md` 追加阶段 10-14：
  - 阶段 10：神秘复苏公共前端 API
  - 阶段 11：灵异判定系统
  - 阶段 12：资源与奖励系统
  - 阶段 13：判定历史、事件日志与审计
  - 阶段 14：前端体验整合
- 更新优先级建议：新增公共 API、灵异判定、资源奖励、历史审计、体验整合。
- 更新成功标准：要求新能力保持神秘复苏世界观一致，不表现为外置骰子系统。
- 在 `findings.md` 记录可吸收/可改造/不建议照搬的功能边界。

**本次未做：**

- 未修改业务代码。
- 未运行构建或测试。
- 未提交 git。

---

## 2026-06-09：大步一「基础确认与现状盘点」已完成

**用户目标：** 先执行大步一，即阶段 0「基线冻结与接口确认」和阶段 1「现有填表链路盘点」。

**已完成：**

- 重新确认 git 基线：`main...origin/main`，`HEAD == origin/main == cde40b5f308d7ee423bbb014d59be4dd13e09043`。
- 重新确认发布基线：版本 `6.15`，`CDN_REF = c61cae707d06ce8b9dce7bc63d97a26e26a5834f`，`CDN_CACHE_VERSION = phase127-sql-prompt-optimize-6-15`。
- 记录 SP 日志基线规则：只把 `2026-06-09 18:02:58 +08:00` 之后的新运行日志作为后续验证依据，已有 `acu-logs-*.json` 只作历史参考。
- 确认数据库本体已暴露读取、CRUD、刷新和更新通知能力：`exportTableAsJson`、`updateCell`、`insertRow`、`deleteRow`、`refreshDataAndWorldbook`、`_notifyTableUpdate` 等。
- 梳理 SQL/AI 链路：SQL 模式仍会经过 `prepareAIInput_ACU`、`callCustomOpenAI_ACU`、`parseAndApplyTableEdits_ACU`、`SQL_ERROR_FEEDBACK` 等路径，限流主要由 AI 请求与重试放大。
- 梳理神秘复苏前端写入入口：可视化器当前读库经 `exportTableAsJson`，保存仍集中在整表/快照式 `saveDataToDatabase`；状态栏当前主要写 MVU，不是数据库 CRUD。
- 更新 `task_plan.md`：阶段 0、阶段 1 标记完成，并写入阶段结论。
- 更新 `findings.md`：追加「2026-06-09 大步一：基础确认与现状盘点」。

**本次未做：**

- 未修改业务代码。
- 未运行构建或业务测试。
- 未提交 git。

**结论：** 当前主要不是数据库本体问题，也不是前端加载问题；要缓解 SQL 模式 `Too Many Requests`，下一步应做神秘复苏前端适配层和混合写入协议，让确定性操作走 CRUD，让 AI 只输出结构化变更计划，SQL 保留为高级兜底。

---

## 2026-06-09：大步二「协议与前端 CRUD 执行层」已完成基础落点

**用户目标：** 继续大步二，在大步一确认数据库本体已有 CRUD 能力后，开始落地稳定 + 智能混合填表架构的协议与执行层。

**已完成：**

- 新增 `src/神秘复苏模拟器/脚本/数据库前端/table-change-adapter.ts`。
- 定义 `tableChangePlan` 协议：`updateCell`、`insertRow`、`deleteRow`、`noop`。
- 实现无副作用预检：表定位、列定位、行定位、基础 DDL 约束校验和结构化错误返回。
- 实现 CRUD 执行：调用现有 `AutoCardUpdaterAPI.updateCell/insertRow/deleteRow`。
- 实现行定位：`rowIndex`、`row_id`、自然键/多条件 match。
- 实现列 alias：中文表头、DDL 物理列名、DDL 注释 alias。
- 实现串行队列：`applyTableChangePlan` 多次调用时按顺序执行，避免并发写库。
- 扩展 `MysteryDatabaseFrontend`：
  - `getTableChangeSchema()`
  - `getTableMetadata()`
  - `previewTableChangePlan(plan)`
  - `applyTableChangePlan(plan)`
- 更新 `task_plan.md`：阶段 2、3 完成；阶段 4 基础完成，row_id 自动推断保留待办；阶段 5 标记为已有前端落点但未切旧 AI 主链路。
- 更新 `findings.md`：追加大步二协议说明、示例 JSON、负面示例、错误分类和边界。

**验证：**

- `pnpm exec eslint "src/神秘复苏模拟器/脚本/数据库前端/index.ts" "src/神秘复苏模拟器/脚本/数据库前端/table-change-adapter.ts"`：通过。
- `pnpm build`：通过，已生成 `dist/神秘复苏模拟器/脚本/数据库前端/index.js`。
- `pnpm exec tsc --noEmit --pretty false`：未作为通过 gate；仓库存在既有类型错误（`@types/function/worldbook.d.ts`、VueUse Web Bluetooth 类型、变量结构未用导入、界面美化 HostWindow 类型），与本次新增适配层无直接关系。

**本次未做：**

- 未修改数据库本体 `vendor/shujuku-sp-fork/index.js` 的 AI prompt 或 SQL_ERROR_FEEDBACK 链路。
- 未把自动剧情填表默认链路从 AI-SQL 切到 `tableChangePlan`。
- 未迁移 v10.2 可视化器的默认保存路径；当前只是新增可调用 API。
- 未做酒馆真页写库验证。
- 未提交 git。

**结论：** 大步二的“前端协议 + CRUD 执行层”已经具备最小闭环。下一步可以进入确定性入口迁移：先迁移可视化器单元格编辑/新增/删除，或先把 `行动建议` / `<choices>` 镜像接到 `applyTableChangePlan()`。

---

## 2026-06-09：大步二补充验证与收口

**目标：** 在已有 `table-change-adapter.ts` 基础落点上，补一条脚本级回归验证，确认协议层不是只“能编译”，而是真的能完成表/列/行定位、DDL 约束预检和 CRUD API 参数转换。

**已完成：**

- 新增 `scripts/verify-table-change-adapter.mjs`。
- 验证 `listTableMetadata()` 能解析表名、DDL 物理表名和列 metadata。
- 验证 `previewTableChangePlan()` 支持 DDL 物理表名、中文列名、物理列名、`row_id` 行定位。
- 验证本地约束错误能返回结构化错误：`CHECK_IN_VIOLATION`、`LENGTH_VIOLATION`、`MULTIPLE_ROWS_MATCHED`。
- 验证 `applyTableChangePlan()` 会把物理列名转换为中文表头后调用 `AutoCardUpdaterAPI.updateCell/insertRow`。
- 验证多行匹配的危险删除会被阻断，并且不会调用底层 `deleteRow`。

**验证：**

- `node scripts/verify-table-change-adapter.mjs`：通过。
- `pnpm exec eslint "scripts/verify-table-change-adapter.mjs" "src/神秘复苏模拟器/脚本/数据库前端/index.ts" "src/神秘复苏模拟器/脚本/数据库前端/table-change-adapter.ts"`：通过。
- `pnpm build`：通过。
- `git diff --check`：通过。

**注意：**

- 本轮仍未切换旧 AI-SQL 主链路，未修改 `vendor/shujuku-sp-fork/index.js`。
- `pnpm build` 仍会刷新 `dist/神秘复苏模拟器/界面/状态栏/index.html`，这是当前构建副作用，提交前需要精确 staging。

---

## 2026-06-09：大步三「确定性入口迁移」第一批

**目标：** 执行阶段 6，先把 v10.2 数据库可视化器里“已知表、已知行、已知列、已知值”的手动操作接入大步二新增的 CRUD 执行层，减少快照式保存和未来无意义 AI/SQL 链路耦合。

**已完成：**

- 修改 `src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js`。
- 新增可视化器 CRUD 迁移开关：`localStorage.acu_mfrs_visualizer_crud_migration`，值为 `'false'` 时回退旧路径；默认启用。
- 单元格编辑：优先调用 `MysteryDatabaseFrontend.applyTableChangePlan({ action:'updateCell', ... })`。
- 整体编辑：把多列变更合并成 `set`，优先走同一 CRUD 执行层。
- 待删除行提交：全局保存时先把 `pendingDeletes` 转成 `deleteRow` 计划，先 `previewTableChangePlan()` 全量预检，再逐条 `applyTableChangePlan()`。
- 失败回退：CRUD API 缺失、预检失败、约束失败或执行异常时，保留旧 `saveDataToDatabase` 快照保存路径。
- 用户可见反馈：CRUD 失败时 toast 会显示错误码/列名/错误说明，并提示已回退旧路径。
- 重新执行 `pnpm build`，刷新 `dist/神秘复苏模拟器/脚本/数据库前端/index.js`。

**暂未迁移：**

- 右键“插入新行”仍走旧快照路径。原因是当前 UI 行为是“在当前位置后插入空白占位行”，而底层 `insertRow` 更适合追加一条满足 DDL 的完整合法行；直接迁移会改变位置语义，并容易触发 `NOT NULL` 约束。
- 状态按钮、`<choices>` 镜像和 MVU 状态镜像未做，留给阶段 6 后续批次。

**验证：**

- `node --check "src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js"`：通过。
- `node scripts/verify-table-change-adapter.mjs`：通过。
- `pnpm build`：通过。
- `pnpm exec eslint "src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js"`：未作为 gate；该历史 JS 文件存在大量既有内联 CSS / Tailwind 类字符串 lint 问题，本次新增代码未用该结果判定失败。

**下一步：**

- 真页验证：编辑一个单元格、整体编辑一行、标记删除后保存，确认 SP 日志无 SQL/AI 请求新增错误。
- 后续批次优先做 `行动建议` / `<choices>` 镜像，或重设计“新增行”为“弹出表单填写合法完整行后 CRUD insertRow”。

---

## 2026-06-09：大步三「确定性入口迁移」第二批

**目标：** 继续阶段 6，把状态栏解析出的 `<choices>` / A-B-C-D 推演选项镜像到数据库 `行动建议` 表，走确定性 CRUD，不触发 AI-SQL。

**已完成：**

- 修改 `src/神秘复苏模拟器/界面/状态栏/App.vue`。
- 新增状态栏到数据库前端的弱连接：读取顶层 `window.MysteryDatabaseFrontend.applyTableChangePlan()`，API 不存在时跳过，不影响状态栏显示。
- 新增 `localStorage.acu_mfrs_choices_crud_mirror` 开关；值为 `'false'` 时关闭 `行动建议` 镜像，默认启用。
- 将解析出的 A/B/C/D 选项转成 `行动建议` 固定 4 行：row_id 1-4 对应 A-D，写入 `option_key`、`idea_text`、`main_risk`、`expected_gain`、`death_risk_level`、`revival_risk_level`。
- 优先使用 MVU `/行动建议` 的“思路/主要风险/预期收益”，缺失时用 `<choices>` 文本和风险来源兜底；数值风险映射为数据库枚举 `无/低/中/高/致命`。
- 同一组选项只镜像一次；写入失败只 `console.warn`，不弹 toast，不阻塞玩家点击选项。
- 若 `row_id` 目标行缺失，尝试使用合法完整 `insertRow` 补行。
- 扩展 `scripts/verify-table-change-adapter.mjs`，覆盖 `行动建议` 真实 7 列结构、row_id 更新、缺行插入、枚举与长度约束拦截。

**验证：**

- `node scripts/verify-table-change-adapter.mjs`：通过。
- `node --check "src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js"`：通过。
- `pnpm exec eslint "scripts/verify-table-change-adapter.mjs" "src/神秘复苏模拟器/脚本/数据库前端/index.ts" "src/神秘复苏模拟器/脚本/数据库前端/table-change-adapter.ts" "src/神秘复苏模拟器/界面/状态栏/App.vue"`：通过但 `App.vue` 仍有 32 个既有 Vue 属性顺序 warning。
- `git diff --check`：通过。
- `pnpm build`：通过。

**仍未完成：**

- 还没有做酒馆真页写库验收；需要在真实消息中输出 `<choices>` 后查看 `行动建议` 表是否刷新，且 SP 运行日志无新增 SQL/AI 错误。
- 点击选项后的风险值/MVU 状态是否同步入数据库仍未迁移；需要先明确 MVU 是即时主状态、数据库是长期镜像时的主从边界。
- “新增空行”仍留在旧快照路径，待 UI 改成合法完整新增表单后再迁移到 `insertRow`。

---

## 2026-06-09：大步三补充安全门：固定行 row_id 范围校验

**目标：** 为 `行动建议`、`检定建议` 这类固定行表补上本地 row_id 范围预检，避免后续 CRUD 补行或固定行刷新写出越界行。

**已完成：**

- 修改 `src/神秘复苏模拟器/脚本/数据库前端/table-change-adapter.ts`。
- 新增错误码 `CHECK_RANGE_VIOLATION`。
- 解析 DDL 中的数值范围约束：`CHECK(row_id BETWEEN 1 AND 4)` / `CHECK(row_id BETWEEN 1 AND 5)`。
- `insertRow` 显式传入主键列时，也会校验主键范围；不再只校验非主键必填列。
- `getTableMetadata()` 暴露列的 `minValue` / `maxValue`，便于后续 UI 或 AI 计划层参考固定行边界。
- 扩展 `scripts/verify-table-change-adapter.mjs`：验证 `row_id` metadata 范围为 1-4，并验证 `insertRow row_id=5` 被 `CHECK_RANGE_VIOLATION` 拦截。
- 重新执行 `pnpm build`，刷新 `dist/神秘复苏模拟器/脚本/数据库前端/index.js`。

**验证：**

- `node scripts/verify-table-change-adapter.mjs`：通过。
- `pnpm exec eslint "scripts/verify-table-change-adapter.mjs" "src/神秘复苏模拟器/脚本/数据库前端/index.ts" "src/神秘复苏模拟器/脚本/数据库前端/table-change-adapter.ts"`：通过。
- `git diff --check`：通过。
- `pnpm build`：通过。

**边界：**

- 这次只覆盖数值 `BETWEEN` 范围；`CHECK(TRIM(...) <> '')`、`GLOB` 等复杂表达式仍未解析。
- row_id 自动推断仍未实现；当前只是确保显式 row_id 不越界。

## 2026-06-09：大步五「验证、发布与回滚」进行中

**真实页基线：** 通过 `npx agent-browser --cdp 9222` 确认当前页为 `http://127.0.0.1:8000/`，`characterId=2`，`name2=神秘复苏模拟器`，`AutoCardUpdaterAPI` 与 `MysteryDatabaseFrontend` 均存在。页面原 marker 仍是旧的 `mfrs-sql-defense-depth-6-13`。

**最新 dist 注入验证：** 将 `dist/神秘复苏模拟器/脚本/数据库前端/index.js` 以 `data:text/javascript;base64,...` 动态导入真页后，`MysteryDatabaseFrontend.getTableMetadata()` 返回 14 张表，包含 `全局状态`、`玩家状态`、`灵异事件`、`厉鬼档案`、`线索`、`人物`、`地点`、`灵异物品`、`行动建议`、`事件纪要`、`检定建议`、`驾驭厉鬼`、`收录档案`、`收录规律`。

**普通表 CRUD 真页验证：** 在 `人物/characters` 表插入临时行 `CodexCRUD_*`，随后更新 `known_info` 并删除。结果：`insertResult.ok=true`，`updateResult.ok=true`，`deleteResult.ok=true`，`afterDeleteCount=0`，`cleanupFallback=false`。这确认 `insertRow/updateCell/deleteRow` 在真实页均可通过前端适配器完成，底层 CRUD 失败时的 JSON import fallback 生效。

**固定行表验证：** `行动建议/action_suggestions` 当前只有表头。使用物理表名 `action_suggestions` 补齐 row_id 1-4 后，4 次 `insertRow` 全部 `ok=true`；更新 row_id=2 的 `主要风险/预期收益` 成功；预检 row_id=5 返回 `CHECK_RANGE_VIOLATION`，同时选项 `E` 返回 `CHECK_IN_VIOLATION`。测试结束后用 `importTableAsJson` 恢复原始 0 行状态，`afterRestoreEqualsOriginal=true`。

**loader marker 验证：** 发布前发现 `src/神秘复苏模拟器/脚本/数据库/index.ts` 与 `src/神秘复苏模拟器/脚本/数据库前端/index.ts` 仍指向 6.13 vendor。已对齐到当前有效的 6.15 vendor：`c61cae707d06ce8b9dce7bc63d97a26e26a5834f`、`phase127-sql-prompt-optimize-6-15`、`mfrs-sql-prompt-optimize-6-15`。重新注入最新 dist 后，真页 marker 从 `mfrs-sql-defense-depth-6-13` 变为 `mfrs-sql-prompt-optimize-6-15`，14 表仍完整。

**工具现象：** 对真实页进行较重的导出/导入或连续 CRUD 时，`agent-browser --cdp 9222` 偶发 `os error 10060` 读超时；后续只读检查确认页面实际状态已更新且临时测试行已清理。该现象记录为 CDP/工具读取不稳定，不作为业务失败。

**本地 gate：** 已通过 `node scripts/verify-table-change-adapter.mjs`、`node --check "src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js"`、`pnpm exec eslint "scripts/verify-table-change-adapter.mjs" "src/神秘复苏模拟器/脚本/数据库前端/index.ts" "src/神秘复苏模拟器/脚本/数据库前端/table-change-adapter.ts"`、`git diff --check`、`pnpm build`。

**回滚开关：** 可用 `localStorage.acu_mfrs_visualizer_crud_migration = 'false'` 关闭可视化器 CRUD 迁移；可用 `localStorage.acu_mfrs_choices_crud_mirror = 'false'` 关闭 `<choices>` 到 `行动建议` 的 CRUD 镜像。上一稳定远程基线为 `cde40b5 fix: repair v6.15 release cdn links`。

**资源提交：** 已提交并推送 `e5e4cb6 feat: add stable CRUD table change adapter` 到 `origin/main`。该提交包含前端 CRUD 适配器、真页验证脚本、本地构建产物、loader marker 对齐和 planning 记录。

**发布同步：** 已将 `scripts/publish-card.mjs` 更新为 `CDN_REF=d06dabb0b97bdfb7095ace084b8efee80b10210d`、`CDN_CACHE_VERSION=phase128-stable-crud-adapter-6-16`、`releaseVersion=6.16`，并执行 `pnpm run publish-card -- 神秘复苏模拟器发布版`。发布版 `index.yaml` 版本为 `6.16`，6 条资源链接指向新 hash/cache。说明：`e5e4cb6` 推送后 GitHub Actions 自动生成 `[bot] bundle` 提交 `d06dabb`，最终发布卡使用 `d06dabb` 作为 CDN 资源基线。

**发布验证：** 发布版 YAML 不含 `localhost`、`127.0.0.1`、`53bf6168`、`c61cae707`、`phase125`、`phase127`、`6.15`。发布版 PNG 的 `chara` 与 `ccv3` 元数据均为 `version=6.16`，包含新 hash/cache 且无旧 hash/cache。CDN 关键资源 `数据库/index.js`、`数据库前端/index.js`、`状态栏/index.html` 均返回 `200`。

**最终推送：** 已提交并推送 `1e46879 release: publish v6.16 stable CRUD adapter` 到 `origin/main`。截至推送后 fetch，`main...origin/main` 同步；剩余 dirty 项均为本地参考/日志/临时文件，未纳入本轮提交。
