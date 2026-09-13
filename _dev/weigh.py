#!/usr/bin/env python3
"""What each page actually costs on a cold load."""
import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp import Browser

ROOT = "http://localhost:8848"
PAGES = ["index","shop","serum","protocol","science","cart","checkout","faq"]
PROBE = """(function(){
  var e = performance.getEntriesByType('resource');
  var by = {};
  var total = 0;
  e.forEach(function(r){
    var t = r.initiatorType === 'img' ? 'image' :
            (/\\.mp4/.test(r.name) ? 'video' :
            (/\\.css/.test(r.name) ? 'css' :
            (/\\.js/.test(r.name) ? 'js' :
            (/\\.woff2?/.test(r.name) ? 'font' : 'other'))));
    var b = r.transferSize || r.encodedBodySize || 0;
    by[t] = (by[t]||0) + b; total += b;
  });
  var nav = performance.getEntriesByType('navigation')[0];
  by.html = nav ? (nav.transferSize || nav.encodedBodySize || 0) : 0;
  total += by.html;
  return JSON.stringify({total: total, by: by, reqs: e.length + 1});
})()"""

b = Browser(width=1440, height=900)
try:
    for p in PAGES:
        if p in ("cart", "checkout"):
            b.goto(f"{ROOT}/index.html", wait=0.2)
            b.eval("localStorage.setItem('eyveBag', JSON.stringify({serum:2,cleanser:1}));1")
        b.goto(f"{ROOT}/{p}.html", wait=1.6)
        d = json.loads(b.eval(PROBE))
        parts = ' '.join(f'{k} {v//1024}K' for k, v in sorted(d["by"].items(), key=lambda x: -x[1]) if v > 1024)
        print(f'{p:10s} {d["total"]//1024:5d} KB  {d["reqs"]:3d} requests   {parts}')
finally:
    b.close()
