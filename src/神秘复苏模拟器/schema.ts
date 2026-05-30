const PercentSchema = z.coerce.number().transform(value => _.clamp(Math.round(Number.isFinite(value) ? value : 0), 0, 100));
const NonNegativeNumberSchema = z.coerce.number().transform(value => Math.max(0, Math.round(Number.isFinite(value) ? value : 0)));

const EventSchema = z.object({
  事件代号: z.string().default('未立案灵异事件'),
  危害等级: z.string().default('未知'),
  发生地点: z.string().default('未知'),
  鬼域状态: z.string().default('未确认'),
  已知杀人规律: z.array(z.string()).default([]),
  猜测杀人规律: z.array(z.string()).default([]),
  错误推断: z.array(z.string()).default([]),
  已死亡人数: NonNegativeNumberSchema.default(0),
  扩散趋势: z.string().default('未观察'),
  处理状态: z.string().default('未接触'),
});

const ReasoningRecordSchema = z.object({
  时间点: z.string().default('未知'),
  行为: z.string().default(''),
  观察结果: z.string().default(''),
  推断: z.string().default(''),
  是否触发规律: z.boolean().default(false),
  风险等级: z.string().default('未知'),
});

const ActionJudgementSchema = z.object({
  类型: z.string().default('未判定'),
  行动: z.string().default(''),
  依据: z.array(z.string()).default([]),
  结果: z.string().default('未结算'),
  代价: z.string().default('无'),
  死亡风险变化: z.string().default('无变化'),
  复苏风险变化: z.string().default('无变化'),
  可见结论: z.string().default(''),
});

const ActionSuggestionSchema = z.object({
  选项: z.string().default(''),
  思路: z.string().default(''),
  主要风险: z.string().default('未知'),
  预期收益: z.string().default('未知'),
});

const ControlledGhostSchema = z.object({
  代号: z.string().default('未命名厉鬼'),
  恐怖等级: z.string().default('未知'),
  拼图特征: z.string().default('未确认'),
  杀人规律: z.string().default('无'),
  使用能力: z.string().default('未确认'),
  使用代价: z.string().default('无'),
  复苏进度: PercentSchema.default(0),
  是否死机: z.boolean().default(false),
  压制关系: z.string().default('未形成压制'),
});

const ArchivedGhostSchema = z.object({
  档案厉鬼名称: z.string().default('未命名档案厉鬼'),
  收录状态: z.string().default('未收录'),
  厉鬼信息: z.string().default('未确认'),
  已知规律: z.string().default('未确认'),
  猜测规律: z.string().default('未确认'),
  鬼域: z.string().default('未确认'),
  收录进度: PercentSchema.default(0),
  档案完整度: z.string().default('0%'),
  可调用范围: z.string().default('未确认'),
});

const CollectedRuleSchema = z.object({
  来源厉鬼: z.string().default('未确认'),
  获取方式: z.string().default('未确认'),
  规律类型: z.string().default('未分类'),
  规律内容: z.string().default('未确认'),
  规律进阶: z.string().default('未形成'),
  规律分解: z.string().default('未分解'),
  完整度: z.string().default('未知'),
  风险备注: z.string().default('无'),
});

const SupernaturalItemSchema = z.object({
  名称: z.string().default(''),
  类型: z.string().default('其他'),
  剩余次数: z.union([z.number(), z.string()]).default('未知'),
  效果: z.string().default(''),
  副作用: z.string().default('无'),
});

const MainlineProgressSchema = z.object({
  当前阶段: z.string().default('开局接入'),
  阶段序号: NonNegativeNumberSchema.default(0),
  权限层级: z.string().default('玩家可见层'),
  已开放主题: z.array(z.string()).default([]),
  锁定主题: z.array(z.string()).default([]),
  阶段状态: z.string().default('未启动'),
  已完成节点: z.array(z.string()).default([]),
  可触发节点: z.array(z.string()).default([]),
  偏移等级: NonNegativeNumberSchema.default(0),
  正史锚点: z.object({
    当前锚点: z.string().default('自定义开局'),
    默认走向: z.string().default('等待玩家开局地点与身份确定'),
    玩家偏移: z.array(z.string()).default([]),
  }).default({
    当前锚点: '自定义开局',
    默认走向: '等待玩家开局地点与身份确定',
    玩家偏移: [],
  }),
  世界压力: z.object({
    灵异复苏强度: PercentSchema.default(0),
    总部关注度: PercentSchema.default(0),
    社会公开度: PercentSchema.default(0),
  }).default({
    灵异复苏强度: 0,
    总部关注度: 0,
    社会公开度: 0,
  }),
  下一步推进提示: z.string().default('等待首个灵异征兆或开局事件立案'),
});

export const Schema = z.object({
  姓名: z.string().default(''),
  性别: z.string().default('男'),
  开局地点: z.string().default(''),
  原著阶段: z.string().default(''),
  剧情锚点: z.string().default(''),
  初始年龄: z.string().default('18岁'),
  角色背景: z.string().default(''),
  身份: z.string().default(''),
  驾驭厉鬼: z.preprocess(
    (val) => {
      if (Array.isArray(val)) return val
      if (typeof val === 'string' && val && val !== '无') return [{ 厉鬼名称: val, 杀人规律: '无' }]
      return []
    },
    z.array(z.object({
      厉鬼名称: z.string().default(''),
      杀人规律: z.string().default('无'),
    })).default([]),
  ),
  特殊能力描述: z.string().default(''),
  消耗代价: z.string().default('无'),
  灵异物品: z.preprocess(
    (val) => Array.isArray(val) ? val : [],
    z.array(z.object({
      名称: z.string().default(''),
      效果: z.string().default(''),
      使用限制: z.string().default('无'),
    })).default([]),
  ),
  状态: z.string().default('健康'),
  风险值: PercentSchema.default(0),
  厉鬼复苏程度: PercentSchema.default(0),
  持有拼图: z.string().default('无'),
  所在位置: z.string().default('未知'),
  剧情阶段: z.enum(['序章', '调查', '接触', '对抗', '终局']).default('序章'),
  is_supernatural_scene: z.boolean().default(false),
  has_entered_supernatural: z.boolean().default(false),
  revive_streak: z.coerce.number().int().transform(value => Math.max(0, Math.round(value))).default(0),
  is_dead: z.boolean().default(false),
  当前灵异事件: EventSchema.default({
    事件代号: '未立案灵异事件',
    危害等级: '未知',
    发生地点: '未知',
    鬼域状态: '未确认',
    已知杀人规律: [],
    猜测杀人规律: [],
    错误推断: [],
    已死亡人数: 0,
    扩散趋势: '未观察',
    处理状态: '未接触',
  }),
  规律推理记录: z.array(ReasoningRecordSchema).default([]),
  最近行动判定: ActionJudgementSchema.default({
    类型: '未判定',
    行动: '',
    依据: [],
    结果: '未结算',
    代价: '无',
    死亡风险变化: '无变化',
    复苏风险变化: '无变化',
    可见结论: '',
  }),
  行动建议: z.array(ActionSuggestionSchema).default([]),
  在场人物: z.array(z.string()).default([]),
  驭鬼者状态: z.object({
    总复苏风险: PercentSchema.default(0),
    已驾驭厉鬼: z.array(ControlledGhostSchema).default([]),
  }).default({
    总复苏风险: 0,
    已驾驭厉鬼: [],
  }),
  收录档案: z.array(ArchivedGhostSchema).default([]),
  收录规律: z.array(CollectedRuleSchema).default([]),
  灵异资源: z.object({
    鬼拼图: z.array(z.string()).default([]),
    灵异物品: z.array(SupernaturalItemSchema).default([]),
    黄金储备: z.string().default('未准备'),
  }).default({
    鬼拼图: [],
    灵异物品: [],
    黄金储备: '未准备',
  }),
  势力关系: z.object({
    总部备案状态: z.string().default('未备案'),
    所属城市: z.string().default('未知'),
    联系人: z.array(z.string()).default([]),
    敌对势力: z.array(z.string()).default([]),
    可调用资源: z.array(z.string()).default([]),
  }).default({
    总部备案状态: '未备案',
    所属城市: '未知',
    联系人: [],
    敌对势力: [],
    可调用资源: [],
  }),
  世界线记录: z.array(z.object({
    时间点: z.string().default('开局前'),
    事件: z.string().default('等待初始化'),
    影响: z.string().default('未产生影响'),
  })).default([]),
  可见档案: z.object({
    玩家已知: z.array(z.string()).default([]),
    NPC已知: z.array(z.object({
      人物: z.string().default('未知'),
      已知信息: z.array(z.string()).default([]),
    })).default([]),
    已验证线索: z.array(z.string()).default([]),
    未验证猜测: z.array(z.string()).default([]),
  }).default({
    玩家已知: [],
    NPC已知: [],
    已验证线索: [],
    未验证猜测: [],
  }),
  主线进度: MainlineProgressSchema.default({
    当前阶段: '开局接入',
    阶段序号: 0,
    权限层级: '玩家可见层',
    已开放主题: [],
    锁定主题: [],
    阶段状态: '未启动',
    已完成节点: [],
    可触发节点: [],
    偏移等级: 0,
    正史锚点: {
      当前锚点: '自定义开局',
      默认走向: '等待玩家开局地点与身份确定',
      玩家偏移: [],
    },
    世界压力: {
      灵异复苏强度: 0,
      总部关注度: 0,
      社会公开度: 0,
    },
    下一步推进提示: '等待首个灵异征兆或开局事件立案',
  }),
  隐藏档案: z.object({
    真实杀人规律: z.string().default('未生成'),
    关键生路: z.string().default('未生成'),
    误导线索: z.array(z.string()).default([]),
    鬼的真实位置: z.string().default('未确认'),
  }).default({
    真实杀人规律: '未生成',
    关键生路: '未生成',
    误导线索: [],
    鬼的真实位置: '未确认',
  }),
});
export type Schema = z.output<typeof Schema>;
