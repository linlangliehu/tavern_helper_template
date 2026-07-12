# 神秘复苏模拟器 8.13.2

**日期**：2026-07-12  
**主题**：沉浸态「柜」内容被壳层遮挡 → 开柜时把 `#mfrs-fixed-status-host` 暂挂进 HUD shell

## 根因

- 档案柜数据仍在 `#mfrs-fixed-status-host`（17 表等），但 host 父链在 `#form_sheld` → `#sheld`（`z-index: 30`）。
- 沉浸壳 `#mfrs-hud-shell` 为 `z-index: 10000`，遮罩 `10015`；host 上 `position:fixed; z-index:10020` 只在 `#sheld` stacking 内生效，无法压过壳层。
- 表现：只见「档案柜 · 仅沉浸内展开」chrome，中间仍是正文；退出沉浸后输入框上方柜正常。

## 修复

- `parkFixedHostForHudCabinet`：开柜时 `shell.appendChild(host)`，与 mask/chrome 同层，`z-index:10020` 生效。
- `restoreFixedHostFromHudCabinet`：关柜 / 退出沉浸还原 DOM 位置。
- `expandArchiveCabinetUi`：展开折叠的 ACU 导航 / 仪表盘。

## 发布

| 项 | 值 |
|----|-----|
| 版本 | **8.13.2** |
| 功能 commit | `39f6fcb` |
| dist + publish-card | `6f4377c`（CDN_REF） |
| cache | `…-v8132-cabinet-park` |

## 使用

重导 `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png` 后：沉浸 → 柜 → 应见档案柜内容（非空壳）。
