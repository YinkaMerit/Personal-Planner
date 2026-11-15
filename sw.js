// Bump this when the app files change so phones pick up the new version
const CACHE_NAME = "tees-planner-v2-20261115g";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./db.js",
  "./utils.js",
  "./sync.js",
  "./calendar.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE_NAME ? Promise.resolve() : caches.delete(k))));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // App files: try the network first so updates arrive, fall back to the cache when offline
  if (url.origin === self.location.origin){
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone()).catch(()=>{});
        return res;
      } catch (_) {
        return (await cache.match(req, { ignoreSearch: true })) || (await cache.match("./index.html")) || Response.error();
      }
    })());
    return;
  }

  // Fonts: cache first, they never change
  if (FONT_HOSTS.includes(url.hostname)){
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      cache.put(req, res.clone()).catch(()=>{});
      return res;
    })());
  }
  // Everything else (iTunes, YouTube, Firebase) goes straight to the network
});
