// v2 - force cache bust
self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((name) => caches.delete(name)))
    ).then(() => clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(fetch(e.request));
});
