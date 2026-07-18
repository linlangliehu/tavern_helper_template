# HUD 交互三项调整任务清单

**状态**：paused；T0–T5 已完成，T6 因旧运行时 bundle 阻塞并按用户要求暂停；当前进度 28/44，待执行 16

**对应计划**：`PLAN_HUD_UX_NEXT.md`

**发布基线**：8.13.36；实施基线 `origin/main@75f4a9a`

## 执行规则

- 按 T0 → T7 顺序执行；每组完成后立即更新本文件、`task_plan.md` 和 `progress.md`。
- 业务实现必须在新 worktree 中进行，建议分支 `worktree-feat-hud-gacha-mode-toggle`。
- 不运行 install，不删除或重建 `node_modules`，不主动启动/抢占 watch。
- 当前主工作树的 10 个 dev dist 不得暂存、提交或复制到实施 worktree。
- 发布 PNG 只允许 `pnpm publish-card` 生成；禁止手改。
- 每次提交使用精确白名单，禁止 `git add .` 和 `git add -A`。

## T0：规划入库与实施工作树

- [x] **T0.1 规划文件自检**：严格 UTF-8、`git diff --check`、计划/清单状态一致。
  - 文件：`PLAN_HUD_UX_NEXT.md`、本文件、`task_plan.md`、`findings.md`、`progress.md`
  - 完成条件：没有行尾错误；没有业务源码或 dev dist 混入规划 diff。
- [x] **T0.2 规划提交**：只暂存五个规划文件，提交信息带 `[skip ci]`，推送 `main`。
  - 依赖：T0.1
  - 完成条件：`HEAD == origin/main`；`v8.13.36` 不变；未生成新 tag。
  - 完成证据：规划提交 `75f4a9a` 已进入 `main`，本地 `main` 与 `origin/main` 一致；`v8.13.36` 仍指向 `296c14cd`，无 `v8.13.37`。
- [x] **T0.3 新建 worktree**：从最新 `origin/main` 创建 `feat-hud-gacha-mode-toggle` worktree/分支。
  - 依赖：T0.2
  - 建议路径：`D:\project\tavern_helper_template\.claude\worktrees\feat-hud-gacha-mode-toggle`
  - 完成条件：新 worktree clean；旧 `feat-immersive-center-workspaces` 未被复用或改动。
  - 完成证据：worktree 路径为上述建议路径，分支 `worktree-feat-hud-gacha-mode-toggle`，创建时 `HEAD=75f4a9a` 且 clean；旧 worktree 保持 `c8961df`、clean，未改动。
- [x] **T0.4 基线门禁**：在新 worktree 运行 frontend 与 archive-ui 专项门禁。
  - 依赖：T0.3
  - 命令：`pnpm verify:mfrs-frontend`、`pnpm verify:mfrs-archive-ui`
  - 完成条件：改代码前两项均 PASS；失败先记录，不能把既有失败归因于本轮。
  - 完成证据：`verify:mfrs-frontend` PASS；`verify:mfrs-archive-ui` PASS（232 checks）。

## T1：完整抽卡面板单源挂载 API

主文件：`src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js`

- [x] **T1.1 提取单一 renderer**：从 `showGachaPanel()` 提取完整面板 DOM 与事件绑定，overlay/embedded 共用。
  - 依赖：T0.4
  - 完成条件：余额、scope、残屑、经济、保底、卡池、单抽/十连、结果、历史、自定义、导入/导出/重置逻辑仍只有一份。
- [x] **T1.2 保留 overlay 兼容入口**：`MFRS.showPanel()` 无参行为保持不变。
  - 依赖：T1.1
  - 完成条件：ACU 原抽卡按钮仍在 body 打开可关闭 overlay。
- [x] **T1.3 新增 embedded 契约**：公开 `MFRS.mountPanel(container, { onClose })`。
  - 依赖：T1.1
  - 完成条件：非法 container 明确报错；合法调用返回 `{ root, destroy }`；`destroy()` 幂等。
- [x] **T1.4 内嵌布局适配**：为 embedded 根节点增加独立呈现类，移除主面板 fixed/overlay/`90vh` 约束。
  - 依赖：T1.3
  - 完成条件：宿主内文档流布局，无横向滚动；滚动由 HUD 中栏承接。
- [x] **T1.5 二级弹层兼容**：验证物品详情、残屑商店、自定义编辑器仍使用原 overlay 且可关闭。
  - 依赖：T1.3、T1.4
  - 完成条件：二级弹层不被沉浸壳遮挡，不移走 embedded 主面板。
- [x] **T1.6 API 单元门禁**：扩展 `verify-mfrs-database-frontend-p3.mjs`。
  - 依赖：T1.2–T1.5
  - 完成条件：同时断言 `showPanel` 兼容、`mountPanel`/destroy、chat-scope 不变、自定义卡池仍为 global scope。
  - 完成证据：frontend 门禁 PASS（21 项动态抽卡生命周期检查）；archive-ui phase5 PASS（232 checks）；独立反模式与代码质量复核均无 High/Medium。

## T2：右侧抽卡键直达中栏完整系统

主文件：`src/神秘复苏模拟器/脚本/消息内面板/index.ts`

- [x] **T2.1 替换 gacha slot 内容**：`buildHudGachaPanelHtml()` 只生成完整面板宿主和 API 未就绪状态。
  - 依赖：T1.6
  - 完成条件：不再输出“中栏抽卡”、简版卡池/单抽/十连和“完整面板”按钮。
- [x] **T2.2 接入所有权句柄**：新增 `hudGachaPanelHandle`，进入 gacha 后调用 `MFRS.mountPanel()`。
  - 依赖：T2.1
  - 完成条件：面板关闭回正文；挂载失败显示明确重试入口，不回退旧简版。
- [x] **T2.3 完整生命周期清理**：离开 gacha、退出沉浸、切卡、hot reload、pagehide 时统一 `destroy()`。
  - 依赖：T2.2
  - 完成条件：重复进入不产生重复 DOM、固定 id、事件监听或二次扣费。
- [x] **T2.4 修正刷新链**：`refreshHudBusinessPanels()` 不在普通数据更新时反复重挂完整抽卡面板。
  - 依赖：T2.2、T2.3
  - 完成条件：抽卡结果/展开状态不会被无关 HUD refresh 立即清空。
- [x] **T2.5 删除简版残留**：删除旧结果状态、池状态、builder、pull handler、点击分支和专用 CSS。
  - 依赖：T2.2–T2.4
  - 完成条件：源码中不存在 `hudGachaLastResult`、`hudGachaPoolType`、`data-mfrs-hud="open-gacha"` 和简版操作 selector。
  - 完成证据：稳定 `[data-mfrs-hud-gacha-host]` 承接 `hudGachaPanelHandle`；可信 realm/root 品牌校验通过；设置、全库、切视图、unmount/deactivate/hot reload/pagehide 均统一销毁；普通 refresh 保留已挂载 root；旧简版 marker 搜索为 0。frontend 门禁仍 PASS（21 项动态抽卡生命周期检查），目标 TS/门禁 JS 语法检查与 `git diff --check` 通过，独立反模式和代码质量复核均无 High/Medium。
  - 历史 T4 边界（T2 完成时）：archive-ui H7–H11 仍是 8.13.36 的旧简版契约，并按计划在旧 H7 首败；该旧首败和旧契约已由 T4 替换关闭，当前 archive-ui 237 checks PASS，未以删除旧断言降级门禁。

## T3：左栏精简与模式切换

- [x] **T3.1 删除指定入口**：从 `buildHudDossierHtml()` 删除“打开全库 · 玩家状态”。
  - 文件：`消息内面板/index.ts`
  - 完成条件：只删按钮；玩家状态数据、镜像、通用表导航和系统全库入口仍在。
- [x] **T3.2 默认模式增加入口**：在默认最新 AI 三栏的 7 键导航下增加独立“沉浸模式”按钮。
  - 完成条件：使用展开图标、可见焦点、明确 `aria-label`；不计入 7 个业务视图。
- [x] **T3.3 接入现有切换生命周期**：默认按钮调用 `toggleHudImmersive()`，不新增模式状态真源。
  - 依赖：T3.2
  - 完成条件：继续使用 `hudImmersivePreferred`；不写 localStorage；`Ctrl+Shift+G` 保留。
- [x] **T3.4 沉浸反向入口**：顶栏“退出沉浸”改为图标 + “默认模式”，仍调用 `exitHudImmersive()`。
  - 完成条件：按钮语义与默认入口成对；首次自动沉浸策略不变。
- [x] **T3.5 焦点与响应式**：补默认按钮刷新焦点恢复和桌面/移动稳定尺寸。
  - 依赖：T3.2–T3.4
  - 完成条件：按钮文字不溢出，不遮挡原 7 键；键盘可达。
  - 完成证据：`buildHudDossierHtml()` 只移除指定玩家状态全库按钮；默认最新 AI 三栏在原 7 键导航外增加独立“沉浸模式”工具按钮，继续复用 `toggleHudImmersive()`、`hudImmersivePreferred` 与 `Ctrl+Shift+G`；沉浸顶栏迁移为收起图标 + “默认模式”并保持 `exitHudImmersive()`。默认/沉浸按钮双向交接焦点，mode 快照支持面板刷新恢复；历史楼 mode tools 隐藏，桌面/≤900px 右轨为 60px，≤640px 独立整行，点击目标不小于 44px。`git diff --check` 与双路只读代码复核通过，无 High/Medium；T3 完成时留给 T4 的 archive-ui 旧 H7–H11 已替换关闭，当前 archive-ui 237 checks PASS。

## T4：自动化契约更新

- [x] **T4.1 替换 archive-ui H7-H11**：删除旧“简版 + 完整面板按钮”契约，增加 host/mount/destroy/无旧 marker 断言。
  - 文件：`scripts/verify-mfrs-archive-ui-regressions.mjs`
- [x] **T4.2 增加左栏精简门禁**：只在 `buildHudDossierHtml()` 范围内禁止玩家状态全库按钮。
  - 完成条件：通用 `data-mfrs-hud-open-table` 与系统全库入口仍被允许。
- [x] **T4.3 增加模式切换门禁**：断言默认可见入口、沉浸反向入口、快捷键和单一 preference。
- [x] **T4.4 专项门禁**：运行 frontend 与 archive-ui。
  - 依赖：T1–T4.3
  - 完成条件：两项 PASS；确认测试没有通过删断言降级。
- [x] **T4.5 聚合门禁**：运行 `pnpm verify:mfrs-gates`。
  - 依赖：T4.4
  - 完成条件：全部 PASS；33 条正则和 8 项脚本约束不变。
  - 完成证据：旧 H7–H11 已替换为完整面板 host、mount/destroy、重试、刷新保留与多入口清理契约，并新增 I1–I5 覆盖左栏精简和双向模式切换。门禁通过 TypeScript AST 精确定位函数、分支、调用和赋值，从 AST 提取 CSS template 后按最终声明验证，同时屏蔽 HTML comments 并限定静态字符串拼接，避免注释/死文本假阳性。`node --check`、frontend（21 项动态生命周期检查）、archive-ui（237 checks）、`pnpm verify:mfrs-gates` 与 `git diff --check` 全部通过；独立反模式与代码质量复核均 APPROVE，仅保留既有 CDN_REF warning。

## T5：源码提交检查点

- [x] **T5.1 代码审查**：检查 overlay/embedded 单源、句柄所有权和模式状态唯一性。
- [x] **T5.2 静态检查**：运行 `git diff --check`、目标 JS/TS 语法检查和相关 lint/type 检查。
- [x] **T5.3 精确暂存源码提交**：只提交两处源码、两项门禁和规划记录。
  - 完成条件：不含 dist、PNG、版本常量或无关文件；功能提交已推送功能分支。
  - 完成证据：源码审查确认 overlay/embedded 继续共用单一 renderer，抽卡句柄所有权和 `hudImmersivePreferred` 模式状态真源唯一；独立 verification、反模式与代码质量复核均 APPROVE。`git diff --check`、4 份目标 JS `node --check`、`index.ts` TypeScript transpile、frontend（21 项）、archive-ui（237 checks）和聚合门禁全部 PASS，archive-ui ESLint errors 为 0。v10 全文件 lint 的 `better-tailwindcss` 会误扫 JavaScript template 内的非 Tailwind HTML/CSS，属于已知非阻断限制；排除该插件误报后，其余规则与 `origin/main` 基线一致。`75f4a9a..5dacd2e` 提交链白名单精确，不含 dist、PNG、版本、package 或 lockfile；功能提交均已推送，无需重复提交源码，一行 archive-ui lint 清理随 T5 规划同步提交。

## T6：Chrome DevTools 真页验收

> **恢复说明（2026-07-18 P9）**：feature worktree 本地实时链路已恢复（静态 5510 + DEV 卡 + runtime identity `650d209`/development）。T6 真页可执行；壳/身份/抽卡宿主/左栏禁令已验证，完整人工回归与 390 移动端可继续。

- [ ] **T6.1 桌面完整面板**：一次点击“抽卡”直接显示“神秘复苏抽卡系统”全部区块，body 不出现主 overlay。
- [ ] **T6.2 抽卡功能**：验证卡池切换、单抽、十连、结果详情、历史、残屑商店和自定义入口。
  - 安全限制：重置/导入只验证入口，不执行破坏性动作。
- [ ] **T6.3 生命周期**：抽卡 ↔ 正文/记忆/系统反复切换，关闭与 Esc 返回，无重复扣费/DOM/事件。
- [ ] **T6.4 左栏回归**：指定按钮消失；现场摘要、资源、调查档案、玩家状态显示和系统全库入口正常。
- [ ] **T6.5 模式循环**：默认 → 沉浸 → 默认 → 沉浸至少 3 轮，验证 `#chat`、`#send_form`、body class、焦点与滚动恢复。
- [ ] **T6.6 移动端 390px**：完整面板和模式按钮无溢出、遮挡、错位；抽屉仍可关闭。
- [ ] **T6.7 清洁度**：控制台无新增 error；切卡/hot reload 后无孤儿 HUD 或抽卡 DOM。

## T7：production、发布与交付

- [ ] **T7.1 停止 watch 并确认进程为 0**：由用户维护 watch；禁止边 watch 边 production build。
- [ ] **T7.2 production build**：运行 `pnpm build`，核对只出现本轮合理 dist。
- [ ] **T7.3 G1 与聚合复验**：dist freshness、frontend、archive-ui、聚合门禁全部 PASS。
- [ ] **T7.4 production dist 提交**：精确暂存并推送，使候选 CDN_REF 远端可达。
- [ ] **T7.5 重新决定版本号**：查询远端最新 tag；不得预设 `8.13.37` 仍可用。
- [ ] **T7.6 发布角色卡**：更新版本/ref/cache，运行 `pnpm publish-card`，生成发布版 YAML/PNG。
- [ ] **T7.7 发布验收**：核对 33 regex、8 scripts、PNG chara/ccv3、7 个 CDN URL 与字节哈希。
- [ ] **T7.8 提交/推送/tag**：精确发布提交进入 main，等待并核对 bot bundle/tag 正常形态。
- [ ] **T7.9 用户交付**：告知最终版本、PNG 路径、CDN_REF、提交/tag，并由用户重新导入发布版 PNG、按需恢复 watch。

## 完成统计

- 总任务：**44**
- 已完成：**28**
- 进行中：**0**
- 待执行：**16**
