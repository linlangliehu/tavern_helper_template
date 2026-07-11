# Progress Log

## 2026-07-11 CST：Phase 7发布与真页收口完成

- 精确source commit `d87eec4`包含开发版源码、开发版PNG、新/更新门禁、4.0清单和必要planning；未包含本地dist、截图或探针。
- 确认bundle workflow只监听main/master；source安全快进到`origin/main`后，GitHub run `29150328734`成功生成bot commit `7f745d1`。
- `git show 7f745d1:dist/...`确认消息品牌、欢迎页和档案柜marker；发布YAML中的7条项目CDN URL全部HTTP 200。
- 发布配置升级为version `8.9.0`、ref `7f745d1`、cache `phase164-4-0-final-baseline-6-28-p5-4-hotfix14-mvu-v890-ghostseal`。
- `publish-card --dry-run`确认镜像第一条消息1、系统提示词1、对话示例1、世界书386、数据库1、头像1并替换15处链接；正式镜像和PNG bundle成功。
- 发布YAML：8.9.0×1、ref×7、cache×8；旧8.7.4/7e52d45/v874、localhost、127.0.0.1、`@main`均为0。
- 发布PNG的`chara/ccv3`均为33正则、8脚本且顺序一致；worldbook保持383/33/max5851。
- release commit `59d506f`已推main；workflow `29150629082`成功，dist无新变化，继续使用bundle commit `7f745d1`。
- 通过SillyTavern UI导入v8.9.0 PNG，再用“替换/更新”升级原id=4角色并保留历史聊天；首次导入产生的id=5重复卡及测试聊天已删除。
- 恢复原聊天`神秘复苏模拟器发布版 - 2026-07-09@21h56m38s357ms`，保持5楼、AI/用户=3/2。
- 四视口375×812、500×901、768×1024、1440×900：panel/wrapper/brand=3/3/3，用户0/0/0，任务UI横向溢出0，无真实文本截断。
- 历史品牌动画paused，最新鬼眼9s/法阵18s running；reduced-motion下brand/eye/seal均为none/0s。
- 消息Tab方向键/Home/End、行动只填不发、风险meter、Font Awesome均通过；输入框恢复为空。
- 档案柜14公共API、17入口、双插槽10/20、10个button Tab、键盘导航、折叠语义和aurora配置均通过。
- 三次同聊天重载稳定3/3/3；跨卡后panel/wrapper/brand/style/API/iframe全0，切回只重挂一次。
- 可逆CRUD使用“灵异物品”表：`PHASE7_TEST_TOKEN_20260711`插入成功后计数1，删除成功后`exportCurrentData()`残留0。
- 最终只读确认：id=4、版本8.9.0、5楼、3/2、3/3/3、style/theme/archive/dashboard=1、输入框空、1440×900、同名卡1张、正式ref/cache生效、CRUD token=0。
- Page errors与新增console error均为0；Network只保留ISSUE-006两种既有vendor storage 404。

### Phase 7遇到的错误与处理

- 本机没有`gh`：source已推main后`gh`报`CommandNotFoundException`；改用GitHub官方Actions REST API按head SHA只读轮询。
- 两份旧门禁整文件Prettier不通过：它们只做最小断言修正且存在既有格式基线；缩小到新增门禁和实际TypeScript源码后通过，避免无关重排。
- PowerShell两次因`foreach`直接接管道或引号嵌套触发parser error；改为先累积数组和使用Ordinal `IndexOf`计数。
- `agent-browser viewport`语法错误且daemon偶发EOF；改用`set viewport`并以实际`innerWidth/innerHeight`为准，截图使用现有CDP capture工具。
- 第一次CRUD把plan传成数组，API返回`tableChangePlan必须是对象`；改为单个plan对象后insert/delete均成功。
- 最终页面一度`visibilityState=hidden`，角色脚本未挂载；仅将现有标签页置前，宿主自动恢复全部iframe/DOM/API。

---

## 2026-07-11 CST：Phase 6总验收完成

- 自动门禁全绿：diff check、目标Prettier/ESLint、MVU、数据库前端、output-cleaning、storage/provider、syncbridge、table adapter、SQL、CRUD parse、UI gate 180项、PNG self-test和worldbook。
- 两轮production build成功，仅数据库前端426KiB既有performance warning；schema、worldbook、发布配置与发布包哈希无非预期漂移。
- 修复同聊天重载重复品牌：已有brand被`wrapNarrativeText()`吸入wrapper后又被重新创建；改为提升嵌套brand并从叙事节点收集中排除。
- SQL门禁从陈旧`<sp_status>`顺序断言更新为当前“【本轮摘要】→`<choices>`→`<UpdateVariable>`”契约，未修改AI输出协议。
- 真页覆盖四视口、动画、Tab、行动填入、档案柜、跨卡清理和同聊重载，全部通过。

---

## 2026-07-11 CST：Phase 5欢迎页完成

- 证明真实入口为`第一条消息/0.txt`的`<sp_start>`、开发版`index.yaml`三条启用正则和活跃`界面美化/index.ts`。
- 欢迎页、通用输入和掷骰条统一尸青/旧铜/骨白/血红档案风格，保留全部`data-mfrs`与原流程。
- 分组/章节改原生button，补齐ARIA和方向键/Home/End/Escape；厉鬼增删按钮实测44×44。
- 欢迎页与通用输入均只填输入框不自动发送；掷骰meter与文本转义通过。

---

## 更早历史

- v8.7.4及更早的完整逐次流水保留在Git历史和`planning_archive_2026-06/`。
- 本次精简前的完整三份planning可从commit `59d506f`读取。
- 当前恢复任务无需扫描旧流水；版本链路和最终证据见`task_plan.md`与`planning_archive_2026-07/ghostseal-v890-summary.md`。
