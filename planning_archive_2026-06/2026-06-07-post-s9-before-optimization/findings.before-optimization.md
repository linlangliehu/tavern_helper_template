# Findings

## 2026-06-07：S9 发布验证结论

**结论：** `Schema/CHECK 约束不合规类` 的通用防线已经正式发布到 `神秘复苏模拟器发布版` `6.12`。发布链路从资源提交、loader 回填、发布包生成、CDN 校验到发布卡真页冒烟复测均闭合；本次复测没有新的原始 SQLite `CHECK constraint failed`、SQL Mode Error 或 SqlTableService Error。

**发布证据：**
- 资源提交：`70fbe7d9beaf7565783be9d935f499fafdd88dbc`，提交信息 `fix: harden sql schema check constraints`。
- loader 回填提交：`82261c07f911452c8865625adc122cc19388c9c5`，标签 `v0.0.86`；marker/cache 为 `mfrs-schema-check-constraints-6-12` / `phase124-schema-check-constraints-6-12`。
- 发布提交：`9ba8f98a39d0b869f1e14b29e7a405026baba3ad`，标签 `v0.0.87`；提交信息 `chore: release schema check guard 6.12`。
- 最终远端状态：`HEAD==origin/main==9ba8f98a39d0b869f1e14b29e7a405026baba3ad`。

**验证证据：**
- 静态与回归检查均通过：`git diff --check`、`node --check vendor\shujuku-sp-fork\index.js`、`node --check scripts\verify-sql-debug-regressions.mjs`、两份 SQL 模板 JSON parse、`node scripts\verify-sql-debug-regressions.mjs`、`npm run build`。
- 回归脚本覆盖 14 表、DDL constraint registry、执行前 schema/CHECK 预检、枚举别名归一化、SyncBridge 坏行跳过、自动生成 CHECK fixtures、旧表名/旧列/SQL 清洗/Bad Gateway/dashboard 分类；仅有预期 Node `node:sqlite` experimental warning。
- 发布版 YAML 与 PNG `chara`/`ccv3` 元数据均包含 `6.12`、`82261c07...`、`phase124-schema-check-constraints-6-12`，不含旧 `6.10`、`66e4c2e4...`、`phase122-incomplete-values-6-10`。
- CDN release YAML、数据库 loader、数据库前端 loader、vendor 均返回 200；vendor 包含 `parseDDLConstraintRegistry_ACU`、`validateSqlStatementsAgainstConstraintRegistry_ACU` 与 `SQL schema/CHECK`。

**真页证据：**
- CDP `9222` 连接 `http://127.0.0.1:8000/`，发布卡为 `characterId=3` / `神秘复苏模拟器发布版`。
- runtime marker/API marker 均为 `mfrs-schema-check-constraints-6-12`。
- 权威入口 `SP·数据库 III -> 高级工具 -> 运行日志` 的最新 `21:42:57.xxx` 行只有 5 条 SyncBridge warn，均为 `chronicle.chronicle_text` 种子坏行已跳过以避免 SQLite CHECK 失败。
- 最新发布冒烟复测行中 `CHECK constraint failed`、`ERROR SQL Mode`、`ERROR SqlTableService`、`near "INSERT"`、`near "WHERE"`、`incomplete input`、`log_summary`、`event_summary` 计数均为 0。

**边界：** 运行日志里仍有 `19:08` 的旧 `global_state has no column named game_time` error，这是历史残留，不属于本次发布冒烟复测。`AGENTS.md`、`dist/神秘复苏模拟器/界面/状态栏/index.html`、planning、截图、备份和临时 Chrome profile 没有纳入发布提交。

## 2026-06-07: S8 真实页权威日志复测完成

**Conclusion:** 在真实 SillyTavern 页面 `http://127.0.0.1:8000/` 下，当前本地 S8 patched runtime 没有再把 `Schema/CHECK 约束不合规类` 问题以原始 SQLite `CHECK constraint failed` / `ERROR SQL Mode` / `ERROR SqlTableService` 形式写入 SP·数据库 III 运行日志。

**Runtime evidence:**
- CDP `9222` 页面 marker/API marker 均为 `mfrs-local-s8-schema-check-regression`。
- SP·数据库 III 旧 UI 显示当前聊天 `神秘复苏模拟器 - 2026-06-07@15h50m00s196ms`，SQLite 模式可用，数据库状态为 `已加载 (14个表格, 5条记录)`。
- 权威日志以 `SP·数据库 III -> 高级工具 -> 运行日志` 为准。S8 前历史基线含 5 条旧行，其中 `15:54:28.980/997` 有旧版原始 `CHECK constraint failed`、`ERRORSQL Mode`、`ERRORSqlTableService`；这些没有计入 S8 新增错误。

**Controlled SQL evidence:**
- `UPDATE supernatural_events SET handling_status='爆发中' WHERE event_code='__S8_NONEXISTENT__';` 在 SQL 控制台执行成功，结果为 `0 行受影响`，未新增原始 CHECK/SQL 错误。
- 更强样本 `INSERT INTO supernatural_events ... handling_status='爆发中' ... event_code='__S8_TEMP__'` 被执行前 schema/CHECK 预检拦截，结果区显示 `SQL schema/CHECK 约束不合规` 和 `已拦截，未进入 SQLite`。
- 随后查询 `event_code='__S8_TEMP__'` 返回 `0 行`，确认临时坏行没有进入 SQLite、没有污染数据。

**Natural flow evidence:**
- 发送自然行动“我不播放音频，先把手机静音并退到门边，用鬼档案观察网页与走廊的异常变化。”后，聊天长度到 7，新增助手回复已生成。
- 最终运行日志仅有 2 条新 SyncBridge warn，均为 `chronicle.chronicle_text` 种子坏行被 `已跳过该行以避免 SQLite CHECK 失败`。
- 新日志中 `CHECK constraint failed`、`ERROR SQL Mode`、`ERROR SqlTableService`、`near "INSERT"`、`near "WHERE"`、`incomplete input`、`log_summary`、`event_summary` 计数均为 0。

**Boundary:** S8 只做真实页验证与 planning 更新；未构建、未提交、未推送、未发布。

## 2026-06-07: S7 registry-driven CHECK 回归完成

**Conclusion:** CHECK 约束回归现在不再只靠手写样本。回归脚本会从当前两份模板 DDL 解析出的 constraint registry 自动生成非法写入 fixture，覆盖 enum、长度、数值范围、GLOB、非空和 NOT NULL 约束，并确认这些 SQL 会在进入 SQLite 前被字段级预检拦截。

**Regression evidence:**
- `scripts/verify-sql-debug-regressions.mjs` added `buildGeneratedConstraintViolationCases()` and `testGeneratedConstraintViolationFixtures()`.
- Generated fixtures use `UPDATE table SET column=value WHERE row_id=1` and are derived from `parseDDLConstraintRegistry_ACU()`, so新增 DDL CHECK 字段会自动进入回归覆盖。
- Every generated bad SQL must throw `SQL schema/CHECK 约束不合规`, must include `已拦截，未进入 SQLite`, and must not contain raw SQLite `CHECK constraint failed`.
- Existing hand-written fixtures remain for `handling_status='爆发中' -> 失控扩散`, unknown enum interception, risk-level normalization, chronicle text length/code mistakes, unknown table/column classification, SQL fragment cleaning, Bad Gateway classification, and dashboard classification.

**Verification:** `node --check scripts\verify-sql-debug-regressions.mjs`, `node --check vendor\shujuku-sp-fork\index.js`, `git diff --check`, and `node scripts\verify-sql-debug-regressions.mjs` passed. The only warning was Node's expected `node:sqlite` experimental warning.

## 2026-06-07: S5-S6 模板提示词与日志可读化完成

**Conclusion:** `Schema/CHECK 约束不合规类` 现在不只靠运行时兜底。两份 SQL 模板已经把所有 DDL 枚举字段的允许值写进提示词，并明确禁止高风险自然语言近义词；运行日志也能区分“已归一化 / 已拦截 / 已跳过 seed 行”，并统一归到 dashboard 的 SQL schema/CHECK 约束类。

**Template evidence:**
- `src/神秘复苏模拟器/数据库/神秘复苏表格SQL_v1.json` and `src/神秘复苏模拟器发布版/数据库/神秘复苏表格SQL_v1.json` now document enum hard constraints for all current enum CHECK fields.
- Covered fields: `supernatural_events.handling_status`, `ghost_archives.containment_status`, `clues.reliability`, `clues.verification_status`, `clues.visibility`, `characters.presence_status`, `characters.life_status`, `locations.supernatural_status`, `locations.lockdown_status`, `action_suggestions.option_key`, `action_suggestions.death_risk_level`, and `action_suggestions.revival_risk_level`.
- High-risk forbidden synonyms are visible in prompts, including `爆发中/处理中/已解决`, `已收容/临时控制`, `高可信/已证实/后台记录`, `现场/活着/下落不明`, `鬼域中/黄金封存`, and `选项A/极低/极高/严重`.

**Runtime evidence:**
- `vendor/shujuku-sp-fork/index.js`: successful enum/value normalization now logs `[SqlNormalizer] SQL schema/CHECK 约束已归一化`, with table, field, original value, normalized value, and allowed values where available.
- Preflight failures now end with `已拦截，未进入 SQLite。`, so users can tell the bad SQL was stopped before raw SQLite CHECK execution.
- SyncBridge seed-row failures continue to show table label, display name, row number, field/value detail, and `已跳过该行以避免 SQLite CHECK 失败`.
- Dashboard classification recognizes normalized, intercepted, skipped-seed, and raw constraint forms as `sqlConstraintIssue`.

**Regression evidence:** `scripts/verify-sql-debug-regressions.mjs` now asserts dev/release enum prompt docs match, all allowed values and forbidden aliases remain present, normalization debug logs include the S6 details, preflight errors include the intercepted result, and dashboard fixtures classify all three handling outcomes.

**Verification:** `node --check vendor\shujuku-sp-fork\index.js`, `node --check scripts\verify-sql-debug-regressions.mjs`, JSON parse for both templates, `git diff --check`, and `node scripts\verify-sql-debug-regressions.mjs` passed. The only warning was Node's expected `node:sqlite` experimental warning.

**Boundary:** no build, dist refresh, commit, push, publish, CDN backfill, or real-page smoke was performed in S5-S6.

## 2026-06-07: S4 SyncBridge 行级 constraint 校验完成

**Conclusion:** SyncBridge 从 sheet seed 数据生成 SQLite INSERT 前，现在会复用 DDL-derived constraint registry 做通用行级校验。坏 seed 行会被跳过并产生可读 `[SyncBridge]` warn，合法行和表结构继续保留；这避免了 seed 脏数据把原始 SQLite `CHECK constraint failed` 写进运行日志。

**Fix evidence:**
- `vendor/shujuku-sp-fork/index.js`: `generateInserts()` now normalizes row values first, then validates the normalized row against `parseDDLConstraintRegistry_ACU(sheet.sourceData.ddl)`.
- Row validation reuses the S2 cell validator, covering enum values, text length, numeric ranges, GLOB patterns, non-empty `TRIM(col) <> ''`, and explicit `NULL`.
- The old chronicle-only seed guard was replaced by generic row validation, so `chronicle.chronicle_text='SP0001'` is handled by the same path as other CHECK violations.
- SyncBridge warnings now include the table label, display name, row number, field, violation detail, and “已跳过该行以避免 SQLite CHECK 失败”.
- Dashboard classification now treats `SQLite CHECK 失败` SyncBridge warnings as `sqlConstraintIssue`.

**Regression evidence:** `scripts/verify-sql-debug-regressions.mjs` now captures `logWarn_ACU` and verifies bad seed rows are skipped with readable warnings for `chronicle_text='SP0001'`, `action_suggestions.option_key='E'`, `action_suggestions.row_id=5`, invalid `global_state.game_time`, `world_pressure=120`, blank `check_suggestions.display_text`, and blank `dice_command`. It also confirms valid rows still write into in-memory SQLite.

**Verification:** `node --check vendor/shujuku-sp-fork/index.js`, `node --check scripts/verify-sql-debug-regressions.mjs`, `git diff --check`, and `node scripts/verify-sql-debug-regressions.mjs` passed. The only warning was Node's expected `node:sqlite` experimental warning.

**Error note:** one auxiliary review probe used Bash heredoc syntax (`node - <<'NODE'`) in PowerShell and failed with a shell parse error. It was not part of the implementation gate and was not repeated.

## 2026-06-07: S3 通用枚举别名归一化完成

**Conclusion:** `schema_check_enum_violation` 的枚举非法值现在有两层处理：能确定语义的自然语言别名先归一化为合法枚举值，不能确定的值继续由 S2 schema/CHECK 预检拦截。当前日志样本 `supernatural_events.handling_status='爆发中'` 会被改写为 `失控扩散`；`handling_status='热闹中'` 不会被猜测，会产生可读字段级拦截。

**Fix evidence:**
- `vendor/shujuku-sp-fork/index.js`: added centralized `SQL_ENUM_ALIAS_RULES_ACU` keyed by `table.column`.
- Covered enum fields include `supernatural_events.handling_status`, `ghost_archives.containment_status`, `clues.reliability`, `clues.verification_status`, `clues.visibility`, `characters.presence_status`, `characters.life_status`, `locations.supernatural_status`, `locations.lockdown_status`, `action_suggestions.option_key`, `action_suggestions.death_risk_level`, and `action_suggestions.revival_risk_level`.
- `tryNormalizeInsertValues()` and `tryNormalizeUpdateValues()` now capture the SQL table name and pass it into enum alias normalization, so aliases are resolved by `table.column` rather than only by column name.
- `generateInserts()` now passes `tblName` into the existing value normalizer so seed INSERT generation can share enum alias normalization. This is limited to value normalization and does not implement S4 row-level SyncBridge constraint validation.

**Regression evidence:** `scripts/verify-sql-debug-regressions.mjs` now checks cross-table enum aliases, `handling_status='爆发中' -> '失控扩散'`, `handling_status='处理中' -> '对抗中'`, multi-row INSERT normalization, non-enum text such as `public_summary='爆发中但这里只是摘要'` staying untouched, unknown `handling_status='热闹中'` still being intercepted, and generated seed INSERTs normalizing `option_key='选项A'` plus risk aliases before an in-memory SQLite write.

**Verification:** `node --check vendor/shujuku-sp-fork/index.js`, `node --check scripts/verify-sql-debug-regressions.mjs`, `git diff --check`, and `node scripts/verify-sql-debug-regressions.mjs` passed. The only warning was Node's expected `node:sqlite` experimental warning.

## 2026-06-07: S2 schema/CHECK 执行前预检完成

**Conclusion:** `schema_check_enum_violation` 这类“表列存在但值违反 CHECK”的 SQL 现在可以在进入 SQLite 前被字段级预检拦截。当前 S2 只做确定性校验，不做 S3 的通用枚举别名归一化；因此 `supernatural_events.handling_status='爆发中'` 会产生可读错误，而不是自动改写。

**Fix evidence:**
- `vendor/shujuku-sp-fork/index.js`: added `extractSqlMutationValuesForConstraintCheck_ACU()` and `validateSqlStatementsAgainstConstraintRegistry_ACU()`.
- `SqlTableService.applyEdits()` and `executeMutation()` now call the constraint preflight before `runBatch()` / `run()`.
- Runtime registry comes from `SqlTableService._getKnownSqlConstraintRegistry()`, collecting DDL from the current chat template plus `currentJsonTableData_ACU`.
- Covered checks: enum values, text length, numeric ranges, GLOB patterns, `TRIM(col) <> ''`, and explicit `NULL` for `NOT NULL` columns.

**Regression evidence:** `scripts/verify-sql-debug-regressions.mjs` now fixes the S2 gate for `handling_status='爆发中'`, verifies legal `handling_status='失控扩散'` passes, and covers `chronicle_text='SP0001'`, `world_pressure=120`, `code_index='P0001'`, blank `display_text`, and `name=NULL`.

**Verification:** `node --check vendor/shujuku-sp-fork/index.js`, `node --check scripts/verify-sql-debug-regressions.mjs`, `git diff --check`, and `node scripts/verify-sql-debug-regressions.mjs` passed. The only warning was Node's expected `node:sqlite` experimental warning.

## 2026-06-07: Hidden SP log issues after 6.11 visible pass

**Conclusion:** the original `UPDATE ... SET ..., WHERE ...` bug did not reproduce in visible page counts after the 6.11 local loader was restored, but hidden SP database log DOM rows exposed two separate follow-up issues:

- `event_summary` is another legacy/incorrect event chronicle table name. Runtime should classify it like `log_summary`, `simulation_summary`, and `summary_logs`, and templates should explicitly forbid it.
- A truncated UPSERT ending at `ON CONFLICT(name) DO UPDATE SET` can be considered syntactically complete by the current statement filter and then reach SQLite as `incomplete input`. The parser should treat an UPSERT with no assignment after `DO UPDATE SET` as incomplete and drop it like the bare `VALUES` case.

**Runtime evidence:** P6 visible counts were all 0 after two assistant generations under marker `mfrs-update-trailing-comma-6-11`, but hidden `.acu-v2-advanced-tools-page__log-row` entries contained `SQL 目标表不在当前模板中: event_summary` and `INSERT INTO characters ... ON CONFLICT(name) DO UPDATE SET -> incomplete input`.

**Important boundary:** current raw chat messages did not contain `event_summary`, `INSERT INTO characters`, or `tableEdit`, so the log provenance may include long-lived-page residue. The fixes are still valid because both patterns are unsafe SQL outputs that the runtime can reject deterministically.

## 2026-06-06: SQL incomplete `VALUES` root cause and 6.10 release

**Conclusion:** the latest error seen in the 9222 SillyTavern UI is a different failure from the older `near "INSERT"` bug. The observed error is:

```text
INSERT OR REPLACE INTO check_suggestions (row_id, display_text, check_type, check_basis, dice_command) VALUES -> incomplete input
```

The model output stopped at a bare `VALUES` clause. The 6.9 SQL parser accepted the truncated statement as complete and passed it to SQLite; SQLite reported `incomplete input`.

**Runtime evidence from `agent-browser --cdp 9222`:**
- URL: `http://127.0.0.1:8000/`
- Title: `SillyTavern`
- Current marker: `mfrs-incomplete-values-6-10`
- Current API marker: `mfrs-incomplete-values-6-10`
- Log panel rows: the visible failures are at `21:22:39`, `21:23:00`, and `21:23:20`, all with the same incomplete `check_suggestions ... VALUES` statement.
- Interpretation: the current page has loaded 6.10. The visible error rows are historical unless a new row appears after clearing the log or triggering a fresh generation.

**Fix evidence:**
- `vendor/shujuku-sp-fork/index.js`: added incomplete `INSERT/REPLACE ... VALUES` detection, including bare `VALUES`, semicolon-terminated bare `VALUES`, and trailing-comment variants.
- `vendor/shujuku-sp-fork/index.js`: statement extraction, splitting, and final filtering now drop incomplete final `VALUES` statements before SQLite execution.
- `scripts/verify-sql-debug-regressions.mjs`: regression coverage includes the exact `check_suggestions (...) VALUES` failure shape.

**Release evidence:**
- Parser commit: `5ec1aa67b1b082fe62114884bd72d079aefbf913`.
- Loader backfill commit: `66e4c2e4a9bb353325751e6eefbb719adfd61c33`.
- Release commit: `aaf14dc64e3f080528c4bcb42c5afaba9fee418a`.
- `HEAD == origin/main == aaf14dc64e3f080528c4bcb42c5afaba9fee418a`.
- `scripts/publish-card.mjs`: `releaseVersion='6.10'`, `CDN_REF=66e4c2e4a9bb353325751e6eefbb719adfd61c33`, `CDN_CACHE_VERSION=phase122-incomplete-values-6-10`.
- `src/神秘复苏模拟器发布版/index.yaml`: `版本: '6.10'` and six CDN links use the 6.10 hash/cache.

**Verification:**
- Passed: `node --check vendor/shujuku-sp-fork/index.js`.
- Passed: `node --check scripts/verify-sql-debug-regressions.mjs`.
- Passed: `git diff --check`.
- Passed: `node scripts/verify-sql-debug-regressions.mjs` with only Node `node:sqlite` experimental warning.
- Build passed after sandbox-external rerun of `npm run build` because sandbox execution hit the known Windows `spawn EPERM`.
- CDN verification returned 200 for release YAML, database loader, database frontend loader, and patched vendor; resources contain the new marker/cache/guard.

## 2026-06-06: SQL `near "INSERT"` root cause and final 6.9 release

**Conclusion**: the repeated `near "INSERT": syntax error` was caused by SQL statement boundary parsing, not by a single bad column/table fix. A truncated `INSERT INTO chronicle (...) VALUES` was kept open and swallowed the next valid `INSERT OR REPLACE INTO check_suggestions (...)`; SQLite then saw the second `INSERT` inside one malformed statement.

**Fix evidence**:
- `vendor/shujuku-sp-fork/index.js`: `extractSqlStatementsFromTableEdit_ACU()` restarts when an incomplete statement is followed by a new SQL statement start, discarding the incomplete fragment and preserving the valid next statement.
- `vendor/shujuku-sp-fork/index.js`: `splitSqlStatements()` uses `shouldRestartIncompleteSqlStatement_ACU()` / `isSqlStatementStartTokenAt_ACU()` as a lower-level guard, so bypassing the tableEdit cleaner still cannot merge the broken `chronicle` statement with `check_suggestions`.
- `scripts/verify-sql-debug-regressions.mjs`: the regression fixture explicitly covers incomplete `chronicle` followed by `INSERT OR REPLACE INTO check_suggestions`, and asserts both the upper extractor and lower splitter keep only the valid latter SQL.

**Release evidence**:
- Parser fix commit: `2bcf0633c9d4dfe88043c59ac43ca448190e38de`.
- Loader backfill commit: `ac583a3be4bc84d094a7de62353c7745f19f07db`, marker/cache `mfrs-sql-boundary-6-9` / `phase121-sql-boundary-6-9`.
- Release commit pushed: `e2224ec65f86d224b17748469983a9028dd478d1`, version `6.9`.
- CDN resources returned 200 for release YAML, database loader, database frontend loader, and patched vendor; patched vendor contains `shouldRestartIncompleteSqlStatement_ACU`.
- Real SillyTavern page on CDP `9222`, release card `characterId=3` / `神秘复苏模拟器发布版`, loaded `@ac583a3...` loader and `@2bcf0633...` patched vendor. Visible counts: `near "INSERT"=0`, `ERROR SQL Mode=0`, `ERROR SqlTableService=0`; template status: 14 tables, no missing or mismatched names.

## 2026-06-06：多 agent 协作修复 `near "INSERT"` 基线记录

**结论**：本轮四 agent 协作已完成本地修复与验证。根因是 SQL 边界解析：残缺 `chronicle` INSERT 未闭合时吞入后续 `INSERT OR REPLACE INTO check_suggestions`。本地 vendor 现在同时在上层 `<tableEdit>` 清洗和底层 SQL 拆句层隔离残缺语句；自动化回归、静态检查和构建均通过。9222 真页仍显示旧错的原因是当前页面运行 marker 为旧 `mfrs-sql-debug-regressions-6-7`，数据库 loader 仍加载旧 CDN vendor hash，尚未自然加载本地补丁。

**分工事实**：
- 报错解读 Agent：负责解读 9222 Chrome 酒馆日志和源码链路。
- 修复 Agent：负责最小补丁与回归验证。
- Chrome DevTools MCP 测试 Agent：负责真页复测 `http://127.0.0.1:8000/`。
- planning-with-files 记录 Agent：负责更新 `task_plan.md`、`findings.md`、`progress.md`。

**基线错误**：酒馆日志面板可见 SQL 失败，类型包括 `ERROR SQL Mode` 与 `ERROR SqlTableService`。错误片段显示 `INSERT INTO chronicle (...) VALUES ...` 残缺后直接拼接 `INSERT OR REPLACE INTO check_suggestions (...)`，最终触发 `near "INSERT": syntax error`。该现象与先前记录的残缺 SQL 语句边界问题同类，但本轮仍需由修复与测试 agent 重新验证。

**本轮补丁证据**：
- `vendor/shujuku-sp-fork/index.js`：`extractSqlStatementsFromTableEdit_ACU()` 遇到新 SQL 起始且当前语句残缺时跳过残缺片段并重开新语句。
- `vendor/shujuku-sp-fork/index.js`：`splitSqlStatements()` 新增 `shouldRestartIncompleteSqlStatement_ACU()` / `isSqlStatementStartTokenAt_ACU()`，防止绕过上层清洗时继续把残缺 SQL 与后续 SQL 拼成一条。
- `scripts/verify-sql-debug-regressions.mjs`：同一残缺 `chronicle` + `check_suggestions` fixture 同时断言上层清洗结果和底层拆句结果，确保保留后续完整 `check_suggestions` 语句且不保留拼坏的 `chronicle` 语句。

**验证证据**：
- `node --check vendor/shujuku-sp-fork/index.js` 通过。
- `node --check scripts/verify-sql-debug-regressions.mjs` 通过。
- `git diff --check` 通过。
- `node scripts/verify-sql-debug-regressions.mjs` 通过。
- `npm run build` 沙箱内仍命中项目已知 `spawn EPERM`，沙箱外重跑成功。
- `http://localhost:5500/vendor/shujuku-sp-fork/index.js` 可访问且包含新补丁；但 `http://localhost:5500/dist/.../数据库/index.js` 仍内嵌旧 vendor CDN hash。

**运行态边界**：CDP 对 9222 真页复核到 `characterId=2` / `神秘复苏模拟器`，日志面板仍有 `near "INSERT"`，marker 为 `mfrs-sql-debug-regressions-6-7`。这说明当前页没有加载本地 patched vendor；真页自然验证需要发布或至少回填数据库 loader 指向包含 patched vendor 的新资源 hash。

## 2026-06-06：08:39/08:53 日志与截图复发问题定位

**结论**：本轮两个截图/日志问题不是同一个根因。推演选项重复是显示隐藏正则只覆盖 `【推演选项】` 这类全角括号标题，漏掉模型实际输出的裸 `推演选项：` 兜底块；SQL 错误是残缺 `chronicle` 语句未闭合时被下一条 `INSERT OR REPLACE INTO check_suggestions` 拼接，最终在 SQLite 中报 `near "INSERT": syntax error`；“妖魔没有出现”在当前模板语义中对应“厉鬼/驾驭厉鬼/鬼档案”，Debug 日志已经显示厉鬼档案相关表被触发，截图问题更像是状态栏展示优先使用 AI 文本 `持有拼图/灵异物品：鬼档案`，盖过了结构化的已驾驭厉鬼/鬼拼图数据。

**关键证据**：
- 非 Debug 日志 `acu-logs-2026-06-06T08-39-39-100Z.json` 多次出现同一 SQL：残缺 `INSERT INTO chronicle (...) VALUES` 后直接拼入 `INSERT OR REPLACE INTO check_suggestions ...`，报 `near "INSERT": syntax error`。
- Debug 日志 `acu-logs-2026-06-06T08-53-09-855Z.json` 出现 `厉鬼档案`、`sheet_ghost_archives`、相关并行更新，说明厉鬼/档案链路至少被触发，不是完全没写入。
- 截图中正文 `<sp_choices>` 紫色面板已经渲染，但下方仍显示裸文本 `推演选项： A/B/C/D`，与原正则只匹配 `【推演选项】` 的行为一致。

**本地修复落点**：
- `src/神秘复苏模拟器/index.yaml` 与 `src/神秘复苏模拟器发布版/index.yaml`：`[不发送]去除界面展示块`、`[显示]隐藏推演选项与状态面板` 同步支持裸 `推演选项：` / `状态面板：`。
- `vendor/shujuku-sp-fork/index.js`：`extractSqlStatementsFromTableEdit_ACU()` 遇到新 SQL 起始且当前语句残缺时丢弃当前残缺片段并重开新语句；末尾残缺语句不再进入 provider；旧纪要表名拦截扩展到 `log_summary`、`simulation_summary`、`summary_logs`。
- `src/神秘复苏模拟器/界面/状态栏/App.vue`：资源摘要改为合并结构化 `灵异资源.鬼拼图/灵异物品` 与正文状态面板字段，避免“鬼档案”这类泛称覆盖开局已驾驭厉鬼名称。
- `scripts/verify-sql-debug-regressions.mjs`：新增裸兜底块隐藏、残缺 SQL 断开、旧表名扩展分类回归。

**验证**：
- `node --check vendor/shujuku-sp-fork/index.js` 通过。
- `node --check scripts/verify-sql-debug-regressions.mjs` 通过。
- `git diff --check` 通过。
- `node scripts/verify-sql-debug-regressions.mjs` 通过；仅有 Node `node:sqlite` experimental warning。
- `npm run build` 沙箱内命中已知 Windows `spawn EPERM`；按权限流程沙箱外重跑成功，所有 webpack entry compiled successfully，并同步更新开发版/发布版 PNG。

## 2026-06-06 SQL Debug 复发修复 D7-D9 验收结论

**结论**：D7-D9 已完成，当前修复具备进入 D10 发布链路的前置条件，但本阶段没有提交、推送或修改 `scripts/publish-card.mjs`。

**D7 自动化回归**：
- 新增 `scripts/verify-sql-debug-regressions.mjs`，覆盖两份 SQL 模板 14 表一致性、`action_suggestions` 风险枚举归一化、`log_summary` 旧表名识别、未知列预检、`</thought>`/解释文字/markdown fenced SQL 清洗、Bad Gateway 抛错与仪表盘细分分类。
- 已通过 `node --check`、`git diff --check` 与实际 fixture 运行；`node:sqlite` experimental warning 不影响 gate。

**D8 真页验证**：
- 通过 Chrome DevTools `127.0.0.1:9222` 对发布卡 `characterId=3` 验证，页面 marker 为 `mfrs-r2sql-log-fixes-6-6`。
- native 与 sqlite 两种模式下，`getTableTemplate()`、`AutoCardUpdaterAPI.exportTableAsJson()`、`MysteryDatabaseFrontend.exportCurrentData()` 均保持 14 表，`missingNames=[]`、`mismatchNames=[]`；玩家状态表头为 `死亡风险镜像/复苏风险镜像`。
- SQLite 控制台可见，`sqlite_master` 返回 14 张业务表；临时表探针创建/读取/drop 后清理为 0 行；收尾恢复 `storageMode=native`。未捕获新的 SQL Error，2 条 Warn 是既有 seed 数据短纪要导致的非阻塞边界。

**D9 构建 gate**：
- `npm run build` 在沙箱内命中已知 Windows `spawn EPERM`，沙箱外重跑成功，所有 webpack entry `compiled successfully`。
- 构建前后均通过 `node --check vendor/shujuku-sp-fork/index.js`、`node --check scripts/verify-sql-debug-regressions.mjs`、`git diff --check`、`node scripts/verify-sql-debug-regressions.mjs`。
- 构建后 tracked diff 限定为两份 SQL 模板、vendor、两份数据库前端 dist，以及既有无关状态栏 HTML；`scripts/publish-card.mjs` 无 diff。两份 dist 数据库前端已命中新模板提示：`死亡风险镜像` 各 1 次、`旧表名 log_summary` 各 1 次；vendor 中 `API上游网关错误` 命中 2 次。

## 2026-06-05 SQL 日志修复发布链路：6.6 最终结论

- **最终状态**：版本 `6.6` 已推送，`HEAD==origin/main==f2ab050b60c3664e65c52dd1e574c04226a6bfbb`。发布版当前使用资源提交 `a554ba8040b9c9804a0c55136c922d8716aa656d` 与 cache `phase118-sql-template-autocalibrate-6-6`。
- **关键纠偏**：phase118 初次 404 不是路径编码或 jsdelivr 缓存问题，而是 `scripts/publish-card.mjs` 中手写了不存在的资源 hash `a554ba88845e31772ee90f3d1fdfad5775512a39`。真实自动校准资源提交为 `a554ba8040b9c9804a0c55136c922d8716aa656d`；修正后同路径 CDN 返回 200。
- **发布验证**：YAML 版本为 `6.6`，6 条 CDN 链接均指向真实 hash/cache；PNG `chara` 与 `ccv3` 元数据同样各包含 6 次真实 hash/cache，错误 hash 为 0。数据库 loader 与数据库前端 CDN 分别返回 200/1144 bytes、200/213639 bytes。
- **运行态验证**：CDP 真页在发布卡 `characterId=3` 上加载 phase118 模块后，模板、API 导出、前端导出三口径均为 14 表；`missingNames=[]`、`mismatchNames=[]`；`玩家状态` 表头为 `死亡风险镜像` 和 `复苏风险镜像`。这覆盖了用户仪表盘提示的 `玩家状态` 表头/DDL mismatch。

## 2026-06-05 SQL 日志问题修复 T5-T8：发布前验收与发布判断

**结论**：T5-T7 已完成发布前修复与隔离回归。本地代码/模板已能覆盖用户日志中的 SQL 问题；当前真实发布页仍加载旧 CDN，因此仪表盘上的 `玩家状态` 1/14 mismatch 只有发布后才会消失。

**T5 并发 API Warn**：
- 并发模式缺少独立 API 配置时，Warn 只记录一次，后续同类回退降为 debug，避免运行概览被 9 条重复 Warn 淹没。
- 仪表盘解释新增“并发 API 独立配置缺失，已回退主 API；这是非阻塞配置提示，不代表 SQL 写入失败”，并优先匹配相关日志，避免误判成 SQL/API 修复失败。

**T6/T7 验证**：
- `node --check vendor/shujuku-sp-fork/index.js` 通过；`git diff --check` 通过。
- `npm run build` 沙盒内仍命中已知 Windows `spawn EPERM`，沙盒外重跑成功，所有 webpack entry compiled successfully。
- Node + `node:sqlite` 内存库回归：两份模板均 `sheets=14`、`ddlMismatch=0`；人物批量 upsert 不冲 `row_id`；合格纪要可插入，短纪要被 SQLite CHECK 拦截。
- vendor 静态检查确认 SQL 包装残片提取器、并发回退一次性 Warn 和仪表盘非阻塞解释均存在。

**真实页只读对照**：
- CDP 当前页：`http://127.0.0.1:8000/`，发布卡 `characterId=3` / `神秘复苏模拟器发布版`。
- 当前 marker 为旧版 `mfrs-r2sql-settings-console-refresh`，说明本轮本地修复尚未自然加载。
- 旧页三口径仍是 14 表：`getTableTemplate()`、`exportTableAsJson()`、`MysteryDatabaseFrontend.exportCurrentData()` 均为 14，面板 `missingNames:[]`。
- 旧页 `sheet_player_state` 表头仍是 `死亡风险/复苏风险`，DDL 注释是 `死亡风险镜像/复苏风险镜像`，因此用户日志中的 1/14 mismatch 会继续在旧 CDN 上出现。这不是本地修复失败，而是尚未发布。

**发布判断**：
- 若要完成真实仪表盘验收，需要发布：先提交包含本轮 vendor/模板/dist 的资源提交，再回填数据库 loader 的 vendor commit hash/cache 并重建，最后更新 `publish-card.mjs` 的 `CDN_REF/CDN_CACHE_VERSION/releaseVersion` 后生成发布版 YAML/PNG，并用 CDP 做发布后 smoke。
- 未获明确发布授权前，不提交、不推送、不改 CDN_REF；当前发布前 gate 已足够支撑进入发布链路。

## 2026-06-05 SQL 日志问题修复 T1-T4：修复落点与风险判断

**结论**：T1-T4 已完成代码/模板层修复，覆盖用户日志中的 1/14 表结构 mismatch、`characters.row_id` 主键冲突、`chronicle_text` 长度约束失败和 SQL 输出残片问题。当前尚未执行真实 SQLite 写入回归，也尚未发布。

**T1 表结构 mismatch**：
- 开发版与发布版 `sheet_player_state.content[0]` 已将 `死亡风险` / `复苏风险` 改为 `死亡风险镜像` / `复苏风险镜像`。
- `note` 与 `updateNode` 同步使用“镜像”说法，避免误导模型把数据库字段当 MVU 真源。
- 未改 DDL、未改物理列名、未改 MVU 路径语义。

**T2 人物表 row_id 冲突**：
- 开发版与发布版 `sheet_characters` 的 `initNode` / `insertNode` 示例已去掉 `row_id` 列，改由 SQLite 的 `INTEGER PRIMARY KEY` 自动分配。
- 示例使用 `ON CONFLICT(name) DO UPDATE`，与 DDL 中 `name UNIQUE` 对齐，支持幂等写入。
- SQL 模式通用说明新增规则：同一条多行 VALUES 不得重复使用 `MAX(row_id)+1`。

**T3 纪要长度与编号**：
- 开发版与发布版 `sheet_chronicle` 明确 `chronicle_text` 为 200-600 字、推荐 300-400 字，低于 200 字禁止输出 SQL。
- 示例不再硬编码 `SP0002`，改为按当前表计算下一个 `row_id` 与 `code_index`。
- vendor SQL 合并纪要默认 prompt 同步加入低于 200 字禁止、输出格式无额外标签、不要硬编码 `1/SP0001` 的要求。

**T4 输出格式与解析兜底**：
- SQL 模式格式说明现在明确 `<tableEdit>` 内只能放 SQL，不要输出 markdown 代码块、`<content>`、`</thought>` 或解释文字。
- vendor 解析层新增 `extractSqlStatementsFromTableEdit_ACU()`：SQLite 模式下先从 tableEdit 内容中跳过包装残片，定位 `INSERT/UPDATE/DELETE/CREATE/DROP/REPLACE/WITH` 等 SQL 开始行，再交给 SQL provider。
- 该兜底只影响 SQLite 模式进入 SQL provider 的路径；原生 DSL 路径保持原流程。

**验证结果**：
- `node --check vendor/shujuku-sp-fork/index.js` 通过。
- `git diff --check` 通过。
- Node JSON 解析检查通过：两份模板的 `玩家状态` 表头均为 `死亡风险镜像/复苏风险镜像`，`sheet_chronicle` 含“不足 200 字时禁止输出 SQL”，`sheet_characters` 含 `ON CONFLICT(name)`。

**剩余风险**：
- 当前还没跑 T7 真页/隔离 SQLite 写入，所以不能宣称仪表盘 Error 已归零。
- 两个数据库前端 dist 文件当前显示为相关生成产物，包含更新后的数据库模板；若后续构建，需确认它们与源码一致，不混入无关状态栏 diff。

## 2026-06-05 SQL 日志问题修复 T0：基线与根因归档

**结论**：用户提供的日志和仪表盘概览确认，本轮待修问题集中在 SQL 模式的模板校准与 SQL 生成规则，不是 SQLite 引擎损坏，也未显示 14 表导出 fallback 回归。T0 仅完成基线记录，未执行写入 SQL、未修改业务代码。

**运行与发布基线**：
- 当前仓库：`HEAD==origin/main==ccfd7273799e2f5932294db42cd3d2e3bbce4da6`，`git describe` 为 `v0.0.71-dirty`。
- 当前发布配置：`releaseVersion=6.5`、`CDN_REF=f7e2f64d70552f876c45d3315fc783b3334621ac`、`CDN_CACHE_VERSION=phase116-r2sql-settings-console-refresh`；发布版 YAML 为 `版本: '6.5'`。
- 当前运行态来源：用户仪表盘显示 SQL/SQLite 模式，且提示 `玩家状态` 为 1/14 mismatch。本轮未做破坏性 runtime 探测。

**日志归类**：
- 13 Warn / 4 Error，按根因合并为 5 类。
- 配置警告：9 次 `并发模式要求独立API，但URL或模型未配置，回退主API`；非 SQL 失败根因。
- 模板校准警告：1 次 `玩家状态` DDL 与表头不匹配；具体为 `death_risk` / `revival_risk` 的 DDL 注释是“死亡风险镜像/复苏风险镜像”，表头是“死亡风险/复苏风险”。
- SQL 主键错误：`characters.row_id` 唯一约束失败重复记录 3 条；根因是多行 INSERT 同时使用 `MAX(row_id)+1`，两行计算到同一个 row_id。
- SQL 约束错误：`chronicle_text` 长度约束失败重复记录 3 条；日志样本文本约 122 字，低于 DDL 的 200-600 字要求。
- 输出格式警告：1 次 `Skipping malformed or truncated command line`；说明解析阶段遇到反引号、`</thought>`、`<content>` 或类似非 SQL 残片。

**修复优先级**：
1. 先做 T1，校准开发版与发布版 `玩家状态` 表头/DDL 注释，消除仪表盘 1/14 mismatch。
2. 再做 T2/T3，修 SQL 填表提示词：人物新增不能在同一多行 VALUES 重复 `MAX(row_id)+1`；事件纪要必须满足 200-600 字。
3. 再做 T4，收紧 `<tableEdit>` SQL 提取和输出格式。
4. T5 并发 API 属于配置体验项，不能作为 SQL 修复失败判据。

**回归保护**：后续修复不得改变 `death_risk` / `revival_risk` 的数据库镜像定位，不得把它们当作 MVU 真源；不得在真实玩家主存档中做破坏性 SQL；验收必须覆盖 14 表、0 mismatch、人物幂等写入、纪要长度、三口径导出均为 14 表。

## 2026-06-05 R2SQL-POST-9：同一设置窗 SQLite SQL 控制台自动刷新修复

**结论**：同一设置窗从 native 切到 sqlite 后 SQL 控制台不出现的问题已修复并发布到 `6.5`。根因仍是 POST-8 确认的设置窗 DOM 复用：模式切换只更新 storage/provider，不会自动重建已经生成的高级工具页。POST-9 选择最小 UX 修复：模式切换成功后只刷新当前设置窗的高级工具区域并重新绑定子页事件，不改 SQL DDL/schema，也不引入新的公开测试入口。

**修复证据**：
- `vendor/shujuku-sp-fork/index.js` 新增高级工具子页绑定、激活和刷新函数；storage radio change 成功后调用刷新逻辑。
- 切到 sqlite 时，当前窗口立即出现 `#acu-subtab-advanced-sql`、`#acu-tab-sql-console`、`#shujuku_v120-sql-input`、`#shujuku_v120-sql-execute`。
- 切回 native 时，SQL pane/input/execute 会从当前设置窗移除，避免 native 模式误显示 SQL 控制台。

**发布证据**：
- vendor 修复提交：`a41ab4483ce6f149fe19c03aebfead5dddceed2d`。
- 资源 loader/dist 提交：`f7e2f64d70552f876c45d3315fc783b3334621ac`。
- 发布提交：`ccfd727`，已推送到 `origin/main`。
- 发布版 YAML 与 PNG `chara/ccv3` 元数据均为 `version=6.5`；6 条 CDN 链接均指向 `f7e2f64d70552f876c45d3315fc783b3334621ac`，cache 为 `phase116-r2sql-settings-console-refresh`；旧 `phase115-r2sql-export-fallback` 与旧资源 hash 在发布产物检查中为 0。

**真页复核证据**：
- 页面：`http://127.0.0.1:8000/`，发布卡 `characterId=3` / `神秘复苏模拟器发布版`。
- marker：`apiMarker/hostMarker=mfrs-r2sql-settings-console-refresh`。
- native 基线：`storageMode=native`，`getTableTemplate()` / `exportTableAsJson()` / `MysteryDatabaseFrontend.exportCurrentData()` / 面板均为 14 表，`missingNames:[]`；native 设置窗无 SQL 控制台。
- 同窗 native -> sqlite：选择 sqlite radio + “仅切换模式”后，未关闭/重开窗口，SQL 控制台完整出现；只读 `sqlite_master` 查询返回 14 行业务表。
- 同窗 sqlite -> native：选择 native radio + “仅切换模式”后，SQL 控制台从当前窗口移除。
- 最终恢复：设置窗关闭，`storageMode=native`，三口径与面板均 14 表，`hasPopup:false`。

**风险判断**：这次修复只触碰设置窗高级工具页的刷新与事件重绑，不触碰 SQL provider、DDL、导出 fallback 或模板 schema。真页已覆盖 native -> sqlite -> SQL 只读查询 -> native 的完整往返，未发现新的持久回退 8 表、导出缺 sheet 或 `current_time` schema 回归。

## 2026-06-05 R2SQL-POST-8：SQL 控制台未渲染根因与 6.4 mutation smoke 结果

**结论**：6.4 旧设置窗中 SQL 控制台“未渲染”的根因不是 SQL 功能缺失，也不是 POST-5 导出 fallback 引入的新 bug，而是设置窗窗口复用导致的 DOM 假阴性。native 状态生成的设置窗不会在同一窗口切到 sqlite 后重建高级工具 HTML；关闭旧设置窗并重新打开后，SQL 控制台正常出现。使用这个入口补跑 SQL mutation smoke 后，发布版 6.4 没有复现 5 sheet 导出问题。

**根因证据**：
- `generateAdvancedTabHTML()` 在生成 HTML 时通过 `isSqliteMode()` 决定是否注入 `advanced-sql` 和 SQL 控制台 DOM。
- `createACUWindow()` 如果发现同 id 窗口 `shujuku_v120-main-window` 已存在，只执行 `bringToFront` 并返回旧窗口，不重新生成 `generateAdvancedTabHTML()`。
- 真机复现同源：native 打开的旧设置窗只有 `advanced-optimization/advanced-log`；在该窗口切到 sqlite 后，IDB `storageMode=sqlite`、radio checked，但旧 DOM 仍没有 SQL 控制台；关闭并重开后，`advanced-sql`、`#shujuku_v120-sql-input`、`#shujuku_v120-sql-execute` 都出现。

**SQL smoke 结果**：
- `sqlite_master` 业务表为 14 张：`action_suggestions`、`characters`、`check_suggestions`、`chronicle`、`clues`、`collected_archives`、`collected_rules`、`controlled_ghosts`、`ghost_archives`、`global_state`、`locations`、`player_state`、`supernatural_events`、`supernatural_items`。
- `UPDATE global_state SET game_time = game_time WHERE row_id = 1;` 成功，0 行受影响。
- `pragma_table_info('global_state')` 只返回 `game_time`，没有 `current_time`。
- 临时表 probe `acu_sql_probe` create/insert/select `ok`/drop 成功，`sqlite_temp_master` 清理后 0 行；持久 probe row 清理 0 行受影响。
- mutation 后 sqlite gate：`getTableTemplate()` 14、`exportTableAsJson()` 14、`MysteryDatabaseFrontend.exportCurrentData()` 14，面板 `templateStatus.templateLoaded:true/tableCount:14/missingNames:[]`。
- 最终已恢复 native，发布卡仍为 `characterId=3`、`storageMode:native`、marker `mfrs-r2sql-export-fallback`，三口径与面板均 14。

**后续判断**：从功能正确性看，核心 bug 已通过发布版 mutation smoke；从 UX 看，仍可考虑一个小修复：模式切换成功后重建设置窗的高级工具页或提示用户关闭重开，否则用户在同一窗口内切 sqlite 时会看不到 SQL 控制台。

## 2026-06-05 R2SQL-POST-7：6.4 发布后复核与 SQL 控制台入口限制

**结论**：POST-5 修复已通过发布链路进入发布版 `6.4`，且发布版自然加载下 native 与 sqlite 只读/切换 gate 均保持 14 表，未看到“物理 14 表但导出只剩 5 sheet”的问题复发。当前不能宣称完整 SQL mutation smoke 已完成，因为 6.4 旧设置窗高级工具页没有渲染 SQL 控制台入口。

**发布证据**：
- vendor 修复提交：`5bd4b0e703e18ce6e32ba9904163e1cd53a501cd`。
- 资源 loader/dist 提交：`8d4d1d267568a798f5a6c2f359257bb3630577e5`，loader marker/cache 为 `mfrs-r2sql-export-fallback`。
- 发布提交：`3de0c78`，已推送到 `origin/main`。
- 发布版：`6.4`，CDN cache `phase115-r2sql-export-fallback`；YAML 与 PNG `chara/ccv3` 元数据均确认含新版本、新 hash、新 cache。

**真机复核证据**：
- native：`characterId=3`、`storageMode:native`、`apiMarker/hostMarker=mfrs-r2sql-export-fallback`；`getTableTemplate()` / `exportTableAsJson()` / `MysteryDatabaseFrontend.exportCurrentData()` / 面板均为 14 表。
- sqlite：通过旧设置窗 radio + “仅切换模式”可切到 sqlite；切换后 marker 仍正确，模板/导出/前端导出/面板均保持 14 表；收尾已恢复 native。
- 旧 SQL 控制台限制：sqlite 下高级工具页当前只有 `advanced-optimization` 与 `advanced-log`，未找到 `#shujuku_v120-sql-input`、`#shujuku_v120-sql-execute` 或 `advanced-sql`。
- POST-7 最终快照：页面停在发布卡 native，`characterId=3`、角色名 `神秘复苏模拟器发布版`、`apiMarker/hostMarker=mfrs-r2sql-export-fallback`；`getTableTemplate()` 14、`exportTableAsJson()` 14、`MysteryDatabaseFrontend.exportCurrentData()` 14，面板原始结构为 `templateStatus.templateLoaded:true/tableCount:14/missingNames:[]`。

**后续判断**：核心导出 fallback 修复可以视为已发布并通过当前可达 gate；若要把风险继续压低，下一步应定位 6.4 SQL 控制台为何不渲染，或寻找新版安全 SQL 入口，再补跑 POST-3 同级别 mutation smoke。

## 2026-06-05 R2SQL-POST-5：SQLite 导出缺 sheet 根因与代码层修复

**结论**：POST-3 的 5 sheet 导出不是 DDL/schema 问题，也不是 `getTableTemplate()` 回退问题，而是 SQLite 导出层对 `_acu_sheet_meta` 的依赖过强。部分表可能已经建成物理 SQLite 表，但在 seedRows/数据写入阶段失败后没有写入 metadata，于是 `exportToTableData()` 遍历物理表时找不到对应 sheet 元信息并跳过。

**证据链**：
- `SqlTableService.executeMutation()` 在写操作前会调用 `_ensureTablesFromTemplate()`，物理表因此可达到 14 张。
- `_ensureTablesFromTemplate()` 通过 `syncBridge.loadFromTableData(partialData)` 建缺失表；`SyncBridge._loadSheet()` 旧顺序是：建表 -> 写数据 -> 写 metadata。
- 如果写数据阶段失败，外层 `loadFromTableData()` 只记录该 sheet 加载失败并继续，已建成的物理表会保留，但 `_acu_sheet_meta` 不会有该 sheet。
- `SyncBridge.exportToTableData()` 旧逻辑只导出“物理表名能反查到 metadata”的表；没有 metadata 的物理表会被跳过，符合 POST-3 中“物理 14、导出 5”的形态。

**修复落点**：
- `vendor/shujuku-sp-fork/index.js`：`_loadSheet()` 改为建表后先写 metadata，再尝试写 seedRows/数据；数据写入失败时保留空表结构。
- `SyncBridge.exportToTableData()` 新增 `fallbackData`：metadata 缺失时从当前 JSON/当前 chat 模板反推 sheet meta；导出后再补齐 fallback 中未导出的 sheet。
- `SqlTableService.saveToChat()` / `getCurrentData()` / `_syncToJson()` 传入“当前 chat 模板 + 当前 JSON 视图”的并集 fallback，防止导出视图被压扁。

**已验证**：
- `node --check vendor/shujuku-sp-fork/index.js` 通过。
- `git diff --check` 通过。
- `npm run build` 沙盒内因已知 Windows `spawn EPERM` 失败，沙盒外重跑成功。
- 窄模型复现 `metadata=5 / fallback=14`：旧导出 5，新导出 14。

**剩余边界**：修复尚未提交/推送，也未回填 CDN hash；当前开发/发布 loader 仍加载旧 CDN vendor。因此发布版自然加载下的 SQLite smoke 需要在资源提交和发布链路完成后再跑，不能把本轮静态/模型验证等同于最终发布版真机通过。

## 2026-06-05 R2SQL-POST-3：发布版 SQLite smoke 发现导出 bug

**结论**：发布版 6.3 的 SQLite 物理表、模板状态和面板状态通过，但导出 API 在 SQL 操作后只导出 5 个 sheet，未保持 14 表完整结构。该保留项已升级为明确 bug，进入 POST-5 最小修复。

**通过项**：
- SQL 控制台在 SQLite 模式下可用，入口为旧设置窗高级工具页。
- `sqlite_master` 业务表为 14 张：`action_suggestions`、`characters`、`check_suggestions`、`chronicle`、`clues`、`collected_archives`、`collected_rules`、`controlled_ghosts`、`ghost_archives`、`global_state`、`locations`、`player_state`、`supernatural_events`、`supernatural_items`。
- 幂等写入 `UPDATE global_state SET game_time = game_time WHERE row_id = 1;` 成功，0 行受影响；写入后业务表仍为 14。
- `global_state` schema 只返回 `game_time`，不含 `current_time`。
- 临时表 probe `acu_sql_probe` 创建、插入、查询、drop 成功；`sqlite_temp_master` 清理后 0 行。
- 模板/面板口径稳定：`getTableTemplate()` 14 表，面板 `templateLoaded:true/tableCount:14/missingCount:0`。

**失败项**：
- SQL 操作后 `AutoCardUpdaterAPI.exportTableAsJson()` 与 `MysteryDatabaseFrontend.exportCurrentData()` 均只导出 5 个 sheet：
  `sheet_check_suggestions`、`sheet_collected_rules`、`sheet_controlled_ghosts`、`sheet_player_state`、`sheet_supernatural_items`。
- 物理 SQLite 表仍为 14，因此问题不是建表失败；更像 SQLite provider / 导出层在 mutation 后只导出部分数据表，或丢失空表结构。
- 行数辅助：14 表中主要非空表为 `check_suggestions=5`、`controlled_ghosts=1`、`player_state=1`，多数表 0 行；导出 5 sheet 与物理表/模板 14 不一致。

**收尾**：已立即恢复 native，最终发布卡 `storageMode:native`，模板/导出/面板均为 14 表，`missingCount=0`。POST-5 修复时不要改 SQL schema/DDL，优先审查导出层如何补齐空表。

## 2026-06-05 R2SQL-POST-2：发布版 SQLite 可逆切换结果

**结论**：POST-1 找到的旧设置窗 storage radio 可安全把发布版 6.3 从 native 切到 sqlite。切换后发布卡 API、marker 和三口径 14 表保持稳定，可以进入 POST-3 做 SQL smoke。

**证据**：
- 切换路径：`AutoCardUpdaterAPI.openSettings()` -> `input[name="shujuku_v120-storage-mode"][value="sqlite"]` -> `#shujuku_v120-custom-confirm-cancel`。
- 按钮语义：`cancel` 是“仅切换模式”，没有选择“恢复默认并切换”，所以本轮没有重置填表提示词。
- settings 指纹：native 前 `length=132500/FNV1a=8e0b04c5`，sqlite 后 `length=132500/FNV1a=58d3e6b2`。
- 状态一致性：IDB/settings 为 `storageMode:sqlite`，sqlite radio checked；发布卡仍 `characterId=3`，`apiMarker/hostMarker=mfrs-r2sql-template-status`。
- 三口径：`getTableTemplate()` 14 表，`exportTableAsJson()` 14 表，面板 `templateLoaded:true/tableCount:14/missingCount:0`。

**注意**：
- 本阶段未执行 SQL，也未写入 probe。
- 公开 API 仍没有 `executeQuery` / `setStorageMode`。
- 切换后设置窗已关闭；POST-3 需要在 sqlite 状态下重新打开设置窗，让高级工具页渲染 SQL 控制台。
- 当前页面有意停在 `storageMode:sqlite`，POST-4 负责恢复 native。

## 2026-06-05 R2SQL-POST-1：发布版 SQLite 安全入口发现

**结论**：找到可进入 POST-2 的安全入口。应使用自然加载后的旧设置窗 storage radio，从 `native` 切到 `sqlite` 时选择自定义确认框的“仅切换模式”。不要使用直接重新 import 库本体或闭包私有 provider 探针。

**可用入口**：
- `AutoCardUpdaterAPI.openSettings()` 或页面上的 `#acu-btn-settings` 可打开旧设置窗 `#shujuku_v120-popup`，不创建新 ACU 实例，marker 保持 `mfrs-r2sql-template-status`。
- 弹窗内有 2 个可见可用的 `input[name="shujuku_v120-storage-mode"]`：
  - `value="native"`：当前 checked。
  - `value="sqlite"`：可选。
- radio change 会弹 `showCustomConfirm_ACU`。取消按钮语义为“仅切换模式”，适合作为 POST-2 的低干扰切换路径；失败时源码会回退 radio/settings。

**SQL 控制台入口**：
- native 下 `#shujuku_v120-sql-input` 与 `advanced-sql` 均不渲染。
- 源码确认旧设置窗的 SQL 控制台只在 `isSqliteMode()` 为真时加入高级工具页，事件绑定也只在 SQLite 模式执行。
- 因此 POST-2 需要先安全切到 sqlite；POST-3 再重新打开/刷新设置窗，寻找 `advanced-sql` / `#shujuku_v120-sql-input` 并执行可逆 smoke。

**不可用 / 高风险入口**：
- 公开 `AutoCardUpdaterAPI` 没有 `executeQuery` / `setStorageMode`。
- `AutoCardUpdaterV2API` 当前无 key。
- `MysteryDatabaseFrontend` 没有 SQL 或模式切换入口。
- 直接重新 `import` 库本体已知会触发 `jQuery_API_ACU is not a function` 并污染运行态；闭包私有 provider 也不作为测试入口。

**收尾状态**：设置窗已通过 `.acu-window-btn.close` 关闭。发布卡仍为 `characterId=3`、`storageMode:native`、三口径 14 表、`missingCount=0`。

## 2026-06-05 R2SQL-POST-0：发布版 SQLite 保留项基线

**结论**：发布版 6.3 native 基线稳定，可以进入 POST-1 的安全入口发现；当前还没有执行 SQLite 切换或 SQL probe。

**证据**：
- Git：HEAD==origin/main==`4f6d949770293e10921a377155bae51c63163f02`，HEAD tag `v0.0.65`。
- 发布配置：`CDN_REF=fe0679ee4152eed7c7c79769d9cddc498771333e`，cache `phase114-r2sql-template-status`，releaseVersion `6.3`。
- CDP：从开发卡 `characterId=2` 通过宿主 `selectCharacterById(3)` 恢复到发布版 `characterId=3`。
- 页面状态：IDB `storageMode:native`，`apiMarker/hostMarker=mfrs-r2sql-template-status`，模板/导出/面板三口径均 14 表，面板 `missingCount=0`。
- IDB settings 指纹：key `shujuku_v120_profile_v1____default____settings`，raw type `string`，length `128651`，FNV1a `2f8f6d53`，storageMode `native`。

**注意**：
- 为避免泄露配置内容，本阶段没有把完整 IDB settings raw 写入文件；后续若要切 SQLite，必须在同一执行链中读取完整 raw 并用 finally 恢复。
- 工作区已有 8 个 tracked dist 差异，本阶段未确认来源、未回滚、未提交。

## 2026-06-04 R2SQL-7/8：发布版 6.3 收尾结论

**结论**：R2SQL 修复已发布到 `神秘复苏模拟器发布版` 6.3，并推送到远端。发布后 native/CDN 真机复核通过，当前发布卡三口径稳定为 14 表；未发现新的 native/发布链路 bug。

**关键证据**：
- Git：HEAD==origin/main==`4f6d949770293e10921a377155bae51c63163f02`，HEAD tag `v0.0.65`。
- 发布配置：`scripts/publish-card.mjs` 为 `CDN_REF=fe0679ee4152eed7c7c79769d9cddc498771333e`、cache `phase114-r2sql-template-status`、`releaseVersion=6.3`。
- 真机页面：CDP 连接 `127.0.0.1:9222` 的 SillyTavern 页面，重新选入 `characterId=3` 发布版卡后，IDB `storageMode:native`，`apiMarker/hostMarker=mfrs-r2sql-template-status`。
- 状态口径：`getTableTemplate()` 14 表、`exportTableAsJson()` 14 表、`MysteryDatabaseFrontend.getPanelState()` 为 `templateLoaded:true/tableCount:14/missingCount:0`。

**SQLite 发布后 smoke 限制**：
- 当前发布版 UI/公开 API 没有可安全自动化的 SQL 控制台、存储切换、`executeQuery` 或 `setStorageMode` 入口。
- 直接重新 import 库本体会触发 `TypeError: jQuery_API_ACU is not a function`，并可能污染当前页面的 API 实例；本轮不再重复该路径。
- 因此发布后完整 SQLite smoke 记录为“受安全入口限制未重跑”。SQLite 关键行为已经在 R2SQL-5 开发版真机通过：只读不建表、首次写入建 14 表、三口径一致、`global_state` schema 含 `game_time` 且不含 `current_time`。

## 2026-06-04 R2SQL-6：native / 多卡 / 热切换回归结论

**结论**：R2SQL-6 通过。补丁在开发卡 native、普通卡隔离、发布版 native、热刷新、旧功能 smoke 和 SQLite 控制台快速往返中没有发现持久回退 8 表或跨卡污染。

**证据摘要**：
- 开发卡 `characterId=2` native 基线：本地 patched fork `hasPatch:true`，`getTableTemplate()` 14 表，导出 14 表，`getPanelState()` 为 `templateLoaded:true/tableCount:14/missingNames:[]`。
- Assistant 普通卡 `characterId=0`：模板/导出保持库默认 8 表，`TavernDB_ACU_ScopedConfig` 不存在，未被神秘复苏 14 表污染。
- 发布版 `characterId=3`：等待脚本加载后 native 为 14 表、导出 14 表、面板 loaded；切回开发卡等待后仍为 14 表。
- 热刷新：重新接管本地 patched fork 后执行 `reloadCurrentChat()`，chat-scope 重新应用后 `getTableTemplate()`、导出和面板均为 14 表。
- 旧功能：`exportCurrentData()` 14 表；`refreshDatabase()` 后仍 14 表；`openPanel()` 后仍 14 表；干净设置窗口切 SQLite 后 SQL 控制台子页出现，只读 `sqlite_master` 查询成功返回 0 行，再切回 native 后仍 14 表。

**需带到 R2SQL-7 的注意事项**：
- 当前开发版 loader/前端自然路径仍指向已发布 `be210de...` vendor，尚未包含 R2SQL 本地补丁；因此 R2SQL-5/6 对补丁行为的验证使用了运行态临时 import 本地 patched fork。发布链路必须把 vendor 补丁提交到 CDN 资源链路，否则切卡/刷新后自然加载仍可能短暂或持续使用旧 vendor。
- 切卡初期可能采到 `AutoCardUpdaterAPI` 未就绪或 8 表；等待 10-12 秒后开发版/发布版均收敛到 14 表。本轮没有发现持久跨卡污染或保存异常。
- 部分 CDP shell wrapper 在已经打印完整 JSON 后超时退出，这是工具包装层问题；后续状态复核正常。

## 2026-06-04 R2SQL-5：开发版 SQL 真机验收结论

**结论**：R2SQL-2/R2SQL-3 的联合修复在开发版真机 SQL/SQLite 模式下通过。SQLite 写入建表后，旧 bug“物理表/导出 14 表，但 `getTableTemplate()` / `getPanelState()` 回退 8 表”未复现；三口径稳定一致为 14 表。

**关键证据**：
- 运行环境：真实 SillyTavern `127.0.0.1:8000`，CDP `127.0.0.1:9222`，开发卡 `characterId=2` / `神秘复苏模拟器`。
- 本轮为避免旧 CDN/旧发布卡实例干扰，运行态接管本地 patched fork `localhost:5500/vendor/shujuku-sp-fork/index.js?v=r2sql5_local_patch_*`；`getTableTemplate()` 源码确认包含 `applyTemplateScopeForCurrentChat_ACU` 和 `resolveTemplateForExport_ACU`。
- 当前 chat 的 `TavernDB_ACU_ScopedConfig.template['']` 为 14 表 `chat_override`；重新导入后 `getTableTemplate()`、`exportTableAsJson()`、`MysteryDatabaseFrontend.getPanelState()` 均为 14 表。
- SQLite 只读查询 `sqlite_master` 初始 0 行，说明只读仍不会提前建表；首次幂等写入 `UPDATE global_state SET game_time = game_time WHERE row_id = 1` 后，物理业务表变为 14 张。
- `global_state` schema 含 `game_time`，`current_time` 不存在；`pragma_table_info` 过滤只返回 `game_time`。
- 写入建表后，`getTableTemplate()` 14、`exportTableAsJson()` 14、`getPanelState()` `templateLoaded:true/tableCount:14/missingNames:[]`。

**收尾状态**：临时表 `acu_sql_probe` 已 drop，`sqlite_temp_master` 0 行；未创建持久 probe 行，清理 probe row_id 为 0 行影响。结束已恢复 native，extension settings 与 IDB 均为 `storageMode:native`，native 下三口径仍为 14 表。

**注意**：开发版当前 loader 仍自然指向已发布资源 `be210de...`，R2SQL-5 是通过运行态临时接管本地 patched fork 验证补丁行为；若进入发布链路，仍需要 R2SQL-7 走资源提交/回填/发布版真机复核。

## 2026-06-04 R2SQL-0~4：SQL 模式模板状态分裂修复落地（R2SQL-5 已通过）

**结论**：R2SQL-0~4 已完成到静态/构建门禁。根因不是 SQLite 物理建表失败，也不是 `current_time` 保留字 bug 复发，而是 SQL 模式下模板状态读口径分裂：物理表和导出口径可为 14 表，但 `getTableTemplate()` 可能回退读取旧 `TABLE_TEMPLATE_ACU` 的 8 表，前端面板再跟着误判。

**落地修复**：
- 库层：`vendor/shujuku-sp-fork/index.js` 的 `getTableTemplate()` 改为优先应用当前聊天模板作用域，并通过 `resolveTemplateForExport_ACU('chat', activePresetName)` 返回当前生效模板；旧 `TABLE_TEMPLATE_ACU` 只作为最后 fallback。
- 前端：`src/神秘复苏模拟器/脚本/数据库前端/index.ts` 的 `readTemplateStatus()` 增加 `exportTableAsJson()` 兜底。模板 API 缺表但导出数据已含神秘复苏 14 表时，面板返回 14 表已加载；导出失败不抛出，只回到模板口径。

**复核证据**：`npm run build` 沙盒外成功并同步 `dist/神秘复苏模拟器/脚本/数据库前端/index.js`；`node --check vendor/shujuku-sp-fork/index.js` 通过；`git diff --check` 通过；AM/SP sweep 0 命中；`__RESOURCE_HASH__` 0 命中；无关状态栏 HTML 构建编号噪声已恢复，tracked diff 只剩 R2SQL 相关 3 文件。

**下一步**：R2SQL-5 需要用真实 SillyTavern 页面切 SQLite 模式验收：只读查询仍不提前建表，首次写入建 14 张物理表，`getTableTemplate()` / `getPanelState()` / `exportTableAsJson()` 三口径一致为 14 表，`global_state` 仍只有 `game_time` 无 `current_time`，并清理所有 SQL probe。

## 2026-06-04 SQLite 模式发布版回归测试（进行中）
**目标**：用户要求确认 `神秘复苏模拟器发布版` 6.2 切到 SQL/SQLite 模式后是否还有 bug。本轮只做真实 SillyTavern 运行态回归，结束前需尽量恢复 `native`。

**已确认运行态**：
- 页面：`http://127.0.0.1:8000/`，CDP：`127.0.0.1:9222`。
- 当前卡：`characterId=3`，角色名 `神秘复苏模拟器发布版`。
- `AutoCardUpdaterAPI` / `MysteryDatabaseFrontend` 挂在 top window，marker 为 `mfrs-r2-6-coreapi-context-proxy`。
- 当前设置 radio 为 `sqlite` 选中、`native` 未选中。

**疑点**：
- `AutoCardUpdaterAPI.exportTableAsJson()` 返回 14 张神秘复苏表。
- `AutoCardUpdaterAPI.getTableTemplate()` 返回库默认 8 表。
- 需要继续查询 SQLite 物理表，判断是否只是模板状态口径不一致，还是 SQL 后端实际表结构也回退。

**已确认 bug 证据**：
- SQL 控制台只读查询 `sqlite_master`：业务表 0 张。
- `PRAGMA table_info(global_state)`：0 行。
- `SELECT game_time FROM global_state WHERE row_id = 1`：`no such table: global_state`。
- 临时表 smoke 成功并清理：`CREATE TEMP TABLE acu_sql_probe`、插入 `ok`、查询返回 `ok`、`DROP TABLE`、`sqlite_temp_master` 检查为 0，说明不是 SQLite 引擎整体失效。
- `await MysteryDatabaseFrontend.getPanelState()`：`templateLoaded:false`、`tableCount:8`、缺失 14 张神秘复苏表。
- `MysteryDatabaseFrontend.exportCurrentData()`：仍可导出 14 张神秘复苏表。

**当前判断**：SQLite 模式下存在业务 schema/当前模板状态未正确初始化的问题。它不是 R2 chat-scope 修复的 native 路径回归，而是 SQL 模式特有缺陷：数据导出口径仍能看到 14 表，但 SQL 物理表和面板模板判断口径不可用。

**补充判定：只读 0 表并非全部是 bug**
- 源码 `SqlTableService.executeQuery()` 明确不触发 `_ensureTablesFromTemplate()`；注释说明新开卡/空壳结构下只读查询 `no such table` 是预期，避免玩家首次填表前修改 DDL 时被提前锁表。
- `reloadCurrentChat()` 后，`getTableTemplate()` / `getPanelState()` 可恢复 14 表，但只读 `sqlite_master` 仍为 0，符合“首次写入才建表”的设计。

**写入路径证据**
- 执行幂等写入 `UPDATE global_state SET game_time = game_time WHERE row_id = 1;` 后，SQLite 物理业务表变成 14 张：`action_suggestions`、`characters`、`check_suggestions`、`chronicle`、`clues`、`collected_archives`、`collected_rules`、`controlled_ghosts`、`ghost_archives`、`global_state`、`locations`、`player_state`、`supernatural_events`、`supernatural_items`。
- `PRAGMA table_info(global_state)` 显示 `game_time`，`SELECT name FROM pragma_table_info('global_state') WHERE name IN ('game_time','current_time')` 只返回 `game_time`。
- 合法插入 `game_time='2026-06-04 12:34'` 成功、读出成功、随后删除成功，`row_id=1` 计数回到 0；无效测试未留下数据。

**剩余确认 bug**
- 写入/同步后，SQLite 物理表为 14，导出 API 也为 14，但 `AutoCardUpdaterAPI.getTableTemplate()` 和 `MysteryDatabaseFrontend.getPanelState()` 再次回退为库默认 8 表、缺 14 张神秘复苏表。
- 这会影响面板模板状态判断和嵌入仪表盘可见状态；不等同于 `current_time` 保留字 bug，后者在 6.2 写入路径已验证未复发。

## 2026-06-04 R2-7：资源占位提交证据

**结论**：R2-7 第 1 段已完成并推送。由于数据库 loader/前端会动态 import 自托管 fork，本轮必须用三段式发布链路：资源占位提交 -> 回填资源 commit hash 并重建 -> 发布版打包提交。

**资源 commit**：`be210de5f029c4720f5e3503d02f2bb4483b5be4`（`fix: repair chat-scoped database template loading`），已推送到 `origin/main`。该提交包含 `vendor/shujuku-sp-fork/index.js`、数据库 loader src/dist、数据库前端 src/dist；dist 中 vendor URL 仍使用 `__RESOURCE_HASH__` 占位符，供下一步回填该 commit 的完整 hash。

**提交前验证**：`git diff --check` 通过；`node --check vendor/shujuku-sp-fork/index.js` 通过；无关 `dist/神秘复苏模拟器/界面/状态栏/index.html` 构建噪声已恢复。首次 push 遇到远端 `afb016f [bot] Bump deps`，已确认只改 `package.json`/`pnpm-lock.yaml`，rebase 后无冲突并成功 push。

**回填 dist commit**：`6a7bb0827b95f06eab04f4bf44766867c7cc2794`（`fix: pin database fork resource hash`），已推送到 `origin/main`。该提交把数据库 loader 和数据库前端的 CDN vendor URL 从 `@__RESOURCE_HASH__` 回填为 `@be210de5f029c4720f5e3503d02f2bb4483b5be4` 并重建 dist。发布版 `scripts/publish-card.mjs` 的 `CDN_REF` 应指向 `6a7bb0827b95f06eab04f4bf44766867c7cc2794`，这样发布卡先加载回填 dist，再由 dist import 资源 commit 中的 vendor fork。

**发布 commit**：`212f1980572fc705227e268b6666ae8688aefce4`（`chore: release database chat-scope fix`），已推送到 `origin/main`。发布版版本为 `6.2`，cache 为 `phase113-chat-scope-coreapi-proxy`。发布版 YAML 与 PNG `chara/ccv3` 均验证通过：新 `CDN_REF` 与 cache 各 6 命中，旧 `d2d5733`/`phase112-game-time-rename`/`__RESOURCE_HASH__`/`localhost:5500` 均 0 命中；PNG 的 `data.character_version` 为 `6.2`。

**发布后复核**：CDN 资源已生效，database loader、database frontend、vendor fork 均返回 200；loader/frontend 内容包含 vendor 资源 commit `be210de5f029c4720f5e3503d02f2bb4483b5be4`，vendor fork 内容包含 `createSillyTavernContextProxy_ACU`。CDP 真机选择发布版 `characterId=3` 后，运行时实际加载 `6a7bb0827b95f06eab04f4bf44766867c7cc2794` 的发布 dist 与 `be210de5f029c4720f5e3503d02f2bb4483b5be4` 的 vendor fork；`apiMarker/hostMarker` 均为 `mfrs-r2-6-coreapi-context-proxy`，面板 `templateLoaded:true/tableCount:14/missing:[]`。`reloadCurrentChat()` 后 chat[0] 上存在 `TavernDB_ACU_ScopedConfig`，keys 为 `version/template/templateArchives`，仍 14 表。

## 项目运行流程常驻参考

### 1. 目录和职责

- 开发版角色卡目录：`src/神秘复苏模拟器/`。这里是主要编辑源，包括开发版 `index.yaml`、世界书、数据库、第一条消息、系统提示词、脚本源码和头像。
- 发布版角色卡目录：`src/神秘复苏模拟器发布版/`。这里由发布脚本从开发版镜像生成，并额外保留发布版版本号与 CDN 链接。
- 构建产物目录：`dist/神秘复苏模拟器/`。`npm run build` 生成脚本/界面产物，发布版 CDN 会指向这里的资源。
- 发布脚本：`scripts/publish-card.mjs`。负责镜像开发版到发布版、替换 localhost 链接为 CDN、保留 `版本: '4.0'`、调用 `tavern_sync.mjs bundle` 打包发布版 PNG。
- 角色卡打包脚本：`tavern_sync.mjs`。由 `npm run build` 或 `publish-card` 调用，将配置、世界书和脚本信息写入 PNG 的 `chara/ccv3` 元数据。

### 2. 开局页运行链路

- 实际首屏开局入口在 `src/神秘复苏模拟器/index.yaml`，关键条目是 `[显示]渲染神秘复苏开局页`。不要只改 `src/神秘复苏模拟器/世界书/自定义开局/欢迎页.txt`，否则会出现“源欢迎页变了，实际首屏没变”的错位。
- `index.yaml` 的首屏入口使用静态 `<select data-mfrs=anchor>` 承载开局节点。当前真实节点为 55 个，另有 1 个占位 option；三级菜单按“原著事件阶段 -> 接入视角/地点 -> 具体节点”组织。
- 每个真实节点 value 必须保持七字段：`name|time|loc|phase|pressure|intel|boundary`。`time` 和 `loc` 是节点自带信息，不新增可见手填框。
- 每个真实节点应带 `data-group/data-chapter/data-name/data-time/data-loc`，供增强脚本分组和显示。
- `src/神秘复苏模拟器/脚本/界面美化/index.ts` 运行在 SillyTavern 宿主页，构建后由 `dist/神秘复苏模拟器/脚本/界面美化/index.js` 注入。它会把静态 select 增强为三级 `.mfrs-dropdown`：大类 -> 中间组 -> 事件。
- 点击提交时，界面美化脚本读取节点七字段，生成“神秘复苏·开局设定”文本并写入 `#send_textarea`。提交文本需包含剧情节点、当前时间、当前地点、原著阶段、事件压力、玩家可见情报、禁止泄露边界。

### 3. 开发构建流程

- 常用构建命令：`npm run build`。
- 构建会运行 webpack，生成 `dist/神秘复苏模拟器/**`，并通过 `tavern_sync` 重新打包开发版 PNG/相关配置。
- Windows/当前沙盒下 `npm run build` 可能在沙盒内报已知 `spawn EPERM`。这不是业务代码错误；需要按权限流程在沙盒外重跑同一命令。
- 构建后可检查 `dist/神秘复苏模拟器/脚本/界面美化/index.js` 是否包含 `mfrs-dropdown`、`querySelectorAll('option')` 和“当前时间”相关逻辑。

### 4. 发布版同步和打包流程

- 先确认开发版源码、dist 和开发版 PNG 已构建并验证。
- 如果发布版需要引用新版 CDN 脚本，必须采用两段式发布：
  - 第一段：提交并推送包含新版 `dist` 的资源提交。
  - 第二段：把 `scripts/publish-card.mjs` 中的 `CDN_REF` 更新为第一段资源提交完整 hash，把 `CDN_CACHE_VERSION` 更新为新的唯一值。
  - 然后运行 `npm run publish-card -- 神秘复苏模拟器发布版`，生成发布版 `index.yaml` 和发布版 PNG。
  - 最后提交并推送发布版 `index.yaml`、发布版 PNG、`scripts/publish-card.mjs`。
- 可先 dry-run：`npm run publish-card -- 神秘复苏模拟器发布版 --dry-run`。正常应镜像 5 个目录、约 386 个世界书文件、替换 6 处链接并保留版本 3.0。
- 正式发布：`npm run publish-card -- 神秘复苏模拟器发布版`。成功后会提示已打包到 `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png`。
- 发布版必须保留 `版本: '4.0'`。`scripts/publish-card.mjs` 中的 `releaseVersion: '4.0'` 是防止开发版版本覆盖发布版版本的关键设置。

### 5. 验证流程

- 基础检查：`git diff --check`。
- 构建检查：`npm run build`；若沙盒内 `spawn EPERM`，按权限流程沙盒外重跑。
- 发布版 YAML 检查：`src/神秘复苏模拟器发布版/index.yaml` 应包含 `版本: '4.0'`、当前 `CDN_REF`、当前 `CDN_CACHE_VERSION`、强外挂文案和后期/番外节点关键字。
- PNG 元数据检查：PNG 的 `tEXt` 块里 `chara` 与 `ccv3` 是 base64 JSON，不能直接明文搜索；需先解码，再检查版本、CDN hash/cache、`当前时间`、`mfrs-dropdown`、强外挂文案和节点关键字。
- 浏览器/真实页检查：可用 Chrome DevTools Protocol。真实 SillyTavern 页面在 `http://127.0.0.1:8000/`，CDP 端口通常为 `127.0.0.1:9222`。刷新后若停在最近聊天列表，需要点回具体聊天后再检查欢迎页 root。
- 真实页通过标准：1 个欢迎页 root、1 个 dropdown、6 大类、17 中间组、55 事件项；早期节点和后期/番外节点都能写入七字段开局文本；390px 视口无横向溢出；本轮相关运行时异常为 0。
- SQL/数据库运行日志标准：用户截图确认 SQL 报错会显示在 `SP·数据库 III` 的运行日志中。路径为 SillyTavern 左下角菜单 -> `SP·数据库 III` -> `高级工具` -> `运行日志`；这是 SQL 复测的权威观察面。
- SQL 问题复测时不要只依赖聊天正文、console、网络请求、页面 body 文本计数，或“可见区域没有 ERROR”的判断。必须进入上述运行日志，记录当前最新时间戳或清空日志，再触发新一轮生成/SQL 行为；只有新时间戳后的日志行才作为本轮复发证据。
- 端口分工：`127.0.0.1:9222` 是 Chrome DevTools/CDP 端口，不是酒馆地址；SillyTavern 地址是 `http://127.0.0.1:8000/`；`localhost:5500` 用于本地静态资源服务和直接导入本地 dist/vendor 做验证。

### 6. 常见坑

- 不要只改 `世界书/自定义开局/欢迎页.txt`。实际首屏入口还在 `index.yaml`。
- 不要新增可见时间/地点输入框。`time`/`loc` 来自开局节点自身。
- 不要让发布版直接引用尚未推送的 dist。发布版 CDN 必须指向已经存在于远端的资源提交。
- PNG 元数据检查必须解码 `chara/ccv3` base64 JSON。
- 构建可能回写无关 dist 文件，提交前用 `git diff --name-only` 和 `git diff --stat` 确认提交范围。
- `npx tsc --noEmit` 目前仍有既有全项目问题：`LiteralUnion`、Web Bluetooth 类型、未使用 `z`。不要把它误判成本轮开局/发布改动引入的问题。

## 当前稳定发现

- 实际首屏入口是 `src/神秘复苏模拟器/index.yaml` 的 `[显示]渲染神秘复苏开局页`，不是单独的 `世界书/自定义开局/欢迎页.txt`。
- `time`/`loc` 属于开局节点自带信息，不应新增可见手填框。
- 当前开局节点结构为 6 大类、17 中间组、55 事件项 + 1 占位；真实节点均为七字段。
- 真实页曾出现 `undefined is not iterable`，根因是宿主页 DOM/选择器组合/option 读取不够防御；已通过 `inWelcomeRoots()`、`isHostSelectElement()`、`querySelectorAll('option')` 修复。
- 发布版同步需要 `releaseVersion: '4.0'`，否则开发版 `index.yaml` 可能覆盖发布版版本号。
- 两段式 CDN 发布是必要约束：发布 PNG 的 CDN_REF 必须指向已经推送且包含新版 dist 的资源提交。
- PNG 的 `chara/ccv3` 是 base64 JSON；用无符号大端读取 PNG chunk 长度，解码后再检查内容。
- 真实 SillyTavern 页面刷新后可能停在最近聊天列表；需要点回具体聊天后才能看到欢迎页 root。

## 当前发布事实

- 资源提交：`d7bc106b54cbd66542d1c8265537cdad00eb8096`。
- 发布提交：`6851b851e9d3f5977f5684e8aa9934510176cc72 chore: bump mystery revival release to 4.0`。
- 最新远端 HEAD：`e373a371a4ee7467e18de1bf088c94e8cfb87355 chore: reorder mystery revival start anchors`，已推送到 `origin/main`。
- 发布 tag：`v0.0.43`。
- CDN cache：`phase106-start-anchor-runtime-fix-3-0`。
- 发布版版本：`4.0`。
- 最近完整验证：`git diff --check` 通过；`npm run build` 沙盒外通过；发布版 YAML 与 PNG 元数据均含新 hash/cache、`当前时间`、`mfrs-dropdown`、强外挂文案和「第四代与阴阳路·旧时代回声」。

## 重要历史摘要

- 2026-06-01 完成发布版 3.0 与默认暗黑文章样式调浅；推送后远端产生 bot bundle。
- 2026-06-01 完成全原著剧情世界书中间层补强与事件索引补强，覆盖正文至本地文本末章及番外。
- 2026-06-01 至 2026-06-02 做过世界书预算与注入顺序精修，高成本常驻条目改为按需触发，缓解 8192 预算下剧情锚点被挤出的问题。
- 2026-06-02 参考 `v10.2.png` 重新设计开局剧情选择入口，将旧粗节点扩展为三级 55 节点。
- 2026-06-02 完成开发版、发布版、本地 CDP、真实 SillyTavern 页面复测，并完成最终公开发布。

## 已知未解决问题

- `npx tsc --noEmit` 仍有既有全项目类型问题：`@types/function/worldbook.d.ts` 的 `LiteralUnion` 泛型参数、`@vueuse/core` Web Bluetooth 类型缺失、`src/神秘复苏模拟器/脚本/变量结构/index.ts` 未使用 `z`。
- 世界书密集提示下 8192 预算仍可能 overflow；后续可继续压缩 `系统提示词` 与变量输出格式。
- 真实页控制台可能仍有数据库模板、固定状态栏或宏弃用日志；这些不来自开局增强路径。

## 2026-06-04 数据库前端停在 8 表·根因诊断（真机白盒确认·未改码未发布）

**现象**：真实酒馆（127.0.0.1:8000，正开神秘复苏卡，chatLength 1）打开后生效模板是库默认 8 表（全局数据表/主角信息表/重要角色表/主角技能表/背包物品表/任务与事件表/纪要表/选项表），`templateLoaded:false`，缺全部 14 个神秘复苏表。三接口（getTableTemplate/getPanelState/exportTableAsJson）一致 = 全 8 表，非读取假象。

**已排除**：
- 库本体加载 OK（`AutoCardUpdaterAPI` 挂载，48+ 方法齐全）；前端注入 OK（`MysteryDatabaseFrontend`/`MysteryAcuVisualizer` 在）。
- 库 chat 引用 OK：库用 Proxy 包装 SillyTavern API（fork 29945-29968），每次读 `.chat` 都走 `getContext()`，与 ST 的 `ctx.chat` 同源（真机 `sameRef:true`）。不是写到悬空旧引用。
- chat[0] 可写 OK：手动给 `ctx.chat[0].TavernDB_ACU_ScopedConfig` 写字段 + `saveChat()` → 落盘存活（`afterSaveHasField:true`）。宿主侧无阻碍。
- 模板数据 OK：打包 `神秘复苏表格SQL_v1.json` 顶层含 `mate:{type:chatSheets,version:2}` + 14 表齐全，过 `importTemplateFromData` 的 mate 校验（手动复核）。
- 预设库内容 OK：`getTemplatePresetNames()` 含「神秘复苏模拟器」预设（autofix 历史存进的），且内容是正确的 14 表（见下方决定性实验）。

**★根因（决定性实验）**：**chat-scope 应用路径坏了，global-scope 正常。**
- `switchTemplatePreset('神秘复苏模拟器', {scope:'global'})` → **立即变 14 表**（三接口一致确认）。global 路径走 `applyTemplateSnapshotToScope_ACU` 9263 `_set_TABLE_TEMPLATE_ACU` + 9265 `saveCurrentProfileTemplate_ACU`，不依赖 chat scope state 回算 → 工作正常。
- 而所有 chat-scope 写入（`importTemplateFromData(data,{scope:'chat'})` / `switchTemplatePreset(name,{scope:'chat'})` / `injectTemplatePresetToCurrentChat` / 卡的 `importMysteryTemplate`）**全部 return `success:true` 但实际仍 8 表**，且 chat 数组**没有任何一条消息**被写入 `TavernDB_ACU_ScopedConfig`（`anyMsgHasScope:[]`）。
- 即使**手动**把 `chat[0].TavernDB_ACU_ScopedConfig` 写成 `{mode:'preset_link',presetName:'神秘复苏模拟器'}` 再触发 chat 切换，生效模板**仍是 8 表**——证明坏的不只是写入侧，`applyTemplateScopeForCurrentChat_ACU`（fork 24998）的 chat-scope **读取/应用侧**也没把 preset_link 解析成 14 表生效。

**源码层机制（fork 已读实）**：
- chat 路径核心矛盾在 `applyTemplateSnapshotToScope_ACU`（9252）：9263 先把内存设成 14 表，9278 又调 `applyTemplateScopeForCurrentChat_ACU()` 按 chat scope state **重算覆盖**；若 chat scope state 读回非 chat_override（25015 `if(!targetSnapshot?.templateStr)` 命中）→ 25016 回退 `getGlobalTemplateSnapshotForCurrentProfile_ACU()`（全局，当前=8 表）→ 内存被改回 8 表。但返回值（9283）基于 snapshot 恒真 → **报 success 但实际回退**。这就是"成功假象"。
- `switchTemplatePreset(scope:chat)` 走的是另一支 `activateChatTemplatePresetSelection_ACU`（23274）：「神秘复苏模拟器」是 global 预设、本地无 chat 条目 → 走 else 的 `preset_link` 分支（23297-23325），同样最终靠 `applyTemplateScopeForCurrentChat_ACU` 应用 → 同样回退 8 表。
- ⚠️ 待进一步定位的"为何 chat-scope 写入没落 chat[0]"：分支逻辑看似正确（scopeMode:'chat_override'→`buildChatTemplateScopeStateFromCurrent_ACU`→`setCurrentChatTemplateScopeState_ACU`），但真机 chat[0] 始终无字段。最可能 `buildChatTemplateScopeStateFromCurrent_ACU`（23525）返回 null（其 `sanitizeTemplateSnapshotForChat_ACU` 无 templateStr）→ 9221 `if(templateState)` 跳过 → 不写。下次修复需在此处加日志或单步确认。

**autofix 为何在真机没成功**：卡的 `runMysteryTemplateAutofix`（数据库前端/index.ts:179）用的正是坏掉的 `importTemplateFromData(templateData,{scope:'chat'})` + 退避重试。每次重试 `importTemplateFromData` 都 return success（假象），但 `readTemplateStatus` 复查恒 8 表 → 重试 8 次全失败 → 最终 toastr warning。**phase111 的退避重试治不了这个 bug**，因为它假设失败是"时序竞态"（设置没就绪），但真实失败是"chat-scope 应用路径本身坏了"，重试多少次都回退 8 表。（注：6-03 progress 记录的"真机验证 14 表成功"当时可能恰好走到能生效的状态/或当时库版本行为不同，本次 6-04 复现稳定失败。）

**临时缓解（本次真机已执行，让用户当前能玩）**：`switchTemplatePreset('神秘复苏模拟器',{scope:'global'})` 把全局预设切到 14 表 → 三接口确认 14 表/templateLoaded:true/missing:[]。**但这是 global scope，不是卡设计的 chat scope；且仅当前环境生效，未改代码未发布，重开/换库不持久。**

**修复方向（待定，未实施）**：
1. 卡侧规避（推荐起点）：autofix/手动导入改用 **global scope** 通道（`importTemplateFromData(data,{scope:'global',presetName:'神秘复苏模拟器'})` 存预设 + `switchTemplatePreset(name,{scope:'global'})` 切生效），绕开坏掉的 chat scope。代价：global 改的是 profile 级模板（影响该 profile 下所有聊天），需评估是否可接受；6-03 当初特意从 global 改 chat（phase110）就是为隔离，要权衡。
2. fork 侧根治：修 `applyTemplateScopeForCurrentChat_ACU` / `buildChatTemplateScopeStateFromCurrent_ACU` 的 chat-scope 写入+应用链。改动大、风险高，需精确定位 `sanitizeTemplateSnapshotForChat_ACU` 为何在 chat 路径返回空。
3. 先确认这是不是 fork patch 引入的（对比上游 spv3.9.5 原版 chat-scope 是否同样坏）——若上游也坏则是库 bug，若仅 fork 坏则是 patch 副作用。

## 2026-06-04 件5 第一步：chat-scope bug 归属判定（字节级铁证·结论=上游库 bug 非 fork 副作用）

**方法**：`curl` 下载上游 `AlbusKen/shujuku@spv3.9.5/index.js`（92374 行，`node --check` 通过、IIFE 收尾完整）落地 `.tmp-upstream-spv395.js`，与本仓库 `vendor/shujuku-sp-fork/index.js`（92376 行）做全文件 + 逐函数 diff。

**diff 总览**：fork 相对上游仅 **44 insertions / 42 deletions**，全部落在两类区域：
- 提示词常量区（≤1592 行）：21 个 hunk —— 即阶段1 的 AM→SP patch（chronicleSheet/PLOT 召回/填表头/恋爱语气段等）。
- 注释/文案/编码格式化区：9 个 hunk（7968/15639/35198/37956/90097/90918/91463）。
- **业务逻辑区（1593-90094，排除上述已知文案）：0 处改动。**

**chat-scope 核心区（9000-29999）唯一改动 = 15639 行**：`formatSummaryIndexCode_ACU` 的 `return \`AM${...}\`` → `\`SP${...}\``，纯编码字符串格式化，与模板 scope 应用链无关。

**逐函数字节比对（fork 行号 = 上游 +2，因 658-668 patch 多 2 行）——7 个 chat-scope 关键函数全部完全一致（diff 空）**：
| 函数 | fork 行 | 上游行 | 角色 | 比对 |
|---|---|---|---|---|
| `applyTemplateSnapshotToScope_ACU` | 9252 | 9250 | scope 应用入口（含 9278 回算覆盖） | 一致 |
| `applyTemplateScopeForCurrentChat_ACU` | 24998 | 24996 | **回退到全局 8 表的逻辑** | 一致 |
| `buildChatTemplateScopeStateFromCurrent_ACU` | 23525 | 23523 | chat scope state 构造（疑似返回 null） | 一致 |
| `sanitizeTemplateSnapshotForChat_ACU` | 23162 | 23160 | chat 快照清洗（疑似丢 templateStr） | 一致 |
| `activateChatTemplatePresetSelection_ACU` | 23274 | 23272 | switchTemplatePreset(chat) 分支 | 一致 |
| `setCurrentChatTemplateScopeState_ACU` | 23543 | 23541 | 写 chat scope state | 一致 |
| `getGlobalTemplateSnapshotForCurrentProfile_ACU` | 23607 | 23605 | 全局快照来源 | 一致 |

**★结论：chat-scope 应用通道坏掉是上游 spv3.9.5 库本身的缺陷，不是我们 fork 的 AM→SP patch 引入的副作用。** 整条 chat-scope 写入+应用链在 fork 与上游间字节一致。

**对修复路线的影响**：
- 排除了"patch 改坏了 chat-scope"这一可能 → 修复时不必担心是自己引入的、也无需回退 patch。
- 路2（fork 根治）= 实质是帮上游修一个真 bug，改动落在与 AM→SP patch 完全不重叠的区域，不会冲突；但仍是改 5.9MB 库本体，风险/维护负担照旧。
- 路1（卡侧改 global）依然成立且最小侵入：global 通道（`applyTemplateSnapshotToScope_ACU` 的 9263/9265 分支）字节一致且真机已验证可即时切 14 表，绕开坏的 chat 通道。
- **临时取证产物 `.tmp-upstream-spv395.js` 用完即删，不提交。**

## 2026-06-04 件5 第二步前置：chat-scope 写入侧根因深挖（真机白盒·收敛到唯一失败点）

**目标**：在选路线前，精确定位 chat-scope「写入返回 success 但 chat[0] 无字段」发生在哪一步，判断路2 的改动范围。

**真机环境**：当前开**发布版**卡（characterId 3，chatId `神秘复苏模拟器发布版 - 2026-06-03@23h56m56s335ms`，chatLength 1）。注意环境被上轮手动 global 切换污染（effective 仍 14 表），诊断时已注意排除该干扰。

**三条写入路径真机实测——全部 return `success:true` 但 chat[0] 零写入**：
| API 调用 | 走的分支 | 返回 | chat[0] FIELD setter 触发 | saveChat 调用 |
|---|---|---|---|---|
| `importTemplateFromData(14表, {scope:'chat'})`（autofix 真实用） | chat_override（9197 build state 带 templateStr） | success:true | **0 次** | 否 |
| `switchTemplatePreset('神秘复苏模拟器',{scope:'chat'})` | preset_link（23297 else，我方是 global 预设无 local entry） | success:true | **0 次** | 否 |
| `injectTemplatePresetToCurrentChat('神秘复苏模拟器')` | 同上 preset_link | success:true | 0 次（chat0 字段列表无 FIELD） | — |

**取证手法**：用 `Object.defineProperty(ctx.chat[0], 'TavernDB_ACU_ScopedConfig', {set})` 装 setter 探针 + hook `ctx.saveChat`。三条路径调用后 **setter 零触发、saveChat 未被调**。→ 写入侧 `setCurrentChatTemplateScopeState_ACU` 的 23576 `first[FIELD]=container` 从未执行到 `getContext().chat[0]`。

**关键对照实验**：
- **手动**给 `ctx.chat[0].TavernDB_ACU_ScopedConfig` 写合法 preset_link state（`{version:2,template:{'':{mode:'preset_link',presetName:'神秘复苏模拟器',...}}}`）+ `ctx.saveChat()` → **落盘存活**，且后续 `switchTemplatePreset(chat)` 未覆盖它。→ 证明 **ctx.chat[0] 可写、读取侧 `getCurrentChatTemplateScopeState_ACU` 认这个对象**。
- 即写入目标（ctx.chat[0]）本身没问题，问题在**库写入时没写到这个对象**。

**源码层链路（全部已读实，应用侧逻辑正确）**：
- 应用侧 `applyTemplateScopeForCurrentChat_ACU`（24998）逻辑**正确**：preset_link(25007)+有 presetName(25008) → 25009 从全局预设取 templateStr（我方「神秘复苏模拟器」预设存在且正确）→ 本应得 14 表。chat_override(25004)+templateStr → 直接用。
- 但 25001 `getCurrentChatTemplateScopeState_ACU` 依赖 chat[0] 有 FIELD；**因写入侧没落地 → scopeState=null → 25015 命中回退 `getGlobalTemplateSnapshotForCurrentProfile_ACU`（全局，干净环境=默认 8 表）**。这就是"停 8 表 + 报 success 假象"的完整闭环。

**★根因收敛到唯一嫌疑点**：写入侧 `setCurrentChatTemplateScopeState_ACU`（23543）的 `getChatArray_ACU()`（3174 = `SillyTavern_API_ACU.chat`）拿到的 chat 数组，**与页面 `getContext().chat` 不是同一引用**（库写到了自己持有的、与页面不同源的 chat 数组，故 ctx.chat[0] 的 setter 探针抓不到、saveChat 也没触发到页面）。
- 与上轮 findings「sameRef:true」不矛盾：上轮测的是**读** `ctx.chat` 同源；本轮证明的是**写入路径内部**用的 `SillyTavern_API_ACU.chat` 引用可能在某些时机（冷启动/userscript bridge 注入时序）与页面 ctx.chat 脱钩。`__ACU_USERSCRIPT_BRIDGE__` 只暴露 settings（extension_settings/saveSettings），不含 chat，库的 chat 引用来源是另一套注入。
- ⚠️ 此"不同源"为**强推断**（由 setter 零触发 + saveChat 未调 + 手动写 ctx.chat[0] 可被读取侧认，三者反推），尚未直接打印出 `SillyTavern_API_ACU.chat === getContext().chat` 的 false。若走路2 需先在干净环境直接验证这一点。

**对路线选择的硬性影响**：
- **路2 fork 根治**：真正要修的不是 scope state 构造/应用逻辑（那些都对），而是**库内部 chat 引用与页面 getContext().chat 的同源性**。这属于库的宿主集成层（`SillyTavern_API_ACU` 如何绑定 chat），改动点比预想更底层、更脆，且我尚未 100% 直接证实"不同源"。**风险高于第一步设想的"小而准"**。
- **路1 卡侧改 global**：完全绕开坏掉的 chat 写入侧（global 走 9264-9265 `saveCurrentProfileTemplate_ACU`，不碰 chat 数组，真机已验证可即时切 14 表）。**最小侵入、确定可行**。代价仍是 profile 级（影响该 profile 所有聊天，与 phase110 隔离目标冲突）。
- **倾向路1**：根因虽指向库的 chat 引用集成，但修它需先坐实"不同源"且改宿主绑定层，回报/风险比不如路1。路1 用一个真机已验证 100% 可用的通道换取"丢 per-chat 隔离"，对单卡单玩家场景这个代价基本无感。

### ★2026-06-04 续：推翻"不同源"推断 + 坐实真正根因层

应用户"先坐实根因再决定"，继续白盒到底。**先前的"库内部 chat 引用与页面不同源"推断被代码证伪**：
- 读 fork 29942-29969：插件模式下 `SillyTavern_API_ACU` 是 **Proxy**，`get(prop)` 每次执行 `rawST.getContext()[prop]`。故 `SillyTavern_API_ACU.chat` **每次都 === 页面 `getContext().chat`，绝对同源**。
- 真机直接验证：`getContextChatSameRef:true`、`probedC0_isSameAsLiveNow:true`（我的探针装在与库同一个 chat[0] 对象上）。**不同源被排除。**

**更强探针实验（覆盖 chat 全索引 FIELD setter + hook saveChat/saveChatConditional/saveMetadata）**：
- `importTemplateFromData(14表,{scope:'chat'})`（autofix 真实路径）→ `writes:[]`、`saveLog:[]`、return success、chat0 无字段。**对 chat 任意索引的 FIELD 写入、任何 save 调用全部零触发。**
- 三个 chat-scope 入口（importTemplateFromData / switchTemplatePreset / injectTemplatePresetToCurrentChat）全部同样表现。
- scope 未被误判 global：探针用独特 presetName 跑，`newPresetAppeared:[]`（没新增 global 预设）→ 确实进了 chat 分支，但 **chat 分支既不写 chat[0] 也不存预设，数据凭空消失，只返回 success**。

**console 历史警告（冷启动期，msgid 1-22 反复出现）**：
- `[shujuku_v120][ChatGateway] saveChat 不可用，跳过保存`（`saveChatToHost_ACU` 3196-3197 打：`typeof SillyTavern_API_ACU?.saveChat !== 'function'`）
- `[WorldbookGateway] getCurrentCharPrimaryLorebook 不可用，返回 null`
- **含义：autofix 在冷启动跑的那一刻，`getContext()` 尚未挂上 saveChat（ST 异步初始化未完成）→ chat-scope 写入即使发生也无法持久化。** 这是一个**真实的叠加问题**（时序），但**不是手动调用失败的原因**——现在 `getContext().saveChat` 已是 function，手动调坏通道仍 writes:[]/saveLog:[]。

**根因层定性（已足够支撑决策，无需再单步到具体行）**：
- chat-scope 写入分支在真机环境**整体不可靠**：(a) 冷启动时序——autofix 跑在 saveChat 就绪前，写入无法落盘；(b) 即便 saveChat 就绪，chat_override 写入仍凭空丢失（templateState 链路在某运行时状态下未落地，且返回 success 假象）。两者叠加，phase110/111 的 `scope:'chat'` 在新玩家全新环境下系统性失败。
- **关键结论：无法通过卡侧调整 `scope:'chat'` 的任何调用参数绕过**（已遍历三入口 + 带/不带 presetName）。要么换通道（路1 global），要么改库写入侧+时序（路2）。

**对路线的最终影响**：
- 路1（卡侧改 global）：global 通道（9264-9265 `saveCurrentProfileTemplate_ACU`）走 settings 持久化（saveSettings，冷启动期也可用，bridge 已暴露 saveSettings），**完全绕开 chat 写入侧 + chat saveChat 时序双重坑**。真机已验证 global 切换 100% 即时生效 14 表。**最小侵入、确定可行。** 代价=profile 级、丢 per-chat 隔离。
- 路2（fork 根治）：要同时修 (a) chat-scope 写入丢失 + (b) autofix vs saveChat 就绪时序，改动面比预想更大（不止一处），且 (a) 的精确失败行仍需在干净环境单步。风险/工作量最高。
- **强化倾向路1**：坐实根因后，路2 的复杂度不降反升（双重坑），而路1 的可靠性被进一步印证（global 不碰这两个坑）。

### ★★2026-06-04 根因单步到具体行（决定性·IDB 设置就绪闸门卡死）

继续深挖，把"chat 写入凭空丢失"定位到**精确代码行 + 真机 console 实证**。这是件5 的最终根因。

**决定性 console 对比实验（同一真机会话）**：
| 探针区间 | 操作 | console 关键日志 | 结果 |
|---|---|---|---|
| PROBE_IMPORT_MYSTERY | `MysteryDatabaseFrontend.importMysteryTemplate()`（autofix 真实入口，此时 saveChat 已可用、非冷启动） | `[ChatGateway] saveChat 不可用，跳过保存` + `[设置保存] 设置尚未完成可靠加载，已拒绝本次保存` | 表 8→8 ❌，writes:[]、saveLog:[] |
| PROBE_SAVESETTINGS_TEST | `switchTemplatePreset(scope:'global')` | **无拒绝日志**，`Event emitted: settings_updated` ✓ | 表 →14 ✓ |

**最干净的复现序列**（先 resetTemplate 制造干净 8 表起点，排除 global 残留干扰）：start(global污染)=14 → resetTemplate=8 → **importMysteryTemplate=8（仍失败）** → 切 global=14。`importReturn:true` 但 writes/saveLog 全空 → **autofix 在 saveChat 已可用、非冷启动的条件下仍稳定失败 → 排除"纯冷启动时序"，坐实写入侧独立必现 bug。**

**精确根因链（源码逐行 + 真机 IDB 状态实证）**：
1. 库配置存于 IndexedDB `shujuku_v120_config_v1`（store `kv`，真机实查 4 条：globalMeta / profile settings 123KB / profile template 37KB / templatePresets 241KB 含「神秘复苏模拟器」14 表）。**数据完整无缺，不是数据问题。**
2. `settingsStorageReadyForSave_ACU`（24400 模块级，初值 false）只在 `loadSettings_ACU`（24473）末尾 24659/24755 被设 true。
3. **但 `loadSettings_ACU` 24476-24478**：`if(!configIdbCacheLoaded_ACU && isIndexedDbAvailable_ACU()){ scheduleSettingsReloadAfterIdbReady_ACU('load_before_config_cache_ready'); return; }` —— IDB 缓存未就绪时**提前 return，不设 ready 标志**，靠异步重载自愈。
4. `scheduleSettingsReloadAfterIdbReady_ACU`（24402）有**一次性闸门** 24403 `if(settingsReloadAfterIdbScheduled_ACU) return`。真机环境下 `ensureConfigIdbCacheLoaded_ACU().then(()=>loadSettings_ACU())` 重载链未能让 `settingsStorageReadyForSave_ACU` 翻 true（IDB 就绪/重载时序在此宿主环境断裂）→ 标志**永久停 false**。
5. 于是 `saveSettings_ACU`（24428）命中 `if(!settingsStorageReadyForSave_ACU)` → 拒绝保存；`saveChatToHost_ACU`（3196）`SillyTavern_API_ACU.saveChat` 在 autofix 时机不可用 → 跳过保存。**chat-scope 写入被双锁拦截，但上层返回 success 假象 → 永远停 8 表。**
6. **global 通道**走 `saveCurrentProfileTemplate_ACU`（9264-9265）+ `settings_updated` 事件，**不经过这两道锁**（真机 console 实证 global 切换无拒绝日志、settings_updated 成功、表→14）。

**这条 IDB 就绪闸门同时解释了**：(a) 为何 chat-scope 必现失败（不是时序而是 ready 标志永久 false）；(b) 为何 console 反复打 `saveChat 不可用`+`设置尚未可靠加载`（autofix 8 次退避重试每次撞同一锁）；(c) 为何 phase111 退避重试治不了（重试再多次 ready 标志也不会翻）；(d) 为何 global 100% 可靠（绕开锁）。

### ★件5 修复路线最终判定（根因坐实后）

**回答用户"有没有彻底修复且不产生新 bug 的方案"：**
- **路1（卡侧改 global）确定能根治"显示 14 表"目标、且无写入层新 bug**（global 真机已验证稳定）。唯一可预测副作用 = profile 级生效：**仅当玩家在同一 profile 同时玩别的数据库卡才会模板串台**；只玩本卡的玩家完全无感。代价是丢 per-chat 隔离。
- **路2（fork 根治）理论最干净（保留隔离）但风险最高**：要修的根因是**库的 IDB 设置就绪闸门在本宿主环境卡死**（`settingsStorageReadyForSave_ACU` 永久 false），不是某个孤立小逻辑。修它要动 `loadSettings_ACU` / `scheduleSettingsReloadAfterIdbReady_ACU` 的异步初始化时序，这是库的核心存储层，影响**所有**保存路径（设置/模板/chat），改错会波及全库持久化。且需在干净环境反复验证 IDB 就绪链。**改动面 = 库存储核心，远超"小而准"。**
- **诚实结论：没有"零成本+零新bug+保留隔离"的方案。** 路1=可控小代价（串台，单卡无感）确定可行；路2=理论完美但高风险大改库核心。

**修复方向建议（路1 具体落地，待用户拍板）**：autofix（`数据库前端/index.ts:179 runMysteryTemplateAutofix`）改用 `importTemplateFromData(data,{scope:'global',presetName:'神秘复苏模拟器'})` 存预设 + `switchTemplatePreset('神秘复苏模拟器',{scope:'global'})` 切生效；手动入口（:286 importMysteryTemplate）同步改 global。两 API 真机均已验证。注意：phase110 当初从 global→chat 的隔离目标要主动放弃并在 planning 标注（这是有意的取舍，非回退失误）。

**真机环境快照**：HEAD `286d8b5`、发布版 6.1。当前 chat = `神秘复苏模拟器 - 2026-06-03@23h57m24s286ms`、characterId 2、chatLength 1、非 group。预设库残留 5 个 `导入模板_2026-06-03-xxx` 废预设 + 1 个「神秘复苏模拟器」。

### 2026-06-04 R2-0：路线2干净基线复现与安全备份

**执行范围**：仅真机 CDP 复现与记录，不改业务代码、不构建、不发布。页面为 `http://127.0.0.1:8000/`，当前卡 `characterId=3` / `神秘复苏模拟器发布版`，chatLength=1。

**静态基线**：
- Git HEAD：`286d8b5299bf937478161193ff269729810c2859`。
- fork 文件：`vendor/shujuku-sp-fork/index.js` SHA256 = `B01BA510AED3A94B4261FA37BD51D30774647782389EBC122C1165C2AB0B3DE9`。
- 发布脚本：`CDN_REF='d2d5733'`，`CDN_CACHE_VERSION='phase112-game-time-rename'`，`releaseVersion='6.1'`。
- 业务源码未改；仓库已有 dist 脏文件是进入 R2-0 前已存在的构建产物噪声，R2-0 未运行 build。

**IDB 快照**（`shujuku_v120_config_v1` v1，store=`kv`，仅记录 key 与 JSON size）：
| key | size |
|---|---:|
| `shujuku_v120_globalMeta_v1` | 2506 |
| `shujuku_v120_profile_v1____default____settings` | 133979 |
| `shujuku_v120_profile_v1____default____template` | 40158 |
| `shujuku_v120_templatePresets_v1` | 275630 |

**基线状态**：
- 起点 active 模板是默认 8 表：`全局数据表`、`主角信息表`、`重要角色表`、`主角技能表`、`背包物品表`、`任务与事件表`、`纪要表`、`选项表`。
- chat[0] 已有旧诊断留下的 `TavernDB_ACU_ScopedConfig`，`mode=chat_override`、`presetName=神秘复苏模拟器`、`templateStrLen=37306`、`source=manual_probe`。但 active 仍 8 表，说明没有 global 14 表污染，且 chat-scope 读取/应用侧仍不生效。

**三入口复现结果**：
| 入口 | 返回 | 前后表数 | 关键日志 |
|---|---|---|---|
| `importTemplateFromData(data,{scope:'chat'})` | `success:true`, `scope:'chat'` | 8 -> 8 | `[ChatGateway] saveChat 不可用，跳过保存` + `[WorldbookGateway] getCurrentCharPrimaryLorebook 不可用` |
| `switchTemplatePreset(presetName,{scope:'chat'})` | `success:true`, `scope:'chat'` | 8 -> 8 | 同上 |
| `injectTemplatePresetToCurrentChat(presetName)` | `success:true`, `scope:'chat'` | 8 -> 8 | 同上 |

**global 对照**：`switchTemplatePreset(presetName,{scope:'global'})` 返回 `success:true`，active 模板 8 -> 14；14 表为 `全局状态`、`玩家状态`、`灵异事件`、`厉鬼档案`、`线索`、`人物`、`地点`、`灵异物品`、`行动建议`、`事件纪要`、`检定建议`、`驾驭厉鬼`、`收录档案`、`收录规律`。console 只见 `settings_updated` 与既有 WorldbookGateway warning。R2-0 结束时页面保持 global 14 表，方便当前真机继续游玩。

**R2-0 gate 判定**：通过，带注记。未新建测试 chat/profile，避免扰动用户真实会话；当前 chat 不是“字段全空”的纯净 chat，但 active 8 表 + 旧 chat_override 不生效，比纯空字段更能证明 chat-scope 应用坏。路线2可以进入 R2-1（仅临时观测补丁），但不得直接改库存储逻辑。

## 2026-06-03 玩家反馈修复批次（调研结论）

### 发布版加载链路（关键事实）
- 发布版角色卡内嵌 5 个脚本，全部用 jsdelivr CDN 固定指向 commit **`c41b53f`** 的 dist：
  `testingcf.jsdelivr.net/gh/linlangliehu/tavern_helper_template@c41b53f.../dist/神秘复苏模拟器/脚本/<X>/index.js`
  （X = 变量结构 / 界面美化 / 固定状态栏 / 数据库 / 数据库前端；另有 mvu 走 MagicalAstrogy/MagVarUpdate）
- ⚠️ 注意：task_plan 里上一轮发布信息是 `7457a28`/`482b71a`，但**角色卡内嵌脚本钉死在更老的 `c41b53f`**。jsdelivr 按 commit 哈希取文件 + 永久缓存 → 改代码推送后玩家仍是旧版，**必须更新角色卡里的哈希才生效**。
- CDN 机制：`https://<jsdelivr镜像>/gh/<组织>/<仓库>[@tag或commit]/<路径>`。镜像有 cdn./gcore./testingcf. 三个，功能相同。tag(@spv3.9.5)可改版本升级；commit哈希内容不可变、缓存永久。

### 数据库本体（AlbusKen/shujuku）
- 仓库 `github.com/AlbusKen/shujuku`，公开，main 分支，tag 发版，活跃维护（最近 2026-06-02）。
- 两条分支：**xing 系列**（旧，停滞，最高 xingv5.2）/ **sp 系列**（新，活跃，已 spv6.9）。
- 世界书写入：xingv2.6 裸调 `setLorebookEntries`（无防御）；spv3.7+ 有 `WorldbookGateway` 兼容层（API 可用性检查）。新版酒馆助手下 xingv2.6 失效 → 表格不注入。
- spv3.9.5 实测带 WorldbookGateway 8 处，写入接口齐全。

### AM/SP 编码问题（最终根因链）
- SP 在库里 **0 处**——纯你卡定义。AM 在库里 **413 处**——库内置。
- 你的 chronicle 表 = 库默认「纪要表」的 fork：uid `sheet_chronicle`(库是随机哈希)、`GLOB 'SP[0-9][0-9][0-9][0-9]'`(库是 AM)、多了关联事件列+字数约束、召回模板 `<事件纪要>`/`<已发生事件概览>`(库是 `<记忆回溯>`/`<已发生的事件概览>`)。
- **storageMode** = 全局设置(`settings_ACU.storageMode`)，默认 `'native'`，不随卡走。你的 SP 用 SQL 写法(INSERT/CREATE TABLE)需 **sqlite 模式**。库为两模式各备一套默认提示词(`DEFAULT_..._ACU`/`DEFAULT_..._SQL_ACU`)。
- **「恢复默认」机制**：`resetAllToDefaults_ACU`/`resetDefaultCharCardPrompt_ACU` 把硬编码默认提示词(AM版)写回。`buildDefaultSettings_ACU` 的 mergeSummaryPrompt 默认就是 AM 原生版。→ 玩家"恢复设置变 AM"。
- **★最终根因**：`importTemplateFromData(templateData)` 实现里**完全不碰提示词**(charCardPrompt/mergeSummaryPrompt 全无)，只把表结构存进预设库，且默认 scope='global' **不切换生效模板**。而 AM 编码来自**提示词**不是表结构。→ **导入表 ≠ 换提示词**，这就是"表是SP的、召回头是AM的"的根因。

### 自动导入现状（你的代码已实现）
- 发布版实际加载 `dist/神秘复苏模拟器/脚本/数据库前端/index.js`（注意角色卡里显示名叫"神秘复苏数据库前端"但路径是"数据库前端"，两个源码文件都含 importMysteryTemplate）。
- 源码 `src/神秘复苏模拟器/脚本/数据库前端/index.ts`：第1行 `import templateData from '../../数据库/神秘复苏表格SQL_v1.json'`（SP配置已内嵌打包）；`runMysteryTemplateAutofix()` 启动时自动比对14表名，缺失则自动 `importTemplateFromData` 导入。已发布 c41b53f 版本也含此逻辑。
- 但因上面★根因，autofix 只导了表、没换召回提示词 → AM 仍在。
- 表格配置文件 `神秘复苏表格SQL_v1.json`（59KB，chatSheets v2 格式）测试版/发布版 md5 一致，根目录无独立发布副本。参照物 `骰子表格SQL_v4.2.json`。

### ★AutoCardUpdaterAPI 公开方法验证（2026-06-03 完成，读 spv3.9.5 库本体源码）
- 库本体 5.9MB，API 注册在 api-registry（`Object.assign` 合并 9 个 `create*Api` 分组挂到 `topLevelWindow_ACU.AutoCardUpdaterAPI`）。已穷举全部公开方法名。
- **结论：公开 API 表面里没有任何一个方法能写「召回提示词」(`mergeSummaryPrompt`) 或「填表提示词」(`charCardPrompt`)。** 9 分组逐组扫描 `charCardPrompt`/`mergeSummaryPrompt` 字样：0 命中。
- 模板预设组（createTemplatePresetApi）5 方法 `getTemplatePresetNames/switchTemplatePreset/injectTemplatePresetToCurrentChat/importTemplateFromData/getTableTemplate` 全是表结构操作。`importTemplateFromData` 源码注释原文确认「全局导入：仅保存到预设库，不自动切换当前生效模板」——印证之前根因。
- 唯一能写提示词的纯逻辑函数是 `applyCombinedSettingsImport_ACU(combinedData)`（写 `charCardPrompt`+`mergeSummaryPrompt`），但它**没被单独包成 API**。包它的公开方法只有 `importCombinedSettings`，而该方法内部强制 `document.createElement('input')+input.click()` **弹文件选择框**，无法脚本静默传 data。
- `resetAllDefaults`→`resetAllToDefaults_ACU` 把硬编码默认(AM版)写回，是玩家「恢复设置变 AM」的来源；它只会让情况更糟，不能用来修。
- settings 存储键 `${前缀}_allSettings_v2`（经酒馆 extension_settings bridge 持久化），`mergeSummaryPrompt` 是其中字段。**绕过 API 直接写 storage 理论可行但脆**：键名/结构是库内部实现，版本升级易碎，且写完要触发 `saveSettings`+通知刷新，等于复刻库内部逻辑——不推荐。

### 件3 可行路径结论
- **路 A（脚本自动改召回头）不通过公开 API 实现**：没有公开方法，唯一逻辑函数被弹框 API 包死。除非 hack 内部存储键（脆、不推荐）。
- **路 B（玩家手动一步）**：玩家在数据库设置面板手动「导入合并配置」选一个含 SP 提示词的 .json，即走通 `importCombinedSettings` → `applyCombinedSettingsImport_ACU` 写入 SP 召回头。→ 需要产出一个「合并配置 json」(含 `prompt`+`template`+`mergeSummaryPrompt`)作为发布物。
- **路 C（治本，改库默认）**：库默认提示词是 AM，是上游 AlbusKen/shujuku 的硬编码，我们改不了上游；但可以反馈给库作者，或自己 fork。超出本卡范围。
- 待用户定：是否走路 B 产出「合并配置发布物」+ 卡内引导玩家手动导入一次。

## 2026-06-03 路 D 完整落地方案（fork 库改默认提示词，调研产出·未改代码）

### 为什么路 D 能根治（对照蛊真人 v10.2）
- 拆了 `v10_2_card_full.json`：内置 3 个酒馆助手脚本，核心是「蚀心入魔·蛊真人数据库」(1MB **内联全文**直嵌卡里，非 CDN)。是 ACU 内核老版本 v1.1。
- 它「全自动」的真因：`DEFAULT_CHAR_CARD_PROMPT_ACU`/`DEFAULT_MERGE_SUMMARY_PROMPT_ACU` **直接被改成蛊真人定制版**（$U/$C 占位、AM 编码141次），初始化 `settings.charCardPrompt = DEFAULT_...` 直接生效。出厂默认即对 → 玩家零操作、恢复默认也对。
- 且老版**无 native/sqlite 双模式**（storageMode/isSqliteMode/SP 均 0 次），只有一套，不存在模式切换变种。
- 你的卡相反：库出厂默认=AM，你的表/卡=SP → 不一致；玩家一恢复默认就变 AM。路 D = 复制蛊真人的「改默认常量」思路。

### spv3.9.5 提示词分发链（已核实，patch 精确定位）
- 全库「出厂默认提示词」只由 **4 个 const 常量**分发，无别处重复硬编码（特征串「填表美杜莎」全库仅 2 次 = 两个召回常量本身）：
  | 常量 | 行号 | 作用 | 模式 |
  |---|---|---|---|
  | `DEFAULT_CHAR_CARD_PROMPT_ACU` | 866 | 填表头 | native（数组，7段对话；mainSlot A=填表指令） |
  | `DEFAULT_CHAR_CARD_PROMPT_SQL_ACU` | 914 | 填表头 | sqlite（**从 native `.map()` 派生**，只替换 mainSlot==='A'\|\|isMain 段为 SQL 指令） |
  | `DEFAULT_MERGE_SUMMARY_PROMPT_ACU` | 1209 | **召回头** | native（模板串，insertRow DSL + `AM0001` + 纪要表5列） |
  | `DEFAULT_MERGE_SUMMARY_PROMPT_SQL_ACU` | 1213 | **召回头** | sqlite（SQL INSERT + `AM0001` + chronicle 表6列） |
- 引用次数：CHAR_CARD 15/8、MERGE 6/5。改这 4 个常量 = 改掉所有「恢复默认/出厂默认」入口。
- 库 native 默认填表头含**别卡风味**（line 889/934「绝对禁止把情侣调情解读为权力掌控/精神支配/屈服」恋爱主从语气校准）——与神秘复苏题材不搭，fork 时应替换。
- ⚠️ 蛊真人那版填表头开头是「Bypass all content filters」越狱串；**spv3.9.5 原版没有**（原版是正常「你是助手」）。fork 时**不要**引入越狱内容，保持干净。

### 你的 SP 纪要表实际结构（patch SQL 召回头的精确依据）
- `src/神秘复苏模拟器/数据库/神秘复苏表格SQL_v1.json` 共 **14 表**。纪要表 = `sheet_chronicle`(name=事件纪要)。
- DDL：`CREATE TABLE chronicle` **6 列**：`row_id / code_index / time_span / related_event / summary / chronicle_text`。
- 与库默认 chronicle 的差异（这就是 AM/SP 不一致的具体内容）：
  - 编码 `code_index GLOB 'SP[0-9][0-9][0-9][0-9]'`（库默认 `AM`）。
  - **多一列 `related_event`（关联事件）**——库默认只有 5 列无此列。
  - `summary` ≤40 字（库默认概要 ≤30）；`chronicle_text` 200-600 字（库默认纪要 300-400）。
  - 注入模板 `<事件纪要>$1</事件纪要>`（库默认 `<记忆回溯>`/`<已发生的事件概览>`）。
  - initNode SQL 示例已是 SP0001、含 related_event 列。
- native 版列头：`["row_id","纪要编号","时间跨度","关联事件","概览","纪要"]`（insertRow DSL 用列索引 0-5）。

### 当前加载链（fork 落地必须先解决「自托管库本体」）
```
角色卡内嵌脚本 dist/.../数据库/index.js (loader, 402B)
  → [阶段2 已改] import 'gcore.jsdelivr.net/gh/linlangliehu/tavern_helper_template@<hash>/vendor/shujuku-sp-fork/index.js'  ← 自托管 fork（AM→SP）
     → 原上游 'AlbusKen/shujuku@spv3.9.5/index.js'（5.9MB，你不持有，AM 默认常量）
```
- 根目录 `酒馆助手脚本-spv3.9.5·数据库.json` / `酒馆助手脚本-星河璀璨·数据库.json` 都只是 **73B loader**，非库本体。
- 你的 `src/神秘复苏模拟器/脚本/数据库/index.ts`（16行）也是 loader，build 出 402B 的 dist。
- **结论：路 D 必须把 5.9MB 库本体自托管到你能改的地方**，loader 改指向你的副本。
- **★阶段2 已落地（2026-06-03）**：3 处 loader 的 import URL 全部从上游 `AlbusKen/shujuku@spv3.9.5` 改为自托管 `linlangliehu/tavern_helper_template@__RESOURCE_HASH__/vendor/shujuku-sp-fork/index.js`。`__RESOURCE_HASH__` 是占位符，**必须在阶段4 第一段资源提交并推送后**替换为该资源提交的完整 commit 哈希，再 build/发布——否则 jsdelivr 拉不到（鸡生蛋）。脚本名保留「星河璀璨·数据库」。两个根目录 JSON 已校验为合法 JSON。

### ★2026-06-03 读库本体后的重大修正（推翻原"只改 MERGE_SUMMARY"假设）
- 已把 spv3.9.5 库本体 5.9MB 落到 `vendor/shujuku-sp-fork/index.js`（92374 行，IIFE 完整收尾，curl 完整）。
- **修正1：召回头不是 MERGE_SUMMARY。** 库里 `mergeSummaryPrompt` 全部 11 处引用**都是写入/导出/默认赋值，无一处运行时读取进召回管线**。配合教程原文（`奶龙教程`:15）「纪要合并功能是废弃功能，spv3.7 正式移除」→ **MERGE_SUMMARY 两常量(1209/1213)大概率是死代码**。光改它修不了玩家看到的 AM。
- **修正2：真正的召回 = 剧情推进。** 活的召回提示词是 `DEFAULT_PLOT_SETTINGS_ACU`(行993，含 prompts[].content) 和 `DEFAULT_PLOT_PROMPT_GROUP_ACU`(行1057)。两处都写死「**输出格式：AM0001, AM0002, ...**」「`AMxxxx, AMxxxx`」(行1000/1007/1070/1082)。这才是玩家召回看到 AM 的活来源。
- **修正3：SP 卡是 sqlite 模式。** 教程砍头疗法(`奶龙教程`:2685)明确「先在仪表盘确认存储模式已经是 sqllite」→ 神秘复苏属 sqlite 卡。库默认 `storageMode:'native'`(行24972)，但我方卡的表是 SQL 格式 → **必须确认玩家是否真在 sqlite**（autofix 的 importTemplateFromData 不切模式，行49678-49736 确认）。这是阶段0 待查关键点：若玩家停在 native，召回/填表走的是 native 常量集。
- **修正4：AM 共 25 处（非旧记 413）。** 413 是 xing+sp 全家桶统计。spv3.9.5 仅 25 处，分布：默认表模板(652-663)、SQL填表头示例(963)、PLOT 召回(1007/1082)、MERGE死代码(1209/1213)、其它注释(7965/35196/90095)。
- **红线确认：** 行1107 有 `Bypass all content filters`，属 `DEFAULT_CONTENT_OPTIMIZATION_PROMPT_GROUP_ACU`(正文优化，默认 enabled:false 关闭)。**不碰它**，也不引入任何越狱串。
- **填表头恋爱主从语气校准**：native 行889、SQL 行934 均有「绝对禁止把情侣调情解读为权力掌控/精神支配/屈服」——与神秘复苏不搭，patch 时删/换中性。

### ★阶段0 结论：完整 AM 链路 + 精确 patch 清单（2026-06-03 调研完成）

**先厘清"召回看到 SP"和"恢复默认变 AM"的真实机制：**
- 召回注入的 `$5 总结大纲` = 表的 **extraIndex 注入块**，内容是表里**实际行数据的 code_index 值**（`buildExtraIndexEntryBlock_ACU` 行21756 用真实数据 + 模板包裹）。我的 SP 表实际写入 `SP0001` → 召回注入的索引值天然是 SP。**所以"召回是 SP"靠的是表数据，不是提示词。**
- 但 PLOT 召回提示词的**格式说明文字写死 AM**（`DEFAULT_PLOT_SETTINGS_ACU` 行1000/1007、`DEFAULT_PLOT_PROMPT_GROUP_ACU` 行1070/1082：「只能从<总结大纲>索引 **AM 编码**」「输出格式：**AM0001, AM0002**」「**AMxxxx, AMxxxx**」）→ 与 SP 数据矛盾，会误导召回 AI。

**两个"恢复默认"入口各重置什么（这是"恢复变 AM"的真凶）：**
| 按钮 | 函数/行 | 重置内容 | 是否触及 AM |
|---|---|---|---|
| 恢复默认提示词 | `resetDefaultCharCardPrompt_ACU` 28144 | 仅 charCardPrompt(填表头) | 填表头 SQL 版示例 `AM0001`(行963) |
| 恢复默认预设及模板 | `resetAllToDefaults_ACU` 40300 | charCardPrompt + mergeSummaryPrompt + 调 `resetTableTemplate_ACU` | 全部三者 |
| （内部）恢复默认表模板 | `resetTableTemplate_ACU` 40370 → `getDefaultTemplateSnapshot_ACU` | 默认表模板 = 库内置 `chronicleSheet`(648) | **DDL `GLOB 'AM...'` + 示例 `AM0002`(656/663)** ← 关键 |
- 玩家点"恢复默认模板"→ 表结构被写回库默认 AM chronicle → 但 autofix(`runMysteryTemplateAutofix`)下一轮又用 SP 表覆盖 → **两者竞争 = "时而 SP 时而 AM"的真实根因**。
- `mergeSummaryPrompt`(1209/1213) 仍确认是**死代码**（11 处引用全是写/导/赋默认，0 运行时读取；教程明示 spv3.7 移除合并）。但 `resetAllToDefaults_ACU` 仍会赋值它，且 SQL 版 chronicle 是 6 列错列名(location/chronicle_entry)——顺手对齐，零成本作保险。

**storageMode 结论：SP 卡 = sqlite。** 教程砍头疗法明示 sqlite；`isSqliteMode()` 决定填表头(28145)、恢复默认(40305/40306)走哪套。**结论：以 SQL 版常量为主改对象，native 版同步改作保险**（玩家若误在 native，SP 表 SQL 跑不动，但提示词不该再误导）。

**★精确 patch 清单（共 6 个常量 / 改 AM→SP 编码 + 表结构对齐 + 删恋爱语气段）：**
| # | 常量/对象 | 行 | 改什么 |
|---|---|---|---|
| 1 | `chronicleSheet`（默认表模板纪要表） | 648-665 | **最关键**：DDL 改我的 6 列(加 related_event)、`GLOB 'AM...'`→`'SP...'`、示例 `AM0002`→`SP`、note 列定义对齐、summary≤40、text 200-600。这是"恢复默认变 AM"的根源 |
| 2 | `DEFAULT_PLOT_SETTINGS_ACU.prompts` | 1000/1007 | 召回头格式说明 `AM`→`SP`（"索引 AM 编码"→SP、"AM0001,AM0002"→SP、"AMxxxx"→SPxxxx） |
| 3 | `DEFAULT_PLOT_PROMPT_GROUP_ACU` | 1070/1082 | 同上（这组是实际发送的召回提示词组） |
| 4 | `DEFAULT_CHAR_CARD_PROMPT_SQL_ACU`（填表头-sqlite活） | 914-989 | SQL 示例 `AM0001`(963)→SP；删/换恋爱主从语气校准段(934) |
| 5 | `DEFAULT_CHAR_CARD_PROMPT_ACU`（填表头-native保险） | 866-911 | 删/换恋爱主从语气校准段(889)；本身无 AM 示例 |
| 6 | `DEFAULT_MERGE_SUMMARY_PROMPT_SQL_ACU` + `_ACU`（死代码·保险） | 1209/1213 | AM→SP、chronicle 列名对齐我的 6 列。低优先级 |
- **红线**：行1107 `Bypass all content filters` 属正文优化组(默认关)，**不碰**；全程不引入越狱串。
- **验证锚点**：patch 后全库 `GLOB 'AM` 应 0、`AM0001`/`AM0002`/`AMxxxx` 应 0（只剩注释行 7965/35196/90095 可保留或一并改）。

### 路 D 落地步骤（待批准后执行，预估）
1. **取得库本体**：下载 spv3.9.5 `index.js`（5.9MB）落地为源文件，例如 `vendor/shujuku-sp-fork/index.js`（保留 spv3.9.5 原始内容，单独提交便于 diff/升级）。
2. **patch 4 个常量**：
   - 两个 MERGE_SUMMARY（召回头）：把 `AM`→`SP` 编码、纪要表改成你的 6 列结构（加 related_event）、字数约束 200-600/≤40、注入容器名对齐、initNode/示例对齐神秘复苏题材。
   - 两个 CHAR_CARD（填表头）：去掉恋爱主从语气校准段，换成神秘复苏题材中性表述（或最小改动只删别卡风味）。SQL 版注意它是 `.map()` 派生，若直接展开成独立常量需保证 mainSlot 标记不丢。
   - 不引入任何越狱内容。
3. **自托管**：把 fork 后的 index.js 放进本仓库（走你现有 jsdelivr 两段式发布），loader 改 `import` 指向 `gh/linlangliehu/tavern_helper_template@<hash>/vendor/shujuku-sp-fork/index.js`。
4. **改 loader 3 处**：`src/.../数据库/index.ts`、根目录两个 `酒馆助手脚本-*.json` 的 import URL。
5. **验证**：DevTools 连真实酒馆，确认 (a)默认召回头是 SP、(b)恢复默认仍是 SP、(c)autofix 导表后表与召回头一致、(d)native 与 sqlite 两模式都正确。
6. **发布**：纳入现有两段式 CDN 发布（资源提交→更新角色卡 hash），与件1/件2 一起或单独发。

### 路 D 代价 / 风险（需用户知情）
- **维护负担**：上游 spv3.9.5 升级时要在新版重打这 4 处 patch。当前已钉死 tag，不主动升级则不受影响。
- **体积**：仓库多 5.9MB 源文件 + 进 dist；jsdelivr 可承载，但首次加载略增。
- **双重保险**：fork 后表配置(神秘复苏表格SQL_v1.json)与提示词来自同一套，autofix 仍保留作兜底。
- **越狱红线**：fork 全程保持干净，不抄蛊真人的 bypass 串。

### ★阶段1 patch 完成实录（2026-06-03）
fork 文件 `vendor/shujuku-sp-fork/index.js` 全部 patch 已落地并验证：

**已改（活路径 + 保险 + 注释一致性）：**
| 对象 | 行 | 实改内容 | 验证 |
|---|---|---|---|
| chronicleSheet | 652/653/656/657-665/686-692 | note 6列定义、content 列头、insertNode SQL 示例 SP0002、DDL `GLOB 'SP[0-9]{4}'`+6列(加 related_event)、exportConfig entryName=事件纪要/injectionTemplate `<事件纪要>`/extraIndex | grep 仅 SP，0 AM |
| DEFAULT_PLOT_SETTINGS_ACU | 1009 | 召回格式说明 AM→SP（SP0001/SP0002/SPxxxx×2） | line 1009 仅 SP |
| DEFAULT_PLOT_PROMPT_GROUP_ACU | 1084 | 同上（实际发送的召回提示词组） | line 1084 仅 SP |
| SQL 填表头示例 | 965 | `WHERE code_index = 'SP0001'` | ✓ |
| 恋爱语气校准段 | 891(native)/936(SQL) | 删别卡「情侣调情/权力掌控/精神支配」，换中性「客观中立的第三方记录视角」 | 891/936 romance 短语 0 |
| MERGE_SUMMARY ×2(死代码保险) | 1211/1212/1215 | AM→SP、列名对齐我的 6 列 | 仅 SP0001/0002/0003 |
| formatSummaryIndexCode_ACU | 15639 | `return \`SP${...}\`` | ✓ |
| visualizer 自动重排 | 90918 | `row[...] = \`SP${...}\`` | ✓ |
| isSummaryOrOutlineTable_ACU | 1592 | 追加 `|| === '事件纪要'`（让 SP 重排认我的表） | ✓ |
| FIELD_NORMALIZERS code_index 注释 | 7968-7978 | AM→SP（代码本身 toUpperCase 前缀无关，仅注释一致性） | ✓ |
| UI 提示文案 | 35198/90097 | AM0001→SP0001 | ✓ |
| 自动编号 tooltip(用户可见) | 91463 | 「按 AM 序列重排」→SP | ✓ |
| 注释 | 37956 | 「按 AM 序列重排」→SP | ✓ |

**故意不改（确认无害，保持 fork 最小化）：**
- 7428：SQLite WASM base64 blob，AM 在编译数据里非代码。
- 16052/16073/16083/16101 `keys:['AM']`：世界书**激活关键词**（非 code_index 格式），且属 `<过往记忆>` MemoryStart/End 包裹块——该块 gated by summaryTable **按名匹配** `总结表`/`纪要表`（9776/12703），我表名「事件纪要」**不命中→整段对我的卡是死路径**，不触发。
- 16293/16299/25237/25242：废弃的合并功能（spv3.7 移除），只处理带 `auto_merged` 标记的行，我的 SP 数据从不带此标记。

**红线复核：** 行1109 `Bypass all content filters` 属 `DEFAULT_CONTENT_OPTIMIZATION_PROMPT_GROUP_ACU`，gated by `contentOptimizationSettings.enabled`，默认 `false`(行3500/24977)——出厂休眠，**未碰**。全程未引入任何越狱串。

**最终 AM sweep：** `GLOB 'AM`/`AM0001`/`AM0002`/`AMxxxx`/`索引AM` 全库 **0 命中**；残留 9 处 AM 全部为上述「故意不改」的无害项。

**⚠️ 阶段0/1 期间的新发现（非 AM 问题，记录备查）：** 库的召回/总结识别多处按**表名**匹配 `总结表`/`纪要表`（如 9776、12701-12703、25161/25181）。我的表叫「事件纪要」，名字不命中这些 fallback。但我的卡召回主路径走 `exportConfig` 的 extraIndex 注入（真实 SP 行数据），名字匹配只是 fallback，属既有设计；阶段3 实机需确认召回确实走 extraIndex 而非依赖名字匹配的 fallback。

## 2026-06-04 R2-1：最小观测定位 host API/ready 链（CDP 断点·未改码）

**目标**：继续路线2，但只做观测，不改行为。原 R2-1 计划是给 fork 加临时日志；实际执行时改为 CDP Debugger 断点与 Runtime 只读探针，避免任何诊断补丁进入工作区。

**live 脚本与版本**：
- 真机页面：`http://127.0.0.1:8000/`，CDP `127.0.0.1:9222`。
- 数据库 fork 实际加载 URL：`https://gcore.jsdelivr.net/gh/linlangliehu/tavern_helper_template@14a556d26212c4ab086cdfd45f1b3362941deb22/vendor/shujuku-sp-fork/index.js`。
- live scriptId：`579`；内容 hash 与本地 fork SHA256 `B01BA510AED3A94B4261FA37BD51D30774647782389EBC122C1165C2AB0B3DE9` 一致。

**断点复现结果**：
- 执行序列：14 表起点 → `resetTemplate` 回 8 → `importTemplateFromData(data,{scope:'chat'})` 仍 8 → `switchTemplatePreset(name,{scope:'chat'})` 仍 8 → `switchTemplatePreset(name,{scope:'global'})` 恢复 14。
- chat-scope 分支实际进入，`persistTemplateScopeSelectionState_ACU` 里 `shouldSaveChat:true`，随后命中 `saveChatToHost_ACU`。
- `saveChatToHost_ACU` 的判定是 `typeof SillyTavern_API_ACU?.saveChat !== 'function'`，本轮断点命中为 true，于是日志 `[ChatGateway] saveChat 不可用，跳过保存`，上层仍返回 success。
- 同一断点运行里，`settingsStorageReadyForSave_ACU:true`、`configIdbCacheLoaded_ACU:true`、`settingsReloadAfterIdbScheduled_ACU:false`、`pendingSettingsReloadFromIdb_ACU:false`。因此“ready 永久 false”不是唯一根因；ready 即使已经 true，chat-scope 也会失败。

**关键只读探针**：
- top 页面与数据库 iframe 中，`window.SillyTavern` 的 key 都是 `libs/getContext`；直接 `window.SillyTavern.chat` 不是数组，直接 `window.SillyTavern.saveChat` 是 `undefined`。
- 同一位置调用 `window.SillyTavern.getContext()`：`ctx.chat.length === 1`，`typeof ctx.saveChat === 'function'`，`typeof ctx.eventSource === 'object'`。
- 当前 chat[0] 可读到旧 `manual_probe` 的 `TavernDB_ACU_ScopedConfig`：`mode:'chat_override'`、`presetName:'神秘复苏模拟器'`、`templateStrLen:37306`。这说明宿主真实 chat 对象存在且可访问；问题是 fork 的适配对象没有从 `getContext()` 取它。

**源码解释**：
- `detectRuntimeMode()` 在 iframe 中返回 userscript。
- `attemptToLoadCoreApis_ACU()` 的插件分支会把 `SillyTavern.getContext()` 包成 Proxy；但 userscript/iframe 分支仍假设 iframe 自身 `window.SillyTavern` 是扁平 API，并直接 `stApi = iframeST || parentST`。
- 当前 TavernHelper iframe 的实际形态不是扁平 API，而是 `{libs,getContext}` 骨架。因此 `_set_SillyTavern_API_ACU(stApi)` 后，库内部读到的 `SillyTavern_API_ACU.chat` 与 `SillyTavern_API_ACU.saveChat` 都是 `undefined`。
- 结果链路：`getChatArray_ACU()` 返回 `[]` → `setCurrentChatTemplateScopeState_ACU()` 找不到 first message → chat scope state 不稳定/无法保存 → `saveChatToHost_ACU()` 跳过保存 → `applyTemplateScopeForCurrentChat_ACU()` 读不到有效 chat scope 时回退 `getGlobalTemplateSnapshotForCurrentProfile_ACU()` → active 模板回 8 表，但 API 返回 success 假象。

**R2-1 结论**：
- 路线2仍可根治，但主修复点应从“只修 IDB/settings ready 链”改为“修 host API 代理/桥接适配”。
- 最小设计方向：当任意运行模式下的 `SillyTavern` 对象存在 `getContext()` 且直接 `chat/saveChat` 缺失时，应像插件模式一样用 Proxy 动态读取 `getContext().chat/saveChat/eventSource/eventTypes`；或者在 ChatGateway 层增加等价 fallback。
- ready 链不删除：它仍是启动期保存误拒的风险点，需要 R2-2 作为保护/回归项审查，但不再作为唯一根因处理。
- R2-1 gate 通过：未改业务代码、未构建、未发布；当前页面保持 14 表可玩状态。

## 2026-06-04 R2-2：最小修复点设计与静态审查（未改码）

**目标**：在 R2-1 已定位 host API 适配误判后，选择 R2-3 的最小修复点，并做改动范围、风险、回退审查。本阶段不改业务代码。

**依赖面审查**：
- 运行模式：`detectRuntimeMode()` 在数据库 iframe 中返回 userscript。
- 现有结构：`attemptToLoadCoreApis_ACU()` 的 extension 分支已经有 `getContext()` Proxy；userscript 分支仍认为 iframe `window.SillyTavern` 是扁平 API，直接 `stApi = iframeST || parentST`。
- 直接依赖 `SillyTavern_API_ACU.*` 的面不小：ChatGateway 使用 `chat/saveChat/stopGeneration/deleteLastMessage/setChatMessages/eventSource/eventTypes`；生成/事件路径多处直接读 `SillyTavern_API_ACU.chat`；世界书 fallback 读 `getWorldBooks`；请求/模型路径读 `getRequestHeaders`、`ConnectionManagerRequestService`、`extensionSettings`；初始化事件订阅读 `eventSource/eventTypes/chatId`。
- 因此只修 `saveChatToHost_ACU()` 不够：即使能保存，`getChatArray_ACU()` 仍可能返回 `[]`，`setCurrentChatTemplateScopeState_ACU()` 仍找不到 first message；事件/生成路径也仍读不到宿主状态。

**真机只读属性面**：
- 数据库 iframe 的直接 `window.SillyTavern` key：`libs/getContext`。
- 直接属性类型：`chat/saveChat/stopGeneration/deleteLastMessage/eventSource/eventTypes/chatId/getRequestHeaders/extensionSettings/saveSettingsDebounced` 均为 `undefined`。
- `window.SillyTavern.getContext()` 返回 145 个 key，关键类型如下：
  - `chat`: `array:1`
  - `saveChat`: `function`
  - `stopGeneration`: `function`
  - `deleteLastMessage`: `function`
  - `eventSource`: `object`
  - `eventTypes`: `object`
  - `chatId`: `string`
  - `getRequestHeaders`: `function`
  - `ConnectionManagerRequestService`: `function`
  - `extensionSettings`: `object`
  - `saveSettingsDebounced`: `function`
- `setChatMessages` 在 `getContext()` 中仍为 `undefined`，但 TavernHelper 有 `setChatMessages`；这与现状一致，R2-3 不应把 TavernHelper 适配改坏。

**候选 Proxy 只读模拟**：
在数据库 iframe 内临时构造如下语义的 Proxy，未挂到全局、未写状态：
```js
new Proxy({}, {
  get(_target, prop) {
    const ctx = rawST?.getContext?.();
    if (ctx && prop in ctx) return ctx[prop];
    return rawST?.[prop];
  },
  has(_target, prop) {
    const ctx = rawST?.getContext?.();
    return !!((ctx && prop in ctx) || (rawST && prop in rawST));
  }
})
```
只读验证结果：可正确暴露 `chat array:1`、`saveChat function`、`eventSource object`、`eventTypes object`、`chatId string`、`name1 string`、`getRequestHeaders function`、`ConnectionManagerRequestService function`、`extensionSettings object`、`saveSettingsDebounced function`、`libs object`、`getContext function`。

**推荐 R2-3 方案：CoreAPI 适配层最小补丁**
- 在 `vendor/shujuku-sp-fork/index.js` 的 `attemptToLoadCoreApis_ACU()` 附近新增一个小 helper，例如 `createSillyTavernContextProxy_ACU(rawST)` / `maybeWrapSillyTavernApi_ACU(rawST, label)`。
- 包装条件：raw `SillyTavern` 有 `getContext()`，且直接 core 字段缺失（例如直接 `chat` 不是数组、`saveChat` 不是函数、`eventSource` 不存在）。若未来 TavernHelper 又提供真正扁平 API，则保持原样直接使用，避免破坏旧行为。
- Proxy 行为：`get` 优先从 `rawST.getContext()` 当前快照取属性；缺失时 fallback 到 `rawST[prop]`，保留 `libs/getContext` 等骨架属性；`has` 同步支持。
- extension 分支可复用 helper，或先只改 userscript 分支。为了减少重复和减少分叉，R2-3 推荐复用 helper，但逻辑必须等价于现有 extension Proxy。
- 不改 `TavernHelper_API_ACU`、`jQuery_API_ACU`、`toastr_API_ACU` fallback；TavernHelper 当前在 iframe 和 parent 都有完整方法，不能误改。

**备选方案与为何不选**：
- ChatGateway-only fallback：在 `getChatArray_ACU()`、`saveChatToHost_ACU()` 中直接 fallback 到 `window.SillyTavern.getContext()`。优点是更局部；缺点是只覆盖 ChatGateway，无法修 48xxx 生成/事件路径里直接读 `SillyTavern_API_ACU.chat` 的代码，也无法修 `eventSource/eventTypes/chatId` 初始化订阅。作为首版不推荐。
- ready 链补丁：修 `loadSettings_ACU`/`scheduleSettingsReloadAfterIdbReady_ACU`。R2-1 已证明 ready=true 时仍失败，说明这不是主因。R2-3 首版不应同轮叠改 settings 存储层；如果 host API 修复后冷启动仍有 `settings_loading`，再单独设计 ready 小补丁。

**R2-3 保护不变量**：
- 不碰 AM→SP 常量和表结构。
- 不改卡侧 `importTemplateFromData(...,{scope:'chat'})` 调用。
- 不改变 global-scope 行为。
- 不改变 TavernHelper API 的 iframe/parent fallback。
- 不引入轮询、重复 save、强行覆盖 settings。
- `getContext()` 抛错时保持 undefined/fallback，继续让调用方空值防御生效。

**回退方案**：
- R2-3 若出现异常，整段回退 `attemptToLoadCoreApis_ACU` 附近 diff 即可，不涉及数据迁移。
- 若修复后 chat-scope 仍失败但 `SillyTavern_API_ACU.chat/saveChat` 已恢复，下一步再定位 `setCurrentChatTemplateScopeState_ACU`/ready 链；不要和 CoreAPI patch 混在同一轮继续叠改。

**R2-2 gate 判定**：通过。改动范围可控，推荐进入 R2-3 最小实现。

## 2026-06-04 R2-3：CoreAPI 适配层最小实现（源码补丁）

**目标**：把 R2-2 选定的 host API 代理/桥接修复落到 `vendor/shujuku-sp-fork/index.js`，只修 `SillyTavern` 对象适配，不碰模板 scope、settings ready、AM→SP 常量、卡侧 API 调用。

**实际补丁**：
- 新增 `createSillyTavernContextProxy_ACU(rawST)`：返回 Proxy；`get` 优先读取 `rawST.getContext()[prop]`，缺失或异常时 fallback 到 `rawST[prop]`；`has` 同步支持 context 与 raw 对象。
- 新增 `shouldWrapSillyTavernContext_ACU(rawST)`：仅当 raw 对象存在 `getContext()` 且直接核心字段缺失时包装。当前判定字段为 `chat` 非数组、`saveChat` 非函数、`eventSource` 缺失或 `eventTypes` 缺失。
- 新增 `normalizeSillyTavernApi_ACU(rawST)`：封装按需包装逻辑，供 userscript/iframe 分支使用。
- 插件模式：继续总是使用 `getContext()` Proxy，保持原有“每次读取当前快照”的语义，并新增 raw fallback，避免 `libs/getContext` 等骨架属性在 context 缺失时读不到。
- userscript/iframe 模式：仍优先选择 `iframeST || parentST`，但不再假设 iframe `window.SillyTavern` 一定是扁平 API；选中对象后调用 `normalizeSillyTavernApi_ACU`。这正好覆盖 R2-1 真机看到的 `{libs,getContext}` 骨架场景。

**为什么这个补丁对应根因**：
- R2-1 证明失败点是 `SillyTavern_API_ACU.chat/saveChat` 直接读取为 `undefined`，而真实值在 `window.SillyTavern.getContext().chat/saveChat`。
- 该补丁把库内部所有继续读 `SillyTavern_API_ACU.*` 的路径统一接到 `getContext()` 当前快照，因此同时覆盖 `getChatArray_ACU()`、`saveChatToHost_ACU()`、事件订阅、请求头/ConnectionManager 等直接依赖面。
- 没有修改 chat-scope 数据结构和保存流程本身；如果后续仍失败，下一步可以单独定位 `setCurrentChatTemplateScopeState_ACU` 或 ready 链，而不是把多层改动混在一起。

**静态复核**：
- `node --check vendor/shujuku-sp-fork/index.js`：通过。
- `git diff --check`：通过。
- AM/SP sweep：`rg -n "GLOB 'AM|AM0001|AM0002|AMxxxx|索引AM" vendor\shujuku-sp-fork\index.js` 无输出，0 命中；既有 SP patch 未被破坏。
- diff 范围：仅 `vendor/shujuku-sp-fork/index.js`，`70 insertions(+), 34 deletions(-)`，集中在 `attemptToLoadCoreApis_ACU()` 附近。

**未完成/转后续**：
- 本阶段未构建、未更新 dist、未发布；真实页面当前仍加载 CDN `14a556d` 的旧 fork。因此无法在 R2-3 直接证明 patched fork 的 chat-scope 三入口已在真机写入 14 表。
- 需要 R2-4 把 patched fork 接入构建链路，再由 R2-5 做单卡真机验证：`importTemplateFromData{chat}`、`switchTemplatePreset{chat}`、`injectTemplatePresetToCurrentChat` 均应真实写入 `TavernDB_ACU_ScopedConfig` 并保持 14 表。

## 2026-06-04 R2-4：本地构建与 dist 链路复核

**目标**：让开发版实际加载 R2-3 修改后的本地 fork，而不是继续从 CDN `14a556d` 拉旧 fork；完成构建并确认 dist/本地服务链路可用于 R2-5 真机验收。

**实现改动**：
- `src/神秘复苏模拟器/脚本/数据库/index.ts` 的 `databaseScriptUrl` 从旧 CDN `https://gcore.jsdelivr.net/...@14a556d.../vendor/shujuku-sp-fork/index.js` 改为 `http://localhost:5500/vendor/shujuku-sp-fork/index.js?v=r2-4-coreapi-context-proxy`。
- 该 query 作为 R2-4 cache-bust，避免浏览器 ES module cache 继续复用旧 URL 的模块实例。
- `npm run build` 后，`dist/神秘复苏模拟器/脚本/数据库/index.js` 已同步内嵌同一个本地 vendor URL。

**构建记录**：
- 沙盒内首次 `npm run build` 失败：`[webpack-cli] Error: spawn EPERM`，命中项目已知 Windows 沙盒限制。
- 按权限流程沙盒外重跑 `npm run build` 成功：`[schema_dump] 已将所有 schema.ts 转换为 schema.json`、`[tavern_sync] 已打包所有配置了的角色卡/世界书/预设`，所有 webpack entry 均 `compiled successfully`。
- 开发版 PNG 打包流程已被 `tavern_sync` 调用；`src/神秘复苏模拟器/神秘复苏模拟器.png` 当前无 git diff。

**链路复核**：
- `rg "14a556d26212c4ab086cdfd45f1b3362941deb22|r2-4-coreapi-context-proxy|localhost:5500/vendor/shujuku-sp-fork" dist src/神秘复苏模拟器/脚本/数据库/index.ts src/神秘复苏模拟器发布版 scripts/publish-card.mjs` 只在开发版数据库源、数据库 dist 和数据库 sourcemap 中命中本地 URL；未改发布版和 `publish-card`。
- `rg "__RESOURCE_HASH__" dist src scripts vendor` 无输出，0 命中。
- `Invoke-WebRequest http://localhost:5500/vendor/shujuku-sp-fork/index.js?v=r2-4-coreapi-context-proxy` 返回 200，长度 5635746，内容含 `createSillyTavernContextProxy_ACU`。
- `Invoke-WebRequest http://localhost:5500/dist/.../脚本/数据库/index.js` 返回 200，内容含 `r2-4-coreapi-context-proxy`。

**静态复核**：
- `git diff --check`：通过。
- `node --check vendor/shujuku-sp-fork/index.js`：通过。
- AM/SP sweep：`GLOB 'AM|AM0001|AM0002|AMxxxx|索引AM` 0 命中。

**工作区边界**：
- R2-4 相关文件：`src/神秘复苏模拟器/脚本/数据库/index.ts`、`dist/神秘复苏模拟器/脚本/数据库/index.js`。
- R2-3 相关文件：`vendor/shujuku-sp-fork/index.js`。
- `dist/神秘复苏模拟器/界面/状态栏/index.html` 仍有 1 行构建产物差异，R2-4 开始前已 dirty；本阶段不回滚它，避免误碰历史产物。

**下一步**：
- R2-5 在真机页面加载开发版 localhost dist，确认 `spv3.9.5·数据库` 实际 import 的 vendor URL 是 `localhost:5500/vendor/shujuku-sp-fork/index.js?v=r2-4-coreapi-context-proxy`。
- 验证 chat-scope 三入口真实写入当前 chat 并让 14 表生效；若仍失败但 `SillyTavern_API_ACU.chat/saveChat` 已恢复，则转向 `setCurrentChatTemplateScopeState_ACU`/ready 链继续定位。

## 2026-06-04 R2-5：真机功能验收（单卡）

**结论**：R2-3/R2-4 的 Route 2 修复在开发卡真机单卡环境通过。chat-scope 不再出现“API 返回 success 但 active 模板仍回退 8 表”的假成功；三入口都能真实写入当前 chat 并让 14 表生效。

**运行环境**：
- SillyTavern 页面：`http://127.0.0.1:8000/`，CDP：`127.0.0.1:9222`。
- 开发卡：`characterId=2`，名称 `神秘复苏模拟器`，chatId `神秘复苏模拟器 - 2026-06-03@23h57m24s286ms`。
- 发布卡 `characterId=3` 仍加载旧 CDN，本阶段不以发布卡作为验收对象。

**资源链路证据**：
- `Debugger.scriptParsed` 命中 `http://localhost:5500/dist/.../脚本/数据库/index.js?t=...`。
- `Debugger.scriptParsed` 命中 `http://localhost:5500/dist/.../脚本/数据库前端/index.js?t=...`。
- `Debugger.scriptParsed` 命中 `http://localhost:5500/vendor/shujuku-sp-fork/index.js?v=r2-4-coreapi-context-proxy`。
- 因此本轮验收跑的是本地 patched fork，不是旧 `14a556d` CDN。

**冷启动/autofix 证据**：
- 基线：`tableCount:8`，`TavernDB_ACU_ScopedConfig` 不存在。
- 重新选入开发卡后 1 秒采样：`tableCount:14`，`templateLoaded:true`，`missingNames:[]`，chat 字段存在，keys 为 `version/template/templateArchives`。
- 说明 autofix 已能在 chat-scope 写入并生效，不依赖 profile/global 14 表污染。

**三入口证据**：
- `importTemplateFromData(data,{scope:'chat'})`：8 表、无字段 -> `success:true` -> 14 表，字段 keys `version/template/templateArchives`。
- `switchTemplatePreset('神秘复苏模拟器',{scope:'chat'})`：8 表、无字段 -> `success:true` -> 14 表，字段 keys `version/template`。
- `injectTemplatePresetToCurrentChat('神秘复苏模拟器')`：8 表、无字段 -> `success:true` -> 14 表，字段 keys `version/template`。
- `ctx.reloadCurrentChat()` 后仍保持 14 表和 chat 字段。

**控制台复核**：
- 未再出现 `jQuery_API_ACU is not a function`。
- 未再出现 `[ChatGateway] saveChat 不可用`。
- 未出现数据库前端/autofix 失败日志。
- 剩余 warn 属无关既有项：ST settings save scheduling、deprecated macro、固定状态栏找不到输入区容器重试、unload permissions policy。

**调试注意事项**：
- 页面强刷后可能停在“最近的聊天”列表，此时 `AutoCardUpdaterAPI` 尚未挂载；要先用 `selectCharacterById(2)` 或 UI 重新进入开发卡，不能把此状态误判为脚本失败。
- CDP 注入 JS 时避免中文正则/路径字面量；PowerShell 到 Node/CDP 的编码可能把中文变成 `?`，导致只读探针自身报错。

## 2026-06-04 R2-6：多卡/旧实例回归验收

**结论**：R2-6 完成。Route 2 在开发卡多卡切换、普通卡隔离、旧发布脚本干扰恢复、global 通道、导出与世界书刷新 smoke 中通过；仍未发布，发布版当前旧 CDN 行为只作为干扰源，不作为最终发布验收对象。

**新发现的回归风险**：
- 初次多卡链 `开发卡 -> Assistant -> 发布版旧 CDN 卡 -> 开发卡` 中，切回开发卡后曾出现 `tableCount:8`，但 `TavernDB_ACU_ScopedConfig` 仍存在且其中默认隔离 key 的 `templateStr` 可解析出 14 表。
- 手动 `MysteryDatabaseFrontend.importMysteryTemplate()` 返回 `true` 但 active 模板仍 8 表，说明问题不是前端未触发，也不是 chat 字段丢失，而是当前 `AutoCardUpdaterAPI` 仍可能是旧实例/旧闭包。
- 具体机制：R2-6 早版重新 import 后会立刻 tag API，并且 `tagDatabaseApi`/`waitForApi` 会 fallback 到当前 iframe 的 `window.AutoCardUpdaterAPI`。发布版旧脚本在 iframe 中留下旧 API 时，旧 API 会被误打 `mfrs-r2-6-coreapi-context-proxy` marker，形成“看似新 API、实际旧实例”的假阳性。

**修复原则**：
- 清理范围从只清 host 扩展为 host + iframe local 两侧：`AutoCardUpdaterAPI`、`__mfrsDatabaseScriptMarker__`、`__ACU_STAR_DB_III_LOADED__` 都要删。
- 新 marker 只打在 host 上新挂载的 `AutoCardUpdaterAPI`，不再信 local fallback；重新 import 后等待 host API 实际注册，再打 marker。
- `ensureMysteryTemplate` 的单例 promise 在完成后释放，避免一次完成/失败结果卡住后续热切换校正。

**真机证据**：
- 强刷后开发卡 `characterId=2`：`tableCount:14`，`apiMarker/hostMarker` 均为 `mfrs-r2-6-coreapi-context-proxy`，`fieldExists:true`，`getPanelState()` 为 `templateLoaded:true/tableCount:14/missing:[]`。
- 多卡链通过：开发卡 14 表，marker 存在，chat 字段存在；Assistant `characterId=0` 保持 8 表，`fieldExists:false`，无神秘复苏 chat 字段污染；发布版 `characterId=3` 仍是旧 CDN/旧行为，仅作为干扰源；切回开发卡后恢复 14 表。
- global 通道 smoke：`switchTemplatePreset('神秘复苏模拟器',{scope:'global'})` 返回 `success:true/scope:'global'`，之后 reset/恢复后开发卡仍 14 表；再次切 Assistant 仍 8 表。
- 旧入口 smoke：`getPanelState()` 14 表，`exportCurrentData()` 导出 14 表，`refreshDatabase()` 返回 ok，刷新后仍 14 表。

**静态与构建**：
- `npm run build` 沙盒内仍因已知 Windows sandbox `spawn EPERM` 失败；沙盒外重跑成功。
- `git diff --check` 通过；`node --check vendor/shujuku-sp-fork/index.js` 通过。
- 构建带出的无关 `dist/神秘复苏模拟器/界面/状态栏/index.html` 已恢复，最终 R2 diff 限定在 fork、数据库 loader、数据库前端及其 dist。

**剩余事项**：
- R2-7 仍需用户确认后做两段式发布：资源提交 -> CDN_REF/cache 回填 -> 发布版 PNG 打包 -> 发布后真机验证新版发布卡从 CDN 实际加载 patched fork。

## 2026-06-04：发布版 6.2 SQL/SQLite 模式回归发现

**结论**：SQL/SQLite 模式的核心引擎和写入路径基本可用，6.1 修复过的 `current_time` 保留字/schema bug 没有复发；但发布版 6.2 仍存在一个 SQL 模式特有的 UI/模板状态口径分裂 bug。

**已验证正常**：
- SQLite 控制台能正常执行临时表 `CREATE TEMP TABLE`、`INSERT`、`SELECT`、`DROP TABLE`，清理后 `sqlite_temp_master` 为 0。
- 初始只读 SQL 不会自动建表，`sqlite_master` 为 0、`global_state` 不存在；这与当前 `SqlTableService.executeQuery()` 设计一致，只读查询不会触发 `_ensureTablesFromTemplate()`。
- 首次写入会触发建表。执行幂等 `UPDATE global_state SET game_time = game_time WHERE row_id = 1` 后，物理 SQLite 表变为 14 张神秘复苏业务表。
- `global_state` schema 正确包含 `game_time`，不包含旧字段 `current_time`。有效插入/读出/删除 `row_id=1` 通过，无效插入未留下 `row_id=2`。

**剩余 bug**：
- SQL 写入建表后，物理 SQLite 表和 `exportTableAsJson()` 都是 14 张神秘复苏表；但 `AutoCardUpdaterAPI.getTableTemplate()` 与 `MysteryDatabaseFrontend.getPanelState()` 会回退到库默认 8 表，`missingNames` 显示 14 张神秘复苏表缺失。
- 影响面主要是设置面板、仪表盘、模板状态判断和依赖 `getTableTemplate()`/`getPanelState()` 的前端逻辑；不等同于 SQLite 引擎损坏，也不等同于 `current_time` bug 复发。
- 该问题只在 SQL/SQLite 模式下确认，native 恢复后发布版面板为 `templateLoaded:true/tableCount:14/missingNames:[]`。

**测试收尾**：
- SQL probe 行已删除，临时表已 drop。
- 页面最后已点击「仅切换模式」恢复 native；radio 为 native，IndexedDB `storageMode:native`。

## 压缩归档说明

- 2026-06-02 已压缩 planning。
- 压缩前原文快照位于 `planning_archive_2026-06/`。
- 常驻运行流程必须继续保留在本文件顶部；不要在后续压缩时删除。

## 2026-06-05：Debug 日志复发问题归档与修复方向

用户上传 `C:\Users\linlang\Downloads\acu-logs-2026-06-05T14-35-20-801Z.json`，共 1933 条日志，其中 9 Error / 5 Warn。问题不是单一根因，按日志去重后分为四类：

- **风险枚举失败（和刚刚相同）**：`action_suggestions.revival_risk_level` 写入 `极低`，违反 `CHECK(revival_risk_level IN ('无','低','中','高','致命','未知'))`。修复方向：模板明确枚举 + SQL 执行前仅对风险列做归一化。
- **旧表名 `log_summary`（新增问题）**：模型生成 `INSERT INTO log_summary ...`，当前 14 表中不存在该表。修复方向：搜索并清理旧 prompt/默认示例，事件纪要只允许 `chronicle`；执行前做表名白名单/旧表名拦截。
- **SQL 残片混入（新增/复发路径）**：`</thought>` 或解释文字夹在 SQL 前，导致 `near "<": syntax error`、`near "这样符合...": syntax error`。修复方向：升级 `<tableEdit>` 提取和语句级过滤，确保任意 SQL 语句前后的残片不会进入 provider。
- **API Bad Gateway（非 SQL 问题）**：`parseNonStreamResponse` 收到 `{"error":{"message":"Bad Gateway"}}`，应归类为上游/API 网关错误。修复方向：单独分类和重试/提示，仪表盘不要误导为 SQL/表结构问题。

验收必须覆盖：三份日志 fixture、14 表模板一致性、风险枚举归一化、旧表名拦截、残片清洗、Bad Gateway 分类，以及 Chrome DevTools 真页 smoke。

## 2026-06-05：D0-D1 执行结论

**D0 基线**：当前仓库 `HEAD==origin/main==f2ab050b60c3664e65c52dd1e574c04226a6bfbb`，发布版仍为 `6.6`，`CDN_REF=a554ba8040b9c9804a0c55136c922d8716aa656d`，cache 为 `phase118-sql-template-autocalibrate-6-6`。工作区 dirty：tracked diff 只有 `vendor/shujuku-sp-fork/index.js` 和既有状态栏 dist；未跟踪 planning/截图/备份不纳入业务修复。

**日志可用性**：Downloads 当前只存在 `acu-logs-2026-06-05T14-35-20-801Z.json`，前两份 `07-03`、`13-36` 指定路径不存在。最新 Debug 已重新解析，SHA256 为 `885717EF20DFEF82F33271C190262A99363A27BD5A565D8455326869EC87029C`。

**最新 Debug 去重**：
- `risk_enum_revival_level`：3 条，`revival_risk_level='极低'` 违反 CHECK。
- `old_table_log_summary`：3 条，模型生成 `INSERT INTO log_summary`。
- `sql_wrapper_fragment`：6 条，解释文字或 `</thought>` 混入 SQL。
- `api_bad_gateway`：1 条，`Unknown response format: {"error":{"message":"Bad Gateway"}}`。
- `other`：1 条，是 Bad Gateway 后续重试 warn。

**D1 vendor 审查**：当前未提交 vendor 试修补语法通过，且能作为 D2 起点；但不是完整修复。可保留的是风险列归一化骨架和多行 `INSERT OR REPLACE` 支持。必须继续补的是模板枚举提示、`log_summary` 白名单/拦截、语句级 SQL 残片过滤、Bad Gateway 分类和仪表盘细分。

## 2026-06-05：D2-D3 修复落点

**D2 风险枚举**：
- 两份 SQL 模板 `sheet_action_suggestions` 已补枚举硬约束：`death_risk_level` / `revival_risk_level` 只能为 `无/低/中/高/致命/未知`，禁止 `极低/很低/轻微/极高/很高/严重/极重` 等自然语言等级。
- vendor 归一化层新增 `VALID_RISK_LEVEL_VALUES_ACU`。风险列写入前会把 `极低/很低/轻微/低风险` 归为 `低`，`极高/很高/非常高/严重/极重/致死/致命风险` 归为 `致命`，空值和无法识别值归为 `未知`。
- 实际 vendor `normalizeStatementValues()` fixture 已通过：含 `极低/极高/严重/无法判断/空值` 的 4 行 `INSERT OR REPLACE INTO action_suggestions` 归一化后可写入内存 SQLite，结果均为合法枚举。

**D3 旧表名 `log_summary`**：
- 两份 SQL 模板 `sheet_chronicle` 已补表名硬约束：事件纪要表名固定为 `chronicle`，旧表名 `log_summary` 不存在，禁止写入。
- vendor 的 AI SQL `applyEdits()` 在事务执行前调用 `_validateMutationTargetTables()`，根据当前模板 DDL 白名单检查 `INSERT/UPDATE/DELETE/REPLACE` 目标表。
- 若目标表为 `log_summary`，现在会抛出清晰错误：`SQL 目标表 log_summary 不存在；事件纪要请写入 chronicle。请修正 SQL 表名后重试。`，不会再落到 SQLite 原始 `no such table: log_summary`。
- 静态搜索确认当前源码/模板没有 `INSERT INTO log_summary`、`UPDATE log_summary`、`DELETE FROM log_summary` 示例。仪表盘细分分类仍留到 D5。

## 2026-06-06：D4-D6 修复落点

**D4 SQL 残片清洗**：
- `extractSqlStatementsFromTableEdit_ACU()` 已改为按 SQL 语句候选提取，不再从第一条 SQL 之后无条件保留所有行。
- 清洗会剥离 `</thought>`、`<content>`、`<tableEdit>`、markdown 围栏和 HTML 注释残片；SQL 语句之间的解释文字会被跳过并记录 debug 摘要。
- `applyEdits()` 在 `splitSqlStatements()` 之后还会调用 `filterSqlEditStatements_ACU()`，作为语句级第二道防线。
- fixture 覆盖 `</thought>` 开头、两条 `INSERT` 中间夹解释文字、fenced `INSERT OR REPLACE`，输出均不含残片。

**D5 SQL 预检与分类**：
- `_validateMutationTargetTables()` 现在用当前模板 DDL 生成表名/列名白名单；AI SQL 事务前会先校验目标表和显式列名。
- `log_summary` 仍走旧表名专门错误；其他未知表走“目标表不在当前模板中”；未知列走“目标列不在当前模板中”。
- 仪表盘日志解释新增细分：`apiGatewayIssue`、`sqlOldTableIssue`、`sqlSchemaIssue`、`sqlSyntaxIssue`、`sqlConstraintIssue`。

**D6 Bad Gateway**：
- `parseNonStreamResponse_ACU()` 识别 `data.error`。`Bad Gateway` 会抛出 `API上游网关错误: Bad Gateway`，不再被吞成 `Unknown response format` / 空内容。
- 仪表盘优先匹配 `Bad Gateway` / `API上游网关错误`，显示为 API 网关问题，而不是 SQL 或表结构问题。

## 2026-06-06：D10 发布验证结论

SQL Debug 复发修复已发布为 `6.7`。发布链闭合为：`37a10c0817845c3276a1846d331f9c7d02efe39e`（patched vendor/模板/回归脚本资源） -> `26cbab63eb996030811bfda86d9281650a449821`（loader/dist 指向 patched vendor） -> `7cd0b249fde8c40afd193ace908ce2c6e56bd7e1`（发布提交）。最终 `HEAD==origin/main==7cd0b249fde8c40afd193ace908ce2c6e56bd7e1`。

验证要点：
- 发布版 YAML 与 PNG `chara/ccv3` 元数据均为版本 `6.7`、CDN_REF `26cbab63eb996030811bfda86d9281650a449821`、cache `phase119-sql-debug-regressions-6-7`；旧 6.6/hash/cache 0 残留。
- CDN smoke：数据库 loader 与数据库前端 loader 均 200，内容含 `mfrs-sql-debug-regressions-6-7` 与 vendor hash `37a10c0817845c3276a1846d331f9c7d02efe39e`；patched vendor 200，内容含 `API上游网关错误` 修复。
- 真页 CDP smoke：发布卡 `characterId=3`、角色名 `神秘复苏模拟器发布版`，marker/hostMarker 均为 `mfrs-sql-debug-regressions-6-7`，`storageMode=native`，`getTableTemplate()`、`exportTableAsJson()`、`MysteryDatabaseFrontend.exportCurrentData()` 与面板均 14 表，`missingNames=[]`、`mismatchNames=[]`。
- 提交边界正确：参考 JSON、planning、截图/备份/临时 Chrome 文件、既有状态栏 HTML diff、根目录 PNG 删除均未纳入提交。
## 2026-06-07 13:23 CST: chronicle_text='SP0001' CHECK 报错根因与修复

- **权威来源**: SQL/数据库报错以 `SP·数据库 III -> 高级工具 -> 运行日志` 为准。截图和运行态确认该入口能看到 `SyncBridge` / `SqlTableService` 的真实 SQL 错误；body 文本和 console 只能辅助。
- **根因**: `sheet_chronicle` 旧数据中有一行 `["1","SP0002","2026-06-06 18:31","七中敲门事件","复测员逃出教室，遭遇鬼域封锁。","SP0001"]`，第 6 列 `chronicle_text` 被错误填成编号 `SP0001`。该字段 DDL 要求 200-600 字，因此 SyncBridge 写入 SQLite 时触发 `CHECK constraint failed: LENGTH(chronicle_text) >= 200 AND LENGTH(chronicle_text) <= 600`。
- **修复要点**: `generateInserts()` 写入 SQLite 前调用 `validateSqlContentRowBeforeInsert_ACU()`，跳过无效 `chronicle_text` 行并给出可读 warn；`applyEdits()` 事务前调用 `validateChronicleTextInMutationStatements_ACU()`，拦截 AI 直写 `chronicle_text='SP0001'` 这类 SQL；仪表盘分类把 `chronicle_text 长度无效` 归入 SQL 约束问题。
- **提示词防线**: 开发版和发布版 `sheet_chronicle` 的 note/initNode/insertNode 都明确：`chronicle_text` 必须是 200-600 字正文纪要，不能填 `SP0001/SP0002` 等编号；旧表名禁用清单扩展到 `log_summary/simulation_summary/summary_logs/event_summary`。
- **验证发现**: 清理当前浏览器聊天里的坏行后，SP 运行日志为空；`CHECK constraint failed`、`ERROR SQL Mode`、`ERROR SqlTableService`、`near "INSERT"`、`near "WHERE"`、`log_summary`、`event_summary` 计数均为 0。当前运行态 marker 是 `mfrs-local-p7-chronicle-direct-guard`。

## 2026-06-07：Schema/CHECK 约束不合规类根治方向

用户提供的 `C:\Users\linlang\Downloads\acu-logs-2026-06-07T06-53-49-116Z.json` 只有 3 条日志，都是同一问题的重复记录。核心 SQL 为：

```text
UPDATE supernatural_events
SET ghost_domain_status = '已被鬼域覆盖',
    suspected_laws = '声音传播（敲门声）；接触疑似媒介将被标记；厉鬼会顺着阴影连接/声音标记靠近',
    handling_status = '爆发中'
WHERE event_code = 'DACHANG_KNOCK_001'
```

失败原因是 `supernatural_events.handling_status` 的 CHECK 枚举只允许 `未处理/调查中/对抗中/已压制/已关押/失控扩散/结束`，而模型写入了自然语言状态 `爆发中`。这属于 `Schema/CHECK 约束不合规类`，细分为 `枚举字段非法值`，与历史 `action_suggestions.revival_risk_level='极低'` 同小类，与 `chronicle_text='SP0001'` 同大类。

根治方向不应继续按字段单点补丁。需要从两份 SQL 模板 DDL 自动解析约束，建立统一 constraint map，并在 AI SQL 执行前和 SyncBridge 种子写入前共用同一套校验：

- 枚举 CHECK：自动提取允许值，常见自然语言别名可归一化，无法判断则拦截。
- 长度 CHECK：自动提取范围，过短/编号误填/字段错位行跳过或拦截。
- 表列白名单：继续保留现有未知表/未知列预检。
- 日志分类：把此类问题归为 `SQL schema/CHECK 约束不合规`，显示表、字段、非法值、允许值和处理结果。

本轮规划已在 `task_plan.md` 追加 S0-S9 清单；当前只规划，不改代码。

### S0 样本矩阵（2026-06-07）

S0 已完成基线冻结与样本归档。当前仓库分支为 `main`，本地 `HEAD=3ef8d3bb6f10c3788ad707107d44b0d406221fd0`，`origin/main=295ed8bc9a11333e0c5032e4899dc3ebd066fd5c`。本阶段只更新 planning，不改业务代码。

本轮日志文件：

- 路径：`C:\Users\linlang\Downloads\acu-logs-2026-06-07T06-53-49-116Z.json`
- 大小：1789 bytes
- SHA256：`CCDCE56B90D64526880586ACC1DCEA483527CB922387CB81D25559C1851465DE`
- 记录数：3
- 时间范围：`2026-06-07T06:04:53.705Z` - `2026-06-07T06:04:53.719Z`
- 分布：`SqlTableService` error 1、`SQL Mode` error 1、`shujuku_v120` warn 1

样本矩阵：

| 表.字段 | 非法值 / 失败形态 | 允许值 / 规则 | 期望处理方式 |
|---|---|---|---|
| `supernatural_events.handling_status` | `爆发中` | `未处理/调查中/对抗中/已压制/已关押/失控扩散/结束` | 通用枚举预检识别；`爆发中/正在爆发/扩散中` 归一化为 `失控扩散`，无法判断时拦截 |
| `action_suggestions.revival_risk_level` | `极低` | `无/低/中/高/致命/未知` | 通用枚举预检识别；归一化为 `低` |
| `action_suggestions.death_risk_level` / `revival_risk_level` | `极高/严重/极重` 等 | `无/低/中/高/致命/未知` | 高危近义词归一化为 `致命`，无法判断写 `未知` 或拦截 |
| `chronicle.chronicle_text` | `SP0001` / `SP0002` 编号误填 | 200-600 字正文纪要，不能是编号、短摘要或 code_index | SyncBridge 跳过坏 seed 行；AI SQL 预检拦截直写坏值 |
| `chronicle.chronicle_text` | 正文短于 200 字 | `LENGTH(chronicle_text) >= 200 AND <= 600` | 长度预检拦截或跳过，不进入 SQLite 原始 CHECK |
| 所有 CHECK 枚举字段 | 模型自然语言近义词 | DDL `CHECK(... IN (...))` 自动提取出的允许值 | S1-S3 用 constraint map 和集中别名表处理，不继续逐字段救火 |

### S1 约束注册表实现结论（2026-06-07）

S1 已实现一个只做 DDL 纯解析、不接入 SQL 执行链路的 schema constraint registry。新增函数位于 `vendor/shujuku-sp-fork/index.js` 的 DDL 工具区：

- `parseDDLConstraintRegistry_ACU(ddl)`：返回 `tableName/chineseName/columnOrder/columns/tableChecks`。
- 每列可记录：`sqlName`、`type`、`comment`、`primaryKey`、`notNull`、`unique`、原始 `checks`、`enumValues`、`lengthRange`、`numericRange`、`globPattern`、`nonEmpty`。
- 支持解析：`CHECK(col IN (...))`、`CHECK(LENGTH(col) >= n AND LENGTH(col) <= n)`、`CHECK(LENGTH(col) <= n)`、`CHECK(col BETWEEN a AND b)`、`CHECK(col >= n)`、`CHECK(col GLOB 'pattern')`、`CHECK(TRIM(col) <> '')`。

回归脚本已验证：

- 开发版和发布版两份 SQL 模板 registry 完全一致。
- registry 包含 14 张 SQL 表。
- `supernatural_events.handling_status` 自动提取枚举：`未处理/调查中/对抗中/已压制/已关押/失控扩散/结束`。
- `action_suggestions.revival_risk_level` 自动提取枚举：`无/低/中/高/致命/未知`。
- `chronicle.chronicle_text` 自动提取长度范围：`min=200/max=600`。
- `global_state.world_pressure` 自动提取数值范围：`min=0/max=100`。
- `chronicle.code_index` 自动提取 GLOB 模式：`SP[0-9][0-9][0-9][0-9]`。
- `characters.name` 自动标记 `UNIQUE`。

S1 调试中发现并修正两个解析/测试问题：DDL 定义片段可能以前一行注释开头，注释剥离必须逐行执行；VM 中解析得到的 Array 与 Node 主上下文 Array 原型不同，测试里需要 JSON 化后再做 strict deep equal。S1 目前只提供注册表，尚未用于归一化或拦截；S2 负责接入执行前 schema 预检。
