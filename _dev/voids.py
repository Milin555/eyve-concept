#!/usr/bin/env python3
"""Report two-column blocks where one column ends well above the other."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp import Browser
ROOT = "http://localhost:8848"
PAGES = ["index","shop","serum","protocol","science","about","cart","checkout","faq","contact",
         "order-confirmed","pigment-routine","barrier-routine","night-cream","moisturiser","sunscreen",
         "cleanser","terms","privacy-policy","refund-policy","shipping-policy"]
PROBE = """(function(){
  var out=[];
  document.querySelectorAll('main *').forEach(function(e){
    var cs=getComputedStyle(e);
    if(cs.display!=='grid') return;
    var cols=(cs.gridTemplateColumns||'').split(' ').filter(Boolean).length;
    if(cols!==2 || e.children.length!==2) return;
    // a sticky column is meant to be shorter — it travels instead of ending
    function sticky(el){
      if(getComputedStyle(el).position==='sticky') return true;
      return !!el.querySelector(':scope > [style*="sticky"]') ||
             Array.prototype.some.call(el.children,function(c){return getComputedStyle(c).position==='sticky';});
    }
    var isSticky = sticky(e.children[0]) || sticky(e.children[1]);
    // A one-line citation beside a paragraph, sharing a baseline, is a
    // composition — not a column that ran out of content.
    var cs = getComputedStyle(e);
    if(cs.alignItems === 'baseline'){
      var lh = parseFloat(getComputedStyle(e.children[1]).lineHeight) || 20;
      if(e.children[1].getBoundingClientRect().height <= lh * 1.6) return;
    }
    var a=e.children[0].getBoundingClientRect(), b=e.children[1].getBoundingClientRect();
    var d=Math.round(Math.abs(a.height-b.height));
    // A sticky column is meant to be shorter — but only if the page is long
    // enough for it to travel. Below that it is simply an empty column.
    var travels = isSticky && (document.documentElement.scrollHeight - window.innerHeight) > d;
    if(d>110 && !travels) out.push({c:(e.className||'').slice(0,30)+(isSticky?' [sticky, does not travel]':''),
                                    d:d, h:[Math.round(a.height),Math.round(b.height)]});
  });
  return JSON.stringify(out);
})()"""
b = Browser(width=1440, height=900)
try:
    for p in PAGES:
        if p in ("cart","checkout","order-confirmed"):
            b.goto(f"{ROOT}/index.html", wait=0.25)
            b.eval("localStorage.setItem('eyveBag', JSON.stringify({serum:2,cleanser:1}));"
                   "localStorage.setItem('eyveOrder','EYV-284913');1")
        b.goto(f"{ROOT}/{p}.html", wait=0.8)
        b.eval("window.scrollTo(0,document.body.scrollHeight);1")
        for v in json.loads(b.eval(PROBE)):
            print(f'{p:16s} {v["c"]:30s} delta {v["d"]:5d}px   {v["h"]}')
finally:
    b.close()
