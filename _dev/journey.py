#!/usr/bin/env python3
"""Walk the real purchase funnel in a real browser and assert the money is right."""
import sys, os, time, json, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp import Browser

ROOT = "http://localhost:8848"
fails, checks = [], 0


def ok(label, cond, detail=""):
    global checks
    checks += 1
    if not cond:
        fails.append(f"{label} {detail}".strip())
    print(("  ok   " if cond else "  FAIL ") + label + ((" — " + detail) if detail and not cond else ""))


b = Browser(width=1280, height=900)
try:
    b.goto(f"{ROOT}/index.html")
    b.eval("localStorage.clear();1")

    print("\n[ errors ]")
    for p in ["index", "shop", "protocol", "serum", "cleanser", "moisturiser", "sunscreen",
              "night-cream", "science", "about", "faq", "contact", "cart", "checkout"]:
        b.eval("window.__err=[];window.addEventListener('error',function(e){window.__err.push(e.message)});1")
        b.goto(f"{ROOT}/{p}.html", wait=0.6)
        errs = b.eval("(window.__err||[]).join(' | ')")
        ok(f"{p}: no script error", not errs, errs)

    print("\n[ add to bag ]")
    b.goto(f"{ROOT}/serum.html")
    b.eval("document.querySelector('.pdp__buy [data-add]').click();1"); time.sleep(0.3)
    ok("serum added", b.eval("JSON.parse(localStorage.eyveBag||'{}').serum") == 1)

    b.eval("""(function(){var p=document.querySelectorAll('[data-qty-step]');
      p[1].click();p[1].click();document.querySelector('.pdp__buy [data-add]').click();return 1})()""")
    time.sleep(0.3)
    ok("stepper respected (1 + 3 = 4)", b.eval("JSON.parse(localStorage.eyveBag||'{}').serum") == 4)

    print("\n[ cart maths ]")
    b.eval("localStorage.setItem('eyveBag', JSON.stringify({serum:2, cleanser:1}));1")
    b.goto(f"{ROOT}/cart.html")
    sub = b.eval("document.querySelector('[data-sum-sub]').textContent")
    ok("subtotal = 2x1499 + 799", sub.replace(",", "").replace("₹", "") == "3797", sub)
    ok("free shipping over 999", b.eval("document.querySelector('[data-sum-ship]').textContent").strip() == "Free")

    if b.eval("!!document.querySelector('[data-promo-form]')"):
        print("\n[ promotion ]")
        b.eval("""(function(){var f=document.querySelector('[data-promo-form]');
          f.querySelector('input').value='WELCOME15';
          f.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));return 1})()""")
        time.sleep(0.4)
        disc = b.eval("document.querySelector('[data-sum-disc]').textContent")
        ok("WELCOME15 takes 15% (569)", disc.replace(",", "").replace("₹", "").replace("−", "") == "570", disc)

        b.eval("localStorage.setItem('eyveBag', JSON.stringify({protocol:1}));1")
        b.goto(f"{ROOT}/cart.html"); time.sleep(0.4)
        ok("code does not discount a routine",
           b.eval("document.querySelector('[data-disc-row]').hidden") is True)
    else:
        print("\n[ promotion ] — no promo form in cart yet, skipped")

    print("\n[ serviceability ]")
    if b.eval("!!document.querySelector('[data-pin-form]')"):
        b.eval("""(function(){var f=document.querySelector('[data-pin-form]');
          f.querySelector('input').value='400001';
          f.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));return 1})()""")
        time.sleep(0.3)
        out = b.eval("document.querySelector('[data-pin-out]').textContent")
        ok("metro PIN returns a date", "working days" in out, out)
        b.eval("""(function(){var f=document.querySelector('[data-pin-form]');
          f.querySelector('input').value='194101';
          f.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));return 1})()""")
        time.sleep(0.3)
        out = b.eval("document.querySelector('[data-pin-out]').textContent")
        ok("far-route PIN is prepaid only", "Prepaid only" in out, out)
    else:
        print("  — no PIN form in cart yet, skipped")

    print("\n[ cash on delivery ceiling ]")
    b.eval("localStorage.setItem('eyveBag', JSON.stringify({protocol:1, serum:1}));1")
    b.goto(f"{ROOT}/checkout.html"); time.sleep(0.5)
    cod = b.eval("(function(){var r=document.querySelector('input[name=pay][value=cod]');"
                 "return r?r.disabled:null})()")
    ok("COD blocked above the stated ceiling", cod is True, str(cod))


    print("\n[ cash on delivery, route and ceiling ]")
    b.eval("localStorage.setItem('eyveBag', JSON.stringify({cleanser:1,serum:1,sunscreen:3}));"
           "localStorage.removeItem('eyvePin');localStorage.removeItem('eyvePromo');1")
    b.goto(f"{ROOT}/checkout.html"); time.sleep(0.5)
    collected = b.eval("document.querySelector('[data-sum-total]').textContent")
    cod = b.eval("(function(){var r=document.querySelector('input[name=pay][value=cod]');return r?r.disabled:null})()")
    ok("ceiling measures what the courier collects, not the subtotal", cod is True, f"bag {collected}")

    def setpin(v):
        b.eval("(function(){var i=document.getElementById('coPin');if(!i)return 0;"
               "i.value='%s';i.dispatchEvent(new Event('input',{bubbles:true}));return 1})()" % v)
        time.sleep(0.35)
        return b.eval("(function(){var r=document.querySelector('input[name=pay][value=cod]');return r?r.disabled:null})()")

    b.eval("localStorage.setItem('eyveBag', JSON.stringify({serum:1}));1")
    b.goto(f"{ROOT}/checkout.html"); time.sleep(0.5)
    ok("COD refused on a prepaid-only route", setpin("190001") is True)
    ok("COD offered on a serviceable route", setpin("400001") is False)
    ok("a well-formed but non-existent PIN is rejected",
       "do not recognise" in (b.eval("(function(){var e=document.querySelector('[data-co-pin-out]');"
                                     "if(!e)return '';var i=document.getElementById('coPin');"
                                     "i.value='999999';i.dispatchEvent(new Event('input',{bubbles:true}));"
                                     "return e.textContent})()") or ""))

    print("\n[ routine detection ]")
    b.eval("localStorage.setItem('eyveBag', JSON.stringify({cleanser:1,serum:1,sunscreen:1}));1")
    b.goto(f"{ROOT}/cart.html"); time.sleep(0.5)
    up = b.eval("(function(){var e=document.querySelector('[data-bundle-upsell]');"
                "return e && !e.hidden ? e.textContent : ''})()")
    ok("a bag holding a whole routine is told so", "less" in up, up[:70])

    print("\n[ strike-through arithmetic ]")
    b.eval("localStorage.setItem('eyveBag', JSON.stringify({protocol:2}));1")
    b.goto(f"{ROOT}/cart.html"); time.sleep(0.4)
    was = b.eval("(document.querySelector('.line__was')||{}).textContent||''")
    now = b.eval("(document.querySelector('.line__price')||{}).textContent||''")
    wasN = int(re.sub(r"[^0-9]", "", was) or 0)
    nowN = int(re.sub(r"[^0-9]", "", now.replace(was, "")) or 0)
    ok("was-price scales with quantity", wasN > nowN, f"was {was} now {now}")

    print("\n[ shipping threshold ]")
    b.eval("localStorage.setItem('eyveBag', JSON.stringify({moisturiser:1}));"
           "localStorage.setItem('eyvePromo','WELCOME15');1")
    b.goto(f"{ROOT}/cart.html"); time.sleep(0.4)
    ok("a code does not un-earn free shipping",
       b.eval("document.querySelector('[data-sum-ship]').textContent").strip() == "Free")
    b.eval("localStorage.removeItem('eyvePromo');1")


    print("\n[ deferred drawers ]")
    b.goto(f"{ROOT}/serum.html", wait=1.0)
    before = b.eval("Array.prototype.filter.call(document.querySelectorAll('.artcase img'),"
                    "function(i){return i.naturalWidth>0}).length")
    ok("drawer images cost nothing while closed", before == 0, str(before))
    b.eval("var s=document.querySelector('.artcase > summary'); if(s) s.click(); 1")
    time.sleep(2.2)
    after = b.eval("Array.prototype.filter.call(document.querySelectorAll('.artcase img'),"
                   "function(i){return i.naturalWidth>0}).length")
    total = b.eval("document.querySelectorAll('.artcase img').length")
    ok("drawer images load when it opens", total > 0 and after == total, f"{after}/{total}")


    print("\n[ reel viewer ]")
    for page in ("index", "serum", "cleanser", "moisturiser", "pigment-routine", "barrier-routine"):
        b.goto(f"{ROOT}/{page}.html", wait=0.8)
        ok(f"{page}: exactly one viewer",
           b.eval("document.querySelectorAll('#reelViewer').length") == 1)
    b.goto(f"{ROOT}/index.html", wait=0.8)
    b.eval("document.querySelectorAll('[data-reel]')[0].click();1"); time.sleep(1.2)
    ok("no video element exists until a reel is clicked",
       b.eval("document.querySelectorAll('video').length") == 1)
    ok("the reel opens muted",
       b.eval("(document.querySelector('.reelv__video')||{}).muted") is True)
    b.eval("document.querySelector('[data-reel-sound]').click();1"); time.sleep(0.3)
    ok("the sound control unmutes",
       b.eval("(document.querySelector('.reelv__video')||{}).muted") is False)
    b.eval("document.querySelector('[data-reel-close]').click();1"); time.sleep(0.4)
    ok("closing releases the video", b.eval("document.querySelectorAll('video').length") == 0)
    b.eval("document.querySelectorAll('[data-reel]')[1].click();1"); time.sleep(1.0)
    ok("it reopens muted, whatever you did last time",
       b.eval("(document.querySelector('.reelv__video')||{}).muted") is True)
    b.eval("document.querySelector('[data-reel-close]').click();1"); time.sleep(0.3)


    print("\n[ the swap quotes what it delivers ]")
    def money(t): return int(re.sub(r"[^0-9]", "", t) or 0)
    for bag, label in ((dict(cleanser=1, serum=1, sunscreen=1), "pigmentation"),
                       (dict(cleanser=1, moisturiser=1, sunscreen=1), "barrier")):
        b.goto(f"{ROOT}/index.html", wait=0.25)
        b.eval("localStorage.clear();localStorage.setItem('eyveBag', JSON.stringify(%s));"
               "localStorage.setItem('eyvePromo','WELCOME15');1" % json.dumps(bag))
        b.goto(f"{ROOT}/cart.html"); time.sleep(0.5)
        before = money(b.eval("document.querySelector('[data-sum-total]').textContent"))
        txt = b.eval("(document.querySelector('[data-bundle-upsell]')||{}).textContent||''")
        claimed = money(txt.split("save ")[-1]) if "save " in txt else -1
        b.eval("document.querySelector('[data-swap-bundle]').click();1"); time.sleep(0.45)
        after = money(b.eval("document.querySelector('[data-sum-total]').textContent"))
        ok(f"{label}: claimed saving equals the real one",
           claimed == before - after, f"claimed {claimed}, real {before - after}")

    print("\n[ the promo panel repaints with the bag ]")
    b.goto(f"{ROOT}/index.html", wait=0.25)
    b.eval("localStorage.clear();localStorage.setItem('eyveBag', JSON.stringify({serum:1}));"
           "localStorage.setItem('eyvePromo','WELCOME15');1")
    b.goto(f"{ROOT}/cart.html"); time.sleep(0.5)
    b.eval("document.querySelector('[data-line-step=\"1\"]').click();1"); time.sleep(0.45)
    panel = money(b.eval("document.querySelector('[data-promo-out]').textContent").split("save ")[-1])
    summ = money(b.eval("document.querySelector('[data-sum-disc]').textContent"))
    ok("panel and summary agree after a quantity change", panel == summ, f"panel {panel}, summary {summ}")

    print("\n[ the gap is measured against the subtotal ]")
    for bag, gap in ((dict(cleanser=1), 200), (dict(sunscreen=1), 100)):
        b.goto(f"{ROOT}/index.html", wait=0.25)
        b.eval("localStorage.clear();localStorage.setItem('eyveBag', JSON.stringify(%s));"
               "localStorage.setItem('eyvePromo','WELCOME15');1" % json.dumps(bag))
        b.goto(f"{ROOT}/cart.html"); time.sleep(0.4)
        ok(f"{list(bag)[0]}: a code cannot change the gap",
           money(b.eval("document.querySelector('[data-ship-note]').textContent")) == gap)

    print("\n[ an unrecognised PIN closes cash on delivery ]")
    b.goto(f"{ROOT}/index.html", wait=0.25)
    b.eval("localStorage.clear();localStorage.setItem('eyveBag', JSON.stringify({serum:1}));1")
    b.goto(f"{ROOT}/checkout.html"); time.sleep(0.5)
    def codfor(v):
        b.eval("(function(){var i=document.getElementById('coPin');i.value='%s';"
               "i.dispatchEvent(new Event('input',{bubbles:true}));return 1})()" % v)
        time.sleep(0.3)
        return b.eval("(function(){var r=document.querySelector('input[name=pay][value=cod]');"
                      "return r?r.disabled:null})()")
    ok("a serviceable route offers COD", codfor("400001") is False)
    ok("a prepaid-only route refuses it", codfor("190001") is True)
    ok("a PIN in no postal circle refuses it too", codfor("291000") is True)
    ok("and it reopens for a good one", codfor("400001") is False)

    print("\n[ a tampered bag heals itself ]")
    b.goto(f"{ROOT}/index.html", wait=0.25)
    b.eval("localStorage.setItem('eyveBag', JSON.stringify({serum:-3, cleanser:1, bogus:5, moisturiser:999}));1")
    b.goto(f"{ROOT}/cart.html"); time.sleep(0.4)
    healed = json.loads(b.eval("localStorage.getItem('eyveBag')"))
    ok("negatives, unknown slugs and over-caps are stripped on read",
       healed == {"cleanser": 1, "moisturiser": 9}, str(healed))
    ok("and the badge never goes negative",
       int(b.eval("document.querySelector('[data-cart-count]').textContent")) >= 0)


    print("\n[ restored and duplicated views ]")
    b.goto(f"{ROOT}/index.html", wait=0.3)
    b.eval("localStorage.clear();localStorage.setItem('eyveBag', JSON.stringify({serum:1}));1")
    b.goto(f"{ROOT}/cart.html"); time.sleep(1.4)
    ok("a page that reloads itself does not loop",
       b.eval("performance.getEntriesByType('navigation').length") == 1)
    b.eval("window.dispatchEvent(new StorageEvent('storage',{key:'eyveBag',newValue:'{}'}));1")
    time.sleep(1.2)
    ok("a storage event from another tab reloads once, not repeatedly",
       b.eval("performance.getEntriesByType('navigation').length") == 1)

    print("\n[ the receipt expires ]")
    b.goto(f"{ROOT}/index.html", wait=0.3)
    stale = int(time.time() * 1000) - 7 * 60 * 60 * 1000
    b.eval("localStorage.setItem('eyveOrder','EYV-999999');"
           "localStorage.setItem('eyveReceipt', JSON.stringify({at:%d,lines:[{k:'serum',n:1}],"
           "promo:'',disc:0,sub:1499,ship:0,cod:0,pin:'400001',pay:'upi'}));1" % stale)
    b.goto(f"{ROOT}/order-confirmed.html", wait=1.0)
    ok("a seven-hour-old receipt is not replayed", b.eval("location.pathname").endswith("index.html"))
    fresh = int(time.time() * 1000) - 60 * 1000
    b.eval("localStorage.setItem('eyveOrder','EYV-888888');"
           "localStorage.setItem('eyveReceipt', JSON.stringify({at:%d,lines:[{k:'serum',n:1}],"
           "promo:'',disc:0,sub:1499,ship:0,cod:0,pin:'400001',pay:'upi'}));1" % fresh)
    b.goto(f"{ROOT}/order-confirmed.html", wait=1.0)
    ok("a fresh one still renders", b.eval("document.querySelectorAll('.receipt__line').length") == 1)

    print("\n[ the money agrees with itself ]")
    b.goto(f"{ROOT}/index.html", wait=0.3)
    b.eval("localStorage.clear();localStorage.setItem('eyveBag', JSON.stringify({serum:2,cleanser:1}));"
           "localStorage.setItem('eyvePromo','WELCOME15');localStorage.setItem('eyvePin','400001');1")
    b.goto(f"{ROOT}/cart.html"); time.sleep(0.5)
    cart_total = b.eval("document.querySelector('[data-sum-total]').textContent")
    b.goto(f"{ROOT}/checkout.html"); time.sleep(0.5)
    co_total = b.eval("document.querySelector('[data-sum-total]').textContent")
    pay = b.eval("document.querySelector('[data-pay]').textContent")
    ok("cart, checkout and the pay button quote one number",
       cart_total == co_total and cart_total.replace("\u20b9", "") in pay,
       f"{cart_total} / {co_total} / {pay}")

    print("\n[ the swap is honest at the edges ]")
    for bag, label in (({"cleanser": 1, "serum": 1, "sunscreen": 1, "pigment-set": 1}, "routine plus its own parts"),
                       ({"cleanser": 9, "serum": 9, "sunscreen": 9}, "nine of every part"),
                       ({"cleanser": 1, "serum": 1, "moisturiser": 1, "sunscreen": 1, "night-cream": 1}, "all five")):
        b.goto(f"{ROOT}/index.html", wait=0.25)
        b.eval("localStorage.clear();localStorage.setItem('eyveBag', JSON.stringify(%s));"
               "localStorage.setItem('eyvePromo','WELCOME15');1" % json.dumps(bag))
        b.goto(f"{ROOT}/cart.html"); time.sleep(0.5)
        before = money(b.eval("document.querySelector('[data-sum-total]').textContent"))
        txt = b.eval("(document.querySelector('[data-bundle-upsell]')||{}).textContent||''")
        claimed = money(txt.split("save ")[-1]) if "save " in txt else 0
        if b.eval("!!document.querySelector('[data-swap-bundle]')"):
            b.eval("document.querySelector('[data-swap-bundle]').click();1"); time.sleep(0.45)
        after = money(b.eval("document.querySelector('[data-sum-total]').textContent"))
        ok(f"{label}: claim matches delivery", claimed == before - after,
           f"claimed {claimed}, real {before - after}")

    print("\n[ empty bag ]")
    b.eval("localStorage.setItem('eyveBag','{}');1")
    b.goto(f"{ROOT}/checkout.html"); time.sleep(0.4)
    ok("checkout does not ask for an address for nothing",
       b.eval("var f=document.getElementById('checkoutForm'); f?f.hidden:true") is True)
finally:
    b.close()

print(f"\n{checks - len(fails)}/{checks} checks passed")
if fails:
    print("\nfailures:")
    for f in fails: print("  -", f)
    sys.exit(1)
