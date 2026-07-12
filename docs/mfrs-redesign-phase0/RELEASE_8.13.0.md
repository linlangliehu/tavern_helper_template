# 发布记录 · 神秘复苏模拟器 8.13.0

**时间**：2026-07-12  
**主题**：沉浸 HUD 体验补丁包（Phase A–E）

## 相对 8.12.3 的变化

### A · 菜单稳定
- 开新 ST 抽屉前先关已开抽屉
- 入口缺失：灰显 + toast + title
- Esc 分层：菜单 → ST 抽屉 → 柜 → 侧栏（不退出沉浸）
- 「关闭面板」强制清 openDrawer + 去 st-ui 类

### B · 输入条卷宗皮
- 仅 CSS：壳内 `#send_form` / textarea / send / ☰✨
- 原生 reparent 不变；无假输入代理

### C · 信息密度
- 顶条更紧 + chip 截断
- 拟办默认折叠、展开限高
- 关系卡扫读；左栏事件/厉鬼默认折叠

### D · 菜单文案
- 「扩展设置」；分组「连接与格式 / 世界与角色」
- 成功 toast「已打开：…」
- ≤800 菜单贴底单列

### E · 性能与生命周期
- 沉浸 latest-only + 退出全历史
- Mutation 限 `#chat`、忽略壳 chrome
- 低动效：`prefers-reduced-motion` 或 `localStorage.mfrs_hud_low_motion=1`
- 切非神秘复苏卡 `destroyHudImmersive`

## 契约（不变）

- 正则 **33** / 脚本库 **8**
- 不改世界书 / schema / SQL / 拟办不 `generate()`
- 固定 host 挂载契约不变

## CDN

| 项 | 值 |
|----|-----|
| 资源 `CDN_REF` | `6996f0e808e87fdad4b72b2b459955a3782c8bc6` |
| cache | `phase168-4-0-final-baseline-6-28-p5-4-hotfix14-mvu-v8130-ux-polish` |
| 版本 | **8.13.0** |

## 校验

```text
verify-mfrs-release-png 8.13.0 / 6996f0e / …-v8130-ux-polish PASS (regex=33, scripts=8)
```

## 用户注意

- 必须**重新导入** `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`（8.13.0）
- 旧 8.12.3 卡仍指向 `@5b22070`，不会自动获得 A–E
