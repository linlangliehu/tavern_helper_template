# 神秘复苏模拟器 8.13.3

**日期**：2026-07-12  
**主题**：沉浸态档案柜全宽竖向卡片流（适配 HUD 浮层）

## 变更

- 仅在 `body.mfrs-hud-immersive #mfrs-fixed-status-host.mfrs-hud-cabinet-open` 下 CSS：
  - 表行 `.acu-data-card` 全宽单列 stack（非 280px 多列墙）
  - `#acu-data-area` 取消 absolute popover，改为柜内文档流
  - 仪表盘三列 → 竖排；导航按钮更密
- 非沉浸输入框上方柜布局不变；无 MVU / slot / host 挂载契约变更

## 发布

| 项 | 值 |
|----|-----|
| 版本 | **8.13.3** |
| 功能 commit | `b061b9d` |
| dist CDN_REF | `2659f64` |
| cache | `…-v8133-cabinet-stack` |

## 使用

重导 `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png` → 沉浸 → 柜 → 竖向卡片列表。
