// Keeps the app's own files on the phone so it opens with no signal.
// Your notes are not stored here; they sync to Google Drive.
const CACHE = 'tasting-notes-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Try the network (so updates arrive), but fall back to the saved copy after 3 seconds or when offline.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const cached = () => caches.match(req, {ignoreSearch: true}).then(r => r || caches.match('./index.html'));
  e.respondWith(new Promise(resolve => {
    let done = false;
    const finish = r => { if (!done && r) { done = true; resolve(r); } };
    const timer = setTimeout(() => cached().then(finish), 3000);
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      clearTimeout(timer); finish(res);
    }).catch(() => { clearTimeout(timer); cached().then(r => finish(r || Response.error())); });
  }));
});
