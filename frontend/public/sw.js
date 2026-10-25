/* APT Rent service worker
 *  - App shell (index.html + hashed /assets/*): precached, so the app opens offline.
 *    Navigations are network-first (newest deploy when online), cached shell when offline.
 *  - API calls (/api, /v1) and anything non-GET: NEVER touched (private data + auth cookie).
 *  - Map tiles + Google Fonts: stale-while-revalidate, size-capped.
 * Bump VERSION when you change this file's logic.
 */
const VERSION = 'v1';
const SHELL = `aptrent-shell-${VERSION}`;
const RUNTIME = `aptrent-runtime-${VERSION}`;
const TILES = `aptrent-tiles-${VERSION}`;
const ALL_CACHES = [SHELL, RUNTIME, TILES];

const PRECACHE = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];
const API_PREFIXES = ['/api/', '/v1/'];
const TILE_HOSTS = ['tile.openstreetmap.org'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      await cache.addAll(PRECACHE);
      // Find the hashed JS/CSS bundles in the fresh index.html and cache them too,
      // otherwise the first offline launch would have HTML but no code.
      try {
        const html = await (await fetch('/', { cache: 'reload' })).text();
        const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
        await Promise.all(assets.map((url) => cache.add(url).catch(() => {})));
      } catch { /* offline during install */ }
    })(),
  );
  // No skipWaiting() here: the page asks for it, so an update never swaps code mid-form.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith('aptrent-') && !ALL_CACHES.includes(k)).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

const cacheable = (res) => res && (res.ok || res.type === 'opaque');

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (cacheable(res)) cache.put(request, res.clone()).then(() => maxEntries && trim(cacheName, maxEntries));
      return res;
    })
    .catch(() => cached);
  return cached || network;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (cacheable(res)) cache.put(request, res.clone());
  return res;
}

async function navigationHandler(request) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put('/', res.clone()); // SPA: every route is the same index.html
    return res;
  } catch {
    return (await cache.match('/')) || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    if (TILE_HOSTS.some((h) => url.hostname.endsWith(h))) {
      event.respondWith(staleWhileRevalidate(request, TILES, 300));
    } else if (FONT_HOSTS.includes(url.hostname)) {
      event.respondWith(staleWhileRevalidate(request, RUNTIME, 60));
    }
    return;
  }

  if (API_PREFIXES.some((p) => url.pathname.startsWith(p))) return;

  if (request.mode === 'navigate') return void event.respondWith(navigationHandler(request));
  if (url.pathname.startsWith('/assets/')) return void event.respondWith(cacheFirst(request, SHELL));
  event.respondWith(staleWhileRevalidate(request, RUNTIME, 80));
});