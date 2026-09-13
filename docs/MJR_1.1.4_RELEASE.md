# 魔法禁书目录模拟器 1.1.4 发布记录

## 基本信息

- 发布日期：2026-09-13
- 版本：1.1.4
- 产物：`src/魔法禁书目录模拟器/魔法禁书目录模拟器.png`
- 产物大小：7,320,205 bytes
- SHA256：`ED9C6FBDB58BCEA681330558A84E01ED455FCEB80019CE4BDFC2130BA4E43A0D`
- CDN bundle 提交：`8335463073106397cfd48317735391d5c27d0525`
- CDN bundle 标签：`v8.15.175`

## 变更摘要

- 移除能力说明占位语生成链路
- 在 JSONPatch 权威入口加入能力字段 sanitizer
- 按能力名称稳定匹配旧值，避免数组下标误继承
- 将开局 `能力效果` / `实战运用` 基线改为空字符串
- 清理模型可见精确占位句，改为结构性质量约束
- 保留“无二次模型调用”方案，不恢复 `generateRaw`

## 验证记录

- `node scripts/verify-production-mode.mjs`
- `node scripts/verify-mjr-ability-placeholder-gate.mjs`
- `node scripts/verify-mjr-insert-idempotency.mjs`
- `node scripts/check-mjr-yaml.cjs`
- `pnpm build`
- 最终 PNG 内置版本：`1.1.4`
- 最终 PNG loader 数量：`6`
- 6 个 loader 全部指向 `8335463073106397cfd48317735391d5c27d0525`

## 发布链路

1. 源码修复：`c63e86a449a47e81e6810cc632caf82bc03b34fb`
2. 产物同步：`b1c1eec4ad78524456702ca2019d6e2e270f5831`
3. Bot bundle：`8335463073106397cfd48317735391d5c27d0525`
4. 最终 loader 已从 `93505c0f05c0a9de58a8aef817230bec56e2b30c` 更新到 `8335463073106397cfd48317735391d5c27d0525`

## 验收边界

- 本记录只覆盖 `1.1.4` 的魔禁改动。
- 不包含神秘复苏车道改动。
- 不包含本地工作区中的其他未提交内容。
