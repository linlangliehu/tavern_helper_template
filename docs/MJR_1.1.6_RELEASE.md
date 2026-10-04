# 魔法禁书目录模拟器 1.1.6 发布记录

## 基本信息

- 版本：1.1.6
- 发布范围：P1 事件簇导航、日期精度标注、开局基线初始化和事件包预算路由
- 产物：`src/魔法禁书目录模拟器/魔法禁书目录模拟器.png`
- 运行态聊天、API 配置、连接档案、Cookie、密钥和浏览器状态不属于发布内容

## 变更摘要

- 将欢迎页导航整理为“叙事时间层 → 事件簇 → 视角/媒介/入口类型 → 开场白”。
- 为 114 个开场入口补齐事件簇、媒介、视角、入口类型、关系、日期精度和覆盖等级元数据。
- 明确事件包开局的阶段、位置、当前节点、已完成节点和可触发节点必须由首轮协议初始化，避免保留 `initvar` 默认值。
- 保持“单一当前主线焦点 + 同一事件包内多战线 + 可插入支线”的 P1 游玩模型。
- 选择事件包时只放宽对应世界书事件包的预算，切换到 reference-only 或自定义入口时清除预算豁免。
- 继续保持 P0 规则：玩家能力可自由使用，未声明能力/明确无能力时 `/能力档案=[]`，可重复物品不会因使用自动消耗。

## 离线验证

- `MJR_ABILITY_PLACEHOLDER_GATE_OK`
- `MJR_OPENING_ABILITY_CONTRACT_OK`
- `MJR_OPENING_BASELINE_OK`
- `MJR_MESSAGE_PANEL_MOUNT_OK`
- `MJR_EVENT_BUDGET_ROUTING_OK`
- `MJR_P1_CONTRACT_OK entries=114 clusters=105`
- `MJR_INSERT_IDEMPOTENCY_OK`
- `YAML_OK`
- `check-mjr-yaml.cjs`：114 条目、7 条正则
- 定向 ESLint：无错误（新增脚本仅有 Node.js 内置模块规则警告）
- 干净提交隔离构建：`pnpm build` 通过；webpack production 编译成功

## 最终产物

- 生产 `dist` 提交：`bc5b8c20eb349948bdebf1e513deefe014810cc9`
- PNG 大小：`7,662,741` bytes
- PNG SHA-256：`6A05DE1C12339E71C424BDB3E44CD1B40B13298B45D1455383365B135D95E93E`
- 6 个魔禁 loader 均已锁定到上述生产 `dist` 提交。
- `testingcf.jsdelivr.net`：6/6 HTTP 200，6/6 与本地生产文件 SHA-256 一致。
- `cdn.jsdelivr.net`：6/6 HTTP 200，6/6 与本地生产文件 SHA-256 一致。
- 两个 CDN 节点检查文件：MVU、变量结构、mvu-protocol-applier、界面美化、固定状态栏、消息内面板。

## 构建备注

- GitHub Actions `bundle` 运行 `37205671486`、`37207094319` 均在 `pnpm install && pnpm build` 步骤退出；公开检查页仅返回退出码，未提供内部日志。
- 依据同一发布提交的干净隔离工作树复现，`pnpm build` 和 webpack production 均通过，因此本次 `dist` 使用已核验的本地生产构建提交，并单独完成 CDN 字节级校验。

## 发布边界

- 只提交魔禁角色卡、P1 维护源、公开事件簇矩阵、门禁和本发布记录。
- 排除神秘复苏车道、用户维护的 watch 生成 `dist`、`.planning` 运行记录、聊天内容、API 配置及其他敏感数据。
- 本记录会在 GitHub Actions 生成本次源码对应的 production `dist` 后补充最终 bundle commit、PNG SHA-256 和 CDN 检查结果。
