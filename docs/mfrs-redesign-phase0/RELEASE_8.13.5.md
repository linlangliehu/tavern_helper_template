# 神秘复苏模拟器 8.13.5

**日期**：2026-07-12  
**主题**：沉浸 HUD 外置面板兜底让层（扩展菜单 / SP 数据库）

## 变更

- **扩展菜单统一 yield**：点 `#extensionsMenu` / 顶栏抽屉 / SP·数据库等入口时自动 `yieldHudToStUi`
- **兜底扫描**：`MutationObserver` + 定时扫描，检测 `fixed/absolute` 且易被壳盖住的大半屏面板
- **抬层标记**：`data-mfrs-hud-overlay-lift="1"` → CSS 抬到 `z-index: 10080`
- 覆盖：ST 抽屉、SP `.acu-v2-app__shell`、popup、role=dialog 等
- 关闭后 `restoreHudFromStUi` 清理标记；卸载沉浸时 `stopHudOverlayWatch`
- 无 MVU / schema / 世界书 / SQL 变更

## 发布

| 项 | 值 |
|----|-----|
| 版本 | **8.13.5** |
| cache | `…-v8135-overlay-yield` |

## 使用

重导发布版 PNG → 沉浸中点扩展「SP·数据库 III」应直接可点，不再被 HUD 盖住。
