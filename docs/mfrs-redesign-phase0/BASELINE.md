# Phase 0 · 基线冻结（T0.1）

**冻结时间**：2026-07-12  
**方案**：神秘复苏 · 对照参考图改造方案（第三版）  
**本阶段不改代码**，只冻结可回滚基线。

---

## 1. 版本与发布指针

| 项 | 值 |
|----|-----|
| 发布版角色卡版本 | `8.10.0`（`src/神秘复苏模拟器发布版/index.yaml`） |
| 开发版 `index.yaml` 版本字段 | `2.0`（历史字段；发版以 `publish-card.mjs` 的 `releaseVersion` 为准） |
| 资源提交（CDN_REF） | `a37fe0b` — `feat(mfrs): v8.10.0 motion boost on ghost-seal archive UI` |
| 发布提交 | `ef6cab3` — `chore(release): publish mfrs v8.10.0 motion-boost UI` |
| 当前本地 HEAD | `ef6cab3` |
| origin/main | `8b90b20` bot bundle（本地 behind 1；**不为本改造阻塞**） |
| CDN | `https://testingcf.jsdelivr.net/gh/linlangliehu/tavern_helper_template@a37fe0b/` |
| Cache version | `phase164-4-0-final-baseline-6-28-p5-4-hotfix14-mvu-v8100-motion` |
| `publish-card.mjs` | `CDN_REF=a37fe0b` / `releaseVersion: '8.10.0'` |

### 实机 CDN 抽样（2026-07-12，卡：神秘复苏模拟器发布版）

```
@ a37fe0b / dist/.../数据库前端/index.js?v=...-mvu-v8100-motion
@ a37fe0b / dist/.../数据库/index.js?v=...-mvu-v8100-motion
```

---

## 2. Git 工作树状态（冻结时）

```
## main...origin/main [behind 1]
 M progress.md
 M task_plan.md
?? .tmp-research/
?? 2026-03-21_164737.png
?? docs/mfrs-redesign-phase0/   # Phase0 新增
```

说明：规划文件脏状态与发布正确性无关；Phase0 文档为新增，**未改业务源码**。

---

## 3. 表现层源文件指纹（SHA256 前 16 位 + 体积）

| Hash16 | Size | Lines | Path |
|--------|------|-------|------|
| `870aa0d7dc9b7645` | 57151B | 1709 | `src/神秘复苏模拟器/脚本/消息内面板/index.ts` |
| `8d1da84ebab31c66` | 73455B | 1844 | `src/神秘复苏模拟器/脚本/界面美化/index.ts` |
| `348a16dc165f1ea3` | 8429B | 259 | `src/神秘复苏模拟器/脚本/固定状态栏/index.ts` |
| `a5e4c9d8561345ef` | 512584B | 8549 | `src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js` |
| `d1f809f35932c4a4` | 33882B | 911 | `src/神秘复苏模拟器/脚本/数据库前端/index.ts` |
| `f047312a2d592556` | 4969B | 201 | `src/神秘复苏模拟器/界面/状态栏/global.css` |
| `9e7f78b40a1d2fca` | 107885B | 3146 | `src/神秘复苏模拟器/界面/状态栏/App.vue` |
| `245482bbb8211c53` | 9192B | 219 | `scripts/publish-card.mjs` |

回滚：以 `a37fe0b` / `ef6cab3` 为发布正确性锚点；表现层改动可对照上表 hash。

---

## 4. 源码现状标记（改造前）

消息内面板中 **存在**（Phase1 将移除/替换）：

- `.mfrs-msg-brand-eye`
- `.mfrs-msg-brand-seal`
- 文案「鬼眼封案」
- 文案 `SUPERNATURAL ARCHIVE`
- Tab：`生存状态` / `现场关系`
- 行动按钮：`.mfrs-msg-action-btn`

固定状态栏中 **存在**（Phase3 只换皮，挂载保留）：

- `#mfrs-fixed-status-host`
- `#mfrs-fixed-dashboard-slot` order **10**
- `#mfrs-fixed-frontend-slot` order **20**
- `insertBefore(#send_form / #form_sheld)`

---

## 5. 实机 DOM 基线（卡：神秘复苏模拟器发布版）

| 检查项 | 结果 |
|--------|------|
| `#mfrs-fixed-status-host` | 存在 |
| host 在 send_form 之前 | true |
| dashboard slot order | `10`，非空，含 `.acu-embedded-dashboard-container` |
| frontend slot order | `20`，非空，含 `.acu-wrapper` |
| `.mfrs-msg-brand` 数量 | 3（AI 楼） |
| `.mfrs-msg-brand-eye` / `seal` | 3 / 3 |
| `.mfrs-msg-panel` | 3 |
| 用户消息注入 mfrs UI | **false**（通过） |
| Tab 文案 | 生存状态 / 现场关系 |
| 行动按钮 min-height | `44px` |
| Tab min-height | `44px` |
| 历史楼 brand 动效 | `animationPlayState: paused` |
| 最新楼 brand 动效 | `animationPlayState: running` |
| 正文含「鬼眼封案」 | true |
| 正文含 `SUPERNATURAL ARCHIVE` | true |
| 最新面板风险 class 抽样 | `mfrs-msg-panel is-mid-risk`（高危楼存在 blood 层相关 class 检测 true） |

Brand aria 抽样：

1. 档案 0 · 开局接入 · 位置未知  
2. 档案 2 · 阶段0 · 七中走廊  
3. 档案 4 · 阶段0 · 危害「疑似A级或以上」

---

## 6. 脚本库（8）与正则（33）

脚本顺序（不可改加载序）：

1. mvu  
2. hotfix-generation-ended-listeners  
3. 变量结构  
4. 界面美化  
5. 固定状态栏  
6. spv3.9.5·数据库  
7. 神秘复苏数据库前端  
8. 消息内面板  

正则完整名单见 `_regex_names.txt`（33 条）。**Phase 1–4 默认零改动。**

---

## 7. 基线截图

目录：`docs/mfrs-redesign-phase0/baseline-screenshots/`

| 文件 | 内容 |
|------|------|
| `01-full-chat-viewport.png` | 聊天视口：叙事 + 面板 + 输入区上方档案柜 |
| `02-latest-ai-panel.png` | 最新 AI「生存状态」tab 区域 |
| `03-fixed-frontend-archive.png` | 输入框上方「档案柜」固定前端 |
| `04-history-brand.png` | 历史/开场 brand「鬼眼封案」结构 |
| `05-user-message-no-mfrs.png` | 用户消息（无 mfrs 注入对照） |

参考设计图（仓库根，未纳入发版）：`2026-03-21_164737.png`

---

## 8. 回滚策略

| 场景 | 动作 |
|------|------|
| 表现层改坏、未发版 | `git checkout --` 白名单文件至 `ef6cab3`/`a37fe0b` 对应内容 |
| 已本地 build | 以 `a37fe0b` dist 为准重建或丢弃本地 dist |
| 误改正则/世界书/SQL | **立即还原**；属契约破坏，不进本改造 |
| 发版后回滚 | 将 `CDN_REF` 指回 `a37fe0b`，`releaseVersion` 回 `8.10.0` 再 publish（需用户批准） |
