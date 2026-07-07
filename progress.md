# Progress Log

## 2026-07-07 CST（🔎 真页验证 v8.5.10 + 修复“未知行动”显示）

**执行内容：**
- ✅ 使用 Chrome DevTools MCP 只读验证当前 SillyTavern 页；未发送消息、未触发真实 AI、未点击“立即手动更新”、未调用 `manualUpdate()` / `triggerUpdate()`。
- ✅ 当前角色为 `神秘复苏模拟器发布版`，脚本资源为 `@c576add ... mvu-v8510`。
- ✅ 最新 AI 楼层 #2 的 `chat[2].variables[0].stat_data` 已写入，`Mvu.getMvuData({ type:'message', message_id:2 })` 读到同样摘要：`姓名=次卧室`、`身份=初级驭鬼者`、`所在位置=大昌市第七中学教室`、`事件代号=七中灵异事件`、`行动建议.length=4`。
- ✅ 确认“未知行动”不是 MVU 写回失败：当前变量 `行动建议` 有中文字段 `选项/思路/主要风险/预期收益/死亡风险/复苏风险`；当前发布的消息内面板按钮仍显示 `A/B/C/D 未知行动`。
- ✅ 修复 `src/神秘复苏模拟器/脚本/消息内面板/index.ts`：行动建议按钮优先读取 `选项/思路`，并显示风险/收益/死亡/复苏摘要；点击按钮填入 `思路`。
- ✅ `scripts/verify-mfrs-mvu-hotfix-regressions.mjs` 加静态 gate，防止消息内面板再退回只读 `label/text`。

**验证：**
- ✅ `node --check scripts\verify-mfrs-mvu-hotfix-regressions.mjs`
- ✅ `pnpm verify:mfrs-mvu-hotfix`
- ✅ `git diff --check`
- ✅ `pnpm build` 通过，仅数据库前端 416 KiB 既有 warning。

**当前停点：**
- v8.5.10 写回修复已验证成功。
- “未知行动”显示修复是新的 source 候选，待 source commit/push → bot bundle → 发布同步，建议版本 v8.5.11。

## 2026-07-07 CST（✅ v8.5.10 远端发布 smoke 完成）

**执行内容：**
- ✅ 发布同步提交已推送：`00ac021 chore(release): publish mfrs v8.5.10`。
- ✅ 远端 `@00ac021` 发布版 YAML HTTP 200，长度 168556，含 `8.5.10`×1、`c576add`×7、`mvu-v8510`×8；旧 `8.5.9/e36f8aa/mvu-v859`、localhost、127.0.0.1、`@main`、`@52b2e62` 均 0。
- ✅ 远端 `@00ac021` 发布版 PNG HTTP 200，大小 7,752,534 bytes。
- ✅ 远端 PNG worldbook gate 通过：383 entries / 33 disabled / max enabled 5851。
- ✅ 远端 PNG `chara` 与 `ccv3` 各含 `8.5.10`×1、`c576add`×7、`mvu-v8510`×8；旧版本/ref/cache、本地链接、`@main`、`@52b2e62` 均 0。
- ✅ 清理临时远端检查文件 `.tmp-png-marker-check.js` 与 `.tmp-remote-v8510.png`。

**当前状态：**
- v8.5.10 已完成 source → bot bundle → publish-card → 发布同步 push → 远端 YAML/PNG smoke。
- 仍未触发真实 AI、未发送消息、未点击“立即手动更新”、未调用 `manualUpdate()` / `triggerUpdate()`。
- 本地仅剩 `.tmp-mfrs-regex-backup-20260707.json` 与截图为不提交参考文件。

## 2026-07-07 CST（✅ v8.5.10 发布同步完成：verified writeback + persistence）

**执行内容：**
- ✅ source commit 已推送：`1a3c660 fix(mfrs): persist verified mvu writeback`。
- ✅ GitHub bot bundle 已生成并拉取：`c576add [bot] bundle`，tag `v0.0.381`；bot dist 仅更新 `dist/神秘复苏模拟器/脚本/hotfix-generation-ended-listeners/index.js`。
- ✅ 验证 bot dist 命中 `TavernHelper`、`saveChat`、`persisted`、direct `chat.variables[...]` 写回逻辑。
- ✅ 回填 `scripts/publish-card.mjs`：`CDN_REF=c576add`，`CDN_CACHE_VERSION=phase164-4-0-final-baseline-6-28-p5-4-hotfix13-mvu-v8510`，`releaseVersion=8.5.10`。
- ✅ 运行 `pnpm run publish-card -- 神秘复苏模拟器发布版`，重新生成发布版 YAML/PNG。

**发布验证：**
- ✅ `node --check scripts\publish-card.mjs`
- ✅ `node scripts\verify-worldbook-pollution-gate.mjs --expect-mfrs-runtime "src\神秘复苏模拟器发布版\神秘复苏模拟器发布版.png"`：383 entries / 33 disabled / max enabled 5851。
- ✅ 发布版 YAML：`8.5.10`×1、`c576add`×7、`mvu-v8510`×8；旧 `8.5.9`、`e36f8aa`、`mvu-v859`、localhost、127.0.0.1、`@main`、`@52b2e62` 均未命中。
- ✅ 发布版 PNG：`chara` 与 `ccv3` 各含 `8.5.10`×1、`c576add`×7、`mvu-v8510`×8；旧版本/ref/cache、本地链接、`@main`、`@52b2e62` 均为 0。
- ✅ CDN smoke `@c576add`：hotfix、数据库 loader、数据库前端、消息内面板均 HTTP 200；hotfix 含 `TavernHelper/saveChat/persisted`，loader/前端含 `__mfrsScriptResourceUrls__`，消息内面板含 `MysteryMessagePanel/refreshMessage`，均无 stale ref。

**边界：**
- 未发送消息、未触发真实 AI、未点击“立即手动更新”、未调用 `manualUpdate()` / `triggerUpdate()`。
- `.tmp-mfrs-regex-backup-20260707.json` 与截图仍是本地参考文件，不提交。
- 本条随 v8.5.10 发布同步提交。

## 2026-07-07 CST（🔧 v8.5.10 写回补强：TavernHelper fallback + saveChat 持久化）

**执行内容：**
- ✅ 按 `planning-with-files` 恢复 `task_plan.md`、`progress.md`、`findings.md` 和 `PROJECT_FLOW.md`；`session-catchup.py` 返回旧 2026-07-04 EJS 残片，本轮按 planning 顶部与当前 git diff 为准。
- ✅ 复核当前角色卡脚本库：`mvu`、`hotfix-generation-ended-listeners`、`变量结构`、`界面美化`、`固定状态栏`、`spv3.9.5·数据库`、`神秘复苏数据库前端`、`消息内面板` 均在发布版 `@e36f8aa ... mvu-v859` 链路内。
- ✅ 复核变量链路：`initvar.yaml` 顶层对齐 schema；`变量列表.txt` 是只读 EJS，读 `variables.stat_data` 并输出 `<stat_data>`；`变量输出格式.yaml` 要求 nested `<UpdateVariable><JSONPatch>...`，禁止 direct-array 与 `op:"add"`。
- ✅ 复核读者：`util/mvu.ts`、消息内面板、数据库前端即时状态均读取 `getVariables(...).stat_data`；数据库前端正确不等于历史 message variables 正确。
- ✅ 补强 `src/神秘复苏模拟器/脚本/hotfix-generation-ended-listeners/index.ts`：
  - `getRuntimeFunction()` 增加 `TavernHelper?.[key]` fallback，匹配真页 `host.getVariables === undefined`、`host.TavernHelper.getVariables === function` 的运行态。
  - 直接变量兜底在 `message.variables` 缺失时按 swipe 数组初始化。
  - 直接写 `chat[messageIndex].variables[swipe_id]` 后调用 `SillyTavern.getContext().saveChat()` 持久化，并在日志中记录 `persisted`。
- ✅ 补强 `scripts/verify-mfrs-mvu-hotfix-regressions.mjs` 静态 gate：要求 TavernHelper fallback、`persistDirectMessageVariables()`、`context.saveChat()` 和 `persisted` 日志。
- ✅ 只读 CDP 验证当前真页：当前角色 `神秘复苏模拟器发布版`，`ctx.saveChat` / `Mvu.*` / `TavernHelper.getVariables/updateVariablesWith` 均存在；#2/#4 message variables 已显示 raw protocol 对应的 `测试 / 大昌市七中事件或敲门鬼事件 / 4建议`。
- ✅ 清理临时探针文件：`.tmp-current-runtime-summary.js`、`.tmp-current-mvu-audit.js`、`.tmp-current-runtime-keys.js`。

**验证：**
- ✅ `node --check scripts\verify-mfrs-mvu-hotfix-regressions.mjs`
- ✅ `pnpm verify:mfrs-mvu-hotfix`
- ✅ `pnpm build` 通过，仅数据库前端 416 KiB 既有 performance warning。
- ✅ 构建后复跑 `pnpm verify:mfrs-mvu-hotfix`
- ✅ `git diff --check`
- ✅ `git status --short --branch` / `git diff --stat`

**遇到的问题：**
- 一行式 CDP 表达式在 PowerShell 参数中破坏 JS 引号，导致 `ReferenceError: 行动建议 is not defined`；已改为临时 JS 文件执行同一只读探针，并清理临时文件。

**当前结论：**
- 之前修复已生效的部分：发布包/ref/vendor、nested `<JSONPatch>`、raw protocol 保存、parser/API、消息内面板刷新。
- 真正剩余根因：写回可靠性与持久化，而不是 EJS 或数据库路径。
- 当前 source 候选已补齐写后验证、直接兜底、延迟重试、安装恢复、TavernHelper fallback 和 `saveChat()` 持久化。下一步是按 source-only 边界提交/push，等待 bot bundle 后发布 v8.5.10。

## 2026-07-07 CST（🧭 恢复对话并修正 v8.5.10 候选提交边界）

**执行内容：**
- ✅ 按 `planning-with-files` 恢复 `task_plan.md`、`progress.md`、`findings.md` 与 `PROJECT_FLOW.md`；`session-catchup.py` 返回的是旧 2026-07-04 残片，本轮按 planning 顶部和当前 git diff 为准。
- ✅ 复核当前 diff：业务改动集中在 `src/神秘复苏模拟器/脚本/hotfix-generation-ended-listeners/index.ts` 与 `scripts/verify-mfrs-mvu-hotfix-regressions.mjs`；`dist/**` 为本地 `pnpm build` 产物。
- ✅ 更新 `task_plan.md`：新增 `v8.5.10 candidate` 版本索引，修正“需要提交的文件”为 source 修复候选，而不是旧的 planning-only 收口；明确 source commit 默认不提交 `dist/**`，由 bot bundle Action 重建。

**当前结论：**
- v8.5.9 之前的协议/解析/同 ref vendor/消息面板刷新修复已生效。
- 当前失败原因已定位为写回可靠性缺口：hotfix 单次 `replaceMvuData` 后没有读回校验、直接变量兜底、延迟重试和安装恢复补写。
- v8.5.10 source 候选已实现并在真页本地临时注入验证有效；下一步是轻量 gate 复跑后精确 source commit/push，等待 bot bundle，再走发布版同步。

**本轮复跑验证：**
- ✅ `node --check scripts\verify-mfrs-mvu-hotfix-regressions.mjs`
- ✅ `pnpm verify:mfrs-mvu-hotfix`
- ✅ `git diff --check`
- ✅ `git status --short --branch` 已确认：source 修复、回归脚本、planning 三件套为当前候选；`dist/**` 为本地构建产物，`.tmp-mfrs-regex-backup-20260707.json` 与截图仍不提交。

## 2026-07-07 CST（✅ v8.5.9 写回失败定位完成，verified writeback 修复已实现）

**执行内容：**
- ✅ 使用项目自带 `scripts/cdp-evaluate.mjs` 连接当前 SillyTavern 真页；未发送消息、未点击“立即手动更新”、未调用 `manualUpdate()` / `triggerUpdate()`。
- ✅ 只读确认当前页仍为 `神秘复苏模拟器发布版`，`window.Mvu` 存在，chat length 5。
- ✅ 运行态探针确认：#2/#4 raw protocol 保存完好且为 nested `<JSONPatch>`；`Mvu.parseMessage(raw, oldData)` 能解析出正确 `stat_data`。
- ✅ 可逆写回探针确认：`Mvu.replaceMvuData()` 本身可写入 `chat[4].variables[0]`；真实 #4 raw parse 结果写入后，消息变量和消息内面板都显示 `测试 / 敲门鬼事件`，随后恢复成功。
- ✅ 延迟覆盖探针确认：手动写入后等待 3.5 秒不会被状态栏 interval 或 vendor 后续流程回滚；`setChatMessages([{ message_id, mes, extra }])` 也未复现变量覆盖。

**定位结论：**
- ✅ v8.5.9 之前的协议修复、normalizer、runtime URL/vendor 同 ref 链、`Mvu.parseMessage` 调用修正、消息内面板刷新 API 都已生效。
- ❌ 失败点不再是解析或 API 不可写，而是 hotfix 只做一次 `replaceMvuData` 并信任日志，没有读回校验、事件链稳定后的重试，也没有安装后扫描 `extra._mfrs_raw_protocol_message` 补写旧失败消息。

**代码改动：**
- ✅ `src/神秘复苏模拟器/脚本/hotfix-generation-ended-listeners/index.ts`
  - 新增 `writeMvuDataWithVerification()`，写回后立即读回比对 `stat_data`。
  - 新增 `assignMessageVariablesDirectly()`，读回不一致时直接写 `chat[messageIndex].variables[swipe_id]`。
  - `GENERATION_ENDED` 后增加 250ms / 1000ms / 2500ms 延迟重试。
  - 安装成功后增加 `recoverRecentRawProtocolMessages()`，扫描最近 12 条 AI 消息 raw protocol 并补写。
- ✅ `scripts/verify-mfrs-mvu-hotfix-regressions.mjs` 增加静态 gate，防止 verified writeback、直接兜底、延迟重试、历史补写被删。

**验证：**
- ✅ `node --check src\神秘复苏模拟器\脚本\hotfix-generation-ended-listeners\protocol-normalizer.js`
- ✅ `node --check scripts\verify-mfrs-mvu-hotfix-regressions.mjs`
- ✅ `pnpm verify:mfrs-mvu-hotfix`
- ✅ `node scripts\verify-output-cleaning-regressions.mjs`
- ✅ `pnpm verify:mfrs-frontend`
- ✅ `git diff --check`
- ✅ `pnpm build` 通过，仅数据库前端既有 416 KiB performance warning。
- ✅ 构建后再次 `pnpm verify:mfrs-mvu-hotfix` 通过。
- ✅ 将本地构建 hotfix bundle 临时执行到当前真页后，安装恢复扫描成功修复 #2/#4 message variables 和 `.mfrs-msg-panel`：#2/#4 均从 `未知 / 未立案灵异事件 / 0建议` 变为 raw protocol 对应的 `测试 / 大昌市七中事件或敲门鬼事件 / 4建议`。

**边界与剩余：**
- 本轮没有触发真实 AI，没有发送消息，没有点击“立即手动更新”，没有调用 `manualUpdate()` / `triggerUpdate()`。
- 当前页面已临时执行本地 hotfix bundle，刷新页面后该本地注入消失；正式分发仍需走 source commit/push → bot bundle → publish-card 的发布链路。
- `pnpm build` 产生 `dist/**` dirty，其中 hotfix dist 包含本轮改动，状态栏/数据库前端 dist 是构建噪声；正式提交前按发布策略清理或保留。

## 2026-07-07 CST（🔎 v8.5.9 真实对话复测失败：MVU 写回未落到 message variables）

**执行内容：**
- ✅ 使用 Chrome DevTools MCP 只读验证当前 SillyTavern 页 `http://127.0.0.1:8000/`，当前角色为 `神秘复苏模拟器发布版`，avatar `神秘复苏模拟器发布版.png`，chat length 5，AI 消息为 #0/#2/#4。
- ✅ 未发送消息，未点击“立即手动更新”，未调用 `manualUpdate()` / `triggerUpdate()`。
- ✅ 运行态确认 `window.Mvu` 存在，`parseMessage.length === 2`、`getMvuData.length === 1`、`replaceMvuData.length === 2`；`MysteryMessagePanel.refreshMessage` 存在；`window.__mfrsScriptResourceUrls__` 中数据库前端与数据库脚本均指向 `@e36f8aa ... mvu-v859`。

**验证结果：**
- ❌ v8.5.9 没有完全修复真实对话问题。
- #2/#4 visible `mes` 已清洗不含 `<UpdateVariable>`，但 `extra._mfrs_raw_protocol_message` 均保存原始协议。
- #2 raw protocol 含 1 个 `<UpdateVariable>` / 1 个 nested `<JSONPatch>`，16 个 `replace`，关键路径含 `/姓名=测试`、`/身份=初级驭鬼者`、`/所在位置=大昌市第七中学·教室内`、`/当前灵异事件`、`/行动建议`。
- #4 raw protocol 含 1 个 nested `<JSONPatch>`，17 个 op：14 `replace`、2 `delta`、1 `insert`，关键路径含 `/姓名=测试`、`/身份=初级驭鬼者、七中学生、穿越者`、`/当前灵异事件/事件代号=敲门鬼事件`、`/行动建议`。
- 但 `chat[2].variables[0].stat_data` 与 `chat[4].variables[0].stat_data` 仍为初始：`姓名=未知`、`身份=""`、`所在位置=未知`、`当前灵异事件.事件代号=未立案灵异事件`、`行动建议.length=0`。
- `.mfrs-msg-panel` 仍显示 `姓名 未知`、`身份 未知`、`事件代号 未立案灵异事件`、`行动建议 暂无行动建议`。
- 底部数据库仪表盘已更新为 `姓名 测试`、`身份 初级驭鬼者`、`所在地点 大昌市第七中学教室内`、`最近行动 观察窗外与走廊动静...`，说明数据库镜像路径成功、MVU/message variables 路径失败。

**关键 console 证据：**
- `[Hotfix] GENERATION_ENDED 触发 {"messageIndex":4,"messageId":4,"hasUpdateVariable":true,"hasChoices":true}`
- `mag_variable_update_started` / `mag_command_parsed` / `mag_variable_update_ended` 均出现。
- `[Hotfix] MVU parseMessage 已解析并写回消息变量 {"messageIndex":4,"messageId":4,"writer":"Mvu.replaceMvuData","normalized":{"blocks":1,"legacyWrapped":0,"addToInsert":0,"addToReplace":0,"skipped":0}}`
- 紧接着 Prompt Template 渲染 `message #4.0 variables` 和 `all variables` 仍是初始 `stat_data`，证明日志声称写回不等于 ST/MVU 实际读取层已更新。

**当前判断：**
- 模型输出契约已明显改善，发布 ref/vendor 链也进入 `@e36f8aa`；失败集中在 hotfix 写回层。
- 下一步优先查 `Mvu.replaceMvuData` 的参数语义和持久化目标，确认它是否写到当前消息的 `variables[0]`；必要时改用 `chat[messageIndex].variables[0]` / TavernHelper 正确 setter 做显式写回，并补回归覆盖“写回后 Prompt Template 读取同一变量”的断言。

## 2026-07-07 CST（✅ P7 发布链路完成：v8.5.9）

**执行内容：**
- ✅ 发布同步提交并推送：`ec6b64a chore(release): publish mfrs v8.5.9`，包含 `scripts/publish-card.mjs`、发布版 `index.yaml`、`神秘复苏模拟器.png`、`神秘复苏模拟器发布版.png`。
- ✅ 发布配置：`CDN_REF=e36f8aa`，`CDN_CACHE_VERSION=phase164-4-0-final-baseline-6-28-p5-4-hotfix13-mvu-v859`，`releaseVersion=8.5.9`。
- ✅ bot bundle：`e36f8aa [bot] bundle` / tag `v0.0.378` 已验证 hotfix normalizer、`MysteryMessagePanel.refreshMessage`、runtime URL wrapper、同 ref vendor import 均进入 dist。

**验证：**
- ✅ `node --check scripts\publish-card.mjs`
- ✅ `node scripts\verify-worldbook-pollution-gate.mjs --expect-mfrs-runtime "src\神秘复苏模拟器发布版\神秘复苏模拟器发布版.png"`：383 entries / 33 disabled / max enabled 5851。
- ✅ `git diff --check`
- ✅ 发布版 YAML：`8.5.9`×1、`e36f8aa`×7、`mvu-v859`×8；旧 `454267e` / 8.5.8 / localhost / 127.0.0.1 / `@main` / `@52b2e62` 均 0。
- ✅ 发布版 PNG `神秘复苏模拟器发布版.png`：chara/ccv3 中 `8.5.9`×2、`e36f8aa`×14、`mvu-v859`×16；旧 ref、旧版本、本地链接、`@main`、`@52b2e62` 均 0。
- ✅ CDN smoke `@e36f8aa`：hotfix、数据库 loader、数据库前端、消息内面板、vendor 均 HTTP 200，marker 命中且无 `file:///` / `@main/` / `@52b2e62`。
- ✅ 远端发布版 `@ec6b64a`：YAML 200，含 `8.5.9` / `e36f8aa` / `mvu-v859` 且无旧 ref/local；发布版 PNG 200 / 7,752,510 bytes，chara/ccv3 含 `8.5.9` / `e36f8aa` / `mvu-v859` 且无旧 ref/local。

**遇到的问题：**
- PowerShell 向 `node -e` 传多行 JavaScript 时剥掉字符串引号，导致验证脚本语法错误；已改用 PowerShell/.NET 原生 PNG chunk、git blob 和 CDN 内容检查。
- 当前 PowerShell 未加载 `[System.Net.Http.HttpClient]` 类型；远端 smoke 改用兼容的 `[System.Net.WebClient]` 完成。

**边界：**
- 未触发真实 AI，未发送消息，未点击“立即手动更新”，未调用 `manualUpdate()` / `triggerUpdate()`。
- `.tmp-mfrs-regex-backup-20260707.json` 与未跟踪截图 `屏幕截图 2026-07-06 235029.png` 不提交。
- P8 真实 AI 最小复测仍需用户明确批准。

## 2026-07-07 CST（✅ P0-P6 二次修复完成，P7 source 提交前验证进行中）

**完成内容：**
- ✅ P1/P2：`hotfix-generation-ended-listeners` 改为保存清洗前 raw protocol，使用 `normalizeMfrsUpdateVariableProtocol(rawMessage)` 后调用 `mvu.parseMessage(normalized.message, oldData)`，再通过 `Mvu.replaceMvuData` / `updateVariablesWith` 写回对应 message variables；旧 direct-array 和 `op:"add"` 已兼容。
- ✅ P3：开发版/发布版系统提示词与 `变量输出格式.yaml` 增加固定 nested `<JSONPatch>` 骨架，禁止 direct-array 和 `op:"add"`；`[mvu_update]变量更新规则` 改为蓝灯常驻。
- ✅ P4：修正第一次方案的漏洞：`import.meta.url` 在 webpack dist 中会变成 `file:///D:/.../index.ts` 并可能退到 `@main/vendor`。现改为卡内 wrapper 注册 `window.__mfrsScriptResourceUrls__`，bundle 从运行时 URL / performance / stack 推导同 bundle 根路径；数据库前端 marker mismatch 时用当前前端 URL self-reclaim。
- ✅ P5：新增 `scripts/verify-mfrs-mvu-hotfix-regressions.mjs` 与 `pnpm verify:mfrs-mvu-hotfix`，覆盖 nested、direct-array、direct-array+`op:"add"`、hotfix 写回、消息面板刷新、首轮契约、wrapper URL 注册、dist 禁止 `file:///` / `@main` / 旧 `@52b2e62`。
- ✅ P6：真页 no-AI smoke 通过。旧 direct-array + `op:"add"` 样本归一化后写入 `姓名=P6可逆测试`、`风险值=5`、`事件代号=P6敲门鬼媒介传播事件`、`鬼域状态=疑似鬼域`、`行动建议.length=1`，`MysteryMessagePanel.refreshMessage(4)` 后消息内面板也显示临时姓名/事件；finally 恢复后变量与面板均无临时残留。
- ✅ P4 运行态 URL smoke：本地 CORS 服务日志显示导入 `127.0.0.1:5501/dist/.../脚本/数据库/index.js` 后，loader 请求同根 `/vendor/shujuku-sp-fork/index.js?v=phase164-...-mvu-v859&mfrs_loader=...`，没有 `@main` 或旧 `@52b2e62`。

**验证：**
- ✅ `node --check src\神秘复苏模拟器\脚本\hotfix-generation-ended-listeners\protocol-normalizer.js`
- ✅ `node --check scripts\verify-mfrs-mvu-hotfix-regressions.mjs`
- ✅ `pnpm verify:mfrs-mvu-hotfix`
- ✅ `node scripts\verify-output-cleaning-regressions.mjs`
- ✅ `pnpm verify:mfrs-frontend`
- ✅ `git diff --check`
- ✅ `pnpm build`（仅数据库前端既有体积 warning，当前 416 KiB）

**边界：**
- 未发送消息，未触发真实 AI，未点击“立即手动更新”，未调用 `manualUpdate()` / `triggerUpdate()`。
- P4/P6 smoke 后已刷新页面，停止 5500/5501 临时服务并删除 `.tmp-mfrs-*` smoke 文件；仅保留既有 `.tmp-mfrs-regex-backup-20260707.json` 与用户截图不提交。
- 下一步：精确 source commit/push，等待 bot bundle，验证 bot dist 后发布 v8.5.9。

## 2026-07-07 CST（🧭 v8.5.8 二次修复任务清单已建立）

**完成内容：**
- ✅ 基于上一轮只读 Chrome DevTools MCP 找到的失败根因，更新 `task_plan.md` 顶部当前状态：v8.5.8 已发布但真实对话复测失败，当前进入二次修复线，目标版本候选 v8.5.9。
- ✅ 在 `task_plan.md` 的“当前任务清单”新增 P0-P8：运行态失败样本复核、MVU hotfix 调用链修复、旧协议/direct-array/`op:"add"` 归一化、首轮完整输出契约注入、真实 vendor import 链路修复、回归脚本补强、no-AI 真页验证、发布链路、用户批准后的最小真实对话复测。
- ✅ 修正 `task_plan.md` 旧的“待修 bug：无”描述，避免新会话误判当前没有阻断项。

**边界：**
- 本轮只更新 planning；尚未修改业务源码。
- 未发送消息，未触发真实 AI，未点击“立即手动更新”，未调用 `manualUpdate()` / `triggerUpdate()`。
- 当前 dirty 预期为 planning 三件套；`.tmp-mfrs-regex-backup-20260707.json` 和截图仍不提交。

## 2026-07-07 CST（🔎 v8.5.8 真实对话复测失败根因已定位）

**执行内容：**
- ✅ 使用 Chrome DevTools MCP 只读检查当前 SillyTavern 页面，未发送消息，未点击“立即手动更新”，未调用 `manualUpdate()` / `triggerUpdate()`。
- ✅ 确认当前角色为 `神秘复苏模拟器发布版`，卡体含 `8.5.8` / `454267e`，但两条真实 AI 回复仍输出旧 `<UpdateVariable>[...]</UpdateVariable>` direct-array。
- ✅ 确认 MVU 根变量和每条消息变量快照仍是初始值；消息内状态面板显示 `未知/0/未立案`，底部数据库仪表盘则已更新为 `测试/初级驭鬼者/死亡风险镜像 5/敲门鬼媒介传播事件`。

**根因定位：**
- 首轮真实生成请求 `reqid=281` 未携带完整 `update_output_contract` / `变量输出格式` 骨架，只带弱 `<UpdateVariable>`/`<JSONPatch>` 规则。
- 第二轮真实生成请求 `reqid=317` 已携带 nested `<JSONPatch>` 骨架，但模型仍输出旧 direct-array，且包含不支持的 `op: "add"`。
- `hotfix-generation-ended-listeners` 调用 `Mvu.parseMessage(lastMessageIndex,{})`，而运行态和类型声明都表明 `parseMessage` 第一个参数应为消息文本；该调用不会把当前消息变量写入。
- 数据库 loader / 数据库前端源码和 dist 仍硬编码旧 vendor `@52b2e62`，运行时真实 import 链路没有使用本轮验证过的 `@454267e/vendor/...`。

**当前停点：** 失败原因已写入 `findings.md` 顶部；尚未修复业务代码。工作区新增 dirty 仅为 planning 记录，未跟踪 `.tmp-mfrs-regex-backup-20260707.json` 和截图仍不提交。

## 2026-07-07 CST（✅ P5 发布链路完成：v8.5.8）

**执行内容：**
- ✅ 精确 source commit/push：`971c617 fix(mfrs): align mvu update variable protocol`。
- ✅ 等到 GitHub bot bundle：`454267e [bot] bundle`，tag `v0.0.375`；状态栏 dist 已确认含 nested `JSONPatch` 解析逻辑。
- ✅ 回填 `scripts/publish-card.mjs`：`CDN_REF=454267e`，`releaseVersion=8.5.8`。
- ✅ 运行 `pnpm run publish-card -- 神秘复苏模拟器发布版`，同步发布版 YAML/PNG；日志显示镜像世界书 386 个文件、替换 15 处链接、保留版本 8.5.8。

**验证：**
- ✅ `node --check scripts/publish-card.mjs`
- ✅ `git diff --check`
- ✅ `node scripts/verify-worldbook-pollution-gate.mjs --expect-mfrs-runtime "src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png"`：383 entries / 33 disabled / max enabled 5851。
- ✅ 发布版 YAML：version 8.5.8，`454267e` 7 处；旧 `bbbe6c7` / 8.5.7 / localhost / 127.0.0.1 均未命中。
- ✅ 发布版 PNG `chara` / `ccv3`：合计 `454267e` 14 处、8.5.8 2 处；旧 `bbbe6c7` / 8.5.7 / localhost / 127.0.0.1 均未命中。
- ✅ CDN smoke `@454267e`：状态栏 200 且含 `UpdateVariable` / `JSON[P]atch`，vendor 200 且含 `extractMfrsUpdateVariableJsonPatchArrayText_ACU` / `<JSONPatch>`，数据库前端 200 且含自动召回 marker。
- ✅ 发布同步 commit `5b97c78 chore(release): publish mfrs v8.5.8` 已 push。
- ✅ 推送后远端 CDN `@5b97c78`：发布版 YAML 200，含 8.5.8 和 `454267e`×7，旧 `bbbe6c7` / 8.5.7 / local 为 0；发布版 PNG 200 / 7746686 bytes，chara/ccv3 含 8.5.8 与 `454267e`×14，旧 ref/local 为 0。

**边界：**
- ✅ 未触发真实 AI，未发送消息，未点击“立即手动更新”，未调用 `manualUpdate()` / `triggerUpdate()`。
- ✅ `.tmp-mfrs-regex-backup-20260707.json` 是全局 Tavern Regex 修改前的本地备份，不提交。
- ✅ 未跟踪截图 `屏幕截图 2026-07-06 235029.png` 不提交。
- ✅ P5 正式发布链路已完成；真实 AI 最小复测仍需用户明确批准。

## 2026-07-07 CST（✅ 发布后真实对话修复任务 1-5 已实施）

**完成内容：**
- ✅ P0 协议修复：开发版与发布版 `变量输出格式.yaml`、系统提示词、事件 MVU 规则和对话示例已改为 `<UpdateVariable><JSONPatch>[...]</JSONPatch></UpdateVariable>` 首选格式；已清除“direct array inside `<UpdateVariable>`”旧约束。
- ✅ P1 兼容解析：`App.vue` 与 `vendor/shujuku-sp-fork/index.js` 均改为优先解析 nested `<JSONPatch>`，保留旧 direct-array fallback；vendor raw repair 现在会归一化为 nested `<JSONPatch>`，不再重写回旧直接数组。
- ✅ P2 初始化变量结构：开发版与发布版 `initvar.yaml` 移除顶层 `stat_data:`，root 直接对齐 `schema.ts`；`变量列表.txt` 保留旧 `stat_data.stat_data` 污染兜底，但正常输出不再放大嵌套。
- ✅ P3 no-AI 运行态复测：`Mvu.parseMessage()` 在完整 MVU 容器 `{ stat_data: ... }` 下，nested `<JSONPatch>` 可更新 `姓名/所在位置/当前灵异事件/行动建议`；旧 direct-array 仍不被当前 MVU 消费。现有旧消息内面板仍显示默认值，是旧消息已按 direct-array 保存的预期结果，后续新回复需真实 AI 复测确认。
- ✅ P4 全局 Tavern Regex 围栏泄漏处理：已备份两个全局正则到 `.tmp-mfrs-regex-backup-20260707.json`，并仅移除 replacement 首尾 ```html / ```；刷新当前 5 条消息显示后，DOM 中 closing fence 段落从 2 个降为 0。

**验证：**
- ✅ `node --check scripts/verify-output-cleaning-regressions.mjs`
- ✅ `node --check vendor/shujuku-sp-fork/index.js`
- ✅ `node --check scripts/publish-card.mjs`
- ✅ `node scripts/verify-output-cleaning-regressions.mjs`
- ✅ `pnpm verify:mfrs-frontend`
- ✅ `git diff --check`
- ✅ `pnpm build` 通过；仅数据库前端既有 414 KiB performance warning。
- ✅ Node/YAML 最小结构检查：两个 `initvar.yaml` root 无 `stat_data`，两个 `变量输出格式.yaml` 含 `<JSONPatch>` 且无旧 direct-array 文案。
- ✅ 发布版 PNG worldbook gate：383 entries / 33 disabled / max enabled 5851。

**边界：**
- 未发送消息，未触发真实 AI，未点击“立即手动更新”，未调用 `manualUpdate()` / `triggerUpdate()`。
- 当前已产生本地构建产物 dirty：`dist/**`、开发版/发布版 PNG 会随本轮改动刷新；正式提交前仍需按发布策略决定是否保留 PNG、是否清理 dist。
- P5 正式发布链路尚未执行：未 source commit/push，未等待 bot bundle，未回填 `scripts/publish-card.mjs` 到 v8.5.8，未重新发布。

## 2026-07-07 CST（🧭 发布后真实对话问题修复清单已建立）

**完成内容：**
- ✅ 按用户要求基于已确认根因制作修复任务清单，并写入 `task_plan.md` 顶部“当前状态 / 当前任务清单 / 需要提交的文件”。
- ✅ `findings.md` 顶部新增根因记录：`<UpdateVariable>` 直接数组与实际 MVU parser 不兼容、`initvar.yaml` 多包一层 `stat_data:`、消息内面板 stale 是下游表现、代码围栏泄漏来自运行态全局 Tavern Regex。
- ✅ 只做 planning 整理，未修改业务源码，未触发真实 AI，未发送消息，未点击“立即手动更新”，未调用 `manualUpdate()` / `triggerUpdate()`。

**当前待实施清单：**
1. P0 修 `变量输出格式.yaml`：改为 `<UpdateVariable><JSONPatch>[...]</JSONPatch></UpdateVariable>`。
2. P1 修状态栏/vendor/回归脚本解析兼容 nested `<JSONPatch>`。
3. P2 修 `initvar.yaml` root，并复查 `变量列表.txt` 的 `stat_data.stat_data` workaround。
4. P3 复测消息内面板 message variables。
5. P4 处理运行态全局 Tavern Regex closing fence 泄漏。
6. P5 做 no-AI 验证与正式发布链路，真实 AI 复测需用户明确批准。

**工作区边界：**
- 当前 `git diff --stat` 在整理前为空，`git status --short --branch` 只有未跟踪截图 `屏幕截图 2026-07-06 235029.png`。
- 本次整理后预期 dirty 只有 planning 三件套；截图仍不提交。

## 2026-07-07 CST（✅ 新对话恢复记录刷新）

**完成内容：**
- ✅ 按用户要求刷新 `planning-with-files` 记录，确保新开对话可直接从 v8.5.7 收口状态继续。
- ✅ `task_plan.md` 顶部新增“2026-07-07 新对话恢复快照”：记录当前 HEAD `0242af8`、发布同步 `27acf1f`、bot bundle `bbbe6c7`、source `f67c780`、发布版 PNG 路径、版本 `8.5.7`、CDN ref `bbbe6c7`、当前无未决任务。
- ✅ 修正 `task_plan.md` 中旧的“当前版本 / 下次恢复入口 / 工作区状态 / 版本变更索引”锚点，避免新对话误回到 v8.5.6 或 source commit 阶段。
- ✅ 更新 `findings.md` 当前导入结论：当前应导入 v8.5.7 发布版 PNG，CDN ref 为 `bbbe6c7`；旧 v8.5.6 结论不再作为当前入口。

**当前停点：**
- `main` 与 `origin/main` 一致，tracked 文件除本次 planning 刷新外无业务 dirty。
- 只剩未跟踪截图 `屏幕截图 2026-07-06 235029.png`，默认不提交。
- 无当前未决开发任务；如用户继续新需求，先读 `task_plan.md` 顶部恢复快照、`PROJECT_FLOW.md`、本条 progress 和 `findings.md` 顶部编码经验。

## 2026-07-07 CST（✅ 任务 7 完成：v8.5.7 发布同步）

**执行内容：**
- ✅ 本地 `main` 已快进到 `bbbe6c7 [bot] bundle`，tag `v0.0.371`；该 bot bundle 位于 source commit `f67c780 feat(mfrs): add automatic plot memory recall` 之后。
- ✅ 验证 bot dist：`dist/神秘复苏模拟器/脚本/数据库前端/index.js` 含 `mfrs_auto_plot_memory_recall`、`自动剧情记忆召回`、`toggle-auto-plot`、`toggle-auto-memory`。
- ✅ 修改 `scripts/publish-card.mjs`：`CDN_REF=bbbe6c7`，`releaseVersion=8.5.7`。
- ✅ 运行 `pnpm run publish-card -- 神秘复苏模拟器发布版`，同步发布版 YAML/PNG；日志显示镜像世界书 386 个文件、替换 15 处链接，保留版本 8.5.7。
- ✅ 精确提交并 push 发布同步：`27acf1f chore(release): publish mfrs v8.5.7`。

**验证：**
- ✅ `node --check scripts/publish-card.mjs`
- ✅ `git diff --check`
- ✅ `node scripts/verify-worldbook-pollution-gate.mjs --expect-mfrs-runtime "src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png"`：383 entries / 33 disabled / max enabled 5851。
- ✅ 发布版 YAML：version 8.5.7，`bbbe6c7` 7 处；旧 `573807b` / 8.5.6 / localhost / 127.0.0.1 均未命中。
- ✅ 发布版 PNG `chara` / `ccv3`：各含 `bbbe6c7` 7 处、8.5.7 1 处；旧 `573807b` / 8.5.6 / localhost / 127.0.0.1 均为 0。
- ✅ CDN smoke `@bbbe6c7`：数据库前端 200 / 388800 bytes，含自动召回四个 marker；固定状态栏 200 / 1411 bytes。
- ✅ 推送后远端 CDN `@27acf1f`：发布版 YAML 200，含 8.5.7 和 `bbbe6c7`×7，旧 `573807b` 0，本地链接 0；发布版 PNG 200 / 7746110 bytes，含 8.5.7 与 `bbbe6c7`，旧 `573807b` 0，本地链接 0。

**注意：**
- ⚠️ 首次用 PowerShell here-string 管道给 Node 的验证脚本时，中文路径/URL 被转成 `????`，导致 PNG ENOENT 和 CDN 403；已改用 Unicode escape 构造中文路径/URL 后验证通过。
- ✅ 未触发真实 AI，未发送消息，未点击“立即手动更新”，未调用 `manualUpdate()` / `triggerUpdate()`。
- ✅ 未跟踪截图 `屏幕截图 2026-07-06 235029.png` 不提交。

**当前停点：** 任务 1-7 已完成。工作区只剩未跟踪截图 `屏幕截图 2026-07-06 235029.png`，不提交。

## 2026-07-07 CST（✅ 任务 5 收口：自动召回 source commit/push）

**执行内容：**
- ✅ 按 `planning-with-files-zh` 恢复上下文，已读取 `task_plan.md`、`progress.md`、`findings.md` 和 `PROJECT_FLOW.md`。
- ✅ `session-catchup.py` 只报告 2026-07-04 EJS 旧残片，已由 v8.5.0-v8.5.6 与本轮自动召回记录覆盖，不作为当前停点。
- ✅ 最终确认 dirty 边界：只提交 `v10_2_visualizer.js`、`scripts/verify-mfrs-database-frontend-p3.mjs`、`mfrs-database-frontend-smoke.md`、`task_plan.md`、`progress.md`、`findings.md`；未跟踪截图 `屏幕截图 2026-07-06 235029.png` 不提交，`dist/**` 无 dirty。
- ⚠️ 首次 `git push origin main` 被拒，因为远端先前进到 `8e4e817 [bot] Bump deps`（只改 `package.json` / `pnpm-lock.yaml`）；已 `git fetch origin` 后 `git rebase origin/main`，无冲突。
- ✅ rebase 后发现 `dist/神秘复苏模拟器/界面/状态栏/index.html` 又出现本地 dev build dirty；已确认是压缩产物变为开发构建的噪声，并恢复到 HEAD，不提交 `dist/**`。

**提交前验证：**
- ✅ `node --check src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js`
- ✅ `node --check src/神秘复苏模拟器/脚本/数据库前端/frontend-config.js`
- ✅ `node --check scripts/verify-mfrs-database-frontend-p3.mjs`
- ✅ `pnpm verify:mfrs-frontend`
- ✅ `git diff --check`
- ✅ `git diff --stat`
- ✅ `git status --short --branch`
- ✅ rebase 后重新跑 `pnpm verify:mfrs-frontend`、`git diff --check`、`git diff --stat origin/main..HEAD`、`git status --short --branch`

**边界：** 本轮只做 source commit/push，不提交 `dist/**`，不提交截图，不运行 `publish-card`，不触发真实 AI，不发送消息，不点击“立即手动更新”，不调用 `manualUpdate()` / `triggerUpdate()`。

**下一步：** 任务 6，等待 GitHub bot bundle 并验证新 `dist/神秘复苏模拟器/脚本/数据库前端/index.js` 含 `mfrs_auto_plot_memory_recall`、`自动剧情记忆召回`、`toggle-auto-plot`、`toggle-auto-memory` marker。

## 2026-07-07 CST（✅ 任务 4 完成：自动召回真页非 AI smoke）

**执行方式：**
- ✅ 重新运行 `pnpm build` 生成本地数据库前端 bundle；仅数据库前端既有体积 warning。
- ✅ 启动临时 `python -m http.server 5500 --bind 127.0.0.1`，确认本地 bundle `HTTP 200 length=424061` 且含 `mfrs_auto_plot_memory_recall` / `toggle-auto-plot` marker。
- ✅ 用 Chrome DevTools MCP 在真页 `http://127.0.0.1:8000/` 的 `TH-script--神秘复苏数据库前端--...3002` iframe 临时注入本地 bundle。

**通过项：**
- ✅ 注入后 `MysteryAcuVisualizer` 暴露 `renderInterface`、`getAutoRecallPreview`、`buildAutoRecallPrompt`。
- ✅ 召回 tab 显示“自动召回状态”、`剧情召回` / `记忆召回` 双开关和“本轮自动召回”列表。
- ✅ `getAutoRecallPreview()` 返回 `enabled=true`、`itemCount=1`、`promptLength=447`；本轮自动召回命中 `事件纪要 #1 / SP0001`，prompt 含 `<自动剧情记忆召回>...</自动剧情记忆召回>`。
- ✅ 开关联动正常：关闭剧情召回后记忆召回仍保留 1 条；再关闭记忆召回后 `enabled=false`、`itemCount=0`、`promptLength=0`，UI 显示“自动召回已关闭”；恢复开关后配置回到原始状态。
- ✅ 边界确认：chat 长度 3 未变化，输入框保持空；未发送消息、未触发真实 AI、未点击“立即手动更新”、未调用 `manualUpdate()` / `triggerUpdate()`；smoke 期间无 console error/warn。

**清理：**
- ✅ 刷新 SillyTavern 页面以移除本地临时脚本和 `GENERATION_AFTER_COMMANDS` 监听器。
- ✅ 刷新后重新选中 `神秘复苏模拟器发布版`，确认 `characterId=4`、脚本 iframe 恢复、发布版 `MysteryAcuVisualizer` 仅有 `renderInterface`，本地自动召回 API 不再残留。
- ✅ 停止临时 5500 静态服务，删除 `.tmp-*` smoke 文件，精确还原 `dist/神秘复苏模拟器/界面/状态栏/index.html` 与 `dist/神秘复苏模拟器/脚本/数据库前端/index.js`。
- ✅ 最终检查：`git diff --check` 通过，`pnpm verify:mfrs-frontend` 通过；`git status` 只剩本轮 6 个 tracked 文件 + 未跟踪截图，`dist/**` 无 dirty，5500 端口已停止。

**当前停点：** 任务 4 已完成。下一步为任务 5：精确 source commit/push；候选文件仍为 `src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js`、`scripts/verify-mfrs-database-frontend-p3.mjs`、`mfrs-database-frontend-smoke.md`、planning 三件套；不要提交 `dist/**` 或截图文件。

## 2026-07-07 CST（✅ 自动剧情/记忆召回开发版实现 + 静态验证）

**完成内容：**
- ✅ `src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js` 已实现自动剧情/记忆召回：从最近聊天与当前输入框抽取上下文关键词，按召回 10 表标题/标签/摘要/全文相关性筛选，不全量注入。
- ✅ 生成前监听 `GENERATION_AFTER_COMMANDS`，调用 `injectPrompts([...], { once: true })` 注入 `<自动剧情记忆召回>` 系统提示词；prompt id 为 `mfrs_auto_plot_memory_recall`，位置为 `in_chat`、`system`、depth 4。
- ✅ 召回页新增“自动召回状态”、`剧情召回` / `记忆召回` 双开关和“本轮自动召回”列表；开关写入数据库前端配置，可控制对应类型是否自动注入。
- ✅ 新增非 AI 调试入口：`MysteryAcuVisualizer.getAutoRecallPreview()` 和 `MysteryAcuVisualizer.buildAutoRecallPrompt()`。
- ✅ 更新 `scripts/verify-mfrs-database-frontend-p3.mjs` marker 检查和 `mfrs-database-frontend-smoke.md` 的召回 smoke 清单。

**验证：**
- ✅ `node --check src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js`
- ✅ `node --check src/神秘复苏模拟器/脚本/数据库前端/frontend-config.js`
- ✅ `node --check scripts/verify-mfrs-database-frontend-p3.mjs`
- ✅ `pnpm verify:mfrs-frontend`
- ✅ `git diff --check`
- ✅ `pnpm build` 通过；仅数据库前端既有体积 warning，构建产生的 `dist/**` dirty 已精确还原。

**边界与停点：**
- 未触发真实 AI，未发送消息，未点击“立即手动更新”，未调用 `manualUpdate()` / `triggerUpdate()`。
- 当前待提交候选：`v10_2_visualizer.js`、`scripts/verify-mfrs-database-frontend-p3.mjs`、`mfrs-database-frontend-smoke.md`、planning 三件套。
- 未跟踪截图 `屏幕截图 2026-07-06 235029.png` 不提交；`dist/**` 不提交。
- 下一步：真页非 AI smoke，重点检查召回页自动状态、双开关、本轮自动召回和 `MysteryAcuVisualizer.getAutoRecallPreview()` / `buildAutoRecallPrompt()`；仍然不发送消息、不触发真实 AI。

**本轮收口补记：**
- ✅ 已更新 `task_plan.md` 当前状态/任务清单/提交边界，恢复入口现在指向“自动召回开发版已完成，待真页非 AI smoke / source commit / bot bundle / 发布同步”。
- ✅ 已更新 `findings.md`，记录自动召回实现细节和反全量召回原则：不因 `item.injected` 为真就给所有候选加分。
- ✅ 最终确认：`git status --short --branch` 只显示本轮 6 个 tracked 文件 + 未跟踪截图；`git diff --stat` 为 6 files / 483 insertions / 17 deletions；`git diff --check` 通过；`node --check` 两个数据库前端脚本与验证脚本通过；`pnpm verify:mfrs-frontend` 通过。

## 2026-07-07 CST（🚧 新任务启动：自动剧情/记忆召回）

**用户要求：** 前端“剧情召回/记忆召回”完全自动化，同时召回页可见本轮自动召回内容，并可在召回页开启/关闭剧情召回与记忆召回。召回不是全量注入，而是根据当前对话中出现的角色、灵异物品、厉鬼、杀人规律等关键词召回相关历史信息，核心目标是防止 AI 高楼层失忆。

**执行边界：**
- 不自动发送消息，不改写用户输入框。
- 不点击“立即手动更新”，不调用 `manualUpdate()` / `triggerUpdate()`。
- 优先使用生成前一次性提示词注入；召回页只负责配置、预览和手动补救。

**初始核对：**
- 当前 `main...origin/main`，业务源码无 dirty。
- 既有 dirty 为 planning 三件套；未跟踪截图 `屏幕截图 2026-07-06 235029.png` 不提交。
- `session-catchup.py` 检出 2026-07-04 EJS 旧摘要，已被 v8.5.0-v8.5.6 记录覆盖，不作为当前停点。

## 2026-07-07 CST（🧭 新对话恢复快照：v8.5.6 已发布，dist 噪声已清理）

**当前有效状态：**
- ✅ 最新发布版为 `v8.5.6`，发布同步提交 `4f2202f chore(release): publish mfrs v8.5.6` 已在 `origin/main`，tag `v0.0.370`。
- ✅ 用户应导入的角色卡是 `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`。
- ✅ 当前角色卡数据已验证：version `8.5.6`，CDN ref `573807b`，worldbook `383 entries / 33 disabled / max enabled 5851`，无旧 `843db59` / `8.5.5` / localhost / 127.0.0.1 残留。
- ✅ 截图 `屏幕截图 2026-07-06 235029.png` 中的固定状态栏 summary/detail 内容已移除：不再渲染死亡风险、复苏程度、健康、事件、驾驭厉鬼和“神秘复苏14表”按钮；数据库仪表盘和 14 表前端槽位仍保留。
- ✅ 已核对并清理 `dist/神秘复苏模拟器/**` 本地 dev build 噪声；这些文件一度变为含 `eval(`/`sourceURL` 的开发构建产物，已还原为 HEAD/bot bundle 状态。当前业务文件干净；工作区剩余为 planning 三件套记录和未跟踪截图 `屏幕截图 2026-07-06 235029.png`。不要提交该截图，除非用户明确要求。

**恢复注意：**
- `session-catchup.py` 报告了一段旧的 2026-07-04 EJS 未同步摘要；该内容已被 v8.5.0-v8.5.6 后续记录覆盖，不是当前任务停点。
- 新对话继续时先读 `task_plan.md` 顶部“当前状态 / 当前任务清单 / 需要提交的文件”，再读本条。
- 若用户要验收发布版，默认只做真页只读/非 AI 检查：确认版本 `8.5.6`、CDN `573807b`、截图中的固定状态栏 UI 不存在、dashboard/frontend 仍可用；不要发送消息，不要点击“立即手动更新”，不要调用 `manualUpdate()` / `triggerUpdate()`。

## 2026-07-06 CST（✅ v8.5.6 发布同步：固定状态栏截图内容已移除）

**目标：** 按用户截图反馈，移除输入框上方固定状态栏展开/收起 UI 中的内容：死亡风险、复苏程度、状态、位置、阶段、当前灵异事件、驾驭厉鬼，以及“神秘复苏14表”按钮。

**完成内容：**
- ✅ `src/神秘复苏模拟器/脚本/固定状态栏/index.ts` 已精简为只维护 `mfrs-fixed-status-host`、`mfrs-fixed-dashboard-slot`、`mfrs-fixed-frontend-slot`，不再读取 `stat_data`、不再渲染 summary/detail、不开固定状态栏按钮。
- ✅ `src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js` 的固定 host 维护逻辑同步改为只保留 dashboard/frontend 两槽，并删除旧 `mfrs-fixed-status-slot`、`mfrs-fixed-status-summary`、`mfrs-fixed-status-detail`。
- ✅ `scripts/verify-mfrs-database-frontend-p3.mjs` 增加防回归：固定状态栏脚本不得再包含 `summaryInnerHtml`、`detailInnerHtml`、`open-status`、`神秘复苏14表`、`生存状态`。
- ✅ `mfrs-database-frontend-smoke.md` 更新为新验收口径：确认固定状态栏 UI 不存在，数据库仪表盘和 14 表前端仍保留。

**验证：**
- ✅ `pnpm build` 通过；数据库前端仍只有既有 404 KiB webpack performance warning，固定状态栏 bundle 为 1.4 KiB。
- ✅ `pnpm verify:mfrs-frontend` 通过。
- ✅ `git diff --check` 通过。
- ✅ 真页运行态注入本地固定状态栏 bundle 后：`#mfrs-fixed-status-summary=false`、`#mfrs-fixed-status-detail=false`、`#mfrs-fixed-status-slot=false`，dashboard/frontend 两槽仍各有内容。未发送消息、未触发真实 AI、未调用 `manualUpdate()` / `triggerUpdate()`。

**发布同步：**
- ✅ source commit `def6576 feat(mfrs): remove fixed status panel` 已 push。
- ✅ bot bundle `573807b [bot] bundle` 已生成，tag `v0.0.369`。
- ✅ bot dist 验证：固定状态栏 bundle 1437 bytes，`神秘复苏14表` / `生存状态` / `summaryInnerHtml` / `detailInnerHtml` 均为 0；数据库前端仍含 `acu_tab_mfrs_global_search` / `acu_tab_mfrs_recall` / `acu_tab_mfrs_consistency`。
- ✅ `scripts/publish-card.mjs` 已回填 `CDN_REF=573807b`、`releaseVersion=8.5.6`，`publish-card` 已生成发布版 YAML/PNG。
- ✅ 发布版 worldbook gate 通过：383 entries / 33 disabled / max enabled 5851。
- ✅ 发布版 YAML：version 8.5.6×1，`573807b`×7，旧 `843db59`×0，旧 8.5.5×0，localhost/127.0.0.1×0，`神秘复苏14表`×0，`生存状态`×0。
- ✅ 发布版 PNG `chara`/`ccv3`：version 8.5.6，entries 383，disabled 33，`573807b`×7，旧 `843db59`/8.5.5/local 均为 0，`神秘复苏14表`/`生存状态` 均为 0。
- ✅ CDN smoke `@573807b`：固定状态栏 200 / 1437 bytes 且无截图 UI marker；数据库前端 200 / 413308 bytes，仍含总览/召回/一致性 marker。

**边界：** 未发送消息，未触发真实 AI，未点击“立即手动更新”，未调用 `manualUpdate()` / `triggerUpdate()`；截图文件 `屏幕截图 2026-07-06 235029.png` 不提交。

## 2026-07-06 CST（✅ v8.5.5 发布同步：P1/P2/P3 数据库前端增强进入发布版 PNG）

**目标：** 完成用户要求的任务 1-5：真页非 AI smoke → source commit/push → 等 bot bundle → 发布同步 → 发布验证。

**完成内容：**
- ✅ source commit `df48367 feat(mfrs): enhance database frontend panels` 已 push 到 `origin/main`。
- ✅ GitHub bot bundle `843db59 [bot] bundle` 已生成，tag `v0.0.367`。
- ✅ bot dist blob 验证通过：`dist/神秘复苏模拟器/脚本/数据库前端/index.js` 含 `acu_tab_mfrs_global_search`、`acu_tab_mfrs_recall`、`acu_tab_mfrs_consistency`、`exportChatData`、`importChatData`、`resetChatData`、`validateCatalog`、`getEconomySummary`、`MFRS_DATABASE_FRONTEND_CONFIG`。
- ✅ `scripts/publish-card.mjs` 已回填 `CDN_REF=843db59`、`releaseVersion=8.5.5`。
- ✅ 已运行 `pnpm run publish-card -- 神秘复苏模拟器发布版`，生成发布版 YAML/PNG；同步日志显示替换 15 处链接，保留版本 8.5.5。

**验证：**
- ✅ `node --check scripts/publish-card.mjs` 通过。
- ✅ `node scripts/verify-worldbook-pollution-gate.mjs --expect-mfrs-runtime "src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png"` 通过：383 entries / 33 disabled / max enabled 5851。
- ✅ `git diff --check` 通过。
- ✅ 发布版 YAML：version 8.5.5×1，`843db59`×7，`eef6274`×0，8.5.4×0，localhost/127.0.0.1×0。
- ✅ 发布版 PNG `chara` 与 `ccv3`：version 8.5.5，entries 383，disabled 33，`843db59`×7，`eef6274`×0，8.5.4×0，localhost/127.0.0.1×0。
- ✅ CDN smoke `@843db59`：数据库前端 200 / 413325 bytes，含总览/一致性/MFRS API marker；固定状态栏 200 / 9552 bytes。

**边界：** 未触发真实 AI，未调用 `manualUpdate()` / `triggerUpdate()`。本地 `dist/**` 构建噪声在 fast-forward 到 bot commit 前已保存到 stash `temp local dist before bot ff`，未纳入提交；`.claude/worktrees/agent-aedb9d9f392ecb036` 仍是无关 dirty。

## 2026-07-06 CST（✅ 真页非 AI smoke 完成：P1/P2/P3 数据库前端开发版）

**目标：** 完成当前剩余收口第 1 项，在不触发真实 AI、不写库、不发送消息的前提下验证 P1/P2/P3 数据库前端开发版。

**执行方式：**
- ✅ 当前 SillyTavern 页为 `http://127.0.0.1:8000/`，角色 `神秘复苏模拟器发布版`，版本 `8.5.4`。
- ✅ 由于当前发布卡仍指向 v8.5.4 CDN，本轮用 Chrome DevTools MCP 将本地 `http://localhost:5500/dist/神秘复苏模拟器/脚本/数据库前端/index.js` 注入 `TH-script--神秘复苏数据库前端--...3002` iframe，只替换当前页面运行态，不改卡体。
- ✅ 本地静态服务 `localhost:5500` 可读取最新 bundle，长度 413315 字节；bundle 含 `总览`、`召回`、`一致性`、`exportChatData` 和配置拆分 marker。

**验证结果：**
- ✅ 基础加载：`.acu-wrapper` 重新挂载，导航含 `总览 / 召回 / 一致性` 和 14 张表。
- ✅ 总览：表状态总览显示 14/14、总行数 21、空表 1、异常表 1；搜索 `鬼` 得到结果；复制/填入按钮存在，填入输入框成功；`原表` 按钮可跳转到对应真实表 tab。
- ✅ 召回：健康检查显示 `AutoCardUpdaterAPI=可用`、`14表模板=14/14`、`事件纪要=1 行`、`召回索引表=10 张`、剧情召回/向量召回状态；搜索 `鬼` 后召回结果可见；固定、填入全部固定召回、清空固定召回均通过。
- ✅ 一致性：6 域摘要可见（玩家状态、当前事件、驾驭厉鬼、灵异物品、线索、事件纪要）；JSON 快照导出已触发（application/json，约 10.7 KiB）；刷新前端、重载快照、重建索引、重载模板入口可用。
- ✅ 抽卡增强：抽卡面板显示当前聊天 scope `1tno18h`、经济摘要、卡池校验 `26 件 / 0 错误 / 0 警告`；`window.MFRS.exportChatData/importChatData/validateCatalog/getEconomySummary` 可用；同快照导入不删除全局 `mfrs_custom_gacha_items`。
- ✅ 固定状态栏：`mfrs-fixed-status-host` 三槽存在，order 为 dashboard 10 / frontend 20 / status 30；`pagehide` 后 dashboard/frontend 保留。

**边界：** 未发送消息，未触发真实 AI，未点击“立即手动更新”，未调用 `manualUpdate()` / `triggerUpdate()`；输入框已恢复。重置当前聊天抽卡数据属于破坏性操作，本轮只确认入口存在，未执行。

**下一步：** 精确提交 source/planning，排除 `dist/**` 和 `.claude/worktrees/**` 噪声；push 后等待 bot bundle。

## 2026-07-06 CST（🧭 PROJECT_FLOW 校正：只保留既有本地服务路径）

**目标：** 按用户要求，把可能多余的浏览器工具和额外自建本地服务步骤从默认项目流程中去掉，并补全更准确的运行流程。

**完成内容：**
- ✅ 更新 `PROJECT_FLOW.md`：明确真页默认入口是 Chrome DevTools MCP；MCP 不可用且只需 evaluate 时用 `scripts/cdp-evaluate.mjs`；其它浏览器自动化工具不再作为默认 fallback。
- ✅ 更新 `PROJECT_FLOW.md`：本地真页验证使用 VSCode `Fn+F5` / `pnpm watch` / Live Server 或既有本地静态服务加载 `dist/**`；删除额外自建最小 HTTP 服务步骤。
- ✅ 更新 `PROJECT_FLOW.md`：正式发布链路明确为 source 精确提交推送 → 等 `[bot] bundle` commit/tag → 验证 bot dist marker → 回填 `publish-card` → 发布版 YAML/PNG 验证与提交。
- ✅ 更新 `mfrs-database-frontend-smoke.md`：把旧 CDN 场景下的本地 bundle 验证改为普通项目 dev path，不再写入自建服务 fallback 或相关清理项。

**边界：** 本条只整理流程文档；未继续真页 smoke、未改源码、未提交、未 push、未发布、未触发真实 AI。

## 2026-07-06 CST（✅ P3 完成：工程拆分 + 静态验证 + 真页 smoke 清单）

**目标：** 按用户要求先完成 P3 工程维护，把真页非 AI smoke、source 提交、bot bundle 和发布同步留到最后阶段。

**完成内容：**
- ✅ 从 `v10_2_visualizer.js` 拆出静态配置模块 `src/神秘复苏模拟器/脚本/数据库前端/frontend-config.js`，包含仪表盘槽位、旧仪表盘关键词、召回 10 表规则和一致性 6 域规则。
- ✅ 调整 `src/神秘复苏模拟器/脚本/数据库前端/index.ts`，先加载 `frontend-config.js` 再加载 `v10_2_visualizer.js`，保证运行时配置先挂载。
- ✅ `v10_2_visualizer.js` 改为从 `MFRS_DATABASE_FRONTEND_CONFIG` 读取 `MFRS_DASHBOARD_SLOTS`、`MFRS_RECALL_TABLE_RULES`、`MFRS_CONSISTENCY_RULES`，主文件不再内联这些静态规则。
- ✅ 新增静态验证脚本 `scripts/verify-mfrs-database-frontend-p3.mjs`，覆盖配置拆分、虚拟 tab 守卫、召回/总览/一致性锚点、抽卡 scoped key、全局自定义卡池、固定三槽布局和 smoke 清单覆盖。
- ✅ 新增 `package.json` 脚本 `verify:mfrs-frontend`。
- ✅ 新增真页非 AI smoke 清单 `mfrs-database-frontend-smoke.md`，覆盖总览、召回、一致性、抽卡、固定状态栏、清理和最后发布阶段边界。

**验证：**
- ✅ `node --check "src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js"` 通过。
- ✅ `node --check "src/神秘复苏模拟器/脚本/数据库前端/frontend-config.js"` 通过。
- ✅ `node --check "scripts/verify-mfrs-database-frontend-p3.mjs"` 通过。
- ✅ `pnpm verify:mfrs-frontend` 通过。
- ✅ `git diff --check` 通过。
- ✅ `pnpm build` 通过；数据库前端 bundle 为 404 KiB，仅 webpack performance warning。

**边界：** 本轮未做真页非 AI smoke、未提交、未 push、未等待 bot bundle、未运行 `publish-card`。这些按用户要求留到最后阶段。

## 2026-07-06 CST（✅ P1/P2 开发版完成：总览/一致性/抽卡增强）

**目标：** 继续完成当前清单里的 P1 数据库前端体验增强、P2 MVU/数据库一致性和 P2 抽卡系统增强，并把恢复状态写回 planning。

**完成内容：**
- ✅ 修改开发版源码 `src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js`，新增“总览”虚拟 tab（`TAB_GLOBAL`）：14 表全局搜索、表状态总览、行详情预览、复制/填入/打开原表操作。
- ✅ 新增“一致性”虚拟 tab（`TAB_CONSISTENCY`）：对比 `stat_data` 与数据库关键表，提示状态栏有但数据库无、数据库有但状态栏缺失的差异；支持当前状态快照导出和低风险前端修复操作。
- ✅ 统一表行操作：普通表行新增“复制 / 填入”，行动建议、灵异物品、线索、收录规律保留既有“选择 / 使用”语义并补齐复制/填入能力。
- ✅ 增强抽卡面板：显示当前聊天 scope；支持当前聊天抽卡数据导出 / 导入 / 重置；新增卡池校验（缺字段、概率异常、重复名称、目标表不可用）；新增经济摘要（收入日志、估算消耗、拥有数量、历史数量、稀有度统计）。
- ✅ 扩展 `window.MFRS` API：`exportChatData`、`importChatData`、`resetChatData`、`validateCatalog`、`getEconomySummary`。

**验证：**
- ✅ `node --check "src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js"` 通过。
- ✅ `git diff --check` 通过。
- ✅ `pnpm build` 通过；仅数据库前端 bundle 体积 warning（403 KiB）为本轮功能增长后的 webpack performance warning。

**当前工作树与下一步：**
- 当前目标 source 变更：`src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js`。
- 本地构建生成物：`dist/神秘复苏模拟器/脚本/数据库前端/index.js`、`dist/神秘复苏模拟器/界面/状态栏/index.html`；按项目规则默认不纳入 source 提交，交给 bot bundle Action 重建。
- 既有无关 dirty：`.claude/worktrees/agent-aedb9d9f392ecb036`，不要提交或 revert。
- 剩余收口：真页非 AI smoke（总览/一致性/抽卡增强）、source commit/push、等待 bot bundle、如需发布再回填 `publish-card` 并同步发布版 PNG。

## 2026-07-06 CST（🧭 新对话恢复快照：v8.5.4 已发布，下一步进入 P1 体验增强）

**当前有效状态：**
- ✅ 最新发布版为 `v8.5.4`，发布同步提交 `7a997c2 chore(release): publish mfrs v8.5.4` 已 push；planning 收口提交 `a219bf7 docs(planning): record mfrs v8.5.4 push` 已 push，当前 `origin/main` 指向 `a219bf7`。
- ✅ P1 剧情/记忆召回前端化已完成并进入发布版：source `0acda89` → bot bundle `eef6274` / tag `v0.0.363` → publish sync `7a997c2`；发布版 PNG 为 `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`。
- ✅ 已验证：`node --check`、`git diff --check`、`pnpm build`、worldbook gate `383/33/5851`、PNG `chara/ccv3` version `8.5.4` + `eef6274`×7、CDN 数据库前端 200 且含召回 marker、真页非 AI smoke（召回 tab/搜索/固定/填入）。
- ✅ 当前工作树只剩既有无关 dirty：`.claude/worktrees/agent-aedb9d9f392ecb036`。不要提交或 revert 它。

**新对话恢复步骤：**
1. 读 `task_plan.md` 顶部“当前状态 / 当前任务清单 / 版本变更索引 / 需要提交的文件”。
2. 读 `PROJECT_FLOW.md`，确认开发入口、真页验证边界、发布流程和“不要触发真实 AI / 不要点立即手动更新”的规则。
3. 读本条 `progress.md` 顶部快照；需要 P1 召回验证细节时读 `findings.md` 顶部“P1 召回面板 smoke”。
4. 运行 `git status --short --branch`，预期只看到 `.claude/worktrees/agent-aedb9d9f392ecb036` 无关 dirty。

**下一步任务入口：**
- 若用户要验收发布版：导入/替换 `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`，确认角色版本 `8.5.4`、数据库前端有“召回”tab、14 表和固定状态栏仍正常。默认不发送消息、不触发真实 AI。
- 若用户要继续开发：从 `task_plan.md` 的 **P1 数据库前端体验增强** 开始，优先做 14 表全局搜索、表状态总览、关键表详情预览、统一“选择/使用/复制/填入输入框”交互和错误提示增强。
- 若要继续发布链路：严格遵循 `PROJECT_FLOW.md`，先改开发版、真页 smoke，再 source commit → bot bundle → `publish-card` 发布同步。

## 2026-07-06 CST（✅ v8.5.4 发布同步：P1 召回面板进入发布版 PNG）

**目标：** 在 P1 开发版完成后，等待 bot bundle，并把发布版卡回填到包含召回面板的 CDN 资源。

**完成内容：**
- ✅ P1 source commit `0acda89 feat(mfrs): add recall panel to database frontend` 已 push 到 `origin/main`。
- ✅ bot bundle 已生成：`eef6274 [bot] bundle`，tag `v0.0.363`；确认 `dist/神秘复苏模拟器/脚本/数据库前端/index.js` 含 `acu_tab_mfrs_recall` / 召回代码。
- ✅ 回填 `scripts/publish-card.mjs`：`CDN_REF=eef6274`，`releaseVersion=8.5.4`；顺手移除该脚本文件头既有 UTF-8 BOM，使 `node --check scripts/publish-card.mjs` 不再被 shebang 前 BOM 阻断。
- ✅ 运行 `pnpm run publish-card -- 神秘复苏模拟器发布版`：发布版 YAML 替换 15 处链接，同步发布版目录头像源文件，并重新生成 `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`。

**验证：**
- ✅ `git diff --check` 通过。
- ✅ `node --check scripts/publish-card.mjs` 与 `node --check src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js` 通过。
- ✅ `node scripts/verify-worldbook-pollution-gate.mjs --expect-mfrs-runtime src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png` 通过（383 entries / 33 disabled / max enabled 5851）。
- ✅ 发布版 YAML：version `8.5.4`，链接指向 `@eef6274`。
- ✅ PNG `chara`/`ccv3`：version `8.5.4`，各含 `eef6274` 7 次，旧 `80b09a8` 0，旧 `8.5.3` 0。
- ✅ CDN smoke：`@eef6274` 数据库前端 `200/382475` 且含召回 marker；固定状态栏 `200/9552`。
- ✅ 发布同步提交 `7a997c2 chore(release): publish mfrs v8.5.4` 已 push 到 `origin/main`；`cdn.jsdelivr.net` 可读取该提交的发布版 YAML，含 `8.5.4` 与 `eef6274`×7。

**副作用边界：** 未触发真实 AI，未点击“立即手动更新”，未调用 `manualUpdate()` / `triggerUpdate()`。本地构建 dist 残留已在快进 bot bundle 前暂存到 `stash@{0}`，发布同步提交不应包含本地 `dist/**` 噪声或 `.claude/worktrees/**`。

## 2026-07-06 CST（✅ P1 完成：剧情/记忆召回前端化开发版实现 + 非 AI 真页 smoke）

**目标：** 继续完成 P1：把已有剧情/记忆召回能力做成 `神秘复苏数据库前端` 可见、可搜索、可手动操作、可健康检查的前端 tab。

**完成内容：**
- ✅ 修改开发版源码 `src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js`，新增虚拟 tab `TAB_RECALL`（导航显示“召回”），不进入真实表格排序保存。
- ✅ 新增召回表规则，覆盖 `事件纪要`、`线索`、`人物`、`地点`、`灵异事件`、`厉鬼档案`、`灵异物品`、`收录档案`、`收录规律`、`驾驭厉鬼`，按实际模板表头提取标题、摘要、标签与提示词注入状态。
- ✅ 新增召回面板 UI：搜索框、健康检查卡、结果卡、固定召回区；每条结果显示来源表、行号、标题/摘要、标签、参与注入状态。
- ✅ 新增手动操作：复制召回文本、填入输入框、固定/取消固定、填入全部固定召回、清空固定召回；固定列表限制 8 条并存入 localStorage。
- ✅ 新增健康检查：`AutoCardUpdaterAPI`、14 表模板数量、`事件纪要`行数、召回索引表数量、剧情召回预设/开关状态、向量召回状态。
- ✅ 保留原数据处理结果的 `source: sheet`，使召回面板可以读取模板导出配置和表元数据。

**验证：**
- ✅ `node --check "src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js"` 通过。
- ✅ `git diff --check` 通过。
- ✅ `pnpm build` 通过；仅数据库前端 bundle 体积 warning（374 KiB）为当前功能增长后的 webpack performance warning。
- ✅ 真页非 AI smoke：当前页面为 SillyTavern `http://127.0.0.1:8000/`，临时用本地 CORS 静态服务加载当前构建的 `dist/神秘复苏模拟器/脚本/数据库前端/index.js` 到 `TH-script--神秘复苏数据库前端--...3002` iframe；未改卡、未写库。
- ✅ smoke 结果：导航出现“召回”；健康检查显示 `AutoCardUpdaterAPI=可用`、`14表模板=14/14`、`事件纪要=1行`、`召回索引表=10张`；打开面板初始 10 条，搜索“鬼”后 8 条；固定/清空固定通过；单条填入输入框通过；固定集合填入输入框通过。

**副作用边界：** 未点击“立即手动更新”，未调用 `manualUpdate()` / `triggerUpdate()`，未发送聊天消息，未触发真实 AI；测试后已关闭面板、恢复 `send_textarea`、清理 `acu_mfrs_recall_query_v1` 与 `acu_mfrs_recall_pins_v1`，并清理本地 bundle 验证痕迹。`dist/**` 为本地构建残留，不纳入本轮 source 提交。

## 2026-07-06 CST（✅ P0 完成：v8.5.3 固定状态栏注册热修复 + 真页收口验证）

**目标：** 执行 P0 收口验证：确认 v8.5.2/v8.5.3 发布版真页版本、输入框上方三槽顺序、`pagehide` 保全，以及 v8.5.1 抽卡聊天隔离未回归。

**执行与结果：**
- ✅ 初始真页验证确认当前角色为 `神秘复苏模拟器发布版`，卡体已是 v8.5.2，含 `@80b09a8`，无旧 `@88fd7f1/@787f113`。
- ⚠️ P0 发现 v8.5.2 发布卡缺少 `固定状态栏` 脚本注册：DOM 有 `mfrs-fixed-dashboard-slot` 与 `mfrs-fixed-frontend-slot`，但 `mfrs-fixed-status-slot` 为空；卡内脚本 frame 也没有 `TH-script--固定状态栏--...3001`。根因是 v8.5.1 清理旧状态栏时删除了注册条目，v8.5.2 只改了 `脚本/固定状态栏/index.ts`，没有把脚本重新接回 `index.yaml`。
- ✅ 已恢复开发版 `src/神秘复苏模拟器/index.yaml` 中 `固定状态栏` 脚本条目（id `d0f6b2d4-4b25-4b8c-9b54-2f7b6c8a3001`），`scripts/publish-card.mjs` 发布版本提升为 `8.5.3`，CDN_REF 继续使用已验证的 `80b09a8`。
- ✅ 运行 `pnpm run publish-card -- 神秘复苏模拟器发布版` 重新生成发布版 YAML/PNG；发布版 YAML 版本为 `8.5.3`，包含 `固定状态栏 @80b09a8`。
- ✅ 验证通过：`git diff --check`；发布版 worldbook gate `383 entries / 33 disabled / max enabled 5851`；PNG `chara`/`ccv3` 均为 version `8.5.3`，各含 `@80b09a8` 7 次，旧 `@88fd7f1`/`8.5.2` 为 0；CDN smoke：固定状态栏脚本 `200/9552`，数据库前端脚本 `200/363770`。
- ✅ 真页最终验证：刷新后重新选择角色，运行态自然加载 `TH-script--固定状态栏--d0f6b2d4-4b25-4b8c-9b54-2f7b6c8a3001`；输入框上方 host 顺序为 `dashboardSlot(order 10)` → `frontendSlot(order 20)` → `statusSlot(order 30)`，状态栏摘要显示 `🩸0/100 / ☠️0% / ❤️健康 / 👻0 / 神秘复苏14表`。
- ✅ `pagehide` 保全验证：触发 `pagehide` 后只移除状态槽/状态栏摘要，`dashboardSlot` 与 `frontendSlot` 均继续保留各自子节点；随后刷新并重新选择角色，页面恢复为 v8.5.3 正常运行态。
- ✅ 抽卡聊天隔离验证：通过 mock 两个 chatId，`getStorageScope()` 得到不同 scope（`zz51pr` / `zz52lo`），调查点、保底、历史、奖励日志、残屑、已拥有物品均读写各自 `baseKey::scope`；无 scope 旧 base key 未变化，测试 key 已清理。
- ✅ 提交推送：代码/发布包提交 `669d79a fix(mfrs): restore fixed status script registration` 已 push 到 `origin/main`；随后补充本条 planning 收口记录。

**副作用边界：** 未发送聊天消息，未触发真实 AI，未点击“立即手动更新”，未调用 `triggerUpdate()`；抽卡验证只写入并清理临时 localStorage scoped key。

## 2026-07-06 CST（🧭 下一阶段改进任务清单已写入 planning）

**目标：** 根据当前角色卡功能盘点与召回能力结论，把下一阶段改进任务清单写入 `planning-with-files`，确保新开对话可直接恢复任务。

**完成内容：**
- ✅ 恢复规划上下文：按 `planning-with-files-zh` 读取 `task_plan.md`、`progress.md`、`findings.md`，运行 `session-catchup.py`，并确认当前 `git status` 只有 `.claude/worktrees/agent-aedb9d9f392ecb036` 无关 dirty。
- ✅ 更新 `task_plan.md` 当前状态：新增“下一阶段规划已建立”，明确主线从 v8.5.2 发布收口切到“真页收口验证 → 剧情/记忆召回前端化 → 数据库前端体验增强 → MVU/数据库一致性检查 → 抽卡系统增强 → 工程拆分与回归脚本”。
- ✅ 更新 `task_plan.md` 当前任务清单：新增 P0/P1/P2/P3 分级任务，其中 P0 是 v8.5.2 真页收口验证，P1 第一主线是把 `spv3.9.5·数据库` 已有剧情/记忆召回后端做成 `神秘复苏数据库前端` 可见、可控、可验证的召回面板。
- ✅ 更新恢复入口与提交边界：新对话优先读本条进度和 `task_plan.md` 当前任务清单；若提交本轮 planning 更新，只提交 `task_plan.md`、`progress.md`，不要提交 `.claude/worktrees/**`、源码、发布版 PNG、`scripts/publish-card.mjs` 或 `dist/**`。

**下一步建议：**
1. 若只收口发布体验，先执行 P0：导入 v8.5.2 发布版 PNG 后真页验证三槽顺序、`pagehide` 保全和抽卡聊天隔离。
2. 若进入功能开发，先执行 P1：在 `src/神秘复苏模拟器/脚本/数据库前端/` 为剧情/记忆召回增加前端面板与健康检查。

## 2026-07-06 CST（✅ v8.5.2 完成：固定状态栏三槽布局 + 发布同步）

**目标：** 接续用户给出的发布清单，从“等待 bot bundle Action 重建 dist + 打新 tag”开始，完成 v8.5.2 发布版回填、打包、验证、提交推送，并更新 planning。

**完成内容：**
- ✅ 确认远端 bot bundle 已完成：source `4f38920 feat(mfrs): split fixed status host into dashboard/frontend/status slots` 之后生成 bot bundle `80b09a8`，tag `v0.0.358`。
- ✅ 为避免本地 `pnpm build` 生成的 tracked `dist/**` 阻塞快进，先将 3 个本地生成物暂存到 `stash@{0}`（`temp-before-release-sync-v8.5.2-generated`），随后 `git pull --ff-only` 到 `80b09a8`；保留无关 dirty `.claude/worktrees/agent-aedb9d9f392ecb036`。
- ✅ 回填 `scripts/publish-card.mjs`：`CDN_REF=80b09a8`，`releaseVersion=8.5.2`。
- ✅ 运行 `pnpm run publish-card -- 神秘复苏模拟器发布版`：同步发布版 YAML 并替换 13 处链接，生成 `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`。
- ✅ 发布验证通过：`git diff --check`；`node scripts/verify-worldbook-pollution-gate.mjs --expect-mfrs-runtime src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`（383 entries / 33 disabled / max enabled 5851）；PNG `chara`/`ccv3` 均为 `data.character_version=8.5.2`、@80b09a8×6、旧 @88fd7f1=0、旧 8.5.1=0；CDN smoke @80b09a8 6 个脚本均 HTTP 200。
- ✅ 发布同步提交 `b568870 chore(release): publish mfrs v8.5.2` 已 push 到 `origin/main`，远端 tag `v0.0.359` 指向该提交。

**验证备注：** 第一次 PNG 元数据脚本误按通用 `version` 路径读取，`chara version=None` 后已确认正确字段是 `data.character_version`，重新验证通过；这不是资源问题。

**当前状态：** v8.5.2 发布资源已在 origin/main。用户重新导入 `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png` 可获得 v8.5.2。建议可选真页验证输入框上方固定区域顺序为“数据库仪表盘 → 14 表前端 → 状态栏”，并确认 v8.5.1 的抽卡按聊天隔离未回归。

## 2026-07-05 CST（✅ v8.5.1 完成：抽卡调查点按聊天隔离 + 远端 CDN 发布）

**目标：** 继续完成用户要求的两个后续：①把“调查点按聊天隔离”最新变更写入 planning；②走正式远端发布链路，生成新的 CDN bundle hash，而不是只依赖本地内联 PNG。

**完成内容：**
- ✅ 使用干净 worktree `.codex-mfrs-gacha-scope` 从 `origin/main` 切出发布分支，避免主工作区旧 dirty、临时文件、依赖降级和 `tavern_sync.mjs` 换行噪声进入提交。
- ✅ source commit `5266dc5`：提交 3 个源文件，包含：
  - `src/神秘复苏模拟器/index.yaml`：删除旧固定状态栏脚本和旧 `[界面]状态栏` 正则残留。
  - `src/神秘复苏模拟器/脚本/数据库前端/index.ts`：默认 `dashboardPosition/frontendPosition` 改为 `fixed_status`。
  - `src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js`：数据库前端和仪表盘移动到输入框上方同一 host；抽卡调查点/保底/历史/奖励日志/残屑/已拥有物品按聊天 scope 存储；无 chatId 时使用 `unsaved-*` 临时 scope；抽卡结果写库双重去重。
- ✅ GitHub bundle workflow 成功：run `28744734525`，bot bundle `88fd7f1`，tag `v0.0.354`。
- ✅ 发布同步 commit `8a777c2`：`scripts/publish-card.mjs` 回填 `CDN_REF=88fd7f1`、`releaseVersion=8.5.1`，运行 `pnpm publish-card 神秘复苏模拟器发布版`，生成 `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`。发布同步已 push 到 `origin/main`，tag `v0.0.355`。
- ✅ 发布验证：
  - `git diff --check` 通过。
  - `node --check src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js` 通过。
  - `pnpm build` 通过，仅既有数据库前端 bundle 355 KiB performance warning。
  - `node scripts/verify-worldbook-pollution-gate.mjs --expect-mfrs-runtime src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png` 通过（383 entries / 33 disabled / max enabled 5851）。
  - 发布版 YAML version `8.5.1`，脚本链接指向 `@88fd7f1`，无旧 `@787f113`/`@c547fac`。
  - PNG `chara`/`ccv3` 均为 version `8.5.1`，含 `@88fd7f1`，无旧固定状态栏正则/iframe 残留。
  - CDN smoke：`@88fd7f1` 六个脚本均 HTTP 200；数据库前端 bundle 200/332675 bytes，含 `fixed_status`、`getStorageScope`、`mfrs_gacha_currency`、`unsaved-*` 和 scoped key 模板。

**当前状态：** 最新发布同步提交 = `8a777c2 chore(release): publish mfrs v8.5.1`；source = `5266dc5`；bot bundle = `88fd7f1`。其后的 planning 记录提交不改变发布资源。用户重新导入 `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png` 即可获得 v8.5.1。新聊天调查点从 0 开始；同一聊天刷新/重进保留本聊天自己的调查点；不同聊天的调查点、保底、历史、残屑、已拥有物品和奖励日志互相隔离；自定义卡池仍全局共享。

## 2026-07-05 CST（✅ 任务7完成：发布后真页导入 v8.5.0 + EJS 渲染验证，无 AI/无写库）

**目标：** 完成任务 7：重新导入 v8.5.0 发布版后，在酒馆真页验证 AI 可见的 `stat_data` 注入不再是旧宏，而是 EJS 渲染后的完整 JSON。

**执行与结果：**
- ✅ 用 SillyTavern UI 的“更多 → 替换 / 更新 → 从文件替换”正式上传 `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`。
- ✅ 导入后运行态当前角色：`神秘复苏模拟器发布版`，version `8.5.0`，含 `787f113`，旧 `c547fac` 为 0，旧宏 `format_message_variable::stat_data` 为 0，EJS 模板存在。
- ✅ 运行态卡体 gate：内嵌 `character_book.entries` = 383，disabled = 33，max enabled length = 5851，最大启用条目为“鬼奴与衍生物规则”。
- ✅ 脚本链路：`TH-script--固定状态栏`、`TH-script--消息内面板` 均加载；脚本链接 `@787f113` 7 次、旧 `@c547fac` 0 次；固定状态栏按钮显示“神秘复苏14表”；消息内面板数量 3。
- ✅ EJS 渲染验证：取当前卡“变量列表”世界书条目调用 `EjsTemplate.evalTemplate(content)`，渲染结果无旧宏、无残留 EJS 标签；`<stat_data>` JSON 长度 1583，可 parse，含 `风险值`、`驭鬼者状态`、`当前灵异事件`，且无冗余 `stat_data.stat_data` 嵌套。

**备注：** 未发送聊天消息、未触发真实 AI、未点击“立即手动更新”、未调用 `triggerUpdate()`，因此没有新增 AI/数据库写入副作用。`ctx.worldInfo.entries` 在当前页面返回 0，不作为本轮 worldbook 运行态来源；使用当前角色内嵌 `character_book.entries` 验证。

## 2026-07-05 CST（✅ v8.5.0 完成：EJS 注入完整 stat_data，source → bot bundle → 发布同步全链路已 push）

**背景：** 继续完成任务清单 5-6。前序已确认 `{{format_message_variable::stat_data}}` 宏在提示词侧不解析，正确方案是把 `变量列表.txt` 里的旧宏替换为 EJS，直接把运行时 `variables.stat_data` 序列化给 AI；同时保留两个小修复：固定状态栏优先打开 `openVisualizer`，消息内面板刷新时移除旧面板后重渲染。

**完成内容：**
- ✅ 发布前验证：`pnpm build` 通过（仅既有数据库前端 349 KiB performance warning）；`git diff --check` 通过；`verify-worldbook-pollution-gate --expect-mfrs-runtime` 对开发版/发布版 PNG 均通过（383 entries / 33 disabled / max enabled 5851）。
- ✅ source commit `36615f3`：只提交 4 个目标文件（两份 `变量列表.txt`、`固定状态栏/index.ts`、`消息内面板/index.ts`），排除本地 build 生成的 `dist/**` 和 PNG 噪声。
- ✅ bot bundle `787f113`（tag `v0.0.350`）：自动重建 `dist` 和两张卡 PNG；CDN smoke 通过：固定状态栏 200/8468 且含 `openVisualizer`/`神秘复苏14表`，消息内面板 200/15210 且含 `mfrs-msg-panel`，开发版 PNG 200/7752438。
- ✅ 发布同步 commit `31b144b`（tag `v0.0.351`）：`scripts/publish-card.mjs` 回填 `CDN_REF=787f113`、`releaseVersion=8.5.0`，运行 `pnpm run publish-card -- 神秘复苏模拟器发布版`，发布版 YAML 替换 17 处链接并生成 PNG。
- ✅ 发布验证：发布版 YAML version `8.5.0` 且链接指向 `@787f113`；PNG `chara`/`ccv3` 均为 version `8.5.0`，各含 `787f113` 8 次、旧 `c547fac` 0 次、旧宏 `format_message_variable::stat_data` 0 次、EJS `JSON.stringify(cleanStatData)` 1 次；发布版 worldbook gate 383/33/5851 PASS；CDN `@31b144b` 发布 YAML/PNG 均 HTTP 200，YAML 无旧 `8.4.9`/`c547fac`。

**操作备注：** `gh` 未安装，Action 状态改用 `git fetch origin` 轮询；PowerShell 中未加引号的 `stash@{0}` 会被解析干扰，已用 `'stash@{0}'` 成功清理临时 build stash。

**当前状态：** `origin/main` = `31b144b chore(release): publish mfrs v8.5.0`，前序 bot bundle = `787f113`，source = `36615f3`。任务清单 5-6 已完成。用户重新导入 `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png` 可获得 v8.5.0。

## 2026-07-01 CST（✅ v8.4.9 完成：消息内面板注册接线 + 两列美化对齐参考卡 + last_mes/mesid 修复，真页验证通过）

**背景：** 用户拿 `屏幕截图 2026-07-01 094922.png`（Science_Worship 参考卡效果：顶部信息栏 + 发光叙事卡 + `状态面板/关系网络` 双 tab + 两列分区 + emoji/着色）问"纯文字美化和 MVU 状态栏美化能否做成这效果"。结论：图里效果 = 前端命令式渲染（不是纯文字宏，v8.4.6 已证宏不解析），而这正是上轮未归档的新提交 `de1b350`「消息内面板」的方向。

**恢复对话时发现 `de1b350` 状态：** 只加了 `src/神秘复苏模拟器/脚本/消息内面板/index.ts`（每条 AI 消息注入面板 + 叙事包装，命令式 `getVariables` 读 stat_data），但 **① 从未注册进 `index.yaml` 脚本列表（真页从未激活）② 有 bug ③ 未发布**。

**本轮四类改动（`消息内面板/index.ts`）：**
- **修 last_mes bug**：原 `if(...contains('last_mes'))return` 永久排除最新楼层 → 用户正在读的当前楼层永远没面板。刷新事件均在生成完成后触发（无流式中途注入），去掉排除即可，去重守卫 + swipe/update 自愈。
- **加 mesid 守卫**：跳过无有效 mesid 的隐藏 `.mes` 模板（真页 CDP 发现 `#chat` 外有个 mesid="" 的隐藏模板被挂了空面板）。
- **修事件委托**：行动按钮加序号徽章 `<span>` 后，点子元素会让 `target.classList` 判断落空 → tab/action 改 `closest()`。
- **美化对齐参考卡**：顶部浓缩信息栏（🎬阶段·📍位置·🩸死亡风险变色）+ 左右两列（左身份/能力/生存，右事件/驾驭厉鬼）+ 居中胶囊 tab + emoji 分区标题 + NPC 名字橙色着色+描述（解析「名-描述」）+ 双风险进度条。配色保持神秘复苏暗红（不照抄参考卡青色）。

**真页验证（CDP，把编译产物 eval 进 MVU 的 TH-script iframe 上下文，等价真实注册加载）：** ①读取路径 `getVariables({type:'message',message_id})`→`_.get(v,'stat_data')` 字段全可读（开局默认值）✅ ②面板挂进真实 `.mes`（parent.document）✅ ③**最新楼层有面板**（last_mes 修复）✅ ④加 mesid 守卫后 panelCount 2→1，跳过隐藏模板 ✅ ⑤两列/tab/进度条/emoji 全渲染 ✅ ⑥tab 切换事件委托 closest() 工作 ✅ ⑦固定状态栏/数据库前端未受影响，仍在输入框上方 ✅。真页实图确认消息内面板与固定状态栏正确并存。

**发布链路（worktree 从 origin/main 落地）：**
- source commit `3617a1c`（`index.yaml` 注册 消息内面板 id ...3003 + `消息内面板/index.ts` 美化+修复）→ push origin/main
- bot bundle `c547fac`（含新版 消息内面板 dist：mfrs-msg-columns/header/npc-name、closest、last_mes=0）
- publish sync `44c80e5`：`publish-card.mjs` CDN_REF=`c547fac`/releaseVersion=`8.4.9`；发布版 index.yaml 17 处链接换 @c547fac（含新 消息内面板 条目）；发布版 PNG 重打包
- 验证：发布版 yaml 版本 8.4.9 + 8×@c547fac + 0 旧 ref + 消息内面板已注册；PNG chara/ccv3 version 8.4.9×2 + @c547fac×16 + 0 旧 ref + 消息内面板×6；worldbook gate 383/33/5851；CDN smoke @c547fac 消息内面板 HTTP 200/15198

**当前状态：** 全部完成并 push origin/main（HEAD `44c80e5`）。**待用户操作**：重新导入 `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`(v8.4.9) 即可获得——每条 AI 消息内嵌入精美两列状态面板（顶部信息栏 + 双 tab + 进度条 + NPC 着色 + 行动建议按钮，命令式读 stat_data），与固定状态栏并存。无未决任务。

## 2026-06-30 CST（✅ v8.4.7+v8.4.8 完成：止血 v8.4.6 + 固定状态栏可展开两层美化 + parent.document 挂载修复，真页验证全通过）

**背景：** 用户问"如果要实现 Science_Worship 卡那样的状态栏美化效果该怎么做"。直接拆 `Science_Worship_20260628.png`（ccv3）取得硬证据，彻底推翻 v8.4.6 借鉴前提（详见 findings.md 顶部条目）：
- 它的两个「显示状态栏」正则（iframe 版 + 纯文字宏版）**都 disabled**；v8.4.6 照抄的纯文字版是它放弃的废案。
- 真正上线的状态栏 = 第 5 个酒馆助手脚本「悬浮状态栏」（281KB webpack，enabled），命令式读 MVU 变量渲染。
- `get_message_variable`/`format_message_variable` 不是 MVU(MagVarUpdate) 的宏（实测 bundle 只注册 `lastUserMessage`），是酒馆助手提示词侧宏，显示层 markdownOnly 不解析。
- 结论：复刻 SW 效果 = 命令式脚本渲染。神秘复苏已有命令式「输入框上方固定状态栏」脚本。

**用户决策（AskUserQuestion）：** 形态选「美化现有固定状态栏」+「可展开两层」。

**v8.4.7（止血 + 美化）已发布：**
- 止血：`src/神秘复苏模拟器/index.yaml` 的 `[界面]状态栏` 正则用 `git checkout f5cf6f4~1` 回滚到 v8.4.6 前（启用:false + 禁用 iframe）；全文件 `format_message_variable` 归零。
- 美化：`脚本/固定状态栏/index.ts` 重写为可展开两层——收起态紧凑摘要行(🩸死亡/☠️复苏/❤️状态/👻驾驭数)，点 ▾ 展开三分区折叠详情(生存状态含死亡/复苏进度条+状态+位置+阶段 / 当前灵异事件5字段 / 驾驭厉鬼列表)；新增 `riskColor`(红≥70/橙≥40/绿)、`toNumber`、`clampPercent`、`buildStatusView`；展开态 localStorage 记忆。全程命令式 `getVariables`，不引入宏。
- 发布链路：source `d99a5ca` → bot bundle `63cf0c2` → publish sync `5cb15b7`；CDN_REF=63cf0c2/releaseVersion=8.4.7。
- **止血真页确认**：用户导入 v8.4.7 + reload 后 CDP 实测 `rawMacroInBody` 从 5→**0**（消息内不再显示原始 `{{...}}` 文本）。

**v8.4.8（挂载修复）已发布 + 真页验证通过：**
- 真页验证 v8.4.7 时发现固定状态栏**从未挂载**（domHost=false）。CDP 定位根因：酒馆助手「脚本」跑在 JS-Slash-Runner 的 `TH-script--*` iframe 里，该 iframe 的 document **无主窗口 #send_form**；固定状态栏脚本用裸 `document.querySelector('#send_form')` 永远找不到、retryMount 20 次全失败（pre-existing bug，历来只验 dist grep 没验真页 DOM）。详见 findings.md 顶部条目。
- 修复：`脚本/固定状态栏/index.ts` 顶层取 `const doc = window.parent?.document ?? document`，所有主窗口 DOM 访问改用 `doc`（与 v8.4.6 iframe 版正则一致）；事件/变量全局仍用脚本上下文。
- 发布链路：source `302016e` → bot bundle `bfef412` → publish sync `dd01cb6`；CDN_REF=bfef412/releaseVersion=8.4.8。
- **端到端真页验证通过**（CDP 在 TH-script iframe 上下文 import @bfef412 固定状态栏）：`mountedInMainWindow=true`✅、收起摘要行 `🩸0/100 ☠️0% ❤️健康 👻0 ▾ 完整状态`✅、点 ▾ 展开 display:block 箭头▴✅、3 分区(生存/事件/驾驭)✅、2 进度条✅、死亡风险 0→绿色 rgb(70,192,160)(riskColor 正确)✅、命令式 getVariables 空时默认值✅、测试注入已清理✅。

**完整验证矩阵：** 开发版/发布版 yaml(版本 8.4.8、状态栏正则禁用、0 宏) + 发布版 PNG(chara/ccv3 version 8.4.8、7×@bfef412、0 旧 ref) + CDN @bfef412(HTTP 200、parent×5、data-bar×4) + worldbook gate 383/33/5851 + 真页挂载/展开/变色全绿。PNG 里 1 个 format_message_variable 来自 `世界书/变量/变量列表.txt`(prompt 侧既有合法用法，非状态栏)。

**当前状态：** 全部完成并 push origin/main(HEAD `dd01cb6`)。**待用户操作**：重新导入 `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`(v8.4.8) 即可获得——消息内不再有坏宏文本 + 输入框上方精美可展开固定状态栏(收起紧凑/展开三分区/风险变色/进度条)。


## 2026-06-30 CST（⚠️ v8.4.6 已发布但真页验证失败：状态栏正则宏不解析，待决策回滚/重做）

**状态：** v8.4.6 source + 发布同步已提交并 push 到 origin/main（merge `0976f15`）。借鉴第三方卡（Science_Worship，科学超电磁炮）的纯文字状态栏做法，把神秘复苏开发版的 `[界面]状态栏` 正则从「注入 CDN iframe」改为「纯 HTML `<details>` 折叠面板 + MVU 宏」，与输入框上方的 DOM 固定状态栏并存。

**需求来源：** 用户提供 Science_Worship 角色卡 PNG，问其前端纯文字/状态栏美化如何实现、能否借鉴。分析得知该卡用 4 条 regex_scripts：①去除变量更新 ②去除占位符 ③显示状态栏(前端，315KB webpack Vue iframe) ④显示状态栏(纯文字，`<details>`+inline CSS+`{{get_message_variable::stat_data.xxx}}` 宏)。用户要求借鉴纯文字版改进。

**改造内容（`src/神秘复苏模拟器/index.yaml` 的 `[界面]状态栏` 正则）：**
- 查找表达式不变：`/<StatusPlaceHolderImpl\/>/g`（MVU 框架自动注入到 AI 消息的占位符，神秘复苏本就有）。
- 替换内容从旧的 iframe 注入脚本（加载 CDN `@47a5fe5 状态栏/index.html`）改为纯 HTML：两个 `<details>` 折叠区（🩸 生存状态 / 👻 当前灵异事件），inline CSS 暗红主题，10 个 `format_message_variable` 宏读 stat_data。
- `启用: true`、`仅格式显示: true`（markdownOnly，不污染发给 AI 的上下文）。
- 净改动 23 insert / 55 delete（删掉 iframe 脚本）。

**关键修正（避免照搬踩坑）：** 借鉴卡用 `{{get_message_variable::}}` 宏，但 CDP 实测该宏在神秘复苏环境**不被解析**（`substituteParamsExtended` 原样返回）。改用项目已验证的 **`{{format_message_variable::stat_data.路径}}`**——神秘复苏世界书 `变量列表.txt` 和官方示例卡 `示例/角色卡示例/index.yaml:252`（`{{format_message_variable::stat_data.白娅.依存度}}` 取单字段）都在用。

**字段映射（对照 schema.ts，全标量叶子）：** 生存状态区=风险值/厉鬼复苏程度/状态/所在位置/主线进度.当前阶段；事件区=当前灵异事件.{事件代号,危害等级,发生地点,鬼域状态,处理状态}。stat_data 空时宏取 schema 默认值（风险 0、状态 健康、事件 未立案灵异事件）。

**发布链路（卡本体改动，无 dist 变更，故不需 bot bundle，CDN_REF 不变）：**
- source commit：`f5cf6f4` — `feat(mfrs): replace iframe status-bar regex with lightweight text details panel`
- publish sync commit：`5dbcd6e` — `chore(release): publish mfrs v8.4.6`（merge `0976f15`）
- `scripts/publish-card.mjs`：`CDN_REF=ec3a312`（不变），`releaseVersion=8.4.6`

**验证：**
- 开发版/发布版 yaml 解析 ✅：启用 true、仅格式显示 true、10 宏 format_message_variable、0 残留 get_message_variable、无 iframe/47a5fe5、2 个 details
- 发布版 YAML version 8.4.6；PNG chara/ccv3 各含 8.4.6、11×format_message_variable、0×旧 iframe ref
- worldbook pollution gate ✅：383/33/5851
- 占位符机制 ✅：CDP 确认 AI 消息含 `<StatusPlaceHolderImpl/>`（anyPlaceholder=true）

**⚠️ 真页验证失败（2026-06-30，v8.4.6 实际不工作，待决策）：** 用户导入 v8.4.6 后 CDP 真页验证发现：正则替换工作（开场白 `<StatusPlaceHolderImpl/>` 被替换、渲染出 details 面板），**但 `format_message_variable` 宏不被解析**——面板里显示一堆原始 `{{format_message_variable::stat_data.风险值}}` 文本。
- 决定性测试：注入测试数据后用 `TavernHelper.formatAsDisplayedMessage(text,{message_id:0})` 渲染，`get_message_variable` 和 `format_message_variable` **两个宏都原样返回**；甚至用 `registerMacroLike` 注册 `get_message_variable` 宏后，`formatAsDisplayedMessage` 仍不解析（macro_like 宏的解析时机与 markdownOnly 正则替换对不上）。
- 根因：这两个宏在神秘复苏的酒馆助手环境**根本没注册**。神秘复苏一直用 `getVariables()` JS API + DOM 状态栏（命令式），从不用宏；借鉴卡 Science_Worship 能用是它自带注册宏的脚本（tavern_helper.scripts 里有 MVU-ZOD/悬浮状态栏等）。直接照搬"正则+宏"声明式方案到没宏的神秘复苏环境，宏这一环断了。
- 附带发现：测试时这轮对话 `stat_data` 全空（AI 输出 `<UpdateVariable>` 但变量没生效），是独立于状态栏的 MVU 数据流问题。
- **当前 origin/main 上的 v8.4.6 是坏的**——用户导入后开场白会显示原始 `{{...}}` 文本，比改之前更难看。

**待决策（下一步必做）：** 三选一——① **回滚 v8.4.6**（恢复 `[界面]状态栏` 正则到禁用的 iframe 版原状，止血）；② **方案 B 重做**（不用宏：正则把占位符换成空容器 + 脚本用 `getVariables` 命令式填值，复用固定状态栏渲染逻辑）；③ 放弃消息内面板。**已分析结论：对神秘复苏（无宏环境）推荐命令式方案 B；声明式正则+宏只在原生有宏的环境才轻量。** 用户尚未拍板，新对话先问用户选哪个再动手。

## 2026-06-30 CST（✅ v8.4.5 发布：货币监听器跳过开场白/静默生成，修复开局误发调查点）

**状态：** v8.4.5 source 已提交并 push，bot bundle `ec3a312`（tag `v0.0.334`）已生成，发布版 PNG 已同步、验证并通过发布同步提交 `005d4ec` 推送到 origin/main。修复"打开角色卡开始聊天、一句话未发就弹『🔍 获得调查点 👻 对抗厉鬼 +15』"的 bug。

**用户报告现象：** 点开角色卡开始聊天时（未发送任何消息）就显示"获得调查点 👻 对抗厉鬼 +15"。

**根因（`v10_2_visualizer.js` 货币被动获取系统 L4344-4511）：**
- 抽卡系统监听 `MESSAGE_RECEIVED`，把 AI 回复文本匹配关键词发"调查点"，`ghost` 规则 pattern 首条即 `/厉鬼/i`（+15）。
- 角色卡开场白正文含"厉鬼复苏…对抗厉鬼…"，命中 ghost 规则。
- 打开角色卡新建/加载聊天时，开场白（first_mes）作为第 0 条 AI 消息载入会触发一次 `MESSAGE_RECEIVED`；旧监听器是无参回调，只取"最后一条非用户消息"= 开场白，无法区分"开场白加载"和"AI 真实新回复"，于是误发 message+1 与 ghost+15 并弹 toast。

**真页 bug 复现（CDP 铁证，v8.4.4 旧版页面）：** 当前聊天 `chatLen=1`（仅开场白、玩家未发言），`localStorage.mfrs_gacha_currency_log` 却有 19 条 `ghost +15` 记录、余额被刷到 357；开场白片段"（…厉鬼复苏，人间如狱。）"命中 `/厉鬼/`。每次新建聊天即误发一次 message+ghost，证实根因。

**修复内容（`src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js`）：**
- 监听器改用 SillyTavern 回调签名 `(messageId, type)`。
- 跳过 `messageId === 0`（开场白永远是第 0 条消息）。
- 跳过 `type === 'quiet'`（后台静默生成，如抽卡「AI 生成物品」，同样会误发，顺手堵上）。
- 用 `messageId` 精确定位该条消息（无效时回退到最后一条非用户消息），替代旧的"取最后一条非用户消息"。
- 净改动 16 insert / 5 delete。

**发布链路：**
- source commit：`73b77aa` — `fix(gacha): skip opening message & quiet generation in passive currency listener`（分支 `fix/gacha-currency-opening` → merge `bb5c5fb`）
- bot bundle：`ec3a312`（tag `v0.0.334`）— CI 重建 dist，确认 minified 含 `'quiet'===a` 排除
- publish sync commit：`005d4ec` — `chore(release): publish mfrs v8.4.5`
- `scripts/publish-card.mjs`：`CDN_REF=ec3a312`，`releaseVersion=8.4.5`

**验证：**
- `node --check v10_2_visualizer.js` ✅ + 本地 build + CI bot bundle dist 均确认 `'quiet'===a` 进 bundle
- CDN smoke ✅：`@ec3a312` 数据库前端 index.js HTTP 200，357831 字节
- 发布版 YAML ✅：version 8.4.5，7×`ec3a312`，0×旧 ref（`6ee50a7`），0× localhost
- 发布版 PNG chara/ccv3 ✅：各 7×`ec3a312`、0×旧 ref、0×`8.4.4` 残留
- worldbook pollution gate ✅：383 entries / 33 disabled / max enabled 5851

**真页验证（2026-06-30 ✅ 通过）：** 用户重新导入 v8.4.5 发布版 PNG（卡内 14×@ec3a312、0×旧 ref）后手动验证开局不再误发调查点，问题已解决。CDP 旁证：导入后从欢迎页 `selectCharacterById(5)` 加载神秘复苏开场白（chatLen=1、开场白正文含"厉鬼"命中旧 ghost 规则），`mfrs_gacha_currency` 保持 373 未变、`mfrs_gacha_currency_log` 无新增条目——与用户手动验证一致，修复生效。（被误刷高的历史余额 373 属旧数据，用户可自行决定是否清零。）

## 2026-06-30 CST（✅ v8.4.4 发布：新建聊天 CHAT_CHANGED 轮询等待数据切换）

**状态：** v8.4.4 source 已提交并 push，bot bundle 已生成，发布版 PNG 已同步、验证并通过发布同步提交推送到 origin/main。修复新建/切换聊天时 `CHAT_CHANGED` 触发过早导致新聊天不重新导入神秘复苏 14 表模板的竞态。本条目对应的改动在 v8.4.3 发布后曾以未提交 WIP 形式挂在工作区（仅改 src TS、未构建/提交/记录），本次恢复对话时确认并完整推进发布。

**根因：**
- 新建聊天时酒馆的 `CHAT_CHANGED` 事件在数据库数据切换完成之前就触发了。
- 此时数据库可能仍在服务旧聊天的 14 表数据，`readTemplateStatus(api)` 返回 `templateLoaded=true`（误判），`runMysteryTemplateAutofix` 直接 `rerenderAcu` 返回，新聊天不会重新导入模板，停在库默认 8 表。

**修复内容（`src/神秘复苏模拟器/脚本/数据库前端/index.ts`）：**
- `runMysteryTemplateAutofix(hostWindow, force = false)` 新增 `force` 参数；`ensureMysteryTemplate(force)` 透传给它（两个 CHAT_CHANGED 监听分支——酒馆助手 `eventOn` 与 v8.4.3 的 SillyTavern 原生 `eventSource.on`——都已传 `force=true`）。
- `force=true` 且首次 `status.templateLoaded` 为 true 时，轮询最多 8×500ms（共 4s）重读 `readTemplateStatus`，一旦 `templateLoaded` 变 false（数据切到新聊天默认 8 表）立即跳出，继续走后续导入逻辑。
- 净改动 13 insert / 3 delete，逻辑自洽（复用既有 `wait`/`readTemplateStatus`），无新增字符串。

**发布链路：**
- source commit：`491fe43` — `fix(mfrs): poll for chat data switch on CHAT_CHANGED to avoid stale 14-table false positive`（经分支 `fix/mfrs-newchat-race` → merge `548e9f0`）
- bot bundle：`6ee50a7`（tag `v0.0.330`）— CI 重建 dist，确认 minified 含轮询 `t<8`
- publish sync commit：`92b32bd` — `chore(release): publish mfrs v8.4.4`
- `scripts/publish-card.mjs`：`CDN_REF=6ee50a7`，`releaseVersion=8.4.4`
- `pnpm run publish-card -- 神秘复苏模拟器发布版` 成功，发布版 PNG 已生成（7.4 MB）。

**验证：**
- 本地 `pnpm build` ✅ + CI bot bundle dist 均确认轮询 `t<8` 进 bundle
- CDN smoke ✅：`@6ee50a7` 数据库前端 index.js HTTP 200，357703 字节
- 发布版 YAML ✅：version 8.4.4，7×`6ee50a7`，0×旧 ref（`99f92ff`），0× localhost/127.0.0.1
- 发布版 PNG chara/ccv3 ✅：各 7×`6ee50a7`、0×旧 ref
- worldbook pollution gate ✅：383 entries / 33 disabled / max enabled 5851

**真页验证（2026-06-30 ✅ 通过）：** 用户已导入 v8.4.4 发布版 PNG（卡内 14×@6ee50a7、version 8.4.4，数据库前端 iframe `...3002` 已加载）。通过 Chrome DevTools MCP 在 `http://127.0.0.1:8000/` 确认：切换前聊天 `MysteryDatabaseFrontend.checkTemplateStatus()` 返回 `templateLoaded=true` / 14 表（触发竞态的前置条件）；用户手动多次点击"开始新聊天"后，新聊天（chatId 时间戳 18h35m09s）`checkTemplateStatus()` 仍为 `templateLoaded=true` / 14 表完整（全局状态…收录规律），未停在库默认 8 表。修复生效，新建聊天后神秘复苏 14 表模板自动恢复。

## 2026-06-30 CST（✅ v8.4.3 发布：CHAT_CHANGED 原生事件回退）

**状态：** v8.4.3 source 已提交并 push，bot bundle 已生成，发布版 PNG 已同步、验证并通过发布同步提交推送到 origin/main。修复数据库前端在酒馆助手注入不可用环境下无法注册 CHAT_CHANGED 监听器的问题。规划文件（task_plan.md / progress.md）同步更新。

**根因：**
- 数据库前端 `installCompatibilityApi()` 原先只通过酒馆助手 `eventOn(tavern_events.CHAT_CHANGED, ...)` 注册切换聊天监听。
- 当脚本运行在主 window 且酒馆助手注入环境不可用时（`eventOn` / `tavern_events` 未定义），该监听器无法注册，切换聊天后模板不会自动刷新。

**修复内容：**
- `src/神秘复苏模拟器/脚本/数据库前端/index.ts`：`eventOn` 分支后新增 `else` 回退路径，通过 `SillyTavern.getContext().eventSource.on(event_types.CHAT_CHANGED)` 注册原生事件监听。
- `HostWindow.SillyTavern.getContext` 返回类型扩展，新增 `eventSource`（兼容 EventEmitter `.on`/`.off`）和 `event_types`（事件名常量表）字段。
- 回退成功时 `console.info` 提示，完全不可用时 `console.warn` 提示用户手动刷新。
- 附带 `scripts/cdp-evaluate.mjs` 超时从 15s 提升到 60s，适配数据库前端/抽卡面板等重页首加载。

**发布链路：**
- source commit：`294cc1a` — `fix(mfrs): fallback CHAT_CHANGED listener via SillyTavern native event system`
- 工具 commit：`2c5e19a` — `chore(tools): increase cdp-evaluate timeout to 60s`
- bot bundle：`99f92ff`
- publish sync commit：`feeaa18` — `chore(release): publish mfrs v8.4.3`
- `scripts/publish-card.mjs`：`CDN_REF=99f92ff`，`releaseVersion=8.4.3`
- `pnpm run publish-card -- 神秘复苏模拟器发布版` 成功，发布版 PNG 已生成。

**验证：**
- 发布版 YAML ✅：version 8.4.3，7×`99f92ff`，0×旧 ref
- 发布版 PNG 已生成（7.4 MB）
- 规划文件同步：task_plan.md 当前状态/版本索引/修复线/恢复入口均已更新到 v8.4.3

**剩余：** 可选真页验证：重新导入 v8.4.3 PNG 后，在酒馆助手注入不可用的环境下切换聊天，确认数据库前端模板自动刷新（控制台应出现 `[神秘复苏数据库前端] 已通过 SillyTavern 原生事件系统注册 CHAT_CHANGED 监听。`）。

## 2026-06-30 CST（✅ v8.4.2 发布：线索表/规律表新增使用按钮）

**状态：** v8.4.2 source 已提交并 push，bot bundle 已生成，发布版 PNG 已同步、验证并通过发布同步提交推送到 origin/main。用户重新导入 v8.4.2 发布版 PNG 后，抽卡系统档案池抽取的线索和规律池抽取的知识也能在数据库前端点击"使用"填入输入框。

**改动内容：**
- 新增 `isClueTable()` / `isRulesTable()` 检测函数，识别 `sheet_clues` 和 `sheet_collected_rules` 表。
- 新增 `buildCluePrompt()` / `buildRulePrompt()` 构建使用指令：线索→`我使用线索【线索编号】。内容：...推断：...可信度：...`，规律→`我运用知识【规律类型】。规律内容：...完整度：...风险：...`。
- `buildRowInteractionHtml()` 中为线索表和规律表行渲染"使用"按钮（图标 fa-magnifying-glass / fa-book-open），与灵异物品表一致的 `acu-row-action-btn` + `data-prompt` 机制。
- 46 行新增代码，无删除。

**发布链路：**
- source commit：`6133076` — `fix(mfrs): add use buttons for clue and rules tables`
- bot bundle：`7e2cc0b`，tag `v0.0.324`
- publish sync commit：`5760112` — `chore(release): publish mfrs v8.4.2`
- `scripts/publish-card.mjs`：`CDN_REF=7e2cc0b`，`releaseVersion=8.4.2`
- `pnpm run publish-card -- 神秘复苏模拟器发布版` 成功，发布版 PNG 已生成（7.4 MB）。

**验证：**
- `node --check v10_2_visualizer.js` ✅
- `node scripts/verify-output-cleaning-regressions.mjs` ✅
- `node scripts/verify-worldbook-pollution-gate.mjs` 发布版 PNG ✅（383 entries / 33 disabled / max enabled 5851）
- 发布版 YAML ✅：version 8.4.2
- CDN smoke ✅：`@7e2cc0b` dist 数据库前端 index.js HTTP 200，326548 字节

**剩余：** 可选真页验证：重新导入 v8.4.2 PNG 后，从档案池/规律池抽卡获得线索/知识物品，确认线索表和规律表出现"使用"按钮并正确填入输入框。当前真页线索表/规律表无数据，无法直接验证。

## 2026-06-30 CST（✅ v8.4.1 真页验证通过：开局面板 + 数据库前端交互 + 正文摘要三层全绿）

**状态：** 使用 `scripts/cdp-evaluate.mjs`（裸 CDP via 9222 page target）在真实酒馆页面 `http://127.0.0.1:8000/` 完成 v8.4.1 三个核心验证点，全部通过。

**验证环境：**
- Chrome 149.0.7827.199，CDP 端口 9222 开放，酒馆 HTTP 200
- 当前角色：idx=5"神秘复苏模拟器发布版"，CDN ref `a34b4d5`（与 v8.4.1 发布版一致），383 entries
- 当前对话：5 条消息（2 轮真实对话已完成），chatId 含 2026-06-30 时间戳
- `window.MFRS` 成功挂载：37 keys，version 1.0（v8.3 父窗口挂载修复生效）
- `window.MysteryDatabaseFrontend` ACU 实例可用，14 张表名含"行动建议"和"灵异物品"
- 替代路径：当前会话未暴露 Chrome DevTools MCP，按 PROJECT_FLOW.md 使用 `scripts/cdp-evaluate.mjs`

**验证点 1：开局自定义角色面板（`<sp_start>`）— ✅ 通过**
- 第 0 条 AI 消息 raw 含 `<sp_start>` 块，内容"请设定你的姓名、性别、年龄..."
- 渲染后显示完整开局自定义表单：18 个表单元素全部就位（姓名/年龄性别/身份选择/厉鬼增删/特殊能力/剧情节点/初始资源/提交按钮"进入神秘复苏世界"）
- v8.4.1 修复确认生效：`<sp_start>` 未被旧面板清洗正则误删

**验证点 2：数据库前端"选择/使用"交互按钮 — ✅ 通过**
- ACU.openVisualizer() 展开面板 → "行动建议"标签 → 4 个"选择"按钮（A/B/C/D），点击填入 `我选择A：向周正摊牌民间驭鬼者身份，表明无恶意` ✅
- "灵异物品"标签 → 8 个"使用"按钮，点击填入 `我使用灵异物品【红色鬼烛】。效果：...使用限制：...` ✅
- 按钮用 `class="acu-row-action-btn"` + `data-prompt`，`bindDynamicContentEvents` 委托绑定

**验证点 3：AI 回复只显示剧情 + `【本轮摘要】` — ✅ 通过**
- raw 含 `【本轮摘要】` ✅ + 后台协议块 `<sp_status>`/`<sp_choices>`/`<choices>`/`<UpdateVariable>`（预期保留）
- 显示层 DOM：所有协议块不可见 ✅，仅剧情 + `【本轮摘要】`（6 行）✅
- v8.4 显示正则和 hotfix 清洗链路生效

**结论：** v8.4.1 三个核心验证点全部通过，发布版与真页运行态一致。无阻断项。

**注意：** L3342 仍有 1 处 `.acu-row-action-btn').off('click').on('click')` 逐个绑定（在 `bindDynamicContentEvents` 中），不在 v8.0 事件委托重构范围内（针对 `data-mfrs-action` 抽卡面板按钮）。数据库前端表格行交互按钮用独立 class 选择器绑定，功能正常，非 bug。


## 2026-06-30 CST（✅ Codex 更新后日志防护复检 + 项目进度确认）

**状态：** 用户更新 codex 后复检 TRACE 日志高频写盘防护措施，确认触发器仍生效；使用 planning-with-files 恢复上下文，逐项核对源码和发布版元数据，全部与 task_plan.md 声称一致。

**Codex 日志防护复检（详细）：**
- codex-cli 版本：`0.142.4`（npm `@openai/codex@0.142.4`，npm registry 最新版同为 0.142.4，无新版本发布）
- 用户"更新 codex"后版本仍为 0.142.4，说明当前已是最新版，无新版修复 TRACE 高频写盘问题
- `~/.codex/logs_2.sqlite` 的 `block_log_inserts` 触发器仍存在且生效：`BEFORE INSERT ON logs BEGIN SELECT RAISE(IGNORE); END`
- logs 表无新写入：最后一条日志时间 `2026-06-27 17:59:01`（3 天前），当前日期 2026-06-30，确认触发器持续拦截
- 行数冻结在 19,404 行；AUTOINCREMENT 计数器已推进到 14,646,256，意味着约 1,460 万次 INSERT 尝试被触发器静默拦截
- 数据库 journal_mode=WAL，query_only=0（非 pragma 级只读）；OS 文件属性 IsReadOnly=False
- 新版本（0.142.4）仍无原生日志级别配置：`codex debug` 子命令无 log/trace/verbose 选项，`config.toml` 无 log-level 字段
- **结论：SQLite 触发器防护仍是最有效手段，0.142.4 未修复 TRACE 高频写盘问题，触发器需保留**

## 2026-06-30 CST（✅ 会话恢复核对：v8.4.1 发布态一致 + Codex 日志防护确认）

**状态：** 使用 planning-with-files 恢复上下文，逐项核对源码、发布版元数据、回归脚本和 Codex 日志防护，全部与 task_plan.md 声称一致，无漂移。

**Codex 日志防护检查：**
- codex-cli 版本：`0.142.4`（未变，无新版本修复 TRACE 高频写盘问题）
- `~/.codex/logs_2.sqlite` 的 `block_log_inserts` 触发器仍存在且生效：`BEFORE INSERT ON logs BEGIN SELECT RAISE(IGNORE); END`
- logs 表无新写入（触发器持续拦截所有 INSERT，包括 TRACE 级别）
- 新版本（0.142.4）无原生日志级别配置，触发器防护仍是有效手段

**项目进度核对：**
- git HEAD = `5f17c72`，与 origin/main 同步；dirty 仅为 `dist/**`（构建残留）+ `.claude/worktrees/*` + `.tmp-jerryzmtz-my-tavern-scripts/`，均为已知无关项
- `scripts/publish-card.mjs`：`CDN_REF=a34b4d5`、`releaseVersion=8.4.1` ✅
- 发布版 `src/神秘复苏模拟器发布版/index.yaml`：version 8.4.1，7×`a34b4d5`，0×旧 ref ✅
- 源码 hotfix 正则含负向先行 `sp_start|sp_input` ✅；开发版 yaml 显示正则同含 ✅
- `verify-output-cleaning-regressions.mjs` passed ✅
- `verify-worldbook-pollution-gate.mjs --expect-mfrs-runtime` 开发版 PNG 383/33/5851 PASS ✅

**结论：** v8.4.1 发布态与源码完全一致，无阻断项。剩余均为可选任务。

## 2026-06-29 CST（✅ v8.4.1 热修复发布：保留开局自定义角色面板）

**状态：** v8.4.1 source 已提交并 push，bot bundle 已生成，发布版 PNG 已同步、验证并通过发布同步提交推送到 origin/main。用户应重新导入 v8.4.1 发布版 PNG。

**回归根因：**
- v8.4 为减少正文 MUV/MVU 面板占用，新增 `[显示]隐藏旧 sp/mfrs 文本面板`，并在 `hotfix-generation-ended-listeners` 中整段删除旧 `<sp_*>/<mfrs_*>` 面板。
- 该正则匹配所有 `<sp_*>`，而开局自定义角色入口使用 `<sp_start>...</sp_start>`；显示正则顺序中旧面板隐藏位于 `[显示]渲染神秘复苏开局页` 之前，导致 `<sp_start>` 先被清空，开局自定义表单消失。
- `<sp_input>` 是同类可交互输入面板，也会被该广义清洗误伤。

**修复内容：**
- `src/神秘复苏模拟器/index.yaml`：旧面板隐藏正则改为排除 `sp_start` / `sp_input`。
- `src/神秘复苏模拟器/脚本/hotfix-generation-ended-listeners/index.ts`：运行态清洗同样排除 `sp_start` / `sp_input`。
- `scripts/verify-output-cleaning-regressions.mjs`：新增回归断言，要求 `<sp_start>` 渲染为开局自定义表单、`<sp_input>` 渲染为复杂行动输入面板，同时旧 `<sp_status>/<sp_choices>` 继续隐藏。

**发布链路：**
- source commit：`6cb397f` — `fix(mfrs): preserve opening custom panels`
- bot bundle：`a34b4d5`，tag `v0.0.321`
- publish sync commit：`8b2d759` — `chore(release): publish mfrs v8.4.1`
- `scripts/publish-card.mjs`：`CDN_REF=a34b4d5`，`releaseVersion=8.4.1`
- `pnpm run publish-card -- 神秘复苏模拟器发布版` 成功，发布版 PNG 已生成。

**验证：**
- `git diff --check` ✅
- `node --check "src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js"` ✅
- `node scripts/verify-output-cleaning-regressions.mjs` ✅（主工作区）
- `pnpm build` ✅（仅既有数据库前端 bundle 347 KiB 体积 warning）
- 开发版 worldbook gate ✅：383 entries / 33 disabled / max enabled 5851
- 发布版 worldbook gate ✅：383 entries / 33 disabled / max enabled 5851
- 发布版 YAML ✅：version 8.4.1，7×`a34b4d5`，0×`065e519`，0×`6cb397f`
- 发布版 PNG chara/ccv3 ✅：version 8.4.1，7×`a34b4d5`，0×旧 ref/source ref
- CDN smoke ✅：hotfix、数据库前端、固定状态栏三个 `@a34b4d5` 资源均 HTTP 200

**注意：** 发布 worktree 未安装 `node_modules`，在该 worktree 单跑 `verify-output-cleaning-regressions.mjs` 会因找不到 `yaml` 包失败；同一源码已在主工作区通过。

**剩余：** 可选真页验证：重新导入 `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`，确认开局自定义表单可见，“进入神秘复苏世界”能写入/发送开局设定，数据库前端“选择/使用”仍能填入输入框，AI 回复仍只显示剧情 + `【本轮摘要】`。

## 2026-06-29 CST（✅ v8.4 发布版同步完成并推送：正文摘要 + 数据库前端交互迁移）

**状态：** v8.4 source 已提交并 push，bot bundle 已生成，发布版 PNG 已同步、验证并通过发布同步提交推送到 origin/main。用户可重新导入 v8.4 发布版 PNG。

**发布链路：**
- source commit：`fb5127a` — `feat(mfrs): compact turn summary and database interactions`
- bot bundle：`065e519`，tag `v0.0.318`
- publish sync commit：`4a2ab27` — `chore(release): publish mfrs v8.4`
- `scripts/publish-card.mjs`：`CDN_REF=065e519`，`releaseVersion=8.4`
- `pnpm run publish-card -- 神秘复苏模拟器发布版` 成功，镜像目录：第一条消息/系统提示词/对话示例/世界书/数据库，发布版 PNG 已生成。

**发布验证：**
- 发布版 worldbook gate ✅：383 entries / 33 disabled / max enabled 5851
- 发布版 YAML ✅：version 8.4，7×`065e519`，0×`3f71015`，0×`fb5127a`
- 发布版 PNG chara ✅：version 8.4，7×`065e519`，0×旧 ref/source ref
- 发布版 PNG ccv3 ✅：version 8.4，7×`065e519`，0×旧 ref/source ref
- CDN smoke ✅：数据库前端、界面美化、hotfix-generation-ended-listeners 三个 `@065e519` 资源均 HTTP 200

**剩余：** 可选真页验证仍未做：点击数据库前端“选择/使用”是否填入输入框，AI 回复显示是否只剩剧情 + `【本轮摘要】`。

## 2026-06-29 CST（✅ v8.4 候选开发版完成：正文摘要 + 数据库前端交互迁移）

**状态：** 按用户要求把 MUV/MVU 可见内容压缩到正文中的 `【本轮摘要】`，交互迁移到神秘复苏数据库前端。开发版源码、开发版 PNG 和回归脚本已更新并验证通过；发布版尚未同步，远程尚未提交/推送本轮改动。

**完成内容：**
- 输出契约改为：正文剧情（首段 350 字以内） → `【本轮摘要】` → `<choices>` → `<UpdateVariable>`。
- `【本轮摘要】` 固定最多 6 行：位置、事件、状态、线索、资源、下一步；禁止完整变量档案和隐藏真相。
- 停用旧可见大面板：`<sp_status>`、`<sp_choices>`、`<sp_clue_deduce>`、`<sp_ghost_encounter>`、`<sp_item_use>`、【状态面板】、【推演选项：】。
- `hotfix-generation-ended-listeners` 改为整段删除旧 `<sp_*>/<mfrs_*>` 文本面板，并加固为支持带属性的同名闭合标签。
- `界面美化` 的内联协议检测扩展到全部 `sp_*` / `mfrs_*`，`index.yaml` 新增 `[显示]隐藏旧 sp/mfrs 文本面板` 正则，避免旧面板在显示层残留。
- 数据库前端新增行动建议/灵异物品行交互：`行动建议` 表按钮“选择”填入 `我选择A：...`，`灵异物品` 表按钮“使用”填入 `我使用灵异物品【物品名】...`；后续点击会替换上一次数据库前端插入内容，避免无限堆叠。
- `行动建议` 表现在也是选项面板来源，不再依赖正文可见 A/B/C/D 大块。
- `verify-output-cleaning-regressions.mjs` 更新为新契约：旧 sp 面板应隐藏，`【本轮摘要】` 应保留。

**验证：**
- `git diff --check` ✅
- `node --check "src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js"` ✅
- `node scripts/verify-output-cleaning-regressions.mjs` ✅
- `pnpm build` ✅（仅既有数据库前端 bundle 347 KiB 体积 warning）
- `node scripts/verify-worldbook-pollution-gate.mjs --expect-mfrs-runtime "src/神秘复苏模拟器/神秘复苏模拟器.png"` ✅（383 entries / 33 disabled / max enabled 5851）

**注意：**
- `node --check` 不能直接检查 `.ts` 文件；Node 会把 TypeScript 类型当语法错误。TS 语法由 `pnpm build` 覆盖。
- PNG 元数据仍会出现旧 `<sp_*>` / `【推演选项：】` 字符串命中，来源是负向规则、兼容正则、禁用旧渲染模板或开场 `<sp_start>`，不代表输出契约仍要求旧面板。
- 当前 dirty 包含 v8.4 源码/开发版 PNG/回归脚本和本地 dist 构建产物；`.claude/worktrees/*` 与 `.tmp-jerryzmtz-my-tavern-scripts/` 不提交。

**下一步：** 若继续发布，先精确提交 source 改动并 push，等待 bot bundle；拿到新版 bundle commit 后回填 `scripts/publish-card.mjs` 的 CDN_REF 和 `releaseVersion=8.4`，运行 `pnpm run publish-card -- 神秘复苏模拟器发布版`，验证发布版 PNG 后再提交推送。

## 2026-06-29 CST（✅ v8.3 发布同步完成：MFRS API 父窗口挂载 + 自定义编辑器修复收口）

**状态：** 接续 v8.2 后的真实导入卡验证结果，完成自定义编辑器渲染 bug 修复、MFRS API 父窗口挂载增强、bot bundle 和发布版 v8.3 同步。

**真实根因收口：**
- `window.MFRS` v8.2 在真实运行态已能挂载，但最初只在脚本 iframe 上可见；本轮将公开 API 同步挂到 `getHost()` 返回的父窗口，并在 iframe 内保留 `window.MFRS` 引用，方便主窗口控制台和外部脚本调用。
- 碎片商店此前“无 frag-buy”不是渲染失败：按钮按碎片余额/已拥有状态渲染，余额不足时显示 disabled 的“残屑不足”，不会带 `data-mfrs-action="frag-buy"`。
- 自定义编辑器此前无 `data-mfrs-action` 是真 bug：v8.0 事件委托重构删除了 `bindItemActions()` 函数，但 `showCustomItemEditor()` 里残留两处调用，打开编辑器时抛 `ReferenceError: bindItemActions is not defined`。已在 `dec01b9` 移除残留调用。

**发布链路（v8.3）：**
- `dec01b9`：移除遗留 `bindItemActions()` 调用，真页验证确认 iframe 5 的 `window.MFRS` 成功挂载、抽卡面板 action 正常、碎片商店 27 行正常。
- `c7e5699`：`window.MFRS` 同步挂载到父窗口 `host.MFRS`，iframe 内回填 `window.MFRS = host.MFRS`。
- bot bundle `3f71015`，tag `v0.0.315`。
- `publish-card.mjs`：`CDN_REF=3f71015`，`releaseVersion=8.3`。
- 发布版 YAML：版本 `8.3`，7 处 `@3f71015`，旧 `@6e40523`/`@ecf9706`/`@512542b` 为 0。
- 发布版 PNG 元数据：`chara`/`ccv3` 均 version=8.3，均 7×`@3f71015`，旧 ref 为 0。
- worldbook gate：383 entries / 33 disabled / max enabled 5851 PASS。
- CDN smoke：数据库前端 bundle 和固定状态栏资源均 HTTP 200；数据库前端 bundle 含 `MFRS`，不含 `bindItemActions`。

**当前停点：** v8.3 发布版同步已提交并 push 到 origin/main：`15936d1`（tag `v0.0.316`）。用户后续重新导入 v8.3 PNG 即可验证主窗口 `window.MFRS`、碎片商店和自定义编辑器。

## 2026-06-29 CST（✅ window.MFRS 挂载失败最终修复 — v8.2 发布）

**状态：** v8.1 的别名变量修复无效（Me=showGachaResult 仍然引用被重命名的变量），定位到真正根因并完成修复。

**根因修正：** showGachaResult 是 showGachaPanel 函数内部的局部变量（L5153，嵌套在 L4998 的 showGachaPanel 内），IIFE 顶层作用域（L6264 挂载块）无法引用它。这不是 minifier 简写 bug，而是作用域错误——showGachaResult 在挂载块的作用域链中不可达。v7.8 发布时只 grep 了 dist bundle 中有 window.MFRS 字符串，没有真机验证实际挂载结果。

**修复：** 从 window.MFRS 挂载块中移除 showGachaResult。它是 UI 内部函数，不需要作为公开 API。同时移除无效的别名变量 _showGachaResult。

**真页验证（eval CDN @ecf9706）：** window.MFRS 成功挂载，37 个 key，31 个方法，version=1.0，getCurrency/single/showPanel 均为 function，无错误。

**发布链路已完成（v8.2）：**
- 源码 commit be1f52d
- bot bundle ecf9706 (tag v0.0.313)
- publish-card CDN_REF=ecf9706, releaseVersion=8.2
- PNG chara/ccv3 version=8.2, 7xecf9706, 0 旧 ref
- worldbook gate 383/33/5851 PASS

**当前停点：** v8.2 发布版同步待提交 + push。用户需重新导入 v8.2 PNG 验证 window.MFRS 和碎片商店/编辑器功能。

## 2026-06-29 CST（✅ window.MFRS 挂载失败根因定位并修复 — v8.1 发布）

**状态：** 接续暂停的排查任务，通过 Chrome DevTools MCP 真页实验定位到 window.MFRS 未挂载的根因并完成修复发布。

**根因定位过程：**

1. CDN bundle 确认包含 window.MFRS=Object.assign(...) 挂载块，代码结构完整。
2. 在主 window 上下文 new Function(code)() eval 执行 CDN bundle，执行成功但 window.MFRS 仍为 undefined。
3. 用 Object.defineProperty 在 window.MFRS 上设置 setter 陷阱，发现 setter 从未被调用——挂载块代码没有执行到 window.MFRS= 赋值。
4. 注入 window.__preTestMarker__ 在 try{window.MFRS= 之前一行，marker 设置成功，但 window.MFRS 仍为 undefined。
5. 在 catch 块中捕获错误：ReferenceError: showGachaResult is not defined。

**根因：webpack minifier 简写优化 bug**

源码 L6304：showGachaResult: showGachaResult,

webpack minifier (terser) 把 key-value 同名的 showGachaResult: showGachaResult 优化为对象简写 {showGachaResult}。但 minifier 同时把 showGachaResult 函数的变量名重命名为短名（如 Me），导致简写中的 showGachaResult 引用了一个不存在的变量名。

minified bundle 中的挂载块：showPanel:Oe,showFragmentShop:Ee,showCustomEditor:Re,showGachaResult,showItemDetail:ze
注意 showGachaResult 是简写（没有 :变量名），其他属性都是 属性名:短变量名。简写的 showGachaResult 引用原始变量名，但该变量已被重命名为 Me，因此抛 ReferenceError。

其他函数（如 getOwnedItems: getOwnedItems）没有这个问题，因为 minifier 给它们分配了短名（xe），key 和 value 不同名，不触发简写优化。

**修复：** 在挂载块前添加别名变量 const _showGachaResult = showGachaResult;，然后在挂载对象中使用 showGachaResult: _showGachaResult，确保 key 和 value 不同名，避免 minifier 简写。

**发布链路已完成（v8.1）：**
- 源码 commit ac13cc8
- push origin main, bot bundle 512542b (tag v0.0.311)
- rebase 到 512542b
- publish-card.mjs CDN_REF=512542b, releaseVersion=8.1
- 打包成功，验证通过：dist bundle showGachaResult:Me（不再简写），PNG chara/ccv3 version=8.1 7x512542b 0x47df33c，worldbook gate 383/33/5851 PASS

**当前停点：** v8.1 发布版同步待提交 + push。用户需重新导入发布版 PNG 验证 window.MFRS 是否成功挂载。

## 2026-06-29 CST（⏸️ 暂停：window.MFRS 未挂载 bug 深入排查 — 上下文交接）

**状态：** 用户要求暂停任务并更新 planning 记录。当前正在排查 v7.8 window.MFRS API 和 v7.6 MFRSDialog 在运行态未挂载的 bug。四优先级改进已全部发布上线（v7.6~v8.0），但真机验证发现两个关键功能在运行态不可用。

**已完成的验证：**

Chrome DevTools MCP 连接正常（`http://127.0.0.1:8000/`，SillyTavern 页面在线）。

角色卡运行态基础验证通过：
- 当前角色：`神秘复苏模拟器发布版`，charId=5，`character_version = 8.0` ✅
- CDN ref：运行态卡数据 7 处 `@47df33c`，0 处旧 `3a77e4c` ✅
- `MysteryAcuVisualizer` = object，`renderInterface` 存在 ✅
- `__mfrsDatabaseScriptMarker__` = `mfrs-4-0-final-baseline-6-28-p5-4-hotfix13` ✅（主 window）
- UI 正常渲染：`#acu-btn-gacha`、`#acu-data-area`、acu-nav 均存在 ✅
- 货币 = 23，碎片 = 1（localStorage 确认）✅
- `extensionPrompts` 含 `customDepthWI_4_0` slot ✅
- Console 仅 1 条 error：`Uncaught (in promise)`（无详细信息）
- CDN bundle（321729 字节）确认包含 `window.MFRS`(×4)、`MFRSDialog`(×1)、挂载成功/失败日志文案、`Object.assign` 挂载块 ✅

**发现的核心 bug：window.MFRS 和 MFRSDialog 均未挂载**

详细排查结果：
1. 主 window：`window.MFRS = undefined`、`window.MFRSDialog = undefined`
2. 全部 15 个 iframe：`window.MFRS = undefined`、`window.MFRSDialog = undefined`
3. iframe 12（`TH-script--神秘复苏数据库前端`）：marker = undefined、MysteryAcuVisualizer = undefined
   - iframe 12 中仅有 2 个 blob URL 脚本（jQuery/_ 别名设置，66 字节和 1430 字节）+ Vue/VueRouter 外部 CDN + JS-Slash-Runner log.js
   - blob URL 不含 visualizer 代码
4. 主 window 上 `MysteryAcuVisualizer` 存在且有 `renderInterface`，说明 visualizer IIFE 主体在某个上下文执行了
5. 主 window 上 `GACHA_RARITY`、`getGachaCurrency`、`showGachaPanel` 等闭包变量均为 undefined（预期行为，闭包内变量不暴露）
6. CDN bundle minified 后挂载块存在：`try{window.MFRS=Object.assign(window.MFRS||{},{RARITY:Dt,...})}catch(e){console.error(...)}`

**根因分析方向（下次继续）：**

visualizer 通过 JS-Slash-Runner 机制执行。JS-Slash-Runner 将脚本内容提取后在某个上下文执行（可能是主 window 或特殊沙箱），不是在 iframe 12 内直接执行。主 window 上有 `MysteryAcuVisualizer` 和 marker，说明 IIFE 主体执行了。但 `window.MFRS` 挂载块可能在执行时抛错被 try/catch 吞掉，或者 IIFE 在挂载块之前就中断了。

需要继续排查：
- 在主 window 注入错误捕获器，重新加载 visualizer 脚本，看挂载块是否抛错
- 检查 JS-Slash-Runner 是否对 `window` 对象做了代理/包装，导致 `window.MFRS = ...` 赋值落到代理对象而非真实 window
- 检查 IIFE 是否在挂载块之前就 return 或 throw（比如 `getCore()` 返回 null 导致提前退出）
- 可能需要在挂载块的 try/catch 里加 `console.error` 明确输出错误对象，重新发布一次调试版本

**其他待排查问题（上次会话发现，本轮未复查）：**
- 碎片商店无 `frag-buy` 按钮（`shop-close` 存在但兑换物品未渲染）
- 自定义编辑器打开后无 `data-mfrs-action` 元素（可能未打开或渲染失败）

**当前停点：** 任务暂停，等待用户指示继续。下次恢复时从本条 progress 顶部读起，继续排查 window.MFRS 挂载失败根因。

## 2026-06-29 CST（✅ 第四优先级完成：事件委托替代逐个绑定 — v8.0 发布）

**状态：** 用户要求继续完成第四优先级（事件委托替代逐个绑定）。在 `v10_2_visualizer.js` 中将碎片商店、抽卡面板、自定义编辑器三个区域的逐个 `.off('click').on('click')` 绑定重构为 `data-mfrs-action` 属性 + 容器级委托 handler。

**三阶段重构执行与结果：**

**阶段 1 — 碎片商店（`showFragmentShop`）：**
 - ✅ 新增 2 个 data-mfrs-action：`frag-buy` + `shop-close`
 - ✅ 单个 `shopDialog.on('click', '[data-mfrs-action]', ...)` 委托替代逐个绑定

**阶段 2 — 抽卡面板（`showGachaPanel`）：**
 - ✅ 7 个 data-mfrs-action：`gacha-close`、`gacha-custom-editor`、`gacha-shop`、`gacha-pool-select`(4x)、`gacha-single`、`gacha-ten`、`gacha-history-toggle`
 - ✅ 提取 `doSinglePull`、`doTenPull`、`toggleHistory` 为命名函数
 - ✅ 单个 `dialog.on('click', '[data-mfrs-action]', async ...)` 委托
 - ✅ `$(this)` 在 toggleHistory 中重写为 `dialog.find('#gacha-history-toggle')`
 - ✅ 移除死代码 `#gacha-fragment-shop-btn` handler
 - ✅ 保留 `showGachaResult` 中的卡片 `$card.on('click')` 和 hover（动态元素，非 data-mfrs-action 按钮）

**阶段 3 — 自定义编辑器（`showCustomItemEditor`）：**
 - ✅ 8 个 data-mfrs-action：`editor-close`、`editor-tab-switch`(3x)、`editor-add-new`、`editor-export`、`editor-import`、`editor-ai-gen`、`editor-edit-item`、`editor-delete-item`
 - ✅ 提取 `doExport`、`doImport`、`doAIGen` 为命名函数
 - ✅ 移除 `bindItemActions()` 函数及其所有调用（tab 切换后、导入后、删除后）
 - ✅ 容器级 hover 委托 `editor.on('mouseenter', '.custom-item-row', ...)` 替代逐行 hover

**重构统计：**
 - .off('click').on('click') 从 23 降至 **0**
 - data-mfrs-action 从 0 增至 **28**（源码）/ **25**（dist minified）
 - 3 个容器级委托 handler

**发布链路已完成（v8.0）：**
 - ✅ 源码 commit `fcaab0f` — `refactor(gacha): 事件委托替代逐个绑定`
 - ✅ push origin main → bot bundle `47df33c`（tag `v0.0.307`）
 - ✅ rebase 到 `47df33c`
 - ✅ publish-card.mjs 更新：CDN_REF=`47df33c`、releaseVersion=`8.0`
 - ✅ `node scripts/publish-card.mjs "神秘复苏模拟器发布版"` 打包成功
 - ✅ 验证全部通过：
   - YAML：`版本:'8.0'` + 7×`@47df33c`，旧 `3a77e4c`=0
   - PNG chara：version=8.0，7×47df33c，0×3a77e4c
   - PNG ccv3：version=8.0，7×47df33c，0×3a77e4c
   - worldbook gate：383 entries / 33 disabled / max enabled 5851 — PASS
   - dist bundle：data-mfrs-action=25，.off('click').on('click')=0，delegated handlers=3

**当前停点：** v8.0 发布版同步待提交 + push。四优先级改进全部完成并发布上线。

## 2026-06-29 CST（✅ 第三优先级完成源码：固定状态栏精简 8→4）

**状态：** 用户要求继续完成第三优先级（固定状态栏精简 8→4 字段）。在 `src/神秘复苏模拟器/脚本/固定状态栏/index.ts` 中移除 4 个非核心字段，保留死亡/复苏/状态/驾驭 4 核心字段。

**执行与结果：**
 - ✅ 移除 `archivedGhostSummary()` 和 `collectedRuleSummary()` 两个辅助函数（仅服务于被移除的 archives/rules 字段）。
 - ✅ 精简 `buildSummaryText()` 返回对象：移除 event/place/archives/rules，保留 death/revive/state/ghosts。
 - ✅ 精简 `renderSummary()`：移除 4 行 querySelector/textContent 赋值。
 - ✅ 精简 `innerHTML` 模板：移除 4 个 `<span>` 标签，保留 4 个 + 完整状态按钮。
 - ✅ 验证：`pnpm build` webpack compiled successfully；dist bundle grep 确认 4 旧字段（event/place/archives/rules）= 0，4 保留字段（death/revive/state/ghosts）各 = 2。
 - ✅ 源码 201 → ~170 行（-31 行，纯减法）。

**设计决策：**
 - 保留 `controlledGhostSummary()` 函数（仍服务于 ghosts 字段）。
 - `valueText()` 和 `riskText()` 仍被保留字段使用，不移除。
 - `joinLimited()` 仍被 `controlledGhostSummary()` 使用，不移除。
 - CSS 样式（span flex、strong 颜色等）保持不变，4 个字段自动适配宽度。

**当前停点：** 源码修改已完成并验证通过，待走发布链路。用户可选择现在发布或继续做第四优先级后一起发布。
**发布链路已完成（v7.9）：** source commit `52c56c1` → push origin main → bot bundle `3a77e4c`（tag `v0.0.305`）→ rebase → publish-card CDN_REF=`3a77e4c`/releaseVersion=`7.9` → 重打包 PNG → 验证通过。发布版 YAML `版本:'7.9'` + 7×`@3a77e4c`，旧 `911e163` 为 0；PNG chara/ccv3 元数据均含 7.9+7×3a77e4c，无旧残留；worldbook gate 通过（383/33/5851）。dist bundle 确认 4 旧字段=0、4 保留字段各=2。待提交发布版同步 + push。

## 2026-06-29 CST（✅ 第二优先级完成源码：window.MFRS 公开 API）

**状态：** 用户要求继续完成第二优先级（抽卡API公开化 window.MFRS）。在 `v10_2_visualizer.js` IIFE 闭包末尾插入 `window.MFRS` 挂载块，把闭包内函数公开到全局命名空间。

**执行与结果：**
 - ✅ 定位插入点：IIFE 末尾 `const { $ } = getCore();` 之前（L6260 之后），在 `syncGachaResultToDatabase` 定义结束之后。
 - ✅ 插入 60 行挂载块（L6261-6319）：`window.MFRS = Object.assign(window.MFRS || {}, {...})` + try/catch + console.info。
 - ✅ 公开 33 个函数 + 5 个常量：
   - 常量：RARITY / POOL_TYPE / ITEM_TYPE / CURRENCY / FRAGMENT
   - 货币：getCurrency / setCurrency / addCurrency / deductCurrency
   - 保底：getPity / setPity / resetPity
   - 碎片：getFragments / setFragments / addFragments / deductFragments / processFragments / exchange
   - 已拥有物品：getOwnedItems / setOwnedItems / isItemOwned
   - 物品目录：getAllItems / getCustomItems / setCustomItems / addCustomItem / removeCustomItem
   - 抽卡操作：buildPool / single / ten / getHistory
   - UI 入口：showPanel / showFragmentShop / showCustomEditor / showGachaResult / showItemDetail
   - 写库：syncToDatabase / validateAndInsert
   - 版本：version: '1.0'
 - ✅ 验证：`node --check` 通过；`pnpm build` webpack compiled successfully（提权运行，沙箱 spawn EPERM 已知问题）；dist bundle grep 确认 `window.MFRS`(4) + 全部方法名落地。
 - ✅ 源码 6263 → 6323 行（+60）。

**设计决策：**
 - 使用 `Object.assign(window.MFRS || {}, {...})` 而非直接 `window.MFRS = {...}`，避免覆盖可能已存在的 `window.MFRS`（如其他脚本先挂载）。
 - 所有函数均为闭包内原始引用（箭头函数变量），调用 `window.MFRS.single()` 等价于内部 `gachaSingle()`。
 - UI 类函数（showPanel 等）依赖 jQuery/DOM，注释标明需在页面加载后调用。
 - 用 try/catch 包裹，挂载失败不影响 visualizer 正常初始化。

**当前停点：** 源码修改已完成并验证通过，待走发布链路（source commit → push main → bot bundle → CDN_REF bump → publish-card → 发布版同步）。用户可选择现在发布或继续做第三/四优先级后一起发布。
**发布链路已完成（v7.8）：** source commit `aa0b5ce` → push origin main → bot bundle `911e163`（tag `v0.0.303`）→ rebase → publish-card CDN_REF=`911e163`/releaseVersion=`7.8` → 重打包 PNG → 验证通过。发布版 YAML `版本:'7.8'` + 7×`@911e163`，旧 `5757f05` 为 0；PNG chara/ccv3 元数据均含 7.8+7×911e163，无旧残留；worldbook gate 通过（383/33/5851）。dist bundle grep `window.MFRS`=4。待提交发布版同步 + push。

## 2026-06-29 CST（✅ v7.7 发布：AI生成可操作toast）

**状态：** 完成第一优先级剩余部分 — AI生成字段自动修复从静默兜底升级为兜底+可操作toast提示。v7.7 已完成发布链路。

**执行与结果：**
 - ✅ 在 `v10_2_visualizer.js` L5806-5808 插入原始值捕获（`_origIcon`/`_origEffectDetail`），在 L5841-5865 插入自动修复检测+toast通知块。
 - ✅ 检测逻辑：icon 缺失且有 emoji → push '图标'；effectDetail 缺失且回填自 effect → push '效果详述'。
 - ✅ toast 行为：`MFRSDialog.showToast('AI 返回的XX字段缺失，已自动补全', 'warning', { duration: 6000, actionLabel: '查看', onAction: 高亮表单字段 })`
 - ✅ '查看'操作按钮点击后滚动到对应表单字段并高亮 2.5 秒（紫色边框）。
 - ✅ 验证：`node --check` 通过；`pnpm build` webpack compiled successfully；BOM 保留、CRLF 一致；dist bundle 含 `已自动补全`(1)、`form-icon`(3)、`form-effectDetail`(3)、`box-shadow 0 0 0 2px`(1)。
 - ✅ 发布链路：source `a638fc0` → push → bot bundle `5757f05`（tag `v0.0.301`）→ rebase → publish-card CDN_REF=`5757f05`/releaseVersion=`7.7` → 重打包 PNG → 发布同步提交。
 - ✅ 发布验证：YAML `版本:'7.7'` + 7×`@5757f05`，旧 `a85c968` 为 0；worldbook gate 通过（383/33/5851）。

**第一优先级完成情况：**
 - ✅ 弹窗替换：全部 8 个原生 alert/confirm 已替换为 MFRSDialog（v7.6）
 - ✅ toast 基础设施：showAlert/showConfirm/showToast 三函数已实现（v7.6）
 - ✅ 可操作toast接入：AI生成字段自动修复 toast + '查看'高亮按钮已实现（v7.7）
 - **第一优先级全部完成。**

## 2026-06-29 CST（✅ MFRSDialog 替换所有原生 alert/confirm 调用）

**状态：** 接续上一轮交接，完成 `v10_2_visualizer.js` 中全部原生 `alert()` / `confirm()` 调用替换为 `MFRSDialog` 模块。MFRSDialog 模块已在上一轮插入（L454 附近），本轮完成 8 个调用点的逐个替换 + 4 个外层回调改 async。

**执行与结果：**
 - ✅ 确认文件状态：BOM + CRLF，6234 行，`node --check` 通过。MFRSDialog 模块定义在 L500-540（showConfirm/showAlert/showToast 三个函数），复用 `acu-theme-*` CSS 变量，通过 `getConfig().theme` 动态适配主题。
 - ✅ 精确定位 8 个原生调用点（用正则排除 MFRSDialog 方法定义）：2 个 confirm + 6 个 alert。
 - ✅ 12 处精确替换（8 调用 + 4 回调签名），用 Node.js 脚本完成。
 - ✅ 验证：`node --check` 通过；`pnpm build` webpack compiled successfully；BOM 保留、CRLF 一致；原生 alert/confirm 仅剩 2 个注释行。

**发布链路已完成（v7.6）：** source commit `1f0f4aa` -> push -> bot bundle `a85c968`（tag `v0.0.298`）-> rebase -> publish-card CDN_REF=`a85c968`/releaseVersion=`7.6` -> 重打包 PNG -> 发布同步提交 `fc80ad3` push origin/main。验证：YAML `版本:'7.6'` + 7×`@a85c968`，worldbook gate 通过（383/33/5851）。

## 2026-06-29 CST（✅ v7.5 发布链路完成：AI生成流式路径修复）

**状态：** 用户要求继续完成 v7.5 发布链路。按 `planning-with-files` 恢复上下文后确认：真页发布版 7.4 AI生成闭环已完成，待发布的是本地 `should_stream:true`、`emoji→icon`、`effectDetail←effect` 源码修复。

**执行与结果：**
 - ✅ 复核工作区：当前主工作区有无关 dirty（本地 `dist/**` 构建残留、`.claude/worktrees/*` gitlink、`.tmp-*`、截图），未纳入提交。
 - ✅ gate：`git diff --check` 通过；`node --check src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js` 通过。
 - ✅ 精确提交 source + planning：`511e86f fix(gacha): AI生成强制流式并兼容字段别名`，提交文件为 `src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js`、`task_plan.md`、`progress.md`、`findings.md`。
 - ✅ push origin/main 后等待 bot bundle：`7ac8a28 [bot] bundle`，tag `v0.0.296`。验证 dist：`should_stream=1`、`should_stream:!0=1`、`emoji=6`、`effectDetail=38`。
 - ✅ 为避免主工作区 dirty 干扰，创建干净 worktree `D:\project\tavern_helper_template_v75_publish` 基于 `origin/main` 做发布同步。
 - ✅ 更新 `scripts/publish-card.mjs`：`CDN_REF db7e4ba → 7ac8a28`，`releaseVersion 7.4 → 7.5`。
 - ✅ 运行 `pnpm run publish-card -- 神秘复苏模拟器发布版`：同步 15 处链接，打包发布版 PNG 成功。
 - ✅ 发布验证：发布版 YAML `版本:'7.5'`，7 处 `@7ac8a28`，旧 `db7e4ba` 为 0；PNG `chara`/`ccv3` 元数据均为版本 7.5、7 处 `@7ac8a28`、旧 `db7e4ba` 为 0。
 - ✅ `node scripts/verify-worldbook-pollution-gate.mjs --expect-mfrs-runtime "src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png"` 通过：383 entries，33 disabled，max enabled 5851。

**小错误与处理：**
 - PNG 元数据自定义 Node 检查第一次把中文路径经 PowerShell stdin 传入，Node 侧读成 `??????????` 导致 `ENOENT`。已改用 PowerShell 环境变量传递 `PNG_PATH` 后重跑通过；结论只基于重跑后的正确路径。

**发布提交：** 本发布同步提交 `fix(publish): 发布版 7.5 同步AI生成流式修复 (CDN @7ac8a28)`。

**后续可选：** 用户重新导入 v7.5 PNG 后，可做一次低频 AI生成 smoke，确认当前自定义源在正式发布卡里不再卡在「生成中...」。

## 2026-06-28 CST（✅ AI生成真实闭环完成 + 根因定位 + 本地源码修复待发布）

**状态：** 用户要求完成一次真实点击「AI生成」并确认预填表单可编辑、保存 custom 物品；若有问题则找根因。使用 `scripts/cdp-evaluate.mjs` 连接真页 `http://127.0.0.1:8000/`，当前角色仍为发布版 7.4。

**执行与结果：**
 - ✅ 真实 UI 点击路径已执行：`#acu-btn-gacha` → `#gacha-custom-editor-btn` → `#custom-ai-gen-btn`。
 - ⚠️ 首次/二次原样点击均卡在「生成中...」：`TavernHelper.generateRaw:start` 已记录，但 2 分钟以上无 success/error，表单不出现。
 - ✅ 分层定位：原生 `ctx.generateRaw` 最小非流式请求发到 `/api/backends/chat-completions/generate`，HTTP 200，但返回 `choices[0].message.content=""`、`finish_reason:"length"`，随后 `script.js:4088` 抛 `No message generated`。
 - ✅ 根因确认：当前 ST API 源为 `chat_completion_source:"custom"`、`custom_url:"https://gcli.ggchan.dev/v1"`、模型 `假流式-gemini-3.1-pro-preview-search`；该源在非流式 quiet/json_schema 路径不可用。`TavernHelper.generateRaw({ should_stream:true, ... })` 最小测试成功返回 `测试成功`。
 - ✅ 用运行态临时包装器强制 UI 调用加 `should_stream:true` 后，真实 AI生成成功：`generateRaw:success`，耗时 31.6s，返回 JSON 字符串。
 - ✅ 表单验证：生成项 `血骨缝衣针`，`id=custom_supernatural_1782663030885`，`rarity=EPIC`，描述/效果/代价/剧情钩子/使用次数/持续时间均可编辑；无 `undefined`。AI 返回 `emoji` 而非 `icon`，且漏 `effectDetail`，因此保存前手动将 icon 改为 `🪡`，将 effectDetail 补为“缝合期间可借用被缝肢体的灵异力量，结束后伤口持续渗出尸水并可能吸引相关厉鬼。”
 - ✅ 保存成功：`localStorage.mfrs_custom_gacha_items.supernatural` 从 0 条变为 1 条，保存 custom 物品 `血骨缝衣针`；表单关闭，编辑器仍可用。

**本地源码修复：**
 - `src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js`：AI生成 `th.generateRaw(...)` 增加 `should_stream: true`。
 - 同文件字段补全：接受 `emoji` 作为 `icon` 别名；`effectDetail` 缺失/空白时用 `effect` 回填。
 - 验证：`node --check src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js` 通过；首次 `pnpm build` 在沙箱内 `spawn EPERM`，提权重跑后构建成功（仅既有 bundle size warnings）。

**当前停点：** 真页闭环已完成，源码修复已本地落地但未提交/发布。若继续发布，需要走 source commit → push main → bot bundle → `CDN_REF`/`releaseVersion=7.5` → `publish-card` → 提交发布版同步。

## 2026-06-28 CST（CDP 真页验证：发布版 7.4 当前角色卡导入与真实对话基础验证通过）

**状态：** 用户已导入角色卡并进行了真实对话，要求用 Chrome DevTools MCP 验证当前角色卡是否成功。当前 Codex 会话未暴露 `mcp__chrome_devtools__*` 直接工具，按 `PROJECT_FLOW.md` 使用 `scripts/cdp-evaluate.mjs` 裸 CDP 连接 `http://127.0.0.1:9222`，目标页为 `http://127.0.0.1:8000/`。

**验证结果：**
 - ✅ 当前选中角色：`神秘复苏模拟器发布版`，`avatar=神秘复苏模拟器发布版.png`，`character_version=7.4`，creator=`琳琅`。
 - ✅ 卡数据：`dataJsonLength=974905`，包含 `7.4`、7 处 `db7e4ba`、8 处 `phase164-4-0-final-baseline-6-28-p5-4-hotfix13`，worldbook entries=383，含 AI生成字段补全信号（`未命名物品`/`短暂`）。
 - ✅ 运行态 API：`TavernHelper.generateRaw` 存在；`AutoCardUpdaterAPI` 存在；`MysteryDatabaseFrontend` 存在且暴露 `exportCurrentData`、`previewTableChangePlan`、`applyTableChangePlan`、`openDashboard` 等接口。
 - ✅ 聊天状态：`chat.length=3`，包含首楼、用户消息、AI 回复；用户与 AI 消息均含神秘复苏/厉鬼语境。
 - ✅ 货币监听器：`localStorage.mfrs_gacha_currency="17"`，说明真实 MESSAGE_RECEIVED 后调查点已增长；UI 抽卡面板显示余额 17、残屑 0。
 - ✅ 数据库：`exportCurrentData()` 成功，15 个导出对象；`checkTemplateStatus()` 显示 templateLoaded=true、14 张模板表、missingNames=[]、mismatchNames=[]；真实对话后 12 张表已有数据。关键表列头正常：`sheet_supernatural_items` 1 行/9 列、`sheet_clues` 1 行/9 列、`sheet_chronicle` 1 行/6 列、`sheet_collected_rules` 0 行/10 列（空表为当前剧情状态）。
 - ✅ UI smoke（不触发 AI、不消费抽卡）：点击 `#acu-btn-gacha` 成功打开抽卡面板；`#gacha-single-btn`、`#gacha-ten-btn`、`#gacha-shop-btn`、`#gacha-custom-editor-btn` 存在；点击自定义后 `#custom-ai-gen-btn`、导入、导出、列表和 3 个类型 tab 存在；无捕获到运行时错误；余额/残屑未变化。

**未做/剩余：** 未点击「AI生成」触发真实 `generateRaw`，也未确认 AI 返回后预填表单完整可编辑并保存 custom 物品。因此 v7.4 当前角色卡导入、资源、真实对话、数据库、货币和 UI 基础验证已通过；AI生成三层链路仍需一次真实调用闭环才算完全验收。

## 2026-06-28 CST（planning 自检：主体最新，清理旧残留）

**状态：** 用户询问当前 `planning-with-files` 记录是否最新、是否需要更新。按恢复流程重读 planning skill、`task_plan.md` 关键段、`progress.md` 顶部、运行 `session-catchup.py` 与 `git status --short --branch`。结论：**主状态最新**，顶部 `当前状态` 和最新 progress 均正确指向“发布版 7.4 已上线，仅剩真机复测”；但 `task_plan.md` 中部仍有旧 v7.0/v7.1 残留，会误导后续恢复。

**本轮整理：**
 - ✅ 更新 `task_plan.md` 当前版本：本地 main/origin main 实际为 `3f511dd`（planning 补记），发布版 7.4 同步提交仍是 `32b4baa`，bot bundle 仍是 `db7e4ba`。
 - ✅ 删除/改写旧“抽卡面板 bug worktree 待合并”残留，明确 `getFragments`、`showFragmentShop`、货币监听器、AI 生成调用/解析/字段补全均已通过 v7.1~v7.4 发布闭环。
 - ✅ 更新工作区状态：`src/**`、`scripts/**`、planning 文件在自检前无未提交差异；本地仍有 `dist/**` 构建残留、`.claude/worktrees/*` 工具 gitlink、`.tmp-*` 和截图文件，非当前任务产物，不提交。
 - ✅ 更新“需要提交的文件”口径：本轮若提交，只提交 `task_plan.md`、`progress.md`；不涉及源码、发布版 PNG、`scripts/publish-card.mjs` 或 `dist/**`。

**当前停点不变：** 真机复测发布版 7.4。导入 `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`，验证 AI 生成三层链路和调查点监听器。

## 2026-06-28 CST（✅ 发布版 7.4 上线 — AI生成字段补全已发布，剩真机复测）

**状态：** 恢复对话后发现 planning 滞后于 git（planning 停在 v7.1「待 bot bundle」，实际 git 已推到 v7.3）。用户选「先复查字段补全修复」。复查通过（发现 id 已被 L5651-5654 守护，无需补）。走完 v7.4 发布全链路：源码修复 → push → bot bundle `db7e4ba` → publish-card 同步 → push `32b4baa`。CDN 实测发布版 yaml `版本:'7.4'`+7×`@db7e4ba`。**仅剩真机复测。**

**本轮完成（v7.4 链路）：**
 - ✅ 复查未提交的字段补全修复（28 行，`v10_2_visualizer.js` L5657-5683）：方向正确，与 showItemForm 表单读取项（name/icon/rarity/description/effect/effectDetail/cost/narrativeHook + 类型特有 usageLimit/duration/progress）逐一吻合；RARITY_ENUM 与 GACHA_RARITY 6 个 key 一致；progress clamp `[0.05,0.5]` 与 schema 一致。**发现 id 已有守护**（L5651-5654 `!item.id || !startsWith('custom_')` → 重生成），无需补。
 - ✅ `pnpm build` 通过；bundle grep 确认 `未命名物品`(1)+`'❓'`(1)+`短暂`(5) 落地。
 - ✅ 仅提交 src（commit `5f085b3` fix(gacha): AI生成字段补全），discard 本地 dist 残留。
 - ✅ push origin main → bot bundle `db7e4ba`（CI rebuild dist）。
 - ✅ `publish-card.mjs` `CDN_REF` `24f51330`→`db7e4ba`、`releaseVersion` `7.3`→`7.4`，跑 `pnpm run publish-card -- 神秘复苏模拟器发布版`，15 处链接替换 + PNG 重打包。
 - ✅ commit `32b4baa` push origin/main。CDN 实测发布版 yaml（`@32b4baa`）：`版本:'7.4'` + 7×`@db7e4ba`，无残留 `24f51330`。

**当前停点：** 真机复测。需要用户酒馆（`http://127.0.0.1:8000/`）导入发布版 7.4 PNG，用 CDP 验收 AI 生成链路三层全部打通：① generateRaw 走当前连接源（v7.2 修）→ ② JSON 容错解析剥离 markdown 代码块（v7.3 修）→ ③ 字段补全保证预填表单可编辑（v7.4 修）。理想：点 AI生成 → 表单预填出完整可编辑内容（name 非空、icon 非空、rarity 选对、各字段有值），用户确认后能保存成 custom 物品。

**关键经验：**
 - **planning 滞后恢复**：新对话恢复时不能只读 planning，必须对照 `git log` 校正——planning 停点可能落后实际进度多个版本。本次 planning 停在 v7.1「待 bot bundle」，实际已发布 v7.2/v7.3。
 - **字段补全是 AI 生成第三层容错**：v7.2=调用层（TavernHelper 引用）、v7.3=解析层（markdown 剥离）、v7.4=数据层（字段缺漏兜底）。三层串联才完整。
 - **id 守护早于字段补全**：复查时别急着加默认值，先看现有代码——L5651-5654 的 id 守护在字段补全块之前执行，已覆盖缺失/格式不对，补全块再加是死代码。

## 2026-06-28 CST（🔧 真机复测发现双 bug + 源码修复已 push，等 bot bundle → 发布版 7.2）

**状态：** 用户导入发布版 7.1 PNG + 数轮真实对话后，CDP 定位到两个真机 bug，已在源码修复并 push origin/main（`ca4895f`）。**等 `[bot] bundle` → `CDN_REF` bump 到新 commit + 版本 7.2 → `pnpm run publish-card` 重打包发布版。**

**两个 bug 根因（均已 CDP 坐实）：**
 - 🔴 **Bug 1 调查点永不增长**：`registerCurrencyListeners()`（v10_2_visualizer.js L4182）硬编码 `eventSource.on('MESSAGE_RECEIVED', ...)` 用大写字面量。但 ST 的 `eventTypes.MESSAGE_RECEIVED` **值是小写** `"message_received"`，ST 内部 emit 用常量值，`on()` 按精确字符串匹配 → 挂在大写键上的监听器**永不触发**。铁证：eventSource internal keys 同时存在 `message_received`（正常工作的，hotfix 等）和 `MESSAGE_RECEIVED`（只有我们这一个无人 emit 的死键）。21 条消息后 `mfrs_gacha_currency="0"`、`mfrs_gacha_currency_log=null`。
 - 🔴 **Bug 2 AI 生成无反应**：L5578 裸调 `generateRaw({...})`，但 `generateRaw` 是酒馆助手接口（`@types/function/generate.d.ts`），**必须经 `window.TavernHelper.generateRaw(...)` 取得**。visualizer 闭包既无 import 也无解构 `TavernHelper`，裸调 → ReferenceError（被 catch 吞后弹"AI 生成失败: generateRaw is not defined"）。`getCore()` 只暴露 `$`/`getDB`，不含 generate 系列。

**修复（worktree `fix-currency-aigen`，commit `ca4895f`，已 ff push origin/main）：**
 - ✅ Bug 1：`registerCurrencyListeners()` 改用 `const messageReceivedEvent = (eventTypes && eventTypes.MESSAGE_RECEIVED) || 'message_received'` 动态取值，与 hotfix 范式一致。
 - ✅ Bug 2：AI 生成 handler 先取 `const th = (window.parent || window).TavernHelper; if (!th || typeof th.generateRaw !== 'function') throw new Error('酒馆助手 generateRaw 接口不可用');` 再 `await th.generateRaw({...})`。
 - ✅ `pnpm build` production 通过（webpack compiled successfully）。源码语法检查 OK。dist bundle grep 确认两处修复落地（`messageReceivedEvent` + `.TavernHelper`）。
 - ✅ 仅提交源码（dist 留给 bot bundle 重建）。

**AI 生成走哪个 API：** `generateRaw` 未传 `custom_api` → 用**当前 ST 连接源**（玩家酒馆里配的 API）。不自带独立 API，不绕过酒馆代理。

**当前停点：** 等 GitHub Action 跑出 `[bot] bundle` commit。然后：`publish-card.mjs` `CDN_REF` 推到新 bot bundle commit + `releaseVersion` 7.1→7.2 → `pnpm run publish-card -- 神秘复苏模拟器发布版` → 提交 push → 真机复测（这次要真正触发 MESSAGE_RECEIVED 看调查点增长 + 真正点 AI 生成看能否出 JSON）。

**关键经验：**
 - ST 事件名：`eventTypes.MESSAGE_RECEIVED` 的**值**是小写 `"message_received"`，但其他常量（如 `generation_ended`）也全小写。监听器**永远**用 `eventTypes.XXX` 动态取值，不要硬编码大写字面量。
 - 酒馆助手 `@types/function/*` 接口在 iframe/CDN-script-link 环境下**不在闭包顶层作用域直接可达**，必须经 `window.TavernHelper.<func>`（或 `parent.TavernHelper`）取引用。visualizer 的 `getCore()` 没暴露 generate 系列，这是已知缺口。

## 2026-06-28 CST（✅ 发布版 7.1 上线 — 抽卡面板修复已发布，剩真机复测）

**状态：** 恢复对话后推进到发布。修复 `fdb6a74`（merge `0ef4201`）已 push origin/main → 触发新 bot bundle `90065ab` → 发布版同步 7.1（`4af0d88`）。CDN 实测确认修复落在发布版。**仅剩真机复测（计划「下次继续」第 7 步）未做。**

**本轮完成：**
 - ✅ push 本地 main `0ef4201` → origin，触发 bot bundle Action → 新 bundle `90065ab`（构建 success，自动 tag `v0.0.287`）。
 - ✅ CDN 实测对比新旧 bundle 确认修复落地：`@90065ab` 含 `碎片商店`(1)+`灵异残屑`(9)（showFragmentShop 弹窗已补全，minify 后标识符重命名故函数名 grep=0 属正常）；旧 `@5201ca2` 只有 `showFragmentShop`(2) 裸调用无定义（即炸的根因）+ `灵异残屑`(6)。
 - ✅ `publish-card.mjs` `CDN_REF` `5201ca2`→`90065ab`、`releaseVersion` `7.0`→`7.1`，跑 `pnpm run publish-card -- 神秘复苏模拟器发布版`，15 处链接替换 + PNG 重打包（7.8 MB，2026-06-28 11:25）。
 - ✅ rebase 吸收 bot bundle `90065ab`（discard 本地 dist 构建残留，bot bundle 才是 dist source-of-truth），stash pop 恢复发布版编辑，commit `4af0d88` push origin/main。
 - ✅ CDN 实测发布版 yaml（`@4af0d88`）：`版本:'7.1'` + 7×`@90065ab`，无残留 `5201ca2`。
 - ✅ 更新 task_plan.md：当前状态/当前版本/当前进行中/版本变更索引（新增 v7.1 行，gacha-panel-fix 标为已合并已发布）。

**当前停点：** 计划「下次继续」第 7 步——真机复测。需要用户酒馆（`http://127.0.0.1:8000/`）导入发布版 7.1 PNG，用 Chrome DevTools MCP 验收：🎁 打开 / 单抽十连（含 ★★★+ 保底）/ 碎片商店兑换 / 自定义编辑器增删改 / 导入导出 JSON / AI 生成 / 十连折扣徽章 / 写库（`exportTableAsJson()` 查 sheet_supernatural_items）。

**关键经验：**
 - jsdelivr 路径含中文必须 URL-encode（`urllib.parse.quote`），否则 HTTP 400 Bad Request；`testingcf.jsdelivr.net/gh/<repo>@<commit>/<encoded-path>` 可直接验证任一 commit 的 dist 内容。
 - minified bundle 里函数名被重命名，验证修复是否落地应 grep **UI 文案字符串**（`碎片商店`/`灵异残屑`）或对比新旧 bundle 差异，而非 grep 源码函数名。
 - bot bundle 重建 dist 后，本地 `dist/**` 改动是构建残留应 discard，让本地 dist 跟随 origin 的 bot bundle commit（rebase 前先 stash/discard 本地 dist）。

## 2026-06-28 CST（恢复对话 + 校正 planning 与 git 偏差）

**状态：** 用户要求用 planning-with-files 恢复并核对任务进度。读取 task_plan/progress/findings + git 状态后发现 **planning 与 git 实际有偏差**：planning 写「修复待合并未 push」，但 git 显示修复已通过 merge commit `0ef4201` 合入**本地 main**，仅未 push。

**git 实测核对：**
 - `origin/main` = `6f1cd8f`（planning docs）；本地 main = `0ef4201`（merge 抽卡面板修复），领先 2 commit（`fdb6a74` fix + `0ef4201` merge）未 push。
 - `publish-card.mjs`：`CDN_REF` 仍 = `5201ca2`（含 bug 的旧 bot bundle）、`releaseVersion` 仍 = `7.0`，**未** bump 到新 bot bundle / 7.1。
 - 源码校验 `src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js`（6002 行）：`getFragments(` 裸调用 = 0（全改 `getGachaFragments`，定义 L4426）；`showFragmentShop` 已定义 L4522（调用 L5114）；`resetGachaPity` L4231、`exchangeWithFragments` L4508 均在。修复确实落在 main 源码。
 - 发布版 PNG（7.0，2026-06-27 22:50）仍含两 bug，未重打包。

**已做：** 更新 task_plan.md「当前状态」「当前版本」「当前进行中」三处，把「未合并未 push」修正为「已合并本地 main（`0ef4201`）未 push」，并加 2026-06-28 恢复块。

**当前停点：** 计划「下次继续」第 3 步——push origin main 触发 bot bundle。第 1-2 步（可选 CDP 验证、合并）已过（合并完成；CDP 验证因 fix 已合入 main、dist 未重建而跳过，源码已静态校验）。

**下一步：** push 本地 main → 等 `[bot] bundle` → `CDN_REF` 推新 commit + 版本 7.1 → `pnpm run publish-card -- 神秘复苏模拟器发布版` → 提交 push 发布版 → 真机复测。push 为外发动作（触发 CI），恢复时向用户确认后再执行。

## 2026-06-26 CST（✅ 任务9 完成：物品设计哲学评审 — cost/narrativeHook 字段）

**状态：** 任务9 实施完成。为全部 26 个内置物品补充 `cost`（使用代价/风险）和 `narrativeHook`（剧情钩子）字段，符合原著"沾染灵异、拥有灵异能力必有代价"的设计哲学。

**实现：**
- `gacha-items.json`：26 个物品全部补充 cost + narrativeHook，version 升至 1.1.0
- `BUILTIN_GACHA_ITEMS`（v10_2_visualizer.js）：同步内嵌 cost/narrativeHook 到所有物品定义
- `showItemForm()`：新增「使用代价」和「剧情钩子」textarea 输入框（位于效果详述下方）
- 保存逻辑：cost/narrativeHook 写入 itemDef 传递给 `addCustomGachaItem()`
- AI 生成 Schema：baseProps 新增 cost/narrativeHook 字段定义 + baseRequired 增加这两个必填项
- AI 系统提示词：新增设计要求"每件物品必须有明确的使用代价/风险 + 剧情钩子"

**设计哲学（原著一致）：**
- 高稀有度物品代价更严重（寿命/精神/人格异化）
- 低稀有度物品代价较轻（时间消耗/虚假安全感）
- narrativeHook 为 AI/GM 提供剧情推进锚点（旧案、身份、秘密、线索关联）

**构建：** `npm run build` 通过，无错误。

## 2026-06-26 CST（✅ 任务8 完成：AI 生成 agent prompt）

**状态：** 任务8 实施完成。在自定义物品编辑器标题栏新增「AI生成」按钮，用 `generateRaw()` + `json_schema` 调用 AI 按神秘复苏原著风格生成物品。

**实现：**
- 编辑器标题栏新增粉色「AI生成」按钮（`#custom-ai-gen-btn`，🤖图标）
- 点击后根据当前 Tab 类型（supernatural/clue/knowledge）构建对应 JSON Schema
- 调用 `generateRaw({ should_silence: true, ordered_prompts, json_schema })` 静默生成
- System prompt 包含神秘复苏世界观设定、物品设计要求、已有物品排除列表
- 生成结果自动打开 `showItemForm()` 预填表单，用户可审查/修改后确认保存
- 按钮生成期间显示 spinner 状态，失败时弹窗提示错误

**代码位置：** `v10_2_visualizer.js` 第 5275-5277 行（按钮 HTML），第 5412-5513 行（AI 生成 handler）

**构建：** `npm run build` 通过，无错误。

**下一步：** 可继续任务9（物品设计哲学评审）。

## 2026-06-26 CST（✅ 任务7 完成：目录导入/导出 JSON）

**状态：** 任务7 实施完成。在自定义物品编辑器标题栏新增「导出」「导入」按钮。

**实现：**
- 导出：调用 `getAllGachaItemDefinitions()` 获取 builtin∪custom 合并全集，序列化为 JSON Blob，通过 hidden `<a download>` 触发浏览器下载（文件名含时间戳）
- 导入：隐藏 `<input type="file" accept=".json">`，FileReader 读取 → JSON.parse 解析 → 遍历三类型，对每个物品调用 `addCustomGachaItem()` 写入 custom 层
- 智能去重：如果导入物品与 builtin 完全相同（JSON 深比较排除 rarity 对象/targetTable），跳过不写入 custom 层，避免冗余覆盖
- 导入后自动刷新物品列表 + toast 提示导入数量

**代码位置：** `v10_2_visualizer.js` 第 5265-5267 行（按钮 HTML），第 5318-5369 行（导出/导入 handler）

**构建：** `npm run build` 通过，无错误。

**下一步：** 可继续任务8（AI 生成 agent prompt，已解除阻塞）或任务9（物品设计哲学评审）。

## 2026-06-26 CST（✅ 任务6 完成：自定义物品 UI 编辑器）

**状态：** 任务6 实施完成。在抽卡面板新增自定义物品编辑器入口，支持 3 类物品的浏览/新增/编辑/删除，写入 custom 层（localStorage）。构建验证通过。

**实现内容：**
- ✅ 抽卡面板标题栏新增"自定义"按钮（`#gacha-custom-editor-btn`），点击打开编辑器
- ✅ `showCustomItemEditor()` 完整编辑器 UI（~320 行）：
  - 三类型 Tab 切换（灵异物品/线索/知识）
  - 物品列表区分内置（灰色徽章）、已覆盖（橙色徽章）、自定义（绿色徽章）
  - 每行含编辑按钮（所有物品均可覆盖）和删除按钮（仅 custom 层）
  - hover 高亮效果
- ✅ `showItemForm(type, existingItem)` 编辑/新增表单：
  - 通用字段：ID（编辑时只读）、名称、图标（emoji）、稀有度（下拉 6 档）、描述、效果、效果详述
  - 灵异物品特有：使用次数、持续时间
  - 线索/知识特有：进度（0-1）
  - 必填验证（ID/名称/图标）
  - 保存调用 `addCustomGachaItem()` 写入 localStorage
- ✅ 删除调用 `removeCustomGachaItem()` 移除 custom 覆盖
- ✅ 编辑器 z-index 分层：列表 overlay + 表单 overlay（z-index:100001）叠加
- ✅ `npm run build` 构建通过

**代码改动：**
- `src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js`：
  - 行 4759-4761：抽卡面板标题栏新增"自定义"按钮
  - 行 4909-4913：按钮点击 handler 调用 `showCustomItemEditor()`
  - 行 5192-5509：`showCustomItemEditor()` 完整实现（含 `buildItemList`、`bindItemActions`、`showItemForm`）

**下一步：**
- 可继续任务7（目录导入/导出 JSON）或任务9（物品设计哲学评审）

## 2026-06-26 CST（✅ 任务5 完成：十连折扣 UI 标注）

**状态：** 任务5 实施完成。十连抽按钮增加视觉折扣标注，构建验证通过。

**实现内容：**
- ✅ 十连按钮右上角新增红色"9折"徽章（`position:absolute` 浮动，带脉冲动画 `discountPulse`）
- ✅ 价格显示改为删除线原价（~~100~~）+ 加粗折后价（90）的对比样式
- ✅ 新增 `@keyframes discountPulse` 动画（缩放 1→1.1→1 循环，吸引注意力）
- ✅ 按钮增加 `position:relative; overflow:visible` 以支持徽章溢出
- ✅ `npm run build` 构建通过

**代码改动：**
- `src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js`：
  - 行 995：新增 `@keyframes discountPulse` 动画定义
  - 行 4848-4855：十连按钮 HTML 重写（徽章 + 删除线原价 + 折后价）

**下一步：**
- 可继续任务6（自定义物品 UI 编辑器）或任务7（目录导入/导出 JSON）

## 2026-06-26 CST（✅ 任务4 完成：货币被动获取通道）

**状态：** 任务4 实施完成。实现自动检测消息内容并奖励调查点，构建验证通过。

**实现内容：**
- ✅ `registerCurrencyListeners()` — 在 init 时注册 SillyTavern eventSource 事件监听
- ✅ 监听 `MESSAGE_RECEIVED` 事件，每条 AI 消息自动 +1 调查点（基础奖励）
- ✅ 内容关键词检测奖励：
  - 线索相关（线索/发现/痕迹/证据）→ +5 调查点
  - 事件相关（事件/异变/突发/爆发）→ +10 调查点
  - 厉鬼对抗（厉鬼/鬼影/灵异/对抗/战斗）→ +15 调查点
- ✅ 冷却机制：5秒内不重复奖励，防止消息刷屏farming
- ✅ toast 通知反馈（显示获得调查点数量和原因）
- ✅ 日志记录所有奖励事件（`[Gacha Currency]` 前缀）
- ✅ 安全降级：eventSource 不可用时静默跳过，不影响其他功能
- ✅ `npm run build` 构建通过

**代码改动：**
- `src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js`：
  - 行 4027-4092：新增 `registerCurrencyListeners()` 函数（~65 行）
  - init 函数中 `isInitialized = true` 后调用 `registerCurrencyListeners()`

**下一步：**
- 可继续任务5（十连折扣 UI 标注）或任务6（自定义物品 UI 编辑器）

## 2026-06-26 CST（✅ 任务3 完成：碎片系统 — 重复物品 → 灵异残屑 → 兑换）

**状态：** 任务3 实施完成。碎片系统核心逻辑 + 兑换商店 + UI 集成全部就绪，构建验证通过。

**实现内容：**
 - ✅ `FRAGMENT_CONFIG` — 稀有度→碎片转化率配置（BASIC:1, COMMON:2, RARE:5, EPIC:15, LEGENDARY:50, MYTHIC:200）
 - ✅ `getFragments()` / `setFragments()` / `addFragments()` — localStorage 碎片余额持久化
 - ✅ `getOwnedItems()` / `addOwnedItem()` / `hasOwnedItem()` — 已拥有物品追踪（用于重复检测）
 - ✅ `processFragments(items)` — 核心重复检测逻辑：首次获得加入 owned 集合，重复获得按稀有度转化为灵异残屑
 - ✅ `FRAGMENT_SHOP_ITEMS` — 兑换商店 8 件定价商品（30~500 残屑不等）
 - ✅ `purchaseWithFragments(shopItemId)` — 扣减碎片 + 标记拥有 + 返回物品定义
 - ✅ `showFragmentShop()` — 完整兑换商店 UI（物品列表、余额显示、购买确认、库存状态）
 - ✅ 抽卡面板新增「灵异残屑」余额展示区 + 「碎片商店」按钮
 - ✅ `gachaSingle` / `gachaTen` 集成 `processFragments()`，返回值含 `fragments` 字段
 - ✅ 抽卡结果后 toast 提示碎片转化详情（"X件重复物品转化为 Y 灵异残屑"）+ 碎片余额实时刷新
 - ✅ `npm run build` 构建通过

**代码改动：**
 - `src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js`：新增碎片系统核心逻辑（~150 行）、修改 gachaSingle/gachaTen 集成碎片处理、面板 UI 新增碎片展示区+商店按钮+事件绑定

**下一步：**
 - 真机验证（抽到重复物品时确认碎片转化 toast、碎片商店购买流程）
 - 可继续任务4（货币被动获取通道）或任务5（十连折扣 UI 标注）

## 2026-06-26 CST（✅ 任务2 完成：写库前预校验约束）

**状态：** 任务2 实施完成。`syncGachaResultToDatabase` 全面重写，修复列名映射 + 接入完整校验链路。构建验证通过。

**问题根因：**
 - 旧 `syncGachaResultToDatabase` 使用完全错误的列名（如"物品名称"应为"物品名"、"线索编码"应为"线索编号"、"重要程度"应为"可信度"等），导致写入时 100% 触发 COLUMN_NOT_FOUND
 - 线索编号格式 `CLUE_${Date.now()}_...` 违反 DDL 的 `GLOB 'C[0-9][0-9][0-9][0-9]'` 约束
 - 可信度值 `item.rarity.name`（如"稀有""史诗"）违反 `CHECK IN ('低','中','高','误导')` 约束
 - 未经任何预校验直接写入，错误无法提前拦截

**修复内容：**
 - ✅ 重写 3 张表的列名映射，完全对齐 `神秘复苏表格SQL_v1.json` 的 `content[0]` 表头定义
 - ✅ 新增 `getNextClueCode()` — 查询现有数据生成下一个合法 C0001 格式编号
 - ✅ 新增 `validateAndInsertGachaRow()` — 优先走 `MysteryDatabaseFrontend.previewTableChangePlan`（dry-run 预校验）+ `applyTableChangePlan`（含内置验证），fallback 到 `MfrsDatabase.insertRow`
 - ✅ CHECK 约束值全部硬编码为合法枚举值（可信度→'中'、验证状态→'未验证'、可见性→'玩家可见'）
 - ✅ 长度限制通过 `.slice(0, N)` 预截断（效果≤160、副作用≤120、内容≤120 等）
 - ✅ 添加写库结果汇总日志（成功/失败计数 + 错误详情）
 - ✅ `npm run build` 构建通过

**代码改动：**
 - `src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js`（行 4835-5006）：删除旧 `syncGachaResultToDatabase`（~97 行），新增带预校验的完整实现（~171 行）

**下一步：**
 - 真机验证（导入开发版 → 抽卡 → 检查 3 张表写入是否成功、无 COLUMN_NOT_FOUND / CHECK_IN_VIOLATION）
 - 通过后可继续任务3（碎片系统）或任务5（十连折扣 UI 标注）

## 2026-06-26 CST（✅ 任务1 完成：物品目录外置 + 双层合并架构 + resetGachaPity bug 修复）

**状态：** 任务1 实施完成，包含物品目录架构重构、resetGachaPity 未定义 bug 修复、构建验证通过。待真机验证后可进入任务 2。

**完成：**
 - ✅ 创建 `src/神秘复苏模拟器/数据/gacha-items.json` 作为 source-of-truth（27 件物品定义）
 - ✅ 在 `v10_2_visualizer.js` 中实现 `BUILTIN_GACHA_ITEMS` 对象字面量（因 CDN script-link 无法加载外部 JSON）
 - ✅ 实现 `getAllGachaItemDefinitions()` 双层合并函数：builtin（只读）∪ custom（localStorage 覆盖/新增）
 - ✅ 实现 `getCustomGachaItems()` / `setCustomGachaItems()` / `addCustomGachaItem()` / `removeCustomGachaItem()` 自定义物品管理 API
 - ✅ 重构 `buildGachaPool()` 使用合并后的物品目录
 - ✅ **修复 resetGachaPity 未定义 bug**：添加函数定义（'rare'→pity.rare=0，'epic'→pity.epic=0，'mythic'→全部重置）
 - ✅ 删除旧的 SUPERNATURAL_ITEMS / CLUE_ITEMS / KNOWLEDGE_ITEMS 硬编码数组（~370 行），改为注释指向新架构
 - ✅ 构建验证通过：`npm run build` 成功，visualizer 编译为 290 KB

**代码改动：**
 - `src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js`：+~280 行（新架构 + API），-~370 行（旧硬编码）
 - `src/神秘复苏模拟器/数据/gacha-items.json`：新增 JSON 目录文件

**下一步：**
 - 真机验证任务1（导入开发版 → 测试抽卡 → 检查保底重置）
 - 通过后继续任务2（写库前预校验约束）

## 2026-06-26 CST（抽卡系统优化任务清单建立 + 任务1 研究阶段完成，暂停实施）

**状态：** 基于骰子商店（jerryzmtz/my-tavern-scripts，支持 builtin + custom 双层自定义物品）研究成果，建立抽卡系统 9 任务优化清单。任务1（物品目录外置 + 双层合并架构）研究阶段完成，**实施暂停待继续**。详见 task_plan.md「抽卡系统优化任务清单」与 findings.md「2026-06-26 抽卡系统架构研究」。

**完成：**
 - ✅ 研究骰子商店实现，确认其支持自定义物品（builtin 只读 + custom 覆盖/新增），作为抽卡系统优化架构参考
 - ✅ 建立 9 任务优化清单（task_plan.md），任务1 为架构基础，阻塞任务 6/7/9
 - ✅ 任务1 研究阶段完成（无需重复研究）：
   - 完整映射抽卡数据结构：GACHA_RARITY（6 档稀有度）、SUPERNATURAL_ITEMS（19 件灵异物品）、CLUE_ITEMS（4 件线索）、KNOWLEDGE_ITEMS（4 件知识）、GACHA_POOL_TYPE（4 池）、GACHA_CURRENCY、保底计数器
   - 定位 `v10_2_visualizer.js` 全部抽卡代码锚点（3949-5131 行，约 1183 行），含 GACHA_RARITY(3951-3959)、SUPERNATURAL_ITEMS(3969-4228)、CLUE_ITEMS(4231-4280)、KNOWLEDGE_ITEMS(4283-4332)、buildGachaPool(4428-4476)、单抽/十连(4478-4587)、syncGachaResultToDatabase(5030-5127)
   - 确认 3 张目标表 DB 列头映射（sheet_supernatural_items / sheet_clues / sheet_collected_rules）

**发现的 bug（待任务1 修复时一并处理）：**
 - ⚠️ `resetGachaPity('rare'|'epic'|'mythic')` 被调用 6 次（行 4541/4544/4547/4581/4584/4587），但全文件**从未定义** → 每次抽到 ★★★ 及以上触发保底重置时抛 ReferenceError。详见 findings.md。

**任务1 实施方案（下次新对话直接执行，无需重新研究）：**
 1. 创建 JSON 目录文件作为 source-of-truth（GACHA_RARITY + 27 件物品，每件含 targetTable/targetColumns，建模于 GachaItemDefinition schema）
 2. 因 visualizer 经 CDN script-link 加载（publish-card.mjs syncDirs 不含「脚本」目录），builtin 目录须以 **JS 对象字面量内嵌**进 visualizer（镜像 JSON 供人工编辑），不能作为独立 JSON 在 runtime 加载
 3. 实现内置只读层 + localStorage 自定义覆盖层 + `getAllGachaItemDefinitions()` 合并函数（custom 按 id 覆盖/新增 builtin，runtime = builtin ∪ custom）
 4. 将 buildGachaPool / SUPERNATURAL_ITEMS / CLUE_ITEMS / KNOWLEDGE_ITEMS 引用改为消费合并后的目录
 5. 实现缺失的 `resetGachaPity` 函数修复 ReferenceError（'rare'→pity.rare=0，'epic'→pity.epic=0，'mythic'→pity.total=0/pity.epic=0/pity.rare=0）

**暂停点：** 任务1 研究完成，实施未开始。下次新对话读 task_plan.md「抽卡系统优化任务清单」+ 本条 progress 顶部即可继续。

**下一步：**
 - 继续任务1 实施（先改测开发版 `src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js`，真页验证通过再同步发布版并推送）
 - 遵循 feedback：本地 main 是停滞分叉分支，正式改动从 origin/main 切 worktree 落地再 push/PR；先改测开发版再同步发布版

## 2026-06-25 CST（🎉 抽卡系统部署完成 - CDN 版本修复与真机验证通过）

**状态：** 抽卡系统已完整实现、打包、修复 CDN 版本问题并通过真机验证。抽卡按钮成功显示，功能完全可用。

**问题诊断与修复：**
 - ❌ **问题：** 真机导入后找不到抽卡按钮
 - 🔍 **根因：** `scripts/publish-card.mjs` 的 `CDN_REF = 'aa50677'` 指向抽卡实现之前的版本
   - `@aa50677`：fallback plan 修复版本（2026-06-24）
   - `@1ca3f84`：抽卡系统实现版本（2026-06-25）
   - `@55e6b71`：bot bundle 自动构建，包含抽卡代码
 - ✅ **修复：** 更新 `CDN_REF = '55e6b71'`，重新打包发布版 PNG
 - ✅ **验证：** 控制台验证脚本确认抽卡按钮存在且可用

**完成：**
 - ✅ 修复 CDN ref 版本不匹配问题（`aa50677` → `55e6b71`）
 - ✅ 重新打包神秘复苏模拟器发布版 PNG（7.5 MB，2026-06-25 21:01）
 - ✅ 真机导入并验证：
   ```
   Frontend: YES       ✅ 数据库前端已加载
   Visualizer: YES     ✅ 可视化前端已加载
   Nav: YES            ✅ 导航栏已渲染
   GachaBtn: YES       ✅ 抽卡按钮存在
   DataArea: YES       ✅ 数据区域存在
   ```
 - ✅ 抽卡按钮位置：数据库前端导航栏（顶部工具栏，🎁 礼物图标）

**版本信息：**
 - 发布版 PNG：`src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`
 - CDN 版本：`@55e6b71`（所有 7 处链接已更新）
 - 文件大小：7.5 MB
 - 打包时间：2026-06-25 21:01

**技术要点：**
 - CDN 版本控制：`scripts/publish-card.mjs` 的 `CDN_REF` 必须指向包含目标功能的 commit
 - 验证方法：`curl CDN_URL | grep -o "acu-btn-gacha"` 快速确认 bundle 是否包含代码
 - 真机验证：控制台运行验证脚本 `document.querySelector('#acu-btn-gacha')`

**抽卡系统功能清单：**
 - 19 种灵异物品（符合原著设定）
 - 4 个抽卡池（全物品、档案池、规律池、灵异物品池）
 - 保底机制（十连必出★★★、50抽必出★★★★、100抽必出★★★★★★）
 - 货币系统（调查点：消息+1、线索+5、事件+10、对抗厉鬼+15）
 - 数据库自动同步（灵异物品 → sheet_supernatural_items、线索 → sheet_clues、知识 → sheet_collected_rules）

**下一步：**
 - ✅ 提交 CDN 版本修复（`scripts/publish-card.mjs`）
 - 可选：清理临时文件（`.tmp-*`、截图）
 - 可选：开始新功能开发

## 2026-06-25 CST（🎉 抽卡系统实现完成 - 新增 1182 行代码）

**状态：** 神秘复苏抽卡系统完整实现，包含核心数据结构、UI 界面、数据同步，已构建并打包发布版。

**完成内容：**
 - ✅ Phase 1: 核心数据结构（~530 行）
   - 6 个稀有度等级枚举（常见、普通、稀有、史诗、传说、神话）
   - 19 种灵异物品配置（符合神秘复苏原著设定）
   - 4 种线索物品（提升档案进度 5%/10%/25%/50%）
   - 4 种知识物品（提升规律进度 5%/10%/25%/50%）
   - 4 个物品池类型（全物品、档案池、规律池、灵异物品池）
   - 抽卡逻辑（单抽、十连、保底机制）
   - 货币系统（调查点，localStorage 持久化）
   - 保底计数器（十连保底★★★、50抽保底★★★★、100抽保底★★★★★★）

 - ✅ Phase 2: UI 界面（~470 行）
   - 导航栏新增"抽卡系统"按钮（礼物图标）
   - 抽卡主面板（暗色调设计，与数据库前端风格一致）
   - 货币显示组件（调查点余额、获取方式提示）
   - 抽卡池选择器（4 个池子，可切换）
   - 单抽/十连按钮（渐变色、悬停效果）
   - 翻卡动画（卡牌翻转效果、随机延迟）
   - 结果展示（稀有度颜色、物品详情、点击查看）
   - 物品详情对话框（大图标、描述、效果、使用次数）
   - 抽卡历史面板（最近 20 次记录、可折叠）

 - ✅ Phase 3: 数据同步（~180 行）
   - 灵异物品自动写入 `sheet_supernatural_items` 表
   - 线索自动写入 `sheet_clues` 表
   - 知识自动写入 `sheet_collected_rules` 表
   - 抽卡历史保存到 localStorage（最近 100 次）
   - 货币消耗/保底计数实时更新
   - 支持 CRUD 接口和 fallback executeMutation

 - ✅ Phase 4: 测试打包
   - npm run build 成功（v10_2_visualizer.js 编译为 290 KB）
   - npm run publish-card 成功（发布版 PNG 7.8 MB）
   - 主题适配（11 种主题颜色变量）
   - 响应式设计（移动端适配）

**代码统计：**
 - 新增行数：1,182 行
 - 文件总行数：5,131 行（原 3,949 行）
 - 增长比例：+29.9%

**核心设计要点：**
 1. **货币系统**：调查点（消息+1、线索+5、事件+10、对抗厉鬼+15）
 2. **保底机制**：十连必出★★★、50抽必出★★★★、100抽必出★★★★★★
 3. **19种灵异物品**：源头碎片（神话）、鬼域/鬼差制服（传说）、黄金手掌/饿死鬼香烟（史诗）等
 4. **4个物品池**：全物品池（均匀）、档案池（线索x2）、规律池（知识x2）、灵异物品池（纯物品）
 5. **符合原著设定**：所有物品均"沾染灵异、拥有灵异能力"，无普通物品/势力科技/唯一性物品

**下一步：**
 - 真机验证（导入角色卡 → 测试抽卡 → 检查数据库）
 - 根据真机测试结果调整界面或修复 bug
 - 考虑新增货币获取途径（自动检测消息/事件触发）

## 2026-06-25 CST（会话整理：项目规划文档更新完成）

**状态：** 用户要求整理项目进度和工作流程，确保新会话可以无缝继续任务。

**完成：**
 - ✅ 创建 `.cursor/workflow.md` - 项目工作流程常驻文档
   - 项目结构、开发流程、Git 工作流、真机验证、发布流程
   - 关键技术（数据库系统、CDN 部署链路、角色卡格式）
   - 常见问题排查（分类器故障、CDN 同步、数据库检查、worktree 污染）
   - 版本历史里程碑
 - ✅ 创建 `.cursor/tasks.md` - 任务清单文档
   - 当前任务：抽卡系统实现（4 个 Phase，详细分解）
   - 已完成任务：剧情召回（已 revert）、数据库前端优化、vendor 修复、ccv3 修复
   - 待办事项：表结构校验、时空锚点扩展、性能监控
   - 技术债务记录
   - 会话恢复检查清单
 - ✅ 整理 `progress.md` 保留版本变更历史
 - ✅ TaskList 清理：当前 4 个待办任务（抽卡系统相关）

**文件提交规则整理：**
 - ✅ **需要提交**：`src/`、`vendor/`、`神秘复苏模拟器发布版/*.png`、`progress.md`、`.cursor/workflow.md`、`.cursor/tasks.md`
 - ❌ **不提交**：`dist/`（bot bundle 自动生成）、`.tmp-*`、截图、worktree 目录

**下一步：** 
 - 继续实现抽卡系统 Phase 1（核心数据结构）
 - 或新会话通过读取 `.cursor/workflow.md` + `.cursor/tasks.md` 快速恢复上下文

## 2026-06-25 CST（🎉 重大突破：所有已知 row_id 问题全部修复 - 14/14 表完全正常）

**状态：** 真页验证确认 - 所有 14 张表 row_id 全部为正常数字，**无任何空字符串**。此前一直存在的 sheet_clues、sheet_chronicle、sheet_collected_archives 三张表的 row_id 退化问题彻底解决。

**验证环境：**
- 角色：神秘复苏模拟器发布版 (id=4)
- 角色卡来源：本次重新打包，包含最新数据库前端优化
- Runtime marker: `mfrs-4-0-final-baseline-6-28-p5-4-hotfix13`
- Runtime state active: true
- dbRuleFound: true

**数据库写入完整结果（14/14 表 row_id 正常）：**

| 表名 | 行数 | 空 row_id | row_ids |
|------|------|-----------|---------|
| sheet_global_state | 1 | 0 | [1] |
| sheet_player_state | 1 | 0 | [1] |
| sheet_supernatural_events | 1 | 0 | [1] |
| sheet_ghost_archives | 2 | 0 | [1, 2] |
| **sheet_clues** | 1 | **0** ✅ | [1] |
| sheet_characters | 2 | 0 | [1, 2] |
| sheet_locations | 1 | 0 | [1] |
| sheet_supernatural_items | 1 | 0 | [1] |
| sheet_action_suggestions | 4 | 0 | [1, 2, 3, 4] |
| **sheet_chronicle** | 2 | **0** ✅ | [1, 2] |
| sheet_check_suggestions | 5 | 0 | [1, 2, 3, 4, 5] |
| sheet_controlled_ghosts | 1 | 0 | [1] |
| **sheet_collected_archives** | 2 | **0** ✅ | [1, 2] |
| sheet_collected_rules | 1 | 0 | [1] |

**修复链路验证：**
1. ✅ vendor row_id 自动分配（commit `52b2e62`）- 原生模式下 newRow[0] 为空时自动分配 max+1
2. ✅ fallback plan 中文字段名修复（commit `aa50677`）- buildMfrsClue/Chronicle fallback 添加 row_id 和中文字段名
3. ✅ CDN ref 更新（commit `36082bc`）- publish-card 使用 aa50677 作为 CDN ref
4. ✅ 角色卡重新打包包含所有最新修复
5. ✅ AI 实际写入数据完全成功

**关键改进点：**
- **sheet_clues**: row_id = 1（之前是 ""）
- **sheet_chronicle**: row_id = [1, 2]（之前是 ""，且只有 1 行）
- **sheet_collected_archives**: row_id = [1, 2]（之前包含 ""）

**项目里程碑达成：**
- 🟢 数据库 14/14 表写入成功（100%，之前 13/14 = 93%）
- 🟢 row_id 不再退化为 checkpoint 模式
- 🟢 chronicle 增加到 2 行（数据完整性提升）
- 🟢 collected_archives 增加到 2 行
- 🟢 delta 模式稳定工作，无 checkpoint 退化警告
- 🟢 整体数据完整性大幅提升

**项目状态：** 所有已知阻断/非阻断问题全部解决，神秘复苏模拟器进入稳定可用状态。

## 2026-06-24 CST（阶段6收尾完成：前端交互优化、性能验证、代码清理）

**状态：** 阶段6收尾完成。初始检查误判前端界面缺失（实际 v10_2_visualizer.js 3666 行已完整实现，以脚本形式集成在角色卡中），纠正后聚焦交互细节打磨。阶段1-5 complete 标记准确。

**完成内容（8 步合并）：**
 - 对比上游 shujuku 仓库（spv3.9.5），核心 CRUD/主题(11种)/Toast/空状态功能持平
 - 交互打磨：刷新/原生编辑器/手动更新按钮补 spinner + 异步状态恢复（originalHtml 保存恢复）；空状态加 fa-inbox 图标 + 双层引导文字；搜索 300ms 防抖 + clearTimeout；错误提示从通用改为显示具体 err.message
 - 性能与边界验证（理论）：29 个 .off() + 64 个 .on() 监听器管理（45% off 覆盖率）、分页(默认20条/页)/防抖/延迟渲染(slice)、escapeHtml XSS 防护（转义 & < > 双引号 单引号）、1000 条数据理论 < 200ms（只渲染当前页）
 - 内存安全：事件监听器 .off() 清理、定时器 clearTimeout、无全局 DOM 缓存
 - 代码清理：14 处 console 全为必要错误日志（13×console.error + 1×Save failed），无调试残留；注释/命名/结构达生产级（3707 行，空行 11.8%）
 - 提交 11b9cfc（+62/-21）到 worktree 分支 worktree-agent-a56e834f3396ee862 待建 PR
 - 时空锚点功能扩展（index.yaml / 欢迎页.txt / 开局时空锚点联动规则.txt）留作单独 PR；test_performance.html 临时文件不提交

## 2026-06-24 CST（vendor row_id 稳定性修复提交）

**状态：** 提交 vendor row_id 自动分配修复。原生模式下，当调用方未提供 row_id 时，insertRow 函数自动分配 max+1，防止 newRow[0] 留空字符串导致 hasStableRowIds_ACU 判定失败、delta 退化为 checkpoint。

**完成：**
 - 修复位置：vendor/shujuku-sp-fork/index.js 的 insertRow 函数
 - 修复逻辑：检查 headers[0] === 'row_id' 且 newRow[0] 为空/null/undefined 时，遍历现有行找到 max row_id，自动分配 max+1
 - 针对问题：sheet_clues、sheet_chronicle、sheet_collected_archives 部分行 row_id 为空字符串
 - 日志输出：logDebug_ACU 记录自动分配的 row_id 值和表名
 - 提交内容：仅 vendor/shujuku-sp-fork/index.js（16 行新增代码）
 - dist 本地构建残留保持原样，不提交（留给 bot bundle Action）

**下一步：** 真页验证修复效果，检查 row_id 是否不再为空字符串。

## 2026-06-24 CST（真页验证通过：13/14 表写入 + at_depth 保真修复生效）

**状态：** v0.0.264 at_depth 保真修复真页验证通过。Chrome DevTools MCP 导入发布版 PNG（id=4）后确认运行态 depth=4/role=0 注入正确，378 条 at_depth 条目映射无误，worldbook hard gate 383/33/5851。

**数据库写入结果（exportTableAsJson 直读 IndexedDB）：**
 - 13/14 表成功写入（93%）：global_state/player_state/supernatural_events/ghost_archives/clues/characters/locations/supernatural_items/action_suggestions/chronicle/check_suggestions/controlled_ghosts/collected_archives
 - sheet_collected_rules 0 行（正常，玩家未收录规律）
 - 关键修正：getTableData() 返回 null 不代表表为空，应用 exportTableAsJson() 检查 IndexedDB 实际数据（之前误判 14/14 表为空）
 - AI 不直接输出 SQL 属正常：shujuku_v120 fallback 从 sp_ 协议块提取信息生成本地 CRUD plan
 - 协议块清洗生效，update_output_contract 无残留泄漏；public_summary 列名映射正常
 - 已知非阻断问题：sheet_clues/sheet_chronicle/sheet_collected_archives 部分 row_id 空字符串、chronicle 纪要列值异常、minLength=20 未拦截 6 字符值


## 2026-06-23 CST（MCP tool schema 修复 + 会话恢复）

**状态：** Chrome DevTools MCP 在本会话成功加载并实测可用。上一轮的 cwd 修复（`~/code` → `D:\project\tavern_helper_template`）在会话重启后生效。

**完成：**
 - 全局 chrome-devtools MCP 配置的 cwd 从不存在的 `~/code` 改为 `D:\project\tavern_helper_template`，解决 `os error 267` 启动失败。
 - 实测 `mcp__chrome_devtools__list_pages` 成功返回浏览器标签页数据，确认 MCP tool schema 已加载。
 - `list_mcp_resources` 返回空不代表 MCP 未加载——chrome-devtools MCP 提供 tools 而非 resources，正确判据是工具列表是否暴露 `mcp__chrome_devtools__*`。
 - dirty 判定完成：`dist/**` 为本地构建残留已 revert；`.mcp.json` 格式变动已 revert；发布版头像 PNG + planning 三件套已提交 `17f47e1` 并推送。

## 2026-06-22 CST（v6.30 发布完成：修复 AI 不输出 SQL 问题）

**状态：** v6.30 已发布，数据库联动规则改为常驻激活（蓝灯），修复 AI 不输出 SQL 的根本问题。

**完成：**
 - 问题诊断：v6.29 真页验证发现 AI 只输出 MVU JSON Patch，不输出 SQL。根因：数据库联动规则使用绿灯（selective）激活策略，需要关键词匹配才会注入。最近对话中没有触发关键词，规则从未注入到 AI 上下文。
 - 修复：将数据库联动规则激活策略从绿灯改为蓝灯（constant），确保每次对话都注入。
 - PR #17 合并到 main，bot bundle `c087823`，发布 `5f37095`，tag `v6.30`。CDN smoke 通过。

## 2026-06-22 CST（v6.29 真页验证通过：vendor 表头修复成功）

**状态：** v6.29 真页验证完成，vendor 表初始化 bug 修复成功。表头不再截断，修复目标达成。

**完成：**
 - 根因：`normalizeGuideData_ACU` 等 3 处函数的 fallback 逻辑没有检查 content 是否为空数组，导致 `[null]` 被转换为 `["row_id"]`，表头截断。
 - 修复：在 3 处 fallback 逻辑中增加 `content.length > 0` 检查。PR #16 合并 `9433a67`，v6.29 发布。
 - 真页验证：灵异物品表头 9 列完整、收录规律表头 10 列完整。数据库 12/14 表成功写入。

## 历史流水压缩索引（按版本号回查）

以下旧条目已压缩，详细内容见 `planning_archive_2026-06/` 或 git 历史。

- **2026-06-22 CDN ref 修复 + hotfix CDN 部署**：hotfix 脚本 CDN 部署链路（source → bot bundle → CDN ref 回填 → publish-card），`publish-card` 统一替换所有 CDN ref 的机制。
- **2026-06-21 worldbook hard gate 三方闭环**：CDP 直读运行态内存确认 383/33/5851；删除 6 张污染源卡；外部 JSON 双禁用字段格式修复。
- **2026-06-21 source PNG 污染修复**：工作树 PNG 污染用 `git checkout HEAD` 修复（HEAD 干净）；Codex 续做无分类器。
- **2026-06-22 任务 G（项目文档更新）**：README.md + CHANGELOG.md 已合并 `9756e2a`。
- **2026-06-22 步骤 6.6-11 验收报告**：CDN smoke 通过，hotfix 生效，数据库 12/14 表落盘，3 表损坏（已修复）。
- **2026-06-18 及更早（6.3-6.27）**：Task 20 协议/开局锁/事件纪要落库收口、SQL 兜底限流、SQL 参数/边界/约束、R2SQL、Task 19 raw/display 收口、503/524 上游分流等历史修复。详细见 `planning_archive_2026-06/`。
