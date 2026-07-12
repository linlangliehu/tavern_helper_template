# 神秘复苏 · 对照参考图改造

## 当前权威方案

**[设计方案-第四版.md](./设计方案-第四版.md)**（v4.0）  
- 8.11.0 = 路径 α 已发版  
- 下一目标 = 路径 β 全屏卷宗 HUD（建议 8.12.0）  
- 参考：途尽信息架构 + 美化 2.0 Game View 挂载 + 参考图构图  

## 进度（2026-07-12 · 8.13.0 待发）

| 阶段 | 状态 |
|------|------|
| Phase 0–4 α / **8.11.0** | **完成** → [RELEASE_8.11.0.md](./RELEASE_8.11.0.md) |
| **β / 8.12.0–8.12.3** 全屏 HUD | **已发** → [RELEASE_8.12.3.md](./RELEASE_8.12.3.md) |
| **A–E** 菜单/输入皮/密度/性能 | **代码 + CDP 完成** |
| **F / 8.13.0** 门禁 + 本地测卡 + 发版准备 | **就绪，待 commit/push 后 `pnpm publish-card`** → [RELEASE_8.13.0.md](./RELEASE_8.13.0.md) |

**一句话**：A–E 体验包已合入源码；正式分发需发 **8.13.0** 并重导 PNG。详见 [TASKLIST_BETA.md](./TASKLIST_BETA.md)。

## 冻结包索引

| 文件 | 说明 |
|------|------|
| [设计方案-第四版.md](./设计方案-第四版.md) | **现行总方案** |
| [TASKLIST_BETA.md](./TASKLIST_BETA.md) | **β 完整任务清单**（权威进度） |
| [DECISION.md](./DECISION.md) | α 历史 + **β 拍板**（D1/C1/本地 dist） |
| [WHITELIST.md](./WHITELIST.md) | 可改/禁改（含 β 壳/reparent） |
| [CONTRACT_CHECKLIST.md](./CONTRACT_CHECKLIST.md) | 契约勾选 + **§H β 专节** |
| [BASELINE.md](./BASELINE.md) | Phase0 基线（α 启动时） |
| [EVIDENCE.md](./EVIDENCE.md) | 截图证据 |
| [local-test/](./local-test/) | β 本地验收 PNG + 说明 |
| [PHASE1_DONE.md](./PHASE1_DONE.md) … [PHASE4_DONE.md](./PHASE4_DONE.md) | α 阶段完成记录 |
| [RELEASE_8.11.0.md](./RELEASE_8.11.0.md) | 8.11.0 发布链 |
| `baseline-screenshots/` | 基线与 8.11 实机图 |

## 分发

- 当前线上发布版：**8.12.3**（`@5b22070…` / `…-v8123-st-zfix`）  
- 下一版：**8.13.0**（A–E）— 见 [RELEASE_8.13.0.md](./RELEASE_8.13.0.md)  
- 本地验收卡：`local-test/神秘复苏模拟器-β本地验收.png`（`prepare-mfrs-beta-local-test.mjs`）  
- 回滚：8.12.3 `@5b22070…`；8.11.0 `@12a05b5…`
