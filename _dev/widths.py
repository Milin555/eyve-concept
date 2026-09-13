#!/usr/bin/env python3
"""Sweep every page at every width. Nothing may escape its viewport, and no
line inside a reveal mask may be clipped."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp import Browser
ROOT = "http://localhost:8848"
PAGES = ['index','shop','serum','protocol','science','about','cart','checkout','faq','contact',
         'order-confirmed','pigment-routine','barrier-routine','night-cream','moisturiser',
         'sunscreen','cleanser','terms','privacy-policy','refund-policy','shipping-policy']
WIDTHS = [320, 360, 390, 430, 480, 600, 700, 768, 834, 920, 1024, 1180, 1280, 1440, 1600, 1920, 2560]
PROBE = """(function(){
  var d=document.documentElement, out=[];
  if(d.scrollWidth > d.clientWidth+1){
    document.querySelectorAll('body *').forEach(function(e){
      var r=e.getBoundingClientRect();
      if(r.right > d.clientWidth+1 && r.width>0 &&
         getComputedStyle(e).position!=='fixed' && !e.closest('.reels__rail,.artcase__rail'))
        out.push('overflow: '+(e.className||e.tagName).toString().slice(0,24));
    });
  }
  document.querySelectorAll('.rvline').forEach(function(l){
    var sp=l.querySelector('span');
    if(sp && sp.scrollWidth > l.clientWidth+1) out.push('clipped: '+sp.textContent.slice(0,22));
  });
  return out.slice(0,3).join(' | ');
})()"""
b = Browser()
bad = 0
try:
    for w in WIDTHS:
        b.set_viewport(w, 900, scale=1)
        for p in PAGES:
            b.goto(f"{ROOT}/{p}.html", wait=0.28)
            r = b.eval(PROBE)
            if r:
                print(f"  {w:5d} {p:18s} {r}"); bad += 1
finally:
    b.close()
print(f"\n{len(WIDTHS)*len(PAGES)} page-widths checked, {bad} with a problem"
      if bad else f"\n{len(WIDTHS)*len(PAGES)} page-widths checked — nothing escapes, nothing clips")
