// Меняй версию, когда обновляешь index.html,
// чтобы браузер подхватил новую версию
const CACHE_VERSION = 'dayquest-v3';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Установка: кладём файлы в кэш
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Активация: удаляем старые кэши
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_VERSION)
            .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Запросы: сначала сеть, при неудаче — кэш
self.addEventListener('fetch', event => {
  // Пропускаем запросы к другим доменам
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Обновляем кэш свежей версией
        const copy = response.clone();
        caches.open(CACHE_VERSION).then(cache => {
          cache.put(event.request, copy).catch(() => {});
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});