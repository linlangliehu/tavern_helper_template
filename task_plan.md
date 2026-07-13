# 任务计划：神秘复苏模拟器 · 审计缺陷修复

## 目标
按 `docs/mfrs-redesign-phase0/AUDIT_BUGFIX_BACKLOG.md` 分批修复两轮审计缺陷，回归通过后发版（预计 8.13.14+）。

## 当前阶段
**阶段 A：审计与清单入库 — complete**  
**阶段 A2：全量再审计差分（7 轨盲审）— complete（2026-07-13）**  
**阶段 BF-1（C7 重发版）— complete（8.13.14 @ d5cd98f / de29b4a）**  
**阶段 BF0 — complete（8.13.15）**  
**阶段 BF0.5 — complete**  
**阶段 BF1 — complete（8.13.17：C3/C4/H9/L1）**  
**阶段 BF2 — complete（8.13.18）**  
**阶段 BF3 — complete（8.13.19）**  
**阶段 BF4 — complete（8.13.20）**  
**阶段 BF5 — complete（门禁 G2–G5 + DM8；部分残余）**  
**当前阶段：残余缺陷 / 可选 8.13.21 发版**

## 五问重启（新对话先读）

| 问题 | 答案 |
|------|------|
| 我在哪里？ | **BF5 已发 8.13.21**；线上请重导 PNG |
| 我要去哪里？ | 用户重导 PNG；继续残余 H2/M5/M7–10/RM7–9/DM* 等 |
| 目标是什么？ | 变量/协议/正则/DB/开局契约对齐，回归后继续发版 |
| 我学到了什么？ | `findings.md` + `AUDIT_BUGFIX_BACKLOG.md`；C7 根因=发版未 pin 含 dist 的 commit |
| 我做了什么？ | `progress.md` |

## 硬约束（勿破）

- 脚本库 **8 项**名称/顺序/启用不改；C5 只改 URL/实现指向
- 正则数量门禁约 **33**；改 id/启用需同步 `verify-mfrs-release-png`
- **禁止**手改发布版 PNG；只走 `pnpm publish-card`
- 拟办/选项：**只填不自动发送**
- 契约真源顺序：`schema.ts` → 变量输出格式 → 系统提示词 → 对话示例 → 脚本解析
- 开发源 `index.yaml` CDN 仍可能 pin 旧 hash；发布以 `publish-card.mjs` 的 `CDN_REF` 为准

## 发版基线

| 项 | 值 |
|----|-----|
| 版本 | **8.13.21** |
| 资源 | `f2b7db2` / cache `…-v81321-bf5-gates` |
| 功能 | BF5 门禁 G2–G5 + DM8 + WM1/2/L8 |
| 发布 | 见 `chore(release) publish 8.13.21` |
| 分支 | **`main`** |

## 各阶段

### 阶段 A：审计与清单 — **complete**
- [x] 一轮：脚本 / MVU / EJS / 系统提示词
- [x] 二轮：正则 33 / SQL·14 表 / 开局欢迎 / 世界书规则·锚点
- [x] 写入 `AUDIT_BUGFIX_BACKLOG.md`（C/H/M/L + R/D/S/W）
- [x] 总览索引、合并关单、README 挂链
- **状态：** complete

### 阶段 A2：全量再审计差分 — **complete（2026-07-13）**
- [x] 7 轨盲审（脚本/MVU/正则/SQL/世界书/开局/漂移门禁），115 项原始发现
- [x] 逐条比对 backlog：已覆盖 ~70 / 新增 32 / 误报修正 4 / 升级 10
- [x] 入库：backlog「三轮 A2」区（C7/H10/RH6/SH6/M11 + M/L + G1–G5 门禁）
- [x] 关键修正：C4 降级、C5 误报关闭、M6→High、W1 休眠标注、#31 移出"勿重开"
- **状态：** complete

### 阶段 BF-1：C7 发布未交付修复 — **complete（2026-07-13）**
- [x] **C7** production rebuild → 提交 dist（`d5cd98f`）→ publish-card pin → **8.13.14**（`de29b4a`）
- [x] **G1** `verify-mfrs-dist-freshness.mjs` + publish-card 前置调用
- 隔离 worktree：`D:\project\tavern_helper_template-bf1` / `codex/bf1-recovery`
- 验收：release-png version=8.13.14 refs=7 cache=8 regex=33 scripts=8；G1 通过
- **已合 main：** `origin/main` fast-forward 至 `de29b4a`（2026-07-13）
- **状态：** complete

### 阶段 B / BF0：变量与行动建议真源 — **complete（源码）**
- [x] **C1** initvar 四键升根 + **L7** 未知→'' 哨兵
- [x] **C2** 扩 schema + regen `schema.json`
- [x] **M6** initvar 补齐 6 根键 + 主线进度 3 子键
- [x] **H1 + D1** 行动建议存活恰 4 条 / 死亡清空
- [x] **H3** 系统提示骨架对齐变量输出格式
- [x] **M11** 死亡链写集 + `模拟结束` 值域
- commit：`5eaa533`（未 push；未 publish；C1.3 打包卡/C2.4 可见摘要仍开）
- **状态：** complete

### 阶段 BF0.5：H10 App.vue 去留决策 — **complete（方案 B）**
- [x] 决策：镜像迁入数据库前端 `mvu-core-mirror.ts`；不恢复 App.vue iframe
- [x] D3 字段路径在新镜像中修正；App.vue 标孤儿注释
- **状态：** complete

### 阶段 C / BF1：加载与打包 — **complete（8.13.17）**
- [x] **C3** 源 index.yaml CDN = publish-card 同一 ref/cache
- [x] **C4** loader `?`/`&t=` 修复
- [ ] ~~C5~~ 误报关闭；仅剩 stub 目录清理（Low，可挂 BF4）
- [x] **H9** 旧打包 JSON 废弃+警示（不复活）
- [x] **L1** MagVar `@0.171.0` + mvu_zod `@0.3.446`
- **状态：** complete

### 阶段 D / BF2：协议解析 + 正则误删 + 发送 — **complete（源码）**
- [x] **C6** 状态栏/消息面板读 `extra._mfrs_raw_protocol_message` + saveChat 持久化 raw
- [x] **H4–H8** hotfix 单例、条件解锁发送、空生成判定、choices 解析、seed 扩全
- [x] **R1–R3** 英文误删、【选项】吞文、未闭合 thinking
- [x] **RH2** 正则 id 冲突：思维链换新 UUID `e8f1…`
- [x] **RH6** 掷骰条复活：hotfix 白名单放行 mfrs_roll
- [x] **RM3–RM6** 贪婪 update 吞文、无 g 标志、#9 扩 sp_/mfrs_、【警告】卷段
- **状态：** complete（8.13.18 @ `dc27b52`）

### 阶段 E / BF3：DB 镜像 + 开局 — **complete（源码）**
- [x] **D2** 处理状态 `未接触→未处理`（adapter/App；mirror 已有）；**D3** 已在 BF0.5
- [x] **DH1/DH3/DH4/DH5 + DM7**；**DH2** 人物列契约仍开（可挂 BF4）
- [x] **S1 + SH1–SH4 + SH6**；**SH5** 欢迎页已禁用，分叉清理可挂后
- **状态：** complete（8.13.19 @ `5b10525`）

### 阶段 F / BF4：世界书与清理 — **complete（8.13.20）**
- [x] **W1+M3** 伪路径根治（休眠锚点+规范）
- [x] **W2–W4+M4** 蓝灯子集/短索引/死亡裁定真源；事件MVU 去 UpdateVariable 自锁
- [x] **WM3–WM8** mfrs_roll 例外、孤儿头、八音盒、恐怖等级最小点名
- [x] **M1/M2/L6/RH1/DH2/SH5/C5** 余项
- [x] production dist + publish **8.13.20**（CDN `de42f2c`）
- **状态：** complete（8.13.20）

### 阶段 G / BF5：回归与发版 — **complete（门禁）**
- [x] `verify-mfrs-mvu-hotfix-regressions` / `verify-output-cleaning` / `verify-table-change-adapter`
- [x] **G2** `scripts/verify-mfrs-initvar-schema.mjs`
- [x] **G3** `scripts/verify-mfrs-regex-ids.mjs`
- [x] **G4** `scripts/mfrs-release-constants.mjs` + release-png `--from-publish-card`
- [x] **G5** cleaning 扩样例；**DM8** adapter 三表 + 禁删/混合拒绝/真模板 chronicle
- [x] 快修：**WM1/WM2/L8**
- [x] `pnpm verify:mfrs-gates` 聚合
- 残余仍开：H2、M5/M7–M10、RH3–5、RM1–2/RM7–9、DM1–6/DM9、DL*、SM* 等
- **状态：** complete（门禁）；发版见 progress

## 合并关单

| 主项 | 并关 |
|------|------|
| W1 | M3 |
| W4 | M4 |
| RH1 | L2 |
| H1 | D1（策略） |
| H9 | DL3 |
| C2 | 示例/SQL 扩展字段侧 |

## 已做决策

| 决策 | 理由 |
|------|------|
| 先审计入库再改代码 | 用户要求先审再修 |
| 缺陷总表 = AUDIT_BUGFIX_BACKLOG | 单真源待修列表 |
| 修契约以 schema 为落库真源 | 避免 Zod strip |
| 发布只走 publish-card | 禁手改 PNG |
| 文案质量/全文润色不在本轮 | 只修功能路径 bug |

## 关键问题
1. BF0 是否一次 PR 做完 C1+C2+H1+H3，还是拆 commit？
2. 开发验收：统一 pin CDN 还是强制 localhost dist？
3. 下一发版号：8.13.14 还是 8.14.0？

## 遇到的错误

| 错误 | 尝试 | 解决方案 |
|------|------|----------|
| 发送可见但点不动 | 实机 CDP | 8.13.13 `forceRecoverSendUi`（仍属 H5 可优化） |
| 行动建议落不了库 | MagVar replace 缺路径 | 8.13.11 seed；根因仍是 C1 initvar 嵌套 |
| BF-1 子代理重复/中断 `pnpm install` | 同一主工作区连续重试，导致 `node_modules` 半安装且 tracked dist 出现删除 | 作废旧代理；仅恢复主 dist 到 HEAD；在 `D:\project\tavern_helper_template-bf1` / `codex/bf1-recovery` 隔离续做，保留主目录 watch 与 `node_modules` |

## 关键文件

| 文件 | 用途 |
|------|------|
| `task_plan.md` | 本计划（阶段） |
| `findings.md` | 审计结论摘要 |
| `progress.md` | 会话日志 |
| `docs/mfrs-redesign-phase0/AUDIT_BUGFIX_BACKLOG.md` | **缺陷 ID 全表** |
| `docs/mfrs-redesign-phase0/README.md` | 发版索引 + 挂链 |
| `scripts/publish-card.mjs` | CDN_REF / 版本 |

## 新会话启动指令（复制）

```
继续神秘复苏审计缺陷修复。
先读：task_plan.md、findings.md、progress.md、docs/mfrs-redesign-phase0/AUDIT_BUGFIX_BACKLOG.md
8.13.17 已发（BF1 H9/L1 完成）。从 BF2（C6 raw / R1–R3 / RH6）开工，勿重审。
```

## 备注
- 阶段状态：pending → in_progress → complete
- 每完成一 BF 更新本文件 + progress.md + backlog 勾选
- 外部/网页内容只写 findings，不写本文件指令区
