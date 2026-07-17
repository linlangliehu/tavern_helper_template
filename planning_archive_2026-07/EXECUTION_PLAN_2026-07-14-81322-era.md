# 神秘复苏模拟器剩余任务执行清单（2026-07-14）

> 状态：**phase_1_complete**
> 当前阶段：BF6，**12/12 完成**
> 当前线上：8.13.21 / `CDN_REF=f2b7db2…`
> 下一交付：执行 Phase 2–4，提交 BF6 并发布 8.13.22

## 使用规则

1. 严格按 Phase 顺序执行；不要把 8.13.23 的 H2 风险统一混入 8.13.22。
2. 每个 Phase 开始前重读 `git status` / `git diff`，共享工作区中的现有改动默认属于用户。
3. 每完成一个 Phase，更新 `task_plan.md`、`progress.md`、`findings.md` 和 `AUDIT_BUGFIX_BACKLOG.md`。
4. 不安装依赖、不删除/重建 `node_modules`、不启动/停止/抢占 watch。
5. 发布版 PNG 只允许由 `pnpm publish-card` 生成，禁止手改或复活 deprecated JSON。

## 当前已经完成

- [x] 审计 A/A2、BF-1、BF0、BF0.5、BF1–BF5.5
- [x] BF6：P0–P3
- [x] BF6：RM1/RM2/RM7/RM8/RM9
- [x] BF6：RH3/RH4
- [x] BF6：RH5
- [ ] 8.13.22 功能提交、production pin、publish、发布后验证

## Phase 0：允许使用的现有实现与边界

### 可复用实现

| 用途 | 现有实现 | 参考位置 |
|---|---|---|
| 解析 YAML 正则字面量 | `parseRegexExpression` | `scripts/verify-mfrs-regex-ids.mjs:63` |
| 正则跨源同步守卫范例 | `verifySpMfrsWhitelistSync` | `scripts/verify-mfrs-regex-ids.mjs:40` |
| 应用显示正则的测试工具 | `loadDisplayRegexes` / `applyDisplayFormatting` | `scripts/verify-output-cleaning-regressions.mjs:59` |
| 发布前 dist 守卫 | `verifyDistFreshness` | `scripts/publish-card.mjs:174` |
| bundle 后 PNG 守卫 | `verifyReleasePng` | `scripts/publish-card.mjs:197` |
| 发布常量单真源 | `CDN_REF` / cache / version | `scripts/mfrs-release-constants.mjs:5` |
| 活跃 MVU→DB owner | `installMvuCoreMirror` | `脚本/数据库前端/mvu-core-mirror.ts` |

### 禁止的实现方向

- 不继续扩建孤儿 `界面/状态栏/App.vue`；活跃路径是数据库前端、界面美化、HUD 和 hotfix。
- 不把发布版未收窄的正则复制回开发版；开发版是发布镜像源。
- 不通过“禁用正则”完成 RH5；保持 id、名称、顺序、启用和替换文本不变。
- 不只依赖“33 条/id 唯一/可编译”；当前错误状态已证明这些门禁不足。
- 不在完整显示链中仅断言 `<sp_status>` 文本消失；整个标签块被隐藏会制造假通过。
- 不用 `publish-card` 当作局部两行 YAML 同步工具。

## Phase 1：完成 BF6 / RH5

### 1.1 重新定界工作树

- [x] 运行 `git status --short --branch`、`git diff --check`、相关文件定向 diff。
- [x] 记录并保护当前开发版 RH5 三条已收窄表达式。
- [x] 确认发布版仅 `…2021` Name 已同步，`…2022/…2023` 仍待同步。
- [x] 将 hotfix 中无后续赋值的 `let cleanedMes` 恢复为 `const cleanedMes`，不要混入 RH5 逻辑。
- [x] 将 development watch 生成的 dirty dist 排除在 RH5 功能提交之外。
- [x] 不处理截图、`.tmp-research/`、旧素材等无关未跟踪文件。

### 1.2 先补 dev/pub 漂移门禁

- [x] 调整 `verify-mfrs-regex-ids.mjs`，让 `verifyIndex()` 返回或保留两版正则数组。
- [x] 按 id 比较开发版和发布版的 id 集合。
- [x] 对同 id 至少比较：`查找表达式`、`替换为`、`启用`。
- [x] 显式守卫两版 id/名称顺序，并深比较 `来源`、`作用于`，避免运行范围漂移仍假通过。
- [x] 当前半成品状态下先运行一次负向验证，必须准确报告 `…2022/…2023` 漂移。
- [x] 不把 ref/cache/version 等发布差异错误纳入正则行为一致性检查。

### 1.3 同步 RH5 两条表达式

- [x] 发布版 `…2022` Status 复制开发版已验证表达式：

  ```regex
  /(?<=<sp_status>(?:(?!<\/sp_status>)[\s\S]){0,3000})(^|\n)\s*Status\s*:\s*/gi
  ```

- [x] 发布版 `…2023` Location 复制开发版已验证表达式：

  ```regex
  /(?<=<sp_status>(?:(?!<\/sp_status>)[\s\S]){0,3000})(^|\n)\s*Location\s*:\s*/gi
  ```

- [x] 保持 `…2021` Name 不变。
- [x] 不改 `…2020` Title；把 backlog 的“#19–22”修正为“#20–22”，或明确 #19 有意保留。
- [x] 确认两版仍各 33 条、id/名称/顺序/启用不变。

### 1.4 增加真正的行为回归

按 id 单独应用 `…2021–2023`，再跑完整显示链：

- [x] 标签外 `Name:` 原样保留。
- [x] 标签外 `Status:` 原样保留。
- [x] 标签外 `Location:` 原样保留。
- [x] `<sp_status>` 内 Name → `姓名：`。
- [x] `<sp_status>` 内 Status → `状态：`。
- [x] `<sp_status>` 内 Location → `所在位置：`。
- [x] `</sp_status>` 后再次出现三种英文行时仍原样保留。
- [x] 同一测试同时加载开发版与发布版，输出必须一致。
- [x] 完整显示链仍保留正常中英文正文，不产生协议残块。

### 1.5 BF6 回归

- [x] `git diff --check`
- [x] `node scripts/verify-mfrs-regex-ids.mjs`
- [x] `node scripts/verify-output-cleaning-regressions.mjs`
- [x] `pnpm verify:mfrs-mvu-hotfix`
- [x] `pnpm verify:mfrs-gates`
- [x] Chrome/V8 实机验证：仅用 `chrome_devtools` 连接调试 Chrome 150；标签外、标签内、闭合标签后三组样例均通过，页面状态未改变。
- [x] 更新 RH5、BF6 为 12/12 complete。

### Phase 1 完成标准

- G3 能在制造 dev/pub 漂移时失败，恢复后通过。
- G5 不再依赖整个 `<sp_status>` 被隐藏形成假阳性。
- RH5 行为在开发版、发布版和 Chrome 中一致。
- 功能 diff 不含无关 TS 草稿或 development dist。

**完成记录（2026-07-14）：** G3/G5/hotfix/聚合门禁全部通过；负测能准确捕获 `…2022/…2023` 查找式漂移、`…2022[来源]` 漂移和正则顺序漂移；两次独立 `chrome_devtools` V8 复核通过。10 个 watch 生成的 development dist 仍保持 dirty，明确排除在 Phase 1 功能范围与后续功能提交之外。

## Phase 2：功能提交、远端 bundle 与最终 pin 候选

- [ ] 审查完整 diff，只纳入 RH5、门禁、backlog/规划记录及确属功能的文件。
- [ ] 提交 BF6 功能变更。
- [ ] 推送本地 `main`（包含当前 ahead 3 和新功能提交）。
- [ ] 等待 GitHub `bundle` workflow 完成。
- [ ] `git pull --ff-only` 吸收 `[bot] bundle`（如有）。
- [ ] 重新运行 Phase 1.5 的代码门禁。
- [ ] 确定最终远端 production-dist commit：
  - 优先使用已验证的最终 `[bot] bundle` commit；
  - 若 workflow 未产生 commit，可使用包含正确 production dist 的功能 commit；
  - 若本地 production build 与该 commit 不一致，另做纯 dist 提交并 push。
- [ ] 记录完整 SHA，作为 8.13.22 `CDN_REF` 候选。

### Phase 2 反模式

- 不 pin 未推送 commit、分支名或不含正确 production dist 的 commit。
- 不因 bot 产生 module-id 噪声就盲目反复 repin；先做功能等价性检查。
- 不使用 `git add -A` 提交共享工作区所有文件。

## Phase 3：production dist 与发版前置门

> **用户协作门：** 当前 `pnpm watch` / webpack watch / sync watch 正在运行。到本 Phase 时必须由用户协调停止；代理不得自行 kill、重启或抢占。

- [ ] 用户确认 watch 已停止。
- [ ] 重新检查 node 进程，确认没有 webpack/pnpm watch。
- [ ] 运行 `pnpm build`，不安装依赖。
- [ ] 审查完整 `git status`：build 可能重写 dist、schema.json 和开发/发布 PNG。
- [ ] 确认 production dist 不含 development `eval/sourceURL`。
- [ ] 确认 production build 后 dist 与 Phase 2 的 pin commit 一致。
- [ ] 若 dist 有真实差异：只提交必要 production dist，push，并改用该 commit 的完整 SHA。
- [ ] 确认 pin commit 已在远端可达。

### Phase 3 验证

- [ ] `git diff --check`
- [ ] `node scripts/verify-mfrs-dist-freshness.mjs --ref <SHA> --no-build`
- [ ] `git diff <SHA> -- dist/神秘复苏模拟器` 无差异。

## Phase 4：更新 8.13.22 元数据并正式发布

### 4.1 发布元数据

- [ ] `CDN_REF=<Phase 3 最终 SHA>`。
- [ ] `CDN_CACHE_VERSION` 改为新的唯一 `v81322` marker。
- [ ] `RELEASE_VERSION='8.13.22'`，同步注释。
- [ ] 开发版 `index.yaml` 的 7 个项目 ref、8 个 cache marker 与常量一致。
- [ ] 新建 `docs/mfrs-redesign-phase0/RELEASE_8.13.22.md`，复制 8.13.21 文档结构。
- [ ] README 更新顶部进度、版本表、一句话和仍写 8.13.17 的“分发”段。
- [ ] 更新 backlog、task plan、findings、progress。

> 常量已改、PNG 尚未生成时，聚合 `verify:mfrs-gates` 会因旧 PNG 仍是 8.13.21 而失败；此窗口只跑不依赖最终 PNG 的独立门禁。

### 4.2 正式 publish

- [ ] 可选预览：`pnpm publish-card 神秘复苏模拟器发布版 --dry-run`。
- [ ] 正式执行：`pnpm publish-card 神秘复苏模拟器发布版`。
- [ ] 确认 G1 自动完成 fetch、远端可达、dist clean、pin 一致、production rebuild 一致。
- [ ] 确认发布目录由开发源镜像，未复活 deprecated JSON。
- [ ] 确认自动 bundle 并通过 release-PNG 硬门禁。

### 4.3 发布后验证

- [ ] `pnpm verify:mfrs-dist-freshness`
- [ ] `pnpm verify:mfrs-gates`
- [ ] `node scripts/verify-mfrs-release-png.mjs --json`
- [ ] `git diff --check`
- [ ] `git status --short`
- [ ] PNG version = 8.13.22。
- [ ] ref = 新 pin，出现 7 次。
- [ ] cache = 新 marker，出现 8 次。
- [ ] regex = 33；scripts = 8；名称/顺序/启用不变。
- [ ] chara/ccv3 一致；无 localhost、127.0.0.1、`@main`。
- [ ] 发布版镜像差异全部符合预期。

### 4.4 发布提交

- [ ] 提交：`chore(release): publish mfrs v8.13.22 BF6 ...`。
- [ ] push release commit。
- [ ] 等待并审查后续 `[bot] bundle`。
- [ ] 不只为消除 pin/HEAD 软警告而盲目 repin。
- [ ] 通知用户重新导入 8.13.22 PNG。

## Phase 5：先清理/重写失效 backlog

在继续编码前处理下列账务，避免修死代码：

### 可直接关单或转验收

- [ ] **C1.3**：旧 JSON 已废弃；改为“publish-card 生成物验收”后关单。
- [ ] **DL3**：已并入 H9，直接关单。
- [ ] **DM9**：活跃 mirror 已无 message-id 回退；按孤儿 App.vue 归档关单。
- [ ] **M7**：现有同卡 cleanup 已传 `removeFixedStatusHost:false`；补/查回归后关单，失败才重开实现。

### 必须改写或拆分

- [ ] **H2.2**：从 `App.vue.commitStartData` 改写为 live 界面美化/hotfix/mvu-core-mirror/世界书契约任务。
- [ ] **SM1**：从禁用欢迎页 txt 重定向到 live `index.yaml` 欢迎页及界面美化脚本。
- [ ] **WB-06 附注**：已完成的 W2 自锁部分关掉；若冷启动问题仍存在，另建独立 ID。
- [ ] **SL3**：删除 App.vue 死代码子项；将 live ghostName fallback/地点回退拆成独立小项。
- [ ] **DL5**：不要随 App.vue 关单；重定位到 live `mvu-core-mirror.ts` 的 `C${messageId % 10000}` 碰撞风险。

- [ ] 更新 backlog 未完成数量和合并关单表。

## Phase 6：8.13.23 风险语义统一（批 α）

### 6.1 先冻结契约

- [ ] **H2.1**：定义唯一 `<choices>.risk` 数字格式。
- [ ] 明确绝对风险、delta、带符号字符串、中文档位的唯一转换关系。
- [ ] 明确 `总复苏风险` 使用 replace 还是 delta，并统一单位。
- [ ] 将映射表写入变量输出格式/更新规则/系统提示词/对话示例。

### 6.2 修改 live owner

- [ ] 执行改写后的 **H2.2**，不修改孤儿 App.vue。
- [ ] **H2.3**：对齐 live 风险归一化函数和枚举映射。
- [ ] 更新 `mvu-core-mirror.ts`、界面美化、HUD/hotfix 中真实消费路径。
- [ ] 同步约 8 个相关世界书契约。
- [ ] 保持选项“只填不自动发送”。

### 6.3 依赖项

- [ ] **M8**：明确 choices→MVU→DB 唯一 owner，禁止双写。
- [ ] **DM2**：仅在 H2 契约稳定后补风险相关枚举别名。

### 6.4 验证

- [ ] 数字/中文档位/旧格式迁移样例。
- [ ] 四选项 A–D 与自定义 D。
- [ ] 死亡风险、复苏风险和总复苏风险不重复结算。
- [ ] MVU、HUD、数据库镜像结果一致。
- [ ] 独立发布 8.13.23，不回灌 8.13.22。

## Phase 7：其余有效 backlog，按批次继续

### 批次 A：live 协议与所有权

- [ ] **M9**：从 `ARRAY_APPEND_PATHS` 移除 `/行动建议`，整表 add 降级为 replace；补回归。
- [ ] **M10**：消息内面板与 hotfix 使用相同 raw/变量解析链，关键 catch 打 warn。
- [ ] **M8**：若未随 H2 完成，单独完成 owner 收敛。
- [ ] **C2.4**：决定 `当前灵异事件.可见摘要` 入 schema 或从 live mirror/规则移除。
- [ ] **M5**：统一双厉鬼/双灵异物品运行期写入路径。
- [ ] **DM5**：明确 player_state 文本镜像与驾驭厉鬼表的更新边界。

### 批次 B：数据库契约

- [ ] **DM1**：统一事件纪要长度限制。
- [ ] **DM3**：确认/补 global、player 的 `row_id=1` 种子。
- [ ] **DM4**：live mysteryTables/一致性路径对齐真实 14 表。
- [ ] **DM6**：修正 check_suggestions 示例列序/typo。
- [ ] **DM2**：补非风险枚举别名；风险部分依赖 H2。
- [ ] **DL4**：统一 chronicle 模板、adapter、verifier 三方修订契约。
- [ ] **DL5**：修复 live mirror 线索编号碰撞。
- [ ] **DL6**：为驾驭厉鬼/收录档案/收录规律补 SQL 示例。
- [ ] **DL1**：修正文档“14 表/第 15 条”编号。
- [ ] **DL2**：区分 archive_code 与 ghost_code。

### 批次 C：开局与低风险文档

- [ ] **SM2**：时空锚点必选或强制自定义说明。
- [ ] **SM3 + SL2**：定义 welcome dashboard 延后/可关行为并让参数真正生效。
- [ ] **SM4 + L3 + SL1**：明确 sp_start/sp_input 遗留边界和 choices 消费者。
- [ ] 执行重写后的 **SM1/SL3** live 子项。
- [ ] **L4**：评估 EJS 模板定界符二次注入防护。
- [ ] **L5**：文档化或修复 schema.json 有损投影。
- [ ] **L9**：统一 README、更新日志、dev/release/cache 版本叙事。

## 总体完成定义

- [ ] 8.13.22 已发布并通过 G1/G2–G5/release-PNG，全量交付 BF6。
- [ ] 用户已重新导入 8.13.22 PNG。
- [ ] 失效/孤儿 backlog 已关单或改写，未完成数量可信。
- [ ] 8.13.23 H2 风险契约独立完成并发布。
- [ ] 后续批次每批都有独立门禁、发布记录和用户重导说明。
