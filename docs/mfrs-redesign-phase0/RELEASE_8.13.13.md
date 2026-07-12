# 神秘复苏模拟器 8.13.13

**日期**：2026-07-12  
**主题**：生成结束后始终解锁发送（修「能看见发送但点不动」）

## 问题

实机：`#send_but` 可见且未 disabled，但点击无响应。  
根因是 ST `userInputGenerateMutex` 未在假流式结束后清掉；8.13.12 只在**空回复**时 `activateSendButtons`，有正文时仍会卡死。

## 修复

- `forceRecoverSendUi`：每次 `GENERATION_ENDED` / `GENERATION_STOPPED` 都调用 `activateSendButtons`
- 必要时隐藏残留「停止」钮，并兜底恢复 `#send_but` display
- 空回复仍保留 toast 提示

## 发布

| 项 | 值 |
|----|-----|
| 版本 | **8.13.13** |
| 功能/dist commit | `28777ad3f5fe` |
| CDN_REF | `28777ad3f5fe…` |
| cache | `…-v81313-always-unlock-send` |

## 使用

**请重导 8.13.13**。若当前会话仍卡住，可先点一次「停止」或刷新页面后再发。
