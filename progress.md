# 进度日志

## 会话：2026-07-17（主工作树本地归档清理）— **complete**

- 用户确认 `pnpm watch` 已停止；本地资产统一迁移至 `D:\project-local-assets\tavern_helper_template`。
- 已确认当前 `main@eab282f` 与 `origin/main` 一致；工作树仅有 10 个 dev/watch dist 修改及约定的未跟踪文件，`src/`、`scripts/` 无未提交修改。
- 本轮授权范围：迁出 46 个本地文件，精确恢复 10 个 dist，设置本地 exclude，并提交历史 `EXECUTION_PLAN_2026-07-14-81322-era.md`。
- 迁移预检确认 46 个文件、28,521,143 字节均为未跟踪文件，目标无冲突；清单汇总 SHA-256 为 `5F9105730D8B81421521224C09130562CEEF0DAACD8725C9CEE20B37499F04F2`。
- 迁移预检首次在工具解析层因 PowerShell 制表符转义冲突失败；命令未执行、文件未变，已改为无反引号的输出格式后重试。
- 第二次预检已通过路径、未跟踪状态、数量及目标冲突检查，但旧版 PowerShell 不支持 `Convert.ToHexString`；未改文件，汇总哈希输出改用 `BitConverter`。
- 首次迁移命令在 PowerShell 解析阶段因缺失右括号停止，`Move-Item` 未执行；源和目标未变，修正后从完整预检重跑。
- 46 个文件已迁至 `D:\project-local-assets\tavern_helper_template`；迁移后源路径为 0、目标缺失为 0、逐文件长度/SHA-256 不一致为 0。
- `.git/info/exclude` 已加入六组本地路径规则；该配置仅本机生效，不进入仓库提交。
- watch 复核为 0 后，精确恢复 10 个 dev/watch dist；`src/`、`scripts/` 与全部 dist 均无未提交差异。
- 历史计划 `planning_archive_2026-07/EXECUTION_PLAN_2026-07-14-81322-era.md` 已核对为严格 UTF-8，SHA-256 `D74CA87A766E25876BE3B900D9802B20B3D9CD4033EFFAE56AFB16718A1C95DD`，随本次规划记录提交。
- 功能 worktree 保持 clean；`v8.13.36` 仍指向 `296c14cd`，不存在 `v8.13.37`。
- 首次暂存白名单正确，但历史计划开头 3 处 Markdown 行尾双空格触发 `git diff --cached --check`；已移除空白并重新校验。

## 会话：2026-07-17（规划文件同步收尾）— **complete**

- 以实际源码、提交链和发布产物复核 8.13.36：Task #1–#5 均已实现；release `0726289`、CDN_REF `9c5a467a3481…`、bot bundle / tag `296c14cd` 状态一致。
- 复跑 `pnpm verify:mfrs-gates`：7/7 PASS；archive-ui phase5 232 checks；数据库前端 P3、release PNG 与只读 dist freshness 均通过。
- `task_plan.md`：HUD-CENTER-RELEASE 阶段、发布提交与 tag 验收项全部关单为 complete。
- `findings.md`：发布前基线与 8.13.31 当前快照更新为 8.13.36 最终发布结论。
- 主工作树 10 个 dist 修改均为带 eval/sourceURL/sourceMap 的 dev/watch 产物；`src/`、`scripts/` 无未提交源码，本轮未触碰这些用户状态。
- 根目录与发布 worktree 三份规划文件 SHA-256 完全一致，严格 UTF-8 解码和 `git diff --check` 通过；内置 `check-complete.ps1` 因中文阶段格式返回无效的 `0/0 phases`，已改用定向状态扫描验收。
- 当前进入待命：暂无已排期新任务；全新任务从最新 `origin/main` 新建 worktree。`296c14cd` 仍是 8.13.36 的运行时 bot bundle / tag 基线，后续规划提交不改变发布内容。

## 会话：沉浸 HUD 中栏改造 · 发布准备 — **complete（8.13.36 已发布）**

### 收尾（2026-07-16 · 提交 / 推送 / main / tag / 最终验收）

- 发布提交 `0726289 chore(mfrs): release 8.13.36`：精确白名单暂存 11 项 + 新增 `RELEASE_8.13.36.md`（12 files），未用 `git add -A`/`.`。
- 推送功能分支 `worktree-feat-immersive-center-workspaces`：`9c5a467..0726289`。
- main fast-forward：`git push origin HEAD:main` → `9a9da19..0726289`，完整发布链一次推送。
- **GitHub Actions 自动 bundle 已运行**：workflow 在 main 推送后生成 `[bot] bundle` 提交 `296c14cd`（父提交为 `0726289`），advance `origin/main` 并打 `v8.13.36` 标签——与 `v8.13.34`→`e35d6c7 [bot] bundle` 同一发布形态。bundle 仅改 `dist/神秘复苏模拟器/界面/状态栏/index.html`（module-id 重排 1 行），无实质内容变化。
- `gh` 未安装（不在 PATH），改用 `git ls-remote` 验收：`refs/tags/v8.13.36` = `296c14cd`（远端可达）；`origin/main` = `296c14cd`。
- 最终核对（发布版 PNG `神秘复苏模拟器发布版.png`，SHA256 `5356AE53…CBD6DCBA`，7798294 字节）：chara/ccv3 均 version=8.13.36、projectRefCount=7、cacheCount=8、regexScripts=33、scripts=8（名称/顺序不变）；CDN_REF `9c5a467a3481` 7 个 URL 全部 HTTP 200 且字节 SHA256 与本地 dist 一致；工作树 clean。
- 说明：release-png 的 `CDN_REF != HEAD` 是预期告警——CDN_REF 固定指向 production dist 提交 `9c5a467`，HEAD 领先的 `0726289`/`296c14cd` 仅含发布元数据与 bot bundle，无 dist 实质遗漏。

## 会话：沉浸 HUD 中栏改造 · 发布准备（历史断点）

- 用户要求按项目既有流程提交、推送、更新角色卡版本与 CDN，并验收最终角色卡。
- 功能分支 `worktree-feat-immersive-center-workspaces` 已推送；本地/远端 HEAD 均为 `116612e`，相对 `origin/main@9a9da19` 领先 3 个提交。
- Task #1–#5 已完成真页验收；`pnpm verify:mfrs-gates` 通过（archive-ui phase5=232 checks），`verify:mfrs-frontend` / database frontend P3 通过，`git diff --check` 干净。
- 当前发布内容仍为 8.13.31（CDN_REF `8ee8c58`），但仓库 tag 已存在至 `v8.13.35`；新版本号须先核对 tag/自动 bundle 约定，避免重用已占用标签。
- 已确认 `.github/workflows/bundle.yaml` 只监听 `main` 非 dist 推送，并用 autotag 递增最新标签；仓库无 `package.json.version`。本轮确定发布 **8.13.36**，在功能分支完成全部发布提交后仅一次 fast-forward 到 `main`，避免中途消耗多个自动标签。
- 发布前门禁复跑通过：聚合 gates 7/7（archive-ui 232 checks）、database frontend P3、`git diff --check` 均通过。
- `pnpm build` production 成功；仅 `dist/神秘复苏模拟器` 4 个文件变化（消息内面板、数据库前端、旧前端兼容包、状态栏 module-id），schema/开发卡/发布卡未变化。G1 校验整个目标 dist，因此 4 个产物作为同一 CDN 候选提交。
- production dist 提交 `9c5a467` 已推送远端功能分支；完整 SHA `9c5a467a34818ed4a4bd758e3ce6b76f160a1d3f`。G1 确认该 SHA 远端可达、dist 与提交一致、从当前源码重构建后零差异。
- 发布元数据已切换为 8.13.36 / cache `v81336_20260716_01` / CDN_REF `9c5a467a34818ed4a4bd758e3ce6b76f160a1d3f`；发布版目录尚未镜像或打包。
- `pnpm publish-card 神秘复苏模拟器发布版` 已成功：G1 再次通过，镜像第一条消息 1、系统提示词 1、对话示例 1、世界书 386、数据库 1，并生成发布版 PNG。
- publish-card 内置 release-png 门禁通过：发布 PNG chara/ccv3 均为 version=8.13.36、refs=7、cache=8、regex=33、scripts=8。
- 独立复验通过：聚合 gates 7/7（archive-ui 232 checks）、database frontend P3、开发卡与发布卡双 PNG JSON 验证；两张卡的 chara/ccv3 元数据完全一致。
- 数据镜像逐文件 SHA256 校验通过：第一条消息/系统提示词/对话示例/世界书 386 文件/数据库及头像均与开发版一致；dist 保持 clean。
- **暂停断点**：README 与发布/规划记录已更新；7 个实际 CDN URL 均 HTTP 200，远端字节 SHA256 与 `CDN_REF=9c5a467...` 对应本地 dist 完全一致。尚未提交当前发布元数据与角色卡产物，尚未推送最新 release commit 到功能分支/main，尚未创建或纠正 `v8.13.36` tag。
- 本轮硬约束：不安装依赖、不动 `node_modules`、不启动 watch、不手改 PNG；production dist 与发布物分阶段提交，发布只走 `pnpm publish-card`。

## 会话：沉浸 HUD 中栏改造 · Task #3/#4 真页验收 + hudRowField 修复 — **完成**

承接 Task #3/#4 源码提交（`a8244ae`）。本轮进行 CDP 真页验收，发现并修复 `hudRowField` 的 `includes` 匹配优先级 bug。

**真页验收环境：** CORS 静态服务器（cors_server.py，端口 8131）serve dist；iframe 7 内 `import()` 本地 bundle 替换 CDN 8.13.31；mock `exportTableAsJson`（3 表各注入测试行）+ mock `MysteryDatabaseFrontend`（`previewMemoryChange`/`applyMemoryChange`/`requestConfirmedMemoryDelete`）。

**Bug 发现与修复：`hudRowField` 的 `includes` 匹配优先级**
- 原代码 `headers.findIndex(h => h === name || h.includes(name))` 对每个 header 同时检查精确匹配和 `includes`，导致 `纪要编号` 在 `纪要` 之前时被 `includes("纪要")` 优先匹配。
- 编辑表单的 `纪要` 字段错误显示 `SP0002`（来自 `纪要编号` 列）而非实际纪要内容。
- 修复：先 `findIndex(h => h === name)` 精确匹配，未命中再 `findIndex(h => h.includes(name))` 回退。

**Task #3 记忆中栏 CRUD 真页验证（全通过）：**
1. 三 section 渲染（事件纪要/收录档案/收录规律），4 行记录带编辑/删除/新增按钮 ✓
2. 编辑表单预填充：`纪要` 字段正确显示"玩家首次进入鬼域，观察到时间停滞现象。"（修复后）✓
3. `纪要编号` 编辑时 readonly（`readonlyOnEdit` 生效）✓
4. 新增→填写→保存：`applyMemoryChange({ action: 'insertRow', table: '收录规律', data: {...} })` 调用正确 ✓
5. 删除：`requestConfirmedMemoryDelete({ table: '收录档案', row_id: '1' })` 调用正确 ✓

**Task #4 抽卡中栏嵌入真页验证（全通过）：**
1. 卡池选择器（全物品/档案/规律/灵异物品 4 选项）✓
2. 单抽按钮→MFRS.single()→结果内联渲染（1 件物品，余额 200→190）✓
3. 十连按钮→MFRS.ten()→结果内联渲染（10 件物品，含 ★★★★ 禁忌知识）✓
4. 结果项：图标/名称/稀有度星/颜色/类型全正确 ✓
5. 保留"完整面板"按钮 ✓

**门禁（全绿）**：7 道功能门禁全 PASS；`git diff --check` 通过；tsc 0 语法错误。验收后还原 `exportTableAsJson`、退出 HUD、停服务器、`git checkout dist webpack.config.ts`。

**当前 worktree**：1 个未提交文件（`src/神秘复苏模拟器/脚本/消息内面板/index.ts` — `hudRowField` 修复）。

## 会话：沉浸 HUD 中栏改造 · Task #3 记忆中栏 CRUD + Task #4 抽卡中栏嵌入 — **完成（已提交 `a8244ae`）**

承接上轮（Task #1/#2/#5 已提交 `7155b09`）。本轮完成 Task #3 记忆中栏 CRUD 和 Task #4 抽卡中栏嵌入。未 commit/push/publish/改 PNG/更新版本。

**Task #3：记忆中栏 CRUD（`src/神秘复苏模拟器/脚本/消息内面板/index.ts`）：**
- 新增状态变量 `hudMemoryEditState`（`{ tableKey, mode: 'new'|'edit', rowId }`），与 `hudArchiveSelection` 并列管理。
- `buildHudMemoryPanelHtml` 从只读摘要列表重写为交互式 CRUD：
  - 三张记忆表（事件纪要/收录档案/收录规律）各一个 section，含行列表 + 新增按钮。
  - 每行带编辑（`data-mfrs-hud-memory-action="edit"`）和删除（`"delete"`）按钮。
  - 新增/编辑时渲染内联表单 `buildHudMemoryFormHtml`，从 `frontend-config.js` 的 `memoryEditor` 配置读取字段列表：
    - `fieldHeaders` → 表单字段顺序
    - `textareaHeaders` → `<textarea>`
    - `enumHeaders` → `<select>`
    - `rangeIntHeaders` → `<input type="number">` + min/max
    - `readonlyOnEdit` → 编辑时只读
    - `hiddenHeaders` → 隐藏（如 row_id）
    - `maxLengthHeaders`/`minLengthHeaders` → 字符长度验证
    - `crossFieldRules` → 跨字段验证（如收录状态=已收录时进度必须100）
- `handleHudShellClick` 新增 5 类记忆操作拦截：new/edit/delete/save/cancel，各设置 `hudMemoryEditState` 并刷新 memory-slot。
- `executeHudMemorySave`：收集表单数据 → `validateHudMemoryFormData` 验证 → 调 `MysteryDatabaseFrontend.applyMemoryChange`（insertRow/updateCell）→ 成功后清空编辑态。
- `executeHudMemoryDelete`：调 `MysteryDatabaseFrontend.requestConfirmedMemoryDelete`（内含人工确认 + capability 令牌）。
- `setHudView` 切离 memory 时清空 `hudMemoryEditState`；unmount/destroy/unregister 同步重置。
- 新增 CSS：memory-form/memory-field/memory-btn/memory-add-btn/memory-row/memory-actions 等。

**Task #4：抽卡中栏嵌入（`src/神秘复苏模拟器/脚本/消息内面板/index.ts`）：**
- 新增状态变量 `hudGachaLastResult`（上次抽卡结果）和 `hudGachaPoolType`（当前池类型，默认 'all'）。
- `buildHudGachaPanelHtml` 从纯摘要+外部按钮重写为嵌入式：
  - 保留调查点/保底/残屑/历史四项 KV 摘要。
  - 新增卡池选择器（全物品/档案/规律/灵异物品池，`data-mfrs-hud-gacha-pool`）。
  - 新增单抽（`data-mfrs-hud-gacha-action="single"`）和十连（`"ten"`）内联按钮，调 `MFRS.single(poolType)` / `MFRS.ten(poolType)`。
  - 保留"完整面板"按钮打开完整抽卡 UI（`MFRS.showPanel()`）。
  - `buildHudGachaResultHtml`：内联渲染抽卡结果——每项显示图标/名称/稀有度星/颜色/类型。
- `handleHudShellClick` 新增抽卡操作拦截：single/ten 调 `executeHudGachaPull`；池选择写 `hudGachaPoolType`。
- `executeHudGachaPull`：调 `MFRS[kind](hudGachaPoolType)` → 存 `hudGachaLastResult` → 刷新 gacha-slot。
- `setHudView` 切离 gacha 时清空 `hudGachaLastResult`；unmount/destroy/unregister 同步重置。
- 新增 CSS：gacha-controls/gacha-pool-label/gacha-result/gacha-items/gacha-item 等。

**门禁（全绿）**：`verify:mfrs-frontend` / `verify:mfrs-table-adapter` / `verify:mfrs-archive-ui`（221→232，新增 11 项 Phase H：H1-H11 记忆 CRUD 交互/表单字段/CRUD 调度/save 调用/delete 调用/状态重置/抽卡嵌入/抽卡操作/结果渲染/状态重置/CSS）/ `verify:mfrs-initvar-schema` / `verify:mfrs-regex-ids` / `verify:mfrs-mvu-hotfix` / `verify:mfrs-output-cleaning` 全 PASS；`git diff --check` 通过。tsc `--noEmit` 0 语法错误。

**当前 worktree**：2 个未提交文件（`src/神秘复苏模拟器/脚本/消息内面板/index.ts` + `scripts/verify-mfrs-archive-ui-regressions.mjs`）。

## 会话：沉浸 HUD 中栏改造 · Task #1 收尾 + Task #5 真页验收 — **完成（已提交 `7155b09`）**

承接上一会话（Task #2 五缺口已接通）。本轮彻底完成 Task #1 数据库与安全底座，并完成 Task #5 真页验收。未 commit/push/publish/改 PNG/更新版本。

**Task #1 收尾：收紧 `createMemoryMutationExecutor` export 可达性（`table-change-adapter.ts` + `数据库前端/index.ts`）**
- `applyConfirmedMemoryDelete` 此前声明了 `confirmedMemoryDeleteCapability` Symbol 却只 `void`（未实际用作门禁）——裸调 `executor.applyConfirmedMemoryDelete(plan,data,tpl)` 即可删除记忆行，绕过前端的人工确认/工作台/快照三重保护。
- 收紧：`applyConfirmedMemoryDelete` 新增 `capability` 参数，必须等于闭包内 Symbol；不匹配返回新错误码 `UNAUTHORIZED`（`TableChangeErrorCode` 联合新增）。executor 返回值附带 `confirmedMemoryDeleteCapability`（Symbol 键，不可序列化、`JSON.stringify` 丢弃）。
- 前端 `index.ts` 捕获 `memoryDeleteCapability`，仅在 `requestConfirmedMemoryDelete` 人工确认后传入；该令牌是模块私有、永不进 plan/JSON/window。
- 门禁：`verify-table-change-adapter.mjs` 新增裸调拒绝断言（`UNAUTHORIZED` + vendor 不触达）；`verify-mfrs-database-frontend-p3.mjs` 新增令牌捕获/传递断言。
- **附（上轮已修）**：`数据库前端/index.ts` 的 `getHostWindow()` 函数头被 Task #1 的 `waitForMfrsConfirmDanger` 覆盖导致孤儿 `try` 体（TS1128 语法错误 + 261/864 行调用无定义）已恢复。

**Task #5 真页验收（CDP 真机，http://127.0.0.1:8000/ SillyTavern，神秘复苏模拟器发布版 8.13.31 在线）：**
- worktree `pnpm install`（8.4s，hardlink）；临时给 `webpack.config.ts` 加 `MFRS_SKIP_SYNC` 环境门禁跳过 `schema_dump`/`tavern_sync`，`MFRS_SKIP_SYNC=1 pnpm build:dev` 产出 dev bundle（**0 PNG/YAML 被改动**），验收后 `git checkout` 还原 dist + webpack.config.ts。
- 本地静态服务器（127.0.0.1:8131）serve dist；向在线消息内面板 iframe 注入 `<script src>` 本地 bundle（替换在线 8.13.31 实例：先 `__mfrsMessagePanelCleanup__` 清旧，再挂我的版本）。验收后还原 `exportTableAsJson` + toggle 重挂回真实空库，Esc 回正文。
- **archive 行为全部通过**（mock 4 表各 1 可见行注入 `exportTableAsJson`，toggle 强制 `refreshHudPanels(true)`）：
  1. 四类档案按钮渲染（线索/厉鬼档案/人物/地点），各带三 `data-mfrs-hud-archive-*` 属性 ✓
  2. 点击线索→中栏 `archive` 视图，archive-slot 渲染只读详情（CLUE-001 + 8 字段 + 「只读」）✓
  3. 点击厉鬼档案/人物/地点→各自只读详情预览 ✓
  4. 预览无 `data-mfrs-hud-open-table`/全库按钮（只读）✓
  5. Esc→回 `story`、archive-slot 隐藏 ✓
  6. **线索 fail-closed**：可见性=「内部」的线索被 `isHudArchiveRowVisible` 过滤（clueItems 仅 row_id 1）✓
  7. **DB revision 回调**：`api._notifyTableUpdate({})` 触发已注册 `hudDatabaseUpdateCallback`→`hudDatabaseRevision+=1`→`refreshHudPanels(true)`→重读库重渲（clue 按钮 1→2）✓
- Task #1 能力收紧由 `verify-table-change-adapter.mjs` VM 行为测试覆盖（裸调拒绝、确认删除通过、非记忆表拒绝）；在线挂载无 console error。

**门禁（全绿）**：`verify:mfrs-frontend` / `verify:mfrs-table-adapter` / `verify:mfrs-archive-ui`（212→221，含 9 项 Phase G）/ `verify:mfrs-initvar-schema` / `verify:mfrs-regex-ids` / `verify:mfrs-mvu-hotfix` / `verify:mfrs-output-cleaning` 全 PASS；`git diff --check` 通过。tsc `--noEmit` 0 语法错误（本轮编辑行无新增类型错误）。

**当前 worktree（10 未提交文件）**：progress.md + 3 门禁脚本（archive-ui/table-adapter/frontend-p3）+ 6 源码（消息内面板/index.ts、数据库前端/index.ts+table-change-adapter.ts+frontend-config.js+v10_2_visualizer.js、神秘复苏表格SQL_v1.json）。dist/webpack.config.ts/node_modules 已还原或 gitignored。

**待办**：Task #3 记忆中栏 CRUD / Task #4 抽卡中栏嵌入（未开始，archive 已验收可进）；发布另立任务（本轮不发版）。

## 会话：沉浸 HUD 中栏改造 · Task #2 四类档案中栏预览接通 — **Task #2 源码完成（未 commit）**

隔离 worktree `worktree-feat-immersive-center-workspaces`（基于 `origin/main@992d922`）。本轮只动源码与门禁脚本，未 commit/push/publish/改 PNG/更新版本。

**Task #2 五处缺口全部接通（`src/神秘复苏模拟器/脚本/消息内面板/index.ts`）：**
- **缺口 1** `handleHudShellClick`：在 `data-mfrs-hud-open-table` 全库分支前新增 `.mfrs-hud-archive-item` 拦截，读 `data-mfrs-hud-archive-table-key/-table-name/-row-id` 写入 `hudArchiveSelection`，`setHudView('archive')`，≤800px `closeHudSideDrawers()`。
- **缺口 2** `refreshHudBusinessPanels`：新增 archive slot 刷新，调用此前无调用点的 `buildHudArchivePreviewHtml()`。
- **缺口 3** `setHudView`：新增 `view === 'archive'` 专门分支（关柜、移动端关抽屉、桌面保留左栏、仅渲染 archive slot、不调 memory/gacha/system refresh），置于 `isHudCenterBusinessView` 分支前。
- **缺口 4** `hudDatabaseUpdateCallback/hudDatabaseRevision`：新增 `getHudDatabaseUpdateCallback`/`registerHudDatabaseUpdateCallback`/`unregisterHudDatabaseUpdateCallback`（idempotent flag `hudDatabaseCallbackRegistered`，API 未就绪静默跳过待重试）；`activateMessagePanelRuntime` 注册，`deactivateMessagePanelRuntime`+`cleanup` 注销。回调内 `hudDatabaseRevision += 1` + `refreshHudPanels(true)`；`getPanelRenderKey` 已含 `:db${hudDatabaseRevision}`，外部编辑/镜像写入后 HUD 全量刷新。
- **缺口 5** `destroyHudImmersive`/`unmountHudImmersive`/`unregisterHudDatabaseUpdateCallback`：均重置 `hudArchiveSelection = null`（覆盖 destroy/切卡/注销 callback）。

**附带修复（Task #1 残留语法回归）：** `src/神秘复苏模拟器/脚本/数据库前端/index.ts` 中 `getHostWindow()` 的函数头在 Task #1 被 `waitForMfrsConfirmDanger` 覆盖，导致 `try { return (window.parent ?? window)… }` 函数体孤儿化（`return` 脱离函数 → TS1128 语法错误，阻断 webpack transpile；且 `getHostWindow` 在 261/864 行仍被调用却无定义）。已按 HEAD 原样恢复 `function getHostWindow() {` 头，与新函数并存。此为编译阻断项，非本轮范围扩张。

**门禁：**
- `verify:mfrs-frontend` PASS、`verify:mfrs-table-adapter` PASS、`verify:mfrs-archive-ui` PASS（**212→221 checks**，新增 9 项 Phase G：archive-item 拦截序/	slot 刷新/setHudView archive 分支/四类规则按钮/无全库按钮只读/线索 fail-closed/Esc 返回正文/DB revision 接线/选中态重置）。
- `git diff --check` 通过。
- tsc 独立 `--noEmit`：孤儿修复后全工程可解析（0 个 TS1xxx 语法错误；余 132 项均为 TS2xxx/6xxx/7xxx 类型/解析噪声——global-script 跨文件重声明、vue/pinia auto-import、type-fest 命名空间、pnpm hoist `@babel/*`，均被 webpack `transpileOnly`+`onlyCompileBundledFiles`+unplugin-auto-import 规避，与本轮改动无关；`消息内面板/index.ts` 19 项全在 22-25/379/391/1573/3262/4880/5959/5986/6057 等既有行，无一落在本轮编辑行）。

**待办：**
- Task #1 残留：收紧 `createMemoryMutationExecutor` export 可达性（原 TODO，未动）。
- Task #2 真页验收（Task #5）：需 production build + CDP 真机验证 archive slot 四类按钮→中栏预览→Esc 返回、DB revision 实时刷新。
- Task #3 记忆中栏 CRUD / Task #4 抽卡中栏嵌入：未开始（用户要求 archive 验收前不混入 gacha 重构）。

**未做：** commit/push/tag/publish-card/改 PNG/更新版本/CDN_REF。worktree 内创建了 `node_modules` junction 指向主仓 `node_modules`（gitignored，仅供 tsc 校验；非真实 install，无 .bin）。

## 会话：2026-07-16（8.13.31 发布）— **complete**

- 将 MAINT-29 修复提交、推送并发布为 **8.13.31**。
- 源码提交 `5e52dcb`：MAINT-29-01 黄金储备正式路径 + MAINT-29-02 drawer watcher 生命周期，含 production dist、门禁脚本、文档。
- production dist 提交 `8ee8c58`：状态栏 module-id rebuild（CDN_REF 指向此 commit）。
- release constants 更新：`RELEASE_VERSION=8.13.31`，`CDN_REF=8ee8c58`，`CDN_CACHE_VERSION=v81331_20260716_01`。
- 开发版 index.yaml：版本 8.13.31，7 个脚本 URL ref + 8 个 cache marker 全部更新。
- `pnpm publish-card 神秘复苏模拟器发布版` 完成：G1 dist 新鲜度通过；release-png 门禁 version=8.13.31 refs=7 cache=8 regex=33 scripts=8 通过。
- release commit `4c94a4e`：含 constants、开发版/发布版 YAML、开发版/发布版 PNG。
- 推送 `origin/main`；tag `v8.13.31` → `4c94a4e`（force push 修正 bot bundle 自动创建的旧 tag）。
- 发布后远端状态：`992d922 [bot] Bump deps` → `e35d6c7 [bot] bundle` → `4c94a4e release 8.13.31` → ...。

## 会话：2026-07-15（8.13.29 发布后维护：黄金储备 + drawer watcher）— **complete / published as 8.13.31**

- 基线：隔离 worktree `worktree-fix-mfrs-drawer-gold` 从 `origin/main@ec14755`（tag `v8.13.30` bot bundle）实施；已发布内容仍为 **8.13.29**（release `410454b`，CDN dist `95981c9`，cache `v81329_20260715_01`）。
- **MAINT-29-01**：消息内面板资源 builder 读取优先级改为 `灵异资源.黄金储备` → `灵异资源.黄金` → `灵异资源.鬼钱` → 顶层 `黄金`；保留对象格式化与 HTML escape，标准 schema 数据不再漏掉黄金区。
- **MAINT-29-02**：drawer selector 建立单真源；overlay watcher 改为 epoch/token、burst timer Set、opening grace、stable-close debounce、RAF/timer 清理；自动确认关闭只调用非破坏性 `releaseHudFromStUi()`，不会再自动点击/强制关闭 ST UI。
- drawer action 兼容 `.drawer-toggle` 自身、祖先和子元素，修复不同设置入口 DOM 形态不一致。
- 门禁：`node --check scripts/verify-mfrs-archive-ui-regressions.mjs` 通过；`pnpm verify:mfrs-archive-ui` **212 checks PASS**；`pnpm verify:mfrs-gates` 聚合 **7/7 PASS**；`git diff --check` 通过。
- 构建：production `pnpm build` 完成；仅目标消息内面板 production dist 纳入业务改动，状态栏 module-id 噪声未保留。
- 真机：通过独立远程调试 Chrome 的 `http://127.0.0.1:8000/` SillyTavern，向消息内面板 iframe 注入当前 worktree 本地 production bundle；未操作用户主浏览器。
  - 8 个设置入口均成功打开对应 drawer，150ms 与约 2650ms 两次快照均保持 open/可见，HUD 让层 class 持续存在。
  - 40ms 快速切换“世界书→API”后仅最后动作生效，旧 RAF/timer 未关闭新 drawer。
  - 原生关闭 drawer 后，经稳定 debounce 自动撤销 HUD 让层；未发生再次点击或强制关闭。
  - HUD“关闭面板”仍能主动关闭当前外部 UI并保持沉浸；黄金区显示“黄金 未准备”，无 `[object Object]`。
  - 证据截图：`drawer-worldinfo-stable.png`（本地验证产物，不纳入发布）。
- **未执行**：commit、push、publish-card、tag、发布 PNG 更新；本轮修复尚未上线。

## 会话：2026-07-15（沉浸式按键审查缺陷修复）— **complete**

- 修复 4 个问题（ISSUE-002/003/004/005），源码 commit `779b9d7`，dist commit `74f74b7`，已 push `origin/main`。
- **ISSUE-003 (High)**：`runHudTavernAction` 的 `fire()` 中 `live.click()` 点击 `.drawer-icon` 父容器，ST 的 `doNavbarIconClick` 绑在 `.drawer-toggle` 子元素上不会触发。改为查找 `.drawer-toggle` 子元素并用 jQuery trigger，fallback 保留原生 click。
- **ISSUE-002 (Medium)**：`buildHudGachaPanelHtml` 读取 pity 对象用了不存在的键 `soft/hard/count`，实际键为 `{total, rare, epic}`。改为 `★4 还需X抽 · ★6 还需Y抽` 格式，与完整抽卡面板对齐。
- **ISSUE-004 (Low)**：`unmountHudImmersive` 在退出按钮仍持焦点时设 `aria-hidden="true"`。改为先 blur/focus `#send_textarea`，再隐藏 shell。
- **ISSUE-005 (Low)**：`runMirrorOnce` 在 `AutoCardUpdaterAPI` 未就绪时走到 `requireApi` 抛异常。加守卫 `if (!AutoCardUpdaterAPI) return`，静默跳过等下次 schedule。
- **ISSUE-001 (Medium)**：`[object Object]` 修复已在仓库 `07051d7`，本次 push 包含；发版后 CDN pin 自动覆盖。
- 门禁：`pnpm verify:mfrs-gates` 6/6 全绿（initvar-schema/regex-ids/RH5-scoped/hotfix/output-cleaning/table-adapter/release-png）。
- 改动范围：`index.ts` +19/-5、`mvu-core-mirror.ts` +3/-0；无正则/脚本库/世界书变动。

## 会话：2026-07-15（发布版沉浸式按键真机审查）— **complete**

- 已通过 chrome-devtools MCP 连接用户以远程调试模式启动的独立 Chrome；当前目标页为 `http://127.0.0.1:8000/` 的 SillyTavern，未连接或操作主 Chrome。
- 目标聊天已确认显示”神秘复苏模拟器发布版”，CDN 确认为 `@158dcc29107f` / `v81322_20260714_01`（8.13.22）。
- 逐项验证 21 项：正文/档案/关系/记忆/抽卡/系统/设置/退出沉浸/快捷键/Esc/窄屏/开局表单交互/全库入口等，16 项通过，5 项发现问题。
- **发现 5 个问题**：
  - **ISSUE-001 (Medium)**：退出沉浸后现场档案”资源”折叠区显示 `[object Object]`。
  - **ISSUE-002 (Medium)**：抽卡中栏摘要”保底”直接显示原始 JSON `{“total”:0,”rare”:0,”epic”:0}`。
  - **ISSUE-003 (High)**：沉浸模式内”设置”8 个酒馆原生入口点击后 ST drawer 未打开——HUD click→jQuery trigger 链路存在 yield/drawer 竞争。手动 jQuery trigger 可正常打开；退出沉浸后点击也正常。
  - **ISSUE-004 (Low)**：退出沉浸按钮触发 aria-hidden/focus 冲突警告。
  - **ISSUE-005 (Low)**：CoreMirror 运行失败（缺 AutoCardUpdaterAPI），2 个 CDN 404（storage/script.js, extensions.js）。
- 报告和 19 张截图保存在 `dogfood-output/mfrs-immersive-buttons-2026-07-15/`。

## 会话：2026-07-15（维护收尾与待命）

- 本地 `main` 以 `git pull --ff-only` 同步至 `origin/main@b8213f7`（tag `v8.13.26`）；仅 fast-forward 了自动 bundle 的状态栏 dist。
- 复核最新业务修复 `07051d7`：档案资源区改用 `buildHudResourceSectionsHtml` 渲染嵌套资源，解决 `[object Object]`；随后 `b8213f7` 自动 bundle 已在远端。
- 清理规划过时状态：8.13.21 基线、BF6 publish pending、H2 留待 8.13.23、旧启动指令均改为完成/历史状态。
- backlog 复核：实施项已完成；DM9 为明确归档的孤儿 App.vue 条目；门禁/实机列表保留为未来相关改动的回归模板。
- 当前进入待命维护状态：暂无已排期的新功能或缺陷；新任务须从最新 `origin/main` 新建 worktree/阶段。
- 5 项 untracked 用户文件保持未处理。

## 会话：2026-07-15（Phase 5 · backlog 全面清理）

- **归档/文档化 15 项**：H2(风险四套语义)/C2.4(DB-only)/M8(owner)/M10(解析链)/L4/L5/L9/SM1/SM3/SM4/DM4/DM9/DL5/SL3/WB-06
- **规则/提示词修改 7 项**：L3(sp_start 限制)/M5(双路径禁写)/DM1(字数统一)/DM5(同步方向)/DL1(14表编号)/DL2(编号规则)/SL1(角色描述)
- **代码改动 5 项**：M9(normalizer ARRAY_APPEND_PATHS 移除行动建议等)/DM2(adapter 9列枚举别名)/SM2(anchor required)/DM4注释/SL2注释
- **数据改动 3 项**：DM3(种子行)/DM6(updateNode)/DL4(chronicle note)/DL6(三表 SQL 示例)
- **门禁修正**：verify-table-change-adapter 测试用例"极高"改为"超级无敌危险"（因 DM2 别名已覆盖"极高→致命"）
- **门禁**：`pnpm verify:mfrs-gates` 全绿；pin 落后 HEAD 软警告（无 dist 变更，预期）

## 会话：2026-07-15（8.13.22 发布完成）

- **publish-card**：`pnpm publish-card 神秘复苏模拟器发布版` 成功；内置 G1 dist freshness + release PNG 门禁通过。
- **发布后验证全绿**：
  - `pnpm verify:mfrs-dist-freshness`：PASS
  - `pnpm verify:mfrs-gates`：6/6 PASS（initvar-schema/regex-ids/RH5-scoped/hotfix/output-cleaning/table-adapter/release-png）
  - `node scripts/verify-mfrs-release-png.mjs --json`：version=8.13.22、refs=7、cache=8、regex=33、scripts=8、chara+ccv3 一致
  - 不含 localhost/127.0.0.1/@main
- **发布提交**：`e568cce7dd7a5f41537c879976160de160272a8a`（12 文件，精确暂存）
- **bot bundle**：`6f336f3ec94e03bab15e1b35af773cf03a785b76`（仅 dist 状态栏 module-id，符合预期）
- **标签**：`v8.13.22` → `e568cce`，本地+远端确认
- **backlog 清理**：RH5 已完成；C1.3 publish-card 镜像验收关单；DL3 并入 H9 关单；DM9 孤儿 App.vue 归档；WB-06 W2 自锁部分关单（冷启动问题拆独立项）；M7 直接回归验证通过关单；M5/SM2/DM6 保持 open 符合源码事实；H2.2/SM1/SL3/DL5 改写指向 live owner

## 会话：2026-07-14（8.13.22 Phase B · 元数据与发布记录准备）— **历史记录：当时 implementation complete / publish pending；现已发布**

- **恢复与任务 1–4**：37 个用户文件误入历史提交后已由前序阶段恢复为 untracked，并建立备份分支 `backup/pre-release-recovery-v8.13.22-bd75694-20260714-01`；BF6/RH5 功能链已进入 `main`。
- **最终候选**：`CDN_REF=158dcc29107fe17db1a89b8ca6e92585c2acbe8b`（已 push，`origin/main` 可达）。`4fcd23c` 是 RH5 后 bot bundle；`158dcc2` 在其后补齐 production 状态栏 dist，故选后者。该纯 dist push 不会触发后续 `[bot] bundle`，因为 `bundle.yaml` 忽略 `dist/**`。
- **元数据**：常量版本改为 `8.13.22`，cache=`v81322_20260714_01`；开发版 `index.yaml` 版本同步，7 个项目资源 ref 与 8 个 cache marker 全部统一。
- **文档**：创建 `RELEASE_8.13.22.md`；同步 README、backlog、task plan、findings/progress。`task_plan.md` 第 18 行用户预存的 `Phase 5` 修改原样保留。
- **门禁事实**：旧 pin `f2b7db2` 下 freshness 预检失败（committed dist 已更新）属预期；功能 gates 已通过。未运行完整 gates；发布版 YAML/PNG 仍为 8.13.21，待 publish-card 后由 verification 代理做最终门禁。
- **保护与反模式记录**：本轮元数据及发布文件尚未提交/推送/tag；Phase B 曾误执行一次 `publish-card --dry-run`，没有写入、没有 build，属已发生的反模式，后续不再重复。未修改发布 PNG、发布版 YAML 或 dist；未启动/停止 watch；37 个 untracked 文件保持原哈希。

## 会话：2026-07-13（BF6 批 β 续 · RM9/RM1/RM2 显示正则）— **实机验证通过（commit `4ffc47f`）**

- **RM9（done）**：召回索引块（`[不发送]去除` + `[显示]隐藏` 两条）结尾锚 `(?=\n\s*#\d+|$))` → `(?=\n\s*#\d+)|(?=\n\s*\n)|$)`。未闭合 `<supplement>` 时按「下一编号 / 空行段界」停，不再吞到 EOF 删掉后续正文。
- **RM1（done）**：裸 choices（…2014）+ 裸 JSONPatch（…2015）尾 lookahead 加入 CJK `[一-鿿]`——协议块后直接跟中文正文时仍能剥离。
- **RM2（done · 方案 A 正则近似）**：高亮 #6 加①值区负向后视（`标签：值` 的值不高亮）②标签名负向前瞻（行首标签名前缀+近冒号不高亮）。摘要块内 `复苏/鬼域/拼图/灵异物品` 等不再被 `horror-keyword` span 包裹。
  - **近似代价（可接受）**：正文若恰以 `事件：鬼域`/`位置：复苏` 这类摘要字段行起句会被抑制；正文极少如此起句。RM2 无 JS 高亮入口（纯 yaml 单正则），故用正则近似，未迁 JS 层。
- **实机验证**：全部经 chrome-devtools 从**改后真实文件**解析正则复验——正文高亮数正确、摘要块整块无高亮、行首/对白/逗号叙事正常高亮；RM9/RM1 前次已绿。
- **门禁**：`pnpm verify:mfrs-gates` 6/6 绿（regex count=33 uniqueIds=33 双版本；release-png 过；P2 软警告 exit 0）。**显示正则，无需重建 dist**。BF6 未发版（累积至 8.13.22）。

## 会话：2026-07-13（BF6 批 β 续 · RM7/RH3 运行时清洗）— **实机验证通过（含 bug 修复）**

- **RM7（done）**：`cleanProtocolBlocks` 追加删除 `<draft>`/`<pacing_rules>`/`<修改确认>`/独立 `<JSONPatch>` 块，止残渣回传 AI。仅删闭合标签块；英文/外语调试摘要不删（避免误删正文英文对白）。
- **RH3（done）**：`recoverRecentRawProtocolMessages` 补写 MVU 后加 `cleanProtocolBlocks(index)`，导入旧档也清洗 mes；snapshot 幂等保 raw。
- **⭐ 实机验证抓到并修复真 bug（chrome-devtools 运行时注入验证）**：
  - `<修改确认>` 中文标签用 `\b` 匹配**失败**（中文非 `\w`，word boundary 不成立）→ 块删不掉。已改为 `<修改确认(?:\s[^>]*)?>` 去 `\b` + 属性容错。draft/pacing 是 ASCII，`\b` 正常无需改。
  - 修复后 devtools 复验：12 项全绿——6 类协议块（draft/pacing/修改确认[含带属性]/独立JSONPatch/choices/UpdateVariable）全删；4 类正文（中文头/英文对白/本轮摘要/结尾）全留；无残留标签。
  - RH3 验证：新旧档首次快照写 raw+清洗 mes+正文留 ✓；已有 raw 时快照幂等不覆盖 ✓。
  - **注**：真机 CDN pin 仍是 8.13.21（f2b7db2，不含 RM7/RH3），故用本地 production 源码的清洗链在 devtools 运行时验证，未改用户卡、未发版。
- **验证价值**：静态门禁（G5/mvu-hotfix）测不到运行时清洗，实机验证在提交前抓到中文 `\b` bug。
- **production dist 重建**（eval=0）；`pnpm verify:mfrs-gates` 6/6 绿。提交仅含 hotfix src+dist+progress（状态栏 html 的 module-id 噪声已弃）。BF6 仍未发版。

## 会话：2026-07-13（BF6 批 β 低风险子集 · RM8/RH4）— **done（未发版）**

用户选"先做低风险子集"（不改运行时清洗行为）。

- **RM8/RH4（done）**：hotfix 清洗白名单 ↔ 显示正则同步守护。
  - `hotfix-generation-ended-listeners/index.ts`：cleanProtocolBlocks 前加互指注释（白名单 {sp_start,sp_input,mfrs_roll}，与显示正则 id …2025 同步）。纯注释。
  - `verify-mfrs-regex-ids.mjs`（G3）：加 `extractSpMfrsWhitelist` + `verifySpMfrsWhitelistSync`——从 hotfix 源与显示正则各提取白名单，断言**不变式 display ⊆ hotfix**（hotfix 可多列自闭合的 mfrs_roll）。任一方漂移→fail（防 RH6 式）。
  - 验证：插桩确认断言真执行（hotfixSet={sp_start,sp_input,mfrs_roll}）；**负向测试**：篡改显示正则加 sp_FAKE→G3 exit=1 fail，还原→pass。聚合门禁 6/6 绿。
  - **副发现（已记 backlog）**：hotfix 白名单含 mfrs_roll 而显示正则 #10 不含属**无害**——掷骰条实际输出自闭合 `<mfrs_roll .../>`（成对匹配的显示正则天然不碰）；文档里的成对 `<mfrs_roll>` 全是行内代码引用非协议。
- **留下一批（改运行时清洗，需实机验证）**：RM7（hotfix 补删 draft/pacing/修改确认/JSONPatch 残渣）、RM9（`$` 兜底截断勿删到尾）、RH3（导入旧档补洗）、RH5（收窄 #19–22 英行改写）、RM1/RM2。
- **待办**：hotfix .ts 仅注释改动，dist 重建留发版前统一做（G1 强制 production build）。BF6 未发版。

## 会话：2026-07-13（BF6 · P1 release-png 接入 publish-card）— **in_progress**

- **P1（done）**：`scripts/publish-card.mjs` 加 `verifyReleasePng(card)`——每卡 `runBundle` 后校验发布 PNG 的 version/ref/cache/regex/scripts 与 `mfrs-release-constants.mjs` 单真源对齐；失败 `die`。
  - 位置：仿既有 `verifyDistFreshness`（G1）；调用点在每卡 `if (!NO_BUNDLE){ runBundle(); if(!DRY_RUN) verifyReleasePng(card); }`。
  - 验证：`node --check` 通过；`--dry-run` 正确跳过（不改文件）；门禁真值测试——正常 exit=0 / 错 ref(`--expect-ref deadbeef`) exit=1；聚合 `verify:mfrs-gates` 6/6 全绿无回归。
  - 效果：发布链现自动拦"PNG 与 pin 不一致"，消除人工遗漏（原只 G1 自动）。
- **下一**：批 β 正则残余（RM7–9/RH3–5/RM1–2）。BF6 未发版。

### 追加（同会话）· P0/P2/P3 流程门禁质量项 — **done**

- **P0**（`verify-mfrs-dist-freshness.mjs` + `package.json`）：加 `--no-build` 只读模式（跳 `runProductionBuild`，仅比对 committed dist ↔ CDN_REF）；`--ref` 默认回退 `CDN_REF`；package script 带 `--no-build`。publish-card 仍传完整参数走 build 校验，未受影响。self-test 加 2 断言。
  - **副产发现（Low/无害）**：只读模式揭示仓库 HEAD 已提交 dist ≠ CDN_REF(`f2b7db2`) dist。字符级比对确认唯一差异是 webpack module-id `672↔248`（全局替换后字节全等，功能 100% 等价）；`[bot] bundle fcd4a82` 在 pin 后 3 分钟重建所致。线上 CDN 拉 pin 版，用户不受影响。
- **P2**（`verify-mfrs-release-png.mjs`）：加 `warnIfPinDivergesFromHead`——pin≠HEAD 时 `console.warn` 报落后提交数 + 非 bundle 数，**不 fail**（exit 0）。原设想的硬校验 `CDN_REF==HEAD` 会误伤"发版 pin 后又 bot bundle"正常态（P0 已证实），故改软警告。现状实测：warn "pin 落后 HEAD 4 提交含 3 非 bundle" + exit 0。
- **P3**（`verify-mfrs-initvar-schema.mjs`）：加 `resolveRef`（解本地 `$defs`/`definitions` 指针 + 防循环）；`schemaObjectKeys` 传 root 并解引用。当前 schema.json 的 3 个 `$defs` 均标量（number/string），无行为变化——前瞻防御，防将来 `$defs` 含 object 时假阴。
- 回归：`node --check` 三脚本 OK；各 self-test 过；`pnpm verify:mfrs-gates` **6/6 全绿**（release-png 带 P2 warn，exit 0）。未发版。

## 会话：2026-07-13（8.13.21 上线后只读审查）— **complete**

双路独立只读审查（主会话 + 子代理），**结论一致：8.13.21 可安全上线**。

- **A git**：本地 `main` behind origin/main 1 个 `fcd4a82 [bot] bundle`（可 FF）；工作树仅 dev PNG，哈希 = origin/main 完全一致（`b7696690…`，bot 产物非手改）；**无未提交业务代码**。
- **B 变更/硬约束**：范围 `d2f8ae7..077b0b2`；业务源码仅 3 txt（WM1 偏移 0–5 / WM2 引用 / L8 示例 `medium→investigate`+`死亡风险低`），余为新增只读门禁脚本。`index.yaml` 8 项**仅 pin 更新**（`de42f2c`→`f2b7db2`、cache `v81320`→`v81321`），名称/id/启用/顺序未动；正则 33 未动；`table-change-adapter.ts` 本体未改（DM8 是新增测试覆盖）。L8 改动合法（`类型`=z.string()、`死亡风险`枚举含"低"）。**4 条硬约束全未破坏**。
- **C 门禁**：`pnpm verify:mfrs-gates` **6/6 PASS**（initvar-schema rootKeys=36 / regex-ids 33-33 / mvu-hotfix / output-cleaning / table-adapter / release-png version=8.13.21 refs=7 cache=8 regex=33 scripts=8）。G1 dist-freshness 只读模式无法跑（缺 `--ref` + 内部 build）。
- **新增质量项**（入 backlog「BF5 上线后审查」区）：
  - **P1**（Medium）release-png 门禁未接入 publish-card/CI，靠人工
  - **P2**（Low）release-png `--from-publish-card` 自证式，抓不出常量写错
  - **P3**（Low）initvar-schema 校验对 `$ref` 子节点跳过 → 将来假阴
  - **P0**（Low）package `verify:mfrs-dist-freshness` 裸跑必错 + 内部 build，非只读门禁
- **下一步**：本地 `git pull` FF；用户重导 8.13.21 PNG；可选 8.13.22 = H2 + RM7–9/RH3–5，顺带 P1 流程加固。

## 会话：2026-07-13（BF5 门禁 G2–G5 + DM8）— **complete（门禁）**

- **G2** `verify-mfrs-initvar-schema.mjs`：initvar↔schema 36 根键 + 层级/C1 回归
- **G3** `verify-mfrs-regex-ids.mjs`：33 条 id 唯一 + 查找表达式可编译（dev+pub）
- **G4** `mfrs-release-constants.mjs` 单真源；publish-card / release-png 共用；`--from-publish-card`
- **G5** cleaning 扩：中英混排、长英文对白、双 UV、【警告】长正文、未闭合 sp_
- **DM8** adapter：characters/items/rules 插入+别名；禁删 collected_rules；items/characters 可删；非法枚举；混合 LENGTH 拒绝；chronicle 真模板
- 快修：**WM1** 偏移 0–5；**WM2** 交叉引用；**L8** medium→investigate + 摘要死亡风险
- `pnpm verify:mfrs-gates`；hotfix/cleaning/adapter/release-png 全绿
- 功能 commit：`ddd2676`；status dist pin：`f2b7db2`
- **8.13.21** pin `f2b7db2` / cache `…-v81321-bf5-gates`；G1 + release-png 通过
- **下一步：** 用户重导 PNG；继续残余 H2/RM7–9 等

## 会话：2026-07-13（BF4 世界书与清理 + 8.13.20）— **complete**

- **W1/M3**：148 伪路径清零（休眠锚点+规范）
- **W2–W4/M4**：死亡/摘要/选项蓝灯；短索引蓝灯+已启用路由；死亡裁定真源主线进度；事件MVU 去 UpdateVariable
- **WM3–8 / M1–2 / L6 / RH1 / DH2 / SH5 / C5**：见 backlog
- 功能 commit：`de42f2c`（含 production dist）已 push
- **8.13.20** pin `de42f2c` / cache `…-v81320-bf4-worldbook`；G1 + release-png 通过
- **下一步：** 用户重导 PNG → BF5

## 会话：2026-07-13（BF3 + 8.13.19）— **complete**

- **D2/DH1/DH3–5/DM7/S1/SH1–4/SH6** 源码 + production dist
- 功能 commit：`5b10525` 已 push
- **8.13.19** pin `5b10525` / cache `…-v81319-bf3-db-open`；G1 + release-png 通过
- **下一步：** 用户重导 PNG → BF4

## 会话：2026-07-13（BF2 协议/正则/发送 + 8.13.18）— **complete**

- **C6** raw extra：消息面板 + App.vue 优先读；hotfix 清洗后 `saveChat`
- **H4–H8 / RH6 / R1–R3 / RH2 / RM3–RM6** 见 backlog 勾选
- 功能 commit：`dc27b52`（含 production dist）已 push
- **8.13.18** pin `dc27b52` / cache `…-v81318-bf2-protocol`；G1 + release-png 通过
- **下一步：** 用户重导 PNG → BF3

## 会话：2026-07-13（BF1 H9/L1 + 8.13.17）— **complete**

- H9：旧打包 JSON 改名为 `.deprecated-2026-06-03` + `DO_NOT_IMPORT_PACK_JSON.md`
- L1：MagVar `@0.171.0`；mvu_zod `@0.3.446`；publish/verify 同步
- **8.13.17** `21fecba` dist / release push；G1 + release-png 通过
- BF1 仅余 C5 stub 清理（Low）

## 会话：2026-07-13（8.13.16 + BF1 C3/C4）— **complete**

- pin `CDN_REF=91154c7`；cache `v81316-bf05-core-mirror`
- 开发源 `index.yaml` 全脚本同 pin + C4 loader 双 `?` 修复
- publish 8.13.16；G1 + release-png 通过
- H9/L1 仍开

## 会话：2026-07-13（BF0.5 · H10 方案 B）— **complete（源码）**

### H10 决策：方案 B
- 不恢复 App.vue 加载
- 新增 `脚本/数据库前端/mvu-core-mirror.ts`：GENERATION_ENDED/MESSAGE_RECEIVED 后镜像 global/player/event/clue/行动建议
- 字段路径按 D3 修正；处理状态 `未接触→未处理`
- `界面/状态栏/index.ts` 孤儿注释

**待：** commit + production dist（数据库前端）+ 可选 8.13.16

## 会话：2026-07-13（BF0 · 变量与行动建议真源）— **complete（源码）**

### 阶段 BF0 — **committed `5eaa533`**

**改动：**
- C1+L7+M6：`initvar.yaml` 四键升根；姓名/开局地点 `''`；补 flags/`可见档案`/主线权限键
- C2：`schema.ts` + `schema.json` 扩展字段
- H1+D1+M11+H3：规则/系统提示/输出格式统一
- hotfix seed 同步；`AUDIT_BUGFIX_BACKLOG.md` 入库并勾选

**已完成后续：** push `5eaa533`；dist `107b3ff`；**8.13.15** publish（G1 通过，release-png pass）

**未做：** C1.3 旧打包卡；C2.4 可见摘要

**下一步：** 用户重导 8.13.15 → BF0.5 H10 或 BF1

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
