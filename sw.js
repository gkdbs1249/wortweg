const CACHE='wortweg-v35';
const ASSETS=['./','./index.html','./styles.css','./app.mjs','./firebase-config.mjs','./src/core.mjs','./src/cloud-sync.mjs','./data/words.json','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener('fetch',event=>event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request))));
