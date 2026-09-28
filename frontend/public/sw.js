const CACHE_NAME = 'lucohire-cache-v1';

// URLs to cache immediately
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
];

// Install event - cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_CACHE))
      .catch(err => {
        console.warn('SW cache.addAll failed:', err);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first for API, cache first for static assets
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  let requestUrl;
  try {
    requestUrl = new URL(event.request.url);
  } catch {
    return;
  }

  // 1. Only handle standard HTTP/HTTPS schemes (skip chrome-extension, blob, data, etc.)
  if (!requestUrl.protocol.startsWith('http')) return;

  // 2. Do not intercept cross-origin requests (e.g., clarity.ms, razorpay, analytics, Google fonts)
  // Let the browser handle external requests directly so ad-blockers / network failures don't reject SW promises
  if (requestUrl.origin !== self.location.origin) return;

  // 3. Skip Vite dev server and HMR requests during local development
  if (
    requestUrl.pathname.startsWith('/@') ||
    requestUrl.pathname.startsWith('/src/') ||
    requestUrl.pathname.startsWith('/node_modules/') ||
    requestUrl.search.includes('t=')
  ) {
    return;
  }

  // 4. API requests: network first, cache fallback (GET requests only)
  if (requestUrl.pathname.startsWith('/api/') || requestUrl.pathname.startsWith('/auth/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            }).catch(() => {});
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then(cached => cached || Response.error());
        })
    );
    return;
  }

  // 5. Static assets: cache first, network fallback with error catch
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).catch(err => {
          console.debug('SW fetch fallback for:', event.request.url, err);
          // Return cached index.html for navigation or empty response
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return Response.error();
        });
      })
      .catch(() => {
        return caches.match('/index.html');
      })
  );
});

