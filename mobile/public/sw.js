/* Cara Care demo service worker.
 *
 * Goal: make the web build installable and usable offline for a demo.
 * Strategy is deliberately simple and safe for a health demo:
 *   - app shell (HTML/manifest) : network-first, fall back to cache
 *   - hashed static bundles     : cache-first (they are immutable)
 *   - API calls                 : never cached (patient data must stay fresh
 *                                 and must not linger on disk)
 */
const CACHE = "carecare-demo-v1";
const APP_SHELL = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache API traffic: health data must always come from the network.
  if (url.pathname.startsWith("/api/") || url.pathname === "/healthz" || url.pathname === "/readyz") {
    return;
  }

  // Immutable hashed bundles: cache-first.
  if (url.pathname.startsWith("/_expo/") || /\.(?:js|css|png|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return res;
      })),
    );
    return;
  }

  // Documents: network-first with an offline fallback to the cached shell.
  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return res;
      })
      .catch(() => caches.match(request).then((hit) => hit || caches.match("/"))),
  );
});
