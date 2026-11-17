const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade', 'host', 'content-length',
  'accept-encoding'
]);

export async function proxyRequest(req, res, upstreamPrefix) {
  const backendOrigin = process.env.BACKEND_BASE_URL;
  if (!backendOrigin) {
    res.status(503).json({
      code: 'BACKEND_BASE_URL_MISSING',
      message: 'Set BACKEND_BASE_URL in the Vercel project environment variables.'
    });
    return;
  }

  let target;
  try {
    const incoming = new URL(req.url || '/', 'https://vercel.invalid');
    const base = new URL(backendOrigin);
    if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password) {
      throw new Error('Invalid backend origin');
    }
    const stripPrefix = upstreamPrefix === '/api'
      ? '/api'
      : upstreamPrefix === '/oauth2'
        ? '/api/oauth2'
        : '/api/login/oauth2';
    const suffix = incoming.pathname.startsWith(stripPrefix)
      ? incoming.pathname.slice(stripPrefix.length)
      : '';
    target = new URL(`${upstreamPrefix}${suffix}${incoming.search}`, base);
  } catch {
    res.status(500).json({ code: 'INVALID_BACKEND_BASE_URL', message: 'BACKEND_BASE_URL must be a valid HTTP(S) origin.' });
    return;
  }

  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers || {})) {
    if (value == null || HOP_BY_HOP.has(name.toLowerCase())) continue;
    headers.set(name, Array.isArray(value) ? value.join(', ') : String(value));
  }
  headers.set('x-forwarded-host', req.headers.host || '');
  headers.set('x-forwarded-proto', req.headers['x-forwarded-proto'] || 'https');
  headers.set('x-forwarded-for', req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '');

  let body;
  if (!['GET', 'HEAD'].includes(req.method || 'GET')) {
    if (Buffer.isBuffer(req.body)) body = req.body;
    else if (typeof req.body === 'string') body = req.body;
    else if (req.body !== undefined) body = JSON.stringify(req.body);
    else {
      const chunks = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      body = Buffer.concat(chunks);
    }
  }

  try {
    const upstream = await fetch(target, {
      method: req.method || 'GET',
      headers,
      body,
      redirect: 'manual'
    });
    res.status(upstream.status);
    for (const [name, value] of upstream.headers.entries()) {
      const normalized = name.toLowerCase();
      if (HOP_BY_HOP.has(normalized) || normalized === 'set-cookie') continue;
      res.setHeader(name, value);
    }
    if (typeof upstream.headers.getSetCookie === 'function') {
      const cookies = upstream.headers.getSetCookie();
      if (cookies.length) res.setHeader('set-cookie', cookies);
    } else {
      const cookie = upstream.headers.get('set-cookie');
      if (cookie) res.setHeader('set-cookie', cookie);
    }
    if (req.method === 'HEAD' || !upstream.body) { res.end(); return; }
    const payload = Buffer.from(await upstream.arrayBuffer());
    res.end(payload);
  } catch {
    res.status(502).json({
      code: 'BACKEND_PROXY_FAILED',
      message: 'The CineBook API could not be reached. Check that the backend service is healthy.'
    });
  }
}
