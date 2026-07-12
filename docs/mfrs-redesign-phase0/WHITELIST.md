# Phase 0 · 表现层文件白名单（T0.2）

## 允许修改（Phase 1–4）

| 优先级 | 路径 | 允许改什么 | 禁止改什么 |
|--------|------|------------|------------|
| P0 | `src/神秘复苏模拟器/脚本/消息内面板/index.ts` | brand HTML/CSS、三栏壳、顶状态条、折叠档案、右导航、行动样式、动效预算 | MVU 字段路径语义、只填不发行为契约 |
| P0 | `src/神秘复苏模拟器/脚本/界面美化/index.ts` | 叙事框、全局 token、直角线框、选项按钮外观 | 非神秘复苏卡的全局破坏性皮肤（保持卡过滤） |
| P1 | `src/神秘复苏模拟器/脚本/固定状态栏/index.ts` | host/slot **视觉** token、边框 | **id**、`insertBefore`、order 10/20、卡过滤逻辑 |
| P1 | `src/神秘复苏模拟器/脚本/数据库前端/v10_2_visualizer.js` | aurora 主题色、直角按钮、卷宗线框 CSS | 14 表 API、CRUD、挂载 ensure 语义 |
| P2 | `src/神秘复苏模拟器/脚本/数据库前端/index.ts` | 仅当换皮必须的 loader/样式入口；默认尽量不动 | cleanup 契约、卡过滤、API 导出 |
| P2 | `src/神秘复苏模拟器/界面/状态栏/global.css` | ambient 弱化、token 对齐 | 业务数据绑定 |
| P2 | `src/神秘复苏模拟器/界面/状态栏/App.vue` | ambient/动效弱化 | store 字段、MVU 订阅语义 |
| P5 only | `scripts/publish-card.mjs` | `CDN_REF` / cache / `releaseVersion` | 镜像目录规则误删 |
| P5 only | `src/神秘复苏模拟器发布版/**` | 仅经 `publish-card` 生成 | 手改 PNG/YAML 作为主路径 |

构建产物（可重生，不手改）：

- `dist/神秘复苏模拟器/脚本/**`
- `dist/神秘复苏模拟器/界面/**`

---

## 禁止修改（契约黑名单）

| 路径/区域 | 原因 |
|-----------|------|
| `src/神秘复苏模拟器/世界书/**` | 规则/触发/锚点 |
| `src/神秘复苏模拟器/世界书/变量/**`、`变量结构` | MVU schema |
| `src/神秘复苏模拟器/数据库/**`、`table-change-adapter.ts` 业务 | SQL 14 表 |
| `src/神秘复苏模拟器/index.yaml` 的 `正则:` 段 | 33 条协议正则 |
| `src/神秘复苏模拟器/index.yaml` 的 `脚本库:` **顺序/启用/加载器骨架** | 启动契约（可改被加载 dist 内容） |
| `脚本/hotfix-generation-ended-listeners/**` | 协议清洗 |
| `脚本/MVU/**`、`脚本/数据库/index.ts` 业务 | 引擎 |
| `脚本/变量结构/**` | schema 注入 |
| 整站 SillyTavern 主题/非卡作用域皮肤 | 越界 |

---

## 改动纪律

1. 每个 PR/提交只触达白名单。  
2. 提交前对黑名单路径 `git diff --name-only` 必须为空。  
3. 固定前端：**先换皮，后谈路径 β**；β 不进 Phase1–4 必做。  
4. 不手改 `神秘复苏模拟器发布版.png` 作为主发布路径。  
