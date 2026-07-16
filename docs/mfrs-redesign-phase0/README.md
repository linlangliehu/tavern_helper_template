# 神秘复苏 · 对照参考图改造

## 当前权威方案

**[设计方案-第四版.md](./设计方案-第四版.md)**（v4.0）  
- 8.11.0 = 路径 α 已发版  
- 下一目标 = 路径 β 全屏卷宗 HUD（建议 8.12.0）  
- 参考：途尽信息架构 + 美化 2.0 Game View 挂载 + 参考图构图  

## 进度（2026-07-15 · **8.13.29 已发布；MAINT-29 本地验证完成、未发布**）

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
| **8.13.15** BF0 initvar/schema 契约 | **已发** → [RELEASE_8.13.15.md](./RELEASE_8.13.15.md) |
| **8.13.16** BF0.5 核心镜像 + C3 pin | **已发** → [RELEASE_8.13.16.md](./RELEASE_8.13.16.md) |
| **8.13.17** H9 废弃打包卡 + L1 pin | **已发** → [RELEASE_8.13.17.md](./RELEASE_8.13.17.md) |
| **8.13.18** BF2 协议 raw / hotfix / 正则 | **已发** → [RELEASE_8.13.18.md](./RELEASE_8.13.18.md) |
| **8.13.19** BF3 DB 守卫/种子 + 开局 | **已发** → [RELEASE_8.13.19.md](./RELEASE_8.13.19.md) |
| **8.13.20** BF4 世界书清理 + stub | **已发** → [RELEASE_8.13.20.md](./RELEASE_8.13.20.md) |
| **8.13.21** BF5 门禁 G2–G5 + DM8 | **已发** → [RELEASE_8.13.21.md](./RELEASE_8.13.21.md) |
| **8.13.22** BF6 正则/清洗 + 发布链加固 | **已发** → [RELEASE_8.13.22.md](./RELEASE_8.13.22.md) |
| **8.13.23–8.13.29** 后续维护与沉浸式按键审查修复 | **已发**；当前内容版本为 **8.13.29**（release `410454b`，CDN dist `95981c9`） |
| **MAINT-29** 黄金储备正式路径 + drawer watcher 生命周期 | **本地源码/build/门禁/ST 真机完成；未发布** |

**一句话**：8.13.29 是当前已发布内容；`origin/main@ec14755` / `v8.13.30` 是发布后的 bot bundle。黄金储备与 drawer watcher 修复只在当前 worktree 中完成验证，尚未进入任何发布 PNG/CDN pin。

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

- 当前发布内容：**8.13.29**（release `410454b`；`v81329_20260715_01` / `@95981c90c901`）
  - PNG：`src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`
- 当前仓库运行时基线：`ec14755`（tag `v8.13.30`，8.13.29 发布后的 bot bundle）
- 当前本地未发布维护：MAINT-29-01 黄金储备正式路径；MAINT-29-02 drawer watcher 生命周期（已 build/门禁/ST 真机）
- 历史回滚点：8.13.22 `@158dcc29107f`；更近版本按 git tag/release 记录选择
- **禁止**导入 `src/神秘复苏模拟器/神秘复苏模拟器.json.deprecated-2026-06-03`
