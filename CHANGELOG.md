# 版本更新日志

本文档记录《神秘复苏模拟器》角色卡的版本历史和重要更新。

## [v8.14.0] - 2026-07-19

### 新增
- **抽卡系统直达中栏**：点击右侧「抽卡」导航后，中栏正文直接切换为「神秘复苏抽卡系统」完整功能面板，不再显示摘要 + 单抽/十连简版 + 「完整面板」二次入口
  - 新增 `MFRS.mountPanel(container, { onClose })` 嵌入式挂载 API，返回 `{ root, destroy }` 所有权句柄
  - `MFRS.showPanel()` 保留为兼容入口（body overlay）
- **默认/沉浸双向模式切换**：默认三栏视图新增可见「沉浸模式」按钮；沉浸 HUD 顶栏保留「默认模式」按钮，两者均支持 `Ctrl+Shift+G` 快捷键
- **简化开发流程**：新增单人开发简化工作流（固定端口 5510 + 直接切换 YAML 开发/生产模式），保留 F5 便利性、发布门禁与 CDP 调试

### 变更
- 移除沉浸 HUD 左栏「打开全库 · 玩家状态」按钮（保留玩家状态表、镜像与其他全库入口）

### 技术细节
- Cache version: `v81400_20260719_01`
- 主要文件：`src/神秘复苏模拟器/脚本/消息内面板/index.ts`、`src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js`

### 验证结果
- ✅ 门禁全绿：initvar-schema / regex-ids(33) / mvu-hotfix / output-cleaning / table-change / archive-ui(237) / release-png
- ✅ 真页验证：抽卡系统完整融入中栏，无独立弹窗；默认↔沉浸模式切换正常

---

## [v6.28.3] - 2026-06-22

### 修复
- **优化协议块清洗时机**：确保内存与界面同步
  - 新增 `MESSAGE_RECEIVED` 监听器，在消息保存到 chat 时立即清洗协议块
  - 保留 `GENERATION_ENDED` 中的 MVU 解析和防御性二次清洗
  - 解决了界面显示已清洗但内存仍含协议块的问题

### 技术细节
- CDN ref: `@1861e16`
- Cache version: `phase164-4-0-final-baseline-6-28-p5-4-hotfix13`
- 修改文件: `src/神秘复苏模拟器/脚本/hotfix-generation-ended-listeners/index.ts`

### 验证结果
- ✅ 界面显示无协议块泄漏
- ✅ 数据库 11/14 张表成功写入（78.6%）
- ⚠️ 3 张表损坏（灵异物品、收录规律、事件纪要）为已知问题

---

## [v6.28.2] - 2026-06-22

### 修复
- **固定状态栏初始化失败**
  - 移除 jQuery `$(callback)` ready 回调封装
  - 改为脚本加载时立即执行 `retryMount()`
  - 解决动态加载脚本时页面已 ready 导致回调不触发的问题

### 问题背景
- Console 重复警告 `[MFRS Fixed Status] 找不到输入区容器，稍后重试`（15+ 次）
- 状态栏 DOM 结构正确但未实际渲染

### 技术细节
- CDN ref: `@d4b1d23`
- Cache version: `phase164-4-0-final-baseline-6-28-p5-4-hotfix13`
- 修改文件: `src/神秘复苏模拟器/脚本/固定状态栏/index.ts`

---

## [v6.28.1] - 2026-06-22

### 修复
- **放宽事件纪要 CHECK 约束**
  - `chronicle_text` 字段最小长度从 200 字放宽到 20 字
  - 解决 AI 输出过短文本时 SQLite 拒绝写入的问题

### 问题背景
- Console 警告：`表 sheet_chronicle (事件纪要) 第 1 行 chronicle.chronicle_text 长度无效（当前 6 字，要求 200-600 字）`
- AI 可能输出简短的代号或编号（如 "A-001"），不符合原 200 字要求

### 技术细节
- CDN ref: `@f3b60c9`
- Cache version: `phase164-4-0-final-baseline-6-28-p5-4-hotfix13`
- 修改文件: `vendor/shujuku-sp-fork/index.js`（DDL 定义）

---

## [v6.28.0 系列] - 2026-06 P5 线

### 核心修复：hotfix-generation-ended 监听器补丁

#### 问题背景
- MagVarUpdate bundle 和数据库自动更新逻辑未注册 `GENERATION_ENDED` 监听器
- AI 生成完成后 MVU 未消费 `<UpdateVariable>` 块
- 数据库未自动填表

#### 修复方案
1. 监听 `GENERATION_ENDED` 事件
2. 触发 MVU 解析当前消息的 `<UpdateVariable>` 块
3. 触发数据库自动更新逻辑
4. 清洗 mes 字段，移除 `<UpdateVariable>` 和 `<choices>` 块

#### 技术细节
- 新增文件: `src/神秘复苏模拟器/脚本/hotfix-generation-ended-listeners/index.ts`
- 注册双路径监听器：
  - `eventSource.on('GENERATION_ENDED', handleGenerationEnded)`
  - `hostWindow.eventOn(tavern_events.GENERATION_ENDED, handleGenerationEnded)`
- 等待依赖初始化：最多 30 次 × 500ms = 15 秒

---

## [v0.0.235] - release-chronicle-guard

### 新增功能：事件纪要追加式守卫

#### 保护规则
- ❌ 禁止 DELETE 已有纪要行
- ❌ 禁止改写已有行的 `code_index`
- ✅ 允许 INSERT 新行
- ✅ 允许 UPDATE 已有行的其他字段（title、chronicle_text、remarks）

#### 技术架构
- **CRUD Plan 层**：`table-change-adapter.ts` 的 `validateChronicleAppendOnly()`
- **SQL 层**：`vendor/shujuku-sp-fork/index.js` 的 `validateChronicleAppendOnlyInMutationStatements_ACU()`
- **双路径保护**：即使 CRUD Plan 被绕过，SQL 层仍会拦截

#### 测试覆盖
- ✅ 回归测试：`scripts/verify-table-change-adapter.mjs`
- ✅ SQL 调试回归：`scripts/verify-sql-debug-regressions.mjs`
- ✅ Player state scope 隔离回归

#### 技术细节
- PR: #15 `chronicle-append-guard`
- Merge commit: `dbcbdd9`
- Tag: `v0.0.235`
- Bot bundle: `8fdcc4a`
- CDN ref: `@8fdcc4a`
- Cache version: `phase164`
- Marker: `mfrs-4-0-final-baseline-6-28-p5-4-hotfix13`

---

## [v0.0.234] - b-sql-regr-fix

### 修复：SQL 回归测试失效断言

#### 问题背景
- hotfix13 的 `9954c98` 移除了 p5.4 fallback 机制
- 但 `testCrudPlanDiffTrackingGuards` 中仍有 23 处断言依赖该机制
- 导致回归测试失败

#### 修复内容
- 删除 23 处失效断言
- 保留 7 处仍有效的断言
- 对齐旧名到 vendor 现名

#### 技术细节
- PR: #14
- Merge commit: `8fdcc4a`
- Bot bundle tag: `v0.0.234`
- 修改文件: `scripts/verify-sql-debug-regressions.mjs`（1 文件 +5/-102）

---

## [v0.0.233] - chronicle 守卫 source 提交

### 技术细节
- Bot bundle commit: `aff097f`
- Tag: `v0.0.233`
- 基于 PR #13 的 source 提交
- Dist 由 bot 自动重建

---

## 历史版本（6.3 - 6.27）

详细链路保留在 `findings.md` 的版本变更保留表和历史归档中。

### 主要修复
- Task 20 协议块泄漏修复
- 开局表单锁定修复
- 事件纪要落库收口
- SQL 兜底限流
- SQL 参数/边界/约束修复
- R2SQL（规律到 SQL）转换优化

### Phase 标记
- `phase115` - `phase164`：多个迭代版本
- 最终稳定在 `phase164-4-0-final-baseline-6-28-p5-4-hotfix13`

---

## 已知问题

### 数据库相关
1. **3 张表初始化损坏**（长期）
   - 灵异物品、收录规律：vendor 初始化 bug，表头被截断为 `["row_id"]`
   - 影响：可选功能不可用，但不影响核心游玩流程
   - 状态：已记录为长期任务（task_plan.md 任务 E）

2. **事件纪要 CHECK 约束过严**（已在 v6.28.1 修复）
   - ~~原约束：200-600 字~~
   - 新约束：20-600 字
   - AI 可能输出简短代号（如 "A-001"）现已支持

### 固定状态栏
- **初始化失败**（已在 v6.28.2 修复）
  - ~~动态加载脚本时 jQuery ready 回调不触发~~
  - 改为立即执行初始化

### 协议块清洗
- **内存与界面不同步**（已在 v6.28.3 修复）
  - ~~界面美化脚本只隐藏 DOM，未写回内存~~
  - 新增 MESSAGE_RECEIVED 监听器立即清洗

---

## 升级指南

### 从 v6.27 或更早版本升级到 v6.28.3

1. **下载最新角色卡**
   - 从 `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png` 获取最新版本

2. **重新导入角色卡**
   - ⚠️ **不要**直接覆盖 `E:/SillyTavern/data/banyan/characters/*.png`
   - ✅ **必须**通过 SillyTavern UI 正式导入
   - 原因：文件级覆盖会导致角色索引、聊天绑定或 runtime 识别异常

3. **验证升级成功**
   - 打开 Console（F12）
   - 查找日志：`[Hotfix] 已注册 MESSAGE_RECEIVED 监听器`
   - 查找日志：`[Hotfix] 已注册 GENERATION_ENDED 监听器`
   - 确认资源加载：`@1861e16`

4. **清理旧数据（可选）**
   - 如果遇到数据库异常，可在 `SP·数据库 III` 中重置模板

### 从 v6.28.0 系列升级到 v6.28.3

小版本升级，直接重新导入角色卡即可。

---

## 技术栈版本

- **前端框架**: Vue 3.5.33
- **TypeScript**: 6.0.0-dev
- **构建工具**: Webpack 5, pnpm
- **数据库**: shujuku-sp-fork (SQLite)
- **CDN**: jsdelivr (testingcf 镜像)
- **CI/CD**: GitHub Actions

---

## 贡献者

感谢所有为本项目做出贡献的开发者！

- 主要开发: linlangliehu
- 数据库引擎: shujuku-sp-fork
- 基础模板: StageDog/tavern_helper_template

---

## 反馈与支持

- **Bug 报告**: 请在 GitHub Issues 提交，附上复现步骤和 Console 日志
- **功能建议**: 欢迎提交 Issue 讨论
- **技术支持**: 参考 `PROJECT_FLOW.md` 和 `4.0功能基线回归清单.md`

---

## 许可证

[Aladdin License](LICENSE)
