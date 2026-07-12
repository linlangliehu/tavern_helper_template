# Phase 4 完成记录

**时间**：2026-07-12  
**范围**：契约回归总检（不发版）  
**清单**：`docs/mfrs-redesign-phase0/CONTRACT_CHECKLIST.md`

## 结论

**静态契约：PASS。**  
表现层 Phase1–3 改动未触达 MVU / 世界书 / SQL / 正则 / 脚本库序 / 固定挂载语义。  
**未执行**：`publish-card` / 8.11.0 CDN 更新（需用户明确批准）。

## A. 黑名单零 diff

`git diff` 对下列路径为空（相对当前工作区改造）：

| 路径 | 结果 |
|------|------|
| `src/.../世界书/**` | 无改动 |
| `src/.../数据库/**` | 无改动 |
| `src/.../脚本/变量结构/**` | 无改动 |
| `src/.../脚本/MVU/**` | 无改动 |
| `src/.../脚本/hotfix-generation-ended-listeners/**` | 源码无改动 |
| `src/.../脚本/数据库前端/table-change-adapter.ts` | 无改动 |
| `src/.../index.yaml` | 无改动（正则 33；脚本库 8 项序不变） |
| `src/...发布版/**` | 无改动 |

**工作区允许改动（白名单）**：

- `消息内面板/index.ts`、`界面美化/index.ts`、`固定状态栏/index.ts`
- `数据库前端/v10_2_visualizer.js`、`界面/状态栏/global.css`
- `scripts/verify-mfrs-archive-ui-regressions.mjs`
- 对应 `dist/神秘复苏模拟器/**` 构建产物
- `docs/mfrs-redesign-phase0/**`

构建曾误触 `dist/.../hotfix-generation-ended-listeners/index.js`（minify 噪声）；已 `git checkout HEAD --` 还原，**不纳入改造交付**。

## B–E. 静态契约抽样

- Host：`insertBefore(send_form|form_sheld)`；slot 10/20；卡过滤；cleanup 钩子  
- 字段：风险/位置/阶段/事件/驾驭厉鬼/在场人物/行动路径保留；无生命·饱食·理智写入  
- 行动：只填 `#send_textarea`，无 `generate()`；用户楼 `is_user` 跳过  
- 前端：`MysteryDatabaseFrontend` API；aurora 默认 + `acu_ui_config_v18` 无 v19 迁移  
- Token：消息区与档案柜均含 `#3d6b66` / `#6b2a26` / `#c8c0ae`  
- 脚本库序（8）：mvu → hotfix → 变量结构 → 界面美化 → 固定状态栏 → spv3.9.5·数据库 → 神秘复苏数据库前端 → 消息内面板  

## F. 门禁

```
verify-mfrs-archive-ui-regressions --stage phase5  PASS (186)
verify-mfrs-mvu-hotfix-regressions                 PASS
verify-mfrs-database-frontend-p3                   PASS
verify-mfrs-release-png --self-test                PASS
verify-mfrs-release-png 8.10.0 / a37fe0b / cache   PASS (regex=33, scripts=8)
pnpm build                                         PASS（Phase3 已跑；产物在 dist）
```

## 延期项（非 Phase4 阻断）

| 项 | 原因 |
|----|------|
| ST 实机 CDP 截图补 EVIDENCE | 导入卡仍吃 CDN `@a37fe0b`；需 `5500/dist` 注入或发版 |
| 8.11.0 / `publish-card` | 需用户明确批准；当前 `CDN_REF=a37fe0b` 故意冻结 |

## 发版前检查表（若批准 8.11.0）

1. 提交白名单源码 + dist + docs（勿含误触 hotfix dist）  
2. `publish-card.mjs`：`CDN_REF` / `CDN_CACHE_VERSION` / `releaseVersion=8.11.0`  
3. 构建 → publish → `verify-mfrs-release-png` 对新 PNG  
4. 导入发布版卡实机勾 B/G 未勾项  

## 下一步

用户二选一：

1. **本地验收**：Live Server `5500` + 开发卡加载 dist，手测三栏+档案柜  
2. **批准发版**：执行 8.11.0 `publish-card` 流程  
