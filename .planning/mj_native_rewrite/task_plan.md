# 魔法禁书目录模拟器 — 原生重写计划（路径1）

## 目标
彻底重写为「魔禁原生」角色卡，不再是神秘复苏的改色版。删掉所有死代码 + 基于魔禁原著（旧约/新约/超电磁炮）重新设计世界书分类和变量结构。

## 资料真源
- 旧约魔法禁书目录：禁书降临→绝对能力者进化→神之右席→欧提努斯
- 新约：第三次世界大战后→上条消失→魔神欧提努斯→世界整合
- 某科学的超电磁炮：御坂美琴/白井黑子/学园都市日常
- 核心设定：AIM扩散力场/个人现实/Level0-6/偶像崇拜理论/灵装/魔道书/十字教/神之右席

## 阶段

### P1 死代码清理（界面美化 + mvu-protocol-applier）status: complete
- [x] 删除界面美化死代码：enhanceChoicePanels/renderChoices/detectRisk/splitChoiceDetail/SP_PRIMARY_KEY/renderSpLine/enhanceShortTagPanels/enhanceRollBars/computeFairRoll/setSecondGhostSlotVisible/syncSpecialAbilityPreset/ghostPresetSelector/specialAbilityPresetSelector/fillInputPanel/clearInputPanel/handleInputPanelClick/bindWelcomePresetControls/bindWelcomeGhostButtons/handleWelcomeChange（1493→1054行，删439行）
- [x] 删除 mvu-protocol-applier mfrs_roll 清洗规则，注释改为魔禁口径（保留 choices/sp_start/sp_input 协议兜底）
- [x] webpack production 构建通过
保留：getActionText/fillWelcomeStart/enhanceWelcomeAnchors/hideRawProtocolParagraphs/handleWelcomeClick/openDashboardForWelcome(no-op)/欢迎页增强/协议隐藏/正文状态栏美化

### P2 变量结构重设计（基于魔禁原著）
- [ ] schema.ts：基于魔禁设计字段（角色档案/能力档案/物品/任务/NPC关系/势力关系/世界线）
- [ ] initvar.yaml：对齐新 schema
- [ ] 变量列表/变量更新规则/变量输出格式：对齐
- [ ] mvu-protocol-applier seed/normalizer：对齐
status: pending

### P3 世界书重设计（基于魔禁原著结构）
- [ ] 基于魔禁原著重新分类（科学侧能力体系/魔法侧术式体系/十字教势力/学园都市/原著事件链/人物档案）
- [ ] 重写或重组现有 33 文件
- [ ] index.yaml 重新注册
status: pending

### P4 系统提示词/对话示例/首消息重写
- [ ] 系统提示词：魔禁原著风格（热血搞笑+主线支线）
- [ ] 对话示例：魔禁原著场景
- [ ] 首消息：魔禁原生开场
status: pending

### P5 欢迎页/界面美化对齐新变量结构
- [ ] 欢迎页 fillWelcomeStart 对齐新 schema 路径
- [ ] 界面美化精简后对齐
status: pending

### P6 webpack + 打包核验
- [ ] webpack 构建
- [ ] 重新打包
- [ ] 全项目残留扫描
status: pending

## 遇到的错误
| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|

## 决策记录
- 路径1（最彻底）：删死代码+重设计世界书分类和变量结构
- 协议层（UpdateVariable/JSONPatch/sp_start/MFrsStatus）保留：框架共有，非神秘复苏专属，重写会破坏酒馆助手兼容
- MFRS/mfrs 前缀保留：内部技术标识，用户不可见，改名风险高收益低
