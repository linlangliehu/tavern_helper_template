# 神秘复苏模拟器 8.13.36

**日期**：2026-07-16

**主题**：沉浸 HUD 中栏工作区

## 范围

- 档案中栏：线索、厉鬼档案、人物、地点四类只读预览，线索可见性 fail-closed，数据库 revision 实时刷新。
- 记忆中栏：事件纪要、收录档案、收录规律三表新增、编辑、删除；字段与校验读取数据库前端配置。
- 删除安全：记忆删除要求人工危险确认、记录快照复核与闭包 capability，裸调用返回 `UNAUTHORIZED`。
- 抽卡中栏：卡池选择、单抽、十连与结果内联渲染，保留完整面板入口。
- 真页修复：`hudRowField` 先精确匹配列名，再执行 `includes` 回退，避免“纪要”误取“纪要编号”。

## 发布元数据

| 项 | 值 |
|----|-----|
| 版本 | **8.13.36** |
| CDN_REF | `9c5a467a34818ed4a4bd758e3ce6b76f160a1d3f` |
| production dist | `9c5a467a348` |
| cache | `v81336_20260716_01` |
| 正则 / 脚本约束 | 33 / 8（名称、顺序、启用状态保持） |

## 发布步骤

- [x] Task #1–#5 源码与真页验收完成，功能分支已推送。
- [x] production dist 提交已推送并通过 G1 远端可达/重构建一致性验证。
- [x] release constants 与开发版 YAML 更新为 8.13.36 / CDN_REF / cache。
- [x] 运行 `pnpm publish-card 神秘复苏模拟器发布版` 生成发布版 YAML/PNG。
- [x] 验证角色卡 version/ref/cache、33 条正则、8 项脚本及 chara/ccv3 数据一致性。
- [ ] 提交发布物、推送功能分支与 `main`、核对 `v8.13.36` 标签。

## 验证清单

- [x] 发布前功能门禁：聚合 7/7，archive-ui phase5=232 checks，database frontend P3 通过。
- [x] production dist 与远端 CDN_REF、当前源码重构建一致。
- [x] 开发版和发布版 YAML 元数据一致。
- [x] 发布 PNG 的 chara/ccv3：version=8.13.36、refs=7、cache=8、regex=33、scripts=8。
- [x] CDN 目标文件可读取且与 `CDN_REF` 中的 dist 内容一致。

## 分阶段精确暂存白名单

发布元数据与最终产物仅允许以下路径：

- `scripts/mfrs-release-constants.mjs`
- `src/神秘复苏模拟器/index.yaml`
- `src/神秘复苏模拟器发布版/index.yaml`
- `src/神秘复苏模拟器发布版/神秘复苏模拟器.png`
- `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`
- `docs/mfrs-redesign-phase0/RELEASE_8.13.36.md`
- `docs/mfrs-redesign-phase0/README.md`
- `task_plan.md`
- `findings.md`
- `progress.md`

禁止 `git add -A` / `git add .`；发布 PNG 只允许由 `publish-card` 生成。
