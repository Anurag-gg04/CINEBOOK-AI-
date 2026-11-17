import { proxyRequest } from '../lib/proxy.js';

// Keep the raw request stream intact for signed webhook payloads (notably Razorpay).
export const config = { api: { bodyParser: false } };

export default function handler(req, res) {
  return proxyRequest(req, res, '/api');
}
