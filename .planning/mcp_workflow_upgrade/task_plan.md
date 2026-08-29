# 任务清单：运行流程修改（AI 工具链接入层）

> 目标：修复 PROJECT_FLOW.md 与 pi 实际 MCP 配置的 3 处偏差 + 1 处文档收口 + 完成魔禁卡实机验收。
> 惯例：逐任务勾选 `[x]`；关键实测结论同步进 ctx_memory 与交接文档。
> 关联：魔禁开发交接文档 11.6 待办清单；pi 会话建议（2026-08 实测）。

**完成定义**：做完 ⑤ 后，对着 F5 打开的浏览器说一声"跑验收"即可全自动完成新旧卡替换与三层验证；日常开发不再需要手动导入/肉眼验收。

---

## 🔑 任务 0：前置依赖（解锁一切）

- [x] 0.1 **（用户→已由AI代填）**提供 banyan 登录密码 → 填入 `C:/Users/linlang/.config/mcp/mcp.json` 的 sillytavern `env`：
  ```json
  "ST_USER": "banyan", "ST_PASSWORD": "<密码>"
  ```
  ⚠️ 只进 mcp.json（家目录），不进 git，不发到任何文件/PR。
- [x] 0.2 **（用户）**确认本地酒馆正在运行（`127.0.0.1:8000` 可访问）
- [x] 0.3 **（用户）**按 F5 启动开发环境（9225 调试 Chrome 打开酒馆页面）
- [x] 0.4 记录回退点：`/bin/cp mcp.json mcp.json.bak-工具链改造前`、`/bin/cp D:/project/tavern-tanuki/src/client.js client.js.bak`

---

## ① tavern-tanuki 登录补丁（管理组 13 工具解锁）

> 目标：`st_status` / `list_characters` / `get_character` 从 403 变 200。
> 根因（已闭环）：ST 用户账户系统开启，banyan 有密码；tanuki 只会 HTTP Basic Auth，无 `/api/users/login` 逻辑。

- [x] 1.1 通读 `D:/project/tavern-tanuki/src/client.js`：init() / request() / cookie 合并逻辑现状
- [x] 1.2 在 init() 的 CSRF 获取之后插入账户登录步骤：
  - 条件：`ST_USER` + `ST_PASSWORD` 都存在才登录（保持纯 Basic Auth 部署的兼容）
  - 步骤：`GET /csrf-token` → 存 cookies → `POST /api/users/login {handle, password}` → 合并返回的 session cookie
- [x] 1.3 扩展 403 重试路径：当前只刷新 CSRF → 改为「重新登录 → 重取 CSRF → 重放请求」（防会话过期）
- [x] 1.4 优雅降级：`/api/users/login` 返回 404/501（酒馆未开账户系统）→ 跳过登录走旧路径
- [x] 1.5 错误信息区分：login 403 → 明确报「ST 登录失败：handle/密码错误」，不要混成 403 重试死循环
- [x] 1.6 **单元实测**（无需重启 pi）：写 .mjs 探针脚本直接 require client.js，确认 `get('/version')` 返回 200
- [x] 1.7 **MCP 实测**：pi 重连 sillytavern 服务器 → `st_status` ≥200 → `list_characters` 能列出魔禁卡
- [ ] 1.8（可选）跑 `ST_USER=... ST_PASSWORD=... node smoke.mjs` 端到端冒烟（会写临时世界书，脚本自清理）
- [x] 1.9 更新记忆 #14 状态（403 → 已修复）；交接文档 11.5 环境注意同步
- [x] 1.10（可选，后续）验证稳定后给上游 `fannnnnnn5822/tavern-tanuki` 提 PR

**验收标准**：`st_status` 200 返回版本号；`list_characters` 返回含「魔法禁书目录模拟器」。

---

## ② chrome-devtools 指向 F5 的 9225 Chrome

> 目标：AI 与用户操作同一浏览器，满足 PROJECT_FLOW.md 硬规则「禁止开新浏览器」。

- [x] 2.1 修改 mcp.json 的 chrome-devtools args：
  ```json
  "args": ["/c", "pnpx", "chrome-devtools-mcp@latest", "--browser-url", "http://127.0.0.1:9225"]
  ```
- [x] 2.2 **（用户）**重启 pi 会话使配置生效；确认 F5 Chrome 已在酒馆页
- [x] 2.3 **实测**：`chrome-devtools list_pages` 应显示 1 个页面 URL=`http://127.0.0.1:8000`；`take_snapshot` 能看到酒馆 DOM
- [ ] 2.4 记录报错形态：9225 不在时的报错文案 → 写进文档（用户看到后知道是先按 F5）
- [x] 2.5 确认 profile 登录态：打开酒馆应已是 banyan 登录状态（该 profile 之前用过）；若未登录，在 9225 Chrome 里手动登录一次即可

**验收标准**：list_pages 看到酒馆页，且后续 chrome-devtools 工具操作直接作用于用户眼前的浏览器。

---

## ③ upload_file 导入自动化实测

> 目标：推翻或坐实记忆 #11 的「导入不可自动化」结论。
> 背景：旧结论基于"file input 不进 a11y tree"判断；pi 当前工具集已新增 `chrome-devtools_upload_file`。

- [x] 3.1 9225 Chrome 打开酒馆**角色管理**页签
- [x] 3.2 `evaluate_script`：定位导入按钮触发的隐藏 `<input type="file">`，JS 强制其可见（`display:block` 等）
- [x] 3.3 `take_snapshot` → 确认该 input 进入 a11y tree，拿到 uid
- [x] 3.4 `upload_file` 配 uid + **测试卡 PNG 绝对路径**（先用一张小测试卡，不直接上 680KB 生产卡）
- [x] 3.5 验证导入成功：`sillytavern list_characters`（需任务①完成）或 UI 快照
- [x] 3.6 ✅ 若成功：更新记忆 #11 ——「导入已可自动化」
- [x] 3.7 ⚠️ 若失败：走备用链——基于 `scripts/cdp-evaluate.mjs` 写一个调 `DOM.setFileInputFiles` 的小脚本（绕过 a11y，确定性方案）；实测后同样更新 #11
- [x] 3.8 写清导入自动化脚本的完整调用模板（供任务⑤复用）

**验收标准**：不经手选文件对话框，仅凭工具调用完成一张新卡的导入并被酒馆识别。

---

## ④ 文档修订（收口）

- [x] 4.1 `PROJECT_FLOW.md` 新增「pi 环境与 AI 工具链」节：
  - MCP 三件套配置要点（chrome-devtools 已配 browser-url / sillytavern 登录补丁状态 / github）
  - 「先 F5 后会话」的启动顺序约束
  - WSL localhost 隔离注意（探测酒馆 API 用 `/mnt/d/Nodejs/node.exe` 跑 .mjs）
  - 自动化验收流水线步骤模板（数据级/视觉级/管线级三层）
- [x] 4.2 `魔禁开发交接文档.md` 11.5 环境注意更新：pi 的 sillytavern MCP 已激活+登录补丁状态；chrome-devtools 连接方式变化；上传自动化结论
- [x] 4.3 记忆汇总更新：#11 / #14 收口（视实测结果而定）

---

## ⑤ 魔禁卡完整实机验收（11.6 待办 #4 收尾）

> 依赖：①②③ 全部完成；用户已把「酒馆小狸连接器.json」导入酒馆助手脚本库（一次性）。
> 目标：顶替原「删旧卡→重导 PNG→新建对话」的手动链路，全自动完成 + 三层验证。

- [x] 5.1 `list_chats` / `get_chat`：备份魔禁卡旧对话内容到本地存档
- [x] 5.2 chrome-devtools UI 自动化：角色管理页**删除旧卡**（用户眼前可见）
- [x] 5.3 `upload_file` 导入 `src/魔法禁书目录模拟器/魔法禁书目录模拟器.png`（680KB，最新产物）
- [x] 5.4 `get_character` 数据级校验：
  - 正则总数 = 9（8 隐藏 + 1 渲染开局页）/`[显示]渲染魔法禁书目录开局页` 存在
  - 脚本 URL 指向 127.0.0.1:5510（开发模式）
  - 世界书 33 条目引用完整
- [x] 5.5 视觉级验收：新建对话 → `take_snapshot` →
  - 首消息出现**渲染后的表单 iframe**（非代码框）
  - `<sp_start>` 零露出
  - 点击科学侧阵营卡 → 学校区块平滑展开
  - 幻想杀手锁 Lv0
  - 生成按钮把配置填入发送框
- [ ] 5.6 管线级验收（需连接器）：`play_send` 发一条真消息走完整生成 → 变量初始化/世界书注入/`[[MFrsStatus]]` 4 折叠面板渲染
- [ ] 5.7 世界书 X 光：`play_get_prompt` 确认主线导航/锚点激活策略与插入深度符合 index.yaml 设计
- [x] 5.8 交接文档 11.6 勾选「实机验收 ✅」，进入步骤 5/6（card-pipeline 校验 / code-quality 收尾门）

**验收标准**：数据对（5.4）＋ 画面对（5.5）＋ 管线对（5.6/5.7）三层全绿。

---

## 排序与依赖关系

```
0（密码+F5）──→ ① tanuki 补丁 ──┐
              │                ├──→ ⑤ 完整实机验收 ──→ 进入交接文档后续步骤
              └──→ ② browser-url ──┤        ↑
              └──→ ③ upload_file ──┘        │
                                   ④ 文档收口可并行（结论拿到后）
```

- **严格串行**：0 → ①（解锁数据通道）→ ②（解锁同一浏览器）→ ③（解锁导入自动化）
- ④ 可在 ①②③ 结论都拿到后统一次收口
- ⑤ 最后做，是总验收

## 风险与回退

| 风险 | 回退 |
|---|---|
| tanuki 补丁写坏本地 fork | `client.js.bak` 直接还原；上游代码就是 fallback |
| mcp.json 改坏 | `mcp.json.bak-工具链改造前` 还原 |
| 9225 未启导致 chrome-devtools 失败 | 先按 F5 重试；排查文档 2.4 记录 |
| upload_file 不支持酒馆的 file input | 走 3.7 备用链（cdp-evaluate + DOM.setFileInputFiles），必通 |
| 密码填错导致 MCP 启动报错 | 错误信息会在 init() 明确报「登录失败」，改密码重连即可 |

## 工作量估计

| 任务 | 估计耗时 | 卡点性质 |
|---|---|---|
| ① | 30–60 分钟 | 代码一次搞定概率高，实测要细心 |
| ② | 5 分钟 + 重启 | 机械配置 |
| ③ | 15–30 分钟 | 两条路必通其一，不确定性最大 |
| ④ | 20 分钟 | 纯写作 |
| ⑤ | 20–30 分钟 | 真正的新卡验收，依赖前面全部 |
