# hotfix-06 契约：关系卡片去重（协议层 + 防御层）

制定时间：2026-09-03 ｜ 版本：v1.1（P1：协议层主推 replace 整数组，删 remove+reinsert 索引路径）｜ 状态：**✅ 已实机验收（2026-09-03）**

## 背景

2026-09-03 实机验收批次02·0930事件时发现：关系折叠卡片出现重复条目（两个前方之风、两个白井黑子、两个御坂美琴）。只读排查定性：

- **渲染层无责**：`消息内面板/index.ts:346-389` `buildRelationCardHtml` 直接读 `data.NPC关系` 数组→排序→map，**无去重**（by design，信任数据）。
- **根因在协议歧义**：`变量更新规则.yaml` 与 `变量输出格式.yaml` 对 NPC关系的更新指令——新 NPC 给了具体语法 `op:"insert" 到 /NPC关系/-`，但**已存在 NPC 的更新**只写"update the matching object"（语义无具体 op/路径）→ AI 想更新已存在 NPC 的好感度/关系时退回唯一的具体 op（insert）→ 同一 NPC 被插多次。
- **证据吻合**：重复的 3 个 = 玩家在 0930 弧反复互动的 3 个（美琴/黑子/前方之风），每次"互动→关系需更新"触发一次误 insert。
- **卡内已有成功先例**：`变量输出格式.yaml` 的 `/任务追踪` 行（L2Z）给了具体更新语法（"remove + re-insert 或 replace whole array"），AI 没报重复任务 → NPC关系镜像此模式即可。

## 目标

双重保险：①协议层根治（给 AI 具体的"更新已存在 NPC"语法，消除误 insert）；②防御层兜底（渲染按 角色名 去重，即使 AI 仍误 insert 也不显示重复）。

## 改动范围（3 文件）

### A. 协议层（2 yaml，根治）

**A1. `世界书/变量/变量更新规则.yaml` line F2t**（NPC关系 bullet）：

现文：
```
- 引入新 NPC 时 op:"insert" 到 /NPC关系/-；正文末尾关系折叠面板按好感度从高到低排序显示。只能在已经明确发生互动时添加，不要凭空给 NPC 扣上关系。
```

改为（并入更新已存在 NPC 的具体语法，镜像 任务追踪 L2Z 模式）：
```
- 引入新 NPC 时 op:"insert" 到 /NPC关系/-；正文末尾关系折叠面板按好感度从高到低排序显示。只能在已经明确发生互动时添加，不要凭空给 NPC 扣上关系。更新已存在 NPC 的好感度/关系/认知/能力字段时，必须用 op:"replace" 整个 /NPC关系 数组（含修正后的完整列表）；禁止对已存在 NPC 再次 op:"insert" 导致同名重复。
```

**A2. `世界书/变量/变量输出格式.yaml` line mHa**（NPC关系 bullet）：

现文：
```
- /NPC关系 is an object array reflecting known NPCs and their 好感度/认知. Append newcomers with op:"insert" at /NPC关系/-. Keep 好感度 in 0-100. When an NPC's affiliation/relations change, update the matching object. Sort order is by 好感度 descending. /NPC关系 only tracks player-visible relationships; never invent hidden loyalty or plot inside it.
```

改为（把"update the matching object"具体化为 replace whole array，索引无关已验证）：
```
- /NPC关系 is an object array reflecting known NPCs and their 好感度/认知. Append NEWCOMERS with op:"insert" at /NPC关系/-. Keep 好感度 in 0-100. When an EXISTING NPC's affiliation/relations/认知/ability change, you MUST op:"replace" the WHOLE /NPC关系 array with the corrected full list (index-free, mirrors /能力档案 pattern); NEVER op:"insert" a duplicate for an existing NPC. Sort order is by 好感度 descending. /NPC关系 only tracks player-visible relationships; never invent hidden loyalty or plot inside it.
```

### B. 防御层（1 脚本，兜底）

**`脚本/消息内面板/index.ts` `buildRelationCardHtml`（line 346-348）**：

现文：
```ts
  let npcs = Array.isArray(data.NPC关系) ? data.NPC关系 : [];
  // 好感度从高到低排序
  npcs = [...npcs].sort((a: any, b: any) => {
```

改为（sort 前按 角色名 去重，保留数组中**最后出现**的条目=最近一次更新）：
```ts
  const rawNpcs = Array.isArray(data.NPC关系) ? data.NPC关系 : [];
  // 防御去重：按 角色名 去重，保留最后出现的条目（最近一次更新），避免 AI 误 insert 同名重复
  const seen = new Set<string>();
  const deduped: any[] = [];
  for (let i = rawNpcs.length - 1; i >= 0; i--) {
    const name = String(rawNpcs[i]?.角色名 ?? '').trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    deduped.unshift(rawNpcs[i]);
  }
  let npcs = deduped;
  // 好感度从高到低排序
  npcs = [...npcs].sort((a: any, b: any) => {
```

**去重策略说明**：逆序遍历 + unshift = 保留每个 角色名 在原数组里**最后出现**的条目（=最近一次 insert 的版本，含最新好感度/关系状态）。无名（角色名空）的条目跳过（面板已有"未命名"兜底，但脏数据不显示更安全）。逆序+unshift 保原相对顺序，sort 后按好感度降序——与原行为一致，仅去重。

## 不改动

- applier / mvu-protocol-applier：通用 JSONPatch 应用，不加字段特定去重（侵入性强、易伤其他数组）
- 变量结构 / initvar：schema 不变
- 其余 5 脚本：不碰
- 渲染其余 3 卡片（玩家/能力/任务）：任务卡已有"replace whole array"指令不重复，不强制加去重（保持改动最小）

## 红线（沿用）

- 不引入风险/失败收场/反噬
- 去重只影响显示层；变量数据不动（AI 仍可通过正确协议更新；防御层只是兜底显示）
- 不破坏 dream 结构 / 状态栏 / 变量写回 / hotfix-05 删 choices 成果

## 验收（4 项）

1. **防御层即时见效**：导入新 PNG 后，**当前已存在重复的旧聊天**末楼关系卡也应去重显示（防御层读变量时去重，不依赖 AI 改行为）——这是验证防御层生效的最快方式
2. **协议层长期**：开新对话或继续玩，反复与同一 NPC 互动（如美琴）多轮，关系卡不再出现同名重复
3. **无回归**：4 卡片正常渲染、好感度排序正确、新 NPC 正常新增（去重不误删真新角色）
4. **变量检查**：ST 变量面板里 /NPC关系 在 AI 用对协议后应无重复（防御层不写变量，但 AI 改行为后数据应干净）

## CDN 轮次

commit src（2 yaml + 消息内面板 index.ts）→ bot bundle（重建消息内面板 dist）→ 重锁**消息内面板 loader**（仅 1 个，界面美化/applier/其余 3 不变）→ tavern_sync 重打包 PNG（嵌入新 yaml + 新 loader sha）→ 载荷终验（63 条目不变/7 正则不变/消息内面板新锁 ×1/去重特征串在 dist）

## 回滚

- 协议层：git revert yaml 改动（AI 恢复旧 insert 行为）
- 防御层：git revert index.ts 改动（渲染恢复不去重）
- 两者独立可分别回滚；防御层回滚后若协议层生效也不会重复（AI 行为已修），但失去兜底

## 风险评估

- **协议层**：低风险。v1.1 主推 op:"replace" 整个数组（镜像已验证的 /能力档案 + /已完成节点 模式，索引无关、AI 无歧义）。v1.0 的"remove + re-insert"路径经审查证伪——MVU 的 remove 对数组要求数字索引（applier raw-status-writer.ts:4bX parseIndex+splice），AI 不知道索引不可靠，故 v1.1 删除该路径。唯一残留风险是 AI 仍忽略指令——但防御层兜底。
- **防御层**：极低风险。逆序去重保留最后=最近更新，逻辑明确；无名条目跳过（脏数据不显示）。唯一边缘：若 AI 对同一 NPC 用不同 角色名 写法（如"美琴"vs"御坂美琴"）则不去重——但卡的 角色名 字段一贯用全名，此边缘罕见，可接受。

---

## 实施记录（2026-09-03）

- **提交链**：`14346374`(src：2 yaml 协议层主推 replace + index.ts 防御层去重, +13-3 行) → bot `eab1f7a6`(重建消息内面板 dist) → `6b0cc821`(loader 重锁消息内面板→@eab1f7a6, PNG 1968477B) → 载荷终验通过（3 锁在位/63 条目/7 正则/协议去重中英文都在/旧锁无残留）
- **CDN 范围**：仅重锁消息内面板 1 个 loader；界面美化+applier@80a810e0/其余 4@9b02f733 不变

## 验收记录（2026-09-03 实机）

- **取证方式**：chrome-devtools MCP 连上 ST 浏览器（127.0.0.1:8000），在页面跑只读 JS，**同时读变量原始数据 + 渲染后 DOM**（双层证据；MCP 连接器 STScript 不支持嵌套中文键 /getvar，改用 chrome-devtools 直读页面 context）
- **变量层（message-scope `stat_data.NPC关系`）**：✅ count=4，npcNames=[后方之水,五和,初春饰利,上条当麻]，全部唯一零重复
- **渲染层（关系卡片 DOM）**：✅ 卡片头"关系4 人"，4 个 NPC 子卡（五和/初春饰利/后方之水/上条当麻）各出现 1 次，好感度/关系类型/状态描述正常
- **协议层生效**：变量数据本身就干净（AI 用 replace 整数组而非误 insert，未产生重复）
- **防御层在位**：本轮数据干净未触发去重，但代码已部署作兜底（将来 AI 偶尔失误会兜住）
- **无回归**：dream 结构完整 / hotfix-05 删 choices 成果保持（无 `<choices>` 标签）/ 面板正常读 message-scope 渲染
- **结论**：hotfix-06 实机验收通过，关系卡片重复问题已修复，协议层 + 防御层双层生效
