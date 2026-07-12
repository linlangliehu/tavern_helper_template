# 神秘复苏模拟器 8.13.11

**日期**：2026-07-12  
**主题**：补种缺失 MVU 路径，修复 `行动建议` / `最近行动判定` MagVar 静默丢写

## 问题

AI 已在 `<UpdateVariable>/<JSONPatch>` 写出 `/行动建议`、`/最近行动判定`，但 `stat_data` 常缺这两个键。  
MagVar 的 `replace`→`set` 要求路径已存在，缺键时静默 skip，MVU 长期为 `[]` 或无字段。

## 修复

- **hotfix**：`parseMessage` 前 `seedMissingStatPaths` 补种  
  - `行动建议: []`  
  - `最近行动判定: {类型:未判定, …schema 默认}`  
  旧档无需重开局即可在下一轮 GENERATION_ENDED 写回。
- **initvar**：新开局种子写入同名字段，避免首局即缺路径。
- 门禁：`verify-mfrs-mvu-hotfix-regressions` 断言 hotfix 补种 + initvar 种子。

## 发布

| 项 | 值 |
|----|-----|
| 版本 | **8.13.11** |
| 功能/dist commit | `55fbd271c84d` |
| CDN_REF | `55fbd271c84d…` |
| cache | `…-v81311-seed-action-paths` |

## 使用

**请重导 8.13.11**。  
- 旧档：重进对话或再跑一轮 AI，看控制台 `[Hotfix] 已补种缺失 MVU 路径`，随后 `stat_data.行动建议` 应能落库。  
- 新局：开局即有空数组/默认判定对象路径。  
- 8.13.10 的 UpdateVariable HUD 回退仍保留作显示兜底。
