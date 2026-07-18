# β / 8.13 本地验收 · 你只需导入 + 对话

**覆盖**：全屏 HUD + **A–E**（菜单稳定 / 输入皮 / 信息密度 / 菜单文案 / 性能）

**我已准备好的：**

| 项 | 状态 |
|----|------|
| `pnpm build` + dist 含全屏壳 + A–E | 已完成 |
| 门禁 archive-ui phase5（含 F1） | 已通过 |
| 本机静态 dist | **推荐** `pnpm mfrs:dev-server` → `http://127.0.0.1:5510`（占用则 5511+）；旧 Live Server `5500` 仅遗留 |
| 测试卡 PNG | 优先 `pnpm mfrs:dev-card` 生成 `.local/mfrs-dev/*-DEV-*.png`；本目录 β PNG 为历史产物 |
| 仓库 `index.yaml` | **未**留下 localhost（打包后已还原） |
| 正式发版 | 走 `publish-card` + CDN，不用本地卡 |

**重新生成本地验收卡（改代码后）：**

```powershell
# 推荐：当前 worktree watch/dev 产物 + 派生 DEV 卡
pnpm mfrs:preflight
pnpm mfrs:dev-server
# 另开终端：
pnpm watch   # 或 MFRS 任务；端口冲突时设 MFRS_SKIP_HMR_SERVER=1
pnpm mfrs:dev-card -- --port 5510

# 历史 β 脚本（仍可能写 5500，仅兼容）：
# pnpm build
# node scripts/prepare-mfrs-beta-local-test.mjs
```

---

## 你要做的（约 10–20 分钟）

### 1. 确认静态服务还活着

浏览器打开（端口以预检/服务日志为准，默认 5510）：

```text
http://127.0.0.1:5510/__mfrs_dev_identity
http://127.0.0.1:5510/dist/神秘复苏模拟器/脚本/消息内面板/index.js
```

身份 JSON 的 `workspace/branch/commit` 须等于当前 worktree；JS 文本里应能搜到 `mfrs-hud-shell`。若 404：在**当前 worktree** 启动 `pnpm mfrs:dev-server`，不要假设主仓库 Live Server `5500`。

### 2. 导入测试卡

优先导入：

```text
.local/mfrs-dev/神秘复苏模拟器-DEV-<branch>.png
```

（由 `pnpm mfrs:dev-card` 生成。）历史 β 卡 `docs/mfrs-redesign-phase0/local-test/神秘复苏模拟器-β本地验收.png` 仅作兼容。

- 可新建角色名，避免覆盖正在用的发布版。  
- **不要**用正式「神秘复苏模拟器发布版」做本地 feature 验收（仍吃 CDN）。

### 3. 新开聊天 → 真实对话几轮

让 AI 产出带 `stat_data` 的楼层（正常推演即可）。重点看：

1. 进卡是否 **自动全屏** 三栏  
2. 中栏是否能舒服读正文  
3. 默认 **没有** 半屏档案柜  
4. 点「柜」能开，遮罩/关闭/Esc 能关  
5. 拟办只填输入、不自动生成  
6. 壳内发送正常  
7. 「退出沉浸」或 `Ctrl+Shift+G` 后 ST 正常  
8. 切其他卡无残留壳；切回可再全屏  

完整 14 项见 `../TASKLIST_BETA.md` §4B。

### 4. 测完回我一句

- 「全过」→ 再商量是否发 **8.12.0**  
- 「第 X 项挂了：……」→ 我按项修  

可选：全屏 / 退出后 / 柜开 各截一张。

---

## 分工

| 你 | 我 |
|----|----|
| 导入 PNG、对话、点 14 项 | build / 门禁 / 测试卡脚本 / 修 bug /（批准后）发版 |

**禁止**：把本测试卡当正式分发；正式包仍走 `publish-card` + CDN。
