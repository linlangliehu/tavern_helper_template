# 发布记录 · 神秘复苏模拟器 8.12.0

**时间**：2026-07-12  
**主题**：路径 β 全屏卷宗 HUD（原生输入 + 顶栏 8 项酒馆菜单）

## 提交链

| 角色 | SHA | 说明 |
|------|-----|------|
| 资源 | `bceea656989916d6a079bcc7a4c661c3c27a531b` | 全屏壳 / reparent / 原生 send_form / 柜 / 顶栏菜单 + docs + 门禁 |
| 发布 | （本提交） | `publish-card` + 发布版 YAML/PNG 8.12.0 |

## CDN

- `CDN_REF` = `bceea656989916d6a079bcc7a4c661c3c27a531b`
- `CDN_CACHE_VERSION` = `phase165-4-0-final-baseline-6-28-p5-4-hotfix14-mvu-v8120-fullscreen-hud`
- `releaseVersion` = `8.12.0`

## 校验

```
verify-mfrs-archive-ui-regressions --stage phase5  PASS (197)
verify-mfrs-mvu-hotfix-regressions                 PASS
verify-mfrs-database-frontend-p3                   PASS
verify-mfrs-release-png 8.12.0 / bceea65 / cache   PASS (regex=33, scripts=8)
```

## 功能要点

- D1 自动全屏 `#mfrs-hud-shell`；退出 / `Ctrl+Shift+G`
- `#chat` reparent 中栏；`#send_form` 嵌原生输入条（非假代理）
- C1 仅「柜」展开档案柜浮层；默认无半屏柜
- 顶栏「酒馆菜单」仅代理 ST 顶栏 8 抽屉；☰/✨ 走原生输入条
- 拟办只填 textarea，不 `generate()`
- 脚本库 8 / 正则 33 不变

## 分发物

- `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`
- `src/神秘复苏模拟器发布版/index.yaml`（版本 8.12.0，链接指向资源提交）

## 用户注意

- 需**重新导入**发布版卡才会加载新 CDN 脚本；旧 8.11 卡仍缓存 `@12a05b5`。
- 回滚：继续使用 8.11.0 发布版 PNG / CDN `@12a05b5…-v8110-archive-hud`。
