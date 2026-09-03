# hotfix-04 契约：卡选项系统总开关（kill switch）

制定时间：2026-09-03 ｜ 版本：v1.1（并入 P1 时序修复）｜ 状态：**已审查·条件批准→待批准实施**

## 背景

hotfix-03 修复 applier 清洗 `<choices>` 后，卡的 `<choices>` 渲染系统全面恢复。但用户当前预设自带"行动选项"机制，两套叠加成双选项。用户选择"留预设的、关卡的"——由于 Gate 3 守卫硬编码无运行时开关、关正则/关条目都拦不住它（守卫自建容器补生成），必须加代码级 flag。

## 目标

加运行时 flag `__mfrs_choices_disabled`，true 时卡的 `<choices>` 渲染系统整体休眠（构建器不建按钮、守卫不补生成），让位给预设自带的选项机制。不删功能、可逆、默认 off（不影响其他场景/其他预设）。

## 最小改动（1 文件，+~16 行）

**文件**：`src/魔法禁书目录模拟器/脚本/界面美化/index.ts`

### 新增
1. const `MFRS_CHOICES_DISABLED_KEY = '__mfrs_choices_disabled'`
2. 模块级缓存 `let mfrsChoicesDisabled = false`
3. **async helper `mfrsRefreshChoicesDisabled()`**：读 `getVariables({type:'chat'})` 里该 key，`String(v ?? 'false') === 'true'` 则置 true；异常保守 false（不休眠）

### 改动点
4. **事件处理器回调改 async（P1 核心）**——`mfrsInstallBaselineHooks` 里 `ensureEvents.forEach` 的 `eventOn(eventName, () => {...})` 改为 `eventOn(eventName, async () => { await mfrsRefreshChoicesDisabled(); mfrsEnsureWithRetry(); mfrsEnsureChoiceUi(); setTimeout(() => void mfrsFixMissingChoices(), 800); })`。**刷新必须在构建器之前**（实测原顺序：构建器同步先跑→守卫 800ms 后才异步刷新，会令 kill switch 失效；P1 修复把刷新提到最前）
5. **`mfrsBuildChoiceButtons`（构建器，sync）开头**：`if (mfrsChoicesDisabled) return;`——正则渲染出的 `.mfrs-choices` 容器留 DOM 但 `display:none`，不可见、不建按钮
6. **`mfrsFixMissingChoices`（守卫，async）开头**：`await mfrsRefreshChoicesDisabled(); if (mfrsChoicesDisabled) return;`——双保险（事件已刷新，守卫自洽）
7. **启动 bootstrap（line ~596 `setTimeout`）**：也加一次 `await mfrsRefreshChoicesDisabled()` 后再 `mfrsEnsureChoiceUi()`（首楼 sp_start 本就豁免，但保持一致）

### 不动
- `[显示]渲染剧情选项` 正则（保留——它把 `<choices>` 藏进 `display:none`，避免用户看到字面 `<choices>` 标签）
- `预设兼容层` 条目（AI 仍可输出 `<choices>`，反正被藏不可见；用户想省 token 可自行在 ST 关条目，非必需，P2 建议）
- `mvu-protocol-applier`（hotfix-03 保留 `<choices>` 行为不变——存储层留着供历史回传强化格式一致性，显示层被 flag 休眠）
- 变量写回契约/状态栏/消息内面板（flag 只影响 choices 显示层）

## 用户操作（运行时，非代码）
- **关卡的 choices**：`/setvar __mfrs_choices_disabled true`（或 ST 变量面板设 true）
- **恢复卡的 choices**：`/clearvar __mfrs_choices_disabled` 或设 false
- 无需重新导卡，设变量即时生效下一楼（事件处理器下一轮即读到新值）

## 红线（沿用 hotfix 系列）
- 不引入数值判定/风险/失败收场
- 不动变量写回契约/状态栏/消息内面板
- flag 只影响 choices 显示层，不触发任何存储/执行路径

## 验收（4 项）
1. flag=true：末楼无卡按钮，预设"行动选项"独占
2. flag=false/无：卡按钮正常（恢复双选项或切回人间月下时卡按钮独占）
3. flag=true 时 `__mfrs_choices_fix_fails` 不增长（守卫真休眠，不补生成不计失败）
4. 其余面板/状态栏/变量写回不受影响

## CDN 轮次
commit src → bot bundle → **重锁界面美化 loader sha**（仅 1 个，其余 5 不变）→ PNG 重建 → 载荷终验

## 回滚
- flag 设 false 即恢复（运行时）
- 代码层 `git revert` 1 commit

## 审查记录（v1.1）
- v1.0 契约方向正确、范围最小、红线完整、安全低风险、契约链自洽、CDN 完整
- **v1.1 修 P1**：原契约"守卫刷新缓存、构建器读缓存"时序错误——实测事件接线为"构建器同步先跑、守卫 800ms 后异步刷新"，flag=true 时构建器读到旧缓存(false)照建按钮，kill switch 失效。修复：事件处理器改 async、最前 await 刷新；守卫与 bootstrap 也刷新（双保险）
- P2 建议：用户设 flag=true 后可同时关 `预设兼容层` 条目省 token（非必需）；构建器 flag 早退后容器无幂等标记会轻微重扫，接受不优化
