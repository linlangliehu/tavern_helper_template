# 神秘复苏模拟器 8.13.17

**日期**：2026-07-13  
**主题**：H9 废弃旧打包 JSON + L1 MagVar/mvu_zod 上游 pin

## 变更

- **H9**：`神秘复苏模拟器.json` → `神秘复苏模拟器.json.deprecated-2026-06-03`；新增 `DO_NOT_IMPORT_PACK_JSON.md`
- **L1**：MagVar `MagicalAstrogy/MagVarUpdate@0.171.0`；mvu_zod `StageDog/tavern_resource@0.3.446`
- `publish-card` 强制 MagVar 上游 pin + 项目 cache；`verify-mfrs-release-png` 校验 pin
- 开发源 `index.yaml` 与发布同 pin

## 发布

| 项 | 值 |
|----|-----|
| 版本 | **8.13.17** |
| dist / CDN_REF | `21fecba509815` |
| cache | `…-v81317-h9-l1-pins` |

## 使用

**请重导 8.13.17**。勿再导入 deprecated 打包 JSON。
