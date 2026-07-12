# Phase 1 完成记录

**时间**：2026-07-12  
**范围**：去徽章 + token + 公文顶状态条（路径 α 地基）  
**未发版**：CDN 仍指向 `a37fe0b`；本地 `dist` 已重建。

## 已完成任务

| ID | 内容 | 状态 |
|----|------|------|
| T1.1 | 删除 `.mfrs-msg-brand-eye` / `.mfrs-msg-brand-seal` | done |
| T1.2 | 删除「鬼眼封案」/ `SUPERNATURAL ARCHIVE` 主视觉 | done |
| T1.3 | brand → 公文顶状态条（位置·阶段·事件·鬼域·危害） | done |
| T1.4 | token：底 `#0a0b0b`、线 `#3d6b66`、强调 `#6b2a26`、字 `#c8c0ae`、直角 | done |
| T1.5 | 风险色：死亡干血 / 复苏尸青 / 警戒旧铜；阈值 40/70 不变 | done |
| T1.6 | 去眼转/法阵转；顶条灯闪 2.5s；面板动效降速 | done |
| T1.7 | `prefers-reduced-motion` 全关 | done |
| T1.8 | 用户消息不注入（逻辑未改，既有过滤保留） | done |
| T1.9 | 状态栏 ambient 再弱；固定 host 边框 token 对齐 | done |
| T1.10 | build + verify 门禁 | done |

## 改动文件（白名单内）

- `src/神秘复苏模拟器/脚本/消息内面板/index.ts`
- `src/神秘复苏模拟器/脚本/界面美化/index.ts`
- `src/神秘复苏模拟器/脚本/固定状态栏/index.ts`（仅视觉 token）
- `src/神秘复苏模拟器/界面/状态栏/global.css`
- `scripts/verify-mfrs-archive-ui-regressions.mjs`（phase2 门禁改为卷宗页眉契约）
- `dist/神秘复苏模拟器/**`（build 产物）

## 门禁结果

```
verify-mfrs-archive-ui-regressions --stage phase5  PASS (186 checks)
verify-mfrs-mvu-hotfix-regressions                 PASS
verify-mfrs-database-frontend-p3                   PASS
pnpm build                                         PASS
```

## dist 静态抽样

消息内面板包：

- 含：`现场档案`、`mfrs-msg-brand-lamp`、`mfrs-msg-brand-corner`、`#3d6b66`、`#6b2a26`、`#c8c0ae`
- 不含：`mfrs-msg-brand-eye`、`鬼眼封案`、`SUPERNATURAL ARCHIVE`、`brand-seal`

界面美化 token：`#3d6b66` / `#c8c0ae` / `#6b2a26`；已移除 `mfrs-frame-glitch` 无限 glitch。

## 实机说明

- 已导入角色卡仍加载 CDN `@a37fe0b` 旧包，**不会自动出现 Phase1 UI**。
- 本地验收：`http://127.0.0.1:5500/dist/...` 已可提供新包；完整视觉需 live 加载或后续 `publish-card`。
- 挂载契约未改：host + order 10/20 仍在。

## 下一阶段

**Phase 2**：消息内三栏壳（左档案 | 中叙事+拟办 | 右导航）。
