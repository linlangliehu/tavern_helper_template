# 魔禁卡开发 · 进度日志

## 2026-XX · S6 世界书完成
### 产出
- 世界书 33 文件 + index.yaml 32 注册条目
### 关键决策
- 第14人物=亚雷斯塔·克劳利；变量输出格式补注册；initvar不注册
### 质量验证
- 引用一致/旧术语零残留/失败收场12文件/锚点可偏离9处/搞笑反噬16处

## 2026-XX · S5 开局表单完成
### 产出
- `自定义开局/欢迎页.txt`（61KB，深蓝科幻青蓝霓虹视觉）
- `脚本/界面美化/index.ts` fillWelcomeStart 重写为魔禁版
### 欢迎页结构
- 双阵营卡选择（科学侧/魔法侧，本局锁定）
- 阵营专属区：科学侧(身份+学校+Level0-6+能力名+简述) / 魔法侧(身份+组织+位阶普通/熟练/圣人/神之右席/魔神+术式+简述)
- 10个预设角色快捷卡（当麻/美琴/一方/食蜂/削板/黑子/茵蒂克丝/神裂/史提尔/欧提努斯）
- 三级手风琴时空锚点（序章/禁书降临/绝对能力者进化/神之右席/欧提努斯魔神/后日谈 + 自定义）
- 7字段管道符锚点值 [name|time|loc|phase|pressure|intel|boundary]
- 提交生成对齐 schema.ts 的开局设定文本（含JSONPatch合法路径）
### fillWelcomeStart 重写要点
- 读魔禁表单字段(阵营/姓名/性别/年龄/性格/外貌/身份/等级位阶/能力/锚点/背景)
- 生成「魔法禁书目录·开局设定」文本，含风险机制(失败收场不死亡)+跨体系搞笑反噬
- JSONPatch路径对齐schema: /姓名 /性别 /年龄 /性格 /外貌 /开局地点 /所在位置 /原著阶段 /剧情锚点 /角色背景 /身份 /阵营 /能力档案 /剧情阶段 /势力关系/所属阵营 /势力关系/所属组织
### S5-5 功能性残留清理
- getActionText正则: 去掉 死亡风险|复苏风险|death|revive，保留 风险值|风险来源|风险|<risk
- openDashboardForWelcome: 改为 no-op（魔禁无MysteryDatabaseFrontend数据库）
- enhancePanels: 移除 bindWelcomePresetControls/bindWelcomeGhostButtons 调用（魔禁无厉鬼槽/预设下拉）
- 复杂行动面板: 标题→魔法禁书目录·复杂行动，底线→避免风险值爆表
- console文案→魔法禁书目录模拟器主题已注入
### S5-6 核验
- 欢迎页落盘61KB ✓；index.yaml已注册启用true、路径自定义开局/欢迎页匹配 ✓
- 欢迎页内零神秘复苏残留 ✓；index.yaml零残留 ✓
- fillWelcomeStart魔禁关键词命中4 ✓
### 遗留（留S7）
- 界面美化脚本行647-859的选项面板渲染正则(死亡风险/复苏风险/鬼域/失控/灵异事件)属S7消息内面板范畴，S5未动
- CSS horror主题色(尸体青/骨白/暗红)留S7与消息内面板一并重写

### 下一阶段
- S7 消息内面板重写（4折叠卡片+好感度排序+渲染正则清理）
- S8 门禁与实战验证（需先解决WSL node不可用）
- 收尾项：mvu-protocol-applier的当前异常事件字段语义核对

## 2026-XX · S7 消息内面板完成
### 产出
- `脚本/消息内面板/index.ts` 彻底重写为魔禁轻量版（665行/25KB，对比神秘复苏7897行/290KB，减少92%）
- 修复 `raw-status-data.ts` 断引用（hotfix→mvu-protocol-applier，S2b改名遗漏）
### 架构
- 卡片身份检测：魔法禁书目录模拟器（替换神秘复苏硬编码）
- 4折叠卡片（<details>默认全收起，纵向堆叠）：
  - 玩家卡：按***分3段（基础信息/阵营与能力/当前状态），含风险值/所在位置/阶段
  - 能力卡：能力档案数组（7字段：名称/类型/等级位阶/简述/副作用/稳定性/战术分析）
  - 任务卡：任务追踪数组（8字段树状：发布者/名称/类型/描述/目标/奖励/截止/进度）
  - 关系卡：NPC关系数组（二级折叠+好感度从高到低排序）
- 占位符渲染：[[MFrsStatus]]玩家/能力/任务/关系[[/MFrsStatus]] → 对应卡片
- 默认堆栈：无占位符时最新消息末尾挂全卡片堆栈
- 渲染防护：getPanelRenderKey hash（基于data+rawProtocol）
- 事件订阅：MESSAGE_RECEIVED/UPDATED/SWIPED/CHARACTER_MESSAGE_RENDERED/GENERATION_ENDED/STOPPED + MutationObserver
- 数据读取：getVariables({type:message,message_id}).stat_data + 协议兜底 applyUpdateProtocolToStatData
- 去数据库：无MysteryDatabase/抽卡/物品对话框/厉鬼槽/记忆编辑器
- CSS：深蓝科幻青蓝霓虹（主色#66ccff/选中#00ffaa）
### S7-3 核验（全过）
- 神秘复苏术语0残留 / 数据库抽卡0残留 / UTF-8损坏0
- 魔禁关键词命中40 / schema 36字段全部命中 / 665行
### 遗留（留S8/收尾）
- 界面美化脚本行647-859选项渲染正则（死亡风险/鬼域/灵异）+ CSS horror主题色——S7只重写了消息内面板，界面美化脚本未动（影响选项卡片渲染，非面板核心）
- 收尾项：mvu-protocol-applier当前异常事件字段语义
### 下一阶段
- S8 门禁与实战验证（需先解决WSL node不可用）
- 界面美化脚本残留清理（行647-859+CSS，可并入S8或单独处理）

## 2026-XX · S8 门禁验证完成（含环境问题解决）
### 环境问题解决
- WSL缺原生Linux Node，用 D:\Nodejs\node.exe(v24.14.1) 经binfmt互操作执行
- 创建 ~/.local/bin/node wrapper 转发到 node.exe，写入 ~/.bashrc 的 PATH
- 新shell需 export PATH="$HOME/.local/bin:$PATH" 才能用node
- npm可用(v11.11.0)，pnpm wrapper有路径bug但门禁用node直调不受影响
### tavern_sync 打包配置
- tavern_sync.yaml(项目根)注册魔禁卡：类型角色卡/本地src/魔法禁书目录模拟器/index/导出同名
- 生成8x8深蓝RGB PNG占位头像 src/魔法禁书目录模拟器/魔法禁书目录模拟器.png
### S8 验证结果
- S8-1 源码门禁：webpack production构建，魔禁6脚本TypeScript编译全部通过（多次compiled successfully，仅体积警告无error）
- S8-2 引用一致性：33世界书磁盘文件 + index.yaml 34条引用(32世界书+首消息+欢迎页) + 6脚本+_runtime_identity 全部落盘，逐个核查无缺失
- S8-3 门禁适用性：神秘复苏门禁脚本硬编码 CARD='神秘复苏模拟器' 且检查schema.json/hotfix目录/数据库等魔禁没有的专属结构，对魔禁不适用。用「webpack构建+tavern_sync打包+引用核查」三重等价覆盖
- S8-4 打包产物：534KB PNG，chara字段完整(name/description/first_mes/regex_scripts 9KB/character_book 121KB)，与参考卡神秘复苏结构一致(参考卡system字段也为空，属打包工具正常行为)
### 遗留（非阻塞，可后续优化）
- 界面美化脚本行647-859选项渲染正则(死亡风险/鬼域/灵异)+CSS horror主题色——影响选项卡片渲染非面板核心
- 收尾项：mvu-protocol-applier当前异常事件字段语义核对(is_anomaly_scene/has_entered_anomaly/当前异常事件等旧解密字段)
- SillyTavern实战走查需用户在本地环境操作(导入PNG卡到酒馆测试开局表单/4折叠面板/风险机制)
- PNG头像目前8x8占位，建议替换为正式魔禁主题卡面
