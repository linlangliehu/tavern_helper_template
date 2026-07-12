# 发布记录 · 神秘复苏模拟器 8.11.0

**时间**：2026-07-12  
**主题**：第三版卷宗 HUD 表现层（路径 α）

## 提交链

| 角色 | SHA | 说明 |
|------|-----|------|
| 资源 | `12a05b540bc242a655c42482c48d06993446f35f` | 源码 + dist + phase0 文档 + archive-ui 门禁 |
| 发布 | `14d07f41ef730f22668cede8fa568aa711b01e7e` | `publish-card` + 发布版 YAML/PNG |

## CDN

- `CDN_REF` = `12a05b540bc242a655c42482c48d06993446f35f`
- `CDN_CACHE_VERSION` = `phase164-4-0-final-baseline-6-28-p5-4-hotfix14-mvu-v8110-archive-hud`
- `releaseVersion` = `8.11.0`

## 校验

```
verify-mfrs-archive-ui-regressions --stage phase5  PASS
verify-mfrs-mvu-hotfix-regressions                 PASS
verify-mfrs-database-frontend-p3                   PASS
verify-mfrs-release-png 8.11.0 / 12a05b5 / cache   PASS (regex=33, scripts=8)
```

## 分发物

- `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`
- `src/神秘复苏模拟器发布版/index.yaml`（版本 8.11.0，链接指向资源提交）

## 用户注意

- 需**重新导入**发布版卡才会加载新 CDN 脚本；旧卡仍缓存 `@a37fe0b`。
- 档案柜主题若本地存过非 aurora，设置里切回「卷宗线框」。
