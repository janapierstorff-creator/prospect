(function () {
  "use strict";

  var EN = document.documentElement.lang === "en";
  // Texte aus content/texts.yml (Abschnitt "meldungen"), beim Bauen in die Seite geschrieben
  var TEXT = window.PF_TEXT || {};
  var t = function (key) { return TEXT[key] || ""; };
  var esc = function (s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };

  // Icons (Lucide) rendern
  if (window.lucide) window.lucide.createIcons({ attrs: { "stroke-width": 1.75 } });

  // Inhalte einblenden, sobald sie in den Viewport kommen (Einschalten passiert früh im <head>)
  var root = document.documentElement;
  if (root.classList.contains("reveal") && "IntersectionObserver" in window) {
    // Einheiten, die als Ganzes erscheinen; Karussells und Formulare nicht in Einzelteile zerlegen
    var REVEAL = "main section :is(.kicker, h1, h2, h3, p, .btn, blockquote, figure, form, .choice, .a-card, .pf-stagewrap, [aria-live], " +
      ".cards-3, .cards-4, .steps-4, .facts4, .hero__facts, .values__list, .timing__cards, .pf-points, .cband__cols, .window__list, .faq-list, .final__perks, .need__note, .stats)";
    var units = Array.prototype.filter.call(document.querySelectorAll(REVEAL), function (el) {
      return !el.parentElement.closest(REVEAL) && !el.closest(".fill, [hidden]");
    });
    var io = new IntersectionObserver(function (entries) {
      var n = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.style.setProperty("--rv-d", Math.min(n++ * 90, 450) + "ms");
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    // Was beim Laden schon (auch nur angeschnitten) im Bild ist, sofort einblenden
    var vh = window.innerHeight, first = 0;
    var aboveFold = function (el) {
      if (el.closest(".hero, .ath-hero")) return true; // Hero immer komplett laden, auch was unterhalb des Bildschirms liegt
      var r = el.getBoundingClientRect(); return r.top < vh && r.bottom > 0 && (r.width || r.height);
    };
    units.forEach(function (el) {
      el.classList.add("rv");
      if (aboveFold(el)) {
        el.style.setProperty("--rv-d", Math.min(first++ * 90, 450) + "ms");
        requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add("is-in"); }); });
      } else io.observe(el);
    });

    // Bilder blenden mit leichtem Zoom ein, sobald sie im Viewport und fertig geladen sind
    var showImg = function (img) {
      if (img.dataset.inview && img.complete) img.classList.add("is-loaded");
    };
    var imgIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.dataset.inview = "1";
        showImg(entry.target);
        imgIO.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -5% 0px", threshold: 0.1 });
    document.querySelectorAll("main img").forEach(function (img) {
      img.addEventListener("load", function () { showImg(img); });
      img.addEventListener("error", function () { img.classList.add("is-loaded"); });
      if (aboveFold(img)) { img.dataset.inview = "1"; showImg(img); } else imgIO.observe(img);
    });
    root.classList.add("rv-ready");
  } else {
    root.classList.remove("reveal");
  }

  // Navigation: erst beim Scrollen mit Hintergrund (auf dem Handy steht sie fest oben, siehe CSS)
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // Mobile Navigation
  var nav = document.querySelector(".nav");
  var toggle = document.querySelector(".nav-toggle");
  if (nav && toggle) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.closest(".site-header").classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // Sprachwahl über DE/EN merken, damit die automatische Weiterleitung sie respektiert (siehe i18n/build_en.py)
  document.querySelectorAll(".lang-switch").forEach(function (link) {
    link.addEventListener("click", function () {
      try { localStorage.setItem("pf_lang", link.getAttribute("hreflang")); } catch (e) {}
    });
  });

  // Fehlende Bilder als Platzhalter markieren
  document.querySelectorAll(".media > img").forEach(function (img) {
    var mark = function () { img.parentElement.classList.add("is-missing"); };
    if (img.complete && img.naturalWidth === 0) mark();
    else img.addEventListener("error", mark);
  });

  // Karussell-Punkte für die Karten (nur mobil sichtbar, siehe CSS)
  document.querySelectorAll(".cards-3, .cards-4, .steps-4, .channels, .facts4, .hero__facts, .values__list").forEach(function (track) {
    var items = Array.prototype.slice.call(track.children);
    if (items.length < 2) return;
    var dots = document.createElement("div");
    dots.className = "dots";
    items.forEach(function (item, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", t("karussell.punkt_vorlesetext").replace("#", i + 1));
      b.addEventListener("click", function () {
        track.scrollTo({ left: item.offsetLeft - items[0].offsetLeft, behavior: "smooth" });
      });
      dots.appendChild(b);
    });
    track.insertAdjacentElement("afterend", dots);
    var update = function () {
      var max = track.scrollWidth - track.clientWidth;
      var step = items.length > 1 ? items[1].offsetLeft - items[0].offsetLeft : 1;
      var idx = max > 4 && track.scrollLeft >= max - 4 ? items.length - 1 : Math.round(track.scrollLeft / step);
      Array.prototype.forEach.call(dots.children, function (d, i) { d.classList.toggle("is-active", i === idx); });
    };
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  });

  // Plan-Karussell: Text und Handys wechseln gemeinsam
  document.querySelectorAll("[data-slider]").forEach(function (slider) {
    var slides = slider.querySelectorAll(".pf-slide");
    var phones = slider.querySelectorAll(".pf-stage .phone");
    var dots = slider.querySelectorAll(".pf-dots button");
    var active = 0;
    var show = function (index) {
      active = (index + slides.length) % slides.length;
      slides.forEach(function (s, i) { s.hidden = i !== active; });
      phones.forEach(function (p, i) { p.dataset.pos = (i - active + phones.length) % phones.length; });
      dots.forEach(function (d, i) { d.classList.toggle("is-active", i === active); });
      slider.querySelectorAll(".pf-count b").forEach(function (b) { b.textContent = "0" + (active + 1); });
    };
    slider.querySelectorAll("[data-next]").forEach(function (b) { b.addEventListener("click", function () { show(active + 1); }); });
    slider.querySelectorAll("[data-prev]").forEach(function (b) { b.addEventListener("click", function () { show(active - 1); }); });
    dots.forEach(function (d, i) { d.addEventListener("click", function () { show(i); }); });
    var startX = null;
    slider.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
    slider.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) show(active + (dx < 0 ? 1 : -1));
      startX = null;
    });
    show(0);
  });

  // "Schick es deinen Eltern": teilt die Eltern-Seite
  document.querySelectorAll("[data-share-parents]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      var url = new URL((EN ? "parents.html" : "eltern.html") + "?ref=spieler", location.href).href;
      var text = t("teilen.text");
      if (navigator.share) {
        navigator.share({ title: "ProspectFuel", text: text, url: url }).catch(function () {});
      } else {
        window.open("https://wa.me/?text=" + encodeURIComponent(text + " " + url), "_blank", "noopener");
      }
    });
  });

  // UTM-Parameter merken, damit sie auch nach Seitenwechsel mitgeschickt werden
  var params = new URLSearchParams(location.search);
  var utmKeys = ["utm_source", "utm_medium", "utm_campaign"];
  var utm = {};
  try { utm = JSON.parse(sessionStorage.getItem("pf_utm") || "{}"); } catch (e) {}
  utmKeys.forEach(function (k) { if (params.get(k)) utm[k] = params.get(k).slice(0, 100); });
  if (params.get("ref")) utm.utm_source = utm.utm_source || params.get("ref").slice(0, 100);
  try { sessionStorage.setItem("pf_utm", JSON.stringify(utm)); } catch (e) {}

  // Wartelisten-Formulare
  var cfg = window.PF_CONFIG || {};

  function successMarkup(role) {
    var text = t(role === "coach" ? "formular.erfolg_text_coach" : "formular.erfolg_text");
    return '<div class="form-success" role="status">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>' +
      '<h3>' + esc(t("formular.erfolg_titel")) + '</h3><p>' + esc(text) + "</p></div>";
  }

  function send(payload) {
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      console.warn("[ProspectFuel] Testmodus: Supabase ist nicht konfiguriert (js/config.js). Daten:", payload);
      return new Promise(function (resolve) { setTimeout(resolve, 500); });
    }
    return fetch(cfg.supabaseUrl.replace(/\/$/, "") + "/rest/v1/" + (cfg.table || "waitlist"), {
      method: "POST",
      headers: Object.assign({
        "Content-Type": "application/json",
        apikey: cfg.supabaseAnonKey,
        Prefer: "return=minimal"
      // Alter anon-Key (JWT, beginnt mit "eyJ") braucht zusätzlich den Authorization-Header,
      // der neue Publishable Key ("sb_publishable_…") nicht
      }, /^eyJ/.test(cfg.supabaseAnonKey) ? { Authorization: "Bearer " + cfg.supabaseAnonKey } : {}),
      body: JSON.stringify(payload)
    }).then(function (res) {
      // 409 = E-Mail ist für diese Rolle schon eingetragen → für die Person trotzdem ein Erfolg
      if (res.ok || res.status === 409) return;
      throw new Error("HTTP " + res.status);
    });
  }

  document.querySelectorAll("form[data-waitlist]").forEach(function (form) {
    // Kompaktes E-Mail-Formular: Rolle und Einwilligung erst beim Ausfüllen einblenden
    form.addEventListener("focusin", function () { form.classList.add("is-open"); });
    form.addEventListener("change", function () { form.classList.add("is-open"); }); // Safari fokussiert Radio-Buttons beim Klick nicht
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = form.querySelector(".form-msg");
      var btn = form.querySelector("button[type=submit]");
      if (msg) { msg.textContent = ""; msg.classList.remove("is-error"); }

      if (!form.reportValidity()) return;
      var data = new FormData(form);
      if (data.get("company")) return; // Honeypot: Bots füllen das versteckte Feld aus

      var role = data.get("role") || form.dataset.role;
      if (!role) {
        if (msg) { msg.textContent = t("formular.fehler_rolle"); msg.classList.add("is-error"); }
        return;
      }
      var age = parseInt(data.get("child_age"), 10);
      var payload = {
        email: String(data.get("email") || "").trim().toLowerCase(),
        role: role,
        // Felder einer zuvor gewählten anderen Rolle nicht mitschicken
        child_age: isNaN(age) || role !== "eltern" ? null : age,
        name: data.get("name") ? String(data.get("name")).trim() : null,
        club: data.get("club") && role === "coach" ? String(data.get("club")).trim() : null,
        sport: data.get("sport") ? String(data.get("sport")).trim() : null,
        consent: !!data.get("consent"),
        source_page: form.dataset.source || location.pathname,
        referrer: document.referrer ? document.referrer.slice(0, 300) : null,
        utm_source: utm.utm_source || null,
        utm_medium: utm.utm_medium || null,
        utm_campaign: utm.utm_campaign || null
      };

      btn.disabled = true;
      send(payload).then(function () {
        form.innerHTML = successMarkup(role);
      }).catch(function (err) {
        console.error(err);
        btn.disabled = false;
        if (msg) {
          msg.textContent = t("formular.fehler_senden");
          msg.classList.add("is-error");
        }
      });
    });
  });
})();
