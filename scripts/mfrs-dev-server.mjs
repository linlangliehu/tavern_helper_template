#!/usr/bin/env node
/**
 * mfrs-dev-server.mjs —— 当前 worktree 本地静态服务。
 *
 * 用法：
 *   node scripts/mfrs-dev-server.mjs
 *   node scripts/mfrs-dev-server.mjs --port 5510
 *   node scripts/mfrs-dev-server.mjs --root <workspace>
 *
 * 只绑定 127.0.0.1；提供 /__mfrs_dev_identity 身份探针。
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import { extname, join, normalize, relative, resolve, sep } from 'node:path';
import {
  DEFAULT_STATIC_PORTS,
  PORT_HMR,
  PORT_SYNC,
  ROOT,
  clearSessionLock,
  describePort,
  findFreePort,
  getWorkspaceIdentity,
  isPortFree,
  printHumanSummary,
  writeSessionLock,
} from './mfrs-dev-common.mjs';

const args = process.argv.slice(2);
function readArg(name, fallback = undefined) {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  return args[idx + 1] ?? fallback;
}

const requestedPort = Number(readArg('--port', process.env.MFRS_DEV_STATIC_PORT || '0')) || 0;
const root = resolve(readArg('--root', process.env.MFRS_DEV_ROOT || ROOT));
const identity = getWorkspaceIdentity(root);
const startedAt = new Date().toISOString();

const MIME = {
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.yaml': 'text/yaml; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8',
};

function sendJson(res, status, data) {
  const body = `${JSON.stringify(data, null, 2)}\n`;
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendText(res, status, text, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Length': Buffer.byteLength(text),
  });
  res.end(text);
}

function safeResolve(urlPath) {
  const decoded = decodeURIComponent((urlPath || '/').split('?')[0]);
  const cleaned = decoded.replace(/^\/+/, '');
  const abs = normalize(join(root, cleaned));
  const rel = relative(root, abs);
  if (rel.startsWith('..') || rel.includes(`..${sep}`) || abs === root && cleaned.includes('..')) {
    return null;
  }
  if (!abs.startsWith(root)) return null;
  return abs;
}

function identityPayload(port) {
  return {
    workspace: identity.workspace,
    branch: identity.branch,
    commit: identity.commit,
    commitFull: identity.commitFull,
    startedAt,
    pid: process.pid,
    port,
    root: root.replace(/\\/g, '/'),
    kind: 'mfrs-dev-server',
  };
}

async function choosePort() {
  if (requestedPort > 0) {
    if (!(await isPortFree(requestedPort))) {
      const occupied = await describePort(requestedPort);
      const who = occupied.identity
        ? `${occupied.identity.workspace} @ ${occupied.identity.branch} (${occupied.identity.commit})`
        : 'unknown process';
      throw new Error(`port ${requestedPort} is occupied by ${who}`);
    }
    return requestedPort;
  }
  const free = await findFreePort(DEFAULT_STATIC_PORTS);
  if (!free) {
    throw new Error(`no free static port in ${DEFAULT_STATIC_PORTS.join(', ')}`);
  }
  return free;
}

async function selfCheck(port) {
  const base = `http://127.0.0.1:${port}`;
  const idRes = await fetch(`${base}/__mfrs_dev_identity`, { signal: AbortSignal.timeout(2000) });
  if (!idRes.ok) throw new Error(`identity probe failed: HTTP ${idRes.status}`);
  const id = await idRes.json();
  if (id.workspace !== identity.workspace || id.commit !== identity.commit) {
    throw new Error('identity probe mismatch');
  }

  const probeFile = 'dist/神秘复苏模拟器/脚本/消息内面板/index.js';
  const filePath = join(root, probeFile);
  if (existsSync(filePath)) {
    const fileRes = await fetch(`${base}/${probeFile.split('\\').join('/')}`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!fileRes.ok) throw new Error(`dist probe failed: HTTP ${fileRes.status}`);
  }
}

async function main() {
  if (!existsSync(root)) {
    throw new Error(`root does not exist: ${root}`);
  }

  const port = await choosePort();
  const server = http.createServer((req, res) => {
    const method = req.method || 'GET';
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Cache-Control': 'no-store',
      });
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    if (url.pathname === '/__mfrs_dev_identity') {
      sendJson(res, 200, identityPayload(port));
      return;
    }

    if (method !== 'GET' && method !== 'HEAD') {
      sendText(res, 405, 'Method Not Allowed\n');
      return;
    }

    const abs = safeResolve(url.pathname);
    if (!abs) {
      sendText(res, 403, 'Forbidden\n');
      return;
    }
    if (!existsSync(abs) || !statSync(abs).isFile()) {
      sendText(res, 404, 'Not Found\n');
      return;
    }

    const type = MIME[extname(abs).toLowerCase()] || 'application/octet-stream';
    const size = statSync(abs).size;
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': size,
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    });
    if (method === 'HEAD') {
      res.end();
      return;
    }
    createReadStream(abs).pipe(res);
  });

  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolveListen());
  });

  try {
    await selfCheck(port);
  } catch (error) {
    server.close();
    throw error;
  }

  // 会话锁由长生命周期静态服务持有，避免 acquire 短任务 PID 立刻失效
  writeSessionLock({
    workspace: identity.workspace,
    branch: identity.branch,
    commit: identity.commit,
    commitFull: identity.commitFull,
    pid: process.pid,
    ports: {
      static: port,
      sync: PORT_SYNC,
      hmr: PORT_HMR,
    },
    startedAt,
    kind: 'mfrs-dev-server',
  });

  printHumanSummary('static server ready', [
    `workspace: ${identity.workspace}`,
    `branch: ${identity.branch}`,
    `commit: ${identity.commit}`,
    `root: ${root}`,
    `listen: http://127.0.0.1:${port}/`,
    `identity: http://127.0.0.1:${port}/__mfrs_dev_identity`,
  ]);

  const shutdown = () => {
    clearSessionLock({ onlyIfWorkspace: identity.workspace });
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(error => {
  console.error(`[mfrs-dev-server] ✖ ${error?.message || error}`);
  process.exit(1);
});
