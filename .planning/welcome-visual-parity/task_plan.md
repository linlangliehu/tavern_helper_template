# 开局界面视觉完全对齐 树梦魔禁大世界 — 任务计划（已确认版）

> 参考源：https://m.xinlishumeng.com/#/pages/chat_h5/chat_h5?bookId=1431630596354980155
> 参考源码已完整提取（81,856 字符，srcdoc 内嵌 HTML，存于会话 §376-§380，可按需取回落盘）
> 我方源：src/魔法禁书目录模拟器/自定义开局/欢迎页.txt（64,566 字符，848 行）
> 我方源：src/魔法禁书目录模拟器/自定义开局/欢迎页.txt（73,650 字节，视觉对齐版）
> 状态：**P0-P4 全部完成并通过实机验收（2026-08-26）**
## 〇、用户已拍板的决策（2026-08-26）

| 决策点 | 结论 |
|---|---|
| 角色图片 | **不引入**原版图床立绘；保持首字头像。用户之后在开发版本中**自行上传角色图片**（后续任务，不在本计划内） |
| BGM | **默认不播放**，手动点击按钮后才播放（维持现状行为，仅对齐按钮视觉规格） |
| intro 文案 | 两行：主行「学园都市大冒险」，副行「你可以成为科学侧的超能力者，或魔法侧的魔法师——在这座城市展开你的冒险」（不加交流群号） |
| 开屏动画时长 | **保留完整 4 秒**（3s 淡出 + 移除），与原版一致 |

## 一、差异清单与处理

### A 级：一眼可见的大差异（5 项）— 全部移植

| # | 项 | 树梦原版 | 我方现状 | 处理 |
|---|---|---|---|---|
| A1 | **开屏动画** | 全屏 #intro-animation：径向涟漪 magicRipple + 六字逐字闪烁 sparkleText（0.5s 起每字 +0.3s）+ 3s 淡出 fadeOutScreen、4s 移除 | 无 | ✅ 完整移植，保留 4s |
| A2 | **背景层** | body::before 星点 SVG(base64)平铺 + 中央 radial 光晕 + backgroundPulse 8s 呼吸；body::after 底部 40% 黑色渐晕 | 纯渐变 | ✅ 完整移植（星点 base64 直接复制） |
| A3 | **主标题** | h1 六 span 逐字 sparkleText（blur→清晰），2.8em | 30px 静态辉光 | ✅ 改六 span 逐字闪烁 |
| A4 | **页面容器** | max-width 1200px 大玻璃卡（rgba(0,0,0,.85)、圆角 1em、外发光、内高光 inset、fadeInContent 入场） | 720px 无容器 | ✅ 改造容器样式 |
| A5 | **顶部导航** | sticky main-nav 黑底 0.95 + 底边 cyan + 品牌字发光 + nav-link 渐变胶囊 active | 页内描边 tab | ✅ sticky nav + 胶囊 tab（沿用 data-act="tab" 委托） |
| A6 | **面板替换式交互流** | 巫师式：点阵营→阵营面板消失、学校面板顶替；一屏一面板顺序推进；每步配「← 返回上一步」 | 单页渐进展开：阵营卡保留在屏，整条链下方展开+滚动 | ✅ 重构为顺序面板栈 + goToStep 状态机 + 每步返回按钮 |
### B 级：组件级差异（9 项）

| # | 项 | 处理 |
|---|---|---|
| B1 | intro 文案区 | ✅ 按用户文案两行化（主行强调色大字+副行 dim 色）+ 底部 cyan 分隔线 + 入场延迟 |
| B2 | 图标体系 | ✅ 引入 Font Awesome 6.4.0 CDN；⚡→fa-atom、🎩→fa-hat-wizard、♪→fa-music；side-icon 3em；CDN 失联 fallback 保留 emoji |
| B3 | 阵营卡 | ✅ min-height 200px + hover translateY(-5px)+阴影 + 选中 #00ffaa 绿渐变双辉光 |
| B4 | 等级/境界 pills | ✅ border-radius 2em 胶囊 + flex-wrap + min-width 120px + 选中 #00ffaa |
| B5 | 生成前预览 modal | ✅ 新增 preview-modal（角色预览 → 确认复制/返回修改），copycfg 拆两步 |
| B6 | toast 升级 | ✅ 右上角 slideIn/slideOut + 4 色渐变（success/error/warning/info）+ 3s |
| B7 | 键盘快捷键 | ✅ Esc 关 modal、Ctrl+Enter 生成（不做 beforeunload——iframe 内无意义） |
| B8 | 音乐按钮+真BGM | ✅ 视觉对齐（50px 圆钮 + fa-music + hover scale(1.1)）**并接入 only my railgun**：用户已提供 mp3（9.7MB/320kbps，ID3 验证 fripSide/infinite synthesis）；上传到用户 GitHub 新仓库 bgm → raw 直链嵌入；默认不自动播放，点击播放/再点暂停；playing 时图标旋转 |
| B9 | select 下拉箭头 | ✅ 自定义 cyan 箭头（SVG data-uri）+ focus 辉光 |
| B10 | 角色详情弹窗 | ✅ 对齐树梦：左图右文两栏（max-width 800px）、名字左上+×右上+青色分隔线、详情 • 圆点列表化（12 角色简介拆成性别/年龄/外貌/能力/性格/背景分条）、轻遮罩（背景网格可见）；形象位用大尺寸首字方块占位（青框+发光），用户后续上传真图直接替换 |

### C 级：微交互（3 项）

| # | 项 | 处理 |
|---|---|---|
| C1 | hover 上浮 | ✅ 选项卡统一 -5px |
| C2 | 输入 focus 辉光 | ✅ border #66ccff + 0 0 0.5em 辉光统一 |
| C3 | 分层入场延迟 | ✅ page-container fadeInContent 0.5s；intro 1s、表单 1.5s 分层 |

### 有意保持的差异（不回退）

| 项 | 原因 |
|---|---|
| 53 场景文案原创重写 | 版权规避（记忆 #13 决策） |
| 12 角色首字头像 | 用户将来自行上传角色图（本计划不含）；原版 img.remit.ee 图床有版权/失效风险 |
| 委托事件架构 data-act | 单根委托在酒馆 iframe 更稳 |
| BGM 不自动播放 | 用户决策 |

## 二、实施步骤

### 准备
0.1 备份 `欢迎页.txt` → `欢迎页.txt.bak-视觉对齐前`
0.2 从会话 §376-§380 取回落盘参考源码 → `.planning/welcome-visual-parity/shumeng-reference.html`（便于逐段比对）

### P1：A级 5 项移植（核心视觉）
- [ ] 1.1 `<style>` 增加 #intro-animation 层（magicRipple/sparkleText/fadeOutScreen keyframes，4s 时序）+ body 首部插入六字开屏层 DOM + JS 4s 后 display:none
- [ ] 1.2 body::before 星点 SVG base64 平铺 + 中央 radial 光晕 + backgroundPulse 8s；body::after 底部 40% 渐晕
- [ ] 1.3 mw-title → 六 span 逐字 sparkle（blur→清晰，0.5s 起每字 +0.3s）
- [ ] 1.4 页面容器改造：max-width 1200px + rgba(0,0,0,.85) 玻璃卡 + 圆角 1em + 外发光/内高光 + fadeInContent 入场
- [ ] 1.5 sticky main-nav：品牌字发光 + 渐变胶囊 active tab（data-act="tab" 委托不变）
- [ ] 1.6 【A6】交互流重构：chainScience/chainMagic 整链容器 → 顺序面板栈；新增 goToStep(step) 状态机（side→school|organization→ability(+level)|magic→opening）；每步底部「← 返回上一步」按钮（data-act="back"）；选中阵营后面板替换而非保留展开
### P2：B/C 级组件对齐
- [ ] 2.1 intro 区两行文案（「学园都市大冒险」主行 accent 大字 / 副行 dim）+ cyan 底线 + 1s 延迟入场
- [ ] 2.2 Font Awesome 6.4.0 CDN link + 替换三处图标 + side-icon 3em + emoji fallback
- [ ] 2.3 阵营卡 min-height 200px / hover -5px / 选中 #00ffaa 双辉光
- [ ] 2.4 等级/境界选项 2em 胶囊化 + flex-wrap + min-width 120px
- [ ] 2.5 preview-modal 新增（预览字段列表 + 确认复制/返回修改两键），copycfg 流程拆两步（沿用 data-mech 枚举新增 preview/copyconfirm）
- [ ] 2.6 toast 重做：右上角 slideIn/Out + 四类型渐变 + 3s
- [ ] 2.7 keydown 监听：Esc 关 modal、Ctrl+Enter 生成
- [ ] 2.8 音乐钮 50px + fa-music + hover scale(1.1)（播放逻辑不变：手动触发）
- [ ] 2.9 select 自定义箭头 + input/select focus 辉光 + hover -5px 统一 + 表单 1.5s 分层入场
- [ ] 2.10 【BGM】GitHub MCP 建仓库 <user>/bgm → push only+my+railgun-FripSide#f4YLJ.mp3（重命名 only-my-railgun.mp3）→ raw 直链写入欢迎页 audio#bgm；点击播放/暂停逻辑（沿用现有 case"music"，去掉"未内置"分支）
- [ ] 2.11 【B10】角色弹窗重构：mw-modal 480px 竖排 → 800px 两栏（左 250×350 首字方块占位/右 • 列表）+ 头部布局 + 轻遮罩；12 角色 bio 数据拆分条字段

### P3：重建与实机验收
- [x] 3.1 node tavern_sync.mjs bundle 魔法禁书目录模拟器 → 新 PNG
- [x] 3.2 STClient 删旧卡 → scripts/cdp-upload-file.mjs 导入新 PNG → UI 新建对话
- [x] 3.3 数据级：get_character 核对正则数/脚本 URL/世界书
- [x] 3.4 视觉级：9225 Chrome 并排对比树梦页 vs 我方 iframe，截图逐项过 A1-A5/B1-B9/C1-C3
- [x] 3.5 交互级：科学侧全链路 + 幻想杀手锁 Lv0 + 预览 modal 两键 + toast 四色 + Esc/Ctrl+Enter + 音乐手动播放
- [x] 3.6 冒烟：<sp_start> 零露出 + iframe 正常挂载 + 原 14 项冒烟全过

### 收尾
- [x] 4.1 更新记忆 #13（开局界面视觉已完全对齐树梦版 + 用户将自行上传角色图的后续事项）
- [x] 4.2 PROJECT_FLOW.md/交接文档如涉及开局界面的描述同步
- [x] 4.3 本计划全部勾选归档

## 三、风险与回退
- 改坏即还原：`cp 欢迎页.txt.bak-视觉对齐前 欢迎页.txt` → 重新 bundle
- Font Awesome CDN 失联 → fallback emoji 兜底（图标语义不丢）
- 1200px 容器在窄聊天栏自动缩窄（max-width 语义），移动端/窄栏不破版
- 开屏动画 z-index 局限于 iframe 内部，不影响酒馆宿主页面
- 星点 base64 与 FA CSS 使 PNG 体积增加约 10-15KB（预算内，当前卡 680KB）

## 四、预估
P1 ≈ 2h（含 A6 交互流重构） · P2 ≈ 1.5h · P3 ≈ 0.5h —— 合计 ~4h，一次会话可完成
