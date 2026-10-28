# MJR 1.1.8 发布记录

版本号 1.1.8；工作定位：1.1.7 节点数组归一（`27d847f5`/`f043468c`）的后续维护版，把实机协议偏差的三处兜底补上，并把 BGM 资产固定到提交 SHA，一并发布。

## 变更摘要

1. **写入端容错（`raw-status-writer.ts`）**
   - 顶层路径别名：`/当前位置` → `/所在位置`（实机换篇时模型偶发用错键，值被 schema 静默丢弃）。
   - `normalizeMainlineNodeArrays` 增加对 `正史锚点.玩家偏移` 的字符串兜底：换篇时模型把它写成字符串会被包成单元素数组（空串/纯空白 → `[]`）。
2. **规则文本**
   - `变量更新规则.yaml`、`变量输出格式.yaml`：换篇必须 `op:"replace"` 写 `/所在位置`（禁止 `/当前位置`）；`玩家偏移` 是字符串数组，追加用 `op:"insert" path /主线进度/正史锚点/玩家偏移/-`，不得整体写成字符串；时间跳跃时向 `/世界线记录` 追加一条并把 `时间点` 写新篇章日期。
3. **P3：BGM 资产固定**
   - `index.yaml` 与 `自定义开局/欢迎页.txt` 的 `only-my-railgun.mp3` 从 `bgm/main/` 固定到 `bgm/7f1be030f9f59d8c6d2dbc3333ffa77dff8b9a26/`（GitHub 显示 `linlangliehu/bgm` 的 `main` 头即该提交，二者 blob sha256 一致）。
4. **门禁**
   - `verify-mjr-insert-idempotency.mjs` 新增别名容错断言 + 突变检查：把 `{ 当前位置: '所在位置' }` 换成 `{}` 时必须失败。

## 为什么不改 schema

试过给 `正史锚点.玩家偏移` 加 `z.preprocess` 在 schema 侧兜底，发现父对象 `正史锚点.default` 会从 `schema.json` 中整块消失（preprocess 让非法值在校验阶段就报错，父级 default 校验不过）。schema 侧回退，容错全部放写入端。教训已写入 `角色卡制作经验.md` 2.22。

## 离线验证

- 门禁 9 项全过：`verify-script-deps`、`ability-placeholder-gate`、`opening-ability-contract`、`opening-baseline`、`message-panel-mount`、`event-budget-routing`、`p1-contract`、`insert-idempotency`、`production-mode`。
- `node dump_schema.ts` 生成的 `schema.json` 与已提交版本一致（schema 未变）。
- `node scripts/check-mjr-yaml.cjs` → `YAML_OK`；`index.yaml` 解析 `条目=114`、`正则=7`；世界书递归计入 114 条。
- 欢迎页正则生成脚本输出与 `index.yaml` 一致（`WELCOME_SYNC_SAME`）。
- ESLint（3 个改动 TS/mjs 文件）通过；`git diff --check` 通过。
- 单元断言覆盖：`/当前位置` → `/所在位置` 映射、不新建垃圾键、字符串玩家偏移 → 单元素数组、空白字符串 → `[]`、BGM SHA 出现在 PNG 中且无 `bgm/main/` 残留。

## 实机验证

按用户决定，1.1.8 不做发版前实机验证，交给玩家游玩反馈。详见 `角色卡制作经验.md` 2.23 的分诊顺序。

## P2 静态 token 预算审计（2026-10-28）

CJK ≈ 1 tok/字，英文 ≈ 4 字/tok 的粗略估算（离线、非 tokenizer 实测）：

- 世界书启用条目 111 条，总估 269,044 tok。绿灯 84 条 ≈ 226,450 tok；蓝灯 27 条 ≈ 42,594 tok。
- 蓝灯（每轮常驻）前三：魔法术式图鉴 5.7k、配角总览 4.6k、变量更新规则 4.5k。
- 绿灯大头是剧情事件：`剧情事件/主线` 77 条 ≈ 214k；`剧情事件/支线` 8 条 ≈ 13.8k。已选事件包通过 `event-budget` 的 `ignoreBudget` 路由豁免（见 `event-budget.ts`），未选包仍占绿灯预算。
- 非事件包绿灯只 2 条：前史与 SS2 节点索引 3.6k、动画游戏与未定日外传索引 2.4k。
- 角色描述 ≈ 263 tok；第一条消息 ≈ 446 tok。

结论：事件包预算路由已生效，蓝灯常驻是大头但合理（< 50k）；真正的大头是绿灯事件包。是否要按文件夹进一步细分预算、或对常驻蓝灯做瘦身，留待 P2 后续单独评估。

## 最终产物

- 第一阶段提交 `release(mjr): prepare 1.1.8 protocol resilience + P3 bgm pin`（`81fae8e9`）。
- 第一阶段触发的 CI bundle 运行 `40691912151` 成功；`[bot] bundle` 生成生产 `dist` 提交 `77d318a6`（bot tag `v8.15.188`）。
- 第二阶段把 6 个 loader 从 `3218e217` 改到 `77d318a6` 并重新打包 PNG。
- PNG `src/魔法禁书目录模拟器/魔法禁书目录模拟器.png`：7,666,077 bytes；`chara`/`ccv3` 均为版本 1.1.8、世界书 114 条、loader SHA `[77d318a6]`、`bgm/7f1be030` 已固定且无 `bgm/main/` 残留。
- CDN：`testingcf.jsdelivr.net` 6 个文件 HTTP 200 且 SHA-256 与本地一致；`fastly.jsdelivr.net` 6 个文件 HTTP 200 且 SHA-256 与本地一致（其中 `mvu-protocol-applier` 前几次 403，第 6 次重试成功，是 CDN 缓存刷新延迟）。`cdn.jsdelivr.net` 本机连接被重置，未能校验（同 1.1.7）。
- 实机验证按用户决定跳过，玩家游玩时留意「可触发节点不含当前节点」「换篇后所在位置更新」「玩家偏移保持数组」即可。

## 发布边界

- loader SHA 仍为 1.1.7 的 `3218e217`（本版本不改动 6 个脚本源码，只改 `raw-status-writer` 与世界书文本，这些内容由第二阶段 `[bot] bundle` 用新 SHA 重新发布）。
- 已发布卡不动：1.1.7 的 PNG 与 `3218e217` loader 仍然有效，老用户无需强制升级。
- 不做多事件包各自存游标并自由切回；不恢复 `generateRaw` 二次生成；不自动迁移旧聊天。
