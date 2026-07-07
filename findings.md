# Findings

## 2026-07-07：webpack 会把脚本内 `import.meta.url` 固化成本地 file URL，发布 ref 推导必须用运行态 URL

**结论：** 在当前 webpack 配置下，普通脚本 bundle 里的 `import.meta.url` 会被生产构建固化为构建机源码路径，例如 `file:///D:/project/.../src/神秘复苏模拟器/脚本/数据库/index.ts`。不能用它推导 jsdelivr 当前 bundle ref；否则发布运行时会退到 `@main/vendor/...` 或其他 fallback，破坏“loader 与 vendor 同 bundle”的目标。

**证据：**
- P4 初版修复后，`dist/神秘复苏模拟器/脚本/数据库/index.js` 出现 `new URL('file:///D:/project/.../index.ts')`，并包含 `@main/vendor/shujuku-sp-fork/index.js` fallback。
- 补强后 dist 不再含 `file:///` / `@main/` / `@52b2e62`，`verify:mfrs-mvu-hotfix` 已把这些作为 hard gate。
- no-AI 运行态 smoke：卡内 wrapper 注册本地 loader URL 后，导入 `127.0.0.1:5501/dist/.../脚本/数据库/index.js`，临时 CORS 服务日志记录随后请求同根 `/vendor/shujuku-sp-fork/index.js?v=phase164-...-mvu-v859&mfrs_loader=...`。

**修复模式：**
- 卡内脚本 wrapper 在 `await import()` 前写入 `window.__mfrsScriptResourceUrls__[label] = url`。
- bundle 先读该运行时 URL，再用 `performance.getEntriesByType('resource')`、DOM `script[src]` 和 `new Error().stack` 作为兜底候选。
- 从候选 URL 的 `/dist/` 前缀推导仓库根路径，再拼出同根 `vendor/shujuku-sp-fork/index.js`；找不到运行时 URL 时直接报错，不静默退到 `@main`。

## 2026-07-07：v8.5.8 真实对话复测失败根因

**结论：** v8.5.8 发布包不是“完全没生效”，而是失败在三段链路叠加：首轮生成没有注入完整变量输出格式；后续生成虽注入 nested `<JSONPatch>` 骨架但模型仍输出旧 direct-array；MVU hotfix 又用错误参数调用 `Mvu.parseMessage()`，且没有在调用前把旧 direct-array 归一化为 nested `<JSONPatch>`，所以 message variables 仍未写入。

**证据：**
- Chrome DevTools 网络请求 `reqid=281`（15:50 首轮真实生成）：`messages` 中没有 `update_output_contract` / `变量输出格式`，`<JSONPatch>` 仅 1 次，说明首轮开局/召回生成路径未携带完整输出骨架。
- 网络请求 `reqid=317`（15:58 第二轮真实生成）：已携带 `update_output_contract`，`<JSONPatch>` 5 次、`<UpdateVariable>` 19 次、无 direct-array 提示；但模型仍实际输出 `<UpdateVariable>[...]</UpdateVariable>` 旧格式。
- 运行态 `window.Mvu.parseMessage.length === 2`，函数头为 `async function(t,n){const a=e(n);return await le(t,a),a}`，与类型声明一致：第一个参数应为消息文本。当前 `src/神秘复苏模拟器/脚本/hotfix-generation-ended-listeners/index.ts` 调用的是 `Mvu.parseMessage(lastMessageIndex, {})`，把消息序号传成了消息文本。
- no-write 对比验证：`Mvu.parseMessage(4, oldData)` 与 `Mvu.parseMessage(directArrayMessage, oldData)` 均保持 `姓名=未知 / 风险值=0 / 事件代号=未立案灵异事件`；把同一 direct-array 包进 `<JSONPatch>` 后，`风险值=5`、`事件代号=敲门鬼媒介传播事件`、`鬼域状态=疑似鬼域` 才更新。
- 发布版脚本加载链路仍有旧 vendor：`dist/神秘复苏模拟器/脚本/数据库/index.js`、`src/神秘复苏模拟器/脚本/数据库/index.ts`、`src/神秘复苏模拟器/脚本/数据库前端/index.ts` 都硬编码 `@52b2e62/vendor/shujuku-sp-fork/index.js`。因此发布卡虽通过 `@454267e` 加载数据库 loader，loader 实际又拉旧 vendor；之前 `@454267e/vendor/...` 的 CDN smoke 没验证到运行时真实 import 链路。
- 模型还输出了 `op: "add"`，但当前变量输出规则和 MVU 支持的是 `insert`；即使外层修成 nested，这类数组追加仍会丢失或被忽略。

**失败性质：** 数据库前端可从回复和本地 fallback 写入一部分镜像数据，所以底部仪表盘显示已更新；但 MVU message variables 没更新，导致消息内状态面板仍显示初始值。这是数据库镜像路径成功、MVU 变量路径失败的分裂状态。

## 2026-07-07：v8.5.8 发布验证，JSONPatch 协议修复已进入发布版

**结论：** MVU JSONPatch 协议修复已完成正式发布链路。source `971c617` 已触发 bot bundle `454267e`，发布版 YAML/PNG 已回填到版本 8.5.8 和 CDN ref `454267e`；发布同步 commit `5b97c78` 已 push，本地内容验证、资源 CDN smoke 和远端发布版 YAML/PNG smoke 均通过。

**验证判据：**
- 发布版 YAML：version 8.5.8，`454267e` 7 处；旧 `bbbe6c7`、8.5.7、localhost、127.0.0.1 均为 0。
- 发布版 PNG `chara` / `ccv3`：合计 `454267e` 14 处、8.5.8 2 处；旧 `bbbe6c7`、8.5.7、本地链接均为 0。
- worldbook gate：383 entries / 33 disabled / max enabled 5851。
- CDN smoke `@454267e`：状态栏、vendor、数据库前端均 HTTP 200；状态栏含 `UpdateVariable` / `JSON[P]atch`，vendor 含 nested JSONPatch parser / repair marker，数据库前端保留自动召回 marker。
- 远端发布版 `@5b97c78`：YAML/PNG 均 HTTP 200；YAML 含 8.5.8 和 `454267e` 7 处，PNG chara/ccv3 含 8.5.8 和 `454267e` 14 处；旧 ref、旧版本、本地链接均为 0。

**剩余边界：** 本次仍未触发真实 AI；新回复是否按提示词稳定输出 nested `<JSONPatch>` 需要用户明确批准后做一次最小真实对话复测。

## 2026-07-07：修复验证结果，nested JSONPatch 是当前 MVU 唯一可消费格式

**结论：** 本轮已把角色卡输出协议切到 `<UpdateVariable><JSONPatch>[...]</JSONPatch></UpdateVariable>`。在当前 SillyTavern 运行态中，`Mvu.parseMessage()` 对 nested `<JSONPatch>` 可以更新完整 `stat_data`；旧 `<UpdateVariable>[...]</UpdateVariable>` direct-array 仍不会更新变量，因此旧格式只能作为状态栏/vendor 自己提取行动建议的兼容输入，不能再要求模型输出。

**no-AI 证据：**
- `Mvu.parseMessage(nestedMessage, { stat_data })` 更新了 `stat_data.姓名 = 测试角色`、`stat_data.所在位置 = 测试地点`、`stat_data.当前灵异事件.事件代号 = 测试事件`、`stat_data.行动建议.length = 1`。
- 同一 patch 的 direct-array 旧格式保持旧值不变。
- 现有真实聊天里第 2、4 条 AI 消息仍是旧 direct-array 且不含 `<JSONPatch>`，所以 5 个消息内面板继续显示默认 `未知/未立案灵异事件/暂无行动建议`，这是旧消息的预期下游表现；新协议需要下一轮真实 AI 才能验证 message variables 写入。

**全局 Regex 修复证据：**
- 已备份 `【6.12】数据库多功能美化正则1` 与 `新·星河璀璨数据库召回配套正则1` 到 `.tmp-mfrs-regex-backup-20260707.json`。
- 两个 replacement 仅移除了首尾 ```html / ```，保留原 findRegex、placement、启用状态。
- 当前聊天刷新 5 条消息显示后，DOM 中含 ``` 的 closing fence 段落从 2 个降到 0；输入框仍为空，未触发生成。

## 2026-07-07：发布后真实对话问题根因，MVU 协议格式与 initvar 结构不匹配

**结论：** 用户导入 `神秘复苏模拟器发布版` v8.5.7 后真实对话中变量不更新，主因是卡内提示词要求 AI 输出 `<UpdateVariable>` 直接 JSON 数组，但当前 MagVarUpdate / TavernHelper 运行时实际需要 `<JSONPatch>...</JSONPatch>` 包裹才能消费。数据库前端正常显示不代表 MVU message variables 正常，两者是不同路径。

**证据：**
- 当前 AI 回复的 `<UpdateVariable>` 块是直接数组；`Mvu.parseMessage(currentMessage, oldData)` 返回 unchanged。
- 同一数组改为 `<UpdateVariable><JSONPatch>[...]</JSONPatch></UpdateVariable>` 后，`Mvu.parseMessage` 能更新 `姓名`、`所在位置`、`当前灵异事件.事件代号` 等字段。
- `src/神秘复苏模拟器/世界书/变量/变量输出格式.yaml` 和发布版同名文件仍明确写着 “valid JSON array directly inside `<UpdateVariable>`”。
- `src/神秘复苏模拟器/世界书/变量/initvar.yaml` 和发布版同名文件顶层是 `stat_data:`，但 `src/神秘复苏模拟器/schema.ts` 的根字段直接是 `姓名`、`身份`、`所在位置` 等，运行态因此出现 `variables.stat_data.stat_data`。

**下游表现：**
- `src/神秘复苏模拟器/脚本/消息内面板/index.ts` 读取 `getVariables({ type: 'message', message_id }).stat_data`；MVU 不写入 message variables 时，`.mfrs-msg-panel` 只能显示默认 `未知`。
- 可见的 closing code fence 泄漏来自 SillyTavern 运行态全局显示正则 replacement 外层 ```html / ```，不是 raw 消息，也不在当前仓库源码内。

**修复方向：**
- 首选让提示词输出 MVU 实际可消费的 `<JSONPatch>` 包裹格式。
- 同时让状态栏/vendor/回归脚本兼容 nested `<JSONPatch>`，保留旧直接数组 fallback。
- 修正 `initvar.yaml` root，使初始化变量结构与 schema 对齐，再复查 `变量列表.txt` 的 `_.omit(rawStatData, 'stat_data')` workaround。

## 2026-07-07：PowerShell here-string 管道给 Node 时中文路径可能变成 `????`

**结论：** 在本机 PowerShell 中用 `@' ... '@ | node -` 运行内联 Node 脚本时，脚本里的中文路径或中文 URL 可能被管道编码成 `????`。这会造成 PNG 读取 `ENOENT`，或 CDN URL 变成错误路径返回 403。不要据此判断中文文件或 CDN 资源损坏。

**规避方式：**
- 内联 Node 脚本里用 Unicode escape 构造中文路径/URL，例如 `\u795e\u79d8\u590d\u82cf\u6a21\u62df\u5668`。
- CDN 中文路径继续在 Node 中用 `encodeURI(url)` 发请求。
- 若首次输出出现 `????`、中文路径丢失或 CDN 403，先按编码规则重跑验证，再做结论。

**本次影响：** v8.5.7 发布同步验证中，首次 PNG 元数据脚本和 CDN smoke 脚本因 `????` 失败；改用 Unicode escape 后确认发布版 PNG 正常，CDN `@bbbe6c7` 数据库前端 200 且含自动召回 marker。

## 2026-07-07：自动召回真页 smoke 可用本地 bundle 临时注入，验证后要刷新页面清理监听器

**结论：** 自动召回的真页非 AI smoke 已通过，并已在 v8.5.7 进入发布版。若后续在发布前验证新的开发版数据库前端改动，可先 `pnpm build`，再用本地静态服务提供 `dist/神秘复苏模拟器/脚本/数据库前端/index.js`，把该脚本临时注入 `TH-script--神秘复苏数据库前端--...3002` iframe。验证完成后必须刷新页面，清理本地脚本和 `GENERATION_AFTER_COMMANDS` 监听器，避免影响用户下一次真实发送。

**本次 smoke 结果：**
- `MysteryAcuVisualizer` 新增 API 正常：`getAutoRecallPreview()` / `buildAutoRecallPrompt()`。
- 召回页 UI 正常：显示“自动召回状态”、`剧情召回` / `记忆召回` 双开关、“本轮自动召回”列表。
- 当前对话预览不是全量召回：`itemCount=1`，命中 `事件纪要 #1 / SP0001`，prompt 长度 447，含 `<自动剧情记忆召回>` 包裹。
- 开关控制正常：剧情关、记忆开时仍召回纪要；剧情/记忆都关时 `enabled=false`、`itemCount=0`、prompt 为空，UI 显示“自动召回已关闭”。
- 边界：chat 长度和输入框未变化；未发送消息、未触发真实 AI、未点击“立即手动更新”、未调用 `manualUpdate()` / `triggerUpdate()`。

**清理经验：** 临时注入完整数据库前端 bundle 会注册生成前事件监听。只删除 script 标签不够，已执行过的监听器仍在内存里；验证结束后应刷新 SillyTavern 页面，并确认发布版运行态恢复为 `MysteryAcuVisualizer` 仅含 `renderInterface`。

## 2026-07-07：自动剧情/记忆召回开发版实现细节

**结论：** 自动召回已落在开发版数据库前端中，走“当前上下文相关性筛选 → 生成前一次性注入 → 召回页展示同一批结果”的路径。它不是把召回 10 表全量塞进提示词，而是根据最近聊天、当前输入框、固定召回和候选条目的标题/标签/摘要/全文命中打分。

**关键实现点：**
- 注入时机：监听 `GENERATION_AFTER_COMMANDS`，在生成前调用 `injectPrompts([...], { once: true })`，prompt id 为 `mfrs_auto_plot_memory_recall`，包裹标签为 `<自动剧情记忆召回>`。
- 控制面：召回页新增“自动召回状态”、`剧情召回` / `记忆召回` 双开关和“本轮自动召回”列表；关闭某类后，该类不参与自动注入。
- 相关性：固定召回优先；关键词命中标题、标签、摘要、全文分别加权；最近事件纪要只作为少量兜底。
- 反全量召回：不要因为 `item.injected` 为真就给所有候选普遍加分。`injected` 只表示该表/规则原本参与提示词注入，不等于本轮上下文相关；否则会把大量历史内容推入自动召回，违背“只召回相关内容”的目标。
- 调试入口：`MysteryAcuVisualizer.getAutoRecallPreview()` 返回本轮预览数据，`MysteryAcuVisualizer.buildAutoRecallPrompt()` 返回将被注入的文本；两者均不发送消息、不触发真实 AI。

**验证边界：** 静态检查和 build 已通过；真页还需要一次非 AI smoke，验证 UI、开关、预览和 prompt 构建，不发送消息、不点击“立即手动更新”、不调用 `manualUpdate()` / `triggerUpdate()`。

## 2026-07-07：自动召回应走生成前一次性注入，并在召回页展示同一批筛选结果

**结论：** 当前召回页已有 `collectRecallItems`、`buildRecallItemText`、`buildPinnedRecallPrompt` 和 10 张关键表规则，适合作为自动召回的数据源；但原实现只支持搜索、复制、填入、固定，是手动工作台。自动化应新增“相关性筛选 + 生成前一次性注入 + 召回页预览/开关”，不要模拟点击按钮，也不要自动发送。

**设计边界：**
- 相关性来源：当前用户输入、最近若干条聊天消息、已固定召回，以及召回表中标题/摘要/标签抽出的关键词。
- 优先召回：用户显式提到的角色、地点、厉鬼、灵异物品、杀人规律、线索、事件；再兜底最近事件纪要。
- 注入预算：限制条数和字符数，避免把 80 条候选全部塞入提示词。
- 控制项：召回页提供“剧情召回”“记忆召回”两个开关；关闭对应类型后不注入该类，但仍可在页内看到候选和状态。

## 2026-07-07：当前应导入 v8.5.7 发布版 PNG，CDN ref 为 bbbe6c7

**结论：** 当前需要导入的角色卡是 `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`。该发布版对应版本 `8.5.7`，CDN ref `bbbe6c7`，发布同步 commit `27acf1f` 和 planning 收口 commit `0242af8` 已在 `origin/main`。

**验证判据：**
- PNG `chara` / `ccv3` 元数据：version `8.5.7`，worldbook `383 entries / 33 disabled / max enabled 5851`。
- CDN 引用：`bbbe6c7` 出现 7 次；旧 `573807b`、`8.5.6`、localhost、127.0.0.1 均为 0。
- 自动召回 marker：CDN `@bbbe6c7` 数据库前端 bundle 为 200，含 `mfrs_auto_plot_memory_recall`、`自动剧情记忆召回`、`toggle-auto-plot`、`toggle-auto-memory`。
- 工作树核对：当前 tracked 文件干净；只剩本地未跟踪截图 `屏幕截图 2026-07-06 235029.png`，它不是发布资产，不提交。

## 2026-07-06：固定状态栏截图内容应移除，保留数据库槽位即可

**结论：** 用户截图中的内容来自 `脚本/固定状态栏/index.ts` 生成的固定状态栏 summary/detail：死亡风险、复苏程度、健康、当前灵异事件、驾驭厉鬼和“神秘复苏14表”按钮。当前角色卡不需要这块 UI；应移除状态栏内容，但保留输入框上方 host 及 dashboard/frontend 两个槽位，避免破坏数据库仪表盘和 14 表前端。

**实现边界：**
- 固定状态栏脚本只维护 `mfrs-fixed-status-host`、`mfrs-fixed-dashboard-slot`、`mfrs-fixed-frontend-slot`。
- 不再读取 `stat_data`，不再注册消息刷新事件，不再渲染 `mfrs-fixed-status-summary` / `mfrs-fixed-status-detail`。
- 数据库前端 host 维护逻辑也应删除旧 `mfrs-fixed-status-slot` / summary / detail，防止旧运行态残留。
- 验收时允许数据库仪表盘自身仍显示风险、事件等摘要；那不是截图里的固定状态栏 UI。

## 2026-07-06：P1/P2/P3 真页 smoke 可通过本地 bundle 注入当前发布版运行态

**结论：** 当前发布版角色仍是 v8.5.4 CDN 时，可以在 `TH-script--神秘复苏数据库前端--...3002` iframe 中用普通项目 dev path 注入 `http://localhost:5500/dist/神秘复苏模拟器/脚本/数据库前端/index.js`，验证本地 P1/P2/P3 开发版 UI。该方式只替换当前页面运行态，不改卡体、不触发 AI、不发送消息。
- 注入后 `.acu-wrapper` 会先移除旧实例再挂载新实例，不会叠加旧 UI。
- 总览 tab 应验证：14 表状态、搜索、复制/填入、`原表` 跳转。
- 召回 tab 应验证：健康检查、10 张召回索引表、搜索、固定/填入全部/清空。
- 一致性 tab 应验证：6 域摘要、JSON 快照导出、刷新前端/重载快照/重建索引/重载模板低风险入口。
- 抽卡面板应验证：当前聊天 scope、经济摘要、卡池校验、`window.MFRS.exportChatData/importChatData/validateCatalog/getEconomySummary`；同快照导入不应删除全局 `mfrs_custom_gacha_items`。
- 非一次性聊天中不要执行“重置当前聊天抽卡数据”；只确认入口存在即可。

## 2026-07-06：P3 工程维护先做低风险配置拆分，避免未 smoke 前大规模运行时拆模块

**结论：** `v10_2_visualizer.js` 是 IIFE 副作用脚本，由 `index.ts` 直接 import 后挂载大量闭包函数和 `window.MFRS`。在 P1/P2 尚未真页 smoke 前，不适合直接把数据库 UI、抽卡、写库同步等运行时函数大规模迁出，否则容易引入作用域、初始化顺序或 webpack minifier 风险。P3 本轮选择低风险拆分：先把纯静态配置迁到 `frontend-config.js`，再用静态验证脚本锁住关键运行时锚点。

**已拆出的配置：**
- `dashboardSlots`：仪表盘槽位配置。
- `legacyDashboardKeywords`：旧仪表盘关键词兼容。
- `recallTableRules`：召回面板 10 张关键表规则。
- `consistencyRules`：MVU / 数据库一致性 6 个核心域规则。

**加载顺序要求：** `src/神秘复苏模拟器/脚本/数据库前端/index.ts` 必须先 import `./frontend-config.js`，再 import `./v10_2_visualizer.js`。`scripts/verify-mfrs-database-frontend-p3.mjs` 已覆盖这个顺序。

**P3 静态验证覆盖：**
- 配置拆分是否生效，避免召回/一致性规则被重新内联。
- `总览` / `召回` / `一致性` 是否仍在 `isVirtualTab` 中，避免写入真实表格排序。
- 抽卡当前聊天 scoped key 是否覆盖调查点、保底、历史、奖励日志、残屑和已拥有物品；自定义卡池目录保持全局。
- 固定状态栏三槽布局是否仍保持 dashboard 10 / frontend 20 / status 30。
- 真页非 AI smoke 清单是否覆盖总览、一致性、抽卡、召回、固定状态栏，以及禁止发送消息 / `manualUpdate` / `triggerUpdate` 的边界。

**后续大拆建议：** 真页 smoke 和发布链路稳定后，再考虑把运行时函数按“通用 DOM/输入框工具、表格搜索与预览、召回、一致性、抽卡、写库同步”拆成可测试模块。不要在同一轮同时做大拆和发布。

## 2026-07-06：P1/P2 总览、一致性与抽卡增强的验收边界

**结论：** “总览”和“一致性”都应作为数据库前端虚拟 tab 处理，必须加入 `isVirtualTab`，不能进入真实表格排序、不能当成数据库表名保存。当前实现沿用“召回”tab 的虚拟面板路线：只读已有 14 表、`stat_data` 和 localStorage 抽卡数据，默认不触发真实 AI、不调用 `manualUpdate()` / `triggerUpdate()`。

**总览验收口径：**
- 导航栏出现“总览”，能跨 14 表搜索。
- 表状态总览应能显示每张表的行数、列数、空表状态、异常字段提示。
- 搜索结果和详情预览应提供复制、填入输入框、打开原表；打开原表只切 tab，不写库。
- 普通表行应有复制/填入；行动建议、物品、线索、规律仍保留原本“选择/使用”语义。

**一致性验收口径：**
- 对比来源是当前 `stat_data` 与数据库关键表，不把差异直接写回数据库。
- 差异重点看玩家状态、当前事件、驾驭厉鬼、物品、线索、事件纪要。
- “导出当前状态快照”只下载 JSON，便于坏档定位。
- “只刷新前端 / 只重载模板 / 只重建索引”是低风险前端操作；不要把它们升级成写库修复入口，除非用户明确要求真实写库。

**抽卡增强验收口径：**
- 抽卡面板应明确显示当前聊天 scope；当前聊天导出/导入/重置只作用于 scoped key，如 `mfrs_gacha_currency::scope`。
- 自定义卡池目录仍是全局共享数据，不随聊天 scope 导出为聊天进度。
- 卡池校验至少覆盖缺字段、概率异常、重复名称、目标表不可用。
- 经济摘要应能查看收入日志、估算消耗、拥有数量、历史数量和稀有度分布。

**当前剩余风险：** 以上已通过静态检查和 build，但还需要一次酒馆真页非 AI smoke。若当前卡仍指向旧 CDN，使用 Live Server / 既有本地静态服务加载本地 bundle，验证 UI、输入框填入、导出/导入/重置按钮状态；验证时不要发送消息，不要点击“立即手动更新”。

## 2026-07-06：P1 召回面板 smoke 可用本地 bundle 验证，避免触发 AI/写库

**结论：** 数据库前端这类 CDN script-link 改动，在 source 已改但发布卡仍指向旧 `@80b09a8` 时，使用 Live Server / 既有本地静态服务把本地 `dist/神秘复苏模拟器/脚本/数据库前端/index.js` 加载到当前 `TH-script--神秘复苏数据库前端--...3002` iframe 做真页 UI smoke。这个方法只替换当前页面运行态脚本，不改角色卡、不更新 CDN、不触发 AI，也不调用数据库更新。

**P1 验收口径：**
- 导航栏应出现虚拟 tab“召回”，但它不能写入真实表格排序配置。
- 健康检查至少应显示：`AutoCardUpdaterAPI=可用`、`14表模板=14/14`、`事件纪要`行数、召回索引表数量、剧情召回开关/预设状态、向量召回状态。
- 召回规则覆盖 10 张表：`事件纪要`、`线索`、`人物`、`地点`、`灵异事件`、`厉鬼档案`、`灵异物品`、`收录档案`、`收录规律`、`驾驭厉鬼`。
- 每条卡片必须显示来源表、row_id/行号、标题、摘要、标签、是否参与提示词注入。
- 手动操作必须分别验：复制按钮存在、单条填入输入框、固定/取消固定、填入全部固定召回、清空固定召回。

**本次 smoke 结果：** v8.5.3 真页加载本地 P1 bundle 后，召回 tab 初始 10 条；健康检查为 `AutoCardUpdaterAPI=可用`、`14表模板=14/14`、`事件纪要=1行`、`召回索引表=10张`，剧情召回显示“未确认”、向量召回显示“未启用”（按当前配置是 warning 而非错误）；搜索“鬼”后结果 10→8；固定/清空、单条填入、固定集合填入均通过。

**清理要求：** 这类 smoke 后必须恢复 `send_textarea`，清理 `acu_mfrs_recall_query_v1` / `acu_mfrs_recall_pins_v1`，并移除本地 import 或 Live Server 验证产生的页面测试痕迹。不要点击“立即手动更新”，不要调用 `manualUpdate()` / `triggerUpdate()`，不要发送消息。

## 2026-07-06：固定状态栏 slot 30 为空时，先查 `固定状态栏` 脚本是否注册

**结论：** v8.5.2 的三槽布局源码本身可用，但发布卡一度缺少 `固定状态栏` 脚本注册条目，导致真页只有数据库仪表盘和 14 表前端，`mfrs-fixed-status-slot` 存在但为空。不要只看 `mfrs-fixed-status-host` / 三个 slot 是否存在；必须同时确认 `TH-script--固定状态栏--d0f6b2d4-4b25-4b8c-9b54-2f7b6c8a3001` 已加载，且 `#mfrs-fixed-status-summary` / `#mfrs-fixed-status-detail` 在 slot 30 内。

**根因：** v8.5.1 清理旧固定状态栏残留时删除了 `src/神秘复苏模拟器/index.yaml` 的 `固定状态栏` 脚本条目；v8.5.2 只修改了 `src/神秘复苏模拟器/脚本/固定状态栏/index.ts` 的三槽逻辑，没有重新接回脚本入口。v8.5.3 恢复脚本注册，继续使用已存在且验证通过的 `@80b09a8` 固定状态栏 dist。

**真页验收口径：**
- 当前角色 `character_version` 应为 `8.5.3` 或更高，卡体包含 `固定状态栏` 脚本条目。
- frame 列表应有 `TH-script--固定状态栏--...3001`、`TH-script--神秘复苏数据库前端--...3002`、`TH-script--消息内面板--...3003`。
- DOM 顺序应为 `mfrs-fixed-dashboard-slot(order 10)` → `mfrs-fixed-frontend-slot(order 20)` → `mfrs-fixed-status-slot(order 30)`；前两槽各有 1 个子节点，状态槽有 summary/detail 两个子节点。
- `pagehide` 后状态槽被清理是预期行为；关键是 dashboard/frontend 两槽仍保留，刷新/重选角色后状态槽自然重挂。

## 2026-07-05：EJS stat_data 注入是当前提示词侧正确方案，旧 `format_message_variable::stat_data` 宏不可用

**结论：** `变量列表.txt` 的 stat_data 提示词注入不能依赖 `{{format_message_variable::stat_data}}` 或 `registerMacroLike`。真页验证显示 `extensionPrompts.customDepthWI_0_0.value` 保留的是模板原文；实际发送前应由 ST-Prompt-Template 的 `EjsTemplate.evalTemplate()` 渲染。当前 v8.5.0 方案用 EJS 从 `variables.stat_data` 取值，剔除冗余嵌套 `stat_data.stat_data` 后输出 JSON。

**当前代码模板（开发版+发布版一致）：**
```ejs
<%_
var rawStatData = _.get(variables, 'stat_data', {});
var cleanStatData = (rawStatData && typeof rawStatData === 'object')
  ? _.omit(rawStatData, 'stat_data')
  : {};
_%>
<stat_data>
<%- JSON.stringify(cleanStatData, null, 2) %>
</stat_data>
```

**验证口径：**
- 不要只看 `extensionPrompts` 判断 EJS 是否生效；那里看到 EJS 标签原样属于正常。要用 `EjsTemplate.evalTemplate(content)` 或实际请求体验证渲染结果。
- v8.5.0 真页片段验证：渲染后无旧宏、无残留 `<%- JSON.stringify... %>`，`<stat_data>` 内 JSON 可 parse，包含 `姓名`、`风险值`、`驭鬼者状态`、`当前灵异事件`，且无冗余 `stat_data.stat_data`。
- v8.5.0 PNG 元数据验证：`chara`/`ccv3` 均 version `8.5.0`，旧 `c547fac` 0 次，旧宏 0 次，EJS `JSON.stringify(cleanStatData)` 1 次。

**注意：** 旧记录里“stat_data 全空”的判断已被后续真页验证修正；运行时 `getVariables({type:'message', message_id})` 可以拿到完整 `stat_data`，问题是提示词没有给 AI 完整字段路径，而不是 MVU 数据不存在。

**任务7补充（发布后真页）：** v8.5.0 正式导入后，当前页面的 `ctx.worldInfo.entries` 返回 0，不适合作为本轮 worldbook 运行态来源；应从当前角色 `ctx.characters[ctx.characterId].data.character_book.entries` 验证卡体，结果为 383 entries / 33 disabled / max enabled 5851。`EjsTemplate.evalTemplate(变量列表.content)` 是无 AI 副作用地验证提示词侧 EJS 的最小闭环。

## 2026-06-30：酒馆助手「脚本」跑在 TH-script iframe 里——操作主窗口 DOM 必须用 `window.parent.document`

**根因（CDP 实锤）：** JS-Slash-Runner 把每个酒馆助手「类型:脚本」的脚本运行在独立 iframe `TH-script--<名>--<id>` 中。这些 iframe：
- `contentWindow` 里有脚本全局 `tavern_events`(object)、`getVariables`(function)、`eventOn` 等；
- 但 `contentDocument` **没有**主窗口的 `#send_form`/`#chat` 等 DOM；
- 主窗口(top) 反而**没有** `getVariables`/`eventOn`/`tavern_events`（只有 `_`/`jQuery`/`TavernHelper`）。

所以脚本里**裸 `document.querySelector('#send_form')` 永远返回 null**——它查的是 iframe 自己的空 document。`固定状态栏/index.ts` 的 `getSendForm()`/`createElement`/挂载/清理全用裸 `document`，导致 `retryMount` 20 次全失败、固定状态栏**从未挂载**（pre-existing bug，v8.4.7 美化前就存在，只是历来只验过 dist grep 没验过真页 DOM）。

**修复（v8.4.8）：** 脚本顶层取 `const doc = window.parent?.document ?? document`，所有主窗口 DOM 访问（查 `#send_form`、`createElement`、挂载/清理 host）改用 `doc`；事件/变量全局（`eventOn`/`getVariables`/`tavern_events`）仍用脚本上下文（iframe 里可用）。CDP 验证：从 `TH-script--mvu` iframe `window.parent.document.querySelector('#send_form')` = 命中（`parentDocSendForm:true`）。

**对照证据：** v8.4.6 的 `[界面]状态栏` iframe 版正则脚本早就写了 `const doc = window.parent?.document || document;`——它懂这个坑；固定状态栏脚本当初漏了。**以后任何要操作主窗口 DOM 的酒馆助手「脚本」，一律先取 `window.parent.document`，不要用裸 `document`。** 验证脚本是否挂载只能真页查主窗口 DOM，dist grep / 构建通过都不能证明它在 iframe 上下文能挂上。

## 2026-06-30：拆 Science_Worship 卡实锤——它的状态栏美化是「悬浮脚本命令式渲染」，借鉴卡的"纯文字+宏"正则本就是禁用的废案

**直接拆 `Science_Worship_20260628.png`（ccv3 tEXt）得到的硬证据，彻底推翻 v8.4.6 借鉴前提：**

1. **它的两个"显示状态栏"正则都是 `disabled=true`：** `regex[2] 显示状态栏(前端)`（315KB iframe 模板）和 `regex[3] 显示状态栏(纯文字)`（1043 字，`{{get_message_variable::stat_data.xxx}}` 宏）**都禁用**。v8.4.6 照抄的纯文字版正是作者**放弃禁用**的废案。
2. **真正上线的状态栏 = 第 5 个酒馆助手脚本「悬浮状态栏」（281KB webpack 应用，enabled=true）：** 命令式读 MVU 变量 + 独立悬浮窗 iframe 渲染。Science_Worship 的美化效果靠这个，不是正则+宏。
3. **`get_message_variable`/`format_message_variable` 不是 MVU 框架的宏：** 抓 `MagicalAstrogy/MagVarUpdate/artifact/bundle.js`（161KB）grep 实测——这俩宏 0 命中；MagVarUpdate 只 `registerMacro('lastUserMessage',...)`。两卡都 `import` 同一个 MagVarUpdate bundle（神秘复苏 `脚本/MVU/index.ts:1`、`index.yaml:6578`），所以宏不是它给的。
4. **早期曾误判这俩宏是“提示词侧宏”：** 神秘复苏只在世界书注入场景用过（`世界书/变量/变量列表.txt:33`、`status_current_variable` 条目的 ejs 模板里 `{{format_message_variable::stat_data}}`），但后续 v8.5.0 验证确认它们在提示词侧也不解析；真正可用的是 EJS 模板渲染。

**复刻 Science_Worship 效果的正确路径 = 命令式脚本渲染（不是正则+宏）。** 神秘复苏已具备两套命令式渲染设施可复用：①「固定状态栏」脚本（输入框上方 DOM）②「数据库前端」iframe。消息内折叠状态面板应走：正则把 `<StatusPlaceHolderImpl/>` 换成空容器（带 data 属性、无宏）+ 脚本 `getVariables({type:'message',message_id})` 读 stat_data 命令式填值。详见下方 v8.4.6 踩坑条目。

## 2026-06-30：神秘复苏状态栏美化是"命令式 getVariables"，不是"声明式正则+宏"（v8.4.6 踩坑）

**结论（可复用，避免重复踩坑）：** 神秘复苏的酒馆助手运行环境**没有注册 `get_message_variable` / `format_message_variable` 宏**。这类 `{{get_message_variable::stat_data.xxx}}` 宏写进显示层正则的 replaceString 后**不会被解析**，会原样显示成 `{{...}}` 文本。

**验证方式（CDP 真页）：** `TavernHelper.formatAsDisplayedMessage(text, {message_id})` 是显示层完整管线；用它测试，注入 stat_data 数据后两个宏仍原样返回；连 `TavernHelper.registerMacroLike(/.../,fn)` 注册后 `formatAsDisplayedMessage` 也不解析（macro_like 解析时机与 markdownOnly 正则替换对不上）。**核心 `substituteParamsExtended` 不含酒馆助手宏，不能用来判断宏是否可用，必须用 `formatAsDisplayedMessage`。**

**两条技术路线对比：**
- **声明式（正则+宏）**：正则把占位符 `<StatusPlaceHolderImpl/>` 换成"HTML+宏"模板，靠酒馆助手宏引擎填值。轻量、改字段只改正则文本，但**前置依赖宏已注册**。借鉴卡 Science_Worship 用这套且能工作，因为它的 `tavern_helper.scripts` 自带注册宏的脚本（MVU-ZOD/悬浮状态栏）。
- **命令式（脚本 getVariables）**：脚本 `getVariables({type:'message'}).stat_data` 读值 + DOM/iframe 渲染 + 事件刷新。神秘复苏的 `固定状态栏` 脚本和 `数据库前端` iframe 都走这套。只依赖 `getVariables`（始终可用），可控、能渲染复杂数据，但要写并维护脚本。

**给神秘复苏的判断：** 状态栏/变量可视化只能走命令式 getVariables。要做"消息内折叠状态面板"，正确做法是正则把占位符换成空容器（带 data 属性）+ 脚本用 getVariables 命令式填值（复用固定状态栏渲染逻辑），**不能照搬借鉴卡的正则+宏**。

**纯文字正文美化（关键词高亮、协议块隐藏、sp_start/sp_input 渲染）两卡原理相同**：都是显示层正则（markdownOnly）做静态文本→HTML 替换，不读变量，这部分可以借鉴。区别只在"状态数据可视化"这一层。

**附带修正：** 旧记录里“stat_data 全空”是误判；后续真页验证确认 `getVariables({type:'message', message_id})` 可取得完整 `stat_data`。当 AI 看不到字段路径时，优先查提示词注入是否给出完整 JSON，而不是先怀疑 MVU 数据不存在。

## 2026-06-29：v8.4.1 开局自定义面板被隐藏根因

**根因：** v8.4 的旧面板清洗规则写成了“删除所有 `<sp_*>/<mfrs_*>` 闭合块”。开局自定义角色入口本身是第一条消息中的 `<sp_start>...</sp_start>`，显示层又是先运行 `[显示]隐藏旧 sp/mfrs 文本面板`，再运行 `[显示]渲染神秘复苏开局页`，所以 `<sp_start>` 会先被隐藏规则删掉，后续开局页渲染正则没有机会执行。

**同类风险：** `<sp_input>` 是通用复杂行动输入面板，不属于旧大面板，也应保留。任何“清洗旧 sp 面板”的广义正则都必须排除 `sp_start` / `sp_input`，否则会破坏交互入口。

**正确清洗边界：**
- 继续清洗：`sp_status`、`sp_choices`、`sp_clue_deduce`、`sp_ghost_encounter`、`sp_item_use`、其他 `mfrs_*` 文本判定大面板。
- 必须保留：`sp_start`（开局自定义角色表单）、`sp_input`（复杂行动输入面板）。
- 推荐正则：`/<((?!(?:sp_start|sp_input)\b)(?:sp|mfrs)_[a-z_]+)\b[^>]*>[\s\S]*?<\/\1>/gi`

**回归测试口径：** `verify-output-cleaning-regressions.mjs` 必须同时验证两侧：旧 `sp_status/sp_choices` 不可见，`sp_start/sp_input` 能渲染成对应交互面板。

## 2026-06-29：v8.4 输出层职责划分 — 正文摘要 + 数据库前端交互

**用户体验目标：** MUV/MVU 变量仍可占正文内容，但不能占用大量聊天篇幅；正文只保留剧情和 `【本轮摘要】`。完整状态、线索、行动建议、灵异物品和厉鬼档案交给神秘复苏数据库前端展示与交互。

**新职责边界：**
- 正文：剧情 + `【本轮摘要】`，摘要最多 6 行，字段为位置、事件、状态、线索、资源、下一步。
- 后台协议：`<choices>` 和 `<UpdateVariable>` 继续输出，供状态栏/MVU/数据库同步使用，但显示层和生成后清洗应隐藏。
- 数据库前端：负责主要交互。`行动建议` 表行可点“选择”填入输入框；`灵异物品` 表行可点“使用”填入使用物品行动文本。
- 旧面板：`<sp_status>`、`<sp_choices>`、`<sp_clue_deduce>`、`<sp_ghost_encounter>`、`<sp_item_use>`、`<mfrs_*>` 文本判定大面板不再作为正向输出要求。旧内容应由显示正则和 hotfix 清洗整段删除，而不是剥标签保留内部文本。

**实现要点：**
- 数据库前端填充输入框时记录 `_mfrsDbInsertedPrompt`，再次点击会替换上一次数据库前端插入内容，避免连续点击造成输入框无限堆叠。
- 行动建议表同时作为选项面板来源；这不是和 `<choices>` 重叠，而是把后台选项镜像成数据库前端可点击按钮。
- 灵异物品表的按钮根据表头读取 `物品名/物品名称`、`效果/物品效果`、`副作用`、`使用限制`；缺失字段时只生成已知部分。
- 旧 `<sp_*>/<mfrs_*>` 清洗正则必须支持带属性标签并用同名闭合反向引用，同时排除 `sp_start` / `sp_input`：`<((?!(?:sp_start|sp_input)\b)(?:sp|mfrs)_[a-z_]+)\b[^>]*>...<\/\1>`，否则要么旧面板带属性时漏清，要么误删开局/输入交互面板。

**验证经验：**
- `verify-output-cleaning-regressions.mjs` 的旧断言“sp_choices/sp_status 应渲染”为 v8.4 后的反向要求：旧 sp 面板应隐藏，`【本轮摘要】` 应保留。
- `verify-worldbook-pollution-gate` 对启用条目长度敏感；本轮 `数据库联动规则` 一度到 5870，超过 5851，被压缩回 gate 上限内。
- PNG 元数据 grep 到旧 `<sp_*>` 或 `【推演选项：】` 不一定是正向污染，需区分负向规则、兼容正则、禁用旧模板和开场 `<sp_start>`。

## 2026-06-29：碎片商店 / 自定义编辑器渲染问题根因

**碎片商店无 `frag-buy`：** 后续验证确认不是渲染失败。`showFragmentShop()` 会渲染 27 行物品，但只有“未拥有且碎片余额足够”的商品按钮才带 `data-mfrs-action="frag-buy"`。余额不足时按钮是 disabled 的“残屑不足”，已拥有时是 disabled 的“已拥有”。因此检查商店是否正常渲染不能只数 `frag-buy`，还要数 `.frag-row`、`.frag-buy-btn` 和按钮文本状态。

**自定义编辑器无 `data-mfrs-action`：** 这是事件委托重构留下的真 bug。v8.0 删除了 `bindItemActions()` 函数定义，但 `showCustomItemEditor()` 内还残留两处调用：表单保存后刷新列表、编辑器初始绑定。打开编辑器时抛 `ReferenceError: bindItemActions is not defined`，导致编辑器 DOM 后续未完整渲染，表现为 tab/新增/导出/导入/AI生成按钮和物品列表都缺失。修复方式是删除残留调用，依赖容器级 `editor.on('click', '[data-mfrs-action]', ...)` 委托处理动态列表。

**MFRS API 暴露边界：** v8.2 修复后 API 在脚本执行 iframe 内可用，但主窗口控制台不一定能直接访问。v8.3 将挂载目标改为 `getHost()` 返回的父窗口，同时在 iframe 内回填 `window.MFRS = host.MFRS`，保证父窗口和脚本窗口都能访问同一 API 对象。

## 2026-06-29：事件委托替代逐个绑定 — jQuery .off().on() 重构模式

**背景：** 第四优先级将碎片商店、抽卡面板、自定义编辑器中的 23 个 `.off('click').on('click')` 逐个绑定重构为 `data-mfrs-action` 属性 + 容器级委托 handler。

**重构模式：**
1. **按钮标记：** 给每个可点击按钮加 `data-mfrs-action="action-name"` 属性，替代 id 选择器绑定。
2. **容器委托：** 在弹层容器上挂单个 `container.on('click', '[data-mfrs-action]', handler)`，handler 内用 `$(e.currentTarget).data('mfrs-action')` 或 `e.target` 分发到命名函数。
3. **命名函数提取：** 把内联匿名回调提取为 `doSinglePull`/`doTenPull`/`toggleHistory`/`doExport`/`doImport`/`doAIGen` 等命名函数，委托 handler 只做分发。
4. **`$(this)` 陷阱：** 委托 handler 内 `this` 是匹配的委托元素（非 e.currentTarget），用 `dialog.find('#id')` 显式查找更安全。
5. **动态元素例外：** `showGachaResult` 中的卡片 `$card.on('click')` 和 hover 是每次抽卡后动态创建的元素，不适用 data-mfrs-action（无固定容器），保留为即时绑定。
6. **hover 委托：** 逐行 `$('.custom-item-row').on('mouseenter', ...)` 改为 `editor.on('mouseenter', '.custom-item-row', ...)`，避免每次 tab 切换/导入后重新绑定。
7. **死代码清理：** 重构时移除了 `bindItemActions()` 函数及其所有调用点（tab 切换后、导入后、删除后），以及从未触发的 `#gacha-fragment-shop-btn` handler。

**验证方法：**
- 源码：grep `data-mfrs-action` = 28，grep `.off('click').on('click')` = 0
- dist bundle（minified）：grep `data-mfrs-action` = 25（3 个因 minification 合并），grep `.off('click').on('click')` = 0，grep 委托 handler = 3
- 构建通过 ≠ 运行时正确，事件委托重构后仍需真机回归（点击每个按钮确认分发正确）

**经验：** 事件委托减少绑定数量和内存，但 `$(this)` 语义变化是最容易出错的地方。重构后必须验证每个 action 的分发路径，特别是依赖 `$(this)` 做 DOM 查找的回调。

## 2026-06-28：AI生成在“假流式”自定义 OpenAI 源下必须显式 should_stream=true

**现象：** 发布版 7.4 真页点击自定义编辑器「AI生成」后按钮长时间停在“生成中...”，表单不出现，`TavernHelper.generateRaw:start` 已触发但无 success/error。此前 v7.2 调用层、v7.3 parseLoose、v7.4 字段补全都已发布，问题不在裸调/解析/字段补全三层本身。

**根因证据：**
- 当前 ST API：`mainApi=openai`、`chat_completion_source=custom`、`custom_url=https://gcli.ggchan.dev/v1`、模型 `假流式-gemini-3.1-pro-preview-search`。
- 原生 `ctx.generateRaw` 最小非流式请求发到 `/api/backends/chat-completions/generate`，HTTP 200，但响应为 `choices[0].message.content=""`、`finish_reason:"length"`、`completion_tokens:1`，随后 `script.js:4088` 抛 `No message generated`。
- `TavernHelper.generateRaw` 默认把 `stream` 映射为 `e.should_stream ?? false`；原 AI生成代码没有传 `should_stream`，所以走非流式路径。
- 同一当前 API 源用 `TavernHelper.generateRaw({ should_stream:true, ... })` 可成功返回文本；UI 路径临时强制 `should_stream:true` 后，真实 AI生成成功返回 JSON，表单出现并可保存。

**修复策略：** AI生成按钮调用 `TavernHelper.generateRaw` 时显式传 `should_stream: true`。这与当前“假流式”源的实际能力一致，也避免非流式 quiet/json_schema 路径返回空 content 或悬挂。

**附带字段兼容：** 真机 AI 返回了 `emoji:"🪡"` 而非 schema 里的 `icon`，且漏 `effectDetail`。v7.4 字段补全能防 undefined，但会显示 `❓` 和空 effectDetail。应在数据层补 `emoji→icon` 别名，并在 `effectDetail` 缺失/空白时用 `effect` 回填，保证预填表单更完整。

## 2026-06-28：AI 生成容错三层链路（generateRaw → parseLoose → 字段补全）

**背景：** 任务8 AI 生成自定义物品（`v10_2_visualizer.js` L5514-5693）在真机上连续暴露三层问题，分别由 v7.2/v7.3/v7.4 修复。三层串联才完整，单修任一层都不够。

**三层根因 + 修复：**
1. **调用层（v7.2 `ca4895f`）：** 裸调 `generateRaw({...})` 在 iframe/CDN-script-link 闭包顶层作用域不可达 → `ReferenceError`（被 catch 吞，弹"AI 生成失败: generateRaw is not defined"）。`generateRaw` 是酒馆助手接口（`@types/function/generate.d.ts`），**必须经 `window.TavernHelper.generateRaw`**（或 `parent.TavernHelper`）取引用；`getCore()` 只暴露 `$`/`getDB` 不含 generate 系列。修复：`const th = (window.parent||window).TavernHelper; if (!th||typeof th.generateRaw!=='function') throw...; await th.generateRaw({...})`。**同型经验：** 酒馆助手 `@types/function/*` 接口在 iframe 闭包里都不在顶层可达，一律走 `window.TavernHelper.*`。同时 v7.2 修了货币监听器事件名：`eventSource.on('MESSAGE_RECEIVED',...)` 大写死键永不触发——ST 的 `eventTypes.MESSAGE_RECEIVED` **值是小写** `"message_received"`，emit 用常量值、`on()` 按精确字符串匹配。监听器**永远**用 `eventTypes.XXX` 动态取值，别硬编码大写字面量。
2. **解析层（v7.3 `a9e9425`）：** `generateRaw` 传了 `json_schema`，但后端不一定支持结构化输出，会用 ` ```json ... ``` ` 代码块包裹或在 JSON 前后附带说明文字 → `JSON.parse` 失败。修复：加 `parseLoose`——先剥离围栏正则 `^```(?:json)?\s*([\s\S]*?)\s*```$`，直接 parse 失败再手动扫描提取首个平衡 `{...}` 对象（处理字符串转义/嵌套）。**经验：** 不能假设后端尊重 `json_schema`，AI 输出永远要做宽松解析兜底。
3. **数据层（v7.4 `5f085b3`）：** 解析成功的对象仍可能缺漏必填字段（后端不强制 schema 时 AI 可能漏字段）→ `showItemForm` 把 `existingItem` 当编辑模式渲染，name/icon/effect 三个字段没用 `||''` 兜底，**字面渲染 `undefined`**；rarity select 选错默认项。修复：调 `showItemForm` 前按 schema 补全默认值（name→'未命名物品'/icon→'❓'/rarity 枚举校验降级 COMMON/各文本字段非字符串→''/类型特有 usageLimit→1、duration→'短暂'、progress→0.1 clamp [0.05,0.5]）。**注意 id 已有守护**（L5651-5654 `!item.id || !startsWith('custom_')` → 重生成），补全块不必再加（会成死代码）。

**经验总结：** AI 生成链路要按"调用→解析→数据"三层分别容错，每层独立兜底。真机复测时三层要一起验：点 AI生成 → spinner → **预填表单完整可编辑**（非空白/undefined）→ 保存成功。

## 2026-06-27：抽卡系统“调用未定义函数”系统性 bug（getFragments / showFragmentShop）

**根因模式：** 抽卡系统（`src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js` 抽卡块，约 3950-5450 行）在实现时多处引用了某函数名，但定义用了另一个名、或根本没写定义。webpack production build **不会报错**（未定义的运行时引用在 minify 后才暴露为 ReferenceError），所以“build 通过”不等于“无此 bug”。真机运行时这些 handler 多在 jQuery click 内联里，异常被吞，表现为**按钮点击毫无反应**而非明显报错——必须靠 Chrome DevTools MCP `evaluate_script` 主动 `jQuery('#x').trigger('click')` 捕获，或看 console。

**已知三例（同型）：**
1. `resetGachaPity('rare'|'epic'|'mythic')` — 任务1 已修（添加定义）。
2. `getFragments()` — 正确定义名是 `getGachaFragments`（L4426），3 处调用（L4796 面板渲染 + L5006/5055 抽卡后刷新）。**🎁 面板打开即炸、按钮无反应的直接根因。** 本轮修复：3 处 replace_all 改名。
3. `showFragmentShop()` — 2 处调用（L5018/5131 碎片商店按钮），从未定义。任务3 原描述称有此 UI，实际只有调用无实现。本轮修复：补全商店弹窗（调 `exchangeWithFragments`，按 `GACHA_FRAGMENT.cost` 定价）。

**预防方法（每次改抽卡块后必跑）：** 用 node 脚本全量扫描抽卡块内“非点号前缀的裸函数调用”，与全文 `const/let/function` 定义词典比对，排除：CSS 函数（gradient/rgba/translateY...）、jQuery/数组方法（.find/.on/.push...）、JS 内置（Math/JSON/parseInt...）、关键字。输出“调用 N 次但定义行=❌未定义”的符号即为疑似。本轮扫描最终命中 getFragments / showFragmentShop 两个真 bug（其余 18 个疑似均为误判）。

**排查动作模板：** 真机按钮无反应时 → `mcp__chrome-devtools__evaluate_script` 跑 `jQuery('#btnId').trigger('click')` 包 try/catch → 看 `e.message` + `e.stack`，stack 里的 bundle URL 行号即定位。比翻源码猜快得多。

## 2026-06-26：任务1 完成 - 物品目录双层架构 + resetGachaPity bug 修复

- **任务1 实施完成：** 物品目录外置 + 双层合并架构 + resetGachaPity 未定义 bug 修复。
- **新增文件：** `src/神秘复苏模拟器/数据/gacha-items.json` — 27 件物品定义的 source-of-truth。
- **新增函数：**
  - `resetGachaPity(type)` — 保底重置函数（rare→pity.rare=0，epic→pity.epic=0，mythic→全部重置）。修复前该函数被调用 6 次但全文件无定义，每次保底重置抛 ReferenceError。
  - `getAllGachaItemDefinitions()` — 合并 builtin（只读）∪ custom（localStorage）返回完整物品列表
  - `getCustomGachaItems()` / `setCustomGachaItems()` — localStorage 自定义物品层读写
  - `addCustomGachaItem(type, itemDef)` / `removeCustomGachaItem(type, itemId)` — 自定义物品 CRUD
- **重构函数：** `buildGachaPool()` 改为消费 `getAllGachaItemDefinitions()` 合并后的目录，而非旧硬编码数组。抽卡池权重：SUPERNATURAL 池纯灵异物品；ARCHIVE 池线索权重×2、其余×0.5；PATTERN 池知识权重×2、其余×0.5；ALL 池均匀（基础权重用 item.rarity.probability）。
- **保底机制：** 十连保底必出 ★★★（pity.rare 到 10 重置）、50 抽保底必出 ★★★★（pity.epic 到 49/50 重置）、100 抽保底必出 ★★★★★★（pity.total 到 99/100 重置）。
- **删除代码：** 旧的 SUPERNATURAL_ITEMS / CLUE_ITEMS / KNOWLEDGE_ITEMS 硬编码数组（~370 行），改为注释指向新架构。
- **架构要点（决定 JSON 外置方案）：** visualizer 经角色卡 YAML 的 CDN script-link 加载，不走文件同步（publish-card.mjs syncDirs 不含「脚本」目录），故 builtin 目录必须以 JS 对象字面量内嵌，镜像 JSON 文件供人工编辑。
- **双层合并架构（参考 jerryzmtz/my-tavern-scripts）：** builtin（只读，内置 27 件）∪ custom（localStorage，按 id 覆盖或新增）。GachaItemDefinition schema：`{id,name,type,quality/rarity,description,icon,targetTable,targetColumns,customFields}`，灵异物品额外 `effect/effectDetail/usageLimit/duration`，线索/知识额外 `progress`。任务 6（自定义物品 UI 编辑器）、任务 7（目录导入导出）的架构基础。
- **3 张目标表 DB 列头（syncGachaResultToDatabase 写入依据）：**
  - sheet_supernatural_items: `[row_id,物品名称,物品描述,物品效果,稀有度,使用次数,持续时间,获得途径,备注]`
  - sheet_clues: `[row_id,线索编码,线索描述,相关厉鬼,重要程度,发现时间,获得途径,可见摘要]`
  - sheet_collected_rules: `[row_id,规律名称,规律描述,杀人规律,触发条件,破解方法,完成度,相关厉鬼,可见摘要]`

## 2026-06-25：row_id 问题彻底解决 - 14/14 表全部使用数字 row_id

- **修复根因链路：**
  1. **vendor row_id 自动分配**（commit `52b2e62`）：原生模式下 insertRow 函数检测 `headers[0] === 'row_id'` 且 `newRow[0]` 为空时，自动从现有行中找到 max row_id 并分配 max+1。
  2. **fallback plan 字段名修复**（commit `aa50677`）：`buildMfrsClueFallbackPlan_ACU` 和 `buildMfrsChronicleFallbackPlan_ACU` 使用中文字段名（线索编号、纪要编号、时间跨度等）和 `row_id: 1` 初始值。
  3. **CDN ref 更新**（commit `36082bc`）：`publish-card.mjs` 的 `CDN_REF` 从 `c087823` 更新到 `aa50677`。
  4. **角色卡重新打包**：本地 `npm run build` + `npm run publish-card` 完整构建链路打包包含所有最新修复的角色卡。

- **真页验证结果（2026-06-25）：** 14/14 表 row_id 全部为正常数字，零空字符串。
  - sheet_clues: [1] ✅（之前是 [""]）
  - sheet_chronicle: [1, 2] ✅（之前是 [""]，且只有 1 行）
  - sheet_collected_archives: [1, 2] ✅（之前包含 ""）
  - 其他 11 张表全部正常（已确认无回归）

- **数据完整性提升：**
  - chronicle 增加到 2 行（之前只有 1 行）
  - collected_archives 增加到 2 行
  - delta 模式稳定工作，无 checkpoint 退化警告

- **检查方法：** 使用 Chrome DevTools MCP `mcp__chrome-devtools__evaluate_script` 直接读取 `MysteryDatabaseFrontend.exportCurrentData()` 结果。

## 2026-06-24：数据库实际已成功写入 13/14 表——getTableData() 不可靠，exportTableAsJson() 才是正确检查方法

- **重大修正：** 之前用 `acu.getTableData(tableName)` 返回 null 判定"14/14 表为空"是错误的。`getTableData()` 读的是内存缓存（可能未刷新），实际数据存储在 IndexedDB (`auto-card-updater-db`, version 1) 中。
- **正确检查方法：** `acu.exportTableAsJson(tableName)` 返回包含所有表的完整对象，每个表有 `content` 数组（row 0 为表头，后续为数据行）。通过检查 `content.length` 和 `content[0]` 可以确认表头和数据。
- **实际数据库写入结果：** 13/14 表有数据（93%），唯一空表 sheet_collected_rules 是正常游戏状态。表头全部完整（灵异物品 9 列、收录规律 10 列等），v6.29 vendor 修复生效。
- **AI 不直接输出 SQL 是正常行为：** AI 输出 MVU patches + `<sp_*>` 协议块，shujuku_v120 的 fallback 机制从这些协议块中提取信息，生成本地 CRUD plan，成功写入数据库。console 显示 `[MFRS 关键表兜底] 已在校验前补入 N 条本地 fallback plan`。
- **部分 CRUD 操作失败（非阻断）：**
  - `COLUMN_NOT_FOUND: visible_summary` — 表头列名是中文"可见摘要"，但 fallback plan 用英文键名 `visible_summary`。
  - `CHECK_IN_VIOLATION` — 线索表的可信度/验证状态值不在允许列表中（实际数据合规，错误可能来自后续更新操作）。
  - `row_id` 不稳定 — sheet_chronicle 和 sheet_clues 的 row_id 为空字符串，退化为 checkpoint 模式。
- **tableApiPreset 和 plotApiPreset 为空字符串**（不是 null）：数据库写入不依赖这两个 preset，fallback 机制直接从 AI 输出提取数据。
- **IndexedDB 数据库列表：** `SillyTavern_ChatCompletions` (v2), `SillyTavern_Prompts` (v2), `SillyTavern_TextCompletions` (v2), `TavernDB_ACU_VectorHotCache` (v2), `auto-card-updater-db` (v1), `shujuku_v120_config_v1` (v1)。

## 2026-06-24：at_depth depth/role 保真修复在 SillyTavern 运行时确认

- **导入方法：** Chrome DevTools MCP 的 upload_file 工具可以直接将 PNG 上传到 SillyTavern 的导入按钮，SillyTavern 会自动处理导入流程。同名卡存在时自动加序号。
- **ccv3 顶层 depth/role 验证：** 新导入的卡在 `characters[id].data.character_book.entries` 中，数据库联动规则条目确认包含顶层 depth: 4, role: 0。旧卡无顶层 depth/role，只有 extensions 里有。
- **convertCharacterBook 转换验证：** position 从 after_char 变为 4（at_depth），depth/role 正确保留。全部 378 条 at_depth 条目正确映射。
- **extensionPrompts 槽位：** `customDepthWI_4_0`（depth=4, role=0）已注册，content 在实际生成请求时才填充。
- **convertCharacterBook 的 fallback 行为：** 即使旧卡 PNG ccv3 顶层无 depth/role，convertCharacterBook 仍会从 extensions.depth/role 读取并填充。因此旧卡在功能上也能工作，但新卡的区别在于 ccv3 顶层就有这些字段，不依赖 extensions fallback。

## 2026-06-23：Chrome DevTools MCP 配置与加载

- 全局 `chrome-devtools` MCP 配置的 `cwd` 必须指向有效目录。`~/code` 在 Windows 上解析到不存在的 `C:\Users\linlang\code`，导致 `os error 267` 启动失败。改为 `D:\project\tavern_helper_template` 后解决。
- `list_mcp_resources` 返回空不代表 MCP 未加载——chrome-devtools MCP 提供 tools 而非 resources，正确判据是工具列表是否暴露 `mcp__chrome_devtools__*`。
- Codex 运行中的旧会话不会动态暴露新 MCP tool schema；修改配置后需要重启/恢复会话。

## 2026-06-22：tavern_sync at_depth 字段保真修复

- **根因：** v6.30 已把数据库联动规则从绿灯改为蓝灯常驻，但该规则还需要按 SillyTavern 的 at-depth 机制以系统角色、depth 4 注入。`tavern_sync` 之前只把 `depth/role` 写在 `extensions`，没有写到 ccv3 条目顶层。
- **源码修复点：** `tavern_sync.mjs` 的 `to_character_book()` 现在检测 `entry.position === 4`，并为该条目设置顶层 `depth = entry.depth ?? 4`、`role = entry.role ?? 0`。
- **角色卡配置修复点：** 开发版与发布版 `index.yaml` 的"数据库联动规则"均已加 `插入位置: 指定深度 / 角色: 系统 / 深度: 4 / 顺序: 14700`，同时保留蓝灯常驻策略。

## 2026-06-22：CDN ref 修复流程 + publish-card 统一替换机制

- **publish-card 统一替换所有 CDN ref：** `scripts/publish-card.mjs` 配置中的 `CDN_REF` 会统一替换开发版 yaml 中的所有 CDN 链接，不能为单个资源设置不同的 commit hash。
- **正确的 CDN 部署流程：** 1. 提交 source → 2. 等 bot 自动构建 dist → 3. 使用最终的 bundle commit 作为 CDN ref → 4. 修改 `publish-card.mjs` 中的 `CDN_REF` → 5. 运行 `pnpm run publish-card` → 6. 提交发布版 yaml 和 PNG。
- **教训：** 修复 CDN ref 前必须先更新 `publish-card.mjs` 配置，再运行 publish-card，否则会反向替换。

## 2026-06-21：CDP 直读替代 + characterId 运行态源

- **CDP 替代法：** 当 Codex 会话未加载 chrome-devtools MCP 时，可用 `scripts/cdp-evaluate.mjs`（Node 24 内置 WebSocket 连 9222 page target 发 `Runtime.evaluate`）替代。
- **运行态 world_info 源是卡内嵌 ccv3：** `characters[id].data.character_book.entries` 是数据源，不是全局 `world_info`（后者是 HTMLSelectElement 下拉框 DOM）。
- **角色数组索引随重启漂移：** 不要硬编码索引，应按 avatar 文件名或角色名匹配定位。
- **SillyTavern 重启后运行态自动恢复：** 完成 reload + 异步角色数据加载后，运行态自动从干净磁盘文件重载，恢复为 383/33/5851。

## 历史发现压缩索引（旧条目，按版本号回查）

以下旧发现已压缩，详细内容见 `planning_archive_2026-06/` 或 git 历史。

- **2026-06-22 hotfix 清洗时机问题**：界面美化脚本清洗但未写回内存；hotfix 清洗在 GENERATION_ENDED 后执行，界面已渲染完成。
- **2026-06-22 数据库前端 2 表损坏 bug**：灵异物品、收录规律表头截断（已由 v6.29 修复）；事件纪要 CHECK 约束过严（已由 v6.28.1 修复）。
- **2026-06-21 worldbook 回弹根因**：外部 JSON 污染覆盖；6 张污染源卡已删除；外部 JSON 双禁用字段格式修复。
- **2026-06-21 source PNG 污染修复**：HEAD 干净时 `git checkout HEAD -- <png>` 是最安全路径。
- **2026-06-20 及更早**：testCrudPlanDiffTrackingGuards 断言失效、bundle Action 自动重建 dist、chronicle 守卫干净 PR、doubao status 0 治理决策等。详细见 `planning_archive_2026-06/`。
