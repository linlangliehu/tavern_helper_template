# 神秘复苏模拟器双卡审查缺陷修复任务清单

> 范围：`神秘复苏模拟器` 开发卡与 `神秘复苏模拟器发布版`。  
> 基线：两卡内容版本均标记 `8.14.0`；本清单只规划，不代表已实施。  
> 执行原则：只改开发源，发布版由 `publish-card` 生成；禁止手改发布 PNG。

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

- [ ] **T0.1 保存基线证据**
  - 记录开发/发布 YAML 与两个正式 PNG 的版本、ref、cache、SHA-256。
  - 记录当前 `pnpm verify:mfrs-gates` 结果和 `verify:mfrs-dist-freshness` 的已知失败。
- [x] **T0.2 决定复苏 100 终态：独立“厉鬼复苏”终态**
  - 无有效豁免时写 `状态=厉鬼复苏`，与 `状态=死亡` 明确区分。
  - 该状态仍是本次模拟的终态：`is_dead=true`、`主线进度.阶段状态=模拟结束`、`行动建议=[]`，正文输出【模拟结局】且禁止继续输出 `<choices>`。
  - 死机、鬼与鬼压制等有效豁免必须在达到阈值的同一轮写明生效条件、资源/状态变化和阈值处理结果；没有明确落盘的豁免不得阻止终局。
- [x] **T0.3 决定发布目录 PNG 布局：只保留一个可导入 PNG**
  - 唯一允许携带 `chara/ccv3` 的成品为 `神秘复苏模拟器发布版.png`。
  - 头像若必须保留，应迁入明确的资源路径或清除角色卡元数据，不能作为第二张可导入卡存在。

### T0 验收

- 两项产品决策已写入本清单。
- 后续测试期望不包含“厉鬼复苏或极端濒死”这种未决二选一。

## T1：建立失败门禁（先红后绿）

- [ ] **T1.1 双卡身份门禁**
  - 扩展 `scripts/verify-mfrs-release-png.mjs` 或提取公共解析模块。
  - 同时校验开发 YAML、开发 PNG、发布 YAML、正式发布 PNG的 `RELEASE_VERSION`、`CDN_REF`、`CDN_CACHE_VERSION`。
  - mutation：将任一 ref 换成 `9c5a467` 时必须失败。
- [ ] **T1.2 开局厉鬼契约门禁**
  - 在 `scripts/verify-mfrs-mvu-hotfix-regressions.mjs` 增加双 root 断言。
  - 欢迎消息必须明确初始化 `/驾驭厉鬼` 与 `/驭鬼者状态/已驾驭厉鬼`。
  - 增加普通人、单鬼、双鬼三组结构样例。
- [ ] **T1.3 固定状态栏生命周期门禁**
  - 扩展 `scripts/verify-mfrs-archive-ui-regressions.mjs`。
  - 静态门禁要求 disposer 被保存、cleanup 存在 `clearTimeout`，并禁止 `eventOn(...); return;` 无 owner 模式。
  - 优先增加带 fake event/timer 的运行测试：安装两次→触发换聊→cleanup 后 listener=0、timer=0、mount=0。
- [ ] **T1.4 复苏终局契约门禁**
  - 对开发/发布规则同时断言 T0 决策要求的完整写集。
  - 检查终态不得继续输出 `<choices>`，且 `/行动建议` 必须清空。
- [ ] **T1.5 发布目录唯一成品门禁**
  - 解析目录中所有 PNG 的 `chara/ccv3` chunk。
  - 按 T0 决策断言只有 `神秘复苏模拟器发布版.png` 可导入。

### T1 验收

- 五类缺陷在未修源码上均能被对应门禁稳定捕获。
- 测试失败信息指出具体卡片、字段或生命周期 owner，不能只报布尔失败。

## T2：统一开发卡、发布卡和 PNG 运行身份

- [ ] **T2.1 确认当前 production dist 提交**
  - 完成源码修复和 `pnpm verify:mfrs-source-gates` 后精确提交并推送源码，不提交本地 dist。
  - 等待 GitHub Actions `[bot] bundle` 权威构建 production dist，记录其完整 SHA。
  - 不自行安装依赖；若环境缺包，停止并提示用户维护依赖。
- [ ] **T2.2 更新发布单真源**
  - 只更新 `scripts/mfrs-release-constants.mjs` 中版本、CDN ref 和 cache。
  - 开发卡不再长期保留独立旧 pin。
- [ ] **T2.3 扩展生成流程**
  - 让 `publish-card`/相关生成步骤从单真源同步开发 YAML、发布 YAML与最终 PNG。
  - mutation 验证旧 ref 不可能静默通过。
- [ ] **T2.4 清除 dist freshness 漂移**
  - `pnpm verify:mfrs-dist-freshness` 必须通过。

### T2 验收

- 四个载体版本/ref/cache 完全一致。
- URL 中无 localhost、`main`、`master` 或旧 `v81336` marker。

## T3：修复开局厉鬼 canonical 数据链

- [ ] **T3.1 定义单一映射函数/模板**
  - 输入旧开局对象 `{厉鬼名称, 杀人规律}`。
  - 输出运行对象至少包含合法 `代号`、`杀人规律` 及 schema 所需默认字段。
  - 映射必须保证 `代号 !== 未命名厉鬼`。
- [ ] **T3.2 更新开局消息生成**
  - 修改 `src/神秘复苏模拟器/index.yaml` 对应的欢迎页内联生成逻辑。
  - 明确同时初始化旧表单字段和运行期嵌套数组；普通人保持两个数组为空。
- [ ] **T3.3 按真源顺序同步契约**
  - `schema.ts` → 变量输出格式 → 系统提示词 → 对话示例 → 开局锚点规则 → 前端解析。
  - 删除互相冲突的“只写嵌套”和“开局只写顶层”模糊表述。
- [ ] **T3.4 旧存档兼容**
  - 只在加载旧存档时提供一次性、幂等迁移；不得每轮重复追加厉鬼。
  - 保持已驾驭厉鬼整表 `replace` 约束。

### T3 验收

- 普通人、单鬼、双鬼开局进入首轮后，HUD 与数据库内容准确。
- 重载和继续对话不会重复累积同一厉鬼。
- 两张卡的规则文件仍逐字一致。

## T4：修复固定状态栏生命周期

- [ ] **T4.1 统一订阅 owner**
  - 保存 `eventOn(CHAT_CHANGED, ...)` 的 disposer。
  - fallback `eventSource.on/off` 继续保留，但两条路径进入同一幂等 cleanup。
- [ ] **T4.2 统一 timer owner**
  - 持有 `retryMount` timer 与换聊的 0/250/1000ms timers。
  - 新一轮操作先取消旧 timers；cleanup 清空全部 timers。
  - 可复用项目内已有 epoch/timer ownership 模式，不新增无主 scheduler。
- [ ] **T4.3 阻止旧实例复活**
  - cleanup 后旧 continuation 必须检查 owner/epoch，不能再次挂载 DOM。
- [ ] **T4.4 群聊支持决策**
  - 若支持群聊：增加 `groupId`/群成员身份识别与真页用例。
  - 若不支持：明确文档限制，不把它混入本轮核心修复。

### T4 验收

- 连续重载 5 次后换聊，每次只发生一组挂载任务。
- cleanup 后等待 25 秒，状态栏不会被旧 timer 重新挂载。
- `pagehide`、切卡、换聊和脚本重装均不残留 listener/timer。

## T5：闭合总复苏风险 100 终局

- [ ] **T5.1 按 T0 决策更新变量规则**
  - 明确阈值判断、豁免、消耗、终态和完整 JSON Patch 写集。
- [ ] **T5.2 同步系统提示与输出格式**
  - 复用现有“风险值达到 100”的闭合范式，不另造旧英文路径或 `op:add`。
- [ ] **T5.3 同步前端显示**
  - HUD/数据库对终态显示一致；终态不再展示可点击的存活行动建议。
- [ ] **T5.4 增加边界样例**
  - 99→100 无豁免。
  - 99→100 有明确死机/压制豁免。
  - 已达 100 的旧存档载入。

### T5 验收

- 三个样例的正文、变量、阶段和 choices 完全符合 T0 决策。
- 不出现 `状态=存活` 但已“厉鬼完全复苏”的矛盾组合。

## T6：发布目录与分发收敛

- [ ] **T6.1 按 T0 决策处理头像源**
  - 更新 `publish-card.mjs` 的 `syncFiles` 或资源路径。
  - 不直接删除仍被 `头像:` 引用的文件。
- [ ] **T6.2 明确唯一导入入口**
  - README 和发布记录只链接 `神秘复苏模拟器发布版.png`。
  - 发布目录其他 PNG 不得含 `chara/ccv3`，或不得与成品并列造成误导。
- [ ] **T6.3 验证重新导入**
  - 在干净角色列表中导入正式 PNG，确认名称、版本、首消息和脚本库正确。

## T7：全量验证与发布

- [ ] **T7.1 静态检查**
  - 目标 TS/JS 语法检查、`git diff --check`、新增门禁自测。
- [ ] **T7.2 专项与聚合门禁**
  - 阶段 1：`pnpm verify:mfrs-source-gates`。
  - 阶段 2：更新 `CDN_REF` 后运行 `publish-card --dist-no-build`、`pnpm verify:mfrs-dist-freshness` 与 `pnpm verify:mfrs-gates`。
  - 双 YAML/双 PNG身份门禁
- [ ] **T7.3 真页桌面验收**
  - 普通人、单鬼、双鬼开局。
  - 重载 5 次、换聊、切卡、pagehide、等待 25 秒。
  - 复苏 99→100 的普通与豁免路径。
- [ ] **T7.4 真页移动端验收**
  - 390px 下 HUD、开局厉鬼与终局显示无溢出或隐藏关键操作。
- [ ] **T7.5 production 与发布**
  - 运行 `pnpm stop-dev` 并确认无 dev 污染；阶段 1 精确提交源码并推送，等待 bot bundle。
  - 同步 bot bundle，更新 `CDN_REF`，只使用 `publish-card --dist-no-build` 生成发布版镜像和 PNG。
  - 完整门禁通过后提交发布物，推送并打正式版本 tag。
- [ ] **T7.6 发布后验收**
  - 版本/ref/cache、33 正则、8 脚本、PNG chara/ccv3、CDN HTTP 与内容哈希全部通过。
  - 重新导入正式 PNG 做一次最小端到端复现。

## 推荐执行批次

1. **批 A：T0 + T1** — 先固定产品语义与失败门禁。
2. **批 B：T3 + T4 + T5** — 三条业务缺陷可分提交实施。
3. **批 C：T2 + T6** — 收敛版本真源和分发目录。
4. **批 D：T7** — production、真页、发布与重新导入。

## 完成统计

- 规划阶段：Phase 0 complete。
- 实施阶段：T0–T7 pending。
- 当前下一步：完成 **T0.1 基线证据**，然后编写 **T1 失败门禁**。
