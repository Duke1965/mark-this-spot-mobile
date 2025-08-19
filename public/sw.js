// PINIT PWA Service Worker
const CACHE_NAME = 'pinit-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/pinit-logo.png'
];

// Google Maps domains to bypass Service Worker completely
const googleHosts = [
  'https://maps.googleapis.com',
  'https://maps.gstatic.com',
  'https://mts0.google.com',
  'https://mts1.google.com',
  'https://mts2.google.com',
  'https://mts3.google.com',
  'https://mt0.google.com',
  'https://mt1.google.com',
  'https://mt2.google.com',
  'https://mt3.google.com',
  'https://lh3.googleusercontent.com',
];

// Install event - cache resources
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('🔄 PINIT PWA: Caching resources');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when possible, but bypass Google Maps
self.addEventListener('fetch', function(event) {
  // Check if request is to Google Maps domain
  const isGoogleMapsRequest = googleHosts.some(host => 
    event.request.url.startsWith(host)
  );
  
  // If it's Google Maps, bypass Service Worker completely
  if (isGoogleMapsRequest) {
    console.log('🗺️ PINIT PWA: Bypassing Service Worker for Google Maps:', event.request.url);
    event.respondWith(fetch(event.request));
    return;
  }
  
  // For all other requests, use normal caching strategy
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('🧹 PINIT PWA: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

console.log('🔄 PINIT PWA Service Worker loaded with Google Maps bypass'); 
