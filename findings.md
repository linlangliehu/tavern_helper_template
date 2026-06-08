# Findings

## 常驻结论：项目运行与发布

本项目是 Tavern Helper / SillyTavern 的角色卡、脚本、界面与数据库扩展工程。日常开发以 `src/神秘复苏模拟器/` 为开发版入口，以 `src/神秘复苏模拟器发布版/` 为发布版镜像入口。构建产物进入 `dist/**`，发布包由 `scripts/publish-card.mjs` 生成并写入发布版 YAML/PNG 元数据。

发布链路固定为：

1. 修改源码、SQL 模板、vendor 或世界书。
2. 运行静态与回归检查。
3. `npm run build` 生成 dist 与 PNG。
4. 提交并推送资源提交，供 CDN 使用。
5. 回填 loader 的资源 hash、cache、marker，再构建并提交 loader 回填。
6. 更新 `scripts/publish-card.mjs` 的 `CDN_REF`、`CDN_CACHE_VERSION`、`releaseVersion`。
7. 执行 `npm run publish-card -- 神秘复苏模拟器发布版`。
8. 验证 YAML、PNG `chara`、PNG `ccv3` 元数据。
9. 提交并推送发布提交。
10. 验证 CDN 200 与发布卡真页运行态。

## 版本变更保留表

| 版本 | 主题 | 关键证据 | 验证结论 |
|---|---|---|---|
| `6.12` | Schema/CHECK 约束通用防线 | resource `70fbe7d...`、loader `82261c0...`、release `9ba8f98...`、tag `v0.0.87` | 已正式发布；CDN 与发布卡真页 smoke 通过 |
| `6.11` | `UPDATE ... SET ..., WHERE` 尾逗号与中间修复链路 | `mfrs-update-trailing-comma-6-11`、`phase123-update-trailing-comma-6-11` | 中间链路，最终由 6.12 覆盖 |
| `6.10` | `INSERT ... VALUES` 截断导致 `incomplete input` | parser `5ec1aa...`、loader `66e4c2e...`、release `aaf14dc...` | 已发布，历史错误行需按时间戳区分 |
| `6.9` | SQL 边界解析导致 `near "INSERT"` | parser `2bcf063...`、loader `ac583a3...`、release `e2224ec...` | 已发布，确认第二条 SQL 不再被残缺语句吞并 |
| `6.8` | 推演选项点击交互 | resource `1fe4322...`、release `32e49c9...` | 已发布，修复 `.sp-panel-choices` 过早 ready |
| `6.7` | SQL Debug 四类复发修复 | resource `37a10c...`、loader `26cbab6...`、release `7cd0b24...` | 已发布，覆盖风险枚举、旧表名、SQL 残片、Bad Gateway 分类 |
| `6.6` | SQL 模板自动校准 | resource `a554ba8...`、release `f2ab050...` | 已发布，保持 14 表与表头校准 |
| `6.5` | R2SQL 设置窗 SQL 控制台刷新 | vendor `a41ab44...`、resource `f7e2f64...`、release `ccfd727...` | 已发布，同一设置窗 native/sqlite 切换后高级工具页刷新 |
| `6.4` | R2SQL 导出 fallback | vendor `5bd4b0e...`、loader `8d4d1d2...`、release `3de0c78...` | 已发布，修复导出 fallback |
| `6.3` | R2SQL 模板状态与 14 表一致性 | resource `fe0679e...`、release `4f6d949...` | 已发布，模板/导出/面板 14 表一致 |

## 最新发布 6.12 结论

`Schema/CHECK 约束不合规类` 的通用防线已经发布到 `神秘复苏模拟器发布版` `6.12`。最终远端为：

```text
HEAD==origin/main==9ba8f98a39d0b869f1e14b29e7a405026baba3ad
```

关键证据：

- 资源提交 `70fbe7d9beaf7565783be9d935f499fafdd88dbc` 包含 DDL constraint registry、执行前 schema/CHECK 预检、枚举别名归一化、SyncBridge 坏行跳过和回归脚本。
- loader 回填提交 `82261c07f911452c8865625adc122cc19388c9c5` 指向资源提交，marker/cache 为 `mfrs-schema-check-constraints-6-12` / `phase124-schema-check-constraints-6-12`。
- 发布提交 `9ba8f98a39d0b869f1e14b29e7a405026baba3ad` 生成发布版 `6.12`。
- CDN release YAML、数据库 loader、数据库前端 loader、vendor 均返回 200。
- 发布版 YAML 与 PNG `chara`/`ccv3` 均含 `6.12`、`82261c07...`、`phase124-schema-check-constraints-6-12`，旧 `6.10` / `66e4c2e4...` / `phase122-incomplete-values-6-10` 不存在。
- 发布卡真页 `characterId=3` / `神秘复苏模拟器发布版` 的 marker/API marker 为 `mfrs-schema-check-constraints-6-12`。
- `SP·数据库 III -> 高级工具 -> 运行日志` 最新发布 smoke 行中关键错误计数均为 0。

## SQL/数据库根因大类

当前 SQL Debug 类问题已经收敛为几类可复用防线，不应再按单字段救火：

### `Schema/CHECK 约束不合规类`

代表样本：

- `supernatural_events.handling_status='爆发中'`，违反枚举 `未处理/调查中/对抗中/已压制/已关押/失控扩散/结束`。
- `action_suggestions.revival_risk_level='极低'`，违反风险等级枚举。
- `chronicle.chronicle_text='SP0001'` 或正文过短，违反长度 CHECK。

根治方式：

- 从两份 SQL 模板 DDL 自动解析 constraint registry。
- 执行前统一预检 `INSERT`、`REPLACE`、`UPDATE` 的显式静态值。
- 对可确定的自然语言枚举别名做集中归一化。
- 无法判断或明显错位的字段值在进入 SQLite 前拦截。
- SyncBridge seed 写入前逐行校验，坏行跳过并记录可读 warn。
- dashboard / 运行日志统一归类为 `SQL schema/CHECK 约束不合规或已处理`。

### SQL 语句边界与截断类

代表样本：

- 残缺 `INSERT INTO chronicle (...) VALUES` 吞并下一条 `INSERT OR REPLACE INTO check_suggestions`，导致 `near "INSERT"`。
- `INSERT OR REPLACE INTO check_suggestions (...) VALUES` 以裸 `VALUES` 结尾，导致 `incomplete input`。
- `INSERT ... ON CONFLICT(name) DO UPDATE SET` 没有 assignment，导致 `incomplete input`。

根治方式：

- `<tableEdit>` 提取后只保留 SQL 语句候选。
- split/filter 双层处理残缺 final statement。
- 遇到残缺语句后跟新的 SQL 起始 token 时重启边界，保留后续完整 SQL。
- 回归脚本固定覆盖 `near "INSERT"`、裸 `VALUES`、截断 UPSERT。

### 旧表名/未知表列类

代表样本：

- `log_summary`、`simulation_summary`、`summary_logs`、`event_summary` 被模型当作事件纪要表。
- 未知列或旧列名被写入当前 14 表。

根治方式：

- 从当前模板 DDL 建表/列白名单。
- AI SQL 进入 SQLite 前校验目标表与显式列名。
- 旧表名给出专门修正提示：事件纪要只允许 `chronicle`。
- dashboard 分类为旧表名或 schema 问题，而不是原始 SQLite 错误。

### API 网关类

代表样本：

- `{"error":{"message":"Bad Gateway"}}` 被误判为响应格式错误或 SQL 问题。

根治方式：

- `parseNonStreamResponse_ACU()` 识别 `data.error`。
- `Bad Gateway` 归入 API 上游网关错误，不混入 SQL 分类。

## 权威验证口径

- 酒馆页面：`http://127.0.0.1:8000/`。
- CDP 端口：`9222`。
- 真页验证命令：`npx agent-browser --cdp 9222`。
- SQL/数据库错误权威入口：`SP·数据库 III -> 高级工具 -> 运行日志`。
- 判断是否复发时，只看清空后或记录基线时间戳后的新日志行。
- 旧日志中可能残留历史错误，例如 `19:08 global_state has no column named game_time`；不能把历史残留算作新版本失败。

## 归档索引

压缩前完整 planning 原文位于：

- `planning_archive_2026-06/2026-06-07-post-s9-before-optimization/task_plan.before-optimization.md`
- `planning_archive_2026-06/2026-06-07-post-s9-before-optimization/findings.before-optimization.md`
- `planning_archive_2026-06/2026-06-07-post-s9-before-optimization/progress.before-optimization.md`

更早的 2026-06-02 压缩归档位于 `planning_archive_2026-06/*.before-compress.md`。
