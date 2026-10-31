import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (name) => readFile(new URL(`../${name}`, import.meta.url), 'utf8');

test('the page is served as plain HTML with stylesheet and JavaScript assets', async () => {
  const html = await read('index.html');
  assert.match(html, /href="\/styles\.css"/);
  assert.match(html, /src="\/app\.js\?v=cinebook-secure-verify-20261030"/);
  assert.doesNotMatch(html, /main\.tsx|react-dom|vite\.client/i);
});

test('all four workspaces are separate role-specific interfaces', async () => {
  const [app, css] = await Promise.all([read('app.js'), read('styles.css')]);
  for (const role of ['CUSTOMER', 'THEATRE_PARTNER', 'ADMIN']) assert.ok(app.includes(`role === '${role}'`));
  assert.ok(app.includes('SYSTEM OPERATIONS'));
  for (const layout of ['.customer-spotlight', '.partner-workspace-grid', '.admin-studio-grid', '.ops-watchboard']) assert.ok(css.includes(layout));
});

test('the app keeps authentication, bookings, seat selection, and admin actions wired to the API', async () => {
  const app = await read('app.js');
  for (const route of ['/auth/login', '/auth/register', '/shows/${showId}/holds', '/bookings', '/admin/movies', '/admin/users/']) assert.ok(app.includes(route), `expected API integration: ${route}`);
});

test('customer dashboard does not reference an undeclared sidebar variable', async () => {
  const app = await read('app.js');
  assert.match(app, /dashPage\('customer', '', main\)/);
  assert.doesNotMatch(app, /\bcustomerRail\b/);
});



test('frontend assets explicitly bypass stale browser caches after the customer dashboard fix', async () => {
  const [server, nginx] = await Promise.all([read('server.mjs'), read('nginx.conf')]);
  assert.match(server, /cache-control': 'no-store, no-cache, must-revalidate, max-age=0'/);
  assert.match(nginx, /Cache-Control "no-store, no-cache, must-revalidate, max-age=0" always/);
});


test('sign-up has password-strength feedback and avoids inline JavaScript handlers', async () => {
  const [app, html, server, nginx] = await Promise.all([read('app.js'), read('index.html'), read('server.mjs'), read('nginx.conf')]);
  assert.match(app, /password-strength-bar/);
  assert.match(app, /password\.length < 12/);
  assert.match(app, /registration\.emailSent/);
  assert.doesNotMatch(app, /on(?:click|error|submit)="/i);
  assert.match(html, /app\.js\?v=cinebook-secure-verify-20261030/);
  assert.match(server, /content-security-policy/);
  assert.match(nginx, /Content-Security-Policy/);
});


test('email verification has a dedicated route and handles production sign-up', async () => {
  const [app, css] = await Promise.all([read('app.js'), read('styles.css')]);
  assert.match(app, /async function renderEmailVerification\(/);
  assert.match(app, /registration\.verificationRequired/);
  assert.match(app, /verifyEmail: token => api\('\/auth\/verify-email'/);
  assert.match(app, /url\.hash\.replace\(\/\^#\//);
  assert.match(app, /history\.replaceState\(null, '', url\.pathname/);
  assert.match(css, /\.verification-page/);
});
