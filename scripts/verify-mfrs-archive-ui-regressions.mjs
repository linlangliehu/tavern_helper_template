/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const cardRoot = join(repoRoot, 'src', '\u795e\u79d8\u590d\u82cf\u6a21\u62df\u5668');
const mfrsRoot = join(cardRoot, '\u811a\u672c');

const sourcePaths = {
  card: join(cardRoot, 'index.yaml'),
  message: join(mfrsRoot, '\u6d88\u606f\u5185\u9762\u677f', 'index.ts'),
  theme: join(mfrsRoot, '\u754c\u9762\u7f8e\u5316', 'index.ts'),
  fixed: join(mfrsRoot, '\u56fa\u5b9a\u72b6\u6001\u680f', 'index.ts'),
  frontend: join(mfrsRoot, '\u6570\u636e\u5e93\u524d\u7aef', 'index.ts'),
  visualizer: join(mfrsRoot, '\u6570\u636e\u5e93\u524d\u7aef', 'v10_2_visualizer.js'),
};

const sources = Object.fromEntries(Object.entries(sourcePaths).map(([key, path]) => [key, readFileSync(path, 'utf8')]));

const stages = [
  ['baseline', 'v8.7.4 currently provable source contracts'],
  ['phase1', 'message lifecycle, idempotence, singleton style and host cleanup'],
  ['phase2', 'entity brand, reduced motion and latest-only continuous animation'],
  ['phase3', 'archive-paper narrative, continuous message sections and complete panel interaction'],
  ['phase4', 'archive cabinet tab/collapse accessibility'],
  ['phase5', 'welcome-page active-path accessibility and scoped styling'],
];
const stageIndex = new Map(stages.map(([name], index) => [name, index]));

function parseArgs(argv) {
  const options = { stage: 'baseline', listStages: false, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--stage') options.stage = argv[++index] || '';
    else if (arg === '--list-stages') options.listStages = true;
    else if (arg === '--json') options.json = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  assert.ok(stageIndex.has(options.stage), `unknown stage: ${options.stage}`);
  return options;
}

function between(source, start, end) {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `missing block start: ${start}`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `missing block end: ${end}`);
  return source.slice(startIndex, endIndex);
}

function tavernRegexBlock(name) {
  const source = sources.card;
  const marker = `  - \u6b63\u5219\u540d\u79f0: '${name}'`;
  const startIndex = source.indexOf(marker);
  assert.notEqual(startIndex, -1, `missing tavern regex: ${name}`);
  const nextIndex = source.indexOf('\n  - \u6b63\u5219\u540d\u79f0:', startIndex + marker.length);
  return source.slice(startIndex, nextIndex === -1 ? source.length : nextIndex);
}

const checks = [];

function addCheck(stage, label, run) {
  checks.push({ stage, label, run });
}

function contains(sourceKey, marker, label) {
  addCheck('baseline', label, () => {
    assert.ok(sources[sourceKey].includes(marker), `${sourceKey} missing marker: ${marker}`);
  });
}

// Baseline: AI-only injection, message id 0 support, user cleanup and current ARIA.
contains('message', "if (!mesElement.classList.contains('mes')) return;", 'message renderer only accepts .mes nodes');
contains('message', 'if (isUser) return;', 'message renderer rejects user messages');
contains('message', "mesid === null || mesid === ''", 'message id guard accepts string "0"');
addCheck('baseline', 'message id guard does not use a falsy check in the injector', () => {
  const injector = between(sources.message, 'function injectPanelForMessage', 'function wrapNarrativeText');
  assert.equal(/if\s*\(\s*!mesid\s*\)/.test(injector), false, 'injector must not reject mesid="0"');
});
contains('message', '.mes[is_user="true"]', 'historical user-message cleanup selector remains present');
contains('message', '.mfrs-msg-panel, .mfrs-msg-narrative-wrapper', 'user cleanup removes owned message UI');
contains('message', 'role="tablist"', 'message tabs expose tablist semantics');
contains('message', 'role="tab"', 'message tabs expose tab semantics');
contains('message', 'aria-selected="true"', 'message tabs expose selection state');
contains('message', 'role="tabpanel"', 'message panels expose tabpanel semantics');
contains('message', "style.id = 'mfrs-msg-panel-style';", 'message panel keeps a stable style id');

// Baseline: public APIs and existing cleanup ownership.
for (const marker of [
  'refreshAll: processAllMessages',
  'refreshMessage: processOneMessage',
  'hostWindow.MysteryMessagePanel = messagePanelApi',
]) {
  contains('message', marker, `message public API: ${marker}`);
}
for (const method of [
  'checkTemplateStatus',
  'importMysteryTemplate',
  'openVisualizer',
  'openPanel',
  'openDashboard',
  'openStatus',
  'refreshDatabase',
  'exportCurrentData',
  'getTableChangeSchema',
  'getTableMetadata',
  'previewTableChangePlan',
  'applyTableChangePlan',
  'getPanelState',
  'refreshPanel',
]) {
  contains('frontend', `${method}:`, `MysteryDatabaseFrontend API type: ${method}`);
}
contains('frontend', 'hostWindow.MysteryDatabaseFrontend = frontendApi;', 'database compatibility API remains mounted');
contains('frontend', 'hostWindow.__mfrsDatabaseFrontendCleanup__ =', 'database frontend exposes host cleanup');
contains(
  'fixed',
  'hostWindow.__mfrsFixedStatusCleanup__?.();',
  'fixed host removes a previous instance before install',
);
contains('theme', 'hostWindow?.__mfrsHorrorThemeCleanup__?.();', 'theme removes a previous instance before install');
contains('theme', 'const current = hostDocument.getElementById(style.id);', 'theme style is host-document singleton');

// Baseline: accept either the v8.7.4 pseudo-logo policy or the Phase 2 entity-brand policy.
addCheck('baseline', 'message branding has reduced-motion fallback', () => {
  assert.ok(
    sources.theme.includes('@media (prefers-reduced-motion: reduce)') ||
      sources.message.includes('@media (prefers-reduced-motion: reduce)'),
    'theme or message branding must expose reduced-motion fallback',
  );
});
addCheck('baseline', 'historical AI branding continuous animation is paused', () => {
  assert.ok(
    sources.theme.includes('animation-play-state: running, paused !important;') ||
      sources.message.includes('.mes[is_user="false"]:not(.last_mes) .mfrs-msg-brand'),
    'historical AI branding must remain paused',
  );
});
addCheck('baseline', 'latest AI branding selector remains explicit', () => {
  assert.ok(
    sources.theme.includes('.mes.last_mes[is_user="false"] .mes_text::after') ||
      sources.message.includes('.mes.last_mes[is_user="false"] .mfrs-msg-brand'),
    'latest AI branding selector must remain explicit',
  );
});
addCheck('baseline', 'latest AI branding continuous animation runs', () => {
  assert.ok(
    sources.theme.includes('animation-play-state: running, running !important;') ||
      sources.message.includes('animation-play-state: running;'),
    'latest AI branding animation must run',
  );
});

// Baseline: fixed host keeps exactly the dashboard/frontend order-10/order-20 layout.
for (const marker of [
  "const statusContainerId = 'mfrs-fixed-status-host';",
  "const dashboardSlotId = 'mfrs-fixed-dashboard-slot';",
  "const frontendSlotId = 'mfrs-fixed-frontend-slot';",
  "const dashboardSlot = ensureFixedSlot(host, dashboardSlotId, '10');",
  "const frontendSlot = ensureFixedSlot(host, frontendSlotId, '20');",
  'host.append(dashboardSlot, frontendSlot);',
  'removeStatusUi(host);',
]) {
  contains('fixed', marker, `fixed dual-slot contract: ${marker}`);
}
for (const marker of [
  "const FIXED_DASHBOARD_HOST_ID = 'mfrs-fixed-status-host';",
  "const FIXED_DASHBOARD_SLOT_ID = 'mfrs-fixed-dashboard-slot';",
  "const FIXED_FRONTEND_SLOT_ID = 'mfrs-fixed-frontend-slot';",
  "const dashboardSlot = ensureSlot(FIXED_DASHBOARD_SLOT_ID, '10');",
  "const frontendSlot = ensureSlot(FIXED_FRONTEND_SLOT_ID, '20');",
  'host.append(dashboardSlot, frontendSlot);',
]) {
  contains('visualizer', marker, `visualizer dual-slot contract: ${marker}`);
}

// Phase 1 target: lifecycle safety. These checks intentionally do not run in baseline mode.
addCheck('phase1', 'message parent-DOM traversal is cross-realm safe', () => {
  assert.equal(sources.message.includes('instanceof Element'), false, 'replace local-realm instanceof Element checks');
});
addCheck('phase1', 'message panel updates are not delete-and-recreate', () => {
  assert.equal(
    sources.message.includes('existingPanel.remove()'),
    false,
    'existing panels must be updated idempotently',
  );
  assert.equal(sources.message.includes('Math.random()'), false, 'panel ids must remain stable across refreshes');
});
for (const marker of [
  '__mfrsMessagePanelCleanup__?: () => void',
  'hostWindow.__mfrsMessagePanelCleanup__?.();',
  'hostWindow.__mfrsMessagePanelCleanup__ = cleanup;',
  'delete hostWindow.__mfrsMessagePanelCleanup__',
  "const style = doc.createElement('style');",
]) {
  addCheck('phase1', `message lifecycle target: ${marker}`, () => {
    assert.ok(sources.message.includes(marker), `message missing phase1 marker: ${marker}`);
  });
}
for (const marker of [
  'dataset.mfrsRenderKey',
  'existingPanel.replaceChildren',
  'capturePanelFocus(existingPanel)',
  'setActivePanelTab(existingPanel, activeTab)',
  'restorePanelFocus(existingPanel, focusSnapshot)',
  'withMessageObserverPaused',
  'const HostMutationObserver = doc.defaultView?.MutationObserver ?? MutationObserver;',
  'refreshSubscriptions.splice(0).forEach(subscription => subscription.stop())',
  'unwrapNarrativeWrapper',
  'cleanupOwnedMessageUi',
  'isMysteryRevivalCardActive()',
  'eventOn(tavern_events.CHAT_CHANGED, handleChatChanged)',
]) {
  addCheck('phase1', `message lifecycle behavior: ${marker}`, () => {
    assert.ok(sources.message.includes(marker), `message missing phase1 behavior: ${marker}`);
  });
}
addCheck('phase1', 'message cleanup unwraps narrative content instead of deleting it', () => {
  const cleanupBlock = between(sources.message, 'function cleanupOwnedMessageUi', '/** 清理已注入用户消息');
  assert.equal(
    cleanupBlock.includes("querySelectorAll('.mfrs-msg-narrative-wrapper').forEach(element => element.remove())"),
    false,
  );
  assert.ok(cleanupBlock.includes("querySelectorAll('.mfrs-msg-narrative-wrapper').forEach(unwrapNarrativeWrapper)"));
});
addCheck('phase1', 'message narrative wrapper cannot absorb an entity brand during chat reload', () => {
  const wrapperBlock = between(sources.message, 'function wrapNarrativeText', 'function unwrapNarrativeWrapper');
  assert.ok(wrapperBlock.includes('nestedBrands'), 'nested brands must be normalized back to direct message children');
  assert.ok(
    wrapperBlock.includes("node.matches('.mfrs-msg-brand')"),
    'entity brands must be excluded from narrative nodes',
  );
});

// Phase 2 target: dossier status strip (no eye/seal glyphs); fields stay escaped and AI-only.
for (const marker of [
  'mfrs-msg-brand',
  'mfrs-msg-brand-rail',
  'mfrs-msg-brand-kicker',
  'mfrs-msg-brand-meta',
  '现场档案',
  'aria-hidden="true"',
]) {
  addCheck('phase2', `entity brand target: ${marker}`, () => {
    assert.ok(sources.message.includes(marker), `message missing phase2 marker: ${marker}`);
  });
}
for (const marker of [
  'mfrs-msg-brand-eye',
  'mfrs-msg-brand-seal',
  '鬼眼封案',
  'SUPERNATURAL ARCHIVE',
]) {
  addCheck('phase2', `retired ghost-seal brand marker absent: ${marker}`, () => {
    assert.equal(sources.message.includes(marker), false, `message still contains retired marker: ${marker}`);
  });
}
for (const marker of [
  'archive: mesid',
  "phase: valueText(_.get(data, '主线进度.当前阶段'))",
  'location: valueText(data.所在位置)',
  "event: valueText(_.get(data, '当前灵异事件.事件代号'), '无')",
  "domain: valueText(_.get(data, '当前灵异事件.鬼域状态'), '未知')",
  "danger: valueText(_.get(data, '当前灵异事件.危害等级'))",
]) {
  addCheck('phase2', `brand field boundary: ${marker}`, () => {
    assert.ok(sources.message.includes(marker), `message missing brand field boundary: ${marker}`);
  });
}
addCheck('phase2', 'brand dynamic text and accessible name are escaped', () => {
  const brandBuilder = between(sources.message, 'function buildBrandHtml', 'function injectBrandForMessage');
  for (const marker of [
    '_.escape(accessibleName)',
    '_.escape(brand.archive)',
    '_.escape(brand.phase)',
    '_.escape(brand.location)',
    '_.escape(brand.event)',
    '_.escape(brand.domain)',
    '_.escape(brand.danger)',
  ]) {
    assert.ok(brandBuilder.includes(marker), `brand builder missing escaped dynamic value: ${marker}`);
  }
  const svgBlocks = brandBuilder.match(/<svg[\s\S]*?<\/svg>/g) || [];
  assert.equal(svgBlocks.length, 0, 'dossier brand must not use decorative SVG blocks');
});
addCheck('phase2', 'legacy pseudo logo and inline SMIL are retired', () => {
  assert.equal(
    sources.theme.includes('.mes[is_user="false"] .mes_text::after'),
    false,
    'legacy pseudo logo must be removed',
  );
  assert.equal(sources.message.includes('<animateTransform'), false, 'inline SMIL must be removed');
  assert.equal(
    sources.theme.includes('padding: 40px 22px 16px'),
    false,
    'legacy pseudo-logo text avoidance must be removed',
  );
});
addCheck('phase2', 'dossier brand keeps a thin latest-only lamp budget', () => {
  assert.ok(sources.message.includes('mfrs-msg-brand-lamp 2.5s'), 'brand lamp animation must remain latest-only');
  assert.ok(sources.message.includes('animation-play-state: paused'), 'historical brand lamp must pause');
  assert.ok(sources.message.includes('animation-play-state: running'), 'latest brand lamp must run');
});
for (const marker of [
  'mfrs-msg-brand-reveal 360ms',
  'mfrs-msg-brand-lamp 2.5s ease-in-out infinite',
  'animation-play-state: paused',
  'animation-play-state: running',
]) {
  addCheck('phase2', `brand animation budget: ${marker}`, () => {
    assert.ok(sources.message.includes(marker), `message missing phase2 animation marker: ${marker}`);
  });
}
for (const marker of [
  '@media (prefers-reduced-motion: reduce)',
  '.mes[is_user="false"]:not(.last_mes) .mfrs-msg-brand',
  '.mes.last_mes[is_user="false"] .mfrs-msg-brand',
]) {
  addCheck('phase2', `brand motion policy: ${marker}`, () => {
    assert.ok(
      sources.theme.includes(marker) || sources.message.includes(marker),
      `missing phase2 motion marker: ${marker}`,
    );
  });
}

// Phase 3 target: archive-paper narrative, continuous sections and complete panel interaction.
for (const marker of ['--mfrs-corpse-cyan', '--mfrs-aged-brass', '--mfrs-bone-white', '--mfrs-blood-red']) {
  addCheck('phase3', `semantic archive token: ${marker}`, () => {
    assert.ok(sources.theme.includes(marker), `theme missing Phase 3 semantic token: ${marker}`);
  });
}
addCheck('phase3', 'narrative uses one archive border and a binding line', () => {
  const narrativeCss = between(sources.theme, '.mfrs-msg-narrative-wrapper {', '.mfrs-msg-narrative-wrapper > *');
  assert.ok(
    narrativeCss.includes('border: 1px solid var(--mfrs-corpse-cyan)') ||
      narrativeCss.includes('border: 1px solid var(--mfrs-aged-brass)'),
    'narrative needs one archive line border',
  );
  assert.equal(narrativeCss.includes('border-image:'), false, 'narrative must not keep the old double border');
  assert.ok(narrativeCss.includes('.mfrs-msg-narrative-wrapper::before'), 'narrative needs a binding-line layer');
});
addCheck('phase3', 'message sections are continuous archive divisions instead of nested cards', () => {
  // Prefer the α panel section rule (not shell-scoped relation density overrides).
  const sectionStart = sources.message.indexOf('\n.mfrs-msg-section {') !== -1
    ? '\n.mfrs-msg-section {'
    : '.mfrs-msg-section {';
  const sectionCss = between(sources.message, sectionStart, '.mfrs-msg-section-title {');
  for (const marker of ['background:', 'clip-path:', 'box-shadow:']) {
    assert.equal(sectionCss.includes(marker), false, `continuous section must not contain ${marker}`);
  }
  assert.ok(sectionCss.includes('border-top:'), 'continuous sections need archive divider rules');
});
for (const marker of ['keydown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'handleTabKeydown']) {
  addCheck('phase3', `message tab keyboard target: ${marker}`, () => {
    assert.ok(sources.message.includes(marker), `message missing phase3 keyboard marker: ${marker}`);
  });
}
for (const marker of [
  '>生存状态</button>',
  '>现场关系</button>',
  'role="tablist"',
  'aria-selected="true"',
  'aria-controls=',
  'role="tabpanel"',
  'hidden',
]) {
  addCheck('phase3', `message tab contract: ${marker}`, () => {
    assert.ok(sources.message.includes(marker), `message missing Phase 3 tab contract: ${marker}`);
  });
}
for (const marker of ['mfrs-msg-risk-level', 'mfrs-msg-risk-value', 'mfrs-msg-risk-copy', '--mfrs-risk-color']) {
  addCheck('phase3', `risk meter communicates without color alone: ${marker}`, () => {
    assert.ok(sources.message.includes(marker), `message missing risk communication marker: ${marker}`);
  });
}
addCheck('phase3', 'message structure uses Font Awesome and retires structural emoji', () => {
  const statusBuilder = between(sources.message, 'function buildStatusTabHtml', 'function buildRelationTabHtml');
  const relationBuilder = between(sources.message, 'function buildRelationTabHtml', 'function getPanelId');
  assert.ok(statusBuilder.includes('fa-solid'), 'status panel should use the existing Font Awesome icon set');
  assert.ok(relationBuilder.includes('fa-solid'), 'relation panel should use the existing Font Awesome icon set');
  const structuralEmoji = ['🎬', '📍', '🩸', '🎭', '🔮', '👻', '🎯', '🗺️', '👥'];
  assert.equal(
    structuralEmoji.some(emoji => (statusBuilder + relationBuilder).includes(emoji)),
    false,
    'structural emoji must be retired',
  );
});
addCheck('phase3', 'message icons restore the Font Awesome font inside the host theme', () => {
  assert.ok(sources.message.includes('font-family: "Font Awesome 6 Free" !important;'));
  assert.ok(sources.message.includes('font-weight: 900;'));
});
addCheck('phase3', 'action suggestions only fill the textarea and never send', () => {
  // End before β HUD block (may contain #send_but for shell send only).
  const actionHandlerEnd = sources.message.includes('// ─── 路径 β')
    ? '// ─── 路径 β'
    : '$(() => {';
  const actionHandler = between(sources.message, 'function handleActionClick', actionHandlerEnd);
  assert.ok(
    actionHandler.includes("querySelector('#send_textarea')"),
    'action handler must still target send_textarea',
  );
  assert.equal(actionHandler.includes('function triggerNativeSend'), false, 'action handler must not include HUD send helper');
  for (const forbidden of ['#send_but', 'requestSubmit', "getSendButton()", 'trigger(']) {
    assert.equal(actionHandler.includes(forbidden), false, `action handler must not auto-send via ${forbidden}`);
  }
});

// Phase β1: fullscreen shell / reparent / input proxy (presentation only).
addCheck('phase5', 'β1 fullscreen shell id and fixed mount', () => {
  assert.ok(sources.message.includes("mfrs-hud-shell") || sources.message.includes('mfrs-hud-shell'), 'missing #mfrs-hud-shell');
  assert.ok(sources.message.includes('position: fixed') || sources.message.includes('position:fixed'), 'shell should be fixed');
  assert.ok(sources.message.includes('function mountHudImmersive'), 'missing mountHudImmersive');
  assert.ok(sources.message.includes('function unmountHudImmersive'), 'missing unmountHudImmersive');
  assert.ok(sources.message.includes('function destroyHudImmersive'), 'missing destroyHudImmersive');
});
addCheck('phase5', 'β1 chat reparent restore point', () => {
  assert.ok(sources.message.includes('hudChatRestore'), 'missing chat restore state');
  assert.ok(sources.message.includes('nextSibling'), 'restore must track nextSibling');
  assert.ok(sources.message.includes("getElementById('chat')") || sources.message.includes('getChatElement'), 'must locate #chat');
});
addCheck('phase5', 'β1 D1 auto mount on mystery card + exit immersion', () => {
  assert.ok(sources.message.includes('function syncHudImmersiveWithCard'), 'missing D1 sync');
  assert.ok(sources.message.includes('hudImmersivePreferred'), 'missing immersive preference flag');
  assert.ok(sources.message.includes('退出沉浸'), 'missing exit immersion control');
  assert.ok(sources.message.includes('Ctrl+Shift') || sources.message.includes('ctrlKey && e.shiftKey'), 'missing Ctrl+Shift+G toggle');
});
addCheck('phase5', 'β1 hide α tri + fixed host visual hide without remove', () => {
  assert.ok(sources.message.includes('mfrs-hud-immersive'), 'missing body immersive class');
  assert.ok(sources.message.includes('mfrs-msg-tri-left'), 'must hide α left in immersive CSS');
  assert.ok(sources.message.includes('mfrs-fixed-status-host'), 'must target fixed host');
  assert.ok(sources.message.includes('mfrs-hud-cabinet-open'), 'C1 cabinet open class');
  assert.equal(
    /unmountHudImmersive[\s\S]{0,800}getElementById\(FIXED_HOST_ID\)\?\.remove\(/.test(sources.message),
    false,
    'must not remove fixed host node on unmount',
  );
});
addCheck('phase5', 'β1 native send_form reparent into shell (same as ST input)', () => {
  assert.ok(sources.message.includes('function reparentSendFormIntoHud'), 'missing send_form reparent into hud');
  assert.ok(sources.message.includes('function restoreSendFormFromHud'), 'missing send_form restore');
  assert.ok(sources.message.includes('hudFormRestore'), 'missing form restore state');
  assert.ok(sources.message.includes("data-mfrs-hud=\"composer\""), 'missing composer host for native form');
  assert.ok(sources.message.includes('function getSendFormElement') || sources.message.includes('#send_form'), 'must locate #send_form');
  assert.equal(sources.message.includes('mfrs-hud-input'), false, 'must not use fake proxy textarea class');
  const actionOnly = between(sources.message, 'function handleActionClick', '// ─── 路径 β');
  assert.equal(actionOnly.includes('triggerNativeSend'), false, '拟办 must not call triggerNativeSend');
  assert.equal(actionOnly.includes('#send_but'), false, '拟办 must not auto-click send');
});

// Phase β2: top chips / left dossier / actions / relation wired from shared builders.
addCheck('phase5', 'β2 hud panels refresh from latest AI stat_data', () => {
  assert.ok(sources.message.includes('function refreshHudPanels'), 'missing refreshHudPanels');
  assert.ok(sources.message.includes('function readLatestHudStatusData'), 'missing latest status reader');
  assert.ok(sources.message.includes('function applyHudTopChips'), 'missing top chips apply');
  assert.ok(sources.message.includes('buildDossierSectionsHtml'), 'must reuse dossier builder');
  assert.ok(sources.message.includes('buildActionsHtml'), 'must reuse actions builder');
  assert.ok(sources.message.includes('buildRelationTabHtml'), 'must reuse relation builder');
  assert.ok(sources.message.includes('refreshHudPanels()'), 'message refresh should call refreshHudPanels');
});
addCheck('phase5', 'β2 hud nav views and 拟办 slot', () => {
  assert.ok(sources.message.includes('function setHudView'), 'missing setHudView');
  assert.ok(sources.message.includes("data-mfrs-hud=\"actions-slot\""), 'missing actions slot');
  assert.ok(sources.message.includes("data-mfrs-hud=\"relation-slot\""), 'missing relation slot');
  assert.ok(sources.message.includes("data-mfrs-hud=\"dossier-slot\""), 'missing dossier slot');
  assert.ok(sources.message.includes('is-emphasis'), 'dossier emphasis class');
});
addCheck('phase5', 'β2 resource readout is display-only structured fields', () => {
  assert.ok(sources.message.includes('function buildHudResourceSectionsHtml'), 'missing hud resource builder');
  assert.ok(sources.message.includes('灵异资源.鬼拼图') || sources.message.includes('鬼拼图'), 'puzzle path');
  assert.equal(sources.message.includes('Mvu.replaceMvuData'), false, 'must not write MVU from hud resource UI');
});

// Phase β3: cabinet overlay, esc/mask close, narrow drawers, a11y targets.
addCheck('phase5', 'β3 cabinet overlay chrome and close paths', () => {
  assert.ok(sources.message.includes('mfrs-hud-cabinet-mask') || sources.message.includes('cabinet-mask'), 'cabinet mask');
  assert.ok(sources.message.includes('cabinet-close'), 'cabinet close control');
  assert.ok(sources.message.includes('is-cabinet-open'), 'cabinet open shell class');
  assert.ok(sources.message.includes("e.key === 'Escape'") || sources.message.includes('Escape'), 'Esc close');
  assert.ok(sources.message.includes('function closeHudCabinetLayer'), 'close cabinet helper');
});
addCheck('phase5', 'β3 narrow side drawers and mobile toggles', () => {
  assert.ok(sources.message.includes('function openHudSideDrawer'), 'side drawer open');
  assert.ok(sources.message.includes('function closeHudSideDrawers'), 'side drawer close');
  assert.ok(sources.message.includes('is-left-open') && sources.message.includes('is-right-open'), 'drawer classes');
  assert.ok(sources.message.includes('toggle-left') && sources.message.includes('toggle-right'), 'mobile toggles');
  assert.ok(sources.message.includes('max-width: 800px'), 'narrow breakpoint');
});
addCheck('phase5', 'β3 default no half-screen cabinet and 44px targets', () => {
  assert.ok(sources.message.includes('mfrs-fixed-status-host') && sources.message.includes(':not(.mfrs-hud-cabinet-open)'), 'host hidden unless cabinet open');
  assert.ok(sources.message.includes('min-height: 44px'), '44px touch targets present');
  assert.ok(sources.message.includes('prefers-reduced-motion'), 'reduced motion hook');
});

// Phase A (post-8.12.3): tavern menu stable open/close + fail feedback + Esc layering.
addCheck('phase5', 'A1 close prior ST drawers before opening menu target', () => {
  assert.ok(sources.message.includes('function closeOpenStDrawers'), 'missing closeOpenStDrawers');
  assert.ok(sources.message.includes('function hasOpenStDrawers'), 'missing hasOpenStDrawers');
  const runAction = between(sources.message, 'function runHudTavernAction', 'function reparentSendFormIntoHud');
  assert.ok(runAction.includes('closeOpenStDrawers()'), 'menu click must close open drawers first');
  assert.ok(runAction.includes('yieldHudToStUi()'), 'menu click must still yield ST UI overlay');
});
addCheck('phase5', 'A2 menu fail feedback toast and disabled items', () => {
  assert.ok(sources.message.includes('function markHudMenuItemFailed'), 'missing fail marker helper');
  assert.ok(sources.message.includes('function showHudToast'), 'missing toast helper');
  assert.ok(sources.message.includes('mfrs-hud-toast'), 'missing toast element id');
  assert.ok(sources.message.includes('is-fail-flash'), 'missing fail flash class');
  assert.ok(sources.message.includes('当前界面未找到入口') || sources.message.includes('未找到入口'), 'missing unavailable copy');
});
addCheck('phase5', 'A3 Esc layering settings then ST drawers then cabinet', () => {
  const keydown = between(sources.message, 'function handleHudKeydown', 'function bindHudShellEvents');
  assert.ok(
    keydown.includes('is-settings-open') || keydown.includes('closeHudSettingsPanel'),
    'Esc must close settings panel first',
  );
  assert.ok(
    keydown.includes('hasOpenStDrawers') || keydown.includes('mfrs-hud-st-ui-open') || keydown.includes('HUD_ST_UI_CLASS'),
    'Esc must close ST drawers',
  );
  assert.ok(keydown.includes('closeHudCabinetLayer'), 'Esc must close cabinet');
  assert.ok(keydown.includes('closeHudSideDrawers'), 'Esc must close side drawers');
  assert.equal(keydown.includes('exitHudImmersive()'), false, 'Esc must not exit immersion by default');
});
addCheck('phase5', 'A4 close panel restores ST UI and clears open drawers', () => {
  assert.ok(sources.message.includes('function restoreHudFromStUi'), 'missing restoreHudFromStUi');
  const restore = between(sources.message, 'function restoreHudFromStUi', 'function closeHudSettingsPanel');
  assert.ok(restore.includes('closeOpenStDrawers()'), 'close panel must close drawers');
  assert.ok(
    restore.includes('classList.remove(HUD_ST_UI_CLASS)') ||
      restore.includes("classList.remove('mfrs-hud-st-ui-open')") ||
      restore.includes('HUD_ST_UI_CLASS'),
    'close panel must drop st-ui class',
  );
  assert.ok(sources.message.includes('关闭面板'), 'missing close-panel control label');
});

// Phase B: immersive composer skin only (scoped, no fake proxy).
addCheck('phase5', 'B1-B4 composer dossier skin scoped to shell', () => {
  assert.ok(sources.message.includes('mfrs-hud-composer'), 'missing composer host');
  assert.ok(sources.message.includes(':focus-within'), 'composer focus-within skin');
  assert.ok(sources.message.includes('max-height: min(34vh, 220px)') || sources.message.includes('max-height:min(34vh, 220px)'), 'composer height cap');
  assert.ok(sources.message.includes('#send_but'), 'send button skin in shell');
  assert.ok(sources.message.includes('#options_button'), 'options button kept/styled in shell');
  assert.ok(sources.message.includes('#extensionsMenuButton'), 'extensions button kept/styled in shell');
  assert.ok(sources.message.includes('background: transparent'), 'textarea transparent skin');
  assert.equal(sources.message.includes('mfrs-hud-input'), false, 'must not introduce fake input proxy class');
  assert.ok(sources.message.includes('function reparentSendFormIntoHud'), 'must keep native form reparent');
});

// Phase C: info density (top chips / actions / relation / dossier).
addCheck('phase5', 'C1-C4 hud information density', () => {
  assert.ok(sources.message.includes('function clipHudChipText'), 'missing chip clip helper');
  assert.ok(sources.message.includes('function buildHudRelationHtml'), 'missing compact relation builder');
  assert.ok(sources.message.includes('max-height: min(28vh, 220px)') || sources.message.includes('max-height:min(28vh, 220px)'), 'actions height cap');
  assert.ok(sources.message.includes('data-mfrs-hud="actions"'), 'actions details host');
  // default collapsed: shell template must not force open on actions
  assert.equal(
    /data-mfrs-hud="actions"\s+open/.test(sources.message) || /data-mfrs-hud="actions" open/.test(sources.message),
    false,
    'actions must default collapsed (no open attribute)',
  );
  assert.ok(sources.message.includes('data-fold="event">') || sources.message.includes("data-fold=\"event\">"), 'event fold can collapse in hud');
  assert.ok(sources.message.includes('-webkit-line-clamp: 1') || sources.message.includes('line-clamp: 1'), 'relation one-line clamp');
  assert.equal(sources.message.includes('Mvu.replaceMvuData'), false, 'density pass must remain read-only');
  const refresh = between(sources.message, 'function refreshHudPanels', 'function closeHudCabinetLayer');
  assert.ok(refresh.includes('buildHudRelationHtml'), 'hud refresh uses compact relation html');
});

// Phase D + 方案A：右栏设置承载酒馆 8 项（去掉顶栏酒馆菜单）
addCheck('phase5', 'D1-D4 settings panel hosts tavern entries', () => {
  const menu = between(sources.message, 'function getHudTavernMenuSections', 'function findHudActionTarget');
  assert.ok(menu.includes('连接与格式'), 'missing connection section title');
  assert.ok(menu.includes('世界与角色'), 'missing world/character section title');
  assert.ok(menu.includes('扩展设置'), 'D1 rename to 扩展设置');
  assert.equal(menu.includes("label: '扩展程序'"), false, 'must not keep 扩展程序 as menu label');
  assert.ok(sources.message.includes('已打开：'), 'D3 success toast prefix');
  assert.ok(sources.message.includes('function openHudSettingsPanel'), 'settings panel open helper');
  assert.ok(sources.message.includes('function renderHudSettingsPanel'), 'settings panel render helper');
  assert.ok(sources.message.includes('data-mfrs-hud="settings-panel"') || sources.message.includes("data-mfrs-hud=\"settings-panel\""), 'settings panel host');
  assert.ok(sources.message.includes('is-settings-open'), 'settings open class');
  assert.equal(
    sources.message.includes('酒馆菜单') && sources.message.includes('data-mfrs-hud="tavern-menu"'),
    false,
    'top-bar tavern menu entry must be removed',
  );
  const expected = ['AI 响应配置', 'API 连接', 'AI 回复格式化', '用户设置', '世界书', '角色管理', '用户设定', '扩展设置'];
  for (const label of expected) {
    assert.ok(menu.includes(label), `menu missing item: ${label}`);
  }
});

// Phase E: performance + lifecycle harding.
addCheck('phase5', 'E1-E4 immersive perf and card lifecycle', () => {
  assert.ok(sources.message.includes('function isOwnedOrShellChrome'), 'E2 shell chrome filter');
  assert.ok(sources.message.includes('function syncHudMotionPreference'), 'E3 motion preference sync');
  assert.ok(sources.message.includes('mfrs-hud-reduced-motion'), 'E3 reduced-motion body class');
  assert.ok(sources.message.includes('mfrs_hud_low_motion'), 'E3 optional localStorage low motion');
  assert.ok(sources.message.includes('characterData: false'), 'observer should not watch characterData');
  assert.ok(sources.message.includes("closest('#chat')") || sources.message.includes('closest("#chat")'), 'mutations must prefer #chat scope');
  assert.ok(sources.message.includes('function processLatestAiMessageOnly'), 'latest-only path required');
  assert.ok(sources.message.includes('function scheduleFullHistoryCatchUp'), 'chunked history catch-up required');
  assert.ok(sources.message.includes('function processHistoricalMessagesInChunks'), 'history must be chunked');
  const process = between(sources.message, 'function processAllMessages', 'function processOneMessage');
  assert.ok(process.includes('scheduleFullHistoryCatchUp') || process.includes('processLatestAiMessageOnly'), 'processAllMessages must avoid sync full scan');
  const unmount = between(sources.message, 'function unmountHudImmersive', 'function exitHudImmersive');
  assert.ok(unmount.includes('scheduleFullHistoryCatchUp'), 'unmount must chunk history catch-up');
  assert.ok(unmount.includes('pauseMessageObserverTemporarily') || unmount.includes('messageObserver?.disconnect'), 'unmount should pause observer during reparent');
  assert.equal(unmount.includes('processAllMessages({ fullHistory: true })'), false, 'unmount must not sync fullHistory processAllMessages');
  const deactivate = between(sources.message, 'function deactivateMessagePanelRuntime', 'function activateMessagePanelRuntime');
  assert.ok(deactivate.includes('destroyHudImmersive'), 'E4 deactivate must destroy shell');
  assert.equal(deactivate.includes('unmountHudImmersive()') && !deactivate.includes('destroyHudImmersive'), false, 'prefer destroy over bare unmount on deactivate');
});

// Phase F: release-contract gates for A–E ship.
addCheck('phase5', 'F1 composer native form + ST overlay stacking contract', () => {
  assert.ok(sources.message.includes('function reparentSendFormIntoHud'), 'composer reparent required');
  assert.ok(sources.message.includes('function restoreSendFormFromHud'), 'composer restore required');
  assert.ok(sources.message.includes("data-mfrs-hud=\"composer\""), 'composer host marker');
  assert.ok(sources.message.includes('#send_form') || sources.message.includes('getSendFormElement'), 'must locate native send_form');
  assert.ok(sources.message.includes('mfrs-hud-st-ui-open') || sources.message.includes('HUD_ST_UI_CLASS'), 'st-ui open class');
  assert.ok(sources.message.includes('#top-settings-holder'), 'must lift top-settings-holder for ST drawers');
  assert.ok(sources.message.includes('#top-bar'), 'must lift top-bar stacking with drawers');
  assert.equal(sources.message.includes('mfrs-hud-input'), false, 'no fake input proxy');
  assert.equal(sources.message.includes('generate()'), false, 'no generate() from message panel');
});
addCheck('phase5', 'F1 post-A-E feature markers still present', () => {
  for (const marker of [
    'function closeOpenStDrawers',
    'function showHudToast',
    'function buildHudRelationHtml',
    '连接与格式',
    '扩展设置',
    'function destroyHudImmersive',
    'mfrs-hud-reduced-motion',
  ]) {
    assert.ok(sources.message.includes(marker), `missing ship marker: ${marker}`);
  }
});

// Phase 4 target: archive-cabinet tabs/collapsers become keyboard accessible without changing APIs/slots.
addCheck('phase4', 'archive tabs use native buttons instead of focusless divs', () => {
  assert.equal(/<div class="acu-tab-btn/.test(sources.visualizer), false, 'acu-tab-btn must not be rendered as div');
  assert.ok(/<button[^>]+class="acu-tab-btn/.test(sources.visualizer), 'acu-tab-btn must be rendered as button');
});
for (const marker of [
  'role="tablist"',
  'role="tab"',
  'aria-selected',
  'aria-controls',
  'aria-expanded',
  ':focus-visible',
]) {
  addCheck('phase4', `archive accessibility target: ${marker}`, () => {
    assert.ok(sources.visualizer.includes(marker), `visualizer missing phase4 marker: ${marker}`);
  });
}
addCheck('phase4', 'archive UI no longer globally suppresses focus outlines', () => {
  assert.equal(
    sources.visualizer.includes('outline: none !important;'),
    false,
    'remove unconditional outline suppression',
  );
  assert.equal(
    /outline\s*:\s*none/.test(sources.visualizer),
    false,
    'archive visualizer must not suppress focus outlines',
  );
});
for (const marker of [
  '--mfrs-archive-corpse-cyan',
  '--mfrs-archive-old-brass',
  '--mfrs-archive-bone-white',
  '--mfrs-archive-blood-red',
  '<span>档案柜</span>',
  '>档案柜</span>',
]) {
  addCheck('phase4', `archive cabinet theme surface: ${marker}`, () => {
    assert.ok(sources.visualizer.includes(marker), `visualizer missing archive cabinet marker: ${marker}`);
  });
}
addCheck('phase4', 'saved theme compatibility keeps aurora as the default without migration', () => {
  assert.ok(/const DEFAULT_CONFIG = \{[\s\S]{0,120}?theme: 'aurora'/.test(sources.visualizer));
  assert.ok(sources.visualizer.includes("const STORAGE_KEY_UI_CONFIG = 'acu_ui_config_v18';"));
  assert.equal(sources.visualizer.includes('acu_ui_config_v19'), false, 'phase4 must not migrate saved theme storage');
});
for (const marker of [
  "['ArrowLeft', 'ArrowRight', 'Home', 'End']",
  'activateArchiveTab($tabs.eq(nextIndex), true)',
  'class="acu-collapsed-trigger"',
  'class="acu-dash-ctrl-bar" role="button" tabindex="0"',
  'class="acu-opt-ctrl-bar" role="button" tabindex="0"',
  "if (e.key !== 'Enter' && e.key !== ' ') return;",
  'min-width: 44px; min-height: 44px;',
]) {
  addCheck('phase4', `archive keyboard and touch contract: ${marker}`, () => {
    assert.ok(sources.visualizer.includes(marker), `visualizer missing keyboard/touch marker: ${marker}`);
  });
}

// Phase 5 target: keep welcome enhancements scoped to the active rendered roots and accessible controls.
for (const marker of [
  '#mfrs-welcome-root',
  '.custom-mfrs-welcome-root',
  "trigger.setAttribute('aria-expanded', 'false')",
  "menu.setAttribute('role', 'listbox')",
  "itemDiv.setAttribute('role', 'option')",
]) {
  addCheck('phase5', `welcome active-path target: ${marker}`, () => {
    assert.ok(sources.theme.includes(marker), `theme missing phase5 marker: ${marker}`);
  });
}
addCheck('phase5', 'card keeps exactly 33 regexes and the frozen enabled vector', () => {
  const blocks =
    sources.card.match(/^ {2}- \u6b63\u5219\u540d\u79f0:[\s\S]*?(?=^ {2}- \u6b63\u5219\u540d\u79f0:|(?![\s\S]))/gm) ||
    [];
  assert.equal(blocks.length, 33, 'Phase 5 must not change regex count');
  assert.deepEqual(
    blocks.map(block => /^ {4}\u542f\u7528: true$/m.test(block)),
    [
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      false,
      true,
      true,
      true,
      true,
      true,
      false,
      true,
      true,
      true,
      true,
      true,
      false,
      false,
      true,
      true,
    ],
    'Phase 5 must keep every regex enabled state',
  );
});
const phase5RegexBlocks = {
  roll: tavernRegexBlock('[\u663e\u793a]\u6e32\u67d3\u795e\u79d8\u590d\u82cf\u63b7\u9ab0\u6761'),
  welcome: tavernRegexBlock('[\u663e\u793a]\u6e32\u67d3\u795e\u79d8\u590d\u82cf\u5f00\u5c40\u9875'),
  input: tavernRegexBlock('[\u663e\u793a]\u795e\u79d8\u590d\u82cf\u901a\u7528\u8f93\u5165\u9762\u677f'),
};
addCheck('phase5', 'welcome, input and roll templates use the archive semantic palette', () => {
  for (const [name, block] of Object.entries(phase5RegexBlocks)) {
    for (const color of ['#5f8f86', '#9c784a', '#ded4bd', '#9f342f']) {
      assert.ok(block.includes(color), `${name} template missing archive color ${color}`);
    }
  }
});
addCheck('phase5', 'welcome and input templates preserve visible keyboard focus', () => {
  for (const [name, block] of Object.entries({
    welcome: phase5RegexBlocks.welcome,
    input: phase5RegexBlocks.input,
  })) {
    assert.equal(/outline\s*:\s*none/.test(block), false, `${name} template must not suppress focus outlines`);
    assert.ok(block.includes(':focus-visible'), `${name} template needs focus-visible styling`);
  }
});
for (const key of [
  'name',
  'ageGender',
  'identity',
  'ghostPreset1',
  'ghostName1',
  'ghostLaw1',
  'ghostName2',
  'ghostLaw2',
  'specialAbilityPreset',
  'specialAbility',
  'anchor',
  'resources',
  'background',
]) {
  addCheck('phase5', `welcome field contract: data-mfrs="${key}"`, () => {
    assert.ok(phase5RegexBlocks.welcome.includes(`data-mfrs="${key}"`));
  });
}
for (const marker of [
  'id="mfrs-welcome-root" role="region"',
  'width: 44px; min-width: 44px; height: 44px; flex: 0 0 44px;',
  'class="mfrs-ghost-icon-button mfrs-ghost-add"',
  'class="mfrs-ghost-icon-button mfrs-ghost-remove"',
  'class="mfrs-submit"',
]) {
  addCheck('phase5', `welcome rendered contract: ${marker}`, () => {
    assert.ok(phase5RegexBlocks.welcome.includes(marker));
  });
}
for (const marker of ['class="mfrs-roll" data-mfrs-roll', 'role="meter"', 'aria-valuenow="$2"', 'aria-live="polite"']) {
  addCheck('phase5', `roll rendered contract: ${marker}`, () => {
    assert.ok(phase5RegexBlocks.roll.includes(marker));
  });
}
addCheck('phase5', 'roll template retires the structural dice emoji', () => {
  assert.equal(phase5RegexBlocks.roll.includes('\ud83c\udfb2'), false);
});
for (const marker of [
  'class="mfrs-input-panel" data-mfrs-panel="input" role="region"',
  'class="mfrs-input-fill"',
  'class="mfrs-input-clear"',
  'min-height: 44px;',
]) {
  addCheck('phase5', `input rendered contract: ${marker}`, () => {
    assert.ok(phase5RegexBlocks.input.includes(marker));
  });
}
addCheck('phase5', 'welcome anchor accordions use native buttons with synchronized ARIA', () => {
  assert.ok(sources.theme.includes("hostDocument.createElement('button')"));
  assert.equal(sources.theme.includes("const groupTitle = hostDocument.createElement('div')"), false);
  assert.equal(sources.theme.includes("const chapterTitle = hostDocument.createElement('div')"), false);
  for (const marker of [
    "groupTitle.setAttribute('aria-expanded'",
    "chapterTitle.setAttribute('aria-expanded'",
    "trigger.setAttribute('aria-controls'",
    "itemDiv.setAttribute('aria-selected'",
    "event.key !== 'Escape'",
  ]) {
    assert.ok(sources.theme.includes(marker), `theme missing welcome keyboard marker: ${marker}`);
  }
});
for (const marker of [
  '[data-mfrs-anchor-dropdown="true"]',
  'select[data-mfrs-anchor-enhanced="true"]',
  'delete select.dataset.mfrsAnchorEnhanced',
  "select.style.removeProperty('display')",
]) {
  addCheck('phase5', `welcome hot-reload cleanup: ${marker}`, () => {
    assert.ok(sources.theme.includes(marker), `theme missing welcome cleanup marker: ${marker}`);
  });
}
addCheck('phase5', 'roll verification renders seed as text and updates meter accessibility', () => {
  const rollEnhancer = between(sources.theme, 'const enhanceRollBars', 'const fillWelcomeStart');
  assert.equal(rollEnhancer.includes('verify.innerHTML'), false, 'roll seed must not be interpolated into innerHTML');
  assert.ok(rollEnhancer.includes('seedSpan.textContent = seed'));
  assert.ok(rollEnhancer.includes("track?.setAttribute('aria-valuenow'"));
  assert.ok(rollEnhancer.includes("track?.setAttribute('aria-valuetext'"));
});

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.listStages) {
    for (const [name, description] of stages) console.log(`${name}\t${description}`);
    return;
  }

  const maximum = stageIndex.get(options.stage);
  const selected = checks.filter(check => stageIndex.get(check.stage) <= maximum);
  const results = [];
  for (const check of selected) {
    check.run();
    results.push({ stage: check.stage, label: check.label, status: 'passed' });
  }

  const pending = checks.filter(check => stageIndex.get(check.stage) > maximum);
  if (options.json) {
    console.log(
      JSON.stringify(
        { stage: options.stage, passed: results, pending: pending.map(({ stage, label }) => ({ stage, label })) },
        null,
        2,
      ),
    );
  } else {
    console.log(
      `verify-mfrs-archive-ui-regressions: ${options.stage} passed (${results.length} checks; ${pending.length} later-stage checks pending)`,
    );
  }
}

try {
  main();
} catch (error) {
  console.error(`verify-mfrs-archive-ui-regressions: failed: ${error?.message || String(error)}`);
  process.exitCode = 1;
}
