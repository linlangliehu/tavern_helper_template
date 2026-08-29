/* eslint-disable import-x/no-nodejs-modules */
/**
 * cdp-upload-file.mjs —— 通过 CDP 向酒馆真页的 <input type="file"> 注入本地文件。
 * 用途：自动化「导入角色卡/世界书 PNG」等手选文件对话框流程（如魔禁卡重导）。
 *
 * 用法：
 *   node scripts/cdp-upload-file.mjs "#character_import_file" "D:/abs/path/卡.png"
 *   node scripts/cdp-upload-file.mjs --port 9225 --target-url 8000 "#sel" "path"
 *
 * 流程：/json 找 page target → DOM.enable → DOM.getDocument → DOM.querySelector
 *   → DOM.setFileInputFiles（触发真实 change 管线，ST 前端 importCharacter 接管）
 *   → Runtime.evaluate 回读 input.files 做最终确认。
 * 不依赖 chrome-devtools MCP；WSL 下请用 /mnt/d/Nodejs/node.exe 执行。
 */
import { isAbsolute, resolve } from 'node:path';

let targetPort = 9225;

async function findTarget(urlFilter) {
  const res = await fetch(`http://127.0.0.1:${targetPort}/json`);
  const list = await res.json();
  const pages = list.filter(t => t.type === 'page');
  if (urlFilter) {
    const hit = pages.find(p => p.url.includes(urlFilter));
    if (hit) return hit;
  }
  return pages[0];
}

/** Minimal CDP rpc over one WebSocket connection. */
function cdpConnect(wsUrl, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let nextId = 1;
    const pending = new Map();
    const timer = setTimeout(() => {
      try { ws.close(); } catch {}
      reject(new Error(`cdp-upload-file: connect timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    ws.addEventListener('open', () => {
      clearTimeout(timer);
      resolve({
        call(method, params = {}, callTimeout = 60000) {
          const id = nextId++;
          return new Promise((res2, rej2) => {
            const t = setTimeout(() => {
              pending.delete(id);
              rej2(new Error(`cdp-upload-file: ${method} timeout`));
            }, callTimeout);
            pending.set(id, { res2, rej2, t, method });
            ws.send(JSON.stringify({ id, method, params }));
          });
        },
        close() { try { ws.close(); } catch {} },
      });
    });
    ws.addEventListener('message', ev => {
      const msg = JSON.parse(ev.data);
      const slot = pending.get(msg.id);
      if (!slot) return;
      pending.delete(msg.id);
      clearTimeout(slot.t);
      if (msg.error) slot.rej2(new Error(`cdp-upload-file: ${slot.method} -> ${JSON.stringify(msg.error)}`));
      else slot.res2(msg.result);
    });
    ws.addEventListener('error', e => {
      reject(new Error(`cdp-upload-file: ws error: ${e?.message || 'unknown'}`));
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  let urlFilter = '8000';
  let selector = null;
  let filePath = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--target-url') urlFilter = args[++i];
    else if (args[i] === '--port') targetPort = Number(args[++i]);
    else if (!selector) selector = args[i];
    else if (!filePath) filePath = args[i];
  }
  if (!selector || !filePath) {
    console.error('Usage: node scripts/cdp-upload-file.mjs [--port 9225] [--target-url substring] "<file-input-selector>" "<abs-file-path>"');
    process.exit(1);
  }
  const absPath = isAbsolute(filePath) ? filePath : resolve(process.cwd(), filePath);
  console.error(`cdp-upload-file: selector=${selector} file=${absPath}`);

  const target = await findTarget(urlFilter);
  if (!target) throw new Error(`no CDP page target matching "${urlFilter}" on port ${targetPort}`);
  const cdp = await cdpConnect(target.webSocketDebuggerUrl);
  try {
    await cdp.call('DOM.enable');
    const { root } = await cdp.call('DOM.getDocument', { depth: 1 });
    const { nodeId } = await cdp.call('DOM.querySelector', { nodeId: root.nodeId, selector });
    if (!nodeId) throw new Error(`selector "${selector}" matched no node`);
    await cdp.call('DOM.setFileInputFiles', { files: [absPath], nodeId });
    // 回读确认
    const { result } = await cdp.call('Runtime.evaluate', {
      expression: `(function(){ const el = document.querySelector(${JSON.stringify(selector)}); return el ? { count: el.files.length, name: el.files[0]?.name, size: el.files[0]?.size } : null; })()`,
      returnByValue: true,
    });
    console.log(JSON.stringify(result?.value ?? null, null, 2));
  } finally {
    cdp.close();
  }
}

main().catch(e => { console.error(`cdp-upload-file: failed: ${e?.message || e}`); process.exitCode = 1; });
