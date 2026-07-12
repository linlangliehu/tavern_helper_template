# 神秘复苏模拟器 8.13.12

**日期**：2026-07-12  
**主题**：P2 A/B/C — 状态栏 MVU 回写、空回复恢复发送、CRUD 杂音降噪

## 修复

### A. 状态栏解析成功后回写 MVU `行动建议`
- `App.vue`：`mirrorActionSuggestionsToMvu`（签名去重 + schema 形态）
- 与既有 DB 镜像并行，不替代 hotfix `parseMessage`

### B. 假流式空回复 / 发送卡住
- hotfix：`recoverSendUiAfterEmptyGeneration` → `activateSendButtons` + toast
- 监听 `GENERATION_ENDED` / `GENERATION_STOPPED`
- **不**自动删空楼

### C. 数据库 CRUD 控制台杂音
- `table-change-adapter`：线索列别名（`inference` → `推断` 等）
- vendor：`saveChat` / `getCurrentCharPrimaryLorebook` **warn-once**
- 成功空表兜底日志 **warn → debug**

## 发布

| 项 | 值 |
|----|-----|
| 版本 | **8.13.12** |
| 功能/dist commit | `75f74f42706f` |
| CDN_REF | `75f74f42706f…` |
| cache | `…-v81312-p2-mvu-empty-send-crud` |

## 使用

**请重导 8.13.12**。空 AI 楼应 toast 并恢复发送；线索 `inference` 写入不再 COLUMN_NOT_FOUND。
