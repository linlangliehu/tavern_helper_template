# 勿导入本目录下的旧打包 JSON

**发布真源**：`pnpm publish-card` → `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`

| 文件 | 状态 |
|------|------|
| `神秘复苏模拟器.json.deprecated-2026-06-03` | 2026-06-03 旧快照：**禁止**当正式卡导入 |

相对现行 `index.yaml` / 发布 PNG 的漂移（审计 H9）：

- 正则约 9 条（现行约 33）
- 脚本库约 3 项 localhost（现行 8 项 CDN）
- 旧【推演选项】/状态面板/Analysis 协议
- 世界书条目数落后

需要可导入快照时，只从**当前** `index.yaml` + 世界书走 `publish-card` 重打包，不要手改或复活上述 deprecated JSON。
