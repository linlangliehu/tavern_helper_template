# 神秘复苏模拟器 运行机制全景图（8.15.0 / 2026-08-13）

> 目的：修任何缺陷前先对照本图判断影响面，避免"修一层暴露下一层"的打地鼠循环。
> 行号引用会随代码漂移，以函数名为准。

## 一、五层结构与加载顺序

角色卡 = index.yaml 打包的 5 层：

1. **提示词层**（内嵌世界书 + 系统提示词）：告诉 AI 每轮输出 `正文 → 【本轮摘要】 → <choices> → <UpdateVariable><JSONPatch>`；数据库联动规则（蓝灯深度4）定义 14 张表语义。真源顺序：MVU stat_data > 数据库镜像 > 本轮摘要。
2. **MVU 变量层**：MagVarUpdate 0.171.0（唯一 CDN 依赖，yaml 内联加载；`脚本/MVU/index.ts` 是死代码）。schema 由 `变量结构` 脚本注册（zod）。
3. **协议清洗/写回层**：`hotfix-generation-ended-listeners` —— GENERATION_ENDED/MESSAGE_RECEIVED 时解析 `<UpdateVariable>` 写回楼层变量（Mvu.parseMessage → raw-status-writer JSONPatch 降级 → 直写 chat.variables 三级兜底，250/1000/2500ms 重试），然后把协议块快照进 `extra._mfrs_raw_protocol_message` 并从 mes 删除。
4. **数据库层**：`脚本/数据库`（loader）动态 import `vendor/shujuku-sp-fork/index.js`（ACU fork，挂 `window.AutoCardUpdaterAPI`）；`脚本/数据库前端`（挂 `window.MysteryDatabaseFrontend`，含 table-change-adapter 预检 + mvu-core-mirror 镜像）。`神秘复苏数据库前端/` 目录是废弃 stub，yaml 第 6 项名字叫它但 URL 指向新版 `数据库前端/index.js`。
5. **界面层**：消息内面板（楼层 HUD，读楼层 MVU + exportTableAsJson）、固定状态栏（只提供 DOM 槽位）、界面/状态栏 Vue（defineMvuDataStore 绑楼层 MVU）、界面美化。

脚本库顺序：mvu → hotfix → 变量结构 → 界面美化 → 固定状态栏 → 数据库 loader → 数据库前端 → 消息内面板。**但无硬顺序假设**：所有跨脚本依赖都是"轮询等待 + 可选链 + 下次事件重试"。开发态所有脚本指向 `127.0.0.1:5510/dist/...`（真页验收前必查 iframe loader URL）。

## 二、一轮回复结束后的数据流时序

```
GENERATION_ENDED
├─ T+0    hotfix: 解析 <UpdateVariable> → 写回楼层 stat_data → 清洗 mes（快照进 extra）
├─ T+250/1000/2500ms hotfix MVU 写回重试
├─ T+300ms(debounce) mvu-core-mirror.runMirrorOnce:
│    readMvuStat(楼层) → exportCurrentData 快照 → buildCorePlans(~8 plan)
│    → 逐个 MysteryDatabaseFrontend.applyTableChangePlan（enqueueTableChange 串行队列）
│    → adapter 预检(DDL约束/UNIQUE/占位符/禁删禁插) → vendor updateCell/insertRow
│    → ROW_NOT_FOUND 降级 insertRow 补种 → persistTablesToChat(限定表) 落盘
├─ 并行   vendor 自动填表: executeCrudPlanFill_ACU 自己调 LLM(CRUD Plan 提示词)
│    → parseCrudPlanResponse_ACU 解析 <tableChangePlan> JSON
│    → getCrudPlanFrontendApi_ACU 找 window.MysteryDatabaseFrontend
│    → preview → apply(skipChatSave) → diff 判定 → 自己落盘 + _notifyTableUpdate
└─ 写库成功 → rerenderAcu → _notifyTableUpdate(debounce 150ms) + MysteryMessagePanel.refreshAll
```

镜像 vs AI 填表的防冲突分工：固定行表(全局状态/玩家状态/行动建议)镜像无条件刷新；灵异事件/线索按业务键 upsert + UNIQUE 兜底；**人物/地点镜像只插不改**（防占位值冲掉 AI 情报）；记忆三表(事件纪要/收录档案/收录规律)镜像不碰。落盘用 persistTablesToChat(限定表名) 防覆盖。

## 三、vendor 双存储模式与持久化

- `settings_ACU.storageMode`：`native`（JSON 直改 content 二维数组）| `sqlite`（sql.js 内存库为真相源，`currentJsonTableData_ACU` 是导出视图）。
- SQLite 链路：`SqlTableService`（loadFromChat 三分支：无快照/空壳→模板建表+seedRows；merged→灌库+热路径补建缺失表）+ `SyncBridge`（DDL 建表/灌数/导出）+ `SqliteEngine`。建表不完整返回 loaded:false → 上层 fallback native。
- **持久化到聊天消息**：`persistTablesToChatMessage_ACU` 写最后一条 AI 消息的 `message.TavernDB_ACU_IsolatedData[isolationKey]`；delta/checkpoint 二态（有 base 楼层存增量，否则全量快照）。读取：`mergeAllIndependentTables_ACU` 逆序扫聊天叠加 delta。
- **模板体系**：全局 `TABLE_TEMPLATE_ACU` < preset_link < chat_override（前端 `importTemplateFromData({scope:'chat'})` 写聊天首条消息 config）。`applyTemplateSnapshotToScope_ACU` 应用后 SQLite 模式强制 `reloadStorageProvider()` 重建物理库。seedRows 挂 sheet.seedRows 字段不进 content，只在冷启动建表和提示词 $0 注入时消费。

## 四、已知竞态窗口与自愈闸门（修 bug 先查这张表）

| # | 竞态/坑 | 自愈闸门 |
|---|---|---|
| 1 | CHAT_CHANGED 同步 dispose provider → 1200ms 后才 reload，期间写入无 provider | `getStorageProvider` mode-guard 懒建 + `_ensureProviderInitializedForWrite()`（所有 CRUD API 开头） |
| 2 | merge 只含"聊天里写过的表"→ 运行时视图收窄，空表消失 | 写路径 `findTargetSheetWithTemplateHeal`（miss 时按模板补建+重试）；loadFromChat 热路径补建；adapter buildTables 模板补壳 |
| 3 | 冷启动空壳不建表死锁 | loadFromChat 空壳分支 `_ensureTablesFromTemplate` + 完整性校验 |
| 4 | chat_override 模板导入后物理库仍是旧模板 | applyTemplateSnapshotToScope_ACU 内 SQLite 强制 reload |
| 5 | 竞态窗口建表无 seedRows → 固定表 ROW_NOT_FOUND | mirror updateCell→insertRow 降级补种；adapter update→insert 自动提升（FORBIDDEN_INSERT_TABLES 除外） |
| 6 | mirror 300ms 可能早于 MVU 写回 → 读旧 stat | 双事件触发 + 下轮自愈；人物/地点只插不改防误覆盖 |
| 7 | 视图表头退化壳落盘扩散 | `_buildExportFallbackData` 模板 padding；`_appendMissingSheetsFromFallback` B3 防空壳盖数据 |
| 8 | 快速滑动/删楼 | MESSAGE_DELETED/SWIPED 500ms 防抖 reload |
| 9 | 用户清空数据 vs 从未持久化 | `SQLITE_GUIDE_SHELL_MARKER_ACU`：只有"从未持久化"空壳允许注入 seedRows |
| 10 | 验证陷阱 | exportTableAsJson 的 14 表可能是 fallback padding，不代表物理表存在——验收必须看各表数据行数 + 控制台 not found/预检失败 |

## 五、修改守则

1. **动 schema/表结构** → 必须 rebuild 物理库（reloadStorageProvider），只镜像不 rebuild 是历史坑；列名避 SQLite 保留字。
2. **动写路径** → 检查四条写入来源是否都覆盖：mirror、vendor AI 填表、消息内面板记忆工作台、状态栏 App.vue。它们共享 `MysteryDatabaseFrontend.applyTableChangePlan` 串行队列（vendor AI 填表也走这里，但落盘各自独立）。
3. **动 loadFromChat/merge** → 同时考虑三分支（无快照/空壳/merged）+ 指导表标记语义 + delta 叠加。
4. **动模板** → 全局/preset/chat_override 三 scope + 建库时机。
5. **验收标准**：新开卡首轮控制台无 TABLE_NOT_FOUND/ROW_NOT_FOUND/insertRow failed，global_state/player_state 首轮有行；`[CRUD自愈]` warn 每表最多一次可接受。
6. **门禁**：`npm run verify:mfrs-gates`（含 verify-mfrs-sqlite-cold-start / table-change-adapter / mvu-core-mirror 等）。改 vendor/adapter/mirror 必须同步补门禁用例。
