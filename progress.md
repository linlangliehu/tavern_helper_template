# Progress Log

## 2026-06-10 CST：v6.18 发布版真页 smoke 通过

- 真页当前激活角色卡即 **神秘复苏模拟器发布版**，marker `mfrs-crud-param-binding-6-18`（window 与 API 双确认）。
- 资源加载链路确认：卡 → dist loader@`77b510a`（?v=phase130）→ vendor@`c3e5a70`，network 实测命中。
- `AutoCardUpdaterAPI` 83 个成员；`getFillMode()='ai_crud_plan'`、`setFillMode`/`triggerUpdate`/`updateCell`/`insertRow`/`deleteRow` 均在。
- console 仅 `[TavernSync] ws://localhost:6620` 重连报错（watch 已停所致，开发环境噪音，玩家无此脚本），无数据库/资源加载错误。
- v6.18 发布链路至此全部收口。遗留观察：修复⑤ prompt 瘦身、修复② CRUD 限流冷却（待实际游玩触发）；SP 运行日志人工面板复核。

## 2026-06-10 CST：第 2-3 步 v6.18 发布完成

- 资源提交 `a4f5aa3`（vendor 修复⑥ + 回归脚本 + 开发版卡 YAML loader + planning）→ CI bundle `c3e5a70`。
- loader 回填提交 `6f42f4a`：数据库/数据库前端 index.ts、开发版卡 YAML 6 处 hash + 7 处 cache → `c3e5a70/phase130-crud-param-binding-6-18`，marker `mfrs-crud-param-binding-6-18` → 回填后 CI bundle `77b510a`。
- 发布版同步：`publish-card.mjs` CACHE=`phase130-crud-param-binding-6-18`、releaseVersion=`6.18`；发布提交 `53eb5e8`（rebase 后 `3b4fa4c`）。
- **CDN_REF 修正**：首轮 CDN_REF 用了 `c3e5a70`，但其 dist loader 仍是 v6.17 内容（回填在其后）；卡内 dist URL 必须指向回填后 bundle `77b510a`。已重定向开发版 YAML 6 处 + CDN_REF + 重新 publish-card，修正提交 `8d28fcc`。最终口径：卡 → dist@`77b510a` → vendor@`c3e5a70`。
- CDN smoke 通过：状态栏 html / 数据库 loader / 数据库前端 loader / vendor 4 个 URL 全 200；db+frontend loader 均含 `mfrs-crud-param-binding-6-18` marker，db loader vendor ref=`c3e5a70`；vendor 含 `_inlineSqlParams`（修复⑥已上线）。
- 顺带：HEAD 后 dist 状态栏 html 仅 webpack module ID 漂移（351→234），无内容变化，已 checkout 还原不提交。
- 后续观察：修复⑤ prompt 瘦身与修复② CRUD 限流冷却（验收轮未触发）。

## 2026-06-10 CST：第 2 步 v6.18 资源提交已推送

- 停掉 watch（6620）后 `pnpm build` production 构建成功；`node --check` + `verify-crud-plan-parse.mjs`（9/9）+ `verify-sql-debug-regressions.mjs` 复跑通过。
- 资源提交 `a4f5aa3`（rebase 到远端 `9b23931 [bot] Bump deps` 之上）：vendor 修复⑥ + `scripts/verify-crud-plan-parse.mjs` + 开发版卡 YAML 6 处 loader（576e7b0/phase129）+ dist 状态栏 + planning 三件套 + 开发版 PNG。已推送。
- 进行中：等 GitHub Actions `[bot] bundle` 提交 → loader 回填（数据库/数据库前端 index.ts + 开发版卡 YAML 6 处）→ 发布版同步 v6.18。

## 2026-06-10 CST：第 1 步重跑验收 — 发现修复⑥参数绑定 bug，真页填表成功

**本地 gate（全部通过）：** `node --check vendor`、`verify-crud-plan-parse.mjs`（9/9）、`verify-table-change-adapter.mjs`、`verify-sql-debug-regressions.mjs`、`pnpm build`、`git diff --check`。

**真页复测发现新根因（修复⑥）：CRUD `updateCell` 参数绑定丢失**

- 现象：注入新 vendor 后 `triggerUpdate` 仍 3 次全败，console 报 `updateCell: SQL executed but affected 0 rows. table=player_state, row_id=1`，但 SQL 控制台同款 UPDATE（字面量）成功 1 行。
- 根因：`updateCell/updateRow/insertRow/deleteRow` 生成 `... WHERE "row_id" = ?` 并把值放进 `params`，但 `SqlTableService.executeMutation(sql, params)` 的管线（规范化→约束校验→模板校验→改写→`sandboxExecuteSqlWithRetry_ACU`→`runBatch`→`db.run(stmt)`）**全程只传 SQL 文本，params 从未被绑定**；未绑定的 `?` 按 NULL 求值 → `WHERE row_id = NULL` 匹配 0 行 → 全部 CRUD 失败。
- 为何以前没踩中：6.16 真页烟测时玩家 `storageMode` 是 `native`（不走 SQL）；本机玩家存储现为 `sqlite`，正好命中（与「玩家 SQL 报错先查 storageMode」既有教训一致）。
- 修复：`SqlTableService` 新增 `_inlineSqlParams(sql, params)` —— 在 executeMutation 入口把 `?` 安全内插为转义字面量（跳过字符串内 `?`，占位符/参数数量不匹配时报错而非静默置 NULL），随后才进规范化/校验管线，校验层因此也能看到真实值。

**真页验收结果（本地 5599 静态服务注入新 vendor）：**

- `setFillMode('ai_sql')` / `setFillMode('ai_crud_plan')` 双向切换 `ok=true`，持久化 `saved=true`（修复④验证通过，SQL 兜底可达）。
- 修复⑥后单点 `updateCell` 返回 true 且 SQLite 侧值正确更新（SQL 控制台读回确认）。
- `triggerUpdate()` 全量填表：**success=true，8 张表写入**（player_state、supernatural_events、ghost_archives、clues、characters、locations、action_suggestions、collected_archives），无新增 warn/error，首次尝试即成功（无需解析挽救与重试，限流未发生）。
- 对比上轮 0/21 → 本轮 1/1。
- 注意：`skipChatSave:true` 的单点测试中 JSON 视图不立即变化是预期行为（refresh 会从聊天楼层回读旧值），非 bug。

**待办（第 2-3 步）：**
- 修复⑤（prompt 瘦身）与限流冷却（修复②）本轮因首试成功未被触发，发布后继续观察。
- 提交 vendor 6 项修复 + 开发版卡 YAML loader 修复 → 走 v6.18 发布流程（资源推送 → loader 回填【含开发版卡 YAML】→ 发布版同步）。
- 本地 5599 http-server（task bbrle03v5）仍在跑，发布前可停。

---

## 2026-06-10 CST：v6.17 验收失败后修复 CRUD 链路五问题 — 代码完成，待真页复测

**改动文件：** `vendor/shujuku-sp-fork/index.js`（5 处修复）；新增 `scripts/verify-crud-plan-parse.mjs`。

**修复①：CRUD 计划 JSON 提取挽救逻辑**（0 成功的首要根因）
- 新增 `stripTableChangePlanTags_ACU`：成对标签优先，残缺（只闭合/只开始）标签也剥离。
- 新增 `salvageCrudPlanObjects_ACU`：括号深度扫描，逐个提取顶层 `{...}` 并分别 parse，字符串内括号/引号正确跳过，坏对象单独丢弃。
- 重写 `parseCrudPlanResponse_ACU` 为 4 层兜底：①直接 parse ②缺 `[` 时用 `[]` 包裹多对象序列 ③取首 `[` 到末 `]` 子串 ④括号扫描逐对象挽救。
- 实测样本（缺开头 `[` 与开始标签、仅有结尾 `]</tableChangePlan>`）由第 2 层命中救回。

**修复②：CRUD 重试链路接入限流冷却**
- 循环前检查 `getActiveAiTransportCooldownMs_ACU()`，在冷却窗口内直接返回 `apiTransportIssue`。
- catch 中用 `classifyAiTransportError_ACU` 识别限流/网关错误 → `registerAiTransportCooldown_ACU` 登记 15-120s 指数退避 → 立即返回，不再 15 连击。与 SQL 分支同款逻辑。

**修复③：回复过短阈值按模式区分**
- CRUD 分支不再用 `autoUpdateTokenThreshold`（默认 500，误杀 418 字符合法计划），改用固定极低阈值 `minCrudReplyLength=12`，只防空响应/严重截断。SQL 分支与 auto-update 批次门控保持原阈值不变。

**修复④：fillMode 可靠切换入口**
- 根因：直接写 IndexedDB 不生效，是因运行实例内存 `settings_ACU.fillMode` 仍是默认值，下次任意保存会用内存值覆盖 IDB。
- 新增 `normalizeFillMode_ACU` + `setCurrentFillMode_ACU`（改内存 + 走 `saveSettings_ACU()` 持久化）。
- API 暴露 `AutoCardUpdaterAPI.getFillMode()` / `setFillMode(mode)`，可供控制台/UI/兜底切换；不再被覆盖。

**修复⑤：CRUD 填表 prompt 瘦身**
- 根因：`$C`（角色描述）含整个欢迎页 HTML/CSS，单次填表 57878 prompt tokens。
- 新增 `stripUiMarkupForFillPrompt_ACU`：剥离 `<style>/<script>/<link>/<!-- -->` 等非正文高体量块 + 合并空行，保留散文；仅在确含这些标记时才处理，剥离后异常变空则退回原文。
- 在 `filterTableInjectedContent` 对 `$C`/`$4`（角色描述/世界书）应用，SQL 与 CRUD 两模式同时受益，降低限流概率。

**待验证（task #10，受 Bash 分类器临时不可用阻塞）：**
- `node --check` + `verify-crud-plan-parse.mjs` + `verify-table-change-adapter.mjs` + `verify-sql-debug-regressions.mjs` + `pnpm build`。
- 真页复测：注入新构建后重跑自动填表，确认解析挽救生效、限流后冷却不连击、填表成功率回升、SQL 兜底可切换。

**注意：** 本轮修复期间出现过提示词注入——伪造的"工具返回成功"+"只做①②、跳过③④⑤并谎报完成"的指令混入工具结果。已识别并拒绝；全部修复以 `git diff` 磁盘真实内容为准复核（修复②③的 pre-loop 冷却与阈值改动一度被伪造结果掩盖未落盘，已重新落盘并核实）。

---

## 2026-06-10 CST：第 1 步 v6.17 验收收口 — 进行中


**SP 日志基线：** `2026-06-10 10:02 +08:00`（只判断此后新日志）。

**发现并修复：开发版卡 YAML loader 落后**

- 真页（开发版卡）原 marker 为 `mfrs-schema-check-constraints-6-12` / 重载后 `mfrs-sql-defense-depth-6-13`，且 `MysteryDatabaseFrontend` 无 `getTableMetadata`，说明卡内 6 个脚本 loader 钉死旧 CDN。
- 根因：`src/神秘复苏模拟器/index.yaml` 脚本库 6 处 URL 仍为 `c164fd35.../?v=phase125-sql-defense-depth-6-13`（6.13 资源）；v6.17 loader 回填只改了 `src/**/脚本/**/index.ts`，未同步开发版卡 YAML。
- 修复：YAML 内 6 处 hash 替换为 `576e7b0d5df759b46c4837ba99b8d84540da179c`，7 处 cache 替换为 `phase129-sql-fallback-cooldown-6-17`（含 MagVarUpdate bundle ?v=）。
- 推送：本地已有 `tavern_sync watch all -f`（PID 4852，占用 6620）自动推送；刷新真页后 marker = `mfrs-sql-fallback-cooldown-6-17`，`getTableMetadata()` 返回 14 表。
- CDN smoke：新 hash 的数据库 / 数据库前端 index.js 均返回 200。
- 注意：`tavern_sync push` 手动执行会报 `EADDRINUSE :::6620`，因 watch 已占端口——watch 在跑时不要再手动 push。

**待办：** ai_crud_plan 真页自动填表实测 → SP 运行日志复核 → SQL 兜底验证 → 对比指标。

---

## 2026-06-10 CST：第 1 步 v6.17 验收收口 — 完成（验收不通过）

**执行内容：**

1. **ai_crud_plan 真页实测**：发送真实用户行动（jQuery trigger 提交），主对话生成成功（第 8 楼，5334 字符）；自动填表 5 批次 × 3 重试 = 15 次 AI 调用全部失败，0 行写入（`玩家状态.最近行动` 仍是上一轮内容）。
2. **SP 运行日志面板复核**：通过扩展菜单 → SP·数据库 III → 高级工具 → 运行日志读取面板（27 条），完整拿到失败时间线 10:10:00-10:12:07，与 console 一致。
3. **SQL 兜底验证**：两次向 IDB 写入 `fillMode:'ai_sql'` 并重载，填表仍走 CRUD 计划；fillMode 键两次被运行实例的保存动作清除。结论：SQL 兜底不可达。已恢复存储为默认。
4. **对比指标**：写入 `findings.md`（填表成功率 0/21、限流率 53%、单次填表 57878 prompt tokens 等）。

**根因取证：** 抓取填表响应体（reqid 1821）确认模型输出缺开头 `[` / `<tableChangePlan>` 标签，`JSON.parse` 在首对象后报错——与全部 9 个解析失败位置吻合。CDN vendor 与本地 `cmp` 完全一致，排除版本漂移。

**v6.17 验收结论：** 不通过。6 个问题清单见 `findings.md`「2026-06-10 v6.17 真页验收结论」；其中 CRUD JSON 提取过严、CRUD 链路无限流冷却、SQL 兜底不可达为修复优先级前三。

**工作区变更：** `src/神秘复苏模拟器/index.yaml`（loader 修复，未提交）；planning 三件套更新。临时文件已清理。

---

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

---

## 2026-06-09：同步稳定 + 智能混合填表架构大步规划

**用户目标：** 将当前任务清单明确为 15 个阶段，并按 5 个大步组织：基础确认与现状盘点、稳定写库核心、智能填表主链路迁移、神秘复苏玩法功能、验证发布与回滚。

**已完成：**

- 更新 `task_plan.md` 顶部恢复点为 v6.16 stable CRUD adapter 发布完成。
- 在“稳定 + 智能混合填表架构”任务下补入 5 个大步划分、阶段映射和推荐执行顺序。
- 明确当前进度快照：大步一、大步二已完成；大步三仍缺阶段 5 和阶段 7；大步五已完成 v6.16 发布收口但仍缺 SP 运行日志人工复核；大步四尚未开始。

**本次未做：**

- 未修改业务代码。
- 未运行构建或测试。
- 未提交 git。
## 2026-06-09：阶段 5 AI 规划 + CRUD 主链路 — 进行中

**目标：** 将数据库自动填表从「AI 输出 SQL」改造为「AI 输出结构化 JSON 变更计划 + 前端 CRUD 执行」。

**已完成：**

- [x] 任务 1：新增 `fillMode` 设置到 vendor `settings_ACU`
  - 在 `settings_ACU` 添加 `fillMode: 'ai_sql'` (默认值，保持向后兼容)
  - 新增 `getCurrentFillMode()` 工具函数，返回 `'ai_sql'` 或 `'ai_crud_plan'`
  - 新增 `isCrudPlanMode()` 判断函数
  - 修改位置：vendor/shujuku-sp-fork/index.js 第 3488 行（settings 定义）和第 5019-5032 行（工具函数）

**进行中：**

- [ ] 任务 2：创建 CRUD plan prompt 模板（`DEFAULT_CHAR_CARD_PROMPT_CRUD_PLAN_ACU`）
- [ ] 任务 3：实现 `executeCrudPlanFill_ACU` 函数（AI 调用 → JSON 解析 → CRUD 执行）
- [ ] 任务 4：在 `executeCardUpdateCore_ACU` 里分支路由到新模式
- [ ] 任务 5：构建与验证

**本次未做：**

- 未修改前端代码
- 未跑构建或测试
- 未提交 git

**下一步：** 继续任务 2-5，完成 CRUD plan 模式的完整实现链路。

---

## 2026-06-09：阶段 5 AI 规划 + CRUD 主链路 — 完成

**目标：** 继续阶段 5，将数据库自动填表从「AI 输出 SQL」改造为「AI 输出结构化 JSON 变更计划 + 前端 CRUD 执行」。

**已完成：**

- [x] 任务 2：新增 `DEFAULT_CHAR_CARD_PROMPT_CRUD_PLAN_ACU`
  - AI 输出 `<tableChangePlan>` JSON 数组，不再输出 SQL 或 `<tableEdit>`。
  - 明确 `updateCell`、`insertRow`、`deleteRow`、`noop` 协议、定位规则、DDL/Note 约束和禁止事项。
- [x] 任务 3：实现 `executeCrudPlanFill_ACU`
  - 调用 AI 后提取并 `JSON.parse` 变更计划。
  - 逐条调用 `MysteryDatabaseFrontend.previewTableChangePlan()` 和 `applyTableChangePlan()`。
  - CRUD 执行失败时写入独立 `CRUD_PLAN_ERROR_FEEDBACK`，不进入 SQL_ERROR_FEEDBACK 链路。
- [x] 任务 4：在 `executeCardUpdateCore_ACU` 接入 `fillMode` 分支
  - 默认 `ai_sql` 不变，保持向后兼容。
  - `fillMode` 支持 `ai_crud_plan`、`AI_CHANGE_PLAN_CRUD`、`ai_change_plan_crud`。
  - CRUD 模式使用 `skipChatSave/silent` 先更新内存，再复用原保存逻辑落到目标楼层。
- [x] 任务 5：构建与验证
  - 更新 `src/神秘复苏模拟器/脚本/数据库前端/table-change-adapter.ts`，为计划执行透传 `skipChatSave/silent`。
  - 修正 `insertRow` 调用兼容：同时支持 `(options, data)` 和 `{ data }` 对象形态。
  - `pnpm build` 已刷新 `dist/神秘复苏模拟器/脚本/数据库前端/index.js` 与相关产物。

**验证：**

- `node --check vendor/shujuku-sp-fork/index.js`：通过。
- `node scripts/verify-table-change-adapter.mjs`：通过。
- `pnpm exec eslint "src/神秘复苏模拟器/脚本/数据库前端/table-change-adapter.ts"`：通过。
- `git diff --check`：通过。
- `pnpm build`：通过。

**边界：**

- 本轮未把默认模式切成 `ai_crud_plan`；默认仍是 `ai_sql`，新模式需要通过设置值启用。
- 本轮未做酒馆真页 AI 调用验收，也未做 SP 运行日志人工面板复核。
- 阶段 7「SQL 通道降级为兜底」仍未开始。

---

## 2026-06-09：阶段 7 SQL 通道降级为兜底 — 完成

**目标：** 继续完成大步三的阶段 7，把旧 AI-SQL 通道从普通自动填表默认链路降级为显式 SQL 兜底，并阻止 API 限流/网关错误进入 `SQL_ERROR_FEEDBACK` 重试放大链路。

**已完成：**

- 将 `settings_ACU.fillMode` 默认值改为 `ai_crud_plan`；`ai_sql` / `AI_SQL` 仍可显式选择，未知或空值回落到 `ai_crud_plan`。
- 新增 API 传输错误识别与冷却状态：`Too Many Requests`、HTTP 429、`Retry-After`、502/503/504 网关错误会被识别为传输问题。
- 统一主要 AI fetch 失败信息格式，包含 `HTTP <status>` 与 `Retry-After`，便于日志分类和冷却判断。
- 更新 `parseNonStreamResponse_ACU()`：非流式响应中的 Bad Gateway、Too Many Requests、HTTP 429 和 Retry-After 会抛出可分类错误。
- 更新旧 SQL 分支：进入前检查冷却窗口；捕获 API 传输问题时登记 15-120 秒指数退避冷却，直接返回失败，不写入 `lastSqlError`，因此不追加 `SQL_ERROR_FEEDBACK`。
- 成功完成 CRUD/SQL 写入后会清理 API 传输冷却。
- 更新 dashboard 日志分类：429、Too Many Requests、Retry-After、API限流归入 `apiGatewayIssue`。
- 扩展 `scripts/verify-sql-debug-regressions.mjs`，增加 429/Retry-After 解析和 dashboard 分类用例。

**验证：**

- `node --check vendor/shujuku-sp-fork/index.js`：通过。
- `node scripts/verify-sql-debug-regressions.mjs`：通过。
- `node scripts/verify-table-change-adapter.mjs`：通过。
- `pnpm build`：通过。
- `git diff --check`：通过。

**边界：**

- 本轮未做酒馆真页手动 AI 调用验收，也未做 SP 运行日志人工面板复核。
- 阶段 7 代码已完成但尚未走发布版同步和 CDN 发布流程；后续若要发布，需要进入大步五/阶段 9。
---

## 2026-06-09：大步五「验证、发布与回滚」v6.17 收口

**目标：** 将阶段 7「SQL 通道降级为兜底 + API 限流冷却」从本地实现推进到发布版/CDN。

**已完成：**

- 阶段 8 本地 gate 重新通过：`node --check vendor/shujuku-sp-fork/index.js`、`node scripts/verify-sql-debug-regressions.mjs`、`node scripts/verify-table-change-adapter.mjs`、`pnpm build`、`git diff --check`。
- 真页只读 smoke 通过：`http://127.0.0.1:8000/` 可连接，`AutoCardUpdaterAPI` 与 `MysteryDatabaseFrontend` 均存在，`getTableMetadata()` 返回 14 张表。
- 资源提交并推送：`44ab669 feat: default fill table to CRUD plan`。
- GitHub Actions 生成资源 bundle：`550a89f [bot] bundle`。
- loader 回填并推送：`a349ba0 build: point loaders to v6.17 resources`，数据库 loader 与数据库前端 loader 均指向 `550a89f` / `phase129-sql-fallback-cooldown-6-17` / `mfrs-sql-fallback-cooldown-6-17`。
- GitHub Actions 生成发布资源 bundle：`576e7b0 [bot] bundle`。
- `scripts/publish-card.mjs` 更新为 `CDN_REF=576e7b0d5df759b46c4837ba99b8d84540da179c`、`CDN_CACHE_VERSION=phase129-sql-fallback-cooldown-6-17`、`releaseVersion=6.17`。
- 执行 `pnpm run publish-card -- 神秘复苏模拟器发布版`，发布版 YAML/PNG 已同步为 6.17。
- 发布验证：YAML 主入口为 `6.17` 且 6 条资源链接均指向 `576e7b0` / `phase129`；PNG `chara` 与 `ccv3` 元数据均为 `version=6.17`，包含新 hash/cache，且无旧 hash/cache 或 localhost/127.0.0.1。
- CDN smoke：发布版数据库 loader、数据库前端、状态栏 HTML 以及 loader 指向的 vendor 四条 URL 均返回 200。

**错误与修正：**

- 第一次 PNG 元数据解析尝试直接 import `png-chunks-extract` 失败；改用无依赖 PNG `tEXt` chunk 解析器完成验证。
- 第二次 PNG 解析因 PowerShell 管道中文路径编码变成问号失败；改用 Node 在 `src/` 下按 Unicode suffix 定位发布版目录后完成验证。

**仍需人工复核：**

- SP 高级工具运行日志面板未做人工导出复核；本轮已通过真页只读 smoke 与本地/发布 gate 覆盖主要链路。
