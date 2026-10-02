/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createSourceFile, isFunctionDeclaration, ModuleKind, ScriptTarget, transpileModule } from 'typescript';

const path = new URL('../src/魔法禁书目录模拟器/脚本/消息内面板/index.ts', import.meta.url);
const source = readFileSync(path, 'utf8');
const ast = createSourceFile(path.pathname, source, ScriptTarget.Latest, true);
const names = ['getMessageBodyElement', 'renderDefaultStack', 'renderPlaceholders', 'mutationTouchesChatMessage'];
const functions = ast.statements.filter(node => isFunctionDeclaration(node) && names.includes(node.name?.text));
assert.equal(functions.length, names.length);
const code = transpileModule(functions.map(node => node.getText(ast)).join('\n'), {
  compilerOptions: { target: ScriptTarget.ES2022, module: ModuleKind.None },
}).outputText;

class ElementFixture {
  constructor(className = '') {
    this.className = className;
    this.nodeType = 1;
    this.children = [];
    this.attributes = new Map();
    this.display = 'block';
    this.innerHTML = '';
  }
  matches(selector) {
    return selector.split(',').some(part => this.className.split(' ').includes(part.trim().slice(1)));
  }
  querySelectorAll(selector) {
    return this.children
      .flatMap(child => [child, ...child.querySelectorAll('*')])
      .filter(child => selector === '*' || child.matches(selector));
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
  getAttribute(key) {
    return this.attributes.get(key) ?? null;
  }
  setAttribute(key, value) {
    this.attributes.set(key, value);
  }
  get previousElementSibling() {
    const siblings = this.parentElement?.children ?? [];
    return siblings[siblings.indexOf(this) - 1] ?? null;
  }
  remove() {
    if (this.parentElement) {
      this.parentElement.children.splice(this.parentElement.children.indexOf(this), 1);
      this.parentElement = null;
    }
  }
  appendChild(child) {
    child.remove();
    this.children.push(child);
    child.parentElement = this;
    return child;
  }
  insertAdjacentElement(position, child) {
    assert.equal(position, 'afterend');
    child.remove();
    const parent = this.parentElement;
    parent.children.splice(parent.children.indexOf(this) + 1, 0, child);
    child.parentElement = parent;
    return child;
  }
}

const context = vm.createContext({
  doc: { defaultView: { getComputedStyle: e => ({ display: e.display }) }, createElement: () => new ElementFixture() },
  getPanelRenderKey: data => JSON.stringify(data),
  buildPlayerCardHtml: data => `player:${data.name}`,
  buildAbilityCardHtml: () => 'ability',
  buildTaskCardHtml: () => 'task',
  buildRelationCardHtml: () => 'relation',
  isElementNode: value => value?.nodeType === 1,
});
vm.runInContext(code, context);
function fixture() {
  const message = new ElementFixture('mes');
  message.setAttribute('mesid', '2');
  const block = message.appendChild(new ElementFixture('mes_block'));
  const raw = block.appendChild(new ElementFixture('mes_text'));
  return { message, block, raw };
}
const data = { name: 'no-ability', abilities: [] };
const normal = fixture();
context.renderDefaultStack(normal.message, data);
let stack = normal.message.querySelector('.mfrs-mp-stack');
assert.equal(stack.parentElement, normal.block, 'panel must not be a child of raw text');
assert.equal(stack.previousElementSibling, normal.raw);
assert.equal(stack.getAttribute('data-mfrs-message-id'), '2');
stack.expanded = true;
context.renderDefaultStack(normal.message, data);
assert.equal(normal.message.querySelector('.mfrs-mp-stack'), stack, 'unchanged data must retain the node');
assert.equal(stack.expanded, true);

const streaming = normal.block.appendChild(new ElementFixture('TH-streaming'));
normal.raw.display = 'none';
context.renderDefaultStack(normal.message, data);
assert.equal(stack.previousElementSibling, streaming, 'same key must still follow visible streaming text');
assert.equal(stack.parentElement, normal.block);
normal.raw.display = 'block';
streaming.display = 'none';
context.renderDefaultStack(normal.message, data);
assert.equal(stack.previousElementSibling, normal.raw, 'switching back must reposition without duplicates');

const stale = normal.raw.appendChild(new ElementFixture('mfrs-mp-stack'));
context.renderDefaultStack(normal.message, data);
assert.equal(normal.message.querySelectorAll('.mfrs-mp-stack').length, 1);
assert.equal(stale.parentElement, null);
context.renderDefaultStack(normal.message, { name: 'late-player', abilities: ['named-level-zero'] });
stack = normal.message.querySelector('.mfrs-mp-stack');
assert.ok(stack.innerHTML.includes('late-player'), 'late floor data must update the managed panel');

const placeholder = normal.raw.appendChild(new ElementFixture('mfrs-mp-card'));
context.renderDefaultStack(normal.message, data);
assert.equal(normal.message.querySelectorAll('.mfrs-mp-stack').length, 0, 'visible placeholders suppress the fallback');
assert.equal(placeholder.parentElement, normal.raw);
normal.raw.display = 'none';
streaming.display = 'block';
context.renderDefaultStack(normal.message, data);
assert.equal(
  normal.message.querySelectorAll('.mfrs-mp-stack').length,
  1,
  'hidden placeholder cards cannot suppress a visible fallback',
);
normal.raw.innerHTML = '[[MFrsStatus]]玩家[[/MFrsStatus]]';
context.renderPlaceholders(normal.message, data);
assert.equal(normal.raw.innerHTML, '[[MFrsStatus]]玩家[[/MFrsStatus]]', 'hidden original HTML must remain intact');

context.renderDefaultStack(new ElementFixture('mes'), data);
for (const target of [normal.raw, streaming, new ElementFixture('mes_streaming')]) {
  assert.equal(context.mutationTouchesChatMessage({ type: 'attributes', target }), true);
}
assert.equal(context.mutationTouchesChatMessage({ type: 'attributes', target: stack }), false);
assert.equal(
  context.mutationTouchesChatMessage({ type: 'childList', addedNodes: [streaming], removedNodes: [] }),
  true,
);
assert.match(source, /attributeFilter:\s*\['class', 'style'\]/, 'body display switches must trigger refresh');
console.log('MJR_MESSAGE_PANEL_MOUNT_OK');
