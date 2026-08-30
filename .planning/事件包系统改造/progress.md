# 事件包系统改造 · 进度日志

## 2026-08-30

- 用户实测幻想御手篇剧情偏离过多，确认问题存在。
- 排查根因：篇章无独立事件文件 + 全事件蓝灯常驻 + 无当前节点锚定 + 偏离规则无边界。
- 确认所有 8 个阶段的篇章均需补成独立事件包。
- 创建规划目录 `.planning/事件包系统改造/`。
- 下一步：TavernWeave 指南路由 → 现状盘点 → 事件包契约设计 → 分批实施计划。

## 2026-08-30 · 阶段0+1 实施完成
- 阶段0：拆包依据核定——0930/天使坠落合并为 ANGEL-FALL 单包（总览同窗同日），格雷姆林/魔神维持单包；原著包 15→14，+5 支线包；现有文件处置标记写入 findings.md。
- 阶段1：schema.ts MainlineProgressSchema 新增 当前节点（default 未进入事件包）+ default 对象同步；initvar.yaml/变量列表.txt/变量更新规则.yaml/变量输出格式.yaml 全部同步。
- 变量更新规则：主线推进段重写（三件套定位/幂等数组/篇章软锁定/合法换篇5条件/三类偏离/偏移记事实不记数字/一致性修正）；魔禁铁律+叙事基调清理"强行施法伤身/搞笑受挫代价"旧措辞（NPC互斥保留为lore，玩家完全不设代价）；支线触发补"不覆盖主线锚点"。
- 变量输出格式：First-reply initialization 扩展（开局对齐 主线进度 三件套）+ Mainline locator semantics 规则。
- 发现并修复：①schema.json 自初始提交后从未再生成（dump_schema.ts 因 lodash-es 无法被 node 解析而失败）→ node_modules/lodash-es shim（schema.ts 仅用 _.clamp）后 dump 成功；②webpack tavern_sync 插件会在构建时自动重打包魔禁 PNG（962→972.2K dev产物混入）→ 已 git checkout 还原 PNG+dist，后续构建需 TAVERN_HELPER_DISABLE_TAVERN_SYNC=1；③两次 replace 锚点吞行（变量列表闭合标签/更新规则段头/schema已完成节点）均已当场发现修复。
- 阶段1退出验证：YAML parse 3/3 OK；schema.json 键序与 default 校验通过；TAVERN_HELPER_DISABLE_TAVERN_SYNC=1 下 webpack compiled successfully；dist 保持 clean。
- 待办：阶段2 幻想御手事件包 + Conditional 路由试点（gate：实机验证）。

## 2026-08-30 · 阶段2 Gate 通过 ✅
- 幻想御手事件包 + 绿灯路由 + 变量契约在真实酒馆6轮游玩验证全部通过（详见findings gate表）。
- 用户自行完成正式替换：删旧卡/副本/旧世界书→导正式PNG→38条新书生效→面板UI正常。
- 试点临时产物（-试点改名卡方案）已由正式替换取代。
- 下一步：阶段3-7 批量事件包创作（13个原著包：阶段0剩余3个→学习装置→禁书降临/绝对能力者迁移→天使坠落/大霸星祭/恩底弥翁/使徒十字→三战/格雷姆林/科隆尊→5支线标准化），统一契约中补节点ID完整格式强制条款。
