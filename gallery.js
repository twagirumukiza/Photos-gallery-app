/*! photo-gallery — galerie slider embarquable (aucune dépendance)
 *  <photo-gallery></photo-gallery>
 *  Attributs : photos="photos"  base="https://..."  images="a.jpg,b.jpg"
 *              repo="user/repo"  branch="main"  autoplay="4000"
 *              formats="jpg,jpeg,png"  meta="photos/meta.json" (alt + commentaire par photo)
 *              thumbs="photos/thumbs" (dossier des miniatures)
 */
(function () {
  "use strict";
  var SCRIPT_BASE = document.currentScript ? document.currentScript.src.replace(/[^\/]*$/, "") : "";
  // Configuration globale facultative (générée par generateur.html) : window.PHOTO_GALLERY_CONFIG
  function cfg() { return window.PHOTO_GALLERY_CONFIG || {}; }
  function attr(el, k) {
    var v = el.getAttribute(k);
    if (v !== null && v !== "") return v;
    var d = cfg()[k];
    return d == null || typeof d === "object" ? null : String(d);
  }

  function extRe(f) {
    var l = (f || "jpg,jpeg,png").split(",").map(function (x) { return x.trim().replace(/^\./, "").toLowerCase(); }).filter(Boolean);
    return new RegExp("\\.(" + l.join("|") + ")$", "i");
  }

  var CSS = [
    ":host{display:block;--accent:#e8b04a;color:#fff;font-family:system-ui,sans-serif}",
    ".pg{background:#111;border-radius:12px;overflow:hidden;outline:none}",
    ".stage{position:relative;aspect-ratio:16/9;background:#000;display:flex;align-items:center;justify-content:center}",
    ".stage img{max-width:100%;max-height:100%;object-fit:contain;cursor:zoom-in;user-select:none}",
    ".nav{position:absolute;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;border:0;background:rgba(0,0,0,.5);color:#fff;font-size:22px;cursor:pointer;z-index:2}",
    ".nav:hover,.bar button:hover{background:rgba(255,255,255,.25)}",
    ".prev{left:12px}.next{right:12px}",
    ".count{position:absolute;bottom:10px;right:12px;background:rgba(0,0,0,.55);padding:2px 10px;border-radius:99px;font-size:13px}",
    ".thumbs{position:relative;display:flex;gap:6px;padding:8px;overflow-x:auto;scrollbar-width:thin}",
    ".thumbs button{flex:0 0 auto;padding:0;border:2px solid transparent;border-radius:6px;background:none;cursor:pointer;opacity:.55;transition:.2s}",
    ".thumbs button.on{border-color:var(--accent);opacity:1}",
    ".thumbs img{display:block;height:64px;width:auto;border-radius:4px}",
    ".cap{padding:10px 14px 2px;font-size:14px;line-height:1.4;color:#ddd}.cap:empty,.lbcap:empty{display:none}",
    ".lbcap{position:absolute;left:0;right:0;bottom:0;padding:16px 20px;text-align:center;font-size:15px;background:linear-gradient(transparent,rgba(0,0,0,.85));z-index:2;pointer-events:none}",
    ".msg{padding:24px;text-align:center;color:#aaa}",
    ".lb{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.95);display:none;touch-action:none;overflow:hidden}",
    ".lb.open{display:block}",
    ".lb img{position:absolute;left:50%;top:50%;max-width:92vw;max-height:80vh;user-select:none;-webkit-user-drag:none;cursor:zoom-in}",
    ".bar{position:absolute;top:0;right:0;display:flex;gap:6px;padding:12px;z-index:3}",
    ".bar button{width:40px;height:40px;border:0;border-radius:8px;background:rgba(255,255,255,.12);color:#fff;font-size:20px;cursor:pointer}"
  ].join("");

  // Déduit "utilisateur/dépôt" d'une URL GitHub Pages (user.github.io ou user.github.io/depot/)
  function guessRepo(base) {
    try {
      var u = new URL(base || location.href, location.href), m = u.hostname.match(/^(.+)\.github\.io$/i);
      if (!m) return "";
      var seg = u.pathname.split("/").filter(Boolean);
      return m[1] + "/" + (seg.length ? seg[0] : m[1] + ".github.io");
    } catch (e) { return ""; }
  }

  function load(el, base, dir, IMG) {
    if (!el.getAttribute("images") && Array.isArray(cfg().images)) return Promise.resolve(cfg().images.slice());
    if (attr(el, "images"))
      return Promise.resolve(attr(el, "images").split(",").map(function (s) { return s.trim(); }).filter(Boolean));
    return fetch(base + dir + "/manifest.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .catch(function () {
        var repo = attr(el, "repo") || guessRepo(base);
        if (!repo) throw new Error("Liste des photos introuvable : ajoutez photos/manifest.json ou l'attribut repo=\"user/depot\"");
        var ref = attr(el, "branch") ? "?ref=" + attr(el, "branch") : "";
        return fetch("https://api.github.com/repos/" + repo + "/contents/" + dir + ref)
          .then(function (r) { return r.json(); })
          .then(function (l) {
            if (!Array.isArray(l))
              throw new Error("Dossier /" + dir + " introuvable dans " + repo + " (" + ((l && l.message) || "erreur GitHub") + ")");
            return l.filter(function (f) { return f.type === "file" && IMG.test(f.name); })
              .map(function (f) { return f.name; });
          });
      })
      .then(function (l) {
        return l.filter(function (n) { return IMG.test(n); })
          .sort(function (a, b) { return a.localeCompare(b, undefined, { numeric: true }); });
      });
  }

  customElements.define("photo-gallery", class extends HTMLElement {
    connectedCallback() {
      var self = this, root = this.attachShadow({ mode: "open" });
      var base = attr(this, "base") || SCRIPT_BASE;
      if (base && !/\/$/.test(base)) base += "/";
      var dir = (attr(this, "photos") || "photos").replace(/\/$/, "");
      root.innerHTML = "<style>" + CSS + "</style><div class='pg' tabindex='0'><div class='msg'>Chargement…</div></div>";
      if (attr(this, "accent")) this.style.setProperty("--accent", attr(this, "accent"));
      var IMG = extRe(attr(this, "formats"));
      var metaUrl = attr(this, "meta") ? base + attr(this, "meta") : base + dir + "/meta.json";
      load(this, base, dir, IMG).then(function (names) {
        if (!names.length) throw new Error("Aucune photo trouvée dans /" + dir);
        var md = self.metaData || cfg().meta; if (md) { build(names, md); return; }
        return fetch(metaUrl, { cache: "no-cache" })
          .then(function (r) { return r.ok ? r.json() : {}; })
          .catch(function () { return {}; })
          .then(function (meta) { build(names, meta || {}); });
      }).catch(function (e) { root.querySelector(".pg").innerHTML = "<div class='msg'>" + e.message + "</div>"; });

      function build(names, meta) {
        var info = function (n) {
          var m = meta[n] || meta[n.replace(/\.[^.]+$/, "")] || {};
          if (typeof m === "string") m = { comment: m };
          return { alt: m.alt || n, comment: m.comment || "" };
        };
        var full = function (n) { return self.urlMap && self.urlMap[n] ? self.urlMap[n].full : base + dir + "/" + encodeURIComponent(n); };
        var tdir = (attr(self, "thumbs") || dir + "/thumbs").replace(/\/$/, "");
        var thumb = function (n) { return self.urlMap && self.urlMap[n] ? self.urlMap[n].thumb : base + tdir + "/" + encodeURIComponent(n); };
        var pg = root.querySelector(".pg");
        pg.innerHTML =
          "<div class='stage'><button class='nav prev' aria-label='Précédente'>❮</button>" +
          "<img alt=''><button class='nav next' aria-label='Suivante'>❯</button><span class='count'></span></div>" +
          "<div class='cap'></div><div class='thumbs'></div>";
        var lb = document.createElement("div");
        lb.className = "lb";
        lb.innerHTML = "<div class='bar'><button data-a='in' title='Zoom +'>+</button><button data-a='out' title='Zoom −'>−</button>" +
          "<button data-a='x' title='Fermer'>✕</button></div><button class='nav prev' aria-label='Précédente'>❮</button>" +
          "<img alt=''><button class='nav next' aria-label='Suivante'>❯</button><div class='lbcap'></div>";
        root.appendChild(lb);

        var main = pg.querySelector(".stage img"), count = pg.querySelector(".count");
        var strip = pg.querySelector(".thumbs"), big = lb.querySelector("img");
        var cap = pg.querySelector(".cap"), lbcap = lb.querySelector(".lbcap");
        var i = 0, btns = [];
        names.forEach(function (n, k) {
          var b = document.createElement("button"), im = document.createElement("img");
          im.src = thumb(n); im.loading = "lazy"; im.alt = info(n).alt;
          im.onerror = function () { im.onerror = null; im.src = full(n); };
          b.appendChild(im); b.onclick = function () { go(k); };
          strip.appendChild(b); btns.push(b);
        });

        function go(n) {
          i = (n + names.length) % names.length;
          main.src = full(names[i]); big.src = full(names[i]); var inf = info(names[i]);
          main.alt = big.alt = inf.alt; cap.textContent = lbcap.textContent = inf.comment;
          count.textContent = (i + 1) + " / " + names.length;
          btns.forEach(function (b, k) { b.classList.toggle("on", k === i); });
          var b = btns[i];
          strip.scrollTo({ left: b.offsetLeft - strip.clientWidth / 2 + b.clientWidth / 2, behavior: "smooth" });
          resetZoom();
        }

        // --- Slider
        pg.querySelector(".prev").onclick = function () { go(i - 1); };
        pg.querySelector(".next").onclick = function () { go(i + 1); };
        pg.addEventListener("keydown", function (e) {
          if (e.key === "ArrowLeft") go(i - 1);
          if (e.key === "ArrowRight") go(i + 1);
        });
        var sx = null;
        main.addEventListener("pointerdown", function (e) { sx = e.clientX; });
        main.addEventListener("pointerup", function (e) {
          if (sx === null) return;
          var dx = e.clientX - sx; sx = null;
          if (dx > 50) go(i - 1); else if (dx < -50) go(i + 1); else openLb();
        });
        var auto = parseInt(attr(self, "autoplay"), 10), timer;
        if (auto) {
          var start = function () { timer = setInterval(function () { go(i + 1); }, auto); };
          pg.onmouseenter = function () { clearInterval(timer); };
          pg.onmouseleave = start; start();
        }

        // --- Lightbox + zoom
        var s = 1, x = 0, y = 0, pts = new Map(), pd = 0, moved = false;
        function apply() {
          big.style.transform = "translate(-50%,-50%) translate(" + x + "px," + y + "px) scale(" + s + ")";
          big.style.cursor = s > 1 ? "grab" : "zoom-in";
        }
        function resetZoom() { s = 1; x = y = 0; apply(); }
        function zoom(f, cx, cy) {
          var ns = Math.min(8, Math.max(1, s * f));
          if (ns === 1) { x = y = 0; }
          else { x = cx - (cx - x) * ns / s; y = cy - (cy - y) * ns / s; }
          s = ns; apply();
        }
        function centered(e) { return [e.clientX - innerWidth / 2, e.clientY - innerHeight / 2]; }
        function key(e) {
          if (e.key === "Escape") closeLb();
          else if (e.key === "ArrowLeft") go(i - 1);
          else if (e.key === "ArrowRight") go(i + 1);
          else if (e.key === "+" || e.key === "=") zoom(1.4, 0, 0);
          else if (e.key === "-") zoom(1 / 1.4, 0, 0);
          else if (e.key === "0") resetZoom();
        }
        function openLb() { lb.classList.add("open"); document.addEventListener("keydown", key); resetZoom(); }
        function closeLb() { lb.classList.remove("open"); document.removeEventListener("keydown", key); pg.focus(); }

        lb.querySelector(".prev").onclick = function () { go(i - 1); };
        lb.querySelector(".next").onclick = function () { go(i + 1); };
        lb.querySelector(".bar").onclick = function (e) {
          var a = e.target.dataset.a;
          if (a === "x") closeLb(); else if (a === "in") zoom(1.4, 0, 0); else if (a === "out") zoom(1 / 1.4, 0, 0);
        };
        lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
        lb.addEventListener("wheel", function (e) {
          e.preventDefault(); var c = centered(e); zoom(e.deltaY < 0 ? 1.2 : 1 / 1.2, c[0], c[1]);
        }, { passive: false });
        big.addEventListener("dblclick", function (e) {
          if (s > 1) resetZoom(); else { var c = centered(e); zoom(2.5, c[0], c[1]); }
        });
        big.addEventListener("dragstart", function (e) { e.preventDefault(); });
        lb.addEventListener("pointerdown", function (e) {
          if (e.target !== big) return;
          pts.set(e.pointerId, [e.clientX, e.clientY]); moved = false;
          if (pts.size === 2) { var p = Array.from(pts.values()); pd = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]); }
        });
        lb.addEventListener("pointermove", function (e) {
          var prev = pts.get(e.pointerId); if (!prev) return;
          pts.set(e.pointerId, [e.clientX, e.clientY]);
          if (pts.size === 2) {
            var p = Array.from(pts.values()), d = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]);
            zoom(d / pd, (p[0][0] + p[1][0]) / 2 - innerWidth / 2, (p[0][1] + p[1][1]) / 2 - innerHeight / 2); pd = d;
          } else if (s > 1) { x += e.clientX - prev[0]; y += e.clientY - prev[1]; apply(); }
        });
        var up = function (e) { pts.delete(e.pointerId); };
        lb.addEventListener("pointerup", up); lb.addEventListener("pointercancel", up);

        go(0);
      }
    }
  });
})();
