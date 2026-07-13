# 进度日志

## 会话：2026-07-13（BF0 · 变量与行动建议真源）— **in_progress → 代码已落**

### 阶段 BF0 — 源码已改（待 commit / 发版）

**改动：**
- C1+L7+M6：`initvar.yaml` 四键升根；姓名/开局地点 `''`；补 `剧情阶段`/scene flags/`is_dead`/`可见档案`/主线 `权限层级` 等
- C2：`schema.ts` 扩 ActionSuggestion 风险枚举、Judgement 触发项/资源代价/后续建议、Reasoning 确认等级；`pnpm dump` → `schema.json`
- H1+D1+M11：变量更新/输出格式/事件MVU/主线阶段/必须输出推演选项/系统提示 — 存活恰 4 条、死亡清空与写集统一、`模拟结束` 入值域
- H3：系统提示骨架对齐 delta + 在场人物 + 扩展字段
- hotfix seed：`DEFAULT_ACTION_JUDGEMENT` 同步扩展字段

**未做：** commit/push；publish 8.13.15；C1.3 打包卡；C2.4 可见摘要；H10 死代码路径

**下一步：** 用户确认后 commit；或直接 BF0.5/BF1

## 会话：2026-07-13（BF-1 · C7 重发版 + G1 门禁）— **complete**

### 阶段 BF-1 — **complete**

**交付：**
- 隔离 worktree `D:\project\tavern_helper_template-bf1` / 分支 `codex/bf1-recovery`
- 基线：`origin/main@e068087`（含 bot Bump deps；此前 f692384 已有 always-unlock 的 bot bundle dist）
- `d5cd98f`：production dist（状态栏 html 重建）+ G1 `verify-mfrs-dist-freshness.mjs` + publish-card 前置 + package.json script
- `de29b4a`：CDN_REF→`d5cd98f`、cache `…-v81314-c7-dist-rebuild`、版本 **8.13.14**、publish PNG + RELEASE
- 验收：G1 通过；`verify-mfrs-release-png` version=8.13.14 refs=7 cache=8 regex=33 scripts=8
- hotfix dist 含 `generation_ended_always`（28777ad 无此标记）

**主目录：**
- 未碰 `node_modules` / 未停 watch
- 规划/backlog 已勾 C7/G1；A2 审计文档等本地 dirty 未随发版提交
- **已合 main：** `origin/main` FF → `de29b4a`（2026-07-13）；用户自行重导 8.13.14 PNG

**下一步：** BF0（C1 initvar 升根）

## 会话：2026-07-13（A2 全量再审计差分）

### 阶段 A2 — **complete**

**操作：**
1. 7 条独立盲审轨并行（Explore 子代理，禁读既有清单）：脚本 SA×16 / MVU MV×18 / 正则 RX×15 / SQL DB×25 / 世界书 WB×18 / 开局 ST×16 / 漂移门禁 DR×7 = 115 项
2. 主会话独立复核关键论断：schema/initvar 对账（36 根键）、dist@28777ad 能力探针、发布版 URL 解码、恐怖程度 75 处计数、`<<START>` 字节验证、RX-05 掷骰击杀链
3. 与 backlog 逐条差分：已覆盖 ~70 / **新增 32 / 误报修正 4 / 升级扩容 10**
4. 入库：backlog「三轮 A2」区（C7、H10、RH6、SH6、M11、RM3–9、WM4–8、DM7–9、DL4–6、L5–9、SL2–3、G1–G5 门禁）+ 对既有条目 20 处就地修正
5. 更新 task_plan（A2 complete、新 BF-1/BF0.5 阶段、BF 表重排）、findings（A2 差分区）

**关键结论：**
- **C7（Critical 新增）**：8.13.13 发布 pin `28777ad` 无 dist rebuild → always-unlock 修复未交付用户。BF-1 最优先
- **H10（决策）**：App.vue 状态栏发布链孤儿，MVU→DB 核心镜像零 owner → 决定 BF3 一半条目的修复对象
- **误报**：C5（stub 未被加载）关闭；C4 降 Medium；W1 休眠标注；"#31 勿重开"立场撤销（RM5 复核）
- **工作区注意**：dist hotfix 当前是 dev-mode 构建（eval+sourcemap），发布前必须 production rebuild，勿直接提交

**创建/修改：**
- `docs/mfrs-redesign-phase0/AUDIT_BUGFIX_BACKLOG.md`（三轮 A2 区 + 就地修正 + BF 表 A2 修订版）
- `task_plan.md`、`findings.md`、`progress.md`（本文件）
- `.tmp-research/a2-diff-workbench.md`（差分工作台，临时）

**未改：** 业务源码（A2 仍是审计阶段，无代码 fix）

### 下一步：BF-1（C7 重发版）→ BF0

## 会话：2026-07-12（审计 + 清单 + 文件规划交接）

### 背景续接（本会话前已存在）
- 路径 β HUD 已发 8.12.x–8.13.x
- **8.13.11** seed 行动建议路径
- **8.13.12** P2 双保险
- **8.13.13** 生成结束始终解锁发送（`28777ad` + release `5767796`）
- 用户侧：发送「能看见点不动」已用 always-unlock 缓解

### 阶段 A：审计与清单 — **complete**

**操作：**
1. 说明 UI 归属（脚本+界面/状态栏，非世界书）
2. 一轮审计：脚本 / MVU / EJS / 系统提示词 → Critical/High/Medium/Low
3. 二轮审计：正则 33 / SQL 14 / 开局欢迎 / 世界书规则与锚点
4. 写入并整理 `docs/mfrs-redesign-phase0/AUDIT_BUGFIX_BACKLOG.md`
5. README 挂链；planning-with-files 三文件就位

**创建/修改的文件：**
- `docs/mfrs-redesign-phase0/AUDIT_BUGFIX_BACKLOG.md`（新建/扩充）
- `docs/mfrs-redesign-phase0/README.md`（索引）
- `task_plan.md`（本交接计划）
- `findings.md`（审计摘要）
- `progress.md`（本日志）

**未改：** 业务源码修复、publish（审计阶段无代码 fix）

### 阶段 B / BF0 — **pending**
- 下一会话从 **C1 initvar 升根** 开始

## 测试结果

| 测试 | 输入 | 预期 | 实际 | 状态 |
|------|------|------|------|------|
| 8.13.13 release-png | expect 8.13.13 / 28777ad | pass | pass（发版时） | 已过 |
| 二轮审计回归用例 | — | — | 未跑修复后回归 | 待 BF5 |
| initvar 根路径 | 新开局 | 根上有行动建议 | 源仍嵌套（C1 未修） | 待修 |
| 英文正文 + 正则 | 英文 corridor 叙事 | 保留 | 审计认为 R1 会误删 | 待修 |

## 错误日志

| 时间 | 错误 | 尝试 | 方案 |
|------|------|------|------|
| 历史 | 发送 mutex 卡 | CDP+hotfix | 8.13.13 always unlock；H5 仍可优化 |
| 历史 | 行动建议空 | seed | 8.13.11；C1 根因未修 |
| 本会话 | 无修复失败 | — | 仅审计 |

## 工作树备忘（交接时）

- 分支：`main`（behind origin 1：f692384 [bot] bundle — **开工先 pull**）
- 未提交相关：`AUDIT_BUGFIX_BACKLOG.md`、`task_plan.md`、`findings.md`、`progress.md`、`README.md` 等
- 杂项 untracked（勿当缺陷源）：`.tmp-research/`、截图、`5.10号途尽更新/` 等
- ~~可能有 dist hotfix 本地修改：提交前核对是否应进 BF 修复~~ **已核实（DR-04）**：工作区 dist 是 src 的 dev-mode rebuild（eval+sourcemap），非手改；**发布前先 `pnpm build` production，勿把 dev 构建提交**

## 五问重启检查

| 问题 | 答案 |
|------|------|
| 我在哪里？ | BF-1 完成（8.13.14）；BF0 未开 |
| 我要去哪里？ | BF0→BF0.5→BF1–BF5 |
| 目标是什么？ | 按 backlog 修功能路径 bug 并回归发版 |
| 我学到了什么？ | findings.md + AUDIT_BUGFIX_BACKLOG.md |
| 我做了什么？ | 两轮+A2 审计 + BF-1 重发 + 本三文件 |

## 新会话最小步骤

1. 确认 `codex/bf1-recovery` 是否已合 main；`git pull`（如 behind）
2. 读 `task_plan.md` → `findings.md` → `progress.md` → `AUDIT_BUGFIX_BACKLOG.md`
3. BF0：`initvar.yaml` C1+L7 → `schema.ts` C2 → M6 → H1/D1 → H3 → M11
4. 每完成一组：勾 backlog + 更新本 progress + task_plan 阶段状态
5. 勿重跑全量审计，除非用户要求
6. 注意：规划文件多在**主目录本地 dirty**；发版代码在 `codex/bf1-recovery`

---
*每个 BF 阶段完成或遇错时更新*
