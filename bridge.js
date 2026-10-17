/* Sổ quán The Aladin — cầu nối Supabase.
   App gốc gọi window.claude.use("db") / use("user"). File này cung cấp đúng hai thứ đó,
   dữ liệu nằm trên Supabase của quán (bảng public.docs).

   Hai chế độ:
   - NHÂN VIÊN (mặc định, không cần đăng nhập): chỉ tab Bán hàng. Máy chủ chỉ cho đọc menu,
     phí ship, đơn trong ngày và chỉ cho THÊM đơn mới (không sửa/xoá được).
   - QUẢN LÝ: bấm vào Thu chi / Kho & món / Báo cáo → nhập mật khẩu quản lý.
     Mật khẩu được Supabase kiểm tra (tài khoản SUPABASE_MANAGER_EMAIL). Tự khoá lại khi
     không dùng 15 phút, khi rời app quá 5 phút, hoặc khi mở lại app.

   Mọi thay đổi được áp dụng ngay trên máy, đưa vào "hàng chờ" rồi gửi lên máy chủ.
   Mất mạng: hàng chờ giữ lại (localStorage), có mạng lại tự gửi. */
(function () {
  "use strict";
  var URL_ = window.SUPABASE_URL, KEY_ = window.SUPABASE_ANON_KEY;
  var MGR_EMAIL = window.SUPABASE_MANAGER_EMAIL || "";
  var PAGE = 1000;
  var MGR_TABS = { money: 1, stock: 1, report: 1, menu: 1 };
  var MGR_COLLS = ["ingredients", "txns", "closings", "people"];   // chỉ quản lý mới tải
  var IDLE_LOCK = 15 * 60 * 1000, AWAY_LOCK = 5 * 60 * 1000;

  // Mở app luôn vào Bán hàng (app gốc nhớ tab cuối, có thể là tab quản lý)
  try { var lt = localStorage.getItem("aladin.tab"); if (lt && lt !== "pos") localStorage.setItem("aladin.tab", "pos"); } catch (e) {}

  /* ---------- giao diện phụ ---------- */
  var css = document.createElement("style");
  css.textContent =
    ".gate{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:20px;background:rgba(247,239,228,.94);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-family:'Be Vietnam Pro',system-ui,sans-serif;color:#2b1d17}" +
    ".gate form,.gate .box{width:100%;max-width:360px;background:#fffdf8;border:1px solid rgba(120,80,50,.15);border-radius:18px;padding:22px;box-shadow:0 20px 50px -24px rgba(110,70,40,.5);display:flex;flex-direction:column;gap:12px}" +
    ".gate h1{margin:0;font-family:'Pinyon Script',Georgia,serif;font-weight:400;font-size:2.4rem;color:#8a2e1f;text-align:center;line-height:1}" +
    ".gate h2{margin:0;font-size:1.05rem;text-align:center}" +
    ".gate p{margin:0;font-size:.86rem;color:#6b574c;text-align:center}" +
    ".gate label{display:flex;flex-direction:column;gap:5px;font-size:.78rem;font-weight:600;color:#6b574c}" +
    ".gate input{font:inherit;font-size:16px;min-height:44px;padding:8px 12px;border:1.5px solid rgba(120,80,50,.18);border-radius:12px;background:#fff;color:#2b1d17}" +
    ".gate input:focus{outline:none;border-color:#0f7a84;box-shadow:0 0 0 4px rgba(24,160,164,.16)}" +
    ".gate button{font:inherit;font-weight:700;min-height:46px;border:0;border-radius:14px;background:linear-gradient(135deg,#0f7a84,#18a0a4);color:#fff;cursor:pointer}" +
    ".gate button.ghost{background:none;color:#6b574c;min-height:38px;font-weight:600}" +
    ".gate button:disabled{opacity:.5}.gate .err{color:#b3311f;font-size:.84rem;text-align:center;min-height:1em}" +
    ".gate code{background:#f3e8d8;padding:1px 5px;border-radius:5px;font-size:.8rem}" +
    ".gate .u{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}" +
    ".topbar{position:fixed;left:50%;transform:translateX(-50%);top:calc(10px + env(safe-area-inset-top,0px));z-index:90;background:#2b1d17;color:#fff;border-radius:14px;padding:10px 12px;display:flex;gap:10px;align-items:center;font:600 .86rem 'Be Vietnam Pro',system-ui,sans-serif;width:max-content;max-width:calc(100% - 24px);box-shadow:0 14px 30px -12px rgba(0,0,0,.6)}" +
    ".topbar button{font:inherit;border:0;border-radius:10px;padding:8px 12px;background:#18a0a4;color:#fff;cursor:pointer;white-space:nowrap}" +
    ".mgrbtn{font:600 .72rem 'Be Vietnam Pro',system-ui,sans-serif;border:1px solid rgba(120,80,50,.15);background:#fff;color:#6b574c;border-radius:99px;padding:5px 10px;cursor:pointer;white-space:nowrap}" +
    ".mgrbtn.on{background:#2b1d17;color:#fff;border-color:#2b1d17}" +
    ".tab[data-locked]{position:relative}" +
    ".tab[data-locked]::after{content:'';position:absolute;top:5px;right:calc(50% - 22px);width:9px;height:9px;background:currentColor;opacity:.55;" +
    "-webkit-mask:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M7 10V7a5 5 0 0110 0v3h1a1 1 0 011 1v10a1 1 0 01-1 1H6a1 1 0 01-1-1V11a1 1 0 011-1zm2 0h6V7a3 3 0 00-6 0z'/%3E%3C/svg%3E\") center/contain no-repeat;" +
    "mask:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M7 10V7a5 5 0 0110 0v3h1a1 1 0 011 1v10a1 1 0 01-1 1H6a1 1 0 01-1-1V11a1 1 0 011-1zm2 0h6V7a3 3 0 00-6 0z'/%3E%3C/svg%3E\") center/contain no-repeat}" +
    "@media (min-width:761px){.tab[data-locked]::after{position:static;margin-left:2px}}";
  document.head.appendChild(css);
  function onBody(fn) { if (document.body) fn(); else document.addEventListener("DOMContentLoaded", fn); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function gate(html) {
    var g = document.querySelector(".gate");
    if (!g) { g = document.createElement("div"); g.className = "gate"; document.body.appendChild(g); }
    g.innerHTML = html; return g;
  }
  function closeGate() { var g = document.querySelector(".gate"); if (g) g.remove(); }
  function topbar(id, text, btn, onClick) {
    onBody(function () {
      if (document.getElementById(id)) return;
      var b = document.createElement("div"); b.className = "topbar"; b.id = id;
      b.innerHTML = "<span></span><button type='button'></button>";
      b.firstChild.textContent = text; b.lastChild.textContent = btn;
      b.lastChild.addEventListener("click", function () { onClick(b, b.lastChild); });
      document.body.appendChild(b);
    });
  }

  /* ---------- cập nhật app (service worker) ---------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").then(function (reg) {
        function offer(w) {
          topbar("updbar", "Có bản cập nhật mới của Sổ quán.", "Cập nhật", function (bar, btn) { btn.disabled = true; btn.textContent = "Đang cập nhật…"; w.postMessage("skipWaiting"); });
        }
        if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
        reg.addEventListener("updatefound", function () {
          var w = reg.installing; if (!w) return;
          w.addEventListener("statechange", function () { if (w.state === "installed" && navigator.serviceWorker.controller) offer(w); });
        });
        setInterval(function () { reg.update().catch(function () {}); }, 30 * 60 * 1000);
      }).catch(function () {});
      var reloaded = false, hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener("controllerchange", function () {
        if (!hadController) { hadController = true; return; }   // lần cài đầu tiên: không tải lại
        if (reloaded) return; reloaded = true; location.reload();
      });
    });
  }

  if (!URL_ || !KEY_ || !window.supabase) {
    window.claude = { use: function () { return Promise.resolve(null); } };
    onBody(function () {
      gate('<div class="box"><h1>The Aladin</h1><p>' + (!URL_ || !KEY_
        ? 'App chưa được nối với kho dữ liệu. Mở file <code>config.js</code> và dán địa chỉ Supabase cùng khóa anon (xem README).'
        : 'Không tải được thư viện kết nối. Kiểm tra mạng rồi mở lại app.') + '</p></div>');
    });
    return;
  }

  // Phiên quản lý chỉ giữ trong bộ nhớ: đóng/mở lại app là tự khoá.
  var sb = window.supabase.createClient(URL_, KEY_, { auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false } });
  var isMgr = false;

  /* ---------- lưu trữ trên máy ---------- */
  var idb = (function () {
    var p = null;
    function open() {
      if (p) return p;
      p = new Promise(function (res) {
        try { var r = indexedDB.open("soquan", 1); r.onupgradeneeded = function () { r.result.createObjectStore("kv"); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { res(null); }; }
        catch (e) { res(null); }
      });
      return p;
    }
    return {
      get: function (k) { return open().then(function (db) { if (!db) return null; return new Promise(function (res) { try { var q = db.transaction("kv").objectStore("kv").get(k); q.onsuccess = function () { res(q.result || null); }; q.onerror = function () { res(null); }; } catch (e) { res(null); } }); }); },
      set: function (k, v) { return open().then(function (db) { if (!db) return; try { db.transaction("kv", "readwrite").objectStore("kv").put(v, k); } catch (e) {} }); }
    };
  })();

  /* ---------- bộ nhớ đệm + truy vấn ---------- */
  var cache = {};            // coll -> {id: data}
  var meta = {};             // coll -> {from: "YYYY-MM-DD" | "*", at: ms}
  var listeners = [];
  var saveT = {};
  function C(coll) { return cache[coll] || (cache[coll] = {}); }
  function clone(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }
  function z(n) { return (n < 10 ? "0" : "") + n; }
  function todayStr() { var d = new Date(); return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()); }
  function persist(coll) {
    clearTimeout(saveT[coll]);
    saveT[coll] = setTimeout(function () { idb.set("c:" + coll, { data: cache[coll] || {}, meta: meta[coll] || null }); }, 400);
  }
  function docSnap(id, d) { return { id: id, exists: d !== undefined, data: function () { return clone(d); }, metadata: { fromCache: false, hasPendingWrites: false } }; }
  function match(d, f) {
    var v = d[f[0]], x = f[2];
    switch (f[1]) { case ">=": return v >= x; case ">": return v > x; case "<=": return v <= x; case "<": return v < x; case "==": return v === x; case "!=": return v !== x; default: return true; }
  }
  function runQuery(l) {
    var c = C(l.coll);
    if (l.docId !== undefined) return docSnap(l.docId, c[l.docId]);
    var rows = Object.keys(c).map(function (id) { return [id, c[id]]; }).filter(function (r) { return l.f.every(function (f) { return match(r[1], f); }); });
    if (l.o) rows.sort(function (a, b) { var x = a[1][l.o.f], y = b[1][l.o.f]; return (x > y ? 1 : x < y ? -1 : 0) * (l.o.d === "desc" ? -1 : 1); });
    else rows.sort(function (a, b) { return a[0] < b[0] ? -1 : 1; });
    if (l.lim) rows = rows.slice(0, l.lim);
    var docs = rows.map(function (r) { return docSnap(r[0], r[1]); });
    return { docs: docs, size: docs.length, empty: !docs.length, docChanges: function () { return []; }, metadata: { fromCache: false, hasPendingWrites: false } };
  }
  var notifyT = {};
  function notify(coll) {
    if (notifyT[coll]) return;
    notifyT[coll] = setTimeout(function () {
      notifyT[coll] = 0;
      listeners.filter(function (l) { return l.coll === coll; }).forEach(function (l) { try { l.next(runQuery(l)); } catch (e) { console.error(e); } });
    }, 0);
  }
  // Bỏ dữ liệu quản lý khỏi máy (khi khoá lại / khi mở app)
  function purgeMgrData() {
    MGR_COLLS.forEach(function (c) { cache[c] = {}; meta[c] = null; persist(c); notify(c); });
    var o = C("orders"), t = todayStr(), pend = pendingIds("orders");
    Object.keys(o).forEach(function (id) { if (!pend[id] && !((o[id] && o[id].day) >= t)) delete o[id]; });
    meta.orders = null; persist("orders"); notify("orders");
  }

  /* ---------- tải từ máy chủ ---------- */
  var loading = {};
  function pendingIds(coll) { var s = {}; outbox.forEach(function (o) { if (o.coll === coll) s[o.id] = 1; }); return s; }
  function fetchAll(coll, from) {
    var out = [];
    function page(n) {
      var q = sb.from("docs").select("id,data").eq("coll", coll).order("id").range(n, n + PAGE - 1);
      if (from && from !== "*") q = q.gte("day", from);
      return q.then(function (r) {
        if (r.error) throw r.error;
        out = out.concat(r.data || []);
        return (r.data || []).length === PAGE ? page(n + PAGE) : out;
      });
    }
    return page(0);
  }
  function load(coll, from) {
    if (!isMgr && MGR_COLLS.indexOf(coll) >= 0) return Promise.resolve();   // nhân viên: không tải dữ liệu quản lý
    var key = coll + "|" + from + "|" + (isMgr ? "m" : "s");
    if (loading[key]) return loading[key];
    var asMgr = isMgr;
    loading[key] = fetchAll(coll, from).then(function (rows) {
      if (asMgr !== isMgr) return;     // vừa đổi chế độ trong lúc tải: bỏ kết quả cũ
      var c = C(coll), pend = pendingIds(coll), seen = {};
      rows.forEach(function (r) { seen[r.id] = 1; if (!pend[r.id]) c[r.id] = r.data; });
      Object.keys(c).forEach(function (id) {
        if (seen[id] || pend[id]) return;
        var d = c[id]; if (from === "*" || (d && d.day >= from)) delete c[id];
      });
      if (asMgr) { var m = meta[coll]; if (!m || from === "*" || (m.from !== "*" && from < m.from)) meta[coll] = { from: from, at: Date.now() }; }
      persist(coll); notify(coll); setNet();
    }).catch(function (e) { console.warn("load", coll, e); setNet(); }).then(function () { delete loading[key]; });
    return loading[key];
  }
  function ensure(coll, from) {
    var m = meta[coll];
    if (!m) return load(coll, from);
    if (m.from === "*" || (from !== "*" && from >= m.from)) return Promise.resolve();
    return load(coll, from);
  }
  function refreshAll() {
    var need = {};
    listeners.forEach(function (l) { var f = l.from; if (!need[l.coll] || f === "*" || (need[l.coll] !== "*" && f < need[l.coll])) need[l.coll] = f; });
    return Promise.all(Object.keys(need).map(function (c) { return load(c, need[c]); }));
  }

  /* ---------- hàng chờ ghi ---------- */
  var OBX = "soquan.outbox";
  var outbox = [];
  try { outbox = JSON.parse(localStorage.getItem(OBX) || "[]"); } catch (e) { outbox = []; }
  function saveOutbox() { try { localStorage.setItem(OBX, JSON.stringify(outbox)); } catch (e) {} setNet(); }
  function isNetErr(e) {
    if (!navigator.onLine) return true;
    var m = String((e && (e.message || e.details)) || e || "");
    return !(e && e.code) && /fetch|network|load failed|timeout|abort/i.test(m) || /Failed to fetch|NetworkError|Load failed/i.test(m);
  }
  // Đơn mới (nhân viên cũng được gửi) — mọi thao tác khác cần quyền quản lý
  function isNewOrder(op, coll, data) { return op === "set" && coll === "orders" && data && (data.status || "ok") === "ok" && !data.edited && !data.deleted && !data["void"]; }
  function canSend(o) { return isMgr || !o.m; }
  function heldCount() { var n = 0; outbox.forEach(function (o) { if (!canSend(o)) n++; }); return n; }
  function send(o) {
    if (o.op === "set") {
      if (isMgr) return sb.from("docs").upsert({ coll: o.coll, id: o.id, data: o.data });
      return sb.from("docs").insert({ coll: o.coll, id: o.id, data: o.data });
    }
    if (o.op === "merge") return sb.rpc("docs_merge", { p_coll: o.coll, p_id: o.id, p_patch: o.data });
    return sb.from("docs").delete().eq("coll", o.coll).eq("id", o.id);
  }
  var flushing = null;
  function flush() {
    if (flushing) return flushing;
    flushing = (function next() {
      if (!navigator.onLine) return Promise.resolve();
      var i = -1; for (var k = 0; k < outbox.length; k++) if (canSend(outbox[k])) { i = k; break; }
      if (i < 0) return Promise.resolve();
      var o = outbox[i];
      function drop() { var j = outbox.indexOf(o); if (j >= 0) outbox.splice(j, 1); saveOutbox(); }
      return send(o).then(function (r) {
        if (r && r.error) throw r.error;
        drop(); if (o._ok) o._ok(); return next();
      }).catch(function (e) {
        if (isNetErr(e)) { outbox.forEach(function (x) { if (x._ok) x._ok(); }); return; }   // giữ lại, thử sau
        drop();
        if (e && e.code === "23505") { load(o.coll, (meta[o.coll] && meta[o.coll].from) || todayStr()); if (o._ok) o._ok(); return next(); }   // đơn đã lên từ lần gửi trước
        console.error("write rejected", e);
        if (o._fail) o._fail({ code: "invalid_argument", message: String(e.message || e) });
        load(o.coll, (meta[o.coll] && meta[o.coll].from) || (o.coll === "orders" ? todayStr() : "*"));
        return next();
      });
    })().then(function () { flushing = null; setNet(); }, function () { flushing = null; setNet(); });
    return flushing;
  }
  function write(op, coll, id, data) {
    var c = C(coll);
    if (op === "set") c[id] = clone(data);
    else if (op === "merge") c[id] = Object.assign({}, c[id] || {}, clone(data));
    else delete c[id];
    persist(coll); notify(coll);
    return new Promise(function (resolve, reject) {
      var o = { op: op, coll: coll, id: id, data: clone(data), m: isNewOrder(op, coll, data) ? 0 : 1 };
      Object.defineProperty(o, "_ok", { value: resolve, enumerable: false });
      Object.defineProperty(o, "_fail", { value: reject, enumerable: false });
      outbox.push(o); saveOutbox();
      if (!navigator.onLine || !canSend(o)) { resolve(); return; }
      setTimeout(resolve, 5000);          // mạng chậm: không bắt người dùng chờ, thao tác vẫn nằm trong hàng chờ
      flush();
    });
  }
  window.addEventListener("online", function () { flush().then(refreshAll); });
  window.addEventListener("offline", setNet);
  setInterval(function () { if (outbox.length) flush(); }, 20000);

  /* ---------- API giống Firestore mà app đang dùng ---------- */
  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function split(path) { var i = path.indexOf("/"); return [path.slice(0, i), path.slice(i + 1)]; }
  function docRef(coll, id) {
    return {
      id: id, path: coll + "/" + id,
      get: function () { return ensure(coll, "*").then(function () { return docSnap(id, C(coll)[id]); }); },
      set: function (d) { return write("set", coll, id, d); },
      update: function (d) { return write("merge", coll, id, d); },
      delete: function () { return write("del", coll, id); },
      onSnapshot: function (next) {
        var l = { coll: coll, docId: id, f: [], from: "*", next: next }; listeners.push(l);
        setTimeout(function () { next(runQuery(l)); ensure(coll, "*"); }, 0);
        return function () { var i = listeners.indexOf(l); if (i >= 0) listeners.splice(i, 1); };
      }
    };
  }
  function query(coll, f, o, lim) {
    var from = "*";
    f.forEach(function (x) { if (x[0] === "day" && (x[1] === ">=" || x[1] === ">")) from = x[2]; });
    return {
      path: coll,
      where: function (a, b, c) { return query(coll, f.concat([[a, b, c]]), o, lim); },
      orderBy: function (a, d) { return query(coll, f, { f: a, d: d }, lim); },
      limit: function (n) { return query(coll, f, o, n); },
      doc: function (id) { return docRef(coll, id || newId()); },
      add: function (d) { var id = newId(); return write("set", coll, id, d).then(function () { return docRef(coll, id); }); },
      get: function () { var l = { coll: coll, f: f, o: o, lim: lim }; return ensure(coll, from).then(function () { return runQuery(l); }); },
      onSnapshot: function (next) {
        var l = { coll: coll, f: f, o: o, lim: lim, from: from, next: next }; listeners.push(l);
        setTimeout(function () { next(runQuery(l)); ensure(coll, from); }, 0);
        return function () { var i = listeners.indexOf(l); if (i >= 0) listeners.splice(i, 1); };
      }
    };
  }
  var db = {
    collection: function (p) { return query(p, [], null, 0); },
    doc: function (p) { var s = split(p); return docRef(s[0], s[1]); }
  };

  var userApi = {
    id: function () { return Promise.resolve(null); },
    can: function () { return Promise.resolve(true); },
    isOwner: function () { return true; }, canEdit: function () { return true; },
    profiles: function (ids) { var out = {}; [].concat(ids).forEach(function (id) { out[id] = { id: id, name: "" }; }); return Promise.resolve(out); }
  };

  /* ---------- trạng thái mạng ---------- */
  function setNet() {
    var t = document.getElementById("statusTxt"), d = document.getElementById("dot"); if (!t || !d || !started) return;
    var held = heldCount(), live = outbox.length - held;
    if (!navigator.onLine) { t.textContent = "Mất mạng · lưu tạm " + (outbox.length ? outbox.length + " thao tác" : "trên máy"); d.className = "dot bad"; }
    else if (live) { t.textContent = "Đang gửi " + live + " thao tác…"; d.className = "dot"; }
    else if (held) { t.textContent = held + " thao tác chờ mở khoá quản lý"; d.className = "dot"; }
    else { t.textContent = "Đã đồng bộ"; d.className = "dot ok"; }
  }

  /* ---------- chế độ quản lý ---------- */
  var lastAct = Date.now(), hiddenAt = 0;
  ["pointerdown", "keydown", "input", "touchstart"].forEach(function (t) { document.addEventListener(t, function () { lastAct = Date.now(); }, { capture: true, passive: true }); });

  function markTabs() {
    document.querySelectorAll(".tab[data-tab]").forEach(function (b) {
      if (MGR_TABS[b.dataset.tab] && !isMgr) b.setAttribute("data-locked", ""); else b.removeAttribute("data-locked");
    });
    var mb = document.getElementById("mgrBtn");
    if (mb) { mb.textContent = isMgr ? "Khoá lại" : "Quản lý"; mb.classList.toggle("on", isMgr); mb.title = isMgr ? "Khoá các trang quản lý" : "Mở khoá Thu chi, Kho, Báo cáo"; }
    var pb = document.getElementById("pwBtn"); if (pb) pb.hidden = !isMgr;
  }
  // Chặn bấm vào tab quản lý khi đang khoá (chạy trước mọi xử lý của app)
  document.addEventListener("click", function (e) {
    if (isMgr) return;
    var b = e.target && e.target.closest && e.target.closest("[data-tab]");
    if (!b || !MGR_TABS[b.dataset.tab]) return;
    e.preventDefault(); e.stopImmediatePropagation();
    askUnlock(function () { b.click(); });
  }, true);

  function askUnlock(then) {
    if (!MGR_EMAIL) { gate('<div class="box"><h2>Chưa cài mật khẩu quản lý</h2><p>Thêm <code>SUPABASE_MANAGER_EMAIL</code> vào <code>config.js</code> (xem README).</p><button type="button" class="ghost" id="gX">Đóng</button></div>').querySelector("#gX").onclick = closeGate; return; }
    var g = gate('<form autocomplete="on"><h2>Trang dành cho quản lý</h2><p>Nhập mật khẩu để vào Thu chi, Kho &amp; món, Báo cáo.</p>' +
      '<input class="u" type="email" name="username" autocomplete="username" tabindex="-1" aria-hidden="true" value="' + esc(MGR_EMAIL) + '">' +
      '<label>Mật khẩu quản lý<input id="gPass" type="password" autocomplete="current-password" required></label>' +
      '<div class="err" id="gErr"></div><button type="submit" id="gBtn">Mở khoá</button><button type="button" class="ghost" id="gX">Quay lại bán hàng</button></form>');
    var pass = g.querySelector("#gPass"); setTimeout(function () { try { pass.focus(); } catch (e) {} }, 50);
    g.querySelector("#gX").onclick = closeGate;
    g.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault();
      var b = g.querySelector("#gBtn"), err = g.querySelector("#gErr");
      if (!navigator.onLine) { err.textContent = "Cần có mạng để mở khoá quản lý."; return; }
      b.disabled = true; b.textContent = "Đang kiểm tra…"; err.textContent = "";
      sb.auth.signInWithPassword({ email: MGR_EMAIL, password: pass.value }).then(function (r) {
        if (r.error) throw r.error;
        closeGate(); unlocked(); if (then) then();
      }).catch(function (x) {
        var m = String(x && x.message || "");
        setTimeout(function () {
          err.textContent = !navigator.onLine || /fetch|network/i.test(m) ? "Không có mạng, thử lại sau."
            : /rate|too many/i.test(m) ? "Nhập sai quá nhiều lần, đợi vài phút rồi thử lại."
            : "Sai mật khẩu.";
          b.disabled = false; b.textContent = "Mở khoá"; pass.select();
        }, 700);
      });
    });
  }
  function unlocked() {
    isMgr = true; lastAct = Date.now(); markTabs();
    flush().then(refreshAll).then(function () { setTimeout(checkSeed, 300); });
  }
  function lock() {
    if (!isMgr) return;
    isMgr = false;
    sb.auth.signOut({ scope: "local" }).catch(function () {});
    var eb = document.getElementById("editBar"), ec = document.getElementById("editCancel");
    if (eb && !eb.hidden && ec) ec.click();                                   // đang sửa đơn dở: huỷ
    ["ingPanel", "prodPanel", "voidPanel"].forEach(function (id) { var p = document.getElementById(id); if (p) p.hidden = true; });
    var sbar = document.getElementById("seedbar"); if (sbar) sbar.remove();
    purgeMgrData(); markTabs();
    var pos = document.querySelector('.tab[data-tab="pos"]'); if (pos) pos.click();
    refreshAll(); setNet();
  }
  setInterval(function () { if (isMgr && Date.now() - lastAct > IDLE_LOCK) lock(); }, 30000);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") { hiddenAt = Date.now(); return; }
    if (isMgr && hiddenAt && Date.now() - hiddenAt > AWAY_LOCK) lock();
  });

  function changePassword() {
    var g = gate('<form><h2>Đổi mật khẩu quản lý</h2><p>Ít nhất 8 ký tự. Máy khác sẽ dùng mật khẩu mới từ lần mở khoá sau.</p>' +
      '<input class="u" type="email" name="username" autocomplete="username" tabindex="-1" aria-hidden="true" value="' + esc(MGR_EMAIL) + '">' +
      '<label>Mật khẩu mới<input id="gP1" type="password" autocomplete="new-password" minlength="8" required></label>' +
      '<label>Nhập lại<input id="gP2" type="password" autocomplete="new-password" minlength="8" required></label>' +
      '<div class="err" id="gErr"></div><button type="submit" id="gBtn">Lưu mật khẩu</button><button type="button" class="ghost" id="gX">Thôi</button></form>');
    g.querySelector("#gX").onclick = closeGate;
    g.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault();
      var p1 = g.querySelector("#gP1").value, p2 = g.querySelector("#gP2").value, err = g.querySelector("#gErr"), b = g.querySelector("#gBtn");
      if (p1 !== p2) { err.textContent = "Hai lần nhập không giống nhau."; return; }
      if (!isMgr) { closeGate(); return; }
      b.disabled = true; b.textContent = "Đang lưu…";
      sb.auth.updateUser({ password: p1 }).then(function (r) {
        if (r.error) throw r.error;
        gate('<div class="box"><h2>Đã đổi mật khẩu</h2><p>Từ giờ dùng mật khẩu mới để mở khoá.</p><button type="button" id="gX">Xong</button></div>').querySelector("#gX").onclick = closeGate;
      }).catch(function (x) {
        var m = String(x && x.message || "");
        err.textContent = /weak|short|least|characters/i.test(m) ? "Mật khẩu quá yếu, chọn dài hơn." : /same/i.test(m) ? "Mật khẩu mới trùng mật khẩu cũ." : "Không đổi được: " + m;
        b.disabled = false; b.textContent = "Lưu mật khẩu";
      });
    });
  }

  /* ---------- khởi động (chế độ nhân viên) ---------- */
  var resolveReady, ready = new Promise(function (r) { resolveReady = r; });
  var started = false;
  function start() {
    if (started) return; started = true;
    var colls = ["products", "settings", "orders"];
    Promise.all(colls.map(function (c) { return idb.get("c:" + c).then(function (v) { if (v && v.data) cache[c] = v.data; }); }))
      .then(function () {
        purgeMgrData();     // phòng khi lần trước tắt app lúc đang mở khoá
        sb.channel("docs-live").on("postgres_changes", { event: "*", schema: "public", table: "docs" }, function (p) {
          var row = p.new && p.new.coll ? p.new : p.old; if (!row || !row.coll) return;
          if (!isMgr && MGR_COLLS.indexOf(row.coll) >= 0) return;
          var pend = pendingIds(row.coll); if (pend[row.id]) return;
          if (p.eventType === "DELETE") delete C(row.coll)[row.id]; else C(row.coll)[row.id] = p.new.data;
          persist(row.coll); notify(row.coll);
        }).subscribe(function (st) { if (st === "SUBSCRIBED") { flush(); refreshAll(); } });
        onBody(addChrome);
        window.__STANDALONE = true;
        resolveReady();
        setTimeout(refreshAll, 1200);
        var lastVis = Date.now();
        document.addEventListener("visibilitychange", function () {
          if (document.visibilityState === "visible" && Date.now() - lastVis > 120000) { flush().then(refreshAll); }
          lastVis = Date.now();
        });
        flush();
      });
  }
  start();

  var chromeAdded = false;
  function addChrome() {
    if (chromeAdded) return; chromeAdded = true;
    var st = document.querySelector(".status");
    if (st) {
      var b = document.createElement("button"); b.className = "mgrbtn"; b.type = "button"; b.id = "mgrBtn";
      b.addEventListener("click", function () { if (isMgr) lock(); else askUnlock(function () { var r = document.querySelector('.tab[data-tab="report"]'); if (r) r.click(); }); });
      var p = document.createElement("button"); p.className = "mgrbtn"; p.type = "button"; p.id = "pwBtn"; p.textContent = "Đổi mật khẩu"; p.hidden = true;
      p.addEventListener("click", changePassword);
      st.after(b); b.after(p);
    }
    markTabs();
    setInterval(setNet, 3000); setTimeout(setNet, 800);
  }

  function checkSeed() {
    if (!navigator.onLine || !isMgr) return;
    sb.from("docs").select("id").eq("coll", "products").limit(1).then(function (r) {
      if (r.error || (r.data && r.data.length) || !isMgr) return;
      topbar("seedbar", "Kho dữ liệu đang trống. Nạp menu 51 món, công thức mẫu và 39 nguyên liệu?", "Nạp dữ liệu", function (bar, btn) {
        btn.disabled = true; btn.textContent = "Đang nạp…";
        fetch("seed.json", { cache: "no-store" }).then(function (x) { return x.json(); }).then(function (seed) {
          var now = new Date().toISOString(), rows = [];
          Object.keys(seed).forEach(function (c) { Object.keys(seed[c]).forEach(function (id) {
            var d = seed[c][id]; if (c === "ingredients") d.baseAt = now; rows.push({ coll: c, id: id, data: d });
          }); });
          return sb.from("docs").upsert(rows).then(function (r) { if (r.error) throw r.error; });
        }).then(function () { bar.remove(); ["products", "ingredients", "settings"].forEach(function (c) { load(c, "*"); }); })
          .catch(function (e) { console.error(e); btn.disabled = false; btn.textContent = "Thử lại"; });
      });
    });
  }

  window.claude = { use: function (name) { return ready.then(function () { return name === "db" ? db : name === "user" ? userApi : null; }); } };
})();
