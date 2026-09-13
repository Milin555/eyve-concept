#!/usr/bin/env python3
"""Screenshot every page of the concept site at desktop + mobile widths.

  python3 _dev/shot.py                 -> all pages, 1440 + 390
  python3 _dev/shot.py index shop      -> just those pages
  python3 _dev/shot.py --out DIR --w 1440,390
"""
import sys, os, glob, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp import Browser

ROOT = "http://localhost:8848"
OUT = os.environ.get("EYVE_SHOTS") or os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "_shots")
PAGES = ["index", "shop", "cleanser", "serum", "moisturiser", "sunscreen", "night-cream",
         "protocol", "pigment-routine", "barrier-routine", "science", "about", "faq", "contact", "cart", "checkout",
         "order-confirmed", "shipping-policy", "refund-policy", "privacy-policy", "terms"]

args = [a for a in sys.argv[1:]]
out = OUT
widths = [1440, 390]
rest = []
i = 0
while i < len(args):
    if args[i] == "--out": out = args[i+1]; i += 2
    elif args[i] == "--w": widths = [int(x) for x in args[i+1].split(",")]; i += 2
    else: rest.append(args[i]); i += 1
pages = rest or PAGES

os.makedirs(out, exist_ok=True)
b = Browser(width=max(widths), height=900)
try:
    for w in widths:
        b.set_viewport(w, 900 if w > 700 else 844, scale=2, mobile=(w <= 700))
        for p in pages:
            if p in ("cart", "checkout", "order-confirmed"):
                # these pages are only themselves with something in the bag
                b.goto(f"{ROOT}/index.html", wait=0.3)
                b.eval("localStorage.setItem('eyveBag', JSON.stringify({serum:2,cleanser:1}));"
                       "localStorage.setItem('eyveOrder','EYV-284913');"
                       "localStorage.setItem('eyvePin','400001');"
                       "localStorage.setItem('eyveReceipt', JSON.stringify({"
                       "lines:[{k:'serum',n:2},{k:'cleanser',n:1}],promo:'WELCOME15',"
                       "disc:570,sub:3797,ship:0,cod:0,pin:'400001',pay:'upi'}));1")
            b.goto(f"{ROOT}/{p}.html", wait=1.0)
            # Walk the page a screen at a time. A single jump to the bottom does
            # not reliably trip lazy loading or the reveal observer, and a
            # beyond-viewport capture never scrolls on its own.
            h = b.eval("document.documentElement.scrollHeight")
            vh = b.eval("window.innerHeight")
            y = 0
            while y < h + vh:
                b.eval(f"window.scrollTo(0,{y});1")
                time.sleep(0.18)
                y += int(vh * 0.8)
            b.eval("window.scrollTo(0,0); 1")
            time.sleep(0.4)
            for _ in range(40):
                if b.eval("Array.prototype.every.call(document.images,"
                          "function(i){return i.complete && i.naturalWidth>0})"):
                    break
                time.sleep(0.25)
            # sticky/fixed chrome renders at the wrong offset in a beyond-viewport
            # capture — pin it to the top of the document for the shot
            # a beyond-viewport capture never actually scrolls, so lazy images
            # below the fold would photograph blank — force them in and wait
            b.eval("Array.prototype.forEach.call(document.images,function(i){i.loading='eager';"
                   "if(i.dataset.src&&!i.src)i.src=i.dataset.src;});1")
            for _ in range(40):
                if b.eval("Array.prototype.every.call(document.images,"
                          "function(i){return i.complete})"):
                    break
                time.sleep(0.25)
            b.eval("""(function(){
              var s=document.getElementById('__shotfix')||document.createElement('style');
              s.id='__shotfix';
              s.textContent='.topbar{position:absolute!important;top:0!important}'+
                '.rv,.rvimg,.rvline>span,[class*=\"rv-d\"]{opacity:1!important;transform:none!important;'+
                'clip-path:none!important;filter:none!important;transition:none!important;animation:none!important}';
              document.head.appendChild(s); return 1;})()""")
            time.sleep(0.2)
            path = os.path.join(out, f"{p}-{w}.png")
            b.shot(path)
            print(f"{os.path.basename(path):32s} {os.path.getsize(path)//1024:5d}KB")
finally:
    b.close()
