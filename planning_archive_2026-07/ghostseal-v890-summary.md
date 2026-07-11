# 鬼眼封案 v8.9.0 归档摘要

## 范围

本摘要归档2026-07-10至2026-07-11的“鬼眼封案”Logo与全前端重设计。根目录planning只保留当前状态与可复用结论；精简前完整planning可从Git commit `59d506f`读取。

## 设计目标

- 三段式品牌：鬼眼轨道、神秘复苏字标、八方封尸法阵。
- 语义色：尸青、旧铜、骨白、血红。
- 覆盖正文、消息状态面板、行动建议、欢迎页和档案柜。
- 不改变MVU schema、worldbook拓扑、正则协议、14表数据库和AI输出契约。

## 阶段结果

1. Phase 0：冻结v8.7.4发布YAML/PNG、截图和数据硬基线，新增UI与PNG双chunk门禁。
2. Phase 1：完成消息根节点幂等、cleanup、跨realm和跨卡生命周期。
3. Phase 2：实体品牌进入文档流，历史动画暂停，reduced-motion生效。
4. Phase 3：完成焦纸正文、连续档案面板、Tab/行动/风险无障碍。
5. Phase 4：完成档案柜主题、17入口、Tab/折叠无障碍并保留全部数据库能力。
6. Phase 5：对齐欢迎页、通用输入、掷骰条真实正则入口。
7. Phase 6：全量静态、构建、数据和四视口真页验收；修复同聊重载重复品牌。
8. Phase 7：source、bundle、release、CDN、SillyTavern导入和可逆CRUD全链路完成。

## 发布链路

| 类型 | 标识 |
|---|---|
| 基线 | v8.7.4 release commit `3181948`，项目ref `7e52d45` |
| Source | `d87eec4` |
| Bundle | `7f745d1`，workflow `29150328734` |
| Release | `59d506f`，workflow `29150629082` |
| 角色版本 | `8.9.0` |
| CDN cache | `phase164-4-0-final-baseline-6-28-p5-4-hotfix14-mvu-v890-ghostseal` |

## 数据硬基线

- Worldbook：383 entries / 33 disabled / max enabled 5851。
- Regex：33。
- Tavern Helper scripts：8，顺序不变。
- Database tables：14。
- 发布PNG：`chara/ccv3`内容一致。

## 最终真页

- 角色id=4，版本8.9.0，原聊天5楼，AI/用户=3/2。
- panel/wrapper/brand=3/3/3，用户消息不注入。
- style/theme/archive/dashboard均为1，正式ref/cache生效。
- 四视口任务UI无横向溢出和真实文本截断。
- 同聊重载3次稳定；跨卡清理全0，返回单次重挂。
- reduced-motion、Tab键盘、行动只填不发、风险meter、Font Awesome通过。
- 档案柜14 API、17入口、双插槽、Tab/折叠通过。
- 可逆CRUD测试token删除后残留0。

## 关键修复

- 重复品牌：brand被`wrapNarrativeText()`吸入wrapper后再次创建；改为提升嵌套brand并从叙事收集中排除。
- SQL门禁：移除陈旧`<sp_status>`顺序假设，锁定“摘要→choices→UpdateVariable”契约。
- 移动按钮：width 44px同时补min-width和flex-basis，避免flex压缩。

## 已知非阻断项

- ISSUE-006两条vendor storage 404。
- 两份旧门禁7条lint warning，无error。
- `.tf-ball`固定插件造成移动document假溢出，任务区域为0。

## 回滚

- v8.7.4 YAML SHA256：`B30E6172CAAC887CDACF80139CC67C95E07CCE4F0F6876BA9479F324AAC388FE`。
- v8.7.4 PNG SHA256：`17642BAEA1895E7460F4F4F7A4C6657C9C8746703D404FD16D8C278419EE2FB6`。
- 紧急回退只通过SillyTavern UI导入旧PNG。

## 历史查询

- 精简前`task_plan.md`：`git show 59d506f:task_plan.md`
- 精简前`progress.md`：`git show 59d506f:progress.md`
- 精简前`findings.md`：`git show 59d506f:findings.md`
- 2026-06及更早：`planning_archive_2026-06/`
