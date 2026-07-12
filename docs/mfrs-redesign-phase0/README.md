# 神秘复苏 · 对照参考图改造 · Phase 0 冻结包

**状态：Phase 0 完成（2026-07-12）**  
**基线：发布版 8.10.0 / CDN `a37fe0b` / cache `...-mvu-v8100-motion`**  
**代码改动：无（仅本目录文档 + 基线截图）**

## 文档索引

| 文件 | 对应任务 | 说明 |
|------|----------|------|
| [BASELINE.md](./BASELINE.md) | T0.1 | 版本、git、hash、实机 DOM、回滚 |
| [WHITELIST.md](./WHITELIST.md) | T0.2 | 可改/禁改文件 |
| [DECISION.md](./DECISION.md) | T0.3 | 路径 α 决策 |
| [CONTRACT_CHECKLIST.md](./CONTRACT_CHECKLIST.md) | T0.5 | 契约回归勾选 |
| [EVIDENCE.md](./EVIDENCE.md) | T0.4 | 截图与实机证据 |
| [_regex_names.txt](./_regex_names.txt) | 附件 | 33 条正则名单 |
| `baseline-screenshots/` | T0.4 | 基线图 |

## 下一阶段入口

按任务清单执行 **Phase 1**：

1. T1.1–T1.2 删除 `.mfrs-msg-brand-eye` / `.mfrs-msg-brand-seal` 与「鬼眼封案」主视觉  
2. T1.3 brand → 公文顶状态条  
3. T1.4–T1.7 token + 动效 + reduced-motion  

主文件：`src/神秘复苏模拟器/脚本/消息内面板/index.ts`
