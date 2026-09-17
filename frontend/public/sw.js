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
      .then(cache => {
        return cache.addAll(URLS_TO_CACHE);
      })
  );
  // Force the waiting service worker to become the active service worker.
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
  // Claim all clients to ensure the new service worker controls them immediately
  self.clients.claim();
});

// Fetch event - network first for API, cache first for static assets
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  // Ignore external API calls to avoid CORS errors (like restcountries.com)
  if (requestUrl.origin !== self.location.origin && requestUrl.pathname.includes('/v3.1/all')) {
    return;
  }

  // For API requests, try network first, then cache if offline (GET requests only)
  if ((requestUrl.pathname.startsWith('/api/') || requestUrl.pathname.startsWith('/auth/')) && event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response and cache it for offline use
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  } else {
    // For static assets, try cache first, then network
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request).then(networkResponse => {
            // Optional: cache dynamic assets here
            return networkResponse;
          });
        })
    );
  }
});
