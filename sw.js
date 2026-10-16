/* Service worker: app mở được khi mất mạng.
   Mỗi lần sửa app: tăng VERSION (vd soquan-v3) → máy người dùng hiện thanh "Có bản cập nhật mới". */
const VERSION = "soquan-v2";
const CORE = [
  "./", "./index.html", "./config.js", "./bridge.js", "./manifest.webmanifest", "./seed.json",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png", "./icons/favicon.png",
  "./img/p-01.jpg", "./img/p-02.jpg", "./img/p-03.jpg", "./img/p-04.jpg", "./img/p-05.jpg", "./img/p-08.jpg", "./img/p-46.jpg"
];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE))); });
self.addEventListener("message", e => { if (e.data === "skipWaiting") self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (/\.supabase\.(co|in)/.test(url.hostname)) return;          // dữ liệu & đăng nhập: luôn đi thẳng mạng
  const same = url.origin === self.location.origin;
  if (same && url.pathname.endsWith("config.js")) {
    // Cấu hình: luôn lấy bản mới nhất, mất mạng thì dùng bản đã lưu
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); return r; }).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  if (same && (req.mode === "navigate" || /(\/|index\.html)$/.test(url.pathname))) {
    // Trang chính & cấu hình: lấy bản đã cài (ổn định, mở nhanh khi mất mạng); bản mới đến qua thanh "Cập nhật"
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match("./index.html")).then(hit => hit || fetch(req)));
    return;
  }
  if (same || /fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === "opaque")) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); } return r; }).catch(() => hit);
      return hit || net;
    }));
  }
});
