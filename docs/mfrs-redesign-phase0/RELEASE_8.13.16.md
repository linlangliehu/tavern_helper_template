# 神秘复苏模拟器 8.13.16

**日期**：2026-07-13  
**主题**：BF0.5 核心镜像交付 + C3 开发源 CDN pin 对齐

## 变更

- **H10/BF0.5**：`数据库前端` 安装 `mvu-core-mirror`，生成结束后镜像 global/player/event/clue/行动建议（App.vue 仍为孤儿、不加载）
- **C3**：开发源 `index.yaml` 脚本 CDN 与 `publish-card` 同 pin `@cebce74` / cache `v81316`
- **C4**：脚本库 loader 用 `url.includes('?') ? '&' : '?'` 拼接 `t=`，避免双 `?`
- MagVar `?v=` 与项目 cache 对齐（内容仍浮动，L1 完整 @commit pin 后续）

## 发布

| 项 | 值 |
|----|-----|
| 版本 | **8.13.16** |
| 功能源 | `9c8c61b`（H10） |
| dist / CDN_REF | `91154c792342`（含 BF0.5 数据库前端 + G1 状态栏 rebuild） |
| cache | `…-v81316-bf05-core-mirror` |

## 使用

**请重导 8.13.16**。开发卡与发布卡应加载同一代 dist；生成结束后 DB 核心表应有自动镜像兜底。
