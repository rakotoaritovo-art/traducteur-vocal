// Service worker minimal : met en cache la page et les icônes pour un
// chargement instantané et un accès hors ligne au dictionnaire. Les appels
// de traduction (MyMemory, etc.) passent toujours par le réseau tel quel —
// ce service worker ne les intercepte pas.

const CACHE_NAME = 'traducteur-vocal-v1';
const APP_SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){ return cache.addAll(APP_SHELL); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(names.filter(function(n){ return n !== CACHE_NAME; }).map(function(n){ return caches.delete(n); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event){
  const url = new URL(event.request.url);
  // Seules les ressources de l'app elle-même passent par le cache ;
  // tout le reste (API de traduction) va toujours directement au réseau.
  if(url.origin !== self.location.origin){ return; }

  event.respondWith(
    caches.match(event.request).then(function(cached){
      return cached || fetch(event.request).then(function(response){
        const copy = response.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
        return response;
      }).catch(function(){ return cached; });
    })
  );
});
