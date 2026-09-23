/* Increment the version whenever an application file changes. */
const VERSION = 'nervio-offline-20260922-2';
const BASE = new URL('./', self.location.href);
const CACHE = VERSION + '-' + BASE.pathname;
const FILES = ['index.html','vigas.html','styles.css','dark.css','beam.css','pwa.css',
  'app.js','calculator.js','beam.js','beam-ui.js','pwa.js',
  'data/catalog.js','data/steels.js','data/connection.js',
  'manifest.webmanifest','assets/favicon.svg','assets/icon-192.png','assets/icon-512.png','assets/apple-touch-icon.png'];
const ALLOWED = new Set(FILES.map(f => new URL(f, BASE).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(f => new Request(new URL(f,BASE), {cache:'reload'})))));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if(key.startsWith('nervio-offline-') && key.endsWith('-'+BASE.pathname) && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => { if(event.data === 'ACTIVATE_UPDATE') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if(url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname)) return;
  url.search='';url.hash='';
  if(url.href === BASE.href) url.pathname += 'index.html';
  if(!ALLOWED.has(url.href)) return;
  event.respondWith((async()=>{
    const cached = await (await caches.open(CACHE)).match(url.href);
    return cached || fetch(event.request);
  })());
});
