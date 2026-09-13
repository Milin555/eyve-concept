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
  var COD_CAP = window.EYVE_COD_CAP || 5000;

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

  /* --- Promotions -------------------------------------------------------
     A code discounts single products only. Routines are already cut harder
     than any code we run, so a code can never make the routine the worse buy. */
  var PROMOS = window.EYVE_PROMOS || {};
  var promo = (function () {
    try { return store ? (store.getItem('eyvePromo') || '') : ''; } catch (e) { return ''; }
  })();
  var savePromo = function () {
    try { if (store) { promo ? store.setItem('eyvePromo', promo) : store.removeItem('eyvePromo'); } } catch (e) {}
  };
  var promoRule = function () { return PROMOS[promo] || null; };

  /* Value the code can act on — everything except routines, if it excludes them. */
  var eligibleTotal = function () {
    var r = promoRule(), t = 0;
    if (!r) return 0;
    for (var k in bag) {
      if (!CAT[k]) continue;
      if (r.excludesBundles && CAT[k].bundle) continue;
      t += CAT[k].price * bag[k];
    }
    return t;
  };
  var discount = function () {
    var r = promoRule();
    return r ? Math.round(eligibleTotal() * r.pct / 100) : 0;
  };
  var payable = function () { return Math.max(0, subtotal() - discount()); };

  var shipping = function () {
    var s = payable();
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

  /* --- Reveal -----------------------------------------------------------
     One observer, one class, then the element is forgotten and its transition
     stripped so the compositing layer is released. Measuring every candidate on
     every frame of every scroll was costing more than the effect was worth. */
  var revealables = $$('.rv, .rvimg, .rvline');
  var showAll = function () { revealables.forEach(function (el) { el.classList.add('is-in'); }); };

  if (reduce || !('IntersectionObserver' in window)) {
    showAll();
  } else {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        el.classList.add('is-in');
        rio.unobserve(el);
        el.addEventListener('transitionend', function () { el.style.transition = 'none'; }, { once: true });
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    revealables.forEach(function (el) { rio.observe(el); });
  }

  /* Nothing on this site is allowed to stay invisible because a script failed. */
  setTimeout(showAll, 3000);

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
  /* A toast can carry one action — an undo, or a way onward. */
  var toastAct = null;
  var say = function (msg, opt) {
    if (!toast) return;
    toastAct = (opt && opt.act) || null;
    var tail = '';
    if (opt && opt.href) tail = ' <a class="toast__act" href="' + opt.href + '">' + opt.label + '</a>';
    else if (opt && opt.act) tail = ' <button class="toast__act" type="button" data-toast-act>' + opt.label + '</button>';
    toast.innerHTML = '<span>' + msg + '</span>' + tail;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-on'); toastAct = null; }, tail ? 6000 : 2800);
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
    var steps = $$('[data-qty-step]');
    var paintQty = function () {
      qtyEl.textContent = String(qty);
      steps.forEach(function (b) {
        var d = parseInt(b.getAttribute('data-qty-step'), 10);
        var off = (d < 0 && qty <= 1) || (d > 0 && qty >= 9);
        b.setAttribute('aria-disabled', off ? 'true' : 'false');
      });
    };
    steps.forEach(function (btn) {
      btn.addEventListener('click', function () {
        qty = Math.max(1, Math.min(9, qty + parseInt(btn.getAttribute('data-qty-step'), 10)));
        paintQty();
      });
    });
    paintQty();
  }

  var addToBag = function (slug, n) {
    if (!CAT[slug]) return;
    var before = bag[slug] || 0;
    bag[slug] = Math.min(9, before + n);
    var gained = bag[slug] - before;
    saveBag();
    paintHeader();
    paintCart();
    bump();
    if (!gained) { say('Nine per order is the limit on ' + CAT[slug].name); return; }
    say(CAT[slug].name + (gained > 1 ? ' \u00d7 ' + gained : '') + ' added to bag',
        { label: 'View bag', href: 'cart.html' });
  };

  /* The bag count flinches when something lands in it. */
  var bump = function () {
    if (!countEl || reduce) return;
    countEl.classList.remove('is-bump');
    void countEl.offsetWidth;
    countEl.classList.add('is-bump');
  };

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-add]');
    if (!btn) return;
    /* Both the buy column and the sticky bar belong to the same product page,
       so both respect whatever the stepper says. */
    var usesQty = !!(btn.closest('.pdp__buy') || btn.closest('.buybar'));
    addToBag(btn.getAttribute('data-add'), usesQty && qtyEl ? qty : 1);
    if (btn.hasAttribute('data-add-label')) {
      var was = btn.getAttribute('data-add-label');
      btn.classList.add('is-done');
      window.setTimeout(function () { btn.classList.remove('is-done'); }, 1500);
      if (was) { /* label swap is handled in CSS via ::after */ }
    }
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
    var subs = subtotal(), disc = discount(), due = payable();
    var ship = shipping();
    var codBlocked = due > COD_CAP;
    var cod = (isCheckout && codOn() && !codBlocked) ? COD : 0;
    var total = due + ship + cod;

    $$('[data-sum-sub]').forEach(function (e) { e.textContent = inr(subs); });
    $$('[data-sum-disc]').forEach(function (e) { e.textContent = '\u2212' + inr(disc); });
    $$('[data-disc-row]').forEach(function (e) { e.hidden = disc === 0; });
    $$('[data-disc-code]').forEach(function (e) { e.textContent = promo; });
    $$('[data-sum-ship]').forEach(function (e) {
      e.textContent = subs === 0 ? '\u2014' : (ship === 0 ? 'Free' : inr(ship));
    });
    $$('[data-sum-cod]').forEach(function (e) { e.textContent = inr(COD); });
    $$('[data-cod-row]').forEach(function (e) { e.hidden = !cod; });
    $$('[data-sum-total]').forEach(function (e) { e.textContent = inr(total); });
    $$('[data-pay]').forEach(function (e) {
      e.textContent = cod ? 'Place order \u2014 ' + inr(total) + ' on delivery' : 'Pay ' + inr(total);
    });

    /* COD has a ceiling, and the ceiling is enforced rather than merely stated. */
    var codRadio = $('input[name="pay"][value="cod"]');
    if (codRadio) {
      codRadio.disabled = codBlocked;
      var wrap = codRadio.closest('.pay__opt');
      if (wrap) wrap.classList.toggle('is-off', codBlocked);
      if (codBlocked && codRadio.checked) {
        var upi = $('input[name="pay"][value="upi"]');
        if (upi) { upi.checked = true; }
      }
    }
    $$('[data-cod-cap]').forEach(function (e) { e.hidden = !codBlocked; });

    /* The free-shipping gap is only worth showing if it can be acted on. */
    var note = $('[data-ship-note]');
    if (note) {
      if (subs === 0) { note.textContent = ''; note.hidden = true; }
      else if (ship === 0) { note.textContent = 'Free shipping applied.'; note.hidden = false; }
      else { note.textContent = inr(FREE_SHIP - due) + ' more for free shipping.'; note.hidden = false; }
    }
    var gapBtn = $('[data-ship-fill]');
    if (gapBtn) {
      var gap = FREE_SHIP - due;
      var pick = null;
      if (subs > 0 && ship > 0) {
        Object.keys(CAT).forEach(function (k) {
          if (CAT[k].bundle || bag[k]) return;
          if (CAT[k].price >= gap && (!pick || CAT[k].price < CAT[pick].price)) pick = k;
        });
      }
      gapBtn.hidden = !pick;
      if (pick) {
        gapBtn.setAttribute('data-add', pick);
        gapBtn.textContent = 'Add ' + CAT[pick].name + ' \u2014 ' + inr(CAT[pick].price) + ', shipping free';
      }
    }

    var keys = Object.keys(bag).filter(function (k) { return bag[k] > 0 && CAT[k]; });
    var empty = $('#cartEmpty'), side = $('#cartSide'), extras = $('#cartExtras');
    if (empty) empty.hidden = keys.length > 0;
    if (side) side.hidden = keys.length === 0;
    if (extras) extras.hidden = keys.length === 0;

    var checkoutBtn = $('[data-checkout]');
    if (checkoutBtn) checkoutBtn.classList.toggle('is-off', keys.length === 0);

    /* Cross-sell only what is not already in the bag. */
    var csRail = $('[data-crosssell]');
    if (csRail) {
      var offer = Object.keys(CAT).filter(function (k) { return !CAT[k].bundle && !bag[k]; }).slice(0, 3);
      csRail.innerHTML = offer.map(function (k) {
        var p = CAT[k];
        return '<article class="xsell">' +
          '<a class="xsell__fig" href="' + p.url + '"><img src="assets/opt/' + p.img + '-sm.webp" alt="" width="600" height="750" loading="lazy" decoding="async"></a>' +
          '<div class="xsell__body"><h3><a href="' + p.url + '">' + p.name + '</a></h3>' +
          '<p class="xsell__meta">' + p.size + ' \u00b7 ' + inr(p.price) + '</p></div>' +
          '<button class="btn btn--ghost btn--sm" type="button" data-add="' + k + '">Add</button>' +
          '</article>';
      }).join('');
      var csWrap = csRail.closest('[data-crosssell-wrap]');
      if (csWrap) csWrap.hidden = !offer.length || !keys.length;
    }

    if (!linesEl) return;
    if (!keys.length) { linesEl.innerHTML = ''; return; }

    linesEl.innerHTML = keys.map(function (k) {
      var p = CAT[k], n = bag[k];
      var controls = isCheckout ? '<span class="line__qty">\u00d7 ' + n + '</span>'
        : '<div class="qty qty--sm">' +
            '<button type="button" data-line-step="-1" data-slug="' + k + '" aria-label="Decrease quantity of ' + p.name + '">\u2212</button>' +
            '<span>' + n + '</span>' +
            '<button type="button" data-line-step="1" data-slug="' + k + '" aria-label="Increase quantity of ' + p.name + '">+</button>' +
          '</div>' +
          '<button class="line__rm" type="button" data-line-rm="' + k + '" aria-label="Remove ' + p.name + ' from bag">Remove</button>';
      var was = p.rrp ? '<span class="line__was">' + inr(p.rrp) + '</span>' : '';
      return '<article class="line">' +
        '<a class="line__fig" href="' + p.url + '"><img src="assets/opt/' + p.img + '-sm.webp" alt="" width="600" height="750" loading="lazy" decoding="async"></a>' +
        '<div class="line__body"><h3 class="line__name"><a href="' + p.url + '">' + p.name + '</a></h3>' +
        '<p class="line__size">' + p.size + '</p>' +
        '<div class="line__ctl">' + controls + '</div></div>' +
        '<span class="line__price">' + was + inr(p.price * n) + '</span></article>';
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
      var had = bag[k];
      delete bag[k];
      saveBag(); paintHeader(); paintCart();
      say(name + ' removed', { label: 'Undo', act: function () {
        bag[k] = had; saveBag(); paintHeader(); paintCart(); say(name + ' put back');
      } });
      return;
    }
    var undo = e.target.closest('[data-toast-act]');
    if (undo && toastAct) { var fn = toastAct; toastAct = null; fn(); }
  });

  $$('input[name="pay"]').forEach(function (r) {
    r.addEventListener('change', paintCart);
  });


  /* --- Serviceability ----------------------------------------------------
     The shipping policy promises a PIN-code check, so the site runs one.
     Metro sorting hubs clear in 2–4 working days; everywhere else 4–7.
     A handful of far-route PINs are prepaid-only, which is how couriers
     actually operate. */
  var METRO = ['110','400','560','600','700','500','411','380','395','122','201','641','682','302'];
  var NO_COD = ['190','191','192','193','194','737','790','791','792','793','794','795','796','797','798','799','744'];
  var WORKDAYS = function (n) {
    var d = new Date(), added = 0;
    while (added < n) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) added++; }
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };
  var lookupPin = function (pin) {
    if (!/^[1-9][0-9]{5}$/.test(pin)) return null;
    var p3 = pin.slice(0, 3);
    var metro = METRO.indexOf(p3) > -1;
    return {
      pin: pin,
      cod: NO_COD.indexOf(p3) === -1,
      lo: metro ? 2 : 4,
      hi: metro ? 4 : 7,
      by: WORKDAYS(metro ? 4 : 7)
    };
  };
  var lastPin = (function () {
    try { return store ? (store.getItem('eyvePin') || '') : ''; } catch (e) { return ''; }
  })();

  $$('[data-pin-form]').forEach(function (form) {
    var input = $('input', form);
    var out = $('[data-pin-out]', form.parentNode) || $('[data-pin-out]', form);
    var render = function (r, typed) {
      if (!out) return;
      if (!r) {
        out.className = 'pincheck__out is-bad';
        out.textContent = typed ? 'That is not a valid Indian PIN code.' : '';
        return;
      }
      out.className = 'pincheck__out is-ok';
      out.innerHTML = '<b>Delivers to ' + r.pin + '</b> in ' + r.lo + '\u2013' + r.hi +
        ' working days \u2014 by <b>' + r.by + '</b>.' +
        (r.cod ? ' Cash on delivery available.'
               : ' <span class="pincheck__warn">Prepaid only on this route.</span>');
    };
    if (input && lastPin) { input.value = lastPin; render(lookupPin(lastPin), false); }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = (input.value || '').trim();
      var r = lookupPin(v);
      if (r) { lastPin = v; try { if (store) store.setItem('eyvePin', v); } catch (x) {} }
      render(r, true);
    });
  });

  /* --- Promotion code ---------------------------------------------------- */
  $$('[data-promo-form]').forEach(function (form) {
    var input = $('input', form);
    var out = $('[data-promo-out]', form.parentNode) || $('[data-promo-out]', form);
    var render = function (msg, ok) {
      if (!out) return;
      out.className = 'promo__out ' + (ok ? 'is-ok' : 'is-bad');
      out.innerHTML = msg;
    };
    var paintApplied = function () {
      if (!promo) { render('', true); if (input) input.value = ''; return; }
      var d = discount();
      if (!d) {
        render('<b>' + promo + '</b> applies to single products only \u2014 your bag is all routines, ' +
               'which are already priced below it. <button class="promo__clear" type="button" data-promo-clear>Remove</button>', true);
      } else {
        render('<b>' + promo + '</b> applied \u2014 you save ' + inr(d) +
               '. <button class="promo__clear" type="button" data-promo-clear>Remove</button>', true);
      }
      if (input) input.value = promo;
    };
    paintApplied();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var code = (input.value || '').trim().toUpperCase();
      if (!PROMOS[code]) { render('That code is not one of ours.', false); return; }
      promo = code; savePromo(); paintCart(); paintApplied();
      say(code + ' applied');
    });
    form.parentNode.addEventListener('click', function (e) {
      if (!e.target.closest('[data-promo-clear]')) return;
      promo = ''; savePromo(); paintCart(); paintApplied();
      say('Code removed');
    });
  });

  /* --- Checkout --------------------------------------------------------- */
  var co = $('#checkoutForm');
  if (co) {
    if (!bagCount()) {
      /* Nobody should be asked for a delivery address for an order of nothing. */
      co.hidden = true;
      var side = $('#coSide');
      if (side) side.hidden = true;
      var host = $('#coEmpty');
      if (host) host.hidden = false;
      else {
        var warn = document.createElement('p');
        warn.className = 'co__empty';
        warn.innerHTML = 'Your bag is empty. <a class="tlink" href="shop.html">See the range</a>';
        co.parentNode.insertBefore(warn, co);
      }
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
  /* A toast disappears. A receipt stays on the page. */
  var settle = function (form, msg) {
    var done = form.parentNode.querySelector('.formdone');
    if (done) {
      done.innerHTML = msg;
      done.hidden = false;
      form.hidden = true;
      done.setAttribute('tabindex', '-1');
      done.focus();
    }
    say(done ? 'Done' : msg.replace(/<[^>]+>/g, ''));
  };

  var news = $('[data-news]');
  if (news) {
    news.addEventListener('submit', function (e) {
      e.preventDefault();
      var i = $('input', news);
      settle(news, '<b>Thank you.</b> Check ' + (i && i.value ? i.value : 'your inbox') +
                   ' to confirm. One email a month, and nothing else.');
    });
  }

  var contact = $('[data-contact]');
  if (contact) {
    contact.addEventListener('submit', function (e) {
      e.preventDefault();
      settle(contact, '<b>Message sent.</b> We reply within one working day, ' +
                      'Monday to Saturday.');
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

  /* --- Reels ------------------------------------------------------------ */
  /* A rail of posters. One <video> exists at a time, inside the viewer, so
     nothing downloads until somebody asks for it. */
  var reelRail = $('[data-reels]');
  if (reelRail) {
    var reelCards = $$('[data-reel]', reelRail);
    var viewer = $('#reelViewer');
    var stage = viewer && $('[data-reel-stage]', viewer);
    var capEl = viewer && $('[data-reel-caption]', viewer);
    var idxEl = viewer && $('[data-reel-index]', viewer);
    var current = -1, lastFocus = null, video = null;

    var teardown = function () {
      if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
      if (stage) stage.innerHTML = '';
      video = null;
    };

    var mount = function (i) {
      var card = reelCards[i];
      if (!card) return;
      teardown();
      current = i;
      video = document.createElement('video');
      video.src = card.getAttribute('data-reel');
      video.poster = card.getAttribute('data-poster');
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('preload', 'auto');
      video.controls = true;
      video.loop = true;
      video.muted = true;                    /* muted so autoplay is permitted */
      video.className = 'reelv__video';
      stage.appendChild(video);
      var p = video.play();
      if (p && p.catch) p.catch(function () { /* user will press play */ });
      if (capEl) capEl.textContent = card.getAttribute('data-caption') || '';
      if (idxEl) idxEl.textContent = (i + 1) + ' / ' + reelCards.length;
      reelCards.forEach(function (c, n) { c.setAttribute('aria-selected', n === i ? 'true' : 'false'); });
    };

    var closeViewer = function () {
      teardown();
      viewer.classList.remove('is-open');
      viewer.setAttribute('aria-hidden', 'true');
      document.documentElement.classList.remove('is-locked');
      current = -1;
      if (lastFocus) { lastFocus.focus(); lastFocus = null; }
    };

    var openViewer = function (i, origin) {
      lastFocus = origin || document.activeElement;
      viewer.classList.add('is-open');
      viewer.setAttribute('aria-hidden', 'false');
      document.documentElement.classList.add('is-locked');
      mount(i);
      var close = $('[data-reel-close]', viewer);
      if (close) close.focus();
    };

    var step = function (d) {
      if (current < 0) return;
      mount((current + d + reelCards.length) % reelCards.length);
    };

    reelCards.forEach(function (card, i) {
      card.addEventListener('click', function () { openViewer(i, card); });
    });

    if (viewer) {
      viewer.addEventListener('click', function (e) {
        if (e.target.closest('[data-reel-close]') || e.target === viewer ||
            e.target.hasAttribute('data-reel-scrim')) { closeViewer(); return; }
        if (e.target.closest('[data-reel-prev]')) step(-1);
        if (e.target.closest('[data-reel-next]')) step(1);
      });
      document.addEventListener('keydown', function (e) {
        if (!viewer.classList.contains('is-open')) return;
        if (e.key === 'Escape') { e.preventDefault(); closeViewer(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
        else if (e.key === 'Tab') {                    /* keep focus inside */
          var f = $$('button, [href], video', viewer).filter(function (el) {
            return el.offsetParent !== null;
          });
          if (!f.length) return;
          var first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
    }

    /* Drag-to-scroll the rail with a pointer, the way a real shelf behaves. */
    var down = false, startX = 0, startL = 0, moved = 0;
    reelRail.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;          /* native scroll is better */
      down = true; moved = 0; startX = e.clientX; startL = reelRail.scrollLeft;
      reelRail.classList.add('is-dragging');
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      reelRail.scrollLeft = startL - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return;
      down = false;
      reelRail.classList.remove('is-dragging');
    });
    reelRail.addEventListener('click', function (e) {
      if (moved > 6) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  }

})();
