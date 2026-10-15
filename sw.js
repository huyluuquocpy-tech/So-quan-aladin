/* Service worker: app mở được cả khi mất mạng. Đổi VERSION mỗi lần cập nhật để máy tải bản mới. */
const VERSION = "soquan-v1";
const CORE = [
  "./", "./index.html", "./config.js", "./bridge.js", "./manifest.webmanifest", "./seed.json",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png", "./icons/favicon.png",
  "./img/p-01.jpg", "./img/p-02.jpg", "./img/p-03.jpg", "./img/p-04.jpg", "./img/p-05.jpg", "./img/p-08.jpg", "./img/p-46.jpg"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Không chặn các kết nối dữ liệu / đăng nhập của Firebase
  if (/firestore\.googleapis\.com|identitytoolkit|securetoken|googleapis\.com\/(identity|token)/.test(url.href)) return;
  const same = url.origin === self.location.origin;
  const isShell = same && (req.mode === "navigate" || /\/(index\.html|config\.js|bridge\.js)?$/.test(url.pathname) || url.pathname.endsWith("config.js") || url.pathname.endsWith("bridge.js"));
  if (isShell) {
    // Mạng trước để luôn có bản mới, mất mạng thì dùng bản đã lưu
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match("./index.html"))));
    return;
  }
  if (same || /fonts\.(googleapis|gstatic)\.com|www\.gstatic\.com\/firebasejs/.test(url.href)) {
    // Bản đã lưu trước, cập nhật ngầm
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === "opaque")) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); } return r; }).catch(() => hit);
      return hit || net;
    }));
  }
});
