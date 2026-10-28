# 魔法禁书目录模拟器 P1 实施计划

> 目标：在不破坏 `1.1.5` P0 行为合同的前提下，把现有欢迎页从“时间层/事件组”补齐为可追溯的“叙事时间层 → 事件簇 → 视角/媒介/剧情阶段分支 → 开场白”导航，并让默认游玩模型稳定落在“单一当前主线焦点 + 同一事件内多战线 + 可插入支线”。
> 范围决策（2026-10-03）：`parallel` 表示同一时间背景或事件簇下的并行叙事关系，不表示多个独立主线各自拥有可同时推进的游标。多个独立事件包的独立游标、随时切回和并发自动推进降为后续扩展，不作为本轮 P1 关闭条件。
> 红线：不回退用户已有改动；不引入未经证实的精确日期；不修改 P0 能力/物品/MVU 协议；不主动打包、提交、推送或更新 CDN。
> 验收：事件簇元数据完整且可复现；欢迎页与 `index.yaml` 内嵌副本一致；YAML/结构门禁通过；P1 关键场景的日期精度、单焦点推进、同篇并行关系和支线让位规则有证据记录。

## 阶段

- [completed] 1. 基线盘点：读取当前欢迎页、索引、事件包和证据表，确认已有字段与冲突范围。
- [completed] 2. 事件簇矩阵：从当前入口生成可复现的事件簇/覆盖账本，区分 `full-playable`、`partial`、`reference-only`、`project-window`、`pending`。
- [completed] 3. 卡内实施：补齐事件簇元数据，保留现有 `Opening ID`，修正官方锚点和不确定项目的日期精度。
- [completed] 4. 同步与静态验收：同步欢迎页内嵌副本，执行 YAML、结构和 P1 专项检查；2026-10-03 新增 `verify-mjr-p1-contract.mjs`，逐入口核对维护源、内嵌副本、矩阵和单焦点规则合同。
- [completed] 5. 宿主验收记录：导航、开局配置预览/提交、面板、事件预算路由/世界书注入、P1 元数据进入配置及 development bundle 身份已验证。新 API 隔离聊天已完成同一 `AUGUST-31` 事件包的单焦点切换、校园支线插入和返回主线；消息级 `variables["0"].stat_data` 保留单一主线游标并保留支线记录。历史跨包迁移和漫画路线污染保留为兼容性补证，不阻塞核心 P1。
- [completed] 6. 事件包预算路由：生产 build 门禁、事件包头部解析、入口选择/生成/确认路由已实现；真实宿主证明 `OP-O14-01` 只豁免 `NECROMANCER`、8192 上下文 prompt 含其完整节点；`reference-only` 可清空豁免；切换 `OP-O28-01` 后仅豁免 `ST0930`。测试状态已复位。
- [completed] 7. 核心 P1 收尾验收：静态合同、开局基线、无能力初始化、raw protocol 写回、单主线焦点、同事件包多战线切换、支线让位和返回均已有运行时证据。最终 `AUGUST-31` 聊天保持 `Y年8月31日`、单一当前节点 `AUGUST-31-05`、已完成 `[AUGUST-31-01]`；支线只新增任务/NPC 关系，返回后位置恢复为高架与铁道交界处。历史跨独立事件包迁移和漫画路线失败记录仍保留为非核心兼容性补证。

## 当前游玩模型与边界

### P1 默认模型（本轮必须支持）

```text
当前时间层
└── 当前主线锚点/事件包
    ├── 当前焦点：本轮唯一推进的主要节点
    ├── 同篇并行战线：通过任务、NPC关系和世界线记录保留，不自动批量推进
    └── 可插入支线：不覆盖当前主线锚点，离开后返回原主线
```

- 每轮最多推进一个主要节点；玩家可以选择下一轮关注哪条同篇战线。
- 同一事件包内的多个地点/角色行动可以同时存在，但不为每条战线伪造独立的“当前主线”字段。
- 支线和日常可以插入，必须保留当前主线的当前锚点、当前节点、已完成节点和可触发节点。
- 玩家主动换篇仍可作为兼容路径，但在没有独立游标前，不宣称多个独立事件包可无损来回并行推进。

### 本轮明确不承诺

- 多个独立事件包同时拥有并自动推进各自的当前节点。
- 任意时刻在多个主线之间切回，并恢复每条线独立的未完成节点、时间位置和风险队列。
- 仅凭矩阵中的 `parallel` 字段就认定已经具备多主线存档能力。

## 重新整理后的收尾顺序

1. **完整初始化与协议稳定性**：干净聊天首轮写入当前阶段、阶段序号、当前锚点、当前事件包/节点、已完成节点、可触发节点、能力档案等必要状态；生成后从消息级 `stat_data` 回读。
2. **单主线节点推进**：代表性事件包内推进至少一个节点，确认当前节点变化、数组整体替换去重、旧已完成节点保留，且每轮不推进多个主要节点。
3. **同篇多战线**：优先使用越狱篇或 8 月 31 日等已有并行关系，确认玩家切换关注对象时仍属于同一时间/事件背景；未关注战线只保留已知事实和任务，不自动宣布完成或跳跃。
4. **支线让位与返回**：插入大霸星祭或日常校园，确认支线只写任务/关系/世界线记录，离开后恢复原主线焦点，不覆盖主线锚点和节点数组。
5. **运行时证据整理**：保留 development bundle 身份、事件预算路由、代表事件包 prompt 注入和上述宿主证据；失败聊天只作失败复现，不脚本修补。
6. **兼容性补证（非核心阻塞）**：使用干净模型/预设重试一次主动跨事件包换篇，以及至少一条代表媒介路线的真实生成。若未通过，明确记录为“主动换篇/该媒介路线未验收”，不把它扩大为多主线架构缺陷。
7. **独立发布门**：版本、PNG、Git、GitHub、CDN 仍需另行授权，不属于本计划自动动作。

## 2026-10-04 当前验收状态补记

- SillyTavern 当前加载的角色条目为 `魔法禁书目录模拟器` `1.1.5`，条目 ID `13`；另有同名 `1.1.5` 条目 ID `14`。正式 PNG 未变，仍为 SHA-256 `85F84F5B4CCFADB030FB014D6203DC49786187279ED2D91E10ED7BD61328D486`。
- 活动条目的嵌入欢迎正则 `OP-O14-01` 实际含阶段序号 `3`、阶段状态“进行中”、位置“第七学区·冥土追魂医院病房走廊”、默认走向及下一步提示；与维护欢迎源、`index.yaml` 内嵌副本、死灵术师事件包阶段号一致。此前聊天 baseline 中阶段序号 `6` 是历史状态，不能代表当前欢迎页；须在新隔离聊天确认当前生成 baseline。
- 当前 5 消息聊天 `魔法禁书目录模拟器 - 2026-10-04@12h52m33s191ms` 保留为既有证据。assistant floor `i=2` 的 raw protocol 已应用，写入能力空数组、阵营、阶段名/序号 3、死灵术师锚点和节点 `NECROMANCER-01`；仍漏写阶段状态、位置、默认走向及下一步提示。后续 assistant floor `i=4` 没有 raw protocol，消息级状态仍停在 `NECROMANCER-01`。不得把这两轮判为完整初始化或节点推进通过。
- 当前主预设的思考模板由用户确认是预设要求，属正常输出，不计为 P1 缺陷。
- `dist/.../界面美化/index.js` 当前为 336217 bytes、SHA-256 `B24AD42810A91E36B4567CA0F98CC6368E7193B638557246E4CC5286996A74FC`；iframe registry 声明 development `cce03aa0` / workspace `D:/project/tavern_helper_template`，且实际 resource URL 指向 5510。仍需验证 fetch 响应 hash 与本地 dist 一致，不沿用旧 hash 通过结论。
- `tavern_sync bundle` 只接受仓库注册配置，目标为正式 PNG；同名角色有两个运行时条目，且用户的 webpack、`tavern_sync watch all -f` 正在运行。未证明独立隔离打包前禁止生成/导入候选 PNG，也禁止对同名主卡执行 replace/edit API。
- 本轮静态 `MJR_P1_CONTRACT_OK entries=114 clusters=105`、`YAML_OK` 已通过。实机阶段仍为 in progress；干净聊天完整开局、单节点推进、同篇战线关注切换、支线让位/返回仍待验证。

## 2026-10-04 新 API P1 核心收尾

- 新 API 隔离聊天完成 `OP-O11-01` / `CL-0831` / `AUGUST-31` 的运行时验收。消息级 `variables["0"].stat_data` 和 `extra._mfrs_raw_protocol_message` 均已回读，未手工修改聊天变量。
- 同篇多战线通过：从最后之作相关焦点切换到艾扎力与闇咲逢魔并行行动后，日期仍为 `Y年8月31日`，事件包仍为 `AUGUST-31`，只有一个当前主线节点 `AUGUST-31-05`，旧已完成节点 `[AUGUST-31-01]` 保留。
- 支线让位通过：进入某高中旧器材库后只新增校园任务和小野老师关系，主线锚点、当前节点、已完成节点、可触发节点、阶段状态未被覆盖。
- 支线返回通过：位置恢复为“学园都市-第七学区-学舍之园外围高架与铁道交界处”，校园任务和 NPC 关系仍保留，未创建第二个主线游标。
- 面板实机可见：剧情楼层的 `.mfrs-mp-stack` 约 `762×168px`，主线楼层能力显示“无”，支线楼层显示任务 `1 项`、关系 `1 人`。
- 最终静态门禁通过：`MJR_P1_CONTRACT_OK entries=114 clusters=105`、`MJR_OPENING_BASELINE_OK`、`MJR_OPENING_ABILITY_CONTRACT_OK`、`MJR_MESSAGE_PANEL_MOUNT_OK`、`MJR_EVENT_BUDGET_ROUTING_OK`、`MJR_INSERT_IDEMPOTENCY_OK`、`YAML_OK`、`git diff --check`。
- 核心 P1 已完成。仍保留两个非核心兼容性补证：主动跨独立事件包换篇、代表媒介路线真实生成；另有 `AUGUST-31-05` 同时存在于当前节点和可触发数组的低优先一致性风险。两项不改写为通过，也不阻塞当前单焦点/同篇多战线/支线模型。

## P2 后续扩展：多独立剧情游标

只有在用户明确需要“多个独立剧情同时推进并可自由切回”时启动。需要另立设计和验收，不在当前 P1 通过条件内，至少包括：每个事件包独立的当前节点/已完成节点/未完成风险/时间位置、当前聚焦剧情选择器、跨线时间一致性、世界书预算并行策略、切换时状态合并和冲突处理、重载后持久化。

## 已知范围

- 正式基线：`1.1.5`。
- 当前欢迎页已经有 `data-time-layer`、`data-event`、`data-meta`，但需要复核 `clusterId`、`viewpoint`、`media`、`entryType`、`relation`、`coverage` 是否全覆盖。
- 重点场景：8 月 31 日并行事件、大霸星祭科学/魔法侧并行、使徒十字 9/19 主体与 9/20 余波、死灵术师相对时间、N13 项目窗口。

## 失败记录

| 操作 | 结果 | 处理 |
|---|---|---|
| 从仓库根目录运行 `node scripts/query-library.mjs` | 文件不存在 | 已改用技能目录中的 `consult-tavernweave-library/scripts/query-library.mjs`，路由成功。 |
| 经 shell 命令行筛选事件条目时正则没有匹配 | 受命令行转义影响，首次读数为 0 条，和世界书 114 条实况冲突 | 改用 `content.includes('事件包ID：')` 读取，确认 82 个事件包；不得用该失败读数作结论 |
| 2026-10-03 新隔离聊天中模型回复混入无关 `hashlib` / `vault.py` 内容 | 初轮协议仍可被 raw-protocol writer 应用；之后的剧情迁移请求未执行，只输出了清空在场人物的协议 | 停止该聊天后续测试，不注入或修补状态；保留聊天为失败证据，另开干净媒介聊天；后者仍受到同一无关上下文污染，媒介生成不通过 |

## 本轮技能路由收据（2026-10-03）

- 主工程技能：`sillytavern-runtime-debug`；写入前检查 `ST-A0` 目标/红线/验收。
- `consult-tavernweave-library` 路由：`sillytavern-runtime-debug`、`sillytavern-api-reference`、`sillytavern-card-pipeline`。
- 快照：`2026-08-18`；加载 `ST-C1`、`ST-D4`、`ST-A5`、`ST-B1`、`ST-A2`、`ST-D1`。只使用宿主/iframe、Worldbook API、卡片开发与运行时指南；检索出的视觉候选均未采用。
- API 目标：SillyTavern `1.18.0`、Tavern Helper `4.11.2`；版本化类型声明确认 `getWorldbook()` 返回条目数组，`updateWorldbookWith(name, updater, {render})` 以数组事务更新且支持 `render:'immediate'`。真实宿主另行验证持久化与 prompt 结果。
- 会话恢复：`session-catchup.py` 用 Python 正确执行，无额外未同步上下文；先前误用 Node 的语法错误已纠正。

## 2026-10-03 稳定入口元数据预览收尾

- 主技能：`sillytavern-runtime-debug`；按 Finish Mode 冻结为“真实开局预览包含稳定入口/事件簇元数据，并清理临时 UI/预算状态”。辅助路由为 `consult-tavernweave-library`、`sillytavern-api-reference`、`sillytavern-card-pipeline`、`planning-with-files-zh`、`code-quality-workflow`；候选视觉目录未采用。
- 真实宿主为 SillyTavern `1.18.0` / Tavern Helper `4.11.2`，浏览器 CDP `9225`。当前用户维护的 webpack、`tavern_sync` watch 未启动、停止或重启。
- 开局页非持久化预览使用 `OP-O09-01`。预览确实包含 `openingId=OP-O09-01`、`clusterId=CL-SILENT-PARTY`、`media=anime`、`viewpoint=misaka`、`relation=standalone`、`coverage=full-playable`、事件包 `SILENT-PARTY` 和 `SILENT-PARTY-01` 当前/起始节点；日期精度为 `media-window`。未点击“确认填入发送框”，未发送消息，也未触发生成。
- 测试前发现此前残留的 `SILENT-PARTY` 世界书条目 UID `849984` 的 `ignoreBudget=true`，且 `OP-O09-01` 处于未提交选中态。已用运行时 `updateWorldbookWith(...,{render:'immediate'})` 将 82 个事件包中的临时预算豁免全部复位，并关闭预览、清除 `_pendingCfg`/`_pendingBaseline`/`_pendingEventPackageId`、恢复临时表单为空、折叠事件组和清除入口选中态。最终读回：角色世界书 114 条、事件包 82 个、`ignoreBudget=true` 为 0、选中入口 0、展开事件组 0。
- 最终聊天核对：测试聊天 `魔法禁书目录模拟器 - 2026-10-03@00h46m17s913ms` 仍为 3 条消息；`__mfrs_baseline` 的当前节点仍为 `NECROMANCER-01`、能力档案仍为 `[]`；发送框为空。浏览器 DOM 与 SillyTavern chat API 回读一致。
- 运行时身份边界：loader registry 自报 `界面美化` development / `cce03aa0` / `2026-10-03T03:12:10.297Z`；工作区 dist 时间为 `2026-10-03 12:05:26`、SHA-256 `E734941E16EBFBBD8016DDFB3E016ECBF4C12CE6FEE2C27A0D2EF6940C3FE2BB`。时间与 revision 证据不一致，当前预览只能证明所执行行为符合字段合同，不能证明该 iframe 正是该 SHA 的最新构建。
- 焦点门禁通过：`verify-mjr-opening-ability-contract.mjs`、`verify-mjr-message-panel-mount.mjs`、`verify-mjr-insert-idempotency.mjs`、`verify-mjr-event-budget-routing.mjs`、`check-mjr-yaml.cjs`；矩阵 dry-run 为 114 入口 / 4 时间层 / 105 事件簇，覆盖 98/1/15。
- 尚未完成：实际跨入口时间跳转、当前节点与已完成数组保留；不同媒介路线的真实生成；合规模型/预设成功输出并写回 `<UpdateVariable>`；精确运行时产物身份复核。P1 不标为彻底完成；PNG、版本、Git、GitHub、CDN 未改。
- 模型验收准备证据：当前宿主 API 为 `openai`/聊天补全，预设显示 `[主预设] V19.5 狐神抚 · 毓忻`，连接档案 `Cat`，模型 `gpt-4-turbo`。已存证聊天的上一轮模型回答曾偏离角色卡且没有 `<UpdateVariable>`，故当前配置不能直接视为“合规”。后续须先开独立新聊天并确认模型/预设协议行为；不得在既有三消息证据聊天继续加测，也不得读取或记录凭据/密钥。
- 新聊天控件探查只读打开了角色管理抽屉，未创建聊天/角色或触发提交；已关闭抽屉恢复原界面。SillyTavern 的 `startNewChat` 并非 Tavern Helper 全局，后续需经可见聊天管理 UI 验证其入口后再测试。

## 2026-10-03 P1 静态合同与模型协议门禁续记

- 本轮读取真实 SillyTavern `1.18.0` / Tavern Helper `4.11.2`、Chrome CDP `9225` 的当前隔离聊天 `魔法禁书目录模拟器 - 2026-10-03@17h32m54s257ms`；聊天只有 1 条欢迎楼层、无 `__mfrs_baseline`、无玩家/AI剧情消息。
- 当前活动模型/预设只读结果：API `openai`、模型 `deepseek-v4.1-flash`、预设 `[主预设] V19.5 狐神抚 · 毓忻`；启用的 `🔧额外模型解析(选一)` 明文要求主模型禁止初始化、更新、输出任何变量，并称变量交外部模型处理。故本配置与本轮要求主模型输出 `<UpdateVariable>` 的核心宿主验收不兼容；本轮未生成，未更改模型或预设，也未读取密钥。此为环境阻塞，不是卡内规则/代码失败证据。
- 已清理当前隔离聊天欢迎页中的表单输入、科学侧/学校/无能力/Level 0 选择、入口选中/事件组展开、预览及 pending 配置；发送框为空。角色世界书为 114 条、82 个事件包，`ignoreBudget=true` 为 0。测试聊天保留，未添加/删除消息或写入聊天变量。
- 新增 `scripts/verify-mjr-p1-contract.mjs` 并接入 `package.json` 构建前置门禁及 `verify:mjr-p1-contract` 命令。门禁逐项核对 114 个入口的九项 P1 元数据、矩阵字段、欢迎页内嵌副本、唯一 ID、矩阵汇总，以及每轮单节点、支线不覆盖主线、首轮锚点初始化及节点数组整体替换合同。`MJR_P1_CONTRACT_OK entries=114 clusters=105` 通过。
- 本轮最终静态复验：能力占位保护、开局能力合同、开局基线、消息面板挂载、数组幂等、事件预算路由、P1 合同门禁、YAML、事件矩阵 dry-run 均通过；矩阵覆盖 `114/4/105`、`98 full-playable / 1 partial / 15 reference-only`。定向 Prettier、改动文件 ESLint 与 `git diff --check` 通过；`augment-mjr-event-clusters.mjs` 的 Node 内建模块 lint 仅有 3 条既有规则 warning，无 error。
- 工作区 dist 在本轮检查时为 347811 bytes，SHA-256 `4C49F3DDFCED59A2BC5653F438F41202906ACFC3D3422925C21E16532101E1CC`，时间 `2026-10-03 17:10:42`；它不同于先前实际 iframe 取回并验证的 335880-byte `E734941E…C3FE2BB`。当前 iframe registry 仍自报 development `cce03aa0`，但本轮尚未证明实际运行资源与新 SHA 一致。不得把此前身份通过沿用为当前 dist 身份通过。
- P1 不关闭。下一步先由用户选择/提供允许角色卡主模型执行 MVU 协议的模型/预设或明确授权调整；随后在独立新聊天完成首轮完整初始化、单节点推进、同篇战线切换、支线让位/返回，并从消息级 `stat_data` 读取证据。正式构建、打包、版本、PNG、提交、推送、CDN 均未执行。

## 2026-10-03 四项实机验收续测

- 本节覆盖前文各日期快照的当前状态；较早 `pending`/未完成措辞保留为当时记录，最新结论以下列实测为准。
- 环境：SillyTavern `1.18.0`、Tavern Helper `4.11.2`、Chrome CDP `9225`；模型名 `deepseek-v4.1-flash`。没有更改模型/预设设置，没有查看密钥；用户的 pnpm/webpack/tavern_sync watch 和 8000/5510 服务均未触碰。
- 运行时身份 **通过**：加载器 iframe 的 performance resource 明确包含 `http://127.0.0.1:5510/dist/.../界面美化/index.js?t=1791002458395`；在该 iframe 内 fetch 同一 URL 得 200、335880 bytes，SHA-256 `E734941E16EBFBBD8016DDFB3E016ECBF4C12CE6FEE2C27A0D2EF6940C3FE2BB`；本地 dist 同长同 hash。registry 同时给出 `mode=development`、`commit=cce03aa0`、workspace `D:/project/tavern_helper_template`。结论只覆盖当前 development dist，不等于正式 PNG/CDN 身份。
- 动态协议写回 **通过（限一次明确路径）**：测试聊天 `魔法禁书目录模拟器 - 2026-10-03@13h45m41s790ms` 的首个 AI 消息 `mesid=2` 原始 swipe `_mfrs_raw_protocol_message` 含 `<UpdateVariable><JSONPatch>`，来源模型 `deepseek-v4.1-flash`；三项 patch 对 `/阵营`、`/能力档案=[]`、`/在场人物` 应用成功，消息级 `stat_data` 回读与之相符，日志报告 `applied:3, skipped:0`。后续同聊天的开局主线字段起初漏写，人工以玩家消息请求校准后才写入；因此只证明解析器/写回路径真实可用，不证明模型稳定遵守完整合同。
- 跨入口迁移 **未通过**：同一测试聊天中，死灵术师行动推进至 `NECROMANCER-02`，随后经明确校准后 `阶段序号=3`、`已完成节点=[NECROMANCER-01]`、当前 `NECROMANCER-02`、可触发 `[NECROMANCER-03]`。明确选择矩阵中的漫画入口 `OP-O33-01`（`CL-JAILBREAK`、`JAILBREAK`、`manga`、首节点 `JAILBREAK-01`）并要求保留旧节点后，模型没有执行换锚，回复混入无关 `vault.py` 代码，raw protocol 仅把 `/在场人物` 清空。没有脚本修补；该聊天留作失败复现证据。
- 媒介生成 **未通过**：第二隔离聊天 `魔法禁书目录模拟器 - 2026-10-03@14h21m29s369ms` 通过欢迎页 UI 选择 `OP-O33-01`；非持久化预览准确显示 `media=manga`、`viewpoint=misaka`、`CL-JAILBREAK`、`JAILBREAK-01`、`project-window`。首轮场景正文确实描写越狱漫画事件窗口，但同一原始模型输出先回应无关 `hashlib` 请求，没输出 `<UpdateVariable>`，消息级数据仍停留在 MVU 默认主线；故正文主题吻合仅为弱证据，不能关闭真实媒介路线验收。
- 收尾复位：第二聊天创建时的开局 UI 预算路由在世界书留下 `JAILBREAK` UID `789356` 的 `ignoreBudget=true`；本轮经 `updateWorldbookWith(...,{render:'immediate'})` 仅复位事件包预算字段，回读世界书 114 条/82 包/豁免 0。末次页面复核欢迎页选中态、展开态、pending 为空，发送框为空。两个新增聊天均保留，未删除或修补；原三消息证据聊天没有继续生成。
- 四项汇总：运行时精确产物身份 **通过**；MVU 协议成功写回 **一次路径通过**；跨入口迁移 **未通过**；漫画媒介路线真实生成 **未通过**。P1 不关闭。没有改源码、PNG、版本、Git、GitHub 或 CDN。

## 2026-10-04 15:39 P1 续验与基线兜底修复

- 发现并修复一个可复现的 P1 开局基线缺口：旧 `mfrsEnsureLatestFloorBaseline()` 只按顶层字段判断默认值，无法把 `主线进度` 内嵌默认值（阶段状态、位置、默认走向、下一步提示）合并到模型已写入节点的楼层；`所在位置=未知` 也未被视为 initvar 默认值。
- 新增 `src/魔法禁书目录模拟器/脚本/界面美化/opening-baseline.ts`，以默认值感知的递归合并处理嵌套对象；数组仅在仍处于开局默认节点/所选首节点时回填，已推进到其他节点或已有非空状态不被开局基线覆盖。
- 新增 `scripts/verify-mjr-opening-baseline.mjs` 并接入 `package.json` build 前置；验证 `OP-O14-01` 阶段 3、进行中、医院走廊、`NECROMANCER-01`、空能力档案、默认走向/下一步提示，以及已推进节点和能力档案不回退。
- 旧 5 消息聊天在 development hot reload 后，末层由兜底正确恢复阶段 3、进行中、默认走向和下一步提示；因该聊天的历史基线位置是“待玩家确认具体位置”，不把它作为干净开局通过证据。
- 新建干净隔离聊天（保留旧聊天），通过真实欢迎页选择科学侧、某高中、明确无能力 Level 0、`OP-O14-01`，生成并确认配置但未发送。`__mfrs_baseline` 实际写入：阶段 3、进行中、位置“第七学区·冥土追魂医院病房走廊”、当前节点 `NECROMANCER-01`、可触发 `[NECROMANCER-02]`、能力 `[]`；发送框与配置一致。开局基线链路通过，首条 AI 协议仍待验证。
- 当前 API 按页面实测仍为“未连接…”，未触发首轮生成；单节点推进、同篇多战线切换、支线让位/返回继续 pending。用户确认的预设思考模板不计为缺陷。
- 静态与开发资源复核：`MJR_OPENING_BASELINE_OK`、`MJR_P1_CONTRACT_OK`、P0/P1 相关门禁、`YAML_OK`、ESLint、Prettier、`git diff --check` 均通过；watch 已重建 development dist，当前本地与 `5510` 响应均为 343098 bytes、SHA-256 `F448E2F8914BBF8DFDFC1309202CEFE1E4718262FDB91E6357D9BEFDFD0B3360`。
- 本轮未打包、未导入候选 PNG、未改版本/正式 PNG、未提交/推送 Git、未更新 CDN，未修改旧聊天变量；用户维护的 webpack/`tavern_sync` watch 未触碰。
