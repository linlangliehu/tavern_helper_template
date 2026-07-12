# 发布记录 · 神秘复苏模拟器 8.12.3

**时间**：2026-07-12  
**主题**：修复沉浸内酒馆菜单打开配置“无反应”

## 根因

ST 抽屉挂在 `#top-settings-holder`（z≈3005）下，全屏壳 z=10000 盖住打开的抽屉，点击菜单后实际已 open，但看不见。

## 修复

- 打开配置时抬高 `#top-settings-holder` / `#top-bar` 整棵堆叠上下文到壳之上  
- 打开的 drawer `z-index` 再抬一层  
- 先应用叠层样式再 click ST 图标  

## CDN

- 资源 `5b22070bc6dc6b77d1a6180aaac5c5b1e50003be`
- cache `phase168-4-0-final-baseline-6-28-p5-4-hotfix14-mvu-v8123-st-zfix`
- 版本 **8.12.3**

## 校验

```
verify-mfrs-release-png 8.12.3 / 5b22070 / cache PASS (regex=33, scripts=8)
```

## 用户注意

- 需**重新导入** 8.12.3 发布版 PNG。  
