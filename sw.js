// Offline: alle bestanden worden bewaard. Nieuwe versies worden op de
// achtergrond opgehaald en zijn er bij de volgende keer openen.
const CACHE = 'henrys-feestje-v5';
const FILES = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'js/main.js',
  'js/store.js',
  'js/engine.js',
  'js/audio.js',
  'js/music.js',
  'js/battery.js',
  'js/songs.js',
  'js/art.js',
  'js/ui.js',
  'js/rewards.js',
  'js/modules/index.js',
  'js/modules/tafels.js',
  'js/modules/plusmin.js',
  'js/screens/home.js',
  'js/screens/play.js',
  'js/screens/race.js',
  'js/screens/party.js',
  'js/screens/soundcheck.js',
  'js/screens/collection.js',
  'js/screens/stars.js',
  'js/screens/settings.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(e.request, { ignoreSearch: true });
      const fresh = fetch(e.request)
        .then((res) => { if (res.ok) cache.put(e.request, res.clone()); return res; })
        .catch(() => cached);
      return cached || fresh;
    }),
  );
});
