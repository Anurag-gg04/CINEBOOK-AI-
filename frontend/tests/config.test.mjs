import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('React Vite app, SPA routes and server-side proxy functions are present', () => {
  const html = read('index.html');
  const config = JSON.parse(read('vercel.json'));
  assert.match(html, /src="\/src\/main\.tsx"/);
  assert.match(read('src/App.tsx'), /path="\/verify-email"/);
  assert.ok(config.rewrites.some(rule => rule.source === '/oauth2/:path*'));
  assert.ok(config.rewrites.some(rule => rule.source === '/login/oauth2/:path*'));
  assert.ok(config.rewrites.some(rule => rule.destination === '/index.html'));
  assert.ok(fs.existsSync(path.join(root, 'api/[...path].js')));
  assert.ok(fs.existsSync(path.join(root, 'api/oauth2/[...path].js')));
  assert.ok(fs.existsSync(path.join(root, 'api/login/oauth2/[...path].js')));
  assert.match(read('api/[...path].js'), /bodyParser: false/);
});

test('Google and AI integrations use backend endpoints, not browser credentials', () => {
  const button = read('src/components/GoogleSignInButton.tsx');
  const ai = read('src/pages/AIAssistantPage.tsx');
  const callback = read('src/pages/AuthCallbackPage.tsx');
  assert.match(button, /\/auth\/google\/status/);
  assert.match(button, /\/oauth2\/authorization\/google/);
  assert.match(callback, /\/auth\/oauth\/exchange/);
  assert.match(ai, /\/ai\/assistant/);
  assert.doesNotMatch(read('src/lib/api.ts'), /AI_API_KEY|GOOGLE_CLIENT_SECRET/);
});

test('Movie discovery and booking screens call real catalogue and inventory APIs', () => {
  const home = read('src/pages/HomePage.tsx');
  const movie = read('src/pages/MoviePage.tsx');
  assert.match(home, /api<MoviePageResponse>\(`\/movies/);
  assert.match(movie, /`\/shows\?movieId=/);
  assert.match(movie, /`\/shows\/\$\{selectedShow\?\.id\}\/seats`/);
  assert.match(movie, /\/payments\/razorpay\/orders/);
  assert.match(movie, /\/payments\/simulator/);
});


test('Google one-time callback exchange is guarded against StrictMode effect replay', () => {
  const callback = read('src/pages/AuthCallbackPage.tsx');
  assert.match(callback, /useRef/);
  assert.match(callback, /if \(exchangeStarted\.current\) return/);
  assert.match(callback, /exchangeStarted\.current = true/);
});

test('production email verification tokens are consumed once in the React application', () => {
  const page = read('src/pages/VerifyEmailPage.tsx');
  assert.match(page, /window\.location\.hash/);
  assert.match(page, /\/auth\/verify-email/);
  assert.match(page, /if \(started\.current\) return/);
});
