# 魔法禁书目录模拟器 1.1.5 发布记录

## 基本信息

- 发布日期：2026-10-02
- 版本：1.1.5
- 产物：`src/魔法禁书目录模拟器/魔法禁书目录模拟器.png`
- 产物大小：7,327,461 bytes
- SHA256：`85F84F5B4CCFADB030FB014D6203DC49786187279ED2D91E10ED7BD61328D486`
- CDN bundle 提交：`a9fb8d6f10f64da46b7af35d88425ac88101dd1d`
- CDN bundle 标签：`v8.15.178`

## 变更摘要

- 统一玩家能力使用、科学/魔法跨体系使用和物品实际消耗规则。
- 明确未声明能力、明确无能力和无术式开局保持 `能力档案=[]`。
- 保留具名 Level 0 能力（包括幻想杀手）并允许首轮补全具体描述。
- 修复 Tavern Helper 流式正文隐藏 `.mes_text` 时消息内四卡面板不可见的问题。
- 新增能力开局、面板挂载和重复写入相关离线门禁。

## 验证记录

- `MJR_ABILITY_PLACEHOLDER_GATE_OK`
- `MJR_OPENING_ABILITY_CONTRACT_OK`
- `MJR_MESSAGE_PANEL_MOUNT_OK`
- `MJR_INSERT_IDEMPOTENCY_OK`
- `YAML_OK`
- 改动文件 ESLint 通过
- 生产 webpack 构建成功；GitHub Actions `bundle` run `694` 成功
- PNG 内置版本：`1.1.5`
- PNG 内置 6 个 Tavern Helper loader，全部指向 `a9fb8d6f10f64da46b7af35d88425ac88101dd1d`

## 发布链路

1. 源码与 P0 门禁提交：`87009954fe04d8f87fb52eb0a0ff24e53f08eefc`
2. GitHub Actions bot bundle：`a9fb8d6f10f64da46b7af35d88425ac88101dd1d`
3. 最终 PNG、loader 锁定和发布记录提交：本文件所在发布提交

## CDN 验收边界

- 固定 SHA 的 `testingcf.jsdelivr.net`、`cdn.jsdelivr.net`、`gcore.jsdelivr.net`、`fastly.jsdelivr.net`、`quantil.jsdelivr.net` 节点均需以带缓存破坏查询参数的 HTTP 检查为准。
- CDN 内容必须与远程 `a9fb8d6f.../dist/魔法禁书目录模拟器/脚本/` 对应文件一致。
- jsDelivr 可能存在边缘缓存延迟；固定 SHA URL 已更新时，节点缓存状态不一致不代表 GitHub 产物未生成。

## 发布边界

- 本记录只覆盖魔禁 `1.1.5`。
- 不包含神秘复苏卡及其工作区运行态 `dist` 改动。
