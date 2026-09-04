// Service worker : met en cache les icônes et le manifest pour un accès
// hors ligne, mais va TOUJOURS chercher la page principale (index.html) sur
// le réseau en premier, pour ne jamais servir une version obsolète tant que
// l'appareil a une connexion. Le cache ne sert de secours que hors ligne.
// Les appels de traduction (MyMemory, etc.) passent toujours par le réseau
// tel quel — ce service worker ne les intercepte pas.

const CACHE_NAME = 'traducteur-vocal-v2';
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
  if(url.origin !== self.location.origin){ return; }

  const isPage = event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');

  if(isPage){
    // Réseau d'abord : garantit la dernière version à chaque visite en ligne.
    event.respondWith(
      fetch(event.request).then(function(response){
        const copy = response.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
        return response;
      }).catch(function(){
        return caches.match(event.request); // secours hors ligne uniquement
      })
    );
    return;
  }

  // Icônes, manifest : cache d'abord, c'est plus rapide et ça change rarement.
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
