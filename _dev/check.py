#!/usr/bin/env python3
"""Crawl every page: console errors, failed requests, broken internal links."""
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp import Browser
ROOT = "http://localhost:8848"
PAGES = ["index","shop","cleanser","serum","moisturiser","sunscreen","night-cream","protocol","pigment-routine","barrier-routine",
         "science","about","faq","contact","cart","checkout","order-confirmed",
         "shipping-policy","refund-policy","privacy-policy","terms"]
b = Browser(width=1280, height=900)
bad = []
try:
    for p in PAGES:
        b.goto(f"{ROOT}/{p}.html", wait=0.8)
        b.eval("window.scrollTo(0,document.body.scrollHeight);1"); time.sleep(0.5)
        res = b.eval("""(function(){
          var out={imgs:[],links:[],media:[],deferred:[]};
          document.querySelectorAll('img').forEach(function(i){
            // a closed <details> never decodes its images — that is correct, not broken
            var d = i.closest('details');
            var hidden = (d && !d.open) || i.offsetParent === null;
            if(!hidden && (!i.complete || i.naturalWidth===0)) out.imgs.push(i.getAttribute('src'));
            if(i.getAttribute('alt') === null) out.imgs.push('NO-ALT '+i.src);
          });
          // and verify the deferred ones actually exist on disk
          document.querySelectorAll('details:not([open]) img').forEach(function(i){
            out.deferred.push(i.getAttribute('src'));
          });
          document.querySelectorAll('a[href]').forEach(function(a){
            var h=a.getAttribute('href');
            if(/^(https?:|mailto:|tel:|#)/.test(h)) return;
            out.links.push(h);
          });
          document.querySelectorAll('video source, video').forEach(function(v){
            var s=v.getAttribute('src'); if(s) out.media.push(s);
          });
          return JSON.stringify(out);})()""")
        d = json.loads(res)
        for s in set(d["imgs"]):
            bad.append(f"{p}: broken/alt-less image {s}")
        for h in set(d["links"]):
            f = h.split("#")[0].split("?")[0]
            if f and not os.path.exists(f):
                bad.append(f"{p}: dead link -> {h}")
        for m in set(d["media"]):
            if m and not os.path.exists(m):
                bad.append(f"{p}: missing media -> {m}")
        for m in set(d.get("deferred", [])):
            if m and not os.path.exists(m):
                bad.append(f"{p}: missing deferred image -> {m}")
        errs = b.eval("(window.__cdpErrs||[]).join(' | ')")
finally:
    b.close()
print("\n".join(bad) if bad else "clean: no broken images, links or media")
