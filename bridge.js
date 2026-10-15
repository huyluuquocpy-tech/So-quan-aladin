/* Sổ quán The Aladin — cầu nối Firebase.
   App gốc gọi window.claude.use("db") / use("user"). File này cung cấp đúng hai thứ đó,
   nhưng dữ liệu nằm trên Firebase Firestore của quán (miễn phí), có lưu tạm khi mất mạng. */
(function () {
  "use strict";
  var cfg = window.FIREBASE_CONFIG;
  var css = document.createElement("style");
  css.textContent =
    ".gate{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:20px;background:rgba(247,239,228,.92);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-family:'Be Vietnam Pro',system-ui,sans-serif;color:#2b1d17}" +
    ".gate form,.gate .box{width:100%;max-width:360px;background:#fffdf8;border:1px solid rgba(120,80,50,.15);border-radius:18px;padding:22px;box-shadow:0 20px 50px -24px rgba(110,70,40,.5);display:flex;flex-direction:column;gap:12px}" +
    ".gate h1{margin:0;font-family:'Pinyon Script',Georgia,serif;font-weight:400;font-size:2.4rem;color:#8a2e1f;text-align:center;line-height:1}" +
    ".gate p{margin:0;font-size:.86rem;color:#6b574c;text-align:center}" +
    ".gate label{display:flex;flex-direction:column;gap:5px;font-size:.78rem;font-weight:600;color:#6b574c}" +
    ".gate input{font:inherit;font-size:16px;min-height:44px;padding:8px 12px;border:1.5px solid rgba(120,80,50,.18);border-radius:12px;background:#fff;color:#2b1d17}" +
    ".gate input:focus{outline:none;border-color:#0f7a84;box-shadow:0 0 0 4px rgba(24,160,164,.16)}" +
    ".gate button{font:inherit;font-weight:700;min-height:46px;border:0;border-radius:14px;background:linear-gradient(135deg,#0f7a84,#18a0a4);color:#fff;cursor:pointer}" +
    ".gate button:disabled{opacity:.5}" +
    ".gate .err{color:#b3311f;font-size:.84rem;text-align:center;min-height:1em}" +
    ".gate code{background:#f3e8d8;padding:1px 5px;border-radius:5px;font-size:.8rem}" +
    ".seedbar{position:fixed;left:50%;transform:translateX(-50%);top:calc(10px + env(safe-area-inset-top,0px));z-index:90;background:#2b1d17;color:#fff;border-radius:14px;padding:10px 12px;display:flex;gap:10px;align-items:center;font:600 .86rem 'Be Vietnam Pro',system-ui,sans-serif;max-width:calc(100% - 24px);box-shadow:0 14px 30px -12px rgba(0,0,0,.6)}" +
    ".seedbar button{font:inherit;border:0;border-radius:10px;padding:8px 12px;background:#18a0a4;color:#fff;cursor:pointer;white-space:nowrap}" +
    ".logout{font:600 .72rem 'Be Vietnam Pro',system-ui,sans-serif;border:1px solid rgba(120,80,50,.15);background:#fff;color:#6b574c;border-radius:99px;padding:5px 10px;cursor:pointer}";
  document.head.appendChild(css);

  function gate(html) {
    var g = document.querySelector(".gate");
    if (!g) { g = document.createElement("div"); g.className = "gate"; document.body.appendChild(g); }
    g.innerHTML = html; return g;
  }
  function onBody(fn) { if (document.body) fn(); else document.addEventListener("DOMContentLoaded", fn); }

  if (!cfg || !window.firebase) {
    window.claude = { use: function () { return Promise.resolve(null); } };
    onBody(function () {
      gate('<div class="box"><h1>The Aladin</h1><p>' + (!cfg
        ? 'App chưa được nối với kho dữ liệu. Mở file <code>config.js</code> và dán cấu hình Firebase vào (xem hướng dẫn trong README).'
        : 'Không tải được Firebase. Kiểm tra kết nối mạng rồi mở lại app.') + '</p></div>');
    });
    return;
  }

  firebase.initializeApp(cfg);
  var auth = firebase.auth();
  var fs = firebase.firestore();
  try { fs.settings({ ignoreUndefinedProperties: true, merge: true }); } catch (e) {}
  try { fs.enablePersistence({ synchronizeTabs: true }).catch(function () {}); } catch (e) {}

  /* Ghi dữ liệu: có mạng thì chờ máy chủ xác nhận (tối đa 4 giây), mất mạng thì lưu tạm trên máy và đi tiếp. */
  function soft(p) {
    if (!navigator.onLine) { p.catch(function (e) { console.warn(e); }); return Promise.resolve(); }
    return Promise.race([p, new Promise(function (r) { setTimeout(r, 4000); })]);
  }
  function wrapRef(r) {
    return {
      id: r.id, path: r.path,
      get: function () { return r.get(); },
      set: function (d) { return soft(r.set(d)); },
      update: function (d) { return soft(r.update(d)); },
      delete: function () { return soft(r.delete()); },
      onSnapshot: function (n, e) { return r.onSnapshot(n, e); },
      collection: function (p) { return wrapQ(r.collection(p)); }
    };
  }
  function wrapQ(q) {
    return {
      path: q.path,
      where: function (a, b, c) { return wrapQ(q.where(a, b, c)); },
      orderBy: function (a, d) { return wrapQ(q.orderBy(a, d)); },
      limit: function (n) { return wrapQ(q.limit(n)); },
      get: function () { return q.get(); },
      onSnapshot: function (n, e) { return q.onSnapshot(n, e); },
      doc: function (id) { return wrapRef(id ? q.doc(id) : q.doc()); },
      add: function (d) { var r = q.doc(); return soft(r.set(d)).then(function () { return wrapRef(r); }); }
    };
  }
  var db = { collection: function (p) { return wrapQ(fs.collection(p)); }, doc: function (p) { return wrapRef(fs.doc(p)); } };

  var names = {};
  var userApi = {
    id: function () { return Promise.resolve(auth.currentUser ? auth.currentUser.uid : null); },
    can: function () { return Promise.resolve(true); },
    isOwner: function () { return true; }, canEdit: function () { return true; },
    profiles: function (ids) {
      ids = [].concat(ids);
      return Promise.all(ids.map(function (id) {
        if (names[id] !== undefined) return null;
        return fs.doc("people/" + id).get().then(function (s) { names[id] = (s.exists && s.data().name) || ""; }).catch(function () { names[id] = ""; });
      })).then(function () {
        var out = {}; ids.forEach(function (id) { out[id] = { id: id, name: names[id] || "" }; }); return out;
      });
    }
  };

  var ready = new Promise(function (resolve) {
    var first = true;
    auth.onAuthStateChanged(function (u) {
      if (u) {
        var g = document.querySelector(".gate"); if (g) g.remove();
        var nm = (u.displayName || (u.email || "").split("@")[0] || "");
        names[u.uid] = nm;
        fs.doc("people/" + u.uid).set({ name: nm, email: u.email || "" }, { merge: true }).catch(function () {});
        onBody(addChrome);
        checkSeed();
        if (first) { first = false; resolve(); }
      } else {
        onBody(showLogin);
      }
    });
  });

  function showLogin() {
    var g = gate('<form autocomplete="on"><h1>The Aladin</h1><p>Đăng nhập Sổ quán</p>' +
      '<label>Email<input id="gEmail" type="email" autocomplete="username" required></label>' +
      '<label>Mật khẩu<input id="gPass" type="password" autocomplete="current-password" required></label>' +
      '<div class="err" id="gErr"></div><button type="submit" id="gBtn">Đăng nhập</button></form>');
    g.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault();
      var b = g.querySelector("#gBtn"), err = g.querySelector("#gErr");
      b.disabled = true; b.textContent = "Đang đăng nhập…"; err.textContent = "";
      auth.signInWithEmailAndPassword(g.querySelector("#gEmail").value.trim(), g.querySelector("#gPass").value)
        .catch(function (x) {
          var c = x && x.code || "";
          err.textContent = /network/.test(c) ? "Không có mạng. Lần đăng nhập đầu tiên cần có mạng."
            : /too-many/.test(c) ? "Thử sai quá nhiều lần, đợi vài phút rồi thử lại."
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
        if (b.dataset.armed) { auth.signOut().then(function () { location.reload(); }); return; }
        b.dataset.armed = "1"; b.textContent = "Bấm lần nữa"; setTimeout(function () { b.dataset.armed = ""; b.textContent = "Đăng xuất"; }, 3000);
      });
      st.after(b);
    }
    function net() {
      var t = document.getElementById("statusTxt"), d = document.getElementById("dot"); if (!t || !d) return;
      if (navigator.onLine) { t.textContent = "Đã đồng bộ"; d.className = "dot ok"; }
      else { t.textContent = "Mất mạng · đang lưu tạm"; d.className = "dot bad"; }
    }
    window.addEventListener("online", net); window.addEventListener("offline", net);
    setTimeout(net, 1500);
  }

  function checkSeed() {
    fs.collection("products").limit(1).get({ source: "server" }).then(function (s) {
      if (!s.empty) return;
      onBody(function () {
        if (document.querySelector(".seedbar")) return;
        var bar = document.createElement("div"); bar.className = "seedbar";
        bar.innerHTML = '<span>Kho dữ liệu đang trống. Nạp menu 51 món, công thức và nguyên liệu?</span><button type="button">Nạp dữ liệu</button>';
        document.body.appendChild(bar);
        bar.querySelector("button").addEventListener("click", function () {
          var btn = this; btn.disabled = true; btn.textContent = "Đang nạp…";
          fetch("seed.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (seed) {
            var batch = fs.batch();
            Object.keys(seed).forEach(function (c) { Object.keys(seed[c]).forEach(function (id) { batch.set(fs.doc(c + "/" + id), seed[c][id]); }); });
            return batch.commit();
          }).then(function () { bar.remove(); }).catch(function (e) { btn.disabled = false; btn.textContent = "Thử lại"; console.error(e); });
        });
      });
    }).catch(function () {});
  }

  window.claude = {
    use: function (name) {
      return ready.then(function () { return name === "db" ? db : name === "user" ? userApi : null; });
    }
  };

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }
})();
