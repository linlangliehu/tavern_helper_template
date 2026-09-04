# hotfix-09 计划：save 洪流根因修复（mvu-protocol-applier skip 分支冗余 persistMarker）

## 根因（Step 1 实机取证闭合，已推翻旧假设）

旧假设"历史楼假性已应用乒乓"已被实机 hook 推翻：5 秒计数 `检测到假性已应用`=0、`历史楼层假性已应用`=0、任何 `[Hotfix]` 日志=0，但 `/api/chats/save`=22（4.4/秒）。

**真根因**：`falsely-applied-controller.ts:25`（runProtocolApplicationController 的 skip 分支）冗余 persistMarker 自反馈环。

源码（falsely-applied-controller.ts DKB-K3S 行）：
```ts
if (options.markerMatches && !options.falselyApplied) {   // 标记已应用 + 数据正确
    const markerPersisted = await options.persistMarker(); // ← 冗余 saveChat
    return { action: 'skip', needsRetry: !markerPersisted, markerPersisted };
}
```

机制链：
1. 标记已设（markerMatches=true，extra[S]===applicationKey，已持久化在磁盘）+ 数据正确（!falselyApplied）→ skip 分支
2. skip 分支本应"无事可做"，却仍调 persistMarker()→saveChat（重复持久化已存标记）
3. saveChat 触发 ST 事件（MESSAGE_UPDATED/CHAT_CHANGED）→ applier 事件监听器重跑 → 又进 skip 分支 → saveChat → **4.4/秒反馈环**
4. 此路径无日志（日志只在 falselyApplied=true 时打）→ 解释为何 save 洪流但 [Hotfix] 日志全 0

为何是 bug：markerMatches=true ⟹ extra[S]===f（加载自磁盘或 write 分支已 persist）→ 标记已存盘，skip 分支重复 persist 纯冗余。标记的首次持久化由 write 分支（line C8e markApplied+persistMarker）完成。

**取证证据**：save 调用栈 `saveChat ← saveChatConditional ← te(persistMarker) ← falsely-applied-controller 内联(dist:15944/16264)`；other_hotfix 日志=0 证走 skip 分支（无日志路径）。

## 目标

消除 save 洪流（4.4/秒→0），保留"真重载抹掉"修复能力。零能力卡回归。

## 红线

1. 不破 MVU 所有权边界（只动 skip 分支的 persistMarker 调用，不动写回逻辑）
2. 不碰界面美化 loader（本修在 mvu-protocol-applier loader @80a810e0）
3. 改动预算 ≤5 行（Local Fix 范畴，实际 ~2 行）
4. 不废掉整个假性已应用修复机制——write 分支（真抹掉修复）保持不变

## 修复方案

`falsely-applied-controller.ts:25` skip 分支**不调 persistMarker**，直接返回 `markerPersisted:true, needsRetry:false`。

改动（DKB-K3S 两行 → 一行）：
```ts
if (options.markerMatches && !options.falselyApplied) {
    return { action: 'skip', needsRetry: false, markerPersisted: true };
}
```

安全性论证：
- markerMatches=true ⟹ 标记已在磁盘（加载自磁盘或 write 分支已 persist）→ skip 不 persist 不丢标记
- needsRetry:false → 不再重试 → 断反馈环
- write 分支（line C8e markApplied+persistMarker）不变 → 真抹掉修复能力保留

## 实施步骤

1. 改 falsely-applied-controller.ts:25（删 persistMarker 调用，硬编码 true）
2. tsc + check-mjr-yaml 静态门禁
3. commit src → 等 bot bundle
4. 重锁 mvu-protocol-applier loader（@80a810e0→新 sha）+ tavern_sync 重打包 PNG
5. 载荷终验（dist skip 分支逻辑）
6. 实机验证：hook save 5 秒→0 + 能力卡无回归
7. 契约补录

## 验收

1. tsc 编辑区零新增错误
2. check-mjr-yaml 63 条目不变
3. CDN 载荷 skip 分支无 persistMarker 调用
4. **实机**：hook /api/chats/save 5 秒 → 0（洪流止）
5. 实机：能力卡正常显示（皇帝特权+正典效果，无回归）
6. 实机：注入污染→守卫身份回填+合成仍工作（hotfix-07/08 不回归）
7. PNG chara：仅 mvu-protocol-applier sha 移动，其余 5 loader 不变

## 回滚

mvu-protocol-applier loader 指回 @80a810e0 + git revert。单 loader 粒度可独立回退。

## 残留风险

1. 若某调用方在 markerMatches=true 但标记未真正落盘的极边缘场景依赖 skip 分支 persist→不再 persist→标记仅内存态→重载丢失。但 markerMatches 计算自 extra（磁盘加载），此场景逻辑不成立。风险趋近 0。
2. generateRaw 失效独立于此，不修（B 的合成降级另议）。
