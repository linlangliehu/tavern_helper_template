# Phase 6 初始化数据方案

## 状态

- 产物类型：规划数据，不修改运行时源码。
- 静态门禁：passed-static-only
- 记录数量：114
- 初始化模式：node-chain 98；无包 reference-only 15；关联包 reference-only 1
- 真机验收：未执行；后续仍需 Phase 8 在 SillyTavern 中验证。

## 输入与边界

- 分类体系：`phase2-opening-ids.json`
- 完整开场：`phase5-complete-openings.json`
- 世界书包清单：`.planning/magic-worldbook-implementation-20260908/worker-*.json`
- 当前 schema：`src/魔法禁书目录模拟器/schema.json`
- 本阶段不修改：欢迎页源码、`index.yaml`、PNG、dist、MVU、schema、loader。

## 初始化合同

每条记录包含：

- Opening 与证据 ID
- 时间层、日期精度、时间段
- 作品线、剧情阶段、篇章
- 事件包、起始节点、当前节点
- 已完成节点、尚未发生节点、可触发节点
- 玩家位置与当前剧情状态
- 兼容 MVU 的 `compatibilityPayload`
- 待 schema 升级的 `extensionProposal`

## 兼容载荷

只使用当前 schema 已存在的字段：

| 目标字段 | 来源 |
| --- | --- |
| `原著阶段` | Phase 2 `stageLabel` |
| `剧情锚点` | Phase 5 `chapterLabel` |
| `所在位置` | 统一为“待玩家确认具体位置” |
| `剧情阶段` | 按当前节点在事件包中的位置映射为遭遇／发展／高潮／终局 |
| `主线进度.当前阶段` | Phase 2 `stageLabel` |
| `主线进度.阶段序号` | Phase 2 `stage.order` |
| `主线进度.阶段状态` | node-chain 为“进行中”；reference-only 为“待确认” |
| `主线进度.当前节点` | 当前槽位节点或“未进入事件包” |
| `主线进度.已完成节点` | 槽位前置节点 |
| `主线进度.可触发节点` | 线性链下一节点；分支入口为可选入口 |
| `主线进度.正史锚点.当前锚点` | Phase 5 `chapterLabel` |
| `主线进度.正史锚点.默认走向` | Phase 5 开场正文 |
| `主线进度.下一步推进提示` | 当前节点场景目标 |

## 待扩展字段

`extensionProposal.status` 固定为 `proposed-not-yet-supported`，包含：

- `时间层ID`、`时间层名称`
- `当前日期`、`日期精度`、`时间段`
- `作品线ID`、`作品线名称`
- `剧情阶段ID`、`篇章ID`
- `OpeningID`、`事件包ID`
- `世界书起始节点ID`
- `尚未发生节点`、`关联作品线`
- `referenceOnly状态`、`槽位标签`

## 多槽位节点裁决

| Opening | 当前节点 | 策略 | 说明 |
| --- | --- | --- | --- |
| `OP-P01-02` | `TALENT-WORKSHOP-05` | explicit-node-override | 控制权变化对应“夺取才人工房”节点，保留前一至四节点为已完成。 |
| `OP-O01-02` | `FANTASY-HAND-02` | narrative-window-override | 主体槽从音频传闻与使用者异常接入，不把七月上旬旧入口伪装成整案收束。 |
| `OP-O01-03` | `FANTASY-HAND-03` | narrative-window-override | 收束槽对应使用者倒下与脑波关联；此槽不宣称幻想御手全案已经结束。 |
| `OP-O11-02` | `AUGUST-31-05` | branching-multi-entry | 三线并行存在三个入口；默认艾扎力线，最后之作线不因选择本槽自动完成。 |
| `OP-G07-02` | `GENESIS-07-02` | date-window-override | 1月2日早餐后进入城市内领事馆节点。 |
| `OP-G07-03` | `GENESIS-07-05` | date-window-override | 1月3日从花园斩击节点开始，保留1月1日至2日节点为已完成。 |
| `OP-G10-02` | `GENESIS-10-07` | time-window-override | 23:58附近对应生命状态确认节点，前一至六节点视为已完成。 |
| `OP-G14-01` | `GENESIS-14-07` | time-window-override | 1月9日早晨对应清晨照护与归路节点，不回到午夜夺体节点。 |
| `OP-G14-02` | `GENESIS-14-08` | time-window-override | 08:30附近对应新学期节点，附尾节点保留为未发生。 |

“八月三十一日三线并行”不把最后之作线自动记为完成；默认兼容节点为 `AUGUST-31-05`，扩展字段保留 `AUGUST-31-01`、`AUGUST-31-05`、`AUGUST-31-07` 三个可选入口。

## 数量分布

| 维度 | 结果 |
| --- | --- |
| 时间层 | {"TL-YMINUS1":16,"TL-Y":80,"TL-YPLUS1":12,"TL-UNDATED":6} |
| 作品线 | {"WL-RAILGUN":25,"WL-ITEM":6,"WL-ACCELERATOR":3,"WL-INDEX":69,"WL-OTHER-OFFICIAL":4,"WL-MENTAL-OUT":1,"WL-MEDIA-UNDATED":6} |
| 初始化模式 | {"node-chain":98,"reference-only-no-package":15,"reference-only-related-package":1} |
| 日期精度 | {"approximate":31,"range":2,"exact":71,"relative":1,"undated":9} |
| 叙事阶段 | {"遭遇":108,"高潮":3,"发展":2,"终局":1} |

## 静态门禁

- 114 条初始化记录且 Opening ID 唯一
- 时间层、作品线、剧情阶段引用均来自 Phase 2 taxonomy
- displayDate 与 Phase 5 完全一致
- 98 条 node-chain 的起始节点与当前节点均存在于事件包
- node-chain 的已完成、当前与尚未发生节点完整覆盖事件包且无重复
- 多槽位同包 Opening 使用不同当前节点
- 15 条无包 reference-only 不携带伪节点
- O18 保留 ENDEYMION 关联但标记 reference-only，不伪装成当前节点
- 未定日入口不写伪日期
- 未出现创约15
- 兼容载荷字段均存在于当前 schema
- 扩展字段全部标记为 proposed-not-yet-supported

## 已知边界

- `所在位置` 统一使用“待玩家确认具体位置”，不把正文模糊场景伪装成精确地点。
- `剧情阶段` 使用当前 schema 的遭遇／发展／高潮／终局枚举，不把旧约／新约／创约塞进该字段。
- `upcomingNodeIds` 表示尚未发生或尚未完成；分支入口也会保留在未完成集合中。
- O18 关联 `ENDEYMION`，但初始化为 reference-only，不把剧场版前传与游戏路线伪装成同一可玩链。
- Phase 6 不声称 SillyTavern 运行时已经支持新增字段。

## 初始化记录总表

| Opening | 日期 | 作品线 | 阶段 | 篇章 | 包／当前节点 | 模式 |
| --- | --- | --- | --- | --- | --- | --- |
OP-P01-01 | Y−1年4月初 | 某科学的超电磁炮 | 超电磁炮篇章 | 食蜂夺取才人工房（人才工坊） | TALENT-WORKSHOP / TALENT-WORKSHOP-01 | node-chain
OP-P01-02 | Y−1年4月初 | 某科学的超电磁炮 | 超电磁炮篇章 | 食蜂夺取才人工房（人才工坊） | TALENT-WORKSHOP / TALENT-WORKSHOP-05 | node-chain
OP-P02-01 | Y−1年4月起 | 某科学的超电磁炮 | 超电磁炮篇章 | 蜂琴入学与美琴一年级生活 | FIRST-YEAR / FIRST-YEAR-01 | node-chain
OP-P03-01 | Y−1年5月 | 某科学的超电磁炮 | 超电磁炮篇章 | 雪紫生日礼物／支仓冷理指导 | FIRST-YEAR / FIRST-YEAR-01 | node-chain
OP-P04-01 | Y−1年6月 | 某科学的超电磁炮 | 超电磁炮篇章 | 常盘台派阀斗争未遂 | FIRST-YEAR / FIRST-YEAR-01 | node-chain
OP-P05-01 | Y−1年6月30日附近 | 某科学的超电磁炮 | 超电磁炮篇章 | 暗黑五月计划背景 | 无包 / 未进入事件包 | reference-only-no-package
OP-P06-01 | Y−1年7月 | 暗部的ITEM | ITEM卷 | ITEM组建、华野超美与委托阴谋 | ITEM-01 / ITEM-01-01 | node-chain
OP-P07-01 | Y−1年7月末 | 某科学的一方通行 | 一方通行篇章 | 生物黑客／上条、蜜蚁、云川的相遇 | BIOHACKER / BIOHACKER-01 | node-chain
OP-P08-01 | Y−1年8月2日 | 魔法禁书目录本篇 | 本篇前史 | 上蜂相遇、相处与死结往事 | MENTAL-PAST / MENTAL-PAST-01 | node-chain
OP-P09-01 | Y−1年8月上旬 | 暗部的ITEM | ITEM卷 | 蜂蜜女王 | ITEM-02 / ITEM-02-01 | node-chain
OP-P10-01 | Y−1年8月末 | 暗部的ITEM | ITEM卷 | 正义伙伴竞争者／正义篇 | ITEM-03 / ITEM-03-01 | node-chain
OP-P11-01 | Y−1年9月初 | 暗部的ITEM | ITEM卷 | 麦野本家／越墙与新宿事件候选 | ITEM-04 / ITEM-04-01 | node-chain
OP-P12-01 | Y−1年9月中旬 | 暗部的ITEM | ITEM卷 | D子／前一年大霸星祭调查 | ITEM-05 / ITEM-05-01 | node-chain
OP-P13-01 | Y−1年次期新学期 | 某科学的超电磁炮 | 超电磁炮篇章 | 食蜂建派阀、剧院失火、武林夜宫调查 | FIRST-YEAR / FIRST-YEAR-01 | node-chain
OP-P14-01 | Y−1年10月 | 暗部的ITEM | ITEM卷 | ITEM6秋日银行劫案 | ITEM-06 / ITEM-06-01 | node-chain
OP-P15-01 | Y−1年12月上旬 | 某科学的超电磁炮 | 超电磁炮篇章 | 绝对等速事件 | FIRST-YEAR / FIRST-YEAR-01 | node-chain
OP-S01-01 | Y年1月18日 | 魔法禁书目录本篇 | 本篇前史 | SS2的Skill-Out短篇 | GEMSTONE / GEMSTONE-01 | node-chain
OP-S02-01 | Y年2月1日 | 魔法禁书目录本篇 | 本篇前史 | 牛仔裤短篇 | 无包 / 未进入事件包 | reference-only-no-package
OP-S03-01 | Y年2月22日 | 魔法禁书目录本篇 | 本篇前史 | 上条刀夜短篇 | 无包 / 未进入事件包 | reference-only-no-package
OP-S04-01 | Y年3月15日 | 魔法禁书目录本篇 | 本篇前史 | 削板军霸短篇／毕业过渡 | GEMSTONE / GEMSTONE-01 | node-chain
OP-S05-01 | Y年4月某日 | 某科学的超电磁炮 | 超电磁炮篇章 | 美琴过去篇后半、雪紫离校 | MIKOTO-PAST / MIKOTO-PAST-01 | node-chain
OP-S06-01 | Y年4月下旬 | 某科学的超电磁炮 | 超电磁炮篇章 | 初春与佐天交友、栅川定向越野 | 无包 / 未进入事件包 | reference-only-no-package
OP-S07-01 | Y年4月5日 | 魔法禁书目录本篇 | 本篇前史 | SS2春季散点 | GEMSTONE / GEMSTONE-01 | node-chain
OP-S08-01 | Y年5月11日 | 某科学的超电磁炮 | 超电磁炮篇章 | 美琴生日／黑子入住、9982诞生 | FIRST-YEAR / FIRST-YEAR-01 | node-chain
OP-S09-01 | Y年6月17日 | 某科学的超电磁炮 | 超电磁炮篇章 | 上条与美琴初遇 | FANTASY-HAND / FANTASY-HAND-01 | node-chain
OP-S10-01 | Y年7月1日 | 某科学的超电磁炮 | 超电磁炮篇章 | 俄罗斯能力实演旅行 | RUSSIA-DEMONSTRATION / RUSSIA-DEMONSTRATION-01 | node-chain
OP-S11-01 | Y年7月5日 | 魔法禁书目录本篇 | 本篇前史 | SS2夏季散点 | 无包 / 未进入事件包 | reference-only-no-package
OP-O01-01 | Y年7月中旬 | 某科学的超电磁炮 | 超电磁炮篇章 | 幻想御手 | FANTASY-HAND / FANTASY-HAND-01 | node-chain
OP-O01-02 | Y年7月10日 | 某科学的超电磁炮 | 超电磁炮篇章 | 幻想御手 | FANTASY-HAND / FANTASY-HAND-02 | node-chain
OP-O01-03 | 7月17日 | 某科学的超电磁炮 | 超电磁炮篇章 | 幻想御手 | FANTASY-HAND / FANTASY-HAND-03 | node-chain
OP-O02-01 | Y年7月19日 | 魔法禁书目录本篇 | 旧约 | 茵蒂克丝初遇、记忆危机 | INDEX-FALL / INDEX-FALL-01 | node-chain
OP-O03-01 | 未定日 | 某科学的超电磁炮 | 超电磁炮篇章 | 大蜘蛛、OVA及动画日常散点 | 无包 / 未进入事件包 | reference-only-no-package
OP-O04-01 | Y年8月1日 | 某科学的超电磁炮 | 超电磁炮篇章 | 初春SP事件 | 无包 / 未进入事件包 | reference-only-no-package
OP-O05-01 | Y年8月初 | 某科学的超电磁炮 | 超电磁炮篇章 | 盛夏祭／白鳄部队 | 无包 / 未进入事件包 | reference-only-no-package
OP-O06-01 | Y年8月上旬 | 魔法禁书目录本篇 | 旧约 | 吸血杀手／三泽塾 | DEEP-BLOOD / DEEP-BLOOD-01 | node-chain
OP-O07-01 | 8月2日 | 某科学的超电磁炮 | 超电磁炮篇章 | 乱杂开放 | POLTERGEIST / POLTERGEIST-01 | node-chain
OP-O08-01 | 8月15日 | 魔法禁书目录本篇 | 旧约 | 妹妹调查／绝对能力者进化 | ABSOLUTE-EVOLVE / ABSOLUTE-EVOLVE-01 | node-chain
OP-O09-01 | 8月24日 | 某科学的超电磁炮 | 超电磁炮篇章 | 静默派对 | SILENT-PARTY / SILENT-PARTY-01 | node-chain
OP-O10-01 | Y年8月28日 | 魔法禁书目录本篇 | 旧约 | 天使坠落 | ANGEL-FALL / ANGEL-FALL-01 | node-chain
OP-O11-01 | Y年8月31日 | 魔法禁书目录本篇 | 旧约 | 最后之作／天井亚雄、艾扎力、闇咲逢魔三线 | AUGUST-31 / AUGUST-31-01 | node-chain
OP-O11-02 | Y年8月31日 | 魔法禁书目录本篇 | 旧约 | 最后之作／天井亚雄、艾扎力、闇咲逢魔三线 | AUGUST-31 / AUGUST-31-05 | node-chain
OP-O12-01 | Y年9月1日 | 魔法禁书目录本篇 | 旧约 | 新学期、风斩冰华与雪莉入侵 | KAZAKIRI / KAZAKIRI-01 | node-chain
OP-O13-01 | Y年9月上旬 | 某科学的超电磁炮 | 超电磁炮篇章 | 学艺都市 | LIBERAL-ARTS-CITY / LIBERAL-ARTS-CITY-01 | node-chain
OP-O14-01 | 9月1日 | 某科学的一方通行 | 一方通行篇章 | 死灵术师 | NECROMANCER / NECROMANCER-01 | node-chain
OP-O15-01 | Y年9月上旬 | 其他正式外传 | 正式外传篇章 | 未元物质／杠林檎 | DARK-MATTER / DARK-MATTER-01 | node-chain
OP-O16-01 | Y年9月8日 | 魔法禁书目录本篇 | 旧约 | 法之书／奥索拉 | BOOK-OF-LAW / BOOK-OF-LAW-01 | node-chain
OP-O17-01 | Y年9月中旬 | 其他正式外传 | 正式外传篇章 | 必要之恶教会特别编入考试 | NECESSARIUS-EXAM / NECESSARIUS-EXAM-01 | node-chain
OP-O18-01 | Y年9月12日 | 其他正式外传 | 正式外传篇章 | Road to Endymion／群奏活剧相关路线 | ENDEYMION / 未进入事件包 | reference-only-related-package
OP-O19-01 | Y年9月中旬 | 某科学的一方通行 | 一方通行篇章 | 神之饮物 Nectar | NECTAR / NECTAR-01 | node-chain
OP-O20-01 | Y年9月14日 | 魔法禁书目录本篇 | 旧约 | 树状图设计者残骸 | TREE-DIAGRAM-REMNANT / TREE-DIAGRAM-REMNANT-01 | node-chain
OP-O21-01 | 9月18日 | 魔法禁书目录本篇 | 旧约 | 恩底弥翁剧场版本篇 | ENDEYMION / ENDEYMION-01 | node-chain
OP-O22-01 | Y年9月19日 | 魔法禁书目录本篇 | 旧约 | 大霸星祭七日背景 | DAIHASEISAI / DAIHASEISAI-01 | node-chain
OP-O23-01 | Y年9月19日 | 魔法禁书目录本篇 | 旧约 | 使徒十字 | ST-CROSS / ST-CROSS-01 | node-chain
OP-O24-01 | 9月20日 | 某科学的超电磁炮 | 超电磁炮篇章 | 超炮大霸星祭／警策、木原幻生与美琴异变 | DAIHASEISAI / DAIHASEISAI-01 | node-chain
OP-O25-01 | Y年9月下旬 | 魔法禁书目录本篇 | 旧约 | 亚得里亚海女王 | ADRIA / ADRIA-01 | node-chain
OP-O26-01 | 9月22日 | 某科学的超电磁炮 | 超电磁炮篇章 | 天赋梦路／芙兰达与猎虎桥 | DREAM-RANKER / DREAM-RANKER-01 | node-chain
OP-O27-01 | 10月14日 | 其他正式外传 | 正式外传篇章 | 幽幻姐妹 Astral Buddy | ASTRAL-BUDDY / ASTRAL-BUDDY-01 | node-chain
OP-O28-01 | 9月30日 | 魔法禁书目录本篇 | 旧约 | 0930／前方之风、风斩与学园都市入侵 | ST0930 / ST0930-01 | node-chain
OP-O29-01 | Y年10月上旬 | 魔法禁书目录本篇 | 旧约 | Skill-Out／驹场利德、滨面 | SKILL-OUT / SKILL-OUT-01 | node-chain
OP-O30-01 | 未定日 | 心理掌握 | 心理掌握篇章 | 独立心理掌握：选举、帆风疑云、遗产与幕后势力 | MENTAL-OUT / MENTAL-OUT-01 | node-chain
OP-O31-01 | Y年10月1日 | 魔法禁书目录本篇 | 旧约 | C文书 | CDOC / CDOC-01 | node-chain
OP-O32-01 | Y年10月9日 | 魔法禁书目录本篇 | 旧约 | 暗部大战 Battle Royale | DARK-BATTLE / DARK-BATTLE-01 | node-chain
OP-O33-01 | 10月12日 | 某科学的超电磁炮 | 超电磁炮篇章 | 越狱 | JAILBREAK / JAILBREAK-01 | node-chain
OP-O34-01 | 10月11日 | 魔法禁书目录本篇 | 旧约 | 后方之水 | ACQUA / ACQUA-01 | node-chain
OP-O35-01 | 10月17日 | 魔法禁书目录本篇 | 旧约 | 英国王室／不列颠万圣节 | BRITISH-ROYAL / BRITISH-ROYAL-01 | node-chain
OP-O36-01 | 10月13日 | 魔法禁书目录本篇 | 旧约 | DRAGON／学园都市暗线 | DRAGON / DRAGON-01 | node-chain
OP-O37-01 | Y年10月19日 | 魔法禁书目录本篇 | 旧约 | 第三次世界大战 | WW3 / WW3-01 | node-chain
OP-N01-01 | 10月30日 | 魔法禁书目录本篇 | 新约 | 新入生／黑夜海鸟、芙蕾梅亚 | NT-FRESHMEN / NT-FRESHMEN-01 | node-chain
OP-N02-01 | Y年11月5日 | 魔法禁书目录本篇 | 新约 | 战后三人交汇与魔法说明 | NT-FRESHMEN / NT-FRESHMEN-01 | node-chain
OP-N03-01 | 11月5日 | 魔法禁书目录本篇 | 新约 | 夏威夷 | NT-HAWAII / NT-HAWAII-01 | node-chain
OP-N04-01 | 11月10日 | 魔法禁书目录本篇 | 新约 | 巴格吉城／自然选择者 | NT-NATURAL-SELECTOR / NT-NATURAL-SELECTOR-01 | node-chain
OP-N05-01 | 11月13日 | 魔法禁书目录本篇 | 新约 | 一端览祭／芙蕾梅亚争夺 | NT-ICHIHANARAN / NT-ICHIHANARAN-01 | node-chain
OP-N06-01 | Y年11月14日 | 魔法禁书目录本篇 | 新约 | 人力资源／药味久子 | NT-AGITATE-HALATION / NT-AGITATE-HALATION-01 | node-chain
OP-N07-01 | Y年11月下旬 | 魔法禁书目录本篇 | 新约 | 格雷姆林决战前段 | GREMLIN / GREMLIN-01 | node-chain
OP-N08-01 | Y年11月18日 | 魔法禁书目录本篇 | 新约 | 欧提努斯／世界重置与上条的选择 | GREMLIN / GREMLIN-01 | node-chain
OP-N09-01 | Y年11月下旬 | 魔法禁书目录本篇 | 新约 | 欧提努斯救援与追逐 | GREMLIN / GREMLIN-01 | node-chain
OP-N10-01 | 11月下旬 | 魔法禁书目录本篇 | 新约 | 心理掌握／蜜蚁爱愉：当前框架 | MENTAL-STINGER / MENTAL-STINGER-01 | node-chain
OP-N11-01 | 未定日 | 魔法禁书目录本篇 | 新约 | 回生者／幻想收束原创、大乱斗 | 无包 / 未进入事件包 | reference-only-no-package
OP-N12-01 | 12月5日 | 魔法禁书目录本篇 | 新约 | 圣日耳曼／钻石大楼 | NT-SAINT-GERMAIN / NT-SAINT-GERMAIN-01 | node-chain
OP-N13-01 | 12月1日 | 魔法禁书目录本篇 | 新约 | 僧正／真格雷姆林 | NT-HIGH-PRIEST / NT-HIGH-PRIEST-01 | node-chain
OP-N14-01 | Y年12月上旬 | 魔法禁书目录本篇 | 新约 | 理想送行／上里登场 | NT-WORLD-REJECTER / NT-WORLD-REJECTER-01 | node-chain
OP-N15-01 | 12月3日 | 魔法禁书目录本篇 | 新约 | 木原唯一／上里阵营 | NT-SALOME / NT-SALOME-01 | node-chain
OP-N16-01 | 12月5日 | 魔法禁书目录本篇 | 新约 | 大热浪／元素 | NT-HEAT-WAVE / NT-HEAT-WAVE-01 | node-chain
OP-N17-01 | 12月9日 | 魔法禁书目录本篇 | 新约 | 夺回上里 | NT-KAMISATO-RESCUE / NT-KAMISATO-RESCUE-01 | node-chain
OP-N18-01 | 12月10日 | 魔法禁书目录本篇 | 新约 | 亚雷斯塔 | NT-ALEISTER / NT-ALEISTER-01 | node-chain
OP-N19-01 | Y年12月11日附近 | 魔法禁书目录本篇 | 新约 | 演算战斗服／学园都市后续 | NT-PROCESSOR-SUIT / NT-PROCESSOR-SUIT-01 | node-chain
OP-N20-01 | 12月11日 | 魔法禁书目录本篇 | 新约 | 科隆尊主线前段／赴英与冲突升级 | CORONZON / CORONZON-01 | node-chain
OP-N21-01 | Y年12月中旬 | 魔法禁书目录本篇 | 新约 | 科隆尊主线中段 | CORONZON / CORONZON-01 | node-chain
OP-N22-01 | Y年12月20日附近 | 魔法禁书目录本篇 | 新约 | 科隆尊决战／新约正卷收束 | CORONZON / CORONZON-01 | node-chain
OP-N23-01 | Y年12月21日 | 魔法禁书目录本篇 | 新约 | 22 Reverse／上条身份冲突与后续 | NT-22R / NT-22R-01 | node-chain
OP-G01-01 | Y年12月24日 | 魔法禁书目录本篇 | 创约 | 创约开幕／平安夜 | GENESIS-01 / GENESIS-01-01 | node-chain
OP-G02-01 | Y年12月25日 | 魔法禁书目录本篇 | 创约 | 圣诞日、安娜与住院上条／蜂琴共斗 | GENESIS-02 / GENESIS-02-01 | node-chain
OP-G03-01 | Y年12月25日 | 魔法禁书目录本篇 | 创约 | 手铐行动 Operation Handcuffs | GENESIS-03 / GENESIS-03-01 | node-chain
OP-G04-01 | Y年12月26日 | 魔法禁书目录本篇 | 创约 | 洛杉矶全人口消失／R&C Occultics | GENESIS-04 / GENESIS-04-01 | node-chain
OP-G05-01 | Y年12月29日 | 魔法禁书目录本篇 | 创约 | 暗部残党、装甲列车与爱丽丝介入 | GENESIS-05 / GENESIS-05-01 | node-chain
OP-G06-01 | Y年12月31日 | 魔法禁书目录本篇 | 创约 | 涩谷／阿拉迪娅 | GENESIS-06 / GENESIS-06-01 | node-chain
OP-G07-01 | Y＋1年1月1日 | 魔法禁书目录本篇 | 创约 | 元旦／领事馆与桥架结社 | GENESIS-07 / GENESIS-07-01 | node-chain
OP-G07-02 | Y＋1年1月2日 | 魔法禁书目录本篇 | 创约 | 元旦／领事馆与桥架结社 | GENESIS-07 / GENESIS-07-02 | node-chain
OP-G07-03 | Y＋1年1月3日 | 魔法禁书目录本篇 | 创约 | 元旦／领事馆与桥架结社 | GENESIS-07 / GENESIS-07-05 | node-chain
OP-G08-01 | Y＋1年1月3日 | 魔法禁书目录本篇 | 创约 | 保护安娜／多方追击 | GENESIS-08 / GENESIS-08-01 | node-chain
OP-G09-01 | Y＋1年1月5日 | 魔法禁书目录本篇 | 创约 | CRC攻城、医院保卫战 | GENESIS-09 / GENESIS-09-01 | node-chain
OP-G10-01 | Y＋1年1月6日 | 魔法禁书目录本篇 | 创约 | 爱丽丝复活／茵蒂克丝危机与救援 | GENESIS-10 / GENESIS-10-01 | node-chain
OP-G10-02 | Y＋1年1月6日23:58附近 | 魔法禁书目录本篇 | 创约 | 爱丽丝复活／茵蒂克丝危机与救援 | GENESIS-10 / GENESIS-10-07 | node-chain
OP-G11-01 | Y＋1年1月7日附近 | 魔法禁书目录本篇 | 创约 | 死后／伪地狱与金斯福德 | GENESIS-11 / GENESIS-11-01 | node-chain
OP-G12-01 | Y＋1年1月8日附近 | 魔法禁书目录本篇 | 创约 | 葬礼、复活及复活后事态 | GENESIS-12 / GENESIS-12-01 | node-chain
OP-G13-01 | Y＋1年1月8日之后 | 魔法禁书目录本篇 | 创约 | 阿蒂迦利迦／红雪与再战科隆尊 | GENESIS-13 / GENESIS-13-01 | node-chain
OP-G14-01 | Y＋1年1月9日早晨 | 魔法禁书目录本篇 | 创约 | 科隆尊逃亡／追击与尾声 | GENESIS-14 / GENESIS-14-07 | node-chain
OP-G14-02 | Y＋1年1月9日08:30附近 | 魔法禁书目录本篇 | 创约 | 科隆尊逃亡／追击与尾声 | GENESIS-14 / GENESIS-14-08 | node-chain
OP-X01-01 | 未定日 | 动画、游戏、特典及未定日衍生 | 媒体／未定日 | 其余SS2／SP／特典散点 | 无包 / 未进入事件包 | reference-only-no-package
OP-X02-01 | 未定日 | 动画、游戏、特典及未定日衍生 | 媒体／未定日 | 原石拯救／学习装置现有原创疑点 | 无包 / 未进入事件包 | reference-only-no-package
OP-X03-01 | 未定日 | 动画、游戏、特典及未定日衍生 | 媒体／未定日 | 神裂SS、SP马克／火星、Cold Game | 无包 / 未进入事件包 | reference-only-no-package
OP-X04-01 | 未定日 | 动画、游戏、特典及未定日衍生 | 媒体／未定日 | 超炮SS3、雅妮丝SS、蜂琴外传与特典 | 无包 / 未进入事件包 | reference-only-no-package
OP-X05-01 | 未定日 | 动画、游戏、特典及未定日衍生 | 媒体／未定日 | 黄金SS等更早历史 | 无包 / 未进入事件包 | reference-only-no-package
OP-X06-01 | 未定日 | 动画、游戏、特典及未定日衍生 | 媒体／未定日 | 超出图版的卷话／新目录项 | 无包 / 未进入事件包 | reference-only-no-package
