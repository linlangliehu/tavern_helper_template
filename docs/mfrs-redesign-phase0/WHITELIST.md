# 表现层文件白名单（α Phase1–4 + β 全屏壳）

**最后更新**：2026-07-12（β0）  
**配合**：`DECISION.md` · `TASKLIST_BETA.md` · `设计方案-第四版.md`

---

## 允许修改（β 期）

| 优先级 | 路径 | 允许改什么 | 禁止改什么 |
|--------|------|------------|------------|
| **P0** | `src/神秘复苏模拟器/脚本/消息内面板/index.ts`（及同目录后续拆分文件，仍同一 webpack 入口） | **α 保留**：brand、三栏壳、顶条、折叠档案、右导航、拟办样式；**β 新增**：`#mfrs-hud-shell` DOM/CSS、mount/unmount、`#chat` reparent/restore、输入代理、全屏顶/左/右、导航、C1 柜覆盖层/抽屉、全屏 ON 时 hide α tri、卡过滤与 cleanup 扩展 | 改 MVU **字段路径语义**；拟办改为 `generate()`；新增脚本库入口；破坏只读展示契约 |
| P1 | `src/神秘复苏模拟器/脚本/界面美化/index.ts` | 叙事框、卷宗 token、直角线框、与壳一致的弱样式 | 非神秘复苏卡全局破坏性皮肤（**保持卡过滤**）；整站 ST 皮肤 |
| P1 | `src/神秘复苏模拟器/脚本/固定状态栏/index.ts` | host/slot **视觉** token、边框；全屏 ON 时 **仅视觉隐藏**（class/display，不删节点） | **id**、`insertBefore`、order **10/20**、卡过滤逻辑、挂载父节点策略 |
| P1 | `src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js` | aurora/卷宗线框 CSS、直角按钮 | 14 表 API、CRUD、挂载 ensure 语义 |
| P2 | `src/神秘复苏模拟器/脚本/数据库前端/index.ts` | 仅当柜展开必须的 loader/样式入口；**默认不动** | cleanup 契约、卡过滤、API 导出 |
| P2 | `src/神秘复苏模拟器/界面/状态栏/global.css` | ambient 弱化、token 对齐 | 业务数据绑定 |
| P2 | `src/神秘复苏模拟器/界面/状态栏/App.vue` | ambient/动效弱化 | store 字段、MVU 订阅语义 |
| P2 | `scripts/verify-mfrs-archive-ui-regressions.mjs` | β 断言：shell id、restore、卡过滤、无 generate、无眼/阵 | 削弱既有 α 断言 |
| P5 only | `scripts/publish-card.mjs` | `CDN_REF` / cache / `releaseVersion`（**仅 8.12 批准后**） | 镜像目录规则误删 |
| P5 only | `src/神秘复苏模拟器发布版/**` | 仅经 `publish-card` 生成 | 手改 PNG/YAML 作为主路径 |
| docs | `docs/mfrs-redesign-phase0/**` | DECISION / 本文件 / CONTRACT / TASKLIST / EVIDENCE / 方案 | — |

构建产物（可重生，不手改逻辑）：

- `dist/神秘复苏模拟器/脚本/**`
- `dist/神秘复苏模拟器/界面/**`

本地验收 URL 模板：

```
http://127.0.0.1:5500/dist/神秘复苏模拟器/脚本/<模块>/index.js
```

---

## 禁止修改（契约黑名单）

| 路径/区域 | 原因 |
|-----------|------|
| `src/神秘复苏模拟器/世界书/**` | 规则/触发/锚点 |
| `src/神秘复苏模拟器/世界书/变量/**`、`脚本/变量结构/**` | MVU schema |
| `src/神秘复苏模拟器/数据库/**`、`table-change-adapter.ts` 业务 | SQL 14 表 |
| `src/神秘复苏模拟器/index.yaml` 的 `正则:` 段 | **33** 条协议正则 |
| `src/神秘复苏模拟器/index.yaml` 的 `脚本库:` **顺序/启用/名称/加载器骨架** | 启动契约（**可改**被加载的 dist **内容**，不新增第 9 项） |
| `脚本/hotfix-generation-ended-listeners/**` | 协议清洗 |
| `脚本/MVU/**`、`脚本/数据库/index.ts` 业务 | 引擎 |
| 整站 SillyTavern 主题 / 非卡作用域皮肤 | 越界 |
| 途尽卡正则巨页 / 美化 2.0 全文拷贝进脚本库 | 维护与领域不兼容 |

---

## 改动纪律

1. 每个提交只触达白名单。  
2. 提交前对黑名单路径 `git diff --name-only` 必须为空。  
3. **β 主实现在消息内面板**；固定 host 先视觉隐藏，不改挂载契约。  
4. 不手改 `神秘复苏模拟器发布版.png` 作为主发布路径。  
5. 未过本地 dist 手测 + 用户批准前，不改 `publish-card` 的 `CDN_REF` / `releaseVersion`。  
6. 开发卡临时 localhost 脚本链 **不得** 进入发布版产物。  
