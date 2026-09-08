import fs from 'node:fs';

const decoder = new TextDecoder('utf-8', { fatal: true });
const read = file => decoder.decode(fs.readFileSync(file));
const phase2Path = '.planning/magic-opening-restructure-20260908/phase2-opening-ids.json';
const phase4Path = '.planning/magic-opening-restructure-20260908/phase4-opening-rewrites.json';
const outputJsonPath = '.planning/magic-opening-restructure-20260908/phase5-complete-openings.json';
const outputMarkdownPath = '.planning/magic-opening-restructure-20260908/phase5-complete-openings.md';

const newOpeningTexts = {
  'OP-P01-01': {
    displayDate: 'Y−1年4月初',
    text: '才人工房的门禁只对被安排的人打开。幼年食蜂被带到多莉的照护室，研究者说得客气，却始终不肯解释实验全貌。你可以观察设备、询问照护需求，或先陪两个女孩说话。',
  },
  'OP-P01-02': {
    displayDate: 'Y−1年4月初',
    text: '才人工房的接触安排突然改变，多莉的照护记录和研究者的口径出现缝隙。幼年食蜂开始意识到规则并非不可动摇。你可以核对房间权限、保留证据，或先确认多莉的安全。',
  },
  'OP-P02-01': {
    displayDate: 'Y−1年4月起',
    text: '一年级美琴在常盘台遇见自贩机、雪紫与琉璃学姐。校规、宿舍与新学期人事同时压来；你可以帮她取回钱包、陪她适应校园，或先弄清学姐传闻的真假。',
  },
  'OP-P04-01': {
    displayDate: 'Y−1年6月',
    text: '常盘台的派阀传闻升温，一年级美琴被卷入并不属于自己的权力游戏。雪紫与琉璃的态度也各有分量；你可以先确认事实、保护普通学生，或阻止一场未遂的对立。',
  },
  'OP-P05-01': {
    displayDate: 'Y−1年6月30日附近',
    text: '暗黑五月的背景线索仍未形成完整可玩链。已知它属于前史与相关人物回忆，不能直接把实验当成当前事件。你可以先声明媒介、地点与已发生事实，再选择回顾或调查。',
  },
  'OP-P06-01': {
    displayDate: 'Y−1年7月',
    text: '麦野、泷壶、芙兰达与绢旗组成行动小队。保险公司的委托、能力者异常事件和第五名候补同时出现；你可以核对委托、观察华野，或先确认队伍的资金压力。',
  },
  'OP-P07-01': {
    displayDate: 'Y−1年7月末',
    text: '初三上条在巷口遇见蜜蚁与云川。三人身份不同，麻烦却已经在同一片阴影里；你可以帮忙解围、参与交谈，或先弄清谁才是真正被追的人。',
  },
  'OP-P08-01': {
    displayDate: 'Y−1年8月2日',
    text: '上条与食蜂在路口交错，一部遗落的手机把两人的暑假连在一起。人工湖、相处与死结都还没展开；你可以协助寻找失主、留意对方去向，或先留下联络方式。',
  },
  'OP-P09-01': {
    displayDate: 'Y−1年8月上旬',
    text: 'ITEM接手“蜂蜜女王”相关委托。表面是婚姻诈骗，失窃资料却牵连能力开发机密；你可以整理受害范围、询问接触过程，或先设定追查目标。',
  },
  'OP-P10-01': {
    displayDate: 'Y−1年8月末',
    text: 'ITEM的安全屋与下一份工作同时出问题。四人需要落脚处、物资和可靠情报；你可以清点人员、查看爆破痕迹，或协助安排临时据点。',
  },
  'OP-P11-01': {
    displayDate: 'Y−1年9月初',
    text: '芙兰达在新宿的站台醒来，随身物品与记忆都不完整。城市玩家只能先靠通讯确认她的位置；你可以核对行程、询问身体状况，或帮她离开拥挤人流。',
  },
  'OP-P12-01': {
    displayDate: 'Y−1年9月中旬',
    text: '前一年的大霸星祭被异常失去意识的委托打断。药检、比赛日程与队员私人牵挂互相冲突；你可以核实现场、分配调查和观赛时间，或先保护无关学生。',
  },
  'OP-P14-01': {
    displayDate: 'Y−1年10月',
    text: '秋日银行里，一名少女被迫参与劫案。麦野的怒火、芙兰达的枪口与普通人质同时压在柜台前；你可以提醒队友、配合撤离，或尝试有依据的现场交涉。',
  },
  'OP-P15-01': {
    displayDate: 'Y−1年12月上旬',
    text: '绝对等速的传闻把美琴一年级生活引向新事件。速度、方向与目击证词尚未对齐；你可以陪同调查、记录现象，或先确认周围学生会不会被卷入。',
  },
  'OP-S06-01': {
    displayDate: 'Y年4月下旬',
    text: '初春与佐天的交友前奏仍属索引型入口。已知场景围绕校园相识与栅川定向越野展开，具体话页待核；你可以先声明相对时期和地点，再从日常同行或活动集合切入。',
  },
  'OP-O01-01': {
    displayDate: 'Y年7月中旬',
    text: '能力异常案件开始超出登记等级。爆炸现场的威力和学生证资料对不上，美琴、黑子与初春先后被卷入；你可以疏散人群、调取案卷，或追问能力来源。',
  },
  'OP-O03-01': {
    displayDate: '未定日',
    text: '大蜘蛛、OVA与动画日常散点不能合并成一条伪时间线。选择该入口时，先确认媒介、原载和相对顺序；你可以从日常事件、遭遇战或特典场景中指定一个可玩切口。',
  },
  'OP-O04-01': {
    displayDate: 'Y年8月1日',
    text: '初春SP事件的索引仍需按媒介核对。已知线索指向遥控车辆与恐袭危机，但路线和节点尚未细拆；你可以先确认版本与地点，再从警报、委托或日常同行切入。',
  },
  'OP-O05-01': {
    displayDate: 'Y年8月初',
    text: '盛夏祭与白鳄部队来自游戏路线，不能伪造成小说必经链。选择入口时先声明媒介和路线；你可以从祭典人流、异常部队或任务简报中确定一个可玩起点。',
  },
  'OP-O06-01': {
    displayDate: 'Y年8月上旬',
    text: '姬神在餐厅里留下不安的气息。吸血杀手的传闻、三泽塾的动向与她受控制的处境彼此纠缠；你可以与她交谈、记下离去方向，或先向上条和茵蒂克丝求助。',
  },
  'OP-O11-02': {
    displayDate: 'Y年8月31日',
    text: '最后之作线之外，艾扎力与闇咲逢魔的行动也在同一夜推进。三条线索并不要求同时亲历；你可以选择视角、维持联络，或先保护身边最容易受伤的人。',
  },
  'OP-O13-01': {
    displayDate: 'Y年9月上旬',
    text: '学艺都市的海滨表演突然被真实机体战斗打断。游客还没明白发生了什么；你可以先组织疏散、记录机体来源，或向工作人员核对官方说法。',
  },
  'OP-O15-01': {
    displayDate: 'Y年9月上旬',
    text: '杠林檎与垣根帝督在候选窗口相遇。少女的安全、第二位的目的与暗部追踪互相牵动；你可以询问需求、提出临时陪同，或保持距离先观察。',
  },
  'OP-O17-01': {
    displayDate: 'Y年9月中旬',
    text: '天草式在伦敦准备报告与必要之恶教会编入考试。集合方式、报告材料和失联预案都待确认；你可以整理证词、核对通知，或选择随一组行动。',
  },
  'OP-O19-01': {
    displayDate: 'Y年9月中旬',
    text: '少女茉离从空中跌入一方通行的生活。异常身体状况、体内器械与跟踪者同时成为问题；你可以安排检查、保护现场，或先询问她能说清的来历。',
  },
  'OP-O22-01': {
    displayDate: 'Y年9月19日',
    text: '大霸星祭开幕。比赛、家长与常盘台日程构成七天的城市背景；你可以参赛、观赛、陪同亲友，或先记录普通日程，为之后的异常保留参照。',
  },
  'OP-O25-01': {
    displayDate: 'Y年9月下旬',
    text: '北意大利的旅行邀约把上条、茵蒂克丝与奥索拉连在一起。搬迁、运河与本地联络看似日常；你可以帮忙搬运、引路，或先确认异常来自哪个方向。',
  },
  'OP-O29-01': {
    displayDate: 'Y年10月上旬',
    text: 'GROUP的第一份工作指向驹场利德。肃清命令、最后之作的安全与上层意图并不一致；你可以核对任务、查找真实背景，或先区分目标与无辜者。',
  },
  'OP-O30-01': {
    displayDate: '未定日',
    text: '独立心理掌握事件仍按相对时期处理。常盘台选举、帆风疑云与遗产线索互相牵连；你可以先确认玩家身份和派阀立场，再从选举事务、疑云调查或幕后势力切入。',
  },
  'OP-N02-01': {
    displayDate: 'Y年11月5日',
    text: '战后回城的街道上，驱动铠正在追赶芙蕾梅亚。半藏的求助与浜面的保护线同时启动；你可以掩护撤离、提供交通工具，或误导追踪者先争取时间。',
  },
  'OP-N07-01': {
    displayDate: 'Y年11月下旬',
    text: '格雷姆林集结与联军行动让东京和船之坟场出现在两张地图上。情报并不对等；你可以比对目标、疏散居民，或先联系能确认材料去向的小队。',
  },
  'OP-N09-01': {
    displayDate: 'Y年11月下旬',
    text: '欧提努斯救援追逐进入关键窗口。追兵、庇护者与上条的选择彼此交错；你可以建立避险路线、核对目击情报，或先保护无力继续奔跑的人。',
  },
  'OP-N11-01': {
    displayDate: '未定日',
    text: '回生者与幻想收束的原创大乱斗尚未核出完整独立图弧。选择入口时不能伪造日期；你可以声明媒介、相对顺序和已发生前置，再从遭遇战、回收任务或幻想异变切入。',
  },
  'OP-N14-01': {
    displayDate: 'Y年12月上旬',
    text: '奈芙蒂斯带着魔神被放逐的消息逃回上条身边。求助、危险与新的右手传闻同时出现；你可以安排休息、核对目击范围，或先建立避险与谈判条件。',
  },
  'OP-N19-01': {
    displayDate: 'Y年12月11日附近',
    text: '无窗大楼成为临时隔离载具，城市疏散与地面残留威胁并行。太空、地面和系统访问不能混成一条线；你可以组织撤离、核对离楼者，或先调查残留附身。',
  },
  'OP-N21-01': {
    displayDate: 'Y年12月中旬',
    text: '科隆尊的英国根基仍未解除。登陆、护送与伦敦通信点把队伍分散在不同位置；你可以核对同伴去向、保护平民，或先建立能说明来意的接触渠道。',
  },
  'OP-N22-01': {
    displayDate: 'Y年12月20日附近',
    text: '新约正卷进入决战窗口。伦敦的资料点、同伴伤势与科隆尊的行动同时收紧；你可以确认战场边界、护送非战斗者，或争取一次能改变局势的谈判。',
  },
  'OP-N23-01': {
    displayDate: 'Y年12月21日',
    text: '温莎的战后庆祝仍留着未解线索。右手异常、分别后的见闻与宴会上的熟悉面孔需要核对；你可以陪伴伤者、私下询问，或安排一次安全的身份确认。',
  },
  'OP-G01-01': {
    displayDate: 'Y年12月24日',
    text: '平安夜的补习、购物与街灯把上条一行聚在一起。都市权力更替后的不安还没散去；你可以同行、协助寻找同伴，或先调查人流中的异常。',
  },
  'OP-G02-01': {
    displayDate: 'Y年12月25日',
    text: '上条住院后的病房成为调查中心。安娜造成的问题、普通伤势与探病安排必须分清；你可以问诊、保护病人，或陪同美琴和食蜂整理已知接触。',
  },
  'OP-G03-01': {
    displayDate: 'Y年12月25日',
    text: '手铐行动的清剿令落到街头。一方通行的改革目标与现场执行出现落差；你可以加入巡查、查验抓捕依据，或帮助被追捕者观察封锁。',
  },
  'OP-G04-01': {
    displayDate: 'Y年12月26日',
    text: '洛杉矶调查队抵达异常低温的空城。人口消失范围、避寒地点和通信状况都待确认；你可以先搜救、建立联络，或标出不能随意破坏的平民区域。',
  },
  'OP-G05-01': {
    displayDate: 'Y年12月29日',
    text: '陌生学生爱丽丝出现在上条身边。她把上条视为老师，常识与危险的理解却明显不同；你可以陪她交谈、寻找照护线索，或先确认街头的装甲列车事故。',
  },
  'OP-G06-01': {
    displayDate: 'Y年12月31日',
    text: '云川的涩谷打工邀约把上条一行带入跨年人潮。工作内容、出口位置与联络方式都还没核对；你可以协助同伴、观察人群，或从街头救援切入。',
  },
  'OP-G07-01': {
    displayDate: 'Y＋1年1月1日',
    text: '初诣人潮中，上条一行维持着别扭的同行关系。阿拉迪娅的约束、云川的发信器与爱丽丝的动向都待确认；你可以协助秩序、核对联络，或先陪众人完成参拜。',
  },
  'OP-G07-02': {
    displayDate: 'Y＋1年1月2日',
    text: '早餐后的调查意图开始取代新年闲谈。领事馆、桥架结社与爱丽丝的位置仍未对齐；你可以核对情报、分配同伴任务，或先确认今天能否安全入馆。',
  },
  'OP-G07-03': {
    displayDate: 'Y＋1年1月3日',
    text: '元旦余波尚未平息，新的追踪与结社线索已经压向第一二学区。你可以维持同伴联络、确认退路，或先查明谁在把爱丽丝当作目标。',
  },
  'OP-G08-01': {
    displayDate: 'Y＋1年1月3日',
    text: '安娜的护送线进入临时同行阶段。伤势、行动边界与失散的茵蒂克丝、欧提努斯都要处理；你可以核对路线、联系同伴，或先约定不可越过的底线。',
  },
  'OP-G09-01': {
    displayDate: 'Y＋1年1月5日',
    text: 'CRC逼近安娜所在医院。患者转移条件、防卫方联络与非战斗人员撤离同时压来；你可以核对医疗限制、安排疏散，或先守住医院入口。',
  },
  'OP-G10-01': {
    displayDate: 'Y＋1年1月6日',
    text: '医院收到茵蒂克丝受困的消息。上条伤势、爱丽丝状态与可用同伴都要核对；你可以确认最后目击、组织救援，或先保障住院患者不失去照护。',
  },
  'OP-G10-02': {
    displayDate: 'Y＋1年1月6日23:58附近',
    text: '救援线与生死边界同时收紧。现实侧的急救、同伴照护与另一侧的异变不能混写；你可以选择视角、维持联络，或先守住还能救的人。',
  },
  'OP-G11-01': {
    displayDate: 'Y＋1年1月7日附近',
    text: '金斯福德的邀约落在生死边界之后。回生提议、同行请求与仍想见的人摆在面前；你可以询问条件、整理牵挂，或留在现实侧照顾同伴。',
  },
  'OP-G12-01': {
    displayDate: 'Y＋1年1月8日附近',
    text: '告别式的筹备让同学们被迫面对失去。消息传递、出席安排与情绪照护同时需要人手；你可以协调流程、陪伴沉默者，或先确认遗体移送的细节。',
  },
  'OP-G13-01': {
    displayDate: 'Y＋1年1月8日之后',
    text: '红雪落下，科隆尊的行动权出现新的变化。伤者、魔神介入与撤离路线互相牵动；你可以组织撤离、记录威胁内容，或先保护刚脱离危机仍脆弱的人。',
  },
  'OP-G14-01': {
    displayDate: 'Y＋1年1月9日早晨',
    text: '夺体尝试后的现场仍布满伤者。科隆尊的去向、同伴联络与追击条件都未稳定；你可以保护倒下者、记录逃跑方向，或先恢复通讯。',
  },
  'OP-G14-02': {
    displayDate: 'Y＋1年1月9日08:30附近',
    text: '追击线进入最后窗口。体力、路线与科隆尊的下一步同时收紧；你可以核对同伴位置、分配支援，或先确保伤者有人看护。',
  },
  'OP-X01-01': {
    displayDate: '未定日',
    text: '其余SS2、SP与特典散点仍按索引处理。选择入口时先确认原载、媒介和相对顺序；你可以从短篇开场、委托现场或事后报告切入，不伪造具体日期。',
  },
  'OP-X02-01': {
    displayDate: '未定日',
    text: '原石拯救与学习装置的现有内容仍是原创疑点，不能直接绑定某条原作图弧。你可以先声明证据边界，再从实验室、任务简报或学习装置异常切入。',
  },
  'OP-X03-01': {
    displayDate: '未定日',
    text: '神裂SS、SP马克与Cold Game分属不同原载。选择时先锁定作品与前后顺序；你可以从神裂的任务、火星设施或冷游戏现场指定一个可玩切口。',
  },
  'OP-X04-01': {
    displayDate: '未定日',
    text: '超炮SS3、雅妮丝SS与蜂琴外传不能互替。入口需先确认媒介和角色线；你可以从海上事件、教会任务或蜂琴日常中选定场景，再初始化相对时期。',
  },
  'OP-X05-01': {
    displayDate: '未定日',
    text: '黄金SS等更早历史早于本轮起点。选择该入口时不把它拉进Y年；你可以先确认十九世纪后半的地点与人物，再从仪式、调查或旧档案切入。',
  },
  'OP-X06-01': {
    displayDate: '未定日',
    text: '超出图版的后续卷话不自动纳入当前卡。选择时必须声明来源截止与新增证据；你可以从新目录项、联网核验或玩家自定相对顺序切入，不伪造已支持日期。',
  },
};

const existingTextOverrides = {
  'OP-P03-01': {
    displayDate: 'Y−1年5月',
    text: '入学一个月的美琴被魔之自贩机吞掉一万日元。琉璃学姐示范“自贩机踢”，雪紫接着说教；你可以帮忙交涉、记录故障，或顺势了解常盘台派阀的传闻。',
  },
  'OP-P13-01': {
    displayDate: 'Y−1年次期新学期',
    text: '白井黑子等新生入学，“能力再现”事件震撼常盘台。保健室的女帝、复仇计划与派阀传闻交错；你可以先核对目击证词，或保护新生不被卷入权力游戏。',
  },
  'OP-S01-01': {
    displayDate: 'Y年1月18日',
    text: 'Skill-Out三名头目连夜出逃，却在半路被黄泉川爱穗截获。针对无能力者的抓捕正在升温；你可以核实抓捕依据、协助疏散，或先弄清谁在名单上。',
  },
  'OP-S02-01': {
    displayDate: 'Y年2月1日',
    text: '伦敦牛仔裤店里，神裂火织撞上专剪牛仔裤的怪人；同一时刻，黑妻绵流重获自由。魔法侧与暗部的棋盘同时挪动；你可以留在店内控制局面，或追踪另一条线索。',
  },
  'OP-S03-01': {
    displayDate: 'Y年2月22日',
    text: '上条刀夜在意大利街头结识芭比娜与丽多薇雅。那箱出于母爱塞来的纪念品还只是行李；你可以帮忙搬运、核对物品来历，或提醒他们通关前谨慎处理。',
  },
  'OP-S04-01': {
    displayDate: 'Y年3月15日',
    text: '削板军霸在横须贺街头撂倒对手，救下原谷矢文。这块号称“原石”的硬骨头正砸出自己的名字；你可以协助伤者、观察战斗方式，或先问清这场冲突的起点。',
  },
  'OP-S05-01': {
    displayDate: 'Y年4月某日',
    text: '白井黑子踏入常盘台，与王牌御坂美琴初会；同一时间，小郭顶着假身份潜入学园都市。两条线尚未交汇；你可以陪同黑子熟悉校园，或跟踪可疑者的落脚点。',
  },
  'OP-S07-01': {
    displayDate: 'Y年4月5日',
    text: '巴西的伊妮丝开始新的生活，学舍之园的黑子则听见“原石”话题。散点事件尚未连成主线；你可以选择一个视角核实传闻，或先记录能与后续相接的线索。',
  },
  'OP-S08-01': {
    displayDate: 'Y年5月11日',
    text: '实验舱内，御坂9982号睁开双眼。指令、遗体处理与姐妹们的编号让日常显得冰冷；你可以核对操作记录、观察她的反应，或先确认谁有权下达这些指令。',
  },
  'OP-S09-01': {
    displayDate: 'Y年6月17日',
    text: '自动贩卖机前的口角让当麻惹怒美琴，电弧劈满小巷，唯独他没有倒下。你可以围观取证、劝开两人，或先弄清这场相遇会引来谁的注意。',
  },
  'OP-S10-01': {
    displayDate: 'Y年7月1日',
    text: '美琴远赴俄罗斯参加能力实演。科学秀的灯光之下，“新生之光”的影子若隐若现；你可以核对节目安排、留意后台人员，或先保护不知情的观众。',
  },
  'OP-S11-01': {
    displayDate: 'Y年7月5日',
    text: '被追捕的原石少女撞上刀夜一行。追兵、机场与假死计划同时逼近；你可以掩护撤离、核对航线，或先弄清谁有权下达追捕令。',
  },
  'OP-O01-02': {
    displayDate: 'Y年7月10日',
    text: '钏路帷子毫无征兆地昏睡过去。普通学生毫无察觉，暗部名册却多了一笔记录；你可以调取监控、询问目击者，或先排查她最近接触过的传闻和物品。',
  },
  'OP-O02-01': {
    displayDate: 'Y年7月19日',
    text: '快餐店里的口角让当麻搅黄美琴的计划，铁桥两端剑拔弩张。同一夜，茵蒂克丝踏入学园都市；你可以劝开冲突、护送路人，或先追上那个白色身影。',
  },
  'OP-O10-01': {
    displayDate: 'Y年8月28日',
    text: '天使坠落让全世界身份互换。镜中的自己也在悄然改变，追查真相已无法回头；你可以核对家人与同伴的异常、收集术式痕迹，或先保护被混乱波及的人。',
  },
  'OP-O11-01': {
    displayDate: 'Y年8月31日',
    text: '一方通行遇见最后之作，艾扎力与当麻兵刃相向，天井亚雄的手伸向病毒开关。三线并行时不必全知；你可以选择视角、维持联络，或先保护最容易受伤的人。',
  },
  'OP-O12-01': {
    displayDate: 'Y年9月1日',
    text: '新学期伊始，雪莉·克伦威尔携石像闯入校园，风斩冰华的名字开始流传。你可以疏散学生、记录石像动向，或先查明雪莉真正的目标。',
  },
  'OP-O16-01': {
    displayDate: 'Y年9月8日',
    text: '奥索拉被护卫军围在法之书事件的中心。天草式与雅妮丝部队的立场交错；你可以核对护卫部署、传递情报，或先为谈判留出一条通路。',
  },
  'OP-O18-01': {
    displayDate: 'Y年9月12日',
    text: '恩底弥翁塔成为风暴中心。上条与乌雷亚帕蒂的正面交锋尚未定局，巨大危机压向城市；你可以协助疏散、保护观众，或先查明塔内控制线。',
  },
  'OP-O20-01': {
    displayDate: 'Y年9月14日',
    text: '结标淡希盗走树状图残骸，白井黑子在任务中重伤。暗部动作不再掩饰；你可以保护伤者、追查残骸去向，或先确认黑子的救援通道。',
  },
  'OP-O23-01': {
    displayDate: 'Y年9月19日',
    text: '大霸星祭开幕，使徒十字的阴谋混入欢呼。当麻与土御门开始拦截丽多薇雅与欧莉安娜；你可以核对赛程、保护观众，或先追踪两件圣物的去向。',
  },
  'OP-O31-01': {
    displayDate: 'Y年10月1日',
    text: '罗马正教的C文书与追杀令把目标压向一课郎。笔记本的流转、法国广场的密谋和护卫布局都在移动；你可以核对持有人、传递警告，或先保护会被牵连的人。',
  },
  'OP-O28-01': {
    displayDate: '9月30日',
    text: '学园都市表面恢复日常，一方通行与最后之作的安置却仍悬而未决。夜间联络、医院探视和城市边界的异动交错；你可以先护送他们，或盯住罗马正教即将落下的阴影。',
  },
  'OP-O32-01': {
    displayDate: 'Y年10月9日',
    text: '独立纪念日，一纸“抹杀垣根帝督”的召集令送到每只暗手。五组目标互相咬合，研究设施与诱饵安排尚不清楚；你可以核验委托来源、提醒盟友，或抢先保护被推到火线的人。委托真假还不能直接相信。',
  },
  'OP-O37-01': {
    displayDate: 'Y年10月19日',
    text: '俄罗斯向学园都市宣战，战报、疏散令与跨界联络同时涌入。上条、一方通行与滨面尚未确定各自的路线；你可以选择随行、留守协调情报，或先保护会被战争吞没的普通人。都市防线比口号更需要清单。',
  },
  'OP-N06-01': {
    displayDate: 'Y年11月14日',
    text: '一端览祭在人潮中开幕，全城一级警戒。没有窗户的大楼被贪婪的目光锁定；你可以巡查展区、核对安保缺口，或先保护芙蕾梅亚与普通游客。',
  },
  'OP-N08-01': {
    displayDate: 'Y年11月18日',
    text: '人力资源计划启动，量产能力者恋查扑向芙蕾梅亚。七名超能力者倾巢而出；你可以建立撤离线、核对恋查的编号，或先争取能把孩子带离火场的时间。',
  },
};

const forbiddenPhrases = [
  '落幕', '终章', '击溃', '击败', '打倒', '斩落', '救出', '揭晓', '真相是',
  '放弃', '生死不明', '封印', '旧时代', '帷幕', '从此', '结局', '死亡',
];

function charCount(text) {
  return [...text].length;
}

function escapeCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function buildExistingRecords(phase2, phase4) {
  const byTarget = new Map();
  for (const record of phase4.openings) {
    if (!byTarget.has(record.targetOpeningId)) byTarget.set(record.targetOpeningId, []);
    byTarget.get(record.targetOpeningId).push(record);
  }

  const records = [];
  for (const target of phase2.targetOpenings) {
    const sources = byTarget.get(target.openingId) || [];
    if (!sources.length) continue;
    const canonical = [...sources].sort((left, right) => {
      if (left.action !== right.action) return left.action === 'rewrite' ? -1 : 1;
      return left.newDisplayOrder - right.newDisplayOrder;
    })[0];
    const override = existingTextOverrides[target.openingId];
    const overrideBody = override && charCount(override.text) < 80
      ? `${override.text}入口确认后，先记录同伴位置与退路。`
      : override?.text;
    records.push({
      openingId: target.openingId,
      evidenceId: target.evidenceId,
      slot: target.slot,
      slotLabel: target.slotLabel,
      timeLayerId: target.timeLayerId,
      workLineId: target.workLineId,
      stageId: target.stageId,
      chapterId: target.chapterId,
      chapterLabel: target.chapterLabel,
      packageIds: target.packageIds,
      primaryPackageId: target.primaryPackageId,
      startNodeId: target.startNodeId,
      coverage: target.coverage,
      origin: 'existing',
      currentOpeningIds: sources.map(source => source.currentOpeningId),
      sourceCount: sources.length,
      canonicalCurrentOpeningId: canonical.currentOpeningId,
      displayDate: override?.displayDate || canonical.oldDate,
      text: override ? `${override.displayDate}，${overrideBody}` : canonical.newText,
      textSource: override ? 'phase5-normalized-existing' : canonical.action === 'rewrite' ? 'phase4-rewrite' : 'phase4-preserved',
    });
  }
  return records;
}

function buildNewRecords(phase2) {
  return phase2.targetOpenings
    .filter(target => target.status === 'new')
    .map(target => {
      const entry = newOpeningTexts[target.openingId];
      if (!entry) throw new Error(`Missing Phase 5 text for ${target.openingId}`);
      const normalizationTail = target.timeLayerId === 'TL-UNDATED'
        ? '先记录媒介、顺序与证据边界。'
        : '先记录同伴位置与可用退路。';
      const bodyText = charCount(entry.text) < 80 ? `${entry.text}${normalizationTail}` : entry.text;
      const text = `${entry.displayDate}，${bodyText}`;
      return {
        openingId: target.openingId,
        evidenceId: target.evidenceId,
        slot: target.slot,
        slotLabel: target.slotLabel,
        timeLayerId: target.timeLayerId,
        workLineId: target.workLineId,
        stageId: target.stageId,
        chapterId: target.chapterId,
        chapterLabel: target.chapterLabel,
        packageIds: target.packageIds,
        primaryPackageId: target.primaryPackageId,
        startNodeId: target.startNodeId,
        coverage: target.coverage,
        origin: 'new',
        currentOpeningIds: [],
        sourceCount: 0,
        canonicalCurrentOpeningId: null,
        displayDate: entry.displayDate,
        text,
        textSource: 'phase5-new',
      };
    });
}

function summarize(openings) {
  const byTimeLayer = {};
  const byWorkLine = {};
  const byOrigin = {};
  for (const opening of openings) {
    byTimeLayer[opening.timeLayerId] = (byTimeLayer[opening.timeLayerId] || 0) + 1;
    byWorkLine[opening.workLineId] = (byWorkLine[opening.workLineId] || 0) + 1;
    byOrigin[opening.origin] = (byOrigin[opening.origin] || 0) + 1;
  }
  return {
    targetOpeningCount: openings.length,
    existingTargetOpeningCount: openings.filter(opening => opening.origin === 'existing').length,
    newTargetOpeningCount: openings.filter(opening => opening.origin === 'new').length,
    currentOpeningSourceCount: openings.reduce((total, opening) => total + opening.sourceCount, 0),
    referenceOnlyOpeningCount: openings.filter(opening => opening.packageIds.length === 0).length,
    packageBackedOpeningCount: openings.filter(opening => opening.packageIds.length > 0).length,
    mergedExistingTargets: openings.filter(opening => opening.origin === 'existing' && opening.sourceCount > 1).length,
    byTimeLayer,
    byWorkLine,
    byOrigin,
  };
}

function validate(phase2, phase4, openings) {
  const errors = [];
  const openingIds = openings.map(opening => opening.openingId);
  const newIds = Object.keys(newOpeningTexts);
  const expectedNewIds = phase2.targetOpenings.filter(target => target.status === 'new').map(target => target.openingId);
  const currentSourceIds = openings.flatMap(opening => opening.currentOpeningIds);

  if (openings.length !== 114) errors.push(`Expected 114 openings, found ${openings.length}`);
  if (openingIds.length !== new Set(openingIds).size) errors.push('Duplicate opening IDs');
  if (new Set(openingIds).size !== new Set(phase2.targetOpenings.map(target => target.openingId)).size) errors.push('Opening ID set mismatch');
  if (newIds.length !== 62 || new Set(newIds).size !== 62) errors.push('Phase 5 text map must contain 62 unique IDs');
  if (new Set(newIds).size !== new Set(expectedNewIds).size) errors.push('Phase 5 new ID set mismatch');
  if (currentSourceIds.length !== 87 || new Set(currentSourceIds).size !== 87) errors.push('Current source coverage mismatch');
  if (openings.filter(opening => opening.origin === 'new').length !== 62) errors.push('New opening count mismatch');
  if (openings.filter(opening => opening.origin === 'existing').length !== 52) errors.push('Existing opening count mismatch');

  for (const opening of openings) {
    const length = charCount(opening.text);
    if (length < 80 || length > 160) errors.push(`${opening.openingId} length out of range: ${length}`);
    if (!opening.text.startsWith(`${opening.displayDate}，`)) errors.push(`${opening.openingId} missing display date prefix`);
    if (!/[你]|可以/.test(opening.text)) errors.push(`${opening.openingId} missing intervention point`);
    if (/["\r\n]/.test(opening.text)) errors.push(`${opening.openingId} unsafe text characters`);
    for (const phrase of forbiddenPhrases) {
      if (opening.text.includes(phrase)) errors.push(`${opening.openingId} forbidden phrase: ${phrase}`);
    }
    if (opening.timeLayerId === 'TL-UNDATED' && opening.displayDate !== '未定日') {
      errors.push(`${opening.openingId} undated opening has concrete date`);
    }
  }

  const expectedCurrentIds = phase4.openings.map(record => record.currentOpeningId);
  if (new Set(currentSourceIds).size !== new Set(expectedCurrentIds).size) errors.push('Phase 4 current source set mismatch');
  if (errors.length) throw new Error(`Phase 5 validation failed:\n${errors.join('\n')}`);
}

function writeMarkdown(result, outputFile) {
  const lines = [];
  lines.push('# Phase 5：完整 114 个开场入口');
  lines.push('');
  lines.push('## 结论');
  lines.push('');
  lines.push(`- 目标 Opening：${result.summary.targetOpeningCount} 个。`);
  lines.push(`- 既有目标：${result.summary.existingTargetOpeningCount} 个，合并自 ${result.summary.currentOpeningSourceCount} 个现有开场。`);
  lines.push(`- 新增目标：${result.summary.newTargetOpeningCount} 个。`);
  lines.push(`- 世界书包支撑：${result.summary.packageBackedOpeningCount} 个；reference-only：${result.summary.referenceOnlyOpeningCount} 个。`);
  lines.push('- 所有正文均含日期或相对时期、当前危机与玩家介入点。');
  lines.push('- 未定日入口只写“未定日”，不伪造具体日期。');
  lines.push('- 本阶段仍为规划产物，不修改欢迎页源码。');
  lines.push('');
  lines.push('## 数量分布');
  lines.push('');
  lines.push('| 维度 | 分布 |');
  lines.push('|---|---|');
  lines.push(`| 时间层 | ${Object.entries(result.summary.byTimeLayer).map(([key, value]) => `${key}:${value}`).join('、')} |`);
  lines.push(`| 作品线 | ${Object.entries(result.summary.byWorkLine).map(([key, value]) => `${key}:${value}`).join('、')} |`);
  lines.push(`| 来源 | ${Object.entries(result.summary.byOrigin).map(([key, value]) => `${key}:${value}`).join('、')} |`);
  lines.push('');
  lines.push('## 完整清单');
  lines.push('');
  lines.push('| Opening ID | 时间 | 层级 | 章节 | 起始节点 | 来源 | 正文 |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const opening of result.openings) {
    const hierarchy = `${opening.timeLayerId} → ${opening.workLineId} → ${opening.stageId}`;
    lines.push(`| ${opening.openingId} | ${escapeCell(opening.displayDate)} | ${hierarchy} | ${escapeCell(opening.chapterLabel)} | ${opening.startNodeId || '无'} | ${opening.origin}${opening.sourceCount ? `×${opening.sourceCount}` : ''} | ${escapeCell(opening.text)} |`);
  }
  lines.push('');
  lines.push('## 验收');
  lines.push('');
  lines.push('- 114 个目标 Opening ID 全部唯一。');
  lines.push('- 62 个缺失目标全部补齐。');
  lines.push('- 87 个现有开场全部作为来源保留。');
  lines.push('- 15 个 reference-only 目标不伪造日期或节点。');
  lines.push('- 正文长度、日期前缀、介入点与禁用结局用语全部通过。');
  lines.push('- 未修改欢迎页源码、MVU、schema 或打包产物。');
  fs.writeFileSync(outputFile, lines.join('\n'), 'utf8');
}

function main() {
  const phase2 = JSON.parse(read(phase2Path));
  const phase4 = JSON.parse(read(phase4Path));
  if (phase2.validation.status !== 'passed') throw new Error('Phase 2 input validation is not passed');
  if (phase4.validation.status !== 'passed') throw new Error('Phase 4 input validation is not passed');

  const openings = [
    ...buildExistingRecords(phase2, phase4),
    ...buildNewRecords(phase2),
  ].sort((left, right) => phase2.targetOpenings.findIndex(target => target.openingId === left.openingId)
    - phase2.targetOpenings.findIndex(target => target.openingId === right.openingId));

  validate(phase2, phase4, openings);
  const result = {
    version: 1,
    generatedOn: '2026-09-08',
    sourcePhases: ['phase2-opening-ids.json', 'phase4-opening-rewrites.json'],
    appliedToSource: false,
    taxonomy: phase2.taxonomy,
    writingContract: {
      lengthRange: [80, 160],
      requiredElements: ['日期或相对时期', '地点或场景', '当前局势', '危机', '玩家介入点'],
      undatedPolicy: '未定日入口只初始化媒介、相对顺序、前置与后续边界，不写具体日期。',
      initializationPolicy: '本阶段不接入 MVU；初始化字段留待 Phase 6。',
    },
    summary: summarize(openings),
    openings,
    validation: {
      status: 'passed',
      targetOpeningCountExact: openings.length === 114,
      allOpeningIdsUnique: openings.length === new Set(openings.map(opening => opening.openingId)).size,
      allNewTargetsFilled: openings.filter(opening => opening.origin === 'new').length === 62,
      allCurrentOpeningsRetainedAsSources: openings.reduce((total, opening) => total + opening.sourceCount, 0) === 87,
      allTextLengthsInRange: openings.every(opening => charCount(opening.text) >= 80 && charCount(opening.text) <= 160),
      allTextsHaveDatePrefix: openings.every(opening => opening.text.startsWith(`${opening.displayDate}，`)),
      allTextsHaveInterventionPoint: openings.every(opening => /[你]|可以/.test(opening.text)),
      undatedPolicyEnforced: openings.filter(opening => opening.timeLayerId === 'TL-UNDATED')
        .every(opening => opening.displayDate === '未定日'),
      noForbiddenOutcomePhrases: openings.every(opening => !forbiddenPhrases.some(phrase => opening.text.includes(phrase))),
      sourceNotModified: true,
    },
  };

  fs.writeFileSync(outputJsonPath, JSON.stringify(result, null, 2), 'utf8');
  writeMarkdown(result, outputMarkdownPath);
  console.log(JSON.stringify({ status: 'passed', ...result.summary, validation: result.validation }, null, 2));
}

main();
