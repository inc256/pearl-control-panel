const CACHE_VERSION = 'v2'; // bump this string on every deploy that needs a hard cache bust
const CACHE_NAME = `pearl-pwa-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.jpg',
  '/icons/icon-512.jpg'
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
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch((err) => {
        console.error('[sw] Precache failed — check that every PRECACHE_URLS entry returns 200:', err);
        throw err; // keep install failing loudly; a silent partial cache is worse
      })
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (shouldBypassCache(event.request)) return;

  const isNavigation = event.request.mode === 'navigate';

  // Navigation requests (HTML) and anything not in /assets/: ALWAYS go to network first.
  if (isNavigation || !isImmutableAsset(event.request)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Hashed assets: cache-first is safe, since the filename changes when content changes.
  event.respondWith(cacheFirst(event.request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    // Only cache genuinely OK responses — don't cache opaque/error responses.
    if (response && response.ok) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;

    const fallback = await caches.match('/index.html');
    if (fallback) return fallback;

    // Last resort — guarantees respondWith() never receives undefined.
    return new Response('You are offline and this page is not cached yet.', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
    }
    return response;
  } catch (err) {
    // No cached copy and network failed — return a real Response, not undefined.
    return new Response('Asset unavailable offline.', {
      status: 504,
      statusText: 'Gateway Timeout',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}