# 进度日志 — 开场白时间线手风琴重构

## 会话 1 — 2026-08-28

### 已完成
- 读取项目交接文档，建立项目背景（魔禁卡已完成状态）
- 联网搜索魔法侧境界+术式，新建《魔法术式图鉴》世界书文件（40+术式）+修正神之右席档案错误
- 联网搜索科学侧超能力，新建《超能力图鉴》世界书文件（Level 0-5全）+对称注册
- 实现点击能力/术式按钮显示描述（CSS面板+JS数据表+修复gen-mjr-welcome-regex.cjs脚本bug）
- 联网搜索完整时间线，整理事件级详细清单（旧约+新约+超电磁炮+SS+剧场版）
- 对照卡内58个开场白逐条核验，修正5处事实错误+新增8个关键事件开场白
- 读取 sillytavern-embedded-ui skill + planning-with-files-zh skill
- 调研当前开场白列表结构（#secOpening/#sceneList/58个.mw-scene卡片/goToStep机制）
- 创建规划文件：task_plan.md + findings.md

### 技术可行性结论
**可行**。当前58个开场白平铺在 #sceneList，每个卡片含结构化 data-date/data-tag/data-desc，可用JS动态按篇章分组实现手风琴折叠。已有 goToStep + .mw-step 机制可复用。

### 关键决策
- 采用 JS 动态分组（SCENE_ARCS映射表+渲染函数），不破坏原卡片HTML
- 14个篇章组按时间线排序，手风琴模式（同时只展开一组）
- 默认展开第一组「原石拯救篇」
- 视觉对齐深蓝科幻青蓝霓虹，参照 .mw-custom-box 玻璃卡样式

### ✅ 全部完成（阶段3-6）
1. HTML：#sceneList 结构保持，JS 动态注入15个 .mw-arc 篇章容器
2. CSS：新增 .mw-arc/.mw-arc-head/.mw-arc-body 手风琴样式（深蓝玻璃卡+青蓝边框+▶箭头旋转+max-height过渡）
3. JS：SCENE_ARCS 映射表（15篇章，按官方时间线排序）+ build()分组渲染 + 点击toggle（手风琴模式，同时只展开一组）+ case scene选中后自动展开其组
4. 同步index.yaml（80584→81441字符）+ webpack（5次compiled）+ tavern_sync bundle + PNG深度校验

### 校验结果
- 60个开场白全部被15个篇章组覆盖（0未覆盖，无"其他"组残留）
- 14个篇章组全部 ✅（原石拯救11/能力实演1/幻想御手9/旧约开端5/妹妹们4/树状图法之书3/大霸星祭4/0930风斩2/暗部大战1/不列颠暗部脱逃4/三战新约2/夏威夷2/欧提努斯6/科隆尊6）
- 手风琴CSS/JS全部进PNG（.mw-arc/.mw-arc-head/aria-expanded/data-arc/SCENE_ARCS/build()/toggle）
- PNG 931.4KB
