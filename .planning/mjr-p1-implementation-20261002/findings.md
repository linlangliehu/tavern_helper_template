# P1 实施发现

## 2026-10-02 基线

- 当前正式发布基线为 `1.1.5`；工作区有用户/watch 产生的未提交改动，不能回退或混入其他卡。
- `src/魔法禁书目录模拟器/自定义开局/欢迎页.txt` 已存在 `.mw-time-layer`、`.mw-event-group` 和 `data-meta`，说明此前已经完成一部分时间层/事件组 UI 改造。
- 现有入口元数据已包含：`timeLayerId`、`timeLayerLabel`、`displayDate`、`datePrecision`、`workLineId`、`stageId`、`chapterId`、`openingId`、`primaryPackageId`、节点链和覆盖相关的初始化信息。
- P1 需要在现有结构上补齐事件簇字段，不应另造一套平行开场协议。

## 路由收据

- 主技能：`tavern-card-builder`，写入前已读取 A0。
- 路由：`tavern-card-builder`。
- 加载指南：ST-A2、ST-A3、ST-A4、ST-A6、ST-B1、ST-C10。
- 快照：`2026-08-18`。
- 未决运行时事项：真实 SillyTavern 中的入口选择、事件激活和跨层切换尚未在本轮证明。

## 证据裁决

- 8 月 31 日必须保持三条并行视角，不把共享日期当成同一现场。
- 大霸星祭应保留共同祭典背景，并把科学侧、魔法侧和日常活动标为不同事件簇分支。
- 使徒十字主体为 9/19，20 日凌晨是追捕余波；不再使用 9/25 闭幕夜作为其主体日期。
- 死灵术师使用“8/31 之后、9 月上旬”的相对窗口；现有 `9月1日` 若无同媒介绝对日证据，日期精度应降级。
- N13 僧正追击保留“12 月上旬/项目窗口”，不在 12/1 与 12/3 之间强行裁为原作精确日。

## 2026-10-02 第一批实施结果

- 当前维护源共有 114 个开场入口、4 个叙事时间层和 105 个稳定事件簇；覆盖为 98 个 `full-playable`、1 个 `partial`、15 个 `reference-only`。
- 事件簇字段写入欢迎页事件组和入口 `data-meta`，矩阵由 `scripts/augment-mjr-event-clusters.mjs` 同步生成；原有 `Opening ID` 未改变。
- `暗部的ITEM｜D子／前一年大霸星祭调查` 不属于当前年 `CL-DAIHASEISAI`，已独立为 `CL-EVT-DF09538452`，范围恢复为 `Y−1年9月中旬`。
- 当前年 `CL-DAIHASEISAI` 保留魔法侧大霸星祭前奏 `OP-O22-01` 与超炮科学侧 `OP-O24-01` 的并行关系；`OP-O11-01`/`OP-O11-02` 仍保持 `CL-0831` 与 `parallel`。
- 日期重写现在同时更新入口的 `data-date`、场景日期显示、`data-meta.displayDate` 和矩阵 `displayDate`，避免界面与账本分叉。
- `src/魔法禁书目录模拟器/index.yaml` 的内嵌欢迎页副本已同步，YAML 可解析且包含 `CL-EVT-DF09538452`、`CL-DAIHASEISAI` 和 N13 的 `12月上旬` 日期。
- 事件组原有折叠 UI 未被重建；本轮新增的是稳定导航元数据，不宣称已经完成按事件簇/媒介/视角的宿主筛选 UI。真实入口激活和跨入口切换仍以酒馆实机为准。

## 2026-10-03 事件预算路由宿主验收

- 技能收据：主工程技能为 `sillytavern-runtime-debug`；TavernWeave snapshot `2026-08-18`，路由 `sillytavern-runtime-debug` / `sillytavern-api-reference` / `sillytavern-card-pipeline`，读取 `ST-A0`、`ST-C1`、`ST-D4`、`ST-A5`、`ST-B1`、`ST-A2`、`ST-D1`。目录候选没有被采纳。
- 宿主：SillyTavern `1.18.0`、Tavern Helper `4.11.2`、现有调试 Chrome CDP `9225`；卡为 `魔法禁书目录模拟器`，正式基线仍为 `1.1.5`。本次实际执行 `界面美化` 的 runtime identity 为 `mode=development`、`workspace=D:/project/tavern_helper_template`、`commit=cce03aa0`，build time `2026-10-03T03:12:10.297Z`；用户维护的 webpack 与 tavern_sync watch 已在运行，本轮未启动/停止。
- `scripts/verify-mjr-event-budget-routing.mjs` 用真实事件包两行头格式回归：`【事件包：...】` 后续行 `事件包ID：...`；多行扫描和只改事件包的行为门禁通过。
- 实际点选 `OP-O14-01` 后，当前角色世界书 114 条中识别出 82 个事件包；回读仅 `NECROMANCER` 的 `ignoreBudget=true`，其 UID 为 `835212`，其余事件包为 false。
- `SillyTavern.getContext().getWorldInfoPrompt(['NECROMANCER'], 8192, false)` 返回对象的 `worldInfoString` 包含 `事件包ID：NECROMANCER` 和完整节点 `NECROMANCER-01 病房的不速之客`，`worldInfoString` 序列化长度约 25,277 字符；独立证明 8192 上下文注入 dry-run 成功。
- 随后点选 `OP-O04-01`（`reference-only`，`primaryPackageId=null`），回读 82 个事件包的预算豁免全部清除，非事件条目不受影响。
- 再点选 `OP-O28-01`，仅 `ST0930`（UID `330937`）豁免；`NECROMANCER` 恢复 false；8192 dry-run 返回 `ST0930-01` 节点正文。
- 测试结束将所有事件包 `ignoreBudget` 复位为 false，并清空欢迎页临时选中态；回读确认预算豁免 0 项、选中入口 0 项、世界书仍为 114 条。
- `updateWorldbookWith` 签名依据：项目 `@types/function/worldbook.d.ts` 与技能路由指南 E5/C2；运行时 API 事务可写入、回读且可恢复。技能文档仅为导航快照，宿主读回是行为证据。
- 之前运行时读取出现两次误差：一是命令行正则转义造成事件条目计数为 0，改用稳定字符串包含读取；二是酒馆刚重载后短暂停留初始化页，等待初始化后恢复既有聊天。两者均不构成产品故障。
- 剩余边界：本轮没有触发 AI 生成，也没有证明模型动态变量 `<UpdateVariable>` 成功写回、跨入口剧情时间/已完成节点迁移正确或漫画/小说/动画媒介分支真实生成；这些继续 pending。未打包、未改 PNG/version/Git/CDN。

## 2026-10-03 稳定入口元数据预览与状态复位

- 依据：真实 SillyTavern `1.18.0` 与 Tavern Helper `4.11.2`；Chrome CDP `9225`；当前聊天 `魔法禁书目录模拟器 - 2026-10-03@00h46m17s913ms`。本轮复用现有欢迎页，只执行本地“生成角色配置”预览，不确认填入、不发送、不生成。
- `OP-O09-01` 预览中实读：`openingId=OP-O09-01`、`timeLayerId=TL-Y`、`datePrecision=media-window`、`clusterId=CL-SILENT-PARTY`、`media=anime`、`viewpoint=misaka`、`entryType=main`、`relation=standalone`、`coverage=full-playable`、`primaryPackageId=SILENT-PARTY`、`startNodeId/currentNodeId=SILENT-PARTY-01`。这证明该次运行时的配置预览消费者读取并输出了这些字段；不证明模型实际生成或 MVU 写回。
- 恢复前状态存在一项测试残留：世界书 114 条中 82 个事件包只有 UID `849984`（静默派对）为 `ignoreBudget=true`，欢迎页选中 `OP-O09-01`。通过当前 TH `updateWorldbookWith` 事务复位事件包预算，再关闭预览、清除 pending 对象、测试表单输入、入口选中态和展开态。复位后读回 82 个事件包全部 `ignoreBudget=false`，选中入口/展开组均为 0。
- 最终检查聊天 API 与 DOM：消息数均为 3，消息 ID `0/1/2`；聊天基线仍为 `NECROMANCER-01` 和 `能力档案=[]`，发送框为空。没有新增或删除聊天消息。
- 运行时 revision 尚有身份不确定性：runtime registry 自报 `cce03aa0`、build time `2026-10-03T03:12:10.297Z`；当前 `dist/魔法禁书目录模拟器/脚本/界面美化/index.js` SHA-256 为 `E734941E16EBFBBD8016DDFB3E016ECBF4C12CE6FEE2C27A0D2EF6940C3FE2BB`、文件时间 `2026-10-03 12:05:26`。缺少新鲜 iframe reload / hash 绑定信号，不能将该 hash 声称为预览实际运行产物。
- 复验通过：`MJR_OPENING_ABILITY_CONTRACT_OK`、`MJR_MESSAGE_PANEL_MOUNT_OK`、`MJR_INSERT_IDEMPOTENCY_OK`、`MJR_EVENT_BUDGET_ROUTING_OK`、`YAML_OK`；矩阵 dry-run 仍为 114/4/105，覆盖 98/1/15。
- 仍待真实行为证据：跨入口迁移及已完成节点保留、不同媒介路线 AI 生成、合规预设下 `<UpdateVariable>` 成功解析/持久化，以及实际 iframe 执行身份闭环。不能以预览、脚本注入或源代码推导替代。
- 当前 SillyTavern 选择为 API `openai`（聊天补全）、预设 `[主预设] V19.5 狐神抚 · 毓忻`、连接档案 `Cat`、模型 `gpt-4-turbo`。已有保存的实机聊天响应曾输出无关诱导内容且省略 `<UpdateVariable>`，所以该模型/预设组合尚未证明遵守本卡协议；本轮不改设置、不读取密钥，也不向该证据聊天追加生成。模型协议与媒介生成验收应在新建的独立测试聊天运行。
- 新聊天 UI 探查只读展开角色管理抽屉，发现管理聊天按钮位于独立聊天历史弹窗而非当前可见区域；没有调用可能清空/创建聊天的底层 API。检查后已关闭抽屉，当前聊天和用户导航恢复原状。

## 2026-10-03 四项实机验收续测结果

- 本节覆盖此前快照中“动态写回/精确身份待证”的当前状态；更早措辞仅记录其发生时的证据边界。
- 身份：iframe 自身 resource log 记录了 `5510` 上 `界面美化/index.js?t=1791002458395`。在该 iframe 内重新 fetch 响应 200、335880 bytes、SHA-256 `E734941E16EBFBBD8016DDFB3E016ECBF4C12CE6FEE2C27A0D2EF6940C3FE2BB`，与工作区 dist 完全一致；runtime registry 为 development `cce03aa0` / workspace `D:/project/tavern_helper_template`。精确 development 产物身份通过；不代表正式发布 PNG/CDN。
- 协议：隔离聊天 `魔法禁书目录模拟器 - 2026-10-03@13h45m41s790ms` 首个 assistant swipe 的隐藏原始协议含有效 `<UpdateVariable><JSONPatch>`，模型 `deepseek-v4.1-flash`；卡内 raw-protocol writer 对阵营、空能力数组、在场人物 3 项写回成功，日志 `applied:3, skipped:0`，楼层 `stat_data` 读回一致。一次成功路径通过。初轮 mainline 初始化被漏掉，之后请求校准才修正；不得概括为模型全面遵约。
- 跨入口：在该测试聊天内，实际状态先经两轮生成/一次玩家请求校准到 `NECROMANCER-02`、已完成 `[NECROMANCER-01]`、可触发 `[NECROMANCER-03]`、阶段序号 3。之后玩家明确选择矩阵 `OP-O33-01`（`CL-JAILBREAK` / `JAILBREAK` / manga / `JAILBREAK-01`）并请求保留旧节点、记为已跳过。模型没有执行迁移，回答又混入不相关 `vault.py` 内容，唯一 raw-protocol patch 将在场人物清空；当前楼层主线仍留在旧锚。迁移未通过，未做脚本补写；保留此聊天作失败复现。
- 媒介：第二独立聊天 `魔法禁书目录模拟器 - 2026-10-03@14h21m29s369ms` 的 UI 和预览证实 `OP-O33-01` 的漫画元数据 `CL-JAILBREAK`、`media=manga`、`viewpoint=misaka`、`JAILBREAK-01`、`project-window` 全进入开局配置。真实首轮正文描写越狱现场，但原始模型输出带有无关 `hashlib` 回复且无 `<UpdateVariable>`，消息级 mainline 仍是默认主线；因此媒介路线验收未通过，只能记为预览通过/正文弱吻合。
- 清理：welcome UI 的选中、展开和 pending 状态在收尾时为空；世界书测试选择残留 `JAILBREAK` UID `789356` 的 `ignoreBudget=true` 已由 TH `updateWorldbookWith` 事务复位。回读 114 条、82 事件包、豁免 0，发送框空。两个隔离聊天保留，未清除/修补聊天或变量；原三消息证据聊天没有追加生成。
- 汇总：精确运行时产物身份通过；至少一次 `<UpdateVariable>` 写回通过；跨入口迁移未通过；漫画媒介真实生成未通过。P1 仍未闭合，未改源码、PNG、版本、Git、GitHub、CDN。

## 2026-10-03 P1 游玩模型范围决策

- 结合当前已整理的时间线，默认体验采用“单一当前主线焦点 + 同一事件包内多战线 + 可插入支线”。这能表达 8 月 31 日、大霸星祭和越狱篇等同窗并行事件，同时避免多个独立事件包竞争同一 `当前节点`。
- `parallel` 是事件簇/叙事关系标记，不是多主线存档能力。当前状态合同只有一个主线锚点和一个当前节点；同篇其他战线通过任务追踪、NPC 关系、世界线记录和正文事实保留，不自动批量推进。
- 支线进入与返回的核心预期是：支线记录任务、关系和实际世界线影响，但不覆盖当前主线锚点、当前节点、已完成节点和可触发节点。
- 原“跨独立事件包迁移”和“漫画媒介完整生成”失败证据继续保留为兼容性补证；它们证明相应路径尚未验收，不证明单焦点/同篇多战线模型已失败。
- 多个独立事件包各自保存游标并可自由切回需要独立的多剧情游标、聚焦选择、跨线时间/预算/冲突合并和重载持久化设计，降为后续扩展，当前 P1 不实现也不宣称支持。

## 2026-10-03 模型协议前置条件与静态合同门禁

- 实机只读检查确认当前活动模型/预设为 `openai` / `deepseek-v4.1-flash` / `[主预设] V19.5 狐神抚 · 毓忻`。启用提示词 `🔧额外模型解析(选一)` 明确要求主模型禁止初始化、计算、更新或输出变量，变量交给外部模型。故当前预设不能作为 P1 要求主模型输出 `<UpdateVariable>` 的验收环境；除非用户授权切换至合规模型/预设，不继续触发生成。
- 当前测试聊天 `魔法禁书目录模拟器 - 2026-10-03@17h32m54s257ms` 仅欢迎楼层，没有基线变量和剧情消息；本轮结束时预算豁免、表单值、选择/展开态、预览/pending 全部清空，发送框为空，事件包 `ignoreBudget` 为 0。
- `scripts/verify-mjr-p1-contract.mjs` 是静态合同检查，不替代实机行为。它确认 114 个欢迎入口在源、嵌入副本和矩阵的 P1 元数据一致，并锁定单节点推进、支线不夺主线及首轮初始化协议。
- 既有 runtime identity pass 限定旧 development bundle SHA `E734941E…C3FE2BB`。当前工作区 dist 为 347811 bytes / SHA `4C49F3DDFCED59A2BC5653F438F41202906ACFC3D3422925C21E16532101E1CC`，不相同；需重新证明运行帧所执行资源与当前 dist 一致。
- 历史记录：当时推断下一实机门依赖合规主模型/预设；此结论已由 2026-10-04 实机设置复核取代，见下节。

## 2026-10-04 P1 首轮续验与前置条件纠正

- SillyTavern `1.18.0`、Tavern Helper `4.11.2`；当前 API 为自定义 OpenAI-compatible，模型 `gpt-4-turbo`，预设 `[主预设] V19.5 狐神抚 · 毓忻`。只读取模型/预设名称与模式，不读密钥。
- 当前 prompt-manager 状态：`🔧额外模型解析(选一)` 行为 disabled；`🔧MVU随AI输出打开!(选一)` enabled。MVU 扩展 UI 当前值为 `随AI输出`。此前“主模型被配置禁止变量、变量交外部模型”的阻塞结论与当前真实设置冲突，现标为过时；当前配置满足主模型 `<UpdateVariable>` 验收前置条件。
- 从 SillyTavern 聊天管理 UI 新建隔离聊天，旧聊天未改。欢迎页真实选择科学侧、某高中、无能力者（Level 0）、`OP-O14-01`。角色卡生成预览长度 761 字符，含入口/事件包/节点/日期精度/`能力档案初始化为 []`；确认填入后发送框逐字等于生成配置，聊天级 `__mfrs_baseline` 落盘，主线当前节点 `NECROMANCER-01`、阶段序号 6、可触发节点 `[NECROMANCER-02]`、能力档案 `[]`。
- 已通过 SillyTavern 发送按钮提交上述原样配置，user 楼层确实落盘；模型请求在宿主提示 `推进失败：Service Unavailable`，35 秒后仍无 assistant 楼层。user 楼层 `stat_data` 仍为 initvar 默认，未手工写变量或补协议。因此开局配置提交链路通过，动态首轮初始化未验收；归因为本轮生成服务不可用，不得当作角色卡变量合同失败。
- loader iframe 记录实际请求 `5510/dist/.../界面美化/index.js?t=1791044771205`；iframe 内 fetch 200、336217 bytes、SHA-256 `C89F2833DD9677D61255CF70FD08D447EAAA52260AE502007616F377F4538F94`，与本地 dist 同长同哈希。registry 为 development `cce03aa0`；这是 runtime identity 元数据，不替代当前 bundle SHA。精确当前 development 资源身份通过。
- 复位：欢迎页选中/展开/pending 已清空；角色世界书 114 条、82 个事件包，预算豁免 0；发送框为空。新隔离聊天保留为未完成首轮样本，原聊天和用户模型/预设设置未修改。
- 回退了基于错误楼层索引假设临时加入的 `opening-baseline.ts`、对应门禁以及 `index.ts` 中首轮 floor detector/合并逻辑；保留原 P0 事务内能力档案并发守卫。当前 P0 能力合同、能力占位保护、面板挂载、事件预算路由、P1 合同、数组幂等、YAML 均通过；Prettier、ESLint、`git diff --check` 通过。用户维护的 webpack/tavern_sync watch 未触碰；没有打包、更新版本/PNG、提交、推送或更新 CDN。
- P1 仍未关闭：服务可用后从该未完成首轮恢复或另建干净聊天，确认消息级 `stat_data` 全字段初始化；再测单节点推进、同篇并行战线切换和支线让位/返回。此前跨独立事件包迁移及漫画路线失败仍为兼容性补证。

## 2026-10-04 新 API 回复的运行时证据

- 用户切换 API 后，通过可见的聊天选项“开始新聊天”创建独立聊天，删除当前聊天文件选项未勾选；新聊天欢迎页表单完整重放 `OP-O14-01`，baseline 落盘成功。失败/污染会话均保留。
- 新 assistant floor 的模型元信息为自定义 OpenAI-compatible / `DeepSeek-V4.1-Flash`。正确状态作用域是消息 `variables["0"].stat_data`，不是仅看 chat scope。floor state 由 raw JSONPatch writer 写入：`阵营=科学侧（学园都市）`、`能力档案=[]`、`当前阶段=阶段3·旧约·九月上旬科学侧外传`、`正史锚点.当前锚点=死灵术师篇`、`当前节点=NECROMANCER-01`、`已完成节点=[]`、`可触发节点=[NECROMANCER-02]`；raw snapshot 有协议，applied timestamp/hash 元数据存在。
- 同一 floor 的 `阶段序号=0`、`阶段状态=未启动`、`正史锚点.默认走向=等待玩家开局地点与身份确定`，地点为“待玩家确认具体位置”、所在位置为“未知”。这与已绑定死灵术师事件包的规则“阶段序号=3”、欢迎页 compatibility 初始化配置（阶段序号 6、阶段状态进行中）不一致。因语义存在源合同冲突，不能简单把差异全归因于模型；应先决定阶段序号究竟是时间线阶段索引还是事件包局部阶段号，并把欢迎 baseline、事件包约定、模型初始化规则、静态门禁统一。
- assistant 可见正文污染明显，以 `ABCD<｜end▁of▁thinking｜>` 与错误示例/思考模板开头；协议解析成功不等于角色输出质量或完整初始化合同通过。
- 一次明确限定在 `NECROMANCER-01` 的保护护士、识别 DA、检查遗体与兵器的用户行动被提交后，没有新增楼层；Fox 扩展提示“推进润色中……中断”，发送框清空，页面 API 状态仍“无连接”。未重复请求。节点推进、同篇战线和支线返回均未验。
- 用户已选 profile 名称 `帝天-神秘CG`、模型 `DeepSeek-V4.1-Flash`、主预设 `[主预设] V19.5 狐神抚 · 毓忻`；未读密钥。profile 名称与选中模型只能证明 UI 选择，不能证明 endpoint 稳定连接。对 OpenAI visible connect 按钮的单次尝试后状态仍显示无连接；网络/console 驱动命令超时。先恢复确定的有效连接，再继续剧情矩阵。
- 更正此前错误方法：必须读 `message.variables["0"].stat_data` 和 `extra._mfrs_raw_protocol_message`；只读可见 `mes` 或 chat-level `stat_data` 会漏掉 raw 协议与楼层状态。本次实机证明“协议解析/部分 floor 写回”通过，但完整协议初始化不通过。

## 2026-10-04 当前运行时复核纠偏

- 当前真实页面仍为 SillyTavern `1.18.0` / Tavern Helper `4.11.2`；活动卡为 `魔法禁书目录模拟器` `1.1.5`、运行时条目 ID `13`。列表中另有同名同版本条目 ID `14`，不能按名称推断唯一卡身份。
- 活动卡 regex `scriptName=[显示]渲染魔法禁书目录开局页` 中 `OP-O14-01` 的嵌入 `data-compat` 与 P1 合同一致：阶段序号 3、阶段状态进行中、当前位置为冥土追魂医院病房走廊，默认走向/下一步提示已提供；维护源与 `index.yaml` 内嵌副本相同。故旧聊天 baseline 的 6 不能再归因于当前嵌入副本，需在新聊天重验生成 baseline。
- 活动 development loader 的 registry 为 `mode=development`、`commit=cce03aa0`、`builtAt=2026-10-04T06:05:03.621Z`、workspace `D:/project/tavern_helper_template`。performance resource 指向 5510 的 `界面美化/index.js`；本地 dist 为 336217 bytes、SHA-256 `B24AD42810A91E36B4567CA0F98CC6368E7193B638557246E4CC5286996A74FC`。应 fetch 完整 URL 后比较响应摘要，再记当前 runtime identity。
- 当前聊天 `魔法禁书目录模拟器 - 2026-10-04@12h52m33s191ms` 有 5 条消息。assistant `i=2` 的 `_mfrs_raw_protocol_message` 存在且已应用：能力档案 `[]`、阵营、阶段名/序号 3、锚点“死灵术师篇”、`NECROMANCER-01`、已完成 `[]`、可触发 `[NECROMANCER-02]`、NPC/任务写入。遗漏阶段状态、位置、默认走向、下一步提示，仍为 initvar 默认。assistant `i=4` 正文继续叙事但无 raw protocol，floor 状态不变；正文续写不等于 MVU 推进。
- 用户已说明内部思考模板是当前预设要求，属于正常表现；P1 验收不得再把该模板本身记为缺陷。
- `tavern_sync.mjs bundle --help` 显示仅接收注册配置名；`tavern_sync.yaml` 的魔禁导出路径是正式 PNG，当前 watch 亦持续运行。尚无已证实的独立 staging profile/output 机制；因此本轮不生成候选、不重导同名卡，不覆盖正式条目。
- 当前静态门禁通过：`MJR_P1_CONTRACT_OK entries=114 clusters=105`、`YAML_OK`。运行时完整初始化、节点推进、同篇多战线、支线让位/返回仍未通过。

## 2026-10-04 15:39 P1 基线兜底修复与干净开局基线验收

- 根因确认：`mfrsEnsureLatestFloorBaseline()` 原先只逐项处理 `stat_data` 顶层字段，并把能力档案单独作为“空数组才回填”；`主线进度` 是已存在的对象时，其内部 initvar 默认值不会被替换。因此模型即便 raw 协议写入当前节点，阶段状态、位置、默认走向和下一步提示仍可能停在 `initvar`。
- 实施最小修复：新增 `opening-baseline.ts` 默认值感知递归合并；字段为空、为 initvar 默认值或对象缺失时，使用可信欢迎基线；已有非默认玩家/模型值保留。数组只在当前仍处于默认节点/所选首节点时允许从开局基线回填，已推进节点和合法空数组不回退。
- 回归门禁 `MJR_OPENING_BASELINE_OK` 通过，覆盖：初始 `initvar` → `OP-O14-01` 完整嵌套基线；已有能力/主线推进状态不被覆盖；阶段状态虽旧但当前节点已推进时数组不回填。原 `verify-mjr-opening-ability-contract.mjs` 已改为检查新的合并合同。
- development watch 已自动重建并同步 `5510`；当前 dist/HTTP 响应 343098 bytes，SHA-256 `F448E2F8914BBF8DFDFC1309202CEFE1E4718262FDB91E6357D9BEFDFD0B3360`，两者一致。
- 旧聊天热更新只读回读：末层状态变为阶段 3、阶段状态“进行中”、默认走向和下一步提示正确，节点仍 `NECROMANCER-01`、能力仍 `[]`；位置为旧聊天基线的“待玩家确认具体位置”。这是兜底行为证据，不是首轮协议验收。
- 新干净聊天只读验收：欢迎页真实选择科学侧/某高中/无能力 Level 0/`OP-O14-01`；确认配置后未发送。聊天级 `__mfrs_baseline` 正确落盘：阶段序号 3、阶段状态“进行中”、医院病房走廊、`NECROMANCER-01`、`[NECROMANCER-02]`、能力 `[]`；发送框非空且与配置一致。
- API 现场仍为 `#api_button=连接`、`#extensions_status=未连接...`；本轮不再发送或重试。完整首轮、单节点、同篇多战线、支线让位/返回仍因模型服务不可用而未验收。
- 全部离线回归通过：`MJR_OPENING_BASELINE_OK`、`MJR_P1_CONTRACT_OK entries=114 clusters=105`、`MJR_OPENING_ABILITY_CONTRACT_OK`、`MJR_MESSAGE_PANEL_MOUNT_OK`、`MJR_EVENT_BUDGET_ROUTING_OK`、`MJR_ABILITY_PLACEHOLDER_GATE_OK`、`MJR_INSERT_IDEMPOTENCY_OK`、`YAML_OK`、定向 Prettier/ESLint、`git diff --check`。

## 2026-10-04 新 API 下的 P1 核心收尾证据

- 运行时为 SillyTavern `1.18.0` / Tavern Helper `4.11.2`；本轮只读取 assistant 楼层的 `api/model` 元信息，不读取或记录凭据。
- `OP-O11-01` 属于 `CL-0831` / `AUGUST-31`。在消息级 `variables["0"].stat_data` 中，战线切换后日期仍为 `Y年8月31日`，当前节点为 `AUGUST-31-05`，已完成节点为 `[AUGUST-31-01]`，阶段状态为“进行中”，能力档案为 `[]`；raw protocol 的应用元数据存在。
- 同篇多战线切换通过：正文从最后之作相关焦点切换到艾扎力与闇咲逢魔的并行行动；同一日期、同一事件包、单一当前节点保持，没有创建第二个主线游标。
- 支线进入通过：位置切换到“学园都市-第七学区-某高中旧校舍一楼器材库”，新增“开学前夕的旧器材库清理”任务和“小野老师”关系；主线锚点、当前节点、已完成节点、可触发节点和阶段状态未被覆盖。
- 支线返回通过：位置恢复为“学园都市-第七学区-学舍之园外围高架与铁道交界处”；主线仍为 `AUGUST-31-05` / `[AUGUST-31-01]` / “进行中”，支线任务 1 项和 NPC 关系 1 条继续存在。
- 消息面板回读通过：剧情 assistant 楼层的 `.mfrs-mp-stack` 可见，约 `761.7×168px`；主线楼层显示能力“无”，支线楼层显示任务 `1 项`、关系 `1 人`。首条欢迎模板楼层的默认空面板不作为剧情楼层失败证据。
- 最终静态门禁全部通过：`MJR_P1_CONTRACT_OK entries=114 clusters=105`、`MJR_OPENING_BASELINE_OK`、`MJR_OPENING_ABILITY_CONTRACT_OK`、`MJR_MESSAGE_PANEL_MOUNT_OK`、`MJR_EVENT_BUDGET_ROUTING_OK`、`MJR_INSERT_IDEMPOTENCY_OK`、`YAML_OK`、`git diff --check`。
- 低优先风险：`AUGUST-31-05` 同时出现在当前节点和可触发数组，提示模型协议仍可能混写“当前焦点”和“下一可触发节点”；核心单游标和支线让位结论不受影响。主动跨独立事件包换篇、代表媒介路线真实生成仍为未验收兼容性补证。
