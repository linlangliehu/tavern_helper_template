# 神秘复苏模拟器 8.13.14

**日期**：2026-07-13  
**主题**：C7 重发版 — production dist 真正交付 always-unlock + G1 门禁

## 问题

8.13.13 发布 PNG pin `28777ad`，该 commit 只改了源码与门禁，**未提交 production dist**。  
CDN 上的 hotfix bundle 不含 `generation_ended_always` / 发送解锁逻辑，招牌修复对用户不存在。  
`verify-mfrs-release-png` 只验 PNG 内自洽，验不出 dist 与源码脱节。

## 修复

- production rebuild：`dist/神秘复苏模拟器`（含 hotfix `generation_ended_always`）
- `CDN_REF` 指向含 dist 的 commit `d5cd98f`
- **G1** `scripts/verify-mfrs-dist-freshness.mjs`：publish 前置校验
  - CDN_REF 已推送
  - 工作区 dist 干净
  - production build 后 dist 与 pin 一致
- `publish-card` 集成 G1（`--dry-run` 跳过）

## 发布

| 项 | 值 |
|----|-----|
| 版本 | **8.13.14** |
| 功能/dist commit | `d5cd98f019f5` |
| CDN_REF | `d5cd98f019f53c00dc32ac4c909a914858cb962a` |
| cache | `…-v81314-c7-dist-rebuild` |
| 分支 | `codex/bf1-recovery`（待合 main） |

## 验证

- `node scripts/verify-mfrs-dist-freshness.mjs --ref d5cd98f…` 通过
- `verify-mfrs-release-png`：version=8.13.14, refs=7, cache=8, regex=33, scripts=8

## 使用

**请重导 8.13.14**。生成结束后发送应始终可点。  
若仍卡住：先点「停止」或刷新后再发。
