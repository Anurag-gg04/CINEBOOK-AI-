import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || process.env.FRONTEND_PORT || 5173);
const backend = process.env.CINEBOOK_BACKEND_URL || 'http://localhost:8080';
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (requestUrl.pathname.startsWith('/api/')) {
    try {
      const upstreamUrl = `${backend}${requestUrl.pathname}${requestUrl.search}`;
      const headers = new Headers(req.headers);
      headers.delete('host');
      headers.delete('connection');
      const upstream = await fetch(upstreamUrl, {
        method: req.method,
        headers,
        body: ['GET', 'HEAD'].includes(req.method || 'GET') ? undefined : req,
        duplex: ['GET', 'HEAD'].includes(req.method || 'GET') ? undefined : 'half'
      });
      res.writeHead(upstream.status, Object.fromEntries(upstream.headers.entries()));
      if (req.method === 'HEAD' || !upstream.body) return res.end();
      for await (const chunk of upstream.body) res.write(chunk);
      return res.end();
    } catch {
      res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ code: 'BACKEND_UNAVAILABLE', message: 'Cannot reach CineBook API. Start the Spring Boot backend on port 8080 and try again.' }));
    }
  }

  let pathname;
  try { pathname = decodeURIComponent(requestUrl.pathname); }
  catch { res.writeHead(400); return res.end('Bad request'); }
  let target = path.resolve(root, `.${pathname}`);
  if (target !== root && !target.startsWith(root + path.sep) && target !== path.join(root, 'index.html')) {
    res.writeHead(403); return res.end('Forbidden');
  }
  try {
    const stat = await fs.promises.stat(target);
    if (stat.isDirectory()) target = path.join(target, 'index.html');
  } catch {
    target = path.join(root, 'index.html');
  }
  try {
    const data = await fs.promises.readFile(target);
    res.writeHead(200, {
      'content-type': mime[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
      'pragma': 'no-cache',
      'expires': '0',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'x-frame-options': 'DENY',
      'permissions-policy': 'camera=(), microphone=(), geolocation=()',
      'content-security-policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self' https://api.razorpay.com; script-src 'self' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://lumberjack.razorpay.com; frame-src https://api.razorpay.com https://checkout.razorpay.com"
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`CineBook static frontend: http://localhost:${port}`);
  console.log(`API proxy target: ${backend}`);
});
