# 神秘复苏模拟器 8.13.7

**日期**：2026-07-12  
**主题**：本轮选项去重——只保留输入框上方 HUD 一份 A–D

## 问题

同一轮 A–D 同时出现在：
1. 正文摘要下 inline（`.mfrs-msg-inline-choices`）
2. 输入框上方 HUD（`.mfrs-hud-actions`）
3. （已隐藏）三栏拟办块

重导角色卡后仍双份，因 CDN 仍指向旧逻辑。

## 修复

- 正文不再注入 inline「本轮选项」；`stripInlineChoicesFromMessage` 清掉残留
- HUD 为**唯一入口**：默认展开，`refreshHudPanels` 写入 `buildActionsHtml`
- 沉浸态 CSS 强制隐藏正文 inline / 三栏拟办块
- phase5 门禁同步为「HUD 填槽 + strip 正文」

## 发布

| 项 | 值 |
|----|-----|
| 版本 | **8.13.7** |
| 功能/dist commit | （见 `publish-card.mjs` `CDN_REF`） |
| cache | `…-v8137-choices-hud-only` |

## 使用

**请重导 8.13.7**。沉浸正文中不应再出现「本轮选项」；A–D 只在输入框上方。
