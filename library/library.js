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
    el.className = 'book' + (cloth[1] ? ' book--light' : '');
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
