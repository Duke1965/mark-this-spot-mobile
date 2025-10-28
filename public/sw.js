self.addEventListener('install', (event) => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  })());
  self.clients.claim();
});
// Pass-through fetch; no caching to avoid stale issues during development
self.addEventListener('fetch', () => {});

