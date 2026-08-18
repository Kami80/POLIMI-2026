const CACHE_NAME = "polimi-students-warm-milan-v35-index-clean-v10";
const APP_SHELL = [
  "./",
  "./index.html",
  "./groups.html",
  "./groups.js",
  "./housing.html",
  "./housing.css",
  "./housing-mobile.css",
  "./housing-ux-v6.css",
  "./housing-v8.css",
  "./housing-v9.css",
  "./housing-v10.css",
  "./housing.js",
  "./home-hunt-config.js",
  "./community-photos/persian-polimi-community-floating.webp",
  "./community-photos/esfahan-to-italy-floating.webp",
  "./community-photos/biomedical-engineering-floating.webp",
  "./community-photos/electrical-engineering-floating.webp",
  "./community-photos/chemical-engineering-floating.webp",
  "./community-photos/hpc-computer-science-floating.webp",
  "./community-photos/persian-polimi-community.png",
  "./announcements.html",
  "./announcements.js",
  "./announcements-ux.js",
  "./styles.css",
  "./ui-polish.css",
  "./neo-glass.css",
  "./compact-motion.css",
  "./warm-milan.css",
  "./readability-v6.css",
  "./index-v10.css",
  "./app.js",
  "./ux-enhancements.js",
  "./navigation-motion.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-64.png",
  "./icons/app-icon-1024.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(APP_SHELL.map(path => cache.add(path))))
      .then(results => {
        const startPage = results[0];
        if (startPage?.status === "rejected") throw startPage.reason;
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone())));
        return response;
      }).catch(() => caches.match(request).then(cached => cached || (url.pathname.endsWith("/housing.html") ? caches.match("./housing.html") : null) || caches.match("./") || caches.match("./index.html")))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (response.ok) event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone())));
        return response;
      }))
    );
  }
});
