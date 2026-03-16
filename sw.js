// /MindMatch4/sw.js
const CACHE = "mm4-v2";
const ASSETS = [
  "/MindMatch4/",
  "/MindMatch4/index.html",
  "/MindMatch4/manifest.json",
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
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const isNav = req.mode === "navigate";
  const isStatic = /\/MindMatch4\/(assets\/|manifest\.json|favicon\.ico|logo-|robots\.txt|sitemap\.xml)/.test(url.pathname);

  // Network-first for HTML so app shell updates immediately.
  if (isNav) {
    evt.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("/MindMatch4/index.html")))
    );
    return;
  }

  // Cache-first for hashed/static assets.
  if (isStatic) {
    evt.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
          return res;
        });
      })
    );
  }
});
