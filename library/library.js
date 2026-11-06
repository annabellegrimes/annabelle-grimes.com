/* /library/: the bookcase. Builds the shelves from books.json; a book slides up out of its shelf, flies to the middle
   of the screen and opens on its details; putting it back reverses the trip. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CODE = { sources: 'SRC', physics: 'PHY', cosmo: 'COS', pone: 'PON', deep: 'SEA' };
  // cloth bindings: [colour, light cloth (dark lettering)]
  var CLOTH = [['#7a2e2e', 0], ['#2f4a3a', 0], ['#23395b', 0], ['#8a6a2a', 0], ['#5a3d5c', 0], ['#2c5a5e', 0],
    ['#6b4a33', 0], ['#3d3f46', 0], ['#8c4b2f', 0], ['#d8ccb0', 1], ['#c9b98f', 1], ['#4b5d2e', 0], ['#1f2f44', 0], ['#9b3b3b', 0]];

  var bookcase = $('#bookcase'), reader = $('#reader'), openBook = $('#open-book'), cover = openBook.querySelector('.cover');
  var books = [], shelves = [], current = null, flyer = null, busy = false;

  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function surname(b) {
    var a = b.authors[0] || 'Anonymous';
    if (/collaboration|group/i.test(a)) return a.replace(/^The /, '');
    return a.split(/\s+/).pop() + (b.authors.length > 1 || b.authorCount ? ' et al.' : '');
  }
  function authorLine(b) {
    var a = b.authors.map(function (x) { return x.replace(/^The /, ''); }), n = b.authorCount || a.length;
    if (n <= 4) return a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] : a[0] || '';
    return a.slice(0, 3).join(', ') + ' and ' + (n - 3).toLocaleString('en-US') + ' others';
  }
  function callNumber(b) {
    var s = (b.authors[0] || 'X').replace(/^The /, '').replace(/ Collaboration$/, '').split(/\s+/).pop();
    return CODE[b.shelf] + ' ' + (b.year || 'n.d.') + ' .' + s.slice(0, 3).toUpperCase();
  }
  function citation(b) {
    var a = b.authorCount ? (b.authors[0] + ' et al.') : authorLine(b);
    var link = b.links[0] ? ' ' + b.links[0].url : '';
    return a + ' (' + (b.year || 'n.d.') + '). ' + b.title + '. ' + b.venue + '.' + link;
  }
  function spineTitle(t) { return t.length > 60 && t.indexOf(':') > 12 ? t.slice(0, t.indexOf(':')) : t; }

  /* ---------- Things on the shelves, one set per subject ---------- */
  var DECO = {
    candle: '<svg width="44" height="118" viewBox="0 0 44 118"><defs><radialGradient id="dc-f" cx=".5" cy=".7" r=".6"><stop offset="0" stop-color="#fff8e0"/><stop offset=".45" stop-color="#ffd27a"/><stop offset="1" stop-color="#ff8a2a"/></radialGradient>' +
      '<linearGradient id="dc-w" x1="0" x2="1"><stop offset="0" stop-color="#d9cdb2"/><stop offset=".5" stop-color="#fbf3e2"/><stop offset="1" stop-color="#cbbd9e"/></linearGradient>' +
      '<linearGradient id="dc-b" x1="0" x2="1"><stop offset="0" stop-color="#7a5a22"/><stop offset=".5" stop-color="#ecca82"/><stop offset="1" stop-color="#6b4d1c"/></linearGradient></defs>' +
      '<path class="flame" d="M22 4 C 28 14 29 22 22 30 C 15 22 16 14 22 4 Z" fill="url(#dc-f)"/><line x1="22" y1="28" x2="22" y2="34" stroke="#2a1a0c" stroke-width="1.4"/>' +
      '<rect x="14" y="33" width="16" height="64" rx="2" fill="url(#dc-w)"/><path d="M14 36 q 3 4 0 9" fill="none" stroke="#efe4cc" stroke-width="2"/>' +
      '<rect x="10" y="95" width="24" height="6" rx="2" fill="url(#dc-b)"/><ellipse cx="22" cy="110" rx="20" ry="5" fill="url(#dc-b)"/><rect x="18" y="100" width="8" height="10" fill="url(#dc-b)"/></svg>',
    plant: '<svg width="96" height="128" viewBox="0 0 96 128"><defs><linearGradient id="dp-p" x1="0" x2="1"><stop offset="0" stop-color="#8e4a2c"/><stop offset=".45" stop-color="#c46d43"/><stop offset="1" stop-color="#7d3f24"/></linearGradient></defs>' +
      '<g fill="#3f7a46"><ellipse cx="40" cy="38" rx="10" ry="6" transform="rotate(-35 40 38)"/><ellipse cx="56" cy="34" rx="10" ry="6" transform="rotate(30 56 34)"/><ellipse cx="47" cy="22" rx="9" ry="5.5" transform="rotate(-80 47 22)"/>' +
      '<ellipse cx="30" cy="50" rx="9" ry="5.5" transform="rotate(-10 30 50)"/><ellipse cx="66" cy="48" rx="9" ry="5.5" transform="rotate(15 66 48)"/></g>' +
      '<g fill="#5a9a5c"><ellipse cx="50" cy="44" rx="8" ry="5" transform="rotate(10 50 44)"/><ellipse cx="38" cy="28" rx="7" ry="4.5" transform="rotate(-55 38 28)"/></g>' +
      '<path d="M22 60 C 12 72 10 88 16 104 M 74 60 C 86 74 88 92 80 112" fill="none" stroke="#3d6b40" stroke-width="1.6"/>' +
      '<g fill="#4c8a50"><ellipse cx="14" cy="72" rx="6" ry="3.6" transform="rotate(-60 14 72)"/><ellipse cx="11" cy="88" rx="6" ry="3.6" transform="rotate(-100 11 88)"/><ellipse cx="17" cy="102" rx="5.5" ry="3.3" transform="rotate(-70 17 102)"/>' +
      '<ellipse cx="82" cy="74" rx="6" ry="3.6" transform="rotate(60 82 74)"/><ellipse cx="86" cy="92" rx="6" ry="3.6" transform="rotate(95 86 92)"/><ellipse cx="80" cy="110" rx="5.5" ry="3.3" transform="rotate(70 80 110)"/></g>' +
      '<path d="M20 58 H 76 L 70 126 H 26 Z" fill="url(#dp-p)"/><rect x="17" y="54" width="62" height="10" rx="2" fill="#a85a35"/><path d="M20 64 H 76" stroke="rgba(0,0,0,.25)"/></svg>',
    globe: '<svg width="80" height="132" viewBox="0 0 80 132"><defs><radialGradient id="dg-s" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="#d9c9a0"/><stop offset=".6" stop-color="#b59a63"/><stop offset="1" stop-color="#6e5530"/></radialGradient>' +
      '<linearGradient id="dg-b" x1="0" x2="1"><stop offset="0" stop-color="#7a5a22"/><stop offset=".5" stop-color="#ecca82"/><stop offset="1" stop-color="#6b4d1c"/></linearGradient></defs>' +
      '<circle cx="40" cy="52" r="32" fill="url(#dg-s)"/><g fill="#5f7a52" opacity=".85"><path d="M22 34 q 10 -6 18 2 q 4 8 -4 12 q -6 6 -12 0 q -6 -6 -2 -14 Z"/><path d="M48 52 q 10 -4 14 6 q 2 10 -8 14 q -8 0 -8 -8 Z"/><path d="M28 64 q 6 2 6 8 q -4 4 -8 0 Z"/></g>' +
      '<g fill="none" stroke="rgba(60,40,15,.35)" stroke-width=".8"><ellipse cx="40" cy="52" rx="14" ry="32"/><path d="M8 52 H 72 M 12 38 H 68 M 12 66 H 68"/></g>' +
      '<path d="M40 14 A 38 38 0 0 1 40 90" fill="none" stroke="url(#dg-b)" stroke-width="3" transform="rotate(-20 40 52)"/>' +
      '<rect x="37" y="88" width="6" height="26" fill="url(#dg-b)"/><path d="M18 128 Q 40 112 62 128 Z" fill="url(#dg-b)"/></svg>',
    hourglass: '<svg width="46" height="96" viewBox="0 0 46 96"><defs><linearGradient id="dh-w" x1="0" x2="1"><stop offset="0" stop-color="#4a2c16"/><stop offset=".5" stop-color="#8a5a32"/><stop offset="1" stop-color="#3e2412"/></linearGradient></defs>' +
      '<rect x="3" y="2" width="40" height="8" rx="2" fill="url(#dh-w)"/><rect x="3" y="86" width="40" height="8" rx="2" fill="url(#dh-w)"/>' +
      '<rect x="6" y="10" width="3" height="76" fill="url(#dh-w)"/><rect x="37" y="10" width="3" height="76" fill="url(#dh-w)"/>' +
      '<path d="M12 10 H 34 C 34 30 26 40 24 48 C 26 56 34 66 34 86 H 12 C 12 66 20 56 22 48 C 20 40 12 30 12 10 Z" fill="rgba(220,235,240,.18)" stroke="rgba(230,240,245,.45)"/>' +
      '<path d="M15 24 H 31 C 29 34 25 40 23 46 C 21 40 17 34 15 24 Z" fill="#d8b878"/><path d="M14 86 C 16 74 20 70 23 68 C 26 70 30 74 32 86 Z" fill="#d8b878"/><line x1="23" y1="47" x2="23" y2="68" stroke="#d8b878" stroke-width="1"/></svg>',
    stack: '<svg width="118" height="58" viewBox="0 0 118 58"><g><rect x="6" y="40" width="104" height="16" rx="2" fill="#2f4a3a"/><rect x="104" y="42" width="5" height="12" fill="#eadfc6"/><path d="M14 44 H 96" stroke="#d6b56a" stroke-width="1"/>' +
      '<rect x="12" y="25" width="92" height="15" rx="2" fill="#7a2e2e"/><rect x="98" y="27" width="5" height="11" fill="#efe5cf"/><path d="M20 29 H 90 M 20 36 H 90" stroke="#d6b56a" stroke-width=".8"/>' +
      '<rect x="18" y="12" width="78" height="13" rx="2" fill="#23395b"/><rect x="90" y="14" width="5" height="9" fill="#eadfc6"/>' +
      '<ellipse cx="62" cy="9" rx="10" ry="3" fill="#cfa45a"/><rect x="54" y="2" width="16" height="7" rx="1" fill="#f1eadb"/><path d="M54 4 h -4 a 3 3 0 0 0 0 4 h 4" fill="none" stroke="#f1eadb" stroke-width="1.6"/></g></svg>',
    module: '<svg width="76" height="124" viewBox="0 0 76 124"><defs><radialGradient id="dm-g" cx=".35" cy=".32" r=".75"><stop offset="0" stop-color="#e9f6fb"/><stop offset=".55" stop-color="#9cc6d6"/><stop offset="1" stop-color="#4c7486"/></radialGradient>' +
      '<linearGradient id="dm-t" x1="0" x2="1"><stop offset="0" stop-color="#6a6e72"/><stop offset=".5" stop-color="#c9ced2"/><stop offset="1" stop-color="#5c6064"/></linearGradient></defs>' +
      '<rect x="35" y="2" width="6" height="22" fill="#1d1d1d"/><path d="M33 22 H 43 L 45 30 H 31 Z" fill="#2b2b2b"/>' +
      '<circle cx="38" cy="58" r="28" fill="url(#dm-g)"/><rect x="34" y="30" width="8" height="56" fill="url(#dm-t)" opacity=".9"/>' +
      '<g fill="none" stroke="rgba(30,60,75,.45)" stroke-width="1.1"><ellipse cx="22" cy="46" rx="4" ry="5"/><ellipse cx="22" cy="70" rx="4" ry="5"/><ellipse cx="54" cy="46" rx="4" ry="5"/><ellipse cx="54" cy="70" rx="4" ry="5"/><ellipse cx="15" cy="58" rx="2.5" ry="4.5"/><ellipse cx="61" cy="58" rx="2.5" ry="4.5"/></g>' +
      '<ellipse cx="28" cy="44" rx="7" ry="4" fill="rgba(255,255,255,.45)" transform="rotate(-30 28 44)"/>' +
      '<path d="M31 86 H 45 L 43 94 H 33 Z" fill="#2b2b2b"/><rect x="35" y="94" width="6" height="12" fill="#1d1d1d"/>' +
      '<path d="M12 122 H 64 L 58 108 H 18 Z" fill="#5a3820"/><path d="M18 108 H 58" stroke="#8a5a32" stroke-width="2"/></svg>',
    jar: '<svg width="68" height="104" viewBox="0 0 68 104"><rect x="14" y="4" width="40" height="10" rx="2" fill="#8a6a3a"/><path d="M14 9 h 40" stroke="#c9a35f"/>' +
      '<path d="M16 14 H 52 Q 62 22 62 36 V 92 Q 62 102 52 102 H 16 Q 6 102 6 92 V 36 Q 6 22 16 14 Z" fill="rgba(170,220,225,.12)" stroke="rgba(210,235,240,.45)" stroke-width="1.5"/>' +
      '<path d="M8 80 Q 34 72 60 80 V 92 Q 60 100 52 100 H 16 Q 8 100 8 92 Z" fill="rgba(40,90,110,.35)"/>' +
      '<g class="plankton" fill="#8ff5ea"><circle cx="20" cy="40" r="1.6"/><circle cx="32" cy="52" r="2"/><circle cx="46" cy="36" r="1.4"/><circle cx="50" cy="62" r="1.8"/><circle cx="24" cy="68" r="1.5"/>' +
      '<circle cx="38" cy="76" r="2.2"/><circle cx="14" cy="56" r="1.2"/><circle cx="54" cy="46" r="1.3"/><circle cx="30" cy="30" r="1.1"/><circle cx="42" cy="88" r="1.6"/><circle cx="20" cy="86" r="1.3"/></g>' +
      '<path d="M14 22 Q 10 40 12 70" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/></svg>',
    shell: '<svg width="64" height="44" viewBox="0 0 64 44"><defs><linearGradient id="ds-s" x1="0" x2="1"><stop offset="0" stop-color="#e9cfae"/><stop offset=".6" stop-color="#f6e6d0"/><stop offset="1" stop-color="#cfa57e"/></linearGradient></defs>' +
      '<path d="M6 40 Q 2 18 22 8 Q 44 0 58 18 Q 62 30 50 40 Z" fill="url(#ds-s)"/><g fill="none" stroke="#b07f58" stroke-width="1.1" opacity=".8"><path d="M30 40 Q 26 24 22 10"/><path d="M38 40 Q 38 22 34 6"/><path d="M46 40 Q 50 24 46 8"/><path d="M22 40 Q 14 28 12 16"/></g></svg>'
  };
  var SHELF_DECO = { sources: ['candle'], physics: ['stack', 'plant'], cosmo: ['globe', 'hourglass', 'stack'], pone: ['module', 'candle'], deep: ['jar', 'shell'] };
  function decorate(row, shelfId) {
    (SHELF_DECO[shelfId] || []).forEach(function (k) {
      var d = document.createElement('span'); d.className = 'deco deco--' + k; d.setAttribute('aria-hidden', 'true');
      // ids inside each drawing must be unique on the page
      var n = row.querySelectorAll('.deco').length + Math.random().toString(36).slice(2, 6);
      d.innerHTML = DECO[k].replace(/id="(d[a-z]-\w)"/g, 'id="$1' + n + '"').replace(/url\(#(d[a-z]-\w)\)/g, 'url(#$1' + n + ')');
      row.appendChild(d);
    });
  }

  /* ---------- Shelves ---------- */
  function spine(b) {
    var h = hash(b.id), cloth = CLOTH[h % CLOTH.length];
    var height = 158 + (h >>> 5) % 58;
    // the spine holds one line of title, or two on a thicker book; a title longer than that stops at a word, with "…"
    var perLine = Math.floor((height - 66) / 6.4), text = spineTitle(b.title), lines = text.length > perLine ? 2 : 1;
    if (text.length > 2 * perLine) text = text.slice(0, 2 * perLine - 1).replace(/\s+\S*$/, '') + '…';
    var width = (lines === 2 ? 44 : 28) + (h >>> 11) % 9;
    var el = document.createElement('button');
    el.type = 'button';
    var finish = ['', ' book--label', ' book--ribs'][(h >>> 17) % 3];   // gilt bands, a leather label, or raised ribs
    el.className = 'book' + (cloth[1] ? ' book--light' : '') + finish;
    el.style.cssText = '--h:' + height + 'px;--w:' + width + 'px;--c:' + cloth[0];
    el.dataset.id = b.id;
    el.title = b.title + ' (' + surname(b) + ', ' + (b.year || 'n.d.') + ')';
    el.setAttribute('aria-label', b.title + ', ' + surname(b) + ', ' + (b.year || 'no date'));
    el.innerHTML = '<span class="book__title">' + esc(text) + '</span><span class="book__label">' +
      CODE[b.shelf] + '<br>' + esc(b.year || 'n.d.') + '</span>';
    el.addEventListener('click', function () { take(b); });
    b.el = el;
    return el;
  }
  function build(data) {
    shelves = data.shelves; books = data.books;
    bookcase.innerHTML = '';
    shelves.forEach(function (s) {
      var mine = books.filter(function (b) { return b.shelf === s.id; });
      var sec = document.createElement('section');
      sec.className = 'shelf'; sec.setAttribute('aria-labelledby', 'shelf-' + s.id);
      sec.innerHTML = '<h2 class="shelf__plate" id="shelf-' + s.id + '">' + esc(s.title) + ' <small>' + mine.length +
        (mine.length === 1 ? ' book' : ' books') + '</small></h2><p class="shelf__sub">' + esc(s.sub) + '</p>';
      var row = document.createElement('div'); row.className = 'shelf__row';
      mine.forEach(function (b) { row.appendChild(spine(b)); });
      if (mine.length && mine.length < 6) mine[mine.length - 1].el.classList.add('is-leaning');   // a short shelf: the last book leans
      decorate(row, s.id);
      var end = document.createElement('span'); end.className = 'bookend'; end.setAttribute('aria-hidden', 'true'); row.appendChild(end);
      var plank = document.createElement('div'); plank.className = 'shelf__plank'; plank.setAttribute('aria-hidden', 'true');
      sec.appendChild(row); sec.appendChild(plank); bookcase.appendChild(sec);
    });
    $('#count').textContent = books.length + ' books on ' + shelves.length + ' shelves';
    if (data.updated) $('#updated').textContent = 'Last updated ' + new Date(data.updated + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + '.';
  }

  /* ---------- Finding a book ---------- */
  var find = $('#find');
  find.addEventListener('input', function () {
    var q = find.value.trim().toLowerCase(), n = 0;
    books.forEach(function (b) {
      var shelf = shelves.filter(function (s) { return s.id === b.shelf; })[0];
      var hay = [b.title, b.authors.join(' '), b.venue, b.year, b.note, shelf.title, shelf.sub].join(' ').toLowerCase();
      var hit = !q || hay.indexOf(q) >= 0;
      if (hit) n++;
      b.el.classList.toggle('is-dim', !hit);
      b.el.classList.toggle('is-match', !!q && hit);
    });
    $('#count').textContent = q ? (n === 1 ? '1 book matches' : n + ' books match') : books.length + ' books on ' + shelves.length + ' shelves';
  });

  /* ---------- Taking a book off the shelf ---------- */
  function fill(b) {
    var shelf = shelves.filter(function (s) { return s.id === b.shelf; })[0];
    var h = hash(b.id), cloth = CLOTH[h % CLOTH.length];
    openBook.style.setProperty('--c', cloth[0]);
    openBook.style.setProperty('--t', cloth[1] ? '#3b2a17' : '#ecd9a6');
    $('#r-shelf').textContent = shelf.title;
    $('#r-title').textContent = b.title;
    $('#r-authors').textContent = authorLine(b);
    $('#r-pub').textContent = [b.venue, b.year].filter(Boolean).join(', ') + (b.kind === 'data' ? ' · data set' : b.kind === 'web' ? ' · web page' : '');
    $('#r-call').textContent = callNumber(b);
    $('#r-note').textContent = b.note || 'A source I rely on.';
    $('#r-used').innerHTML = b.usedIn.map(function (u) { return '<li><a href="' + esc(u.url) + '">' + esc(u.title) + '</a></li>'; }).join('');
    $('#r-links').innerHTML = b.links.map(function (l) { return '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.label === 'Link' ? 'Open' : l.label) + ' &nearr;</a>'; }).join('');
    $('#cover-title').textContent = spineTitle(b.title);
    var list = books.filter(function (x) { return x.shelf === b.shelf; }), i = list.indexOf(b);
    $('#r-prev').disabled = i <= 0; $('#r-next').disabled = i >= list.length - 1;
    try { history.replaceState(null, '', '#book=' + b.id); } catch (e) {}
  }
  function centre() { return { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }

  function take(b) {
    if (busy || current) return;
    busy = true; current = b; fill(b);
    var r = b.el.getBoundingClientRect();
    flyer = b.el.cloneNode(true);
    flyer.classList.remove('is-leaning', 'is-match', 'is-dim'); flyer.classList.add('flyer');
    flyer.removeAttribute('id'); flyer.setAttribute('aria-hidden', 'true'); flyer.tabIndex = -1;
    flyer.style.left = r.left + 'px'; flyer.style.top = r.top + 'px';
    document.body.appendChild(flyer);
    b.el.classList.add('is-out');
    if (reduce || !flyer.animate) return arrive();
    var c = centre(), dx = c.x - (r.left + r.width / 2), dy = c.y - (r.top + r.height / 2), lift = -r.height * 0.75;
    // 1. slide up out of the shelf; 2. carry it to the middle, turning it to show its cover
    flyer.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(' + lift + 'px)' }], { duration: 320, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' })
      .finished.then(function () {
        return flyer.animate([
          { transform: 'translate(0,' + lift + 'px) rotateY(0) scale(1)', opacity: 1 },
          { transform: 'translate(' + dx + 'px,' + dy + 'px) rotateY(-80deg) scale(1.6)', opacity: 0.2 }
        ], { duration: 420, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).finished;
      }).then(arrive);
  }
  function arrive() {
    flyer.style.visibility = 'hidden';
    reader.showModal();
    if (!reduce && openBook.animate && window.innerWidth > 760) {
      cover.style.opacity = 1;
      openBook.animate([{ transform: 'scale(.92)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: 'ease-out' });
      var pages = openBook.querySelectorAll('.page');
      pages[0].animate([{ opacity: 0 }, { opacity: 0, offset: 0.45 }, { opacity: 1 }], { duration: 760 });
      cover.animate([{ transform: 'rotateY(0)' }, { transform: 'rotateY(-180deg)' }], { duration: 760, delay: 120, easing: 'cubic-bezier(.45,0,.2,1)', fill: 'both' })
        .finished.then(function () { cover.style.opacity = 0; busy = false; });
    } else busy = false;
    $('#r-close').focus();
  }
  function putBack() {
    if (busy || !current) return;
    busy = true;
    var b = current;
    var done = function () {
      b.el.classList.remove('is-out');
      if (flyer) flyer.remove(); flyer = null; current = null; busy = false;
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
      b.el.focus({ preventScroll: true });
    };
    reader.close();
    if (reduce || !flyer || !flyer.animate) return done();
    var r = b.el.getBoundingClientRect();
    flyer.style.left = r.left + 'px'; flyer.style.top = r.top + 'px'; flyer.style.visibility = 'visible';
    flyer.getAnimations().forEach(function (a) { a.cancel(); });
    var c = centre(), dx = c.x - (r.left + r.width / 2), dy = c.y - (r.top + r.height / 2), lift = -r.height * 0.75;
    flyer.animate([
      { transform: 'translate(' + dx + 'px,' + dy + 'px) rotateY(-80deg) scale(1.6)', opacity: 0.2 },
      { transform: 'translate(0,' + lift + 'px) rotateY(0) scale(1)', opacity: 1 }
    ], { duration: 380, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).finished.then(function () {
      return flyer.animate([{ transform: 'translateY(' + lift + 'px)' }, { transform: 'translateY(0)' }], { duration: 300, easing: 'cubic-bezier(.6,0,.4,1)', fill: 'forwards' }).finished;
    }).then(done);
  }
  function step(d) {   // the next or previous book on the same shelf, swapped without leaving the reader
    if (!current || busy) return;
    var list = books.filter(function (x) { return x.shelf === current.shelf; }), n = list[list.indexOf(current) + d];
    if (!n) return;
    current.el.classList.remove('is-out'); n.el.classList.add('is-out');
    if (flyer) flyer.remove();
    flyer = n.el.cloneNode(true); flyer.classList.remove('is-leaning', 'is-match', 'is-dim', 'is-out'); flyer.classList.add('flyer');
    flyer.setAttribute('aria-hidden', 'true'); flyer.style.visibility = 'hidden'; document.body.appendChild(flyer);
    current = n; fill(n);
    if (!reduce) openBook.animate([{ opacity: 0.4, transform: 'translateX(' + (d * 12) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'ease-out' });
  }

  $('#r-close').addEventListener('click', putBack);
  reader.addEventListener('cancel', function (e) { e.preventDefault(); putBack(); });   // Esc
  reader.addEventListener('click', function (e) { if (e.target === reader) putBack(); });   // the backdrop
  $('#r-prev').addEventListener('click', function () { step(-1); });
  $('#r-next').addEventListener('click', function () { step(1); });
  reader.addEventListener('keydown', function (e) {
    if (e.target.closest && e.target.closest('input')) return;
    if (e.key === 'ArrowLeft') step(-1); else if (e.key === 'ArrowRight') step(1);
  });
  $('#r-copy').addEventListener('click', function () {
    var btn = $('#r-copy'), text = citation(current);
    var ok = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy citation'; }, 1600); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, function () {});
    else { var t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); ok(); } catch (e) {} t.remove(); }
  });

  fetch('books.json').then(function (r) { return r.json(); }).then(function (data) {
    build(data);
    var m = location.hash.match(/^#book=(.+)$/);   // a link straight to one book
    var b = m && books.filter(function (x) { return x.id === decodeURIComponent(m[1]); })[0];
    if (b) { b.el.scrollIntoView({ block: 'center' }); setTimeout(function () { take(b); }, 300); }
  }).catch(function () {
    bookcase.innerHTML = '<p class="loading">The books could not be loaded. Try refreshing the page.</p>';
  });
})();
