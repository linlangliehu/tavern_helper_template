# 神秘复苏模拟器 8.13.18

**日期**：2026-07-13  
**主题**：BF2 协议 raw UI + hotfix 发送/seed/掷骰 + 正则误删清理

## 变更

- **C6**：消息面板 / 状态栏优先读 `extra._mfrs_raw_protocol_message`；清洗后 `saveChat`
- **H4–H8**：hotfix 幂等安装/cleanup；发送卡住才 force stop；空生成看 raw；seed 扩数组；`parseStructuredChoices`
- **RH6**：不再 strip `<mfrs_roll/>`，掷骰条可显示
- **R1–R3 / RH2 / RM3–RM6**：英文/外语摘要收窄、禁止裸【选项】、未闭合 thinking 不吞 EOF、思维链新 UUID、UV 懒匹配、关键词/警告 `g`、#9 扩 sp_/mfrs_
- **H6.2**：系统提示强调正文+【本轮摘要】不可省略

## 发布

| 项 | 值 |
|----|-----|
| 版本 | **8.13.18** |
| dist / CDN_REF | `dc27b52fd6aa` |
| cache | `…-v81318-bf2-protocol` |

## 使用

**请重导 8.13.18**。勿导入 deprecated 打包 JSON。
