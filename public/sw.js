// Online-only worker replaces the legacy Workbox worker at the same URL.
// Authenticated POS responses must never be served from an old anon-era cache.
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map(name => caches.delete(name)));
    await self.clients.claim();
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(windows.map(client => client.navigate(client.url).catch(() => undefined)));
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
  }
});
