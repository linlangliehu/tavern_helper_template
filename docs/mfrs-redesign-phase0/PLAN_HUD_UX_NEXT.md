# HUD 交互三项调整实施计划

**状态**：规划完成，尚未实施

**规划日期**：2026-07-17

**代码基线**：`origin/main@6ee6314`（发布内容仍为 8.13.36）

## 目标与验收口径

1. 右侧“抽卡”点击后，中栏正文直接切换为“神秘复苏抽卡系统”的完整功能面板，不再先显示摘要、单抽/十连简版和“完整面板”二次入口。
2. 删除沉浸 HUD 左栏的“打开全库 · 玩家状态”按钮；保留玩家状态表、镜像、全库编辑和其他全库入口。
3. 默认三栏视图增加可见“沉浸模式”按钮；沉浸 HUD 保留反向切回默认模式的按钮和 `Ctrl+Shift+G` 快捷键。

本计划不改变首次进入神秘复苏角色卡时现有的自动沉浸策略，也不新增跨刷新持久化配置。显式切回默认模式后，可通过新按钮再次进入沉浸模式。

## Phase 0：文档与源码发现 — complete

### 已确认的现有契约

- 默认三栏与沉浸 HUD 都由 `src/神秘复苏模拟器/脚本/消息内面板/index.ts` 管理。
- 默认三栏右侧导航由 `buildNavHtml()` 生成；沉浸 HUD 由 `ensureHudShell()`、`setHudView()`、`mountHudImmersive()`、`unmountHudImmersive()` 管理。
- 当前抽卡中栏由 `buildHudGachaPanelHtml()` 自己实现卡池、单抽、十连和结果渲染，再由“完整面板”按钮调用 `openHudGachaUi()`。
- 完整抽卡系统的唯一实现位于 `src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js` 的 `showGachaPanel()`；它目前只创建 `.acu-edit-overlay` 并追加到 `body`。
- `window.MFRS` 已公开 `single`、`ten`、抽卡数据查询及 `showPanel`，但没有“挂载到指定容器”的 API，也不返回可清理句柄。
- archive-ui phase5 H7-H11 当前把“简版中栏 + 完整面板按钮”写成硬契约，实施时必须同步替换，不能只改源码让旧测试失真。

### 允许复用的 API / 模式

- `MFRS.showPanel()`：保留为原有 body overlay 兼容入口。
- `MFRS.single()` / `MFRS.ten()` 及现有抽卡闭包函数：完整面板继续单源调用，不在消息内面板复制业务逻辑。
- `setHudView('gacha')` + `applyHudCenterView()`：继续负责隐藏正文并显示 gacha slot。
- `toggleHudImmersive()`、`mountHudImmersive()`、`unmountHudImmersive()`：模式按钮只复用现有生命周期，不另造第二套全屏状态。
- 现有 document 级事件委托与 `pagehide` / hot-reload cleanup 模式。

### 禁止假设与反模式

- 不得假设当前 `MFRS.showPanel(container)` 已存在；必须先实现并测试明确的新挂载契约。
- 不得把 `showGachaPanel()` 的数百行业务、事件和抽卡逻辑复制到消息内面板。
- 不得通过调用 `showPanel()` 后查询“最后一个 overlay”再强行搬 DOM；该方式无所有权句柄，且会与其他 ACU 弹层竞争。
- 不得删除玩家状态表、MVU 镜像或通用 `data-mfrs-hud-open-table` 处理器。
- 不得把模式按钮做成新的状态机；现有 `hudImmersivePreferred` 与 mount/unmount 是唯一真源。
- 不得手改发布 PNG、安装依赖或提交 watch 生成的 dev dist。

## Phase 1：给完整抽卡系统增加嵌入式挂载契约

### 实施内容

主文件：`src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js`

1. 从现有 `showGachaPanel()` 提取单一内部渲染/绑定函数，使 overlay 和 embedded 两种呈现共用同一份完整面板 DOM、抽卡逻辑和事件绑定。
2. 保持 `MFRS.showPanel()` 无参行为不变，继续追加 body overlay，兼容 ACU 原按钮和外部调用者。
3. 新增公开契约 `MFRS.mountPanel(container, { onClose })`：
   - `container` 必须是可用的宿主元素；非法宿主明确报错。
   - 完整面板以文档流方式填充宿主，不创建覆盖全屏的外层 overlay。
   - 返回 `{ root, destroy }` 所有权句柄；`destroy()` 幂等解绑并移除本实例。
   - 内嵌标题栏关闭按钮调用 `onClose`，不留下空白宿主。
4. overlay 与 embedded 使用呈现类区分；内嵌版不得使用 `90vh`、fixed overlay 或强制横向滚动，滚动归中栏管理。
5. 自定义编辑器、残屑商店、物品详情等二级弹层继续走既有 overlay 实现，并保持在沉浸 HUD 之上可交互。

### 参考位置

- 完整面板单真源：`v10_2_visualizer.js:7216`
- DOM 追加和局部事件：`v10_2_visualizer.js:7404`
- `window.MFRS` 导出：`v10_2_visualizer.js:8656`
- 抽卡 chat-scope 门禁：`scripts/verify-mfrs-database-frontend-p3.mjs:145`

### 验证

- `MFRS.showPanel()` 仍生成一个可关闭 overlay。
- `MFRS.mountPanel(host)` 在 host 内出现“神秘复苏抽卡系统”的全部区块，body 不新增主面板 overlay。
- 句柄重复 `destroy()` 无异常；再次 mount 不重复事件、不重复固定 id。
- 单抽/十连仍更新调查点、保底、残屑、历史并走原数据库同步。

## Phase 2：右侧抽卡键直接挂载完整面板

### 实施内容

主文件：`src/神秘复苏模拟器/脚本/消息内面板/index.ts`

1. 将 `buildHudGachaPanelHtml()` 收敛为稳定的完整面板宿主和 API 未就绪状态，不再生成摘要、卡池、单抽、十连与“完整面板”按钮。
2. 新增 `hudGachaPanelHandle` 所有权状态；进入 `gacha` 视图且 slot 已显示后调用 `MFRS.mountPanel()`。
3. 完整面板关闭回调执行 `setHudView('story')`；离开 gacha、退出沉浸、切卡、hot reload 和 pagehide 均调用 `destroy()`。
4. `refreshHudBusinessPanels()` 不得在普通数据刷新时反复清空或重挂已存在的完整抽卡面板。
5. 删除仅服务于简版中栏的 `hudGachaLastResult`、`hudGachaPoolType`、`buildHudGachaResultHtml()`、`executeHudGachaPull()`、对应点击分支和废弃 CSS。
6. API 尚未加载时显示明确空状态与重试入口；不得退回旧简版或打开 body overlay 冒充中栏嵌入。

### 参考位置

- gacha slot：`消息内面板/index.ts:3183`
- 旧简版 builder：`消息内面板/index.ts:4389`
- 中栏视图切换：`消息内面板/index.ts:4638`
- 旧 overlay 转发：`消息内面板/index.ts:4744`
- 旧简版事件分支：`消息内面板/index.ts:5120`

### 验证

- 点击右栏“抽卡”后，`#chat` 隐藏、gacha slot 显示，首屏标题就是“神秘复苏抽卡系统”。
- 页面不存在“中栏抽卡”文案和“完整面板”按钮。
- 切换正文/记忆/系统再返回抽卡，不出现空白、重复面板或重复扣费事件。
- 关闭完整面板回正文；Esc 仍按现有中栏业务视图规则回正文。

## Phase 3：左栏精简与默认/沉浸模式切换

### 实施内容

1. 在 `buildHudDossierHtml()` 中只删除 `openPlayer` 按钮及其拼接；调查档案、资源与通用全库能力保持不变。
2. 默认三栏的 `buildNavHtml()` 保持既有 7 个业务导航键，在导航下方新增独立模式按钮：展开图标 + “沉浸模式”，不把它伪装成第 8 个业务视图。
3. 默认模式按钮只出现在最新 AI 三栏面板；点击复用 `toggleHudImmersive()`，并处理默认面板刷新后的焦点恢复。
4. 将沉浸 HUD 顶栏现有“退出沉浸”按钮文案明确为“默认模式”，使用收起/退出全屏图标；点击仍走 `exitHudImmersive()`。
5. 保留 `Ctrl+Shift+G`；不引入第二个 preference、不写 localStorage、不改变首次自动沉浸策略。
6. 桌面和移动端按钮都满足稳定尺寸、键盘焦点和可读 `aria-label`，不挤压既有导航文字。

### 参考位置

- 默认 7 键：`消息内面板/index.ts:786`
- 最新楼三栏右侧：`消息内面板/index.ts:971`
- 左栏玩家状态按钮：`消息内面板/index.ts:4273`
- 沉浸顶栏退出按钮：`消息内面板/index.ts:3168`
- 快捷键与模式生命周期：`消息内面板/index.ts:5267`、`消息内面板/index.ts:5312`

### 验证

- 沉浸左栏不再出现“打开全库 · 玩家状态”，但玩家状态数据仍显示，系统页“打开全库编辑”仍可用。
- 默认最新楼右侧可见“沉浸模式”；点击后 shell 激活、chat 与原生输入区正确迁入。
- 沉浸顶栏点击“默认模式”后 chat/输入区回原位，无 orphan shell、遮罩或 body class。
- 连续默认 → 沉浸 → 默认 → 沉浸至少 3 轮无重复监听和布局漂移。

## Phase 4：自动化门禁同步

### 实施内容

1. 更新 `scripts/verify-mfrs-archive-ui-regressions.mjs`：
   - 将 H7-H11 的“简版抽卡 + 完整面板按钮”断言替换为 mount host、`MFRS.mountPanel`、句柄生命周期和无旧简版标记。
   - 新增左栏精简断言，只禁止 `buildHudDossierHtml()` 内的玩家状态按钮，不误禁通用表导航。
   - 新增默认模式按钮、沉浸反向按钮、快捷键保留与单一状态真源断言。
2. 更新 `scripts/verify-mfrs-database-frontend-p3.mjs`：校验 overlay 兼容入口、新 embedded API、返回 destroy 句柄，以及抽卡 chat-scope / 自定义卡池全局 scope 不变。
3. 运行专项门禁后再运行聚合门禁；任何旧 H7-H11 断言不得通过简单删测试规避。

### 验证命令

```powershell
pnpm verify:mfrs-frontend
pnpm verify:mfrs-archive-ui
pnpm verify:mfrs-gates
```

## Phase 5：Chrome DevTools 真页验收

1. 桌面：右栏“抽卡”一次点击直接显示完整系统；确认余额、scope、残屑、经济、卡池、单抽/十连、结果、历史、自定义入口均在中栏。
2. 操作：各卡池切换；单抽/十连；结果详情；历史展开；二级弹层可关。重置/导入等破坏性动作只验证入口，不执行。
3. 生命周期：抽卡 ↔ 正文/记忆/系统反复切换；关闭按钮和 Esc 返回；无重复 overlay、id、事件或扣费。
4. 左栏：精确确认玩家状态全库按钮消失，其他现场摘要、资源、调查档案与系统全库入口仍在。
5. 模式：默认 → 沉浸 → 默认连续切换；验证 `#chat`、`#send_form`、body class、焦点与滚动位置恢复。
6. 响应式：至少桌面和 390px 移动视口；完整抽卡面板无横向溢出、文字遮挡或按钮越界。
7. 控制台：无新增 error；切卡和脚本 hot reload 后无遗留抽卡 DOM / HUD DOM。

## Phase 6：production 与发布

1. 实施前从最新 `origin/main` 新建独立 worktree，建议分支 `worktree-feat-hud-gacha-mode-toggle`；不继续使用旧 `feat-immersive-center-workspaces`。
2. 依赖与 watch 由用户维护，不运行 install；production build 前先确认 watch 已停止。
3. 功能提交精确包含数据库前端、消息内面板、两项门禁和本计划记录；不得混入当前主工作树的 dev dist。
4. 通过专项/聚合门禁后运行 `pnpm build`，只提交由本轮源码实际产生且经 G1 验证的 production dist。
5. 发版前重新查询最新 tag 决定版本，不能预占 `8.13.37`；发布只走 `pnpm publish-card`，不手改 PNG。

## 最终完成定义

- 三项用户需求逐项通过桌面和移动端真页验收。
- 完整抽卡 UI 只有一份业务实现；overlay 旧入口与 embedded 新入口均有门禁。
- 玩家状态数据能力未受影响，只有指定左栏按钮消失。
- 默认/沉浸切换可见、双向、可重复、无生命周期泄漏。
- 专项门禁、聚合门禁、production freshness、发布卡结构门禁全部通过。
