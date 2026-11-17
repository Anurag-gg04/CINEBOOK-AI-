import { proxyRequest } from '../../lib/proxy.js';
export default async function handler(req, res) {
  return proxyRequest(req, res, '/oauth2');
}
