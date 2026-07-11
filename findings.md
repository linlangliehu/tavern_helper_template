# Findings

本文件只保留可复用的工程结论。逐次执行日志写入`progress.md`，当前停点写入`task_plan.md`，旧流水通过Git历史查询。

## 发布与CI

- `.github/workflows/bundle.yaml`只监听`main/master`。任务分支push不等于bundle已启动；必须先确认`origin/main`是source commit祖先，再安全快进main。
- 没有GitHub CLI时，可用GitHub官方Actions REST API按source `head_sha`只读轮询workflow。
- 发布CDN必须固定不可变bot SHA/tag，禁止`@main`。本轮权威bundle为`7f745d1`。
- 当前worktree有本地build dist时，不要为拉取bot commit而覆盖或清理这些文件；从`origin/main@bot-sha`建立干净release worktree更可靠。
- 发布验证必须同时覆盖YAML、PNG `chara/ccv3`和最终CDN URL。只看本地dist marker不能证明分发链路可用。

## 发布包硬基线

- 发布版本8.9.0：YAML版本×1、项目ref×7、cache×8；旧版本/ref/cache、本地地址和`@main`必须全0。
- PNG双chunk必须各自满足：worldbook 383/33/max5851、正则33、Tavern Helper脚本8且顺序固定。
- 固定脚本顺序：`mvu`、`hotfix-generation-ended-listeners`、`变量结构`、`界面美化`、`固定状态栏`、`spv3.9.5·数据库`、`神秘复苏数据库前端`、`消息内面板`。
- production build会触发dump/sync；构建前后必须比较schema、worldbook、开发/发布PNG、发布YAML和publish-card哈希。

## SillyTavern导入与运行态

- 同名角色首次“从文件导入”会创建新avatar后缀和新角色；要保留旧聊天，应通过原角色的“替换/更新”导入发布PNG。
- 导入/更新后整页重载可能回到临时聊天；恢复目标卡时应明确检查characterId、版本、chatId和楼层数。
- 页面处于`visibilityState=hidden`时，角色级Tavern Helper iframe可能尚未挂载。先将现有标签页置前并等待自动加载，不要立即误判发布包失效。
- 最终运行态必须同时检查DOM、style、公共API、iframe和资源URL；只检查角色版本或可见文本不够。
- 删除本轮创建的重复卡时必须核对characterId、avatar和version，并只删除明确由本轮产生的副本。

## 消息生命周期

- panel刷新不能使用随机ID和整根删除重建。稳定mesid ID配合render key可保持Tab、焦点和外部引用。
- cleanup移除wrapper前必须将childNodes解包回`.mes_text`，否则会连正文一起删除。
- Tavern Helper脚本运行在iframe但操作父文档；`Element`、`MutationObserver`、`Event`和`HTMLTextAreaElement`应使用宿主realm或nodeType判断。
- 同聊天重载的重复品牌根因是已有`.mfrs-msg-brand`被`wrapNarrativeText()`吸入wrapper，随后注入逻辑只检查直接子节点并再建一份。修复方式是先提升嵌套brand，收集叙事节点时排除brand。
- 跨角色时旧iframe会被销毁，切回后是新实例加载；跨卡验收应拆成离开、采样、返回、采样四个短步骤。

## 品牌、动画与响应式

- 品牌必须是`.mes_text`直接子节点，顺序为brand→wrapper→panel；伪元素无法可靠承担结构化信息和无障碍名称。
- 历史楼层持续动画必须暂停，最新楼层只允许鬼眼与法阵两处持续动画；旧`mfrs-panel-breathe`已删除。
- reduced-motion必须用运行态computed style验证，目标是brand/eye/seal全部`animationName=none,duration=0s`。
- 移动端不能只看`documentElement.scrollWidth`。既有`.tf-ball`固定插件会保留桌面left值并制造假溢出；应同时检查body、chat、fixed host、archive和dashboard。
- select元素的所有option文本可能让`scrollWidth`大于可见宽度，但不代表当前选中值被截断；文本截断需结合computed style和截图判断。

## 消息面板交互

- Tab键盘操作必须同时更新`aria-selected`、roving tabindex、tabpanel hidden状态和焦点；仅改变选中属性不够。
- 行动建议验收必须记录行动文本、输入框值、焦点、消息数前后和生成状态，并在测试后恢复输入框。
- 风险展示必须同时包含等级、数值、解释文字、颜色和`role=meter/aria-valuenow`。
- 宿主主题可能覆盖Font Awesome字体；应检查computed `fontFamily="Font Awesome 6 Free"`与fontWeight 900。
- 连续档案分区只保留一个panel外框；内部section用分隔线组织，不再叠加卡片背景和阴影。

## 档案柜与数据库

- 固定host、dashboard/frontend插槽ID与order 10/20、`.acu-wrapper`、`data-table/data-target`都是兼容边界。
- aurora主题通过现有`acu_ui_config_v18`演进，不新增主题ID、不迁移localStorage。
- Tab按钮和编辑按钮必须是相邻节点，不能把button嵌套进button；Tab切换按`data-target`定位tabpanel。
- 折叠入口覆盖主导航、嵌入档案柜、嵌入行动选项和设置accordion；原生button优先，自定义入口必须有role/tabindex/aria-expanded和Enter/Space。
- 真页CRUD必须选允许删除的表做可逆测试。本轮使用“灵异物品”：单个plan对象insert后token=1，delete后`exportCurrentData()` token=0。
- `previewTableChangePlan`和`applyTableChangePlan`接收单个plan对象，不接受数组；传数组会返回`tableChangePlan 必须是对象`。

## 欢迎页与正则UI

- 欢迎页真实入口是`第一条消息/0.txt`中的`<sp_start>`，由开发版`index.yaml`启用正则渲染，再由活跃`界面美化/index.ts`增强。
- 不应修改未直接加载的Vue状态栏来替代真实入口。
- 欢迎页与通用输入保持“只填聊天输入框，由玩家手动发送”；清空面板只清自身字段。
- 44px触控尺寸要同时设置width、min-width和`flex:0 0 44px`，否则flex-shrink会在窄视口压缩。
- 掷骰seed必须使用`textContent`，meter在复算后同步`aria-valuenow/aria-valuetext`。

## 输出契约与SQL门禁

- 当前正式顺序是“正文剧情→【本轮摘要】→后台`<choices>`→`<UpdateVariable>`”，旧可见`<sp_status>/<sp_clue_deduce>`不再是顺序基线。
- 系统提示词前部含`<UpdateVariable>`固定骨架，不能用全文件首次出现索引判断输出顺序；应锁定明确契约行，对话示例再检查实际块顺序。
- 修正门禁时只更新断言，不借机修改worldbook或AI输出契约。

## Windows与工具可靠性

- 中文文件先检查BOM，无BOM时严格UTF-8，失败再GB18030；PowerShell输出通道也应显式设UTF-8，避免内容正确但终端错显。
- PowerShell中`foreach`表达式直接接管道容易产生`An empty pipe element is not allowed`；先累积到数组再格式化。
- 含中英文引号的正则计数容易触发PowerShell parser error；简单固定字符串优先用Ordinal `IndexOf`循环。
- agent-browser的DOM refs在页面变化后立即失效；切卡、弹窗、上传和重渲染后必须重新snapshot。
- 长CDP表达式跨导航会因execution context销毁而超时；导航与采样应拆成短步骤。

## 后续版本

- 旧计划预留的8.8.0折叠功能已被当前8.9.0版本号越过。若继续实现，应使用高于8.9.0的新版本并重新规划。
- 保留需求：正文与消息面板联动折叠、刷新/重渲染后状态持久化、平滑开合；实现前重新审计生命周期与MVU时序。
