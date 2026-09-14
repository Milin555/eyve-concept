#!/usr/bin/env python3
"""Does a page's title outrank its sections?

The whole-site review found only two heading levels exist: the homepage h1 at
110.88px, and on every other page an h1 that renders at exactly the size of its
own h2s. A document whose title is the same size as its sections has no
hierarchy — it has a list."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp import Browser

ROOT = "http://localhost:8848"
PAGES = ["index","shop","serum","cleanser","moisturiser","sunscreen","night-cream",
         "protocol","pigment-routine","barrier-routine","science","about","faq",
         "contact","cart","checkout","order-confirmed",
         "shipping-policy","refund-policy","privacy-policy","terms"]

PROBE = """(function(){
  function px(el){ return Math.round(parseFloat(getComputedStyle(el).fontSize)*100)/100; }
  var out={h1:[], h2:[], h3:[]};
  ['h1','h2','h3'].forEach(function(t){
    document.querySelectorAll('main '+t+', body > footer '+t).forEach(function(e){
      if(e.closest('.visually-hidden') || getComputedStyle(e).position==='absolute') return;
      if(!e.textContent.trim()) return;
      out[t].push({s:px(e), t:e.textContent.trim().replace(/\\s+/g,' ').slice(0,38)});
    });
  });
  return JSON.stringify(out);
})()"""

b = Browser(width=1440, height=900)
rows, flat = [], 0
try:
    for p in PAGES:
        if p in ("cart","checkout","order-confirmed"):
            b.goto(f"{ROOT}/index.html", wait=0.2)
            b.eval("localStorage.setItem('eyveBag', JSON.stringify({serum:2,cleanser:1}));"
                   "localStorage.setItem('eyveOrder','EYV-284913');"
                   "localStorage.setItem('eyveReceipt', JSON.stringify({at:Date.now(),"
                   "lines:[{k:'serum',n:2,p:1499,nm:'Lipobright Pro Serum'}],promo:'',disc:0,"
                   "sub:2998,ship:0,cod:0,pin:'400001',pay:'upi'}));1")
        b.goto(f"{ROOT}/{p}.html", wait=0.7)
        d = json.loads(b.eval(PROBE))
        h1 = d["h1"][0]["s"] if d["h1"] else None
        h2s = sorted({x["s"] for x in d["h2"]}, reverse=True)
        top_h2 = h2s[0] if h2s else None
        ok = h1 is not None and top_h2 is not None and h1 >= top_h2 * 1.25
        if not ok: flat += 1
        rows.append((p, h1, top_h2, len(d["h2"]), ok))
finally:
    b.close()

print(f'{"page":20s} {"h1":>8s} {"largest h2":>11s} {"h2s":>4s}   title outranks its sections')
for p, h1, h2, n, ok in rows:
    print(f'{p:20s} {str(h1):>8s} {str(h2):>11s} {n:>4d}   {"yes" if ok else "NO"}')
print(f'\n{len(rows)-flat}/{len(rows)} pages have a title that outranks its sections')
