import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, css, app, server, dockerfile] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../server.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../Dockerfile', import.meta.url), 'utf8')
]);

assert.match(html, /href="\/styles\.css"/, 'index.html must load styles.css');
assert.match(html, /src="\/app\.js(?:\?v=cinebook-secure-verify-20261030)?"/, 'index.html must load the vanilla JavaScript app with cache busting');
assert.match(html, /id="app"/, 'index.html must expose the app mount point');
assert.match(app, /async function renderDashboard\(/, 'dashboard renderer must exist');
assert.match(app, /async function renderEmailVerification\(/, 'email verification route must be implemented');
assert.match(app, /registration\.verificationRequired/, 'production sign-up must handle verification-required responses');
assert.match(app, /verifyEmail: token => api\('\/auth\/verify-email'/, 'email verification must post the token to the backend');
assert.match(css, /\.verification-page/, 'email verification must have its dedicated responsive screen');
for (const role of ['CUSTOMER', 'THEATRE_PARTNER', 'ADMIN', 'OPERATIONS']) {
  assert.ok(app.includes(`role === '${role}'`) || (role === 'OPERATIONS' && app.includes("role === 'ADMIN'")), `dashboard role ${role} must be handled`);
}
for (const selector of ['.customer-spotlight', '.partner-schedule-panel', '.admin-studio-panel', '.ops-watchboard']) {
  assert.ok(css.includes(selector), `role layout style ${selector} must exist`);
}
assert.match(server, /requestUrl\.pathname\.startsWith\(["']\/api\/["']\)/, 'development server must proxy API requests');
assert.match(dockerfile, /COPY index\.html styles\.css app\.js/, 'production image must serve the static frontend');
assert.ok(!html.includes('/src/main.tsx'), 'index.html must not depend on a React entrypoint');
assert.match(server, /content-security-policy/, 'development server must send a Content Security Policy');
assert.doesNotMatch(app, /on(?:click|error|submit)=\"/i, 'application templates must not use inline event handlers');

console.log('Static frontend verification passed: HTML assets, role dashboards, API proxy, and production copy are present.');
