# 发布记录 · 神秘复苏模拟器 8.12.1

**时间**：2026-07-12  
**主题**：沉浸 HUD 性能补丁（卡顿优化）

## 提交链

| 角色 | SHA | 说明 |
|------|-----|------|
| 资源 | `f26e0766fd8e3675e78b451082ae174ffdc7e2ef` | 沉浸态只刷最新楼 + 减 burst + 关 α 动画 |
| 发布 | （本提交） | `publish-card` 8.12.1 |

## CDN

- `CDN_REF` = `f26e0766fd8e3675e78b451082ae174ffdc7e2ef`
- `CDN_CACHE_VERSION` = `phase166-4-0-final-baseline-6-28-p5-4-hotfix14-mvu-v8121-hud-perf`
- `releaseVersion` = `8.12.1`

## 优化点

1. 全屏 ON：消息处理只维护**最新 AI 楼**（历史楼不再全量 inject/rebuild）  
2. burst 刷新：4 轮 → **2 轮**；Mutation debounce 加长  
3. 沉浸 CSS：关闭 last_mes 扫描/血滴/风险条等循环动画；`#chat > .mes` 使用 `content-visibility: auto`  
4. 退出沉浸后补一次全历史 α 面板，保证非沉浸态仍完整  

## 校验

```
verify-mfrs-archive-ui-regressions --stage phase5  PASS
verify-mfrs-release-png 8.12.1 / f26e076 / cache   PASS (regex=33, scripts=8)
```

## 用户注意

- 需**重新导入** 8.12.1 发布版 PNG；8.12.0 卡仍吃旧缓存。  
