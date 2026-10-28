# 魔法禁书目录模拟器 1.1.7 发布记录

## 基本信息

- 版本：1.1.7
- 基线：1.1.6（生产 `dist` 提交 `bc5b8c20`）
- 发布范围：主线节点数组归一（维护版本，无新玩法）
- 产物：`src/魔法禁书目录模拟器/魔法禁书目录模拟器.png`
- 运行态聊天、API 配置、连接档案、Cookie、密钥和浏览器状态不属于发布内容

## 变更摘要

- `主线进度` 的「当前节点」不会再同时出现在「已完成节点」或「可触发节点」中；两个数组会去掉空项和重复项，已完成的节点也会从「可触发节点」中移除。
  - `schema.ts`：主线进度增加 Zod `transform` 归一（提交 `f043468c`）。
  - `mvu-protocol-applier/raw-status-writer.ts`：本地 JSONPatch 写回同样归一（提交 `27d847f5`）。本卡写回走 `Mvu.replaceMvuData`，不经过 schema，所以需要这一层才会在实机生效。
- 世界书 `变量更新规则`、`变量输出格式`：补充「可触发节点只写下一步候选，推进时把旧当前节点移入已完成节点」的说明。
- `schema.json` 重新生成：只把「数量」字段从 `anyOf` 改写为 `type` 数组，语义不变。

## 实机依据（1.1.6 生产脚本，2026-10-28）

- 环境：模型 `gemini-3.8-flash`，预设「狐神抚 V19.7.3」。
- 复现：`NECROMANCER-01` 开局后「可触发节点」为 `[NECROMANCER-01, NECROMANCER-02]`；推进到 `NECROMANCER-02` 后仍为 `[NECROMANCER-02, NECROMANCER-03]`。
- 同轮补证通过：跨独立事件包换篇 `NECROMANCER → JAILBREAK-01`；漫画路线 `OP-O33-01` 首轮输出 `<UpdateVariable>`，无 `hashlib`/`vault.py` 污染。

## 离线验证

- `verify-script-deps: passed`
- `MJR_ABILITY_PLACEHOLDER_GATE_OK`
- `MJR_OPENING_ABILITY_CONTRACT_OK`
- `MJR_OPENING_BASELINE_OK`
- `MJR_MESSAGE_PANEL_MOUNT_OK`
- `MJR_EVENT_BUDGET_ROUTING_OK`
- `MJR_P1_CONTRACT_OK entries=114 clusters=105`
- `MJR_INSERT_IDEMPOTENCY_OK`（新增主线节点数组归一断言，含删除归一后必须失败的变异检查）
- `verify-production-mode: passed`

## 最终产物

阶段 2 补充：生产 `dist` 提交、PNG 大小与 SHA-256、6 个 loader 锁定结果、两个 CDN 节点的 HTTP 与字节级校验。

## 发布边界

- 只提交魔禁版本号、本发布记录，以及阶段 2 的 loader SHA 与 PNG。
- 排除神秘复苏车道、watch 生成的 `dist`、聊天内容、API 配置及其他敏感数据。
