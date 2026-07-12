# 神秘复苏 · 对照参考图改造

## 当前权威方案

**[设计方案-第四版.md](./设计方案-第四版.md)**（v4.0）  
- 8.11.0 = 路径 α 已发版  
- 下一目标 = 路径 β 全屏卷宗 HUD（建议 8.12.0）  
- 参考：途尽信息架构 + 美化 2.0 Game View 挂载 + 参考图构图  

## 进度（2026-07-12 · CDP 手测后）

| 阶段 | 状态 |
|------|------|
| Phase 0–4 α / **8.11.0** | **完成** → [RELEASE_8.11.0.md](./RELEASE_8.11.0.md) |
| **β0–β3.5** 全屏 HUD + 原生输入 + 顶栏菜单 | **完成** |
| **β4A** 门禁+build | **完成**（archive-ui 197） |
| **β4B** 15 项手测 | **CDP 功能 PASS**（9–10 依赖本地 dist 卡） |
| **β4C** 8.12.0 | **未开始**（阻塞于用户批准） |

**一句话**：β 功能与手测齐；差你批准发 8.12.0。测试请用 `local-test` 卡（5500），勿用旧 CDN 开发卡。详见 [TASKLIST_BETA.md](./TASKLIST_BETA.md)。

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

## 下一阶段入口

**β4C**：确认本地测试卡 → **批准 8.12.0** → `CDN_REF` + `publish-card` + 重导发布版。  
本地 dist：`http://127.0.0.1:5500/dist/神秘复苏模拟器/脚本/消息内面板/index.js`  
