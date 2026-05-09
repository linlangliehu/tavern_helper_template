export const Schema = z.object({
  姓名: z.string().default('未知'),
  状态: z.string().default('健康'),
  厉鬼复苏程度: z.number().default(0),
  持有拼图: z.string().default('无'),
  灵异物品: z.string().default('无'),
  所在位置: z.string().default('未知'),
});
export type Schema = z.output<typeof Schema>;