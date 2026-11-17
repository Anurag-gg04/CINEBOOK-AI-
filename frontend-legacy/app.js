/* CineBook AI — vanilla HTML, CSS and JavaScript frontend. */
(() => {
  'use strict';

  const API_BASE = window.CINEBOOK_API_BASE || '/api';
  const TOKEN_KEY = 'cinebook.tokens';
  const app = document.getElementById('app');
  let currentUser = null;
  let refreshing = null;
  let selectedSeatIds = new Set();
  let currentSeats = [];
  let activeShow = null;
  let activeHold = null;
  let quoteState = null;
  let appliedCoupon = '';
  let checkoutClock = Date.now();
  let seatRefreshTimer = null;
  let checkoutTimer = null;
  let notificationItems = [];

  const symbols = {
    film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.2 4.2"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowUp: '<path d="M7 17 17 7M8 7h9v9"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    ticket: '<path d="M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 1 0-4V4H3v4Z"/><path d="M13 4v2M13 10v2M13 16v2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    heart: '<path d="M20.8 8.6c0 4.2-8.8 10-8.8 10S3.2 12.8 3.2 8.6A4.6 4.6 0 0 1 12 6.7a4.6 4.6 0 0 1 8.8 1.9Z"/>',
    spark: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"/>',
    shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.9M16 3.2a4 4 0 0 1 0 7.6"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    logout: '<path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/>',
    dashboard: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m18 6-12 12M6 6l12 12"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    armchair: '<path d="M5 11V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4M4 11h16l1 7H3l1-7ZM6 18v2M18 18v2"/>',
    accessibility: '<circle cx="12" cy="4" r="1.5"/><path d="M5 8h14M12 8v5l4 6M12 13l-4 6"/>',
    wallet: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18M16 14h2"/>',
    activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    print: '<path d="M6 9V3h12v6M6 17H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.6 9a7 7 0 0 1 11.7-2.6L20 12M4 12l2.7 5.6A7 7 0 0 0 18.4 15"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
    monitor: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    heartPulse: '<path d="M20.8 8.6c0 4.2-8.8 10-8.8 10S3.2 12.8 3.2 8.6A4.6 4.6 0 0 1 12 6.7a4.6 4.6 0 0 1 8.8 1.9Z"/><path d="M6 11h3l1.2-2.2L13 14l1.6-3H18"/>'
  };

  function icon(name, size = 18, cls = '') {
    const body = symbols[name] || symbols.spark;
    return `<svg class="icon ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  }
  function attr(value) { return esc(value).replace(/`/g, '&#96;'); }
  function money(value) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0)); }
  function number(value) { return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(value || 0)); }
  function dateTime(value, options = {}) {
    if (!value) return 'Time to be announced';
    const defaults = { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' };
    try { return new Intl.DateTimeFormat('en-IN', { ...defaults, ...options }).format(new Date(value)); } catch { return String(value); }
  }
  function dateOnly(value) { return dateTime(value, { weekday: 'long', day: 'numeric', month: 'long', year: undefined, hour: undefined, minute: undefined }); }
  function duration(value) { const n = Number(value || 0); if (n < 60) return `${n} min`; return `${Math.floor(n / 60)}h${n % 60 ? ` ${n % 60}m` : ''}`; }
  function shortDate(value) { return dateTime(value, { weekday: undefined, day: 'numeric', month: 'short', hour: undefined, minute: undefined, year: undefined }); }
  function randomId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }
  function readTokens() { try { return JSON.parse(sessionStorage.getItem(TOKEN_KEY) || 'null'); } catch { return null; } }
  function saveTokens(tokens) { if (tokens) sessionStorage.setItem(TOKEN_KEY, JSON.stringify(tokens)); else sessionStorage.removeItem(TOKEN_KEY); }

  async function refreshSession() {
    if (refreshing) return refreshing;
    refreshing = (async () => {
      const tokens = readTokens();
      if (!tokens?.refreshToken) return false;
      try {
        const response = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: tokens.refreshToken }) });
        if (!response.ok) { saveTokens(null); currentUser = null; return false; }
        saveTokens(await response.json());
        return true;
      } catch { return false; }
      finally { refreshing = null; }
    })();
    return refreshing;
  }

  async function api(path, init = {}) {
    const headers = new Headers(init.headers || {});
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    headers.set('X-Correlation-ID', randomId());
    const tokens = readTokens();
    if (tokens?.accessToken) headers.set('Authorization', `Bearer ${tokens.accessToken}`);
    let response;
    try { response = await fetch(`${API_BASE}${path}`, { ...init, headers }); }
    catch { throw new Error('The API could not be reached. Make sure the CineBook backend is running, then retry.'); }
    if (response.status === 401 && !path.startsWith('/auth/')) {
      if (await refreshSession()) {
        const next = readTokens();
        if (next?.accessToken) headers.set('Authorization', `Bearer ${next.accessToken}`);
        response = await fetch(`${API_BASE}${path}`, { ...init, headers });
      }
    }
    if (!response.ok) {
      let body = {};
      try { body = await response.json(); } catch { /* response has no JSON body */ }
      const error = new Error(body.message || `Request failed (${response.status})`);
      error.code = body.code; error.status = response.status; error.details = body.errors;
      throw error;
    }
    if (response.status === 204) return null;
    if (response.status === 205) return null;
    const type = response.headers.get('content-type') || '';
    return type.includes('application/json') ? response.json() : response.text();
  }

  const authApi = {
    login: (email, password) => api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (displayName, email, password) => api('/auth/register', { method: 'POST', body: JSON.stringify({ displayName, email, password }) }),
    verifyEmail: token => api('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }),
    me: () => api('/auth/me'),
    logout: async () => { const tokens = readTokens(); try { await api('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: tokens?.refreshToken || '' }) }); } finally { saveTokens(null); currentUser = null; } }
  };

  function setShell(content, title = 'CineBook AI') {
    document.title = `${title} | CineBook AI`;
    const p = location.pathname;
    const isActive = path => (path === '/' && (p === '/' || p === '/movies')) || (path !== '/' && p.startsWith(path));
    const navLink = (href, label, iconName) => `<a href="${href}" class="${isActive(href) ? 'active' : ''}">${iconName ? icon(iconName, 15) : ''}${label}</a>`;
    const topbar = `<header class="topbar"><div class="topbar-inner">
      <a href="/" class="brand" aria-label="CineBook AI home"><span class="brand-icon">${icon('film', 19)}</span><span class="brand-copy">CineBook <b>AI</b><small>YOUR NIGHT. YOUR STORY.</small></span></a>
      <button class="mobile-menu-toggle" id="menu-toggle" aria-label="Open navigation">${icon('menu', 19)}</button>
      <nav class="main-nav" id="main-nav">
        ${navLink('/movies', 'Explore films', 'film')}
        ${currentUser ? navLink('/bookings', 'My tickets', 'ticket') : ''}
        ${currentUser ? navLink('/dashboard', 'Dashboard', 'dashboard') : ''}
        <span class="nav-divider"></span>
        ${currentUser ? `<div class="notification-menu"><button class="notification-trigger" id="notification-trigger" aria-label="Notifications" aria-expanded="false">${icon('bell', 16)}<span class="notification-count" id="notification-count" hidden>0</span></button><div class="notification-panel" id="notification-panel" hidden><div class="notification-panel-head"><strong>Notifications</strong><small id="notification-unread">Checking…</small></div><div id="notification-list"><p class="notification-empty">Loading notifications…</p></div></div></div>
          <span class="nav-user"><span class="avatar">${esc((currentUser.displayName || 'U').trim().charAt(0).toUpperCase())}</span><span class="nav-user-name">${esc((currentUser.displayName || '').split(' ')[0])}</span></span><button class="nav-logout" id="logout-button" title="Sign out" aria-label="Sign out">${icon('logout', 15)}</button>` : `<a href="/login" class="nav-login ${isActive('/login') ? 'active' : ''}">Log in</a><a href="/register" class="button button-small">Join CineBook ${icon('arrow', 14)}</a>`}
      </nav></div></header>`;
    const footer = `<footer class="footer"><div class="footer-inner"><a href="/" class="footer-brand">${icon('film', 16)} CineBook AI</a><span>Movie nights, made memorable.</span><div class="footer-links"><a href="/movies">Discover</a>${currentUser ? '<a href="/bookings">Your bookings</a>' : '<a href="/login">Sign in</a>'}<a href="/dashboard">Dashboard</a></div><small>Development experience · Simulator payments do not move real money</small></div></footer>`;
    app.innerHTML = `${topbar}<main class="main-content"><div id="page-content">${content}</div></main>${footer}<div class="toast-stack" id="toast-stack" aria-live="polite"></div>`;
    bindShell();
    bindImageFallbacks();
  }

  function bindShell() {
    const menuButton = document.getElementById('menu-toggle');
    const nav = document.getElementById('main-nav');
    menuButton?.addEventListener('click', () => {
      nav.classList.toggle('open');
      menuButton.innerHTML = nav.classList.contains('open') ? icon('close', 19) : icon('menu', 19);
      menuButton.setAttribute('aria-label', nav.classList.contains('open') ? 'Close navigation' : 'Open navigation');
    });
    document.getElementById('logout-button')?.addEventListener('click', async () => {
      const button = document.getElementById('logout-button'); if (button) button.disabled = true;
      try { await authApi.logout(); } catch { saveTokens(null); currentUser = null; }
      location.href = '/';
    });
    const trigger = document.getElementById('notification-trigger');
    trigger?.addEventListener('click', async () => {
      const panel = document.getElementById('notification-panel');
      const open = panel.hidden;
      panel.hidden = !open;
      trigger.setAttribute('aria-expanded', String(open));
      if (open) await loadNotifications();
    });
    document.addEventListener('click', event => {
      const panel = document.getElementById('notification-panel');
      const wrapper = document.querySelector('.notification-menu');
      if (panel && wrapper && !wrapper.contains(event.target)) {
        panel.hidden = true;
        document.getElementById('notification-trigger')?.setAttribute('aria-expanded', 'false');
      }
    }, { once: true });
    document.querySelectorAll('[data-retry]').forEach(button => button.addEventListener('click', () => location.reload()));
    const flashRaw = sessionStorage.getItem('cinebook.flash');
    if (flashRaw) {
      sessionStorage.removeItem('cinebook.flash');
      try {
        const flash = JSON.parse(flashRaw);
        queueMicrotask(() => showToast(flash.message || 'Your account is ready.', flash.type || 'success', flash.title || 'CineBook AI'));
      } catch { /* Ignore an invalid one-time UI message. */ }
    }
    if (currentUser) updateUnreadCount();
  }

  function bindImageFallbacks(root = document) {
    root.querySelectorAll('[data-hide-on-error]').forEach(img => img.addEventListener('error', () => { img.hidden = true; }, { once: true }));
    root.querySelectorAll('.auth-art > img').forEach(img => img.addEventListener('error', () => { img.hidden = true; }, { once: true }));
    root.querySelectorAll('img[data-fallback-title]').forEach(img => {
      img.addEventListener('error', () => {
        const title = img.dataset.fallbackTitle || 'CineBook';
        const genres = img.dataset.fallbackGenres || 'A story worth seeing';
        const fallback = document.createElement('div');
        fallback.className = 'poster-fallback';
        fallback.innerHTML = `<span>CINEBOOK SELECTS</span><strong>${esc(title)}</strong><small>${esc(genres)}</small>`;
        img.replaceWith(fallback);
      }, { once: true });
    });
  }

  function showToast(message, type = 'success', title = '') {
    const stack = document.getElementById('toast-stack');
    if (!stack) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `${title ? `<strong>${esc(title)}</strong>` : ''}${esc(message)}`;
    stack.appendChild(toast);
    setTimeout(() => toast.remove(), 4800);
  }

  function contentWrap(inner, cls = '') { return `<div class="page-wrap ${cls}">${inner}</div>`; }
  function errorView(error, retryPath) {
    return `<section class="route-error"><div class="eyebrow">LET'S TRY THAT AGAIN</div><h2>We hit a little snag.</h2><p>${esc(error?.message || 'This part of CineBook could not be loaded.')}</p>${error?.code ? `<p><code>${esc(error.code)}</code></p>` : ''}<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="button" type="button" data-retry>${icon('refresh', 15)} Retry</button><a class="button button-ghost" href="${retryPath || '/'}">Back to movies</a></div></section>`;
  }
  function posterMarkup(url, title, genres = '', cls = 'movie-poster') {
    if (url) return `<img class="${cls}" src="${attr(url)}" alt="${attr(title)} poster" loading="lazy" data-fallback-title="${attr(title)}" data-fallback-genres="${attr(genres)}">`;
    return `<div class="poster-fallback"><span>CINEBOOK SELECTS</span><strong>${esc(title)}</strong><small>${esc(genres || 'A story worth seeing')}</small></div>`;
  }
  function movieCard(movie, featured = false) {
    const genreText = (movie.genres || []).slice(0, 2).join(' · ');
    return `<article class="movie-card ${featured ? 'movie-card-featured' : ''}"><a class="movie-poster-link" href="/movies/${movie.id}" aria-label="View ${attr(movie.title)}">${posterMarkup(movie.posterUrl, movie.title, genreText)}<div class="poster-overlay"><span class="rating-pill">${icon('star', 12)} ${Number(movie.rating || 0).toFixed(1)}</span><span class="poster-cta">Explore ${icon('arrowUp', 14)}</span></div></a><div class="movie-card-info"><div class="movie-card-meta"><span>${esc(movie.language || 'Film')}</span><span class="meta-dot"></span><span>${duration(movie.durationMinutes)}</span></div><a class="movie-card-title" href="/movies/${movie.id}">${esc(movie.title)}</a><div class="genre-row">${(movie.genres || []).slice(0,2).map(g => `<span>${esc(g)}</span>`).join('')}</div></div></article>`;
  }

  async function renderCatalog() {
    const params = new URLSearchParams(location.search);
    const query = params.get('q') || '';
    const language = params.get('language') || '';
    const genre = params.get('genre') || '';
    const sort = params.get('sort') || 'rating';
    let result;
    try {
      const apiParams = new URLSearchParams({ q: query, language, genre, page: '0', size: '24', sort });
      result = await api(`/movies?${apiParams}`);
    } catch (error) {
      setShell(contentWrap(errorView(error, '/movies')), 'Explore films');
      return;
    }
    const movies = Array.isArray(result?.content) ? result.content : [];
    const featured = movies[0];
    const allGenres = [...new Set(movies.flatMap(movie => movie.genres || []))].sort();
    const languages = [...new Set(movies.map(movie => movie.language).filter(Boolean))].sort();
    const chips = ['All films', ...allGenres.slice(0, 7)];
    const heroPoster = featured?.backdropUrl || featured?.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cda7f0?auto=format&fit=crop&w=1000&q=85';
    const html = contentWrap(`
      <section class="catalog-hero">
        <div class="catalog-hero-copy"><span class="hero-kicker"><span class="live-dot"></span> YOUR NEXT GREAT NIGHT OUT STARTS HERE</span><h1>Some stories are<br>better on the <em>big screen.</em></h1><p>Skip the endless scrolling. Discover films you’ll talk about on the way home, pick a seat that feels just right, and make an evening of it.</p><form class="hero-search" id="hero-search">${icon('search', 18, 'search-icon')}<input name="q" value="${attr(query)}" placeholder="Search movies, genres, a mood…" aria-label="Search movies"><button class="button" type="submit">Find a film ${icon('arrow', 14)}</button></form><div class="hero-footnote"><span>${icon('shield', 13)} <b>Secure booking</b></span><span>${icon('spark', 13)} Smart seat picks</span><span>${icon('ticket', 13)} Instant e-tickets</span></div></div>
        <div class="hero-art-side"><div class="hero-poster-stack"><img class="hero-poster-side left" src="${attr(featured?.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cda7f0?auto=format&fit=crop&w=500&q=80')}" alt="Featured cinema poster" data-hide-on-error><img class="hero-poster-main" src="${attr(heroPoster)}" alt="Featured movie art" data-hide-on-error><img class="hero-poster-side right" src="https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=500&q=80" alt="Cinema still" data-hide-on-error><div class="floating-rating"><span class="star">★</span><div><strong>${featured ? Number(featured.rating || 0).toFixed(1) : '4.9'} / 5</strong><small>${featured ? 'Audience favourite' : 'Made for movie lovers'}</small></div></div><div class="hero-sticker"><strong>100%</strong><span>MOVIE NIGHT<br>ENERGY</span></div></div></div>
      </section>
      <div class="trust-strip"><div class="trust-item"><span class="trust-icon">${icon('spark', 17)}</span><div><strong>Smart seat finder</strong><small>Find your sweet spot</small></div></div><div class="trust-item"><span class="trust-icon">${icon('shield', 17)}</span><div><strong>Booking you can trust</strong><small>Seats held securely</small></div></div><div class="trust-item"><span class="trust-icon">${icon('ticket', 17)}</span><div><strong>Digital tickets</strong><small>Ready when you are</small></div></div><div class="trust-item"><span class="trust-icon">${icon('heart', 17)}</span><div><strong>Made for movie people</strong><small>Little things, done better</small></div></div></div>
      <div class="section-heading"><div><div class="eyebrow">THE GOOD STUFF</div><h2>${query ? `Results for “${esc(query)}”` : 'Find your next favourite.'}</h2><p>${movies.length ? `${number(result.totalElements ?? movies.length)} films to explore. Pick a title and we’ll take care of the rest.` : 'Try a different search or reset the filters to see the full catalogue.'}</p></div><a class="heading-action" href="/movies">Browse collection ${icon('arrow', 14)}</a></div>
      <div class="catalog-toolbar"><div class="filter-chips">${chips.map((g,i) => `<button type="button" class="filter-chip ${(i === 0 && !genre) || genre === g ? 'active' : ''}" data-genre="${attr(i === 0 ? '' : g)}">${esc(g)}</button>`).join('')}</div><form id="catalog-filters" class="catalog-controls"><input class="control-input" name="q" value="${attr(query)}" placeholder="Search title…" aria-label="Search title"><select class="control-select" name="language" aria-label="Filter by language"><option value="">All languages</option>${languages.map(l => `<option value="${attr(l)}" ${language === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select><select class="control-select" name="sort" aria-label="Sort films"><option value="rating" ${sort === 'rating' ? 'selected' : ''}>Top rated</option><option value="releaseDate" ${sort === 'releaseDate' ? 'selected' : ''}>Latest releases</option><option value="title" ${sort === 'title' ? 'selected' : ''}>A–Z title</option></select><input type="hidden" name="genre" value="${attr(genre)}"></form></div>
      ${movies.length ? `<div class="movie-grid">${movies.map((movie,i) => movieCard(movie, i === 0)).join('')}</div>` : `<div class="empty-state"><div class="empty-icon">${icon('search', 22)}</div><h3>No films found this time.</h3><p>Try a new title, choose another genre, or reset your filters to explore the entire catalogue.</p><a class="button button-ghost" href="/movies">Clear filters ${icon('refresh', 14)}</a></div>`}
      <section class="promo-banner"><div><div class="eyebrow">MAKE IT A NIGHT</div><h3>Good film. Great seats. No guesswork.</h3><p>Let CineBook AI help you find a seat combo that fits your group, your vibe, and your budget.</p></div><a class="button" href="${currentUser ? '/bookings' : '/register'}">${currentUser ? 'View my tickets' : 'Create your free account'} ${icon('arrow', 15)}</a></section>
    `, 'catalog-page');
    setShell(html, query ? `${query} — films` : 'Discover films');
    document.getElementById('hero-search')?.addEventListener('submit', event => {
      event.preventDefault(); const value = new FormData(event.currentTarget).get('q') || '';
      location.href = `/movies?${new URLSearchParams({ q: value })}`;
    });
    document.getElementById('catalog-filters')?.addEventListener('change', event => {
      const form = event.currentTarget; const f = new FormData(form); location.href = `/movies?${new URLSearchParams({ q: f.get('q') || '', language: f.get('language') || '', genre: f.get('genre') || '', sort: f.get('sort') || 'rating' })}`;
    });
    document.getElementById('catalog-filters')?.addEventListener('submit', event => event.preventDefault());
    document.querySelectorAll('[data-genre]').forEach(button => button.addEventListener('click', () => {
      const nextGenre = button.dataset.genre || '';
      location.href = `/movies?${new URLSearchParams({ q: query, language, genre: nextGenre, sort })}`;
    }));
    bindImageFallbacks();
  }

  async function renderMovieDetails(movieId) {
    try {
      const [movie, shows] = await Promise.all([api(`/movies/${movieId}`), api(`/shows?movieId=${encodeURIComponent(movieId)}`)]);
      const dates = Array.isArray(shows) ? shows : [];
      const cities = [...new Set(dates.map(show => show.city).filter(Boolean))].sort();
      const params = new URLSearchParams(location.search);
      const city = params.get('city') || '';
      const matching = city ? dates.filter(show => show.city?.toLowerCase() === city.toLowerCase()) : dates;
      const grouped = new Map();
      matching.forEach(show => { const key = new Date(show.startsAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); if (!grouped.has(key)) grouped.set(key, []); grouped.get(key).push(show); });
      const showCards = [...grouped.entries()].map(([day, dayShows]) => `<section><div class="section-heading" style="margin:26px 0 13px"><div><div class="eyebrow">${esc(dayShows.length)} ${dayShows.length === 1 ? 'SCREENING' : 'SCREENINGS'}</div><h2 style="font-size:19px;margin-top:7px">${esc(dateOnly(dayShows[0].startsAt))}</h2></div></div><div class="show-list">${dayShows.sort((a,b)=>new Date(a.startsAt)-new Date(b.startsAt)).map(show => `<article class="show-card"><div class="show-venue"><span class="venue-icon">${icon('monitor', 19)}</span><div><h3>${esc(show.theatreName)}</h3><p>${esc(show.address || show.city)} · ${esc(show.screenName || 'Main screen')}</p><div class="show-time-row"><span class="show-time">${esc(dateTime(show.startsAt, { weekday: undefined, day: undefined, month: undefined, year: undefined }))}</span><span class="muted-small">${esc(show.city || '')}</span></div></div></div><div class="show-price"><div><small>Tickets from</small><strong>${money(show.startingPrice)}</strong></div><a class="button button-small" href="/shows/${show.id}">Choose seats ${icon('arrow', 13)}</a></div></article>`).join('')}</div></section>`).join('');
      const hero = `<div class="page-wrap"><a class="back-link" href="/movies">${icon('back', 14)} Back to all films</a><section class="detail-hero"><img class="detail-hero-bg" src="${attr(movie.backdropUrl || movie.posterUrl || '')}" alt="" data-hide-on-error><div class="detail-hero-shade"></div><div class="detail-hero-content"><div>${posterMarkup(movie.posterUrl, movie.title, (movie.genres || []).slice(0,2).join(' · '), 'detail-poster')}</div><div class="movie-detail-copy"><div class="eyebrow">THE BIG SCREEN IS CALLING</div><h1>${esc(movie.title)}</h1><div class="detail-meta"><span class="gold">${icon('star', 14)} ${Number(movie.rating || 0).toFixed(1)}</span><span>·</span><span>${duration(movie.durationMinutes)}</span><span>·</span><span>${esc(movie.language || 'Language TBA')}</span><span class="meta-pill">${esc(movie.contentRating || 'U/A')}</span>${movie.releaseDate ? `<span>${esc(String(movie.releaseDate).slice(0,4))}</span>` : ''}</div><p>${esc(movie.synopsis || 'A story made for the big screen. Pick a screening and make it your night.')}</p><div class="detail-genres">${(movie.genres || []).map(g => `<span>${esc(g)}</span>`).join('')}</div></div></div></section><div class="show-toolbar"><div><div class="eyebrow">PICK YOUR SHOW</div><h2>Find a time that works.</h2></div><form id="city-filter" class="city-search"><select class="control-select" name="city" aria-label="Filter showings by city"><option value="">All cities</option>${cities.map(c=>`<option value="${attr(c)}" ${city === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select><button class="button button-small" type="submit">Filter ${icon('search', 13)}</button></form></div>${showCards || `<div class="empty-state"><div class="empty-icon">${icon('calendar', 22)}</div><h3>No upcoming screenings found.</h3><p>There are no showtimes in the current catalogue for this film${city ? ` in ${esc(city)}` : ''}. Try another city or check back later.</p>${city ? `<a class="button button-ghost" href="/movies/${movie.id}">Show all cities</a>` : ''}</div>`}</div>`;
      setShell(hero, movie.title);
      document.getElementById('city-filter')?.addEventListener('submit', event => { event.preventDefault(); const value = new FormData(event.currentTarget).get('city') || ''; location.href = `/movies/${movie.id}${value ? `?city=${encodeURIComponent(value)}` : ''}`; });
      bindImageFallbacks();
    } catch (error) {
      setShell(contentWrap(errorView(error, '/movies')), 'Movie unavailable');
    }
  }

  function stopPageTimers() {
    if (seatRefreshTimer) { clearInterval(seatRefreshTimer); seatRefreshTimer = null; }
    if (checkoutTimer) { clearInterval(checkoutTimer); checkoutTimer = null; }
  }

  function seatClass(seat, selected) {
    const status = selected ? 'selected' : String(seat.status || 'AVAILABLE').toLowerCase();
    return `seat ${status} ${String(seat.type || 'STANDARD').toLowerCase()} ${seat.accessible ? 'accessible' : ''}`;
  }

  function renderSeatMap() {
    const target = document.getElementById('seat-map');
    if (!target) return;
    const rows = [...new Set(currentSeats.map(seat => seat.row))].sort((a,b) => String(a).localeCompare(String(b)));
    const maxColumns = Math.max(activeShow?.columns || 0, ...rows.map(row => currentSeats.filter(s => s.row === row).length), 0);
    target.innerHTML = `<div class="seat-col-number" aria-hidden="true">${Array.from({ length: maxColumns }, (_,i) => `<small>${i+1}</small>`).join('')}</div>${rows.map(row => {
      const rowSeats = currentSeats.filter(seat => seat.row === row).sort((a,b) => a.number - b.number);
      return `<div class="seat-row"><span class="row-label">${esc(row)}</span><div class="seat-row-grid" style="--seat-columns:${maxColumns}">${rowSeats.map(seat => {
        const chosen = selectedSeatIds.has(seat.id);
        const unavailable = seat.status !== 'AVAILABLE' && !chosen;
        const seatIcon = seat.accessible ? icon('accessibility', 11) : seat.type === 'RECLINER' ? icon('armchair', 11) : '';
        return `<button type="button" class="${seatClass(seat,chosen)}" data-seat-id="${seat.id}" title="${attr(`${seat.label} · ${money(seat.price)} · ${String(seat.status).toLowerCase()}${seat.accessible ? ' · accessible' : ''}`)}" aria-label="${attr(`${seat.label}, ${chosen ? 'selected' : String(seat.status).toLowerCase()}, ${money(seat.price)}`)}" aria-pressed="${chosen}" ${unavailable ? 'disabled' : ''}>${seatIcon}</button>`;
      }).join('')}</div><span class="row-label">${esc(row)}</span></div>`;
    }).join('')}`;
    renderSeatSummary();
  }

  function renderSeatSummary() {
    const chosen = currentSeats.filter(seat => selectedSeatIds.has(seat.id));
    const sum = chosen.reduce((total, seat) => total + Number(seat.price || 0), 0);
    const fee = Math.round(sum * 5) / 100;
    const tags = document.getElementById('selected-seat-tags');
    if (tags) tags.innerHTML = chosen.length ? chosen.map(seat => `<span>${esc(seat.label)} · ${money(seat.price)}</span>`).join('') : `<div class="selected-empty">No seats selected yet. Tap available seats on the map, or ask CineBook AI for a recommendation.</div>`;
    const subtotal = document.getElementById('seat-subtotal'); if (subtotal) subtotal.textContent = money(sum);
    const feeNode = document.getElementById('seat-fee'); if (feeNode) feeNode.textContent = money(fee);
    const total = document.getElementById('seat-total'); if (total) total.textContent = money(sum + fee);
    const count = document.getElementById('seat-count-selected'); if (count) count.textContent = `${chosen.length} selected`;
    const proceed = document.getElementById('create-hold'); if (proceed) proceed.disabled = chosen.length === 0;
  }

  async function fetchSeats(showId, quiet = false) {
    try {
      currentSeats = await api(`/shows/${showId}/seats`);
      renderSeatMap();
      const availability = document.getElementById('seat-availability-label');
      if (availability) availability.textContent = `Live inventory · updated ${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`;
    } catch (error) {
      if (!quiet) showToast(error.message, 'error', 'Seat map unavailable');
    }
  }

  async function renderShow(showId) {
    stopPageTimers();
    selectedSeatIds = new Set(); currentSeats = []; activeShow = null;
    let show;
    try {
      show = await api(`/shows/${showId}`);
      currentSeats = await api(`/shows/${showId}/seats`);
      activeShow = show;
    } catch (error) {
      setShell(contentWrap(errorView(error, '/movies')), 'Seat selection'); return;
    }
    const html = contentWrap(`<a href="/movies/${show.movieId}" class="back-link">${icon('back', 14)} Back to ${esc(show.movieTitle)}</a>
      <div class="booking-stepper"><div class="step completed"><span>1</span><label>Film &amp; time</label></div><i></i><div class="step active"><span>2</span><label>Choose seats</label></div><i></i><div class="step"><span>3</span><label>Checkout</label></div><i></i><div class="step"><span>4</span><label>Your ticket</label></div></div>
      <div class="seat-layout"><section class="seat-main"><div class="screen-summary"><div class="eyebrow">YOUR VIEW, YOUR WAY</div><h1>Find your <em>sweet spot.</em></h1><p>${esc(show.movieTitle)} <span>·</span> ${esc(show.theatreName)}, ${esc(show.city)}</p><div class="screen-meta"><span>${icon('calendar', 12)} ${esc(dateTime(show.startsAt))}</span><span>${icon('monitor', 12)} ${esc(show.screenName || 'Main screen')}</span><span>${icon('users', 12)} Up to 8 seats</span></div></div><div class="screen-visual"><div class="screen-glow"></div><div class="screen-curve"></div><span>SCREEN THIS WAY</span></div><div id="seat-map" class="seat-map" aria-label="Choose your seats"></div><div class="seat-legend"><span><i class="legend-seat"></i> Available</span><span><i class="legend-seat selected"></i> Selected</span><span><i class="legend-seat premium"></i> Premium</span><span><i class="legend-seat held"></i> Held / booked</span><span>${icon('accessibility', 12)} Accessible</span></div><div class="seat-map-note">${icon('refresh', 14)} <span><b id="seat-availability-label">Live inventory</b> · Seats refresh automatically. Your seats are secured only after creating a hold.</span></div></section>
      <aside class="seat-sidebar"><section class="recommend-card"><div class="recommend-header"><div class="recommend-icon">${icon('spark', 19)}</div><div><div class="eyebrow">CINEBOOK AI</div><h3>Find your sweet spot</h3></div><span class="ai-tag">SMART PICK</span></div><p class="recommend-intro">Tell us who’s coming and what feels right. Recommendations come from this show’s live seat inventory.</p><form class="recommend-form" id="recommend-form"><label class="form-field">Number of seats<select name="seatCount">${[1,2,3,4,5,6,7,8].map(n=>`<option value="${n}" ${n===2?'selected':''}>${n} ${n===1?'seat':'seats'}</option>`).join('')}</select></label><div class="form-row"><label class="form-field">Viewing preference<select name="rowPreference"><option value="FRONT">Front rows</option><option value="MIDDLE" selected>Middle sweet spot</option><option value="REAR">Back rows</option></select></label><label class="form-field">Max budget (₹)<input name="maxBudget" type="number" min="0" step="50" placeholder="No limit"></label></div><div class="form-row"><label class="inline-check"><input type="checkbox" name="adjacent" checked> Keep seats together</label><label class="inline-check"><input type="checkbox" name="aisle"> Near the aisle</label></div><label class="inline-check"><input type="checkbox" name="accessibleOnly"> Accessible seats only</label><label class="form-field">Tell us your vibe (optional)<textarea name="naturalLanguage" placeholder="e.g. Two seats in the middle, away from the aisle…"></textarea></label><button class="button button-ai button-full" type="submit">${icon('spark', 15)} Find my seats</button></form><div id="recommend-results" class="recommend-results"></div></section><section class="booking-summary-card"><h3>Your selection <span id="seat-count-selected" class="muted-small">0 selected</span></h3><div id="selected-seat-tags"></div><div class="summary-lines"><div class="summary-line"><span>Tickets</span><strong id="seat-subtotal">₹0.00</strong></div><div class="summary-line"><span>Estimated convenience fee</span><strong id="seat-fee">₹0.00</strong></div></div><div class="summary-total"><span>Estimated total</span><strong id="seat-total">₹0.00</strong></div><button class="button button-full" id="create-hold" disabled>Secure these seats ${icon('arrow', 15)}</button><p class="sidebar-note">The backend confirms live price and availability when you secure a hold. Holds have a short expiry window.</p></section></aside></div>`, 'seat-page');
    setShell(html, `Seats — ${show.movieTitle}`);
    renderSeatMap();
    document.getElementById('seat-map')?.addEventListener('click', event => {
      const button = event.target.closest('[data-seat-id]'); if (!button) return;
      const id = Number(button.dataset.seatId); const seat = currentSeats.find(s => Number(s.id) === id); if (!seat) return;
      if (selectedSeatIds.has(id)) selectedSeatIds.delete(id);
      else {
        if (seat.status !== 'AVAILABLE') return;
        if (selectedSeatIds.size >= 8) { showToast('Choose up to 8 seats per booking.', 'error'); return; }
        selectedSeatIds.add(id);
      }
      renderSeatMap();
    });
    document.getElementById('recommend-form')?.addEventListener('submit', async event => {
      event.preventDefault(); const button = event.currentTarget.querySelector('button[type="submit"]');
      const form = new FormData(event.currentTarget); const results = document.getElementById('recommend-results');
      button.disabled = true; button.innerHTML = `${icon('refresh', 14)} Finding good seats…`;
      results.innerHTML = '';
      try {
        const response = await api(`/shows/${showId}/recommendations`, { method: 'POST', body: JSON.stringify({ seatCount: Number(form.get('seatCount')), maxBudget: form.get('maxBudget') ? Number(form.get('maxBudget')) : null, rowPreference: form.get('rowPreference'), adjacent: form.has('adjacent'), aisle: form.has('aisle'), accessibleOnly: form.has('accessibleOnly'), naturalLanguage: String(form.get('naturalLanguage') || '').trim() }) });
        const recommendations = response.recommendations || [];
        if (!recommendations.length) results.innerHTML = `<div class="empty-state" style="padding:18px 10px"><h3>No seat combo found</h3><p>${esc(response.message || 'Try changing the budget or seat preferences.')}</p></div>`;
        else results.innerHTML = `<p class="muted-small">${esc(response.interpretation || response.message || 'Here are a few combinations based on your preferences.')}</p>${recommendations.slice(0,3).map((rec,i) => `<article class="recommendation-item"><div class="recommendation-item-head"><div><h4>${i===0?'Best match':i===1?'Another good option':'Worth a look'}</h4><p>${(rec.seats || []).map(esc).join(' · ')}${rec.reasons?.length ? `<br>${rec.reasons.map(esc).join(' · ')}` : ''}</p></div><strong>${money(rec.total)}</strong></div><button class="button button-ghost" type="button" data-recommendation="${i}">Use these seats ${icon('arrow', 13)}</button></article>`).join('')}`;
        results.querySelectorAll('[data-recommendation]').forEach(button => button.addEventListener('click', () => {
          const rec = recommendations[Number(button.dataset.recommendation)]; const ids = (rec.seats || []).map(label => currentSeats.find(s => s.label === label && s.status === 'AVAILABLE')?.id).filter(Boolean);
          selectedSeatIds = new Set(ids); renderSeatMap(); showToast(`${ids.length} recommended seat${ids.length===1?'':'s'} selected.`, 'success');
        }));
      } catch (error) { results.innerHTML = `<div class="form-error">${esc(error.message)}</div>`; }
      finally { button.disabled = false; button.innerHTML = `${icon('spark', 15)} Find my seats`; }
    });
    document.getElementById('create-hold')?.addEventListener('click', async () => {
      if (!selectedSeatIds.size) return;
      if (!currentUser) { sessionStorage.setItem('cinebook.returnTo', location.pathname); location.href = '/login'; return; }
      const button = document.getElementById('create-hold'); button.disabled = true; button.innerHTML = `${icon('refresh', 15)} Securing seats…`;
      try {
        const hold = await api(`/shows/${showId}/holds`, { method: 'POST', headers: { 'Idempotency-Key': randomId() }, body: JSON.stringify({ seatIds: [...selectedSeatIds] }) });
        location.href = `/checkout/${encodeURIComponent(hold.token)}`;
      } catch (error) {
        showToast(error.message, 'error', 'Could not secure seats'); button.disabled = false; button.innerHTML = `Secure these seats ${icon('arrow', 15)}`; await fetchSeats(showId, true);
      }
    });
    seatRefreshTimer = setInterval(() => fetchSeats(showId, true), 7000);
  }

  function authArt() {
    return `<aside class="auth-art"><img src="https://images.unsplash.com/photo-1489599849927-2ee91cda7f0?auto=format&fit=crop&w=1100&q=85" alt="Cinema seats"><div class="auth-art-glow"></div><div class="auth-art-overlay"><span class="brand-icon">${icon('film', 20)}</span><div class="eyebrow">CINEMA, REIMAGINED</div><h2>Every seat tells<br>a <em>different story.</em></h2><p>Find your people. Find your film. Make a night of it. The little details are what make it memorable.</p><div class="auth-art-stats"><span>${icon('spark', 13)} Smart seat picks</span><span>${icon('lock', 13)} Secure checkout</span></div></div></aside>`;
  }

  function renderAuth(mode) {
    const registering = mode === 'register';
    const title = registering ? 'Make room for magic.' : 'Good to see you.';
    const formFields = registering ? `
      <label>Your name<div class="field-with-icon">${icon('user', 15)}<input name="displayName" autocomplete="name" placeholder="How should we call you?" maxlength="100" required></div></label>
      <label>Email address<div class="field-with-icon">${icon('mail', 15)}<input name="email" type="email" autocomplete="email" placeholder="you@example.com" maxlength="190" required></div></label>
      <label>Password<div class="field-with-icon">${icon('lock', 15)}<input id="signup-password" name="password" type="password" autocomplete="new-password" placeholder="At least 12 characters" minlength="12" maxlength="72" required><button type="button" class="field-icon-button" id="toggle-password" aria-label="Show password">${icon('eye', 16)}</button></div><div class="password-strength" aria-live="polite"><div class="password-strength-track"><span id="password-strength-bar" data-level="0"></span></div><small id="password-strength-label">Use 12+ characters. Longer passphrases are stronger.</small></div><small class="field-error" data-error="password"></small></label>
      <label>Confirm password<div class="field-with-icon">${icon('lock', 15)}<input id="confirm-password" name="confirm" type="password" autocomplete="new-password" placeholder="Type it one more time" minlength="12" maxlength="72" required><button type="button" class="field-icon-button" id="toggle-confirm" aria-label="Show confirmation password">${icon('eye', 16)}</button></div><small class="field-error" data-error="confirm"></small></label>` : `
      <label>Email address<div class="field-with-icon">${icon('mail', 15)}<input name="email" type="email" autocomplete="email" placeholder="you@example.com" maxlength="190" required></div></label>
      <label>Password<div class="field-with-icon">${icon('lock', 15)}<input id="signup-password" name="password" type="password" autocomplete="current-password" placeholder="Your password" required><button type="button" class="field-icon-button" id="toggle-password" aria-label="Show password">${icon('eye', 16)}</button></div></label>`;
    const html = `<div class="auth-layout">${authArt()}<section class="auth-form-panel"><div class="auth-form-head"><div class="eyebrow">${registering ? 'YOUR NEXT CHAPTER' : 'WELCOME BACK'}</div><h1>${registering ? 'Make room for' : 'Good to see'} <em>${registering ? 'magic.' : 'you.'}</em></h1><p>${registering ? 'Create an account and let’s plan a better movie night.' : 'Sign in to pick up where your next movie night begins.'}</p></div><form class="auth-form" id="auth-form" novalidate>${formFields}<div class="form-error" id="auth-error" role="alert" hidden></div><button class="button button-full auth-submit" id="auth-submit" type="submit">${registering ? 'Create my account' : 'Sign in'} ${icon('spark', 15)}</button><p class="auth-legal">${registering ? 'Passwords are hashed by the backend. New registrations receive the CUSTOMER role only. Account emails are sent when SMTP is configured.' : 'Protected by role-based API authorization and short-lived access tokens. Simulator payments do not move real money.'}</p></form><div class="auth-switch">${registering ? 'Already have an account?' : 'New to CineBook AI?'} <a href="${registering ? '/login' : '/register'}">${registering ? 'Sign in' : 'Create an account'} →</a></div><div class="login-security-note"><span>${icon('shield', 16)}</span><div><strong>${registering ? 'Your account, your experience' : 'A safer way to sign in'}</strong><small>${registering ? 'Unique passwords and a private inbox help protect your account.' : 'Use a unique password and never share your one-time sign-in details.'}</small></div></div></section></div>`;
    setShell(html, registering ? 'Create your account' : 'Sign in');
    const form = document.getElementById('auth-form');
    const bindPasswordToggle = (buttonId, fieldName, visibleLabel) => {
      const button = document.getElementById(buttonId);
      const field = form.elements[fieldName];
      button?.addEventListener('click', () => {
        field.type = field.type === 'password' ? 'text' : 'password';
        button.innerHTML = icon(field.type === 'password' ? 'eye' : 'close', 16);
        button.setAttribute('aria-label', field.type === 'password' ? `Show ${visibleLabel}` : `Hide ${visibleLabel}`);
      });
    };
    bindPasswordToggle('toggle-password', 'password', 'password');
    bindPasswordToggle('toggle-confirm', 'confirm', 'confirmation password');

    const passwordInput = form.elements.password;
    const confirmationInput = form.elements.confirm;
    const strengthBar = document.getElementById('password-strength-bar');
    const strengthLabel = document.getElementById('password-strength-label');
    const confirmError = form.querySelector('[data-error="confirm"]');
    const updateStrength = () => {
      if (!registering || !strengthBar || !strengthLabel) return;
      const value = passwordInput.value;
      const score = [value.length >= 12, value.length >= 16, /[a-z]/.test(value) && /[A-Z]/.test(value), /\d/.test(value), /[^A-Za-z0-9\s]/.test(value), new Set(value).size >= 8].filter(Boolean).length;
      const level = value.length ? Math.max(1, score) : 0;
      const labels = ['Use 12+ characters. Longer passphrases are stronger.', 'Needs more length or variety', 'Getting stronger — add a little more length', 'Good start — a longer passphrase is better', 'Strong password', 'Very strong password', 'Excellent passphrase'];
      strengthBar.style.width = `${Math.round(level / 6 * 100)}%`;
      strengthBar.dataset.level = String(level);
      strengthLabel.textContent = value.length && value.length < 12 ? 'Use at least 12 characters to continue.' : labels[level];
      const passwordError = form.querySelector('[data-error="password"]');
      if (passwordError && value.length >= 12) passwordError.textContent = '';
    };
    const updateConfirmation = () => {
      if (!registering || !confirmationInput || !confirmError) return;
      confirmError.textContent = confirmationInput.value && confirmationInput.value !== passwordInput.value ? 'Passwords do not match yet.' : '';
    };
    passwordInput?.addEventListener('input', () => { updateStrength(); updateConfirmation(); });
    confirmationInput?.addEventListener('input', updateConfirmation);
    updateStrength();
    form?.addEventListener('submit', async event => {
      event.preventDefault();
      const formData = new FormData(form); const errorBox = document.getElementById('auth-error'); const submit = document.getElementById('auth-submit');
      errorBox.hidden = true; errorBox.textContent = '';
      const email = String(formData.get('email') || '').trim(); const password = String(formData.get('password') || '');
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errorBox.textContent = 'Enter a valid email address.'; errorBox.hidden = false; return; }
      if (!password) { errorBox.textContent = 'Enter your password.'; errorBox.hidden = false; return; }
      if (registering) {
        const name = String(formData.get('displayName') || '').trim(); const confirm = String(formData.get('confirm') || '');
        if (!name || name.length > 100) { errorBox.textContent = 'Enter your name (up to 100 characters).'; errorBox.hidden = false; return; }
        if (password.length < 12 || password.length > 72) { errorBox.textContent = 'Use a password between 12 and 72 characters.'; errorBox.hidden = false; return; }
        if (password !== confirm) { errorBox.textContent = 'Your passwords do not match.'; errorBox.hidden = false; return; }
      }
      submit.disabled = true; submit.innerHTML = `${icon('refresh', 15)} ${registering ? 'Creating account…' : 'Signing you in…'}`;
      try {
        let tokens;
        if (registering) {
          const registration = await authApi.register(String(formData.get('displayName')).trim(), email, password);
          if (registration.verificationRequired) {
            saveTokens(null);
            renderVerificationStatus('Check your inbox', registration.message || `We sent a verification link to ${email}.`, false, email);
            return;
          }
          tokens = registration.tokens;
          if (!tokens?.accessToken) throw new Error('The account was created, but sign-in could not be completed. Please sign in manually.');
          sessionStorage.setItem('cinebook.flash', JSON.stringify({
            type: 'success',
            title: registration.emailSent ? 'Welcome to CineBook AI' : 'Your account is ready',
            message: registration.emailSent ? 'Check your inbox for your welcome email. Sign-in alerts are sent when email notifications are enabled.' : 'Email delivery is not configured yet. Follow the SMTP setup in README.md to enable welcome and sign-in emails.'
          }));
        } else {
          tokens = await authApi.login(email, password);
        }
        saveTokens(tokens); currentUser = tokens.user;
        const destination = sessionStorage.getItem('cinebook.returnTo') || '/dashboard';
        sessionStorage.removeItem('cinebook.returnTo'); location.href = destination.startsWith('/') ? destination : '/dashboard';
      } catch (error) {
        errorBox.textContent = error.message || 'Authentication failed. Check your details and try again.'; errorBox.hidden = false;
        submit.disabled = false; submit.innerHTML = `${registering ? 'Create my account' : 'Sign in'} ${icon('spark', 15)}`;
      }
    });
  }

  function renderVerificationStatus(title, message, success, email = '') {
    const support = email ? `<p class="verification-address">A verification link was requested for <strong>${esc(email)}</strong>.</p>` : '';
    const html = `<section class="verification-page"><div class="verification-orbit">${icon(success ? 'check' : 'mail', 28)}</div><div class="eyebrow">ACCOUNT SECURITY</div><h1>${esc(title)}</h1><p>${esc(message)}</p>${support}<div class="verification-actions"><a href="/login" class="button">Continue to sign in ${icon('arrow', 15)}</a><a href="/" class="button button-quiet">Back to movies</a></div><small>For your protection, verification links can be used once and expire after 30 minutes.</small></section>`;
    setShell(contentWrap(html, 'verification-page-wrap'), title);
  }

  async function renderEmailVerification() {
    const url = new URL(window.location.href);
    const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
    const token = fragment.get('token') || '';
    // Fragments are not sent to the web server. Remove the one-time token from history before any network work.
    if (url.hash) history.replaceState(null, '', url.pathname + (url.search ? url.search : ''));
    if (!token) {
      renderVerificationStatus('Verification link missing', 'This link does not contain a verification token. Open the latest verification email and use its button.', false);
      return;
    }
    renderVerificationStatus('Verifying your email…', 'We are checking that this single-use link is valid.', false);
    try {
      const result = await authApi.verifyEmail(token);
      renderVerificationStatus('You’re all set', result.message || 'Your email address is verified. You can now sign in.', true);
    } catch (error) {
      renderVerificationStatus('This link needs a fresh start', error.message || 'The verification link is invalid, expired, or already used.', false);
    }
  }

  async function loadNotifications() {
    const list = document.getElementById('notification-list'); if (!list) return;
    list.innerHTML = '<p class="notification-empty">Loading notifications…</p>';
    try {
      const [items, unread] = await Promise.all([api('/notifications'), api('/notifications/unread-count')]);
      notificationItems = Array.isArray(items) ? items : [];
      document.getElementById('notification-unread').textContent = `${unread.count || 0} unread`;
      const count = document.getElementById('notification-count'); count.textContent = Number(unread.count) > 9 ? '9+' : String(unread.count || 0); count.hidden = !Number(unread.count);
      list.innerHTML = notificationItems.length ? notificationItems.slice(0, 6).map(item => `<article class="notification-item ${item.status === 'PENDING' ? 'unread' : ''}"><div><strong>${esc(item.title)}</strong><p>${esc(item.message)}</p><small>${esc(dateTime(item.createdAt, { weekday: undefined, year: undefined }))}</small></div>${item.status === 'PENDING' ? `<button type="button" data-read-notification="${item.id}" aria-label="Mark as read">${icon('check', 13)}</button>` : ''}</article>`).join('') : '<p class="notification-empty">You’re all caught up. Booking updates will appear here.</p>';
      list.querySelectorAll('[data-read-notification]').forEach(button => button.addEventListener('click', async () => {
        button.disabled = true;
        try { await api(`/notifications/${button.dataset.readNotification}/read`, { method: 'POST' }); await loadNotifications(); }
        catch (error) { showToast(error.message, 'error'); button.disabled = false; }
      }));
    } catch (error) { list.innerHTML = `<p class="notification-empty">${esc(error.message)}</p>`; }
  }

  async function updateUnreadCount() {
    if (!currentUser) return;
    try {
      const unread = await api('/notifications/unread-count'); const count = document.getElementById('notification-count');
      if (count) { count.textContent = Number(unread.count) > 9 ? '9+' : String(unread.count || 0); count.hidden = !Number(unread.count); }
    } catch { /* Keep the catalogue available when notifications are offline. */ }
  }

  function checkoutSummaryMarkup(hold, quote) {
    const subtotal = quote?.subtotal ?? hold.subtotal; const fee = quote?.convenienceFee ?? hold.convenienceFee; const discount = quote?.discount || 0; const total = quote?.total ?? hold.total;
    return `<div class="price-items"><div><span>Tickets (${hold.seats.length})</span><strong>${money(subtotal)}</strong></div><div><span>Convenience fee</span><strong>${money(fee)}</strong></div>${discount ? `<div class="discount-line"><span>Coupon · ${esc(quote.couponCode || appliedCoupon)}</span><strong>−${money(discount)}</strong></div>` : ''}</div><div class="price-total"><span>Total payable</span><strong>${money(total)}</strong></div>`;
  }

  async function renderCheckout(token) {
    stopPageTimers(); activeHold = null; quoteState = null; appliedCoupon = '';
    if (!currentUser) { sessionStorage.setItem('cinebook.returnTo', location.pathname); location.href = '/login'; return; }
    let hold, gatewayOptions, show;
    try {
      [hold, gatewayOptions] = await Promise.all([api(`/holds/${encodeURIComponent(token)}`), api('/payments/options').catch(() => ({ mode: 'UNAVAILABLE', simulatorEnabled: false, razorpayEnabled: false }))]);
      activeHold = hold;
      show = await api(`/shows/${hold.showtimeId}`).catch(() => null);
      if (hold.status === 'ACTIVE' && new Date(hold.expiresAt).getTime() > Date.now()) quoteState = await api(`/holds/${encodeURIComponent(token)}/quote`).catch(() => null);
    } catch (error) {
      setShell(contentWrap(errorView(error, '/bookings')), 'Checkout'); return;
    }
    const paymentMode = gatewayOptions?.mode || 'SIMULATOR';
    const gatewayEnabled = Boolean(gatewayOptions?.razorpayEnabled);
    const simulatorEnabled = gatewayOptions?.simulatorEnabled === true;
    const paymentUnavailable = !gatewayEnabled && !simulatorEnabled;
    const html = contentWrap(`<div class="checkout-heading"><div><a href="/shows/${hold.showtimeId}" class="back-link">${icon('back', 14)} Change seats</a><div class="eyebrow">ALMOST MOVIE TIME</div><h1>One last <em>thing.</em></h1><p>Check your seats, add a coupon if you have one, and you’re all set.</p></div><div class="hold-countdown">${icon('clock', 20)}<div><small>Seats held for</small><strong id="hold-countdown">--:--</strong></div></div></div>
      <div class="checkout-layout"><section class="checkout-main"><article class="checkout-card"><div class="checkout-card-title"><span>01</span><h3>Your movie night</h3></div><div class="checkout-film-card" style="display:flex;gap:15px;align-items:center;padding:15px;border:1px solid var(--line);border-radius:13px;background:#fff03"><div style="height:82px;width:60px;flex-shrink:0;overflow:hidden;border-radius:8px">${posterMarkup(show?.moviePoster || show?.posterUrl, hold.movieTitle, '', 'checkout-film-poster')}</div><div><strong style="font:800 16px Manrope,sans-serif">${esc(hold.movieTitle)}</strong><p class="muted-small" style="margin:7px 0">${esc(show?.theatreName || hold.theatreName)}${show?.city ? ` · ${esc(show.city)}` : ''}</p><div class="detail-meta" style="margin:0;font-size:9px">${icon('calendar', 12)} ${esc(show ? dateTime(show.startsAt) : 'Show time confirmed in ticket')}${show?.screenName ? ` · ${esc(show.screenName)}` : ''}</div></div></div></article>
      <article class="checkout-card"><div class="checkout-card-title"><span>02</span><h3>Your seats</h3></div><div class="checkout-seats">${(hold.seats || []).map(seat => `<div class="checkout-seat-chip">${icon('ticket', 13)}<strong>${esc(seat.label)}</strong><span>${money(seat.price)}</span></div>`).join('')}</div><div class="coupon-block"><div><strong>Have a little something?</strong><small>Enter a development coupon code to update the total.</small></div><form id="coupon-form" class="coupon-form"><input id="coupon-code" aria-label="Coupon code" placeholder="COUPON CODE" value="" maxlength="60" ${hold.status !== 'ACTIVE' ? 'disabled' : ''}><button type="submit" class="button button-outline" id="coupon-apply" ${hold.status !== 'ACTIVE' ? 'disabled' : ''}>Apply</button></form><p class="coupon-message" id="coupon-message" aria-live="polite"></p><button class="text-button" type="button" id="remove-coupon" hidden>Remove coupon</button></div></article>
      <article class="checkout-card"><div class="checkout-card-title"><span>03</span><h3>Payment method</h3></div>${gatewayEnabled ? `<div class="payment-method-selected gateway-choice"><span class="payment-method-icon">${icon('shield', 20)}</span><div><strong>Razorpay checkout</strong><small>${paymentMode === 'RAZORPAY' ? 'Payment order and signature are verified by the CineBook server.' : 'Gateway checkout is enabled.'}</small></div><button class="button button-small" id="razorpay-pay">Pay with Razorpay</button></div>` : simulatorEnabled ? `<div class="payment-method-selected"><span class="payment-method-icon">${icon('wallet', 20)}</span><div><strong>Development payment simulator</strong><small>No real money is charged. This option is intended for local testing only.</small></div><span class="payment-selected-check">${icon('check', 18)}</span></div>` : `<div class="payment-method-selected payment-unavailable"><span class="payment-method-icon">${icon('info', 20)}</span><div><strong>Payment is unavailable</strong><small>No payment gateway is configured for this environment. Your booking cannot be confirmed yet.</small></div></div>`}${paymentUnavailable ? `<div class="dev-payment-notice" role="status"><p><strong>Action required</strong> — ask the administrator to configure the payment gateway. No simulator payment is available here.</p></div>` : `<div class="dev-payment-notice">${icon('shield', 17)}<p><strong>${simulatorEnabled ? 'Development mode' : 'Secure checkout'}</strong> — ${simulatorEnabled ? 'Simulator payments are not real bank transactions.' : 'The backend validates payment state before confirming the booking.'}</p></div>`}<div class="payment-feedback" id="payment-error" role="alert" hidden></div></article></section>
      <aside class="checkout-sidebar"><div class="price-summary"><div class="eyebrow">ORDER SUMMARY</div><h3>The good stuff.</h3><div id="checkout-summary-lines">${checkoutSummaryMarkup(hold, quoteState)}</div><div class="price-currency">All amounts in INR · Includes listed convenience fees</div><div id="expired-alert" class="expired-alert" hidden>Your seat hold has expired. Select seats again to continue. <a href="/shows/${hold.showtimeId}">Choose again</a></div>${simulatorEnabled ? `<button class="button button-full button-pay" id="simulator-pay" ${hold.status !== 'ACTIVE' ? 'disabled' : ''}>Simulate successful payment ${icon('arrow', 15)}</button><button class="button button-full button-decline" id="simulator-decline" ${hold.status !== 'ACTIVE' ? 'disabled' : ''}>Simulate payment decline</button>` : ''}<p class="micro-copy">${icon('lock', 12)} Booking is created only after the backend confirms payment.</p></div><div class="help-note"><strong>Need a different seat?</strong><p>Once a hold is created, it can’t be edited. Let it expire and start a new selection.</p></div></aside></div>`, 'checkout-page');
    setShell(html, 'Checkout'); bindImageFallbacks();
    let quoteError = false;
    const expiresAtMs = new Date(hold.expiresAt).getTime();
    const renderTimer = () => {
      const seconds = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
      const timer = document.getElementById('hold-countdown'); if (timer) timer.textContent = `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
      const active = hold.status === 'ACTIVE' && seconds > 0;
      const expired = document.getElementById('expired-alert'); if (expired) expired.hidden = active;
      ['simulator-pay','simulator-decline','razorpay-pay','coupon-apply'].forEach(id => { const button = document.getElementById(id); if (button && !button.dataset.busy) button.disabled = !active || (id.startsWith('simulator') && !simulatorEnabled) || (id === 'razorpay-pay' && !gatewayEnabled) || (id === 'coupon-apply' && quoteError); });
      const input = document.getElementById('coupon-code'); if (input) input.disabled = !active;
    };
    renderTimer(); checkoutTimer = setInterval(() => { checkoutClock = Date.now(); renderTimer(); }, 1000);
    document.getElementById('coupon-form')?.addEventListener('submit', async event => {
      event.preventDefault(); const input = document.getElementById('coupon-code'); const button = document.getElementById('coupon-apply'); const message = document.getElementById('coupon-message');
      const code = String(input.value || '').trim().toUpperCase(); if (!code) { message.textContent = 'Enter a coupon code first.'; message.className = 'coupon-message is-error'; return; }
      button.disabled = true; button.dataset.busy = 'true'; button.textContent = 'Checking…'; message.className = 'coupon-message'; message.textContent = 'Checking your code…';
      try {
        const quote = await api(`/holds/${encodeURIComponent(token)}/quote?couponCode=${encodeURIComponent(code)}`);
        appliedCoupon = code; quoteState = quote; quoteError = false;
        document.getElementById('checkout-summary-lines').innerHTML = checkoutSummaryMarkup(hold, quoteState);
        message.className = 'coupon-message'; message.textContent = quote.discount > 0 ? `Applied ${quote.couponCode || code} — you save ${money(quote.discount)}.` : (quote.message || 'Coupon checked.');
        document.getElementById('remove-coupon').hidden = false;
      } catch (error) {
        quoteError = true; message.className = 'coupon-message is-error'; message.textContent = error.message;
        document.getElementById('remove-coupon').hidden = !appliedCoupon;
      } finally {
        button.dataset.busy = ''; button.textContent = 'Apply'; button.disabled = false; renderTimer();
      }
    });
    document.getElementById('remove-coupon')?.addEventListener('click', async () => {
      appliedCoupon = ''; quoteError = false; document.getElementById('coupon-code').value = ''; document.getElementById('coupon-message').textContent = ''; document.getElementById('remove-coupon').hidden = true;
      try { quoteState = await api(`/holds/${encodeURIComponent(token)}/quote`); document.getElementById('checkout-summary-lines').innerHTML = checkoutSummaryMarkup(hold, quoteState); }
      catch (error) { quoteError = true; showPaymentError(error.message); }
      renderTimer();
    });
    document.getElementById('simulator-pay')?.addEventListener('click', () => simulatePayment('APPROVE'));
    document.getElementById('simulator-decline')?.addEventListener('click', () => simulatePayment('DECLINE'));
    document.getElementById('razorpay-pay')?.addEventListener('click', openRazorpay);

    async function simulatePayment(decision) {
      if (!simulatorEnabled) return;
      const button = document.getElementById(decision === 'APPROVE' ? 'simulator-pay' : 'simulator-decline');
      if (!button) return; button.disabled = true; button.dataset.busy = 'true'; button.textContent = decision === 'APPROVE' ? 'Verifying payment…' : 'Processing test decline…';
      hidePaymentError();
      try {
        const result = await api('/payments/simulator', { method: 'POST', headers: { 'Idempotency-Key': randomId() }, body: JSON.stringify({ holdToken: token, decision, couponCode: appliedCoupon || undefined }) });
        if (result.status === 'SUCCEEDED' && result.booking) location.href = `/ticket/${result.booking.id}`;
        else if (result.status === 'FAILED') showPaymentError(result.message || 'The simulator declined this payment.');
        else showPaymentError(result.message || `Payment status: ${result.status}`);
      } catch (error) { showPaymentError(error.message || 'Payment could not be confirmed. Check your bookings before retrying.'); }
      finally { button.dataset.busy = ''; button.textContent = decision === 'APPROVE' ? `Simulate successful payment ${String.fromCharCode(8594)}` : 'Simulate payment decline'; renderTimer(); }
    }

    async function openRazorpay() {
      const button = document.getElementById('razorpay-pay'); if (!gatewayEnabled || !button) return;
      button.disabled = true; button.dataset.busy = 'true'; button.textContent = 'Creating order…'; hidePaymentError();
      try {
        const order = await api('/payments/razorpay/orders', { method: 'POST', headers: { 'Idempotency-Key': randomId() }, body: JSON.stringify({ holdToken: token, couponCode: appliedCoupon || undefined }) });
        if (!['CREATED','REUSED'].includes(order.status) || !order.orderId || !order.keyId) throw new Error(order.message || 'Gateway order could not be opened.');
        const launch = () => {
          if (!window.Razorpay) { showPaymentError('Razorpay Checkout.js did not load. Reload the page and retry.'); return; }
          const checkout = new window.Razorpay({ key: order.keyId, amount: order.amountPaise, currency: order.currency, name: 'CineBook AI', description: 'Movie ticket booking', order_id: order.orderId, theme: { color: '#d9a45b' }, modal: { ondismiss: () => showPaymentError('Checkout was closed. The payment has not been confirmed by CineBook yet.') }, handler: async response => {
            try { const result = await api('/payments/razorpay/verify', { method: 'POST', body: JSON.stringify({ orderId: response.razorpay_order_id, paymentId: response.razorpay_payment_id, signature: response.razorpay_signature }) }); if (result.booking && result.status === 'SUCCEEDED') location.href = `/ticket/${result.booking.id}`; else showPaymentError(result.message || `Gateway status: ${result.status}`); }
            catch (error) { showPaymentError(error.message || 'Payment verification failed. Check booking history before retrying.'); }
          } });
          checkout.on('payment.failed', response => showPaymentError(response.error?.description || 'Razorpay reported a failed payment.'));
          checkout.open();
        };
        if (window.Razorpay) launch();
        else {
          let script = document.querySelector('script[data-razorpay-checkout]');
          if (!script) { script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.async = true; script.dataset.razorpayCheckout = 'true'; document.body.appendChild(script); }
          script.addEventListener('load', launch, { once: true }); script.addEventListener('error', () => showPaymentError('Razorpay Checkout.js could not load. Retry or contact the administrator.'), { once: true });
        }
      } catch (error) { showPaymentError(error.message); }
      finally { button.dataset.busy = ''; button.textContent = 'Pay with Razorpay'; renderTimer(); }
    }

    function showPaymentError(message) { const box = document.getElementById('payment-error'); if (!box) return; box.hidden = false; box.innerHTML = `${icon('info', 16)}<span>${esc(message)}</span>`; }
    function hidePaymentError() { const box = document.getElementById('payment-error'); if (box) { box.hidden = true; box.textContent = ''; } }
  }

  function statusChip(status) {
    const value = String(status || 'PENDING').toUpperCase();
    const cls = value.includes('CONFIRM') || value === 'SUCCEEDED' ? 'status-confirmed' : value.includes('CANCEL') || value === 'FAILED' ? 'status-cancelled' : 'status-pending';
    return `<span class="status-chip ${cls}">${esc(value.replaceAll('_',' '))}</span>`;
  }

  function bookingCard(booking, options = {}) {
    const upcoming = booking.status === 'CONFIRMED' && new Date(booking.startsAt).getTime() > Date.now();
    const seatSummary = (booking.seats || []).join(', ') || 'Seats in ticket';
    return `<article class="booking-history-card">${posterMarkup(booking.posterUrl, booking.movieTitle, '', 'history-poster')}<div class="history-main"><div class="history-status-row">${statusChip(booking.status)}<span class="history-code">${esc(booking.bookingCode || `CB-${booking.id}`)}</span></div><h3>${esc(booking.movieTitle)}</h3><div class="history-detail"><span>${icon('calendar', 12)} ${esc(dateTime(booking.startsAt))}</span><span>${icon('pin', 12)} ${esc(booking.theatreName)}${booking.city ? `, ${esc(booking.city)}` : ''}</span><span>${icon('ticket', 12)} ${esc(seatSummary)}</span></div></div><div class="history-side"><strong>${money(booking.totalAmount)}</strong><a class="button button-ghost" href="/ticket/${booking.id}">View ticket ${icon('arrowUp', 12)}</a>${options.cancellable && upcoming ? `<button class="cancel-link" type="button" data-cancel-booking="${booking.id}">Cancel booking</button>` : ''}</div></article>`;
  }

  async function renderBookings() {
    let bookings;
    try { bookings = await api('/bookings'); }
    catch (error) { setShell(contentWrap(errorView(error, '/dashboard')), 'My tickets'); return; }
    bookings = Array.isArray(bookings) ? bookings : [];
    const upcoming = bookings.filter(b => b.status === 'CONFIRMED' && new Date(b.startsAt).getTime() > Date.now());
    const past = bookings.filter(b => !upcoming.includes(b));
    const html = contentWrap(`<section class="page-hero compact"><div><div class="eyebrow">YOUR MOVIE HISTORY</div><h1>Tickets &amp; <em>memories.</em></h1><p>Everything you’ve booked, in one place. Open a digital ticket for the details or print it before you head out.</p></div><div class="page-hero-side"><a href="/movies" class="button">Book another movie ${icon('arrow', 14)}</a></div></section><div class="metric-grid"><article class="metric-card"><span class="metric-icon">${icon('ticket', 17)}</span><span class="metric-label">Total bookings</span><strong>${number(bookings.length)}</strong><small>All bookings on this account</small></article><article class="metric-card"><span class="metric-icon">${icon('calendar', 17)}</span><span class="metric-label">Upcoming shows</span><strong>${number(upcoming.length)}</strong><small>Confirmed and still ahead</small></article><article class="metric-card"><span class="metric-icon">${icon('check', 17)}</span><span class="metric-label">Confirmed</span><strong>${number(bookings.filter(b=>b.status==='CONFIRMED').length)}</strong><small>Ready for the big screen</small></article><article class="metric-card"><span class="metric-icon">${icon('wallet', 17)}</span><span class="metric-label">Booked value</span><strong>${money(bookings.filter(b=>b.status==='CONFIRMED').reduce((sum,b)=>sum+Number(b.totalAmount||0),0))}</strong><small>Total of confirmed tickets</small></article></div><section class="dashboard-section"><div class="section-heading"><div><div class="eyebrow">UP NEXT</div><h2>Your next movie nights.</h2><p>Keep your ticket handy and get there a little early.</p></div></div>${upcoming.length ? `<div class="booking-list">${upcoming.map(b=>bookingCard(b,{cancellable:true})).join('')}</div>` : `<div class="empty-state"><div class="empty-icon">${icon('calendar', 22)}</div><h3>No upcoming show yet.</h3><p>Find a film, choose your seats, and your ticket will show up here.</p><a class="button" href="/movies">Explore films ${icon('arrow', 14)}</a></div>`}</section><section class="dashboard-section"><div class="section-heading"><div><div class="eyebrow">THE ARCHIVE</div><h2>Past bookings.</h2><p>Your movie nights and booking statuses, all together.</p></div></div>${past.length ? `<div class="booking-list">${past.map(b=>bookingCard(b)).join('')}</div>` : `<div class="empty-state"><div class="empty-icon">${icon('ticket',22)}</div><h3>Your archive is waiting.</h3><p>Completed bookings will stay available here.</p></div>`}</section>`, 'bookings-page');
    setShell(html, 'My tickets'); bindImageFallbacks();
    document.querySelectorAll('[data-cancel-booking]').forEach(button => button.addEventListener('click', async () => {
      if (!confirm('Cancel this booking? The backend will check the cancellation rules and refund state.')) return;
      button.disabled = true; button.textContent = 'Cancelling…';
      try { const result = await api(`/bookings/${button.dataset.cancelBooking}/cancel`, { method: 'POST' }); showToast(result.message || `Booking ${result.bookingCode} updated.`, 'success', 'Booking updated'); await renderBookings(); }
      catch (error) { showToast(error.message, 'error', 'Cancellation not completed'); button.disabled = false; button.textContent = 'Cancel booking'; }
    }));
  }

  async function renderTicket(id) {
    let booking;
    try { booking = await api(`/bookings/${id}`); }
    catch (error) { setShell(contentWrap(errorView(error, '/bookings')), 'Digital ticket'); return; }
    const upcoming = booking.status === 'CONFIRMED' && new Date(booking.startsAt).getTime() > Date.now();
    const html = contentWrap(`<section class="ticket-success"><div class="success-orb">${icon('check', 24)}</div><div class="eyebrow" style="justify-content:center">YOU’RE ALL SET</div><h1>Your night is <em>booked.</em></h1><p>Your ticket is ready. Save the booking code or print a copy for easy access.</p></section><article class="digital-ticket"><div class="ticket-topline"><div class="ticket-brand"><span class="brand-icon">${icon('film', 16)}</span><span>CineBook <b style="color:var(--gold)">AI</b></span></div>${statusChip(booking.status)}</div><div class="ticket-main"><div>${posterMarkup(booking.posterUrl, booking.movieTitle, '', 'ticket-art')}</div><div class="ticket-details"><div class="eyebrow">ADMIT ONE, OR A FEW</div><h2>${esc(booking.movieTitle)}</h2><div class="ticket-detail-grid"><div class="ticket-detail-line"><span>${icon('calendar', 15)}</span><div><small>Date &amp; time</small>${esc(dateTime(booking.startsAt))}</div></div><div class="ticket-detail-line"><span>${icon('pin', 15)}</span><div><small>Theatre</small>${esc(booking.theatreName)}${booking.city ? `, ${esc(booking.city)}` : ''}</div></div><div class="ticket-detail-line"><span>${icon('monitor', 15)}</span><div><small>Screen</small>${esc(booking.screenName || 'Main screen')}</div></div><div class="ticket-detail-line"><span>${icon('ticket', 15)}</span><div><small>Your seats</small>${esc((booking.seats || []).join(', ') || 'See booking code')}</div></div></div></div></div><div class="ticket-perforation"><div><small>Booking reference</small><div class="booking-code">${esc(booking.bookingCode || `CB-${booking.id}`)}</div><small style="margin-top:8px">Show this code at the venue if requested</small></div><div class="ticket-total"><small>Total paid</small><strong>${money(booking.totalAmount)}</strong><div class="ticket-barcode" aria-label="Decorative ticket barcode" style="margin-top:10px"></div></div></div></article><p class="ticket-note">${esc(booking.ticketNote || 'Arrive a little before showtime. This is a development ticket; payment mode and cancellation/refund eligibility depend on the backend configuration.')}</p><div class="ticket-actions"><button class="button" id="print-ticket">${icon('print', 15)} Print ticket</button><a class="button button-ghost" href="/bookings">${icon('ticket', 15)} My bookings</a><a class="button button-ghost" href="/movies">Discover another film</a>${upcoming ? `<button class="button button-danger" id="cancel-ticket" data-booking-id="${booking.id}">Cancel booking</button>` : ''}</div>`, 'ticket-page');
    setShell(html, `Ticket ${booking.bookingCode || booking.id}`); bindImageFallbacks();
    document.getElementById('print-ticket')?.addEventListener('click', () => window.print());
    document.getElementById('cancel-ticket')?.addEventListener('click', async () => {
      if (!confirm('Cancel this booking? The backend will check the cancellation and refund rules.')) return;
      const button = document.getElementById('cancel-ticket'); button.disabled = true; button.textContent = 'Cancelling…';
      try { const result = await api(`/bookings/${booking.id}/cancel`, { method: 'POST' }); showToast(result.message || 'Booking status updated.', 'success'); await renderTicket(booking.id); }
      catch (error) { showToast(error.message, 'error'); button.disabled = false; button.textContent = 'Cancel booking'; }
    });
  }

  function metricCard(iconName, label, value, note) {
    return `<article class="metric-card"><span class="metric-icon">${icon(iconName, 18)}</span><span class="metric-label">${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`;
  }
  function sectionHeading(eyebrow, title, description = '') {
    return `<div class="section-heading"><div><div class="eyebrow">${esc(eyebrow)}</div><h2>${esc(title)}</h2>${description ? `<p>${esc(description)}</p>` : ''}</div></div>`;
  }

  async function renderDashboard() {
    if (!currentUser) { sessionStorage.setItem('cinebook.returnTo', '/dashboard'); location.href = '/login'; return; }
    let summary;
    try { summary = await api('/dashboard/summary'); }
    catch (error) { setShell(contentWrap(errorView(error, '/movies')), 'Dashboard'); return; }

    const role = summary.role || currentUser.role || 'CUSTOMER';
    const firstName = (currentUser.displayName || '').trim().split(/\s+/)[0] || 'there';
    const roleNames = { CUSTOMER: 'Movie lover', THEATRE_PARTNER: 'Theatre partner', ADMIN: 'Administrator', OPERATIONS: 'Operations centre' };
    const roleLabel = roleNames[role] || role.replaceAll('_', ' ');
    const rail = (variant, kicker, entries, footerText) => `<aside class="workspace-rail workspace-rail-${variant}">
      <a class="workspace-rail-brand" href="/movies"><span class="brand-icon">${icon('film', 17)}</span><span>CineBook <b>AI</b><small>${esc(kicker)}</small></span></a>
      <div class="workspace-identity"><span class="avatar">${esc((currentUser.displayName || 'U').trim().charAt(0).toUpperCase())}</span><div><strong>${esc(currentUser.displayName || 'CineBook user')}</strong><small>${esc(roleLabel)}</small></div><span class="identity-pulse"></span></div>
      <div class="workspace-rail-label">YOUR WORKSPACE</div>
      <nav class="workspace-rail-nav">${entries.map(([href, label, iconName]) => `<a href="${attr(href)}">${icon(iconName, 16)}<span>${esc(label)}</span>${href.startsWith('#') ? '<span class="rail-nav-arrow">↗</span>' : ''}</a>`).join('')}</nav>
      <div class="workspace-rail-foot"><span class="rail-foot-icon">${icon('shield', 16)}</span><div><strong>Secure by design</strong><small>${esc(footerText)}</small></div></div>
      <a class="workspace-rail-back" href="/movies">${icon('arrow', 14)} Back to discovery</a>
    </aside>`;
    const dashPage = (variant, sidebar, main) => `<div class="role-dashboard role-dashboard-${variant}">${sidebar || ''}<main class="role-dashboard-main">${main}</main></div>`;

    let html = '';
    if (role === 'CUSTOMER') {
      let bookings = [];
      try { bookings = await api('/bookings'); } catch { /* Summary remains useful even when history is temporarily unavailable. */ }
      bookings = Array.isArray(bookings) ? bookings : [];
      const upcoming = bookings.filter(b => b.status === 'CONFIRMED' && new Date(b.startsAt).getTime() > Date.now()).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
      const recent = bookings.filter(b => !upcoming.includes(b)).slice(0, 3);
      const confirmedValue = bookings.filter(b => b.status === 'CONFIRMED').reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
      const next = upcoming[0];
      const heroArt = next?.posterUrl ? `<img src="${attr(next.posterUrl)}" alt="${attr(next.movieTitle)} poster" data-fallback-title="${attr(next.movieTitle)}" data-fallback-genres="Your next movie night" loading="lazy">` : `<div class="customer-reel-art"><span class="reel-ring reel-ring-one"></span><span class="reel-ring reel-ring-two"></span><span class="reel-play">${icon('film', 31)}</span><small>CINEBOOK SELECTS</small></div>`;
      const main = `<div class="customer-dashboard">
        <header class="customer-welcome" id="customer-overview"><div><span class="dashboard-overline"><i></i> YOUR PERSONAL CINEMA HUB</span><h1>Welcome back, <em>${esc(firstName)}.</em></h1><p>Your next memorable night out is just a few clicks away. Here’s your movie-life, all in one place.</p></div><div class="customer-welcome-actions"><a href="/bookings" class="button button-ghost">${icon('ticket', 15)} My tickets</a><a href="/movies" class="button">Find a film ${icon('arrow', 14)}</a></div></header>
        <section class="customer-spotlight ${next ? 'has-next-show' : ''}"><div class="customer-spotlight-copy"><span class="spotlight-tag">${icon('spark', 13)} ${next ? 'YOUR NEXT SCREENING' : 'A LITTLE CINEMA INSPIRATION'}</span><h2>${next ? `The next scene is <em>${esc(next.movieTitle)}.</em>` : 'Your next favourite is <em>out there.</em>'}</h2><p>${next ? `${esc(dateTime(next.startsAt))} · ${esc(next.theatreName)}${next.city ? `, ${esc(next.city)}` : ''}. Your seats are waiting.` : 'Explore hand-picked stories, find your perfect seat, and turn an ordinary evening into a proper movie night.'}</p><div class="spotlight-actions">${next ? `<a class="button" href="/ticket/${next.id}">Open your ticket ${icon('arrow', 14)}</a><a class="button button-ghost" href="/bookings">Booking details</a>` : `<a class="button" href="/movies">Explore the collection ${icon('arrow', 14)}</a>`}</div><div class="spotlight-assurance"><span>${icon('shield', 13)} Secure booking</span><span>${icon('ticket', 13)} Digital tickets</span><span>${icon('spark', 13)} Smart seat picks</span></div></div><div class="customer-spotlight-art">${heroArt}<span class="spotlight-art-glow"></span><span class="spotlight-art-caption">YOUR NIGHT. YOUR STORY.</span></div><span class="spotlight-orbit orbit-a"></span><span class="spotlight-orbit orbit-b"></span></section>
        <section class="customer-kpis" aria-label="Your booking overview">${metricCard('ticket','Confirmed bookings',number(summary.confirmedBookings ?? bookings.filter(b => b.status === 'CONFIRMED').length),'Tickets confirmed for you')}${metricCard('calendar','Upcoming showtimes',number(summary.upcomingShows ?? upcoming.length),'Screenings still ahead')}${metricCard('activity','Your movie history',number(summary.bookingHistory ?? bookings.length),'Bookings in your account')}${metricCard('wallet','Confirmed spend',money(confirmedValue),'Across confirmed bookings')}</section>
        <section class="customer-dashboard-section" id="customer-upcoming"><div class="workspace-section-head"><div><span class="dashboard-overline">THE NEXT FEW SCENES</span><h2>Coming up for you</h2><p>Keep your tickets close. The popcorn can wait.</p></div><a href="/bookings" class="text-action">All bookings ${icon('arrow', 13)}</a></div>${upcoming.length ? `<div class="booking-list customer-booking-list">${upcoming.slice(0, 3).map(b => bookingCard(b, { cancellable: true })).join('')}</div>` : `<div class="customer-empty-card"><div class="customer-empty-icon">${icon('calendar', 21)}</div><div><strong>No movie nights booked yet</strong><p>Your next favourite could be one search away.</p></div><a class="button button-small" href="/movies">Find a film ${icon('arrow', 13)}</a></div>`}</section>
        <section class="customer-lower-grid"><div class="customer-dashboard-section" id="customer-history"><div class="workspace-section-head"><div><span class="dashboard-overline">THE MEMORY LANE</span><h2>Recently watched on your calendar</h2><p>Your latest booking activity.</p></div></div>${recent.length ? `<div class="booking-list customer-recent-list">${recent.map(b => bookingCard(b)).join('')}</div>` : `<div class="customer-mini-empty">${icon('ticket', 19)}<span>Your booking archive will appear here.</span></div>`}</div><aside class="customer-shortcuts"><span class="dashboard-overline">QUICK SHORTCUTS</span><h3>Everything in its place.</h3><a href="/movies" class="customer-shortcut"><span>${icon('film', 17)}</span><div><strong>Discover films</strong><small>Search, filter, find your mood</small></div>${icon('chevron', 14)}</a><a href="/bookings" class="customer-shortcut"><span>${icon('ticket', 17)}</span><div><strong>Ticket wallet</strong><small>Open, print, or review a ticket</small></div>${icon('chevron', 14)}</a><a href="/movies" class="customer-shortcut"><span>${icon('spark', 17)}</span><div><strong>Find better seats</strong><small>Explore shows and seat options</small></div>${icon('chevron', 14)}</a><div class="customer-shortcut-note">${icon('shield', 14)} Booking and cancellation rules are enforced by the CineBook API.</div></aside></section>
      </div>`;
      html = contentWrap(dashPage('customer', '', main), 'dashboard-page dashboard-page-customer');
    } else if (role === 'THEATRE_PARTNER') {
      let shows = [];
      try { shows = await api('/dashboard/partner/shows'); } catch { shows = []; }
      shows = Array.isArray(shows) ? shows : [];
      const cityCount = new Set(shows.map(s => s.city).filter(Boolean)).size;
      const theatreCount = new Set(shows.map(s => s.theatreName).filter(Boolean)).size;
      const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const todayShows = shows.filter(s => new Date(s.startsAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === todayKey);
      const partnerSidebar = rail('partner', 'VENUE PARTNER', [ ['#partner-overview','Overview','dashboard'], ['#partner-schedule','Showtime schedule','calendar'], ['#partner-insights','Venue snapshot','activity'], ['/bookings','Booking portal','ticket'] ], 'Venue scope is enforced by the backend.');
      const showCards = shows.slice().sort((a,b) => new Date(a.startsAt)-new Date(b.startsAt)).slice(0, 40).map(show => `<article class="partner-show-row"><div class="partner-show-date"><strong>${esc(new Date(show.startsAt).toLocaleDateString('en-IN',{day:'2-digit',timeZone:'Asia/Kolkata'}))}</strong><span>${esc(new Date(show.startsAt).toLocaleDateString('en-IN',{month:'short',timeZone:'Asia/Kolkata'}))}</span></div><div class="partner-show-main"><div class="partner-show-title-row"><h3>${esc(show.movieTitle)}</h3><span class="partner-live-tag">${new Date(show.startsAt).getTime() > Date.now() ? 'UPCOMING' : 'SCHEDULED RECORD'}</span></div><p>${icon('monitor',13)} ${esc(show.theatreName)} <span>·</span> ${esc(show.screenName || 'Main screen')}</p><p>${icon('pin',13)} ${esc(show.city || 'City not listed')} <span>·</span> ${icon('clock',13)} ${esc(dateTime(show.startsAt,{weekday:undefined,day:undefined,month:undefined,year:undefined}))}</p></div><div class="partner-show-price"><small>Starting from</small><strong>${money(show.startingPrice)}</strong><span>${number(show.rows)} rows · ${number(show.columns)} / row</span></div></article>`).join('');
      const main = `<div class="partner-dashboard" id="partner-overview"><header class="partner-page-heading"><div><span class="dashboard-overline"><i></i> THEATRE PARTNER WORKSPACE</span><h1>Your venues.<br><em>Your showtime operations.</em></h1><p>A focused view of screenings assigned to your partner account, with the latest numbers from CineBook.</p></div><div class="partner-header-mark"><span>${icon('monitor', 24)}</span><strong>${number(theatreCount)}</strong><small>managed venues</small><div class="partner-header-mark-foot">${icon('pin',12)} ${number(cityCount)} ${cityCount === 1 ? 'city' : 'cities'}</div></div></header>
        <div class="partner-metric-grid">${metricCard('monitor','Managed showtimes',number(summary.managedShows ?? shows.length),'Showtimes linked to your account')}${metricCard('ticket','Confirmed bookings',number(summary.confirmedBookings),'Confirmed customer tickets')}${metricCard('wallet','Confirmed revenue',money(summary.confirmedRevenue),'INR · confirmed bookings only')}${metricCard('calendar','Today’s screenings',number(todayShows.length),'Showtimes on today’s schedule')}</div>
        <div class="partner-workspace-grid"><section class="partner-schedule-panel" id="partner-schedule"><div class="partner-panel-heading"><div><span class="dashboard-overline">THE RUN OF SHOW</span><h2>Upcoming showtime schedule</h2><p>Screenings associated with your partner account.</p></div><span class="partner-count-pill">${number(shows.length)} showtime${shows.length === 1 ? '' : 's'}</span></div>${showCards ? `<div class="partner-show-list">${showCards}</div>` : `<div class="empty-state"><div class="empty-icon">${icon('monitor',22)}</div><h3>No managed showtimes yet</h3><p>Showtimes will appear when your account is linked to an active venue. This view only displays records returned for your partner account.</p></div>`}</section>
        <aside class="partner-insight-column" id="partner-insights"><article class="partner-venue-card"><div class="partner-venue-card-orb">${icon('globe',23)}</div><span class="dashboard-overline">VENUE FOOTPRINT</span><h3>Your reach at a glance.</h3><p>These figures are calculated from the current partner showtime response.</p><div class="partner-footprint-stats"><div><strong>${number(theatreCount)}</strong><span>Unique venues</span></div><div><strong>${number(cityCount)}</strong><span>Cities covered</span></div><div><strong>${number(shows.length)}</strong><span>Show records</span></div></div></article><article class="partner-insight-card"><span class="partner-insight-icon">${icon('shield',18)}</span><div><strong>Scoped access</strong><p>Your partner dashboard requests only the showtime records permitted for your account.</p></div></article><article class="partner-insight-card"><span class="partner-insight-icon">${icon('activity',18)}</span><div><strong>Revenue definition</strong><p>The summary reports confirmed booking value, not projected revenue or uncollected payments.</p></div></article><a class="partner-support-link" href="/movies">${icon('film',15)} View the public movie catalogue ${icon('arrow',13)}</a></aside></div></div>`;
      html = contentWrap(dashPage('partner', partnerSidebar, main), 'dashboard-page dashboard-page-partner');
    } else if (role === 'ADMIN') {
      const [usersResponse, auditResponse, catalogResponse] = await Promise.all([
        api('/admin/users').catch(() => []), api('/admin/audit').catch(() => []), api('/movies?size=48&page=0&sort=rating').catch(() => ({ content: [] }))
      ]);
      const users = Array.isArray(usersResponse) ? usersResponse : [];
      const audits = Array.isArray(auditResponse) ? auditResponse : [];
      const movies = Array.isArray(catalogResponse?.content) ? catalogResponse.content : [];
      const roleCounts = ['CUSTOMER','THEATRE_PARTNER','OPERATIONS','ADMIN'].map(r => ({ role:r, count:users.filter(u => u.role === r).length }));
      const auditRows = audits.slice(0, 8).map(a => `<article class="admin-audit-row"><span class="admin-audit-dot"></span><div><div class="admin-audit-top"><strong>${esc(a.action || 'ACTIVITY')}</strong><span>${esc(dateTime(a.createdAt))}</span></div><p>${esc(a.actor || 'system')} · ${esc(a.targetType || 'Record')} ${esc(a.targetId || '')}</p><small>${esc(a.details || 'No additional details')} ${a.correlationId ? `· ID ${esc(a.correlationId)}` : ''}</small></div></article>`).join('');
      const adminSidebar = rail('admin', 'ADMIN CONTROL', [ ['#admin-overview','Overview','dashboard'], ['#admin-catalog','Catalogue studio','film'], ['#admin-users','People & access','users'], ['#admin-audit','Audit activity','activity'] ], 'Changes are authorized and audit logged.');
      const main = `<div class="admin-dashboard" id="admin-overview"><header class="admin-page-heading"><div><span class="dashboard-overline"><i></i> CINEBOOK CONTROL ROOM</span><h1>Good to see you, <em>${esc(firstName)}.</em></h1><p>Manage the catalogue, review access, and follow the latest recorded activity from one place.</p></div><div class="admin-header-tools"><span class="admin-secure-badge">${icon('shield',14)} PRIVILEGED SESSION</span><span class="admin-snapshot-label">Snapshot · ${esc(dateTime(summary.generatedAt || new Date().toISOString()))}</span></div></header>
        <section class="admin-metrics">${metricCard('users','Registered accounts',number(summary.users ?? users.length),'All user accounts in MySQL')}${metricCard('film','Catalogue titles',number(summary.movies ?? movies.length),'Movie records reported by API')}${metricCard('ticket','Bookings created',summary.bookings == null ? '—' : number(summary.bookings),'Across the CineBook platform')}${metricCard('wallet','Confirmed revenue',money(summary.confirmedRevenue),'Confirmed bookings only')}${metricCard('activity','Failed payments',number(summary.failedPayments ?? 0),'Payment records flagged failed')}</section>
        <div class="admin-studio-grid"><section class="admin-studio-panel" id="admin-catalog"><div class="admin-panel-heading"><span class="admin-panel-icon">${icon('plus',18)}</span><div><span class="dashboard-overline">CATALOGUE STUDIO</span><h2>Add a new title</h2><p>Publish a film to the catalogue with its core metadata.</p></div></div><form id="create-movie-form" class="movie-admin-form"><label class="form-field">Movie title<input name="title" maxlength="180" required placeholder="The Last Frame"></label><label class="form-field">Language<input name="language" required placeholder="Hindi"></label><label class="form-field span-2">Synopsis<textarea name="synopsis" required maxlength="3000" placeholder="A short description of the story…"></textarea></label><label class="form-field">Poster image URL<input name="posterUrl" type="url" maxlength="700" placeholder="https://…"></label><label class="form-field">Backdrop image URL<input name="backdropUrl" type="url" maxlength="700" placeholder="https://…"></label><label class="form-field">Genres (comma-separated)<input name="genres" required placeholder="Drama, Thriller"></label><label class="form-field">Content rating<input name="contentRating" required placeholder="UA 16+"></label><label class="form-field">Duration in minutes<input name="durationMinutes" type="number" min="1" max="500" value="120" required></label><label class="form-field">Audience rating (0–10)<input name="rating" type="number" min="0" max="10" step="0.1" value="7.5" required></label><label class="form-field">Release date<input name="releaseDate" type="date"></label><div class="span-2 admin-form-actions"><button class="button" type="submit" id="create-movie-submit">${icon('plus',15)} Add to catalogue</button><span id="create-movie-message" class="muted-small" role="status"></span></div></form></section>
        <aside class="admin-studio-aside"><article class="admin-catalog-card"><div class="admin-catalog-card-top"><span class="dashboard-overline">CATALOGUE PULSE</span><span class="admin-pulse-dot"></span></div><strong>${number(summary.movies ?? movies.length)}</strong><p>movie records reported by the catalogue summary</p><div class="admin-mini-poster-row">${movies.slice(0,4).map(m => `<div title="${attr(m.title)}">${m.posterUrl ? `<img src="${attr(m.posterUrl)}" alt="${attr(m.title)}" loading="lazy">` : `<span>${esc((m.title || 'C').slice(0,1))}</span>`}</div>`).join('') || '<span class="muted-small">No catalogue preview available.</span>'}</div><a href="/movies" class="text-action">Open public catalogue ${icon('arrow',13)}</a></article><article class="admin-role-card"><span class="dashboard-overline">ACCESS DISTRIBUTION</span><h3>People by role</h3>${roleCounts.map(({role:r,count}) => `<div class="admin-role-line"><div><span>${esc(r.replaceAll('_',' '))}</span><strong>${number(count)}</strong></div><div class="admin-role-track"><span style="width:${users.length ? Math.round(count/users.length*100) : 0}%"></span></div></div>`).join('')}</article></aside></div>
        <section class="admin-management-panel" id="admin-users"><div class="admin-panel-heading"><span class="admin-panel-icon">${icon('users',18)}</span><div><span class="dashboard-overline">PEOPLE & ACCESS</span><h2>Account permissions</h2><p>Role updates are submitted to Spring Security and recorded in the audit trail. You cannot demote your own administrator account.</p></div><span class="admin-section-count">${number(users.length)} accounts</span></div><div class="table-wrap admin-table-wrap"><table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Current role</th><th>Assign role</th><th></th></tr></thead><tbody>${users.map(user => `<tr><td><div class="admin-user-name"><span>${esc((user.displayName || user.email || '?').trim().charAt(0).toUpperCase())}</span><strong>${esc(user.displayName || 'Unnamed account')}</strong></div></td><td>${esc(user.email)}</td><td>${statusChip(user.role)}</td><td><select data-role-select="${user.id}" aria-label="Role for ${attr(user.email)}">${['CUSTOMER','THEATRE_PARTNER','OPERATIONS','ADMIN'].map(r => `<option value="${r}" ${user.role === r ? 'selected' : ''}>${r.replaceAll('_',' ')}</option>`).join('')}</select></td><td><button class="button button-ghost" data-save-role="${user.id}" ${user.id === currentUser.id ? 'title="You cannot remove your own administrator role"' : ''}>Save role</button></td></tr>`).join('') || '<tr><td colspan="5">No user records were returned.</td></tr>'}</tbody></table></div></section>
        <section class="admin-management-panel" id="admin-audit"><div class="admin-panel-heading"><span class="admin-panel-icon">${icon('activity',18)}</span><div><span class="dashboard-overline">AUDIT TRAIL</span><h2>Recent administrative activity</h2><p>Latest recorded actions returned by the audit API.</p></div><span class="admin-section-count">${number(audits.length)} records</span></div><div class="admin-audit-list">${auditRows || '<div class="customer-mini-empty">No audit events were returned.</div>'}</div><p class="admin-audit-footnote">The table above and this timeline reflect returned audit records; they are not a substitute for server-side security logs.</p></section></div>`;
      html = contentWrap(dashPage('admin', adminSidebar, main), 'dashboard-page dashboard-page-admin');
    } else {
      const messaging = Boolean(summary.messagingEnabled);
      const pending = Number(summary.pendingOutboxEvents || 0);
      const published = Number(summary.publishedOutboxEvents || 0);
      const outboxTotal = pending + published;
      const pendingWidth = outboxTotal ? Math.round(pending / outboxTotal * 100) : 0;
      const publishedWidth = outboxTotal ? Math.round(published / outboxTotal * 100) : 0;
      const signals = [
        { icon:'activity', title:'Dashboard API', label:'Responding', cls:'signal-good', detail:'The live dashboard summary request succeeded for this session.' },
        { icon:'globe', title:'Outbox publisher configuration', label:messaging ? 'Enabled by config' : 'Disabled by config', cls:messaging ? 'signal-warn' : 'signal-muted', detail:messaging ? 'Publisher delivery is configured; broker health still needs independent verification.' : 'Outbox events remain persisted, but the publisher integration is disabled by configuration.' },
        { icon:'clock', title:'Seat-hold cleanup', label:'Scheduled', cls:'signal-good', detail:esc(summary.cleanup || 'Scheduled in-process cleanup is configured for expired holds.') },
        { icon:'wallet', title:'Payment monitoring', label:Number(summary.failedPayments || 0) ? 'Review failures' : 'No failed records', cls:Number(summary.failedPayments || 0) ? 'signal-warn' : 'signal-good', detail:`${number(summary.failedPayments)} failed payment record(s) reported by the payment service.` }
      ];
      const opsSignals = signals.map(s => `<article class="ops-signal-card"><span class="ops-signal-icon">${icon(s.icon,18)}</span><div class="ops-signal-copy"><div class="ops-signal-title"><strong>${esc(s.title)}</strong><span class="ops-signal-state ${s.cls}"><i></i>${esc(s.label)}</span></div><p>${s.detail}</p></div></article>`).join('');
      const main = `<div class="ops-dashboard"><header class="ops-page-heading"><div><span class="dashboard-overline"><i></i> SYSTEM OPERATIONS · CONTROL ROOM</span><h1>Signals over <em>assumptions.</em></h1><p>A live snapshot of application-level payment, inventory, and event-delivery records. Use logs and infrastructure probes before declaring a service healthy.</p></div><div class="ops-snapshot"><span class="ops-snapshot-ring">${icon('activity',22)}</span><div><strong>Snapshot captured</strong><small>${esc(dateTime(summary.generatedAt || new Date().toISOString()))}</small></div></div></header>
        <section class="ops-metric-grid">${metricCard('activity','Failed payments',number(summary.failedPayments ?? 0),'Payment records marked failed')}${metricCard('wallet','Pending payments',number(summary.pendingPayments ?? 0),'Awaiting completion in the database')}${metricCard('clock','Expired held rows',number(summary.expiredHeldRows ?? 0),'Inventory rows past their hold expiry')}${metricCard('refresh','Outbox pending',number(pending),'Waiting for publisher handling')}${metricCard('check','Outbox published',number(published),'Marked published in the outbox')}</section>
        <div class="ops-section-heading"><div><span class="dashboard-overline">OBSERVED APP SIGNALS</span><h2>Operational watchboard</h2><p>These are application-reported states, not synthetic uptime or infrastructure metrics.</p></div><span class="ops-scope-badge">${icon('shield',13)} READ-ONLY VIEW</span></div>
        <section class="ops-watchboard"><div class="ops-signal-list">${opsSignals}</div><aside class="ops-event-panel"><div class="ops-event-panel-head"><span class="ops-event-icon">${icon('activity',19)}</span><div><span class="dashboard-overline">EVENT DELIVERY</span><h3>Transactional outbox</h3></div></div><p>Delivery-state counts returned by the application.</p><div class="ops-outbox-total"><strong>${number(outboxTotal)}</strong><span>tracked pending + published events</span></div><div class="ops-outbox-bar" aria-label="Outbox delivery states"><span class="outbox-published" style="width:${publishedWidth}%"></span><span class="outbox-pending" style="width:${pendingWidth}%"></span></div><div class="ops-outbox-legend"><span><i class="legend-published"></i>Published <strong>${number(published)}</strong></span><span><i class="legend-pending"></i>Pending <strong>${number(pending)}</strong></span></div><div class="ops-outbox-note">${messaging ? `${icon('info',14)} Publisher integration is enabled by configuration. Confirm RabbitMQ connectivity from service logs.` : `${icon('info',14)} Publisher integration is disabled. Pending events are not delivered to RabbitMQ until enabled.`}</div></aside></section>
        <section class="ops-response-grid"><article class="ops-response-card"><span class="ops-response-icon">${icon('shield',18)}</span><div><span class="dashboard-overline">SAFE RECOVERY</span><h3>Observe before intervening.</h3><p>Expired holds are handled by scheduled cleanup. Inspect database state and structured logs before manual recovery.</p></div></article><article class="ops-response-card"><span class="ops-response-icon">${icon('activity',18)}</span><div><span class="dashboard-overline">TRACEABILITY</span><h3>Follow the correlation ID.</h3><p>Use request correlation IDs to trace a booking or payment across API logs and event delivery records.</p></div></article><article class="ops-response-card"><span class="ops-response-icon">${icon('lock',18)}</span><div><span class="dashboard-overline">CONTROL BOUNDARY</span><h3>No destructive shortcuts.</h3><p>This dashboard deliberately exposes no manual database cleanup or replay action that could damage live booking state.</p></div></article></section></div>`;
      html = contentWrap(dashPage('operations', '', main), 'dashboard-page dashboard-page-operations');
    }

    setShell(html, `${roleLabel} dashboard`);
    bindImageFallbacks();
    document.querySelectorAll('[data-cancel-booking]').forEach(button => button.addEventListener('click', async () => {
      if (!confirm('Cancel this booking? The backend will check the cancellation and refund rules.')) return;
      button.disabled = true;
      try { const result = await api(`/bookings/${button.dataset.cancelBooking}/cancel`, { method: 'POST' }); showToast(result.message || 'Booking status updated.', 'success'); await renderDashboard(); }
      catch (error) { showToast(error.message, 'error'); button.disabled = false; }
    }));
    document.getElementById('create-movie-form')?.addEventListener('submit', async event => {
      event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const button = document.getElementById('create-movie-submit'); const message = document.getElementById('create-movie-message');
      button.disabled = true; button.textContent = 'Saving movie…'; message.textContent = '';
      const movie = { title: String(data.get('title')).trim(), synopsis: String(data.get('synopsis')).trim(), posterUrl: String(data.get('posterUrl') || '').trim() || null, backdropUrl: String(data.get('backdropUrl') || '').trim() || null, durationMinutes: Number(data.get('durationMinutes')), language: String(data.get('language')).trim(), genres: String(data.get('genres')).trim(), contentRating: String(data.get('contentRating')).trim(), releaseDate: String(data.get('releaseDate') || '') || null, rating: Number(data.get('rating')) };
      try { const created = await api('/admin/movies', { method: 'POST', body: JSON.stringify(movie) }); message.textContent = `Added “${created.title}” (#${created.id}).`; showToast('Movie added to the catalogue.', 'success'); form.reset(); }
      catch (error) { message.textContent = error.message; showToast(error.message, 'error', 'Movie was not added'); }
      finally { button.disabled = false; button.innerHTML = `${icon('plus',15)} Add to catalogue`; }
    });
    document.querySelectorAll('[data-save-role]').forEach(button => button.addEventListener('click', async () => {
      const id = Number(button.dataset.saveRole); const select = document.querySelector(`[data-role-select="${id}"]`); if (!select) return;
      const roleValue = select.value; button.disabled = true; button.textContent = 'Saving…';
      try { await api(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role: roleValue }) }); showToast('Account role updated and audited.', 'success'); await renderDashboard(); }
      catch (error) { showToast(error.message, 'error', 'Role was not changed'); button.disabled = false; button.textContent = 'Save role'; }
    }));
  }

  async function boot() {
    const path = location.pathname.replace(/\/+$/, '') || '/';
    // Verification routes are public; strip one-time tokens before any other network requests.
    if (path === '/verify-email') return renderEmailVerification();
    const tokens = readTokens();
    if (tokens?.accessToken) {
      currentUser = tokens.user || null;
      try {
        const profile = await api('/auth/me');
        currentUser = profile;
        const fresh = readTokens(); if (fresh) saveTokens({ ...fresh, user: profile });
      } catch (error) {
        if (error.status || !tokens.user) { saveTokens(null); currentUser = null; }
      }
    } else currentUser = null;

    if (path === '/' || path === '/movies') return renderCatalog();
    if (path === '/login' || path === '/register') {
      if (currentUser) { const returnTo = sessionStorage.getItem('cinebook.returnTo') || '/dashboard'; sessionStorage.removeItem('cinebook.returnTo'); location.href = returnTo.startsWith('/') ? returnTo : '/dashboard'; return; }
      return renderAuth(path === '/register' ? 'register' : 'login');
    }
    if (path === '/bookings') {
      if (!currentUser) { sessionStorage.setItem('cinebook.returnTo', path); location.href = '/login'; return; }
      return renderBookings();
    }
    if (path === '/dashboard') return renderDashboard();
    let match = path.match(/^\/movies\/(\d+)$/); if (match) return renderMovieDetails(Number(match[1]));
    match = path.match(/^\/shows\/(\d+)$/); if (match) return renderShow(Number(match[1]));
    match = path.match(/^\/checkout\/([^/]+)$/); if (match) return renderCheckout(decodeURIComponent(match[1]));
    match = path.match(/^\/ticket\/(\d+)$/);
    if (match) {
      if (!currentUser) { sessionStorage.setItem('cinebook.returnTo', path); location.href = '/login'; return; }
      return renderTicket(Number(match[1]));
    }
    setShell(contentWrap(`<section class="not-found"><div class="empty-icon">${icon('film', 24)}</div><div class="eyebrow" style="justify-content:center">WRONG SCREEN</div><h1>This scene got <em>cut.</em></h1><p>We couldn’t find that page. Let’s get you back to the movies.</p><a href="/" class="button">${icon('film', 15)} Back to CineBook</a></section>`), 'Page not found');
  }

  window.addEventListener('pagehide', stopPageTimers);
  boot().catch(error => {
    const root = document.getElementById('app');
    if (root) { root.innerHTML = `<main class="page-wrap"><section class="route-error"><h2>CineBook could not start.</h2><p>${esc(error.message || 'Unexpected startup error.')}</p><button class="button" type="button" data-startup-retry>Retry</button></section></main>`; root.querySelector('[data-startup-retry]')?.addEventListener('click', () => location.reload()); }
  });
})();
