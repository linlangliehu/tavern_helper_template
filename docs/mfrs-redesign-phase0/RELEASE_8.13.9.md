# 神秘复苏模拟器 8.13.9

**日期**：2026-07-12  
**主题**：「关闭面板」真正关掉 SP·数据库 III

## 问题

沉浸态打开 SP·数据库 III 后，HUD「关闭面板」只收回让层（`mfrs-hud-st-ui`），**不**调用 SP 的关闭，界面仍盖住沉浸。

## 修复

- 新增 `closeSpDatabaseUi()`：优先点击 SP「关闭新 UI / 关闭数据库编辑器」
- 失败时对 `.acu-v2-app__shell` 等根壳 `display:none` 兜底
- `restoreHudFromStUi` 先关 SP，再关抽屉、清 lift、移除「关闭面板」按钮

## 发布

| 项 | 值 |
|----|-----|
| 版本 | **8.13.9** |
| 功能/dist commit | `55adbd8f32a2` |
| CDN_REF | `55adbd8f32a2…` |
| cache | `…-v8139-close-sp-panel` |

## 使用

**请重导 8.13.9**。打开 SP 后点「关闭面板」应回到沉浸；也可点 SP 自带「关闭新 UI」或 Esc。
