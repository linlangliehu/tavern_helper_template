# Phase 2 完成记录

**时间**：2026-07-12  
**范围**：消息内三栏壳（路径 α）  
**主文件**：`src/神秘复苏模拟器/脚本/消息内面板/index.ts`

## 布局

| 区域 | 内容 |
|------|------|
| 左栏 | 现场档案：身份 / 风险 / 事件 / 厉鬼 / 资源（`<details>` 折叠） |
| 中栏 | 公文顶条 + 叙事正文 + **拟办意见** A–D（只填不发） |
| 右栏 | 导航：正文 / 档案 / 关系 / 柜 / 设置(灰) |

- **仅 `last_mes` AI 楼**使用 `mfrs-msg-tri` 全三栏  
- **历史楼**保持线性 stack 面板（tab：生存状态 / 现场关系）+ 拟办意见文案  
- 关系：右栏「关系」或 tab 切换中栏关系视图  
- 柜：滚动并高亮 `#mfrs-fixed-status-host` / frontend 槽  

## 契约未改

- MVU 字段路径、行动只填不发、用户消息不注入  
- 固定 host order 10/20  
- 正则 / 世界书 / SQL  

## 验收

```
verify-mfrs-archive-ui-regressions --stage phase5  PASS
verify-mfrs-mvu-hotfix-regressions                 PASS
verify-mfrs-database-frontend-p3                   PASS
pnpm build                                         PASS
```

dist 抽样含：`mfrs-msg-tri`、`现场档案`、`拟办意见`、`mfrs-msg-fold`、`data-nav`；无 eye/seal。

## 实机

CDN 仍为 `@a37fe0b` 时看不到 Phase2；本地 `5500/dist` 或后续 publish 后可见。

## 下一步

**Phase 3**：固定数据库前端 / 档案柜换皮对齐（aurora → 卷宗线框）。
