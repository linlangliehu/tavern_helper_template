# MFRS Database Frontend Non-AI Smoke Checklist

## Scope

This checklist verifies the database frontend after P1/P2/P3 changes. It is intentionally non-AI: do not send chat messages, do not click "立即手动更新", and do not call `manualUpdate()` or `triggerUpdate()`.

## Preconditions

1. Worktree source is built locally with `pnpm build`.
2. SillyTavern is open at `http://127.0.0.1:8000/` with Chrome CDP port `9222`.
3. Current character is `神秘复苏模拟器发布版` or the development card under test.
4. Database frontend iframe `TH-script--神秘复苏数据库前端--...3002` is present.
5. If the card still points to an older CDN ref, use the normal project dev path: VSCode `Fn+F5` / `pnpm watch` plus Live Server or an already-running local static server to load the local `dist/**` bundle.

## Prohibited Actions

1. 不要发送消息.
2. Do not trigger real AI generation.
3. Do not click "立即手动更新".
4. Do not call `manualUpdate()`.
5. Do not call `triggerUpdate()`.
6. Do not commit, push, wait for bot bundle, or run `publish-card` during this smoke; those belong to the final release phase.

## Basic Load

1. Open the database frontend.
2. Confirm navigation includes `总览`, `召回`, and `一致性`.
3. Confirm normal table tabs still open.
4. Confirm no console error appears during panel load.

## 总览

1. Open `总览`.
2. Confirm all 14 table cards are listed with row and column counts.
3. Search a common keyword such as `鬼`.
4. Confirm result rows show table name, row id or row number, title, summary, and actions.
5. Click copy on one row and confirm the UI reports success.
6. Click fill on one row and confirm `#send_textarea` receives text.
7. Click open original table and confirm the matching table tab opens without writing database data.

## 召回

1. Open `召回`.
2. Confirm recall health checks are visible.
3. Confirm `自动召回状态` is visible and has separate `剧情召回` / `记忆召回` toggles.
4. Confirm `本轮自动召回` shows only relevant matched items or a clear empty state.
5. Confirm the recall index covers 10 key tables.
6. Search `鬼` and confirm results update.
7. Pin one recall item, fill all pinned recall, then clear pins.
8. Optional no-AI probe: call `MysteryAcuVisualizer.getAutoRecallPreview()` and confirm it returns items/prompt metadata without sending a message.
9. Restore `#send_textarea` after the test.

## 一致性

1. Open `一致性`.
2. Confirm summary cards appear for 玩家状态, 当前事件, 驾驭厉鬼, 灵异物品, 线索, and 事件纪要.
3. Export current state snapshot and confirm a JSON download is attempted.
4. Click only low-risk frontend actions: refresh frontend, reload template, rebuild index.
5. Confirm none of these actions sends a chat message or directly writes AI-generated data.

## 抽卡

1. Open the 抽卡 panel.
2. Confirm current chat scope is displayed.
3. Confirm economy summary is visible: income, estimated spend, owned count, history count, rarity counts.
4. Confirm card pool validation is visible and reports either pass or actionable warnings.
5. Export current chat gacha data.
6. Import the same snapshot only if the test account can tolerate localStorage overwrite for the current chat scope.
7. Reset current chat gacha data only in a disposable test chat.
8. Confirm custom gacha catalog remains global and is not deleted by chat data reset.

## 固定状态栏 / 输入框上方槽位

1. Confirm `mfrs-fixed-status-host` exists above the send form.
2. Confirm only the database dashboard slot and 14-table frontend slot are used: dashboard order 10, frontend order 20.
3. Confirm `mfrs-fixed-status-summary`, `mfrs-fixed-status-detail`, and the old `神秘复苏14表` fixed-status button are absent.
4. Confirm database dashboard and 14-table frontend remain mounted after chat reload or frontend refresh.

## Cleanup

1. Restore `#send_textarea` to its original value.
2. Remove temporary recall localStorage keys if they were touched.
3. Remove any localStorage or UI test artifacts created during the smoke.
4. Record results in `progress.md`.

## Final Release Phase

Only after this checklist passes:

1. Review `git status --short --branch`.
2. Do source commit with precise paths.
3. Push and wait for bot bundle.
4. If publishing, update `scripts/publish-card.mjs`, run `publish-card`, verify PNG/YAML/CDN, then submit the release sync.
