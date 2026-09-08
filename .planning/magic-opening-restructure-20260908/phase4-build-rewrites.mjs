import fs from 'node:fs';

const decoder = new TextDecoder('utf-8', { fatal: true });
const read = file => decoder.decode(fs.readFileSync(file));
const inputPath = '.planning/magic-opening-restructure-20260908/phase3-current-reorder.json';
const outputJsonPath = '.planning/magic-opening-restructure-20260908/phase4-opening-rewrites.json';
const outputMarkdownPath = '.planning/magic-opening-restructure-20260908/phase4-opening-rewrites.md';

const rewrites = {
  'CUR-0020': {
    text: '河堤之约的传闻还未散去，风纪委员网络已经接到奇怪的寻包委托。都市传说、夜间追逐与超市警报在同一日交错，你可以陪同调查、守住现场，也可以先找出把美琴卷进来的那双手。',
    reasons: ['rescue-outcome', 'missing-intervention-point'],
  },
  'CUR-0021': {
    text: '钏路帷子的名字出现在风纪委员疑云里，第七学区的警报逐级上升。第二次虚空爆破的前兆正在街头堆积；你可以抢先排查装置、保护初春和美琴，或盯住人群中不该出现的旁观者。',
    reasons: ['rescue-outcome', 'missing-intervention-point'],
  },
  'CUR-0028': {
    text: '暑假的街头接连出现“不使用能力却引发现象”的灵现象传闻。地震、异常震动与目击证词交错，初春的新室友也在寻找旧友；你可以参与疏散、记录地点，或陪她查清失踪的起点。',
    reasons: ['source-attr-truncation'],
  },
  'CUR-0033': {
    text: '美琴在巷口发现了属于“妹妹们”的痕迹，9982的言行与实验记录让她无法再当作都市传说。此刻调查才刚开始；你可以陪她追查现金卡、联系布束，或先保护可能被清理的证据。',
    reasons: ['death-summary', 'missing-intervention-point'],
  },
  'CUR-0034': {
    text: '废弃工厂一带电流与酸味交错，绝对能力者进化实验的对抗即将进入最后夜晚。美琴、当麻与一方通行的路线仍有可能改变；你要选择介入位置，别让任何人的选择在这里被提前写死。',
    reasons: ['arc-ending-summary'],
  },
  'CUR-0036': {
    text: '公园花坛边，绿发少女菲布莉说自己只剩72小时。她不懂常识，却清楚糖果与身体的关联；你可以先护送她就医、联系初春和佐天，或追查她口中那个必须回去的研究所。倒计时不会等人。',
    reasons: ['source-attr-truncation', 'identity-reveal'],
  },
  'CUR-0037': {
    text: '学究会开幕，两万驱动铠在各会场同时立起，一场名为“革命”的公开实验正在逼近启动点。人群仍在欢呼；你可以核查展台控制线、寻找雅妮，或先为菲布莉争取撤离路线。控制台的位置仍待确认。',
    reasons: ['source-attr-truncation'],
  },
  'CUR-0040': {
    text: '医院走廊里，金发少女艾丝特对病床上的一方通行喊出“师匠”。称呼还未解释，DA的袭击已让病房警报大作；你可以拦下来意不明的兵器、转移病人，或先护住这个不该出现的少女。',
    reasons: ['source-attr-truncation', 'identity-reveal'],
  },
  'CUR-0041': {
    text: '披着警备员外皮的DA在夜间行动，一名御坂妹失联，黑色狼形灵体正追逐亡魂的气味。学园都市的表面秩序开始漏风；你可以追查失联者、保留兵器残骸，或抢先拦下下一场处刑。',
    reasons: ['source-attr-truncation'],
  },
  'CUR-0042': {
    text: '罗森塔尔家四百年的执念在棺中苏醒，善意的背叛把死灵术师推入选择。艾丝特想救人，一方通行被迫卷入；你可以核对术式条件、保护医院，或抢先切断悲剧循环的下一步。术式的代价也必须先弄清。',
    reasons: ['source-attr-truncation', 'arc-ending-summary'],
  },
  'CUR-0047': {
    text: '恩底弥翁塔开通在即，演出、观光与人潮把学园都市推上狂欢顶点。上条和茵蒂克丝只是偶然入场，你却在工作人员与警报之间察觉不协调；可以先查塔内疏散线，或陪她们接近歌声的来源。',
    reasons: ['arc-ending-summary', 'identity-reveal'],
  },
  'CUR-0049': {
    text: '大霸星祭第二日，赛场欢呼未停，常盘台的联络网却出现断点。美琴的位置、食蜂的安排与木原幻生的实验迹象彼此交错；你可以核对比赛日程、守住观众，或先追查美琴异变的起点。',
    reasons: ['rescue-outcome'],
  },
  'CUR-0050': {
    text: '祭典余热未散，一种名为“印第安扑克”的卡牌在学生间流传。据说抽一张卡就能做别人的梦；你可以交换卡牌、观察使用者，或追查黑市货源，先别把梦里的证词当成事实。来源比传闻更重要。',
    reasons: ['source-attr-truncation'],
  },
  'CUR-0051': {
    text: 'S级卡“天赋梦路”在黑市喊出天价，持有者接连在梦中出事。有人用它学技能，有人用它做预演；你可以核对卡牌编号、保护失眠者，或顺黑市报价找到发放源头。失眠者的证词比报价更关键。',
    reasons: ['source-attr-truncation'],
  },
  'CUR-0052': {
    text: '大规模联机做梦的火种已被点燃，梦境与现实的边界开始渗漏。有人把“制造灵魂”当作技术目标，也有人只想借梦行凶；你可以切断联机入口、保护持有者，或潜入梦境核对地点。',
    reasons: ['source-attr-truncation', 'future-reveal'],
  },
  'CUR-0053': {
    text: '梦游症的余波未停，FRAGILE的“联机梦境”与暗部狙击的传闻同时逼近。弗兰达的名字牵出猎虎桥线；你可以先隔离卡牌、核查狙击点，或保护知情人，别让梦与现实互相掩护。',
    reasons: ['source-attr-truncation', 'future-reveal'],
  },
  'CUR-0054': {
    text: '9月30日，学园都市表面恢复日常，一方通行与最后之作的安置却仍悬而未决。夜间联络、医院探视和城市边界的异动交错；你可以先护送他们，或盯住罗马正教即将落下的阴影。',
    reasons: ['ability-outcome', 'origin-reveal'],
  },
  'CUR-0058': {
    text: '英国清教收到后方之水的战书，信中附上的残迹让局势骤然收紧。梵蒂冈的意图、当麻的行程与学园都市的旧账彼此交叠；你可以核对信使、确认威胁范围，或先争取一条可谈判的通路。',
    reasons: ['death-summary'],
  },
  'CUR-0059': {
    text: '第二十二学区被战火切开，后方之水的压迫让电视通牒与DRAGON线索同时升温。你可以维持撤离线、核对GROUP情报，或为仍被困在战区的人争取一条可用的抢救通路。通信干扰也正在扩大。',
    reasons: ['injury-outcome'],
  },
  'CUR-0060': {
    text: '不列颠万圣节前夜，王宫、骑士派与清教的联络同时绷紧。后方之水的动向、禁书目录召集令与都市暗线并不要求同一个人跨国处理；你可以选择护送、译读情报，或先保住伦敦的平民。',
    reasons: ['future-handoff'],
  },
  'CUR-0061': {
    text: '英国午夜政变的风声压过万圣节灯火，凯莉莎与骑士派的调动让王都进入戒严。禁书目录、王女与清教的力量被迫站上同一张地图；你可以核对城内联络，或先护送平民离开封锁区。',
    reasons: ['battle-outcome'],
  },
  'CUR-0062': {
    text: '独立纪念日，一纸“抹杀垣根帝督”的召集令送到每只暗手。五组目标互相咬合，研究设施与诱饵安排尚不清楚；你可以核验委托来源、提醒盟友，或抢先保护被推到火线的人。委托真假还不能直接相信。',
    reasons: ['source-attr-truncation'],
  },
  'CUR-0063': {
    text: '卫星失明，佣兵叩城，“没有窗户的大楼”成了靶心。各组仍在同一日回答“为谁而战”；你可以守住研究所边界、切断误导情报，或为不愿再当棋子的人留出一条可用的退路。误报同样会拖垮防线。',
    reasons: ['source-attr-truncation'],
  },
  'CUR-0064': {
    text: '第二少年院的试用赛刚散去硝烟，四大组织的旧账和真脱狱的后续仍在监狱系统里回响。证词、现场与机密文件都还不稳定；你可以隔离现场、保护证人，或追查把比赛变成圈套的人。',
    reasons: ['arc-ending-summary'],
  },
  'CUR-0066': {
    text: '春暖嬉美挟持初春，扬言要把学园都市的能力开发技术公开给世界。龙翼、警报与狙击线把赛场切成碎块；你可以先争取初春的安全，或用AIM干扰与谈判打开第三条路。赛场里还有来不及撤离的观众。',
    reasons: ['intervention-outcome'],
  },
  'CUR-0067': {
    text: '常盘台的“幽灵骚动”仍在流传，帆风润子身边确实出现了失忆少女。感知条件、媒介与旧研究室传闻互不相同；你可以陪帆风核对目击、记录少女出现的环境，或先查常盘台的封锁记录。',
    reasons: ['ability-outcome', 'origin-reveal'],
  },
  'CUR-0069': {
    text: '第三次世界大战的阴影已经压向学园都市，前线补给、都市防卫与科学侧的立场同时被检讨。你不必立刻奔赴俄罗斯；可以先核查物资线、守住城市，或为即将离开的人留下联络方案。',
    reasons: ['cross-arc-summary'],
  },
  'CUR-0070': {
    text: '俄罗斯向学园都市宣战，战报、疏散令与跨界联络同时涌入。上条、一方通行与滨面尚未确定各自的路线；你可以选择随行、留守协调情报，或先保护会被战争吞没的普通人。都市防线比口号更需要清单。',
    reasons: ['stage-boundary-error'],
  },
  'CUR-0071': {
    text: '战后归来的日常并不安稳，黑夜海鸟与芙蕾梅亚的求助在城市角落重叠。旧的战报还没沉底，新的追兵已在暗处打量孩子；你可以先确认她们的住处和安全线，再决定是否介入。孩子的求助不能只留给暗部处理。',
    reasons: ['previous-arc-ending', 'cross-arc-summary'],
  },
  'CUR-0072': {
    text: '夏威夷的旅游表象下戒备异常，柏德蔚带来的线索把上条、美琴等人引向同一座岛。队伍目的不同、情报也不对等；你可以核对入境身份、分配联络点，或坚持独立调查路线。入境身份会决定能接触哪些现场。',
    reasons: ['return-outcome'],
  },
  'CUR-0073': {
    text: '巴格吉城的大会以“替代超能力”为名开放，赛制、赞助方与安保之间却有缝隙。参赛者、围观者和魔术侧的交易同时入场；你可以报名调查，也可以先为非战斗者标出撤离路线。撤离线比胜负更早需要确认。',
    reasons: ['arc-ending-summary', 'future-consequence'],
  },
  'CUR-0074': {
    text: '一端览祭的灯彩亮起前，索尔带来的“第三种选择”把救援对象藏进雾里。伪装、目标与信任都待核实；你可以要求说明地点和条件，或先追踪芙蕾梅亚的下落，不急着站队。灯彩下的人群还不知道风险。',
    reasons: ['prior-injury-summary'],
  },
  'CUR-0077': {
    text: '食蜂重访与上条有关的旧地，眼前的景观却和记忆对不上。派阀流言、假急救人员与横裂体的传闻同时出现；你可以陪她核对地图与证词，先别让任何人替她定义记忆的真假。证词与地图必须同时核对。',
    reasons: ['other-arc-ending', 'cross-arc-summary'],
  },
  'CUR-0078': {
    text: '食蜂的记忆出现异变，派阀内流言四起，旧地景观与急救安排都开始可疑。蜜蚁爱愉的名字尚未完全浮出水面；你可以先查装置来源、保护证人，或阻止食蜂在不安中做出不可逆选择。',
    reasons: ['future-reveal'],
  },
  'CUR-0079': {
    text: '磁尘与视觉欺骗把常盘台的夜晚切成两层，食蜂与同源能力的对抗一触即发。谁在观察、谁被诱导仍未证实；你可以破坏视点、隔离双方，或争取一次能听见求救声的谈话。谈话窗口随时可能关闭。',
    reasons: ['battle-outcome', 'truth-reveal'],
  },
  'CUR-0080': {
    text: '钻石大楼突然停止通行，不同面孔自称同一个身份，访客与运输线被分割在内外。蓝花悦的学生证、加纳神华的行踪与封锁者目的都要核对；你可以先保住出口和同伴联络。封锁者的目的尚未证实。',
    reasons: ['arc-ending-summary', 'dialogue-reveal'],
  },
  'CUR-0081': {
    text: '天台上的来信不像情书，僧正的邀约把“评分”与“改变”摆在普通人面前。上条尚未答复，校园日常就可能被波及；你可以追问目的、疏散学生，或争取把谈判带离人群。学生疏散不能等到答复之后。',
    reasons: ['battle-outcome', 'future-reveal'],
  },
  'CUR-0082': {
    text: '临时学校里，上条与上里的同班安排让旧对手被迫共处。去鸣脱离拘束的警讯、府兰的提醒与普通同学的安危互相牵动；你可以先划定校园停战线，或核对两方人员的真实位置。校园不该成为第二战场。',
    reasons: ['cross-arc-summary', 'battle-outcome', 'identity-reveal'],
  },
  'CUR-0083': {
    text: '冬天的学园都市突然失去电力，热浪、缺水与通信中断压向临时学校。元素藏在光照与温度的缝隙里，居民仍在寻找避难点；你可以组织水源、测试怪物习性，或守住一条撤离通道。',
    reasons: ['identity-reveal'],
  },
  'CUR-0084': {
    text: '上里阵营的追击把上条逼进无处可退的角落，命令、威胁与救援可能同时压在女孩们身上。你可以掩护撤离、核对唯一的条件，或保护不愿继续追杀的人，先别把她们全部当成敌人。',
    reasons: ['forced-outcome'],
  },
  'CUR-0085': {
    text: '离城路线被截断，府兰、舞夏与土御门都被卷入追踪术式。城墙、影剑与身体联系的线索交错；你可以侦察边界、护送非战斗者，或先确认解除术式的代价，别让任何人被迫牺牲。术式解除不能靠猜测。',
    reasons: ['battle-outcome', 'identity-reveal', 'death-ambiguity'],
  },
  'CUR-0086': {
    text: '赴英不是通行许可，克劳利灾害与英国防线把登陆者分散在海岸与街区之间。同伴去向、修女撤离和伦敦通信点都待确认；你可以选择护送平民，或先建立一条能说明来意的接触渠道。',
    reasons: ['battle-outcome', 'alliance-reveal'],
  },
  'CUR-0087': {
    text: '伦敦的资料点尚未打开，科隆尊的根基、清教的误解与骑士派的防线仍在互相冲撞。队伍分散、通信不稳；你可以核对同伴位置、护送受困者，或争取一次足以说明目的的谈判。通信中断比敌意更危险。',
    reasons: ['arc-ending-summary', 'stage-boundary-error'],
  },
};

const sourceAttrTruncationIds = [
  'CUR-0028', 'CUR-0036', 'CUR-0037', 'CUR-0040', 'CUR-0041', 'CUR-0042',
  'CUR-0050', 'CUR-0051', 'CUR-0052', 'CUR-0053', 'CUR-0062', 'CUR-0063',
];

const forbiddenPhrases = [
  '落幕', '终章', '击溃', '击败', '打倒', '斩落', '救出', '揭晓', '真相是',
  '放弃', '生死不明', '封印', '旧时代', '帷幕', '从此', '结局', '死亡',
];

const semanticAnchorChecks = {
  'CUR-0054': { targetOpeningId: 'OP-O28-01', requiredText: '9月30日' },
  'CUR-0067': { targetOpeningId: 'OP-O27-01', requiredText: '常盘台' },
};

function charCount(text) {
  return [...text].length;
}

function escapeCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function buildRecords(phase3) {
  return phase3.currentOpenings.map(record => {
    const rewrite = rewrites[record.currentOpeningId];
    if (!rewrite) {
      return {
        ...record,
        action: 'preserve',
        riskLevel: 'low',
        reasons: ['current-crisis-without-late-reveal'],
        newText: record.oldDescription,
        newCharCount: charCount(record.oldDescription),
      };
    }

    const reasons = [...new Set(rewrite.reasons)];
    if (sourceAttrTruncationIds.includes(record.currentOpeningId)
      && !reasons.includes('source-attr-truncation')) {
      reasons.push('source-attr-truncation');
    }

    const textWithTime = `${record.oldDate}，${rewrite.text}`;
    return {
      ...record,
      action: 'rewrite',
      riskLevel: 'high',
      reasons,
      newDateLabel: record.oldDate,
      newText: textWithTime,
      newCharCount: charCount(textWithTime),
    };
  });
}

function summarize(records) {
  const reasonCounts = new Map();
  for (const record of records) {
    for (const reason of record.reasons) {
      reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
    }
  }
  return {
    currentOpeningCount: records.length,
    preservedCount: records.filter(record => record.action === 'preserve').length,
    rewrittenCount: records.filter(record => record.action === 'rewrite').length,
    sourceAttrRepairCount: records.filter(record => record.reasons.includes('source-attr-truncation')).length,
    spoilerRewriteCount: records.filter(record => record.action === 'rewrite'
      && record.reasons.some(reason => reason !== 'source-attr-truncation')).length,
    reasonCounts: Object.fromEntries([...reasonCounts.entries()].sort((left, right) => right[1] - left[1])),
  };
}

function validate(phase3, records) {
  const errors = [];
  const currentIds = records.map(record => record.currentOpeningId);
  const expectedIds = phase3.currentOpenings.map(record => record.currentOpeningId);
  const rewriteIds = records.filter(record => record.action === 'rewrite').map(record => record.currentOpeningId);

  if (records.length !== 87) errors.push(`Expected 87 records, found ${records.length}`);
  if (currentIds.length !== new Set(currentIds).size) errors.push('Duplicate current IDs');
  if (new Set(currentIds).size !== new Set(expectedIds).size) errors.push('Current ID set mismatch');
  if (rewriteIds.length !== 43) errors.push(`Expected 43 rewrites, found ${rewriteIds.length}`);
  if (new Set(rewriteIds).size !== rewriteIds.length) errors.push('Duplicate rewrite IDs');
  if (new Set(sourceAttrTruncationIds).size !== 12) errors.push('Expected 12 source attribute repair IDs');

  for (const record of records) {
    const semanticAnchor = semanticAnchorChecks[record.currentOpeningId];
    if (semanticAnchor && record.targetOpeningId !== semanticAnchor.targetOpeningId) {
      errors.push(`${record.currentOpeningId} semantic target mismatch`);
    }
    if (semanticAnchor && record.action === 'rewrite' && !record.newText.includes(semanticAnchor.requiredText)) {
      errors.push(`${record.currentOpeningId} semantic text mismatch`);
    }
    if (record.currentOpeningId === 'CUR-0056' && record.action === 'rewrite') {
      errors.push('CUR-0056 should remain preserved in Phase 4');
    }
    if (record.action === 'rewrite') {
      if (!record.newText.startsWith(`${record.oldDate}，`)) {
        errors.push(`${record.currentOpeningId} missing time prefix`);
      }
      if (record.newCharCount < 80 || record.newCharCount > 160) {
        errors.push(`${record.currentOpeningId} length out of range: ${record.newCharCount}`);
      }
      if (record.newText === record.oldDescription) errors.push(`${record.currentOpeningId} rewrite unchanged`);
      if (!/[你]|可以/.test(record.newText)) errors.push(`${record.currentOpeningId} missing intervention point`);
      if (/["]/.test(record.newText)) errors.push(`${record.currentOpeningId} contains unsafe ASCII quote`);
      if (/[\r\n]/.test(record.newText)) errors.push(`${record.currentOpeningId} contains newline`);
      for (const phrase of forbiddenPhrases) {
        if (record.newText.includes(phrase)) errors.push(`${record.currentOpeningId} forbidden phrase: ${phrase}`);
      }
    } else if (record.newText !== record.oldDescription) {
      errors.push(`${record.currentOpeningId} preserved text changed`);
    }
  }

  if (errors.length) throw new Error(`Phase 4 validation failed:\n${errors.join('\n')}`);
}

function writeMarkdown(result, outputFile) {
  const lines = [];
  lines.push('# Phase 4：剧透式开场改写');
  lines.push('');
  lines.push('## 结论');
  lines.push('');
  lines.push(`- 现有开场：${result.summary.currentOpeningCount} 条。`);
  lines.push(`- 保留：${result.summary.preservedCount} 条。`);
  lines.push(`- 改写：${result.summary.rewrittenCount} 条，其中 ${result.summary.spoilerRewriteCount} 条为剧透/边界修复，${result.summary.sourceAttrRepairCount} 条同时修复属性引号截断。`);
  lines.push('- 正文规范：80–160 字，仅保留时间、地点、当前局势、危机和玩家介入点。');
  lines.push('- 不写整卷胜负、死亡结果、和解、身份揭露、后续阵营变化或下一阶段开场。');
  lines.push('- 本阶段输出规划稿，不修改欢迎页源码和 MVU 初始化链。');
  lines.push('');
  lines.push('## 改写原因统计');
  lines.push('');
  lines.push('| 原因 | 数量 |');
  lines.push('|---|---:|');
  for (const [reason, count] of Object.entries(result.summary.reasonCounts)) {
    lines.push(`| ${escapeCell(reason)} | ${count} |`);
  }
  lines.push('');
  lines.push(`## ${result.summary.rewrittenCount} 条改写稿`);
  lines.push('');
  lines.push('| Current ID | 目标 Opening | 原文 | 改写稿 | 原因 |');
  lines.push('|---|---|---|---|---|');
  for (const record of result.openings.filter(row => row.action === 'rewrite')) {
    lines.push(`| ${record.currentOpeningId} | ${record.targetOpeningId} | ${escapeCell(record.oldDescription)} | ${escapeCell(record.newText)} | ${escapeCell(record.reasons.join('、'))} |`);
  }
  lines.push('');
  lines.push(`## ${result.summary.preservedCount} 条暂保留`);
  lines.push('');
  lines.push('| Current ID | 目标 Opening | 分组 | 原因 |');
  lines.push('|---|---|---|---|');
  for (const record of result.openings.filter(row => row.action === 'preserve')) {
    lines.push(`| ${record.currentOpeningId} | ${record.targetOpeningId} | ${escapeCell(record.newGroupLabel)} | ${escapeCell(record.reasons.join('、'))} |`);
  }
  lines.push('');
  lines.push('## 验收');
  lines.push('');
  lines.push('- 87 条现有开场全部保留记录。');
  lines.push('- 43 条改写稿字数为 80–160 字。');
  lines.push('- 所有改写稿都包含玩家介入点。');
  lines.push('- 改写稿不包含结局、胜负、身份揭露、和解或阶段收束用语。');
  lines.push('- 44 条低风险正文原样保留。');
  lines.push('- 未修改欢迎页源码、MVU、schema 或打包产物。');
  fs.writeFileSync(outputFile, lines.join('\n'), 'utf8');
}

function main() {
  const phase3 = JSON.parse(read(inputPath));
  if (phase3.validation.status !== 'passed') throw new Error('Phase 3 input validation is not passed');
  const records = buildRecords(phase3);
  validate(phase3, records);

  const result = {
    version: 1,
    generatedOn: '2026-09-08',
    sourcePhase: 'phase3-current-reorder.json',
    appliedToSource: false,
    writingContract: {
      lengthRange: [80, 160],
      requiredElements: ['时间', '地点', '当前人物局势', '正在或即将发生的危机', '玩家介入点'],
      forbiddenElements: ['整卷结局', '未发生死亡', '未达成和解', '后期身份揭露', '最终胜负', '跨年错误', '伪造精确日期'],
      initializationPolicy: '本阶段只改可见开场正文；初始化链与 MVU 状态留待 Phase 6 接入。',
    },
    guideReceipt: {
      primarySkill: 'tavern-card-builder',
      libraryRoute: 'tavern-card-builder',
      snapshotVersion: '2026-08-18',
      loadedDocuments: ['ST-A0', 'ST-C10', 'opening-strategies.md'],
      candidateIds: [],
      unresolved: ['真实 SillyTavern 导入后需验证每个开场选择与状态初始化。'],
    },
    summary: summarize(records),
    openings: records,
    validation: {
      status: 'passed',
      allCurrentOpeningsCovered: records.length === 87,
      rewriteCountExact: records.filter(record => record.action === 'rewrite').length === 43,
      preserveCountExact: records.filter(record => record.action === 'preserve').length === 44,
      allRewriteLengthsInRange: records.filter(record => record.action === 'rewrite')
        .every(record => record.newCharCount >= 80 && record.newCharCount <= 160),
      allRewritesHaveInterventionPoint: records.filter(record => record.action === 'rewrite')
        .every(record => /[你]|可以/.test(record.newText)),
      allRewritesHaveTimePrefix: records.filter(record => record.action === 'rewrite')
        .every(record => record.newText.startsWith(`${record.oldDate}，`)),
      noForbiddenOutcomePhrases: records.filter(record => record.action === 'rewrite')
        .every(record => !forbiddenPhrases.some(phrase => record.newText.includes(phrase))),
      allPreservedTextUnchanged: records.filter(record => record.action === 'preserve')
        .every(record => record.newText === record.oldDescription),
      sourceNotModified: true,
    },
  };

  fs.writeFileSync(outputJsonPath, JSON.stringify(result, null, 2), 'utf8');
  writeMarkdown(result, outputMarkdownPath);
  console.log(JSON.stringify({ status: 'passed', ...result.summary, validation: result.validation }, null, 2));
}

main();
