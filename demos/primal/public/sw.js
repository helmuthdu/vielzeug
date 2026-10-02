// Service worker for the Primal companion PWA: offline app shell with runtime caching.
// Navigations are network-first (a fresh shell on every launch, the cached shell when offline);
// every other same-origin GET is cache-first: Vite's hashed /assets/ are immutable, and public
// files such as card scans are cached only once the app has actually fetched them, so the
// multi-hundred-megabyte scan library never precaches wholesale. Cross-origin requests (Google
// Fonts) pass through; offline sessions fall back to system fonts. Updates are conservative on
// purpose: a new version activates only once every tab has closed, so a running session never
// has its cache swept mid-game.
const VERSION = 'primal-v1';
const SHELL = './';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.add(SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== VERSION).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(VERSION).then((cache) => cache.put(SHELL, copy));
          return response;
        })
        .catch(() => caches.match(SHELL)),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
