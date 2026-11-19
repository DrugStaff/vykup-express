/* Výkup Express — interactions, i18n, form */
(function () {
  var D = document, R = D.documentElement, W = window;
  var I18N = W.VE_I18N || {}, C = W.VE_CONFIG || {};
  var LANGS = ["cs", "de", "ru"];
  var reduce = W.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = W.matchMedia("(hover: hover) and (pointer: fine)").matches;
  R.classList.add("js");
  var PM = document.querySelector('meta[name="ve-page"]');

  function $(s, el) { return (el || D).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || D).querySelectorAll(s)); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- language ---------- */
  function pickLang() {
    var q = (location.search.match(/[?&]lang=(cs|de|ru)/) || [])[1];
    if (q) return q;
    var s = store("ve_lang"); if (LANGS.indexOf(s) > -1) return s;
    var n = (navigator.languages || [navigator.language || "cs"]).join(",").toLowerCase();
    var first = n.split(",")[0].slice(0, 2);
    if (first === "de") return "de";
    if (first === "ru" || first === "uk" || first === "be") return "ru";
    return "cs";
  }
  var lang = pickLang();
  function t(k) { return (I18N[lang] && I18N[lang][k]) || (I18N.cs && I18N.cs[k]) || ""; }
  W.VE_t = function (k) { return t(k); };

  function applyLang(l, animate) {
    lang = l; R.lang = l === "cs" ? "cs" : l; store("ve_lang", l);
    $$("[data-i18n]").forEach(function (el) { var v = t(el.getAttribute("data-i18n")); if (v) el.textContent = v; });
    $$("[data-i18n-html]").forEach(function (el) { var v = t(el.getAttribute("data-i18n-html")); if (v) el.innerHTML = v; });
    $$("[data-i18n-ph]").forEach(function (el) { el.placeholder = t(el.getAttribute("data-i18n-ph")); });
    $$("[data-i18n-aria]").forEach(function (el) { el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria"))); });
    $$("[data-i18n-alt]").forEach(function (el) { el.alt = t(el.getAttribute("data-i18n-alt")); });
    if (W.VE_onLang) W.VE_onLang();
    var tk = PM && PM.getAttribute("data-title"); if (tk) D.title = t(tk);
    $$(".langs button").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-lang") === l ? "true" : "false"); });
    var ring = $("#ringText"); if (ring) ring.textContent = (t("seal.ring") || "").repeat(2);
    var lf = $("#f-lang"); if (lf) lf.value = l;
    if (animate) { $$(".hero h1 .ln > span").forEach(function (s) { s.classList.remove("word"); void s.offsetWidth; s.classList.add("word"); }); }
  }
  $$(".langs button").forEach(function (b) { b.addEventListener("click", function () { applyLang(b.getAttribute("data-lang"), true); }); });

  /* ---------- config → contacts ---------- */
  function fillConfig() {
    var digits = String(C.whatsapp || "").replace(/\D/g, "");
    $$("[data-cfg]").forEach(function (el) { el.textContent = C[el.getAttribute("data-cfg")] || ""; });
    $$("[data-wa]").forEach(function (a) { a.href = "https://wa.me/" + digits; a.target = "_blank"; a.rel = "noopener"; });
    $$("[data-tg]").forEach(function (a) { a.href = "https://t.me/" + String(C.telegram || "").replace(/^@/, ""); a.target = "_blank"; a.rel = "noopener"; });
    $$("[data-tel]").forEach(function (a) { a.href = "tel:" + String(C.phone || "").replace(/[^\d+]/g, ""); });
    $$("[data-mail]").forEach(function (a) { a.href = "mailto:" + (C.email || ""); });
  }
  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var v = C[b.getAttribute("data-copy")] || "";
      var done = function () { b.textContent = t("copied"); setTimeout(function () { b.textContent = t("copy"); }, 1600); };
      try { navigator.clipboard.writeText(v).then(done, function () { selectText(b); }); } catch (e) { selectText(b); }
    });
  });
  function selectText(b) {
    var dd = b.parentNode.querySelector("dd"); if (!dd) return;
    var r = D.createRange(); r.selectNodeContents(dd); var s = W.getSelection(); s.removeAllRanges(); s.addRange(r);
  }

  /* ---------- header + mobile nav ---------- */
  var hdr = $(".hdr");
  var pars = [];
  function parallax() {
    if (reduce) return;
    var vh = W.innerHeight;
    for (var i = 0; i < pars.length; i++) {
      var r = pars[i].parentNode.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) continue;
      var p = (r.top + r.height / 2 - vh / 2) / (vh + r.height);
      pars[i].style.transform = "translate3d(0," + (p * -14).toFixed(2) + "%,0)";
    }
  }
  function onScroll() { if (hdr) hdr.classList.toggle("scrolled", W.scrollY > 24); stackFx(); parallax(); }
  W.addEventListener("scroll", onScroll, { passive: true });
  var mnav = $(".mnav");
  function setMenu(open) {
    if (!mnav) return; mnav.classList.toggle("open", open); mnav.setAttribute("aria-hidden", open ? "false" : "true");
    D.body.style.overflow = open ? "hidden" : "";
    var b = $(".burger"); if (b) b.setAttribute("aria-expanded", open ? "true" : "false");
  }
  $$(".burger").forEach(function (b) { b.addEventListener("click", function () { setMenu(true); }); });
  $$(".mnav .close, .mnav nav a, .mnav .sub a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  D.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  /* ---------- reveal on scroll ---------- */
  var io = "IntersectionObserver" in W ? new IntersectionObserver(function (ents) {
    ents.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.remove("pre"); en.target.classList.add("in"); io.unobserve(en.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: .08 }) : null;
  function initReveal() {
    var vh = W.innerHeight;
    $$(".rv, .purity").forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (!io || reduce || r.top < vh * .92) { el.classList.add("in"); return; }
      if (el.classList.contains("rv")) el.classList.add("pre");
      io.observe(el);
    });
  }

  /* ---------- stacking process cards ---------- */
  var steps = [];
  function stackFx() {
    if (reduce || !steps.length) return;
    for (var i = 0; i < steps.length - 1; i++) {
      var next = steps[i + 1].getBoundingClientRect(), cur = steps[i].getBoundingClientRect();
      var p = Math.min(1, Math.max(0, (cur.bottom - next.top) / cur.height));
      steps[i].style.transform = "scale(" + (1 - p * .05).toFixed(4) + ")";
      steps[i].style.filter = "brightness(" + (1 - p * .35).toFixed(3) + ")";
    }
  }

  /* ---------- hero: spotlight, coin tilt, dust ---------- */
  function initHero() {
    var hero = $(".hero"); if (!hero) return;
    var coin = $(".seal .coin"), ang = 0;
    if (finePointer && !reduce) {
      hero.addEventListener("pointermove", function (e) {
        var r = hero.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        hero.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
        hero.style.setProperty("--my", (y * 100).toFixed(1) + "%");
        if (coin) {
          var c = coin.getBoundingClientRect(), cx = (e.clientX - c.left) / c.width, cy = (e.clientY - c.top) / c.height;
          coin.style.setProperty("--ry", ((cx - .5) * 18).toFixed(2) + "deg");
          coin.style.setProperty("--rx", ((.5 - cy) * 18).toFixed(2) + "deg");
          coin.style.setProperty("--lx", (Math.max(0, Math.min(1, cx)) * 100).toFixed(1) + "%");
          coin.style.setProperty("--ly", (Math.max(0, Math.min(1, cy)) * 100).toFixed(1) + "%");
        }
      });
    }
    if (coin && !reduce) {
      (function spinLight() { ang = (ang + .25) % 360; coin.style.setProperty("--ca", ang + "deg"); requestAnimationFrame(spinLight); })();
      if (!finePointer) {
        var t0 = performance.now();
        (function idle(now) {
          var k = (now - t0) / 1000;
          coin.style.setProperty("--lx", (50 + Math.cos(k * .6) * 28).toFixed(1) + "%");
          coin.style.setProperty("--ly", (42 + Math.sin(k * .8) * 22).toFixed(1) + "%");
          requestAnimationFrame(idle);
        })(t0);
      }
    }
    var cv = $("canvas.dust", hero); if (!cv || reduce) return;
    var ctx = cv.getContext("2d"), dpr = Math.min(2, W.devicePixelRatio || 1), P = [], w = 0, h = 0;
    function size() {
      w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(90, w * h / 14000)); P = [];
      for (var i = 0; i < n; i++) P.push({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.6 + .3, v: Math.random() * .25 + .05, a: Math.random() * Math.PI * 2, s: Math.random() * .02 + .005 });
    }
    size(); W.addEventListener("resize", size);
    var visible = true;
    if ("IntersectionObserver" in W) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(hero);
    (function loop() {
      if (visible) {
        ctx.clearRect(0, 0, w, h);
        for (var i = 0; i < P.length; i++) {
          var p = P[i]; p.y -= p.v; p.a += p.s; p.x += Math.sin(p.a) * .15;
          if (p.y < -4) { p.y = h + 4; p.x = Math.random() * w; }
          var o = .25 + Math.abs(Math.sin(p.a * 2)) * .6;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283);
          ctx.fillStyle = "rgba(244,224,170," + o.toFixed(3) + ")"; ctx.shadowColor = "rgba(214,178,110,.9)"; ctx.shadowBlur = p.r * 6; ctx.fill();
        }
      }
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- micro interactions ---------- */
  function initMicro() {
    if (finePointer && !reduce) {
      $$("[data-mag]").forEach(function (b) {
        b.addEventListener("pointermove", function (e) {
          var r = b.getBoundingClientRect();
          b.style.setProperty("--bx", ((e.clientX - r.left - r.width / 2) * .25).toFixed(1) + "px");
          b.style.setProperty("--by", ((e.clientY - r.top - r.height / 2) * .35).toFixed(1) + "px");
        });
        b.addEventListener("pointerleave", function () { b.style.setProperty("--bx", "0px"); b.style.setProperty("--by", "0px"); });
      });
      var cur = D.createElement("div"); cur.className = "cursor"; D.body.appendChild(cur);
      var tx = 0, ty = 0, cx = 0, cy = 0;
      D.addEventListener("pointermove", function (e) { tx = e.clientX; ty = e.clientY; cur.classList.add("on"); });
      D.addEventListener("pointerleave", function () { cur.classList.remove("on"); });
      (function follow() { cx += (tx - cx) * .2; cy += (ty - cy) * .2; cur.style.transform = "translate(" + cx + "px," + cy + "px)"; requestAnimationFrame(follow); })();
      D.addEventListener("pointerover", function (e) { cur.classList.toggle("big", !!e.target.closest("a, button, summary, label, .drop")); });
    }
    $$(".bitem").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty("--px", (e.clientX - r.left) + "px"); b.style.setProperty("--py", (e.clientY - r.top) + "px");
      });
    });
  }

  /* ---------- live watch (luxus page) ---------- */
  function initWatch() {
    var hh = $("#wh"), mm = $("#wm"), ss = $("#ws"), dig = $("#watchNow"); if (!hh) return;
    var fmt;
    try { fmt = new Intl.DateTimeFormat("cs-CZ", { timeZone: "Europe/Prague", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); } catch (e) { fmt = null; }
    function tick() {
      var parts = fmt ? fmt.format(new Date()).split(":").map(Number) : (function (d) { return [d.getHours(), d.getMinutes(), d.getSeconds()]; })(new Date());
      var h = parts[0], m = parts[1], s = parts[2];
      hh.setAttribute("transform", "rotate(" + ((h % 12) * 30 + m * .5) + " 200 200)");
      mm.setAttribute("transform", "rotate(" + (m * 6 + s * .1) + " 200 200)");
      ss.setAttribute("transform", "rotate(" + (s * 6) + " 200 200)");
      if (dig) dig.textContent = [h, m, s].map(function (n) { return String(n).padStart(2, "0"); }).join(":");
    }
    tick(); setInterval(tick, 1000);
  }

  /* ---------- page curtain ---------- */
  function initCurtain() {
    var cur = D.createElement("div"); cur.className = "curtain"; D.body.appendChild(cur);
    var came = null; try { came = sessionStorage.getItem("ve_curtain"); sessionStorage.removeItem("ve_curtain"); } catch (e) { }
    if (came && !reduce) { cur.classList.add("out"); setTimeout(function () { cur.classList.remove("out"); }, 800); }
    if (reduce) return;
    D.addEventListener("click", function (e) {
      var a = e.target.closest("a"); if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target) return;
      var href = a.getAttribute("href") || "";
      if (!/^[\w-]+\.html(#[\w-]+)?$/.test(href)) return;
      e.preventDefault();
      try { sessionStorage.setItem("ve_curtain", "1"); } catch (er) { }
      cur.classList.add("go");
      setTimeout(function () { location.href = href; }, 480);
    });
    W.addEventListener("pageshow", function (e) { if (e.persisted) cur.classList.remove("go"); });
  }

  /* ---------- form ---------- */
  function initForm() {
    var f = $("#offer-form"); if (!f) return;
    var files = [], thumbs = $("#thumbs", f), drop = $(".drop", f), input = $("#f-photos", f), msg = $("#f-msg", f);
    var btn = $("#f-submit", f), okBox = $("#form-ok"), body = $("#form-body");
    var pre = f.getAttribute("data-cat"); if (pre) { var sel = $("#f-cat", f); if (sel) sel.value = pre; }
    var catSel = $("#f-cat", f), hint = $("#f-cat-hint", f);
    if (catSel && hint) catSel.addEventListener("change", function () { hint.hidden = catSel.value !== "nemovitosti"; });
    if (W.VEStore && VEStore.mode === "demo") { var dn = $("#demo-note"); if (dn) dn.hidden = false; }

    function render() {
      thumbs.innerHTML = "";
      files.forEach(function (file, i) {
        var fig = D.createElement("figure"), img = D.createElement("img"), x = D.createElement("button");
        img.alt = ""; img.src = URL.createObjectURL(file); img.onload = function () { URL.revokeObjectURL(img.src); };
        x.type = "button"; x.textContent = "×"; x.setAttribute("aria-label", t("f.remove"));
        x.addEventListener("click", function () { files.splice(i, 1); render(); });
        fig.appendChild(img); fig.appendChild(x); thumbs.appendChild(fig);
      });
    }
    function add(list) {
      Array.prototype.forEach.call(list, function (file) {
        if (!/^image\//.test(file.type)) return;
        if (files.length >= 5) { msg.textContent = t("f.err.many"); return; }
        files.push(file);
      });
      render();
    }
    input.addEventListener("change", function () { add(input.files); input.value = ""; });
    ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
    ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); }); });
    drop.addEventListener("drop", function (e) { if (e.dataTransfer) add(e.dataTransfer.files); });

    f.addEventListener("submit", function (e) {
      e.preventDefault(); msg.textContent = "";
      var name = $("#f-name", f).value.trim(), phone = $("#f-phone", f).value.trim();
      $$(".fld", f).forEach(function (x) { x.classList.remove("bad"); });
      if (!name || !phone) {
        if (!name) $("#f-name", f).closest(".fld").classList.add("bad");
        if (!phone) $("#f-phone", f).closest(".fld").classList.add("bad");
        msg.textContent = t("f.err.req"); return;
      }
      if (phone.replace(/\D/g, "").length < 8) { $("#f-phone", f).closest(".fld").classList.add("bad"); msg.textContent = t("f.err.phone"); return; }
      if (!$("#f-gdpr", f).checked) { msg.textContent = t("f.err.gdpr"); return; }
      var cp = $("input[name=contact]:checked", f);
      var data = {
        name: name, phone: phone, category: $("#f-cat", f).value, city: $("#f-city", f).value,
        description: $("#f-desc", f).value, contact_pref: cp ? cp.value : "call", lang: lang,
        source_page: PM ? PM.content : ""
      };
      btn.disabled = true; var lbl = $("span", btn); lbl.textContent = t("f.sending");
      VEStore.submit(data, files).then(function () {
        body.hidden = true; okBox.hidden = false; files = []; render(); f.reset();
        if (pre) $("#f-cat", f).value = pre;
        okBox.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      }).catch(function () { msg.textContent = t("f.err.send"); }).then(function () {
        btn.disabled = false; lbl.textContent = t("f.submit");
      });
    });
    $("#f-again").addEventListener("click", function () { okBox.hidden = true; body.hidden = false; $("#f-name", f).focus(); });
  }

  /* ---------- photo picker (shared) ---------- */
  function photoPicker(drop, input, thumbs, msg) {
    var files = [];
    function render() {
      thumbs.innerHTML = "";
      files.forEach(function (file, i) {
        var fig = D.createElement("figure"), img = D.createElement("img"), x = D.createElement("button");
        img.alt = ""; img.src = URL.createObjectURL(file); img.onload = function () { URL.revokeObjectURL(img.src); };
        x.type = "button"; x.textContent = "×"; x.setAttribute("aria-label", t("f.remove"));
        x.addEventListener("click", function () { files.splice(i, 1); render(); });
        fig.appendChild(img); fig.appendChild(x); thumbs.appendChild(fig);
      });
    }
    function add(list) {
      Array.prototype.forEach.call(list, function (file) {
        if (!/^image\//.test(file.type)) return;
        if (files.length >= 5) { msg.textContent = t("f.err.many"); return; }
        files.push(file);
      });
      render();
    }
    input.addEventListener("change", function () { add(input.files); input.value = ""; });
    ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
    ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); }); });
    drop.addEventListener("drop", function (e) { if (e.dataTransfer) add(e.dataTransfer.files); });
    return { get: function () { return files.slice(); }, reset: function () { files = []; render(); } };
  }

  /* ---------- real-estate questionnaire (3 steps) ---------- */
  function initPropForm() {
    var f = $("#prop-form"); if (!f) return;
    var step = 1, N = 3, msg = $("#q-msg"), aside = $$("#wiz-aside li");
    var pick = photoPicker($(".drop", f), $("#q-photos"), $("#q-thumbs"), msg);
    if (W.VEStore && VEStore.mode === "demo") $("#q-demo-note").hidden = false;
    function val(n) { var x = $("input[name=" + n + "]:checked", f); return x ? x.value : ""; }
    function vals(n) { return $$("input[name=" + n + "]:checked", f).map(function (x) { return x.value; }); }
    function show(n) {
      step = n;
      $$(".wiz-step", f).forEach(function (fs) { fs.hidden = +fs.getAttribute("data-step") !== n; });
      $("#wiz-n").textContent = n;
      var nm = $("#wiz-name"); nm.setAttribute("data-i18n", "q.s" + n); nm.textContent = t("q.s" + n);
      $("#wiz-bar").style.width = (n / N * 100).toFixed(2) + "%";
      $("#q-back").hidden = n === 1; $("#q-next").hidden = n === N; $("#q-submit").hidden = n !== N;
      aside.forEach(function (li) { var s = +li.getAttribute("data-s"); li.classList.toggle("on", s === n); li.classList.toggle("done", s < n); });
      msg.textContent = "";
    }
    function typeFields() {
      var ty = val("ptype");
      $$("[data-only]", f).forEach(function (el) { el.hidden = !!ty && el.getAttribute("data-only").split(" ").indexOf(ty) < 0; });
    }
    $$("input[name=ptype]", f).forEach(function (r) { r.addEventListener("change", function () { $(".tiles", f).classList.remove("bad"); msg.textContent = ""; typeFields(); }); });
    // "lastenfrei" excludes the others and vice versa
    $$("input[name=burden]", f).forEach(function (c) {
      c.addEventListener("change", function () {
        if (!c.checked) return;
        $$("input[name=burden]", f).forEach(function (o) { if (o !== c && (c.value === "none" || o.value === "none")) o.checked = false; });
      });
    });
    function check(n) {
      msg.textContent = "";
      if (n === 1) {
        if (!val("ptype")) { $(".tiles", f).classList.add("bad"); msg.textContent = t("q.err.type"); return false; }
        if (!$("#q-address").value.trim()) { $("#q-address").closest(".fld").classList.add("bad"); msg.textContent = t("q.err.addr"); return false; }
        $("#q-address").closest(".fld").classList.remove("bad");
      }
      if (n === 3) {
        var name = $("#q-name").value.trim(), phone = $("#q-phone").value.trim();
        $$(".fld", f).forEach(function (x) { x.classList.remove("bad"); });
        if (!name || !phone) {
          if (!name) $("#q-name").closest(".fld").classList.add("bad");
          if (!phone) $("#q-phone").closest(".fld").classList.add("bad");
          msg.textContent = t("f.err.req"); return false;
        }
        if (phone.replace(/\D/g, "").length < 8) { $("#q-phone").closest(".fld").classList.add("bad"); msg.textContent = t("f.err.phone"); return false; }
        if (!$("#q-gdpr").checked) { msg.textContent = t("f.err.gdpr"); return false; }
      }
      return true;
    }
    function toTop() { var c = $("#dotaznik"); if (c && c.getBoundingClientRect().top < 60) c.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); }
    $("#q-next").addEventListener("click", function () { if (check(step)) { show(step + 1); toTop(); } });
    $("#q-back").addEventListener("click", function () { show(step - 1); toTop(); });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      if (step !== N) { if (check(step)) show(step + 1); return; }
      if (!check(1)) { show(1); check(1); return; }
      if (!check(3)) return;
      var num = function (id) { var v = $(id).value.trim(); return v === "" ? null : Number(v); };
      var details = {
        type: val("ptype"), address: $("#q-address").value.trim(), layout: $("#q-layout").value || null,
        area_m2: num("#q-area"), land_m2: num("#q-land"), ownership: val("own"), condition: val("cond"),
        burdens: vals("burden"), occupancy: val("occ"), timeline: val("when"), price_idea: num("#q-price"),
        email: $("#q-email").value.trim() || null
      };
      var cp = $("input[name=qcontact]:checked", f);
      var data = {
        name: $("#q-name").value, phone: $("#q-phone").value, category: "nemovitosti", city: details.address,
        description: $("#q-desc").value, contact_pref: cp ? cp.value : "call", lang: lang, source_page: "nemovitosti", details: details
      };
      var btn = $("#q-submit"), lbl = $("span", btn); btn.disabled = true; lbl.textContent = t("f.sending");
      VEStore.submit(data, pick.get()).then(function () {
        $("#q-body").hidden = true; $("#q-ok").hidden = false; pick.reset(); f.reset(); typeFields(); show(1);
        $("#q-ok").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      }).catch(function () { msg.textContent = t("f.err.send"); }).then(function () { btn.disabled = false; lbl.textContent = t("q.submit"); });
    });
    $("#q-again").addEventListener("click", function () { $("#q-ok").hidden = true; $("#q-body").hidden = false; });
    W.VE_onLang = function () { var nm = $("#wiz-name"); if (nm) nm.textContent = t("q.s" + step); };
    show(1); typeFields();
  }

  /* ---------- boot ---------- */
  fillConfig();
  applyLang(lang, false);
  initReveal();
  steps = $$(".step");
  onScroll();
  initHero();
  initMicro();
  initWatch();
  initCurtain();
  initForm();
  initPropForm();
  pars = $$("[data-par]"); parallax();
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  if (W.VEStore && VEStore.mode === "demo") { var fl = $(".demo-flag"); if (fl) fl.hidden = false; }
})();
