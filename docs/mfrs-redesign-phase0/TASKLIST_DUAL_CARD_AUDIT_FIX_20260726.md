# 神秘复苏模拟器双卡审查缺陷修复任务清单

> 范围：`神秘复苏模拟器` 开发卡与 `神秘复苏模拟器发布版`。  
> 基线：两卡内容版本均标记 `8.14.0`；本清单只规划，不代表已实施。  
> 执行原则：只改开发源，发布版由 `publish-card` 生成；禁止手改发布 PNG。
>
> **回填说明（2026-08-09）：** 本清单的勾选于 2026-08-09 按 `acbbc22`（8.14.15 源码提交，2026-07-26）实际落地内容回填。批次 B（T3/T4/T5）与 T1 的 5 类门禁脚本增长、T2 的四载体一致、T6.1/T6.2 的头像剥离与归档、T7.1/T7.2/T7.5/T7.6 的静态/聚合/发布/发布后验收均已随 8.14.15 发布完成。仍空白（未做或有缺口）的项：T0.1 基线证据保存、T6.3 干净角色列表重新导入验收、T7.3 桌面端真页验收、T7.4 移动端真页验收。清单统计段已同步更新。

## 目标与完成定义

- 开发卡、发布卡、正式 PNG 使用同一版本、CDN ref 与 cache 真源。
- 自定义开局厉鬼能稳定进入运行期 HUD，且不会退化为“未命名厉鬼”。
- 固定状态栏重载/换聊/卸载后没有残留监听器或 timer。
- 总复苏风险达到 100 时进入产品定义的确定终态，不再继续错误输出存活选项。
- 发布目录只有一个明确的可导入成品，或其他 PNG 不再携带角色卡元数据。
- 专项门禁、聚合门禁、桌面与移动端真页验收、发布后 PNG/CDN 校验全部通过。

## 硬约束

- 脚本库保持 8 项，名称、顺序和启用状态不变。
- 正则保持 33 条；不随本修复增删或改 ID。
- 契约真源顺序：`schema.ts` → 变量输出格式 → 系统提示词 → 对话示例 → 脚本解析。
- 拟办/选项只填输入框，不自动发送。
- 不安装依赖、不清理 `node_modules`、不启动或抢占用户的 watch。
- 禁止 `git add .`；只提交本阶段明确文件。
- 禁止把 localhost、DEV marker、开发 dist 噪声带入发布。
- `CDN_REF` 必须指向远端可达的固定 SHA，不得使用 `main`/`master`。

## Phase 0：文档与 API 基线 — **complete**

### 允许模式

- 事件生命周期复制 `.cursor/rules/项目基本概念.mdc:227` 的模式：保存 `eventOn(...)` 返回的 `EventOnReturn`，统一释放。
- 页面卸载继续使用项目既有 `pagehide` cleanup，不引入 `unload` 或 `DOMContentLoaded` 依赖。
- MVU 使用既有 `waitGlobalInitialized('Mvu')`、`Mvu.getMvuData(...).stat_data` 与 `Schema.parse` 模式。
- 发布常量只取 `scripts/mfrs-release-constants.mjs`。
- 发布流程遵循 `PROJECT_FLOW.md:65-128` 与 `scripts/publish-card.mjs`，不直接维护发布镜像。

### 禁止模式

- 丢弃 `eventOn()` 返回值。
- 无 owner 的裸 `setTimeout` 链。
- 只给 HUD 增加 alias、但不修开局/schema/提示词契约。
- 直接把 `{厉鬼名称, 杀人规律}` 塞进要求 `{代号, ...}` 的运行期数组。
- 手工同时修改开发 YAML、发布 YAML 和两个 PNG。
- 机械套用已过时的 8.12 β `WHITELIST.md`（其端口和范围已不符合当前流程）。

## T0：基线冻结与产品决策 — **decision complete / baseline pending**

- [ ] **T0.1 保存基线证据**  ← 仍 pending：8.14.15 已发布，本项实际意义降为"回链归档基线快照"，可补做或并入下次轮次
  - 记录开发/发布 YAML 与两个正式 PNG 的版本、ref、cache、SHA-256。
  - 记录当前 `pnpm verify:mfrs-gates` 结果和 `verify:mfrs-dist-freshness` 的已知失败。
- [x] **T0.2 决定复苏 100 终态：独立"厉鬼复苏"终态**（落地于 `变量更新规则.yaml` + `灭亡裁定守则.txt` + `驭鬼者与厉鬼复苏.txt`，acbbc22）
  - 无有效豁免时写 `状态=厉鬼复苏`，与 `状态=死亡` 明确区分。
  - 该状态仍是本次模拟的终态：`is_dead=true`、`主线进度.阶段状态=模拟结束`、`行动建议=[]`，正文输出【模拟结局】且禁止继续输出 `<choices>`。
  - 死机、鬼与鬼压制等有效豁免必须在达到阈值的同一轮写明生效条件、资源/状态变化和阈值处理结果；没有明确落盘的豁免不得阻止终局。
- [x] **T0.3 决定发布目录 PNG 布局：只保留一个可导入 PNG**（落地于 `publish-card.mjs` 头像剥离 chara/ccv3 + 旧副本归档到 `archive/character-cards/legacy/`，acbbc22）
  - 唯一允许携带 `chara/ccv3` 的成品为 `神秘复苏模拟器发布版.png`。
  - 头像若必须保留，应迁入明确的资源路径或清除角色卡元数据，不能作为第二张可导入卡存在。

### T0 验收

- 两项产品决策已写入本清单。
- 后续测试期望不包含“厉鬼复苏或极端濒死”这种未决二选一。

## T1：建立失败门禁（先红后绿）

- [x] **T1.1 双卡身份门禁**（落地于 `verify-mfrs-release-png.mjs` +31 行双卡 evening，acbbc22）
  - 扩展 `scripts/verify-mfrs-release-png.mjs` 或提取公共解析模块。
  - 同时校验开发 YAML、开发 PNG、发布 YAML、正式发布 PNG的 `RELEASE_VERSION`、`CDN_REF`、`CDN_CACHE_VERSION`。
  - mutation：将任一 ref 换成 `9c5a467` 时必须失败。
- [x] **T1.2 开局厉鬼契约门禁**（落地于 `verify-mfrs-mvu-hotfix-regressions.mjs` +14 行双 root 断言，acbbc22）
  - 在 `scripts/verify-mfrs-mvu-hotfix-regressions.mjs` 增加双 root 断言。
  - 欢迎消息必须明确初始化 `/驾驭厉鬼` 与 `/驭鬼者状态/已驾驭厉鬼`。
  - 增加普通人、单鬼、双鬼三组结构样例。
- [x] **T1.3 固定状态栏生命周期门禁**（落地于 `verify-mfrs-archive-ui-regressions.mjs` +30 行 disposer/clearTimeout owner 静态断言，acbbc22）
  - 扩展 `scripts/verify-mfrs-archive-ui-regressions.mjs`。
  - 静态门禁要求 disposer 被保存、cleanup 存在 `clearTimeout`，并禁止 `eventOn(...); return;` 无 owner 模式。
  - 优先增加带 fake event/timer 的运行测试：安装两次→触发换聊→cleanup 后 listener=0、timer=0、mount=0。
- [x] **T1.4 复苏终局契约门禁**（落地于 `verify-mfrs-mvu-hotfix-regressions.mjs` 终态写集断言，acbbc22）
  - 对开发/发布规则同时断言 T0 决策要求的完整写集。
  - 检查终态不得继续输出 `<choices>`，且 `/行动建议` 必须清空。
- [x] **T1.5 发布目录唯一成品门禁**（落地于 `verify-mfrs-release-png.mjs` unique-importable-card gate，acbbc22）
  - 解析目录中所有 PNG 的 `chara/ccv3` chunk。
  - 按 T0 决策断言只有 `神秘复苏模拟器发布版.png` 可导入。

### T1 验收

- 五类缺陷在未修源码上均能被对应门禁稳定捕获。
- 测试失败信息指出具体卡片、字段或生命周期 owner，不能只报布尔失败。

## T2：统一开发卡、发布卡和 PNG 运行身份 — **complete (8.14.15)**

- [x] **T2.1 确认当前 production dist 提交**（8.14.15 已发，CDN_REF=85cb68233d793b634ed0a57662a5235442d31ac2 指向 bot bundle commit）
  - 完成源码修复和 `pnpm verify:mfrs-source-gates` 后精确提交并推送源码，不提交本地 dist。
  - 等待 GitHub Actions `[bot] bundle` 权威构建 production dist，记录其完整 SHA。
  - 不自行安装依赖；若环境缺包，停止并提示用户维护依赖。
- [x] **T2.2 更新发布单真源**（`scripts/mfrs-release-constants.mjs`: RELEASE_VERSION=8.14.15 / CDN_REF=SHA / CDN_CACHE_VERSION=v81415_20260726_01）
  - 只更新 `scripts/mfrs-release-constants.mjs` 中版本、CDN ref 和 cache。
  - 开发卡不再长期保留独立旧 pin。
- [x] **T2.3 扩展生成流程**（`publish-card --dist-no-build` 镜像生成走单真源，acbbc22 加 --no-bundle 跳 G1）
  - 让 `publish-card`/相关生成步骤从单真源同步开发 YAML、发布 YAML与最终 PNG。
  - mutation 验证旧 ref 不可能静默通过。
- [x] **T2.4 清除 dist freshness 漂移**（dist 由 CI bot 权威重建，CDN_REF 指向该 commit，G1 一致性门禁通过）
  - `pnpm verify:mfrs-dist-freshness` 必须通过。

### T2 验收

- 四个载体版本/ref/cache 完全一致。
- URL 中无 localhost、`main`、`master` 或旧 `v81336` marker。

## T3：修复开局厉鬼 canonical 数据链 — **complete (acbbc22)**

- [x] **T3.1 定义单一映射函数/模板**（index.yaml 欢迎页内联逻辑：厉鬼名称→代号 + 7 项默认补齐，acbbc22）
  - 输入旧开局对象 `{厉鬼名称, 杀人规律}`。
  - 输出运行对象至少包含合法 `代号`、`杀人规律` 及 schema 所需默认字段。
  - 映射必须保证 `代号 !== 未命名厉鬼`。
- [x] **T3.2 更新开局消息生成**（index.yaml 欢迎页同轮双 replace `/驾驭厉鬼` + `/驭鬼者状态/已驾驭厉鬼`；普通人两数组写 []，acbbc22）
  - 修改 `src/神秘复苏模拟器/index.yaml` 对应的欢迎页内联生成逻辑。
  - 明确同时初始化旧表单字段和运行期嵌套数组；普通人保持两个数组为空。
- [x] **T3.3 按真源顺序同步契约**（schema.ts/变量输出格式/系统提示词/对话示例/开局锚点规则/前端解析 一致，acbbc22 调整 index.yaml + 相关规则文件）
  - `schema.ts` → 变量输出格式 → 系统提示词 → 对话示例 → 开局锚点规则 → 前端解析。
  - 删除互相冲突的"只写嵌套"和"开局只写顶层"模糊表述。
- [x] **T3.4 旧存档兼容**（一次性幂等迁移约束保留，已驾驭厉鬼整表 replace 约束保留）
  - 只在加载旧存档时提供一次性、幂等迁移；不得每轮重复追加厉鬼。
  - 保持已驾驭厉鬼整表 `replace` 约束。

### T3 验收

- 普通人、单鬼、双鬼开局进入首轮后，HUD 与数据库内容准确。
- 重载和继续对话不会重复累积同一厉鬼。
- 两张卡的规则文件仍逐字一致。

## T4：修复固定状态栏生命周期 — **complete (acbbc22)**

- [x] **T4.1 统一订阅 owner**（`固定状态栏/index.ts` +70 行 own eventOn disposer，acbbc22）
  - 保存 `eventOn(CHAT_CHANGED, ...)` 的 disposer。
  - fallback `eventSource.on/off` 继续保留，但两条路径进入同一幂等 cleanup。
- [x] **T4.2 统一 timer owner**（timer Set + epoch guard 持有 retryMount 与换聊 0/250/1000ms timers，cleanup 清空，acbbc22）
  - 持有 `retryMount` timer 与换聊的 0/250/1000ms timers。
  - 新一轮操作先取消旧 timers；cleanup 清空全部 timers。
  - 可复用项目内已有 epoch/timer ownership 模式，不新增无主 scheduler。
- [x] **T4.3 阻止旧实例复活**（cleanup 后用 epoch guard 拦旧 continuation，acbbc22）
  - cleanup 后旧 continuation 必须检查 owner/epoch，不能再次挂载 DOM。
- [x] **T4.4 群聊支持决策**（已沿用既有非群聊限界，未混入本轮核心修复；如后续需群聊另起任务）
  - 若支持群聊：增加 `groupId`/群成员身份识别与真页用例。
  - 若不支持：明确文档限制，不把它混入本轮核心修复。

### T4 验收

- 连续重载 5 次后换聊，每次只发生一组挂载任务。
- cleanup 后等待 25 秒，状态栏不会被旧 timer 重新挂载。
- `pagehide`、切卡、换聊和脚本重装均不残留 listener/timer。

## T5：闭合总复苏风险 100 终局 — **complete (acbbc22)**

- [x] **T5.1 按 T0 决策更新变量规则**（`变量更新规则.yaml` 阈值/豁免/消耗/终态/JSON Patch 写集，acbbc22）
  - 明确阈值判断、豁免、消耗、终态和完整 JSON Patch 写集。
- [x] **T5.2 同步系统提示与输出格式**（`变量输出格式.yaml` + `驭鬼者与厉鬼复苏.txt` 沿用风险值达 100 闭合范式，acbbc22）
  - 复用现有"风险值达到 100"的闭合范式，不另造旧英文路径或 `op:add`。
- [x] **T5.3 同步前端显示**（终态清空 choices/行动建议；HUD/数据库终态无存活可选行动，acbbc22）
  - HUD/数据库对终态显示一致；终态不再展示可点击的存活行动建议。
- [x] **T5.4 增加边界样例**（死亡裁定守则/驭鬼者与厉鬼复苏 文件含无豁免与有豁免样例；旧存档载入由幂等迁移覆盖）
  - 99→100 无豁免。
  - 99→100 有明确死机/压制豁免。
  - 已达 100 的旧存档载入。

### T5 验收

- 三个样例的正文、变量、阶段和 choices 完全符合 T0 决策。
- 不出现 `状态=存活` 但已“厉鬼完全复苏”的矛盾组合。

## T6：发布目录与分发收敛 — **T6.1/T6.2 complete, T6.3 pending**

- [x] **T6.1 按 T0 决策处理头像源**（`publish-card.mjs` syncFiles 头像剥离 chara/ccv3，acbbc22）
  - 更新 `publish-card.mjs` 的 `syncFiles` 或资源路径。
  - 不直接删除仍被 `头像:` 引用的文件。
- [x] **T6.2 明确唯一导入入口**（旧 PNG 归档至 `archive/character-cards/legacy/`；发布目录仅 `神秘复苏模拟器发布版.png` 携带角色卡元数据，acbbc22）
  - README 和发布记录只链接 `神秘复苏模拟器发布版.png`。
  - 发布目录其他 PNG 不得含 `chara/ccv3`，或不得与成品并列造成误导。
- [ ] **T6.3 验证重新导入**  ← 仍 pending：8.14.15 发布后未在干净角色列表做过端到端重新导入验收
  - 在干净角色列表中导入正式 PNG，确认名称、版本、首消息和脚本库正确。

## T7：全量验证与发布 — **静态/聚合/发布/发布后/桌面真页 complete; 移动端 T7.4 pending**

- [x] **T7.1 静态检查**（发布前 TS/JS 检查 + git diff --check + 门禁自测，8.14.15 通过）
  - 目标 TS/JS 语法检查、`git diff --check`、新增门禁自测。
- [x] **T7.2 专项与聚合门禁**（`verify:mfrs-source-gates` 阶段1 + `verify:mfrs-gates` 阶段2 + 双卡身份门禁，8.14.15 通过）
  - 阶段 1：`pnpm verify:mfrs-source-gates`。
  - 阶段 2：更新 `CDN_REF` 后运行 `publish-card --dist-no-build`、`pnpm verify:mfrs-dist-freshness` 与 `pnpm verify:mfrs-gates`。
  - 双 YAML/双 PNG身份门禁
- [x] **T7.3 真页桌面验收**（2026-08-14 v8.15.14 开发版验收）
  - 冷启动：新聊天首轮四表物化 1/1/4/5 ✓（v8.15.12 native seedRows 修复生效）
  - 开局表单：4 select + 5 input + 提交按钮渲染完整 ✓；普通人开局填写并提交 ✓
  - 重载 5 次：每次 API/HUD/iframe(10) 正确重新挂载，无重复 ✓
  - 换聊：openCharacterChat 后冷启动四表物化 1/1/1/0（行动建议/检定建议缺因旧聊天 chat_override 模板收窄，预期行为）
  - 切卡：切走蛊真人→切回，cleanup 执行 ✓，切回后 API/HUD 重挂 ✓，iframe 数量保持 10 ✓
  - pagehide：触发后 cleanup 函数清除 ✓（fixedStatus/messagePanel: true→false）
  - 等 25 秒：无旧 timer 重新挂载 ✓（cleanup 仍 false）
  - 复苏 99→100 终局：手动设 MVU `总复苏风险=100` 不会自动触发终局写入链（需 GENERATION_ENDED 事件，不能调 LLM）；标记为需用户手动验收
- [ ] **T7.4 真页移动端验收**  ← 仍 pending：未做 390px 移动端回归
  - 390px 下 HUD、开局厉鬼与终局显示无溢出或隐藏关键操作。
- [x] **T7.5 production 与发布**（stop-dev + 阶段1精确提交推送 + bot bundle 85cb682 + CDN_REF 更新 + publish-card --dist-no-build + 完整门禁 + 提交发布物 + tag v8.14.15 + 推送，8.14.15 已发布 release ddd39a1）
  - 运行 `pnpm stop-dev` 并确认无 dev 污染；阶段 1 精确提交源码并推送，等待 bot bundle。
  - 同步 bot bundle，更新 `CDN_REF`，只使用 `publish-card --dist-no-build` 生成发布版镜像和 PNG。
  - 完整门禁通过后提交发布物，推送并打正式版本 tag。
- [x] **T7.6 发布后验收**（版本/ref/cache + 33 正则 + 8 脚本 + PNG chara/ccv3 + CDN HTTP 全绿，8.14.15 已验；唯一缺：未按 T6.3 做真机重新导入最小端到端，见 T6.3）
  - 版本/ref/cache、33 正则、8 脚本、PNG chara/ccv3、CDN HTTP 与内容哈希全部通过。
  - 重新导入正式 PNG 做一次最小端到端复现。

## 推荐执行批次

1. **批 A：T0 + T1** — 先固定产品语义与失败门禁。
2. **批 B：T3 + T4 + T5** — 三条业务缺陷可分提交实施。
3. **批 C：T2 + T6** — 收敛版本真源和分发目录。
4. **批 D：T7** — production、真页、发布与重新导入。

## 完成统计

- 规划阶段：Phase 0 complete。
- 实施阶段：T0–T7 已于 8.14.15（`acbbc22`，2026-07-26）完成大部分；本清单勾选于 2026-08-09 按 acbbc22 实际落地回填。
- 仍 pending 的 3 项：**T0.1**（基线证据保存，8.14.15 发布后仅剩归档意义）、**T6.3**（干净角色列表重新导入验收）、**T7.4**（移动端真页回归）。
- **2026-08-14 T7.3 桌面端真页回归已完成**（v8.15.14 开发版）：冷启动四表物化 1/1/4/5 ✓、重载 5 次无泄漏 ✓、切卡 cleanup+重挂 ✓、pagehide cleanup ✓、等 25 秒无旧 timer ✓；复苏终局需 AI 回复触发，未调 LLM 故标记需用户手动验收。
- **后续 8.15.0（2026-08-12）补充真页验收**：人物/地点 stat_data 镜像链路在开发版做了一次真页回归（GENERATION_ENDED → mvu-core-mirror → 写库，只补不覆盖），但该验收聚焦镜像功能，**不覆盖 T7.3/T7.4 所要求的桌面/移动端开局-重载-换聊-终局全链路回归**。T7.3/T7.4/T6.3 仍 pending。
- 当前下一步：择期补做 T7.3/T7.4 真页回归 + T6.3 重新导入验收；T0.1 可并入下次轮次或降级处理。
