/* eslint-disable import-x/no-nodejs-modules */
/**
 * cdp-evaluate.mjs —— 通过 Chrome DevTools Protocol (CDP) 在酒馆真页执行 JS 表达式。
 * 用途：当 Codex 会话未加载 chrome-devtools MCP 时，用裸 CDP 代替 evaluate_script。
 *
 * 用法：
 *   node scripts/cdp-evaluate.mjs "<js-expression>"
 *   node scripts/cdp-evaluate.mjs --file <path-to-js-file>
 *   node scripts/cdp-evaluate.mjs --target-url substring "<js>"
 *
 * 自动从 http://127.0.0.1:9222/json 找 type=page 且 url 匹配的 target，
 * 连其 webSocketDebuggerUrl，发 Runtime.evaluate，打印 JSON.stringify(result)。
 */
const targetPort = 9222;

async function findTarget(urlFilter) {
  const res = await fetch(`http://127.0.0.1:${targetPort}/json`);
  const list = await res.json();
  const pages = list.filter(t => t.type === 'page');
  if (urlFilter) {
    const hit = pages.find(p => p.url.includes(urlFilter));
    if (hit) return hit;
  }
  // fallback: first page
  return pages[0];
}

function cdpEval(wsUrl, expression, awaitPromise = true, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const id = 1;
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { ws.close(); } catch {}
      reject(new Error(`cdp-evaluate: timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({
        id,
        method: 'Runtime.evaluate',
        params: { expression, returnByValue: true, awaitPromise, userGesture: true },
      }));
    });
    ws.addEventListener('message', ev => {
      if (settled) return;
      const msg = JSON.parse(ev.data);
      if (msg.id === id) {
        settled = true;
        clearTimeout(timer);
        try { ws.close(); } catch {}
        if (msg.error) reject(new Error(`cdp-evaluate: CDP error: ${JSON.stringify(msg.error)}`));
        else resolve(msg.result);
      }
    });
    ws.addEventListener('error', e => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`cdp-evaluate: ws error: ${e?.message || 'unknown'}`));
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  let urlFilter = '8000';
  let expression = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--target-url') { urlFilter = args[++i]; }
    else if (args[i] === '--file') { expression = await import('node:fs').then(fs => fs.readFileSync(args[++i], 'utf8')); }
    else { expression = args[i]; }
  }
  if (!expression) {
    console.error('Usage: node scripts/cdp-evaluate.mjs [--target-url substring] [--file path] "<js-expression>"');
    process.exit(1);
  }
  const target = await findTarget(urlFilter);
  if (!target) throw new Error(`no CDP page target matching "${urlFilter}"`);
  const result = await cdpEval(target.webSocketDebuggerUrl, expression);
  if (result.exceptionDetails) {
    console.error('cdp-evaluate: runtime exception:', JSON.stringify(result.exceptionDetails, null, 2));
    process.exitCode = 2;
  }
  console.log(JSON.stringify(result.result?.value, null, 2));
}

main().catch(e => { console.error(`cdp-evaluate: failed: ${e?.message || e}`); process.exitCode = 1; });