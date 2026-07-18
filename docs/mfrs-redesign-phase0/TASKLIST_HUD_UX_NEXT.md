# HUD 交互三项调整任务清单

**状态**：T0–T5 complete；**T6 可执行（MFRS 流程）**；T7 待 T6 通过且用户授权后执行  
**进度**：**28 / 48** complete（T0–T5）；待执行 **20**（T6.0.x×4 + T6.1–T6.7×7 + T7.1–T7.9×9）

**对应计划**：`PLAN_HUD_UX_NEXT.md`  
**功能 worktree**：`D:\project\tavern_helper_template\.claude\worktrees\feat-hud-gacha-mode-toggle`  
**功能分支**：`worktree-feat-hud-gacha-mode-toggle`  
**发布基线**：8.13.36；实施基线 `origin/main@75f4a9a`；功能提交链 `75f4a9a..5dacd2e`（+ 后续流程/门禁提交）  
**开发流程真源**：仓库根 `PROJECT_FLOW.md`（统一运行口径 / 四条链路）

---

## 与新开发流程的关系（必读）

| 问题 | 答案 |
|------|------|
| 业务目标要不要因 MFRS 重做？ | **不要**。T1–T5 功能契约不变。 |
| 验收方式要不要改？ | **要**。T6 必须走 MFRS + DEV 卡，禁止只用旧 Fn+F5 + 正式 CDN 卡。 |
| 在哪份代码上验？ | **feature worktree**（含 T1–T5）。主仓 `main` 已合入流程工具，**不等于**已合入全部 HUD 功能。 |
| 正式 YAML / 发布卡？ | 日常 T6 **不用**改正式 `index.yaml`；用 `pnpm mfrs:dev-card` 派生 DEV 卡。 |

### T6 标准启动（每次真页验收前）

1. VS Code **打开 feature worktree 根目录**（不要只开主仓却期望 feature dist）。
2. 该目录已有 `node_modules`（没有则 `pnpm install`）。
3. 键盘 **F5 / Fn+F5**（或任务 `MFRS: 开始实时开发`）→ 预检 → `551x` → watch → 调试 Chrome `9222`。
4. 另开终端：`pnpm mfrs:dev-card -- --port <实际端口>`（默认 `5510`；可选 `--push`）。
5. 酒馆加载 **`神秘复苏模拟器 · DEV · <branch>`**（不要用正式/发布版卡验未发布 feature）。
6. `pnpm verify:mfrs-runtime-identity` 通过（7 入口 `development` + 当前 HEAD commit）。
7. 再执行 T6.1–T6.7。
8. 结束：`MFRS: 结束实时开发`（或任务等价操作）；**不关主 Chrome**。

### 身份不变量（T6 失败时先查这个）

```text
源码 worktree == watch cwd == dist 所属 == 静态 root(551x) == Network loader 来源
```

任一项不一致：**停止点击验收**，修环境，不自动 kill 用户其它 watch。

---

## 执行规则

- 按 **T0 → T7** 顺序；T0–T5 已完成，当前从 **T6.0** 继续。
- 业务实现与 T6 验收以 **feature worktree** 为准。
- 不主动 kill 用户已有主仓 watch；端口冲突时用预检报告 + `MFRS_SKIP_HMR_SERVER=1` 等可选 env，不自动接管。
- 不永久改写正式 `src/神秘复苏模拟器/index.yaml` / 正式 `tavern_sync.yaml` 配置。
- 发布 PNG 只允许 `pnpm publish-card`；禁止手改发布版 PNG。
- 每次提交精确白名单，禁止 `git add .` / `git add -A`；规划/流程提交带 `[skip ci]`。
- **T7 禁止**在 watch 仍占用生产构建环境时边 watch 边 `pnpm build`（先停本会话 MFRS watch）。
- 重置/导入等破坏性抽卡动作：T6 只验入口，不执行。

---

## T0：规划入库与实施工作树 — **complete**

- [x] **T0.1 规划文件自检**
- [x] **T0.2 规划提交**（`75f4a9a` 等）
- [x] **T0.3 新建 worktree** `feat-hud-gacha-mode-toggle`
- [x] **T0.4 基线门禁** frontend + archive-ui PASS

## T1：完整抽卡面板单源挂载 API — **complete**

主文件：`src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js`

- [x] **T1.1** 提取单一 renderer（overlay/embedded 共用）
- [x] **T1.2** 保留 `MFRS.showPanel()` 无参兼容
- [x] **T1.3** 新增 `MFRS.mountPanel(container, { onClose })` → `{ root, destroy }`
- [x] **T1.4** 内嵌布局适配（无 fixed/90vh 主面板）
- [x] **T1.5** 二级弹层兼容
- [x] **T1.6** frontend 门禁扩展 PASS

## T2：右侧抽卡键直达中栏完整系统 — **complete**

主文件：`src/神秘复苏模拟器/脚本/消息内面板/index.ts`

- [x] **T2.1** gacha slot 仅完整宿主 + API 未就绪态
- [x] **T2.2** `hudGachaPanelHandle` + `mountPanel`
- [x] **T2.3** 全生命周期 `destroy()`
- [x] **T2.4** 普通 refresh 不反复重挂
- [x] **T2.5** 删除简版残留 marker

## T3：左栏精简与模式切换 — **complete**

- [x] **T3.1** 删除左栏「打开全库 · 玩家状态」
- [x] **T3.2** 默认模式「沉浸模式」入口
- [x] **T3.3** 复用 `toggleHudImmersive` / 唯一 `hudImmersivePreferred`
- [x] **T3.4** 沉浸顶栏「默认模式」
- [x] **T3.5** 焦点与响应式

## T4：自动化契约更新 — **complete**

- [x] **T4.1** archive-ui H7–H11 → 完整面板契约
- [x] **T4.2** 左栏精简门禁
- [x] **T4.3** 模式切换门禁 I1–I5
- [x] **T4.4** frontend + archive-ui PASS
- [x] **T4.5** `pnpm verify:mfrs-gates` PASS

## T5：源码提交检查点 — **complete**

- [x] **T5.1** 代码审查
- [x] **T5.2** 静态检查
- [x] **T5.3** 精确源码提交并推送功能分支（`75f4a9a..5dacd2e` 等）

---

## T6：真页验收（MFRS 流程）— **当前阶段**

> **不再 blocked。** 旧「Fn+F5 + CDN/5500」假绿路径已废弃。  
> 必须在 **feature worktree** 用 **F5=MFRS + DEV 卡 + 551x** 验收。  
> 主仓仅有流程工具时，**不能**代替 feature 功能验收。

### T6.0 环境与身份门禁（新增，T6.1 前置）

- [ ] **T6.0.1 打开正确目录**  
  - VS Code workspace = feature worktree 根。  
  - 完成条件：`git rev-parse --show-toplevel` 指向 feat worktree；分支为 `worktree-feat-hud-gacha-mode-toggle`（或其后继）。
- [ ] **T6.0.2 启动 MFRS 实时开发**  
  - 键盘 **F5 / Fn+F5** 或任务 `MFRS: 开始实时开发`。  
  - 完成条件：`http://127.0.0.1:<port>/__mfrs_dev_identity` 的 workspace/branch/commit 与当前 worktree 一致；watch 在编译本 worktree。
- [ ] **T6.0.3 派生并加载 DEV 卡**  
  - `pnpm mfrs:dev-card -- --port <port>`（可选 `--push`）。  
  - 酒馆加载 `神秘复苏模拟器 · DEV · <branch>`。  
  - 完成条件：Network 中 7 个项目脚本 URL 为 `http://127.0.0.1:<port>/dist/...`；MagVar 仍可为 CDN；正式 `index.yaml` 无 localhost 污染。
- [ ] **T6.0.4 运行时身份**  
  - `pnpm verify:mfrs-runtime-identity`。  
  - 完成条件：7 入口均在；`mode=development`；`commit` 等于当前 worktree HEAD；失败则禁止进入 T6.1。

### T6.1–T6.7 功能验收

- [ ] **T6.1 桌面完整面板**  
  - 一次点击「抽卡」显示「神秘复苏抽卡系统」全部主区块。  
  - body **不**出现完整抽卡主 overlay（二级弹层除外）。  
  - 宿主：`[data-mfrs-hud-gacha-host]` 可见且有内容（非永久「API 未就绪」死态；若短暂未就绪，重试后应成功）。
- [ ] **T6.2 抽卡功能**  
  - 卡池切换、单抽、十连、结果详情、历史、残屑商店、自定义入口。  
  - **安全**：重置/导入只确认入口存在，**不执行**破坏性操作。
- [ ] **T6.3 生命周期**  
  - 抽卡 ↔ 正文/记忆/系统反复切换；关闭与 Esc；无重复扣费/重复 DOM/重复监听。
- [ ] **T6.4 左栏回归**  
  - 「打开全库 · 玩家状态」**不存在**。  
  - 现场摘要、资源、调查档案、玩家状态展示、系统全库入口正常。
- [ ] **T6.5 模式循环**  
  - 默认 → 沉浸 → 默认 → 沉浸至少 3 轮。  
  - 验证 `#chat`、`#send_form`、body class（如 `mfrs-hud-immersive`）、焦点与滚动恢复。
- [ ] **T6.6 移动端 390px**  
  - 完整面板与模式按钮无溢出/遮挡/错位；抽屉仍可关闭。  
  - 可用调试 Chrome device toolbar 或等价方式。
- [ ] **T6.7 清洁度**  
  - 控制台无本轮新增 error。  
  - 切卡 / hot reload（或脚本重载）后无孤儿 HUD / 抽卡 DOM。  
  - 可选：`MFRS: 结束实时开发` 后锁文件清除、551x 释放（不关主 Chrome）。

### T6 完成条件

- T6.0 与 T6.1–T6.7 全部勾选。  
- 在 `task_plan.md` / `progress.md` 记录：端口、DEV 卡名、identity commit、主要证据（可文字，截图可选）。  
- **不**自动进入 T7。

---

## T7：production、发布与交付 — **blocked until T6 + 用户授权**

> 发布链与日常 MFRS 链分离。T7 使用 **production + CDN + publish-card**，不用 DEV 卡发版。

- [ ] **T7.1 停止本会话 watch**  
  - `MFRS: 结束实时开发` 或确认 feature watch 已停；禁止边 watch 边 production build。
- [ ] **T7.2 production build**  
  - 在约定目录 `pnpm build`；只出现本轮合理 dist。
- [ ] **T7.3 G1 与聚合复验**  
  - dist freshness、frontend、archive-ui、`pnpm verify:mfrs-gates` 全部 PASS。
- [ ] **T7.4 production dist 提交推送**  
  - 精确暂存；使候选 CDN_REF 远端可达（或按仓库现行 bot bundle 策略执行）。
- [ ] **T7.5 重新决定版本号**  
  - 查询远端最新 tag；**不得**预设 `8.13.37` 一定可用。
- [ ] **T7.6 发布角色卡**  
  - 更新版本/ref/cache；`pnpm publish-card`；生成发布版 YAML/PNG。
- [ ] **T7.7 发布验收**  
  - 33 regex、8 scripts、PNG chara/ccv3、7 个 CDN URL 与字节哈希。
- [ ] **T7.8 提交/推送/tag**  
  - 精确发布提交进 main；核对 bot bundle/tag 形态。
- [ ] **T7.9 用户交付**  
  - 告知版本、PNG 路径、CDN_REF、提交/tag；用户导入**发布版** PNG；按需恢复 MFRS 开发会话。

---

## 完成统计

| 阶段 | 项数 | 状态 |
|------|------|------|
| T0 | 4 | complete |
| T1 | 6 | complete |
| T2 | 5 | complete |
| T3 | 5 | complete |
| T4 | 5 | complete |
| T5 | 3 | complete |
| T6 | 4 + 7 = **11** | **pending（可执行）** |
| T7 | 9 | blocked until T6 + 授权 |
| **合计** | **48 勾选项 / 文档统计以本表为准** | 已完成 **28** 功能历史项；待执行 **T6 11 + T7 9** |

> 说明：相对旧清单 44 项，T6 增加 **T6.0.1–T6.0.4** 环境门禁（+4），总待执行从「仅 T6.1–T7.9」变为含 MFRS 前置。

### 当前下一步（唯一推荐）

1. 打开 feature worktree  
2. 执行 **T6.0.1 → T6.0.4**  
3. 执行 **T6.1 → T6.7**  
4. 全部通过后，等用户明确说「可以发版」再进 T7  

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-17 | 初版 T0–T7 规划与实施 |
| 2026-07-18 | T0–T5 complete；T6 曾因 CDN/旧流程 blocked |
| 2026-07-18 | PROJECT-FLOW-FIX 完成；MFRS 合入 main；**本清单按 MFRS 重写 T6 前置与执行规则** |