#!/usr/bin/env node
/**
 * mfrs-dev-server-simple.mjs —— 简化版静态服务器（固定端口 5510）
 * 
 * 去掉了 worktree 检测、端口动态分配、会话锁等复杂逻辑。
 * 仅提供基础静态文件服务 + CORS。
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const PORT = 5510;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

function servePath(filePath, res) {
  if (!existsSync(filePath)) {
    res.writeHead(404, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end('404 Not Found');
    return;
  }

  const stat = statSync(filePath);
  if (stat.isDirectory()) {
    const indexPath = join(filePath, 'index.html');
    if (existsSync(indexPath)) {
      servePath(indexPath, res);
      return;
    }
    res.writeHead(403, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end('403 Forbidden: Directory listing disabled');
    return;
  }

  const ext = extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.end(content);
  } catch (err) {
    res.writeHead(500, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end('500 Internal Server Error: ' + err.message);
  }
}

const server = createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);
  const filePath = join(ROOT, pathname.slice(1));

  servePath(filePath, res);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ 端口 ${PORT} 已被占用！`);
    console.error(`\n请手动处理：`);
    console.error(`  1. 检查是否已经启动了开发环境（查看终端面板）`);
    console.error(`  2. 使用 netstat -ano | findstr ${PORT} 查看占用进程`);
    console.error(`  3. 使用任务管理器结束对应进程\n`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('\nStarting static server...');
  console.log(`\n✅ 静态服务器已启动`);
  console.log(`   地址: http://127.0.0.1:${PORT}/`);
  console.log(`   根目录: ${ROOT}`);
  console.log(`\n💡 提示：确保已运行「切换到开发模式」任务，将 YAML 中的 CDN 链接改为本地地址\n`);
  console.log('Static server running');
});

process.on('SIGINT', () => {
  console.log('\n\n🛑 静态服务器已停止');
  process.exit(0);
});
