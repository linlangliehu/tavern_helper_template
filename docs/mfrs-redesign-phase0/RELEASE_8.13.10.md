# 神秘复苏模拟器 8.13.10

**日期**：2026-07-12  
**主题**：MVU 未落库时从 UpdateVariable 回退解析本轮选项

## 问题

第二轮 AI 已在隐藏 `<UpdateVariable>/<JSONPatch>` 写出 A–D，但 `stat_data.行动建议=[]`。  
8.13.8 起 HUD 只认真实数据，导致输入框上方选项栏整栏隐藏。

## 修复

- `collectRealActionSuggestions` 顺序：MVU → 数据库表 → **最新 AI 楼原文 UpdateVariable 回退**
- `getLatestAiMessageRawText` 优先 `getChatMessages` 原始 mes（含被正则隐藏块）
- `parseActionSuggestionsFromMessageText` 解析 JSONPatch `/行动建议` 与宽松 `{"选项","思路"}`
- 仍无数据时整栏隐藏；**不写库**、不恢复开局硬编码占位

## 发布

| 项 | 值 |
|----|-----|
| 版本 | **8.13.10** |
| 功能/dist commit | （见 `publish-card.mjs` `CDN_REF`） |
| cache | `…-v81310-actions-updatevar-fallback` |

## 使用

**请重导 8.13.10**。AI 写出行动建议后，即使 MVU 未写回，输入框上方也应出现 A–D。
