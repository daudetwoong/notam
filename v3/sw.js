// 오프라인 캐시: 처음 연 뒤에는 인터넷 없이도 열림. 새 버전이 올라오면 다음 열 때 자동 교체.
const CACHE = 'notammap-kind-v3-b86d3a63f2';
const FILES = ['./', './index.html', './manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;   // 지도 타일·기상 API는 그대로 네트워크
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => {
    const net = fetch(e.request).then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone())); return res; }).catch(() => r);
    return r || net;
  }));
});
