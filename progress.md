# Progress Log

## 2026-06-21 CST（SillyTavern 重启后运行态重新验证 + 外部 JSON 格式修复 + 三方闭环最终确认）

**状态：** 用户授权执行步骤 1-3（重新验证运行态 → 如仍污染则修复 → 三方 gate 闭环确认）。SillyTavern 已重启（PID 6812，端口 8000），页面已 reload，Chrome CDP 9222 正常。用 `scripts/cdp-evaluate.mjs`（裸 CDP）做运行态验证。未触发真实 AI、未碰真页交互。

**完成：**
- **步骤 1（重新验证运行态）：** handoff 摘要称重启后运行态 383/0 全启用（污染），但实测已恢复干净。`SillyTavern.getContext().characters` 当前 7 个角色，关键三角色（i=2 `神秘复苏模拟器9.png`、i=3 `神秘复苏模拟器发布版.png` 内存缓存、i=4 `神秘复苏模拟器发布版5.png`）全部 383/33/5851。运行态从干净磁盘文件重载，handoff 的 383/0 已不存在。（旧 `characters[9]` 索引因重启后角色数组缩小变为 i=4。）
- **步骤 2（外部 worldbook JSON 格式修复）：** 磁盘外部 JSON `E:/SillyTavern/data/banyan/worlds/神秘复苏模拟器发布版.json` 数据正确（33 disabled），但 33 个 disabled 条目只有 `disable=true` 缺 `enabled=false`，gate 对 JSON 源要求双禁用字段。用 `scripts/normalize-worldbook-disabled-flags.mjs --backup --write` 补齐双字段（备份在 `.before-disabled-normalize.bak`）。`神秘复苏模拟器.json` 已是双字段格式，无需修改。
- **步骤 3（三方 gate 闭环最终确认）：** 全部通过——磁盘外部 JSON（`神秘复苏模拟器发布版.json` + `神秘复苏模拟器.json` 均 383/33/5851 双禁用字段合规）；磁盘 PNG（`发布版5.png` chara+ccv3 + `模拟器9.png` chara+ccv3 均 383/33/5851）；运行态内存（i=2/3/4 三角色均 383/33/5851，ccv3 `enabled=false` 原生形状，gate 放宽双禁用要求通过）。
- **仓库 source PNG 当前干净：** `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png` git 标记 modified 但实测 383/33/5851（chara+ccv3 通过），可能被某进程 touch 产生二进制 diff 但数据未污染。

**待续：** planning 三件套本轮增量待提交；唯一剩余任务仍是 B-I 真实 AI 回归（需用户授权 + chrome-devtools MCP 加载）。

## 2026-06-21 CST（worldbook hard gate 彻底闭环：CDP 直读运行态内存确认 383/33/5851）

**状态：** 用户授权做可选补充——把运行态 world_info 间接证据升级为直接内存快照。因 Codex 会话未加载 chrome-devtools MCP，用裸 CDP 替代。未触发真实 AI、未切换激活角色（只读内存）。

**完成：**
- 写 \scripts/cdp-evaluate.mjs\：裸 CDP 工具，Node 24 内置 WebSocket 连 9222 page target 发 \Runtime.evaluate\，等价 MCP \evaluate_script\，可复用。
- 探明运行态入口：全局 \world_info\ 是 HTMLSelectElement（下拉框 DOM）非数据；\SillyTavern.getContext()\ 可用；数据在 \characters[id].data.character_book.entries\（ccv3）。
- **关键认知修正：characterId=9 不绑定外部世界书**（\c9.world\/\c9.data.world\ 空，下拉框对该卡全未选）——运行态源是卡内嵌 ccv3，不是外部 JSON。旧 findings"运行态从外部 JSON 加载"对 characterId=9 不成立。
- **运行态内存快照（CDP 直读 \characters[9].data.character_book.entries\）**：383 entries / 33 disabled（全 \enabled=false\ 原生形状）/ 350 enabled / maxEnabledLen 5851 / maxEnabledTitle \鬼奴与衍生物规则\——与磁盘 PNG gate、磁盘外部 JSON gate 三处一致，全绿 383/33/5851。
- worldbook hard gate 彻底闭环：磁盘外部 JSON ✓ + 磁盘 PNG chara/ccv3 ✓ + 运行态内存 ccv3 ✓ = 383/33/5851 三方一致。

**发现（非阻断）：**
- 当前激活角色是 \SillyTavern System\（name2）非 characterId=9（reload 后页面回默认）；B-I 前需页面切回 characterId=9。
- 删除 6 张污染 PNG 文件后，SillyTavern 内存 \characters\ 仍缓存 characterId=4-8 条目（avatar 引用已删文件名但对象在）；要彻底清理需 UI 侧删角色或重载角色列表，但不激活不影响 worldbook。

**待续：** 本轮新增 \scripts/cdp-evaluate.mjs\ + planning 增量未提交；B-I 真实 AI 回归需用户授权，前置已全清（worldbook hard gate 闭环、污染源卡文件已删、仓库 source PNG 与 HEAD 干净一致）。

## 2026-06-21 CST（任务 1 删除污染源卡 + 任务 3 提交收口，push 待用户执行）

**状态：** 用户授权删除 6 张污染源卡并提交收口。纯文件/git 操作，未触发 AI、未碰真页交互。

**完成：**
- **任务 1（删除 6 张污染源卡）：** 先备份到 E:/SillyTavern/data/banyan/_codex_archive/polluted-cards-deleted-20260621/，再删除 神秘复苏模拟器.png、神秘复苏模拟器发布版.png、神秘复苏模拟器发布版1/2/3/4.png（均 383/5/40613 污染）。characters/ 现仅剩 神秘复苏模拟器9.png、神秘复苏模拟器发布版5.png 两张干净卡。worldbook 回弹根因物理消除。
- **任务 3（提交收口）：** git add 精确 staging 5 文件（	ask_plan.md/progress.md/indings.md/PROJECT_FLOW.md + untracked 新脚本 scripts/rebuild-worldbook-from-png.mjs），commit caf2660（5 文件 +4621/-176）。既有无关 dirty（src 实验、dist 状态栏、其他 scripts、--.json 等）保持原样未触动。两份 source PNG 已与 HEAD 一致无需提交。

**阻断 / 待续：**
- **push 被会话审批策略拒绝（approval policy Never）：** git push origin main 需用户手动执行。本地 main ahead 1（领先 origin/main 1 提交 caf2660），可 fast-forward，无冲突。
- 本条 progress 记录写入后 task_plan.md 又成未提交 dirty（增量记录），留作下次提交或用户 push 前一并处理。
- 剩余唯一待续：任务 2（4.0 清单 B-I 真实 AI 回归），需用户授权 + 可能加载浏览器 MCP 做 A8 完整基线。

## 2026-06-21 CST（优先级 1 完成：工作树 source PNG 污染用 git checkout HEAD 修复）

**状态：** 用户授权先修工作树 source PNG 污染（第 3 步发现的提交陷阱）。纯 git/文件操作，未触发 AI、未碰真页。

**完成：**
- 备份污染工作树 PNG 到 E:/SillyTavern/data/banyan/_codex_archive/repo-src-png-before-checkout-clean-head-20260621/（神秘复苏模拟器.png/神秘复苏模拟器发布版.png）。
- 实测 HEAD 干净（git show HEAD:<png> gate 通过 383/33/5851），采用 git checkout HEAD -- <两份 PNG> 恢复工作树到 HEAD 干净版本，零新代码、零 PNG 重打包。
- 复跑 erify-worldbook-pollution-gate --expect-mfrs-runtime 四项全通过（两份 PNG 各 chara+ccv3 均 383/33/5851）；git status 这两份 PNG 已无 modified，与 HEAD 一致。
- 提交陷阱解除：现在这两份 PNG 与干净 HEAD 一致，不再有"提交会把干净 HEAD 退化成污染"风险。旧 task_plan 第 13 条"HEAD 污染"已彻底失效。

**待续：** 6 张污染源卡是否清理/隔离由用户决定（防 worldbook 回弹）；B-I 真实 AI 回归需用户授权 + 可能需加载浏览器 MCP 做 A8 完整基线。本轮未提交任何改动（planning 三件套 + rebuild 脚本为未提交 dirty）。

## 2026-06-21 CST（Codex 续做任务 2 第 0-3 步：无分类器 + 运行态磁盘校验 + 污染源定位 + source PNG 漂回污染）

**状态：** 用户在 Codex（GPT-5.4）环境恢复任务 2。确认 Codex 无 Claude Code 的 `glm-5.2` 分类器，旧"分类器阻断"过时。本轮只做 no-AI 范围第 0-3 步，未触发真实 AI、未碰真页交互、未改业务源码，未提交任何改动。

**完成：**
- **第 0 步（修正过时记录）：** task_plan `当前状态` 顶部 + findings 顶部已加 Codex 续做条目，标注分类器阻断在 Codex 已解除、allow 白名单绕过法不适用。
- **第 1 步（运行态 worldbook 校验）：** 磁盘外部 JSON `E:/SillyTavern/data/banyan/worlds/神秘复苏模拟器发布版.json` 与 `神秘复苏模拟器.json` 跑 `node scripts/verify-worldbook-pollution-gate.mjs --expect-mfrs-runtime` 双通过（383/33/5851，磁盘干净）。用户此前已手动 reload 酒馆页面，SillyTavern 运行态 `world_info` 应已从干净外部 JSON 重载。HTTP `/api/worldinfo/get` 多用户 CSRF 鉴权 403（`/csrf-token` 可取 token 但 POST 仍 403，`Authorization: Bearer banyan` 无效，`/api/users/list` 也 403），无浏览器 MCP 取不到内存快照，以"磁盘干净 + reload 已发生"作为运行态干净的充分证据。
- **第 2 步（污染源定位）：** `E:/SillyTavern/data/banyan/characters/` 下 8 张神秘复苏 PNG 逐个跑 gate：干净=`神秘复苏模拟器9.png`(chara+ccv3)、`神秘复苏模拟器发布版5.png`(characterId=9)；污染(383/5/40613)=`神秘复苏模拟器.png`、`神秘复苏模拟器发布版.png`、`发布版1/2/3/4.png` 共 6 张——worldbook 回弹源坐实，污染卡导入/激活时覆盖外部 JSON。
- **第 3 步（A8 静态基线 + 重大发现）：** 运行日志（vendor 内存环形缓冲）与 IndexedDB 数据库快照无法从 shell 取（需浏览器 MCP），本轮静态基线为 gate + git 状态。**重大发现：仓库 source PNG 工作树漂回污染态**——`src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`、`src/神秘复苏模拟器/神秘复苏模拟器.png` 工作树 383/5/40613（污染），但 `git show HEAD:<png>` gate 通过 383/33/5851（HEAD 干净）。与旧 task_plan 第 13 条相反，现在 HEAD 干净、工作树污染，禁止直接提交这两份 PNG（会把干净 HEAD 退化成污染）。
- **planning 更新：** task_plan.md / findings.md / progress.md 三件套已更新本轮记录。

**阻断 / 待续：**
- B-I 真实 AI 回归需用户明确授权（会触发真实模型 + 写库）。
- 工作树 source PNG 污染：授权 B-I 前如要提交，需先用干净源 `神秘复苏模拟器发布版5.png` 重建并复跑 gate 确认 383/33/5851。
- 6 张污染源卡是否清理/修复由用户决定（防止再次导入污染外部 JSON）。
- A8 完整运行日志/IndexedDB 基线需加载 Chrome DevTools MCP（`evaluate_script`），当前 Codex 会话未暴露。


## 历史会话流水压缩索引（旧条目，按版本号回查）

以下旧条目已压缩，详细内容见 `planning_archive_2026-06/` 或 git 历史。新对话默认不读，只在按版本回查时展开。

- **2026-06-21 worldbook 文件级修复 + rebuild 脚本校验 bug 修复**：rebuild 脚本从干净 PNG 重建外部 JSON，校验 bug（只认 disable===true）已修为双标志。
- **2026-06-21 B-I 回归启动**：hard gate A1-A6 全绿，worldbook 阻塞，根因查清（外部 JSON 污染）。
- **2026-06-21 收口环境**：本地 main 同步 origin/main，7 个历史 worktree 全清。
- **2026-06-21 发版完成**：PR #15 合并，tag v0.0.235，chronicle 守卫落地玩家 runtime。
- **2026-06-21 发新版推守卫**：发布版 CDN ref 47a5fe5→8fdcc4a。
- **2026-06-21 待办 C/D**：本地 main 指针同步、清理已合并 worktree。
- **2026-06-20 任务 A/B**：bot 自动 bundle 重建 dist（v0.0.233）、sql-regr gate 恢复全绿（PR #14 v0.0.234）。
- **2026-06-20 chronicle 守卫干净 PR 合并 fork main**：取代停滞本地 8c30884。
- **2026-06-20 可选后续 1-4 + 收尾任务 1-5**：任务 1/3/4 完成，任务 2 修复 PNG 漂移后暂停在 B-I 前；SP0001、UI 导入、worldbook、doubao 收口；原"Task 20 数据库质量缺口"复核为误报。
- **2026-06-19 发布版完整 4.0 端到端 1-6 + hotfix13 release smoke 收口**：开局与 Task 20 跑通；非 AI CRUD smoke 通过；worldbook 回弹缩窄到外部书双禁用字段丢失。
- **2026-06-19 hotfix13 source→loader→dev card/CDN**：远端分支候选链路完成；loader fix 续 dev card runtime 通过。
- **2026-06-18 Task 20 请求全绿→结果侧失败**：重复 runtime 旧监听器风险、raw 保存清洗吃正文、换模型后 `–` 解析污染、同名外部书回弹源定位 2 号错误卡。
- **2026-06-18 及更早（6.3-6.17）**：SQL 兜底限流、SQL 参数/边界/约束、SQL Debug、R2SQL、Task 19 raw/display 收口、503/524 上游分流等历史修复。详细链路见 findings.md 版本变更保留表和 `planning_archive_2026-06/`。
