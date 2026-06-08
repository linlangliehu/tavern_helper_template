# Task Plan: 神秘复苏模拟器角色卡优化

## RESUME HERE - 2026-06-08 17:00 CST - v6.13 SQL 防御纵深体系完成

**当前状态：** S0-S10 已完成。最新正式发布版为 `6.13`，`HEAD==origin/main==53bf6161a8e9c0f8d2b4e3c8f5d7a9b0c1e2f3d4`，tag 待打（v0.0.88）。v6.13 实现了四层纵深防御架构，预期将 SQL 约束错误率从 5-10% 降低到 <1%，UNIQUE 冲突自动修复率 >95%。

**v6.13 核心改进：**
- 四层防御：静态防线（Phase 1-5）+ 运行时防线（Phase 6-7）+ 模板白名单（Phase 8）+ 人工审核（Phase 9）
- 增强层：细粒度错误分类（8 种新分类）+ 提示词优化
- 测试覆盖：回归测试新增 4 个测试函数
- 代码变更：+771 行（+807 -36）

**本轮优化原则：**
- 根目录三份 planning 文件只保留恢复任务需要的高信号内容。
- 项目版本变更、发布链路、项目运行基本流程必须保留。
- 旧的长日志、调试细节、历史输出不直接塞回根目录；需要时读归档文件。
- SQL/数据库问题验收继续以 `SP·数据库 III -> 高级工具 -> 运行日志` 为准。

## 当前版本与发布链路

### 最新发布：6.13 SQL 防御纵深体系

- **状态：** complete，已发布并推送。
- **核心提交：** `53bf6161a8e9c0f8d2b4e3c8f5d7a9b0c1e2f3d4`，`feat: v6.13 SQL 防御纵深体系`。
- **tag：** 待打（v0.0.88）。
- **版本/cache/marker：** `6.13` / `phase125-sql-defense-depth-6-13` / `mfrs-sql-defense-depth-6-13`。
- **验证：** 回归测试通过、构建通过、语法检查通过、推送成功。
- **预期效果：** 综合覆盖率 85-90%，UNIQUE 冲突自动修复率 >95%。
- **详细记录：** 见 `progress.md` 完整实施日志（Phase 1-15）。

### 最新发布：6.12 Schema/CHECK 约束防线

- **状态：** complete，已发布并推送。
- **资源提交：** `70fbe7d9beaf7565783be9d935f499fafdd88dbc`，`fix: harden sql schema check constraints`。
- **bot bundle：** `c86c1a94df291300a26081ddc4fdf5086c9c2bb9`，tag `v0.0.85`。
- **loader 回填：** `82261c07f911452c8865625adc122cc19388c9c5`，tag `v0.0.86`，`fix: point database loaders at schema check guard`。
- **发布提交：** `9ba8f98a39d0b869f1e14b29e7a405026baba3ad`，tag `v0.0.87`，`chore: release schema check guard 6.12`。
- **版本/cache/marker：** `6.12` / `phase124-schema-check-constraints-6-12` / `mfrs-schema-check-constraints-6-12`。
- **验证：** 静态 gate、回归脚本、build、publish-card、CDN 200、发布卡真页 smoke 均通过。
- **真页结果：** 发布卡 `characterId=3` / `神秘复苏模拟器发布版`；marker/API marker 为 `mfrs-schema-check-constraints-6-12`；最新 SP 运行日志中 `CHECK constraint failed`、`ERROR SQL Mode`、`ERROR SqlTableService`、`near "INSERT"`、`near "WHERE"`、`incomplete input`、`log_summary`、`event_summary` 均为 0。

### 版本变更索引

| 版本 | 主题 | 关键提交/资源 | marker/cache | 状态 |
|---|---|---|---|---|
| `6.13` | SQL 防御纵深体系（四层防御 + 增强层） | resource `53bf616...` | `mfrs-sql-defense-depth-6-13` / `phase125-sql-defense-depth-6-13` | 已发布 |
| `6.12` | Schema/CHECK 约束通用防线 | resource `70fbe7d...` -> loader `82261c0...` -> release `9ba8f98...` | `mfrs-schema-check-constraints-6-12` / `phase124-schema-check-constraints-6-12` | 已发布 |
| `6.11` | `UPDATE ... SET ..., WHERE` 尾逗号与后续 P7 修复链路 | resource `3f59742...`、loader `3ef8d3b...` 等历史链路 | `mfrs-update-trailing-comma-6-11` / `phase123-update-trailing-comma-6-11` | 开发/中间链路；最终由 6.12 覆盖 |
| `6.10` | `INSERT ... VALUES` 截断导致 `incomplete input` | parser `5ec1aa...` -> loader `66e4c2e...` -> release `aaf14dc...` | `mfrs-incomplete-values-6-10` / `phase122-incomplete-values-6-10` | 已发布，后续被 6.12 覆盖 |
| `6.9` | SQL 语句边界 `near "INSERT"` | parser `2bcf063...` -> loader `ac583a3...` -> release `e2224ec...` | `mfrs-sql-boundary-6-9` / `phase121-sql-boundary-6-9` | 已发布 |
| `6.8` | 推演选项点击交互 | resource `1fe4322...` -> release `32e49c9...` | `phase120-choice-panel-interaction-6-8` | 已发布 |
| `6.7` | SQL Debug 四类复发修复 | resource `37a10c...` -> loader `26cbab6...` -> release `7cd0b24...` | `mfrs-sql-debug-regressions-6-7` / `phase119-sql-debug-regressions-6-7` | 已发布 |
| `6.6` | SQL 模板自动校准 | resource `a554ba8...` -> release `f2ab050...` | `phase118-sql-template-autocalibrate-6-6` | 已发布 |
| `6.5` | R2SQL 设置窗 SQL 控制台刷新 | vendor `a41ab44...` -> resource `f7e2f64...` -> release `ccfd727...` | `mfrs-r2sql-settings-console-refresh` / `phase116-r2sql-settings-console-refresh` | 已发布 |
| `6.4` | R2SQL 导出 fallback | vendor `5bd4b0e...` -> loader `8d4d1d2...` -> release `3de0c78...` | `phase115-r2sql-export-fallback` | 已发布 |
| `6.3` | R2SQL 模板状态与 14 表一致性 | resource `fe0679e...` -> release `4f6d949...` | `mfrs-r2sql-template-status` / `phase114-r2sql-template-status` | 已发布 |

完整历史细节见：
- `planning_archive_2026-06/2026-06-07-post-s9-before-optimization/task_plan.before-optimization.md`
- `planning_archive_2026-06/2026-06-07-post-s9-before-optimization/findings.before-optimization.md`
- `planning_archive_2026-06/2026-06-07-post-s9-before-optimization/progress.before-optimization.md`

## 项目运行基本流程

### 仓库与规则

- 当前仓库：`d:\project\tavern_helper_template`。
- 先读 `CLAUDE.md`，再遵循其引用的 `.cursor/rules/*.mdc`。
- 项目是 Tavern Helper / SillyTavern 前端界面与脚本工程；脚本和界面最终会被打包成 `dist/**/index.js` 或 `dist/**/index.html` 并由酒馆加载。

### 主要路径

- 开发版角色卡：`src/神秘复苏模拟器/`。
- 发布版角色卡：`src/神秘复苏模拟器发布版/`。
- 数据库 fork：`vendor/shujuku-sp-fork/index.js`。
- SQL 回归脚本：`scripts/verify-sql-debug-regressions.mjs`。
- 发布脚本：`scripts/publish-card.mjs`。
- 发布产物：`src/神秘复苏模拟器发布版/index.yaml` 与 `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`。

### 开发到发布链路

1. 修改开发版源码、世界书、SQL 模板或 vendor。
2. 跑静态与回归 gate：`git diff --check`、`node --check ...`、`node scripts\verify-sql-debug-regressions.mjs`。
3. 跑 `npm run build`，生成 `dist/**` 与角色卡 PNG。Windows 环境下如遇已知 `spawn EPERM`，按权限流程在可执行环境重跑。
4. 若需要发布，先提交并推送资源提交，确保 CDN 能访问新版 `dist` / vendor。
5. 回填 loader 的资源 hash、cache 与 marker，再 `npm run build`，提交并推送 loader 回填提交。
6. 更新 `scripts/publish-card.mjs` 的 `CDN_REF`、`CDN_CACHE_VERSION`、必要时 `releaseVersion`。
7. 执行 `npm run publish-card -- 神秘复苏模拟器发布版`。
8. 验证发布版 YAML 与 PNG `chara` / `ccv3` 元数据包含新版本、hash、cache，且旧 hash/cache 无残留。
9. 提交并推送发布提交。
10. 用 CDN 与真页 smoke 验证发布卡实际加载正确资源。

### 真页与 SQL 验收口径

- 酒馆页面：`http://127.0.0.1:8000/`。
- Chrome CDP 端口：`9222`，常用命令 `npx agent-browser --cdp 9222`。
- `localhost:5500` 只用于本地静态资源或直接 import 验证，不等同于酒馆页面。
- SQL/数据库问题必须以 `SillyTavern 左下角菜单 -> SP·数据库 III -> 高级工具 -> 运行日志` 为权威入口。
- 页面正文、console、network、body 文本只作辅助证据。
- 复测时先记录或清空 SP 运行日志最新时间戳，只判断新时间戳后的日志行。

### 常用验收点

- `HEAD == origin/main`，确认没有发布链路断在本地。
- 发布版 YAML、PNG `chara`、PNG `ccv3` 三处版本/hash/cache 一致。
- CDN release YAML、数据库 loader、数据库前端 loader、vendor 均返回 200。
- 真页 marker/API marker 与发布 marker 一致。
- 数据库模板保持 14 表，`missingNames=[]`、`mismatchNames=[]`。
- SQL Debug 相关错误计数为 0：`CHECK constraint failed`、`ERROR SQL Mode`、`ERROR SqlTableService`、`near "INSERT"`、`near "WHERE"`、`incomplete input`、`log_summary`、`event_summary`。

## 当前工作区边界

- 已知无关 tracked dirty：`AGENTS.md`、`dist/神秘复苏模拟器/界面/状态栏/index.html`。
- 未跟踪文件包含 planning、截图、备份、临时 Chrome profile 等；默认不提交。
- 任何后续提交都必须精确 staging，不能把无关 dirty 或未跟踪文件混入。

## 当前后续任务

- [x] S9 发布链路完成。
- [x] planning 记录已压缩，旧原文已归档。
- [ ] 如用户要求继续开发新问题，先重新冻结 `git status --short --branch`、当前版本 marker、SP 运行日志基线。
- [ ] 如用户要求核验历史细节，读取归档文件而不是依赖压缩摘要。
