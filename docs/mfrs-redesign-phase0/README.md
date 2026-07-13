# 神秘复苏 · 对照参考图改造

## 当前权威方案

**[设计方案-第四版.md](./设计方案-第四版.md)**（v4.0）  
- 8.11.0 = 路径 α 已发版  
- 下一目标 = 路径 β 全屏卷宗 HUD（建议 8.12.0）  
- 参考：途尽信息架构 + 美化 2.0 Game View 挂载 + 参考图构图  

## 进度（2026-07-13 · **8.13.14 已发**）

| 阶段 | 状态 |
|------|------|
| Phase 0–4 α / **8.11.0** | **完成** → [RELEASE_8.11.0.md](./RELEASE_8.11.0.md) |
| **β / 8.12.0–8.12.3** 全屏 HUD | **已发** → [RELEASE_8.12.3.md](./RELEASE_8.12.3.md) |
| **8.13.0** A–E + 退出分片 | **已发** → [RELEASE_8.13.0.md](./RELEASE_8.13.0.md) |
| **8.13.1** 设置轨承载酒馆 8 项 | **已发** → [RELEASE_8.13.1.md](./RELEASE_8.13.1.md) |
| **8.13.2** 沉浸柜 park host | **已发** → [RELEASE_8.13.2.md](./RELEASE_8.13.2.md) |
| **8.13.3** 沉浸柜竖向卡片流 | **已发** → [RELEASE_8.13.3.md](./RELEASE_8.13.3.md) |
| **8.13.4** IA v2.1 七键分栏 | **已发** → [RELEASE_8.13.4.md](./RELEASE_8.13.4.md) |
| **8.13.5** 外置面板兜底让层 | **已发** → [RELEASE_8.13.5.md](./RELEASE_8.13.5.md) |
| **8.13.6** 热修扫描误伤闪烁 | **已发** → [RELEASE_8.13.6.md](./RELEASE_8.13.6.md) |
| **8.13.7** 本轮选项仅 HUD | **已发** → [RELEASE_8.13.7.md](./RELEASE_8.13.7.md) |
| **8.13.8** 无行动建议则隐藏选项 | **已发** → [RELEASE_8.13.8.md](./RELEASE_8.13.8.md) |
| **8.13.9** 关闭面板真正关 SP | **已发** → [RELEASE_8.13.9.md](./RELEASE_8.13.9.md) |
| **8.13.10** UpdateVariable 回退解析选项 | **已发** → [RELEASE_8.13.10.md](./RELEASE_8.13.10.md) |
| **8.13.11** 补种行动建议/最近行动判定路径 | **已发** → [RELEASE_8.13.11.md](./RELEASE_8.13.11.md) |
| **8.13.12** P2 状态栏回写/空回复/CRUD 降噪 | **已发** → [RELEASE_8.13.12.md](./RELEASE_8.13.12.md) |
| **8.13.13** 生成结束始终解锁发送 | **已发** → [RELEASE_8.13.13.md](./RELEASE_8.13.13.md) |
| **8.13.14** C7 重发：production dist + G1 | **已发** → [RELEASE_8.13.14.md](./RELEASE_8.13.14.md) |

**一句话**：请重导 **8.13.14**（真正交付 always-unlock dist；publish 前 G1 门禁防再漏）。

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

- 当前发布版：**8.13.14**（`…-v81314-c7-dist-rebuild` / `@d5cd98f`）  
  PNG：`src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`  
- 回滚：8.13.13 `@28777ad…`（源码有解锁、CDN dist 未交付，不推荐）
