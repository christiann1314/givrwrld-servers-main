// Service Worker for offline caching
const CACHE_NAME = 'givrwrld-v1';
const STATIC_CACHE = 'givrwrld-static-v1';
const API_CACHE = 'givrwrld-api-v1';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/dashboard',
  '/auth',
  '/manifest.json',
  // Add critical CSS and JS files
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/auth/v1/user',
  '/rest/v1/user_servers',
  '/rest/v1/plans',
  '/rest/v1/games',
  '/rest/v1/bundles',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(STATIC_FILES);
      }),
      caches.open(API_CACHE),
    ])
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip caching for non-GET requests (POST, PUT, DELETE, etc.)
  // Cache API only supports GET requests
  if (request.method !== 'GET') {
    // Just pass through POST/PUT/DELETE requests without caching
    event.respondWith(fetch(request));
    return;
  }

  // Handle API requests (GET only)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      caches.open(API_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          // Return cached response if available and not expired
          if (cachedResponse) {
            const cacheDate = new Date(cachedResponse.headers.get('date'));
            const now = new Date();
            const cacheAge = now.getTime() - cacheDate.getTime();
            
            // Cache API responses for 5 minutes
            if (cacheAge < 5 * 60 * 1000) {
              return cachedResponse;
            }
          }
          
          // Fetch fresh data
          return fetch(request).then((response) => {
            // Only cache successful GET responses
            if (response.status === 200 && request.method === 'GET') {
              cache.put(request, response.clone());
            }
            return response;
          }).catch(() => {
            // Return cached response if network fails
            return cachedResponse || new Response('Offline', { status: 503 });
          });
        });
      })
    );
    return;
  }

  // Handle static files
  if (request.destination === 'document' || request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request).then((response) => {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        });
      })
    );
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-server-actions') {
    event.waitUntil(syncOfflineActions());
  }
});

async function syncOfflineActions() {
  // Implementation for syncing offline actions when back online
  console.log('Syncing offline actions...');
}