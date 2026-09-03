# hotfix-05 契约：外科手术式删除卡 choices 系统（含回滚 hotfix-03）

制定时间：2026-09-03 ｜ 版本：v1.1（并入 P1 回滚决策 + P2 注释更新）｜ 状态：**已实机验收（hotfix-05 ✅ 无回归 + 批次02·0930事件 ✅ 强通过；ADRIA/CDOC/ACQUA 3 包待补验）**

## 背景

hotfix-03 修复 applier 清洗 `<choices>` 后，卡的 choices 系统全面恢复，但与用户预设自带的"行动选项"功能重复（双选项）。经只读排查确认：用户用过的两个预设（人间月下、当前预设）都有自带剧情选项——卡的 choices 系统在所有用户场景都冗余。且 hotfix-02 守卫（补生成）基于误诊（人间月下"有选项只是没渲染"，非"没选项"）。用户选择外科手术式删除卡的 choices 系统，让预设完全接管。

## v1.1 相对 v1.0 的变化（P1 决策）

v1.0 选择"保留 hotfix-03"（applier 不剥离 `<choices>`）。审查发现：applier 3 处注释把"保留 `<choices>`"的理由绑定到"[显示]渲染剧情选项 正则 + 按钮构建"——而本契约正要删掉这俩。删后 applier 保留了 `<choices>` 但卡内无消费者，过渡期 AI 惯性输出 `<choices>` 会裸露字面标签。

**v1.1 改为一起回滚 hotfix-03**（applier 恢复剥离 `<choices>`）：过渡干净（剥离不裸露）、卡完全不碰 `<choices>`、放弃对"`<choices>`+自渲染"预设的兼容（用户两预设都不涉及此 niche）。

## 目标

删除卡的 choices 渲染系统（守卫/构建器/缓存/委托/正则/条目 mandate），**并回滚 hotfix-03 的 applier 修改**（恢复 `<choices>` 作为内部协议剥离 + `hasInternalProtocol` 重新计入 `<choices>`）。删后：AI 不再被卡的条目指令输出 `<choices>`、卡不再渲染 `<choices>`、applier 剥离任何残留 `<choices>`（含 AI 惯性输出）→ 永不裸露字面标签、预设独占选项。卡代码库无 dormant 死代码。

## 删除/回滚清单（依赖已只读排查，零外部依赖）

### A. 界面美化/index.ts —— 删 choice 系统全部代码
**仅被 choice 系统内部互引、无开局页/状态栏/消息内面板引用（已验证）**：

| 符号 | 用途 | 唯一引用点 |
|---|---|---|
| `mfrsInjectChoiceStyles()` | 注入 choice CSS | 仅 builder（line 415） |
| `mfrsParseChoiceLines()` | 解析选项行 | 仅 builder（line 421） |
| `mfrsBuildChoiceButtons()` | 构建按钮 | 仅 mfrsEnsureChoiceUi |
| `mfrsEscapeSTScript()` | 转义 `/send\|/trigger` | 仅 choice 委托（line 470） |
| `mfrsInstallChoiceDelegate()` | 点击委托 | 仅 mfrsEnsureChoiceUi |
| `mfrsEnsureChoiceUi()` | builder+委托入口 | 3 个 call site（全是 choice） |
| `mfrsInjectChoicesContainer()` | 守卫注入容器 | 仅守卫 |
| `mfrsSynthChoicesByAi()` | generateRaw 补生成 | 仅守卫 |
| `mfrsFixMissingChoices()` | Gate 3 守卫 | 仅事件+启动 |
| 4 个 const/var（FIX_KEY/CACHE_KEY/MAX/InFlight、ChoiceUiInstalled） | 状态 | 仅上述函数 |
| choice CSS（.mfrs-choices/.mfrs-choice-btn/.mfrs-choices-row/.mfrs-choices-src） | 样式 | 仅 mfrsInjectChoiceStyles |

**Call site 清理（3 处，全是 choice）**：
- 事件处理器（line ~348-349）：删 `mfrsEnsureChoiceUi();` + `setTimeout(守卫,800);` 两行（事件回调剩 mfrsEnsureWithRetry）
- 启动 bootstrap（line ~596-599 `setTimeout` 块）：整块删（只做这两个 choice 调用，已验证）
- `mfrsInjectChoicesContainer` 内部 line 507 的 `mfrsEnsureChoiceUi()`：随函数一起删

### B. index.yaml —— 删 1 个正则条目
- `[显示]渲染剧情选项`（line ~1193-1198）：`/<choices>([\s\S]*?)<\/choices>/i` → `<div class="mfrs-choices">…</div>`。删后正则 8→7。

### C. 预设兼容层.txt + index.yaml 注册 —— 删整个条目
- `世界书/世界设定/预设兼容层.txt`：全文是 `<choices>` 输出契约。删文件。
- index.yaml `预设兼容层` 条目注册（line ~79-93）：删。世界书条目 64→63。
- 注：UV 格式权威在独立的【变量输出格式】条目，删本条不影响 UV 链路。

### D. mvu-protocol-applier/index.ts —— **回滚 hotfix-03**（v1.1 新增）
hotfix-03（commit `9c73a41c`）对 applier 做了 3 处修改，v1.1 全部回滚到 pre-hotfix-03 状态：

1. **cleanProtocolBlocks（line ~923）**：重新加回 `.replace(/<choices\b[^>]*>[\s\S]*?<\/choices>/gi, '')`——`<choices>` 恢复为"内部协议"被剥离。AI 若惯性输出 `<choices>` → 落盘时剥离 → 永不裸露字面标签。
2. **hasInternalProtocol（line ~255）**：恢复 `<choices>` 作为内部协议标志（`/<choices\b/i.test(mes)` 重新计入）。与剥离逻辑自洽（`<choices>`=内部协议→剥离+计为协议标志）。
3. **注释（line 25/255/926）**：恢复 pre-hotfix-03 措辞（`<choices>` 是纯内部协议，整段删除；不再提"[显示]渲染剧情选项 正则 + 按钮构建"——因那俩已删）。

**不动的 applier 部分**：`hasChoices:` 诊断字段（line 1008/1182，删后恒 false，无害遥测，P3 留）。

### E. 消息内面板/index.ts —— 不动（P3）
- line 138 的 `<choices\b` 防御性 guard：删 choices 系统后几乎不触发，但作为防御性正则留着无害（将来某预设输出 `<choices>` 时仍正确跳过）。**建议留**。

## 不删（保留）
- hotfix-01 能力卡占位符守卫（与 choices 无关）
- 开局页/状态栏/消息内面板/变量写回/世界书其他条目（依赖排查零交集）

## 风险（已评估）
1. **不可逆**——删后恢复需重做 hotfix-02 全套 + 重施 hotfix-03。用户已确认（两预设都有自带选项、无"`<choices>`+自渲染"场景）。
2. **放弃"`<choices>`+自渲染"预设兼容**——若将来换用 `<choices>` 标签且预设自带渲染的预设，applier 会剥离 `<choices>` → 预设渲染找不到标签 → 选项不显示。届时需重施 hotfix-03（恢复 applier 保留 `<choices>`）。用户两预设都不涉及此 niche。
3. **UV 重建兜底行为变化**——回滚 `hasInternalProtocol` 后，若 AI 惯性输出 `<choices>` 但漏 UV，`<choices>` 计为协议标志 → "从本轮摘要重建 UV"兜底不触发。但删条目后 AI 不应输出 `<choices>`，此边缘场景罕见，可接受。
4. **世界书条目 64→63、正则 8→7**——需 YAML 门禁确认结构合法。

## 验收（5 项）
1. 导入新 PNG，正常预设对话末尾**无卡的 choices 按钮行**，只出预设的"行动选项"
2. 存储层无 `<choices>` 残留（applier 剥离 + AI 不再被指令输出，连接器读证）
3. 即使 AI 偶有惯性输出 `<choices>`，落盘后被 applier 剥离 → 正文不裸露字面标签
4. 开局页/状态栏/消息内面板/变量写回/选项按钮点击（预设自带的）均正常
5. tsc/webpack/安全扫描/YAML 门禁全绿

## CDN 轮次（v1.1：两个 loader 都动）
- commit src（界面美化/index.ts + mvu-protocol-applier/index.ts + index.yaml + 删预设兼容层.txt）
- bot bundle（重建界面美化 + applier 两脚本 dist）
- **重锁两个 loader sha**：界面美化 + mvu-protocol-applier（其余 4 不变）
- tavern_sync bundle 重打包 PNG（正则+条目+两 loader sha 进 PNG）
- 载荷终验（63条目/7正则/界面美化新锁/applier新锁/无 choices 特征串/applier 含 `<choices>` 剥离正则）

## 回滚
- `git revert` 1 commit（恢复全部删除代码+条目+正则+hotfix-03 applier 状态）
- 若只想恢复 hotfix-03（保 choices 系统删除）：单独 cherry-pick / 重施 hotfix-03 的 3 处 applier 修改

## 实施前最终核查（实施时做）
- tsc 编译 0 错误（删后无悬空引用）
- grep `mfrs-choice`/`mfrs-choices`/`mfrsEnsureChoiceUi`/`mfrsFixMissingChoices` 在界面美化/index.ts 应 0 命中（确认删净）
- grep `<choices` 在 index.yaml 正则块应 0 命中（正则已删）
- grep `<choices` 在 applier 的 cleanProtocolBlocks 应有剥离正则（确认 hotfix-03 回滚）
- applier `hasInternalProtocol` 应含 `<choices` 测试（确认回滚）

## 审查记录（v1.1）
- v1.0 删除范围孤立性确认（零跨文件引用）、CDN/PNG 双路径完整、回滚可控
- **v1.1 修 P1**：v1.0"保留 hotfix-03"导致 applier 保留 `<choices>` 但卡内无消费者（卡渲染链已删），过渡期 AI 惯性输出 `<choices>` 会裸露字面标签。改为一起回滚 hotfix-03（applier 恢复剥离 + hasInternalProtocol 计入 + 注释恢复）→ 过渡干净、卡完全不碰 `<choices>`，代价是放弃"`<choices>`+自渲染"预设兼容（用户不涉及）
- P2：applier 3 处注释随 hotfix-03 回滚恢复 pre-hotfix-03 措辞
- P3：消息内面板 `<choices` guard + applier `hasChoices` 诊断字段留（无害防御/遥测）

## 实施记录（2026-09-03）
- **src 合并提交**：`ae21149c`（批次02 内容补全 + hotfix-05 删 choices 系统，+495-282 行）
  - 范围授权：批次02 当时未提交（S7 待批）与 hotfix-05 改动混在工作区，用户选 A 一并提交（批次02 待补 S6）
- **bot bundle**：`80a810e0`（重建界面美化 + applier dist）
- **loader 重锁 + PNG**：`21c5cd27`（界面美化 + applier → `@80a810e0`，PNG 重打包 1967269B）
- **载荷终验**：✅ 63条目/7正则/2新锁(@80a810e0)/4旧不变(@9b02f733)/0旧残留/0 choices特征/批次02内容在位
- **神秘复苏卡车道**：rebase 时 stash 的神秘复苏 3 文件已恢复（staged），未混入魔禁提交
- **二次 bot bundle 预期**：`21c5cd27` 推 index.yaml 触发 bot 再 bundle（dist 行为等价，`@80a810e0` 锁定有效，无需再锁）
- **验收待办**：导入 PNG → 末尾无卡按钮只出预设行动选项 / 正文无 `<choices>` 裸标签 / 开局页·状态栏·消息内面板·变量写回正常

## 验收记录（2026-09-03 实机）
- **取证方式**：MCP HTTP API（浏览器连接器未连）→ `list_chats`+`get_chat` 文件式读法读今日 10:00 聊天（9 条消息，330KB）
- **hotfix-05 ✅ 无回归**：4 轮回复全程无 `<choices>` 标签、无 `mfrs-choice` 按钮系统痕迹；正文用卡原生 `dream_option`(6 选项)/`dream_big_discuss`(`<q><a/b/c>`)——是 dream_plot 叙事结构非被删的 `<choices>` 系统，两者不冲突，删干净无回归
- **批次02·0930事件(ST0930) ✅ 强通过**：开场白选 0930 弧，AI 4 轮全程正确调用包内容且原著锚点高度吻合：
  - 前方之风（金发罗马正教神职+锁链十字架+天罚术式全域压制）✅
  - 天罚术式机制（"对她抱有敌意者"意识下调→全城昏睡）✅
  - 一方通行（反射散术式如撞钢化玻璃水花、护最后之作、电极灯闪、vs木原数多反反射装置=黑翼前奏）✅
  - 上条当麻（右手抵消术式保持清醒+"不幸啊"+赶路=幻想杀手）✅
  - 土御门元春（花衬衫+阴阳道魔法师抗性+"12小时内行动"情报+点破"神之右席前方之风"=Group线）✅
  - 时间/地点（2010年9月30日7:45→8:03、常盘台天台→学园都市边界）✅ 符合 ST0930 节点 01→对峙
- **节点推进 ✅ 不串包 ✅**：01早晨异常感知→天罚展开/前方之风登场→拦截对峙；平行事件三线同步（一方/上条/土御门，信息差正确）；4 轮全程零 ACQUA/CDOC/ADRIA 弧内容泄漏（未碰那 3 弧）
- **dream 结构完整**：dream_plot/scene/body/parallel_event/option/big_discuss/self_check 全在；AI 自检禁词/句式/信息差/节奏
- **其余 3 包（ADRIA/CDOC/ACQUA）**：未在此对话测试（选了 0930 弧），静态部署已验（4 包同标准绿灯/角色定义之前/顺序14590-14593/关键字隔离），0930 强通过=部署链路完整，待开新对话碰意大利/法国/暗部脱逃锚点补验
