# 创约前半卷内容质量早检（GENESIS-01..08）

## 结论与边界

- 结论：**1项合并后的P2已证错误，涉及GT7两处分日节点；0项单列的待核风险。** 不把证据未覆盖的细节臆测成问题，也不据此宣布八卷全部通过。
- 审查日期：2026-09-08，Asia/Shanghai。八包基线哈希采集于08:50:46，09:07:21复核均未变化；本报告针对下列哈希版本。
- 全文审读创约第一至第八卷事件包，核对原作因果、关键身份、默认收束、分支继承和既有schema写回语义。没有读取施工中的第9–14卷事件包；第8卷中的后继链接不构成对第9卷正文的验收。
- 只写本报告；没有修改src、清单、正式docs或原证据缓存。没有安装、watch、构建、酒馆导入、git commit或子代理；并行仅用于独立的只读命令。
- 先核对CLAUDE及其引用规则、沿途适用指令。文本按BOM→严格UTF-8→必要时GB18030处理；本轮实际用于判断的文本均严格UTF-8成功，无编码不确定性。
- 审计路由：`code-quality-workflow / AUDIT`；库快照`2026-08-18`，仅取`ST-A0`。A0三格：目标为八卷内容早检；红线为唯一报告写集及上述禁项；退出条件为有证据的有限问题、逐包范围和哈希交接，不等待后半卷。

## 可行动问题

### 1. P2／已证错误：GT7总窗口正确，但入馆与阿拉迪娅协作转折各提前一天

**位置**

- `src/魔法禁书目录模拟器/世界书/剧情事件/主线/主线事件·创约第七卷.txt:36`：`GENESIS-07-02`以“元旦接触爱丽丝的邀请”进入领事馆生活、招待与留宿；第41行又把到达1月2日作为下一节点门槛，默认流程会把入馆安排在1月1日。
- `src/魔法禁书目录模拟器/世界书/剧情事件/主线/主线事件·创约第七卷.txt:52`：`GENESIS-07-04`明确“仍处1月2日”，第56行已结算“阿拉迪娅愿协助上条争取更多成员”，再等次日向H.T.游说。

**问题**

原作不是“1日入馆→2日阿拉迪娅转向→3日继续游说”。1日晚众人仍回上条宿舍；2日早餐后才受邀前往领事馆。阿拉迪娅对上条的协作转折则发生在3日：欧提努斯解释上条遭教会利用、曾在圣日耳曼事件中主动借用魔术，符合她保护受迫害魔女的条件，随后她才主动提出通过结社议事阻止安娜被处决。现包把这个结果提前一天，并省略了使她转向的关键认知输入，容易把关系变化写成无条件配合。第5行总体1/1–3窗口、1/3花园袭击和同日衔接GT8本身没有错。

**证据（C级：已取得的非官方英译正文，不升级为官方日文正文）**

- `.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT7-Chapter2.txt:391`：入睡前场景仍在上条男生宿舍；`.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT7-Chapter2.txt:410`直接明记次晨为`January 2`。
- `.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT7-Chapter2.txt:468`：2日早餐时爱丽丝提出吃完再去，目的地是第十二学区领事馆；不是元旦已经入馆留宿。
- `.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT7-Chapter3.txt:263`：2日讨论中阿拉迪娅仍说，没有任何成员认为安娜符合自己的救济条件而站出来救她。
- `.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT7-Chapter3.txt:418`：后续Part 3明确`It was January 3.`。
- `.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT7-Chapter3.txt:484`：欧提努斯解释受教会利用、12/25借圣日耳曼施法与魔女身份的联系；第501行阿拉迪娅还明确承认自己“今天1月3日”此前仍在敌视上条。
- `.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT7-Chapter3.txt:530`：阿拉迪娅主动询问是否想不杀安娜地阻止处决；第537行仍向欧提努斯确认上条算魔女，第550行才提出控制结社讨论的具体办法。

**最小修正建议（仅建议，未改正文）**

1. 保留`GENESIS-07-01`为1日参拜和得知领事馆，补一句当晚回宿舍；把进入`GENESIS-07-02`的现实日期改为2日早餐后，将该节点至`GENESIS-07-03`改为同日推进，而不是入馆后再等2日。
2. `GENESIS-07-04`的2日结果只保留摸清救济条件、合作尚未取得；把阿拉迪娅转向及欧提努斯上述说明移入3日`GENESIS-07-05`的前置，再接花园游说与H.T.袭击。无需新节点、新schema或重做结构工具。
3. 玩家若在1日提前入馆、或2日提前说服阿拉迪娅，可以保留，但须作为有实际介入原因的已改写分支，不能冒充原作默认日程。

**复核入口**：按默认路线从`GENESIS-07-01`顺读至`GENESIS-07-05`；检查“1日晚宿舍→2日入馆／了解条件→3日认知转折／花园袭击”成立，且改写分支不被强行回正。这是文本复核条件，不是已经运行的酒馆用例。

## 逐包实际已核范围

下表为本轮实际交叉核对的重点，不表示每卷所有战斗细节均已逐字校勘。官方简介与六列表用于篇目、主日及总体事件定位；人物命运与细节优先看民译正文。

| 包 | 已核内容及结果 | 主要正文定位 |
| --- | --- | --- |
| GENESIS-01 | 12/24；舞殿造成的伤势、根丘移交警备员、安娜投药接次卷；包内允许阻断投药，不强制补中招。未见本轮可证实的收束错误。 | `.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT1-Chapter1.txt:160`；`.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT1-Epilogue.txt:7` |
| GENESIS-02 | 主日12/25，与GT3并行；12/24投药是前情。击败安娜不自动治愈，圣日耳曼自行归向右手消失；挽救双方仅作玩家可尝试的替代方案。 | `.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT2-Chapter1.txt:20`；`.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT2-Epilogue.txt:6` |
| GENESIS-03 | 12/25追捕／逃亡双线，序章15点未冒充行动启动时刻；木原端数、Ladybird与金币因果另核第四章；Frillsand吸收异常空间的尾声承接GT5。 | `.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT3-Prologue.txt:2`；`.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT3-Epilogue.txt:84`；下述新增正文R1 |
| GENESIS-04 | 当地12/26起，03:00抵达安排与日期线分开；没有把27日全篇终点写成已证。联合行动、母女团聚、妹妹们公开后的社会反应及十二架物流机解除威胁能对上缓存。 | `.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT4-Chapter1.txt:39`；`.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT4-Chapter1.txt:86`；`.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT4-Epilogue.txt:27` |
| GENESIS-05 | 12/29，是押送事故与手铐余波的新冲突。爱丽丝安排与未受安排的现实分账；幽灵端数、克里法／Risako、风斩收束另核第四章。Frillsand危险未被抹掉，未硬写她与儿童直接团聚。 | `.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT5-Prologue.txt:3`；`.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT5-Epilogue.txt:9`；下述新增正文R2 |
| GENESIS-06 | 主日12/31涩谷；阿拉迪娅存活受约束、魅魔救治、云川定位器及两位安娜的不同立场可对照。复活有已发生事实与条件边界，没有变成玩家死亡惩罚或无限复活权。 | `.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT6-Prologue.txt:8`；`.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT6-Epilogue.txt:10`；`.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT7-Chapter3.txt:260` |
| GENESIS-07 | 总体1/1–3正确；分日节点见唯一问题。H.T.利用足部受限、玛丽救治、爱丽丝冲突、救出受封印的施普伦格尔及阿拉迪娅同行均有具体承接，不是空标题。 | `.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT7-Chapter3.txt:619`；`.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT7-Epilogue.txt:76` |
| GENESIS-08 | 1/3承接、1/4深夜尾声；三方目的及两名阿拉迪娅未混同，矮小液体危机不因战胜追击者自动解除。CRC降临、杀害爱丽丝及金斯福德迎战确实留在本卷尾声，没有错放成GT9首次发生。 | `.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT8-Prologue.txt:26`；`.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT8-Epilogue.txt:36`；`.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT8-Epilogue.txt:62`；`.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT8-Epilogue.txt:288`；`.agent-artifacts/magic-apr-jan-20260908/genesis/community-GT8-Epilogue.txt:375` |

## 分支与写回

- 八包都写出本卷人物、威胁、行动与后果；本轮没有发现足够依据把某包判成“用模板空话冒充整卷可玩链”。这不等于LLM在实机中一定会正确展开这些节点。
- 已点查`GENESIS-01→02`阻断投药、`03→05`救活Drencher／改变端数结局、`04`妹妹们未公开、`06→07`无定位器时不凭空恢复、`07→08`安抚爱丽丝／非处死监管、`08`阻止仪式或保护爱丽丝等继承口径。均明确保留实际改写，未见强制正史回正、替代死者或偏离惩罚要求。
- 字段与`src/魔法禁书目录模拟器/schema.ts:53`、`src/魔法禁书目录模拟器/schema.ts:100`、`src/魔法禁书目录模拟器/schema.ts:129`比对：使用既有主线进度及其正史锚点、任务追踪、NPC关系、在场人物、势力关系、世界线记录；未要求新增年层、复活次数、善恶计分等字段。包内节点数组要求整体replace并保留历史。本项只核文本契约，没有执行状态补丁。

## 依据与新增取证

- 方案：`docs/魔禁剧情修改方案-四月至次年一月.md:102`及`docs/魔禁剧情修改方案-四月至次年一月.md:165`；六列表G01–08：`docs/魔禁四月至次年一月-事件证据表.md:127`；研究：`.planning/magic-apr-jan-20260908/research-genesis.md:11`；集成约束：`.planning/magic-worldbook-implementation-20260908/integration-contract.md:19`。
- B级：重读原缓存的`official-GT01.summary.txt`至`official-GT08.summary.txt`，均位于`.agent-artifacts/magic-apr-jan-20260908/genesis/`，是已取得卷页简介的抽取件，不是搜索摘要。官方第6、7卷简介分别直写12/31、1/1；简介不能代替卷内日界或死亡场景正文。
- C级：上表列出的Baka-Tsuki民译缓存及GT7相关章节上下文。问题1全部可用原缓存离线复核。没有取得官方日文小说正文，不声称A级原文校勘；没有把搜索摘要当正文。
- R1：实际取得[GT3第四章原始正文](https://www.baka-tsuki.org/project/index.php?title=Toaru_Majutsu_no_Index:GT_Volume3_Chapter4&action=raw)，HTTP 200，2026-09-08 09:03:22+08:00，99968字节；定位Ladybird人工脑解释及木原端数向金币要求枪故障的段落。响应SHA-256：`bbf54a6620e19e967e146fa486e8824232c5f478dc348e8c54f395ccab912df3`。
- R2：实际取得[GT5第四章原始正文](https://www.baka-tsuki.org/project/index.php?title=Toaru_Majutsu_no_Index:GT_Volume5_Chapter4&action=raw)，HTTP 200，2026-09-08 09:05:14+08:00，113644字节；定位克里法救出Risako、Frillsand重新取得控制及风斩对端数的最终处置。响应SHA-256：`3ec4805c12121f629466926dd1265d91e8ac5e26dd01f82e68c787f4976ab0fd`。
- R1／R2只在内存解码、检索与阅读，没有新增证据缓存或执行远程内容；如网页后续变化，用URL、取证时刻与响应哈希辨别版本。它们不是本报告唯一问题的必要证据。

## 八包SHA-256基线

| 包及文件 | 字节 | SHA-256 |
| --- | ---: | --- |
| GENESIS-01：`src/魔法禁书目录模拟器/世界书/剧情事件/主线/主线事件·创约第一卷.txt:1` | 8073 | `b625687bc5526fd0d481f8b7e1b9caaf5beff6ff5f42976165d7edb27733abf4` |
| GENESIS-02：`src/魔法禁书目录模拟器/世界书/剧情事件/主线/主线事件·创约第二卷.txt:1` | 8332 | `64f117601504a0e973f5d0e1a6d57391d1a6e6cd45fe61f76b7f0b8ec9dcd78f` |
| GENESIS-03：`src/魔法禁书目录模拟器/世界书/剧情事件/主线/主线事件·创约第三卷.txt:1` | 8728 | `7715723f347e09e5020a14ac8bb5d1487904a4bf17fbeece67c97a39722af52e` |
| GENESIS-04：`src/魔法禁书目录模拟器/世界书/剧情事件/主线/主线事件·创约第四卷.txt:1` | 8448 | `f96b055963124d7e695cf90702d0e3080e7e5fc04ef8df5e912f4533dfe58454` |
| GENESIS-05：`src/魔法禁书目录模拟器/世界书/剧情事件/主线/主线事件·创约第五卷.txt:1` | 8960 | `eac7f8eb44ade2e0f9c017fe4ad867a689ac060cf94b4895929efa9653d20562` |
| GENESIS-06：`src/魔法禁书目录模拟器/世界书/剧情事件/主线/主线事件·创约第六卷.txt:1` | 8310 | `840f4c4c9715285e2d50582320a05089f4bd300b44b76508364287f595874e51` |
| GENESIS-07：`src/魔法禁书目录模拟器/世界书/剧情事件/主线/主线事件·创约第七卷.txt:1` | 9383 | `99752f059cd9a88662cbfd6af361158151a81f499baa0573b5b1c651929363f9` |
| GENESIS-08：`src/魔法禁书目录模拟器/世界书/剧情事件/主线/主线事件·创约第八卷.txt:1` | 8752 | `dbc8daf9ad54a67c73c3e6ae1b07f079a1735c2fea9ee14b766eeb18410b6ed9` |

## 未做的验收与交接

没有重做注册、节点ID、关键词等结构工具，没有全库审计，没有构建、打包或真实酒馆验收，也没有在真实会话验证注入、NPC认知或状态写回。作者只需处理上面的GT7分日与认知转折，保留既有玩家改写规则；其他卷不因这次早检建议重写。后半卷由原作者继续，本轮到此结束。
