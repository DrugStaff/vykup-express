/* Výkup Express — data layer.
   demo: no Supabase keys → requests live in this browser (localStorage)
   live: Supabase table "requests" + private storage bucket "photos" */
(function () {
  var C = window.VE_CONFIG || {};
  var LIVE = !!(C.supabaseUrl && C.supabaseAnonKey);
  var KEY = "ve_requests_v1";
  var SB_SRC = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
  var sb = null, readyP = null;

  function uid() { return "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function readDemo() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } }
  function writeDemo(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; }
    catch (e) { return false; }
  }

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = src; s.async = true;
      s.onload = res; s.onerror = function () { rej(new Error("script")); };
      document.head.appendChild(s);
    });
  }

  function ready() {
    if (readyP) return readyP;
    if (!LIVE) { readyP = Promise.resolve(); return readyP; }
    readyP = (window.supabase ? Promise.resolve() : loadScript(SB_SRC)).then(function () {
      sb = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey);
    });
    return readyP;
  }

  // Downscale an image file → Blob (jpeg)
  function shrink(file, max, q) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var s = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? res(b) : rej(new Error("blob")); }, "image/jpeg", q);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error("img")); };
      img.src = url;
    });
  }
  function blobToDataURL(b) {
    return new Promise(function (res) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.readAsDataURL(b); });
  }

  function clean(d) {
    return {
      name: String(d.name || "").trim().slice(0, 120),
      phone: String(d.phone || "").trim().slice(0, 40),
      category: d.category || "ostatni",
      city: String(d.city || "").trim().slice(0, 80),
      description: String(d.description || "").trim().slice(0, 2000),
      contact_pref: d.contact_pref || "call",
      lang: d.lang || "cs",
      source_page: d.source_page || "",
      details: (d.details && typeof d.details === "object" && JSON.stringify(d.details).length < 4000) ? d.details : {}
    };
  }

  function submit(data, files) {
    files = (files || []).slice(0, 5);
    var rec = clean(data);
    return ready().then(function () {
      if (!LIVE) {
        return Promise.all(files.map(function (f) { return shrink(f, 720, .72).then(blobToDataURL); })).then(function (photos) {
          var list = readDemo();
          rec.id = uid(); rec.created_at = new Date().toISOString(); rec.status = "new";
          rec.offer_price = null; rec.note = ""; rec.photos = photos;
          list.unshift(rec);
          if (!writeDemo(list)) { rec.photos = []; list[0] = rec; writeDemo(list); }
          return rec;
        });
      }
      var folder = new Date().toISOString().slice(0, 10) + "/" + uid();
      return Promise.all(files.map(function (f, i) {
        return shrink(f, 1600, .82).then(function (b) {
          var path = folder + "/" + (i + 1) + ".jpg";
          return sb.storage.from("photos").upload(path, b, { contentType: "image/jpeg", upsert: false }).then(function (r) {
            if (r.error) throw r.error; return path;
          });
        });
      })).then(function (paths) {
        rec.photos = paths;
        return sb.from("requests").insert(rec).then(function (r) { if (r.error) throw r.error; return rec; });
      });
    });
  }

  function list() {
    return ready().then(function () {
      if (!LIVE) return readDemo();
      return sb.from("requests").select("*").order("created_at", { ascending: false }).limit(500).then(function (r) {
        if (r.error) throw r.error; return r.data || [];
      });
    });
  }

  function update(id, patch) {
    return ready().then(function () {
      if (!LIVE) {
        var l = readDemo(); l.forEach(function (x) { if (x.id === id) Object.assign(x, patch); }); writeDemo(l); return;
      }
      return sb.from("requests").update(patch).eq("id", id).then(function (r) { if (r.error) throw r.error; });
    });
  }

  function remove(rec) {
    return ready().then(function () {
      if (!LIVE) { writeDemo(readDemo().filter(function (x) { return x.id !== rec.id; })); return; }
      var p = (rec.photos && rec.photos.length) ? sb.storage.from("photos").remove(rec.photos) : Promise.resolve();
      return p.then(function () { return sb.from("requests").delete().eq("id", rec.id); }).then(function (r) { if (r && r.error) throw r.error; });
    });
  }

  function photoUrls(rec) {
    var ph = rec.photos || [];
    if (!LIVE || !ph.length) return Promise.resolve(ph);
    return ready().then(function () {
      return sb.storage.from("photos").createSignedUrls(ph, 3600).then(function (r) {
        if (r.error) return [];
        return r.data.map(function (x) { return x.signedUrl; });
      });
    });
  }

  function session() {
    if (!LIVE) return Promise.resolve({ demo: true });
    return ready().then(function () { return sb.auth.getSession(); }).then(function (r) { return r.data.session; });
  }
  function signIn(email, pw) {
    return ready().then(function () { return sb.auth.signInWithPassword({ email: email, password: pw }); })
      .then(function (r) { if (r.error) throw r.error; return r.data.session; });
  }
  function signOut() { return LIVE ? ready().then(function () { return sb.auth.signOut(); }) : Promise.resolve(); }

  function seedDemo() {
    if (LIVE) return;
    try { if (localStorage.getItem("ve_seeded")) return; localStorage.setItem("ve_seeded", "1"); } catch (e) { return; }
    var now = Date.now(), h = 3600e3;
    writeDemo(readDemo().concat([
      { id: uid(), created_at: new Date(now - .2 * h).toISOString(), name: "Ukázka · Jana M.", phone: "+420 724 555 010", category: "nemovitosti", city: "Jirkov, Studentská 8", description: "Byt po rodičích, 4. patro s výtahem, sklep. Potřebujeme prodat do Vánoc.", contact_pref: "call", lang: "cs", status: "new", offer_price: null, note: "", photos: [], source_page: "nemovitosti", details: { type: "byt", address: "Jirkov, Studentská 8", layout: "3+1", area_m2: 68, land_m2: null, ownership: "os", condition: "reno", burdens: ["mort"], occupancy: "free", timeline: "asap", price_idea: 2900000, email: null } },
      { id: uid(), created_at: new Date(now - .4 * h).toISOString(), name: "Ukázka · Petra K.", phone: "+420 777 123 456", category: "zlato", city: "Chomutov", description: "Zlatý řetízek 585, asi 14 g, a dva prsteny po babičce.", contact_pref: "whatsapp", lang: "cs", status: "new", offer_price: null, note: "", photos: [], source_page: "zlato" },
      { id: uid(), created_at: new Date(now - 5 * h).toISOString(), name: "Ukázka · Thomas W.", phone: "+49 151 2345 678", category: "auta", city: "Annaberg-Buchholz", description: "Škoda Octavia 2012, 240 000 km, ohne TÜV, springt nicht an.", contact_pref: "call", lang: "de", status: "contacted", offer_price: null, note: "Volat po 17:00", photos: [], source_page: "auta" },
      { id: uid(), created_at: new Date(now - 26 * h).toISOString(), name: "Ukázka · Олег", phone: "+420 608 987 654", category: "elektronika", city: "Praha", description: "iPhone 14 Pro 256 GB, треснутое заднее стекло, батарея 88 %.", contact_pref: "telegram", lang: "ru", status: "offer", offer_price: 9500, note: "Nabídnuto 9 500 Kč, čeká na odpověď", photos: [], source_page: "elektronika" },
      { id: uid(), created_at: new Date(now - 50 * h).toISOString(), name: "Ukázka · Martin S.", phone: "+420 731 222 333", category: "luxus", city: "Most", description: "Omega Seamaster, box i papíry, servis 2023.", contact_pref: "call", lang: "cs", status: "bought", offer_price: 62000, note: "Vykoupeno v hotovosti", photos: [], source_page: "luxus" }
    ]));
  }

  window.VEStore = {
    mode: LIVE ? "live" : "demo", ready: ready, submit: submit, list: list, update: update, remove: remove,
    photoUrls: photoUrls, session: session, signIn: signIn, signOut: signOut, seedDemo: seedDemo
  };
})();
