# Progress Log

## 2026-06-07 19:18 CST: S9 release chain started

- **Status:** S9 in progress.
- **Scope:** execute the release chain for the completed S0-S8 Schema/CHECK constraint fix set: resource commit, loader hash/cache backfill, build, publish-card, CDN verification, true-page smoke, final commit/push, and planning updates.
- **Remote baseline:** `git fetch origin` succeeded. Local `main` is behind `origin/main` by one bot dependency commit, `295ed8b [bot] Bump deps`, touching only `package.json` and `pnpm-lock.yaml`.
- **Worktree boundary:** existing dirty files include the S0-S8 SQL/vendor/regression/dist changes plus unrelated `AGENTS.md`, status-bar dist HTML, planning files, screenshots, backups, and temp Chrome folders. S9 staging must stay precise and must not stage unrelated dirty/untracked files.
- **Remote integration:** `git merge --ff-only origin/main` succeeded and fast-forwarded local `main` to `295ed8b`.
- **Static gates before resource commit:** passed `node --check vendor\shujuku-sp-fork\index.js`, `node --check scripts\verify-sql-debug-regressions.mjs`, `git diff --check`, JSON parse for both SQL templates, and `node scripts\verify-sql-debug-regressions.mjs`.
- **Expected warning:** the regression script printed only Node's expected `node:sqlite` experimental warning.
- **Version decision:** current release YAML remains `版本: '6.10'`; the earlier `6.11` marker/cache only existed on the development loader path. S9 will publish the completed Schema/CHECK constraint fix set as release `6.12` with a fresh cache/marker.
- **Error note:** an attempted parallel `git add` plus `git status` caused a transient `.git/index.lock` conflict. A follow-up process check confirmed no active Git process and the lock file had already cleared. From here, Git index-writing commands are run sequentially.
- **Resource commit:** created and pushed `70fbe7d fix: harden sql schema check constraints`.
- **Resource commit scope:** `vendor/shujuku-sp-fork/index.js`, `scripts/verify-sql-debug-regressions.mjs`, both SQL template JSON files, and the two database frontend dist bundles that embed the refreshed template JSON.
- **Next:** backfill the development database loader and database frontend reclaim URL to resource commit `70fbe7d`, then build and commit the loader/dist refresh.

## 2026-06-07：S9 发布链路完成

- **状态：** S9 complete。Schema/CHECK 约束防线已经完成构建、打包、推送、CDN 验证和发布卡真页 smoke。
- **最终远端：** `HEAD==origin/main==9ba8f98a39d0b869f1e14b29e7a405026baba3ad`；发布提交 tag 为 `v0.0.87`。
- **提交链路：** 资源提交 `70fbe7d9beaf7565783be9d935f499fafdd88dbc`（`fix: harden sql schema check constraints`） -> loader 回填提交 `82261c07f911452c8865625adc122cc19388c9c5`（tag `v0.0.86`） -> 发布包提交 `9ba8f98a39d0b869f1e14b29e7a405026baba3ad`（`chore: release schema check guard 6.12`）。
- **版本/cache/marker：** 发布版本 `6.12`；loader marker `mfrs-schema-check-constraints-6-12`；cache marker `phase124-schema-check-constraints-6-12`；loader 资源指向 vendor/resource 提交 `70fbe7d9beaf7565783be9d935f499fafdd88dbc`。
- **静态 gate：** 已通过 `git diff --check`、`node --check vendor\shujuku-sp-fork\index.js`、`node --check scripts\verify-sql-debug-regressions.mjs`、两份 SQL 模板 JSON parse、`node scripts\verify-sql-debug-regressions.mjs`、`npm run build`。
- **回归输出：** `[ok] SQL Debug regressions verified: templates=2, sheets=14, generated CHECK fixtures, constraint registry/preflight, enum alias normalization, risk/update normalization, old table preflight, SQL cleaning, Bad Gateway, dashboard classification`；仅有预期 Node `node:sqlite` experimental warning。
- **发布打包：** `npm run publish-card -- 神秘复苏模拟器发布版` 成功，替换 6 处 CDN 链接并保留发布版本 `6.12`。
- **发布元数据：** 发布 YAML 与 PNG `chara`/`ccv3` 元数据均包含 `6.12`、`82261c07f911452c8865625adc122cc19388c9c5`、`phase124-schema-check-constraints-6-12`；旧 `6.10`、`66e4c2e4...`、`phase122-incomplete-values-6-10` 均不存在。
- **CDN 验证：** release YAML `9ba8f98...`、数据库 loader `82261c07...`、数据库前端 loader `82261c07...`、vendor `70fbe7d...` 均返回 200。loader 文件包含 `mfrs-schema-check-constraints-6-12`、`phase124-schema-check-constraints-6-12` 和 vendor hash `70fbe7d...`；vendor 包含 `parseDDLConstraintRegistry_ACU`、`validateSqlStatementsAgainstConstraintRegistry_ACU` 与 `SQL schema/CHECK`。
- **真页 smoke：** 通过 `npx agent-browser --cdp 9222` 验证 `http://127.0.0.1:8000/` 的发布卡 `characterId=3` / `神秘复苏模拟器发布版`，marker/API marker 为 `mfrs-schema-check-constraints-6-12`。在 `SP·数据库 III -> 高级工具 -> 运行日志` 中，最新 `21:42:57.xxx` 行只有 5 条 SyncBridge warn，均为无效 `chronicle.chronicle_text` 种子行已跳过以避免 SQLite CHECK 失败。
- **smoke 计数：** 最新发布 smoke 行中 `CHECK constraint failed`、`ERROR SQL Mode`、`ERROR SqlTableService`、`near "INSERT"`、`near "WHERE"`、`incomplete input`、`log_summary`、`event_summary` 均为 0。
- **历史残留：** 运行日志里仍有 `19:08` 的旧 `global_state has no column named game_time` error；该行是历史残留，不计入本次发布 smoke。
- **工作区边界：** 既有无关 tracked dirty 仍未纳入发布提交：`AGENTS.md`、`dist/神秘复苏模拟器/界面/状态栏/index.html`；未跟踪的 planning、截图、备份和临时 Chrome profile 也保持未提交。

## 2026-06-07: S8 real-page smoke completed

- **Status:** complete for S8; no code change, build, commit, push, CDN backfill, or publish in this step.
- **Runtime:** connected to the existing SillyTavern page via `npx agent-browser --cdp 9222`; the page is on `http://127.0.0.1:8000/` and the runtime marker/API marker both read `mfrs-local-s8-schema-check-regression`.
- **Template/runtime context:** SP·数据库 III old UI reports the current chat as `神秘复苏模拟器 - 2026-06-07@15h50m00s196ms`, SQLite mode is available, and database status is `已加载 (14个表格, 5条记录)`.
- **Historical baseline:** the old SP log DOM still contained 5 historical rows, including `15:54:28.980/997` raw `CHECK constraint failed`, `ERRORSQL Mode`, and `ERRORSqlTableService`; these were treated as pre-S8 residue.
- **Controlled sample 1:** `UPDATE supernatural_events SET handling_status='爆发中' WHERE event_code='__S8_NONEXISTENT__';` executed from the SQL console with `0 行受影响` and did not add raw CHECK/SQL errors.
- **Controlled sample 2:** temporary insert `event_code='__S8_TEMP__'` with `handling_status='爆发中'` was blocked by schema/CHECK preflight. Result text included `SQL schema/CHECK 约束不合规` and `已拦截，未进入 SQLite`; follow-up SELECT for `__S8_TEMP__` returned `0 行`, confirming no data pollution.
- **Natural flow:** sent the action `我不播放音频，先把手机静音并退到门边，用鬼档案观察网页与走廊的异常变化。`; chat length reached 7 and the latest assistant reply was generated.
- **Final SP log:** `SP·数据库 III -> 高级工具 -> 运行日志` showed only 2 new SyncBridge warnings, both readable `chronicle.chronicle_text` seed-row skips ending in `已跳过该行以避免 SQLite CHECK 失败`.
- **Final counts:** in the final SP running-log text, `CHECK constraint failed`, `ERROR SQL Mode`, `ERROR SqlTableService`, `near "INSERT"`, `near "WHERE"`, `incomplete input`, `log_summary`, and `event_summary` were all 0.
- **Tooling notes:** one early SQL console click did not reach the execution flow because the wrong result selectors were inspected; a later run against the old UI result area confirmed execution. Chinese regex in `agent-browser eval` can be mangled through PowerShell/CDP, so final probes used ASCII tokens or Unicode escapes.
- **Next:** S9 release chain remains pending and should only run when explicitly requested.

## 2026-06-07: S7 registry-driven CHECK regression completed

- **Status:** complete for S7; no build, dist refresh, commit, push, CDN backfill, publish, or real-page smoke was performed in this step.
- **Scope:** modified `scripts/verify-sql-debug-regressions.mjs` and planning files. Existing unrelated dirty/untracked files were not reverted.
- **Regression change:** added registry-driven CHECK fixture generation from `parseDDLConstraintRegistry_ACU()`, covering enum, length, numeric range, GLOB, non-empty, and NOT NULL constraints.
- **Gate behavior:** every generated bad SQL is expected to throw `SQL schema/CHECK 约束不合规`, include `已拦截，未进入 SQLite`, and avoid raw SQLite `CHECK constraint failed`.
- **Existing fixtures retained:** current `handling_status='爆发中'` sample, unknown illegal enum interception, risk normalization, chronicle text length/code mistakes, unknown table/column, SQL fragment cleaning, Bad Gateway, and dashboard classification.
- **Verification passed:** `node --check scripts\verify-sql-debug-regressions.mjs`; `node --check vendor\shujuku-sp-fork\index.js`; `git diff --check`; `node scripts\verify-sql-debug-regressions.mjs`.
- **Expected warning:** regression script still prints only Node's `node:sqlite` experimental warning.
- **Next:** S8 real-page SP running-log smoke must first confirm whether the 9222 page is actually loading this local patched vendor or an older CDN marker.

## 2026-06-07: S5-S6 enum prompt docs and log readability completed

- **Status:** complete for S5-S6; no build, dist refresh, commit, push, CDN backfill, publish, or real-page smoke was performed in this step.
- **Scope:** modified the two SQL template source JSON files, `vendor/shujuku-sp-fork/index.js`, `scripts/verify-sql-debug-regressions.mjs`, and planning files. Existing unrelated dirty/untracked files were not reverted.
- **S5 template change:** both development and release `神秘复苏表格SQL_v1.json` now include `【枚举硬约束】` prompt text for all current DDL enum CHECK fields, not only the previously failing field.
- **S5 covered fields:** `supernatural_events.handling_status`, `ghost_archives.containment_status`, `clues.reliability`, `clues.verification_status`, `clues.visibility`, `characters.presence_status`, `characters.life_status`, `locations.supernatural_status`, `locations.lockdown_status`, `action_suggestions.option_key`, `action_suggestions.death_risk_level`, and `action_suggestions.revival_risk_level`.
- **S5 forbidden aliases:** prompts now explicitly discourage high-risk natural-language aliases such as `爆发中/处理中/已解决`, `已收容/临时控制`, `高可信/已证实/后台记录`, `现场/活着/下落不明`, `鬼域中/黄金封存`, and `选项A/极低/极高/严重`.
- **S6 runtime change:** successful enum/value normalization logs `[SqlNormalizer] SQL schema/CHECK 约束已归一化`, including table.field, original value, normalized value, and allowed values for enum rules.
- **S6 interception logs:** SQL preflight errors now append `已拦截，未进入 SQLite。`; SyncBridge bad seed rows continue to show row-level details and `已跳过该行以避免 SQLite CHECK 失败`.
- **S6 dashboard classification:** `interpretLogEntry()` now classifies normalized, intercepted, skipped-seed, and raw SQLite constraint forms as `sqlConstraintIssue`; dashboard copy names `SQL schema/CHECK 约束不合规或已处理`.
- **Regression coverage:** `scripts/verify-sql-debug-regressions.mjs` now checks dev/release enum prompt docs match, all prompt tokens remain present, normalization debug logs contain the required S6 details, preflight errors include the intercepted result, and dashboard fixtures classify all three handling outcomes.
- **Verification passed:** `node --check vendor\shujuku-sp-fork\index.js`; `node --check scripts\verify-sql-debug-regressions.mjs`; JSON parse for both SQL templates; `git diff --check`; `node scripts\verify-sql-debug-regressions.mjs`.
- **Expected warning:** regression script still prints only Node's `node:sqlite` experimental warning.
- **Next:** S7 can automate broader CHECK fixture generation if the user continues; S8 real-page SP running-log smoke remains unperformed in this step.

## 2026-06-07: S4 SyncBridge row-level constraint validation completed

- **Status:** complete for S4; no commit, push, build, CDN backfill, or real-page smoke was performed in this step.
- **Scope:** modified `vendor/shujuku-sp-fork/index.js`, `scripts/verify-sql-debug-regressions.mjs`, and planning files. Existing unrelated dirty/untracked files were not reverted.
- **Runtime change:** `generateInserts()` now normalizes each seed row first, then validates the normalized row against `parseDDLConstraintRegistry_ACU(sheet.sourceData.ddl)` before producing an INSERT.
- **Constraint coverage:** SyncBridge row validation now reuses S2's cell validator for enum values, text length, numeric ranges, GLOB patterns, non-empty fields, and explicit `NULL`.
- **Bad-row behavior:** invalid seed rows are skipped with readable `[SyncBridge]` warnings while valid rows and table structure are preserved.
- **Historical sample:** `chronicle.chronicle_text='SP0001'` is now handled by generic DDL constraint validation rather than a chronicle-only special case.
- **Additional fixtures:** bad `action_suggestions.option_key='E'`, `row_id=5`, invalid `global_state.game_time`, `world_pressure=120`, blank `display_text`, and blank `dice_command` are skipped before SQLite.
- **Dashboard classification:** SyncBridge warnings containing `SQLite CHECK 失败` now classify as `sqlConstraintIssue`.
- **Regression coverage:** `scripts/verify-sql-debug-regressions.mjs` captures `logWarn_ACU`, asserts warning text, verifies bad seed rows are absent from generated INSERTs, and writes only valid rows into in-memory SQLite.
- **Verification passed:** `node --check vendor/shujuku-sp-fork/index.js`; `node --check scripts/verify-sql-debug-regressions.mjs`; `git diff --check`; `node scripts/verify-sql-debug-regressions.mjs`.
- **Expected warning:** regression script still prints only Node's `node:sqlite` experimental warning.
- **Error note:** one auxiliary review probe used Bash heredoc syntax in PowerShell and failed with a shell parse error; it was not part of the implementation gate and was not repeated.
- **Next:** S5 can synchronize the SQL template prompt text so all enum fields explicitly document allowed values and forbidden natural-language aliases.

## 2026-06-07: S3 enum alias normalization completed

- **Status:** complete for S3; no commit, push, build, CDN backfill, or real-page smoke was performed in this step.
- **Scope:** modified `vendor/shujuku-sp-fork/index.js`, `scripts/verify-sql-debug-regressions.mjs`, and planning files. Existing unrelated dirty/untracked files were not reverted.
- **Runtime change:** added centralized `SQL_ENUM_ALIAS_RULES_ACU` keyed by `table.column`, and wired `tryNormalizeInsertValues()` / `tryNormalizeUpdateValues()` to capture table names before value normalization.
- **Coverage:** enum aliases now cover the current DDL enum fields, including `supernatural_events.handling_status`, `action_suggestions.option_key`, both risk levels, clue status fields, character status fields, location status fields, and ghost containment status.
- **Behavior:** `handling_status='爆发中'` normalizes to `失控扩散`; `处理中/交战中` normalize to `对抗中`; unknown values such as `热闹中` remain unchanged and are intercepted by S2 preflight.
- **Non-enum safety:** text fields such as `public_summary='爆发中但这里只是摘要'` are not rewritten.
- **SyncBridge boundary:** `generateInserts()` now passes `tblName` into the existing normalizer so seed INSERT values can share enum alias normalization, but S4 row-level SyncBridge constraint validation was not implemented in this step.
- **Regression coverage:** added S3 fixtures for cross-table aliases, UPDATE, multi-row INSERT, unknown illegal enum interception, non-enum text preservation, and generated INSERT normalization into in-memory SQLite.
- **Verification passed:** `node --check vendor/shujuku-sp-fork/index.js`; `node --check scripts/verify-sql-debug-regressions.mjs`; `git diff --check`; `node scripts/verify-sql-debug-regressions.mjs`.
- **Expected warning:** regression script still prints only Node's `node:sqlite` experimental warning.
- **Next:** S4 can extend the constraint map into SyncBridge row-level validation and bad-row skipping, beyond the value-only alias normalization added here.

## 2026-06-07: S2 schema/CHECK preflight completed

- **Status:** complete for S2; no commit, push, build, CDN backfill, or real-page smoke was performed in this step.
- **Scope:** modified `vendor/shujuku-sp-fork/index.js`, `scripts/verify-sql-debug-regressions.mjs`, and planning files only in this pass. Existing unrelated dirty/untracked files were not reverted.
- **Runtime change:** `SqlTableService.applyEdits()` and `executeMutation()` now run schema/CHECK preflight before SQLite execution, using a DDL-derived constraint registry collected from current template/runtime table data.
- **Preflight behavior:** checks explicit static values in `INSERT`/`REPLACE`/`UPDATE` for enum, length, numeric range, GLOB, non-empty, and explicit `NULL` violations. Dynamic expressions are left alone rather than guessed.
- **S2 gate:** `UPDATE supernatural_events SET handling_status='爆发中' ...` is now expected to throw `[SqlTableService] SQL schema/CHECK 约束不合规...` before SQLite, without raw `CHECK constraint failed`. Legal `handling_status='失控扩散'` remains allowed.
- **Regression coverage:** added fixtures for `handling_status='爆发中'`, legal `失控扩散`, `chronicle_text='SP0001'`, `world_pressure=120`, `code_index='P0001'`, blank `display_text`, and `name=NULL`.
- **Verification passed:** `node --check vendor/shujuku-sp-fork/index.js`; `node --check scripts/verify-sql-debug-regressions.mjs`; `git diff --check`; `node scripts/verify-sql-debug-regressions.mjs`.
- **Expected warning:** regression script still prints only Node's `node:sqlite` experimental warning.
- **Next:** S3 can add centralized enum alias normalization, including mapping `爆发中/正在爆发/扩散中 -> 失控扩散`, after this S2 deterministic preflight baseline is stable.

## 2026-06-07 11:40 CST: P7 hidden SQL log follow-up started

- **Status:** in progress for the hidden SP log follow-up after the 6.11 visible retest.
- **Context:** user confirmed `9222` is the Chrome/CDP port, SillyTavern is `http://127.0.0.1:8000/`, and `localhost:5500` is now running.
- **P6 result already established:** development card marker `mfrs-update-trailing-comma-6-11`; two generated assistant turns completed; visible counts for `near "WHERE"`, `ERROR SQL Mode`, `ERROR SqlTableService`, `incomplete input`, `near "INSERT"`, and `CHECK constraint failed` were all 0.
- **P7 issue to fix:** hidden SP database log rows still showed new SQL risks: `event_summary` treated as an unknown table, plus truncated `INSERT INTO characters ... ON CONFLICT(name) DO UPDATE SET` reaching SQLite as `incomplete input`.
- **Plan for this pass:** add `event_summary` to legacy chronicle aliases/classification, harden incomplete UPSERT detection, add regression coverage, update both SQL templates, then verify with static gates and a 9222 retest against local 5500.

## 2026-06-07 11:55 CST: P7 code/template regression gate passed

- **Status:** complete for local source/vendor regression gate; build and 9222 smoke still pending.
- **Changes:** `event_summary` added to legacy chronicle table aliases and dashboard old-table classification; incomplete `INSERT ... ON CONFLICT(name) DO UPDATE SET` with no assignment list is now treated as incomplete and filtered before SQLite execution.
- **Templates:** both development and release SQL templates now explicitly forbid `log_summary`, `simulation_summary`, `summary_logs`, and `event_summary` for event summaries, and both character-table UPSERT prompts warn not to stop after `DO UPDATE SET`.
- **Regression coverage:** `scripts/verify-sql-debug-regressions.mjs` now checks `event_summary` prompt/preflight/classification plus truncated and valid UPSERT filtering.
- **Verification passed:** `node --check vendor/shujuku-sp-fork/index.js`; `node --check scripts/verify-sql-debug-regressions.mjs`; `git diff --check`; `node scripts/verify-sql-debug-regressions.mjs`.
- **Expected warning:** regression script still prints Node `node:sqlite` experimental warning only.

## 2026-06-07 12:05 CST: P7 build checkpoint

- **Status:** build complete; browser smoke still pending.
- **Build:** first `npm run build` inside the sandbox failed with the known Windows `spawn EPERM`; reran the same command with approved sandbox-external execution and webpack compiled all entries successfully.
- **Dist impact:** build regenerated the configured `dist/**` outputs. Existing unrelated dirty dist files were already present before this pass, so final staging/commit must still use precise paths only.
- **Next:** inspect the development database loader resource path, then use `npx agent-browser --cdp 9222` against `http://127.0.0.1:8000/` and local `localhost:5500` to verify runtime marker/log behavior.

## 2026-06-06 23:10 CST: loader backfill build checkpoint

- **Status:** complete for loader backfill checkpoint; not yet committed at this entry.
- **Change:** development card database loader now points to resource commit `3f59742003459058aff9ffe7aebf647fc0799f18`, cache `phase123-update-trailing-comma-6-11`, marker `mfrs-update-trailing-comma-6-11`.
- **Files:** `src/神秘复苏模拟器/脚本/数据库/index.ts` and `dist/神秘复苏模拟器/脚本/数据库/index.js`.
- **Verification:** `npm run build` was already rerun successfully outside the sandbox after the known Windows sandbox `spawn EPERM`; generated dist contains the same hash/cache/marker.
- **Boundary:** existing unrelated tracked diff `dist/神秘复苏模拟器/界面/状态栏/index.html` and untracked planning/screenshots/backups/temp Chrome files remain excluded from commit scope.
- **Next:** precise `git add` only the two loader files, commit `chore: point database loader to trailing comma fix`, push, then run a fresh 9222 development-card dialogue retest.

## 2026-06-06 23:15 CST: loader backfill committed and pushed

- **Status:** complete.
- **Commit:** `3ef8d3b chore: point database loader to trailing comma fix`.
- **Push:** `git push origin main` succeeded; remote advanced from `3f59742` to `3ef8d3b`.
- **Committed scope:** only `src/神秘复苏模拟器/脚本/数据库/index.ts` and `dist/神秘复苏模拟器/脚本/数据库/index.js`.
- **Boundary:** unrelated tracked diff `dist/神秘复苏模拟器/界面/状态栏/index.html` and untracked planning/screenshots/backups/temp Chrome files were not staged.
- **Next:** use `agent-browser --cdp 9222` to reload/switch the development card and verify marker `mfrs-update-trailing-comma-6-11` before opening a fresh dialogue retest.

## 2026-06-06 23:25 CST: development page marker still stale after reload

- **Status:** investigation in progress.
- **Browser:** `npx agent-browser --cdp 9222` opened `http://127.0.0.1:8000/`; after reload the page first landed on the recent-chat list, then the first development-card chat was selected.
- **Observed runtime:** `window.__mfrsDatabaseScriptMarker__` and `AutoCardUpdaterAPI.__mfrsDatabaseScriptMarker__` still read `mfrs-incomplete-values-6-10`.
- **Static/local resource check:** direct HTTP fetch from `http://localhost:5500/dist/神秘复苏模拟器/脚本/数据库/index.js` contains `mfrs-update-trailing-comma-6-11`, commit `3f59742003459058aff9ffe7aebf647fc0799f18`, and cache `phase123-update-trailing-comma-6-11`.
- **Interpretation:** source/dist/5500 are updated; the active SillyTavern card/runtime is stale or retaining an old script instance. Next probe should inspect actual browser resource URLs and, if needed, rebundle/import or force-clear the database script globals before retesting.

## 2026-06-06 23:35 CST: tavern_sync push blocked by occupied bridge port

- **Status:** blocked on bridge cleanup, investigation in progress.
- **Attempt:** `node tavern_sync.mjs push 神秘复苏模拟器 -f` failed before modifying the card with `listen EADDRINUSE: address already in use :::6620`.
- **Port evidence:** `netstat -ano` shows PID `17216` listening on `0.0.0.0:6620` and `[::]:6620`, with an established browser-side connection on `[::1]:54872`.
- **Interpretation:** likely stale or already-running `tavern_sync` bridge server. Need confirm command line before stopping it, because killing a process is destructive.
- **Next:** query PID `17216` command line with elevated permissions; if it is confirmed as stale `tavern_sync`, stop only that PID, rerun the development-card push, then reload/switch the development card and verify marker.

## 2026-06-07 00:30 CST: forced local loader verification succeeded

- **Status:** complete for runtime loader verification; development dialogue retest still pending.
- **Action:** because `tavern_sync push 神秘复苏模拟器 -f` was blocked by occupied port `6620`, used the active 9222 development page to dynamically import current local loader `http://localhost:5500/dist/神秘复苏模拟器/脚本/数据库/index.js?probe=...`.
- **Result:** import returned `ok`; console captured `[spv3.9.5·数据库] 正在加载数据库本体` and `[spv3.9.5·数据库] 数据库本体已加载`.
- **Marker:** runtime changed from `mfrs-incomplete-values-6-10` to `mfrs-update-trailing-comma-6-11` for both `window.__mfrsDatabaseScriptMarker__` and `AutoCardUpdaterAPI.__mfrsDatabaseScriptMarker__`.
- **Known warning:** one existing SyncBridge warning remained for seed `sheet_chronicle` data with `chronicle_text` failing the 200-600 length check; this matches ISSUE-002 observation and is not the `near "WHERE"` bug.
- **Next:** open a fresh development-card chat under the new marker, send the 6.11 retest opening input, then check latest visible SQL errors and推演选项.

## 2026-06-07 00:35 CST: fresh development chat created, old listener reappeared

- **Status:** retest setup in progress.
- **Action:** executed TavernHelper slash `/newchat` on development card `神秘复苏模拟器`.
- **Result:** new chat id is `神秘复苏模拟器 - 2026-06-07@00h33m15s344ms`, `chatLength=1`.
- **Marker issue:** before `/newchat`, runtime marker was `mfrs-update-trailing-comma-6-11`; after chat creation it reverted to `mfrs-incomplete-values-6-10`.
- **Interpretation:** old 6.10 database instance/listener remains in the long-lived page and reattaches on chat change. This is a live-page cache/listener residue, not a source/dist issue: the current local loader import had already proven 6.11 can load successfully.
- **Next:** in the new chat, force-import the current local 6.11 loader again immediately before sending the retest input; treat the 6620 `tavern_sync` bridge blockage and old listener residue as environment notes.

## 2026-06-07 00:40 CST: new development chat restored to 6.11 marker

- **Status:** complete.
- **Action:** in chat `神秘复苏模拟器 - 2026-06-07@00h33m15s344ms`, dynamically imported current local database loader from `http://localhost:5500/dist/神秘复苏模拟器/脚本/数据库/index.js?retest=...`.
- **Result:** `window.__mfrsDatabaseScriptMarker__` and `AutoCardUpdaterAPI.__mfrsDatabaseScriptMarker__` both read `mfrs-update-trailing-comma-6-11`.
- **State:** `chatLength=1`, `hasApi=true`, loader flag present.
- **Next:** submit the opening retest input through the visible development-card start form and inspect the resulting SQL logs/options.

## 2026-06-07 00:50 CST: development retest opening form filled

- **Status:** input prepared; generation not yet sent at this entry.
- **Chat:** `神秘复苏模拟器 - 2026-06-07@00h33m15s344ms`.
- **Marker:** `window.__mfrsDatabaseScriptMarker__` and `AutoCardUpdaterAPI.__mfrsDatabaseScriptMarker__` both stayed `mfrs-update-trailing-comma-6-11`.
- **Input:** name `复测员`; age/gender `25/男`; identity `普通人（卷入灵异事件）`; ghost preset `鬼档案`; ability preset `灵异档案视野`; anchor `七中当日·周正讲课`; resources `黄金小片一块、旧手机一部`; background `土著，对灵异一无所知，只知道最近学校里有人传播诡异音频。`.
- **UI result:** clicking `进入神秘复苏世界` populated the SillyTavern send textbox with the opening setup message; `chatLength` remained `1`, so the message still needs to be sent through the real send button.
- **Pre-send SQL counts:** visible page counts for `near "WHERE"`, `ERROR SQL Mode`, `ERROR SqlTableService`, `incomplete input`, `near "INSERT"`, and `CHECK constraint failed` were all `0`.

## 2026-06-07 01:00 CST: development retest first generation passed

- **Status:** complete for first generation;推演选项 click retest still pending.
- **Action:** clicked the real SillyTavern send button after the opening form populated the send textbox.
- **Chat:** `神秘复苏模拟器 - 2026-06-07@00h33m15s344ms`.
- **Runtime:** marker and API marker stayed `mfrs-update-trailing-comma-6-11`.
- **Generation result:** `chatLength` advanced to `3`; latest assistant message length was about `5528` chars and rendered the opening scene for `复测员` at `七中当日·周正讲课`.
- **Choices:** detected `4` choice elements and `4` enabled choice elements after generation.
- **Visible SQL counts:** `near "WHERE"=0`, `ERROR SQL Mode=0`, `ERROR SqlTableService=0`, `incomplete input=0`, `near "INSERT"=0`, `CHECK constraint failed=0`.
- **Next:** click one generated推演选项, submit if it only fills the send textbox, then inspect visible SQL/log state and database frontend/SP advanced logs.

## 2026-06-06 22:20 CST: planning-with-files resume snapshot for 6.10

- **Status:** complete. Updated `task_plan.md`, `findings.md`, and `progress.md` so a new conversation can resume from the current 6.10 state.
- **Latest browser observation:** `agent-browser --cdp 9222` connected to `http://127.0.0.1:8000/` / `SillyTavern`. The current page marker and API marker are `mfrs-incomplete-values-6-10`.
- **Visible log error:** `INSERT OR REPLACE INTO check_suggestions (row_id, display_text, check_type, check_basis, dice_command) VALUES -> incomplete input`. Visible rows are at `21:22:39`, `21:23:00`, and `21:23:20`; all are the same failure.
- **Current interpretation:** this is not the old `near "INSERT"` issue. It was a new incomplete-final-`VALUES` parser gap. Since the page now reports the 6.10 marker, the currently visible log entries should be treated as historical unless fresh rows appear after a new run.
- **Release state:** parser fix `5ec1aa67b1b082fe62114884bd72d079aefbf913`, loader backfill `66e4c2e4a9bb353325751e6eefbb719adfd61c33`, release `aaf14dc64e3f080528c4bcb42c5afaba9fee418a`; `HEAD == origin/main == aaf14dc64e3f080528c4bcb42c5afaba9fee418a`.
- **Published version:** `6.10`, cache `phase122-incomplete-values-6-10`, runtime marker `mfrs-incomplete-values-6-10`.
- **Verification state:** static checks, regression script, build, publish-card, PNG metadata, git push, and CDN verification were completed before this planning update. The only expected warning in regression is Node `node:sqlite` experimental warning.
- **Worktree boundary:** unrelated dirty/untracked files remain and were not rolled back. Known tracked unrelated diff: `dist/神秘复苏模拟器/界面/状态栏/index.html`.

## 2026-06-06：agent-browser 连接 9222 酒馆界面确认
- **Status:** complete；按用户要求使用 `agent-browser` skill 控制 VSCode Fn+F5 打开的 9222 调试 Chrome，只读观察页面与日志，不改业务代码。
- **连接方式:** `npx agent-browser --cdp 9222 ...` 可用；首次沙箱内 `npx` 因 npm 离线缓存 `ENOTCACHED` 失败，按权限流程授权后成功，后续 `["npx","agent-browser"]` 前缀已获准。
- **页面状态:** `get url` 返回 `http://127.0.0.1:8000/`，`get title` 返回 `SillyTavern`；快照可读到当前聊天为开发卡 `神秘复苏模拟器`，包含开局设定表单、用户消息与 AI 回复，`characterId=2`，`chatLength=7`，当前未生成。
- **运行 marker:** 页面全局 `__mfrsDatabaseScriptMarker__` 为 `mfrs-sql-debug-regressions-6-7`。这说明当前真页仍处在旧 6.7 数据库脚本运行态，不能证明本地未发布补丁已自然生效。
- **可见报错:** 页面日志面板正文仍可见 `near "INSERT": syntax error`，精确计数为 `nearInsertCount=18`、`ERROR SQL Mode=7`、`ERROR SqlTableService=6`。最后一段上下文仍是残缺 `INSERT INTO chronicle (...) VALUES ...` 拼入下一条 `INSERT OR REPLACE INTO check_suggestions (...)`。
- **结论:** `agent-browser` 可以控制并读取该酒馆界面；当前报错内容可见，但属于旧运行态/历史日志边界。若要验证修复消除，需要让页面加载新 vendor/hash 后重载并 smoke。

## 2026-06-06：多 agent SQL `near "INSERT"` 修复主线完成
- **Status:** local fix complete；未提交、未推送、未发布。
- **多 agent 结果:** 报错解读 Agent 确认 SQL 边界解析根因；修复 Agent 完成 `vendor/shujuku-sp-fork/index.js` 与 `scripts/verify-sql-debug-regressions.mjs` 补丁；Chrome 测试 Agent 做了只读基线；planning Agent 完成初始记录。
- **代码修复:** 在既有 `extractSqlStatementsFromTableEdit_ACU()` 残缺 SQL 清洗基础上，进一步补强 `splitSqlStatements()`：当当前缓存 SQL 尚不完整且新行出现 `INSERT/UPDATE/DELETE/REPLACE/WITH/CREATE TEMP/DROP TABLE` 起始时，丢弃残缺缓存并从新语句重开，避免残缺 `chronicle` 吞掉后续 `check_suggestions`。
- **回归:** `scripts/verify-sql-debug-regressions.mjs` 新增底层 `splitSqlStatements()` 断言，确认残缺 `chronicle` fixture 不再拼接 `INSERT OR REPLACE INTO check_suggestions`，且后续完整语句保留。
- **验证:** `node --check vendor/shujuku-sp-fork/index.js` 通过；`node --check scripts/verify-sql-debug-regressions.mjs` 通过；`git diff --check` 通过；`node scripts/verify-sql-debug-regressions.mjs` 通过，仅有 Node `node:sqlite` experimental warning。`npm run build` 沙箱内命中已知 Windows `spawn EPERM`，沙箱外重跑成功，所有 webpack entry compiled successfully。
- **真页边界:** CDP 复核 9222 页面仍为开发卡 `characterId=2`，运行 marker 为旧 `mfrs-sql-debug-regressions-6-7`，数据库 loader 仍指向旧 vendor 资源提交 `37a10c0817845c3276a1846d331f9c7d02efe39e`；因此日志面板仍可见旧 `near "INSERT"`。要让真页自然消除该错，需要发布/回填新 vendor hash 后重新加载并 smoke。

## 2026-06-06：多 agent 协作任务记录初始化
- **Status:** planning-record complete；只更新 planning 三文件，不提交、不发布、不修改业务代码。
- **用户目标:** 通过 `127.0.0.1:9222` 的 Chrome DevTools MCP 观察 `http://127.0.0.1:8000/` 酒馆界面，修复日志中的 SQL `near "INSERT"` 报错。
- **协作分工:** 报错解读 Agent 负责日志和源码链路；修复 Agent 负责补丁和回归；Chrome DevTools MCP 测试 Agent 负责真页验证；planning-with-files 记录 Agent 负责结构化记录。
- **当前基线:** 真页日志面板仍可见 `ERROR SQL Mode` / `ERROR SqlTableService`，核心为残缺 `chronicle` INSERT 拼接下一条 `INSERT OR REPLACE INTO check_suggestions` 后报 `near "INSERT": syntax error`。观察上下文为 `SillyTavern`、`http://127.0.0.1:8000/`、角色 `神秘复苏模拟器`、`characterId=2`。
- **阶段状态:** 多 agent 协作已立项并完成 planning 记录初始化；报错解读、修复和 Chrome 真页测试结果待主协调线程继续汇总。

## 2026-06-06：当前进度快照记录
- **Status:** 已按用户要求使用 `planning-with-files` 记录当前进度；这是记录动作，不新增业务修复。
- **当前业务状态:** 08:39/08:53 日志与截图复发问题已本地修复并完成验证；尚未提交、推送或发布。
- **当前 tracked diff 范围:** 状态栏 dist、脚本 dist、两份 `index.yaml`、`src/神秘复苏模拟器/界面/状态栏/App.vue`、两份卡片 PNG、`vendor/shujuku-sp-fork/index.js`、`scripts/verify-sql-debug-regressions.mjs`，以及既有根目录 `神秘复苏模拟器.png` 删除状态。
- **当前未跟踪边界:** planning 文件、截图、备份、临时 Chrome profile、参考文件等仍未跟踪；本轮未纳入提交，也未回滚。
- **最近验证:** `git diff --check` 通过；`node scripts/verify-sql-debug-regressions.mjs` 通过，仅有 Node `node:sqlite` experimental warning。此前 `npm run build` 沙箱内因已知 Windows `spawn EPERM` 失败，沙箱外重跑成功。

## 2026-06-06：08:39/08:53 日志与截图复发修复
- **Status:** 本地修复与验证完成；未提交、未推送、未发布。
- **输入证据:** 复核 `acu-logs-2026-06-06T08-39-39-100Z.json`、`acu-logs-2026-06-06T08-53-09-855Z.json` 与两张截图。确认重复选项来自裸 `推演选项：` 兜底块未被隐藏；确认非 Debug 日志中的 `near "INSERT"` 来自残缺 `chronicle` SQL 拼接下一条 `check_suggestions`；Debug 日志显示厉鬼档案/相关表已触发。
- **修复:** 扩展开发版/发布版 `index.yaml` 的显示/不发送隐藏正则，覆盖裸 `推演选项：` 与 `状态面板：`；修复 `vendor/shujuku-sp-fork/index.js` 的 SQL 语句提取边界，残缺语句遇到新 SQL 时丢弃并重开；旧纪要表名拦截扩展到 `log_summary`、`simulation_summary`、`summary_logs`；状态栏资源摘要改为合并结构化 `灵异资源` 与 AI 面板字段，避免“鬼档案”泛称覆盖已驾驭厉鬼/鬼拼图。
- **回归:** `scripts/verify-sql-debug-regressions.mjs` 新增裸兜底块隐藏、残缺 SQL、旧表名扩展分类用例。已通过 `node --check vendor/shujuku-sp-fork/index.js`、`node --check scripts/verify-sql-debug-regressions.mjs`、`git diff --check`、`node scripts/verify-sql-debug-regressions.mjs`。回归脚本仅输出 Node `node:sqlite` experimental warning。
- **构建:** `npm run build` 沙箱内命中已知 Windows `spawn EPERM`；按权限流程沙箱外重跑成功，所有 webpack entry compiled successfully。构建同步更新 `dist/神秘复苏模拟器/界面/状态栏/index.html`、开发版 PNG 与发布版 PNG。
- **工作区边界:** 仍保留既有根目录 `神秘复苏模拟器.png` 删除状态、planning/截图/备份/临时 Chrome 文件等未跟踪项；本轮未回滚这些既有无关变更。

## 2026-06-06：planning 当前进度恢复与同步
- **Status:** complete；按用户要求使用 `planning-with-files` 恢复当前任务进度。
- **读取结果:** 已读取 `task_plan.md`、`progress.md`、`findings.md`，并运行 session catchup。当前最新业务状态为“推演选项点击交互修复”已发布到 `6.8`，`HEAD==origin/main==32e49c9482c4ed8ede59bae74480d0c154f6c031`。
- **同步动作:** `task_plan.md` 顶部已补充 6.8 当前阶段快照，避免后续恢复时被旧的 SQL 日志修复标题误导。
- **catchup 备注:** 上一会话遗留 8 条未同步上下文，核心是 6.8 发布后曾计划做浏览器级 smoke，但 catchup 未保留可引用的 smoke 输出；如后续需要真实页点击证据，应重新跑 CDP/浏览器 smoke。
- **工作区边界:** 当前仍保留既有 `dist/神秘复苏模拟器/界面/状态栏/index.html` tracked diff、根目录 `神秘复苏模拟器.png` 删除状态，以及 planning/截图/备份等未跟踪文件；本次只同步 planning 文件。

## 2026-06-06：推演选项点击交互修复
- **Status:** complete，已构建、提交并推送到 `origin/main`，发布版版本升为 `6.8`。
- **根因:** 根据截图 `屏幕截图 2026-06-06 125607.png`，推演选项面板停在静态短标签状态，未增强为可点击按钮；根因判断为 `enhanceChoicePanels()` 过早给 `.sp-panel-choices` 打 `data-mfrs-choice-ready`，当选项尚未解析完整时后续 MutationObserver 会跳过重试。
- **修复:** `src/神秘复苏模拟器/脚本/界面美化/index.ts` 已将 `panel.dataset.mfrsChoiceReady = 'true'` 从循环开头挪到 `renderChoices(body, actions)` 成功之后；没有解析到选项或没有 body 时不标记 ready，允许后续 DOM 完整后重试。
- **验证与构建:** `npm run build` 成功，`git diff --check` 通过。
- **提交链路:** 资源提交 `1fe4322c828c6c425d4d9392acd5194fa01509c0`（界面美化源码 + dist）已推送；发布提交 `32e49c9482c4ed8ede59bae74480d0c154f6c031` 已推送。`scripts/publish-card.mjs` 指向 `CDN_REF=1fe4322c828c6c425d4d9392acd5194fa01509c0`、cache `phase120-choice-panel-interaction-6-8`、`releaseVersion=6.8`；发布版 `index.yaml` 与 PNG 已由 `npm run publish-card -- 神秘复苏模拟器发布版` 生成。
- **边界:** 本修复只影响界面美化的推演选项按钮增强与填入输入框逻辑，不触碰 SQL 模式、数据库模板、vendor、SQLite provider 或 SQL 预检/导出链路；既有状态栏 dist diff、根目录 PNG 删除、planning/截图/备份等未提交。

## 2026-06-06：D10 发布边界补充
- **Status:** boundary update only；用户确认 `酒馆助手脚本-星河璀璨·数据库.json` 与 `酒馆助手脚本-spv3.9.5·数据库.json` 也是参考文件，D10 发布提交时不得纳入。

## 2026-06-06：D9 构建与发布前 gate 已完成
- **Status:** D9 complete；未提交、未推送、未进入 D10 发布链路。`scripts/publish-card.mjs` 没有 diff，发布版 CDN/hash/cache 未在本阶段修改。
- **静态与回归 gate:** 构建前后均通过 `node --check vendor/shujuku-sp-fork/index.js`、`node --check scripts/verify-sql-debug-regressions.mjs`、`git diff --check` 和 `node scripts/verify-sql-debug-regressions.mjs`。回归脚本输出 `[ok] SQL Debug regressions verified: templates=2, sheets=14, risk normalization, old table preflight, SQL cleaning, Bad Gateway, dashboard classification`；仅有 Node `node:sqlite` experimental warning。
- **构建:** 沙箱内 `npm run build` 命中项目已知 Windows `spawn EPERM`；按权限流程沙箱外重跑成功，`schema_dump`、`tavern_sync` 与所有 webpack entry 均成功。
- **dist / diff 复核:** 构建后 tracked diff 为两份 SQL 模板、`vendor/shujuku-sp-fork/index.js`、两份数据库前端 dist，以及既有无关 `dist/神秘复苏模拟器/界面/状态栏/index.html`。`git diff --stat` 为 6 files / 381 insertions / 53 deletions；新增回归脚本 `scripts/verify-sql-debug-regressions.mjs` 仍是未跟踪文件，未纳入提交。
- **内容核对:** 两份源模板均命中 `死亡风险镜像` 4 次，两份 dist 数据库前端各命中 1 次；两份源模板均命中 `旧表名 log_summary` 2 次，两份 dist 数据库前端各命中 1 次；vendor 中 `API上游网关错误` 命中 2 次。

## 2026-06-06：D8 Chrome DevTools 真页验证已完成
- **Status:** D8 complete；`agent-browser` CLI 本机不可用，但现有 Chrome DevTools 端口 `127.0.0.1:9222` 可用，已通过 CDP WebSocket 验证 SillyTavern 真页。
- **真页结果:** 发布卡 `characterId=3` / `神秘复苏模拟器发布版`，marker 为 `mfrs-r2sql-log-fixes-6-6`。native 基线下 `storageMode=native`，`getTableTemplate()`、`AutoCardUpdaterAPI.exportTableAsJson()`、`MysteryDatabaseFrontend.exportCurrentData()` 均为 14 表，`missingNames=[]`、`mismatchNames=[]`，玩家状态表头为 `死亡风险镜像/复苏风险镜像`。
- **SQLite smoke:** 切换到 `sqlite` 后 SQL 控制台可见，`sqlite_master` 只读查询返回 14 张业务表；临时表 `acu_sql_probe` 创建、插入、读取 `ok`、DROP 后 `sqlite_temp_master` 为 0 行。SQLite 三口径仍为 14 表且无 mismatch。
- **收尾:** 已恢复 `storageMode=native` 并关闭设置窗；最终三口径仍为 14 表。CDP 期间未捕获新的 SQL Error，仅有 2 条既有历史 seed 数据的非阻塞 Warn（旧 `sheet_chronicle` 短文本不满足 200-600 字，SyncBridge 保留空表结构）。

## 2026-06-06：D7 自动化回归用例已完成
- **Status:** D7 complete，未构建、未提交、未推送。新增 `scripts/verify-sql-debug-regressions.mjs` 作为 SQL Debug 复发修复的发布前回归 gate。
- **覆盖范围:** 脚本直接读取当前 `vendor/shujuku-sp-fork/index.js` 与两份 `src/**/神秘复苏表格SQL_v1.json`，验证 2 份模板 JSON parse、每份 14 张表、关键表存在、DDL/表头列数一致、`action_suggestions` 枚举硬约束文案、`sheet_chronicle` 禁止旧表 `log_summary`。
- **运行时 fixture:** 使用 vendor 实际函数验证 `极低/极高/严重/空值/无法判断` 风险值归一化，并写入 `node:sqlite` 内存库；验证 `log_summary` 可被表名提取且不在当前模板白名单；验证 `chronicle.bad_column` 被未知列预检识别；验证 `</thought>`、解释文字和 markdown fenced SQL 不进入 SQL provider；验证 Bad Gateway 抛出 `API上游网关错误: Bad Gateway`；验证仪表盘将 Bad Gateway、旧表名、语法残片、CHECK 约束、未知列分别归类。
- **已执行 gate:** `node --check scripts/verify-sql-debug-regressions.mjs` 通过；`node --check vendor/shujuku-sp-fork/index.js` 通过；`git diff --check` 通过；`node scripts/verify-sql-debug-regressions.mjs` 通过，输出 `[ok] SQL Debug regressions verified...`。仅有 Node 内置 `node:sqlite` experimental warning，不影响通过。
- **后续:** 继续 D8 Chrome/DevTools 真页验证，结束时恢复 `storageMode=native` 并关闭设置窗；随后 D9 构建与发布前 gate。

## 2026-06-05: SQL 日志修复发布链路完成，版本 6.6 已推送
- **Status:** complete。最终发布修正提交 `f2ab050b60c3664e65c52dd1e574c04226a6bfbb` 已推送到 `origin/main`，本地 `HEAD==origin/main`。仍保留既有无关 tracked diff `dist/神秘复苏模拟器/界面/状态栏/index.html`，以及未跟踪 planning/截图/备份文件；这些均未纳入发布提交。
- **发布链路**：先前完成资源提交 `948ba6b`、loader 回填 `8004f2f`、初版 6.6 发布 `8ea910d`、旧聊天表头自动校准资源 `a554ba8040b9c9804a0c55136c922d8716aa656d`、发布提交 `0f57a52`。收尾时发现 `scripts/publish-card.mjs` 中 `CDN_REF` 被写成不存在的 `a554ba88845e31772ee90f3d1fdfad5775512a39`，导致 phase118 发布 URL 404；已修正为真实 hash `a554ba8040b9c9804a0c55136c922d8716aa656d`，重新运行 `npm run publish-card -- 神秘复苏模拟器发布版` 并提交 `f2ab050`。
- **发布产物验证**：`src/神秘复苏模拟器发布版/index.yaml` 为 `版本: '6.6'`，6 条 CDN 链接均为 `@a554ba8040b9c9804a0c55136c922d8716aa656d?v=phase118-sql-template-autocalibrate-6-6`；错误 hash 0 命中。发布 PNG 的 `chara` 与 `ccv3` 元数据均为新 hash 6 命中、cache 6 命中、错误 hash 0 命中，版本字面量 `6.6` 各 1 命中。
- **CDN 验证**：沙盒内网络连接重置后，按权限流程沙盒外请求发布版引用的两个关键资源；数据库 loader 返回 200/1144 bytes，数据库前端返回 200/213639 bytes。`git ls-tree` 确认资源提交 `a554ba8040b9c9804a0c55136c922d8716aa656d` 中存在数据库 loader、数据库前端和状态栏 dist。
- **CDP 真页 smoke**：连接 `127.0.0.1:9222` 的 SillyTavern 发布卡 `characterId=3`，动态加载 phase118 最终 CDN 模块后复核稳定态：`getTableTemplate()` 14、`exportTableAsJson()` 14、`MysteryDatabaseFrontend.exportCurrentData()` 14；`checkTemplateStatus()` 和面板 `templateStatus` 均为 `templateLoaded:true/tableCount:14/missingNames:[]/mismatchNames:[]`；`玩家状态` 表头为 `死亡风险镜像`/`复苏风险镜像`，旧精确表头 `死亡风险`/`复苏风险` 不存在。

## 2026-06-05: SQL 日志问题修复 T5-T8 发布前验收完成
- **Status:** T5-T7 complete；T8 发布判断完成但未发布。代码、模板、dist 已在本地工作区准备好；真实发布页仍加载旧 CDN，因此玩家仪表盘的 `玩家状态` 1/14 mismatch 需要发布后才会消失。
- **T5 并发 API 警告处理**：`vendor/shujuku-sp-fork/index.js` 新增 `hasWarnedConcurrentMainApiFallback_ACU`。并发模式缺少独立 API 配置时只记录一次 Warn，后续同类回退降为 debug；文案改为“已回退主API（非阻塞配置提示；如需消除该提示，请配置独立API或关闭并发模式）”。仪表盘日志解释新增 `concurrentApiFallback`，并在 `interpretLogEntry()` 中优先把“并发模式要求独立API/缺少独立API配置”归类为非阻塞配置提示。
- **T6 静态与构建 gate**：`node --check vendor/shujuku-sp-fork/index.js` 通过；`git diff --check` 通过；`npm run build` 沙盒内仍因已知 Windows `spawn EPERM` 失败，按权限流程沙盒外重跑成功，所有 webpack entry compiled successfully。构建后 tracked diff 仍为两份数据库模板、vendor、两个数据库前端 dist，以及既有状态栏 dist 差异。
- **T7 隔离 SQL 回归**：使用 Node 内置 `node:sqlite` 内存库验证两份 `神秘复苏表格SQL_v1.json`：均 `sheets=14`、`ddlMismatch=0`；人物表批量 `INSERT ... ON CONFLICT(name) DO UPDATE` 可写入两名人物且 row_id 不冲突；合格 `chronicle_text` 可插入，短文本会被 `CHECK constraint failed` 拦截。vendor 静态检查确认 `extractSqlStatementsFromTableEdit_ACU()`、并发回退一次性 Warn 标志与仪表盘非阻塞解释均存在。
- **CDP 真实页只读对照**：通过 DevTools Protocol 连接 `http://127.0.0.1:8000/`，当前为发布卡 `characterId=3` / `神秘复苏模拟器发布版`。页面 marker 仍是旧发布版 `mfrs-r2sql-settings-console-refresh`；`getTableTemplate()`、`AutoCardUpdaterAPI.exportTableAsJson()`、`MysteryDatabaseFrontend.exportCurrentData()` 与面板均为 14 表，`missingNames:[]`。但 `sheet_player_state` 表头仍为 `死亡风险/复苏风险`，DDL 注释为 `死亡风险镜像/复苏风险镜像`，说明旧 CDN 页面仍会复现用户看到的 1/14 mismatch。
- **T8 发布判断**：本地修复已满足发布前 gate；要让真实仪表盘消除 mismatch、让 T5/T4 vendor 逻辑生效，需要走发布链路（vendor 资源提交 -> 回填 loader 的 vendor hash/cache -> build -> publish-card -> CDN/PNG/真页 smoke）。本轮未获明确发布授权，未提交、未推送、未更新 `scripts/publish-card.mjs`。

## 2026-06-05: SQL 日志问题修复 T1-T4 完成
- **Status:** T1-T4 code/template complete；未提交，未执行真实库写入 SQL，未做发布。T5-T8 仍未开始。
- **T1 表结构校准**：开发版与发布版 `神秘复苏表格SQL_v1.json` 的 `sheet_player_state` 表头从 `死亡风险/复苏风险` 改为 `死亡风险镜像/复苏风险镜像`；note/updateNode 同步强调镜像语义，物理列名 `death_risk` / `revival_risk` 与 DDL 不变。
- **T2 人物表 INSERT 规则**：开发版与发布版 `sheet_characters` 的 init/insert SQL 示例改为省略 `row_id`，让 SQLite 自动分配，并使用 `ON CONFLICT(name) DO UPDATE` 做幂等更新；SQL 模式通用说明补充“同一条多行 VALUES 不得重复使用 MAX(row_id)+1”。
- **T3 纪要长度约束**：开发版与发布版 `sheet_chronicle` 明确 `chronicle_text` 必须 200-600 字、推荐 300-400 字，不足 200 字禁止输出 SQL；示例改为按当前表递增生成 `row_id` 与 `code_index`，不再硬编码 `SP0002`。vendor 的 SQL 合并纪要默认 prompt 同步加强 200 字下限、自检和非硬编码规则。
- **T4 输出格式与解析兜底**：vendor SQL 编辑格式说明禁止 markdown 代码块、`<content>`、`</thought>` 和解释文字进入 `<tableEdit>`；新增 `extractSqlStatementsFromTableEdit_ACU()`，在 SQLite 模式下跳过 SQL 前后的包装残片后再调用 SQL provider，减少 malformed/truncated command line 落入旧 DSL 解析的概率。
- **静态验证**：`node --check vendor/shujuku-sp-fork/index.js` 通过；`git diff --check` 通过；两份数据库 JSON 均可被 Node 解析，且目标表头/纪要提示/人物幂等示例检查通过。
- **当前 diff 范围**：本轮直接相关文件为两份数据库模板与 `vendor/shujuku-sp-fork/index.js`；工作区还显示两个数据库前端 dist 文件同步含有更新后模板，另有既有状态栏 dist 差异。本轮未回滚无关既有项。
- **下一步**：T5 可按用户选择处理并发 API 配置警告；T6 需要构建/静态校验链；T7/T8 需要隔离 SQL 回归和仪表盘真页验收。

## 2026-06-05: SQL 日志问题修复 T0 基线完成
- **Status:** T0 complete。仅采集并记录基线，未修改业务代码，未执行写入 SQL，未提交。
- **用户输入来源**：`C:\Users\linlang\Downloads\acu-logs-2026-06-05T07-03-29-165Z.json` 与仪表盘运行概览。仪表盘显示当前为 SQL/SQLite 模式，并提示 `玩家状态` 1/14 表结构信息与表头不一致；运行日志累计 4 Error、13 Warn。
- **Git/发布基线**：`main...origin/main` 同步；`HEAD==origin/main==ccfd7273799e2f5932294db42cd3d2e3bbce4da6`；`git describe --tags --always --dirty` 为 `v0.0.71-dirty`。`scripts/publish-card.mjs` 当前为 `releaseVersion=6.5`、`CDN_REF=f7e2f64d70552f876c45d3315fc783b3334621ac`、`CDN_CACHE_VERSION=phase116-r2sql-settings-console-refresh`；发布版 `index.yaml` 为 `版本: '6.5'`。
- **工作区边界**：`git diff --stat` 仅确认 tracked diff `dist/神秘复苏模拟器/界面/状态栏/index.html`（2 行变更）；`git status` 另有既有未跟踪 planning、截图、备份、临时 Chrome 等文件。本阶段不回滚、不提交这些无关项。
- **日志统计**：共 17 条日志，4 Error、13 Warn；9 条“并发模式要求独立API但未配置，回退主API”；1 条 `玩家状态` DDL/表头不一致；`UNIQUE constraint failed: characters.row_id` 重复记录 3 条；`CHECK constraint failed: LENGTH(chronicle_text)` 重复记录 3 条；1 条 `Skipping malformed or truncated command line`。
- **下一步**：进入 T1，优先同步开发版与发布版 `玩家状态` 表头/DDL 注释，消除仪表盘 `1/14` mismatch；随后 T2-T4 修 SQL 生成与输出格式。

## 2026-06-05: SQL 模式切换界面演示完成
- **Status:** complete，仅做当前真页 UI 演示和教程整理，未修改业务代码、未提交。
- **演示路径**：通过 CDP 连接 `http://127.0.0.1:8000/` 当前 SillyTavern 页面，发布卡仍为 `characterId=3` / `神秘复苏模拟器发布版`。打开设置窗后先切到 `仪表盘`，选择 `SQLite 模式 (SQL)`，确认框选择 `仅切换模式`；随后进入 `高级工具` -> `SQL 控制台`。
- **当前页面状态**：IDB settings 为 `storageMode:sqlite`，sqlite radio checked，native radio unchecked；`#shujuku_v120-sql-input`、`#shujuku_v120-sql-execute`、结果区均可见。只读 `SELECT 1 AS ok;` 返回 `ok=1`。
- **备注**：本次没有执行业务写入或建表 SQL。当前只读 `sqlite_master` 返回 0 行，符合“只读查询不主动初始化 SQLite 业务表”的既有行为；面板与导出口径仍显示 14 表。

## 2026-06-05: 当前进度快照已记录
- **Status:** R2SQL-POST 清单已完成。POST-0~9 均已收口，最新发布版为 `6.5`。
- **远端状态**：本轮相关提交已推送到 `origin/main`：vendor `a41ab44`、资源 loader/dist `f7e2f64d70552f876c45d3315fc783b3334621ac`、发布提交 `ccfd727`。
- **最终验证状态**：真页发布卡 `characterId=3`，`storageMode=native`，marker `mfrs-r2sql-settings-console-refresh`；`getTableTemplate()`、`exportTableAsJson()`、`MysteryDatabaseFrontend.exportCurrentData()` 和面板均为 14 表，`missingNames:[]`，设置窗已关闭。
- **剩余事项**：当前没有 R2SQL-POST 未完成阶段。工作区仍有既有 tracked diff `dist/神秘复苏模拟器/界面/状态栏/index.html`，以及未跟踪 planning/截图/备份文件；这些未被本轮发布提交纳入，也不属于当前修复剩余任务。

## 2026-06-05: R2SQL-POST-9 UX 修复发布到 6.5；同窗 SQLite SQL 控制台刷新通过
- **Status:** complete，已提交并推送。剩余 UX 问题“同一设置窗切到 sqlite 后不会自动刷新出 SQL 控制台”已通过库层最小刷新修复，并发布到 `神秘复苏模拟器发布版` 6.5。
- **代码修复**：`vendor/shujuku-sp-fork/index.js` 增加高级工具子页重绑/激活/刷新函数；storage radio 切换成功后刷新当前 `#acu-tab-advanced` 内容。sqlite 会立即渲染并激活 SQL 控制台，native 会移除 SQL 子页并回到非 SQL 子页。
- **验证与构建**：`node --check vendor/shujuku-sp-fork/index.js` 通过；`git diff --check` 通过；`npm run build` 沙盒内因已知 Windows `spawn EPERM` 失败，沙盒外重跑成功。loader 源码与 dist 已确认使用 vendor 提交 `a41ab4483ce6f149fe19c03aebfead5dddceed2d`、marker `mfrs-r2sql-settings-console-refresh`，旧 `mfrs-r2sql-export-fallback` / `5bd4b0e...` 在相关 loader 文件无残留。
- **提交链路**：vendor UX 修复 `a41ab4483ce6f149fe19c03aebfead5dddceed2d`；资源 loader/dist 提交 `f7e2f64d70552f876c45d3315fc783b3334621ac`（`fix: load settings console refresh vendor`）；发布提交 `ccfd727`（`chore: release settings console refresh fix`）。两次本轮提交均已推送到 `origin/main`。
- **发布产物**：`scripts/publish-card.mjs` 更新为 `CDN_REF=f7e2f64d70552f876c45d3315fc783b3334621ac`、`CDN_CACHE_VERSION=phase116-r2sql-settings-console-refresh`、`releaseVersion=6.5`。`npm run publish-card -- 神秘复苏模拟器发布版` 成功；YAML 为 `版本: '6.5'` 且 6 条 CDN 链接指向新 hash/cache；PNG `chara` 与 `ccv3` 元数据均为 `version=6.5`、新 hash/cache 各 6 次、旧 hash/cache 0 次。
- **CDP 真页 smoke**：页面为 `http://127.0.0.1:8000/`，发布卡 `characterId=3` / `神秘复苏模拟器发布版`。marker 为 `mfrs-r2sql-settings-console-refresh`。native 基线三口径与面板均 14 表；native 打开的同一设置窗无 SQL 控制台。保持窗口不关闭，点击 sqlite radio 并在确认框选择“仅切换模式”后，同一 `shujuku_v120-main-window` 内 `#acu-subtab-advanced-sql`、`#acu-tab-sql-console`、`#shujuku_v120-sql-input`、`#shujuku_v120-sql-execute` 均立即可见。
- **SQL 控制台只读验证**：在新出现的控制台执行 `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_acu_%' ORDER BY name;`，结果区返回 14 行业务表。
- **恢复与最终 gate**：同一设置窗从 sqlite 切回 native 并选择“仅切换模式”后，SQL pane/input/execute 均移除；设置窗已关闭。最终只读快照：`characterId=3`、`storageMode:native`、marker `mfrs-r2sql-settings-console-refresh`，`getTableTemplate()` / `exportTableAsJson()` / `MysteryDatabaseFrontend.exportCurrentData()` / 面板均为 14 表，`missingNames:[]`，`hasPopup:false`。
- **工具备注**：一次强刷新观察会落到未选发布卡/Assistant 状态，需通过宿主 `selectCharacterById(3)` 回到发布卡后再判定；该现象与此前记录一致，不作为本轮 UX 修复失败。CDP wrapper 仍可能在 JSON 已输出后超时，按实际 JSON 和后续只读 gate 判定。

## 2026-06-05: R2SQL-POST-8 SQL 控制台入口定位完成；mutation smoke 通过
- **Status:** complete，不改业务代码、不提交。已确认 6.4 SQL 控制台入口不是消失，而是设置窗 DOM 复用造成的假阴性；关闭旧设置窗后重新打开即可渲染 SQL 控制台，并已补跑完整 SQL mutation smoke。
- **源码定位**：`generateAdvancedTabHTML()` 只在生成 HTML 当下 `isSqliteMode()` 为真时注入 `advanced-sql`；`openAutoCardPopup_ACU()` 生成设置窗 HTML；`createACUWindow()` 对已存在的 `shujuku_v120-main-window` 只 `bringToFront`，不会重建内容。因此 native 状态打开的旧设置窗，在同一窗口切到 sqlite 后仍保留 native 版高级工具 DOM。
- **真机复现**：native 打开设置窗时高级工具只有 `advanced-optimization/advanced-log`；同一窗口切 sqlite 后，IDB 已为 `storageMode:sqlite` 且 radio checked，但仍无 `#shujuku_v120-sql-input` / `#shujuku_v120-sql-execute`；关闭旧设置窗并重新打开后，`advanced-sql`、SQL 输入框与执行按钮正常出现。
- **SQL mutation smoke**：通过 SQL 控制台执行 `sqlite_master` 查询得到 14 张业务表；`UPDATE global_state SET game_time = game_time WHERE row_id = 1` 成功、0 行受影响；`pragma_table_info('global_state')` 只返回 `game_time`；临时表 `acu_sql_probe` create/insert/select `ok`/drop 成功，`sqlite_temp_master` 清理后 0 行；持久 probe row 清理 0 行受影响。
- **mutation 后 gate**：sqlite 模式下 `getTableTemplate()` 14、`AutoCardUpdaterAPI.exportTableAsJson()` 14、`MysteryDatabaseFrontend.exportCurrentData()` 14，面板 `templateStatus.templateLoaded:true/tableCount:14/missingNames:[]`。这直接验证 POST-5 的 5->14 导出 fallback 在发布版 6.4 mutation 后没有回归。
- **最终恢复**：已通过旧设置窗 radio + “仅切换模式”恢复 `storageMode:native`，设置窗关闭。最终只读快照：发布卡 `characterId=3`、`神秘复苏模拟器发布版`，marker `mfrs-r2sql-export-fallback`，模板/导出/前端导出/面板均 14 表，`hasPopup:false`。
- **工具备注**：一次 CDP smoke 脚本在完整 JSON 打印后由 shell wrapper 超时退出；后续独立只读快照确认页面已经恢复 native 且状态正常。

## 2026-06-05: R2SQL-POST-5 发布到 6.4；POST-7 最终只读收尾完成
- **Status:** 发布链路已完成并推送，POST-7 最终只读复核完成；核心 SQLite 导出缺 sheet 问题在发布版自然加载下未复发。完整 SQL mutation smoke 仍受入口限制，需后续定位 6.4 旧设置窗为何不渲染 SQL 控制台。
- **提交链路**：vendor 修复提交 `5bd4b0e703e18ce6e32ba9904163e1cd53a501cd`；资源 loader/dist 提交 `8d4d1d267568a798f5a6c2f359257bb3630577e5`；发布提交 `3de0c78`，已推送到 `origin/main`。
- **发布产物**：`scripts/publish-card.mjs` 已用 `CDN_REF=8d4d1d267568a798f5a6c2f359257bb3630577e5`、`CDN_CACHE_VERSION=phase115-r2sql-export-fallback`、`releaseVersion=6.4` 重新发布 `神秘复苏模拟器发布版`。发布版 YAML 与 PNG `chara/ccv3` 元数据均确认含 6.4、新 hash、新 cache，旧 6.3/phase114/hash 无残留。
- **发布后 native gate**：真机 CDP 页面为发布卡 `characterId=3`；`storageMode:native`；`apiMarker/hostMarker=mfrs-r2sql-export-fallback`；`getTableTemplate()`、`AutoCardUpdaterAPI.exportTableAsJson()`、`MysteryDatabaseFrontend.exportCurrentData()` 与面板均为 14 表，`missingNames:[]`。
- **发布后 sqlite 只读/切换 gate**：通过旧设置窗 radio + “仅切换模式”切到 sqlite 后，marker 仍为 `mfrs-r2sql-export-fallback`，模板/导出/前端导出/面板继续保持 14 表；随后已恢复 native，三口径仍为 14。
- **剩余限制**：6.4 的旧设置窗高级工具页只渲染 `advanced-optimization` 与 `advanced-log`，未出现 `#shujuku_v120-sql-input` / `#shujuku_v120-sql-execute` / `advanced-sql`。因此目前不能执行 POST-3 同级别 SQL mutation smoke；下一步若继续，应先定位 SQL 控制台入口变化/隐藏原因，或寻找已公开的安全 SQL provider 入口。
- **POST-7 最终快照**：`git status --short --branch` 显示 `main...origin/main` 同步；仅有既有 tracked diff `dist/神秘复苏模拟器/界面/状态栏/index.html` 和未跟踪 planning/截图/备份文件。CDP 页面 `http://127.0.0.1:8000/` 为 SillyTavern，当前 `characterId=3`、角色名 `神秘复苏模拟器发布版`、`storageMode:native`、`apiMarker/hostMarker=mfrs-r2sql-export-fallback`；`getTableTemplate()` 14、`AutoCardUpdaterAPI.exportTableAsJson()` 14、`MysteryDatabaseFrontend.exportCurrentData()` 14，面板 `templateStatus.templateLoaded:true/tableCount:14/missingNames:[]`。
- **工作区边界**：不要提交 planning 文件、截图、备份、`.tmp-chrome-*`；当前仍有既有 tracked diff `dist/神秘复苏模拟器/界面/状态栏/index.html`，本阶段不回滚、不提交。

## 2026-06-05: R2SQL-POST-5 SQLite 导出缺 sheet 最小修复完成（代码层）
- **Status:** code complete；待资源提交/CDN 回填后做发布版自然加载真机复测。本轮未提交、未推送、未更新 `scripts/publish-card.mjs` 的 CDN_REF，也未切发布页到 SQLite。
- **根因判断**：POST-3 的“物理 SQLite 表 14，但导出只剩 5 sheet”与 `SyncBridge.exportToTableData()` 的元数据依赖一致。导出只遍历 `engine.getTableNames()`，再用 `_acu_sheet_meta` 反查 sheet；若某张表在 `_loadSheet()` 中先建表、后写 seedRows/数据时失败，外层会吞掉该 sheet 的后续 metadata 写入，留下“物理表存在但无 metadata”的状态，导出时就会被跳过。
- **修复 1：metadata 先落地**：`vendor/shujuku-sp-fork/index.js` 的 `SyncBridge._loadSheet()` 改为建表后立即 `INSERT OR REPLACE` metadata，再尝试写入数据；数据写入失败时记录 warning，并保留空表结构，不再让该 sheet 从导出口径里消失。
- **修复 2：导出 fallback**：`SyncBridge.exportToTableData(originalMate, fallbackData)` 新增 fallback 路径：先从 `_acu_sheet_meta` 找 meta，找不到时用当前 JSON/模板数据按 DDL 反推出 meta；导出完成后再把 fallbackData 中尚未导出的 sheet 补齐。
- **修复 3：provider 调用侧兜底**：`SqlTableService.saveToChat()`、`getCurrentData()`、`_syncToJson()` 统一传入 `_buildExportFallbackData()`；该 fallback 是“当前 chat 模板 + 当前 JSON 视图”的并集，可防止一次坏导出把 14 表上下文压扁成 5 表。
- **验证**：`node --check vendor/shujuku-sp-fork/index.js` 通过；`git diff --check` 通过；`npm run build` 沙盒内仍因已知 Windows `spawn EPERM` 失败，已按权限流程在沙盒外重跑成功，所有 webpack entry compiled successfully；内联 Node 分支模型显示旧逻辑 `oldCount=5`，新逻辑 `newCount=14`。
- **工作区边界**：构建后 tracked diff 为 `vendor/shujuku-sp-fork/index.js` 和既有/构建相关 `dist/神秘复苏模拟器/界面/状态栏/index.html`。当前开发/发布 loader 仍指向旧资源提交 `57778d59326186c84e249e7826e5200d693d18cc` / 发布 CDN_REF `fe0679ee4152eed7c7c79769d9cddc498771333e`，因此这次 vendor 修复尚未被发布卡自然加载。
- **下一步**：若继续收尾，需要走资源提交 -> 回填数据库 loader/vendor CDN hash 与 cache -> build/publish-card -> 发布版 POST-0~4 真机复测，重点确认 SQLite SQL mutation 后 `exportTableAsJson()` / `MysteryDatabaseFrontend.exportCurrentData()` 均保持 14 sheet，并最终恢复 native。

## 2026-06-05: R2SQL-POST-3 SQLite smoke 完成并发现导出 bug；已安全恢复 native
- **Status:** POST-3 complete with bug；POST-4 safety restore complete。使用旧设置窗 SQL 控制台执行发布版 6.3 SQLite smoke；发现导出口径 bug 后，为避免发布卡停在 SQLite 测试态，立即恢复 native。
- **SQL 控制台入口**：在 `storageMode:sqlite` 下打开旧设置窗，`#shujuku_v120-sql-input` 与 `advanced-sql` 成功渲染，可通过 UI 执行 SQL；未直接 import 库本体。
- **物理表 gate**：初始只读 `sqlite_master` 已有 14 张业务表（本聊天不是空 SQLite 库）：`action_suggestions`、`characters`、`check_suggestions`、`chronicle`、`clues`、`collected_archives`、`collected_rules`、`controlled_ghosts`、`ghost_archives`、`global_state`、`locations`、`player_state`、`supernatural_events`、`supernatural_items`。
- **写入/schema gate**：幂等 `UPDATE global_state SET game_time = game_time WHERE row_id = 1;` 成功，0 行受影响；之后仍为 14 张业务表。`SELECT name FROM pragma_table_info('global_state') WHERE name IN ('game_time','current_time')` 只返回 `game_time`，旧 `current_time` bug 未复发。
- **probe 清理 gate**：临时表 `acu_sql_probe` 创建、插入 `ok`、查询、drop 均成功；`sqlite_temp_master` 对该表返回 0 行。持久 probe row 清理 `row_id IN (987654321,987654322)` 为 0 行受影响。
- **发现的明确 bug**：SQL 操作后物理 SQLite 表仍为 14、`getTableTemplate()` 仍为 14、面板仍为 `templateLoaded:true/tableCount:14/missingCount:0`，但 `AutoCardUpdaterAPI.exportTableAsJson()` 与 `MysteryDatabaseFrontend.exportCurrentData()` 均只导出 5 个 sheet：`sheet_check_suggestions`、`sheet_collected_rules`、`sheet_controlled_ghosts`、`sheet_player_state`、`sheet_supernatural_items`。这使 POST-3 的“三口径 14 表”gate 失败。
- **行数辅助证据**：14 表行数查询显示多数表 0 行，非空主要为 `check_suggestions=5`、`controlled_ghosts=1`、`player_state=1`；但导出 5 sheet 与物理 14 表不一致，说明导出口径可能在 SQLite provider/导出层过滤或丢失空表。
- **安全恢复**：已执行 POST-4 恢复 native：打开设置窗 -> native radio -> `#shujuku_v120-custom-confirm-cancel` “仅切换模式” -> 关闭设置窗。最终 `storageMode:native`，`apiMarker/hostMarker=mfrs-r2sql-template-status`，模板/导出/面板均为 14 表，`missingCount=0`，设置窗与确认框均关闭。
- **下一步**：POST-5 最小修复。优先静态审查 SQLite provider / `exportTableAsJson` / `exportCurrentData` / 导出层是否只导出有数据的表或在 SQL mutation 后丢空表；不改 SQL schema/DDL。

## 2026-06-05: R2SQL-POST-2 可逆切换 SQLite 完成
- **Status:** complete。使用 POST-1 找到的旧设置窗 storage radio 完成 native -> sqlite 切换；没有执行 SQL，没有写 probe，没有直接 import 库本体，没有改业务代码。
- **切换前基线**：发布版 `characterId=3`，chatId `神秘复苏模拟器发布版 - 2026-06-04@23h52m41s750ms`，`storageMode:native`，settings raw type `string`、length `132500`、FNV1a `8e0b04c5`。模板/导出/面板均为 14 表，`missingCount=0`，marker 为 `mfrs-r2sql-template-status`。
- **执行路径**：`AutoCardUpdaterAPI.openSettings()` 打开旧设置窗；点击 `input[name="shujuku_v120-storage-mode"][value="sqlite"]`；确认框存在 `cancel/ok` 两按钮，点击 `#shujuku_v120-custom-confirm-cancel`，也就是“仅切换模式”路径，避免恢复默认填表提示词。
- **切换后状态**：IDB/settings 为 `storageMode:sqlite`，settings FNV1a `58d3e6b2`；sqlite radio checked，native radio unchecked。发布卡 API 未丢失，`apiMarker/hostMarker=mfrs-r2sql-template-status`；公开 API 仍没有 `executeQuery/setStorageMode`。
- **模板状态 gate**：切换后 `getTableTemplate()` 14 表，`exportTableAsJson()` 14 表，`MysteryDatabaseFrontend.getPanelState()` 为 `templateLoaded:true/tableCount:14/missingCount:0`。没有观察到持久 8 表回退。
- **收尾状态**：设置窗已通过 `.acu-window-btn.close` 关闭，确认框不存在。当前页面刻意保留在 `storageMode:sqlite`，供 POST-3 继续打开 SQLite 下的 SQL 控制台做 smoke；POST-4 再恢复 native。

## 2026-06-05: R2SQL-POST-1 安全入口发现完成
- **Status:** complete。本轮使用 CDP 对发布版自然加载态做入口发现；没有切换 SQLite、没有执行 SQL、没有直接 import 库本体、没有改业务代码。
- **自然 API 枚举**：`AutoCardUpdaterAPI` 有 81 个 key，存在 `openSettings/openVisualizer/getTableTemplate/exportTableAsJson` 等；没有 `executeQuery` / `setStorageMode`。`AutoCardUpdaterV2API` 当前无 key。`MysteryDatabaseFrontend` 有 `openPanel/openDashboard/exportCurrentData/refreshDatabase/getPanelState`，无 SQL/模式切换入口。
- **被动 DOM 起点**：发布卡 native 状态下没有 `#shujuku_v120-popup`、`#shujuku_v120-sql-input`、`input[name="shujuku_v120-storage-mode"]`、`advanced-sql`；只有可见 `#acu-btn-settings`。
- **设置窗发现**：调用自然 API `AutoCardUpdaterAPI.openSettings()` 打开旧设置窗 `#shujuku_v120-popup`，未新建 ACU 实例，marker 保持 `mfrs-r2sql-template-status`。弹窗内存在 2 个可见可用的 storage radio：`native` checked、`sqlite` unchecked，name 为 `shujuku_v120-storage-mode`。
- **SQL 控制台发现**：native 下 `#shujuku_v120-sql-input` 为 0，`advanced-sql` 为 0。源码只读确认 `generateAdvancedTabHTML()` 仅在 `isSqliteMode()` 为真时渲染 SQL 控制台，`bindSqlConsoleEvents_ACU()` 也只在 SQLite 模式绑定；SQL 执行走 provider `executeQuery/executeMutation`，但这些不暴露为公开 API。
- **切换机制审查**：storage radio change 先弹 `showCustomConfirm_ACU`；确认按钮为“恢复默认并切换”，取消按钮为“仅切换模式”。随后设置 `settings_ACU.storageMode`、保存、调用 `switchStorageMode()`；失败时回退 radio/settings。
- **入口结论**：可用入口为旧设置窗 storage radio + 自定义确认框“仅切换模式”。不可用入口为公开 `executeQuery/setStorageMode`、V2 API、native 下 SQL 控制台 DOM。高风险入口为直接重新 import 库本体和闭包私有 provider 探针。
- **收尾状态**：已点击 `.acu-window-btn.close` 关闭设置窗。最终 `characterId=3`、`storageMode:native`、`apiMarker/hostMarker=mfrs-r2sql-template-status`，模板/导出/面板均为 14 表，`missingCount=0`。POST-1 gate 通过，可进入 POST-2。

## 2026-06-05: R2SQL-POST-0 基线保护与页面恢复完成
- **Status:** complete。本轮只执行 POST-0，不切 SQLite、不改业务代码、不提交；通过 CDP 恢复并确认发布版 native 基线稳定。
- **Git/发布基线**：HEAD==origin/main==`4f6d949770293e10921a377155bae51c63163f02`，HEAD tag `v0.0.65`。`scripts/publish-card.mjs` 为 `CDN_REF=fe0679ee4152eed7c7c79769d9cddc498771333e`、`CDN_CACHE_VERSION=phase114-r2sql-template-status`、`releaseVersion=6.3`。
- **工作区状态**：`git status` 显示 8 个 tracked dist 文件已有修改：状态栏 HTML、MVU、变量结构、固定状态栏、数据库 loader、数据库前端、界面美化、神秘复苏数据库前端。另有 planning 文件和截图/备份等未跟踪文件；本阶段未回滚、未提交。
- **页面恢复**：CDP 初始在开发卡 `characterId=2` / chatId `神秘复苏模拟器 - 2026-06-03@23h57m24s286ms`；通过宿主 `selectCharacterById(3)` 进入发布版卡，未直接 import 库本体。
- **发布版 native gate**：最终 `characterId=3`，chatId `神秘复苏模拟器发布版 - 2026-06-04@23h52m41s750ms`，`storageMode:native`，`apiMarker/hostMarker=mfrs-r2sql-template-status`，`getTableTemplate()` 14 表，`exportTableAsJson()` 14 表，`MysteryDatabaseFrontend.getPanelState()` 为 `templateLoaded:true/tableCount:14/missingCount:0`。
- **IDB settings 指纹**：`shujuku_v120_config_v1/kv` key `shujuku_v120_profile_v1____default____settings`，raw type `string`，length `128651`，FNV1a `2f8f6d53`，storageMode `native`。为避免把可能包含配置/密钥的完整 settings 落盘，本阶段只记录指纹；POST-2 若要切换模式，必须在切换前重新读取完整 raw，并在同一执行链的 finally 中恢复。
- **下一步**：R2SQL-POST-1 只读寻找自然加载后的安全入口：UI/DOM/API 是否能可逆切换 SQLite 和执行 SQL；继续禁止直接 import 库本体。

## 2026-06-05: 发布版 SQLite 保留项清除任务清单建立
- **Status:** planning complete。用户询问 6.3 发布后 SQLite 完整 smoke 保留项是否可以解决，并要求制作任务清单；本轮只更新规划文件，未执行浏览器测试、未改业务代码、未提交。
- **新增阶段**：`task_plan.md` 顶部新增「当前阶段：发布版 SQLite 保留项清除」，任务编号为 R2SQL-POST-0~6。
- **阶段拆分**：POST-0 基线保护与页面恢复；POST-1 安全入口发现；POST-2 可逆切换 SQLite；POST-3 发布版 SQLite smoke；POST-4 恢复 native 与收尾复核；POST-5 条件性最小修复；POST-6 条件性补最小测试钩子。
- **核心原则**：不再直接重新 import 库本体；先寻找自然加载后的安全 UI/API 入口。若没有安全入口，停止并设计受控测试钩子，而不是继续用会污染运行态的方式硬测。
- **注意**：当前 `git status` 显示多份 tracked dist 文件已有修改，来源未在本轮确认；本阶段只做规划，不回滚、不提交这些差异。

## 2026-06-04: R2SQL-7/8 发布与最后收尾完成
- **Status:** complete with constraint。发布链路已完成并推送，发布后 native/CDN 真机复核通过；SQLite 发布后完整 smoke 因当前运行态没有安全入口而记录为受限未重跑，不再重复会污染页面的直接 import 方案。
- **发布事实**：HEAD==origin/main==`4f6d949770293e10921a377155bae51c63163f02`，HEAD tag 为 `v0.0.65`。`scripts/publish-card.mjs` 当前为 `CDN_REF=fe0679ee4152eed7c7c79769d9cddc498771333e`、`CDN_CACHE_VERSION=phase114-r2sql-template-status`、`releaseVersion=6.3`；发布版 YAML 为 `版本: '6.3'`。
- **浏览器恢复**：上一轮直接 import 库本体后页面一度停在未选卡状态；本轮 CDP 先确认 IDB 已恢复 `storageMode:native`，再通过宿主 `selectCharacterById(3)` 重新进入发布版卡。
- **最终 CDP 快照**：发布版 `characterId=3`，chatId `神秘复苏模拟器发布版 - 2026-06-04@23h52m41s750ms`，`apiMarker/hostMarker=mfrs-r2sql-template-status`。`getTableTemplate()` 14 表、`exportTableAsJson()` 14 表、`MysteryDatabaseFrontend.getPanelState()` 为 `templateLoaded:true/tableCount:14/missingCount:0`。
- **SQLite post-release 限制**：当前发布版运行态没有可安全自动化的 SQL 控制台/存储切换 UI，公开 API 也没有 `executeQuery` / `setStorageMode`。直接重新 import 库本体会触发 `TypeError: jQuery_API_ACU is not a function`，并可能把运行态污染成旧/坏 API；本轮已停止该方案，避免引入新的页面状态问题。
- **收尾判断**：发布后 native/CDN gate 通过，R2SQL 修复发布到 6.3。完整 SQLite gate 以 R2SQL-5 开发版真机结果为准：只读不建表、首次写入建 14 表、三口径一致、`global_state` 只有 `game_time` 无 `current_time`；发布后若未来暴露安全 SQL/API 入口，可再追加一次不直接 import 的 SQLite smoke。

## 2026-06-04: R2SQL-6 回归验收完成（native / 多卡 / 热切换 / 旧功能）
- **Status:** complete。使用 CDP 连接真实 SillyTavern 页面完成 R2SQL-6；未提交、未发布。当前仍按计划进入 R2SQL-7 发布链路（需用户确认后执行）。
- **native 基线**：开发卡 `characterId=2` / `神秘复苏模拟器`，`storageMode:native`，本地 patched fork 接管后 `hasPatch:true`，`getTableTemplate()` 14 表，`exportTableAsJson()` 14 表，`MysteryDatabaseFrontend.getPanelState()` 为 `templateLoaded:true/tableCount:14/missingNames:[]`。
- **多卡隔离**：切到普通 `Assistant` (`characterId=0`) 后，`getTableTemplate()` / `exportTableAsJson()` 为库默认 8 表，`TavernDB_ACU_ScopedConfig` 不存在，面板未挂载，未被神秘复苏 14 表污染。切回开发卡等待后恢复 14 表。
- **发布版/native 回归**：切到 `神秘复苏模拟器发布版` (`characterId=3`) 后，短等脚本加载，发布版 native 为 14 表、导出 14 表、面板 loaded；再切回开发卡等待后仍为 14 表。切卡初期曾采到 `AutoCardUpdaterAPI` 未就绪或 8 表，但 10-12 秒内收敛到 14 表，属于未发布 R2SQL vendor 前的运行态加载窗口，不是持久回退。
- **热刷新 gate**：重新运行态 import 本地 patched fork 后，刚接管时可能先看到 8 表；执行/触发 `reloadCurrentChat()` 后，patched `getTableTemplate()`、导出和面板均恢复 14 表。这证明当前 chat-scope 重新应用后不会再保持 8 表。
- **旧功能 smoke**：`MysteryDatabaseFrontend.exportCurrentData()` 返回 14 表；`refreshDatabase()` 执行后仍是 14 表；`openPanel()` 后仍 `templateLoaded:true/tableCount:14/missingNames:[]`。
- **SQL 控制台 smoke**：清掉重复窗口 DOM、重新接管本地 patched fork，从干净设置窗口切 SQLite 后 `advanced-sql` 子页出现；执行只读 `SELECT name FROM sqlite_master ...` 成功，返回 0 行（符合只读不提前建表设计）。随后切回 native，最终 `storageMode:native`，patched fork + 14 表。
- **工具注意**：几次长 CDP shell wrapper 在页面已返回完整 JSON 后仍被 PowerShell timeout 标记为 `Exit code 124`；后续页面状态复核正常，因此记录为工具包装层超时，不作为页面失败。
- **下一步**：R2SQL-7 发布链路。由于开发版 loader/前端自然路径仍会拉当前 CDN `be210de...` vendor，发布前的本地验收需要运行态接管 patched fork；发布时必须走资源提交 -> 回填 hash -> 发布版打包/真机复核。

## 2026-06-04: R2SQL-5 开发版 SQL 真机验收完成（不发布）
- **Status:** complete。使用 Chrome DevTools Protocol 连接真实 SillyTavern 页面 `http://127.0.0.1:8000/`，开发卡 `characterId=2` / `神秘复苏模拟器` / chatId `神秘复苏模拟器 - 2026-06-03@23h57m24s286ms` 完成 SQL/SQLite 验收；未提交、未发布。
- **运行态接管**：开发版 loader 当前仍自然指向 CDN `be210de.../vendor/shujuku-sp-fork/index.js`，因此本轮先清理旧发布卡残留窗口/API，再运行态 import 本地 patched fork `http://localhost:5500/vendor/shujuku-sp-fork/index.js?v=r2sql5_local_patch_*`。确认 `AutoCardUpdaterAPI.getTableTemplate()` 函数字符串含 `applyTemplateScopeForCurrentChat_ACU` 与 `resolveTemplateForExport_ACU`，marker 为 `mfrs-r2-6-coreapi-context-proxy`。
- **模板状态 gate**：当前 chat 的 `TavernDB_ACU_ScopedConfig.template['']` 已保存 14 表 `chat_override`。重新导入该 14 表模板后，`getTableTemplate()` 14 表、`exportTableAsJson()` 14 表、`MysteryDatabaseFrontend.getPanelState()` 为 `templateLoaded:true/tableCount:14/missingNames:[]`。
- **SQLite 切换 gate**：通过当前设置窗口点击 SQLite radio，并在确认框选择“仅切换模式”。关闭重开设置窗口后 SQL 控制台子页出现，说明运行态进入 SQLite；结束前已再点 native radio 并选择“仅切换模式”，最终 radio 为 native，extension settings 与 IDB 均为 `storageMode:native`。
- **只读不建表 gate**：SQLite 下只读 `SELECT name FROM sqlite_master WHERE type='table' ...` 初始返回 0 行，符合 `executeQuery()` 不提前 `_ensureTablesFromTemplate()` 的设计。
- **首次写入建表 gate**：执行幂等 `UPDATE global_state SET game_time = game_time WHERE row_id = 1;` 成功（0 行受影响），随后 `sqlite_master` 出现 14 张业务表：`action_suggestions`、`characters`、`check_suggestions`、`chronicle`、`clues`、`collected_archives`、`collected_rules`、`controlled_ghosts`、`ghost_archives`、`global_state`、`locations`、`player_state`、`supernatural_events`、`supernatural_items`。
- **schema / 三口径 gate**：`PRAGMA table_info(global_state)` 为 10 列，含 `game_time`；`SELECT name FROM pragma_table_info('global_state') WHERE name IN ('game_time','current_time')` 只返回 `game_time`。写入建表后 `getTableTemplate()` 14、`exportTableAsJson()` 14、`getPanelState()` 14，未复现旧的 SQL 模板状态回退 8 表 bug。
- **清理 gate**：临时表 smoke `CREATE TEMP TABLE acu_sql_probe` -> `INSERT ok` -> `SELECT ok` -> `DROP TABLE` 通过；`sqlite_temp_master` 对 `acu_sql_probe` 返回 0 行。未创建持久 probe 行，清理 `global_state row_id IN (987654321,987654322)` 为 0 行影响。临时表 smoke 命令的 shell wrapper 在打印完整 JSON 后超时退出，但后续 native 恢复复核通过，页面状态正常。
- **下一步**：进入 R2SQL-6，做 native / 多卡 / 热切换回归；当前代码 diff 仍只应是 R2SQL 相关 3 个文件，planning 三件套未跟踪。

## 2026-06-04: R2SQL-0~4 执行完成（库层真修 + 前端兜底 + 构建静态门禁）
- **Status:** complete（到 R2SQL-4）。本轮按 R2SQL 清单完成基线复现、静态审查、两处补丁和本地构建复核；未提交、未发布，下一步进入 R2SQL-5 开发版 SQL 真机验收。
- **R2SQL-0 基线**：发布版 6.2 / `characterId=3` 复现 SQL 模式状态分裂：`getPanelState()`/`getTableTemplate()` 为 8 表或缺 14 表，`exportTableAsJson()` 与 SQLite 物理业务表为 14 表；`global_state` 只有 `game_time`、无 `current_time`，probe 行和临时表已清理，最后恢复 `native`。
- **R2SQL-1 审查**：根因收窄为模板状态读口径。SQL provider / `SqlTableService` 建表与导出能按当前 chat-scope 14 表工作，但 `AutoCardUpdaterAPI.getTableTemplate()` 仍裸读可能滞留的 `TABLE_TEMPLATE_ACU`；神秘复苏前端 `readTemplateStatus()` 又只信该模板 API。
- **R2SQL-2 库层补丁**：`vendor/shujuku-sp-fork/index.js` 的 `getTableTemplate()` 先尝试 `applyTemplateScopeForCurrentChat_ACU()`，再通过 `resolveActiveTemplatePresetName_ACU({ fallbackToGlobal: true })` + `resolveTemplateForExport_ACU('chat', activePresetName)` 返回当前生效模板，最后才 fallback 到旧 `TABLE_TEMPLATE_ACU`。
- **R2SQL-3 前端兜底**：`src/神秘复苏模拟器/脚本/数据库前端/index.ts` 的 `readTemplateStatus()` 在模板 API 缺神秘复苏 14 表时，会用 `exportTableAsJson()` 解析导出口径；若导出数据完整包含 14 表，则面板状态返回 `templateLoaded:true`、`missingNames:[]`，导出异常只 debug 记录并继续走模板口径。
- **R2SQL-4 构建/静态 gate**：沙盒内 `npm run build` 命中已知 Windows `spawn EPERM`，按权限流程沙盒外重跑成功，各 webpack entry compiled successfully，`dist/神秘复苏模拟器/脚本/数据库前端/index.js` 已同步兜底逻辑。`node --check vendor/shujuku-sp-fork/index.js`、`git diff --check` 通过；AM/SP sweep 0 命中；`__RESOURCE_HASH__` 0 命中。
- **构建噪声处理**：构建带出无关 `dist/神秘复苏模拟器/界面/状态栏/index.html` 1 行差异，抽样确认是 webpack 模块编号 `351 -> 234` 一类噪声，已只恢复该无关产物。当前 tracked diff 只剩 `vendor/shujuku-sp-fork/index.js`、`src/神秘复苏模拟器/脚本/数据库前端/index.ts`、`dist/神秘复苏模拟器/脚本/数据库前端/index.js`。

## 2026-06-04: R2SQL 修复任务清单建立（规划完成·未改码）
- **Status:** planning complete。用户确认“库层 getTableTemplate 当前生效模板 + 前端 readTemplateStatus 导出兜底”两个方案一起做；已在 `task_plan.md` 新增「当前阶段：6.2 SQL/SQLite 模式模板状态分裂」和 R2SQL-0~R2SQL-8 分阶段清单。
- **阶段设计**：R2SQL-0 干净基线与环境保护；R2SQL-1 静态审查；R2SQL-2 库层 `getTableTemplate()` 真修；R2SQL-3 前端状态兜底；R2SQL-4 构建静态复核；R2SQL-5 开发版 SQL 真机验收；R2SQL-6 native/多卡/热切换回归；R2SQL-7 发布链路；R2SQL-8 发布后真机复核与收尾。
- **本轮边界**：只更新 planning 文件，未改 `vendor`、`src`、`dist`，未构建、未提交、未发布。当前已知发布版仍为 6.2，HEAD/origin 为 `212f1980572fc705227e268b6666ae8688aefce4`。

## 2026-06-04: SQLite 模式发布版回归测试（追加）
- **Status:** complete。用户要求确认发布版 6.2 在 SQL/SQLite 模式下是否还有 bug。`agent-browser` CLI 在当前环境未安装，因此改用已开启的 Chrome DevTools Protocol `127.0.0.1:9222` 连接真实 SillyTavern 页面 `127.0.0.1:8000`。
- **当前运行态快照**：页面为 `characterId=3` / `神秘复苏模拟器发布版`，`AutoCardUpdaterAPI` 和 `MysteryDatabaseFrontend` 均挂在 top window，`apiMarker/host marker` 为 `mfrs-r2-6-coreapi-context-proxy`，chat 长度 1。
- **SQLite 已切换状态**：设置弹窗 radio 显示 `native=false`、`sqlite=true`。这是上一轮 UI “仅切换模式”后的状态，本轮继续从该状态验证，结束前需恢复 `native`。
- **首轮异常苗头**：`AutoCardUpdaterAPI.exportTableAsJson()` 返回 14 张神秘复苏表，但 `AutoCardUpdaterAPI.getTableTemplate()` 返回库默认 8 表。需要继续用 SQL 控制台/实际 SQLite 表验证这是否只是模板口径问题，还是会影响 SQL 物理表。
- **SQL 控制台复核**：重新打开设置窗口后，SQLite 条件生成的 `SQL 控制台` 子页出现。只读查询 `sqlite_master` 业务表为 0，`PRAGMA table_info(global_state)` 为 0 行，`SELECT game_time FROM global_state WHERE row_id=1` 报 `no such table: global_state`。临时表 smoke（`CREATE TEMP TABLE` -> `INSERT` -> `SELECT ok` -> `DROP` -> `sqlite_temp_master=0`）通过，说明 SQLite 引擎可用，问题集中在业务 schema/模板状态未初始化。
- **面板口径复核**：`await MysteryDatabaseFrontend.getPanelState()` 返回 `templateLoaded:false/tableCount:8/missingNames=14张神秘复苏表`；`MysteryDatabaseFrontend.exportCurrentData()` 仍可导出 14 表。这确认 SQLite 模式下存在“数据导出口径 14 表，但当前模板/面板/SQL schema 口径回退或缺失”的 bug。
- **reload 复核**：执行 `reloadCurrentChat()` 后，`getTableTemplate()` / `getPanelState()` 恢复为 14 表、`missingNames:[]`，说明切换 SQLite 后的 8 表面板状态有一部分是未重载的临时状态；但 `sqlite_master` 业务表仍为 0。
- **源码判定**：`SqlTableService.executeQuery()` 明确不触发 `_ensureTablesFromTemplate()`，源码注释说明新卡只读 `no such table` 是预期；写操作 `executeMutation/applyEdits` 才会按当前聊天模板建表。
- **写入路径复核**：用 SQL 控制台执行幂等 `UPDATE global_state SET game_time = game_time WHERE row_id = 1;` 后，`sqlite_master` 出现 14 张英文表，`PRAGMA table_info(global_state)` 显示 `game_time`，`current_time` 不存在。随后插入一行合法 `game_time='2026-06-04 12:34'` 成功、读出成功、删除成功，计数回到 0；无效插入未留下 row_id=2。结论：6.1 的 `current_time` 保留字修复在 6.2 SQL 写入路径没有复发。
- **剩余 bug**：SQLite 写入/同步后，`AutoCardUpdaterAPI.getTableTemplate()` 与 `MysteryDatabaseFrontend.getPanelState()` 又会回退到 8 表，尽管 `exportTableAsJson()` / `exportCurrentData()` 仍是 14 表且 SQLite 物理表也是 14 表。这是 SQL 模式特有的模板状态/面板判定口径 bug，需后续修复；当前本轮只测试不改码。

## 2026-06-04: R2-7 发布链路（资源占位提交已完成）
- **Status:** in_progress。R2-7 采用三段式发布，而不是普通两段式：数据库 loader/前端会 import `vendor/shujuku-sp-fork/index.js`，因此必须先提交可被 CDN 引用的 vendor/dist 资源，再把真实资源 commit hash 回填进 loader dist，最后再打包发布卡。
- **资源占位提交**：先将 `src/神秘复苏模拟器/脚本/数据库/index.ts` 与 `src/神秘复苏模拟器/脚本/数据库前端/index.ts` 的 vendor URL 改为 `@__RESOURCE_HASH__` 占位符，并重建 dist。提交前恢复了无关构建噪声 `dist/神秘复苏模拟器/界面/状态栏/index.html`。
- **静态 gate**：`git diff --check` 通过；`node --check vendor/shujuku-sp-fork/index.js` 通过；占位符只保留在数据库 loader/前端 src+dist 的 CDN vendor URL 链路中，旧 `localhost:5500` 不再出现在该发布链路。
- **远端同步**：首次 push 被拒绝，因为远端新增 `afb016f [bot] Bump deps`（仅 `package.json`/`pnpm-lock.yaml`）。已 `fetch` 后 rebase 到远端之上，无冲突，再推送成功。
- **当前资源 commit**：`be210de5f029c4720f5e3503d02f2bb4483b5be4`，提交信息 `fix: repair chat-scoped database template loading`，已推送到 `origin/main`。下一步用该完整 hash 替换 `__RESOURCE_HASH__`，重建并提交回填 dist。
- **回填 dist commit**：已将 `__RESOURCE_HASH__` 替换为 `be210de5f029c4720f5e3503d02f2bb4483b5be4` 并重建，`npm run build` 沙盒外成功；`__RESOURCE_HASH__` 在目标 src/dist 0 命中，真实 hash 在 4 个目标文件命中。构建带出的无关状态栏 dist 噪声已再次恢复。提交 `6a7bb0827b95f06eab04f4bf44766867c7cc2794`（`fix: pin database fork resource hash`）已推送，下一步发布版 `CDN_REF` 应指向该回填 commit。
- **发布版提交**：`scripts/publish-card.mjs` 已更新为 `CDN_REF=6a7bb0827b95f06eab04f4bf44766867c7cc2794`、`CDN_CACHE_VERSION=phase113-chat-scope-coreapi-proxy`、`releaseVersion=6.2`。`npm run publish-card -- 神秘复苏模拟器发布版` 成功，替换 6 处链接并打包 PNG。YAML 验证：版本 6.2，6 条链接均为新 hash/cache，旧 `d2d5733`/`phase112`/占位符/localhost 0 命中。PNG `chara/ccv3` 验证：`data.character_version=6.2`，新 hash/cache 各 6 命中，旧值/占位符/localhost 0 命中。release commit `212f1980572fc705227e268b6666ae8688aefce4` 已推送到 `origin/main`。下一步做 CDN/真机发布后复核。
- **发布后 CDN gate**：`testingcf.jsdelivr.net` 的 database loader 与 database frontend 均 200，内容均包含 `be210de5f029c4720f5e3503d02f2bb4483b5be4`；`gcore.jsdelivr.net` 的 vendor fork 200，内容包含 `createSillyTavernContextProxy_ACU`。三段链路闭合。
- **发布后真机 gate**：CDP 连接 `127.0.0.1:9222`，从开发卡切到发布版 `characterId=3`。`Debugger.scriptParsed` 命中发布版 `6a7bb0827b95f06eab04f4bf44766867c7cc2794` 的数据库 loader、数据库前端、固定状态栏、界面美化、变量结构 dist，并命中 vendor `be210de5f029c4720f5e3503d02f2bb4483b5be4`。发布版 `apiMarker/hostMarker` 均为 `mfrs-r2-6-coreapi-context-proxy`，`getPanelState()` 为 `templateLoaded:true/tableCount:14/missing:[]`。`reloadCurrentChat()` 后仍 14 表，chat[0] 存在 `TavernDB_ACU_ScopedConfig`，keys 为 `version/template/templateArchives`，说明 chat-scope 持久化生效。

## 2026-06-04: R2-6 回归验收（多卡/多模式/旧功能完成·不发布）
- **Status:** complete。R2-6 没有直接通过，而是先抓到一个新回归：开发卡 -> Assistant -> 发布版旧 CDN 卡 -> 开发卡时，开发卡会被旧发布脚本残留实例拖回 8 表；chat 字段仍是正确 14 表，说明问题不在数据丢失，而是 API/实例接管误判。
- **新增修复**：`src/神秘复苏模拟器/脚本/数据库/index.ts` 与 `src/神秘复苏模拟器/脚本/数据库前端/index.ts` 现在会同时清理 host 与 iframe local 两侧的 `AutoCardUpdaterAPI`、`__mfrsDatabaseScriptMarker__`、`__ACU_STAR_DB_III_LOADED__`；重新 import 后只信 host 上新挂载的 API，等待 API 实际注册后再打 `mfrs-r2-6-coreapi-context-proxy` marker，避免把旧 iframe API 误标成新 API。`ensureMysteryTemplate` 的单例 promise 完成后会释放，避免一次运行结果卡住后续校正。
- **构建**：沙盒内 `npm run build` 仍命中已知 `spawn EPERM`；按权限流程沙盒外重跑成功，数据库 loader 与数据库前端 dist 已同步。构建带出的无关 `dist/神秘复苏模拟器/界面/状态栏/index.html` 已恢复，最终 tracked diff 只剩 R2 相关 5 个文件。
- **当前开发卡基线**：强刷后回到开发卡 `characterId=2`，`tableCount:14`，`apiMarker/hostMarker` 均为 `mfrs-r2-6-coreapi-context-proxy`，`TavernDB_ACU_ScopedConfig` 存在，`getPanelState()` 为 `templateLoaded:true/tableCount:14/missing:[]`。
- **多卡 gate**：开发卡 -> Assistant -> 发布版 -> 开发卡通过。Assistant `characterId=0` 保持 `tableCount:8` 且 `fieldExists:false`；发布版 `characterId=3` 仍是旧 CDN/旧行为，不作为发布验收对象；切回开发卡后恢复 `tableCount:14`、marker 存在、chat 字段存在、panel loaded。
- **global/旧入口 gate**：`switchTemplatePreset('神秘复苏模拟器',{scope:'global'})` 返回 `success:true/scope:'global'`；随后 reset/恢复后开发卡仍 14 表。再次切 Assistant 仍 8 表，证明 global smoke 未污染普通卡。`MysteryDatabaseFrontend.getPanelState()`、`exportCurrentData()`、`refreshDatabase()` 均通过：导出 14 表，刷新数据库/世界书 `ok`，刷新后仍 14 表。
- **静态 gate**：`git diff --check` 通过；`node --check vendor/shujuku-sp-fork/index.js` 通过。未提交、未发布；R2-7 仍需用户确认后做两段式 CDN 回填、发布版打包和发布后真机复核。

## 2026-06-04: R2-5 真机功能验收（单卡完成·不发布）
- **Status:** complete。开发卡 `characterId=2` / `神秘复苏模拟器` 已用真实 SillyTavern 页面完成单卡验收；当前测试 chat 停在可玩状态：14 表，`TavernDB_ACU_ScopedConfig` 存在，字段 keys 为 `version/template`。
- **构建后清理与静态 gate**：`npm run build` 已在沙盒外成功；构建再次带脏 `dist/神秘复苏模拟器/界面/状态栏/index.html`，复查为同 bundle 的模块编号差异（如 `351` -> `234`），已只恢复该无关产物。最新 `git diff --check` 通过，`node --check vendor/shujuku-sp-fork/index.js` 通过。
- **本轮新增小补丁**：`vendor/shujuku-sp-fork/index.js` 给 `ACU_Visualizer_Refresh()` 调用加 async catch，并在 `window.ACU_Visualizer_Refresh` 内补 jQuery fallback（`window.jQuery/window.$/topLevelWindow_ACU`），避免启动期出现 `jQuery_API_ACU is not a function` 未处理异常；`src/神秘复苏模拟器/脚本/数据库前端/index.ts` 补 `hasHostSaveChat()/waitForHostSaveChat()`，autofix 首次导入前短等宿主 `saveChat`，并把“检测到当前数据库模板不是 14 表”从 warn 降为 info。dist 已同步。
- **脚本链路证据**：CDP `Debugger.scriptParsed` 明确看到开发卡自然加载 `http://localhost:5500/dist/.../脚本/数据库/index.js?t=...`、`http://localhost:5500/dist/.../脚本/数据库前端/index.js?t=...`，以及 `http://localhost:5500/vendor/shujuku-sp-fork/index.js?v=r2-4-coreapi-context-proxy`。发布卡 `characterId=3` 未参与本轮 R2-5，正式 CDN 回填仍留到 R2-7。
- **冷启动/autofix gate**：先清成 `8 表 + fieldExists:false` 并保存；页面强刷后会先停在最近聊天列表，需用 `selectCharacterById(2)` 回到开发卡。自然加载后 1 秒采样即为 `tableCount:14`、`templateLoaded:true`、`missingNames:[]`、`fieldExists:true`、字段 keys `version/template/templateArchives`。这证明不依赖 global 污染。
- **三入口 gate**：使用 `src/神秘复苏模拟器/数据库/神秘复苏表格SQL_v1.json` 作为模板数据，三次都先按“删 chat 字段并保存 -> resetTemplate”回到 `8 表 + fieldExists:false`，再分别调用：`importTemplateFromData(data,{scope:'chat'})`、`switchTemplatePreset('神秘复苏模拟器',{scope:'chat'})`、`injectTemplatePresetToCurrentChat('神秘复苏模拟器')`。三者返回 `success:true/scope:'chat'`，调用后均为 `tableCount:14` 且写入当前 chat；直接导入字段 keys 为 `version/template/templateArchives`，preset link 两入口 keys 为 `version/template`。
- **持久化 gate**：`ctx.reloadCurrentChat()` 后 1 秒采样仍为 `tableCount:14`、`fieldExists:true`、keys `version/template`。
- **控制台复核**：本轮捕获到的相关问题中没有 `jQuery_API_ACU is not a function`、没有 `[ChatGateway] saveChat 不可用`、没有数据库前端/autofix 失败日志。剩余 warn 为既有/无关项：`Settings not ready, scheduling another save`、ST deprecated macro 提示、固定状态栏找不到输入区容器的重试提示、unload permissions policy。
- **注意事项**：CDP 注入 JS 时不要在脚本文本里写中文正则/路径字面量，PowerShell 到 Node/CDP 的编码会把中文变成 `?`，曾导致一次只读探针正则报错；后续用 ASCII 匹配或从运行时/文件系统动态取值。页面强刷后若停在“最近的聊天”，不能据此判定脚本未加载失败，需先重新选中开发卡。
- **下一步**：进入 R2-6，多卡隔离、global 通道、UI/世界书/旧功能回归；仍不发布。

## 2026-06-04: R2-4 本地构建与 dist 链路复核（完成·开发版）

- **Status:** complete（开发版构建链路）；已修改 `src/神秘复苏模拟器/脚本/数据库/index.ts` 并重建 `dist/神秘复苏模拟器/脚本/数据库/index.js`，让开发版数据库 loader 从本地 `http://localhost:5500/vendor/shujuku-sp-fork/index.js?v=r2-4-coreapi-context-proxy` 加载 R2-3 patched fork。未改发布版、未改 `scripts/publish-card.mjs`、未发布。
- **构建记录**：首次在沙盒内运行 `npm run build` 命中已知 `spawn EPERM`；按权限流程沙盒外重跑同一命令成功。输出含 `[schema_dump] 已将所有 schema.ts 转换为 schema.json`、`[tavern_sync] 已打包所有配置了的角色卡/世界书/预设`，各 webpack entry 均 `compiled successfully`。
- **链路复核**：`dist/神秘复苏模拟器/脚本/数据库/index.js` 现内嵌本地 vendor URL，旧 `14a556d.../vendor/shujuku-sp-fork/index.js` 在该运行链路中已消失；全局 `rg "__RESOURCE_HASH__" dist src scripts vendor` 0 命中。
- **本地服务复核**：`http://localhost:5500/vendor/shujuku-sp-fork/index.js?v=r2-4-coreapi-context-proxy` 返回 200，长度 5635746，内容含 `createSillyTavernContextProxy_ACU`；`http://localhost:5500/dist/.../脚本/数据库/index.js` 返回 200，内容含 `r2-4-coreapi-context-proxy`。
- **静态 gate**：`git diff --check` 通过；`node --check vendor/shujuku-sp-fork/index.js` 通过；AM/SP sweep（`GLOB 'AM|AM0001|AM0002|AMxxxx|索引AM`）0 命中。
- **工作区说明**：R2-4 相关改动为 `src/神秘复苏模拟器/脚本/数据库/index.ts`、`dist/神秘复苏模拟器/脚本/数据库/index.js`，加上 R2-3 的 `vendor/shujuku-sp-fork/index.js` 和 planning 三件套。`dist/神秘复苏模拟器/界面/状态栏/index.html` 仍有 1 行构建产物差异，R2-4 开始前已 dirty，本阶段未回滚它以避免误碰历史产物。
- **下一步**：进入 R2-5，用真实 SillyTavern 页面加载 localhost 开发版，验证 patched fork 下 chat-scope 三入口是否真实写入 `TavernDB_ACU_ScopedConfig` 并保持 14 表。

## 2026-06-04: R2-3 fork 最小实现（完成·源码补丁 + 静态复核）

- **Status:** complete（源码阶段）；已修改 `vendor/shujuku-sp-fork/index.js`，未改 dist、未改卡侧源码、未构建、未发布。当前工作区额外只有 planning 三件套仍为未跟踪文件。
- **实现内容**：在 `attemptToLoadCoreApis_ACU()` 附近新增 `createSillyTavernContextProxy_ACU`、`shouldWrapSillyTavernContext_ACU`、`normalizeSillyTavernApi_ACU` 三个小 helper。Proxy 的 `get/has` 都优先读 `rawST.getContext()` 的当前快照，缺失或异常时 fallback 到 `rawST[prop]`。
- **分支行为**：插件模式继续总是使用 `getContext()` Proxy，语义等价于原有分支并新增 raw fallback；userscript/iframe 模式仍优先选 `iframeST || parentST`，但若该对象有 `getContext()` 且直接 `chat/saveChat/eventSource/eventTypes` 缺失，则按需包装，修复把 `{libs,getContext}` 骨架误当扁平 API 的问题。
- **复核结果**：`node --check vendor/shujuku-sp-fork/index.js` 通过；`git diff --check` 通过；AM/SP sweep（`GLOB 'AM|AM0001|AM0002|AMxxxx|索引AM`）0 命中；diff 仅 1 个文件，`70 insertions(+), 34 deletions(-)`，范围集中在 CoreAPI 适配段。
- **边界说明**：本阶段未把 patched fork 接入 dist，真实页面仍会加载旧 CDN `14a556d`，所以“修复后 chat-scope 三入口真机写入 14 表”的完整 CDP 验证转入 R2-4/R2-5。R2-3 只判定源码最小补丁和静态 gate 通过。
- **下一步**：进入 R2-4，本地构建并复核 dist/loader 链路，让运行时实际加载这版 patched fork；随后 R2-5 做单卡真机三入口验收。

## 2026-06-04: R2-2 最小修复点设计与静态审查（完成·未改码）

- **Status:** complete；本阶段只做设计审查和只读探针，未改 `vendor/shujuku-sp-fork/index.js`、未改 dist、未构建、未发布。`task_plan.md` 已将 R2-2 标为 complete，并收窄 R2-3 实现边界。
- **审查对象**：`detectRuntimeMode()` 在 iframe 返回 userscript；`attemptToLoadCoreApis_ACU()` 的 extension 分支已有 `getContext()` Proxy，但 userscript 分支仍假设 iframe `window.SillyTavern` 是扁平 API；ChatGateway、事件监听、生成管线、世界书 fallback、请求头、ConnectionManager 都直接读 `SillyTavern_API_ACU.*`。
- **属性面复核**：当前数据库 iframe 的 `window.SillyTavern` 直接属性只有 `libs/getContext`，直接 `chat/saveChat/eventSource/eventTypes/chatId/getRequestHeaders` 全缺；`getContext()` 返回 145 个 key，含 `chat array:1`、`saveChat function`、`eventSource object`、`eventTypes object`、`chatId string`、`getRequestHeaders function`、`ConnectionManagerRequestService function`、`extensionSettings object`、`saveSettingsDebounced function`。
- **候选 Proxy 模拟**：在页面中临时构造只读 Proxy（未挂全局、未改状态），`get` 优先读 `rawST.getContext()[prop]`、缺失再 fallback 到 `rawST[prop]`；结果能正确暴露 `chat/saveChat/eventSource/eventTypes/chatId/name1/getRequestHeaders/ConnectionManagerRequestService/extensionSettings/libs/getContext`。说明 R2-3 最小补丁有明确闭环。
- **推荐方案**：只改 CoreAPI 适配层，在 `attemptToLoadCoreApis_ACU` 附近新增小 helper；当 raw `SillyTavern` 有 `getContext()` 且直接 core 字段缺失时，用 Proxy 包装。这个方案一次性修复 `getChatArray_ACU()`、`saveChatToHost_ACU()`、事件监听、生成相关直接读取，blast radius 小于改各个调用点。
- **降级备选**：只在 ChatGateway 给 `saveChat`/`chat` 加 fallback 到 `window.SillyTavern.getContext()`。不推荐作为首选，因为它只覆盖 ChatGateway，不能修 `SillyTavern_API_ACU.chat` 在 48xxx 生成/事件路径中的直接读取，也不能修 eventSource 订阅面。
- **ready 链决策**：R2-3 首版不改 ready/settings 链。R2-1 已证明 ready 当前可为 true 但仍失败；同轮再动 ready 会扩大风险。把 ready 作为 R2-5 冷启动回归项：若修完 host API 后仍出现 `settings_loading` 拒绝保存，再单独开一个小补丁。
- **R2-3 准入**：可进入最小实现阶段。实现后必须先 `node --check vendor/shujuku-sp-fork/index.js`、`git diff --check`、AM/SP sweep，再用 CDP 验证 chat-scope 三入口是否真实写入并保持 14 表。

## 2026-06-04: R2-1 最小观测定位 host API/ready 链（完成·未改码）

- **Status:** complete；按 R2-1 只做最小观测，未改 `vendor/shujuku-sp-fork/index.js`、未改卡侧源码、未构建、未发布。观测方式从“临时日志补丁”收窄为 CDP Debugger 断点 + Runtime 只读探针，因此没有任何观测补丁进入工作区。
- **live 脚本确认**：真实页加载的是 `https://gcore.jsdelivr.net/gh/linlangliehu/tavern_helper_template@14a556d26212c4ab086cdfd45f1b3362941deb22/vendor/shujuku-sp-fork/index.js`，scriptId `579`；内容 hash 与本地 `vendor/shujuku-sp-fork/index.js` 的 SHA256 `B01BA510AED3A94B4261FA37BD51D30774647782389EBC122C1165C2AB0B3DE9` 一致。
- **断点复现摘要**：流程为 14 表起点 → `resetTemplate` 回 8 → `importTemplateFromData(...,{scope:'chat'})` 仍 8 → `switchTemplatePreset(...,{scope:'chat'})` 仍 8 → `switchTemplatePreset(...,{scope:'global'})` 恢复 14。chat-scope 分支进入并设置 `shouldSaveChat:true`，但保存点命中 `saveChatToHost_ACU` 后看到 `SillyTavern_API_ACU.saveChat` 不是函数；上层仍返回 success。
- **ready 链修正**：本轮断点里的 `settingsStorageReadyForSave_ACU:true`、`configIdbCacheLoaded_ACU:true`、`settingsReloadAfterIdbScheduled_ACU:false`、`pendingSettingsReloadFromIdb_ACU:false`。所以早前“ready 永久 false”不是唯一根因，最多是启动期伴随风险；即便 ready 已 true，chat-scope 仍会因 host API 适配失败而写不进/保存不了。
- **关键只读探针**：top 页面和数据库 iframe 的 `window.SillyTavern` 都只有 `libs/getContext` 两个关键入口；直接 `window.SillyTavern.chat` 不是数组、`window.SillyTavern.saveChat` 为 `undefined`。但 `window.SillyTavern.getContext().chat.length=1`，`getContext().saveChat` 是 `function`。这与 fork 的 userscript/iframe 分支假设冲突：`attemptToLoadCoreApis_ACU` 在 iframe 模式把 `iframeST` 当扁平 API 直接赋给 `SillyTavern_API_ACU`，导致库内部 `SillyTavern_API_ACU.chat/saveChat` 均不可用。
- **当前根因收敛**：chat-scope 的主失败点从“IDB ready 闸门”修正为 **host API 代理/桥接适配错误**。具体后果：`getChatArray_ACU()` 读到 `[]`，`setCurrentChatTemplateScopeState_ACU()` 找不到 first message，`saveChatToHost_ACU()` 跳过保存，`applyTemplateScopeForCurrentChat_ACU()` 读不到 chat scope state 后回退 global，于是显示 8 表但 API 仍报 success。
- **当前页面状态**：当前真机仍能读到 chat[0] 上旧的 `manual_probe` chat_override（templateStrLen 37306），且因为 R2-0/R2-1 末尾 global 对照，active 模板保持 14 表可玩状态。本轮没有刻意重置用户可玩状态。
- **小错误记录**：一次只读 CDP 探针首次因 `frame.name` 为空触发 `TypeError: Cannot read properties of undefined (reading 'includes')`；已改为空字符串守卫后成功。后续 CDP frame 过滤都要守卫 `name || ''`。
- **gate 判定**：R2-1 通过；`task_plan.md` 已将 R2-1 标为 complete，并把 R2-2 设计目标改为优先审查 host API Proxy/fallback，ready 链只作为次级保护和回归项。

## 2026-06-04: R2-0 干净基线复现与安全备份（完成·未改码）

- **Status:** complete；R2-0 已执行完毕，仅通过 CDP 真机复现和读取 IDB/运行时状态。未改 fork、未改卡侧源码、未构建、未发布。`task_plan.md` 已将 R2-0 标为 complete；详细证据写入 `findings.md`「2026-06-04 R2-0」。
- **静态记录**：HEAD `286d8b5299bf937478161193ff269729810c2859`；`vendor/shujuku-sp-fork/index.js` SHA256 `B01BA510AED3A94B4261FA37BD51D30774647782389EBC122C1165C2AB0B3DE9`；`scripts/publish-card.mjs` 为 `CDN_REF=d2d5733`、cache `phase112-game-time-rename`、releaseVersion `6.1`。
- **IDB 记录**：`shujuku_v120_config_v1/kv` 有 4 key：`globalMeta` 2506、`profile____default____settings` 133979、`profile____default____template` 40158、`templatePresets` 275630。
- **基线**：真机发布版卡 `characterId=3`、chatLength=1；起点 active 模板为默认 8 表，不是 global 14 表污染。chat[0] 虽已有旧 `manual_probe` 的 `TavernDB_ACU_ScopedConfig`（chat_override 14 表），但 active 仍 8 表，证明 chat-scope 应用侧不认/不生效。
- **三入口复现**：`importTemplateFromData(data,{scope:'chat'})`、`switchTemplatePreset(presetName,{scope:'chat'})`、`injectTemplatePresetToCurrentChat(presetName)` 均返回 `success:true`，但表数均保持 8 -> 8；console 关键日志均含 `[ChatGateway] saveChat 不可用，跳过保存` 与 `[WorldbookGateway] getCurrentCharPrimaryLorebook 不可用`。
- **global 对照**：`switchTemplatePreset(presetName,{scope:'global'})` 返回 `success:true`，active 模板 8 -> 14，`settings_updated` 触发。R2-0 收尾时已把当前页面留在 global 14 表状态，方便继续游玩。
- **gate 判定**：R2-0 通过；下一步可进入 R2-1（只加临时观测日志定位 ready 链），仍禁止直接改库存储逻辑。

## 2026-06-04: 件5 路线2 fork 根治任务清单拆解（仅规划·未改码）

- **Status:** planning complete；按用户要求把路线2拆成 R2-0~R2-7 分阶段清单，已写入 `task_plan.md`。本轮仅更新 planning 文件，未改业务代码、未构建、未发布；HEAD/发布版状态仍沿用上一条记录（`286d8b5`、6.1）。
- **路线2定位**：理论上可以从机制上根治 chat-scope 问题并保留 per-chat 隔离，但不是零风险路线；要动 fork 的 IDB/settings ready 与保存链路，必须小步观测、小步实现、逐阶段复核。
- **风险控制设计**：先 R2-0 干净基线复现与备份，再 R2-1 最小观测补丁，只在确认 ready 链失败点后进入 R2-2 设计审查和 R2-3 最小实现；随后 R2-4 build、R2-5 单卡真机、R2-6 多卡/多模式回归，最后 R2-7 两段式发布。
- **停止条件**：任一阶段出现无法解释的 settings/template/chat 保存异常即停止回滚；连续 3 次仍无法让 ready 链稳定翻 true，则暂停并回报是否改走路1。

## 2026-06-04: 件5 根因单步坐实（决定性·IDB 设置就绪闸门卡死）

- **Status:** 根因彻底坐实（精确到代码行 + 真机 console 实证）；纯诊断，未改业务代码、未发布。HEAD 仍 `286d8b5`、发布版 6.1。
- **第一步结论**（已记前条）：chat-scope bug 是上游 spv3.9.5 库本身缺陷，非 fork patch 副作用（fork vs 上游逐函数字节一致）。
- **第二步深挖（本次）**：先排除"库内部 chat 引用不同源"（代码证伪：Proxy 每次走 getContext，真机 sameRef:true），再单步到真正根因。
- **★最终根因**：库配置存 IndexedDB（`shujuku_v120_config_v1`，真机实查数据完整含 14 表预设）。`loadSettings_ACU`(24476-24478) 在 IDB 缓存未就绪时提前 return 不设 ready 标志，靠 `scheduleSettingsReloadAfterIdbReady_ACU`(24402) 一次性闸门异步重载；该重载链在本宿主环境断裂 → `settingsStorageReadyForSave_ACU` 永久 false → `saveSettings_ACU`(24428) + `saveChatToHost_ACU`(3196) 双锁拒绝 chat-scope 写入，但返回 success 假象 → 永远停 8 表。
- **决定性 console 对比**：`importMysteryTemplate()`（autofix 真实入口，saveChat 已可用、非冷启动）→ `[ChatGateway]saveChat不可用` + `[设置保存]设置尚未完成可靠加载,已拒绝本次保存`，表 8→8、writes:[]、saveLog:[]；而 `switchTemplatePreset(global)` → 无拒绝日志、`settings_updated` 成功、表→14。
- **最干净复现**：start(global污染)14 → resetTemplate 8 → importMysteryTemplate 仍 8（importReturn:true 但零写入）→ 切 global 14。**坐实写入侧独立必现 bug，非纯冷启动时序**；也解释 phase111 退避重试为何治不了（ready 标志永不翻）。
- **真机已帮用户切回 global 14 表**（switchTemplatePreset global），当前可正常游玩；此为临时缓解、不持久、未发布。
- **回答用户"有没有彻底修复+不产生新bug的方案"**：没有零成本完美解。路1（卡侧 global）确定能根治且无写入层新bug，唯一副作用=profile级串台（仅同 profile 多数据库卡才撞，单卡无感），代价丢 per-chat 隔离；路2（fork 根治）理论完美保留隔离但要改库 IDB 就绪/存储核心层，影响全库所有保存路径、风险最高。
- **详细取证**：findings.md「★★2026-06-04 根因单步到具体行」+「★件5 修复路线最终判定」。
- **下一步**：等用户在路1/路2 间拍板，再改码→build→真机验证→两段式发布。

## 2026-06-04: 件5 第一步·chat-scope bug 归属判定（完成·结论=上游库 bug）

- **Status:** complete（第一步）；纯诊断+取证，未改业务代码、未发布。HEAD 仍 `286d8b5`、发布版 6.1。
- **目的**：判断 6-04 锁定的「chat-scope 应用通道坏、global 正常」是 fork 的 AM→SP patch 副作用，还是上游 spv3.9.5 本身 bug。
- **方法**：`curl` 下上游 `AlbusKen/shujuku@spv3.9.5/index.js`（92374 行，node --check OK）→ 与 `vendor/shujuku-sp-fork/index.js`（92376 行）全文件 + 逐函数 diff。
- **结果**：fork 仅 44+/42- 改动，全部在「提示词常量区 ≤1592（21 hunk）+ 注释/文案/编码格式化（9 hunk）」；业务逻辑区 0 改动。chat-scope 核心区(9000-29999) 唯一改动是 15639 行 `formatSummaryIndexCode_ACU` 编码前缀 AM→SP（纯字符串，无关 scope）。
- **逐函数字节比对（+2 偏移对齐后全部一致）**：`applyTemplateSnapshotToScope_ACU`(9252)、`applyTemplateScopeForCurrentChat_ACU`(24998 回退逻辑)、`buildChatTemplateScopeStateFromCurrent_ACU`(23525)、`sanitizeTemplateSnapshotForChat_ACU`(23162)、`activateChatTemplatePresetSelection_ACU`(23274)、`setCurrentChatTemplateScopeState_ACU`(23543)、`getGlobalTemplateSnapshotForCurrentProfile_ACU`(23607) —— 7 个全 diff 空。
- **★结论：是上游库本身的 chat-scope 缺陷，不是 fork patch 引入的。** → 修复不必回退 patch；路2 根治 = 帮上游修真 bug，与 AM→SP patch 区域零重叠；路1 卡侧改 global 仍最小侵入且 global 通道字节一致+真机已验证可用。
- 详细取证表见 findings.md「2026-06-04 件5 第一步：chat-scope bug 归属判定」。临时产物 `.tmp-upstream-spv395.js` 已删除。
- **下一步（第二步）**：选修复路线（路1 卡侧规避 global / 路2 fork 根治），待用户定。

## 2026-06-04: 件5 数据库前端停在 8 表·chat-scope bug 根因诊断（纯诊断·未改码未发布）

- **Status:** 诊断完成，根因已决定性锁定；本轮只诊断+记录三件套，**未改任何代码、未发布**。HEAD 仍 `286d8b5`、发布版 6.1。
- **触发**：玩家反馈神秘复苏数据库前端没成功加载，前端不是 14 表。真机（127.0.0.1:8000，正开神秘复苏卡，chatLength 1，characterId 2，chat=`神秘复苏模拟器 - 2026-06-03@23h57m24s286ms`）确认生效模板=库默认 8 表，`templateLoaded:false`，缺全部 14 表，三接口（getTableTemplate/getPanelState/exportTableAsJson）一致。
- **诊断方法**：CDP 连真机 + 读 fork 源码 `vendor/shujuku-sp-fork/index.js` 白盒交叉验证。逐一排除 → 决定性实验 → 反证。
- **★根因**：库 fork **chat-scope 应用通道坏了，global-scope 正常**。决定性实验：`switchTemplatePreset('神秘复苏模拟器',{scope:'global'})` → **立刻 14 表**（三接口确认）；而所有 chat-scope 写入（`importTemplateFromData{scope:'chat'}`/`switchTemplatePreset{scope:'chat'}`/`injectTemplatePresetToCurrentChat`/卡 `importMysteryTemplate`）全 return `success:true` 却实际 8 表，chat 数组无任何消息带 `TavernDB_ACU_ScopedConfig`（`anyMsgHasScope:[]`）。
- **已排除（均正常）**：库本体加载（API 48+ 方法）、前端注入、库 chat 引用与 ST 同源（Proxy 29945 每次走 getContext，`sameRef:true`）、chat[0] 可写（手写字段+saveChat 落盘存活）、打包 14 表 JSON 含 `mate:{type:chatSheets}`、预设库「神秘复苏模拟器」预设内容正确。
- **源码机制**：`applyTemplateSnapshotToScope_ACU`(9252) 9263 先设内存 14 表 → 9278 调 `applyTemplateScopeForCurrentChat_ACU`(24998) 按 chat scope state 重算 → chat scope 没落地命中 25015 回退 `getGlobalTemplateSnapshotForCurrentProfile_ACU`(全局 8 表) → 内存改回 8；返回值 9283 基于 snapshot 恒真 → 报 success 假象。chat 写入侧最可能 `buildChatTemplateScopeStateFromCurrent_ACU`(23525) 返回 null → 9221 跳过不写（待下次单步确认）。
- **关键判断**：**phase111 退避重试治不了**——它假设失败是设置就绪前的时序竞态，但真实失败是 chat-scope 路径本身坏，重试 8 次每次都回退 8 表。（6-03 progress 记"真机验证 14 表成功"与本次稳定失败反差，原因待查：当时状态/库行为可能不同。）
- **临时缓解（已执行，仅当前真机、不持久、未发布）**：用 `scope:'global'` 把全局预设切到 14 表，三接口确认 templateLoaded:true/missing:[]，用户当前可正常游玩。重开/换库不保留。
- **完整细节**：findings.md「2026-06-04 数据库前端停在 8 表·根因诊断」。续接锚点见 task_plan.md「件5」。
- **下一步（下次对话）**：①确认上游 spv3.9.5 原版 chat-scope 是否同样坏 → ②选路线（卡侧改 global 规避 / fork 根治）→ ③改码+build+真机验证+两段式发布。

## 2026-06-03: current_time 保留字 bug 修复（方案A·列名 current_time→game_time·已发布 6.1）

- **Status:** ✅ 完整交付并已推送 origin/main。HEAD==origin/main==`286d8b5`、发布版 **6.1**、cache `phase112-game-time-rename`、CDN_REF `d2d5733`。
- **关键认知（同步路径）**：schema JSON 被 TS `import` 进 bundle（`脚本/数据库前端/index.ts:1` + `神秘复苏数据库前端/index.ts:8`），autofix 用它建表/导模板。所以**纯 publish-card 镜像数据目录不够**，必须重 build 把 game_time 烧进 dist，再换 CDN_REF 指新 dist 提交（发布版 index.yaml/PNG 从 CDN 拉 dist）。
- **两段式发布**：①资源提交 `d2d5733`（schema源+两个dist bundle，build 后 dist `current_time`=0/`game_time`=1）；②发布提交 `660b9ab`（publish-card.mjs CDN_REF/cache + 发布版 index.yaml + 发布版 schema + 重打包 PNG，当时版本 6.0）。
- **③版本提交 `286d8b5`（升 6.1）**：用户要求给本次修复独立版本号。dist/CDN_REF 不变（仍 d2d5733），仅 publish-card.mjs `releaseVersion` 6.0→6.1，重跑 publish-card 刷新发布版 index.yaml 版本行 + 重打包 PNG。核验：index.yaml `版本: '6.1'`、PNG chara/ccv3 `character_version=6.1`、零 6.0 残留。
- **核验全过**：发布版 schema 与开发版字节完全一致 59566=59566（current_time=0/game_time=6）；index.yaml d2d5733×6/phase112×6/版本6.0/零旧值残留；PNG `chara`+`ccv3` character_version=6.0/d2d5733×6/phase112×6/零旧hash残留（game_time=0 属正常——schema 不进 PNG，走 CDN dist）。
- 收尾：状态栏 html minify 噪声已 `git checkout origin/main` 还原（本次没动状态栏源码）。
- **玩家报错**：`[shujuku_v120] 第 3 次尝试失败 … INSERT INTO global_state (row_id, current_time, …) → CHECK constraint failed: current_time GLOB '????-??-?? ??:??'`。
- **根因（已实证·确定性必炸）**：`current_time` 是 SQLite 内建保留字（CURRENT_TIME）。在 `CHECK(current_time GLOB '...')` 里被解析成内建函数、返回 `HH:MM:SS`（8字符），永远配不上 17 字符的日期模板 → SQL Mode 下**每次必失败**，不是看运气。
- **为何我没遇到（已实证）**：我的环境跑 JSON/legacy 模式（`hasSqlJs:false`、`sqlTraces:[]`、global_state 存的是非日期值"灵异复苏初期"——证明 CHECK 根本没执行），不触发 sqlite DDL；报错玩家日志带 `[SQL Mode]`/`[SqlTableService]`，跑真 sqlite → 必中。
- **方案A 修复**：把 `global_state` 表的列 `current_time` 重命名为 `game_time`（彻底避开保留字），开发版 `数据库/神秘复苏表格SQL_v1.json` 改 4 处：DDL 列定义、note 说明、initNode INSERT、updateNode 示例。`current_location`/`current_city`（含 "current_" 但非保留字）保持不动。
- **sqlite 三组实测（:memory: 真跑）**：① 玩家原 INSERT 改 game_time → **通过**（写入 2004-07-01 18:00）；② 非日期值 → **仍被 CHECK 拒**（约束没失效）；③ 同 DDL 换回 current_time 跑玩家数据 → **必炸**（精确复现玩家报错）。
- 开发版 grep 复核：`current_time`=0、`game_time`=4。发布版仍 4 处 current_time，待 publish-card 镜像同步。
- **待办**：无，已全部完成并推送。

## 2026-06-03: T7 发布版同步与远程推送（完成）

- **Status:** complete；T1-T4 改动经两段式 CDN 发布已推送到 `origin/main`，发布版版本升到 5.0（用户要求）。
- 前置：本地 `main` 先 fast-forward 到 `origin/main`（吃掉远程领先的 `4d02071 [bot] bundle`，只改状态栏 html 1 行，无冲突）。
- 构建：`npm run build` 沙盒外执行，15× `compiled successfully`、0 错误、0 EPERM。dist `界面美化/index.js` 含 mfrs-roll×9 / mfrs-choice-why×16 / sp-secondary×2 / 已验证×1 / 风险明细×2。
- 处理状态栏 html 噪声：构建重新 minify 了 `dist/.../界面/状态栏/index.html`（字符数与 origin 完全一致 87142=87142，纯等价重建），已 `git checkout origin/main --` 还原，避免无意义覆盖 bot 产物。
- **第一段·资源提交** `482b71a258f2911101fd2461d819558a1ac3c609`：6 个文件（开发版 index.yaml、灵异判定路由规则.txt、短标签字段协议.txt、界面美化 index.ts、dist 界面美化 index.js、开发版 PNG）。已 push（`4d02071..482b71a`），CDN 可拉。
- 更新发布脚本：`CDN_REF` → `482b71a...`、`CDN_CACHE_VERSION` → `phase107-deterministic-dice-5-0`、`releaseVersion` → `5.0`。
- `npm run publish-card -- 神秘复苏模拟器发布版 --dry-run` 通过（镜像5目录+386世界书文件、替换6处链接、版本5.0），随后正式跑成功重打包发布版 PNG。
- **发布产物核验全部通过**：发布版 index.yaml 版本5.0、含新 hash 482b71a、含新 cache phase107、无旧 hash/cache 残留、CDN 链接8处；PNG `chara`+`ccv3` 解码后 `character_version:5.0`、含 482b71a/phase107/mfrs_roll、无旧 hash 残留。`mfrs-dropdown`/`当前时间` 实际在 `世界书/自定义开局/欢迎页.txt`（发布版与开发版字节完全一致 51878=51878），不在 index.yaml，初次验证脚本查错文件造成的假缺失已澄清。
- **第二段·发布提交** `7457a28`：6 个文件（发布脚本 + 发布版 index.yaml + 两个 T1 世界书规则 txt + 头像 PNG + 分发 PNG）。已 push（`482b71a..7457a28`）。
- 最终：`HEAD` == `origin/main` == `7457a28`。临时验证文件已清理。
- 发布版没有界面美化 dist 改动——这是两段式设计：发布版通过 CDN 引用开发版 dist（第一段已推），故 T2/T3/T4 的脚本/CSS 改动不进发布版世界书。

## 2026-06-02: T5 世界书预算精修（完成·结论=无需改动）

- **Status:** complete；用户看完去重明细后拍板**不动任何常驻条目**。零删改、零回归风险。
- 任务目标：降低 8192 预算下世界书 overflow 风险，让核心剧情锚点更容易进入 depth injection。**这是测量驱动的优化，禁止盲目删内容**。
- **测量结论（重要修正）：真正的蓝灯常驻只有 4 个条目**，不是之前以为的一大片。`世界书常驻规则` 文件夹里几乎所有 `<<: *世界书常驻规则` 条目都被各自 `激活策略:{类型:绿灯}` 覆盖成按需（YAML 合并后者生效）；`原剧情与玩家偏移规则` 是 `启用:false`。阶段J 那轮精修已经把绿灯化做得很彻底。
- **4 个真常驻条目实测字符占用**（estTok≈中文字符/1.6 粗估，仅供横向比较）：
  - `系统提示词/0`：3505 字符 / ~2191 tok。6 条世界观铁律 + 15 条变量档案规则 + 7 条核心任务 + 叙事/推理要求 + 选项模式 + 状态面板模板。每轮必需。
  - `变量/变量输出格式`：2158 字符 / ~1349 tok。英文紧凑的 UpdateVariable/JSONPatch 契约。已是英文压缩态，每轮必需。
  - `变量/变量列表`：1629 字符 / ~1018 tok。**是 EJS 模板**——真正注入的是渲染后的 ~150 字符运行时摘要 + `{{stat_data}}` 实际变量数据，静态字符数不等于注入 token。
  - `世界书/规则/世界铁律`：328 字符 / ~205 tok。太小，无压缩价值。
  - 4 项静态字符合计 7620（~4763 tok 粗估），但变量列表渲染后大幅缩水，实际常驻注入应明显低于此。
- **可压缩空间评估**：
  - 变量输出格式：已英文紧凑，压缩收益低、风险高（动一个字段名可能破坏 MVU patch）。不建议。
  - 变量列表：静态大头是 EJS 逻辑，渲染后很小，压它不省 token。不建议。
  - 世界铁律：太小，不值得。
  - 系统提示词/0：唯一有一定冗余的大户（如 14/24 条目里部分面板说明、状态面板模板与短标签字段协议有重叠），但它是全卡行为基准，**改动风险最高、需逐条实测不丢规则**，收益 ~几百 tok。
- **结论建议**：当前常驻预算其实已经被阶段J 压得相当干净，T5 进一步压缩属「高风险低收益」。倾向**不动 / 仅做系统提示词极轻度去重**，把精力留给 T7 发布。等用户定。
- **用户决策（2026-06-03）：不动。** 看完候选去重清单后选择保持现状。唯一相对安全的候选1（系统提示词世界观6条 vs 世界铁律去重）仅省 ~200-250tok（占8192预算~3%），且会引入「系统提示词依赖世界铁律常驻」的隐性耦合，不值得动核心提示词。候选2(变量更新规则)高危、候选3(sp_status兜底模板)有保留价值。T5 收尾。
- 注意：本任务独立于 T1-T4；T1-T4 已验证通过，随时可与 T5 一起走 T7 发布。

## 2026-06-02: T6 构建与真实页验证（完成）

- **Status:** complete；T1-T4 这批 UI/机制改动构建+实机验证全部通过。
- 构建：`npm run build` 沙盒外执行，三个 entry 全 `compiled successfully`（2.6s/3.9s/3.9s），无 EPERM。dist 产物 `脚本/界面美化/index.js` 关键字命中：mfrs-roll×9、mfrs-choice-why×16、sp-secondary×2、风险明细×2、展开细节×1、已验证×1。
- `git diff --check` 通过（exit 0）。改动文件：index.yaml、灵异判定路由规则.txt、短标签字段协议.txt、界面美化 index.ts、dist index.js、神秘复苏模拟器.png（构建重打包）。
- Chrome DevTools 真实页验证（127.0.0.1:8000）。注意：真实页跑的是**旧版导入脚本**（无 sp-secondary/mfrs-roll/--sp-icon），故用新版逻辑+新版 CSS 注入真实宿主环境/file:// 测试页验证：
  - T1 掷骰复算三例全对：①seed=12-1-鬼邮局取信→复算46，AI估79不一致→显示46/marker46%/未通过is-fail/「⚠已按seed复算（原值79）」；②一致+通过 is-pass「✓已验证」；③一致+未通过 is-fail「✓已验证」。
  - T2 六色系 computed 值全对：☠#e25555血红/⛓#d8a84a黄金/❖#5a93d0幽蓝/◈#46b0a0冷青/✦#c9893f琥珀/⊳#c06ad0紫；titleColor 随 accent 联动。
  - T3 长面板(10字段)折叠→直显4/折叠6/「展开细节（6项）」；短面板(4字段)不折叠。
  - T4 选项 A 明细展开=死亡风险+15/复苏风险+0/风险来源接触媒介；自定义行动无折叠。
  - 移动端 emulate 390x844：scrollWidth==clientWidth==390，无横向溢出，无超宽元素；header 窄屏垂直堆叠正常。
  - 控制台 0 错误。
- 临时验证文件已清理，测试页已关闭。
- 待办：T5（世界书预算精修，独立）可选；T7 发布版同步推送（依赖本次验证）。

## 2026-06-02: T4 选项面板分支增强（完成，待实机）

- **Status:** complete（源码）；改 `脚本/界面美化/index.ts` 的 `enhanceChoicePanels` 内 `renderChoices` + choice CSS。
- 痛点：原 `getActionText` 把每个选项的「死亡风险/复苏风险/风险来源」分号段直接截掉丢弃，玩家看不到选项风险。
- 新增 `splitChoiceDetail(rawText)`：按 `；/;` 分段，提取 `死亡风险/复苏风险/风险来源/风险/代价/资源/后果/说明/提示` 为 `{label,value}` 明细。
- 结构改造：每个选项从单 `<button>` 改为 `<div class=mfrs-choice-item>`，内含 button（仍只填入纯行动文本）+ 可选 `<details class=mfrs-choice-why>` 风险明细（默认折叠；死亡风险红 `.is-death`、复苏风险紫 `.is-revive`）。
- summary 文字由 CSS ::before `▸/▾ 风险明细` 驱动，JS 不设 textContent 避免重复。
- CSS：item 与 button 圆角衔接用 `:has(> .mfrs-choice-why)`；新增 why/why-body/why-row/why-key 样式。
- 校验：离线模拟 5 个选项——正常选项行动干净分离+明细三项、自定义行动无折叠、无明细行无折叠，全部正确。
- 待办：实机构建+真实页验证归 T6。

## 2026-06-02: T3 面板核心字段直显+次要折叠（完成，待实机）

- **Status:** complete（源码）；改 `脚本/界面美化/index.ts` 的 `enhanceShortTagPanels()` + `index.yaml` 折叠 CSS。
- 脚本：提取纯函数 `renderSpLine()`（转义+字段span+风险色，逻辑同原内联）；新增 `SP_PRIMARY_KEY` 正则识别核心字段（标题/死亡风险/复苏风险/风险变化/结果/可见结论/结论/建议/下一步/确认度/状态）。
- 分组规则：第一行 + 命中 SP_PRIMARY_KEY 的字段 = 核心直显；其余 = 次要。阈值 `nonEmpty>6 且 secondary>=3` 才折叠，否则全直显（与改造前完全一致，零回归）。
- 折叠结构：`<div class=sp-primary>核心</div><details class=sp-secondary><summary>展开细节（N 项）</summary><div class=sp-secondary-body>次要</div></details>`。
- CSS：新增 `.sp-primary`、`details.sp-secondary`（自定义 ▸/▾ marker、隐藏默认 webkit marker）、`.sp-secondary-body`（pre-wrap）。
- 校验：YAML OK；替换模板 CSS 67/67 配平；模拟 ghost_encounter 10 字段→折叠(直显 4/折叠 6)、短面板 4 字段→不折叠，均符合预期。
- 待办：实机构建+真实页验证归 T6。

## 2026-06-02: T2 短标签面板按类型配色（完成，待实机）

- **Status:** complete（源码）；纯 CSS 改动，落在 `[显示]渲染神秘复苏短标签面板` 正则的 `<style>` 段。
- 按语义分 6 色系，用 CSS 变量覆盖 `--sp-accent/--sp-accent-dim/--sp-border/--sp-icon`，使标题色、kind 徽章边框、左边条整体联动：
  - 血红☠：event/ghost/ghost_encounter/ghost_slave/use_ghost/custom_ghost
  - 黄金⛓：ghost_suppress/suppress/puzzle_solve
  - 幽蓝❖：domain/location_explore
  - 冷青◈：check/clue/clue_deduce/deduce
  - 琥珀✦：item/item_use/medium
  - 紫⊳：choices；中性 ◆/▤/▦/▣：status/archive/import/database
- `title::before` 由固定 `◆` 改为 `var(--sp-icon, '◆')` 驱动；删掉原先只覆盖 6 类的 `border-left-color`，改由 `--sp-accent-dim` 变量统一联动（原 `.sp-panel` 的 `border-left:4px solid var(--sp-accent-dim)` 自动跟随）。
- 校验：YAML 可解析；替换模板大括号 59/59 配平；6 分组类齐全；`<style>` 配平；面板骨架 `sp-panel sp-panel-$1` 完整。
- 待办：实机构建+真实页验证归 T6。

## 2026-06-02: T1 seed 确定性掷骰机制（实现中）

- **Status:** in_progress；三处源码改动已落地，待构建+真实页验证。
- 设计：AI 输出自闭合 `<mfrs_roll seed roll dc route act />`；骰值由前端按公开公式 `hash(seed) % 100 + 1` 确定性复算，玩家可验证、同 seed 同结果、抗 swipe 漂移。比 v10.2 多了「前端复算校验」。
- 改动1 `index.yaml`：新增正则 `[显示]渲染神秘复苏掷骰条`（id ...2007，产出骰子条 HTML 骨架 + data-seed/roll/dc/route）；新增 `[不发送]去除神秘复苏掷骰条`（id ...2008，仅格式提示词，避免污染 AI 上下文）。
- 改动2 `脚本/界面美化/index.ts`：新增 `computeFairRoll()` + `enhanceRollBars()`，复算骰值、定位 marker/DC、显示 通过/未通过 与「✓已验证 / ⚠已按 seed 复算」，挂进 `enhancePanels()`。
- 改动3 规则文本：`灵异判定路由与输入锁规则.txt` 的 d100 章节新增「确定性掷骰协议」定义 seed/roll/dc/route/act 格式与铁律边界；`短标签字段协议.txt` 登记 `<mfrs_roll>` 为自闭合例外标签；`index.yaml` 路由规则激活关键字加 `mfrs_roll/d100/掷骰/不确定性`。
- 待办：`npm run build`（沙盒 EPERM 则沙盒外）→ 真实页 CDP 验证骰子条复算与校验 → 标记 T1 complete。

## 2026-06-02: 阶段优先时空锚点提交与远程同步

- **Status:** complete；已将“原著事件阶段 -> 接入视角/地点 -> 具体节点”的三级时空锚点改动提交并推送到远程 GitHub 仓库。
- 最新提交：`e373a371a4ee7467e18de1bf088c94e8cfb87355 chore: reorder mystery revival start anchors`。
- 推送结果：本地 `main`、`origin/main`、`origin/HEAD` 均指向 `e373a37`。
- 发布版版本保持 `4.0`；已确认 `src/神秘复苏模拟器发布版/index.yaml` 为 `版本: '4.0'`。
- 本次提交只包含 8 个已跟踪文件：开发版/发布版 `index.yaml`、欢迎页、PNG，以及构建产物 `dist/神秘复苏模拟器/界面/状态栏/index.html`。
- 未跟踪的 planning 文件、planning 归档、截图、备份 JSON、`神秘复苏.txt` 等本地材料未提交。

## 2026-06-02: 开局时空锚点改为阶段优先结构

- **Status:** complete；已采用“原著事件阶段 -> 接入视角/地点 -> 具体节点”的三级结构。
- 开发版实际入口 `src/神秘复苏模拟器/index.yaml` 已重排 55 个真实锚点：一级为阶段0到阶段7与自定义，二级为普通人/总部体系/民间驭鬼者/规则地点/后期番外等接入位置，三级为具体节点。
- `src/神秘复苏模拟器/世界书/自定义开局/欢迎页.txt` 已同步为阶段优先生成逻辑，保留 `rawAnchors` 作为接入来源，再聚合为阶段菜单。
- 七字段 value 未改语义，仍为 `name|time|loc|phase|pressure|intel|boundary`；已核验开发版和发布版均为 55 个节点、七字段异常 0。
- `npm run build` 沙盒内仍因已知 `spawn EPERM` 失败，已按权限流程沙盒外重跑成功；随后运行 `npm run publish-card -- 神秘复苏模拟器发布版` 并保留版本 4.0。
- 发布版 PNG 的 `chara/ccv3` 元数据已核验：`character_version: 4.0`，并包含“阶段0｜七中与敲门鬼事件”“普通人接入｜七中与早期怪谈”“阶段7｜国际冲突与世界失衡”“自定义｜玩家设定时间线”。

## 2026-06-02: 发布版版本号提升到 4.0

- **Status:** complete；已将神秘复苏模拟器发布版版本从 3.0 提升到 4.0。
- 修改 `scripts/publish-card.mjs` 的 `releaseVersion: '4.0'`，避免后续发布脚本把发布版版本写回 3.0。
- 运行 `npm run publish-card -- 神秘复苏模拟器发布版` 重新生成发布版 `index.yaml` 与 PNG。
- 已核验 `src/神秘复苏模拟器发布版/index.yaml` 为 `版本: '4.0'`，发布版 JSON 为 `character_version: 4.0`，PNG 的 `chara/ccv3` 元数据均为 `character_version: 4.0`。
- 本次业务改动范围：`scripts/publish-card.mjs`、发布版 `index.yaml`、发布版 JSON、发布版 PNG；planning 文件仍默认不提交。

## 2026-06-02: planning 压缩归档

- **Status:** complete；已压缩 planning 三件套，同时保留项目运行流程常驻段。
- 压缩前完整快照已复制到 `planning_archive_2026-06/`：
  - `task_plan.before-compress.md`
  - `progress.before-compress.md`
  - `findings.before-compress.md`
- `task_plan.md` 现在只保留运行流程速览、当前状态、已完成清单、可选后续、发布信息、边界。
- `findings.md` 现在保留完整运行流程常驻参考、稳定发现、发布事实、重要历史摘要和已知问题。
- `progress.md` 现在保留压缩后的高层时间线，旧流水详见归档快照。
- 后续再次使用 planning-with-files 时，仍可从 `task_plan.md` 顶部读到项目基本运行流程。
- 验收补充：已确认根目录 planning 三件套为压缩版，归档快照齐全；`task_plan.md` 前 50 行保留运行流程速览，`findings.md` 顶部保留完整运行流程常驻参考。

## 2026-06-02: planning 常驻运行流程补充

- **Status:** complete；已把项目运行流程写入 planning 文件，便于后续每次使用 planning-with-files 恢复时快速理解项目。
- `task_plan.md` 顶部新增「项目运行流程速览（planning 常驻）」，覆盖开发版/发布版目录、实际首屏入口、构建发布链路和关键验证点。
- `findings.md` 顶部新增「项目运行流程常驻参考」，记录目录职责、开局页运行链路、开发构建流程、发布版同步和打包流程、验证流程、常见坑。
- 该记录用于理解项目运行方式；不是新的代码改动任务。后续若压缩 planning，应保留这两段常驻流程。

## 2026-06-02: 最终公开发布与 CDN 收口

- **Status:** complete；第二段发布提交已推送到 `origin/main`。
- 本地 `main` 先快进到远端 `44e0c1b [bot] bundle`，再创建发布提交。
- 资源提交完整 hash：`d7bc106b54cbd66542d1c8265537cdad00eb8096`。
- `scripts/publish-card.mjs` 的 `CDN_REF` 已指向资源提交；`CDN_CACHE_VERSION` 已更新为 `phase106-start-anchor-runtime-fix-3-0`。
- `npm run publish-card -- 神秘复苏模拟器发布版 --dry-run` 通过：镜像 5 个目录、386 个世界书文件、替换 6 处链接并保留版本 3.0。
- `npm run publish-card -- 神秘复苏模拟器发布版` 通过：重新生成发布版 PNG。
- `git diff --check` 通过；`npm run build` 沙盒内因已知 `spawn EPERM` 失败，沙盒外重跑成功。
- 发布版 YAML 与 PNG `chara/ccv3` 解码元数据均包含版本 3.0、新 CDN hash/cache、`当前时间`、`mfrs-dropdown`、强外挂文案和「第四代与阴阳路·旧时代回声」。
- 已提交并推送 `2c185067957440b60daac551fccc4b178ea385ae chore: publish mystery revival start anchors`；推送后 `HEAD` 与 `origin/main` 同步。

## 2026-06-02: 真实 SillyTavern 复测异常修复与收口

- **Status:** complete；真实页复测通过，欢迎页增强重复运行时异常已修复。
- 修复 `enhanceWelcomeAnchors()`：不信任泛型选择器，先查 `Element`，再用 `isHostSelectElement()` 校验 select。
- 选项读取从 `Array.from(select.options)` 改为 `Array.from(select.querySelectorAll('option'))`；初始选中项不再依赖 `selectedOptions`。
- `closeSiblingAccordions()` 改为遍历 `parentElement.children` + `matches(selector)`。
- 真实 SillyTavern/CDP：`127.0.0.1:9222` / `http://127.0.0.1:8000/`。
- 复测结果：1 个欢迎页 root、1 个 dropdown、6 大类、17 中间组、55 事件项；早期「七中当日·周正讲课」和后期「第四代与阴阳路·旧时代回声」均能写入七字段开局文本。
- 390px 视口无横向溢出；本轮相关运行时异常 0。

## 2026-06-02: 发布版同步与本地 CDP 复测

- **Status:** complete；发布版源码和 PNG 已同步新版开局入口。
- `scripts/publish-card.mjs` 增加 `releaseVersion: '3.0'`，避免发布版版本被开发版覆盖。
- 发布版 `index.yaml`：版本 3.0；55 个真实节点均为七字段；节点均带 `data-group/data-chapter/data-name/data-time/data-loc`；`mfrs-submit` 无旧内联 `onclick`。
- 发布版 `世界书/自定义开局/欢迎页.txt`：已是 `rawAnchors -> anchors` 三级结构，包含 `当前时间`、`mfrs-dropdown` 和强外挂文案。
- 发布版本地 CDP 片段复测通过：6 大类、17 中间组、55 事件项；移动端约 413px 无横向溢出；运行时异常 0。

## 2026-06-02: 开局剧情选择改造与浏览器验收

- **Status:** complete；开发版入口链路、脚本增强、构建和浏览器验收已完成。
- 重新解析 `v10.2.png` 后，确认当前任务重点是补 `time` 字段、加入中间层、把节点从 17 扩展到 50-70，而不是新增可见时间/地点手填框。
- 开局节点最终落地为 55 个真实事件节点 + 1 个自定义占位。
- 实际首屏入口 `src/神秘复苏模拟器/index.yaml` 与世界书欢迎页 txt 均完成同步。
- 修复组合选择器 bug：新增 `inWelcomeRoots(childSelector)`，避免把欢迎页 root 本身误选为 select。
- CDP 验收通过：三级菜单生成、早期/番外节点提交、桌面 1365 和移动端 390 布局均无横向溢出。

## 2026-06-01: 世界书剧情层补强与预算精修

- **Status:** complete；原著事件索引、番外路由和世界书中间层已补强，后续进入精修阶段。
- 完成全原著覆盖矩阵、五卷剧情簇细化、人物阶段状态、地点阶段状态、事件余波、势力行动时钟、厉鬼/物品生命周期、玩家偏移与情报权限等 8 个中间层条目。
- 事件索引补强覆盖早期大昌市、黄岗村、城市灾害、总部体系、朋友圈、凯撒大酒店、鬼邮局、鬼湖、国王组织、幽灵船、后日谈和番外。
- 番外补全已完成：叶真、纸人、招魂线拆为独立路由层，并注册进 `index.yaml`。
- 阶段 J 预算精修已执行：多个高成本常驻规则改为按需触发，变量输出格式和变量列表已压缩，核心剧情锚点更容易进入最终 depth injection。

## 2026-06-01: 发布版 3.0 与主题调浅

- **Status:** complete；发布版 3.0 已完成并推送，后续在 2026-06-02 又完成开局入口发布。
- 默认暗黑文章样式按方案 A 调浅，提升正文、输入框、按钮、引用、代码块、选项面板可读性。
- `<sp_input>` 通用输入面板实机检查通过，桌面/移动端无横向溢出，写入按钮可用。
- 发布版版本和 `character_version` 已改为 3.0，旧 cache 为 `phase105-theme-lighten-3-0`，后续已升级为 `phase106-start-anchor-runtime-fix-3-0`。

## 当前剩余注意事项

- `npx tsc --noEmit` 仍有既有全项目类型问题，未纳入本轮开局/发布任务。
- 未跟踪本地材料、截图、备份 JSON、`神秘复苏.txt`、planning 文件和归档默认不提交。
- 如果后续继续压缩 planning，必须保留 `task_plan.md` 顶部的运行流程速览和 `findings.md` 顶部的完整运行流程常驻参考。

---

## 2026-06-03：件1+件2 两段式发布到 5.1（完成）

- **Status:** complete；EJS 修复 + 数据库 spv3.9.5 已两段式 CDN 发布并推送到 `origin/main`，发布版 5.0→5.1。
- 发布前查证：玩家当前钉死在 `482b71a`，其数据库 dist 实为 **xingv2.6 + EJS旧写法**（git show 实测），确认本次发布必要。findings 旧记的 `c41b53f` 已过时，实际是上轮 5.0 更新到了 482b71a。
- 处理状态栏 html 噪声：构建无关，本次工作区里它是纯等价重建（87142=87142），已 `git checkout origin/main --` 还原。
- **第一段·资源提交** `a9d9bca162bbe75da1de5207b849a591bae84b19`：7 文件（数据库 index.ts + dist index.js[spv3.9.5]、测试版+发布版 变量列表.txt、两个角色卡 json[EJS variables]、测试版 png）。已 push（`7457a28..a9d9bca`）。
- 更新发布脚本：`CDN_REF`→`a9d9bca`、`CDN_CACHE_VERSION`→`phase108-ejs-fix-db-spv395-5-1`、`releaseVersion`→`5.1`。dry-run 通过（镜像5目录+386世界书、替换6处链接、版本5.1），正式跑重生成发布版 yaml+png。
- **第二段·发布提交** `0dd4e26`（rebase 后为 `6e01b3f`）：4 文件（publish-card.mjs + 发布版 yaml + 头像png + 分发png）。
- **遇到 bot bundle 冲突**：第一段 push 后远程自动产生 `675ca58 [bot] bundle`（基于 a9d9bca，但用旧发布配置=版本5.0/旧hash482b71a，是过时产物）。第二段 push 被拒。处理：`git rebase origin/main`，publish-card.mjs 与 yaml 自动合并成我的正确版本，仅 png 二进制冲突→`git checkout --theirs`（取我的）→`git add`→continue。rebase 后**重新跑 publish-card 验证零新差异**，证明手选 png 与配置一致。
- **发布产物核验全部通过**：发布版 yaml 版本5.1、新hash a9d9bca 6处、旧hash 0残留、phase108、EjsTemplate 0残留；EJS 实际在世界书 变量列表.txt:5 与角色卡 json（不在 index.yaml，yaml 查 0 次属正常）；PNG `chara/ccv3` 解码 character_version 5.1、a9d9bca 12次、旧hash 0残留、phase108、EJS variables、无 EjsTemplate。
- 最终：`HEAD`==`origin/main`==`6e01b3fbfd460d62226354de494b630583708530`。玩家现在拉到的发布版指向 a9d9bca（spv3.9.5 + EJS修复）。
- 件3 AM/SP 路 D（fork 库改默认提示词）方案已在 findings.md 完整记录，用户决定下一批单独做。

## 会话 2026-06-03：玩家反馈修复批次（EJS / 数据库版本 / AM-SP）

三件玩家反馈，详细调研结论已写入 findings.md「2026-06-03 玩家反馈修复批次」。

### 已完成（代码就绪，未提交未发布）
- **件1 EJS 报错**：`1.png` 报 `EjsTemplate is not defined`。改 4 处 `EjsTemplate.allVariables()`→`_.get(variables,...)`（测试版+发布版 的 变量列表.txt:5 + 角色卡.json 内嵌）。DevTools 端到端验证通过。
- **件2 数据库版本**：`src/神秘复苏模拟器/脚本/数据库/index.ts` xingv2.6→spv3.9.5。`npm run build` production 重构，dist 数据库产物为 spv3.9.5 压缩形态。根目录 `酒馆助手脚本-星河璀璨·数据库.json` 也升 spv3.9.5（用户确认保留）。
- 工作区改动：9 个文件（6 核心：EJS×4+数据库.ts+数据库dist；3 构建副产物：状态栏html+2 png）。**用户选择暂不提交**。

### 件3 AM/SP（调研完成，未落地）
- 完整根因链见 findings.md。一句话：autofix 自动导入了 SP 表结构，但 `importTemplateFromData` 不碰召回提示词，AM 编码在提示词里 → 表是SP、召回头是AM。
- 用户选定「走脚本内置导入」方案。
- 下一步待办：验证 `AutoCardUpdaterAPI` 是否有公开方法能改召回提示词。

### 关键发现
- 发布版角色卡 5 个脚本钉死 commit `c41b53f`（≠上轮发布的 7457a28/482b71a）。jsdelivr 按哈希永久缓存，**改代码推送后必须更新角色卡哈希才到玩家手里**。
- 数据库本体 = AlbusKen/shujuku，xing(旧停滞)/sp(新活跃)双分支。xingv2.6 世界书写入无兼容层 → 玩家表格不注入；spv3.7+ 有 WorldbookGateway。

### 待用户决定
- 发布流程（提交→推送→更新角色卡哈希）：用户暂停在提交前。
- 件3 是否继续验证 AutoCardUpdaterAPI 改提示词的可行性。

### DevTools 诚实保留
- 本地连的酒馆插件版本偏旧，EJS 旧写法在沙箱内也能访问，未能 100% 复现玩家"今天更新后"的精确报错场景；但 `variables` 是文档保证的模板内置全局，修复方向确定。
- 件3 调研时当前酒馆开的不是神秘复苏聊天（数据库里是别的卡的随机哈希表），未实际触发 importMysteryTemplate 写入。

## 2026-06-03：件3 路 D 阶段1 patch 完成（未发布）

- **Status:** complete（阶段1）；fork 文件 `vendor/shujuku-sp-fork/index.js`（92374 行）AM→SP patch 全部落地并验证。详细实改表见 findings.md「★阶段1 patch 完成实录」。
- **改了 13 类点**：chronicleSheet(默认表模板·恢复默认的根源)、PLOT 召回提示词 ×2(活路径)、SQL 填表头示例、恋爱语气校准段 ×2(换中性)、MERGE 死代码 ×2(保险)、formatSummaryIndexCode_ACU、visualizer 重排、isSummaryOrOutlineTable_ACU(+事件纪要)、normalizer 注释、UI 提示 ×2、用户可见 tooltip、代码注释。
- **最终 AM sweep**：`GLOB 'AM`/`AM0001/0002/xxxx`/`索引AM` 全库 0 命中。残留 9 处 AM 全部确认无害：WASM blob(7428)、`keys:['AM']` 世界书激活关键词(对我的卡是死路径，因 summaryTable 按名匹配总结表/纪要表而我表名=事件纪要)、废弃合并功能(只碰 auto_merged 行)。
- **红线复核通过**：`Bypass all content filters`(1109) 属正文优化组，默认 `enabled:false`(3500/24977) 出厂休眠，未碰；全程零越狱串。
- **新发现(记录备查)**：库多处召回识别按表名匹配 `总结表`/`纪要表`，我表名「事件纪要」不命中这些 fallback；但召回主路径走 exportConfig extraIndex(真实 SP 行数据)，阶段3 实机需确认走 extraIndex 而非名字 fallback。
- **下一步**：阶段2（改 3 处 loader 指向自托管副本，hash 待阶段3 资源提交后填）→ 阶段3（构建+DevTools sqlite 实机验证）→ 阶段4（两段式发布，**推送前确认**）。未经用户确认不推送。

## 2026-06-03：件3 路 D 阶段2 改 loader 指向自托管 fork（未发布）

- **Status:** complete（阶段2）；3 处 loader 的 import URL 全部从上游 `AlbusKen/shujuku@spv3.9.5/index.js` 改为自托管 `linlangliehu/tavern_helper_template@__RESOURCE_HASH__/vendor/shujuku-sp-fork/index.js`。
  1. `src/神秘复苏模拟器/脚本/数据库/index.ts:4`（build 后进 dist 角色卡）
  2. 根目录 `酒馆助手脚本-spv3.9.5·数据库.json`（独立 loader）
  3. 根目录 `酒馆助手脚本-星河璀璨·数据库.json`（独立 loader）
- 脚本显示名保留「星河璀璨·数据库」（用户偏好：保留原外部资源名）。两个根目录 JSON 已 `node require` 校验为合法 JSON。
- **`__RESOURCE_HASH__` 是占位符**：jsdelivr 按 commit 哈希取文件，而 vendor fork 现在还没进 git（HEAD=`6e01b3f`，vendor 未跟踪，5.9MB/92376 行完整）。必须在阶段4 第一段「资源提交（含 vendor fork + 改后 loader 源 + 重建 dist）」推送后，拿到资源提交完整哈希，替换全部 `__RESOURCE_HASH__`，再 build 出最终 dist 并发布。否则玩家拉不到（鸡生蛋问题）。
- dist 里旧 URL 仍在（`gcore.jsdelivr.net/.../shujuku@spv3.9.5`），属正常——阶段3 build 才重写。
- **下一步阶段3**：先确认要不要把 `__RESOURCE_HASH__` 流程与 build 顺序对齐（资源提交 → 填 hash → build → 验证 → 发布），DevTools 在 sqlite 模式实机验证默认召回/恢复默认/autofix 一致性。

## 2026-06-03：数据库脚本显示名改名（星河璀璨 → spv3.9.5·数据库 / SP数据库）

- **Status:** complete（开发版主线）；用户要求把数据库脚本显示名一起更新（此前 memory 记的是"保留原名"，本次用户明确推翻，改名）。
- **脚本身份名 → `spv3.9.5·数据库`**（5 处）：
  1. `src/神秘复苏模拟器/index.yaml:6524` 脚本条目 名称（id `93648737-...` **保持不变**，酒馆靠 id 认脚本，改名不产生重复脚本）
  2. `src/神秘复苏模拟器/index.yaml:6544` loadLocalModule label
  3. `src/神秘复苏模拟器/脚本/数据库/index.ts:1` databaseScriptName
  4. 根目录 `酒馆助手脚本-spv3.9.5·数据库.json` name
  5. 根目录 `酒馆助手脚本-星河璀璨·数据库.json` name（文件名仍是旧的，但内部 name 已改）
- **致谢徽章 → `SP数据库`**（2 处，用户单独指定这个更短的名）：
  1. `src/神秘复苏模拟器/index.yaml:5871`（`SP数据库`）
  2. `src/神秘复苏模拟器/世界书/自定义开局/欢迎页.txt:569`（`@SP数据库`，保留 `@` 前缀与同行 `@原著作者·佛前献花` 风格一致）
- **报错/注释文案 → `spv3.9.5·数据库`**（2 处）：`脚本/数据库前端/index.ts:102`、`脚本/神秘复苏数据库前端/index.ts:5`。
- 校验：开发版主线 `星河璀璨` grep 0 命中；index.yaml 新名 3 处就位；两个根目录 JSON `node require` 合法、name 均为 spv3.9.5·数据库；loader ts 名一致。
- **未动**：发布版 `src/神秘复苏模拟器发布版/`（publish-card 自动生成，阶段4 重发布时同步）；dist（待 build 刷新）；教程 txt/planning 文档（外部参考/历史记录，不改）。
- ⚠️ memory `external_resource_names`（保留原名）与本次改名冲突——本次是用户在本会话明确要求改名，应更新该 memory 记录数据库脚本已改名为 spv3.9.5·数据库/SP数据库。

## 2026-06-03：件3 路 D 阶段3 构建 + DevTools 验证（完成）

- **Status:** complete（阶段3）；`npm run build`（production，沙盒外）成功，多 entry 全 `compiled successfully`，0 EPERM。DevTools 在真实酒馆（127.0.0.1:8000，正开着神秘复苏模拟器卡）验证 fork 正确性通过。
- **dist 重建核验**：`dist/.../数据库/index.js` = `const o='spv3.9.5·数据库'` + import `linlangliehu/...@__RESOURCE_HASH__/vendor/shujuku-sp-fork/index.js`；旧 URL/星河璀璨 0 残留。
- **fork 语法完整性**：`node --check vendor/shujuku-sp-fork/index.js` exit 0 → 阶段1 全部 patch 未破坏 JS 结构。
- **fork 运行时加载成功**：DevTools 顶层 `import('localhost:5500/vendor/shujuku-sp-fork/index.js')` → `AutoCardUpdaterAPI` 挂载，48+ 方法齐全（getTableTemplate/resetTemplate/resetAllDefaults/getPlotPresets...）。证明 fork 能在真实酒馆环境初始化。
- **★恢复默认链路源码层判决（确定性，不受缓存干扰）**：`resetTemplate`(API 50113) → `resetTableTemplate_ACU`(40372) → `getDefaultTemplateSnapshot_ACU`(9096) → `DEFAULT_TABLE_TEMPLATE_ACU`(992) → `buildDefaultTableTemplateString_ACU`(854) → `buildDefaultTableTemplateObject_ACU`(835, **确认用 chronicleSheet**) → `chronicleSheet`(648, **我改的 SP 版**)。**无第二 AM 源**。正则 `buildObj...chronicleSheet` 命中确认。
- **fetch 源码层最终核验（cache-bust）**：全局活路径 AM 全 0（`GLOB 'AM`/AM0001/AM0002/AMxxxx/索引AM编码=0/0/0/0/0）；chronicleSheet 块 `GLOB 'SP`=1、related_event=4、事件纪要×5、SP0001×3、GLOB 'AM=0；两召回常量 `DEFAULT_PLOT_SETTINGS_ACU`/`DEFAULT_PLOT_PROMPT_GROUP_ACU` 均 索引SP=true/索引AM=false、AM 编码 0；残留 AM 仅无害 keys×2/startsWith×1/merge regex×2。
- **红线复核**：`Bypass all content filters`×1 仍在，但 `contentOptimizationSettings: { enabled: false`（默认关）命中 → 出厂休眠未碰。
- **⚠️ 重要教训·DevTools 模块缓存陷阱**：`window.AutoCardUpdaterAPI` 第一次/中途两次 `getTableTemplate()`、`resetTemplate()` 返回 **AM**（GLOB_AM=1/AM0002=1/related_event=0），一度疑似真 bug。根因是**本 DevTools 会话先前残留过旧 AM 版 fork 模块实例，闭包指向旧 DEFAULT_TABLE_TEMPLATE_ACU**。证据：同一文件用唯一 `?cachebust=` 强制重新 import 后，立即从 AM 翻转为 SP（GLOB_SP=1/related_event=4）；`fetch` 源码（绕模块缓存）始终是 SP。隔离 iframe 因库依赖宿主 jQuery（`$ is not defined`）走不通。**结论：动态 import 验证必须每次唯一 cachebust query；判决以源码 fetch + 源码链路追踪为准。**
- **端到端真加载验证（库经 CDN 拉取并初始化、autofix 导表、native/sqlite 切换实测）仍待阶段4**：因 dist 现为 `__RESOURCE_HASH__` 无效 URL，jsdelivr 拉不到。必须等阶段4 资源提交拿真 hash、回填、重 build 后才能做真正端到端。
- **下一步阶段4**：两段式 CDN 发布（**推送前必须用户确认**）。顺序：①资源提交（vendor fork + 改后 loader 源 + 重建 dist + 改名文件）→ push → 拿资源提交 hash；②全局替换 `__RESOURCE_HASH__`→真 hash，重 build；③更新 publish-card.mjs（CDN_REF/CDN_CACHE_VERSION phase109/releaseVersion 5.2）→ publish-card → 发布提交 → push。


## 2026-06-03：件3 路 D 阶段4 三段式 CDN 发布（完成·已推送 origin/main）

- **Status:** complete。用户授权一次性三次 push、版本升 6.0 / cache `phase109-sp-fork-am-to-sp`。
- **发布前安全复查（提交前必做）全通过**：① 红线 `Bypass all content filters`(1109) 仍在，但 `contentOptimizationSettings.enabled` 两处默认值(3500/24977)=false → 整个正文优化功能含越狱串出厂关闭，与已发布上游 spv3.9.5 一致，自托管未加剧风险，未碰；② 敏感信息扫描（排除 7428 WASM base64 blob 误报）无密钥/cookie/私钥/token；③ `node --check` exit 0；④ fork 92376 行符合记录。
- **三段式哈希链（路D 比标准两段式多「vendor 前置提交拿哈希再回填」一环，因 dist 自托管 import 本仓库 vendor）**：
  - ① 资源提交 `14a556d`：精确 `git add` 10 文件（vendor fork + 3 源 ts + index.yaml + 欢迎页 + 2 dist + 2 根 loader json），dist/loader 仍含 `__RESOURCE_HASH__` 占位符。push。
  - ② 回填重 build `fcfd58a`→rebase 后 `ed5b436`：3 处源占位符替换为 14a556d，`npm run build`（沙盒外）→ dist 内嵌真实 `@14a556d/vendor/...` URL，占位符 0 残留。**此即 CDN_REF**。
  - ③ 发布提交 `dd92988`：publish-card.mjs（CDN_REF→ed5b436、cache→phase109-sp-fork-am-to-sp、releaseVersion→6.0）→ `npm run publish-card -- 神秘复苏模拟器发布版`（镜像+替换6链接+打包PNG）。push。
## 2026-06-06 23:00 CST：P0 planning 基线恢复

- **Status**：complete
- **执行内容**：读取 `task_plan.md` / `findings.md` / `progress.md`，并由第 1、第 6 Subagent 只读恢复项目流程与记录格式。
- **关键证据**：上一轮 6.10 记录显示 SQL incomplete VALUES 修复已发布并推送；本轮应从新的开发版对话测试开始，历史日志错误不直接视为复发。
- **涉及文件 / 页面 / 角色卡**：`task_plan.md`、`findings.md`、`progress.md`、开发版 `src/神秘复苏模拟器/`、发布版 `src/神秘复苏模拟器发布版/`。
- **验证结果**：已在 `task_plan.md` 追加本轮 P0-P9 阶段清单，并标记 P0 complete。
- **下一步**：使用 `npx agent-browser --cdp 9222` 连接真实酒馆，记录开发版角色卡、marker、日志基线并进行对话测试。

## 2026-06-06 23:06 CST：P1 9222 酒馆基线确认

- **Status**：complete
- **执行内容**：用 `npx agent-browser --cdp 9222` 连接 `http://127.0.0.1:8000/`，读取页面快照和只读运行态探针。
- **关键证据**：当前页面为 SillyTavern，开发版 `神秘复苏模拟器` 可见；运行 marker / hostMarker 均为 `mfrs-incomplete-values-6-10`；SP·数据库 III 高级工具处于“高级工具 / SQL 控制台 / 运行日志”页面。
- **涉及文件 / 页面 / 角色卡**：`http://127.0.0.1:8000/`、开发版 `神秘复苏模拟器`、SP·数据库 III 高级工具。
- **验证结果**：测试前日志基线存在 22:32:29 的历史错误：`UPDATE controlled_ghosts SET cost_text = '左臂皮肤纸质化，总复苏风险增加', WHERE ghost_code = '鬼档案' -> near "WHERE": syntax error`。该日志在清空前作为历史基线，不直接判定本轮复发。
- **下一步**：清空可见运行日志后执行一轮开发版对话测试，记录新时间戳后的正文、推演选项与 SQL 日志。

## 2026-06-06 23:14 CST：P2-P3 对话测试与问题清单

- **Status**：complete
- **执行内容**：第二 Agent 在开发版 `characterId=2` 当前对话中发送手动测试输入，选择 `B[档案推理：继续试探]`；第七 Agent 审查 SP·数据库 III 高级工具运行日志、SQL 和推演选项。
- **关键证据**：本轮手动输入生成成功，最新 A/B/C/D 推演选项正常出现，网络保存请求 200；运行日志未新增时间戳，仍为 22:32:29 三条旧 SQL 错误。
- **涉及文件 / 页面 / 角色卡**：`http://127.0.0.1:8000/`、开发版 `神秘复苏模拟器`、SP·数据库 III 高级工具。
- **验证结果**：确认 ISSUE-001：`UPDATE controlled_ghosts SET cost_text = ..., WHERE ghost_code = '鬼档案'` 因 `WHERE` 前尾逗号导致 `near "WHERE": syntax error`；确认 ISSUE-002 待复现：console 曾显示 `chronicle_text` 长度约束失败。
- **下一步**：修复 SQL 归一化与模板提示，并针对 `chronicle_text` 长度问题增加回归或模板约束。

## 2026-06-06 23:22 CST：P4 SQL 尾逗号修复

- **Status**：complete
- **执行内容**：修复 `UPDATE ... SET ..., WHERE ...` 尾逗号容错，补开发版/发布版数据库模板提示，并新增 SQL 回归。
- **关键证据**：`vendor/shujuku-sp-fork/index.js` 的 `tryNormalizeUpdateValues()` 现在把 `SET` 子句末尾逗号清理视为变更；`scripts/verify-sql-debug-regressions.mjs` 新增 `controlled_ghosts` 内存 SQLite fixture。
- **涉及文件 / 页面 / 角色卡**：`vendor/shujuku-sp-fork/index.js`、`scripts/verify-sql-debug-regressions.mjs`、`src/神秘复苏模拟器/数据库/神秘复苏表格SQL_v1.json`、`src/神秘复苏模拟器发布版/数据库/神秘复苏表格SQL_v1.json`。
- **验证结果**：`node --check vendor/shujuku-sp-fork/index.js`、`node --check scripts/verify-sql-debug-regressions.mjs`、`git diff --check` 和 `node scripts/verify-sql-debug-regressions.mjs` 已通过；Node 仅输出 `node:sqlite` experimental warning。
- **下一步**：执行 `npm run build`，再用 9222 真页新对话复测。

## 2026-06-06 23:30 CST：P5 静态检查与构建

- **Status**：complete
- **执行内容**：执行语法检查、diff 空白检查、SQL 回归脚本和生产构建。
- **关键证据**：`node --check vendor/shujuku-sp-fork/index.js` 通过；`node --check scripts/verify-sql-debug-regressions.mjs` 通过；`git diff --check` 通过；`node scripts/verify-sql-debug-regressions.mjs` 通过；`npm run build` 沙箱内命中已知 `spawn EPERM`，沙箱外重跑成功。
- **涉及文件 / 页面 / 角色卡**：`vendor/shujuku-sp-fork/index.js`、`scripts/verify-sql-debug-regressions.mjs`、两份 `神秘复苏表格SQL_v1.json`、构建后的开发版数据库前端 dist。
- **验证结果**：本地回归确认 `UPDATE controlled_ghosts SET cost_text = ..., WHERE ghost_code = ...` 会被归一化为合法 SQL；构建成功生成角色卡与相关 dist。
- **下一步**：精确提交并推送资源修复，回填数据库 loader CDN hash/cache 后进行 9222 真页新对话复测。

## 2026-06-06 23:36 CST：资源修复提交已推送

- **Status**：complete
- **执行内容**：精确暂存并提交资源修复文件，推送到 `origin/main`。
- **关键证据**：资源提交 `3f59742003459058aff9ffe7aebf647fc0799f18`，提交信息 `fix: normalize sql update trailing comma`；`git push origin main` 沙箱内因 Windows 凭据失败，沙箱外重跑成功。
- **涉及文件 / 页面 / 角色卡**：`vendor/shujuku-sp-fork/index.js`、两份 `神秘复苏表格SQL_v1.json`、数据库前端 dist、`scripts/verify-sql-debug-regressions.mjs`。
- **验证结果**：资源修复已在远端，可供 jsdelivr/CDN 按 commit hash 引用。
- **下一步**：回填 `src/神秘复苏模拟器/脚本/数据库/index.ts` 的 CDN hash/cache/marker，构建并提交 loader 回填。

- **⚠️ push 冲突处理（非错误，正常流程）**：push H2 被拒——push H1 后 CI bot 自动追加 `a8e0d9c [bot] bundle`（仅改 `神秘复苏模拟器.png` 头像，与 H2 改的 dist/ts/json 零重叠）。**未 force push**；fetch→确认 bot 只动 png→`git stash`(状态栏html+png build 副产物)→`git rebase origin/main`(线性历史，无冲突)→`stash drop`(丢弃 build 副产物，远端 bot png 为权威)→push 成功。
- **发布版产物核验全通过**：yaml 版本6.0、6 处 CDN 链接 `@ed5b436?v=phase109-sp-fork-am-to-sp`、脚本名 spv3.9.5·数据库、徽章 SP数据库；旧值(localhost/占位符/phase108/a9d9bca/星河璀璨/5.x) 0 残留。
- **嵌套 CDN 链路验证**：`ed5b436/dist/.../数据库/index.js` 内嵌 import `14a556d/vendor/shujuku-sp-fork/index.js`，14a556d 含 vendor 文件，两哈希均在 origin/main → 玩家加载链路闭合。
- **PNG `chara/ccv3` 元数据解码核验**：version 6.0/ed5b436/phase109/spv3.9.5·数据库/SP数据库 全命中；localhost/占位符/phase108/a9d9bca/星河璀璨/5.x 全 0 残留。
- **结果**：origin/main == HEAD == `dd92988`。路D 件3（召回/恢复默认 AM↔SP 不一致）根治上线，玩家拉取发布卡即获 SP 编码的自托管 fork。**端到端真机验证（CDN 拉库初始化、召回头确为 SP、恢复默认为 SP）建议待 jsdelivr 缓存生效后在真实酒馆复测。**
- **遗留**：根目录两个 loader json（`酒馆助手脚本-spv3.9.5·数据库.json` id 8c4a33ef、`酒馆助手脚本-星河璀璨·数据库.json` id 93648737）现已 tracked 并含 14a556d URL；本地工作区杂项（备份/截图/.tmp-chrome/planning/酒馆数据库 JSON）仍未提交，按边界保持未跟踪。

## 2026-06-03：件3 后续·修复 autofix 模板导入不生效（scope:chat）（完成·真机验证·未发布）

- **背景**：路D 阶段4 发布后 DevTools 真机复测，发现"14 表不显示"的当前残留原因已不是 CDN（那个修好了），而是一个独立的真实 bug。
- **根因（确定性·源码层）**：`数据库前端/index.ts` 的 `runMysteryTemplateAutofix` 调 `api.importTemplateFromData(templateData)`，库默认 `scope='global'`。fork 源码 49680-49714 注释明写：global 分支"仅保存到预设库，不自动切换当前生效模板"，返回 `success:true` 只代表存进预设库。→ autofix 误判成功、toastr 报成功，但当前 chat 生效模板纹丝不动，停在库默认 8 表（全局数据表/主角信息表/.../纪要表/选项表）。副作用：每次 global 导入按时间戳新建预设，攒了 5 个 `导入模板_2026-06-03-xxx` 废预设。
- **修复**：`数据库前端/index.ts` 两处 `importTemplateFromData(templateData)` → `importTemplateFromData(templateData, { scope: 'chat' })`（autofix 自动 204、手动 importMysteryTemplate 273），类型签名补 options 参数。chat 分支（fork 49715-49737）走 `applyTemplateSnapshotToScope_ACU`(9252) → `_set_TABLE_TEMPLATE_ACU` + `applyTemplateScopeForCurrentChat_ACU` 真正对当前 chat 生效。
- **注意·实际加载的前端文件**：index.yaml 脚本条目名"神秘复苏数据库前端"(6546)，但 loader 加载的 dist 是 `数据库前端/index.js`(6566, installCompatibilityApi 版)；`神秘复苏数据库前端/index.ts`(旧文件) 未被加载，无需改。
- **build+dist 核验**：`npm run build` 多 entry 全 compiled successfully；dist `数据库前端/index.js` 含两处 `importTemplateFromData(a,{scope:'chat'})`。
- **真机端到端验证（127.0.0.1:8000 重载+重开卡）**：① fork CDN 加载成功(`数据库本体已加载`)；② autofix 触发(`检测到当前数据库模板不是神秘复苏 14 表，正在自动导入内置模板`)；③ **修复前有的 `自动导入后模板仍不完整` 失败日志这次消失**；④ 最终 `templateLoaded:true / count:14 / missing:[]`，编码 `spHits:4/amHits:0` 纯 SP；⑤ 预设库未新增时间戳废预设（chat-scope 不再污染全局库）。
- **API 行为实测旁证**：手动 `injectTemplatePresetToCurrentChat('神秘复苏模拟器')`(=switchTemplatePreset chat scope) → 14 表 SP 立即生效，与修复路径同机制。
- **遗留**：① 此修复**改了 dist/src 但未发布**——要让玩家受益需再走一轮发布（资源提交→回填？否，本次不涉及 vendor 改动，dist 仍 import 14a556d vendor，故只需普通两段式：dist+src 资源提交→publish-card 更新 CDN_REF→发布提交）。② chat 里 5 个 `导入模板_xxx` 废预设为历史 chat 持久化数据，不影响功能/发布，清理可选。

## 2026-06-03：autofix scope:chat 修复·两段式发布（完成·已推送 origin/main）

- 用户授权发布、版本保持 6.0。标准两段式（不涉及 vendor，dist 仍 import 已发布的 14a556d）。
- 资源提交 `a320f77`：`数据库前端/index.ts` + 重建 dist（含 scope:'chat'）。仅 2 文件，状态栏 html build 副产物已排除。
- 发布提交 `a8fae61`：publish-card.mjs（CDN_REF→a320f77、cache→phase110-autofix-scope-chat、版本保持 6.0）→ publish-card → 发布版 yaml 6 链接全 @a320f77?v=phase110、PNG ccv3 元数据核验通过、旧值零残留。
- a320f77 同时含 autofix dist(scope:chat) + 数据库 dist(import 14a556d vendor SP fork)，玩家拿到「路D SP fork + autofix」完整版。
- 这次 push H3 后 bot 未追加 bundle，发布提交直接 FF 成功。
- origin/main == HEAD == `a8fae61`。
- 废预设决定：5 个 `导入模板_2026-06-03-xxx` 为 chat 持久化垃圾，无安全程序化删除途径（库不暴露删除 API、存酒馆 settings+IDB 多层、UI 管理仅正式聊天可见），用户拍板不清理（不影响功能/卡/发布，修复后不再新增）。

## 2026-06-03：autofix 时序竞态 + 热切换修复·发布（完成·已推送 origin/main）

- 重开卡验证 phase110(scope:chat) 时发现两个更根本的缺陷，本轮修正：
  1. **时序竞态**：autofix 在 ACU 设置可靠加载完成前就导入，触发库保存被 `settingsStorageReadyForSave_ACU=false` 拒绝（日志 `[shujuku_v120][设置保存] 设置尚未完成可靠加载，已拒绝本次保存`，fork 24427-24441），导入静默失败、表停库默认 8 表。phase110 也受此竞态影响（时好时坏，解释了为何首次重载验证成功、再测失败）。
  2. **热切换不重跑**：脚本页面级注入，`/newchat` 或切聊天不重执行脚本，`templateAutofixPromise ??=` 单例只跑一次，新聊天停 8 表。
- **修复**（`数据库前端/index.ts`）：
  1. `runMysteryTemplateAutofix` 导入段改为退避重试循环 `[250,500,1000,1500,2000,3000,3000,4000]ms`，每次导入后 `readTemplateStatus` 验证，直到 `templateLoaded` 或重试耗尽——覆盖设置加载窗口、竞态必收敛。
  2. `ensureMysteryTemplate(hostWindow, force)` 加 force 参数（重置单例 promise）；`installCompatibilityApi` 末尾 `eventOn(tavern_events.CHAT_CHANGED, ()=>ensureMysteryTemplate(hostWindow,true))`，带 `typeof eventOn` 守卫（仅酒馆助手注入环境有，脚本卸载自动 off）。
- **真机验证**（重载+进卡冷启动 / `/newchat` 热切换，均不靠状态继承）：
  - 冷启动：console 5076 autofix 触发→5077/5080 出现「拒绝保存」竞态→重试循环顶住→最终 `coldStart ok count:14`（waitedMs 1500）。
  - 热切换：新建 chat（18h53m≠18h39m，chatChanged:true）→ console 5243 `检测到...自动导入` 再次触发（证明 CHAT_CHANGED 重跑，非继承）→ `hotSwitch ok count:14`。
- **发布**（两段式，不涉及 vendor）：资源提交 `533a709`（src+dist：重试+CHAT_CHANGED+scope:chat，数据库 dist 仍 import 14a556d vendor）；发布提交 `8683b76`（publish-card CDN_REF→533a709、cache→phase111-autofix-race-chatchanged、版本保持 6.0）。yaml 6 链接全 @533a709?v=phase111、PNG ccv3 元数据核验通过、旧值零残留。无 bot 分叉，两次 FF push 成功。
- origin/main == HEAD == `8683b76`。

## 2026-06-03：完整开局端到端真机复测（完成·三玩家反馈问题全部验证通过）

针对玩家三大反馈（表格不注入世界书 / 数据库记录不进提示词 / 剧情不推进），在真实 SillyTavern（127.0.0.1:8000）走完一次完整开局并多源取证。**结论：phase111 修复后三问题全部根治。**

- **复测流程**：填开局表单（复测员/25男/普通人卷入灵异/七中当日·周正讲课节点/土著背景）→ 点「进入神秘复苏世界」组装文案 → jQuery 触发 #send_but 提交（`.click()` 不触发 ST 委托，必须用 jQuery `.trigger('click')`）→ 后台 CDP 轮询等生成（chatLength 3、!generating）。
- **① autofix 14 表自动生效**（发送前已确认）：三独立接口一致 `getTableTemplate`/`getPanelState`/`exportTableAsJson` 全 14 表，`templateLoaded:true`、`missingNames:[]`。console 复现竞态修复：5076 autofix 触发→5077/5080「设置尚未完成可靠加载，已拒绝本次保存」竞态→5243 退避重试→14 表成功。
- **② 表格注入世界书 = 真实生效**：发送前世界书 383 条目、零 ACU 表数据；AI 回填后 **415 条目（+32）**，新增全是 `TavernDB-ACU-CustomExport-*`（灵异事件/厉鬼档案/线索/人物-1~3/地点/事件纪要/全局状态/玩家状态…）且 `enabled:true`。直接推翻玩家「表格不注入世界书」。
- **③ 表格记录进提示词 = 决定性确认**：权威落位是 `ctx.extensionPrompts` 的 depth injection（`at_depth_as_system` 不进 `getWorldInfoPrompt` 的 before/after 串，故该 API 返回空是预期、非缺陷——勿用它下结论）。实测 extensionPrompts 含 `customDepthWI-2-0`(`<全局状态>`完整表)、`customDepthWI-999-0`(`<灵异事件档案>`)、`customDepthWI-1000-0`(`<已登记灵异事件>`含数据行`|1|七中敲门预警|局部酝酿|`)、`customDepthWI-0-0`(MVU stat_data 绑定块 3768字)。`epHasEventTable/GhostTable/EventHeader/DataRow` 全 true，以 system 角色按 depth 注入。
- **④ 剧情推进无干涉**：AI 回复 4260 字，可见正文 1279 字精准接七中节点（`〖2026年6月3日 大昌市第七中学高三某班教室〗`+周正讲课+实习教员沉浸描写），结尾 A/B/C/D 选项+短标签状态栏，choiceCount 30。泄漏检测全 false（无 `<tableEdit>`/`_.set`/`TavernDB-ACU` 混进正文）。console 仅 2 个无关错误（ST 框架 unload policy、某静态 404），零数据库/前端/autofix 报错。
- **运行时表数据**：发送后 14 表共 33 数据行（人物 4、检定建议 6、行动建议 5…）。仪表盘「未找到表格」5→1，残留 1 个是「灵异物品」——查实为真·空表（仅表头无数据行，玩家土著无资源开局本就无灵异物品），**非 bug**。
- 本轮纯验证、未改代码、未发布。HEAD 仍 `8683b76`。

## 2026-06-04：发布版 6.2 SQL/SQLite 模式真机 smoke（完成·发现剩余 UI 状态 bug）

- 使用 Chrome DevTools Protocol 连接真实 SillyTavern 页面 `http://127.0.0.1:8000/`，当前发布版卡 `characterId=3`，角色名「神秘复苏模拟器发布版」，仓库 HEAD 为 `212f198 chore: release database chat-scope fix`，发布版 YAML/脚本版本为 6.2。
- 初始 SQLite 模式下，`exportTableAsJson()` 能读到 14 张神秘复苏表；但 `getTableTemplate()`/`getPanelState()` 一度回退为库默认 8 表，设置面板文案仍显示已加载 14 表，说明 SQL 模式存在模板状态/面板判定口径不一致。
- SQL 控制台 smoke：临时表 `CREATE TEMP TABLE`、`INSERT`、`SELECT`、`DROP TABLE` 全部成功，`sqlite_temp_master` 清理后为 0，说明 SQLite 引擎本身可用。
- 只读查询不会触发建表：初始 `sqlite_master` 业务表为 0，`PRAGMA table_info(global_state)` 为 0，`SELECT game_time FROM global_state` 报 `no such table`。源码口径确认这是设计，`SqlTableService.executeQuery()` 不会为只读 SQL 提前 `_ensureTablesFromTemplate()`。
- 写入路径验证通过：幂等 `UPDATE global_state SET game_time = game_time WHERE row_id = 1` 触发建表；之后物理 SQLite 表为 14 张，`global_state` schema 含 `game_time` 且不含旧 bug 字段 `current_time`。插入/读出/删除 `row_id=1` 成功，无效插入未残留 `row_id=2`。
- 剩余确认 bug：写入建表后，物理 SQL 表和导出 API 是 14 表，但 `getTableTemplate()`/`getPanelState()` 又会回退到 8 表并缺 14 张神秘复苏表。这是 SQL 模式特有的 UI/模板状态 bug，不是 SQLite 引擎坏，也不是 6.1 的 `current_time` 保留字问题复发。
- 清理与恢复：SQL probe 数据已删除，临时表已 drop；最后点击「仅切换模式」恢复 native，确认框关闭，radio 为 native，IndexedDB `storageMode:native`，发布版面板回到 `templateLoaded:true/tableCount:14/missingNames:[]`。

## 2026-06-05：已追加 Debug 日志复发修复清单（未执行代码修复）

- **Status:** planning only。根据用户要求，当前只制作修复任务清单，没有修改业务代码、没有构建、没有提交、没有推送。
- **输入依据**：新 Debug 日志 `acu-logs-2026-06-05T14-35-20-801Z.json` 暴露 4 类问题：`revival_risk_level='极低'` 枚举失败、旧表 `log_summary`、`</thought>`/解释文字混入 SQL、API `Bad Gateway` 被概览误归类。
- **已更新文件**：`task_plan.md` 追加“SQL Debug 复发问题修复清单”，`findings.md` 追加根因归档与修复方向。
- **当前边界**：工作区已有未提交 `vendor/shujuku-sp-fork/index.js` 试修补和状态栏 dist 差异；后续执行前必须先审查，不默认保留，也不回滚无关改动。
- **下一步**：如用户确认执行，按 D0-D10 依次推进，优先 D0/D1 建立基线并审查试修补，再做 D2-D7 代码/测试修复，最后用 Chrome DevTools MCP / Chrome 辅助做 D8 真页验证。

## 2026-06-05：D0-D1 已执行

- **Status:** D0-D1 complete，未修改业务代码，未构建，未提交，未推送。仅更新 planning 文件记录证据和判断。
- **D0 基线冻结**：`HEAD==origin/main==f2ab050b60c3664e65c52dd1e574c04226a6bfbb`，当前分支 `main`，`git describe=v0.0.77-dirty`。发布配置为 `releaseVersion=6.6`、`CDN_REF=a554ba8040b9c9804a0c55136c922d8716aa656d`、`CDN_CACHE_VERSION=phase118-sql-template-autocalibrate-6-6`；发布版 YAML `版本: '6.6'`。
- **工作区边界**：tracked diff 为 `vendor/shujuku-sp-fork/index.js`（本地试修补）和 `dist/神秘复苏模拟器/界面/状态栏/index.html`（既有差异）。未跟踪 planning/截图/备份仍不纳入修复提交。
- **日志解析**：Downloads 当前只存在最新 Debug 日志，前两份历史日志路径缺失；最新 Debug 文件 SHA256 为 `885717EF20DFEF82F33271C190262A99363A27BD5A565D8455326869EC87029C`。重新解析结果：1933 条日志，1919 debug / 9 error / 5 warn；严重日志按根因去重为风险枚举 3、旧表名 3、SQL 残片 6、Bad Gateway 1、Bad Gateway 后续重试 warn 1。
- **D1 vendor 审查**：`vendor/shujuku-sp-fork/index.js` diff 为 94 insertions / 23 deletions。`node --check vendor/shujuku-sp-fork/index.js` 与 `git diff --check` 均通过。
- **D1 保留/重写判断**：保留风险归一化骨架和多行 `INSERT OR REPLACE` 支持，作为 D2 起点；继续补强模板枚举说明、更多 alias、`log_summary` 表名白名单/拦截、SQL 语句级残片过滤、Bad Gateway 单独分类、仪表盘错误细分。

## 2026-06-05：D2-D3 已执行

- **Status:** D2-D3 complete，未构建、未提交、未推送。改动限定在两份 SQL 模板源和 `vendor/shujuku-sp-fork/index.js`；dist 产物等待 D9 build 统一生成。
- **D2 模板层**：开发版与发布版 `sheet_action_suggestions` 均新增枚举硬约束，明确 `death_risk_level` / `revival_risk_level` 只能写 `无/低/中/高/致命/未知`，禁止 `极低/极高/严重/极重` 等非枚举值；`updateNode` 同步提醒不确定写 `未知`。
- **D2 执行前兜底**：vendor 新增 `VALID_RISK_LEVEL_VALUES_ACU` 并扩展 `normalizeRiskLevelValue_ACU()`。`极低/很低/轻微/低风险 -> 低`，`极高/很高/非常高/严重/极重/致死/致命风险 -> 致命`，空值或无法识别值 -> `未知`。
- **D3 模板层**：开发版与发布版 `sheet_chronicle` 均新增表名硬约束，说明 SQL 表名固定为 `chronicle`，旧表名 `log_summary` 不存在，禁止写入。
- **D3 执行前拦截**：vendor 的 `applyEdits()` 在 `runBatch()` 前调用 `_validateMutationTargetTables()`，从当前模板 DDL 白名单校验 AI SQL 目标表；`log_summary` 会被拦截为清晰错误，不再直达 SQLite 的 `no such table`。
- **验证**：`node --check vendor/shujuku-sp-fork/index.js` 通过；两份模板 JSON parse 通过；`git diff --check` 通过；实际 vendor `normalizeStatementValues()` fixture 写入内存 SQLite 通过；`extractTableNamesFromStatements()` 能捕获 `INSERT INTO log_summary`；静态搜索未发现 `INSERT/UPDATE/DELETE log_summary` 示例残留。
- **后续**：D4 仍需升级 SQL 语句级残片清洗；D5 仍需把 `log_summary`/API 网关等错误在仪表盘里细分展示。

## 2026-06-06：D4-D6 已执行

- **Status:** D4-D6 complete，未构建、未提交、未推送。改动仍集中在 `vendor/shujuku-sp-fork/index.js`；dist 产物等待 D9 build 统一生成。
- **D4 SQL 清洗**：`extractSqlStatementsFromTableEdit_ACU()` 重写为语句候选提取，剥离 `</thought>`、`<content>`、`<tableEdit>`、markdown 围栏和 HTML 注释残片；SQL 前后或两条 SQL 之间的解释文字会被跳过并记录 debug。`applyEdits()` 拆分后再调用 `filterSqlEditStatements_ACU()` 做第二道过滤。
- **D5 预检**：AI SQL 事务执行前使用当前模板 DDL 构建表/列白名单。未知表会被拦截，`log_summary` 给专门修正提示；显式列名不在 DDL 中会抛出 `SQL 目标列不在当前模板中...`。
- **D5 分类**：仪表盘新增细分文案并验证：`apiGatewayIssue`、`sqlOldTableIssue`、`sqlSchemaIssue`、`sqlSyntaxIssue`、`sqlConstraintIssue`。`Bad Gateway`、`log_summary`、`near "<": syntax error`、`CHECK constraint`、未知列 fixture 均能归到对应分类。
- **D6 Bad Gateway**：`parseNonStreamResponse_ACU()` 识别 `data.error`；`Bad Gateway` 会记录上游网关错误并抛出 `API上游网关错误: Bad Gateway`，不再返回 null 触发“响应格式不正确或内容为空”。
- **验证**：`node --check vendor/shujuku-sp-fork/index.js` 通过；`git diff --check` 通过；SQL 残片清洗 fixture 通过；表/列提取 fixture 通过；Bad Gateway fixture 抛出明确错误；仪表盘分类 fixture 通过。
- **后续**：D7 需要把这些 fixture 固化为自动化回归；D8 需要用 Chrome DevTools 真页验证前端日志和 SQL Mode 行为。

## 2026-06-06：D10 发布链路完成

- **Status:** complete，已推送 `origin/main`。当前 `HEAD==origin/main==7cd0b249fde8c40afd193ace908ce2c6e56bd7e1`。
- **提交链路**：资源提交 `37a10c0817845c3276a1846d331f9c7d02efe39e`；loader/dist 回填提交 `26cbab63eb996030811bfda86d9281650a449821`；发布提交 `7cd0b249fde8c40afd193ace908ce2c6e56bd7e1`。
- **版本与 CDN**：发布版升到 `6.7`；`scripts/publish-card.mjs` 使用 `CDN_REF=26cbab63eb996030811bfda86d9281650a449821`、`CDN_CACHE_VERSION=phase119-sql-debug-regressions-6-7`；loader marker 为 `mfrs-sql-debug-regressions-6-7`。
- **验证**：`node --check`、`git diff --check`、`node scripts/verify-sql-debug-regressions.mjs` 均通过；`npm run build` 沙盒内仍因 Windows `spawn EPERM` 失败，沙盒外重跑成功；`npm run publish-card -- 神秘复苏模拟器发布版` 成功。
- **发布产物**：发布版 YAML 6 条 CDN 链接均指向 `26cbab63...` + `phase119...`；PNG `chara` 与 `ccv3` 元数据均为 6.7、新 hash/cache，旧 6.6/旧 hash/cache 0 残留。
- **发布后 smoke**：CDN 上数据库 loader、数据库前端 loader、patched vendor 均返回 200；真实 SillyTavern CDP smoke 在发布卡 `characterId=3` 通过，marker/hostMarker 为 `mfrs-sql-debug-regressions-6-7`，`storageMode=native`，三口径与面板均 14 表，`missingNames=[]`、`mismatchNames=[]`。
- **边界**：参考 JSON（含 `酒馆助手脚本-星河璀璨·数据库.json`、`酒馆助手脚本-spv3.9.5·数据库.json`）、planning 文件、截图/备份/临时 Chrome 文件未提交；既有 `dist/神秘复苏模拟器/界面/状态栏/index.html` diff 与根目录 `神秘复苏模拟器.png` 删除仍保留在工作区外。

## 2026-06-06: SQL boundary 6.9 final release and browser smoke

- Status: complete for the `near "INSERT"` release path. Commit chain now includes parser fix `2bcf0633c9d4dfe88043c59ac43ca448190e38de`, loader backfill `ac583a3be4bc84d094a7de62353c7745f19f07db`, and release commit `e2224ec65f86d224b17748469983a9028dd478d1`; `git push origin main` succeeded.
- Release package: `scripts/publish-card.mjs` now uses `CDN_REF=ac583a3be4bc84d094a7de62353c7745f19f07db`, `CDN_CACHE_VERSION=phase121-sql-boundary-6-9`, and `releaseVersion=6.9`. Release YAML points all six local resource links at the same cache/hash.
- PNG metadata check: decoded `src/神秘复苏模拟器发布版/神秘复苏模拟器发布版.png` `chara` and `ccv3`; both contain `6.9`, `ac583a3be4bc84d094a7de62353c7745f19f07db`, and `phase121-sql-boundary-6-9`, with no `phase119`, `phase120`, old `37a10c...`, `localhost`, or `127.0.0.1`.
- Gates passed: `node --check vendor/shujuku-sp-fork/index.js`, `node --check scripts/verify-sql-debug-regressions.mjs`, `git diff --check`, and `node scripts/verify-sql-debug-regressions.mjs`. Only warning was Node `node:sqlite` experimental warning.
- CDN verification: four tested resources returned HTTP 200. The 6.9 database loader and database frontend loader contain `mfrs-sql-boundary-6-9` and `phase121-sql-boundary-6-9`; the patched vendor at `2bcf0633.../vendor/shujuku-sp-fork/index.js` contains `shouldRestartIncompleteSqlStatement_ACU`; release YAML at `e2224ec...` contains `版本: '6.9'`.
- 9222 browser smoke: connected with `npx agent-browser --cdp 9222` to `http://127.0.0.1:8000/`. Switched to `characterId=3` / `神秘复苏模拟器发布版`; actual script iframe resources loaded `@ac583a3.../dist/...数据库/index.js?v=phase121-sql-boundary-6-9` and then `@2bcf0633.../vendor/shujuku-sp-fork/index.js?v=phase121-sql-boundary-6-9`.
- 9222 runtime result: visible page counts were `near "INSERT"=0`, `ERROR SQL Mode=0`, `ERROR SqlTableService=0`; `MysteryDatabaseFrontend.checkTemplateStatus()` returned `templateLoaded=true`, `tableCount=14`, `missingNames=[]`, `mismatchNames=[]`.

## 2026-06-07 12:55 CST：常驻流程补充 SP·数据库 III 运行日志口径

- **Status**：complete。
- **执行内容**：根据用户截图和说明，把 SQL/数据库问题的验收入口写入 planning 常驻运行流程。
- **关键规则**：SQL 报错以 SillyTavern 左下角菜单 -> `SP·数据库 III` -> `高级工具` -> `运行日志` 为准；复测时先记录/清空最新时间戳，再判断新时间戳后的日志行。页面正文计数、console、网络请求或 body 文本只能作辅助证据。
- **端口说明**：`9222` 是 Chrome CDP 端口；酒馆地址是 `http://127.0.0.1:8000/`；`localhost:5500` 用于本地静态资源/直接 import 验证。
- **涉及文件**：`task_plan.md`、`findings.md`、`progress.md`。
## 2026-06-07 13:23 CST: P7 chronicle_text 报错修复与复核

- 使用 `planning-with-files-zh` 续接当前任务；已重新读取 `CLAUDE.md`、相关 `.cursor/rules`、`task_plan.md`、`findings.md`、`progress.md`。
- 根据用户截图和说明，将 SQL 报错的权威检查入口固定为 `SillyTavern 左下角菜单 -> SP·数据库 III -> 高级工具 -> 运行日志`；确认 `9222` 是 Chrome CDP 端口，酒馆地址是 `http://127.0.0.1:8000/`，`localhost:5500` 用于本地资源 import。
- 复核并保留本轮代码修复：`vendor/shujuku-sp-fork/index.js` 增加 SyncBridge 写入前 `chronicle_text` 行过滤，以及 AI 直写 SQL 事务前 `chronicle_text` 长度/编号误填拦截；`scripts/verify-sql-debug-regressions.mjs` 增加种子坏行、直写 SQL、仪表盘分类回归；两份 `神秘复苏表格SQL_v1.json` 强化 `sheet_chronicle` 提示。
- 运行 CDP 权威日志探针：当前页面 `marker/apiMarker=mfrs-local-p7-chronicle-direct-guard`，SP 运行日志 `logRowCount=0`；`CHECK constraint failed`、`ERROR SQL Mode`、`ERROR SqlTableService`、`near "INSERT"`、`near "WHERE"`、`log_summary`、`event_summary` 均为 0。
- 验证通过：`node --check vendor\shujuku-sp-fork\index.js`、`node --check scripts\verify-sql-debug-regressions.mjs`、`git diff --check`、`node scripts\verify-sql-debug-regressions.mjs`、`npm run build`。回归脚本仅有 Node `node:sqlite` experimental warning；构建所有 webpack entry 均 `compiled successfully`。
- 未执行提交/推送/发布版 CDN 回填；当前浏览器仍是本地 vendor import 验证态。若继续正式发布，需要走资源提交、loader hash/cache 回填、build、publish-card、CDN/真页 smoke、commit/push。

## 2026-06-07: Schema/CHECK 约束不合规类任务清单已追加

- **Status:** planning only；按用户要求制作“彻底解决这个大类的问题”的任务清单，未修改业务代码、未构建、未提交、未推送。
- **输入日志:** `C:\Users\linlang\Downloads\acu-logs-2026-06-07T06-53-49-116Z.json`，3 条日志均指向同一根因：`supernatural_events.handling_status='爆发中'` 违反枚举 CHECK。
- **归类:** `Schema/CHECK 约束不合规类`，细分为 `枚举字段非法值`；与 `revival_risk_level='极低'` 同小类，与 `chronicle_text='SP0001'` 同大类。
- **规划结果:** `task_plan.md` 新增 S0-S9 通用根治清单，核心方向是从模板 DDL 自动解析 CHECK 约束，建立 constraint map，并在 AI SQL 执行前与 SyncBridge 写入前统一校验/归一化/拦截。
- **已更新文件:** `task_plan.md`、`findings.md`、`progress.md`。
- **下一步:** 如用户确认执行，先做 S0/S1 基线与 schema 约束注册表，再推进统一预检、枚举别名归一化、SyncBridge 行级校验和回归测试。

## 2026-06-07: S0 基线冻结与样本归档完成

- **Status:** S0 complete；未修改业务代码、未构建、未提交、未推送，只更新 planning 三文件。
- **Git 基线:** 分支 `main`；本地 `HEAD=3ef8d3bb6f10c3788ad707107d44b0d406221fd0`；`origin/main=295ed8bc9a11333e0c5032e4899dc3ebd066fd5c`。工作区已有 `vendor/shujuku-sp-fork/index.js`、两份 SQL 模板、数据库前端 dist、回归脚本等 dirty 文件，以及 planning/截图/临时 Chrome 等未跟踪文件；S0 未回滚也未新增业务改动。
- **日志归档:** `C:\Users\linlang\Downloads\acu-logs-2026-06-07T06-53-49-116Z.json`，1789 bytes，SHA256 `CCDCE56B90D64526880586ACC1DCEA483527CB922387CB81D25559C1851465DE`，共 3 条，时间范围 `2026-06-07T06:04:53.705Z` 到 `2026-06-07T06:04:53.719Z`。
- **日志分布:** `error/SqlTableService=1`，`error/SQL Mode=1`，`warn/shujuku_v120=1`；三条都是同一 SQL 的重复呈现。
- **当前样本:** `supernatural_events.handling_status='爆发中'` 违反枚举 `未处理/调查中/对抗中/已压制/已关押/失控扩散/结束`，归类 `schema_check_enum_violation`。
- **历史同类样本矩阵:** 已写入 `task_plan.md` 与 `findings.md`，包括 `action_suggestions.revival_risk_level='极低'`、风险等级高危近义词、`chronicle.chronicle_text='SP0001'`、短纪要长度失败，以及“所有 CHECK 枚举字段”的通用处理要求。
- **下一步:** S1 建立 schema 约束注册表，从两份 SQL 模板 DDL 自动提取 14 表字段和 CHECK 约束。

## 2026-06-07: S1 schema 约束注册表完成

- **Status:** S1 complete；已修改 `vendor/shujuku-sp-fork/index.js` 与 `scripts/verify-sql-debug-regressions.mjs`，未构建、未提交、未推送。
- **实现:** 新增 `parseDDLConstraintRegistry_ACU()` 及其纯解析辅助函数，可从 DDL 提取表名、中文名、列顺序、列类型、注释、`PRIMARY KEY`、`NOT NULL`、`UNIQUE`、枚举 CHECK、长度 CHECK、数值范围、GLOB 模式和非空 TRIM 约束。
- **回归:** `scripts/verify-sql-debug-regressions.mjs` 新增 `testConstraintRegistry()`，要求两份 SQL 模板 registry 完全一致、包含 14 表，并断言 `supernatural_events.handling_status`、`action_suggestions.revival_risk_level`、`chronicle.chronicle_text`、`global_state.world_pressure`、`chronicle.code_index`、`characters.name` 的关键约束均能自动提取。
- **验证通过:** `node --check vendor/shujuku-sp-fork/index.js`；`node --check scripts/verify-sql-debug-regressions.mjs`；`git diff --check`；`node scripts/verify-sql-debug-regressions.mjs`。
- **预期警告:** 回归脚本仅输出 Node `node:sqlite` experimental warning。
- **中途错误与修正:** 首次回归因注释剥离把 DDL 片段截空而失败，已改为逐行剥离 `--` 注释；第二次回归因 VM Array 原型差异导致 strict deep equal 失败，已在测试中 JSON 化 registry 后断言。
- **边界:** S1 只建立可查询 registry，不接入 SQL 执行前拦截；S2 继续做统一 schema 预检。

## 2026-06-07 19:18 CST：S9 发布链路接续记录

- **Status:** S9 in_progress；资源提交已推送并经 GitHub bot bundle，当前继续处理 loader 回填、发布包、CDN 与真页 smoke。
- **远端状态:** 已 fast-forward 到 `HEAD==origin/main==c86c1a94df291300a26081ddc4fdf5086c9c2bb9`（tag `v0.0.85`，bot bundle）。资源提交为 `70fbe7d9beaf7565783be9d935f499fafdd88dbc`，提交信息 `fix: harden sql schema check constraints`。
- **资源提交内容:** `vendor/shujuku-sp-fork/index.js`、`scripts/verify-sql-debug-regressions.mjs`、开发版/发布版两份 SQL 模板、数据库前端相关 dist。bot bundle `c86c1a9` 随后更新了数据库前端 dist。
- **已通过 gate:** `node --check vendor\shujuku-sp-fork\index.js`、`node --check scripts\verify-sql-debug-regressions.mjs`、`git diff --check`、两份 SQL 模板 JSON parse、`node scripts\verify-sql-debug-regressions.mjs`。回归脚本仅有 Node `node:sqlite` experimental warning。
- **当前本地 loader 回填:** `src/神秘复苏模拟器/脚本/数据库/index.ts`、`src/神秘复苏模拟器/脚本/数据库前端/index.ts` 及对应 dist 已指向资源提交 `70fbe7d9beaf7565783be9d935f499fafdd88dbc`，cache `phase124-schema-check-constraints-6-12`，marker `mfrs-schema-check-constraints-6-12`；尚未提交。
- **提交边界:** 仅计划提交 loader 回填相关四个文件；既有 `AGENTS.md`、`dist/神秘复苏模拟器/界面/状态栏/index.html` diff 以及未跟踪 planning/截图/临时 Chrome/备份文件不纳入。
