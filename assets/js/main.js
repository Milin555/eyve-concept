/* EYVE — site interactions. No dependencies. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var CAT = window.EYVE_CATALOGUE || {};
  var FREE_SHIP = window.EYVE_FREE_SHIP || 999;
  var SHIP = window.EYVE_SHIP || 69;
  var COD = window.EYVE_COD || 49;

  var inr = function (n) {
    return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  /* --- Storage ---------------------------------------------------------- */
  var store = (function () {
    try { localStorage.setItem('_t', '1'); localStorage.removeItem('_t'); return localStorage; }
    catch (e) { return null; }
  })();

  var bag = (function () {
    if (!store) return {};
    try { return JSON.parse(store.getItem('eyveBag') || '{}'); } catch (e) { return {}; }
  })();

  var saveBag = function () {
    if (store) store.setItem('eyveBag', JSON.stringify(bag));
  };

  var bagCount = function () {
    var n = 0;
    for (var k in bag) n += bag[k];
    return n;
  };

  var subtotal = function () {
    var t = 0;
    for (var k in bag) if (CAT[k]) t += CAT[k].price * bag[k];
    return t;
  };

  var shipping = function () {
    var s = subtotal();
    return (s === 0 || s >= FREE_SHIP) ? 0 : SHIP;
  };

  /* --- Brand intro ------------------------------------------------------ */
  var intro = $('#intro');
  if (intro) {
    var seen = false;
    try { seen = sessionStorage.getItem('eyveSeen') === '1'; } catch (e) {}
    if (seen || reduce) {
      intro.classList.add('is-done');
    } else {
      document.documentElement.style.overflow = 'hidden';
      intro.classList.add('is-run');
      // 450ms in, 450ms hold, 600ms curtain — the hold is what reads as composed
      setTimeout(function () { intro.classList.add('is-out'); }, 900);
      setTimeout(function () {
        intro.classList.add('is-done');
        document.documentElement.style.overflow = '';
        try { sessionStorage.setItem('eyveSeen', '1'); } catch (e) {}
      }, 1500);
    }
  }

  /* --- Header ----------------------------------------------------------- */
  var hdr = $('#hdr');
  if (hdr) {
    var onScroll = function () { hdr.classList.toggle('is-stuck', window.scrollY > 24); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  var topbar = $('.topbar');
  var measureRail = function () {
    if (!topbar) return;
    document.documentElement.style.setProperty(
      '--rail', Math.round(topbar.getBoundingClientRect().height) + 'px');
  };
  measureRail();
  window.addEventListener('resize', measureRail);
  window.addEventListener('load', measureRail);

  var burger = $('.hdr__burger');
  var nav = $('.hdr__nav');
  if (burger && nav && topbar) {
    var setMenu = function (open) {
      topbar.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      measureRail();
    };
    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* --- Reveal ----------------------------------------------------------- */
  var revealables = $$('.rv, .rvimg, .rvline');
  if (reduce) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var pending = revealables.slice(), queued = false;
    var sweep = function () {
      queued = false;
      var trigger = window.innerHeight * 0.92;
      for (var i = pending.length - 1; i >= 0; i--) {
        var r = pending[i].getBoundingClientRect();
        if (r.top < trigger) { pending[i].classList.add('is-in'); pending.splice(i, 1); }
      }
      if (!pending.length) {
        window.removeEventListener('scroll', request);
        window.removeEventListener('resize', request);
      }
    };
    var request = function () { if (!queued) { queued = true; requestAnimationFrame(sweep); } };
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    window.addEventListener('load', request);
    request();
    setTimeout(request, 400);
  }

  /* --- Count-up --------------------------------------------------------- */
  var counters = $$('[data-count]');
  if (counters.length) {
    var runCount = function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var raw = el.getAttribute('data-suffix');
      var suffix = raw === null ? '%' : raw;
      var decimals = (String(target).split('.')[1] || '').length;
      var render = function (v) { return v.toFixed(decimals) + suffix; };
      if (reduce) { el.textContent = render(target); return; }
      var dur = 1000, t0 = null;
      var tick = function (t) {
        if (t0 === null) t0 = t;
        var p = Math.min((t - t0) / dur, 1);
        el.textContent = render(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if ('IntersectionObserver' in window) {
      var cio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { runCount(e.target); cio.unobserve(e.target); } });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { cio.observe(el); });
    } else counters.forEach(runCount);
  }

  /* --- The Descent ------------------------------------------------------ */
  var steps = $$('.dstep');
  var vesicle = $('#vesicle');
  if (steps.length && vesicle) {
    var stops = [0, 84, 186];
    var labels = ['Depth 0–20 µm', 'Depth 20–100 µm', 'Depth 100 µm +'];
    var depthRead = $('#depthRead');
    var bands = $$('.strata__band');
    var shell = $('#shell');
    var dots = $$('#payload circle');
    var spread = [[-26, 14], [24, 10], [-14, 34], [18, 36], [-32, -8], [30, -6]];
    var current = -1, hoverUntil = 0;

    var flash = function (id) {
      var line = $('#' + id);
      if (!line) return;
      line.setAttribute('stroke', '#D3BA92');
      line.setAttribute('stroke-width', '2');
      setTimeout(function () {
        line.setAttribute('stroke', '#8C87D6');
        line.setAttribute('stroke-width', '1');
      }, 500);
    };

    var setDepth = function (i) {
      if (i === current) return;
      var down = i > current;
      current = i;
      vesicle.style.transform = 'translateY(' + stops[i] + 'px)';
      if (depthRead) depthRead.textContent = labels[i];
      steps.forEach(function (s, n) { s.classList.toggle('is-live', n === i); });
      bands.forEach(function (b, n) { b.style.opacity = n === i ? '1' : '0.42'; });
      if (down && !reduce) flash('b' + i);
      var open = i === 2;
      if (shell) shell.style.opacity = open ? '0' : '1';
      dots.forEach(function (d, n) {
        var to = spread[n] || [0, 0];
        d.style.opacity = open ? '1' : '0';
        d.style.transform = open ? 'translate(' + to[0] + 'px,' + to[1] + 'px)' : 'translate(0,0)';
        d.style.transitionDelay = open ? (n * 100) + 'ms' : '0ms';
      });
    };

    setDepth(0);

    if ('IntersectionObserver' in window) {
      var dio = new IntersectionObserver(function (es) {
        if (performance.now() < hoverUntil) return;
        es.forEach(function (e) {
          if (e.isIntersecting) setDepth(parseInt(e.target.getAttribute('data-depth'), 10));
        });
      }, { threshold: 0.6, rootMargin: '-20% 0px -20% 0px' });
      steps.forEach(function (s) { dio.observe(s); });
    }
    steps.forEach(function (s) {
      s.addEventListener('mouseenter', function () {
        hoverUntil = performance.now() + 2500;
        setDepth(parseInt(s.getAttribute('data-depth'), 10));
      });
    });
  }

  /* --- FAQ -------------------------------------------------------------- */
  $$('.faq__item').forEach(function (item) {
    var btn = $('.faq__q', item);
    if (!btn) return;
    btn.addEventListener('click', function () {
      var open = item.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* --- Toast ------------------------------------------------------------ */
  var toast = $('#toast'), toastTimer;
  var say = function (msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 2800);
  };

  /* --- Bag -------------------------------------------------------------- */
  var countEl = $('[data-cart-count]');
  var cartLink = $('[data-cart]');

  var paintHeader = function () {
    var n = bagCount();
    if (countEl) {
      countEl.textContent = String(n);
      countEl.setAttribute('data-empty', n === 0 ? '1' : '0');
    }
    if (cartLink) cartLink.setAttribute('aria-label', 'Bag, ' + n + (n === 1 ? ' item' : ' items'));
  };

  var qty = 1;
  var qtyEl = $('[data-qty]');
  if (qtyEl) {
    $$('[data-qty-step]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        qty = Math.max(1, Math.min(9, qty + parseInt(btn.getAttribute('data-qty-step'), 10)));
        qtyEl.textContent = String(qty);
      });
    });
  }

  var addToBag = function (slug, n) {
    if (!CAT[slug]) return;
    bag[slug] = Math.min(9, (bag[slug] || 0) + n);
    saveBag();
    paintHeader();
    paintCart();
    say(CAT[slug].name + (n > 1 ? ' × ' + n : '') + ' added to bag');
  };

  $$('[data-add]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      addToBag(btn.getAttribute('data-add'), btn.closest('.pdp__buy') ? qty : 1);
    });
  });

  paintHeader();

  /* --- Cart & checkout rendering ---------------------------------------- */
  var linesEl = $('#cartLines') || $('#coLines');
  var isCheckout = !!$('#checkoutForm');

  var codOn = function () {
    var r = $('input[name="pay"]:checked');
    return !!r && r.value === 'cod';
  };

  function paintCart() {
    var subs = subtotal(), ship = shipping();
    var cod = (isCheckout && codOn()) ? COD : 0;
    var total = subs + ship + cod;

    $$('[data-sum-sub]').forEach(function (e) { e.textContent = inr(subs); });
    $$('[data-sum-ship]').forEach(function (e) {
      e.textContent = subs === 0 ? '—' : (ship === 0 ? 'Free' : inr(ship));
    });
    $$('[data-sum-cod]').forEach(function (e) { e.textContent = inr(COD); });
    $$('[data-cod-row]').forEach(function (e) { e.hidden = !cod; });
    $$('[data-sum-total]').forEach(function (e) { e.textContent = inr(total); });
    $$('[data-pay]').forEach(function (e) {
      e.textContent = cod ? 'Place order — ' + inr(total) + ' on delivery' : 'Pay ' + inr(total);
    });

    var note = $('[data-ship-note]');
    if (note) {
      note.textContent = subs === 0 ? ''
        : (ship === 0 ? 'Free shipping applied.'
                      : inr(FREE_SHIP - subs) + ' more for free shipping.');
    }

    var empty = $('#cartEmpty'), side = $('#cartSide');
    var keys = Object.keys(bag).filter(function (k) { return bag[k] > 0 && CAT[k]; });
    if (empty) empty.hidden = keys.length > 0;
    if (side) side.hidden = keys.length === 0;

    var checkoutBtn = $('[data-checkout]');
    if (checkoutBtn) checkoutBtn.classList.toggle('is-off', keys.length === 0);

    if (!linesEl) return;
    if (!keys.length) { linesEl.innerHTML = ''; return; }

    linesEl.innerHTML = keys.map(function (k) {
      var p = CAT[k], n = bag[k];
      var controls = isCheckout ? '<span class="line__qty">× ' + n + '</span>'
        : '<div class="qty qty--sm">' +
            '<button type="button" data-line-step="-1" data-slug="' + k + '" aria-label="Decrease quantity of ' + p.name + '">−</button>' +
            '<span>' + n + '</span>' +
            '<button type="button" data-line-step="1" data-slug="' + k + '" aria-label="Increase quantity of ' + p.name + '">+</button>' +
          '</div>' +
          '<button class="line__rm" type="button" data-line-rm="' + k + '">Remove</button>';
      return '<article class="line">' +
        '<a class="line__fig" href="' + p.url + '"><img src="assets/opt/' + p.img + '.webp" alt="" width="600" height="750" loading="lazy"></a>' +
        '<div class="line__body"><h3 class="line__name"><a href="' + p.url + '">' + p.name + '</a></h3>' +
        '<p class="line__size">' + p.size + '</p>' +
        '<div class="line__ctl">' + controls + '</div></div>' +
        '<span class="line__price">' + inr(p.price * n) + '</span></article>';
    }).join('');
  }

  if (linesEl || $('[data-sum-total]')) paintCart();

  document.addEventListener('click', function (e) {
    var step = e.target.closest('[data-line-step]');
    if (step) {
      var s = step.getAttribute('data-slug');
      bag[s] = Math.max(0, Math.min(9, (bag[s] || 0) + parseInt(step.getAttribute('data-line-step'), 10)));
      if (!bag[s]) delete bag[s];
      saveBag(); paintHeader(); paintCart();
      return;
    }
    var rm = e.target.closest('[data-line-rm]');
    if (rm) {
      var k = rm.getAttribute('data-line-rm');
      var name = CAT[k] ? CAT[k].name : 'Item';
      delete bag[k];
      saveBag(); paintHeader(); paintCart();
      say(name + ' removed');
    }
  });

  $$('input[name="pay"]').forEach(function (r) {
    r.addEventListener('change', paintCart);
  });

  /* --- Checkout --------------------------------------------------------- */
  var co = $('#checkoutForm');
  if (co) {
    if (!bagCount()) {
      var warn = document.createElement('p');
      warn.className = 'co__empty';
      warn.innerHTML = 'Your bag is empty. <a class="tlink" href="shop.html">See the range</a>';
      co.prepend(warn);
    }
    co.addEventListener('submit', function (e) {
      e.preventDefault();
      var invalid = null;
      $$('input[required]', co).forEach(function (f) {
        var bad = !f.value.trim() || (f.pattern && !new RegExp('^' + f.pattern + '$').test(f.value.trim()));
        f.closest('.fld').classList.toggle('is-bad', bad);
        if (bad && !invalid) invalid = f;
      });
      if (invalid) { invalid.focus(); say('Please check the highlighted fields'); return; }
      if (!bagCount()) { say('Your bag is empty'); return; }
      var order = 'EYV-' + String(Date.now()).slice(-6);
      if (store) store.setItem('eyveOrder', order);
      bag = {}; saveBag();
      window.location.href = 'order-confirmed.html';
    });
    $$('.fld input', co).forEach(function (f) {
      f.addEventListener('input', function () { f.closest('.fld').classList.remove('is-bad'); });
    });
  }

  var ordNo = $('#ordNo');
  if (ordNo) {
    var o = store && store.getItem('eyveOrder');
    if (o) { ordNo.textContent = o; }
    else { window.location.replace('index.html'); }
    paintHeader();
  }

  /* --- Forms ------------------------------------------------------------ */
  var news = $('[data-news]');
  if (news) {
    news.addEventListener('submit', function (e) {
      e.preventDefault();
      var i = $('input', news);
      say('Thank you. Check ' + (i && i.value ? i.value : 'your inbox') + ' to confirm.');
      news.reset();
    });
  }

  var contact = $('[data-contact]');
  if (contact) {
    contact.addEventListener('submit', function (e) {
      e.preventDefault();
      say('Message sent. We reply within one working day.');
      contact.reset();
    });
  }

  /* --- PDP gallery ------------------------------------------------------ */
  var galMain = $('#galMain');
  if (galMain) {
    var thumbs = $$('.gal__thumbs button');
    thumbs.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var src = btn.getAttribute('data-full');
        var img = $('img', btn);
        if (src) { galMain.removeAttribute('srcset'); galMain.removeAttribute('sizes'); galMain.src = src; galMain.alt = img ? img.alt : ''; }
        thumbs.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-sel', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      });
    });
  }

  /* --- PDP sticky buy bar ----------------------------------------------- */
  var buybar = $('#buybar');
  var mainAdd = $('.pdp__actions .btn');
  if (buybar && mainAdd) {
    var toggleBar = function () {
      var past = mainAdd.getBoundingClientRect().bottom < 0;
      buybar.classList.toggle('is-on', past);
      buybar.setAttribute('aria-hidden', past ? 'false' : 'true');
    };
    toggleBar();
    window.addEventListener('scroll', toggleBar, { passive: true });
  }

  /* --- PDP tabs --------------------------------------------------------- */
  var tabbar = $('.tabbar');
  if (tabbar) {
    var tabs = $$('button', tabbar);
    var selectTab = function (btn, focus) {
      var id = btn.getAttribute('data-tab');
      tabs.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-sel', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
      });
      $$('.tabpane').forEach(function (p) { p.classList.toggle('is-sel', p.id === id); });
      if (focus) btn.focus();
    };
    tabs.forEach(function (btn, i) {
      btn.tabIndex = btn.classList.contains('is-sel') ? 0 : -1;
      btn.addEventListener('click', function () { selectTab(btn); });
      btn.addEventListener('keydown', function (e) {
        var to = null;
        if (e.key === 'ArrowRight') to = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') to = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') to = tabs[0];
        else if (e.key === 'End') to = tabs[tabs.length - 1];
        if (to) { e.preventDefault(); selectTab(to, true); }
      });
    });
  }

})();
