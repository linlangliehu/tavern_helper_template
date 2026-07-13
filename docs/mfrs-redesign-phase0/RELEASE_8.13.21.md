# 神秘复苏模拟器 8.13.21

**日期**：2026-07-13  
**主题**：BF5 回归门禁 G2–G5 + DM8 + 文案快修

## 变更

- **G2**：`verify-mfrs-initvar-schema`（initvar↔schema 36 根键/层级/C1）
- **G3**：`verify-mfrs-regex-ids`（33 条 id 唯一 + 可编译）
- **G4**：`mfrs-release-constants` 单真源；release-png `--from-publish-card`
- **G5**：清洗样例（中英混排/长英文/双 UV/警告长正文/未闭合 sp_）
- **DM8**：adapter 三表 + 禁删/枚举/混合拒绝/真模板 chronicle
- **WM1/WM2/L8**：偏移 0–5、交叉引用、示例类型与摘要

## 发布

| 项 | 值 |
|----|-----|
| 版本 | **8.13.21** |
| dist / CDN_REF | `f2b7db2cab55` |
| cache | `…-v81321-bf5-gates` |

## 使用

**请重导 8.13.21**。运行门禁：`pnpm verify:mfrs-gates`。
