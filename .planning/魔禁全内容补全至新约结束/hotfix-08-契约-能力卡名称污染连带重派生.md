# hotfix-08 契约：能力卡名称污染连带重派生效果（B+C）

**状态**：已实施·待实机验收
**前置**：hotfix-07（已上线，loader@a8e5e35b）
**性质**：Local Fix（1 脚本 + 1 yaml，<80 行）
**GATE**：Local Fix Only

## 背景

hotfix-07 上线后实机验收发现：守卫对"名称被污染"的楼能正确基线回填名称/等级/阵营、并合成占位的实战运用，但**能力效果若已是"非占位的错位散文"**（如旧 hotfix-01 错位合成的"风刃"遗产），占位黑名单识别不到 → 不修 → 风刃随 MVU 楼层继承逐楼搬运。

根因：守卫只认"占位文案字符串"，无法识别"语义错位但合法的散文"。

## 目标

1. **B（卡内自治，发布用户保护）**：当 `nameStale`（名称被污染）触发身份基线回填时，**连带把能力效果/实战运用也强制重派生**——因为名称都污染了，整条能力档案不可信，效果即便非占位也应重生成。用**重合成**（B' 变体）而非基线硬恢复：让 AI 用干净基线名重新生成，不假设基线即正典（对开局未填效果的发布用户也成立）。
2. **C（提示词降概率）**：变量更新规则.yaml 加"名称-效果语义一致性"条款，让模型在后续轮次自纠"B 抓不到的单 op 直写错配"场景。
3. **顺带**：修 hotfix-07 A4 的 v2 计数 key 瑕疵（line `attempts !== 0` 门控致首次成功不写回 key）。

## 边界（红线）

- **修不了琳琅档既有风刃**：琳琅档名称已被 hotfix-07 修干净，nameStale=FALSE → B 不触发。琳琅档风刃需 A（手动回填）清理，不在本契约范围。
- **B 仅防未来新污染**：发布用户遇到"模型写污染名+错效果"时确定修复。
- **残留**：模型单 op 直写"正确名+错效果且永不重写能力档案"——B 抓不到（nameStale 不满足）、C 仅降概率。极低概率，接受。
- 不碰其余 5 个 loader；不动 chat 级基线；不动历史楼（C2 P2）。

## 实施

### Layer B（脚本：界面美化/index.ts，~+10/-3 行）

在 hotfix-07 守卫的 `identityBackfill` 路径扩展：

1. `needSynth` 计算加入 `nameStale` 触发项：
   ```
   const forceRederive = nameStale && baseRoster.length > 0;  // 名称污染→效果/运用即便非占位也重派生
   const needSynth = effectStale || combatStale || forceRederive;
   ```
2. 合成入参不变（已用基线干净名 synthName）。
3. 写回 updater 内，效果/运用的写条件扩展：
   ```
   const nameCurrentlyPolluted = identityBackfill && mfrsIsPlaceholderIdentityText(target['能力名称']);
   if (synthEffect && (mfrsIsPlaceholderAbilityText(target['能力效果']) || nameCurrentlyPolluted))
     target['能力效果'] = synthEffect;
   if (synthCombat && (mfrsIsPlaceholderAbilityText(target['实战运用']) || nameCurrentlyPolluted))
     target['实战运用'] = synthCombat;
   ```
   - synthEffect/synthCombat 计算也含 forceRederive：`(stillEffectStale || (forceRederive && stillNameStale)) && synth ? ... : ''`
4. v2 key 瑕疵修复：`else if (attempts !== 0)` → `else`（成功总是写回 0，确保 key 创建）。

### Layer C（yaml：变量更新规则.yaml，+1~2 行）

在【本篇能力与魔法结算】块 L14 身份资产条款后追加：
```
- 名称-效果一致性：若「能力效果」「实战运用」描述的能力与「能力名称」明显不匹配（如名称是"皇帝特权"但效果描述风系/气流能力），本轮必须用 op:"replace" 重写为与名称一致的具体描述；不确定时保持原值不动。
```

## 验收

1. 静态：tsc 编辑区零新增错误；check-mjr-yaml OK；特征串 `__mfrs_force_rederive` / `nameCurrentlyPolluted` / yaml 新条款命中。
2. 实机注入测试：新楼手动写"能力名称=未知（待玩家填写）+能力效果=风刃描述"→ 刷新 → 守卫回填名+重合成效果为对齐内容 + toastr。
3. 回归：新聊天开局表单→能力卡正常显示（无回归）；纯效果占位（nameStale false）→ 维持 hotfix-07 行为不误伤。
4. CDN：仅重锁界面美化 1 loader。

## 回滚

界面美化 loader 指回 @a8e5e35b + yaml git revert。

## 实施记录

- Layer B：界面美化/index.ts 4 处编辑完成——①needSynth 加 forceRederive（nameStale && 基线存在）；②patchEffect/patchCombat 纳入 namePollutionActive；③updater 写条件加 nameCurrentlyPolluted（名称当前仍污染则覆盖非占位效果/运用）；④修 v2 key 瑕疵（移除 attempts!==0 门控，成功总写回 0）。
- Layer C：变量更新规则.yaml 在身份资产条款后插入【hotfix-08 名称-效果一致性】条款（模型自纠 B 抓不到的单 op 直写错配）。
- 静态门禁：tsc 编辑区零新增错误（4 处预存错误 486/1107/1112/1194 均在编辑区外）；check-mjr-yaml OK（63 条目/7 正则不变）；特征串 forceRederive/namePollutionActive/nameCurrentlyPolluted/hotfix-08 命中。
- CDN 轮次完成：src 提交 68124737 → bot 首次 bundle c4f7c820 → 重锁界面美化 loader @c4f7c820 + tavern_sync 重打包 PNG(c7b627c8) → bot 二次 bundle 504bbd07（仅刷 12 个 dist build-hash 行，未碰 PNG）。
- 载荷终验：CDN @c4f7c820 界面美化 dist 经 fetch 取回，minified 逐行确认 hotfix-08 全部逻辑在位——A=g&&E.length>0(forceRederive)、C=h||b||A(needSynth+forceRederive)、D=A&&s(namePollutionActive)、V=(d||D)&&!!I / P=(f||D)&&!!O(patch)、r=D&&m(o['能力名称'])(nameCurrentlyPolluted)、写条件 V&&(c(o['能力效果'])||r)、v2 key 无条件写 0（移除 attempts!==0 门控）。
- PNG chara 终态：界面美化@c4f7c820×1 / mvu协议应用@80a810e0 / 消息内面板@eab1f7a6 / 其余3@9b02f733——仅界面美化移动，其余 5 个不变。
- 顺带修：v2 key 瑕疵（首次成功不写回 key）已随本 hotfix 修复。

## 验收记录

- 静态验收：CDN 载荷 hotfix-08 逻辑逐行确认（见实施记录）；PNG chara sha 终态正确；tsc/yaml 门禁通过。
- 实机验收：待用户重导入更新后 PNG + 注入测试（新楼手动写"未知名+风刃效果"→ 刷新 → 守卫回填名+重合成效果）。琳琅档既有风刃无法由 B 自动修（名称已干净，nameStale=FALSE 不触发），需 A 手动回填（另议）。
