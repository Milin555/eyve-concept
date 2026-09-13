#!/usr/bin/env python3
"""Inventory every section of every page: what it is, how tall, what it holds.

A page-by-page review finds page-by-page defects. This is the map a reviewer
needs to see the site as one composition — where a pattern repeats, where two
sections argue, where one carries no weight."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp import Browser

ROOT = "http://localhost:8848"
PAGES = ["index","shop","serum","cleanser","moisturiser","sunscreen","night-cream",
         "protocol","pigment-routine","barrier-routine","science","about","faq",
         "contact","cart","checkout","order-confirmed",
         "shipping-policy","refund-policy","privacy-policy","terms"]

PROBE = """(function(){
  var out=[];
  document.querySelectorAll('main > *, body > footer').forEach(function(e){
    var r=e.getBoundingClientRect();
    var head=e.querySelector('h1,h2,.display');
    var eyebrow=e.querySelector('.eyebrow');
    var cs=getComputedStyle(e);
    out.push({
      cls:(typeof e.className==='string'?e.className:e.tagName).slice(0,34),
      h:Math.round(r.height),
      bg:cs.backgroundColor,
      eyebrow:eyebrow?eyebrow.textContent.trim().slice(0,28):'',
      head:head?head.textContent.trim().replace(/\\s+/g,' ').slice(0,54):'',
      imgs:e.querySelectorAll('img').length,
      words:(e.textContent||'').trim().split(/\\s+/).length,
      ctas:e.querySelectorAll('.btn, button[data-add]').length
    });
  });
  return JSON.stringify(out);
})()"""

b = Browser(width=1440, height=900)
doc = []
try:
    for p in PAGES:
        if p in ("cart","checkout","order-confirmed"):
            b.goto(f"{ROOT}/index.html", wait=0.25)
            b.eval("localStorage.setItem('eyveBag', JSON.stringify({serum:2,cleanser:1}));"
                   "localStorage.setItem('eyveOrder','EYV-284913');"
                   "localStorage.setItem('eyvePin','400001');"
                   "localStorage.setItem('eyveReceipt', JSON.stringify({at:Date.now(),"
                   "lines:[{k:'serum',n:2,p:1499,nm:'Lipobright Pro Serum'}],promo:'',disc:0,"
                   "sub:2998,ship:0,cod:0,pin:'400001',pay:'upi'}));1")
        b.goto(f"{ROOT}/{p}.html", wait=1.0)
        b.eval("window.scrollTo(0,document.body.scrollHeight);1")
        import time; time.sleep(0.6)
        b.eval("window.scrollTo(0,0);1"); time.sleep(0.3)
        secs = json.loads(b.eval(PROBE))
        total = sum(s["h"] for s in secs)
        doc.append((p, total, secs))
finally:
    b.close()

print("# Section inventory\n")
for p, total, secs in doc:
    print(f"## {p}.html  — {len(secs)} sections, {total}px tall at 1440\n")
    print(f"| # | section | px | % | words | imgs | CTAs | eyebrow | heading |")
    print(f"|---|---|---|---|---|---|---|---|---|")
    for i, s in enumerate(secs, 1):
        pct = round(100 * s["h"] / max(1, total))
        print(f'| {i} | `{s["cls"]}` | {s["h"]} | {pct}% | {s["words"]} | {s["imgs"]} | '
              f'{s["ctas"]} | {s["eyebrow"]} | {s["head"]} |')
    print()
