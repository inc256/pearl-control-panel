const CACHE_VERSION = 'v2'; // bump this string on every deploy that needs a hard cache bust
const CACHE_NAME = `pearl-pwa-${CACHE_VERSION}`;
const PRECACHE_URLS = [
  '/manifest.webmanifest',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

const DEV_ONLY_PATH_PREFIXES = ['/src/', '/node_modules/', '/@vite/', '/@fs/'];

function shouldBypassCache(request) {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return true;
  if (DEV_ONLY_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return true;
  if (url.searchParams.has('t') || url.searchParams.has('v')) return true;
  return false;
}

// Hashed build assets (JS/CSS with content hash in filename) are safe to cache forever.
function isImmutableAsset(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/assets/');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (shouldBypassCache(event.request)) return;

  // Navigation requests (HTML) and anything not in /assets/: ALWAYS go to network first.
  const isNavigation = event.request.mode === 'navigate';
  if (isNavigation || !isImmutableAsset(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // Hashed assets: cache-first is safe, since the filename changes when content changes.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});