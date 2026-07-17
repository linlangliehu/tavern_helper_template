# 发现与决策 · 神秘复苏审计

## HUD-UX-NEXT · Phase 3 发现与决策（2026-07-17）

- 左栏需求只对应 `buildHudDossierHtml()` 的 `openPlayer` 按钮拼接；删除它不需要也不允许触碰玩家状态表、镜像、调查档案或通用全库处理器。
- 默认三栏原有 7 个键代表业务视图；模式切换不是第 8 个视图，因此 mode tools 必须放在 `nav` 外，以独立 group、展开图标、可见文字和明确 `aria-label` 呈现。
- 模式状态继续以 `hudImmersivePreferred` 为唯一真源；默认按钮复用 `toggleHudImmersive()`，沉浸反向按钮复用 `exitHudImmersive()`，保留首次自动沉浸策略和 `Ctrl+Shift+G`，不写 localStorage。
- 面板数据刷新可能替换按钮子树，不能只依赖瞬时 DOM 引用；决定在 `PanelFocusSnapshot` 中以稳定 `data-mfrs-mode` 保存模式控制焦点，并在新 panel 内恢复。进入沉浸聚焦反向按钮，显式退出优先回焦最新 AI 的默认入口，缺失时回退输入框。
- hot reload 可能复用旧 HUD shell；`migrateHudShellDom()` 必须幂等补齐按钮 class、ARIA/title、收起图标与“默认模式”文案，避免只有新建 shell 才获得新语义。
- 最新楼降级为历史楼时，短暂残留的 tri shell 不能继续暴露“沉浸模式”；在非 `.last_mes` AI 楼层隐藏 mode tools，并保留 click 层 latest 双重守卫。
- 52px 右轨扣除内边距后对四字模式标签过紧；桌面及 ≤900px 改为 60px，≤640px 保持全宽独立整行，所有模式控制维持至少 44px 点击目标。
- T3 不更新自动化脚本；archive-ui H7–H11 仍锁定旧“简版 + 完整面板按钮”契约，连同左栏精简和模式切换断言统一留给 T4，避免跨阶段顺手删断言造成门禁降级。

## HUD-UX-NEXT · Phase 2 发现与决策（2026-07-17）

- gacha 中栏必须保留稳定 host，不能在每次 `refreshHudBusinessPanels()` 时重写 slot；否则 `MFRS.mountPanel()` 内部的抽卡结果、折叠状态、滚动与事件所有权会被无关数据刷新销毁。决定只在 host 缺失时重建，其他刷新复用当前 root。
- settings 不只经 `setHudView('settings')` 进入，`openHudSettingsPanel()` 还有直接调用路径；仅在 `setHudView()` 清理会漏掉该绕行路径。因此 settings、全库/cabinet 与所有 teardown 入口都各自显式收口 `destroyHudGachaPanel()`。
- `mountPanel()` 的返回值属于外部 API 边界，不能只信任候选自报的 `ownerDocument`/构造器或结构字段。root 校验使用宿主 document 的可信 realm `Element`、原生 `Node.prototype.nodeType` getter、document identity 和 `parentElement === host`，拒绝伪造对象与错误宿主 root。
- 挂载失败后，普通 HUD refresh 不能持续重复调用同一个失败 API。决定记录失败时的 mount 函数 identity：同一 identity 自动熔断，显式重试可 force；数据库前端热更新为新函数 identity 后允许自动恢复。
- unmount teardown 必须先设置 `hudMounted=false`，再调用面板 `destroy()`；即使外部 destroy/关闭回调同步触发 `setHudView('story')`，也不能在卸载途中再次挂载或把已销毁 HUD 当作 active。
- T2 只更新消息内面板实现与 frontend 生命周期验证；archive-ui H7–H11 当前仍是旧“简版 + 完整面板按钮”契约，按计划在旧 H7 首败。该测试边界留给 T4 统一替换，避免在 T2 顺手删除断言造成覆盖降级。

## HUD-UX-NEXT · Phase 0 发现与决策（2026-07-17）

- 右侧 `gacha` 导航已有独立中栏 slot；当前 `buildHudGachaPanelHtml()` 生成卡池选择、单抽、十连、结果区和“完整面板”按钮，属于 8.13.36 的“部分嵌入”实现。
- “完整面板”按钮通过 `openHudGachaUi()` 转交数据库前端的抽卡面板能力；新需求应复用完整系统的既有实现，不能在消息内面板再复制一套业务逻辑。
- 左侧“打开全库 · 玩家状态”由消息内面板独立生成；计划目标仅移除该入口，保留玩家状态表、数据库镜像、全库编辑和其他表入口。
- `verify-mfrs-archive-ui-regressions.mjs` 的 phase5 H7–H10 当前把“中栏部分抽卡 + 保留完整面板按钮”写成硬契约，实现时必须同步替换为新的完整面板中栏契约。
- 当前主工作树的 10 个 dist 修改来自已恢复的 watch，规划与后续实现都不得把这些 dev 产物误当业务源码提交。
- `showGachaPanel()` 当前把 `.acu-edit-overlay` 直接追加到 body，且 `MFRS.showPanel` 无参数、无返回句柄；简单调用不能满足“中栏直接完整面板”。决定先在数据库前端增加 `MFRS.mountPanel(container, { onClose }) -> { root, destroy }`，overlay 与 embedded 共用同一 renderer。
- 完整面板包含余额、chat scope、导入/导出/重置、自定义卡池、残屑商店、经济、保底、卡池、单抽/十连、结果、历史与详情；中栏方案必须保留这些能力，而不是放大旧简版。
- 默认三栏已有 7 个业务导航键；模式切换应作为导航下方独立工具按钮，避免伪装成第 8 个业务视图。沉浸顶栏现有退出按钮作为反向“默认模式”入口。
- 模式切换复用现有 `hudImmersivePreferred`、`toggleHudImmersive()`、mount/unmount 与 `Ctrl+Shift+G`；本轮不改变首次自动沉浸，不增加 localStorage。
- 玩家状态按钮只存在于 `buildHudDossierHtml()` 的 `openPlayer` 拼接；删除该按钮不需要、也不允许删除玩家状态表和通用全库处理器。
- 详细实施与验收计划见 `docs/mfrs-redesign-phase0/PLAN_HUD_UX_NEXT.md`。
- 实施任务已拆成 `TASKLIST_HUD_UX_NEXT.md` 的 T0–T7 共 44 项；T0 先用 `[skip ci]` 提交规划文件，再从更新后的 `origin/main` 新建 worktree，避免当前 watch dist 污染实现分支。


## 沉浸 HUD 中栏发布结论（2026-07-16）

- 功能分支含 3 个已推送提交：`7155b09`（Task #1/#2/#5）、`a8244ae`（Task #3/#4）、`116612e`（真页发现的精确字段匹配修复）。
- production dist 提交为 `9c5a467a34818ed4a4bd758e3ce6b76f160a1d3f`；已在远端可达并作为最终 `CDN_REF`，G1 production 重构建与只读 freshness 均一致。
- release constants 与角色卡已统一为 **8.13.36** / `9c5a467a3481…` / `v81336_20260716_01`。
- release 提交 `0726289` 已推送功能分支并 fast-forward 到 `main`；GitHub Actions 随后生成 bot bundle `296c14cd`，`origin/main` 与 tag `v8.13.36` 均指向该 bundle，这是仓库 autotag 的正常发布形态。
- 最终发布物只能由 `pnpm publish-card 神秘复苏模拟器发布版` 生成，不手改发布版 YAML 或 PNG。
- 2026-07-16 最终 CDN 实测：发布卡中的 7 个 `testingcf.jsdelivr.net` URL 全部 HTTP 200，下载字节 SHA256 与本地 `dist/` 对应文件逐项完全一致。
- 2026-07-17 源码复核：`verify:mfrs-gates` 7/7、archive-ui phase5 232 checks、数据库前端 P3、release PNG 与 dist freshness 全部通过；release 后无未提交业务源码。

## 需求
- 审查角色卡：脚本、MVU、EJS、系统提示词
- 再审未覆盖：正则、SQL、开局/欢迎、世界书规则/锚点
- 缺陷入待修清单；**BF6 已发 8.13.22**（`e568cce`，tag `v8.13.22`）；下一阶段 Phase 5 backlog 清理
- 用 planning-with-files 便于新会话续做

## 架构事实（UI / 数据）

| 看见的 UI | 代码位置 |
|-----------|----------|
| 全屏 HUD / 七键 / 行动建议 | `脚本/消息内面板/index.ts` |
| 底部固定槽 | `脚本/固定状态栏/index.ts` |
| 状态栏 Vue | `界面/状态栏/App.vue` |
| 全库/ACU | `脚本/数据库前端/`（stub：`神秘复苏数据库前端/`） |
| 主题 | `脚本/界面美化/index.ts` |
| 协议清洗/发送解锁 | `脚本/hotfix-generation-ended-listeners/` |
| 数据/规则 | 世界书、系统提示词、MVU、SQL — **不画 UI** |

协议意图：正文 → `【本轮摘要】` → `<choices>` → `<UpdateVariable>`；显示剥离协议；交互靠 HUD/DB。

## 一轮发现（脚本/MVU/EJS/提示词）

### Critical
- **C1** `initvar.yaml` 把 `规律推理记录/最近行动判定/行动建议/在场人物` 嵌在 `当前灵异事件` 下；schema 在根
- **C2** schema 无：行动建议死亡/复苏风险、判定触发项/资源代价/后续建议、确认等级 → Zod strip
- **C3** 开发 `index.yaml` CDN `@47a5fe5` vs 发布 `@28777ad`
- **C4** `import(url?t=)` 在已有 `?v=` 上叠第二 `?`
- **C5** 可能加载瘦 stub「神秘复苏数据库前端」而非完整「数据库前端」
- **C6** hotfix 先剥 choices/UV；状态栏只读 mes 不读 `extra._mfrs_raw_protocol_message`

### High（摘要）
- H1 行动建议 恰好4 vs 规则 0–4
- H2 风险：choices 数字 / MVU 枚举 / 旧 risk 标签三套
- H3 系统提示骨架弱于变量输出格式
- H4 hotfix 监听可重复注册
- H5 每轮 forceRecoverSendUi 过激
- H6 清洗后假空生成
- H7 消息面板不解析 choices 主格式
- H8 seed 仅 2 路径
- H9 源与打包卡协议漂移

### EJS
- 仅 `世界书/变量/变量列表.txt` 有 EJS；无 getvar 族
- 摘要在 double-nested stat_data 时可能显示 0；无 try/catch

## 二轮发现（正则/SQL/开局/世界书）

### 正则 R*
- **R1** 英/外「调试」正则按 corridor/risk/choices 等删整段英文正文
- **R2** `【选项】` 标题过宽，吞后续叙事
- **R3** 未闭合 thinking 的 `$` 吃到 EOF
- **RH2** 正则 id `…2004`/`…2005` 开局渲染与思维链冲突
- 保持 OFF：#18 #24 #30 #31 正确

### SQL D*
- **D1** action_suggestions 固定 4 行 vs MVU 0–4
- **D2** MVU `未接触` ∉ DB handling_status enum → 误映射调查中
- **D3** App.vue 镜像读 `世界压力`/`死亡人数` 错路径；应为 `主线进度.世界压力.*` / `已死亡人数`
- DH：检定建议无 MVU；人物列文档≠DDL；驾驭字段名不一致；收录枚举漂移；缺 A–D 种子行

### 开局 S*
- **S1** fillWelcomeStart 无必填校验
- 第一条消息种子 ≠ 真实表单；身份 value 过长；缺明确 patch 路径；欢迎页与 live 表单双源

### 世界书 W*
- **W1** 规范+多锚点：`规律推理记录.已公开现象` 等伪路径（数组当对象）
- **W2** 关键规则多绿灯，非常驻
- **W3** 常驻短索引指向 `启用:false` 条目
- **W4** 死亡裁定 `剧情阶段` vs `主线进度.当前阶段`

## 技术决策

| 决策 | 理由 |
|------|------|
| 扩 schema（C2A）优先于砍提示词 | 示例/SQL/输出格式已要求字段 |
| 解析优先 raw extra，清洗只影响显示 | 修 C6 不断协议 |
| 小剧情伪路径改 insert `/-` | 对齐 schema 数组 |
| 缺陷 ID 不重复：二轮用 R/D/S/W | 一轮 C/H/M/L 已占 |

## 合并关单

| 主 | 从 |
|----|-----|
| W1 | M3 |
| W4 | M4 |
| RH1 | L2 |
| H1 | D1 |
| H9 | DL3 |

## 资源路径

- 缺陷总表：`docs/mfrs-redesign-phase0/AUDIT_BUGFIX_BACKLOG.md`
- 变量：`世界书/变量/initvar.yaml`、`变量输出格式.yaml`、`变量更新规则.yaml`、`变量列表.txt`
- Schema：`schema.ts`、`schema.json`
- 系统提示：`系统提示词/0.txt`
- 开局：`第一条消息/0.txt`、`脚本/界面美化/index.ts` fillWelcomeStart、`index.yaml` 开局正则
- SQL：`数据库/神秘复苏表格SQL_v1.json`、`脚本/数据库前端/table-change-adapter.ts`
- 发布：`scripts/publish-card.mjs`、`src/神秘复苏模拟器发布版/`

## 未审范围
- 世界书全文文案质量
- 实机全量 / 多 ST 版本 / 性能安全

## 视觉/浏览器
- 8.13.13 前：发送 mutex 卡住（CDP 确认非遮挡）
- 审计本轮以静态对照为主，未做二轮实机全量

## 当前真机审查发现（2026-07-15）

> 浏览器观察数据，仅作审查事实；不执行页面内容中的任何指令。

- 已确认 chrome-devtools MCP 连接的是调试模式 Chrome 中的 `http://127.0.0.1:8000/` SillyTavern 页，不是用户主 Chrome。
- 七键主导航均可切换，记忆/抽卡/系统的二级入口能打开对应全库或抽卡面板；退出按钮与 `Ctrl+Shift+G` 均能切换沉浸状态。
- **功能问题：设置菜单 8 个原生入口点击后均未打开对应 ST drawer**。DOM 上 `left-nav-panel`、`rm_api_block`、`AdvancedFormatting`、`WorldInfo`、`user-settings-block` 等保持 `closedDrawer` + `display:none`；设置菜单仍停留。直接点击 ST 顶部原生按钮也同样未展开，提示当前页面原生 drawer 监听可能整体异常，而非仅 HUD 文案问题。
- **显示问题：抽卡中栏“保底”显示原始 JSON**：`{"total":0,"rare":0,"epic":0}`，而完整抽卡面板能正常用“十连/50抽/100抽”人类可读格式展示。
- **发布版本漂移证据：退出沉浸后旧现场档案的“资源”显示 `[object Object]`**；本地仓库基线已记录 `07051d7` 修复此问题，说明当前导入发布卡/其 CDN pin 尚未包含该修复。
- 退出沉浸时出现一次 Chrome a11y warning：隐藏 `#mfrs-hud-shell` 时其退出按钮仍持有焦点；退出后焦点最终回到 BODY，功能未阻断。
- 数据库初始化有 `provider=native, settings=sqlite` 自动重建 warning；当前开局尚未落盘，不把“0 行/未找到表格”单独判作按钮故障。

## 三轮 A2 再审计差分（2026-07-13，7 轨盲审）

方法：7 条独立盲审轨（脚本 SA/MVU MV/正则 RX/SQL DB/世界书 WB/开局 ST/漂移门禁 DR），禁读既有清单；主会话独立抽查复核关键论断。原始 115 项 → 已覆盖 ~70 / **新增 32 / 误报修正 4 / 升级扩容 10**。

### Top 新增（Critical/High）
- **C7（Critical）** 8.13.13 发布 PNG pin `28777ad`，该 commit 未重建 dist → **always-unlock 修复未实际交付**（dist@28777ad 无标记；修复 bundle 在发布后的 f692384，无发布物指向）。verify-release-png 只验 PNG 内自洽，验不出。→ BF-1 最优先重发版 + G1 门禁
- **H10（High/决策）** App.vue 状态栏是**发布链孤儿**：无 iframe 注入正则、tavern_sync 不处理 界面/、唯一加载器在 6月3日旧打包卡（localhost）→ C6.1/D3/H2.2/DM9 等全是死代码上的 bug；MVU→DB 核心镜像**零 owner**。先决 BF3
- **RH6（High）** 掷骰条被自家 hotfix 击杀：cleanProtocolBlocks 在 MESSAGE_RECEIVED 永久删 mes 中 `<mfrs_roll/>`（index.ts:493-495），先于 #27 渲染正则 → 掷骰 UI 永不出现
- **SH6（High）** 开局提交按钮无内联 onclick 兜底（厉鬼加减反而有）→ CDN 失败=表单可填不可交
- **M11（High 批）** 死亡链断裂：is_dead 无人教写（<death/> 全库零出现）；死亡写集三文档不一致；模拟结束 ∉ 阶段状态 9 值域

### 误报/修正
- **C5 误报关闭**：两版 yaml 第7项 URL 解码=完整 数据库前端/index.js；stub 无入口引用（降 Low 清理）
- **C4 降级 C→M**：jsDelivr 忽略多余 query，双 ? 只废缓存穿透不碍加载
- **SA-01/02 定性纠正**：消息内面板 404 与 parseMessage(i,{}) 错签名均为**开发版 pin** 问题（发布 pin 28777ad 文件在、签名对）→ 并入 C3 证据
- **W1 降紧迫**：5 锚点条目全 启用:false + 模板孤儿 → 伪路径休眠（~148 处），"启用前必修"
- **DR-04**：工作区 dist 是 src 的 dev-mode rebuild（eval+sourcemap），非手改，src 不落后 → progress 备忘关闭；但**勿直接提交**，发布前先 production build

### 值得记的机理证据（修复时用）
- util/mvu.ts:23,39-57：状态栏 2s 轮询 Schema.parse 后**回写** → schema 外字段被物理删除（C2 更严重论据）
- MagVar 证据链：hotfix:203 注释 replace 需路径已存在；protocol-normalizer.js:95 MVU 无 add op
- 风险表示实为 **4 套语义**+单位分裂（X/100 vs X%）；总复苏风险 op：示例教 replace 绝对值 vs 规则教 delta（H2 扩）
- 事件MVU联动触发词 `UpdateVariable` 被 #1 正则从 prompt 剥离 → 绿灯触发词自锁死环（W2 扩）
- 恐怖程度 75 处 vs schema 恐怖等级 0 处引用（WM6，主会话复数）
- `<<START>` 分隔符多一个 `<`（字节级验证，L6）
- 全部世界书条目 递归双禁 → 条目间无法互相拉起，放大 W2/W3
- 开发 yaml pin 内部错位：hotfix @1fa42d8/phase164 vs 其余 @47a5fe5/phase163
- 打包卡量化：9 条旧正则/342 条世界书(期望383)/3 localhost 脚本/Analysis×4/推演选项×17（H9 扩）

### 门禁盲区 → G1–G5（BF5）
G1 dist 新鲜度（C7 根因）；G2 initvar↔schema 结构校验（字符串 grep 漏 C1）；G3 正则 id 唯一+可编译；G4 release-png 期望值与 publish-card 自动对账；G5 清洗样例扩充（混排/多 UV 块/流式未闭合）。
其余盲区：打包卡游离门禁、世界书 文件: 路径合法性、crud-plan-parse 与 vendor 复制体同步、开局必填。

全量明细：`AUDIT_BUGFIX_BACKLOG.md`「三轮 A2」区 + `.tmp-research/a2-diff-workbench.md`（临时工作台）。

## 8.13.29 发布后维护发现（MAINT-29，2026-07-15）

### MAINT-29-01 · 黄金储备正式路径遗漏

- **事实**：schema / initvar 的正式字段是 `灵异资源.黄金储备`；旧资源 builder 只回退读取 `灵异资源.黄金`、`灵异资源.鬼钱` 与顶层 `黄金`。
- **影响**：标准数据只包含 `黄金储备` 时，黄金项会被判空，资源区可能消失；这与此前“嵌套对象显示 `[object Object]`”是不同层的问题。
- **修复**：正式路径置于最高优先级，旧 alias 全保留，继续走 `formatResourceField()` 与 HTML escape。
- **验证**：archive-ui phase5 加路径优先级断言；真实 SillyTavern 加载本地 production bundle 后显示“黄金 未准备”，无 `[object Object]`。

### MAINT-29-02 · drawer watcher 自重入与破坏性恢复

- **根因链**：`scan → yield → schedule` 可自重入并产生多轮 burst timer；单次瞬时 inactive 会立即走恢复；恢复路径会主动关闭 drawer/SP；旧 RAF/timer 又没有动作代际隔离。drawer 切换的短暂空窗因此可能在约 1 秒后被旧回调误判并关掉新面板。
- **附加兼容问题**：HUD selector 有时命中 `.drawer-toggle` 本身、有时命中其图标子元素或 drawer 父容器；仅向单一方向找 toggle 不能覆盖 8 个入口。
- **修复不变量**：
  - canonical drawer selector 同时驱动 CSS 抬层与运行时检测；
  - 新动作以单调 epoch 使旧回调失效，burst timeout 由 Set 持有并统一取消；
  - opening grace 覆盖切换空窗，inactive 必须经 stable-close debounce 再确认；
  - 自动路径只做非破坏性 release，只有“关闭面板”/Esc/unmount 等明确用户动作可主动关闭外部 UI；
  - toggle 解析检查 self / closest / descendant 三个方向。
- **验证**：archive-ui phase5 **212 checks PASS**，聚合门禁 **7/7 PASS**；ST 真机 8 个 drawer 均保持 >2.5s，快速切换 last-action-wins，原生关闭后 HUD 自动释放且不二次关闭，主动关闭路径仍正常。

### 发布结果

- **8.13.31 已发布**（release `4c94a4e`；CDN_REF `8ee8c58` / cache `v81331_20260716_01`；tag `v8.13.31`）。
- publish-card 门禁通过：G1 dist 新鲜度 ✓；release-png version=8.13.31 refs=7 cache=8 regex=33 scripts=8 ✓。

## 当前状态快照（2026-07-17）

- **审计与历史发布**：BF0–BF6、Phase 5、8.13.29、8.13.31 与沉浸 HUD 中栏改造均已完成。
- **当前发布版本**：**8.13.36**（release `0726289`，CDN_REF `9c5a467a3481…`，cache `v81336_20260716_01`，tag `v8.13.36` → bot bundle `296c14cd`）。
- **当前任务状态**：HUD-UX-NEXT 的 T0–T3 已完成（20/44），T4 自动化契约更新 pending；archive-ui 旧 H7–H11、左栏精简和模式切换断言均留 T4 更新。
- **工作区保护**：主工作树既有 dirty/untracked 用户文件不纳入本任务。

## 8.13.22 发布结论（历史）

- **恢复结果**：误纳 37 个用户文件的旧发布提交已隔离到 `backup/pre-release-recovery-v8.13.22-bd75694-20260714-01`；共享 `main` 已恢复到干净功能链，37 文件继续保持 untracked。
- **任务 1–4**：BF6 功能与 RH5 范围修复已进入 `main`；`[bot] bundle` 后补做状态栏 production rebuild，最终候选为 `158dcc29107fe17db1a89b8ca6e92585c2acbe8b`，且在 `origin/main` 可达。
- **门禁事实**：发布前后门禁均已完成并通过；发布 PNG 最终确认 version=8.13.22、refs=7、cache=8、regex=33、scripts=8。
- **无 post-dist bundle**：最终候选 `158dcc2` 本身只重建 production 状态栏 dist；`bundle.yaml` 对 `dist/**` 配置 `paths-ignore`，因此纯 dist push 不会再触发 `[bot] bundle`。直接以该远端可达 commit 为 CDN_REF，避免 pin 到更早的 `4fcd23c` 而漏掉最终状态栏产物。
- **Phase B 元数据与发布物**：`RELEASE_VERSION=8.13.22`、cache=`v81322_20260714_01`；开发/发布 YAML、PNG 与 release 记录均已由 publish-card 完成并验证。
- **Phase 5 结论**：H2、M5/M7–M10、DM1–6/DM9、DL*、SM*、C1.3 等已完成、验证或明确归档；暂无遗留的已排期实现项。

---
*新会话：先读 task_plan.md → 本文件 → progress.md → AUDIT_BUGFIX_BACKLOG.md*
