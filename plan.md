# hotfix-10：根治 save 洪流（限制假性已应用修复只扫最新楼）

## 状态：待审查 → 待你授权实施（未实施）

## 背景
hotfix-09 修了 skip 分支冗余 persist（洪流 4.4→1.4/秒），但主源未堵：历史楼 6 被 `selectFalselyAppliedRepairIndexes` 反复扫描→falselyApplied 误判→clearMarker+write+persist(saveChat)→CHAT_CHANGED→递归复核→自持续振荡 1.4/秒。实机复核（sillytavern-runtime-debug skill）确认：仅 floor 6 `at` 追踪实时（8/12/20 稳定），applier persistMarker 是 ~75% save 源，振荡非衰减。

## 根因（已实机确认，证据闭环）
`selectFalselyAppliedRepairIndexes`（controller.ts:51-64）返回**所有非 user 楼**。`repairFalselyAppliedFloors`（index.ts:818）在每次 CHAT_CHANGED（debounce 800ms）遍历这些楼，对"标记命中 + isFalselyAppliedStat=true"的楼 clearMarker+write+persistMarker(saveChat)。

`isFalselyAppliedStat` 判定 B（replace 路径比对）**无法区分两种"data ≠ 本楼协议值"**：
- 真假性（应修）：重载后 stat_data 被 MVU 重建为初值，标记留存 → 修复回本楼协议值正确
- 假假性（不应修）：本楼协议值被**后续楼合法覆盖**（floor 6 的 FANTASY-HAND-02 被 floor 8 的 FANTASY-HAND-06 覆盖）→ 判定 B 误判为假性 → "修复"回旧值 FANTASY-HAND-02 → 被后续楼再覆盖 → 永久 mismatch → 每次扫描都修 → save 洪流

设计注释（index.ts:808-814）本意是"重载后重建初值的存量历史楼"，但判定 B 把"合法覆盖"也当"假性" → 对历史楼修复**语义错误**（修复=回退到已被超越的旧值）。

## 修复（1 处，~3-5 行）
`selectFalselyAppliedRepairIndexes`（controller.ts:51-64）改为**只返回最新非 user 楼**（排除 activeGenerationMessageIndex）。

```ts
// 改前：返回所有非 user 楼（导致历史楼假假性循环）
export function selectFalselyAppliedRepairIndexes(chat, activeGenerationMessageIndex = -1): number[] {
  const indexes: number[] = [];
  for (let index = 0; index < chat.length; index += 1) {
    const message = chat[index];
    if (!message || message.is_user || index === activeGenerationMessageIndex) continue;
    indexes.push(index);
  }
  return indexes;
}

// 改后：只返回最新非 user 楼（hotfix-10：历史楼"被后续覆盖"非假性，修回旧值是回退；只最新楼无被覆盖可能）
export function selectFalselyAppliedRepairIndexes(chat, activeGenerationMessageIndex = -1): number[] {
  for (let index = chat.length - 1; index >= 0; index -= 1) {
    const message = chat[index];
    if (!message || message.is_user || index === activeGenerationMessageIndex) continue;
    return [index];
  }
  return [];
}
```

## 为什么正确且安全
1. **最新楼无"被后续楼覆盖"可能** → 其"data ≠ 协议值"只可能是真假性（重载重置）→ 修复正确。保留重载修复能力。
2. **历史楼修复本就语义错误**：修复=把数据回退到该楼协议值，但该值已被后续楼合法超越 → 回退是数据损坏，非修复。放弃它非回归，是修正。
3. **断反馈环**：floor 6/8/12/20 不再进队列 → 无 falselyApplied 修复 → 无 persistMarker(saveChat) from repair → CHAT_CHANGED 不再被 repair 触发 → 振荡止。
4. **hotfix-09 的 skip 分支修复保留**（互不冲突），两源全堵 → 洪流归零。
5. `recoverRecentRawProtocolMessages`（index.ts:857，扫最近 12 楼补写缺协议快照）不受影响 → 导入旧档补写能力保留。

## 不改的
- `isFalselyAppliedStat`（判定逻辑）不动 → 仍能识别真假性
- `repairFalselyAppliedFloors` 主体不动 → 仍对队列内楼正确修复
- `falsely-applied-controller.ts` 的 skip/write/falselyApplied 三分支不动（hotfix-09 已修 skip）
- 界面美化/消息内面板等其余 5 loader 不动

## 实施步骤
1. 改 `falsely-applied-controller.ts:51-64` selectFalselyAppliedRepairIndexes（~3-5 行）
2. tsc + check-mjr-yaml 静态门禁
3. commit src + push
4. 等 bot bundle → 重锁 mvu-protocol-applier loader sha
5. tavern_sync 重打包 PNG + chara 终验
6. 载荷终验（CDN dist 确认只返回最新楼逻辑）
7. 实机验证（重导入 PNG → hook save 5 秒 → 应≈0；floor 6 `at` 应稳定不 tick）
8. 补录契约记录

## 验收矩阵
1. tsc：编辑区零新增错误
2. check-mjr-yaml：exit 0
3. CDN 载荷：selectFalselyAppliedRepairIndexes 逻辑为"倒序找首个非 user 楼返回 [index]"
4. **实机 save 率**：hook /api/chats/save 5 秒 → 应≈0（hotfix-09 后 1.4/秒消失）
5. **floor 6 `at` 稳定**：5 秒内不 tick（不再被反复重应用）
6. 能力卡无回归：皇帝特权 + 效果正常显示
7. 最新楼重载修复保留：模拟最新楼 data 重置 → 应被修复（若可测）
8. recoverRecentRawProtocolMessages 不受影响：导入旧档补写仍工作（若可测）

## 回滚
mvu-protocol-applier loader 指回 @40b2eff2（hotfix-09）+ git revert。单 loader 粒度可独立回退。

## 残留风险
1. 真重载场景下，历史楼若被 MVU 重建为初值（非被后续覆盖），不再被修复 → 但修复本就回退旧值（数据损坏），不修反而更好；最新楼仍修
2. MVU message-scope 语义（per-floor 快照 vs 共享态）未最终核实——若 per-floor 快照，历史楼本不应被覆盖，floor 6 现象需另释；但 fix 不依赖该语义（只扫最新楼在两种语义下都断环）
3. generateRaw 失效独立于此，不修（B 合成降级另议）

## CDN 轮次
仅重锁 mvu-protocol-applier 1 loader（界面美化等 5 个不动）。与 hotfix-09 同 loader，叠加生效。

## 实施记录（2026-09-04 已实施，待实机验收）
- commit 3837fcc4：源码 selectFalselyAppliedRepairIndexes 倒序只返回最新楼 + plan
- commit bb954af5：bot 首次 bundle（dist 含 length-1;n>=0 + return[n]，旧 index=0 push 已移除）
- commit d71737b4：重锁 mvu协议应用 @40b2eff2->@bb954af5 + 重打包 PNG
- commit 9d4da809：bot 二次 bundle（仅刷 12 dist build-hash，未碰 PNG）
- 静态：tsc 编辑区零新增错误；check-mjr-yaml exit 0；feature string hotfix-10 ✓
- 载荷：dist 倒序循环 + return[n] 确认；PNG chara = {9b02f733×3, bb954af5×1(新), c4f7c820×1, eab1f7a6×1}，旧 40b2eff2 已消失
- t7 实机验收：待用户重导入 PNG（mvu协议应用 loader 切到 bb954af5）后 hook save 5 秒→应≈0 + floor 6 `at` 稳定不 tick
