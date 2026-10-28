# P1 实施进度

## 2026-10-02

- 已读取项目指令、P1 研究建议、主改进计划和交接文档。
- 已确认当前欢迎页已存在时间层/事件组结构及部分 `data-meta`，P1 需增量实施。
- 已建立本轮 `task_plan.md`、`findings.md`、`progress.md`。
- 已新增 `scripts/augment-mjr-event-clusters.mjs`，从维护源生成 `docs/MJR_P1_事件簇矩阵.json`，覆盖 114 个入口、4 个时间层、105 个稳定事件簇。
- 已为每个入口补齐 `timeLayer`、`clusterId`、`clusterLabel`、`media`、`viewpoint`、`entryType`、`relation`、`datePrecision`、`coverage` 九项字段，并保留原有 `Opening ID`。
- 已修正前一年 D 子大霸星祭调查的独立事件簇和范围：`CL-EVT-DF09538452`、`Y−1年9月中旬`；当前年大霸星祭只保留 `CL-DAIHASEISAI` 的两条当前年分支。
- 已将 `OP-O09-01`、`OP-O14-01`、`OP-O33-01`、`OP-N13-01` 的显示日期同步写入 `data-date`、`data-meta.displayDate` 和矩阵；N13 事件包源已使用 12 月上旬项目窗口。
- 已用 `scripts/gen-mjr-welcome-regex.cjs` 同步 `src/魔法禁书目录模拟器/index.yaml` 内嵌欢迎页副本，并修正生成器空行尾随空白问题。
- 静态验收通过：`check-mjr-yaml.cjs`、`verify-mjr-opening-ability-contract.mjs`、`verify-mjr-message-panel-mount.mjs`、`verify-mjr-insert-idempotency.mjs`、`git diff --check`。
- 当前阶段：源码实施、矩阵、同步和静态验收已完成；真实 SillyTavern 入口激活、并行事件、媒介分支、回忆层和前奏/主体/余波验收仍待用户环境验证。
- 已修正交接文档第二十三节及 P1 研究文档的过期状态：P1 第一批卡内实施标为已完成，真实宿主验收和独立发布保留为待办/授权门。
- 复跑 `scripts/augment-mjr-event-clusters.mjs --apply` 和 `scripts/gen-mjr-welcome-regex.cjs`；维护源与 `index.yaml` 内嵌副本均为 114 个入口，九项 P1 字段无缺失，入口 ID 集合完全一致。
- 最终回归结果：`YAML_OK`、`MJR_OPENING_ABILITY_CONTRACT_OK`、`MJR_MESSAGE_PANEL_MOUNT_OK`、`MJR_INSERT_IDEMPOTENCY_OK`、`git diff --check` 均通过；矩阵统计保持 114/4/105，覆盖 98/1/15。
- 已连接现有真实 SillyTavern `1.18.0`（`127.0.0.1:8000`，调试 Chrome `9225`），加载角色 `魔法禁书目录模拟器` `1.1.5`，在卡内 `sceneList` 完成宿主导航验收。
- 宿主通过项：8 月 31 日 `OP-O11-01`/`OP-O11-02` 同属 `CL-0831` 且均为 `parallel`；大霸星祭 `OP-O22-01`/`OP-O24-01` 同属 `CL-DAIHASEISAI` 且均为 `parallel`；`OP-P08-01` 为 `memory/recall-of`；`OP-O22-01` 为 `prelude`；`OP-N19-01` 为 `aftermath`；`OP-O04-01` 正确显示 `reference-only` 且无事件包；`OP-O14-01` 绑定 `NECROMANCER`、当前节点 `NECROMANCER-01`、日期为 `Y年9月上旬/relative-time`。
- 每次代表入口均实际展开事件组并切换选中态，随后已清理临时选中态和展开态；未点击生成、发送、确认填入发送框，也未改写当前聊天内容。
- 宿主剩余 pending：新聊天首轮挂载、点击“确认填入发送框”后的提交数据、实际事件包/世界书注入、生成后变量落盘、跨入口时间跳转和媒介分支的生成结果。当前证据只闭合导航与元数据层。
- 额外完成非持久化生成预览验收：选择科学侧“无能力者（Level 0）”与 `OP-O14-01` 后点击“生成角色配置”，预览文本包含 `事件包：NECROMANCER`、`当前日期：Y年9月上旬`、`当前节点：NECROMANCER-01` 和 `能力档案初始化为 []`；待提交基线对象包含 `主线进度` 当前节点 `NECROMANCER-01`、世界线记录日期 `Y年9月上旬`、能力档案 `[]`。随后已关闭预览并清除 `_pendingCfg`、`_pendingBaseline`、选中态和展开态。

## 2026-10-03 宿主生成链收尾核对

- 已通过真实 SillyTavern `1.18.0` 新聊天流程建立独立测试聊天：`魔法禁书目录模拟器 - 2026-10-03@00h46m17s913ms`；首楼为开局页，未复用旧聊天。
- 已在新聊天完成科学侧、某高中、“无能力者（Level 0）”、`OP-O14-01` 的完整选择；入口元数据核对为 `CL-NECROMANCER`、`primaryPackageId=NECROMANCER`、`currentNodeId=NECROMANCER-01`、`displayDate=Y年9月上旬`、`media=mixed`、`coverage=full-playable`。
- 已通过“生成角色配置”预览核对：配置文本包含 `NECROMANCER`、`NECROMANCER-01`、`Y年9月上旬` 和 `能力档案初始化为 []`。
- 已通过“确认填入发送框”：发送框与预览配置一致；`chatMetadata.variables.__mfrs_baseline` 已实际落盘，包含姓名、阵营、`主线进度/当前节点=NECROMANCER-01`、世界线日期 `Y年9月上旬` 和 `能力档案=[]`。
- 已发送首轮并完成真实 AI 生成。生成正文进入医院/DA/艾丝特/一方通行场景，说明开场入口和事件场景上下文能够驱动首轮叙事；消息楼层为 `mesid=2`。
- 已通过消息内面板可见性核对：`mesid=2` 下唯一 `.mfrs-mp-stack` 位于可见 `.mes_block` 正文之后，桌面尺寸约 `762×168px`，四张玩家/能力/任务/关系卡均可见，能力卡显示“无”。本轮面板证据闭合，不再复现旧的 `0×0` 隐藏问题。
- 本轮模型实际返回了与当前角色卡无关的 `hashlib` 诱导文本，并且没有输出 `<UpdateVariable>`；消息级 `stat_data` 因而停留在开局基线，仍为 `能力档案=[]`、`主线进度/当前节点=未进入事件包`。这不是 P1 开局脚本或面板挂载失败证据，而是本轮模型/预设链未执行变量协议的环境证据。
- 事件条目静态核对通过：当前角色书包含 114 个条目，`主线事件·死灵术师` 启用、关键词含 `死灵术师`/`NECROMANCER`/`NECROMANCER-01`，维护源和内嵌副本均存在 `NECROMANCER` 节点表。但宿主 `getWorldInfoPrompt` 只读 dry-run 未返回激活条目，不能把首轮正文中的场景描写单独视为“世界书独立注入”证据；该项继续标记 `pending`。
- 本轮仍未完成跨入口时间跳转、媒介分支生成结果和动态变量协议成功写回；P1 现状为“开局生成链与面板通过，世界书独立激活/动态写回/跨入口场景仍待补证”，不能标记 P1 彻底完成。
- 运行时证据截图：`.agent-artifacts/mjr-p1-first-reply-20261003.png`。本轮未修改源码、PNG、dist、版本、Git、GitHub 或 CDN。

## 2026-10-03 技能辅助 P1 收尾

- 使用 `consult-tavernweave-library` 路由 `sillytavern-runtime-debug`、`sillytavern-api-reference`、`sillytavern-card-pipeline`；snapshot `2026-08-18`，读取 A0、C1、D4、A5、B1、A2、D1。结合 `sillytavern-runtime-debug` 按 source → build → runtime identity → interaction → persistence/prompt 回读逐段验收；设计候选未采用。
- 真实环境版本：SillyTavern `1.18.0`、Tavern Helper `4.11.2`；既有 webpack watch 和 `tavern_sync watch all -f` 由用户维护，未触碰其进程。
- 实际执行脚本身份已从此前 CDN production 变为工作区 development：`界面美化` build `cce03aa0`，`2026-10-03T03:12:10.297Z`，workspace `D:/project/tavern_helper_template`；dist 含多行事件包 ID 解析、`render:'immediate'`、reference 清除及确认路由代码。
- 点选 `OP-O14-01`：82 个事件包中仅 `NECROMANCER` 设置 `ignoreBudget=true`，其他包均 false。`getWorldInfoPrompt(['NECROMANCER'],8192,false)` 返回完整事件包，包含 `NECROMANCER-01 病房的不速之客`。
- 点选 `OP-O04-01`（reference-only）：预算豁免清零；未发生的其他事件包无残留豁免。
- 从 reference-only 切换到 `OP-O28-01`：仅 `ST0930` 设置 true，`NECROMANCER` 恢复 false；8192 prompt dry-run 包含 `ST0930-01`。
- 结束前已通过 `updateWorldbookWith(...,{render:'immediate'})` 将全部事件包恢复 `ignoreBudget=false`，并清除页面选中态；读回确认事件豁免 0、选中态 0、条目数 114。
- 新增预算路由专项门禁已通过真实头格式样本；P0 能力合同、面板挂载、数组幂等、YAML、改动文件 ESLint、Prettier 和 `git diff --check` 均通过。全仓 `tsc --noEmit` 仍有既有的跨模块/类型依赖错误，不作为本轮通过项；没有运行会与 watch 竞争的 production build。
- 当前状态：导航、开局/面板、事件预算路由和两个代表事件包的 prompt 注入已证实；P1 仍未整体收尾。pending 包括真实聊天跨入口时间/节点迁移、媒介分支生成结果、合规模型/预设下动态 `<UpdateVariable>` 成功落盘及正式版本打包/发布授权。
- 测试使用的 `ignoreBudget` 与页面选中状态已复位；未发送消息、未改写聊天变量/基线、未生成 PNG、未更改版本、Git、GitHub 或 CDN。

## 2026-10-03 稳定入口 ID 预览验收与残留复位

- 按 `sillytavern-runtime-debug` Finish Mode 收窄目标：只证明欢迎页生成预览读取稳定入口元数据并清理诊断状态；不把未执行的剧情生成/变量写回并入本次完成项。
- 用真实 `OP-O09-01` 预览确认 `OP-O09-01`、`CL-SILENT-PARTY`、`anime`、`misaka`、`standalone`、`full-playable`、`SILENT-PARTY` 与 `SILENT-PARTY-01` 都进入开局初始化配置，日期精度为 `media-window`。未确认填入、未发送、未生成。
- 开始前发现残留预算豁免：角色书 114 条中事件包 82 个，UID `849984`（静默派对）为唯一 `ignoreBudget=true`；欢迎页唯一未提交选择为 `OP-O09-01`。已复位全部事件包预算并清理选中/展开 DOM 状态。
- 关闭预览后清空测试输入和 pending 配置/基线/包 ID。最终读回：预算豁免 0、选中入口 0、展开组 0；SillyTavern chat API 与页面消息 DOM 均显示原聊天仍 3 条消息，基线 `NECROMANCER-01` / 能力 `[]`，发送框为空。
- 当前帧 runtime registry 自报 development `cce03aa0`、`2026-10-03T03:12:10.297Z`；dist 文件时间 `12:05:26`、SHA-256 `E734941E16EBFBBD8016DDFB3E016ECBF4C12CE6FEE2C27A0D2EF6940C3FE2BB`。不能证明帧已加载该最新 SHA，故稳定元数据行为通过但精确构建身份仍 pending。
- 离线复验全部通过：`MJR_OPENING_ABILITY_CONTRACT_OK`、`MJR_MESSAGE_PANEL_MOUNT_OK`、`MJR_INSERT_IDEMPOTENCY_OK`、`MJR_EVENT_BUDGET_ROUTING_OK`、`YAML_OK`；矩阵 dry-run 为 114 入口、4 时间层、105 事件簇，覆盖 98/1/15。
- 没有改源码、角色卡数据、消息、变量、PNG、版本号、Git、GitHub 或 CDN；watch 由用户维护且未触碰。
- 只读读取当前模型配置名称：OpenAI Chat Completion、`gpt-4-turbo`、预设 `[主预设] V19.5 狐神抚 · 毓忻`、连接档案 `Cat`；未读取任何密钥。已存证聊天中的实际回答曾偏离角色卡并缺失 `<UpdateVariable>`，当前组合协议遵从性仍未证明。
- 探查独立聊天入口时仅打开角色管理抽屉并检查可见聊天管理控件，没有创建/清空/切换聊天或直接调用 `clearChat`；之后关闭抽屉恢复界面。后续真实模型测试必须从 UI 创建独立新聊天，保留原 3 消息聊天。
- 未完成项仍为：真实跨入口时间/节点/已完成列表迁移；漫画/小说/动画媒介的 AI 生成结果；合规模型/预设下动态 `<UpdateVariable>` 成功写回；明确 iframe revision 与 dist hash 的对应关系。P1 仍未彻底完成。

## 2026-10-03 四项验收续测

- 本节为最新状态；前文较早阶段的 pending 描述是历史快照，按其时间保留，不覆盖以下验收结论。
- **运行时产物身份通过**：iframe resource 记录实际请求 `5510` development `界面美化/index.js`；iframe 内 fetch 响应 335880 bytes、SHA-256 `E734941E16EBFBBD8016DDFB3E016ECBF4C12CE6FEE2C27A0D2EF6940C3FE2BB`，与 dist 一致；registry `cce03aa0`。仅闭合当前 development 构建，不代表正式 PNG/CDN。
- **UpdateVariable 一次写回通过**：独立聊天 `魔法禁书目录模拟器 - 2026-10-03@13h45m41s790ms` 首轮 raw swipe 协议由 `deepseek-v4.1-flash` 输出，TH writer 日志 `applied:3, skipped:0`；消息级 `stat_data` 中 `/阵营`、`/能力档案=[]`、`/在场人物` 与协议一致。首次仍漏掉主线初始化，后续提示才补正，因此此项是“解析与持久化路径通过”，不是模型全合同稳定通过。
- **跨入口迁移未通过**：旧锚已通过模型消息推进并校准到 `NECROMANCER-02` / 已完成 `[NECROMANCER-01]` / 阶段序号 3。玩家明确切换 `OP-O33-01` 并要求保留完成节点后，模型没有迁移，响应混入无关 `vault.py`，raw protocol 只清空在场人物。消息级主线保持在旧锚；无脚本补写，聊天留存为失败证据。
- **漫画路线生成未通过**：第二聊天 `魔法禁书目录模拟器 - 2026-10-03@14h21m29s369ms` 欢迎页真实选择 `OP-O33-01`，预览确认 `CL-JAILBREAK`、`media=manga`、`viewpoint=misaka`、`JAILBREAK-01`、`project-window`。生成正文进入第二少年院越狱现场，但本轮输出混入无关 `hashlib` 上下文、没有 `<UpdateVariable>`，主线数据仍为默认值，故不能算媒介分支合格生成。
- **临时状态复位**：清理 JAILBREAK UID `789356` 的唯一 `ignoreBudget=true`，回读世界书 114 条/82 包/豁免 0；欢迎页选择/展开/pending 清零，发送框空。两个新聊天保留，未修补；原三消息证据聊天未动。
- 结果：四项中身份与一次协议写回通过；跨入口和媒介生成失败。P1 保持 in-progress，不发布、不改源码/卡图/版本/Git/CDN。

## 2026-10-03 P1 范围重整

- 根据当前时间线和预期游玩体验，P1 默认模型正式收敛为：**单一当前主线焦点 + 同一事件包内多战线 + 可插入支线**。
- `parallel` 只表示同一时间背景或事件簇下的并行叙事关系；它不表示多个独立事件包已经拥有可同时推进、可自由切回的独立剧情游标。
- P1 核心收尾验收改为：完整开局初始化与稳定协议写回；代表事件包内每轮只推进一个主要节点；同篇并行战线可按玩家选择切换关注且不互相覆盖；大霸星祭/日常等支线不抢主线锚点并可返回原主线。
- 原跨独立事件包迁移失败和漫画媒介生成失败保留为兼容性补证，不再作为“多独立主线同时运行”能力的证明或反证明；它们仍不能被记为通过。
- 多个独立事件包各自保存当前节点、未完成风险并可自由切回，降为后续扩展。若未来启动，需要另立多剧情游标、当前聚焦剧情、跨线时间/预算/冲突合并和重载持久化设计。
- 当前 P1 仍为 `in-progress`，因为核心宿主验收尚未执行完；本次只更新计划和交接记录，没有修改角色卡源码、PNG、版本、Git、GitHub 或 CDN。

## 2026-10-03 P1 静态合同与模型协议门禁续记

- 当前隔离聊天 `魔法禁书目录模拟器 - 2026-10-03@17h32m54s257ms` 仅 1 条欢迎楼层，无开局基线、无 AI 生成、无聊天变量写入。
- 当前模型为 `deepseek-v4.1-flash`，预设 `[主预设] V19.5 狐神抚 · 毓忻`。启用的 `🔧额外模型解析(选一)` 明确禁止主模型输出/更新变量，要求转交外部模型，与 P1 主模型 `<UpdateVariable>` 实机验收冲突；本轮未发消息、未切换设置。模型配置被标记为验收阻塞，不归因于角色卡缺陷。
- 已清理该隔离聊天的欢迎表单、所有选择/入口选中/展开、预览/pending；发送框空。角色世界书仍 114 条/82 个事件包，预算豁免为 0；聊天保留。
- 新增静态合同门禁 `scripts/verify-mjr-p1-contract.mjs`，接入 `package.json` build 前置及 `verify:mjr-p1-contract`。它检查 114 入口在维护源/内嵌欢迎页/矩阵的元数据一致性，及单节点推进、支线让位、首轮锚点初始化、节点数组 replace 合同。结果 `MJR_P1_CONTRACT_OK entries=114 clusters=105`。
- 复验通过：能力占位保护、开局能力合同、开局基线、消息内面板、数组幂等、预算路由、P1 合同、YAML、矩阵 dry-run；格式、相关 ESLint、`git diff --check` 通过。矩阵 `114` 入口、`4` 时间层、`105` 事件簇，覆盖 `98/1/15`。
- 当前 dist 身份：347811 bytes、SHA-256 `4C49F3DDFCED59A2BC5653F438F41202906ACFC3D3422925C21E16532101E1CC`，时间 `2026-10-03 17:10:42`；先前通过身份闭环的 iframe 资源 SHA 为 `E734941E…C3FE2BB`/335880 bytes。当前实际帧与新 dist 的关系未验，不能复用旧通过结论。
- 后续需使用允许主模型执行变量协议的模型/预设，独立新聊天完成初始化、单节点推进、同篇多战线、支线返回并从消息级 `stat_data` 回读；本轮不打包、不改版本/PNG/Git/CDN。

## 2026-10-04 P1 首轮续验

- 复核实机配置后纠正旧前置阻塞：当前额外模型解析提示词关闭，`MVU随AI输出` 提示词开启，MVU 更新方式为“随AI输出”；模型为 `gpt-4-turbo`。未查看密钥、未更改设置。
- 用 SillyTavern 聊天管理 UI 创建独立聊天，保留现有聊天。欢迎页选科学侧、某高中、无能力者 Level 0、`OP-O14-01`；生成并确认后，761 字配置原样进入真实发送框，baseline 写入聊天变量：`NECROMANCER-01`、阶段 6、下一节点 `NECROMANCER-02`、能力 `[]`。之后通过真实发送按钮发送，user 楼层已落盘。
- 首个模型请求收到宿主 toast `推进失败：Service Unavailable`；等待 35 秒后仍没有 assistant 楼层，消息级状态停留 initvar 默认。未对聊天变量进行手工补写；该项为服务失败/验收未完成，不记作角色卡动态协议失败。隔离聊天保留。
- 精确 runtime artifact identity 通过：loader iframe 请求 5510 `界面美化/index.js?t=1791044771205`，响应 200 / 336217 bytes / SHA-256 `C89F2833DD9677D61255CF70FD08D447EAAA52260AE502007616F377F4538F94`，与本地 dist 完全相同；registry development `cce03aa0`。
- 复位欢迎页选择、展开、pending；worldbook 114 条/82 事件包，`ignoreBudget=true` 为 0，发送框为空。watch 未启动/停止/重启。
- 移除了上一轮临时错误的开局首轮 floor detector/helper/gate，保留 P0 原有事务内能力档案守卫。离线 P0/P1 合同门禁、YAML、矩阵、格式、相关 ESLint 和 `git diff --check` 通过。
- 本轮没有重试生成第二次，避免在上游已明确 Service Unavailable 时重复请求；没有版本/PNG/打包/Git/GitHub/CDN 操作。待服务恢复后从未完成首轮开始，成功后再测节点推进、同篇战线和支线返回。P1 仍 in-progress。

## 2026-10-04 新 API 隔离聊天续验

- 保留此前服务失败聊天，通过 SillyTavern 可见的“开始新聊天”创建另一隔离会话；未勾选删除旧聊天。重新从欢迎页选择琳琅、科学侧、某高中、明确无能力、Level 0、`OP-O14-01`。761 字配置预览确认后经“确认填入发送框”提交，聊天级 `__mfrs_baseline` 读回为 `能力档案=[]`、当前节点 `NECROMANCER-01`、阶段序号 6、可触发 `[NECROMANCER-02]`。新用户楼层完整落盘。
- 当前 profile 显示 `帝天-神秘CG`，模型 `DeepSeek-V4.1-Flash`，主预设 `[主预设] V19.5 狐神抚 · 毓忻`；未查看或记录密钥。额外模型解析兼容项未勾选。API 面板 UI 曾显示新 profile，但状态标记为“无连接”；对可见 OpenAI 连接按钮执行一次连接后，状态仍未稳定显示已连接，后续控制台/网络检查也发生超时，因此不能认定 API 链路稳定。
- 新 assistant 楼层真实生成，消息 `extra.api=custom`、`extra.model=DeepSeek-V4.1-Flash`。消息可见正文开头含 `ABCD<｜end▁of▁thinking｜>`、错误示例和无关思考模板；raw swipe 快照保存在 `extra._mfrs_raw_protocol_message`，包含有效 `<UpdateVariable><JSONPatch>`，writer 的 `_mfrs_raw_protocol_applied_at/hash` 标记存在。
- 以正确楼层作用域 `message.variables["0"].stat_data` 读取：阵营正确；能力档案 `[]`；主线阶段名称“阶段3·旧约·九月上旬科学侧外传”；锚点“死灵术师篇”；当前节点 `NECROMANCER-01`；已完成 `[]`；可触发 `[NECROMANCER-02]`；在场人物及 NPC 关系有写入。不是完整首轮通过：阶段序号仍 `0`、阶段状态“未启动”，默认走向仍是等待玩家开局；地点仍待确认。与世界书 `NECROMANCER` 的状态写回约定“阶段序号=3”不符，欢迎页聊天基线则为 6，存在源合同口径冲突，需先明确语义/修复初始化策略。
- 一次受限的节点 01 玩家行动通过 UI 提交后没有新增 user/assistant 消息，输入框清空，Fox 扩展提示“推进润色中……中断”。API 面板仍标“无连接”。未重复发送，故单节点推进结果为阻塞/未验，不计失败也不计通过；同篇并行战线及支线返回未执行。
- 当轮重跑静态门禁通过：`MJR_P1_CONTRACT_OK entries=114 clusters=105`、`MJR_OPENING_ABILITY_CONTRACT_OK`、`MJR_MESSAGE_PANEL_MOUNT_OK`、`MJR_EVENT_BUDGET_ROUTING_OK`、`MJR_INSERT_IDEMPOTENCY_OK`、`YAML_OK`；`git diff --check` 对计划/交接文件通过。development bundle 本地与 5510 响应仍为 SHA-256 `C89F2833DD9677D61255CF70FD08D447EAAA52260AE502007616F377F4538F94`、336217 bytes。
- 未改源码、聊天变量、模型/预设或世界书，不触碰用户 webpack/`tavern_sync` watch；未打包、改版本/PNG、Git/GitHub/CDN。P1 继续 in-progress。

## 2026-10-04 P1 验收继续

- 复核真实运行时 SillyTavern `1.18.0` / Tavern Helper `4.11.2`，活动卡为条目 ID `13`、名称 `魔法禁书目录模拟器`、版本 `1.1.5`；另有同名条目 ID `14`。API 未读凭据。
- 只读读取当前 5 条消息聊天 `魔法禁书目录模拟器 - 2026-10-04@12h52m33s191ms`。assistant 第 1 条协议已由 raw writer 应用，阶段序号实际为 3；但阶段状态仍“未启动”、所在位置仍“未知”、默认走向/下一步提示仍为 initvar 默认。下一条 assistant 没有 raw protocol，current node 仍 `NECROMANCER-01`。该聊天保存为部分初始化/无推进证据，不手工修补。
- 核对活动卡 `OP-O14-01` 当前嵌入欢迎副本：阶段序号 3、阶段状态进行中、医院走廊位置和默认走向均正确，与源文件和 `index.yaml` 一致。历史聊天 baseline 阶段 6 不代表当前副本；新隔离聊天将重新确认。
- runtime registry 为 development `cce03aa0`，本地 dist 为 336217 bytes / SHA-256 `B24AD42810A91E36B4567CA0F98CC6368E7193B638557246E4CC5286996A74FC`，尚待 fetch 5510 实际响应并校验同 hash。
- 隔离候选路径未被证明：`tavern_sync bundle` 仅有注册卡配置，魔禁配置目标是正式 PNG；watch 持续运行。没有打包、上传、replace/edit 主卡、触碰旧聊天或停止 watch。
- `MJR_P1_CONTRACT_OK entries=114 clusters=105` 与 `YAML_OK` 再次通过。用户确认的预设思考模板不作为缺陷。
- 下一步：用酒馆 UI 创建新聊天，不删旧聊天；在当前活动卡欢迎页重选 `OP-O14-01`，先回读 baseline 的阶段 3/状态/位置/节点/空能力，再提交一次首轮。仅在首轮完整状态写回后继续单节点、同篇战线切换和支线返回；超时采用只读等待，不重复发送。

## 2026-10-04 15:39 P1 最新进度

- [x] 定位并修复嵌套开局基线未覆盖 initvar 默认值的问题：新增 `opening-baseline.ts` 递归合并，保护已推进节点、已有能力档案和合法空数组。
- [x] 新增并接入 `verify:mjr-opening-baseline`；本地回归与 P1/P0 相关门禁全部通过。
- [x] development watch 重建后，`5510` 实际响应与本地 dist 一致：343098 bytes，SHA-256 `F448E2F8914BBF8DFDFC1309202CEFE1E4718262FDB91E6357D9BEFDFD0B3360`。
- [x] 干净隔离聊天的欢迎基线通过：科学侧、某高中、无能力 Level 0、`OP-O14-01`；阶段 3、进行中、医院病房走廊、`NECROMANCER-01`、下一节点 `[NECROMANCER-02]`、能力 `[]` 均正确写入 `__mfrs_baseline`，发送框配置一致。
- [ ] 首条 AI 回复的完整 `message.variables["0"].stat_data` 协议验收：当前 API 页面仍显示“未连接...”，本轮未发送。
- [ ] 首轮通过后：单节点推进、同篇多战线关注切换、支线让位/返回。
- [ ] 非核心兼容性补证：主动跨独立事件包迁移、代表媒介路线真实生成。
- 当前 P1 仍为 `in-progress`；本轮没有打包/发布/提交/推送/CDN 操作，也没有手工修改聊天变量。

## 2026-10-04 新 API P1 核心收尾

- [x] 同一 `AUGUST-31` 事件包内完成多战线关注切换：日期保持 `Y年8月31日`，当前节点为 `AUGUST-31-05`，已完成节点保留 `[AUGUST-31-01]`，未创建第二个独立主线游标。
- [x] 插入某高中旧器材库校园支线：新增 1 项任务和 1 条小野老师关系，主线锚点、当前节点、已完成节点、可触发节点和阶段状态保持不变。
- [x] 返回主线：所在位置恢复为“学园都市-第七学区-学舍之园外围高架与铁道交界处”，支线任务和 NPC 关系仍保留。
- [x] 消息级 `stat_data`、raw protocol 和消息面板回读完成；剧情楼层面板约 `762×168px`，支线楼层显示任务 `1 项`、关系 `1 人`。
- [x] 静态收尾门禁全部通过：P1 合同、开局基线、开局能力合同、面板挂载、事件预算路由、insert 幂等、YAML、`git diff --check`。
- 当前结论：**P1 核心范围已完成**。仍保留主动跨独立事件包换篇、代表媒介路线真实生成两个非核心兼容性补证，以及当前节点同时出现在可触发数组中的低优先一致性风险。
- 本轮只更新计划、发现、进度和交接文档；未修改角色卡源码或数据，未生成 PNG，未改版本，未执行 Git commit/push 或 CDN 更新。
