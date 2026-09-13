#!/usr/bin/env python3
"""Compare what each image is displayed at against what was actually fetched.

A wrong `sizes` makes the browser pick a hero-sized file for a thumbnail slot,
which costs far more than any amount of re-encoding saves."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp import Browser

ROOT = "http://localhost:8848"
PAGES = ["index","shop","serum","cleanser","moisturiser","sunscreen","night-cream",
         "protocol","pigment-routine","barrier-routine","science","about","cart","checkout"]
PROBE = """(function(){
  var out=[];
  document.querySelectorAll('img').forEach(function(i){
    var r=i.getBoundingClientRect();
    if(!r.width) return;
    var cur=(i.currentSrc||i.src).split('/').pop();
    out.push({f:cur, css:Math.round(r.width), nat:i.naturalWidth,
              sizes:i.getAttribute('sizes')||'', cls:(i.closest('[class]')||{className:''}).className.slice(0,26)});
  });
  return JSON.stringify(out);
})()"""

b = Browser(width=1440, height=900)
waste = {}
try:
    for p in PAGES:
        if p in ("cart","checkout"):
            b.goto(f"{ROOT}/index.html", wait=0.25)
            b.eval("localStorage.setItem('eyveBag', JSON.stringify({serum:2,cleanser:1}));1")
        b.goto(f"{ROOT}/{p}.html", wait=1.6)
        b.eval("window.scrollTo(0,document.body.scrollHeight);1")
        import time; time.sleep(0.8)
        for d in json.loads(b.eval(PROBE)):
            need = d["css"] * 2                      # a 2x display is the worst case
            if d["nat"] > need * 1.35 and d["nat"] - need > 200:
                key = (p, d["f"])
                waste[key] = (d["css"], d["nat"], d["sizes"], d["cls"])
finally:
    b.close()

if not waste:
    print("every image is fetched at a size its slot can use")
else:
    print(f"{len(waste)} images fetched far larger than their slot needs\n")
    for (p, f), (css, nat, sizes, cls) in sorted(waste.items()):
        print(f'  {p:16s} {f:34s} shown {css:4d}px  fetched {nat:5d}px  .{cls}')
        if sizes: print(f'  {"":16s} sizes="{sizes}"')
