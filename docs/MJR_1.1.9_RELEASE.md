# MJR 1.1.9 发布记录

版本号 1.1.9；工作定位：P2 token 优化。把 4 个常驻（蓝灯）大图鉴拆成「蓝灯概要（规则 + 名单）」+「绿灯详细图鉴（正文不改，按人物/专名关键字触发）」。脚本源码未改。

## 变更摘要

| 原条目（蓝灯） | 拆分后 | 绿灯关键字 |
|---|---|---|
| 魔法术式图鉴 ≈5.3k | `世界书/魔法侧/魔法术式概要.txt` ≈0.6k + 绿灯图鉴 | 37 个 |
| 超能力图鉴 ≈4.0k | `世界书/科学侧/超能力概要.txt` ≈0.5k + 绿灯图鉴 | 28 个 |
| 配角总览 ≈4.2k | `世界书/角色档案/配角概要.txt` ≈0.8k + 绿灯总览 | 57 个 |
| 物品大全 ≈1.7k | `世界书/物品图鉴/物品概要.txt` ≈0.3k + 绿灯大全 | 16 个 |

- 关键字规则：排除泛词（「魔法」「术式」「超能力」「学园都市」「灵装」「魔法阵」「妹妹」「娘娘」「Item」等）和第一条消息里出现的词，避免开局即触发；每个关键字都能在对应正文里找到。
- 配角总览与 13 个主角档案无整段重复（仅御坂妹妹在美琴/最后之作档案中被提及），正文不改。
- 附带修复：`scripts/check-mjr-yaml.cjs` 改用项目直接依赖 `yaml`（原依赖未声明的 `js-yaml`，运行即报错）。

## 效果（离线字数估算，非 tokenizer 实测）

- 蓝灯常驻：27 条 ≈39.3k → ≈26.4k tok（约 -33%）。
- 世界书条目：114 → 118（新增 4 条概要）。

## 离线验证

- 门禁 9 项全过：`verify-script-deps`、`ability-placeholder-gate`、`opening-ability-contract`、`opening-baseline`、`message-panel-mount`、`event-budget-routing`、`p1-contract`、`insert-idempotency`、`verify-production-mode`。
- `node scripts/check-mjr-yaml.cjs` → `YAML_OK`，118 条目、7 正则；`git diff --check` 通过。
- 第一阶段 PNG：`chara`/`ccv3` 均为版本 1.1.9、世界书 118 条、4 条概要均已写入。

## 实机验证

按用户决定不做发版前实机验证。玩家游玩时留意：提到人物/术式/物品时详细图鉴是否加载；剧情用名单外说法指代时 AI 只凭概要写，最坏是细节不准。回滚方式：把对应绿灯条目改回蓝灯。

## 最终产物

- 第一阶段提交 `release(mjr): prepare 1.1.9 P2 token optimization (split 4 always-on codices)`（`13f8b9b3`）。
- CI `[bot] bundle` 生成生产 `dist` 提交 `16af5df5`（bot tag `v8.15.204`）。脚本源码未改，`dist` 相对 `77d318a6` 只有构建噪音级差异。
- 第二阶段把 6 个 loader 从 `77d318a6` 改到 `16af5df5` 并重新打包 PNG。
- PNG `src/魔法禁书目录模拟器/魔法禁书目录模拟器.png`：7,700,941 bytes；`chara`/`ccv3` 均为版本 1.1.9、世界书 118 条、loader SHA `16af5df5` ×6、无旧 SHA、无 `@main`。
- 门禁 9 项全过；`check-mjr-yaml` 通过；`git diff --check` 通过。
- CDN：`testingcf.jsdelivr.net` 与 `fastly.jsdelivr.net` 6 个文件均 HTTP 200 且 SHA-256 与本地一致（首次请求有短暂 403，约 1 分钟后缓存就绪）。
