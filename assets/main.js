/* annabelle-grimes.com: site interactions */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Toast ---------- */
  var toastEl = $('#toast'), toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2400);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? resolve() : reject(); } catch (e) { reject(e); }
      document.body.removeChild(ta);
    });
  }

  /* ---------- Year ---------- */
  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  /* ---------- Theme ---------- */
  var root = document.documentElement;
  function currentTheme() {
    var set = root.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  var themeBtn = $('#theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  /* ---------- Nav ---------- */
  var nav = $('.nav'), hero = $('.hero');
  function onScroll() {
    var limit = hero ? hero.offsetHeight - 80 : 40;
    nav.classList.toggle('is-solid', window.scrollY > limit);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var menuBtn = $('#menu-toggle'), links = $('#nav-links');
  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      menuBtn.setAttribute('aria-expanded', String(open));
      if (open) nav.classList.add('is-solid'); else onScroll();
    });
    $$('a', links).forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('is-open');
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // highlight the section in view
  if ('IntersectionObserver' in window) {
    var navMap = {};
    $$('.nav__links a').forEach(function (a) { navMap[a.getAttribute('href').slice(1)] = a; });
    var secObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && navMap[e.target.id]) {
          $$('.nav__links a').forEach(function (a) { a.classList.remove('is-current'); });
          navMap[e.target.id].classList.add('is-current');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(navMap).forEach(function (id) { var s = document.getElementById(id); if (s) secObs.observe(s); });
  }

  /* ---------- Reveal on scroll ---------- */
  if ('IntersectionObserver' in window && !reduceMotion) {
    var revealEls = $$('.section .kicker, .section h2, .about__text p, .facts, .card, .contact__item');
    var revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); revObs.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el, i) {
      el.classList.add('reveal');
      el.style.transitionDelay = (i % 4) * 60 + 'ms';
      revObs.observe(el);
    });
  }

  /* ---------- Chip filters ---------- */
  function setActiveChip(group, btn) {
    $$('.chip', group).forEach(function (c) {
      var on = c === btn;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-pressed', String(on));
    });
  }

  // Projects
  var projGroup = $('[data-filter-group="projects"]');
  if (projGroup) projGroup.addEventListener('click', function (ev) {
    var btn = ev.target.closest('.chip'); if (!btn) return;
    setActiveChip(projGroup, btn);
    var f = btn.getAttribute('data-filter');
    $$('#project-list .card').forEach(function (card) {
      card.classList.toggle('is-hidden', f !== 'all' && card.getAttribute('data-cat') !== f);
    });
  });

  // Publications
  var pubGroup = $('[data-filter-group="pubs"]'), pubSearch = $('#pub-search');
  var pubTopic = 'all';
  var pubs = $$('#pub-list .pub');
  function filterPubs() {
    var q = (pubSearch ? pubSearch.value : '').trim().toLowerCase();
    var shown = 0;
    pubs.forEach(function (p) {
      var topicOk = pubTopic === 'all' || p.getAttribute('data-topic') === pubTopic;
      var text = (p.textContent + ' ' + p.getAttribute('data-topic')).toLowerCase();
      var qOk = !q || q.split(/\s+/).every(function (w) { return text.indexOf(w) !== -1; });
      var ok = topicOk && qOk;
      p.classList.toggle('is-hidden', !ok);
      if (ok) shown++;
    });
    var cnt = $('#pub-count');
    if (cnt) cnt.textContent = 'Showing ' + shown + ' of ' + pubs.length + '.';
    var empty = $('#pub-empty'); if (empty) empty.hidden = shown !== 0;
  }
  if (pubGroup) pubGroup.addEventListener('click', function (ev) {
    var btn = ev.target.closest('.chip'); if (!btn) return;
    setActiveChip(pubGroup, btn);
    pubTopic = btn.getAttribute('data-filter');
    filterPubs();
  });
  if (pubSearch) pubSearch.addEventListener('input', filterPubs);
  filterPubs();

  /* ---------- Abstracts & citations ---------- */
  var BIB = {
    'Zielinska:2026ego': '@article{Zielinska:2026ego,\n    author = "Zieli{\\\'n}ska, M. and others",\n    title = "{Collectivity of the deformed structure in $^{96}$Zr from complementary Coulomb-excitation and {\\ensuremath{\\beta}}-decay measurements}",\n    doi = "10.1016/j.physletb.2026.140481",\n    journal = "Phys. Lett. B",\n    volume = "877",\n    pages = "140481",\n    year = "2026"\n}',
    'Aghaei:2025cvt': '@article{Aghaei:2025cvt,\n    author = "Aghaei, O. and others",\n    title = "{Long term study of sedimentation and biofouling at cascadia basin, the site of the pacific ocean neutrino experiment}",\n    eprint = "2507.09086",\n    archivePrefix = "arXiv",\n    primaryClass = "hep-ex",\n    doi = "10.1140/epjc/s10052-026-15319-6",\n    journal = "Eur. Phys. J. C",\n    volume = "86",\n    number = "2",\n    pages = "172",\n    year = "2026"\n}',
    'P-ONE:2025nre': '@article{P-ONE:2025nre,\n    author = "Agostini, M. and others",\n    collaboration = "P-ONE",\n    title = "{Prototype acoustic positioning system for the Pacific Ocean Neutrino Experiment}",\n    eprint = "2504.13323",\n    archivePrefix = "arXiv",\n    primaryClass = "physics.ins-det",\n    doi = "10.1088/1748-0221/20/07/P07003",\n    journal = "JINST",\n    volume = "20",\n    pages = "P07003",\n    year = "2025"\n}',
    'Williams:2025yrp': '@article{Williams:2025yrp,\n    author = "Williams, M. and others",\n    title = "{First Measurement of a Weak r-Process Reaction on a Radioactive Nucleus}",\n    doi = "10.1103/PhysRevLett.134.112701",\n    journal = "Phys. Rev. Lett.",\n    volume = "134",\n    number = "11",\n    pages = "112701",\n    year = "2025"\n}',
    'Russell:2024gxd': '@article{Russell:2024gxd,\n    author = "Russell, R. and others",\n    title = "{Coulomb excitation of Sr80 and the limits of the N{\\ensuremath{\\approx}}Z{\\ensuremath{\\approx}}40 island of deformation}",\n    eprint = "2408.08410",\n    archivePrefix = "arXiv",\n    primaryClass = "nucl-ex",\n    doi = "10.1103/t91y-l6rf",\n    journal = "Phys. Rev. C",\n    volume = "112",\n    number = "1",\n    pages = "014309",\n    year = "2025"\n}'
  };

  var pubList = $('#pub-list');
  if (pubList) pubList.addEventListener('click', function (ev) {
    var btn = ev.target.closest('button[data-action]'); if (!btn) return;
    var pub = btn.closest('.pub');
    var action = btn.getAttribute('data-action');
    if (action === 'abstract') {
      var abs = $('.pub__abstract', pub);
      var open = abs.hidden;
      abs.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
    } else if (action === 'cite') {
      var bib = BIB[pub.getAttribute('data-key')];
      if (!bib) return;
      copyText(bib).then(function () { toast('BibTeX copied to clipboard'); },
                         function () { toast('Copy failed. Try the INSPIRE link instead.'); });
    }
  });

  // flash a publication when linked to from elsewhere on the page
  $$('a[href^="#pub-"]').forEach(function (a) {
    a.addEventListener('click', function () {
      var target = document.getElementById(a.getAttribute('href').slice(1));
      if (!target) return;
      // make sure filters don't hide it
      if (pubGroup) { setActiveChip(pubGroup, $('[data-filter="all"]', pubGroup)); pubTopic = 'all'; }
      if (pubSearch) pubSearch.value = '';
      filterPubs();
      target.classList.add('is-flash');
      setTimeout(function () { target.classList.remove('is-flash'); }, 1800);
    });
  });

  /* ---------- CV tabs ---------- */
  var tabs = $$('.tabs [role="tab"]');
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab); });
    tab.addEventListener('keydown', function (e) {
      var k = e.key, n = null;
      if (k === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      else if (k === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (k === 'Home') n = tabs[0];
      else if (k === 'End') n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); selectTab(n, true); }
    });
  });

  var printBtn = $('#print-cv');
  if (printBtn) printBtn.addEventListener('click', function () {
    toast('Choose "Save as PDF" as the printer');
    setTimeout(function () { window.print(); }, 350);
  });

  /* ---------- Email ---------- */
  var emailBtn = $('#email-btn');
  if (emailBtn) emailBtn.addEventListener('click', function () {
    var addr = emailBtn.getAttribute('data-u') + '@' + emailBtn.getAttribute('data-d');
    var label = $('#email-label');
    copyText(addr).then(function () {
      toast('Email address copied');
    }, function () {
      window.location.href = 'mailto:' + addr;
    });
    if (label) label.textContent = addr;
  });

  /* ==========================================================
     Hero: deep-sea neutrino telescope
     Detector lines anchored to the seafloor sway in the current.
     Neutrino-induced muon tracks light up nearby optical modules,
     and seafloor pingers send acoustic pulses (click to add your own).
     ========================================================== */
  (function ocean() {
    var c = $('#ocean'); if (!c || !c.getContext) return;
    var ctx = c.getContext('2d');
    var W = 0, H = 0, floorY = 0, dpr = 1;
    var lines = [], snow = [], pingers = [], rings = [], tracks = [];
    var t = 0, last = 0, raf = 0, inView = true;
    var nextTrack = 1.6, nextPing = 3.2, pingIdx = 0;

    // small seeded RNG so the layout is stable between visits
    var seed = 20240901;
    function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var r = Math.imul(seed ^ seed >>> 15, 1 | seed); r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r; return ((r ^ r >>> 14) >>> 0) / 4294967296; }

    function build() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = c.clientWidth; H = c.clientHeight;
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      floorY = H - 26;
      seed = 20240901;

      var n = Math.max(5, Math.min(16, Math.round(W / 105)));
      lines = [];
      for (var i = 0; i < n; i++) {
        var depth = 0.45 + rnd() * 0.55;           // 1 = near, small = far
        var x0 = (i + 0.5) * W / n + (rnd() - 0.5) * (W / n) * 0.5;
        var top = H * (0.1 + (1 - depth) * 0.22 + rnd() * 0.05);
        var m = Math.round(9 + depth * 7);
        // keep the float (one spacing above the top module) clear of the nav bar
        var q = 1 / (m + 0.4), minFloat = 84;
        top = Math.max(top, (minFloat + floorY * q) / (1 + q));
        var mods = [];
        for (var k = 0; k < m; k++) mods.push({ f: (k + 1) / (m + 0.4), glow: 0, ac: 0, x: x0, y: 0, hit: -1 });
        lines.push({ x0: x0, top: top, depth: depth, mods: mods, phase: rnd() * 6.283, amp: 9 + rnd() * 15 });
      }
      lines.sort(function (a, b) { return a.depth - b.depth; });

      pingers = [0.16, 0.52, 0.86].map(function (p) { return { x: W * p, y: floorY + 4 }; });

      var count = Math.round(W * H / 7000);
      snow = [];
      for (var s = 0; s < count; s++) snow.push({ x: rnd() * W, y: rnd() * H, r: 0.4 + rnd() * 1.2, v: 4 + rnd() * 10, a: 0.08 + rnd() * 0.22 });
      positionModules();
    }

    function positionModules() {
      for (var i = 0; i < lines.length; i++) {
        var L = lines[i], span = floorY - L.top;
        var sway = Math.sin(t * 0.32 + L.phase) + 0.35 * Math.sin(t * 0.83 + L.phase * 1.7);
        for (var k = 0; k < L.mods.length; k++) {
          var m = L.mods[k];
          var dx = L.amp * L.depth * Math.pow(m.f, 1.6) * sway;
          m.x = L.x0 + dx;
          m.y = floorY - m.f * span;
        }
        // float: one module-spacing above the top module, on the same swaying line
        var fb = (L.mods.length + 1) / (L.mods.length + 0.4);
        var top = L.mods[L.mods.length - 1];
        var bx = L.x0 + L.amp * L.depth * Math.pow(fb, 1.6) * sway;
        var by = floorY - fb * span;
        L.buoy = { x: bx, y: by, ang: Math.atan2(bx - top.x, top.y - by) };
      }
    }

    function roundSquare(cx, cy, size, r, ang) {
      var h = size / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(-h + r, -h);
      ctx.lineTo(h - r, -h); ctx.quadraticCurveTo(h, -h, h, -h + r);
      ctx.lineTo(h, h - r);  ctx.quadraticCurveTo(h, h, h - r, h);
      ctx.lineTo(-h + r, h); ctx.quadraticCurveTo(-h, h, -h, h - r);
      ctx.lineTo(-h, -h + r); ctx.quadraticCurveTo(-h, -h, -h + r, -h);
      ctx.closePath();
      ctx.restore();
    }

    function addRing(x, y, user) {
      rings.push({ x: x, y: y, r: 0, id: Math.random(), user: !!user });
    }

    function addTrack() {
      // a muon from an up-going or down-going neutrino crossing the array
      var fromLeft = Math.random() < 0.5;
      var angle = (fromLeft ? 0.25 : Math.PI - 0.25) + (Math.random() - 0.5) * 0.9;
      var cx = W * (0.35 + Math.random() * 0.5), cy = H * (0.3 + Math.random() * 0.4);
      var len = Math.hypot(W, H);
      var dx = Math.cos(angle), dy = Math.sin(angle);
      tracks.push({ sx: cx - dx * len / 2, sy: cy - dy * len / 2, dx: dx, dy: dy, d: 0, len: len, speed: Math.max(W, 700) * 0.85 });
    }

    function step(dt) {
      t += dt;
      positionModules();

      // automatic events
      nextTrack -= dt; nextPing -= dt;
      if (nextTrack <= 0) { addTrack(); nextTrack = 5 + Math.random() * 5; }
      if (nextPing <= 0) { var p = pingers[pingIdx++ % pingers.length]; addRing(p.x, p.y, false); nextPing = 6.5 + Math.random() * 3; }

      var maxR = Math.hypot(W, H);
      for (var r = rings.length - 1; r >= 0; r--) {
        var R = rings[r];
        R.r += 300 * dt;
        if (R.r > maxR) { rings.splice(r, 1); continue; }
        eachModule(function (m) {
          if (m.hit === R.id) return;
          var dist = Math.hypot(m.x - R.x, m.y - R.y);
          if (Math.abs(dist - R.r) < 300 * dt + 2) { m.ac = 1; m.hit = R.id; }
        });
      }

      for (var j = tracks.length - 1; j >= 0; j--) {
        var T = tracks[j];
        T.d += T.speed * dt;
        if (T.d > T.len + 300) { tracks.splice(j, 1); continue; }
        var hx = T.sx + T.dx * T.d, hy = T.sy + T.dy * T.d;
        eachModule(function (m) {
          var ex = m.x - hx, ey = m.y - hy;
          var along = ex * T.dx + ey * T.dy;           // behind the head is negative
          if (along > 10 || along < -180) return;
          var perp = Math.abs(ex * T.dy - ey * T.dx);
          if (perp < 110) m.glow = Math.min(1, m.glow + (1 - perp / 110) * dt * 7);
        });
      }

      eachModule(function (m) { m.glow *= Math.exp(-dt * 1.6); m.ac *= Math.exp(-dt * 2.4); });

      for (var s = 0; s < snow.length; s++) {
        var p2 = snow[s];
        p2.y += p2.v * dt; p2.x += Math.sin(t * 0.3 + p2.y * 0.01) * 4 * dt + 3 * dt;
        if (p2.y > H) { p2.y = -2; p2.x = Math.random() * W; }
        if (p2.x > W) p2.x = 0;
      }
    }

    function eachModule(fn) {
      for (var i = 0; i < lines.length; i++) for (var k = 0; k < lines[i].mods.length; k++) fn(lines[i].mods[k]);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // light from the surface, far above
      var g = ctx.createLinearGradient(0, 0, 0, H * 0.6);
      g.addColorStop(0, 'rgba(120, 190, 240, 0.10)');
      g.addColorStop(1, 'rgba(120, 190, 240, 0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.6);

      // marine snow
      for (var s = 0; s < snow.length; s++) {
        var p = snow[s];
        ctx.fillStyle = 'rgba(200, 225, 245,' + p.a + ')';
        ctx.fillRect(p.x, p.y, p.r, p.r);
      }

      // seafloor
      var fg = ctx.createLinearGradient(0, floorY - 30, 0, H);
      fg.addColorStop(0, 'rgba(20, 45, 70, 0)');
      fg.addColorStop(1, 'rgba(30, 60, 85, 0.55)');
      ctx.fillStyle = fg; ctx.fillRect(0, floorY - 30, W, H - floorY + 30);

      // acoustic rings
      for (var r = 0; r < rings.length; r++) {
        var R = rings[r];
        var a = Math.max(0, 1 - R.r / (Math.hypot(W, H) * 0.75));
        ctx.beginPath();
        ctx.arc(R.x, R.y, R.r, 0, Math.PI * 2);
        ctx.strokeStyle = R.user ? 'rgba(140, 245, 210,' + (0.45 * a) + ')' : 'rgba(140, 245, 210,' + (0.25 * a) + ')';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // pingers
      for (var q = 0; q < pingers.length; q++) {
        var P = pingers[q];
        ctx.fillStyle = 'rgba(140, 245, 210, 0.55)';
        ctx.beginPath(); ctx.moveTo(P.x - 5, P.y + 3); ctx.lineTo(P.x + 5, P.y + 3); ctx.lineTo(P.x, P.y - 5); ctx.closePath(); ctx.fill();
      }

      // detector lines
      for (var i = 0; i < lines.length; i++) {
        var L = lines[i];
        ctx.beginPath();
        ctx.moveTo(L.x0, floorY);
        for (var k = 0; k < L.mods.length; k++) ctx.lineTo(L.mods[k].x, L.mods[k].y);
        ctx.lineTo(L.buoy.x, L.buoy.y);
        ctx.strokeStyle = 'rgba(150, 185, 220,' + (0.12 + 0.14 * L.depth) + ')';
        ctx.lineWidth = 0.6 + L.depth * 0.6;
        ctx.stroke();
        // anchor
        ctx.fillStyle = 'rgba(150, 185, 220, 0.35)';
        ctx.fillRect(L.x0 - 3, floorY - 1, 6, 3);
        // float: soft-cornered square, tilted with the line
        var bs = 7 + 6 * L.depth;
        roundSquare(L.buoy.x, L.buoy.y, bs, bs * 0.28, L.buoy.ang);
        ctx.fillStyle = 'rgba(230, 160, 90,' + (0.45 + 0.35 * L.depth) + ')';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 210, 160,' + (0.25 + 0.3 * L.depth) + ')';
        ctx.lineWidth = 1;
        ctx.stroke();

        for (var k2 = 0; k2 < L.mods.length; k2++) {
          var m = L.mods[k2];
          var rad = 1.6 + L.depth * 1.9;
          if (m.glow > 0.02) {
            var gr = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, rad + 22 * m.glow);
            gr.addColorStop(0, 'rgba(110, 210, 255,' + (0.85 * m.glow) + ')');
            gr.addColorStop(1, 'rgba(110, 210, 255, 0)');
            ctx.fillStyle = gr;
            ctx.beginPath(); ctx.arc(m.x, m.y, rad + 22 * m.glow, 0, Math.PI * 2); ctx.fill();
          }
          if (m.ac > 0.02) {
            ctx.beginPath(); ctx.arc(m.x, m.y, rad + 4 * m.ac, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(140, 245, 210,' + (0.8 * m.ac) + ')'; ctx.lineWidth = 1; ctx.stroke();
          }
          ctx.beginPath(); ctx.arc(m.x, m.y, rad, 0, Math.PI * 2);
          var base = 0.25 + 0.35 * L.depth;
          ctx.fillStyle = m.glow > 0.25 ? 'rgba(235, 250, 255,' + Math.min(1, base + m.glow) + ')' : 'rgba(175, 205, 235,' + base + ')';
          ctx.fill();
        }
      }

      // muon tracks with a faint Cherenkov cone
      for (var j = 0; j < tracks.length; j++) {
        var T = tracks[j];
        var hx = T.sx + T.dx * T.d, hy = T.sy + T.dy * T.d;
        var tail = Math.min(T.d, 260);
        var tx = hx - T.dx * tail, ty = hy - T.dy * tail;
        var lg = ctx.createLinearGradient(tx, ty, hx, hy);
        lg.addColorStop(0, 'rgba(120, 215, 255, 0)');
        lg.addColorStop(1, 'rgba(160, 230, 255, 0.75)');
        ctx.strokeStyle = lg; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();

        var ca = 0.72; // ~41 degrees
        for (var sgn = -1; sgn <= 1; sgn += 2) {
          var ang = Math.atan2(T.dy, T.dx) + Math.PI + sgn * ca;
          var cl = 90;
          var cg = ctx.createLinearGradient(hx, hy, hx + Math.cos(ang) * cl, hy + Math.sin(ang) * cl);
          cg.addColorStop(0, 'rgba(120, 215, 255, 0.28)');
          cg.addColorStop(1, 'rgba(120, 215, 255, 0)');
          ctx.strokeStyle = cg; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(ang) * cl, hy + Math.sin(ang) * cl); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(hx, hy, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(235, 250, 255, 0.95)'; ctx.fill();
      }
    }

    function frame(now) {
      raf = 0;
      var dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      step(dt);
      draw();
      schedule();
    }
    function schedule() {
      if (!raf && inView && !document.hidden && !reduceMotion) raf = requestAnimationFrame(frame);
    }

    build();
    if (reduceMotion) {
      // one still frame with a single event frozen in place
      addTrack(); tracks[0].d = tracks[0].len * 0.55;
      for (var i = 0; i < 40; i++) step(0.02);
      draw();
      var hint = $('#hero-hint'); if (hint) hint.style.display = 'none';
    } else {
      last = performance.now();
      schedule();
    }

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (c.clientWidth === W && Math.abs(c.clientHeight - H) < 80) return; // ignore mobile URL-bar jitter
        build(); if (reduceMotion) draw();
      }, 150);
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { inView = e[0].isIntersecting; schedule(); }).observe(c);
    }
    document.addEventListener('visibilitychange', schedule);

    var hinted = false;
    c.addEventListener('pointerdown', function (e) {
      if (reduceMotion) return;
      var rect = c.getBoundingClientRect();
      addRing(e.clientX - rect.left, e.clientY - rect.top, true);
      if (!hinted) { hinted = true; var h = $('#hero-hint'); if (h) h.style.opacity = '0'; }
    });
  })();
})();
