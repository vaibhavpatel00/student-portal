const CACHE_NAME = 'vignan-portal-v15';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/register.html',
    '/dashboard.html',
    '/results.html',
    '/forgot-password.html',
    '/reset-password.html',
    '/profile.html',
    '/announcements.html',
    '/css/style.css',
    '/js/login.js',
    '/js/register.js',
    '/js/dashboard.js',
    '/js/results.js',
    '/js/forgot-password.js',
    '/js/reset-password.js',
    '/js/profile.js',
    '/js/announcements.js',
    '/js/version-check.js',
    '/images/logo.png'
];

// Install Event — skip waiting to activate immediately
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// Activate Event — claim all clients and delete old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event — network-first for everything
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    // Skip API calls from caching
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match(event.request);
            })
        );
        return;
    }

    // Network-first strategy for all assets
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Update cache with fresh response
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                // Fallback to cache if offline
                return caches.match(event.request);
            })
    );
});
