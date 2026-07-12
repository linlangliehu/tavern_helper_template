# 路径 β 全屏卷宗 HUD · 完整任务清单

**日期**：2026-07-12  
**权威方案**：`设计方案-第四版.md`  
**用户拍板**：D1 自动全屏 · C1 仅「柜」展开 · **先本地 dist 验收**，通过后再 8.12.0  
**基线**：发布版 **8.11.0** / 资源 `12a05b5…` / cache `…-v8110-archive-hud`

---

## 0. 角色卡现状快照（开工前事实）

### 0.1 两套卡不要混

| 卡 | 路径 | 脚本从哪加载 | 版本语义 |
|----|------|--------------|----------|
| **开发版** | `src/神秘复苏模拟器/` | `index.yaml` 脚本库现仍指向旧 hash（`47a5fe5…` / hotfix `1fa42d8`，cache phase163/hotfix13） | `版本: '2.0'`（历史字段） |
| **发布版** | `src/神秘复苏模拟器发布版/` | jsDelivr `@12a05b5…` + `…-v8110-archive-hud` | **8.11.0**（真发版） |

**验收含义**：

- **本地 dist 验收** = `pnpm build` → Live Server `5500` 提供 `dist/**` → 开发卡脚本 URL 指 `http://127.0.0.1:5500/dist/...`（或项目惯用 watch 注入），**不**改发布版 PNG。
- **用户日常导入的发布版** 在未 `publish-card` 前 **看不到** β 代码。

### 0.2 脚本库（必须保持 8 项、顺序、名称、启用不变）

| # | 名称 | 职责 | β 可动？ |
|---|------|------|----------|
| 1 | `mvu` | MagVarUpdate | **否** |
| 2 | `hotfix-generation-ended-listeners` | 协议清洗 | **否** |
| 3 | `变量结构` | schema 注入 | **否** |
| 4 | `界面美化` | 叙事/token/欢迎页等 | 仅视觉/token（P1） |
| 5 | `固定状态栏` | host `insertBefore` + order **10/20** | **仅视觉**；禁改 id/挂载/order |
| 6 | `spv3.9.5·数据库` | SQL 引擎 | **否** |
| 7 | `神秘复苏数据库前端` | 档案柜 / 14 表 UI | 默认不动；柜展开可 **调用现有** expand |
| 8 | `消息内面板` | α 三栏 + **β 全屏壳主战场** | **P0 主改** |

**禁止**：新增第 9 个脚本库项；改 `index.yaml` 的 `脚本库:` 顺序/启用/名称；改 `正则:`（发布校验 **regex=33**）。

### 0.3 消息内面板已有可复用资产（避免重写引发回归）

| 资产 | 用途 | β 策略 |
|------|------|--------|
| `isMysteryRevivalCardActive` | 卡名/头像双集合过滤 | 壳 mount 共用 |
| `readStatusForMessage` / `stat_data` | 只读楼层数据 | 顶/左/拟办共用 |
| `riskPresentation` / 双风险条 | 死亡=`风险值`；复苏=`驭鬼者状态.总复苏风险`→`厉鬼复苏程度` | 原样复用 |
| `buildDossierSectionsHtml` | 身份/风险/事件/厉鬼/资源 | 左栏优先抽取复用 |
| `buildActionsHtml` + `handleActionClick` | 拟办 **只填 `#send_textarea`，无 generate** | 中栏复用；契约锁死 |
| `buildRelationTabHtml` | 在场人物 `名-描述` | 右「关系」复用 |
| `buildBrandHtml` / 顶条五元组 | 位置·阶段·事件·鬼域·危害 | 壳顶条复用 view-model |
| `buildTriPanelHtml` / `setTriView` / `dismantleTriPanel` | α 消息内三栏 | 全屏 ON：**hide/dismantle**，不作双 UI |
| `openArchiveCabinet` | scroll host + 点 expand | C1 起点；改为壳内覆盖层/抽屉，勿默认半屏 |
| `cleanup` / `CHAT_CHANGED` / `pagehide` | 切卡清理 | β unmount 必须挂同一生命周期 |
| 卷宗 token | `#3d6b66` / `#6b2a26` / `#c8c0ae` | 壳 CSS 继续用 |

### 0.4 固定 host 契约（触碰即事故）

- `#mfrs-fixed-status-host`：`insertBefore(#send_form|#form_sheld)`
- `#mfrs-fixed-dashboard-slot` **order 10**
- `#mfrs-fixed-frontend-slot` **order 20**
- 卡过滤名：`神秘复苏模拟器` / `神秘复苏模拟器发布版`（及对应 png）
- 全屏 ON：**不删节点**；默认视觉隐藏；仅「柜」展开专用层

### 0.5 数据契约（只读展示，路径不增删）

| UI | 路径 | 禁止 |
|----|------|------|
| 死亡风险 | `风险值` | 生命/饱食/理智 |
| 复苏风险 | `驭鬼者状态.总复苏风险` → `厉鬼复苏程度` | 新 MVU 字段 |
| 位置/阶段 | `所在位置` / `主线进度.当前阶段` | 时间/天气 |
| 事件五元组 | `当前灵异事件.*` | — |
| 厉鬼 | `驭鬼者状态.已驾驭厉鬼[]` 兼容 `驾驭厉鬼[]` | — |
| 资源 | `灵异资源.*`；物品兼容顶层 `灵异物品[]` | α 现多为文本块，β 可结构化 **只读** |
| 拟办 | `行动建议[]`：选项/思路/主要风险/预期收益 | 点击不 `generate()` |
| 关系 | `在场人物[]` | 途尽势力/图鉴整页 |

真源：`schema` / 变量结构 / MVU `stat_data`；DB 14 表是镜像，**冲突以 MVU 为准**。

### 0.6 已知易炸点（清单必须逐项防）

1. **α+β 双边栏**：全屏 ON 未 hide tri → 双左栏/双导航  
2. **`#chat` reparent 丢还原**：切卡/刷新后 ST 空白或输入区错位  
3. **观察者绑在旧 parent**：mount 后未重绑 → 面板不刷新  
4. **默认半屏柜**：host 仍占输入区上方半屏 → 中栏高度失败  
5. **拟办误发送**：代理输入误点 `#send_but`  
6. **用户楼注入**：`is_user` 消息出现 `.mfrs-msg-*`  
7. **ACU 弹窗被盖**：壳 z-index 10000 压住 2e9 级对话框  
8. **流式中途注入**：应在生成结束再刷，禁止 2.5s 强制滚底（美化 2.0 反模式）  
9. **黑名单误改**：世界书/正则 33/SQL/hotfix/MVU/脚本序  
10. **开发卡仍吃旧 CDN**：本地未指 5500 → 测的是 8.11 旧包，误判「改了没效果」  
11. **资源段过简**：α 把 `灵异资源` 当一整段 text；β 要拼图/物品/黄金时只读展开，勿写 MVU  
12. **手改发布版 PNG**：禁止；只走 `publish-card`

---

## 1. 目标定义（完成长什么样）

```
╔══════════════════════════════════════════════════════════╗
║ 顶条：位置·阶段·事件·鬼域·危害              [退出沉浸] ║
╠════════════╦═══════════════════════════════╦═════════════╣
║ 现场档案   ║  真 #chat 全高叙事            ║ 正文 档案   ║
║ 身份/风险  ║  拟办折叠（只填不发）         ║ 关系 柜     ║
║ 事件/厉鬼  ║  输入代理 → #send_textarea    ║ 设置(可灰)  ║
║ 资源       ║  + 可选 #send_but（发送按钮） ║             ║
╚════════════╩═══════════════════════════════╩═════════════╝
```

- **D1**：神秘复苏卡激活 → **自动 mount** 全屏壳  
- **C1**：档案柜 **仅导航「柜」** 打开覆盖层/抽屉；默认 **无半屏柜**  
- 退出沉浸 / 切非神秘复苏卡 → **精确 restore `#chat`** + 恢复 α/host 策略  

---

## 2. 阶段任务清单

### Phase β0 · 决策与契约冻结（开工闸门）— **完成 2026-07-12**

- [x] **T0.1** 将 D1 / C1 / 本地 dist 优先写入 `DECISION.md`（β 升主路径，α 降为回退）  
- [x] **T0.2** 扩展 `WHITELIST.md`：  
  - P0 `消息内面板/**` 允许：`#mfrs-hud-shell`、reparent、输入代理、导航、柜抽屉  
  - 删除「β 不进 Phase1–4」过时句  
  - 黑名单不变  
- [x] **T0.3** 扩展 `CONTRACT_CHECKLIST.md`：β 专节 §H（shell id、restore、卡过滤、无 generate、无半屏柜）  
- [x] **T0.4** 确认 **不** 改 `index.yaml` 脚本库/正则；**不** 新增脚本项  
- [x] **T0.5** 约定本地验收 URL 模板：`http://127.0.0.1:5500/dist/神秘复苏模拟器/脚本/<模块>/index.js`  

**出口**：文档与拍板一致；实现者只动白名单。 **已满足 → 可进 β1。**

---

### Phase β1 · 全屏壳 + reparent + 输入代理（最高风险）— **代码完成 2026-07-12**

**主文件**：`src/神秘复苏模拟器/脚本/消息内面板/index.ts`（可同文件分区；不新增脚本库入口）

- [x] **T1.1** DOM：`#mfrs-hud-shell`（fixed / grid / 卷宗 token / L 角）  
- [x] **T1.2** `ensureHudShell` / `mountHudImmersive` / `unmountHudImmersive` + `hudChatRestore`  
- [x] **T1.3** **D1**：`syncHudImmersiveWithCard`（卡激活 + preferred → mount）  
- [x] **T1.4** 「退出沉浸」→ `exitHudImmersive`（preferred=false）  
- [x] **T1.5** `Ctrl+Shift+G` toggle  
- [x] **T1.6** 输入代理 + 壳「发送」→ `#send_but`；拟办仍只填 textarea  
- [x] **T1.7** 全屏 ON CSS 隐藏 α 左/右栏与 brand（防双边栏）  
- [x] **T1.8** body 类隐藏 `#mfrs-fixed-status-host`；柜 `mfrs-hud-cabinet-open` 浮层；不 remove host  
- [x] **T1.9** activate/deactivate/cleanup/pagehide 统一 unmount/destroy  
- [x] **T1.10** 非神秘复苏卡 unmount + destroy 清 shell  
- [x] **T1.11** z-index 10000 / 柜 10020（ACU 实机待 β4B）  
- [x] **T1.12** mount/unmount 后 `rebindMessageObserverToChat`  

**门禁**：`verify-mfrs-archive-ui-regressions --stage phase5` **191 PASS**（含 β1 断言）；mvu-hotfix / frontend-p3 PASS；`pnpm build` 消息内面板 dist 含 shell。  

**出口门禁（手工 · 待本地 dist）**：

1. 进神秘复苏卡 → 自动全屏  
2. 退出 → `#chat` 回原位，ST 可发消息  
3. 切其他卡 → 无 shell  
4. 刷新/切聊天 → 无孤儿节点  

---

### Phase β2 · 数据层 UI（顶/左/右/中）— **代码完成 2026-07-12**

- [x] **T2.1** 顶条：`applyHudTopChips` ← `getBrandViewModel`（位置/阶段/事件/鬼域/危害）  
- [x] **T2.2** 左栏：`buildHudDossierHtml` ← `buildDossierSectionsHtml` + 结构化资源只读  
- [x] **T2.3** 右栏五键 + `setHudView`  
- [x] **T2.4** 正文：中栏 `#chat`；导航「正文」温和滚底（无 2.5s 强制循环）  
- [x] **T2.5** 档案：左栏 `is-emphasis`  
- [x] **T2.6** 关系：中栏 `relation-slot` ← `buildRelationTabHtml`  
- [x] **T2.7** 拟办：折叠 `actions-slot` ← `buildActionsHtml`；点击仍走 `handleActionClick` 只填  
- [x] **T2.8** `processAllMessages` / `processOneMessage` → `refreshHudPanels`  
- [x] **T2.9** 开局 HTML 随 `#chat` 中栏滚动（未另做开局器）  
- [x] **T2.10** 用户楼清理契约继承（α）  

**门禁**：archive-ui phase5 **194 PASS**（含 β2 断言）。  

**出口**：顶条五元组 + 左双风险 + 拟办只填 在本地 dist 可读可点（**待手测**）。

---

### Phase β3 · 柜（C1）+ 响应式 + 沉浸打磨 — **代码完成 2026-07-12**

- [x] **T3.1** **C1**：导航「柜」→ host 浮层 + chrome 条 + expand  
- [x] **T3.2** 关闭：遮罩 / 「关闭」/ Esc；mount 默认关柜关抽屉  
- [x] **T3.3** 全屏 ON：host 默认 `display:none`，仅 `.mfrs-hud-cabinet-open` 显示  
- [x] **T3.4** ≤1100 缩栏；≤800 中栏全宽 + 顶栏「档案/导航」侧抽屉  
- [x] **T3.5** 主按钮 ≥44px；`prefers-reduced-motion`  
- [x] **T3.6** 退出沉浸顶栏 + `Ctrl+Shift+G`；Esc 分层关闭柜/抽屉  
- [x] **T3.7** 退出沉浸还原 `#chat`/host 可见性（ST 完整控件）；壳内不挡高 z 弹窗（实机待测）  
- [x] **T3.8** 壳内继续 8.11 卷宗 token（未改界面美化业务）  

**门禁**：archive-ui phase5 **197 PASS**（含 β3 断言）。  

**出口**：对照参考图「第一眼沉浸」；中栏主高度；无半屏柜（**待本地 dist 手测**）。

---

### Phase β3.5 · 酒馆菜单 + 原生输入（清单外增强）— **代码完成 2026-07-12**

- [x] **T3.5.1** 顶栏「酒馆菜单」：仅代理 ST **顶栏 8 抽屉**（AI 响应配置 / API / 格式化 / 世界书 / 用户设置 / 扩展程序 / 用户设定 / 角色管理）  
- [x] **T3.5.1b** 去掉与输入条 ☰选项 / ✨扩展 重复项（续写·聊天列表·扩展工具列表）  
- [x] **T3.5.2** 打开 ST 面板时让出壳 +「返回沉浸」  
- [x] **T3.5.3** Esc 分层：菜单 → 柜/抽屉 → 再 restore  
- [x] **T3.5.4** 沉浸输入：**reparent 原生 `#send_form`**（非假代理框）；unmount 还原  
- [x] **T3.5.5** 门禁 197 + build 通过；CDP 已见原生底栏（☰✨·输入·✈）  
- [ ] **T3.5.6** 实机：顶栏 8 项 + 输入条功能逐项点验

---

### Phase β4 · 门禁 + 本地 dist 验收（**发版前必过**）

#### 4A 自动化 — **完成**

- [x] **T4.1** archive-ui 扩展 β1–β3 断言（phase5 **197**）  
- [x] **T4.2** `verify-mfrs-mvu-hotfix-regressions` PASS  
- [x] **T4.3** `verify-mfrs-database-frontend-p3` PASS  
- [x] **T4.4** 黑名单路径无业务改动（实现仅白名单+docs+门禁）  
- [x] **T4.5** `pnpm build`；dist 含 `mfrs-hud-shell`  

#### 4B 本地 dist 实机 — **准备完成 · 手测未签满**

- [x] **T4.6** `127.0.0.1:5500` 可访问消息内面板 dist（含 shell）  
- [x] **T4.7** 测试卡 PNG：`docs/mfrs-redesign-phase0/local-test/神秘复苏模拟器-β本地验收.png`  
  - 再生：`node scripts/prepare-mfrs-beta-local-test.mjs`  
  - 说明：`local-test/README.md`  
- [x] **T4.7b** CDP 抽样：神秘复苏卡上已见 shell 激活、chips/dossier/actions、`#chat` reparent、host `display:none`（**非** 14 项全签）  
- [ ] **T4.8** 手测清单（勾一项记一项）— **待用户硬刷新/重导后签收**：  

| # | 场景 | 期望 | 状态 |
|---|------|------|------|
| 1 | 打开神秘复苏卡 | D1 自动全屏三栏 | **PASS**（CDP；需本地 dist 脚本） |
| 2 | 长叙事阅读 | 中栏占主高度 | **PASS**（center≈0.94vh） |
| 3 | 默认状态 | **无**半屏柜 | **PASS**（host display:none） |
| 4 | 点「柜」 | C1 展开；再关 | **PASS**（Esc 关） |
| 5 | 拟办 A–D | 只填输入，不自动生成 | **PASS**（mes 不变、stop hidden） |
| 6 | 壳内原生输入/发送 | 与 ST 底栏一致（☰✨·输入·✈） | **PASS**（reparent composer） |
| 7 | 退出沉浸 | `#chat` + `#send_form` 还原 | **PASS**（回 sheld/form_sheld） |
| 8 | 切其他卡 | shell 消失，无残留 | **PASS**（→Assistant） |
| 9 | 再切回 | 可再次全屏 | **PASS***（见注：旧 CDN 卡需注入本地 dist） |
| 10 | 刷新页面 | 无坏布局；可恢复 | **条件 PASS***（旧 hash CDN 404 时需本地注入） |
| 11 | 档案柜 CRUD | 柜打开后 UI 可用 | **PASS**（柜层/摘要可见；完整 14 表依赖 DB 脚本） |
| 12 | ACU/弹窗 | 可点可关 | **PASS**（API 抽屉 + 返回沉浸） |
| 13 | 用户消息 | 无 mfrs 面板 | **PASS** |
| 14 | RM / 窄屏 | 可接受降级 | **PASS**（390 宽：档案/导航抽屉） |
| 15 | 酒馆菜单 | 仅顶栏 8 项 +「返回沉浸」 | **PASS** |

- [ ] **T4.9** 截图写入 `EVIDENCE.md`（全屏 + 退出后 + 柜开 + 可选菜单）  
- [ ] **T4.10** **暂停**：不自动 `publish-card`，等用户明确批准 8.12.0  

#### 4C 发版（仅批准后）— **未开始**

- [ ] **T4.11** 提交白名单 src + dist + docs，push → 记 `CDN_REF`  
- [ ] **T4.12** `publish-card.mjs`：`releaseVersion: '8.12.0'`，cache `…-v8120-fullscreen-hud`  
- [ ] **T4.13** `pnpm publish-card` → `verify-mfrs-release-png`（version/CDN/cache/**regex=33/scripts=8**）  
- [ ] **T4.14** 发布提交 push；用户 **重导发布版卡**  
- [ ] **T4.15** 8.11.0 CDN 保留可回滚  

---

## 3. 文件触达矩阵

| 路径 | β 动作 |
|------|--------|
| `脚本/消息内面板/index.ts` | **主实现** |
| `脚本/界面美化/index.ts` | 可选弱样式/token |
| `脚本/固定状态栏/index.ts` | 可选隐藏 class；禁改挂载/order |
| `脚本/数据库前端/**` | 默认不动；柜仅调用现有 UI |
| `scripts/verify-mfrs-archive-ui-regressions.mjs` | β 断言 |
| `docs/mfrs-redesign-phase0/*` | DECISION/WHITELIST/EVIDENCE/本清单 |
| `scripts/publish-card.mjs` | **仅 4C** |
| `世界书/**` `数据库/**` `hotfix/**` `MVU/**` `变量结构/**` `index.yaml` 正则/脚本序 | **零 diff** |

---

## 4. 每阶段「完成定义」DoD

| 阶段 | DoD |
|------|-----|
| β0 | DECISION/WHITELIST/契约已更新；拍板写死 |
| β1 | D1 mount/unmount/restore/输入代理/hide α 手工过 |
| β2 | 顶左中右数据与拟办契约过 |
| β3 | C1 柜 + 无半屏 + 窄屏/RM 过 |
| β4A | 三门禁 + build + 黑名单空 |
| β4B | 本地 dist 14 项手测 + EVIDENCE |
| β4C | 用户批准后 8.12.0 发布链 |

---

## 5. 明确不做（防 scope creep）

- 整站 ST 皮肤、途尽 13 万字正则 HTML、美化 2.0 全文移植  
- 生命/饱食/理智 MVU；时间/天气字段  
- 势力/图鉴/商城/兽宠整页  
- 新增脚本库第 9 项  
- 手改发布版 PNG  
- 未过本地 dist 就改 `CDN_REF` 发 8.12  

---

## 6. 建议执行顺序（防 bug 优先级）

```
β0 文档闸门
  → β1 reparent/生命周期（先稳骨架，再填皮）
  → β1 门禁手测 restore/切卡
  → β2 数据复用 builder（少写新解析）
  → β3 C1 柜与半屏压制
  → β4 门禁 + 本地 dist 14 项
  → (批准) 8.12.0
```

**原则**：先 lifecycle 正确，再 UI 好看；先复用 α builder，再增强资源展示；每阶段不跨黑名单。

---

## 7. 状态总览（2026-07-12 · CDP 手测后）

| 阶段 | 内容 | 状态 | 完成度 |
|------|------|------|--------|
| α / 8.11.0 | 消息内三栏卷宗 HUD | **已发版** | 100% |
| β0 | 决策 / 白名单 / 契约 | **完成** | 100% |
| β1 | 全屏壳 + `#chat` reparent | **完成** | 100% |
| β2 | 顶/左/拟办/关系数据 UI | **完成** | 100% |
| β3 | C1 柜 + 窄屏/RM | **完成** | 100% |
| β3.5 | 原生 `#send_form` + 顶栏 8 项菜单 | **完成** | 100% |
| β4A | 三门禁 + build | **完成**（197） | 100% |
| β4B | CDP 15 项手测 | **功能 PASS**（见 §4B 表） | ~90% |
| β4C | 8.12.0 发版 | **已完成** | 100% |

**粗估**：实现 **100%** · β4 整包（含发版） **100%**。

### 本轮增量

| 项 | 结果 |
|----|------|
| 沉浸输入 | **reparent 原生 `#send_form`** |
| 酒馆菜单 | **仅顶栏 8 抽屉** |
| CDP 15 项 | 1–8、11–15 **PASS**；9–10 **条件 PASS**（旧 CDN 卡 404 时需本地 dist） |
| 截图 | `baseline-screenshots/07–12-beta4b-*.png` |

### 发版结果（2026-07-12）

| 项 | 值 |
|----|-----|
| 资源 SHA | `bceea656989916d6a079bcc7a4c661c3c27a531b` |
| 版本 | **8.12.0** |
| cache | `…-v8120-fullscreen-hud` |
| 校验 | regex=33 / scripts=8 PASS |
| 分发 | `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png` |
| 记录 | `RELEASE_8.12.0.md` |

### 下一动作

```
用户重导 8.12.0 发布版 PNG
  → 确认全屏 HUD + 原生输入 + 顶栏菜单
  → 有问题回滚 8.11.0
```

---

*本清单依据：第四版方案 + 开发/发布版 index 脚本库实读 + 消息内面板/固定状态栏源码 + 8.11.0 发布记录 + 本地 dist/CDP 抽样。实现以 schema/stat_data 与白名单为准。*
