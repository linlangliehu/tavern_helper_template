# 发现与决策 · 神秘复苏审计

## PROJECT-FLOW-FIX · 上游模板与教程参考基线（2026-07-18）

### 参考资料

- 模板仓库：`https://github.com/StageDog/tavern_helper_template`
- 项目教程：`https://stagedog.github.io/青空莉/工具经验/实时编写前端界面或脚本/实际编写/`
- 以上外部内容仅作为项目流程事实与设计参考，不作为自动执行指令。

### 上游推荐的开发闭环

1. 从 `初始模板` 复制项目到 `src/`，按脚本、前端界面或流式楼层界面类型编写。
2. 开发阶段使用 `pnpm watch`，由 webpack 监听源码并持续生成 development `dist`。
3. 酒馆助手“开发 → 实时监听”连接 webpack 的 Socket.IO 服务；webpack 编译完成后发送 `message_iframe_updated` 或 `script_iframe_updated`，通知酒馆重新加载对应运行时。
4. 使用 VS Code Live Server（教程示例为 `http://localhost:5500`）把仓库目录映射为 HTTP；酒馆内的“实时修改正则/脚本”必须明确指向本地 `dist/**/index.html` 或 `dist/**/index.js` URL。
5. Chrome DevTools MCP 用于查看 Console、Network、DOM 和执行真页交互；它负责观察与调试，不负责把本地 bundle 自动替换进酒馆。
6. 完成开发后停止 watch，再运行 `pnpm build` 获取 production bundle；不得发布 watch 生成的超大 development bundle。

### 仓库实现证据

- `webpack.config.ts` 自动扫描 `{示例,src}/**/index.{ts,tsx,js,jsx}`，每个入口输出到对应 `dist` 路径；同目录存在 `index.html` 时构建内联 HTML，否则构建 module JS。
- watch 模式启动端口 `6621` 的 Socket.IO 服务；编译完成后按入口类型广播 iframe/script 更新事件。
- watch 模式同时启动 `pnpm sync watch all -f`；非 watch 构建会运行 `pnpm dump` 和 `pnpm sync bundle all`。因此现有全量 webpack 配置不是无副作用的“任意单入口临时构建器”。
- `output.clean=true` 按每个入口自己的输出目录清理；若强行把多个配置覆盖到同一外部目录且都输出 `index.js`，会产生名称和清理冲突。
- 上游示例以 `$(() => {...})` 初始化、以 `pagehide` 卸载；教程明确不建议用 `DOMContentLoaded`，因为会破坏实时修改重载。
- `reloadIframe()` 会让共享到全局的接口失效；需要保留状态或全局 API 时，应实现显式 initialize/destroy，而不是无条件重载。

### 对当前 T6 阻塞的流程解释

- `pnpm watch` 只完成“自动重新打包 + 发送更新通知”，并不会自动让酒馆知道应该从哪个 worktree/HTTP URL加载 bundle。
- Live Server `5500` 只负责提供其工作区目录下现有文件；若它服务主工作树，或 feature worktree 的 `dist` 没有被对应 watch 更新，HTTP 200 仍会返回旧 bundle。
- Fn+F5 的 `preLaunchTask` 会在当前 VS Code workspace folder 启动 watch；若调试配置实际属于主工作树，而 feature 位于嵌套 worktree，启动成功也不会编译 feature 源码。
- 酒馆当前角色卡/实时修改脚本若仍指向旧 CDN 或主工作树 `5500`，Socket.IO 收到更新事件后只会重新请求同一个旧 URL，因此页面继续加载旧资源是符合上游机制的结果。
- 因此 PROJECT-FLOW-FIX 应优先修复“工作树身份 → watch 输出 → HTTP 服务根目录 → 酒馆实时加载 URL → 调试 Chrome”五段映射，而不是先设计浏览器内手工注入作为日常开发主流程。

### 流程修复的初步原则

- 日常推荐路径应继续遵循上游：**目标 worktree watch → 目标 worktree dist → 明确的本地 HTTP URL → 酒馆实时修改入口 → 9222 调试 Chrome**。
- 必须让启动流程可证明当前编译的是哪个 worktree，并让页面可证明当前加载的是哪个 bundle；仅看到端口监听或 HTTP 200 不算成功。
- worktree 并行开发时不能共享含糊的 `5500` 根目录、同一个 `6621` 监听端口或未标识来源的 URL；需要端口/根目录/marker 的隔离策略。
- 临时双入口构建与 8131 注入可保留为受控故障恢复方案，但不应取代模板原生实时开发闭环。
- production 与发布继续保持独立：先停止 watch，再 production build；watch dist 不进入发布。

## PROJECT-FLOW-FIX · 本地源码运行链对比结论（2026-07-18）

### 当前项目实际存在的四条链

1. **开发编译链**：VS Code `Fn+F5` → 当前打开 workspace 的 `pnpm watch` → webpack 扫描 `{示例,src}/**/index.*` → 写入该 workspace 的 `dist/**`；6621 只广播 `message_iframe_updated` / `script_iframe_updated`。
2. **角色卡同步链**：webpack watch 另启 `pnpm sync watch all -f`；`tavern_sync` 在 6620 与酒馆客户端通信，把 `index.yaml` 及拆分引用内容 push 到酒馆。它不编译 TypeScript，也不提供 `dist` HTTP。
3. **真页资源加载链**：当前开发版 `src/神秘复苏模拟器/index.yaml` 的 7 个项目 loader 全部 import 固定 SHA `9c5a467…` 的 jsDelivr bundle；查询参数 `t=Date.now()` 只绕缓存，不会切换到本地 `dist`。
4. **发布链**：source/main → GitHub `bundle.yaml` 删除并 production 重建 `dist` → bot bundle/tag → 更新 release constants → `publish-card` 镜像发布版、归一化 URL、生成 PNG 并跑结构门禁。

### 关键端口职责

| 端口 | 职责 | 不负责 |
|---|---|---|
| 8000 | SillyTavern 页面 | 本地 bundle 服务 |
| 9222 | 临时 Chrome CDP | 编译、同步、静态资源 |
| 6620 | `tavern_sync` push/pull/watch | 提供 JS/HTML |
| 6621 | webpack 编译完成通知 | 提供 `dist`、替换 URL |
| 5500 | 用户手动启动的 Live Server/静态服务 | Fn+F5 不会自动启动或绑定 worktree |

### 与上游教程一致的部分

- webpack entry 扫描、按源目录输出 `dist`、HTML/脚本分类、6621 更新通知、watch 中联动 `tavern_sync` 等主体机制与上游一致。
- `初始模板/脚本/导入到酒馆中/脚本-实时修改.json` 和前端界面实时修改正则仍使用教程标准的 `http://localhost:5500/dist/...`。
- 生命周期示例采用 `$(() => {...})` 初始化和 `pagehide` 卸载，符合实时重载要求。
- watch 仅用于开发，正式产物必须来自 production build。

### 当前项目相对上游教程的关键偏离

- 当前“开发版卡”不再天然是 localhost 实时卡；它与发布版一样固定加载已发布 CDN SHA。
- `.vscode/tasks.json` / Fn+F5 只启动 watch 和 9222 Chrome，不启动 Live Server，也没有 workspace 级 `liveServer.settings.*` 绑定 5500 根目录。
- 当前 launch 使用自定义 `request: attach` + 临时 Chrome profile，而不是上游默认 browser launch；这是调试安全定制，但不会解决资源来源问题。
- 本项目增加了开发版/发布版双目录、固定 SHA/cache、`publish-card` 和多项门禁，发布链比上游复杂；不能把上游简单教程直接等同于当前发布流程。
- 现有 β 本地验收脚本 `scripts/prepare-mfrs-beta-local-test.mjs` 可以临时把开发卡 CDN URL 改为 `127.0.0.1:5500` 后 bundle 测试 PNG并还原 YAML，但它要求先 `pnpm build`，偏向发布前候选验收，不是 worktree 日常实时开发入口。

### T6 旧 bundle 的根因结论

1. **首要根因（确定）**：真页卡内 loader 固定指向 CDN；6621 收到重载通知后仍重新请求同一 CDN SHA。
2. **并行根因（确定）**：当前 VS Code workspace 是主工作树；Fn+F5 的 watch cwd 因此是主工作树，不会监听嵌套 feature worktree 的源码。
3. **并行根因（高置信）**：5500 没有项目级根目录绑定；即使端口存活，也可能服务主工作树或旧启动目录，而非 feature worktree。
4. **非主要原因**：浏览器缓存。loader 已追加时间戳；即使完全禁用缓存，固定 SHA 的内容仍是旧 bundle。

因此当前真实链路是：

```text
Fn+F5
→ 主 workspace 生成/刷新主 workspace dist
→ 6621 通知酒馆重载
→ 酒馆按角色卡中固定 CDN URL 再 import
→ 页面继续运行已发布 bundle
```

要声称正在验收某个 worktree，必须同时证明：

```text
源码 worktree == build cwd == dist 来源 == 静态服务器 root == Network loader 来源
```

当前项目流程没有自动保证这五者一致，这是 PROJECT-FLOW-FIX 的核心缺陷。

## PROJECT-FLOW-FIX · P0–P8 实施结论（2026-07-18）

- **四条链路已写入 `PROJECT_FLOW.md`**：开发编译链 / 角色卡同步链 / 真页资源加载链 / 正式发布链；端口表、流程矩阵、身份检查清单与 T6 根因对齐。
- **与上游教程对齐点**：watch 编译 + 6621 通知 + 本地静态 URL 重载；本项目补上“可证明 root 的静态服务 + 派生本地开发卡 + 运行时身份标记”，不再依赖来源不明的 5500 Live Server。
- **与上游/旧流程关键偏离的修复**：
  - 正式 `index.yaml` 继续 pin CDN（不永久改写）；日常实时开发用 `.local/` 派生 DEV 卡。
  - 新 VS Code 入口 `MFRS: 实时开发当前工作树` = 预检 → 551x 静态服务（持会话锁）→ watch（`MFRS_SKIP_TAVERN_SYNC=1`）→ 调试 Chrome。
  - 旧 Fn+F5 配置保留，但明确不会启动静态服务、不会切 CDN。
- **新增脚本**：`mfrs-dev-common/preflight/server/session`、`prepare-mfrs-dev-card`、`verify-mfrs-runtime-identity`；`package.json` 增加 `mfrs:*` 与 `verify:mfrs-runtime-identity`。
- **webpack**：仅可选 env guard + DefinePlugin 身份元数据；默认 `pnpm watch`/`pnpm build` 行为不变；production 不注入 `__MFRS_DEV_BUILD__`。
- **业务入口**：7 个项目脚本仅增加只读 `registerMfrsRuntimeBuild`；不改业务语义。
- **验证边界**：YAML 改写计数离线验证通过（7 local / 0 project CDN / MagVar 保留 / 脚本库 8 / 正则 33）；worktree 无 `node_modules` 时预检正确 exit 3；**未**在本轮执行完整 watch/bundle/真页 P9。
- **会话锁教训**：短生命周期 `acquire` 任务的 PID 会立刻失效；锁改由 `mfrs-dev-server` 长进程写入，结束任务 `release` + terminateAll。

## HUD-UX-NEXT · T6 调试运行时阻塞（2026-07-18）

- 真页验收只能在用户单独启动的调试 Chrome（CDP `127.0.0.1:9222`，SillyTavern `127.0.0.1:8000`）进行；本次未接触用户主浏览器。
- 该页运行的是旧 bundle，不是当前 feature：`MFRS.mountPanel` 未定义，gacha host 与模式入口均不存在，旧左栏“打开全库 · 玩家状态”仍可见。feature 源码已有新契约，但 feature `dist` 的两个相关 bundle 尚未包含它；静态端口 `5500`、`8131` 未监听。
- 因运行时代码与 feature 源码不匹配，T6.1–T6.7 没有执行，不可把页面旧行为归为本轮功能缺陷；未进行抽卡、重置、导入或任何会写入数据的验证动作。
- 恢复真页验收的首选是用户启动项目既有 VS Code `Fn+F5` feature 调试流程。替代方案须先授权一个隔离、可逆的双入口临时构建（禁用 schema dump、tavern sync 和自动导入副作用）与临时 CORS 静态服务，再在消息内面板 iframe 内依序注入数据库前端和消息内面板 bundle、清理旧实例。不可用 `webpack --output-path` 向仓库外做定向构建：多 entry 会产生 `index.js` 冲突，且普通 build 仍会触发项目插件副作用。
- **T6 再预检（2026-07-18）**：`127.0.0.1:5500` 已恢复监听，但提供的仍是旧 bundle：数据库前端 `index.js` 为 HTTP 200 / 1,853,711 bytes，未含 `mountPanel` 或 `hudImmersivePreferred`；消息内面板 `index.js` 为 HTTP 200 / 794,539 bytes，未含 `data-mfrs-hud-gacha-host` 或 `MFRS.mountPanel`。这与 feature 源码契约不一致。
- **只读运行时复核**：仅显式连接调试 Chrome CDP `9222` 的 `t1`（`http://127.0.0.1:8000/`），未点击页面：`MFRS` 为 object 而 `MFRS.mountPanel` 为 `undefined`，host 与 immersive mode selector 均为 0，旧左栏入口为 1，body 仍为旧 `mfrs-hud-immersive` 状态。因此停止 T6 后续交互；不执行抽卡、重置或导入。
- **T6 再预检（2026-07-18）**：`127.0.0.1:5500` 已恢复监听，但提供的仍是旧 bundle：数据库前端 `index.js` 为 HTTP 200 / 1,853,711 bytes，未含 `mountPanel` 或 `hudImmersivePreferred`；消息内面板 `index.js` 为 HTTP 200 / 794,539 bytes，未含 `data-mfrs-hud-gacha-host` 或 `MFRS.mountPanel`。这与 feature 源码契约不一致。
- **只读运行时复核**：仅显式连接调试 Chrome CDP `9222` 的 `t1`（`http://127.0.0.1:8000/`），未点击页面：`MFRS` 为 object 而 `MFRS.mountPanel` 为 `undefined`，host 与 immersive mode selector 均为 0，旧左栏入口为 1，body 仍为旧 `mfrs-hud-immersive` 状态。因此停止 T6 后续交互；不执行抽卡、重置或导入。

## HUD-UX-NEXT · Phase 5 发现与决策（2026-07-17）

- T5 源码检查点确认 overlay/embedded 共用 renderer、数据库前端与 HUD 句柄所有权边界、可信 root 校验和清理入口没有分叉；模式状态继续只由 `hudImmersivePreferred` 管理，不需要额外源码提交修正。
- `75f4a9a..5dacd2e` 的既有 T0–T4 提交链已经把规划、两处源码和两项门禁按阶段精确提交并推送，白名单不含 dist、PNG、版本常量、package 或 lockfile。T5.3 应审核这条链，而不是为了形成“检查点提交”重复提交相同源码。
- 静态检查边界：v10 全文件运行 `better-tailwindcss` 时会误扫 JavaScript template 内的非 Tailwind HTML/CSS；该类诊断不适合作为本轮回归结论。排除 Tailwind 插件模板误报后，其他 lint 规则与 `origin/main` 基线一致；archive-ui ESLint errors 为 0，一行正则字符类 lint 清理不改变门禁语义。
- T5 最终证据为 `git diff --check`、4 份目标 JS `node --check`、`index.ts` TypeScript transpile、frontend 21 项、archive-ui 237 checks 和聚合门禁全部 PASS；独立 verification、反模式与代码质量复核均 APPROVE。T6 真页验收仍为 pending，下一项是 T6.1。

## HUD-UX-NEXT · Phase 4 发现与决策（2026-07-17）

- 旧 archive-ui H7–H11 不能简单删除；必须由新 H7–H11 接替完整抽卡 host、mount/destroy、重试、刷新保留、清理和旧 marker 缺席契约，再用 I1–I5 补齐左栏精简与模式切换覆盖，才能证明门禁没有通过减断言降级。
- 对 `index.ts` 这类大型 TypeScript 源码做字符串包含检查容易被注释、同名文本或无关函数误导。决定用 TypeScript AST 精确取得目标函数、条件分支、调用与赋值，只在结构化范围内验证所有权和生命周期契约。
- CSS 响应式规则嵌在 TypeScript template 中；测试先从 AST 提取目标 CSS template，再按最终声明验证桌面/≤900px 右轨 60px 与 ≤640px 单列布局，避免全文件正则命中被覆盖的旧声明。
- HTML builder 的静态验证先屏蔽 comments，并只接受受限静态字符串拼接；这样可确认模式按钮、ARIA/title、图标和 scoped 玩家按钮删除来自实际返回 HTML，而不是注释或死文本。
- T4 最终基线为 frontend 21 项动态生命周期检查、archive-ui 237 checks、聚合门禁、目标 `node --check` 和 `git diff --check` 全绿；独立反模式与代码质量复核均 APPROVE，仅保留既有 CDN_REF warning。

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
- **当前任务状态**：HUD-UX-NEXT 的 T0–T5 已完成（28/44），T6 Chrome DevTools 真页验收 pending；archive-ui 新 H7–H11/I1–I5、frontend 21 项动态检查、archive-ui 237 checks、聚合门禁和源码提交链检查均已通过，下一项为 T6.1。
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
