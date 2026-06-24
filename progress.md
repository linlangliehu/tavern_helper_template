# Progress Log

## 2026-06-24 CST（真页验证确认：用户手动导入新卡后真实对话，v0.0.264 修复效果持续生效）

**状态：** 用户手动导入更新后的卡（含 at_depth 顶层 depth/role 修复）并进行了几轮真实 AI 对话。通过 `MysteryDatabaseFrontend.exportCurrentData()` 检查数据库写入状态，确认 13/14 表成功写入（93%），与上次验证结果一致。v0.0.264 at_depth 保真修复在真实对话中持续生效。

**完成：**
 - 验证环境：角色 id=3（神秘复苏模拟器发布版），7 条对话，marker `mfrs-4-0-final-baseline-6-28-p5-4-hotfix13`
 - extensionPrompts 槽位确认：customDepthWI_4_0（depth=4, role=0）已注册，死亡裁定守则按系统 depth 4 注入
 - 数据库写入结果（exportCurrentData 直读）：13/14 表有数据
   - sheet_global_state: 1 行（大昌市七中，世界压力 32，row_id=1）
   - sheet_player_state: 1 行（阳朔，初级驭鬼者，死亡风险 5，row_id=1）
   - sheet_supernatural_events: 1 行（七中敲门事件，可见摘要正常写入，row_id=1）
   - sheet_ghost_archives: 2 行（G0002 周正体内厉鬼 + G0003 敲门鬼，row_id=2,1）
   - sheet_clues: 1 行（C0001，row_id="" 空字符串）
   - sheet_characters: 2 行（阳朔 + 周正，row_id=1,2）
   - sheet_locations: 1 行（大昌市第七中学，row_id=1）
   - sheet_supernatural_items: 1 行（红色鬼烛x3，表头 9 列完整，row_id=1）
   - sheet_action_suggestions: 4 行（A/B/C/D，row_id=1-4）
   - sheet_chronicle: 1 行（SP0001，row_id="" 空字符串，纪要列值异常为"SP0001"而非纪要文本）
   - sheet_check_suggestions: 5 行（row_id=1-5）
   - sheet_controlled_ghosts: 1 行（鬼档案，可见摘要正常写入，row_id=1）
   - sheet_collected_archives: 2 行（周正体内厉鬼 5% + 敲门鬼 0%，row_id=1,"" 一行空）
   - sheet_collected_rules: 0 行（正常，玩家尚未收录规律）
 - AI 输出 MVU JSON Patch 正常行为，shujuku_v120 fallback 机制从 sp_ 协议块提取信息生成本地 CRUD plan
 - 协议块清洗生效，AI 消息中 update_output_contract 已被清洗，无残留协议块泄漏
 - public_summary（可见摘要）列名映射正常，3 张有 public_summary 列的表均成功写入可见摘要
 - 已知非阻断问题仍存在：row_id 空字符串、sheet_chronicle 纪要列值异常、minLength=20 约束未拦截 6 字符值

## 2026-06-24 CST（真页验证突破：数据库实际已成功写入 13/14 表，之前"失败"结论为检查方法错误）

**状态：** 用户完成几轮真实 AI 对话后，通过 `exportTableAsJson()` 检查发现数据库实际已成功写入 13/14 张表（93%）。之前 handoff 用 `getTableData()` 返回 null 判定"14/14 表为空"是错误的——`getTableData()` 读的是内存缓存，实际数据存储在 IndexedDB (`auto-card-updater-db`) 中。

**完成：**
 - **数据库写入实际结果（exportTableAsJson 直读 IndexedDB）：** 13/14 表有数据，详情：
   - sheet_global_state: 1 行，sheet_player_state: 1 行，sheet_supernatural_events: 1 行
   - sheet_ghost_archives: 1 行，sheet_clues: 1 行，sheet_characters: 2 行（龙火+周正）
   - sheet_locations: 1 行，sheet_supernatural_items: 1 行（红色鬼烛x3，表头9列完整）
   - sheet_action_suggestions: 4 行（A/B/C/D），sheet_chronicle: 1 行（SP0001）
   - sheet_check_suggestions: 5 行，sheet_controlled_ghosts: 1 行，sheet_collected_archives: 1 行
   - sheet_collected_rules: 0 行（正常，玩家尚未收录规律）
 - **成功率：13/14 表（93%）**，表头全部完整，v6.29 vendor 修复生效
 - **关键修正：** `getTableData()` 返回 null 不代表表为空，应使用 `exportTableAsJson()` 检查实际数据
 - **AI 不直接输出 SQL 是正常行为**：shujuku_v120 fallback 机制从 AI 的 sp_ 协议块提取信息生成本地 CRUD plan，成功写入数据库
 - **当前使用旧卡 id=3**（不是 handoff 中的新卡 id=4，后者已不存在）
 - **部分 CRUD 失败（非阻断）**：visible_summary 列名映射、CHECK_IN_VIOLATION、row_id 不稳定
 - **协议块清洗生效**，Hotfix 监听器已注册（GENERATION_ENDED: 1）
 - planning 三件套已提交推送 `90af422`

## 2026-06-24 CST（真页验证核心通过：at_depth depth/role 保真修复在 SillyTavern 运行时确认生效）

**状态：** v0.0.264 at_depth 保真修复的真页验证核心步骤完成。通过 Chrome DevTools MCP upload_file 成功导入更新后的发布版 PNG，验证运行时内存中数据库联动规则条目按系统角色 depth 4 注入。

**完成：**
 - 使用 mcp__chrome_devtools__upload_file 将 src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png 上传到导入按钮，SillyTavern 自动导入为 神秘复苏模拟器发布版1.png（id=4）。
 - ccv3 顶层字段验证：新卡 id=4 的数据库联动规则条目确认包含顶层 depth: 4, role: 0, constant: true。旧卡 id=2/3 无顶层 depth/role。
 - convertCharacterBook 转换验证：position 从 after_char 变为 4（at_depth），depth: 4, role: 0 正确保留。全部 378 条 at_depth 条目正确映射。
 - extensionPrompts 槽位：customDepthWI_4_0（depth=4, role=0）已注册。
 - worldbook hard gate 运行态确认：383 entries / 33 disabled / 350 enabled / maxEnabledLen 5851。
 - planning 三件套已提交 `17f47e1` 和 `d44ea1f`，推送 origin/main。

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
