# Phase 8 打包静态验证报告

- 状态：passed-offline-static
- 生成时间：2026-09-08T13:55:01.400Z
- 产物：`D:\project\tavern_helper_template\src\魔法禁书目录模拟器\魔法禁书目录模拟器.png`
- 大小：7149.2 KB
- SHA256：`708204b857813f7f26fc4194434999ffa320d93c2db06e5c1fbe0d818fad07ac`
- 版本：`1.1.2`
- 时间层 / 分组 / Opening：4 / 106 / 114
- 正则时间层 / 分组 / Opening：4 / 106 / 114
- 自定义开场控件：保留
- 创约15：不存在
- 真实 SillyTavern 验收：passed-user-sillytavern-read-only

## 通过项
- PNG signature and text chunks parse successfully
- chara/ccv3 payload decodes to valid JSON
- Card version is 1.1.2
- Packaged welcome exactly matches source welcome
- Packaged display regex exactly matches transformed source welcome
- 114 unique openings are embedded
- 114 unique openings are embedded in the display regex
- All compatibility and metadata payloads parse as JSON
- Compatibility fields match the current schema contract
- Metadata matches Phase 6 initialization records
- All node-chain IDs are present in the packaged worldbook
- 4 time layers and 106 display groups are embedded
- 4 time layers and 106 display groups are embedded in the display regex
- Genesis 15 is absent
- Custom opening controls are preserved
- Pinned CDN interface script is present and contains Phase 8 logic

## CDN 分发验证

- 6 个脚本全部固定到 `ba1ff77c9abbf140ff622bab41721b6dcc6d7365`。
- 真机资源记录：6 个固定 CDN 脚本均为 HTTP `200`。
- 本地开发地址 `127.0.0.1:5510` 残留：0。
- 真机宿主：SillyTavern `1.18.0`，Tavern Helper `4.9.3`。
