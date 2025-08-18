// /MindMatch4/sw.js
const CACHE = "mm4-v1";
const ASSETS = [
  "/MindMatch4/",
  "/MindMatch4/index.html",
  "/MindMatch4/styles.css",
  "/MindMatch4/main.js",
  "/MindMatch4/manifest.json"
];

self.addEventListener("install", (evt) => {
  evt.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (evt) => {
  evt.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Stale-while-revalidate for same-origin requests
self.addEventListener("fetch", (evt) => {
  const req = evt.request;
  if (new URL(req.url).origin === location.origin) {
    evt.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req).then((res) => {
          caches.open(CACHE).then((c) => c.put(req, res.clone()));
          return res;
        });
        return cached || fetchPromise;
      })
    );
  }
});
