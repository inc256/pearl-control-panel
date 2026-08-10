const CACHE_NAME = 'pearl-pwa-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

const DEV_ONLY_PATH_PREFIXES = ['/src/', '/node_modules/', '/@vite/', '/@fs/'];

function shouldBypassCache(request) {
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return true;
  }

  if (DEV_ONLY_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    return true;
  }

  if (url.searchParams.has('t') || url.searchParams.has('v')) {
    return true;
  }

  return false;
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

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, response.clone());
          return response;
        });
      }).catch(() => caches.match('/index.html'));
    })
  );
});
