#!/usr/bin/env python3
"""Every rendered font-size, tracking and leading in use at one viewport."""
import sys, os, json, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp import Browser
ROOT = "http://localhost:8848"
PAGES = ["index","shop","serum","protocol","science","about","cart","checkout","faq","contact",
         "pigment-routine","barrier-routine","night-cream"]
PROBE = """(function(){
  var out=[];
  document.querySelectorAll('main *, footer *, header *').forEach(function(e){
    if(!e.textContent.trim()) return;
    if(e.children.length && !Array.prototype.some.call(e.childNodes,function(n){return n.nodeType===3&&n.textContent.trim();})) return;
    var cs=getComputedStyle(e);
    var ls=parseFloat(cs.letterSpacing); if(isNaN(ls)) ls=0;
    var lh=parseFloat(cs.lineHeight); if(isNaN(lh)) lh=0;
    var fam=(cs.fontFamily||'').split(',')[0].replace(/"/g,'');
    var cls=(typeof e.className==='string'? e.className : '') || e.tagName;
    out.push([Math.round(parseFloat(cs.fontSize)*100)/100,
              Math.round(ls*1000)/1000, Math.round(lh*100)/100, fam, cls.slice(0,26)]);
  });
  return JSON.stringify(out);
})()"""
sizes = collections.defaultdict(set)
track = collections.defaultdict(set)
lead  = collections.defaultdict(set)
b = Browser(width=1440, height=900)
try:
    for p in PAGES:
        b.goto(f"{ROOT}/{p}.html", wait=0.55)
        for fs, ls, lh, fam, cls in json.loads(b.eval(PROBE)):
            sizes[fs].add(cls.split()[0] if cls else '?')
            track[(fs, fam)].add(ls)
            lead[fs].add(lh)
finally:
    b.close()
print(f"distinct font-sizes at 1440: {len(sizes)}")
for k in sorted(sizes, reverse=True):
    print(f"  {k:7.2f}px  {len(sizes[k]):2d} selectors  {', '.join(sorted(sizes[k]))[:78]}")
multi = {k: v for k, v in track.items() if len(v) > 1}
print(f"\nsize+family pairs carrying more than one tracking value: {len(multi)}")
for k in sorted(multi, key=lambda x: -x[0]):
    print(f"  {k[0]:7.2f}px {k[1]:<16s} -> {sorted(multi[k])}")
ml = {k: v for k, v in lead.items() if len(v) > 1}
print(f"\nsizes carrying more than one line-height: {len(ml)}")
for k in sorted(ml, reverse=True):
    print(f"  {k:7.2f}px -> {sorted(ml[k])}")
