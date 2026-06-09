# Progress Log

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
