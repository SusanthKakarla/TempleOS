// Minimal app-shell service worker: no offline-first caching of authenticated
// dashboard data (it's per-tenant dynamic SSR content that must never be
// served stale), just (a) an active SW controlling the page — part of the
// PWA installability criteria in several browsers — and (b) a friendly
// offline page instead of the browser's default network-error screen.
const CACHE_NAME = "templeos-shell-v1";
const PRECACHE_URLS = ["/favicon.svg", "/apple-touch-icon.png", "/android-chrome-192x192.png"];

const OFFLINE_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>TempleOS — Offline</title>
<style>
  body { font-family: system-ui, sans-serif; text-align: center; padding: 4rem 1.5rem; color: #333; }
  h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
  p { color: #666; }
</style>
</head>
<body>
  <h1>You're offline</h1>
  <p>TempleOS needs an internet connection. Please reconnect and try again.</p>
</body>
</html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html" } })
    )
  );
});
