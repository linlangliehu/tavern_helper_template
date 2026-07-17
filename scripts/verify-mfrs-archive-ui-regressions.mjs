/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

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
const messageAst = ts.createSourceFile(sourcePaths.message, sources.message, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const visualizerAst = ts.createSourceFile(sourcePaths.visualizer, sources.visualizer, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);

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

function astNodes(root, predicate) {
  const found = [];
  const visit = node => {
    if (predicate(node)) found.push(node);
    ts.forEachChild(node, visit);
  };
  visit(root);
  return found;
}

function oneAstNode(root, predicate, label) {
  const found = astNodes(root, predicate);
  assert.equal(found.length, 1, `expected one AST node: ${label}`);
  return found[0];
}

function messageFunction(name) {
  return oneAstNode(messageAst, node => ts.isFunctionDeclaration(node) && node.name?.text === name, `function ${name}`);
}

function messageTypeAlias(name) {
  return oneAstNode(messageAst, node => ts.isTypeAliasDeclaration(node) && node.name.text === name, `type ${name}`);
}

function variableDeclarations(name, root = messageAst) {
  return astNodes(root, node => ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name);
}

function variableInitializer(name, root = messageAst) {
  const declarations = variableDeclarations(name, root);
  assert.equal(declarations.length, 1, `expected one variable declaration: ${name}`);
  const [declaration] = declarations;
  assert.ok(declaration.initializer, `variable must have initializer: ${name}`);
  return declaration.initializer;
}

function unwrapExpression(expression) {
  let current = expression;
  while (ts.isParenthesizedExpression(current) || ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) || ts.isNonNullExpression(current)) {
    current = current.expression;
  }
  return current;
}

function literalValue(node) {
  const value = node && unwrapExpression(node);
  if (value && (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value))) return value.text;
  if (value && ts.isNumericLiteral(value)) return Number(value.text);
  if (value?.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (value?.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (value?.kind === ts.SyntaxKind.NullKeyword) return null;
  return null;
}

function memberName(expression) {
  const value = unwrapExpression(expression);
  if (ts.isIdentifier(value)) return value.text;
  if (ts.isPropertyAccessExpression(value)) return value.name.text;
  if (ts.isElementAccessExpression(value)) return literalValue(value.argumentExpression);
  return null;
}

function memberReceiver(expression) {
  const value = unwrapExpression(expression);
  return ts.isPropertyAccessExpression(value) || ts.isElementAccessExpression(value) ? unwrapExpression(value.expression) : null;
}

function expressionPath(expression) {
  const value = unwrapExpression(expression);
  if (ts.isIdentifier(value)) return value.text;
  if (value.kind === ts.SyntaxKind.ThisKeyword) return 'this';
  if (ts.isPropertyAccessExpression(value) || ts.isElementAccessExpression(value)) {
    const receiver = expressionPath(value.expression);
    const name = memberName(value);
    return receiver && name ? `${receiver}.${name}` : null;
  }
  return null;
}

function callsNamed(root, name) {
  return astNodes(root, node => ts.isCallExpression(node) && memberName(node.expression) === name);
}

function callArgumentsEqual(call, expected) {
  if (call.arguments.length !== expected.length) return false;
  return expected.every((value, index) => {
    if (value === undefined) return Boolean(call.arguments[index]);
    if (typeof value === 'string' && value.startsWith('$path:')) {
      return expressionPath(call.arguments[index]) === value.slice('$path:'.length);
    }
    return literalValue(call.arguments[index]) === value;
  });
}

function callExpressionMatches(expression, name, expected = [], receiverPath = null) {
  const value = unwrapExpression(expression);
  return ts.isCallExpression(value) && memberName(value.expression) === name && callArgumentsEqual(value, expected) &&
    (receiverPath === null || expressionPath(memberReceiver(value.expression)) === receiverPath);
}

function logicalTerms(expression, operatorKind) {
  const value = unwrapExpression(expression);
  if (!ts.isBinaryExpression(value) || value.operatorToken.kind !== operatorKind) return [value];
  return [...logicalTerms(value.left, operatorKind), ...logicalTerms(value.right, operatorKind)];
}

function binaryMatches(expression, operatorKind, leftPath, rightValue) {
  const value = unwrapExpression(expression);
  if (!ts.isBinaryExpression(value) || value.operatorToken.kind !== operatorKind || expressionPath(value.left) !== leftPath) return false;
  return typeof rightValue === 'string' && rightValue.startsWith('$path:')
    ? expressionPath(value.right) === rightValue.slice('$path:'.length)
    : literalValue(value.right) === rightValue;
}

function negates(expression, predicate) {
  const value = unwrapExpression(expression);
  return ts.isPrefixUnaryExpression(value) && value.operator === ts.SyntaxKind.ExclamationToken && predicate(unwrapExpression(value.operand));
}

function callsMatching(root, name, expected = []) {
  return callsNamed(root, name).filter(call => callArgumentsEqual(call, expected));
}

function oneCall(root, name, expected, label) {
  const calls = callsMatching(root, name, expected);
  assert.equal(calls.length, 1, `expected one call: ${label}`);
  return calls[0];
}

function directStatements(statement) {
  return ts.isBlock(statement) ? [...statement.statements] : [statement];
}

function oneDirectCall(statement, name, expected, label) {
  const calls = directStatements(statement)
    .filter(ts.isExpressionStatement)
    .map(node => unwrapExpression(node.expression))
    .filter(node => callExpressionMatches(node, name, expected));
  assert.equal(calls.length, 1, `expected one direct call: ${label}`);
  return calls[0];
}

function assignmentsToMember(root, receiverPath, property) {
  return astNodes(root, node => ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    memberName(node.left) === property && expressionPath(memberReceiver(node.left)) === receiverPath);
}

function assignmentsToIdentifier(root, name) {
  return astNodes(root, node => ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    ts.isIdentifier(unwrapExpression(node.left)) && unwrapExpression(node.left).text === name);
}

function nodeContains(outer, inner) {
  return inner.getStart(messageAst) >= outer.getStart(messageAst) && inner.end <= outer.end;
}

function ifStatements(root, predicate) {
  return astNodes(root, node => ts.isIfStatement(node) && predicate(node));
}

function oneIf(root, predicate, label) {
  const matches = ifStatements(root, predicate);
  assert.equal(matches.length, 1, `expected one if statement: ${label}`);
  return matches[0];
}

function containsIdentifier(root, name) {
  return astNodes(root, node => ts.isIdentifier(node) && node.text === name).length > 0;
}

function containsBinary(root, operatorKind, leftPath, rightValue) {
  return astNodes(root, node => binaryMatches(node, operatorKind, leftPath, rightValue)).length > 0;
}

function directReturn(statement) {
  if (ts.isReturnStatement(statement)) return statement;
  if (ts.isBlock(statement) && statement.statements.length === 1 && ts.isReturnStatement(statement.statements[0])) return statement.statements[0];
  return null;
}

function belongsToFunction(node, functionNode) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isFunctionLike(parent)) return parent === functionNode;
  }
  return false;
}

function templateRaw(node) {
  const value = unwrapExpression(node);
  assert.ok(ts.isTemplateExpression(value) || ts.isNoSubstitutionTemplateLiteral(value), 'expected template literal AST');
  return sources.message.slice(value.getStart(messageAst) + 1, value.end - 1);
}

function returnedTemplate(functionNode) {
  const returns = astNodes(functionNode.body,
    node => ts.isReturnStatement(node) && node.expression && belongsToFunction(node, functionNode));
  assert.equal(returns.length, 1, `expected one returned template in ${functionNode.name?.text || 'function'}`);
  return templateRaw(returns[0].expression);
}

function assignedTemplate(functionNode, receiverPath, property) {
  const assignments = assignmentsToMember(functionNode, receiverPath, property).filter(node =>
    [ts.SyntaxKind.TemplateExpression, ts.SyntaxKind.NoSubstitutionTemplateLiteral].includes(unwrapExpression(node.right).kind));
  assert.equal(assignments.length, 1, `expected one template assignment to ${receiverPath}.${property}`);
  return templateRaw(assignments[0].right);
}

function astLiteralTexts(root) {
  const templateKinds = new Set([ts.SyntaxKind.TemplateHead, ts.SyntaxKind.TemplateMiddle, ts.SyntaxKind.TemplateTail]);
  return astNodes(root, node => ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || templateKinds.has(node.kind))
    .map(node => node.text);
}

function staticConcatenatedString(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isParenthesizedExpression(node)) return staticConcatenatedString(node.expression);
  if (!ts.isBinaryExpression(node) || node.operatorToken.kind !== ts.SyntaxKind.PlusToken) return null;
  const left = staticConcatenatedString(node.left);
  const right = staticConcatenatedString(node.right);
  return left === null || right === null ? null : left + right;
}

function astCodeTexts(root) {
  return astNodes(root, node => ts.isIdentifier(node) || ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) || [ts.SyntaxKind.TemplateHead, ts.SyntaxKind.TemplateMiddle, ts.SyntaxKind.TemplateTail].includes(node.kind))
    .map(node => node.text);
}

function stripHtmlComments(source) {
  return source.replace(/<!--[\s\S]*?(?:-->|$)/g, '');
}

function cssTemplateContaining(marker) {
  const candidates = astNodes(messageAst, node => ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.EqualsToken && memberName(node.left) === 'textContent' &&
    (ts.isTemplateExpression(node.right) || ts.isNoSubstitutionTemplateLiteral(node.right)))
    .map(node => templateRaw(node.right))
    .filter(css => css.includes(marker));
  assert.equal(candidates.length, 1, `expected one CSS template containing ${marker}`);
  return candidates[0];
}

function maskCharacter(character) {
  return character === '\n' || character === '\r' ? character : ' ';
}

function maskCss(source, maskStrings = false) {
  const output = source.split('');
  let quote = '';
  for (let index = 0; index < source.length; index += 1) {
    if (quote) {
      if (maskStrings) output[index] = maskCharacter(source[index]);
      if (source[index] === '\\') {
        index += 1;
        if (maskStrings && index < source.length) output[index] = maskCharacter(source[index]);
      } else if (source[index] === quote) quote = '';
      continue;
    }
    if (source[index] === "'" || source[index] === '"') {
      quote = source[index];
      if (maskStrings) output[index] = maskCharacter(source[index]);
      continue;
    }
    if (source[index] === '/' && source[index + 1] === '*') {
      let end = index + 2;
      while (end < source.length && !(source[end] === '*' && source[end + 1] === '/')) end += 1;
      end = Math.min(source.length, end + 2);
      for (let cursor = index; cursor < end; cursor += 1) output[cursor] = maskCharacter(source[cursor]);
      index = end - 1;
    }
  }
  return output.join('');
}

const stripCssComments = source => maskCss(source);
const cssCodeMask = source => maskCss(source, true);

function cssBlockAt(source, matchIndex, matchText, label) {
  const uncommented = stripCssComments(source);
  const relativeOpen = matchText.lastIndexOf('{');
  assert.notEqual(relativeOpen, -1, `missing CSS opening brace: ${label}`);
  const openIndex = matchIndex + relativeOpen;
  const codeMask = cssCodeMask(source);
  let depth = 0;
  let endIndex = -1;
  for (let index = openIndex; index < codeMask.length; index += 1) {
    if (codeMask[index] === '{') depth += 1;
    else if (codeMask[index] === '}') {
      depth -= 1;
      if (depth === 0) {
        endIndex = index;
        break;
      }
    }
  }
  assert.notEqual(endIndex, -1, `missing CSS closing brace: ${label}`);
  return { start: matchIndex, end: endIndex + 1, text: uncommented.slice(matchIndex, endIndex + 1) };
}

function findCssBlocks(source, pattern, label) {
  const uncommented = stripCssComments(source);
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const regex = new RegExp(pattern.source, flags);
  const matches = [...uncommented.matchAll(regex)];
  return matches.map(match => cssBlockAt(source, match.index, match[0], label));
}

function cssBlocksMatching(source, pattern, label) {
  const matches = findCssBlocks(source, pattern, label);
  assert.ok(matches.length > 0, `missing CSS block: ${label}`);
  return matches;
}

function oneCssBlock(source, pattern, label) {
  const blocks = cssBlocksMatching(source, pattern, label);
  assert.equal(blocks.length, 1, `expected one CSS block: ${label}`);
  return blocks[0];
}

function lastCssDeclaration(ruleText, property) {
  const body = ruleText.slice(ruleText.lastIndexOf('{') + 1, ruleText.lastIndexOf('}'));
  const mask = cssCodeMask(body);
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?:^|;)\\s*${escapedProperty}\\s*:\\s*([^;}]+)`, 'g');
  let value = null;
  for (const match of mask.matchAll(pattern)) value = match[1].trim().replace(/\s+/g, ' ');
  return value;
}

function finalCssDeclaration(source, selectorPattern, property, viewportWidth = Number.POSITIVE_INFINITY) {
  const mediaBlocks = findCssBlocks(source, /@media\b[^\{]*\{/g, 'CSS media').map(block => ({
    ...block,
    maxWidth: Number(block.text.match(/max-width\s*:\s*(\d+)px/)?.[1] ?? Number.NaN),
  }));
  let value = null;
  for (const rule of findCssBlocks(source, selectorPattern, `CSS selector for ${property}`)) {
    const containers = mediaBlocks.filter(media => media.start < rule.start && rule.end <= media.end);
    if (containers.some(media => !Number.isFinite(media.maxWidth) || viewportWidth > media.maxWidth)) continue;
    value = lastCssDeclaration(rule.text, property) ?? value;
  }
  return value;
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
// Path β IA v2.1: 7-key nav, no cabinet primary, center panels, full-library secondary.
addCheck('phase5', 'IA v2.1 seven-key nav without cabinet primary', () => {
  for (const nav of ['story', 'dossier', 'relation', 'memory', 'gacha', 'system', 'settings']) {
    assert.ok(
      sources.message.includes(`data-mfrs-hud-nav="${nav}"`),
      `missing immersive nav key: ${nav}`,
    );
  }
  assert.equal(
    /data-mfrs-hud-nav="cabinet"><i class="fa-solid/.test(sources.message) ||
      /data-mfrs-hud-nav="cabinet"[^>]*>[\s\S]*?<span>柜<\/span>/.test(sources.message),
    false,
    'cabinet must not be a primary right-rail nav button',
  );
  assert.ok(sources.message.includes("data-mfrs-hud=\"memory-slot\""), 'missing memory center slot');
  assert.ok(sources.message.includes("data-mfrs-hud=\"gacha-slot\""), 'missing gacha center slot');
  assert.ok(sources.message.includes("data-mfrs-hud=\"system-slot\""), 'missing system center slot');
  assert.ok(sources.message.includes('function openHudFullLibrary'), 'full library secondary entry required');
  assert.ok(sources.message.includes('function buildHudMemoryPanelHtml'), 'memory panel builder');
  assert.ok(sources.message.includes('function buildHudGachaPanelHtml'), 'gacha panel builder');
  assert.ok(sources.message.includes('function buildHudSystemPanelHtml'), 'system panel builder');
  assert.ok(sources.message.includes('function buildHudInvestigationSectionsHtml'), 'investigation summary builder');
  assert.ok(sources.message.includes('function buildCheckSuggestionsFoldHtml'), 'check suggestions fold builder');
  assert.ok(sources.message.includes('function migrateHudShellDom'), 'shell migration for hot reload');
  assert.equal(sources.message.includes('Mvu.replaceMvuData'), false, 'IA panels must remain read-only');
});
addCheck('phase5', 'β2 resource readout is display-only structured fields', () => {
  const resourceBuilder = between(
    sources.message,
    'function buildHudResourceSectionsHtml',
    'function buildHudInvestigationSectionsHtml',
  );
  assert.ok(resourceBuilder, 'missing hud resource builder');
  const officialGold = resourceBuilder.indexOf("_.get(data, '灵异资源.黄金储备')");
  const legacyGold = [
    "_.get(data, '灵异资源.黄金')",
    "_.get(data, '灵异资源.鬼钱')",
    "_.get(data, '黄金')",
  ].map(marker => resourceBuilder.indexOf(marker));
  assert.ok(officialGold >= 0, 'resource builder must read schema path 灵异资源.黄金储备');
  assert.ok(legacyGold.every(index => index >= 0), 'resource builder must preserve legacy gold aliases');
  assert.ok(
    legacyGold.every(index => officialGold < index),
    'schema path 灵异资源.黄金储备 must win over legacy aliases',
  );
  assert.ok(resourceBuilder.includes('灵异资源.鬼拼图') || resourceBuilder.includes('鬼拼图'), 'puzzle path');
  assert.equal(resourceBuilder.includes('Mvu.replaceMvuData'), false, 'must not write MVU from hud resource UI');
});

// Phase β3: cabinet overlay, esc/mask close, narrow drawers, a11y targets.
addCheck('phase5', 'β3 cabinet overlay chrome and close paths', () => {
  assert.ok(sources.message.includes('mfrs-hud-cabinet-mask') || sources.message.includes('cabinet-mask'), 'cabinet mask');
  assert.ok(sources.message.includes('cabinet-close'), 'cabinet close control');
  assert.ok(sources.message.includes('is-cabinet-open'), 'cabinet open shell class');
  assert.ok(sources.message.includes("e.key === 'Escape'") || sources.message.includes('Escape'), 'Esc close');
  assert.ok(sources.message.includes('function closeHudCabinetLayer'), 'close cabinet helper');
  assert.ok(sources.message.includes('function parkFixedHostForHudCabinet'), 'cabinet must park fixed host into shell');
  assert.ok(sources.message.includes('function restoreFixedHostFromHudCabinet'), 'cabinet must restore fixed host on close');
  assert.ok(sources.message.includes('function expandArchiveCabinetUi'), 'cabinet must expand nav/dashboard UI');
  assert.ok(sources.message.includes('shell.appendChild(host)'), 'park host inside shell so shell cannot cover it');
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
addCheck('phase5', 'immersive cabinet uses full-width vertical card stack CSS only', () => {
  assert.ok(
    sources.message.includes('mfrs-hud-cabinet-open') && sources.message.includes('.acu-card-grid'),
    'immersive cabinet must restyle ACU card grid',
  );
  assert.ok(
    sources.message.includes('flex-direction: column') && sources.message.includes('.acu-data-card'),
    'immersive cabinet cards must stack vertically full-width',
  );
  assert.ok(
    sources.message.includes('#acu-data-area.acu-data-display') || sources.message.includes('.acu-data-display'),
    'immersive cabinet must un-popover data display into in-flow stack',
  );
  assert.equal(sources.message.includes('Mvu.replaceMvuData'), false, 'cabinet layout CSS must not write MVU');
});

// Phase A (post-8.12.3): tavern menu stable open/close + fail feedback + Esc layering.
addCheck('phase5', 'A1 close prior ST drawers before opening menu target', () => {
  assert.ok(sources.message.includes('function closeOpenStDrawers'), 'missing closeOpenStDrawers');
  assert.ok(sources.message.includes('function hasOpenStDrawers'), 'missing hasOpenStDrawers');
  const runAction = between(sources.message, 'function runHudTavernAction', 'function reparentSendFormIntoHud');
  assert.ok(runAction.includes('closeOpenStDrawers()'), 'menu click must close open drawers first');
  assert.ok(runAction.includes('beginHudOverlayWatch()'), 'menu click must start yielded overlay watch');
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
  assert.ok(
    keydown.includes('isHudCenterBusinessView') || keydown.includes("setHudView('story')"),
    'Esc must dismiss center business panels',
  );
  assert.ok(keydown.includes('closeHudSideDrawers'), 'Esc must close side drawers');
  assert.equal(keydown.includes('exitHudImmersive()'), false, 'Esc must not exit immersion by default');
});
addCheck('phase5', 'A4 close panel restores ST UI and clears open drawers', () => {
  assert.ok(sources.message.includes('function restoreHudFromStUi'), 'missing restoreHudFromStUi');
  assert.ok(sources.message.includes('function closeSpDatabaseUi'), 'close panel must close SP·数据库 III');
  const restore = between(sources.message, 'function restoreHudFromStUi', 'function closeHudSettingsPanel');
  assert.ok(restore.includes('closeSpDatabaseUi('), 'restore must call closeSpDatabaseUi');
  assert.ok(restore.includes('closeOpenStDrawers()'), 'close panel must close drawers');
  assert.ok(
    restore.includes('releaseHudFromStUi(') ||
      restore.includes('classList.remove(HUD_ST_UI_CLASS)') ||
      restore.includes("classList.remove('mfrs-hud-st-ui-open')"),
    'close panel must release st-ui class',
  );
  assert.ok(sources.message.includes('关闭面板'), 'missing close-panel control label');
  assert.ok(
    sources.message.includes('关闭新 UI') && sources.message.includes('关闭数据库编辑器'),
    'must target SP native close labels',
  );
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
  assert.ok(
    sources.message.includes('max-height: min(36vh, 280px)') ||
      sources.message.includes('max-height:min(36vh, 280px)') ||
      sources.message.includes('max-height: min(28vh, 220px)') ||
      sources.message.includes('max-height:min(28vh, 220px)'),
    'actions height cap',
  );
  assert.ok(sources.message.includes('data-mfrs-hud="actions"'), 'actions details host');
  // 本轮选项唯一入口：输入框上方 HUD；无真实行动建议时隐藏
  assert.ok(sources.message.includes('function stripInlineChoicesFromMessage'), 'strip body inline choices');
  assert.ok(sources.message.includes('function hasRealActionSuggestions'), 'gate HUD on real 行动建议');
  assert.ok(sources.message.includes('function collectRealActionSuggestions'), 'collect real actions only');
  assert.ok(
    sources.message.includes('function parseActionSuggestionsFromMessageText'),
    'fallback parse 行动建议 from UpdateVariable when MVU empty',
  );
  assert.ok(
    sources.message.includes('function getLatestAiMessageRawText'),
    'must read raw AI mes for UpdateVariable fallback',
  );
  assert.ok(
    sources.message.includes('actionsSlot.innerHTML = buildActionsHtml(data)') ||
      sources.message.includes('actionsSlot.innerHTML=buildActionsHtml(data)'),
    'HUD actions slot filled with buildActionsHtml',
  );
  assert.ok(
    sources.message.includes('actionsHost.hidden = true') ||
      sources.message.includes('actionsHost.hidden=true'),
    'HUD actions hidden when no real 行动建议',
  );
  assert.equal(
    sources.message.includes('先观察走廊敲门声与教室反应') ||
      sources.message.includes('本轮未落库行动建议'),
    false,
    'must not ship provisional opening placeholders',
  );
  assert.ok(sources.message.includes('function resolveActionSuggestions'), 'fixed A-D action resolver');
  assert.ok(
    /mfrs-msg-inline-choices[\s\S]{0,120}display:\s*none\s*!important/.test(sources.message) ||
      sources.message.includes('body.${HUD_BODY_CLASS} .mfrs-msg-inline-choices'),
    'body inline choices must be hidden in HUD mode',
  );
  assert.ok(
    sources.message.includes('mfrs-msg-actions-block') && sources.message.includes("display = 'none'"),
    'tri-panel 拟办 block must be suppressed',
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
addCheck('phase5', 'immersive yields z-index for SP database III shell', () => {
  assert.ok(sources.message.includes('function maybeYieldHudForExternalOverlay'), 'must yield when opening SP menu');
  assert.ok(sources.message.includes('function isSpDatabaseUiOpen'), 'must detect SP shell open');
  assert.ok(sources.message.includes('acu-v2-app__shell'), 'must lift SP v2 shell above HUD');
  assert.ok(sources.message.includes('yieldHudToStUi'), 'must reuse ST yield path');
  assert.equal(sources.message.includes('Mvu.replaceMvuData'), false, 'SP yield must remain presentation-only');
});
addCheck('phase5', 'immersive overlay scan + extension menu unified yield', () => {
  assert.ok(sources.message.includes('function scanAndYieldHudOverlays'), 'overlay scan helper');
  assert.ok(sources.message.includes('function collectHudCoverableOverlays'), 'overlay collector');
  assert.ok(sources.message.includes('function ensureHudOverlayObserver'), 'mutation observer for overlays');
  assert.ok(sources.message.includes('function scheduleHudOverlayWatch'), 'timed overlay watch');
  assert.ok(sources.message.includes('function stopHudOverlayWatch'), 'overlay watch cleanup');
  assert.ok(sources.message.includes('data-mfrs-hud-overlay-lift'), 'lift attribute marker');
  assert.ok(sources.message.includes('function isHudStCoreLayoutElement'), 'must exclude ST core layout');
  assert.ok(sources.message.includes("'sheld'") || sources.message.includes('"sheld"'), 'must exclude #sheld');
  assert.ok(sources.message.includes("'bg1'") || sources.message.includes('"bg1"'), 'must exclude #bg1');
  assert.ok(sources.message.includes('HUD_EXTENSION_ENTRY_SELECTOR') || sources.message.includes('#extensionsMenu'), 'extension menu entry');
  assert.ok(sources.message.includes('function isHudExtensionEntryClick'), 'extension entry click detector');
  const unbind = between(sources.message, 'function unbindHudShellEvents', 'function rebindMessageObserverToChat');
  assert.ok(unbind.includes('stopHudOverlayWatch'), 'unbind must stop overlay watch');
  assert.equal(sources.message.includes('Mvu.replaceMvuData'), false, 'overlay yield must remain presentation-only');
});
addCheck('phase5', 'immersive overlay watch is epoch-scoped and non-destructive', () => {
  const drawerSelectors = between(sources.message, 'const ST_OPEN_DRAWER_SELECTORS', 'type DomRestorePoint');
  for (const marker of [
    '.drawer-content.openDrawer',
    '#left-nav-panel.openDrawer',
    '#right-nav-panel.openDrawer',
    '#WorldInfo.openDrawer',
    '#rm_api_block.openDrawer',
    '#AdvancedFormatting.openDrawer',
    '#user-settings-block.openDrawer',
    '#rm_extensions_block.openDrawer',
    '#PersonaManagement.openDrawer',
    '#Backgrounds.openDrawer',
  ]) {
    assert.ok(drawerSelectors.includes(marker), `canonical drawer selector missing ${marker}`);
  }
  assert.ok(drawerSelectors.includes('HUD_ST_OPEN_DRAWER_SELECTOR'), 'CSS drawer selector must derive from canonical list');
  const yieldBlock = between(sources.message, 'function yieldHudToStUi', 'const SP_DB_UI_SELECTOR');
  assert.equal(yieldBlock.includes('scheduleHudOverlayWatch'), false, 'yield must not recursively schedule watch');
  const scheduleBlock = between(sources.message, 'function scheduleHudOverlayWatch', 'function beginHudOverlayWatch');
  assert.ok(scheduleBlock.includes('scheduleHudOverlayTask'), 'burst callbacks must use tracked timer helper');
  assert.ok(scheduleBlock.includes('epoch !== hudOverlayEpoch'), 'interval must reject stale epochs');
  const scanBlock = between(sources.message, 'function scanAndYieldHudOverlays', 'function scheduleHudOverlayWatch');
  assert.equal(scanBlock.includes('scheduleHudOverlayWatch'), false, 'scan must not restart watcher burst');
  const maybeRestore = between(sources.message, 'function maybeRestoreHudAfterOverlayClose', 'function maybeHandleSpDatabaseCloseClick');
  assert.ok(maybeRestore.includes('HUD_OVERLAY_OPENING_GRACE_MS') || maybeRestore.includes('hudOverlayOpeningUntil'), 'opening grace required');
  assert.ok(maybeRestore.includes('hudOverlayRestoreTimer'), 'stable-close debounce required');
  assert.ok(maybeRestore.includes('releaseHudFromStUi'), 'auto close must use non-destructive release');
  for (const destructive of ['closeSpDatabaseUi(', 'closeOpenStDrawers(', 'forceCloseStDrawerClasses(', 'restoreHudFromStUi(']) {
    assert.equal(maybeRestore.includes(destructive), false, `auto restore must not call ${destructive}`);
  }
  const releaseBlock = between(sources.message, 'function releaseHudFromStUi', 'function maybeRestoreHudAfterOverlayClose');
  for (const destructive of ['closeSpDatabaseUi(', 'closeOpenStDrawers(', 'forceCloseStDrawerClasses(']) {
    assert.equal(releaseBlock.includes(destructive), false, `release must not call ${destructive}`);
  }
  const runAction = between(sources.message, 'function runHudTavernAction', 'function reparentSendFormIntoHud');
  assert.ok(runAction.includes("closest?.('.drawer-toggle')"), 'icon targets must resolve their drawer-toggle ancestor');
  assert.ok(runAction.includes("querySelector?.('.drawer-toggle')"), 'drawer container targets must resolve a child drawer-toggle');
  assert.ok(runAction.includes('epoch !== hudOverlayEpoch'), 'menu action callbacks must reject stale epochs');
  assert.ok(runAction.includes('hudMenuOpenTimer = hostWindow.setTimeout(fire, openDelay)'), 'menu open timeout must be tracked');
  const stopWatch = between(sources.message, 'function stopHudOverlayWatch', 'function isHudExtensionEntryClick');
  assert.ok(stopWatch.includes('invalidateHudOverlaySession'), 'watch cleanup must invalidate epoch and clear timers');
  const cancelMenu = between(sources.message, 'function cancelHudMenuOpenSchedule', 'function clearHudOverlaySessionTimers');
  assert.ok(cancelMenu.includes('hudMenuOpenTimer'), 'watch cleanup must cancel pending menu-open timer');
  assert.ok(sources.message.includes('const hudOverlayBurstTimers = new Set<number>()'), 'watch burst timers must be tracked');
  assert.ok(sources.message.includes('HUD_OVERLAY_STABLE_CLOSE_MS'), 'stable-close timing constant required');
});
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

// Phase G: immersive center archive preview wiring (read-only drill-down from dossier investigation lists).
addCheck('phase5', 'G1 archive-item click interception writes selection and opens archive view', () => {
  const clickHandler = between(sources.message, 'function handleHudShellClick', 'function handleHudKeydown');
  assert.ok(clickHandler.includes("target.closest('.mfrs-hud-archive-item')"), 'must intercept .mfrs-hud-archive-item clicks');
  assert.ok(clickHandler.includes('data-mfrs-hud-archive-table-key'), 'must read archive table key');
  assert.ok(clickHandler.includes('data-mfrs-hud-archive-table-name'), 'must read archive table name');
  assert.ok(clickHandler.includes('data-mfrs-hud-archive-row-id'), 'must read archive row id');
  assert.ok(clickHandler.includes('hudArchiveSelection = {'), 'must write selection object');
  assert.ok(clickHandler.includes("setHudView('archive')"), 'must switch to archive view');
  assert.ok(clickHandler.includes('max-width: 800px'), 'must close side drawers on narrow screens');
  // interception must come before the open-table (full library) branch
  assert.ok(
    clickHandler.indexOf('.mfrs-hud-archive-item') < clickHandler.indexOf('data-mfrs-hud-open-table'),
    'archive-item interception must precede the open-table branch',
  );
});
addCheck('phase5', 'G2 refreshHudBusinessPanels refreshes the archive slot', () => {
  const refresh = between(sources.message, 'function refreshHudBusinessPanels', 'function activateAcuNavTarget');
  assert.ok(refresh.includes('data-mfrs-hud="archive-slot"'), 'must target the archive slot');
  assert.ok(refresh.includes('buildHudArchivePreviewHtml()'), 'must render archive preview into the slot');
  assert.ok(sources.message.includes('data-mfrs-hud="archive-slot" hidden'), 'shell HTML must declare a hidden archive slot');
});
addCheck('phase5', 'G3 setHudView has a dedicated archive branch', () => {
  const setView = between(sources.message, 'function setHudView', 'function refreshHudBusinessPanels');
  assert.ok(setView.includes("view === 'archive'"), 'archive view needs a dedicated branch');
  assert.ok(setView.includes('closeHudCabinetLayer()'), 'archive must close cabinet layer');
  assert.ok(setView.includes('buildHudArchivePreviewHtml()'), 'archive entry must render the slot');
  // desktop keeps the left dossier column; only narrow screens close side drawers
  assert.ok(setView.includes('max-width: 800px'), 'archive branch must gate side-drawer close on narrow screens');
  // the dedicated archive branch must not trigger the memory/gacha/system refresh path
  const archiveBranchStart = setView.indexOf("if (view === 'archive')");
  assert.ok(archiveBranchStart !== -1, 'archive branch must exist as a dedicated if');
  const businessStart = setView.indexOf('if (isHudCenterBusinessView', archiveBranchStart);
  const archiveBranch =
    businessStart !== -1 ? setView.slice(archiveBranchStart, businessStart) : setView.slice(archiveBranchStart);
  assert.equal(
    archiveBranch.includes('refreshHudBusinessPanels'),
    false,
    'archive branch must not refresh memory/gacha/system',
  );
});
addCheck('phase5', 'G4 four investigation archive rules emit selectable items', () => {
  const rules = between(sources.message, 'function getHudArchiveRules', 'function hudRowId');
  for (const key of ['sheet_clues', 'sheet_ghost_archives', 'sheet_characters', 'sheet_locations']) {
    assert.ok(rules.includes(`key: '${key}'`), `archive rule missing: ${key}`);
  }
  for (const name of ['线索', '厉鬼档案', '人物', '地点']) {
    assert.ok(rules.includes(`names: ['${name}']`), `archive rule name missing: ${name}`);
  }
  const listBuilder = between(
    sources.message,
    'function buildHudArchiveSummaryListHtml',
    'function buildHudArchivePreviewHtml',
  );
  assert.ok(listBuilder.includes('mfrs-hud-archive-item'), 'summary list must emit archive-item buttons');
  assert.ok(listBuilder.includes('data-mfrs-hud-archive-table-key'), 'item must carry table key');
  assert.ok(listBuilder.includes('data-mfrs-hud-archive-table-name'), 'item must carry table name');
  assert.ok(listBuilder.includes('data-mfrs-hud-archive-row-id'), 'item must carry row id');
});
addCheck('phase5', 'G5 archive preview is read-only with no full-library button', () => {
  const preview = between(
    sources.message,
    'function buildHudArchivePreviewHtml',
    'function buildHudInvestigationSectionsHtml',
  );
  assert.equal(preview.includes('data-mfrs-hud-open-table'), false, 'archive preview must not embed open-table buttons');
  assert.equal(preview.includes('open-full-library'), false, 'archive preview must not embed full-library buttons');
  assert.equal(preview.includes('Mvu.replaceMvuData'), false, 'archive preview must remain read-only');
  assert.ok(preview.includes('只读'), 'archive preview must label itself read-only');
});
addCheck('phase5', 'G6 clue visibility fails closed when the column is missing', () => {
  const visible = between(sources.message, 'function isHudArchiveRowVisible', 'function findHudArchiveRule');
  assert.ok(visible.includes("missing !== 'deny'"), 'missing visibility must deny when policy is deny');
  const rules = between(sources.message, 'function getHudArchiveRules', 'function hudRowId');
  assert.ok(rules.includes("missing: 'deny'"), 'clue rule must fail closed on missing visibility');
  assert.ok(rules.includes("'玩家可见'"), 'clue rule must only allow 玩家可见 rows');
  // findHudArchiveRow must reject invisible rows so a stale/hidden selection cannot render
  const findRow = between(sources.message, 'function findHudArchiveRow', 'function hudRowField');
  assert.ok(findRow.includes('isHudArchiveRowVisible'), 'archive row lookup must enforce visibility');
});
addCheck('phase5', 'G7 Esc returns from archive center panel to story body', () => {
  const keydown = between(sources.message, 'function handleHudKeydown', 'function bindHudShellEvents');
  assert.ok(keydown.includes('isHudCenterBusinessView(hudActiveView)'), 'Esc must detect center business views (incl. archive)');
  assert.ok(keydown.includes("setHudView('story')"), 'Esc must return to story body from a center panel');
});
addCheck('phase5', 'G8 database table-update callback drives HUD revision and refresh', () => {
  assert.ok(sources.message.includes('hudDatabaseRevision += 1'), 'callback must bump the database revision');
  assert.ok(sources.message.includes('hudDatabaseCallbackRegistered'), 'callback registration must be idempotent via a flag');
  assert.ok(sources.message.includes('registerHudDatabaseUpdateCallback'), 'register helper required');
  assert.ok(sources.message.includes('unregisterHudDatabaseUpdateCallback'), 'unregister helper required');
  assert.ok(sources.message.includes('registerTableUpdateCallback'), 'must register through AutoCardUpdaterAPI');
  assert.ok(sources.message.includes('unregisterTableUpdateCallback'), 'must unregister through AutoCardUpdaterAPI');
  const renderKey = between(sources.message, 'function getPanelRenderKey', 'function getBrandId');
  assert.ok(renderKey.includes('hudDatabaseRevision'), 'render key must include the database revision');
  const activate = between(sources.message, 'function activateMessagePanelRuntime', 'function clearChatChangedTimers');
  assert.ok(activate.includes('registerHudDatabaseUpdateCallback'), 'activate must register the callback');
  const deactivate = between(
    sources.message,
    'function deactivateMessagePanelRuntime',
    'function activateMessagePanelRuntime',
  );
  assert.ok(deactivate.includes('unregisterHudDatabaseUpdateCallback'), 'deactivate must unregister the callback');
  const cleanupBlock = between(
    sources.message,
    'const cleanup = () => {',
    'hostWindow.__mfrsMessagePanelCleanup__ = cleanup',
  );
  assert.ok(cleanupBlock.includes('unregisterHudDatabaseUpdateCallback'), 'cleanup must unregister the callback');
});
addCheck('phase5', 'G9 archive selection resets on unmount/destroy/unregister', () => {
  const unmount = between(sources.message, 'function unmountHudImmersive', 'function exitHudImmersive');
  assert.ok(unmount.includes('hudArchiveSelection = null'), 'unmount must clear archive selection');
  const destroy = between(sources.message, 'function destroyHudImmersive', '$(() => {');
  assert.ok(destroy.includes('hudArchiveSelection = null'), 'destroy must clear archive selection');
  const unregister = between(
    sources.message,
    'function unregisterHudDatabaseUpdateCallback',
    'function restoreFixedHostFromHudCabinet',
  );
  assert.ok(unregister.includes('hudArchiveSelection = null'), 'unregister callback must clear archive selection');
});

// Phase H: memory center panel CRUD + gacha center panel embedding (Task #3 + Task #4).
addCheck('phase5', 'H1 memory panel renders interactive rows with edit/delete buttons', () => {
  const memPanel = between(sources.message, 'function buildHudMemoryPanelHtml', 'function buildHudGachaPanelHtml');
  assert.ok(memPanel.includes('data-mfrs-hud-memory-action'), 'memory panel must emit data-mfrs-hud-memory-action buttons');
  assert.ok(memPanel.includes('data-mfrs-hud-memory-action="edit"'), 'memory rows must have edit buttons');
  assert.ok(memPanel.includes('data-mfrs-hud-memory-action="delete"'), 'memory rows must have delete buttons');
  assert.ok(memPanel.includes('data-mfrs-hud-memory-action="new"'), 'memory sections must have add-new buttons');
});
addCheck('phase5', 'H2 memory form renders fields from memoryEditor config', () => {
  const formFunc = between(sources.message, 'function buildHudMemoryFormHtml', 'function buildHudGachaPanelHtml');
  assert.ok(formFunc.includes('data-mfrs-hud-memory-field'), 'form must emit data-mfrs-hud-memory-field inputs');
  assert.ok(formFunc.includes('textareaHeaders'), 'form must render textareas for textareaHeaders');
  assert.ok(formFunc.includes('enumHeaders'), 'form must render selects for enumHeaders');
  assert.ok(formFunc.includes('rangeIntHeaders'), 'form must render number inputs for rangeIntHeaders');
  assert.ok(formFunc.includes('readonlyOnEdit'), 'form must respect readonlyOnEdit');
  assert.ok(formFunc.includes('data-mfrs-hud-memory-action="save"'), 'form must have a save button');
  assert.ok(formFunc.includes('data-mfrs-hud-memory-action="cancel"'), 'form must have a cancel button');
});
addCheck('phase5', 'H3 handleHudShellClick dispatches memory CRUD actions', () => {
  const click = between(sources.message, 'function handleHudShellClick', 'function handleHudKeydown');
  assert.ok(click.includes('data-mfrs-hud-memory-action'), 'click handler must intercept memory action buttons');
  assert.ok(click.includes("memAct === 'new'"), 'must handle new action');
  assert.ok(click.includes("memAct === 'edit'"), 'must handle edit action');
  assert.ok(click.includes("memAct === 'delete'"), 'must handle delete action');
  assert.ok(click.includes("memAct === 'save'"), 'must handle save action');
  assert.ok(click.includes("memAct === 'cancel'"), 'must handle cancel action');
  assert.ok(click.includes('hudMemoryEditState'), 'must write/read hudMemoryEditState');
});
addCheck('phase5', 'H4 memory save calls MysteryDatabaseFrontend.applyMemoryChange', () => {
  const save = between(sources.message, 'async function executeHudMemorySave', 'async function executeHudMemoryDelete');
  assert.ok(save.includes('MysteryDatabaseFrontend'), 'must access MysteryDatabaseFrontend');
  assert.ok(save.includes('applyMemoryChange'), 'must call applyMemoryChange');
  assert.ok(save.includes("action: 'insertRow'"), 'new mode must use insertRow');
  assert.ok(save.includes("action: 'updateCell'"), 'edit mode must use updateCell');
  assert.ok(save.includes('validateHudMemoryFormData'), 'must validate before saving');
  assert.ok(save.includes('hudMemoryEditState = null'), 'must clear edit state on success');
});
addCheck('phase5', 'H5 memory delete calls MysteryDatabaseFrontend.requestConfirmedMemoryDelete', () => {
  const del = between(sources.message, 'async function executeHudMemoryDelete', 'function refreshHudPanels');
  assert.ok(del.includes('MysteryDatabaseFrontend'), 'must access MysteryDatabaseFrontend');
  assert.ok(del.includes('requestConfirmedMemoryDelete'), 'must call requestConfirmedMemoryDelete');
  assert.ok(del.includes('table:'), 'must pass table name');
  assert.ok(del.includes('row_id:'), 'must pass row_id');
});
addCheck('phase5', 'H6 memory edit state resets on view switch / unmount / destroy / unregister', () => {
  const setView = between(sources.message, 'function setHudView', 'function refreshHudBusinessPanels');
  assert.ok(setView.includes("view !== 'memory'"), 'setHudView must clear memory edit state when leaving memory view');
  assert.ok(setView.includes('hudMemoryEditState = null'), 'setHudView must null the memory edit state');
  const unmount = between(sources.message, 'function unmountHudImmersive', 'function exitHudImmersive');
  assert.ok(unmount.includes('hudMemoryEditState = null'), 'unmount must clear memory edit state');
  const destroy = between(sources.message, 'function destroyHudImmersive', '$(() => {');
  assert.ok(destroy.includes('hudMemoryEditState = null'), 'destroy must clear memory edit state');
  const unregister = between(
    sources.message,
    'function unregisterHudDatabaseUpdateCallback',
    'function restoreFixedHostFromHudCabinet',
  );
  assert.ok(unregister.includes('hudMemoryEditState = null'), 'unregister must clear memory edit state');
});
addCheck('phase5', 'H7 gacha center renders a stable full-panel host with explicit retry state', () => {
  const panelHtml = stripHtmlComments(returnedTemplate(messageFunction('buildHudGachaPanelHtml')));
  const unavailableHtml = stripHtmlComments(returnedTemplate(messageFunction('buildHudGachaUnavailableHtml')));
  assert.equal(
    (panelHtml.match(/\bdata-mfrs-hud-gacha-host\b/g) || []).length,
    1,
    'gacha center must expose exactly one stable embedded-panel host',
  );
  assert.match(
    unavailableHtml,
    /<div\b(?=[^>]*\bdata-mfrs-hud-gacha-state\b)(?=[^>]*\brole\s*=\s*["']status["'])[^>]*>/,
    'unavailable state must expose status semantics regardless of attribute order',
  );
  assert.ok(unavailableHtml.includes('data-mfrs-hud-gacha-retry'), 'unavailable state must expose an explicit retry control');
  assert.ok(panelHtml.includes('完整抽卡系统 API 尚未就绪'), 'initial state must explain that the full API is unavailable');
});
addCheck('phase5', 'H8 gacha mount uses an owned handle and validates the trusted host root', () => {
  const handleType = messageTypeAlias('HudGachaPanelHandle');
  const rootMember = oneAstNode(handleType, node => ts.isPropertySignature(node) && memberName(node.name) === 'root', 'handle root');
  assert.equal(rootMember.type?.getText(messageAst), 'Element', 'gacha handle root must be an Element');
  const destroyMember = oneAstNode(handleType, node => ts.isPropertySignature(node) && memberName(node.name) === 'destroy', 'handle destroy');
  assert.ok(ts.isFunctionTypeNode(destroyMember.type), 'gacha handle must expose destroy ownership');

  const apiType = messageTypeAlias('MfrsGachaApi');
  const mountMember = oneAstNode(apiType, node => ts.isPropertySignature(node) && memberName(node.name) === 'mountPanel', 'mountPanel API');
  assert.ok(ts.isFunctionTypeNode(mountMember.type), 'mountPanel must remain a callable API');
  assert.equal(mountMember.type.parameters[0].type.getText(messageAst), 'HTMLElement', 'mountPanel container must be HTMLElement');
  const optionsType = mountMember.type.parameters[1].type;
  assert.ok(ts.isTypeLiteralNode(optionsType), 'mountPanel options must remain an object type');
  const onCloseMember = oneAstNode(optionsType, node => ts.isPropertySignature(node) && memberName(node.name) === 'onClose', 'onClose option');
  assert.ok(ts.isFunctionTypeNode(onCloseMember.type), 'mountPanel onClose must remain callable');
  assert.equal(mountMember.type.type.getText(messageAst), 'HudGachaPanelHandle', 'mountPanel must return its owned handle');

  const rootGuard = messageFunction('isHudGachaPanelRoot');
  const ownerIf = oneIf(rootGuard, statement =>
    containsBinary(statement.expression, ts.SyntaxKind.ExclamationEqualsEqualsToken, 'value.ownerDocument', '$path:host.ownerDocument'),
  'trusted ownerDocument guard');
  assert.equal(literalValue(directReturn(ownerIf.thenStatement)?.expression), false, 'foreign-document roots must be rejected');
  assert.equal(expressionPath(variableInitializer('HostElementCtor', rootGuard)), 'host.ownerDocument.defaultView.Element');
  assert.equal(expressionPath(variableInitializer('NodeCtor', rootGuard)), 'host.ownerDocument.defaultView.Node');
  const descriptorCall = oneCall(rootGuard, 'getOwnPropertyDescriptor', ['$path:NodeCtor.prototype', 'nodeType'], 'nodeType getter');
  assert.equal(expressionPath(memberReceiver(descriptorCall.expression)), 'Object', 'nodeType getter must come from Object');
  const brandedReturn = oneAstNode(rootGuard, node => ts.isReturnStatement(node) && node.expression &&
    containsBinary(node.expression, ts.SyntaxKind.InstanceOfKeyword, 'value', '$path:HostElementCtor'), 'trusted root return');
  const brandTerms = logicalTerms(brandedReturn.expression, ts.SyntaxKind.AmpersandAmpersandToken);
  assert.equal(brandTerms.length, 4, 'root brand checks must remain a four-way conjunction');
  assert.equal(brandTerms.filter(term => {
    const value = unwrapExpression(term);
    return ts.isBinaryExpression(value) && value.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken &&
      ts.isTypeOfExpression(unwrapExpression(value.left)) && expressionPath(unwrapExpression(value.left).expression) === 'nodeTypeGetter' &&
      literalValue(value.right) === 'function';
  }).length, 1, 'native nodeType getter must be callable');
  assert.equal(brandTerms.filter(term => binaryMatches(term, ts.SyntaxKind.InstanceOfKeyword, 'value', '$path:HostElementCtor')).length, 1,
    'root must use the trusted-realm Element brand');
  assert.equal(brandTerms.filter(term => {
    const value = unwrapExpression(term);
    return ts.isBinaryExpression(value) && value.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken &&
      literalValue(value.right) === 1 && callExpressionMatches(value.left, 'call', ['$path:value'], 'nodeTypeGetter');
  }).length, 1, 'root must pass the native element nodeType check');
  assert.equal(brandTerms.filter(term => binaryMatches(term, ts.SyntaxKind.EqualsEqualsEqualsToken,
    'value.parentElement', '$path:host')).length, 1, 'root must be directly owned by the stable host');

  const mount = messageFunction('ensureHudGachaPanelMounted');
  assert.equal(expressionPath(variableInitializer('mountPanel', mount)), 'hostWindow.MFRS.mountPanel', 'HUD must resolve mountPanel');
  const mountCall = oneCall(mount, 'mountPanel', ['$path:host', undefined], 'embedded gacha mount');
  const mountOptions = unwrapExpression(mountCall.arguments[1]);
  assert.ok(ts.isObjectLiteralExpression(mountOptions), 'embedded mount must pass an options object');
  const onClose = oneAstNode(mountOptions, node => ts.isPropertyAssignment(node) && memberName(node.name) === 'onClose', 'mount onClose');
  assert.ok(ts.isArrowFunction(onClose.initializer), 'embedded mount onClose must remain an arrow callback');
  oneCall(onClose.initializer, 'setHudView', ['story'], 'embedded mount close returns to story');
  const validationIf = oneIf(mount, statement =>
    callsMatching(statement.expression, 'isHudGachaPanelRoot', ['$path:handle.root', '$path:host']).length === 1 &&
    astNodes(statement.expression, node => ts.isTypeOfExpression(node) && expressionPath(node.expression) === 'handle.destroy').length === 1,
  'mounted handle validation');
  const invalidTerms = logicalTerms(validationIf.expression, ts.SyntaxKind.BarBarToken);
  assert.equal(invalidTerms.length, 3, 'invalid handle guard must remain a three-way disjunction');
  assert.equal(invalidTerms.filter(term => negates(term, value => expressionPath(value) === 'handle')).length, 1,
    'missing handles must be rejected');
  assert.equal(invalidTerms.filter(term => negates(term, value =>
    callExpressionMatches(value, 'isHudGachaPanelRoot', ['$path:handle.root', '$path:host']))).length, 1,
  'untrusted roots must be rejected');
  assert.equal(invalidTerms.filter(term => {
    const value = unwrapExpression(term);
    return ts.isBinaryExpression(value) && value.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken &&
      ts.isTypeOfExpression(unwrapExpression(value.left)) && expressionPath(unwrapExpression(value.left).expression) === 'handle.destroy' &&
      literalValue(value.right) === 'function';
  }).length, 1, 'handle.destroy must be a function');
  const invalidDestroy = oneDirectCall(validationIf.thenStatement, 'destroy', [], 'invalid mounted handle cleanup');
  assert.equal(expressionPath(memberReceiver(invalidDestroy.expression)), 'handle', 'invalid cleanup must destroy the returned handle');
  const handleAssignments = assignmentsToIdentifier(mount, 'hudGachaPanelHandle').filter(
    node => expressionPath(node.right) === 'handle',
  );
  assert.equal(handleAssignments.length, 1, 'validated handle must become the sole HUD owner');
  assert.ok(handleAssignments[0].getStart(messageAst) > validationIf.end, 'handle ownership must occur after validation');
});
addCheck('phase5', 'H9 gacha mount failure is latched by API identity and explicit retry can recover', () => {
  const failedFlag = variableDeclarations('hudGachaPanelMountFailed');
  assert.equal(failedFlag.length, 1, 'mount failure latch must have one declaration');
  assert.equal(literalValue(failedFlag[0].initializer), false, 'mount failure latch must start clear');
  const failedApi = variableDeclarations('hudGachaPanelFailedApi');
  assert.equal(failedApi.length, 1, 'failed API identity must have one declaration');
  assert.equal(failedApi[0].type?.getText(messageAst), "MfrsGachaApi['mountPanel']");
  assert.equal(expressionPath(failedApi[0].initializer), 'undefined', 'failed API identity must start empty');
  const mount = messageFunction('ensureHudGachaPanelMounted');
  const failureGuard = oneIf(mount, statement => {
    const terms = logicalTerms(statement.expression, ts.SyntaxKind.AmpersandAmpersandToken);
    return terms.length === 3 && terms.some(term => expressionPath(term) === 'hudGachaPanelMountFailed') &&
      terms.some(term => binaryMatches(term, ts.SyntaxKind.EqualsEqualsEqualsToken, 'hudGachaPanelFailedApi', '$path:mountPanel')) &&
      terms.some(term => negates(term, value => expressionPath(value) === 'force'));
  }, 'same failed API identity guard');
  assert.ok(directReturn(failureGuard.thenStatement), 'same failed API identity guard must return');
  const missingApi = oneIf(mount, statement => astNodes(statement.expression, node => ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken &&
    ts.isTypeOfExpression(unwrapExpression(node.left)) &&
    expressionPath(unwrapExpression(node.left).expression) === 'mountPanel' && literalValue(node.right) === 'function').length === 1,
  'missing gacha mount API branch');
  const replacementDestroy = callsMatching(mount, 'destroyHudGachaPanel').filter(
    call => call.getStart(messageAst) > failureGuard.end && call.end < missingApi.getStart(messageAst),
  );
  assert.equal(replacementDestroy.length, 1, 'a changed mount API identity must reach the replacement destroy path');
  assert.equal(callsMatching(missingApi.thenStatement, 'recordHudGachaPanelMountFailure', ['$path:mountPanel']).length, 1,
    'missing API branch must record exactly one failed identity');
  const mountCatch = oneAstNode(mount, node => ts.isCatchClause(node), 'gacha mount catch branch');
  assert.equal(callsMatching(mountCatch.block, 'recordHudGachaPanelMountFailure', ['$path:mountPanel']).length, 1,
    'throwing API branch must record exactly one failed identity');
  const mountTry = oneAstNode(mount, node => ts.isTryStatement(node), 'gacha mount try statement');
  const successClear = oneCall(mountTry.tryBlock, 'clearHudGachaPanelMountFailure', [], 'successful mount failure reset');
  const successAssignment = assignmentsToIdentifier(mountTry.tryBlock, 'hudGachaPanelHandle').filter(
    node => expressionPath(node.right) === 'handle',
  );
  assert.equal(successAssignment.length, 1, 'successful mount must claim its handle once');
  assert.ok(successClear.end < successAssignment[0].getStart(messageAst), 'failure state must clear before publishing the handle');
  oneCall(
    mountCatch.block,
    'renderHudGachaUnavailable',
    ['$path:host', '完整抽卡系统挂载失败', undefined],
    'mount failure state',
  );
  const click = messageFunction('handleHudShellClick');
  const retryTarget = unwrapExpression(variableInitializer('gachaRetryBtn', click));
  assert.ok(ts.isCallExpression(retryTarget) && memberName(retryTarget.expression) === 'closest' &&
    expressionPath(memberReceiver(retryTarget.expression)) === 'target' &&
    callArgumentsEqual(retryTarget, ['[data-mfrs-hud-gacha-retry]']), 'retry selector must remain bound');
  const retryIf = oneIf(click, statement => expressionPath(statement.expression) === 'gachaRetryBtn', 'gacha retry branch');
  const retryMount = oneDirectCall(retryIf.thenStatement, 'ensureHudGachaPanelMounted', ['$path:shell', true], 'forced gacha retry');
  const retryReturns = directStatements(retryIf.thenStatement).filter(ts.isReturnStatement);
  assert.equal(retryReturns.length, 1, 'retry branch must stop dispatch');
  assert.ok(retryMount.end < retryReturns[0].getStart(messageAst), 'forced retry must be directly reachable before branch return');
});
addCheck('phase5', 'H10 ordinary HUD refresh preserves a valid mounted gacha root', () => {
  const mount = messageFunction('ensureHudGachaPanelMounted');
  const currentRootIf = oneIf(mount, statement => {
    const terms = logicalTerms(statement.expression, ts.SyntaxKind.AmpersandAmpersandToken);
    return terms.length === 2 && terms.some(term => expressionPath(term) === 'currentRoot') &&
      terms.some(term => callExpressionMatches(term, 'isHudGachaPanelRoot', ['$path:currentRoot', '$path:host']));
  }, 'valid current gacha root guard');
  assert.ok(directReturn(currentRootIf.thenStatement), 'a valid mounted root must survive ordinary ensure calls');
  const businessRefresh = messageFunction('refreshHudBusinessPanels');
  const hostRecoveryGuard = oneIf(businessRefresh, statement => {
    const terms = logicalTerms(statement.expression, ts.SyntaxKind.AmpersandAmpersandToken);
    return terms.length === 2 && terms.some(term => expressionPath(term) === 'gachaSlot') && terms.some(term =>
      negates(term, value => callExpressionMatches(value, 'querySelector', ['[data-mfrs-hud-gacha-host]'], 'gachaSlot')));
  }, 'gacha host recovery guard');
  const hostAssignments = assignmentsToMember(businessRefresh, 'gachaSlot', 'innerHTML').filter(node =>
    ts.isCallExpression(unwrapExpression(node.right)) && memberName(unwrapExpression(node.right).expression) === 'buildHudGachaPanelHtml');
  assert.equal(hostAssignments.length, 1, 'refresh must have exactly one gacha host rebuild assignment');
  assert.ok(ts.isExpressionStatement(hostAssignments[0].parent) && hostAssignments[0].parent.parent === hostRecoveryGuard.thenStatement,
    'host rebuild must be a direct statement inside the missing-host guard');
  const panelsRefresh = messageFunction('refreshHudPanels');
  const renderKeyIf = oneIf(panelsRefresh, statement => containsIdentifier(statement.expression, 'force') &&
    containsBinary(statement.expression, ts.SyntaxKind.EqualsEqualsEqualsToken, 'renderKey', '$path:hudPanelsRenderKey'),
  'HUD render-key fast path');
  const ensureCalls = callsMatching(panelsRefresh, 'ensureHudGachaPanelMounted', ['$path:shell']).filter(
    call => call.arguments.length === 1,
  );
  assert.equal(ensureCalls.length, 2, 'fast and full refresh paths must both ensure the gacha mount');
  assert.equal(ensureCalls.filter(call => nodeContains(renderKeyIf.thenStatement, call)).length, 1, 'render-key hit must reuse the current gacha mount');
  assert.equal(ensureCalls.filter(call => !nodeContains(renderKeyIf.thenStatement, call)).length, 1, 'full refresh must ensure the current gacha mount');
  oneCall(panelsRefresh, 'refreshHudBusinessPanels', ['$path:shell', '$path:data'], 'guarded business refresh');
});
addCheck('phase5', 'H11 gacha ownership closes across all HUD lifecycles and old inline UI stays absent', () => {
  const destroy = messageFunction('destroyHudGachaPanel');
  const handleClear = assignmentsToIdentifier(destroy, 'hudGachaPanelHandle')
    .filter(node => unwrapExpression(node.right).kind === ts.SyntaxKind.NullKeyword);
  assert.equal(handleClear.length, 1, 'destroy must release the owned handle once');
  oneCall(destroy, 'clearHudGachaPanelMountFailure', [], 'destroy failure-identity reset');
  const handleDestroy = callsMatching(destroy, 'destroy')
    .filter(call => expressionPath(memberReceiver(call.expression)) === 'handle');
  assert.equal(handleDestroy.length, 1, 'destroy must delegate to the embedded panel handle');
  assert.ok(handleClear[0].getStart(messageAst) < handleDestroy[0].getStart(messageAst),
    'destroy must clear the shared handle before invoking destroy');

  for (const [functionName, leftPath, operator] of [
    ['setHudView', 'view', ts.SyntaxKind.ExclamationEqualsEqualsToken],
    ['openHudSettingsPanel', 'hudActiveView', ts.SyntaxKind.EqualsEqualsEqualsToken],
    ['openHudFullLibrary', 'hudActiveView', ts.SyntaxKind.EqualsEqualsEqualsToken],
  ]) {
    const lifecycle = messageFunction(functionName);
    const cleanupIf = oneIf(lifecycle,
      statement => containsBinary(statement.expression, operator, leftPath, 'gacha'), `${functionName} cleanup branch`);
    oneCall(cleanupIf.thenStatement, 'destroyHudGachaPanel', [], `${functionName} gacha cleanup`);
  }
  for (const functionName of ['unmountHudImmersive', 'destroyHudImmersive', 'deactivateMessagePanelRuntime']) {
    oneCall(messageFunction(functionName), 'destroyHudGachaPanel', [], `${functionName} gacha cleanup`);
  }
  const cleanup = variableInitializer('cleanup');
  assert.ok(ts.isArrowFunction(cleanup), 'message-panel cleanup owner must remain an arrow callback');
  oneCall(cleanup, 'destroyHudGachaPanel', [], 'hot-reload/pagehide gacha cleanup');
  const pagehideCalls = callsMatching(messageAst, 'addEventListener', ['pagehide', '$path:cleanup', undefined])
    .filter(call => expressionPath(memberReceiver(call.expression)) === 'window');
  assert.equal(pagehideCalls.length, 1, 'pagehide must share the cleanup owner');

  const actualMessageCode = astCodeTexts(messageAst);
  for (const marker of [
    'data-mfrs-hud-gacha-action',
    'data-mfrs-hud-gacha-pool',
    'hudGachaPoolType',
    'hudGachaLastResult',
    'executeHudGachaPull',
    'buildHudGachaResultHtml',
    'data-mfrs-hud="open-gacha"',
    'mfrs-hud-gacha-controls',
    'mfrs-hud-gacha-result',
    'mfrs-hud-gacha-item',
  ]) {
    assert.equal(actualMessageCode.some(text => text.includes(marker)), false, `old inline gacha code marker must stay absent: ${marker}`);
  }

  assert.ok(sources.message.includes('mfrs-hud-memory-form'), 'CSS for memory form must exist');
  assert.ok(sources.message.includes('mfrs-hud-memory-field'), 'CSS for memory field must exist');
  assert.ok(sources.message.includes('mfrs-hud-memory-btn'), 'CSS for memory buttons must exist');
  assert.ok(sources.message.includes('mfrs-hud-memory-add-btn'), 'CSS for add button must exist');
  const hudCss = cssTemplateContaining('#${HUD_SHELL_ID} .mfrs-hud-gacha-host');
  const hostSelector = /^\s*#\$\{HUD_SHELL_ID\}\s+\.mfrs-hud-gacha-host\s*\{/m;
  for (const viewport of [Number.POSITIVE_INFINITY, 800, 640]) {
    assert.equal(finalCssDeclaration(hudCss, hostSelector, 'width', viewport), '100%', 'gacha host must fill the center panel');
    assert.equal(finalCssDeclaration(hudCss, hostSelector, 'min-width', viewport), '0', 'gacha host must permit shrink');
  }
  const unavailableCss = oneCssBlock(hudCss, /#\$\{HUD_SHELL_ID\}\s+\.mfrs-hud-gacha-unavailable\s*\{/, 'gacha unavailable CSS').text;
  assert.match(unavailableCss, /\bdisplay\s*:\s*grid\s*;/, 'unavailable CSS must retain its centered grid state');
  assert.match(unavailableCss, /\bmin-height\s*:\s*180px\s*;/, 'unavailable CSS must retain visible empty-state height');
  const retryCss = oneCssBlock(hudCss, /#\$\{HUD_SHELL_ID\}\s+\.mfrs-hud-gacha-retry\s*\{/, 'gacha retry CSS').text;
  assert.match(retryCss, /\bmin-height\s*:\s*40px\s*;/, 'retry CSS must retain a usable target height');
  assert.match(retryCss, /\bcursor\s*:\s*pointer\s*;/, 'retry CSS must retain interactive affordance');
  const retryFocusCss = oneCssBlock(hudCss,
    /#\$\{HUD_SHELL_ID\}\s+\.mfrs-hud-gacha-retry:hover\s*,\s*#\$\{HUD_SHELL_ID\}\s+\.mfrs-hud-gacha-retry:focus-visible\s*\{/,
    'gacha retry focus CSS').text;
  assert.match(retryFocusCss, /\bborder-color\s*:\s*var\(--mfrs-corpse-cyan\)\s*;/, 'retry focus CSS must retain visible emphasis');
});

// Phase I: HUD UX follow-up — scoped player-entry removal and bidirectional mode controls.
addCheck('phase5', 'I1 dossier removes only the player full-library shortcut and keeps shared data paths', () => {
  const dossier = messageFunction('buildHudDossierHtml');
  assert.equal(returnedTemplate(dossier).includes('打开全库 · 玩家状态'), false, 'dossier must not restore the removed player shortcut');
  assert.equal(astLiteralTexts(dossier).some(text => text.includes('打开全库 · 玩家状态')), false,
    'dossier must not hide the removed shortcut in an indirect string/template literal');
  assert.equal(
    astNodes(dossier, node => ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken)
      .some(node => staticConcatenatedString(node)?.includes('打开全库 · 玩家状态')),
    false,
    'dossier must not reconstruct the removed shortcut with static string concatenation',
  );
  oneCall(dossier, 'buildDossierSectionsHtml', ['$path:data'], 'dossier player/status source data');
  oneCall(dossier, 'buildHudInvestigationSectionsHtml', [], 'dossier investigation sections');
  const investigation = messageFunction('buildHudInvestigationSectionsHtml');
  oneCall(investigation, 'getHudArchiveRules', [], 'investigation archive rules');
  oneCall(investigation, 'readHudDatabaseTables', [], 'investigation table data');

  const system = messageFunction('buildHudSystemPanelHtml');
  const systemHtml = returnedTemplate(system);
  assert.ok(systemHtml.includes('data-mfrs-hud="open-full-library"'), 'system panel must retain the full-library entry');
  assert.ok(systemHtml.includes('data-mfrs-hud-open-table="acu_tab_mfrs_global_search"'), 'system panel must retain table-specific full-library entries');
  const playerValue = callsMatching(system, 'valueText', ['$path:data.姓名', '']);
  assert.equal(playerValue.length, 1, 'system panel must retain player-state consistency data');
  assert.ok(
    astNodes(system, node => ts.isCallExpression(node) && memberName(node.expression) === 'Boolean').some(call =>
      nodeContains(call, playerValue[0]),
    ),
    'player-state consistency data must remain Boolean-normalized',
  );

  const click = messageFunction('handleHudShellClick');
  const openTableTarget = unwrapExpression(variableInitializer('openTableBtn', click));
  assert.ok(
    ts.isCallExpression(openTableTarget) &&
      memberName(openTableTarget.expression) === 'closest' &&
      callArgumentsEqual(openTableTarget, ['[data-mfrs-hud-open-table]']),
    'generic table navigation selector must remain bound',
  );
  const openTableIf = oneIf(
    click,
    statement => expressionPath(statement.expression) === 'openTableBtn',
    'generic table navigation branch',
  );
  oneCall(openTableIf.thenStatement, 'openHudFullLibrary', ['$path:table', '$path:returnView'], 'generic table navigation');
  const visualizerFallback = variableInitializer('renderMfrsTableFallback', visualizerAst);
  assert.ok(ts.isArrowFunction(visualizerFallback), 'player-state fallback must remain an executable function');
  const playerKeyCall = oneCall(visualizerFallback, 'includes', ['玩家状态'], 'player-state table support');
  assert.equal(expressionPath(memberReceiver(playerKeyCall.expression)), 'key', 'player-state support must inspect the table key');
  oneCall(visualizerFallback, 'renderReadOnlyFallbackRows', ['玩家状态', undefined], 'renderable player-state fallback');
});
addCheck('phase5', 'I2 default mode entry stays outside the original seven business navigation keys', () => {
  const navBuilder = messageFunction('buildNavHtml');
  const items = unwrapExpression(variableInitializer('items', navBuilder));
  assert.ok(ts.isArrayLiteralExpression(items), 'business navigation items must remain an array literal');
  const itemIds = items.elements.map(item => {
    assert.ok(ts.isObjectLiteralExpression(item), 'each business navigation item must remain an object');
    const id = item.properties.find(property => ts.isPropertyAssignment(property) && memberName(property.name) === 'id');
    assert.ok(id && ts.isPropertyAssignment(id), 'each business navigation item must retain its id');
    return literalValue(id.initializer);
  });
  assert.deepEqual(
    itemIds,
    ['story', 'dossier', 'relation', 'memory', 'gacha', 'system', 'settings'],
    'default business navigation keys must remain the original seven in order',
  );
  const navHtml = stripHtmlComments(returnedTemplate(navBuilder));
  const navClose = navHtml.indexOf('</nav>');
  const defaultModeButton = navHtml.match(
    /<button\b[^>]*\bdata-mfrs-mode\s*=\s*["']immersive["'][^>]*>[\s\S]*?<\/button>/,
  )?.[0];
  assert.ok(defaultModeButton, 'default panel must render an immersive mode button');
  const modeEntry = navHtml.indexOf(defaultModeButton);
  assert.ok(navClose !== -1 && modeEntry > navClose, 'mode entry must be outside the business navigation element');
  assert.match(defaultModeButton, /\bid\s*=\s*["']\$\{panelId\}-mode-immersive["']/, 'mode entry must keep its stable panel-derived id');
  assert.match(defaultModeButton, /\bclass\s*=\s*["'][^"']*\bfa-expand\b[^"']*["']/, 'default mode entry must use the expand icon');
  assert.match(defaultModeButton, /<span>\s*沉浸模式\s*<\/span>/, 'default mode entry must name the target mode');
  assert.match(defaultModeButton, /\baria-label\s*=\s*["']切换到沉浸模式["']/, 'default mode entry must expose target-mode ARIA');
  assert.match(defaultModeButton, /\btitle\s*=\s*["']沉浸模式 \(Ctrl\+Shift\+G\)["']/, 'default mode entry must expose shortcut help');
});
addCheck('phase5', 'I3 default and immersive mode controls use the existing bidirectional lifecycle', () => {
  const navClick = messageFunction('handleNavClick');
  const modeBranch = oneIf(navClick, statement => expressionPath(statement.expression) === 'modeBtn', 'default mode click branch');
  const identityGuard = oneAstNode(modeBranch.thenStatement, node => {
    if (!ts.isIfStatement(node) || !directReturn(node.thenStatement)) return false;
    const terms = logicalTerms(node.expression, ts.SyntaxKind.BarBarToken);
    return terms.length === 4 && terms.some(term => negates(term, value => expressionPath(value) === 'panel')) &&
      terms.some(term => negates(term, value => expressionPath(value) === 'mes')) &&
      terms.some(term => negates(term, value => callExpressionMatches(value, 'isLatestAiMessage', ['$path:mes']))) &&
      terms.some(term => {
        const value = unwrapExpression(term);
        return ts.isBinaryExpression(value) && value.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken &&
          callExpressionMatches(value.left, 'getLatestAiMessageElement') && expressionPath(value.right) === 'mes';
      });
  }, 'latest AI identity guard');
  const modeToggle = oneDirectCall(modeBranch.thenStatement, 'toggleHudImmersive', [], 'default mode toggle');
  assert.ok(identityGuard.end < modeToggle.getStart(messageAst), 'identity guard must return before the mode toggle');
  oneCall(modeBranch.thenStatement, 'focusImmersiveModeControl', [], 'immersive reverse-control focus transfer');

  const shell = messageFunction('ensureHudShell');
  const immersiveModeButton = stripHtmlComments(assignedTemplate(shell, 'shell', 'innerHTML')).match(
    /<button\b[^>]*\bdata-mfrs-hud\s*=\s*["']exit["'][^>]*>[\s\S]*?<\/button>/,
  )?.[0];
  assert.ok(immersiveModeButton, 'immersive shell must retain its reverse mode control');
  assert.match(immersiveModeButton, /\bclass\s*=\s*["'][^"']*\bfa-compress\b[^"']*["']/, 'immersive reverse control must use the compress icon');
  assert.match(immersiveModeButton, /<span>\s*默认模式\s*<\/span>/, 'immersive reverse control must name the target mode');
  assert.match(immersiveModeButton, /\baria-label\s*=\s*["']切换到默认模式["']/, 'immersive reverse control must expose target-mode ARIA');
  assert.match(immersiveModeButton, /\btitle\s*=\s*["']默认模式 \(Ctrl\+Shift\+G\)["']/, 'immersive reverse control must expose shortcut help');
  const shellClick = messageFunction('handleHudShellClick');
  const exitBranch = oneIf(
    shellClick,
    statement => callExpressionMatches(statement.expression, 'closest', ['[data-mfrs-hud="exit"]'], 'target'),
    'immersive exit click branch',
  );
  const exitCall = oneDirectCall(exitBranch.thenStatement, 'exitHudImmersive', [], 'immersive reverse-control exit');
  const exitReturns = directStatements(exitBranch.thenStatement).filter(ts.isReturnStatement);
  assert.equal(exitReturns.length, 1, 'immersive reverse-control branch must stop further HUD dispatch');
  assert.ok(exitCall.end < exitReturns[0].getStart(messageAst), 'immersive exit must be directly reachable before branch return');

  const migration = messageFunction('migrateHudShellDom');
  const ariaMigration = oneCall(migration, 'setAttribute', ['aria-label', '切换到默认模式'], 'reverse-control ARIA migration');
  assert.equal(expressionPath(memberReceiver(ariaMigration.expression)), 'exitModeBtn');
  assert.equal(
    assignmentsToMember(migration, 'icon', 'className').filter(node => literalValue(node.right) === 'fa-solid fa-compress').length,
    1,
    'hot reload must migrate the reverse-control icon',
  );
  assert.equal(
    assignmentsToMember(migration, 'label', 'textContent').filter(node => literalValue(node.right) === '默认模式').length,
    1,
    'hot reload must migrate the reverse-control label',
  );
});
addCheck('phase5', 'I4 mode preference remains single-source with shortcut and focus restoration', () => {
  assert.equal(variableDeclarations('hudImmersivePreferred').length, 1, 'hudImmersivePreferred must have one declaration');
  const storageMethods = new Set(['getItem', 'setItem', 'removeItem']);
  const storageCalls = astNodes(messageAst, node => ts.isCallExpression(node) &&
    storageMethods.has(memberName(node.expression)) &&
    expressionPath(memberReceiver(node.expression))?.split('.').includes('localStorage'));
  assert.ok(storageCalls.some(call => memberName(call.expression) === 'getItem' &&
    literalValue(call.arguments[0]) === 'mfrs_hud_low_motion'), 'existing low-motion storage must remain');
  for (const call of storageCalls) {
    const key = literalValue(call.arguments[0]);
    assert.equal(typeof key, 'string', `${memberName(call.expression)} storage key must remain static`);
    assert.doesNotMatch(key, /mode|immersive/i, 'mode preference must not gain a storage key');
  }
  const keydown = messageFunction('handleHudKeydown');
  const shortcutIf = oneIf(keydown, statement => negates(statement.expression, value => {
    const terms = logicalTerms(value, ts.SyntaxKind.AmpersandAmpersandToken);
    if (terms.length !== 3 || !terms.some(term => expressionPath(term) === 'e.ctrlKey') ||
      !terms.some(term => expressionPath(term) === 'e.shiftKey')) return false;
    return terms.some(term => {
      const keys = logicalTerms(term, ts.SyntaxKind.BarBarToken);
      return keys.length === 2 && keys.some(key => binaryMatches(key, ts.SyntaxKind.EqualsEqualsEqualsToken, 'e.key', 'G')) &&
        keys.some(key => binaryMatches(key, ts.SyntaxKind.EqualsEqualsEqualsToken, 'e.key', 'g'));
    });
  }), 'Ctrl+Shift+G negative guard');
  assert.ok(directReturn(shortcutIf.thenStatement), 'non-shortcut keydowns must return before mode dispatch');
  const shortcutToggle = oneDirectCall(keydown.body, 'toggleHudImmersive', [], 'shortcut immersive toggle');
  assert.ok(shortcutIf.end < shortcutToggle.getStart(messageAst), 'shortcut guard must precede the direct mode toggle');

  const focusType = messageTypeAlias('PanelFocusSnapshot');
  const modeVariant = oneAstNode(focusType, node => ts.isTypeLiteralNode(node) && node.members.some(member =>
    ts.isPropertySignature(member) && memberName(member.name) === 'kind' &&
    ts.isLiteralTypeNode(member.type) && literalValue(member.type.literal) === 'mode'), 'mode focus snapshot');
  assert.ok(modeVariant.members.some(member => ts.isPropertySignature(member) && memberName(member.name) === 'value' &&
    member.type?.kind === ts.SyntaxKind.StringKeyword), 'mode focus snapshot must retain its value');
  const capture = messageFunction('capturePanelFocus');
  const modeClosest = unwrapExpression(variableInitializer('mode', capture));
  assert.ok(ts.isCallExpression(modeClosest) && memberName(modeClosest.expression) === 'closest');
  assert.deepEqual(modeClosest.arguments.map(literalValue), ['[data-mfrs-mode]'], 'refresh must capture mode-control focus');
  oneAstNode(
    capture,
    node => {
      if (!ts.isReturnStatement(node) || !ts.isObjectLiteralExpression(unwrapExpression(node.expression))) return false;
      const properties = unwrapExpression(node.expression).properties;
      return properties.some(property => ts.isPropertyAssignment(property) && memberName(property.name) === 'kind' &&
        literalValue(property.initializer) === 'mode') && properties.some(property => ts.isPropertyAssignment(property) &&
        memberName(property.name) === 'value' && expressionPath(property.initializer) === 'modeName');
    },
    'stable mode focus snapshot return',
  );
  const restore = messageFunction('restorePanelFocus');
  const restoreIf = oneIf(restore,
    statement => containsBinary(statement.expression, ts.SyntaxKind.EqualsEqualsEqualsToken, 'snapshot.kind', 'mode'),
    'mode focus restore branch');
  const restoreAttribute = oneCall(restoreIf.thenStatement, 'getAttribute', ['data-mfrs-mode'], 'mode focus identity lookup');
  assert.equal(expressionPath(memberReceiver(restoreAttribute.expression)), 'candidate');

  for (const functionName of ['focusDefaultModeControl', 'focusImmersiveModeControl']) {
    const focusCall = oneCall(messageFunction(functionName), 'focus', [undefined], `${functionName} focus call`);
    assert.equal(expressionPath(memberReceiver(focusCall.expression)), 'control');
  }
  oneCall(messageFunction('exitHudImmersive'), 'focusDefaultModeControl', [], 'explicit default-mode focus restoration');
});
addCheck('phase5', 'I5 mode controls remain latest-only and preserve desktop/mobile rail geometry', () => {
  const panelCss = cssTemplateContaining('grid-template-columns: minmax(196px, 0.3fr) minmax(0, 1fr) 60px;');
  const firstTablet = cssBlocksMatching(panelCss, /@media\s*\(\s*max-width\s*:\s*900px\s*\)\s*\{/, '<=900px CSS')[0];
  const triSelector = /^\s*\.mfrs-msg-panel\.mfrs-msg-tri\s*\{/m;
  const desktopCandidates = cssBlocksMatching(panelCss, triSelector, 'tri-panel CSS rules')
    .filter(block => block.start < firstTablet.start && lastCssDeclaration(block.text, 'display') === 'grid');
  assert.equal(desktopCandidates.length, 1, 'default tri-panel desktop CSS must have one structural rule');
  const triCss = panelCss.slice(desktopCandidates[0].start);
  assert.equal(finalCssDeclaration(triCss, triSelector, 'grid-template-columns'),
    'minmax(196px, 0.3fr) minmax(0, 1fr) 60px', 'desktop tri-panel must reserve a 60px right rail');
  assert.equal(finalCssDeclaration(triCss, triSelector, 'grid-template-columns', 800),
    'minmax(0, 1fr) 60px', 'up to 900px must retain the 60px right rail');
  assert.equal(finalCssDeclaration(triCss, triSelector, 'grid-template-columns', 640), '1fr',
    'up to 640px must collapse to one column');

  const modeSelector = /^\s*\.mfrs-msg-mode-btn\s*\{/m;
  assert.equal(finalCssDeclaration(triCss, modeSelector, 'min-height'), '44px', 'desktop mode button must remain 44px');
  assert.equal(finalCssDeclaration(triCss, modeSelector, 'min-height', 800), '44px', '<=900px mode button must remain 44px');
  assert.equal(finalCssDeclaration(triCss, modeSelector, 'flex-direction', 640), 'row', 'mobile mode button must use a row layout');
  const historicalSelector = /^\s*\.mes\[is_user\s*=\s*["']false["']\]:not\(\.last_mes\)\s+\.mfrs-msg-mode-tools\s*\{/m;
  assert.equal(finalCssDeclaration(triCss, historicalSelector, 'display'), 'none', 'historical AI panels must hide mode tools');
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
