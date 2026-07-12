# Phase 0 · 基线证据（T0.4）

## 环境

| 项 | 值 |
|----|-----|
| 时间 | 2026-07-12 |
| ST | `http://127.0.0.1:8000/` |
| 角色卡 | **神秘复苏模拟器发布版** |
| 聊天抽样 | 含开局 + 至少 2 轮 AI（七中走廊 / 红鬼烛逼近） |
| 消息规模 | mes≈6（AI 3 / 用户 2） |

## 截图清单

路径：`docs/mfrs-redesign-phase0/baseline-screenshots/`

| # | 文件 | 用途 |
|---|------|------|
| 1 | `01-full-chat-viewport.png` | 全视口：叙事、面板、输入区、档案柜 |
| 2 | `02-latest-ai-panel.png` | 最新 AI「生存状态」tab |
| 3 | `03-fixed-frontend-archive.png` | 固定「档案柜」前端 |
| 4 | `04-history-brand.png` | 开场/历史 brand（鬼眼封案） |
| 5 | `05-user-message-no-mfrs.png` | 用户消息区（应无 mfrs 面板注入） |

## 关键证据（CDP evaluate）

### 固定 host

- host 存在，且位于 `#send_form` 之前  
- dashboard order `10` 非空；frontend order `20` 非空  
- `.acu-embedded-dashboard-container` + `.acu-wrapper` 均在  

### 消息 UI

- brand / eye / seal / panel：各 3（对应 AI 楼）  
- 用户楼：`userHasUi = false`  
- Tab：`生存状态` | `现场关系`  
- action/tab `minHeight = 44px`  
- 历史 eye/seal：`animationPlayState = paused`  
- 最新 eye/seal：`animationPlayState = running`  
- 文案仍含「鬼眼封案」与 `SUPERNATURAL ARCHIVE`  

### CDN

```
...@a37fe0b/dist/.../数据库前端/index.js?v=phase164-...-mvu-v8100-motion
...@a37fe0b/dist/.../数据库/index.js?v=phase164-...-mvu-v8100-motion
```

## 设计参考（非运行基线）

- `2026-03-21_164737.png`（仓库根）：三栏暗色 HUD 目标参考  

## 缺口说明

| 缺口 | 处理 |
|------|------|
| reduced-motion 系统开关截图 | 未强制改 OS 设置；记入 P4 手测 |
| 移动端 ≤768 截图 | Phase2 做响应式时补 |
| 开发版卡实机 | 本基线以**发布版**为准（与 8.10.0 一致） |

## 结论

T0.4 **完成**：具备「改造前」视觉与 DOM 对照物，足够支撑 Phase1 去徽章与后续回归 diff。
