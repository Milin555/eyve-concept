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

  /* Storage is the buyer's to edit, and a second tab's to change underneath
     us. Everything that reads it goes through here: quantities are clamped to
     what the shop will actually sell, unknown slugs are dropped, and a bag
     that needed correcting is written back so it stops being wrong. */
  var readBag = function () {
    if (!store) return {};
    var raw;
    try { raw = JSON.parse(store.getItem('eyveBag') || '{}'); } catch (e) { return {}; }
    var out = {}, dirty = false;
    for (var k in raw) {
      var q = Math.max(0, Math.min(9, parseInt(raw[k], 10) || 0));
      if (q && CAT[k]) out[k] = q; else dirty = true;
      if (CAT[k] && String(q) !== String(raw[k])) dirty = true;
    }
    if (dirty) { try { store.setItem('eyveBag', JSON.stringify(out)); } catch (e) {} }
    return out;
  };

  var bag = readBag();

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

  /* The same maths against a hypothetical bag, used to price a routine swap. */
  var payableOf = function (b) {
    var r = promoRule(), sub = 0, elig = 0;
    for (var k in b) {
      if (!CAT[k]) continue;
      sub += CAT[k].price * b[k];
      if (r && !(r.excludesBundles && CAT[k].bundle)) elig += CAT[k].price * b[k];
    }
    return Math.max(0, sub - (r ? Math.round(elig * r.pct / 100) : 0));
  };

  var shipping = function () {
    /* Measured on the subtotal, not the discounted total. The threshold is
       advertised against what you put in the bag; moving it once a code
       applies is exactly the kind of surprise that loses an order. */
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
      // 400ms in, 250ms hold, 450ms curtain. It used to sit on the LCP for a
      // second and a half; a brand mark is an overture, not an interval.
      setTimeout(function () { intro.classList.add('is-out'); }, 650);
      setTimeout(function () {
        intro.classList.add('is-done');
        document.documentElement.style.overflow = '';
        try { sessionStorage.setItem('eyveSeen', '1'); } catch (e) {}
      }, 1100);
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
      /* An overlay that leaves the page scrolling underneath is a dropdown. */
      document.documentElement.classList.toggle('is-locked', open);
      measureRail();
    };
    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    /* The scrim is a pseudo-element on .topbar, so a click that lands on the
       bar itself but outside the nav is a click on the scrim. */
    topbar.addEventListener('click', function (e) {
      if (e.target === topbar && topbar.classList.contains('is-open')) setMenu(false);
    });
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
    /* .rvimg hides itself with `clip-path: inset(0 0 100% 0)` — a box of zero
       height. An IntersectionObserver measures the clipped box, so one of these
       reports ratio 0.000 forever, and the only thing that could ever give it
       height is the class it can only earn by intersecting. Measured on every
       page: each .rvimg sat dark until the three-second failsafe below, then
       the whole page arrived at once. It read as a slow site, and the images
       were being blamed for it — they had finished downloading inside a second.

       So watch a box that still has height. For a clipped element that is the
       nearest ancestor which is not itself clipped, and revealing that box
       reveals everything clipped inside it. */
    var boxFor = function (el) {
      var p = el;
      while (p && p.classList && p.classList.contains('rvimg')) p = p.parentElement;
      return p || el;
    };
    var reveal = function (el) {
      el.classList.add('is-in');
      el.addEventListener('transitionend', function () { el.style.transition = 'none'; }, { once: true });
    };
    var watch = [];
    revealables.forEach(function (el) {
      var box = boxFor(el);
      if (!box.rvKin) { box.rvKin = []; watch.push(box); }
      box.rvKin.push(el);
    });
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        (e.target.rvKin || [e.target]).forEach(reveal);
        rio.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    watch.forEach(function (el) { rio.observe(el); });
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
    var qtySteps = $$('[data-qty-step]');
    var paintQty = function () {
      qtyEl.textContent = String(qty);
      qtySteps.forEach(function (b) {
        var d = parseInt(b.getAttribute('data-qty-step'), 10);
        var off = (d < 0 && qty <= 1) || (d > 0 && qty >= 9);
        b.setAttribute('aria-disabled', off ? 'true' : 'false');
      });
    };
    qtySteps.forEach(function (btn) {
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
    if (!gained) { say('Nine is the most we take of ' + CAT[slug].name + ' in one order'); return; }
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
    btn.classList.add('is-done');
    window.setTimeout(function () { btn.classList.remove('is-done'); }, 1400);
  });

  paintHeader();

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
  /* India's postal circles occupy a known set of leading pairs. Anything
     outside them is not a PIN code, however well-formed it looks. */
  var CIRCLES = [[11,19],[20,28],[30,34],[36,39],[40,44],[45,49],[50,53],
                 [56,59],[60,64],[67,69],[70,74],[75,77],[78,79],[80,85]];
  var lookupPin = function (pin) {
    if (!/^[1-9][0-9]{5}$/.test(pin)) return null;
    var p2 = parseInt(pin.slice(0, 2), 10);
    var known = CIRCLES.some(function (r) { return p2 >= r[0] && p2 <= r[1]; });
    if (!known) return null;
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
  /* The route the buyer told us about decides whether COD is even offered.
     Promising a serviceability check and then ignoring it at the one moment
     it matters is worse than never offering the check. */
  /* Set when a full PIN has been entered that we cannot place. It is not the
     same state as "no PIN yet": re-opening cash on delivery because the buyer
     mistyped is how an undeliverable COD order gets placed. */
  var pinUnknown = false;
  var routeTakesCod = function () {
    if (pinUnknown) return false;
    if (!lastPin) return true;                 // nothing claimed yet, so allow
    var r = lookupPin(lastPin);
    return r ? r.cod : false;
  };

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
      if (r) { lastPin = v; pinUnknown = false; try { if (store) store.setItem('eyvePin', v); } catch (x) {} }
      else { pinUnknown = true; lastPin = ''; try { if (store) store.removeItem('eyvePin'); } catch (x) {} }
      render(r, true);
      /* The bag's own summary quotes this route. It has to hear about it. */
      paintCart();
    });
  });


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
    /* The courier collects the whole amount, fee and shipping included, so
       that is the figure the ceiling has to be measured against. */
    var codTotal = due + ship + COD;
    var overCap = codTotal > COD_CAP;
    var offRoute = !routeTakesCod();
    var codBlocked = overCap || offRoute;
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
      e.classList.toggle('is-off', subs === 0);
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
    $$('[data-cod-cap]').forEach(function (e) {
      e.hidden = !codBlocked;
      if (!codBlocked) return;
      if (overCap) {
        e.textContent = 'Cash on delivery is capped at ' + inr(COD_CAP) + ' collected, and this order ' +
          'comes to ' + inr(codTotal) + ' with the handling fee and shipping. It needs to be prepaid.';
      } else if (pinUnknown) {
        /* They mistyped. That is not the same as reaching a route we cannot
           serve, and telling them it is would be a lie about their address. */
        e.textContent = 'We do not recognise that PIN code, so we cannot say whether cash on ' +
          'delivery runs there. Correct it and the option comes back.';
      } else {
        e.textContent = 'Cash on delivery is not available on the route to ' + lastPin +
          '. This order needs to be prepaid.';
      }
    });

    /* The free-shipping gap is only worth showing if it can be acted on. */
    var note = $('[data-ship-note]');
    if (note) {
      if (subs === 0) { note.textContent = ''; note.hidden = true; }
      else if (ship === 0) { note.textContent = 'Free shipping applied.'; note.hidden = false; }
      else { note.textContent = inr(FREE_SHIP - subs) + ' more for free shipping.'; note.hidden = false; }
    }
    /* There was a button here offering to close the free-shipping gap with one
       click. The cheapest product is 799 rupees and the only two bags that can
       sit below the threshold leave gaps of 200 and 100, so it was correctly
       suppressed in every reachable state — which makes it dead weight. The
       note stays; the button goes. A sub-400 add-on would bring it back. */
    var gapBtn = $('[data-ship-fill]');
    if (gapBtn) gapBtn.hidden = true;

    /* The bag already knows the route, so it should not repeat generic COD
       terms on a PIN it has just told you is prepaid-only. */
    $$('[data-cod-terms]').forEach(function (e) {
      var r = lastPin && lookupPin(lastPin);
      if (r && !r.cod) {
        e.innerHTML = '<b>' + lastPin + ' is a prepaid-only route.</b> Cash on delivery is not ' +
          'offered there, so this order is paid before dispatch. Arriving in ' + r.lo +
          '\u2013' + r.hi + ' working days \u2014 by <b>' + r.by + '</b>.';
      } else if (r) {
        e.innerHTML = '<b>Delivering to ' + r.pin + ' by ' + r.by + '.</b> Paying cash on ' +
          'delivery adds a ' + inr(COD) + ' handling fee at checkout, and is capped at ' +
          inr(COD_CAP) + ' collected.';
      }
    });

    var keys = Object.keys(bag).filter(function (k) { return bag[k] > 0 && CAT[k]; });
    var empty = $('#cartEmpty'), side = $('#cartSide'), extras = $('#cartExtras');
    if (empty) empty.hidden = keys.length > 0;
    if (side) side.hidden = keys.length === 0;
    if (extras) extras.hidden = keys.length === 0;

    /* There are two of these now — the one on the page and the one in the
       sticky bar — so both have to be told. */
    $$('[data-checkout]').forEach(function (btn) { btn.classList.toggle('is-off', keys.length === 0); });
    var bar = $('.stickybar');
    if (bar) bar.hidden = keys.length === 0;

    /* If the bag already holds every part of a routine, say so. Letting
       somebody pay 548 rupees more for the same three bottles, and find out
       afterwards, is the kind of thing that loses a customer permanently. */
    var upsell = $('[data-bundle-upsell]');
    if (upsell) {
      /* What the swap is really worth, with whatever code is applied taken
         into account — a routine is excluded from the code, so swapping gives
         the discount up. Quoting the undiscounted gap would promise 548 rupees
         and deliver 68. And when more than one routine matches, offer the one
         that saves most rather than the one that sorts first. */
      var match = null;
      var nowDue = payable();
      Object.keys(CAT).forEach(function (k) {
        var b = CAT[k];
        if (!b.bundle) return;
        var has = b.parts && b.parts.every(function (part) { return bag[part] > 0; });
        if (!has) return;
        /* However many complete sets are sitting in the bag, offer all of
           them. Swapping one of two identical routines and calling it done
           leaves the buyer paying full price for the second. */
        var sets = Math.min(9, Math.min.apply(null, b.parts.map(function (part) { return bag[part]; })));
        if (b.parts.some(function (part) { return (bag[part] || 0) < sets; })) return;
        var after = {};
        Object.keys(bag).forEach(function (x) { after[x] = bag[x]; });
        b.parts.forEach(function (part) {
          after[part] -= sets;
          if (after[part] <= 0) delete after[part];
        });
        after[k] = Math.min(9, (after[k] || 0) + sets);
        var save = nowDue - payableOf(after);
        if (save > 0 && (!match || save > match.save)) match = { slug: k, b: b, save: save, sets: sets };
      });
      upsell.hidden = !match;
      if (match) {
        var word = match.b.parts.length === 3 ? 'three' : 'five';
        var many = match.sets > 1;
        upsell.innerHTML =
          '<p class="upsell__h">' + (many
            ? 'That is ' + match.sets + ' complete routines.'
            : 'Those ' + word + ' are a routine.') + '</p>' +
          '<p class="upsell__p">' + match.b.name + ' holds the same ' + match.b.parts.length +
          ' products for ' + inr(match.b.price) + (many ? ' each' : '') +
          ' \u2014 <b>' + inr(match.save) + ' less</b> than buying them separately.</p>' +
          '<button class="btn btn--sm" type="button" data-swap-bundle="' + match.slug +
          '" data-swap-sets="' + match.sets + '">' +
          'Swap to the routine, save ' + inr(match.save) + '</button>';
      }
    }

    /* Cross-sell only what is not already in the bag. */
    var csRail = $('[data-crosssell]');
    if (csRail) {
      var offer = Object.keys(CAT).filter(function (k) { return !CAT[k].bundle && !bag[k]; }).slice(0, 3);
      csRail.innerHTML = offer.map(function (k) {
        var p = CAT[k];
        return '<article class="xsell">' +
          '<a class="xsell__fig" href="' + p.url + '" tabindex="-1" aria-hidden="true"><img src="assets/opt/' + p.img + '-tn.webp" alt="" width="220" height="275" loading="lazy" decoding="async"></a>' +
          '<div class="xsell__body"><h3><a href="' + p.url + '">' + p.name + '</a></h3>' +
          '<p class="xsell__meta">' + p.size + ' \u00b7 ' + inr(p.price) + '</p></div>' +
          '<button class="btn btn--ghost btn--sm" type="button" data-add="' + k + '">Add</button>' +
          '</article>';
      }).join('');
      var csWrap = csRail.closest('[data-crosssell-wrap]');
      if (csWrap) csWrap.hidden = !offer.length || !keys.length;
    }

    /* The applied-code panel states a saving. It has to be recomputed whenever
       the saving changes, which is every quantity step, removal and swap. */
    if (typeof repaintPromo === 'function') repaintPromo();

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
      var was = p.rrp ? '<span class="line__was">' + inr(p.rrp * n) + '</span>' : '';
      return '<article class="line">' +
        '<a class="line__fig" href="' + p.url + '" tabindex="-1" aria-hidden="true"><img src="assets/opt/' + p.img + '-tn.webp" alt="" width="220" height="275" loading="lazy" decoding="async"></a>' +
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
    if (undo && toastAct) { var fn = toastAct; toastAct = null; fn(); return; }

    var swap = e.target.closest('[data-swap-bundle]');
    if (swap) {
      var slug = swap.getAttribute('data-swap-bundle');
      var sets = Math.max(1, parseInt(swap.getAttribute('data-swap-sets'), 10) || 1);
      var before = JSON.parse(JSON.stringify(bag));
      CAT[slug].parts.forEach(function (part) {
        bag[part] -= sets;
        if (bag[part] <= 0) delete bag[part];
      });
      /* The same ceiling addToBag enforces. Without it a swap could push a
         routine to ten, and the clamp on the next read would delete one
         without saying so. */
      bag[slug] = Math.min(9, (bag[slug] || 0) + sets);
      saveBag(); paintHeader(); paintCart(); bump();
      say('Swapped to ' + CAT[slug].name, { label: 'Undo', act: function () {
        bag = before; saveBag(); paintHeader(); paintCart(); say('Put back as separate products');
      } });
    }
  });

  $$('input[name="pay"]').forEach(function (r) {
    r.addEventListener('change', paintCart);
  });



  /* --- Shared element across pages ---------------------------------------
     The product photograph is the same object on the grid and on the product
     page, so it should travel rather than cross-fade. The name is applied to
     one element at a time — two elements sharing a name abort the transition. */
  if (document.startViewTransition) {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('.pcard__link, .line__fig, .xsell__fig');
      if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      var img = link.querySelector('img');
      if (!img) return;
      $$('[style*="view-transition-name"]').forEach(function (el) { el.style.viewTransitionName = ''; });
      img.style.viewTransitionName = 'product-shot';
    }, true);
  }

  /* The PIN the buyer types at checkout is the one that decides the route, so
     it replaces whatever was stored and re-gates cash on delivery live. */
  var coPin = $('#coPin'), coPinOut = $('[data-co-pin-out]');
  if (coPin) {
    if (!coPin.value && lastPin) coPin.value = lastPin;
    var paintCoPin = function () {
      var v = (coPin.value || '').trim();
      var r = lookupPin(v);
      if (r) {
        lastPin = v; pinUnknown = false;
        try { if (store) store.setItem('eyvePin', v); } catch (e) {}
      } else {
        pinUnknown = v.length >= 6;
        if (v.length >= 6) lastPin = '';
      }
      if (coPinOut) {
        if (!v) { coPinOut.textContent = ''; coPinOut.className = 'pincheck__out'; }
        else if (!r) {
          coPinOut.className = 'pincheck__out' + (v.length >= 6 ? ' is-bad' : '');
          coPinOut.textContent = v.length >= 6 ? 'We do not recognise that PIN code.' : '';
        } else {
          coPinOut.className = 'pincheck__out is-ok';
          coPinOut.innerHTML = 'Arrives in ' + r.lo + '\u2013' + r.hi + ' working days \u2014 by <b>' + r.by + '</b>.' +
            (r.cod ? '' : ' <span class="pincheck__warn">This route is prepaid only.</span>');
        }
      }
      paintCart();
    };
    coPin.addEventListener('input', paintCoPin);
    coPin.addEventListener('change', paintCoPin);
    paintCoPin();
  }

  /* --- Promotion code ---------------------------------------------------- */
  var repaintPromo = null;
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
      if (!bagCount()) {
        render('<b>' + promo + '</b> is saved, and applies as soon as there is something to apply it to.' +
               ' <button class="promo__clear" type="button" data-promo-clear>Remove</button>', true);
        if (input) input.value = promo;
        return;
      }
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
    repaintPromo = paintApplied;
    paintApplied();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var code = (input.value || '').trim().toUpperCase();
      if (!PROMOS[code]) {
        render(promo
          ? 'That code is not one of ours. <b>' + promo + '</b> is still applied.'
          : 'That code is not one of ours.', false);
        return;
      }
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
      var panel = side && side.closest('.section');
      if (panel) panel.hidden = true;
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

      /* Decide what is wrong before saying anything about it — the PIN check
         used to run after the messages were written, so the one field with a
         rule of its own was the one field that stayed silent. */
      $$('input[required], select[required]', co).forEach(function (f) {
        var v = (f.value || '').trim();
        var bad = !v || (f.pattern && !new RegExp('^' + f.pattern + '$').test(v));
        f.closest('.fld').classList.toggle('is-bad', bad);
        if (bad && !invalid) invalid = f;
      });
      /* A well-formed PIN still has to be a real one. */
      if (coPin && !lookupPin((coPin.value || '').trim())) {
        var pinFld = coPin.closest('.fld');
        if (pinFld) pinFld.classList.add('is-bad');
        if (!invalid) invalid = coPin;
      }

      /* Five of the seven fields had no message at all, and the two that did
         showed their unchanged neutral hint under a red border. A payment form
         that turns red and says nothing is a form people abandon. */
      $$('.fld', co).forEach(function (fld) {
        var f = $('input, select, textarea', fld);
        if (!f) return;
        var note = $('.fld__err', fld);
        if (!fld.classList.contains('is-bad')) { if (note) note.remove(); return; }
        if (!note) {
          note = document.createElement('small');
          note.className = 'fld__err';
          note.setAttribute('role', 'alert');
          fld.appendChild(note);
        }
        var v = (f.value || '').trim();
        var label = (($('label', fld) || {}).textContent || 'This').replace(/\s*optional.*$/i, '').trim();
        note.textContent = !v
          ? (f.tagName === 'SELECT' ? 'Choose a state so we can route the parcel.'
                                    : label + ' is needed to deliver the order.')
          : (f.id === 'coEmail' ? 'That does not look like an email address we can send a receipt to.'
          : (f.id === 'coPhone' ? 'An Indian mobile number is ten digits and starts 6, 7, 8 or 9.'
          : (f.id === 'coPin'   ? 'We do not recognise that PIN code. Check the six digits.'
          : 'Please check ' + label.toLowerCase() + '.')));
      });

      if (invalid) { invalid.focus(); say('Please check the highlighted fields'); return; }
      if (!bagCount()) { say('Your bag is empty'); return; }
      var order = 'EYV-' + String(Date.now()).slice(-6);
      if (store) {
        store.setItem('eyveOrder', order);
        /* Keep a copy of what was bought so the confirmation is a receipt
           rather than an order number on an empty page. */
        try {
          store.setItem('eyveReceipt', JSON.stringify({
            at: Date.now(),
            lines: Object.keys(bag).filter(function (k) { return bag[k] > 0 && CAT[k]; })
                     .map(function (k) { return { k: k, n: bag[k], p: CAT[k].price, nm: CAT[k].name }; }),
            promo: promo, disc: discount(), sub: subtotal(),
            ship: shipping(), cod: (codOn() ? COD : 0), pin: lastPin,
            pay: (($('input[name="pay"]:checked') || {}).value || 'upi')
          }));
        } catch (x) {}
      }
      bag = {}; saveBag();
      promo = ''; savePromo();          /* a welcome offer is used once */
      window.location.href = 'order-confirmed.html';
    });
    var gst = $('#coGstin') || $('input[name="gstin"]', co);
    if (gst) {
      gst.addEventListener('input', function () {
        var at = gst.selectionStart;
        gst.value = gst.value.toUpperCase();
        try { gst.setSelectionRange(at, at); } catch (e) {}
      });
    }
    $$('.fld input, .fld select', co).forEach(function (f) {
      var clear = function () { f.closest('.fld').classList.remove('is-bad'); };
      f.addEventListener('input', clear);
      f.addEventListener('change', clear);
    });
  }

  /* --- Confirmation ------------------------------------------------------ */
  var receiptEl = $('[data-receipt]');
  if (receiptEl) {
    var r = null;
    try { r = JSON.parse((store && store.getItem('eyveReceipt')) || 'null'); } catch (e) {}
    /* A receipt survives a refresh, not a week. Coming back later should not
       re-render an old order as though it had just been placed. */
    /* An old receipt should stop being replayed as though the order were new.
       It should NOT take the order number with it: this page's own copy says
       "there is no account area and no order-status page, so keep this number",
       and deleting it sent the reader to the homepage without a word. The
       lines go; the number and the date stay. */
    var FRESH = 6 * 60 * 60 * 1000;
    var staleReceipt = r && (!r.at || Date.now() - r.at > FRESH);
    if (staleReceipt) {
      try { store.removeItem('eyveReceipt'); } catch (e) {}
      r = null;
      var note = $('[data-receipt-stale]');
      if (note) note.hidden = false;
    }
    if (r && r.lines && r.lines.length) {
      var total = Math.max(0, r.sub - (r.disc || 0)) + (r.ship || 0) + (r.cod || 0);
      receiptEl.innerHTML =
        '<h2 class="h3">What you ordered</h2>' +
        '<div class="receipt__lines">' + r.lines.map(function (l) {
          /* Priced as it was at purchase, not as it is now — a receipt that
             stops adding up because the shop changed a price is not a receipt. */
          var nm = l.nm || (CAT[l.k] && CAT[l.k].name);
          var price = (typeof l.p === 'number' ? l.p : (CAT[l.k] && CAT[l.k].price));
          if (!nm || typeof price !== 'number') return '';
          return '<div class="receipt__line"><span>' + nm +
                 (l.n > 1 ? ' \u00d7 ' + l.n : '') + '</span><span>' + inr(price * l.n) + '</span></div>';
        }).join('') + '</div>' +
        '<dl class="cart__sum">' +
          '<div><dt>Subtotal</dt><dd>' + inr(r.sub) + '</dd></div>' +
          (r.disc ? '<div class="sum__disc"><dt>Code ' + (r.promo || '') + '</dt><dd>\u2212' + inr(r.disc) + '</dd></div>' : '') +
          '<div><dt>Shipping</dt><dd>' + (r.ship ? inr(r.ship) : 'Free') + '</dd></div>' +
          (r.cod ? '<div><dt>Cash-on-delivery handling</dt><dd>' + inr(r.cod) + '</dd></div>' : '') +
          '<div class="cart__sum-total"><dt>' + (r.cod ? 'To pay on delivery' : 'Paid') + '</dt><dd>' + inr(total) + '</dd></div>' +
        '</dl>';
      var est = r.pin && lookupPin(r.pin);
      var estEl = $('[data-receipt-eta]');
      if (estEl && est) {
        estEl.innerHTML = 'Delivering to <b>' + r.pin + '</b> in ' + est.lo + '\u2013' + est.hi +
                          ' working days \u2014 by <b>' + est.by + '</b>.';
        estEl.hidden = false;
      }
    }
  }

  var ordNo = $('#ordNo');
  if (ordNo) {
    var o = store && store.getItem('eyveOrder');
    if (o) {
      ordNo.textContent = o;
      /* Arriving here means this order left the bag — but only this order.
         Clearing on every visit emptied a bag the buyer had rebuilt since,
         which is somebody else's shopping thrown away without a word. */
      var settled = false;
      try { settled = store && store.getItem('eyveSettled') === o; } catch (e) {}
      if (!settled) {
        if (bagCount()) { bag = {}; saveBag(); }
        promo = ''; savePromo();
        try { if (store) store.setItem('eyveSettled', o); } catch (e) {}
      }
    } else {
      window.location.replace('index.html');
    }
    paintHeader();
  }

  /* --- Restored and duplicated views --------------------------------------
     A page restored from the back-forward cache, or left open while a second
     tab changes the bag, is showing a total that may no longer be true.

     The first version of this reloaded the page. That was the wrong primitive:
     the back-forward cache exists to preserve what the buyer had typed, and
     reloading threw it away — pressing Back from the refund policy linked in
     the payment panel blanked a filled-in address. Re-read the state and
     repaint the parts that render it. Nothing that holds typing is touched. */
  var reread = function () {
    bag = readBag();
    try { promo = store ? (store.getItem('eyvePromo') || '') : ''; } catch (e) {}
    try { lastPin = store ? (store.getItem('eyvePin') || '') : ''; } catch (e) {}
    paintHeader();
    if (typeof paintCart === 'function') paintCart();
  };

  window.addEventListener('pageshow', function (e) { if (e.persisted) reread(); });
  window.addEventListener('storage', function (e) {
    if (e.key && e.key.indexOf('eyve') !== 0) return;
    reread();
  });

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

  /* --- Deferred drawers ---------------------------------------------------
     A lazy image inside a closed <details> never starts loading, and opening
     the element is not on its own enough to start it. Hand them over on the
     first open, so the drawer costs nothing until it is asked for and is not
     a grid of empty frames when it is. */
  $$('details').forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      $$('img[loading="lazy"]', d).forEach(function (img) {
        img.loading = 'eager';
        if (!img.complete) img.src = img.src;      /* nudge the fetch */
      });
    });
  });

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
    var barEl = viewer && $('[data-reel-bar]', viewer);
    var soundEl = viewer && $('[data-reel-sound]', viewer);
    var current = -1, lastFocus = null, video = null;
    /* Sound preference lives for as long as the viewer is open and no longer.
       A video that starts loud because of something you did five minutes ago
       is a defect, not a convenience. */
    var wantSound = false;

    var paintSound = function () {
      if (!soundEl) return;
      soundEl.setAttribute('aria-pressed', wantSound ? 'true' : 'false');
      /* Report the state, not the action. "Sound on" beside a muted video
         reads as a claim about the video, not as a button. */
      soundEl.textContent = wantSound ? 'Sound on' : 'Muted';
      soundEl.setAttribute('aria-label', wantSound ? 'Sound on. Mute the video' : 'Muted. Turn sound on');
    };

    var teardown = function () {
      /* Release the buffer, but leave the stage furniture alone — the progress
         bar lives there and must survive between reels. */
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
        if (video.parentNode) video.parentNode.removeChild(video);
      }
      video = null;
      if (barEl) barEl.style.transform = 'scaleX(0)';
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
      video.muted = !wantSound;              /* muted start is what autoplay allows */
      video.className = 'reelv__video';
      video.addEventListener('timeupdate', function () {
        if (!barEl || !video.duration) return;
        barEl.style.transform = 'scaleX(' + (video.currentTime / video.duration) + ')';
      });
      if (barEl) barEl.style.transform = 'scaleX(0)';
      stage.insertBefore(video, stage.firstChild);
      var p = video.play();
      if (p && p.catch) p.catch(function () { /* user will press play */ });
      paintSound();
      if (capEl) capEl.textContent = card.getAttribute('data-caption') || '';
      if (idxEl) idxEl.textContent = (i + 1) + ' / ' + reelCards.length;
      reelCards.forEach(function (c, n) { c.setAttribute('aria-selected', n === i ? 'true' : 'false'); });
    };

    var closeViewer = function () {
      teardown();
      wantSound = false;
      paintSound();
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
        if (e.target.closest('[data-reel-prev]')) { step(-1); return; }
        if (e.target.closest('[data-reel-next]')) { step(1); return; }
        if (e.target.closest('[data-reel-sound]')) {
          wantSound = !wantSound;
          if (video) video.muted = !wantSound;
          paintSound();
          return;
        }
        /* Tapping the video itself pauses and resumes it. */
        if (video && e.target === video) { video.paused ? video.play() : video.pause(); }
      });
      document.addEventListener('keydown', function (e) {
        if (!viewer.classList.contains('is-open')) return;
        if (e.key === 'Escape') { e.preventDefault(); closeViewer(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
        else if (e.key === 'm' || e.key === 'M') {
          wantSound = !wantSound;
          if (video) video.muted = !wantSound;
          paintSound();
        }
        else if (e.key === ' ') {
          if (video) { e.preventDefault(); video.paused ? video.play() : video.pause(); }
        }
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

    /* --- The rail rolls on its own --------------------------------------- */
    /* Five posters sitting still read as a grid of stills. A slow drift says
       the section is film without playing five videos at once, which would
       cost more bandwidth than the rest of the page put together.

       It yields to the person immediately: hover, focus, drag, wheel, touch
       and the open viewer all stop it, because a target that moves while you
       reach for it is not a usable one. */
    (function () {
      var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
      if (!reelCards.length || (mq && mq.matches)) return;

      /* One extra set of cards so the wrap has no seam. The copies are
         furniture: hidden from assistive tech and unreachable by keyboard,
         since the originals already carry every reel exactly once. */
      reelCards.forEach(function (card, i) {
        var copy = card.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true');
        copy.setAttribute('tabindex', '-1');
        copy.removeAttribute('data-reel');
        copy.addEventListener('click', function () { openViewer(i, card); });
        reelRail.appendChild(copy);
      });

      /* Snap and a continuous drift are two hands on the same axis. */
      reelRail.style.scrollSnapType = 'none';
      reelRail.classList.add('is-rolling');

      var setW = 0;
      var measure = function () {
        var cs = window.getComputedStyle(reelRail);
        var gap = parseFloat(cs.columnGap || cs.gap) || 0;
        var w = 0;
        for (var i = 0; i < reelCards.length; i++) w += reelCards[i].offsetWidth + gap;
        setW = w;
      };
      measure();
      window.addEventListener('resize', measure);

      var SPEED = 22;                 /* px a second: slow enough to read a caption */
      var pos = reelRail.scrollLeft;
      var last = 0, resumeAt = 0, held = 0;

      /* Wheel, touch and keyboard scrolling all land here. Anything that moves
         the rail further than our own sub-pixel step was a person, so hand the
         rail back and wait a beat before taking it again. */
      reelRail.addEventListener('scroll', function () {
        if (Math.abs(reelRail.scrollLeft - pos) > 2) {
          pos = reelRail.scrollLeft;
          resumeAt = (window.performance ? performance.now() : Date.now()) + 1200;
        }
      }, { passive: true });

      var hold = function () { held++; };
      var release = function () { held = Math.max(0, held - 1); };
      reelRail.addEventListener('pointerenter', hold);
      reelRail.addEventListener('pointerleave', release);
      reelRail.addEventListener('focusin', hold);
      reelRail.addEventListener('focusout', release);

      var frame = function (t) {
        window.requestAnimationFrame(frame);
        if (!last) { last = t; return; }
        var dt = Math.min(t - last, 64) / 1000;   /* a backgrounded tab must not lurch */
        last = t;
        if (held || down || t < resumeAt) { pos = reelRail.scrollLeft; return; }
        if (viewer && viewer.classList.contains('is-open')) { pos = reelRail.scrollLeft; return; }
        if (!setW) { measure(); return; }
        pos += SPEED * dt;
        if (pos >= setW) pos -= setW;
        reelRail.scrollLeft = pos;
      };
      window.requestAnimationFrame(frame);
    }());
  }

})();
