const EventSchema = z.object({
  事件代号: z.string().default('未立案灵异事件'),
  危害等级: z.string().default('未知'),
  发生地点: z.string().default('未知'),
  鬼域状态: z.string().default('未确认'),
  已知杀人规律: z.array(z.string()).default([]),
  猜测杀人规律: z.array(z.string()).default([]),
  错误推断: z.array(z.string()).default([]),
  已死亡人数: z.number().default(0),
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

const ControlledGhostSchema = z.object({
  代号: z.string().default('未命名厉鬼'),
  恐怖等级: z.string().default('未知'),
  拼图特征: z.string().default('未确认'),
  杀人规律: z.string().default('无'),
  使用能力: z.string().default('未确认'),
  使用代价: z.string().default('无'),
  复苏进度: z.number().default(0),
  是否死机: z.boolean().default(false),
  压制关系: z.string().default('未形成压制'),
});

const SupernaturalItemSchema = z.object({
  名称: z.string().default(''),
  类型: z.string().default('其他'),
  剩余次数: z.union([z.number(), z.string()]).default('未知'),
  效果: z.string().default(''),
  副作用: z.string().default('无'),
});

export const Schema = z.object({
  姓名: z.string().default(''),
  性别: z.string().default('男'),
  开局地点: z.string().default(''),
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
  厉鬼复苏程度: z.number().default(0),
  持有拼图: z.string().default('无'),
  所在位置: z.string().default('未知'),
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
  驭鬼者状态: z.object({
    总复苏风险: z.number().default(0),
    已驾驭厉鬼: z.array(ControlledGhostSchema).default([]),
  }).default({
    总复苏风险: 0,
    已驾驭厉鬼: [],
  }),
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
