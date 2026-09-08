# Phase 8 角色卡打包报告（正则同步修复版）

## 结论

- 状态：**离线打包、静态验证与真实 SillyTavern 只读验收通过**
- 产物：`src/魔法禁书目录模拟器/魔法禁书目录模拟器.png`
- 版本：`1.1.2`
- 大小：`7149.2 KB`
- SHA256：`708204B857813F7F26FC4194434999FFA320D93C2DB06E5C1FBE0D818FAD07AC`
- PNG payload：`ccv3`，`chara_card_v3 / 3.0`

## 本轮修复

### 1.1.2 CDN 分发收尾

1. 将 6 个脚本加载地址从 `127.0.0.1:5510` 改为固定 CDN 提交 `ba1ff77c9abbf140ff622bab41721b6dcc6d7365`。
2. 卡版本从 `1.1.1` 提升为 `1.1.2`。
3. 重新生产构建、定向打包并恢复构建钩子产生的无关 dist 时间戳噪音。
4. 真机只读验收确认 6 个 CDN 脚本均为 HTTP `200`，且无本地 `5510` 请求。

真实酒馆验证发现：卡内世界书的欢迎页已是新版，但渲染 DOM 仍是旧版。根因是 `index.yaml` 中 `[显示]渲染魔法禁书目录开局页` 的 `替换为` 仍为旧 HTML。

本轮处理：

1. 确认旧正则的生成规则：保留 `<style>` 到 `</body>` 前的正文片段，去除 `<!DOCTYPE>`、`<html>`、`<head>`、`</head>`、`<body>`、`</body>`、`</html>` 外壳，并按旧正则格式逐行去缩进。
2. 添加 `phase8-sync-welcome-regex.mjs`，先证明旧正则与旧欢迎页转换结果逐字符一致，再同步最新欢迎页。
3. 将卡版本从 `1.1.0` 提升为 `1.1.1`，便于导入后识别新包。
4. 扩展 `phase8-package-validation.mjs`，同时校验卡内世界书与卡内显示正则。
5. 重新生产构建、定向打包并恢复构建钩子误写的无关 PNG。

## 执行记录

1. `pnpm build`：成功；仅出现与本次目标无关的既有前端体积警告。
2. `node tavern_sync.mjs bundle 魔法禁书目录模拟器`：成功。
3. `node .planning/magic-opening-restructure-20260908/phase8-package-validation.mjs`：成功。
4. `node scripts/verify-png-chara-v2.mjs`：退出码 0。
5. `node scripts/verify-worldbook-pollution-gate.mjs --max-enabled-length 8000 src/魔法禁书目录模拟器/魔法禁书目录模拟器.png`：成功。
6. `node scripts/verify-mjr-regex-conflict.mjs`：确认 `sp_start` 仅由开局页显示正则处理，无旧的双正则冲突。
7. `node scripts/_check_welcome.mjs src/魔法禁书目录模拟器/魔法禁书目录模拟器.png`：确认卡内欢迎页为 114 条、长度 400835。

## 静态验证

### 世界书欢迎页

- 时间层：4
- 欢迎页分组：106
- Opening：114
- 唯一 Opening ID：114
- `data-compat` 可解析：114
- `data-meta` 可解析：114
- node-chain 记录：98
- 卡内世界书需引用的节点 ID：541，全部存在
- 创约15：不存在
- 自定义开场控件：保留
- 欢迎页源文件与打包内容：完全一致

### 卡内显示正则

- 时间层：4
- 分组：106
- Opening：114
- 唯一 Opening ID：114
- `data-compat`：114
- `data-meta`：114
- 与源欢迎页转换结果：逐字一致
- `disabled=false`、`markdownOnly=true`、`promptOnly=false`
- 自定义开场控件：保留
- 创约15：不存在

## CDN 只读检查

本轮只检查，不混入依赖升级：

| 引用 | 当前 | 检查结果 | 处理 |
|---|---:|---|---|
| `@fortawesome/fontawesome-free` | `6.4.0` | 6.x 最新 `6.7.2`，总最新 `7.3.1`，两个直连 URL 均可用 | 保留锁定版本 |
| `MagicalAstrogy/MagVarUpdate` | `0.171.0` | 最新 `0.183.0`，新旧直连 URL 均可用 | 保留锁定版本 |
| `StageDog/tavern_resource` | `0.3.446` | 最新标签 `0.3.450`，两个直连 URL 均可用 | 保留锁定版本 |
| `linlangliehu/mfrs-img` | `d86c74d` | 最新提交 `2d700a3`，但两者间只改 `README.md` 与 `preview/intro_preview.html`，实际图片未变 | 保留锁定提交 |
| `linlangliehu/bgm` | `main` 分支 | raw URL 无版本锁；文件最新提交 `7f1be03` | 保留现状 |

未升级原因：本次是欢迎页正则热修，MagVar、tavern_resource 与 FontAwesome 均涉及运行时行为或视觉兼容，需单独升级并做真机回归。

## 回滚

- 正则同步前 `index.yaml`：`phase8-rollback/index-pre-regex-sync.yaml`
  - SHA256：`F8358AFC06530A3233C7FA479C20E9BBD8509E10172EF67C07676F10133EF740`
- 正则同步前 PNG：`phase8-rollback/魔法禁书目录模拟器-pre-regex-sync.png`
  - SHA256：`1266AC301EE0F5C648BD9113549359CF3A0A069BF21D083BCBF9E7A89A9C6B44`
- Phase 8 初始回滚 PNG：`phase8-rollback/魔法禁书目录模拟器-pre-phase8.png`

## 范围控制

仓库构建钩子曾顺带重打 `src/神秘复苏模拟器/神秘复苏模拟器.png`。该无关产物已恢复到构建前哈希：

`AF77CCA5510F6BCA6584736889F40FD662BA59BAFF2EB97D92DA1E09ECB09D57`

## 真实酒馆验收

已通过 `1.1.2` 只读真机验收。当前宿主运行时证据：

- 当前选中角色：`魔法禁书目录模拟器`，`characterId=10`，版本 `1.1.2`。
- 世界书：114 条；正则：7 条。
- 卡内目标开局页正则：4 层、106 组、114 个唯一 Opening、114 组兼容/元数据载荷。
- 实际 DOM：`#mfrs-welcome-root` 存在，4 个时间层、106 个分组、114 个开场节点。
- 114 组 `data-compat` / `data-meta` 全部可解析，无空值或坏 JSON。
- 自定义开场控件保留；无 `创约15`。
- 运行环境：SillyTavern `1.18.0`，Tavern Helper `4.9.3`。
- 运行时生产构建标记：`界面美化` source commit `62255fd`，built at `2026-09-08T12:03:01.341Z`。
- CDN 分发：6 个脚本固定到 `ba1ff77c`，全部 HTTP `200`；本地 `5510` 请求为 0。
- 结论：**Phase 8 修改已在真实 SillyTavern 宿主中成功生效**。
