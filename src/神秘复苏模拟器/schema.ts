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
});
export type Schema = z.output<typeof Schema>;
