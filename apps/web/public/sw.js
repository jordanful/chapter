// Service Worker for Chapter PWA
// Provides offline support and caching

const CACHE_NAME = 'chapter-v2';
const OFFLINE_URL = '/offline';

// Assets to cache on install
const PRECACHE_ASSETS = ['/', '/offline', '/manifest.json', '/library'];

// Routes that can work offline (they handle their own offline state)
const OFFLINE_CAPABLE_ROUTES = ['/library', '/reader'];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Check if URL is an offline-capable route
function isOfflineCapableRoute(url) {
  const pathname = new URL(url).pathname;
  return OFFLINE_CAPABLE_ROUTES.some((route) => pathname.startsWith(route));
}

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome extension requests
  if (event.request.url.startsWith('chrome-extension')) {
    return;
  }

  // Skip API requests - let the app handle those failures
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // For navigation requests
          if (event.request.mode === 'navigate') {
            // Offline-capable routes should try to load from cache
            // They will handle showing offline content via React
            if (isOfflineCapableRoute(event.request.url)) {
              // Try to serve the cached version of the page
              // Fall back to library page shell which can show offline books
              return caches.match('/library').then((libraryCache) => {
                if (libraryCache) {
                  return libraryCache;
                }
                // Last resort: offline page
                return caches.match(OFFLINE_URL);
              });
            }

            // Other pages show the offline page
            return caches.match(OFFLINE_URL);
          }

          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
