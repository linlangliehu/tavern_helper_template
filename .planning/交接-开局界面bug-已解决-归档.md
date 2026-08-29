# 魔禁卡开局界面交互失灵 - 待解决问题交接

## 问题状态：🔴 待解决

用户在酒馆导入最新 PNG 后，仍反馈开局界面：开屏动画覆盖/点击"科学侧/魔法侧/角色介绍"无反应。本人已通过源码检查、index.yaml 嵌入检验、webpack 编译、tavern_sync 打包、PNG 二进制多次校验，也无法复现 root cause。现交给下一任会话根据本文档继续修复。

---

## 一、最核心的事实

### 1. 文件结构
- `src/魔法禁书目录模拟器/index.yaml` — 角色卡 YAML 真源（webpack 不从 src 直接打包）
- `src/魔法禁书目录模拟器/自定义开局/欢迎页.txt` — 开局 UI HTML 源码（被 index.yaml 「正则区」的 `[显示]渲染魔法禁书目录开局页` 正则通过 `替换为: |-` 内嵌）
- `scripts/gen-mjr-welcome-regex.cjs` — 同步脚本：把欢迎页.txt 内容注入 index.yaml 开局正则块内
- `tavern_sync.yaml` — 打包配置（本地文件路径：`src/魔法禁书目录模拟器/index`，即无扩展名的 index.yaml）
- `scripts/tavern_sync.mjs bundle "魔法禁书目录模拟器"` — 一键打包到 src/魔法禁书目录模拟器/魔法禁书目录模拟器.png

### 2. 最新修改流程（本次会话改动后）
1. 改完 `自定义开局/欢迎页.txt` 源码（增删 UI 结构/JS）
2. 跑 `node scripts/gen-mjr-welcome-regex.cjs` 把源码注入 index.yaml 正区块
3. 跑 `node node_modules/webpack-cli/bin/cli.js --config webpack.config.ts`
4. 跑 `node tavern_sync.mjs bundle "魔法禁书目录模拟器"` 生成 PNG
5. 用户在酒馆导入 PNG 测试

### 3. PNG 真实内容已验证（多次）
- ✅ 60 张开场白卡片（旧 53 张 + 新增 8 月 10 日、10 月 18 日、10 月 19 日、11 月 10 日、11 月下旬、12 月 3 日、12 月 10 日等共 60 张）
- ✅ 无手风琴（SCENE_ARCS/build()/mw-arc CSS/JS 已清除）
- ✅ 描述面板保留（ABILITY_DESC/MAGIC_DESC + #abilityDescPanel/#magicDescPanel div）
- ✅ 开场白日期改对了（10 月 11 日=后方之水战书；12 月 1 日=圣日耳曼；12 月 3 日=僧正；等等）
- ✅ 标签结构完整闭合（</script></body></html>）
- ✅ 世界书条目 37 项，含“魔法术式图鉴”“超能力图鉴”
- ✅ index.yaml 中「开局页」正则的「替换为」区块已含有所有最新 JS（ABILITY_DESC/goToStep/onclick switch-case 等）

### 4. 用户在酒馆的观察
- 导入 PNG 后酒馆开局界面：**开屏动画仍覆盖 + 所有按钮无响应**（即对应 switch-case 里 onclick='...' 没触发）
- 刷新浏览器/重启酒馆问题不变
- 但 webpack 编译、PNG chara 深度校验均通过

### 5. 根因分析（目前最可能）
- **JS 报错导致整个 onclick 不触发**：`custom-mw-reset-overlay` 等动态生成的 DOM 或 `event.currentTarget`/`ev` 变量识别问题，让点击一闪而过。
- **历史 onclick 闭包事件绑定代码折叠错误**：switch-case 大量行缩进/嵌套被破坏（本次仅做过删块，未动 switch-case 框架，但还没做语法级审计）。
- **index.yaml 正则区 YAML 特殊字符被错误转义**：`content="&quot;`&ndash;&ldquo;` 等字符在 YAML `替换为: |-` 块中可能注入非法字节。
- **gen-mjr-welcome-regex.cjs 的 fallout**：正则区 index 在 `正则区:` 后以 `  - 正则名称:` 这样的缩进出现，如果被误放且与脚本库末尾的脚本块混淆，理论会让 tavern_sync 误把它当脚本加载（虽然工具包已跑过 yaml-lint 通过）。

> **个人最大嫌疑：HTML/JS 内的双引号 + YAML `|-` 块缩进（8 空格）拼接的微妙错位，或 switch-case 某个大括号被手风琴删除时误删。**

---

## 二、待办任务（下一步会话请有序执行）

### 🔴 优先级 P0：找到交互失效的直接原因
1. 用 CDP 在酒馆里检查 `onclick` 是否真的绑定。**在酒馆控制台执行：**
```js
const card = document.querySelector('[data-act="scene"]');
console.log("card=", card);
console.log("onclick属性=", card?.outerHTML.slice(0, 500));
card?.click(); // 看是否触发
```
- 若 `card.onclick === null` 且没打印 `switch-case 命中`——说明 index.yaml/正则 的 inline onclick 没被解析进 DOM（可能被 HTML 转义链条破坏）。
- 若 click 有反应但 `data-act` 不进 switch——则 switch-case 逻辑在根上有语法错误。

2. 用 CDP evaluate_script 检查 `<script>` 是否解析报错：
```js
document.querySelector('#mfrs-welcome-root')?.innerHTML?.includes('ABILITY_DESC') // true / false
```
- 若 false——欢迎页 HTML 在浏览器里根本没进 DOM（inline 标签截断或乱码）。

3. 若上面两个皆 true，开始精查 switch-case：`const fullHTML = document.getElementById('mfrs-welcome-root').innerHTML`；看 `data-act="science"` 是怎么定义的、data-act 是否传 "side"。

### 🟡 备选兜底方案
如果 onclick 方案查不出问题，**彻底放弃 restore 到“术式图鉴时点”的极简版**：
1. 拿 `.planning/欢迎页-回滚前-手风琴版.bak.txt` 拼回：删手风琴部分 + 保留原版 UI 面板切换，不要自定义描述面板（以免引入新元素挂掉）。
2. 只保留 60 卡片 + 修改后日期/标签，不做描述面板 / 不做手风琴 / 无侧链交互。
3. 重新打包后先小范围测试。

### 🟢 另外保留给我下个会话的排查工具
- CDP 上传脚本 `scripts/cdp-upload-file.mjs`（注：需全局指向 node.exe，示例 cmd: `/mnt/d/Nodejs/node.exe scripts/cdp-upload-file.mjs`）
- 插件 MCP `sillytavern` evaluate_script 探测（列表各按钮 data-act 值等）
- index.yaml 结构合法化验证脚本：**暂时无**，建议新增或用 `js-yaml.safeLoad` 脚本检查（先写个小 .js 脚本读 index.yaml 逐段跑 YAML parse）

---

## 三、关键文件位置速查

| 文件 | 路径 | 描述 |
|---|---|---|
| 欢迎页源码（最新） | `src/魔法禁书目录模拟器/自定义开局/欢迎页.txt` | 当前含 60 卡片/描述面板/无手风琴 |
| index.yaml（最新内嵌） | `src/魔法禁书目录模拟器/index.yaml` | 已被 gen-mjr-welcome-regex 更新到开局正则区 |
| 同步脚本 | `scripts/gen-mjr-welcome-regex.cjs` | 必读：把.txt 注入 index.yaml 的正则 `[显示]渲染魔法禁书目录开局页` |
| 备份（手风琴版） | `.planning/欢迎页-回滚前-手风琴版.bak.txt` | 完整功能（含手风琴） |
| 备份（纯净版） | `.planning/welcome-visual-parity/preview-welcome.html` | 8-26 会话前版本（53 卡片，描述面板无） |
| 打包产物 | `src/魔法禁书目录模拟器/魔法禁书目录模拟器.png` | 最新 PNG（点击仍失效） |
| 角色档案修正 | `src/魔法禁书目录模拟器/世界观/角色档案/神之右席.txt` | 神之右席已修正（天罚 vs 圣母） |
| 图鉴 | `src/魔法禁书目录模拟器/世界观/{科学侧/魔法侧}/超能力图鉴.txt` / `魔法术式图鉴.txt` | 二图鉴已注入 index.yaml 并已注册 |

---

## 四、问题一句话摘要

**导入最新的 PNG 后，酒馆开局界面表现如"没有 JavaScript 的纯静态 HTML"**：开屏动画悬浮不关，科学侧/魔法侧/角色介绍/场景卡点击无响应。UI 来源源码已更新且 index.yaml 已同步，但界面仍不能工作。

## 五、交接给下个会话的建议起手式

1. 先在酒馆里执行 CDP `evaluate_script` 确认脚本是否真的被解析进 DOM；
2. 如果 DOM 里没 HTML，**核心问题在 YAML 转义或 webp 打包数据流**；
3. 如果 DOM 里有 HTML 但 onclick 无效，**核心问题在 onclick 定义被破坏或 switch-case 语法错误**；
4. 逐步验证：
   - 先打印 `document.querySelector('#mfrs-welcome-root')?.outerHTML.length`（判断 iframe 内有没有）
   - 查 Network response 里 chara 的 chunk 有多大 byte；确认 tar scraped 数据没乱掉
   - 如果都不行，用 preview-welcome.html 作为唯一直达源码——单文件 HTML，直接粘到 index.yaml `替换为` 里试一次

---

**写完时间：** 当前会话末段  
**留给下个会话的修正目标：** 让开局界面所有按钮能正常点击响应，至少恢复模式到"图鉴+旧开场白"原始但未崩坏的状态。最后必须实机核验酒馆导入后按钮点击真的执行 goToStep/switch-case。