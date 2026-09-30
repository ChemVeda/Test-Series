// ChemVeda Pro - Service Worker v3 Hybrid Fast
// Caches CDN JSON + app shell for instant offline loads

const CACHE_NAME = "chemveda-v3-hybrid-2026-09-30";
const STATIC_CACHE = [
  "./",
  "./index.html",
  "./app.html",
  "./landing.css",
  "./css/app.css",
  "./landing.js",
  "./js/db.js",
  "./js/tests.js",
  "./js/app.js",
  "./data/feed.json",
  "./data/tests/index.json",
  "./manifest.json"
];

// Tests JSON - cache on demand
const DYNAMIC_CACHE = "chemveda-dynamic-v3";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_CACHE.map(url => new Request(url, {cache: 'reload'}))).catch(err=>{
        console.log("SW install cache fail", err);
        // try without some
        return cache.addAll(["./","./index.html","./app.html"]);
      });
    }).then(()=> self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.filter(k => k !== CACHE_NAME && k !== DYNAMIC_CACHE).map(k => caches.delete(k)));
    }).then(()=> self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET
  if (req.method !== "GET") return;

  // 1. CDN data: /data/tests/*.json and /data/*.json - Cache First, then network
  if (url.pathname.includes("/data/") && url.pathname.endsWith(".json")) {
    event.respondWith(
      caches.match(req).then(cached => {
        const networkFetch = fetch(req).then(networkRes => {
          if (networkRes.ok) {
            caches.open(DYNAMIC_CACHE).then(cache => cache.put(req, networkRes.clone()));
          }
          return networkRes;
        }).catch(()=> cached);
        return cached || networkFetch;
      })
    );
    return;
  }

  // 2. App shell: Cache First
  if (STATIC_CACHE.some(path => url.pathname.endsWith(path.replace("./","")) || url.pathname === "/" || url.pathname.endsWith("index.html") || url.pathname.endsWith("app.html"))) {
    event.respondWith(
      caches.match(req).then(cached => {
        return cached || fetch(req).then(res => {
          if (res.ok) caches.open(CACHE_NAME).then(c=>c.put(req, res.clone()));
          return res;
        });
      })
    );
    return;
  }

  // 3. Fonts, CDN libs: Cache First with fallback
  if (url.hostname.includes("fonts.") || url.hostname.includes("cdn.jsdelivr.net")) {
    event.respondWith(
      caches.match(req).then(cached => {
        return cached || fetch(req).then(res => {
          if (res.ok) {
            caches.open(DYNAMIC_CACHE).then(c=>c.put(req, res.clone()));
          }
          return res;
        }).catch(()=> cached);
      })
    );
    return;
  }

  // 4. API calls to Apps Script: Network First, no cache (but we cache fallback)
  if (url.hostname.includes("script.google.com")) {
    // Don't intercept POST, let it go network
    return;
  }

  // Default: Network First
  event.respondWith(
    fetch(req).catch(()=> caches.match(req))
  );
});
