/* Lanternfish in the margin to the left of the name at the top of the page (the hero is dark in both themes).
   The fish drawing, its C-shaped turn and body volume are ported from
   "Anatomy of an Astrophysical Neutrino" (github.com/annabellegrimes/anatomy-of-an-astrophysical-neutrino-public).
   They only appear when the window is wide enough to leave empty side margins, never over the content. */
(function () {
  'use strict';
  var section = document.querySelector('.hero'), title = document.getElementById('hero-title');
  if (!section || !title || !window.CanvasRenderingContext2D) return;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CONTENT = 1120;          // the page's content width (.wrap max-width)
  var MIN_GUTTER = 110;        // below this the margins are too narrow for a fish

  // ---------- palette and helpers (as in the anatomy project) ----------
  var hex = function (h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); };
  var C = { deep: hex('#051a2b'), fg: hex('#dfe9f1'), muted: hex('#8ea6b8'), cher: hex('#5cb3ff'), cherHi: hex('#c4e6ff') };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var rgba = function (c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
  var mix = function (a, b, t) { return a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }); };

  var ctx = null, T = 0;

  function glowDot(x, y, r, col, a) {
    ctx.save(); ctx.globalAlpha *= a;
    var g = ctx.createRadialGradient(x, y, 0, x, y, r * 4); g.addColorStop(0, rgba(col, 0.55)); g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgba(mix(col, [255, 255, 255], 0.35), 1); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // A fish turns round by curling into a C: the head swings round first and the tail follows. The fish is drawn in its
  // own unit frame (head at +0.5) along a spine that yaws by phi (0 facing right, pi facing left) and bends by beta.
  function spine(phi, beta) {
    var X = Math.abs(beta) < 1e-3 ? function (x) { return x * Math.cos(phi); } : function (x) { return (Math.sin(phi + beta * x) - Math.sin(phi)) / beta; };
    return { M: function (x, y) { return [X(x), y]; }, side: function (x) { return Math.abs(Math.sin(phi + beta * x)); } };
  }
  var BENT = ['moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'arc', 'ellipse', 'createRadialGradient'];
  function bent(sp, fn) {
    var c = ctx, P = CanvasRenderingContext2D.prototype, M = sp.M;
    c.moveTo = function (x, y) { P.moveTo.apply(c, M(x, y)); };
    c.lineTo = function (x, y) { P.lineTo.apply(c, M(x, y)); };
    c.quadraticCurveTo = function (a, b, x, y) { P.quadraticCurveTo.apply(c, M(a, b).concat(M(x, y))); };
    c.bezierCurveTo = function (a, b, d, e, x, y) { P.bezierCurveTo.apply(c, M(a, b).concat(M(d, e), M(x, y))); };
    c.arc = function (x, y, r, s, e) { P.arc.apply(c, M(x, y).concat([r, s, e])); };
    c.ellipse = function (x, y, rx, ry, rot, s, e) { P.ellipse.apply(c, M(x, y).concat([rx, ry, rot, s, e])); };
    c.createRadialGradient = function (x0, y0, r0, x1, y1, r1) { return P.createRadialGradient.apply(c, M(x0, y0).concat([r0], M(x1, y1), [r1])); };
    try { fn(); } finally { BENT.forEach(function (k) { delete c[k]; }); }
  }
  // the body's volume under the side profile, so it shows its thickness as it turns
  function bodyVolume(sp, x0, x1, n, sec, top, bot) {
    var y0 = Infinity, y1 = -Infinity, any = false, p = new Path2D();
    for (var i = 0; i <= n; i++) {
      var x = lerp(x0, x1, i / n), s = sec(x), yc = s[0], h = s[1], w = s[2], rx = w * sp.side(x), cx = sp.M(x, 0)[0];
      if (h <= 0.001 || rx < 0.002) continue;
      p.moveTo(cx + rx, yc); p.ellipse(cx, yc, rx, h, 0, 0, Math.PI * 2); any = true;
      y0 = Math.min(y0, yc - h); y1 = Math.max(y1, yc + h);
    }
    if (!any) return;
    var g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, rgba(top, 1)); g.addColorStop(1, rgba(bot, 1));
    ctx.save(); ctx.fillStyle = g; ctx.fill(p); ctx.restore();
  }
  // a slow patrol: back and forth along the margin, curling round at each end
  function patrol(period, ph) {
    var th = T * 2 * Math.PI / period + ph, c = Math.cos(th);
    var f = clamp(c * 3, -1, 1), phi = Math.acos(f), beta = 2.6 * Math.sin(phi) * (Math.sin(th) >= 0 ? 1 : -1);
    return { s: Math.sin(th), c: c, sp: spine(phi, beta) };
  }
  // lanternfish: a dark body lined with glowing photophores; u is one screen pixel in the fish's units
  function drawFish(r, u) {
    bodyVolume(r.sp, -0.36, 0.48, 20, function (x) { var h = 0.13 * Math.sin(Math.PI * (x + 0.36) / 0.86); return [0, h, 0.6 * h]; },
      mix(C.deep, C.fg, 0.32), mix(C.deep, C.fg, 0.12));
    var w = Math.sin(T * 5 + r.tw * 6.28), k = 1 - 0.3 * w * w;
    var P = function (x, y) { return x < -0.3 ? [-0.3 + (x + 0.3) * k, y + 0.05 * w * (-0.3 - x) / 0.2] : [x, y]; };
    ctx.beginPath(); ctx.moveTo(0.5, 0); ctx.quadraticCurveTo(0.3, -0.17, -0.25, -0.09);
    ctx.lineTo.apply(ctx, P(-0.36, -0.035)); ctx.lineTo.apply(ctx, P(-0.5, -0.14)); ctx.lineTo.apply(ctx, P(-0.45, 0));
    ctx.lineTo.apply(ctx, P(-0.5, 0.14)); ctx.lineTo.apply(ctx, P(-0.36, 0.035)); ctx.lineTo(-0.25, 0.09); ctx.quadraticCurveTo(0.3, 0.17, 0.5, 0); ctx.closePath();
    ctx.fillStyle = rgba(mix(C.deep, C.fg, 0.22), 0.95); ctx.fill(); ctx.strokeStyle = rgba(C.muted, 0.55); ctx.lineWidth = 1.2 * u; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0.02, -0.13); ctx.lineTo(-0.1, -0.2); ctx.lineTo(-0.16, -0.11); ctx.fill(); ctx.stroke();   // dorsal fin
    ctx.fillStyle = rgba(C.fg, 0.8); ctx.beginPath(); ctx.arc(0.35, -0.025, 0.045, 0, Math.PI * 2); ctx.fill();          // eye
    for (var i = 0; i < 9; i++) { var x = 0.28 - i * 0.065; glowDot(x, 0.075 - 0.01 * Math.abs(i - 4) / 4, 0.012 + u * 0.8, C.cherHi, 0.9); }
  }

  // ---------- the two margins ----------
  // dy: px above (-) or below (+) the middle of the hero; L: body length in px; period: seconds for a full there-and-back
  var SCHOOLS = {
    left: [{ dy: -18, L: 52, period: 46, ph: 0.4, tw: 0.1 }, { dy: 44, L: 38, period: 58, ph: 2.6, tw: 0.6 }]
  };
  var anchorY = 0;   // halfway down the hero, in the section's coordinates
  var sides = ['left'].map(function (side) {
    var c = document.createElement('canvas');
    c.className = 'fish-margin fish-margin--' + side;
    c.setAttribute('aria-hidden', 'true');
    section.appendChild(c);
    return { side: side, canvas: c, ctx: c.getContext('2d'), w: 0, h: 0 };
  });

  var dpr = 1, active = false, inView = false;
  function layout() {
    var vw = document.documentElement.clientWidth, sh = section.offsetHeight;
    var tr = title.getBoundingClientRect(), sr = section.getBoundingClientRect();
    anchorY = sh / 2;   // halfway down the hero
    var gutter = (vw - CONTENT) / 2;
    active = gutter >= MIN_GUTTER;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    sides.forEach(function (s) {
      s.canvas.style.display = active ? 'block' : 'none';
      if (!active) return;
      s.w = Math.floor(gutter - 16); s.h = sh;
      s.canvas.style.width = s.w + 'px'; s.canvas.style.height = s.h + 'px';
      s.canvas.width = Math.round(s.w * dpr); s.canvas.height = Math.round(s.h * dpr);
    });
  }

  function draw() {
    sides.forEach(function (s) {
      ctx = s.ctx;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, s.w, s.h);
      SCHOOLS[s.side].forEach(function (f) {
        var L = Math.min(f.L, s.w * 0.4), A = Math.max(0, s.w / 2 - L * 0.65), p = patrol(f.period, f.ph);
        var x = s.w / 2 + A * p.s, y = anchorY + f.dy + 5 * p.c + 3 * Math.sin(T * 0.4 + f.ph);
        ctx.save(); ctx.translate(x, y); ctx.scale(L, L); ctx.globalAlpha = 0.85;
        bent(p.sp, function () { drawFish({ sp: p.sp, tw: f.tw }, 1 / L); });
        ctx.restore();
      });
    });
  }

  var last = 0, raf = 0;
  function frame(now) {
    raf = 0;
    if (last) T += Math.min(0.05, (now - last) / 1000);
    last = now;
    draw();
    schedule();
  }
  function schedule() { if (!raf && active && inView && !reduceMotion && !document.hidden) raf = requestAnimationFrame(frame); }

  // re-fit when the window or the section changes size (fonts loading can move the name)
  var resizeTimer;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { layout(); draw(); schedule(); }, 120);
  }
  window.addEventListener('resize', onResize);
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(section);
  // only swim while the section is on screen
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { inView = e[0].isIntersecting; last = 0; schedule(); }).observe(section);
  } else inView = true;
  document.addEventListener('visibilitychange', function () { last = 0; schedule(); });

  T = 12;          // start mid-swim, so they are not all lined up on the first frame
  layout(); draw(); schedule();
})();
