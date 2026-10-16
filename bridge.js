/* Sổ quán The Aladin — cầu nối Supabase.
   App gốc gọi window.claude.use("db") / use("user"). File này cung cấp đúng hai thứ đó,
   dữ liệu nằm trên Supabase của quán (bảng public.docs).
   - Mọi thay đổi được áp dụng ngay trên máy, đưa vào "hàng chờ" rồi gửi lên máy chủ.
     Mất mạng: hàng chờ giữ lại (localStorage), có mạng lại tự gửi.
   - Dữ liệu đã tải được lưu trong IndexedDB nên mở app khi mất mạng vẫn thấy menu, kho, đơn. */
(function () {
  "use strict";
  var URL_ = window.SUPABASE_URL, KEY_ = window.SUPABASE_ANON_KEY;
  var PAGE = 1000;

  /* ---------- giao diện phụ: đăng nhập, thanh nạp dữ liệu, cập nhật ---------- */
  var css = document.createElement("style");
  css.textContent =
    ".gate{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:20px;background:rgba(247,239,228,.94);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-family:'Be Vietnam Pro',system-ui,sans-serif;color:#2b1d17}" +
    ".gate form,.gate .box{width:100%;max-width:360px;background:#fffdf8;border:1px solid rgba(120,80,50,.15);border-radius:18px;padding:22px;box-shadow:0 20px 50px -24px rgba(110,70,40,.5);display:flex;flex-direction:column;gap:12px}" +
    ".gate h1{margin:0;font-family:'Pinyon Script',Georgia,serif;font-weight:400;font-size:2.4rem;color:#8a2e1f;text-align:center;line-height:1}" +
    ".gate p{margin:0;font-size:.86rem;color:#6b574c;text-align:center}" +
    ".gate label{display:flex;flex-direction:column;gap:5px;font-size:.78rem;font-weight:600;color:#6b574c}" +
    ".gate input{font:inherit;font-size:16px;min-height:44px;padding:8px 12px;border:1.5px solid rgba(120,80,50,.18);border-radius:12px;background:#fff;color:#2b1d17}" +
    ".gate input:focus{outline:none;border-color:#0f7a84;box-shadow:0 0 0 4px rgba(24,160,164,.16)}" +
    ".gate button{font:inherit;font-weight:700;min-height:46px;border:0;border-radius:14px;background:linear-gradient(135deg,#0f7a84,#18a0a4);color:#fff;cursor:pointer}" +
    ".gate button:disabled{opacity:.5}.gate .err{color:#b3311f;font-size:.84rem;text-align:center;min-height:1em}" +
    ".gate code{background:#f3e8d8;padding:1px 5px;border-radius:5px;font-size:.8rem}" +
    ".topbar{position:fixed;left:50%;transform:translateX(-50%);top:calc(10px + env(safe-area-inset-top,0px));z-index:90;background:#2b1d17;color:#fff;border-radius:14px;padding:10px 12px;display:flex;gap:10px;align-items:center;font:600 .86rem 'Be Vietnam Pro',system-ui,sans-serif;width:max-content;max-width:calc(100% - 24px);box-shadow:0 14px 30px -12px rgba(0,0,0,.6)}" +
    ".topbar button{font:inherit;border:0;border-radius:10px;padding:8px 12px;background:#18a0a4;color:#fff;cursor:pointer;white-space:nowrap}" +
    ".logout{font:600 .72rem 'Be Vietnam Pro',system-ui,sans-serif;border:1px solid rgba(120,80,50,.15);background:#fff;color:#6b574c;border-radius:99px;padding:5px 10px;cursor:pointer}";
  document.head.appendChild(css);
  function onBody(fn) { if (document.body) fn(); else document.addEventListener("DOMContentLoaded", fn); }
  function gate(html) {
    var g = document.querySelector(".gate");
    if (!g) { g = document.createElement("div"); g.className = "gate"; document.body.appendChild(g); }
    g.innerHTML = html; return g;
  }
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

  var sb = window.supabase.createClient(URL_, KEY_, { auth: { persistSession: true, autoRefreshToken: true } });

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
    var key = coll + "|" + from;
    if (loading[key]) return loading[key];
    loading[key] = fetchAll(coll, from).then(function (rows) {
      var c = C(coll), pend = pendingIds(coll), seen = {};
      rows.forEach(function (r) { seen[r.id] = 1; if (!pend[r.id]) c[r.id] = r.data; });
      Object.keys(c).forEach(function (id) {
        if (seen[id] || pend[id]) return;
        var d = c[id]; if (from === "*" || (d && d.day >= from)) delete c[id];
      });
      var m = meta[coll]; if (!m || from === "*" || (m.from !== "*" && from < m.from)) meta[coll] = { from: from, at: Date.now() };
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
    Object.keys(need).forEach(function (c) { load(c, need[c]); });
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
  function send(o) {
    if (o.op === "set") return sb.from("docs").upsert({ coll: o.coll, id: o.id, data: o.data });
    if (o.op === "merge") return sb.rpc("docs_merge", { p_coll: o.coll, p_id: o.id, p_patch: o.data });
    return sb.from("docs").delete().eq("coll", o.coll).eq("id", o.id);
  }
  var flushing = null;
  function flush() {
    if (flushing) return flushing;
    flushing = (function next() {
      if (!outbox.length || !navigator.onLine) return Promise.resolve();
      var o = outbox[0];
      return send(o).then(function (r) {
        if (r && r.error) throw r.error;
        outbox.shift(); saveOutbox(); if (o._ok) o._ok(); return next();
      }, function (e) { throw e; }).catch(function (e) {
        if (isNetErr(e)) { outbox.forEach(function (x) { if (x._ok) x._ok(); }); return; }   // giữ lại, thử sau
        outbox.shift(); saveOutbox();       // máy chủ từ chối: bỏ thao tác, tải lại dữ liệu đúng
        console.error("write rejected", e);
        if (o._fail) o._fail({ code: "invalid_argument", message: String(e.message || e) });
        load(o.coll, (meta[o.coll] && meta[o.coll].from) || "*");
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
      var o = { op: op, coll: coll, id: id, data: clone(data) };
      Object.defineProperty(o, "_ok", { value: resolve, enumerable: false });
      Object.defineProperty(o, "_fail", { value: reject, enumerable: false });
      outbox.push(o); saveOutbox();
      if (!navigator.onLine) { resolve(); return; }
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

  /* ---------- người dùng ---------- */
  var me = null, names = {};
  var userApi = {
    id: function () { return Promise.resolve(me ? me.id : null); },
    can: function () { return Promise.resolve(true); },
    isOwner: function () { return true; }, canEdit: function () { return true; },
    profiles: function (ids) {
      ids = [].concat(ids);
      var c = C("people"), out = {};
      ids.forEach(function (id) { out[id] = { id: id, name: (c[id] && c[id].name) || names[id] || "" }; });
      return Promise.resolve(out);
    }
  };

  /* ---------- trạng thái mạng ---------- */
  function setNet() {
    var t = document.getElementById("statusTxt"), d = document.getElementById("dot"); if (!t || !d || !me) return;
    if (!navigator.onLine) { t.textContent = "Mất mạng · lưu tạm " + (outbox.length ? outbox.length + " thao tác" : "trên máy"); d.className = "dot bad"; }
    else if (outbox.length) { t.textContent = "Đang gửi " + outbox.length + " thao tác…"; d.className = "dot"; }
    else { t.textContent = "Đã đồng bộ"; d.className = "dot ok"; }
  }

  /* ---------- khởi động ---------- */
  var resolveReady, ready = new Promise(function (r) { resolveReady = r; });
  var started = false;
  function start(user) {
    me = user; names[user.id] = (user.email || "").split("@")[0];
    var g = document.querySelector(".gate"); if (g) g.remove();
    if (started) return; started = true;
    var colls = ["products", "ingredients", "settings", "orders", "txns", "closings", "people"];
    Promise.all(colls.map(function (c) { return idb.get("c:" + c).then(function (v) { if (v && v.data) { cache[c] = v.data; meta[c] = v.meta || null; } }); }))
      .then(function () {
        if ((C("people")[user.id] || {}).email !== user.email) write("set", "people", user.id, { name: names[user.id], email: user.email || "" });
        sb.channel("docs-live").on("postgres_changes", { event: "*", schema: "public", table: "docs" }, function (p) {
          var row = p.new && p.new.coll ? p.new : p.old; if (!row || !row.coll) return;
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
        setTimeout(checkSeed, 1500);
      });
  }
  sb.auth.getSession().then(function (r) {
    var s = r && r.data && r.data.session;
    if (s && s.user) start(s.user); else onBody(showLogin);
  });
  sb.auth.onAuthStateChange(function (ev, s) { if (s && s.user && !started) start(s.user); });

  function showLogin() {
    var g = gate('<form autocomplete="on"><h1>The Aladin</h1><p>Đăng nhập Sổ quán</p>' +
      '<label>Email<input id="gEmail" type="email" autocomplete="username" required></label>' +
      '<label>Mật khẩu<input id="gPass" type="password" autocomplete="current-password" required></label>' +
      '<div class="err" id="gErr"></div><button type="submit" id="gBtn">Đăng nhập</button></form>');
    g.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault();
      var b = g.querySelector("#gBtn"), err = g.querySelector("#gErr");
      b.disabled = true; b.textContent = "Đang đăng nhập…"; err.textContent = "";
      sb.auth.signInWithPassword({ email: g.querySelector("#gEmail").value.trim(), password: g.querySelector("#gPass").value }).then(function (r) {
        if (r.error) throw r.error;
        start(r.data.user);
      }).catch(function (x) {
        var m = String(x && x.message || "");
        err.textContent = !navigator.onLine || /fetch|network/i.test(m) ? "Không có mạng. Lần đăng nhập đầu tiên cần có mạng."
          : /rate|too many/i.test(m) ? "Thử quá nhiều lần, đợi vài phút rồi thử lại."
          : "Email hoặc mật khẩu chưa đúng.";
        b.disabled = false; b.textContent = "Đăng nhập";
      });
    });
  }

  var chromeAdded = false;
  function addChrome() {
    if (chromeAdded) return; chromeAdded = true;
    var st = document.querySelector(".status");
    if (st) {
      var b = document.createElement("button"); b.className = "logout"; b.type = "button"; b.textContent = "Đăng xuất";
      b.addEventListener("click", function () {
        if (outbox.length) { b.textContent = "Còn dữ liệu chưa gửi"; setTimeout(function () { b.textContent = "Đăng xuất"; }, 2500); return; }
        if (b.dataset.armed) { sb.auth.signOut().then(function () { indexedDB.deleteDatabase("soquan"); location.reload(); }); return; }
        b.dataset.armed = "1"; b.textContent = "Bấm lần nữa"; setTimeout(function () { b.dataset.armed = ""; b.textContent = "Đăng xuất"; }, 3000);
      });
      st.after(b);
    }
    setInterval(setNet, 3000); setTimeout(setNet, 800);
  }

  function checkSeed() {
    if (!navigator.onLine) return;
    sb.from("docs").select("id").eq("coll", "products").limit(1).then(function (r) {
      if (r.error || (r.data && r.data.length)) return;
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
