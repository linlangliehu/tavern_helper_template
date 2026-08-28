import { z } from 'zod';
import * as _ from 'lodash-es';

const PercentSchema = z.coerce
  .number()
  .transform(value => _.clamp(Math.round(Number.isFinite(value) ? value : 0), 0, 100));
const NonNegativeNumberSchema = z.coerce
  .number()
  .transform(value => Math.max(0, Math.round(Number.isFinite(value) ? value : 0)));

const AbilitySchema = z.object({
  能力名称: z.string().default('未觉醒'),
  阵营类型: z.enum(['超能力', '术式', '灵装', '无能力']).default('无能力'),
  等级或位阶: z.string().default('Level 0'),
  能力效果: z.string().default(''),
  是否稳定: z.boolean().default(true),
  实战运用: z.string().default(''),
});

const TaskSchema = z.object({
  发布者: z.string().default(''),
  任务名称: z.string().default(''),
  任务类型: z.string().default(''),
  任务描述: z.string().default(''),
  任务目标: z.string().default(''),
  任务奖励: z.string().default(''),
  截止时间: z.string().default(''),
  当前进度: z.string().default(''),
});

const NpcRelationSchema = z.object({
  角色名: z.string().default(''),
  关系类型: z.string().default(''),
  关系状态描述: z.string().default(''),
  姓名: z.string().default(''),
  性别: z.string().default(''),
  年龄: z.string().default(''),
  性格: z.string().default(''),
  外貌: z.string().default(''),
  好感度: PercentSchema.default(0),
  认知: z.string().default('陌生'),
});

const MagicItemSchema = z.object({
  名称: z.string().default(''),
  类型: z.string().default('其他'),
  数量: z.union([z.number(), z.string()]).default('未知'),
  效果: z.string().default(''),
});

const MainlineProgressSchema = z.object({
  当前阶段: z.string().default('开局接入'),
  阶段序号: NonNegativeNumberSchema.default(0),
  阶段状态: z.string().default('未启动'),
  已完成节点: z.array(z.string()).default([]),
  可触发节点: z.array(z.string()).default([]),
  偏移等级: NonNegativeNumberSchema.default(0),
  正史锚点: z
    .object({
      当前锚点: z.string().default('自定义开局'),
      默认走向: z.string().default('等待玩家开局地点与身份确定'),
      玩家偏移: z.array(z.string()).default([]),
    })
    .default({
      当前锚点: '自定义开局',
      默认走向: '等待玩家开局地点与身份确定',
      玩家偏移: [],
    }),
  下一步推进提示: z.string().default('等待玩家确认开局地点、阵营与身份'),
});

export const Schema = z.object({
  姓名: z.string().default(''),
  性别: z.string().default('男'),
  年龄: z.string().default('18岁'),
  性格: z.string().default(''),
  外貌: z.string().default(''),
  开局地点: z.string().default(''),
  原著阶段: z.string().default(''),
  剧情锚点: z.string().default(''),
  角色背景: z.string().default(''),
  身份: z.string().default(''),
  阵营: z.enum(['科学侧', '魔法侧', '']).default(''),
  能力档案: z.preprocess(
    val => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string' && val && val !== '无') return [{ 能力名称: val }];
      return [];
    },
    z.array(AbilitySchema).default([]),
  ),
  状态: z.string().default('健康'),
  身体: z.string().default('良好'),
  情绪: z.string().default('平静'),
  所在位置: z.string().default('未知'),
  剧情阶段: z.enum(['序章', '遭遇', '发展', '高潮', '终局']).default('序章'),
  在场人物: z.array(z.string()).default([]),
  任务追踪: z.array(TaskSchema).default([]),
  NPC关系: z.array(NpcRelationSchema).default([]),
  物品: z
    .object({
      持有物: z.array(MagicItemSchema).default([]),
      资金: z.string().default('未知'),
      其他资源: z.array(z.string()).default([]),
    })
    .default({
      持有物: [],
      资金: '未知',
      其他资源: [],
    }),
  势力关系: z
    .object({
      所属阵营: z.string().default(''),
      所属组织: z.string().default(''),
      联系人: z.array(z.string()).default([]),
      敌对势力: z.array(z.string()).default([]),
      可调用资源: z.array(z.string()).default([]),
    })
    .default({
      所属阵营: '',
      所属组织: '',
      联系人: [],
      敌对势力: [],
      可调用资源: [],
    }),
  世界线记录: z
    .array(
      z.object({
        时间点: z.string().default('开局前'),
        事件: z.string().default('等待初始化'),
        影响: z.string().default('未产生影响'),
      }),
    )
    .default([]),
  主线进度: MainlineProgressSchema.default({
    当前阶段: '开局接入',
    阶段序号: 0,
    阶段状态: '未启动',
    已完成节点: [],
    可触发节点: [],
    偏移等级: 0,
    正史锚点: {
      当前锚点: '自定义开局',
      默认走向: '等待玩家开局地点与身份确定',
      玩家偏移: [],
    },
    下一步推进提示: '等待玩家确认开局地点、阵营与身份',
  }),
});
export type Schema = z.output<typeof Schema>;
