# 神秘复苏模拟器 8.13.22

**日期**：2026-07-14

**主题**：BF6 正则/清洗残余 + 发布链加固

## 范围

- **RM1/RM2/RM9**：裸 choices / JSONPatch 中文正文边界、摘要关键词高亮、数据库召回截断边界。
- **RM7/RH3**：清理 draft / pacing_rules / 修改确认 / 独立 JSONPatch；导入旧档补洗并保留 raw 协议快照。
- **RM8/RH4/RH5**：sp/mfrs 白名单同步守卫；Name/Status/Location 仅在闭合 `<sp_status>` 内中文化。
- **P0–P3**：dist freshness 只读模式、publish-card 后置 PNG 硬门禁、pin/HEAD 软警告、schema `$ref` 解引用。

## 发布元数据

| 项 | 值 |
|----|-----|
| 版本 | **8.13.22** |
| CDN_REF | `158dcc29107fe17db1a89b8ca6e92585c2acbe8b` |
| production dist | `158dcc29107f` |
| cache | `v81322_20260714_01` |
| 正则 / 脚本约束 | 33 / 8（名称、id、顺序、启用状态保持） |

## 发布步骤

- [x] BF6 功能与 RH5 范围修复已恢复并进入 `main`。
- [x] 最终候选 production dist commit 已推送并在 `origin/main` 可达；该提交为纯 dist 更新，`bundle.yaml` 忽略 `dist/**`，不会再触发 `[bot] bundle`。
- [x] 发布常量与开发版 YAML 已切换到 8.13.22 ref/cache。
- [x] 运行 verification 代理的独立门禁与发布前检查。
- [x] 运行 `pnpm publish-card 神秘复苏模拟器发布版`，由开发源镜像发布版 YAML 并生成 PNG。
- [x] 验证 release PNG、提交发布文件、推送并打 `v8.13.22` 标签。
- [x] 发布提交 `e568cce`、bot bundle `6f336f3`（仅 dist module-id）、tag `v8.13.22` → `e568cce`。

## 验证清单

- [x] 元数据静态检查：开发版 ref 7 次、cache 8 次、版本 8.13.22；正则 33、脚本 8，结构无漂移。
- [x] 旧 pin 下 freshness 预检按预期失败；其余既有 gates 已通过（发布 PNG 仍为旧版时不重复声明最终通过）。
- [x] `pnpm verify:mfrs-dist-freshness`。
- [x] `pnpm verify:mfrs-gates`。
- [x] `node scripts/verify-mfrs-release-png.mjs --json`。
- [x] 发布 PNG：version=8.13.22、refs=7、cache=8、regex=33、scripts=8、chara/ccv3 一致。

## 分阶段精确暂存白名单

不得使用 `git add -A` / `git add .`。暂存必须严格按以下阶段逐路径执行。

### 当前元数据阶段精确暂存白名单（8 条）

- `scripts/mfrs-release-constants.mjs`
- `src/神秘复苏模拟器/index.yaml`
- `README.md`
- `docs/mfrs-redesign-phase0/AUDIT_BUGFIX_BACKLOG.md`
- `docs/mfrs-redesign-phase0/RELEASE_8.13.22.md`
- `task_plan.md`
- `findings.md`
- `progress.md`

### 执行 publish-card 后允许新增的发布产物（3 条）

- `src/神秘复苏模拟器发布版/index.yaml`
- `src/神秘复苏模拟器发布版/神秘复苏模拟器.png`
- `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`

上述 3 条发布产物不得混入当前元数据阶段的 8 条白名单。最终发布提交时可按阶段合并精确暂存，但每次执行 `git diff --cached --name-status` 时，输出必须只出现当阶段明确列出的路径；出现其他路径立即取消提交并清空错误暂存。

发布前已对 `publish-card` 的五个镜像目录做静态逐文件比对，差异为 0；因此 `src/神秘复苏模拟器发布版/第一条消息/**`、`系统提示词/**`、`对话示例/**`、`世界书/**`、`数据库/**` 不在本轮白名单，不得暂存。

## 明确排除的 preexisting dirty

- `bd75694` 对应的 37 个用户文件必须保持原路径/blob 37/37，不得暂存；其中包括 `.tmp-research/**`、用户素材/截图，以及下列单独点名路径。
- `docs/mfrs-redesign-phase0/EXECUTION_PLAN_2026-07-14.md`。
- `docs/mfrs-redesign-phase0/baseline-screenshots/**`。
- `docs/mfrs-redesign-phase0/README.md` 的 preexisting dirty；本轮不得新增变化或暂存。
- 发布版以外的 preexisting dirty、发布前已有的开发/production `dist/**` 均不属于本轮 release 提交。

## 回滚与保护

- 发布 PNG 禁止手改；只允许 `publish-card` 生成。
- 发布版 `index.yaml` 在 publish 前保持旧 CDN 内容，避免半发布状态；最终由开发版镜像。
- 若最终门禁失败，在提交前恢复整个 `src/神秘复苏模拟器发布版` 到上一已发布的 8.13.21 状态，包括镜像目录、`index.yaml`、头像与两张 PNG；不回滚 BF6 源码。
- 不把 H2、M5/M7–M10、DM1–6/DM9、DL*、SM* 等后续 backlog 提前并入本发布。
