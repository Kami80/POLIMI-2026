const CACHE_NAME = "polimi-students-warm-milan-v13";
const APP_SHELL = [
  "./",
  "./index.html",
  "./groups.html",
  "./groups.js",
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
  "./basic-safety-course.pdf",
  "./styles.css",
  "./ui-polish.css",
  "./neo-glass.css",
  "./compact-motion.css",
  "./warm-milan.css",
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
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
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
        if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
        return response;
      }).catch(() => caches.match(request).then(cached => cached || caches.match("./index.html")))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
        return response;
      }))
    );
  }
});
