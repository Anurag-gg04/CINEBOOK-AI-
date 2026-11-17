import test from 'node:test';
import assert from 'node:assert/strict';
import { proxyRequest } from '../lib/proxy.js';
import { Readable } from 'node:stream';

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(body) { this.body = body; },
    json(body) { this.body = body; }
  };
}

test('API proxy keeps method, query string, body and authorization header', async () => {
  const previousFetch = globalThis.fetch;
  const previousOrigin = process.env.BACKEND_BASE_URL;
  let captured;
  process.env.BACKEND_BASE_URL = 'https://api.example.test';
  globalThis.fetch = async (url, options) => {
    captured = { url: String(url), options };
    return new Response(JSON.stringify({ ok: true }), { status: 201, headers: { 'content-type': 'application/json' } });
  };
  try {
    const req = {
      url: '/api/bookings?status=CONFIRMED&page=2', method: 'POST',
      headers: { host: 'cinebook.vercel.app', authorization: 'Bearer test-token', 'content-type': 'application/json' },
      body: { id: 42 }, socket: { remoteAddress: '127.0.0.1' }
    };
    const res = mockResponse();
    await proxyRequest(req, res, '/api');
    assert.equal(captured.url, 'https://api.example.test/api/bookings?status=CONFIRMED&page=2');
    assert.equal(captured.options.method, 'POST');
    assert.equal(captured.options.headers.get('authorization'), 'Bearer test-token');
    assert.deepEqual(JSON.parse(captured.options.body), { id: 42 });
    assert.equal(res.statusCode, 201);
    assert.deepEqual(JSON.parse(res.body.toString()), { ok: true });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousOrigin === undefined) delete process.env.BACKEND_BASE_URL;
    else process.env.BACKEND_BASE_URL = previousOrigin;
  }
});

test('OAuth authorization proxy maps the Vercel function path to the backend OAuth path', async () => {
  const previousFetch = globalThis.fetch;
  const previousOrigin = process.env.BACKEND_BASE_URL;
  let capturedUrl = '';
  process.env.BACKEND_BASE_URL = 'https://api.example.test';
  globalThis.fetch = async url => {
    capturedUrl = String(url);
    return new Response(null, { status: 302, headers: { location: 'https://accounts.google.com/o/oauth2/v2/auth' } });
  };
  try {
    const req = { url: '/api/oauth2/authorization/google?client=web', method: 'GET', headers: { host: 'cinebook.vercel.app' } };
    const res = mockResponse();
    await proxyRequest(req, res, '/oauth2');
    assert.equal(capturedUrl, 'https://api.example.test/oauth2/authorization/google?client=web');
    assert.equal(res.statusCode, 302);
    assert.equal(res.headers.location, 'https://accounts.google.com/o/oauth2/v2/auth');
  } finally {
    globalThis.fetch = previousFetch;
    if (previousOrigin === undefined) delete process.env.BACKEND_BASE_URL;
    else process.env.BACKEND_BASE_URL = previousOrigin;
  }
});


test('API proxy forwards a signed webhook body byte-for-byte when body parsing is disabled', async () => {
  const previousFetch = globalThis.fetch;
  const previousOrigin = process.env.BACKEND_BASE_URL;
  const rawBody = '{  \"event\" : \"payment.captured\", \"amount\": 2500 }\n';
  let forwarded = '';
  process.env.BACKEND_BASE_URL = 'https://api.example.test';
  globalThis.fetch = async (_url, options) => { forwarded = Buffer.from(options.body).toString('utf8'); return new Response('ok', { status: 200 }); };
  try {
    const req = Readable.from([Buffer.from(rawBody)]);
    Object.assign(req, { url: '/api/payments/razorpay/webhook', method: 'POST', headers: { host: 'cinebook.vercel.app', 'content-type': 'application/json', 'x-razorpay-signature': 'test-signature' }, socket: { remoteAddress: '127.0.0.1' } });
    const res = mockResponse();
    await proxyRequest(req, res, '/api');
    assert.equal(forwarded, rawBody);
    assert.equal(res.statusCode, 200);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousOrigin === undefined) delete process.env.BACKEND_BASE_URL;
    else process.env.BACKEND_BASE_URL = previousOrigin;
  }
});
