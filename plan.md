# hotfix-11 契约：删 generateRaw 死路径 + 基线回填 effect/combat（进阶版）

## 背景
hotfix-08 的 B 层 forceRederive 合成依赖 `TavernHelper.generateRaw`。实机排查（§484-514）确认 generateRaw 在此 ST 环境的 kK 生成核心 promise **永不 resolve**（自 hotfix-01 起从未成功，`old_attempts=3` 旧计数触顶为证）。B 的合成路径是**死代码**，带来 3 项危害：
1. 每次触发 25s 空等（in-flight 持续，阻塞新楼层事件守卫）
2. `synthFailed` 计数 +1 → 3 次后守卫对整个聊天永久停手（连确定性身份回填都停）
3. 死代码误导维护者

## 根因（已实证，非推测）
- generateRaw（jK→kK）与 generate（AK→kK）共享 kK 派发，全部 25s 超时无 resolve
- HTTP 请求已派发（`/api/backends/chat-completions/generate` 捕到 1 次），但 kK 的 promise resolution 失效
- 排除：事件循环流畅、无生成态卡死、配置无关（silence/stream 全变体均挂）
- floor 23 实测：能力卡自愈靠 **C 条款（模型主动写 能力档案 op）**，非 B 合成

## 修法（进阶版）
删 generateRaw 调用 + 相关 synth 判定 + 死计数；**nameStale 触发时，effect/combat 从基线回填**（若基线非占位），否则纯靠 C。

### 改动点（界面美化/index.ts 守卫内）

**改动 1：删 forceRederive/needSynth 的 generateRaw 依赖**
- 删 `const forceRederive = nameStale && baseRoster.length > 0;` → 改为标识 nameStale 连带回填 effect/combat
- 删 `const needSynth = effectStale || combatStale || forceRederive;` → needSynth 不再含 forceRederive（合成已删）
- 删 `if (needSynth && !th?.generateRaw) { ... }` 整块（环境守卫不再需要，不调 generateRaw）
- 删 synthName/synthLevel 合成入参计算（不再合成）

**改动 2：删 generateRaw 调用块**
- 删 `mfrsAbilityFixInFlight = true;` → 改为只在 write 前置 true（或保留但缩短临界区到无 await）
- 删 `let synth = null; try { if (needSynth && th.generateRaw) { synth = await mfrsSynthAbilityByAi(...) } }` 整块
- in-flight 临界区缩短为只覆盖 updateVariablesWith（无 25s await）

**改动 3：patch 计算改为基线回填（进阶版核心）**
- 删 `const synthEffect/synthCombat = synth?...` 
- 加 `const baseEffect = String(baseEntry['能力效果'] ?? ''); const baseCombat = String(baseEntry['实战运用'] ?? '');`
- 加 `const baseEffectValid = !!baseEffect && !mfrsIsPlaceholderAbilityText(baseEffect);`
- 加 `const baseCombatValid = !!baseCombat && !mfrsIsPlaceholderAbilityText(baseCombat);`
- `patchEffect`：`stillEffectStale && baseEffectValid`（原占位回填）**或** `namePollutionActive && baseEffectValid`（进阶：nameStale 连带）
- `patchCombat`：同理

**改动 4：updater 写 effect/combat 用基线值**
- 删 `const nameCurrentlyPolluted = ...`（基线回填不破 MVU 边界——只写占位/污染时）
- 写条件：`patchEffect && (mfrsIsPlaceholderAbilityText(target['能力效果']) || nameCurrentlyPolluted) → baseEffect`
- 同理 patchCombat → baseCombat
- **MVU 边界保留**：nameStale 时 effect 非占位也覆盖（名称污染→整条不可信，与 hotfix-08 B 同理）；name 非 stale 时只覆盖占位

**改动 5：删死计数**
- 删 `const synthFailed = needSynth && !!th.generateRaw && !synth;`
- 删 `if (synthFailed) { insertOrAssignVariables(+1) + warn }` 整块
- 成功计数逻辑保留：`if (!synthFailed)` → 改为无条件 `insertOrAssignVariables(0)`（无合成失败计数了，总清零）

**改动 6：toastr 文案**
- 删"能力效果已由 AI 补全"（不再 AI 合成）
- patchIdentity+patchEffect → "能力档案已从开局基线恢复 ✓"
- 仅 patchIdentity → "能力档案已从开局基线恢复 ✓"
- 仅 patchEffect（无 identity，纯 effect 占位回填）→ "能力效果已从开局基线恢复 ✓"

## 边界
- 空聊/全 user → 早期 return
- nameStale 无基线 → 保守跳过+提示（不变）
- effect/combat 占位但**基线也占位**（用户没填开局表单）→ baseEffectValid=false → patchEffect=false → **不写**（靠 C 模型自纠）。对没填表单的用户无损害。
- roster 空 → updater 返回 current（不变）

## 红线
- 不动 MVU 所有权边界（name 非 stale 时只覆盖占位）
- 不动 mfrsSynthAbilityByAi 函数本身（保留供未来 generateRaw 修复后复用，或单独清理）
- ≤30 行改动，仅界面美化 1 loader
- 不动其余 5 loader / yaml / 欢迎页

## 验收
1. 静态：tsc 编辑区零新增错误 + check-mjr-yaml exit 0 + feature string hotfix-11
2. 新聊天回归：开局表单 → 能力卡正常（无回归）
3. 污染注入：末楼名称改"未知"+effect 改"风刃" → 刷新 → 守卫**即时**回填（无 25s 空等）name+level+camp+effect+combat 全从基线 + toastr ✓
4. 仅 effect 占位（name 干净）：刷新 → effect 从基线回填（若基线非占位）
5. 无基线旧聊天：effect 占位 → 跳过 effect（靠 C），名称占位 → 提示手填
6. v2 计数：成功即清零，无合成失败误耗 → 守卫永不因死合成停手
7. 实机：in-flight 临界区无 25s await → 新楼层事件守卫不被阻塞

## 回滚
界面美化 loader 指回 @c4f7c820 + git revert。单 loader 粒度可独立回退。

## 残留风险
1. mfrsSynthAbilityByAi 函数保留为死代码（不调用了）—— 可接受（未来 generateRaw 修复后可复用，或单独清理）
2. 无基线 effect 占位的用户仍靠 C—— 已是现状，非回归
3. generateRaw 失效根因（TH kK）未修—— 超出魔禁卡范畴

## 实施记录（hotfix-11）
- t1 源码：界面美化/index.ts 6 处编辑——删 forceRederive/needSynth/synthName/synthLevel/generateRaw 调用/synthFailed 守卫 + 基线回填 effect/combat + namePollutionActive=nameStale&&stillNameStale + in-flight 临界区缩短（仅 recheck+write）+ 无条件清零 + 新 toastr
- t2 静态门禁：tsc 编辑区零新增错误 / check-mjr-yaml exit 0 / feature string hotfix-11×5
- t3 提交：e85a1cff（src + plan.md）
- t4 bot bundle：0fd1b27b（dist 含 hotfix-11 逻辑：无 generateRaw + baseEffect/baseCombat 回填 + 无条件清零）
- t5 重锁 loader @c4f7c820→@0fd1b27b + tavern_sync 重打包 PNG + chara 终验 {9b02f733×3, bb954af5×1, 0fd1b27b×1, eab1f7a6×1}
- t6 bot 二次 bundle：d8b19e0f（仅刷 dist build-hash，未碰 PNG）

## 实机验收记录（待 t7）
- 阻塞中：需用户重导入 PNG 使 loader 切到 @0fd1b27b 后实机验证
- 验收点：注入污染→即时回填（无 25s 空等）+ 计数永不停手 + 能力卡无回归
