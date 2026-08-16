// v2 (2026-08) : l'ancienne strategie etait cache-first PERMANENT pour l'app shell -- une fois
// index.html/app.js caches au premier chargement, ils n'etaient plus jamais revalides contre le
// reseau, meme en ligne, tant que sw.js lui-meme ne changeait pas (ce qui ne se produisait jamais
// entre deux mises en ligne de l'app). Resultat : aucune mise a jour n'atteignait un appareil deja
// visite, sans que rien ne le signale a l'utilisateur. Passage en reseau-d'abord (voir plus bas).
const CACHE_NAME = 'urbizia-spotsan-v2';
const APP_SHELL = ['./', './index.html', './install.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-512-maskable.png', './data/toilets-seed.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Reseau d'abord pour les fichiers de meme origine (app shell) : une nouvelle mise en ligne est donc
// visible des le prochain chargement en ligne, sans dependre d'un changement de sw.js. Repli sur le
// cache seulement hors-ligne ou en cas d'echec reseau (mode installable / hors-ligne partiel conserve).
// Ressources externes (tuiles de carte, CDN Leaflet) : reseau direct, jamais interceptees ici.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        if (resp && resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return resp;
      })
      .catch(() => caches.match(e.request))
  );
});
