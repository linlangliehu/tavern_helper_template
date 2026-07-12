# 发布记录 · 神秘复苏模拟器 8.12.2

**时间**：2026-07-12  
**主题**：沉浸内叠 ST 配置面板（不退出全屏）

## 提交链

| 角色 | SHA | 说明 |
|------|-----|------|
| 资源 | `5de11629e92da04d8933df9d3e75080078094db3` | 打开酒馆菜单配置时保持沉浸壳，抽屉叠在上方 |
| 发布 | （本提交） | `publish-card` 8.12.2 |

## CDN

- `CDN_REF` = `5de11629e92da04d8933df9d3e75080078094db3`
- `CDN_CACHE_VERSION` = `phase167-4-0-final-baseline-6-28-p5-4-hotfix14-mvu-v8122-st-overlay`
- `releaseVersion` = `8.12.2`

## 行为变化

- 酒馆菜单打开「角色管理 / 世界书 / API…」时：**不再压暗/让出**全屏壳  
- 打开的 ST 抽屉/弹窗 `z-index` 抬到壳之上，在沉浸背景上操作  
- 角标按钮改为「关闭面板」：关抽屉并保持沉浸；Esc 同效  

## 校验

```
verify-mfrs-archive-ui-regressions --stage phase5  PASS
verify-mfrs-release-png 8.12.2 / 5de1162 / cache   PASS (regex=33, scripts=8)
```

## 用户注意

- 需**重新导入** 8.12.2 发布版 PNG。  
