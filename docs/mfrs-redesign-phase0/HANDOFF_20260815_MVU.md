# 交接文档：MVU 变量写入问题调查（2026-08-15 中断交接）

> **状态：历史快照，已归档。** 本文记录 2026-08-15 调查中途的认知，其中「当前正式发布版 v8.15.14」等基线信息已过期。
> 该问题的最终根因与修复见 `findings.md`；当前基线与阶段状态以 `task_plan.md`、`progress.md` 为准。

> 本交接覆盖：上一会话（2026-08-14）已完成工作 + MVU 变量写入问题调查进度 + 下一步行动计划。
> 后续会话请先读本文件，再读 `TASKLIST_DUAL_CARD_AUDIT_FIX_20260726.md` 了解双卡审查全貌。

## 1. 项目状态总览

- 仓库：`D:\project\tavern_helper_template`，git main 分支，单人直接提交（精确 add 具体文件，dist 留给 bot）。
- 当前正式发布版：**v8.15.14**（CDN_REF=`1850150eb303729510f779be50d85f6e0befb11b`，CDN_CACHE_VERSION=`v81514_20260814_01`，见 `scripts/mfrs-release-constants.mjs`）。
- 远端 bot 会自动打递增 lightweight tag（已到 **v8.15.16**，非正式发布号）；下次发布前先查远端 tag 避开已打号。
- 工作区清理过：8 张重复角色卡已删到只剩最新 1 张（v8.15.14 发布版）。
- 会话开始时的 git status 快照有一批未提交改动（dist/*、src/index.yaml、vendor 等），但上一会话后续已提交推送（HEAD `f5730ea7` docs(mfrs): T7.4 移动端 390px 真页回归验收完成）。**新会话先跑 `git status` 确认实际状态，若有遗留改动先审查再处理**。

## 2. 上一会话已完成的工作

1. **发布 v8.15.14**：HUD 数据库回调按 API 实例自愈重绑（`src/神秘复苏模拟器/脚本/消息内面板/index.ts`），门禁全绿（archive-ui phase5 242 checks 含 G8aa）。
2. **T7.3 桌面端真页回归**（v8.15.14 开发版）：冷启动四表物化 1/1/4/5 ✓、重载 5 次无泄漏 ✓、切卡 cleanup+重挂 ✓、pagehide cleanup ✓、等 25 秒无旧 timer ✓。
3. **T7.4 移动端 390px 真页回归**：默认模式 7 导航键无溢出 ✓、开局表单无溢出 ✓、沉浸模式 Ctrl+Shift+G ✓、沉浸↔默认切换无溢出 ✓。
4. **角色卡清理**：酒馆里 8 张神秘复苏相关卡删到 1 张（走 `/api/characters/delete`，需先取 CSRF token）。
5. **CHANGELOG.md** 已更新 v8.15.14 条目。

## 3. 当前核心任务：MVU 变量写入问题（未完成）

### 3.1 症状

用户开新聊天对话几轮后：
- 从 idx4 开始，AI 输出的 `<UpdateVariable>` JSONPatch **没有写入楼层变量**。
- `总复苏风险` 卡在 **30**（按 delta 累计应为 55：idx2=+0、idx4=+10、idx6=+5、idx8=+10、idx10=+25、idx12=+5）。
- 行动建议卡在旧值。
- 原始协议已正确保存（`extra._mfrs_raw_protocol_message`），`mes` 清洗也正确 → **问题不在协议保存/清洗，在 patch 应用到变量层**。

### 3.2 已有证据（真页读取）

- 楼层变量 `ctx.chat[idx].variables['0']` 里的 stat_data **确实包含卡住的值**（risk=30、行动建议 4 条）——注意：这些是**未应用新 patch 的旧值**，与"Mvu 读不到"不同，是"patch 没写进去"。
- `Mvu.getMvuData()` 返回 risk=0、action=[]，与楼层变量内容不同 → **疑似读取的不是同一楼层/同一数据源**（可能读 system/global 楼层？需查）。
- **idx4 之谜**：risk 从 0 只 +10 却变成 30，中间 20 来源不明 → 可能 idx4 时 fallback 写路径生效过一次把别的值写进去了，或手动测试污染过数据。

### 3.3 关键代码路径（hotfix-generation-ended-listeners/index.ts）

```
runGenerationEndedPipeline (868-932)
  └─ 1. parseAndWriteMvuMessage (525-605)
       ├─ readMessageTextForMvu (390-396)：优先读 extra._mfrs_raw_protocol_message，fallback mes
       ├─ normalizeMfrsUpdateVariableProtocol(normalized.message)  ← protocol-normalizer.js
       ├─ seedMissingStatPaths(...)
       ├─ mvu.parseMessage(normalized.message, oldData)   ← 567-569 行
       └─ writeMvuDataWithVerification(...)
  └─ 2. scheduleMvuWriteBackRetries(...)
  └─ 3. cleanProtocolBlocks(...)
```

### 3.4 强假设：parseMessage 调用签名不匹配

- hotfix 类型声明（index.ts 行 82）：`parseMessage?: (message: string, oldData: MvuData) => Promise<MvuData | undefined>`
- **实际 Mvu.parseMessage（运行时反编译）**：`async function(t,n){const a=e(n);return await le(t,a),a}` —— `t` 疑似是 message id/索引，`n` 是 message 对象（mes 在其中）。**返回的是 `{ mes, schema }` 而非新的 stat_data 全量**。
- 手动调用 `mvu.parseMessage(lastAiIdx, { mes: raw })` 返回 `{ mes: "...", schema: "没有用别管这个" }`，**不是 stat_data** → 与 hotfix 期望的"返回新 MvuData"完全不符。
- 若 hotfix 把返回的 `{ mes, schema }` 当 MvuData 用，`hasSameStatData(oldData, newData)` 必然 false → 可能触发错误写回或验证失败后走重试/放弃。

### 3.5 待调查（新会话第一步）

1. **读 `src/神秘复苏模拟器/脚本/hotfix-generation-ended-listeners/protocol-normalizer.js`**（6472 字节，上一会话还没读到）：`normalizeMfrsUpdateVariableProtocol` 是否把消息变换成 parseMessage 无法处理的形态。
2. **确认 Mvu 0.171.0 真实 API 契约**：查 `artifact/bundle.js` 或 `Mvu.getMvuData` 的源码，确认 parseMessage 签名、语义（是不是 `(messageId, message)` + 内部读取该 message 的 mes 再应用 updateVariables，返回的 a 是 `{mes, schema}` 包装）。
   - 如果 Mvu 的更新语义是"内部读该楼层 message → 应用变量 → 写回楼层"，那么 hotfix 的正确姿势可能是调用一个**不同的入口**（也许存在 `parseMessage` 之外的方法），或直接拿到更新后的变量对象。
3. **确认实际运行路径**：在 parseAndWriteMvuMessage 里打日志/探针（或真页 evaluate），确认走的是 `mvu.parseMessage` 分支还是 fallback `applyRawProtocolToMvuData`（raw-status-writer.ts，190 行）分支。
   - fallback 分支会给所有路径加 `stat_data` 前缀（`['stat_data', ...pathParts]`），若它被触发且 oldData 结构不同，可能写错或写不进。
4. **解释 idx4 risk=30**：比对 idx2/idx4 的原始 raw protocol 实际 delta，确认是否有一次 fallback 写入。清理测试污染后重新开新聊天复测。
5. **修复时硬约束**（用户明确要求）：
   - 必须找到**真正根本问题**，避免定位假问题。
   - **避免修一个坏一个**：任何改动要跑 `pnpm verify:mfrs-source-gates`（源码门禁 20 项）+ `pnpm verify:mfrs-gates`（聚合门禁），并且真页复测原生聊天路径（native storageMode）。
   - 不主动调 LLM API（callAI/generateRaw 等一律不碰；要证据用探针等用户自己发轮被动抓）。
   - 真页验收前**必查 iframe loader URL**（开发卡切本地三件套：`toggle-dev-mode --enable` + 端口 5510 + `tavern_sync push --force`；曾在 CDN 旧代码上白测两轮的历史教训）。
   - dev server 端口 5510；CDP 调试端口 9225；`Mvu.getMvuData()` 从 iframe 外调用会报"不要对全局脚本 iframe 调用 getMessageId"，读楼层变量请直接 `ctx.chat[idx].variables['0']`。

## 4. 其余待办（低优先级）

- **T6.3**：干净角色列表重新导入正式 PNG 的最小端到端验收（名称/版本/首消息/脚本库）。
- **T0.1**：基线证据保存（版本/ref/cache/SHA-256），可并入下次轮次或降级。
- **复苏 99→100 终局验收**：需 AI 回复触发 GENERATION_ENDED，用户手动调 LLM 验收；**在 MVU 写入修复前此验收无意义**（终局链也依赖变量落盘）。
- 工作区清理：`.agent-artifacts/`（未跟踪）、34 个 git stash（可留可清）。

## 5. 环境备忘

- 用户酒馆：SillyTavern（中国 tab 环境），角色卡目录 `E:/SillyTavern/data/banyan/characters/`，升级须 UI 正式导入，禁止文件级覆盖。
- 开发版指向 localhost:5510（若已 `toggle-dev-mode --enable`）；验证前先确认 iframe 里脚本 URL。
- Windows 环境，PowerShell 为主；读含中文文件用 `Get-Content -Encoding UTF8` 或 Read 工具，防乱码结论。
- MCP Chrome DevTools 连 9225 做真页验收；表单提交用 jQuery trigger 而非 DOM click（选中文案卡在 prompt 里而非实际发送的历史教训）。
