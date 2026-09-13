#!/usr/bin/env python3
"""Report every grid on every page: its columns, its gutter, and its left edge."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp import Browser
ROOT = "http://localhost:8848"
PAGES = ["index","shop","serum","protocol","science","about","cart","checkout","faq","contact"]
PROBE = """(function(){
  var out=[];
  document.querySelectorAll('main *').forEach(function(e){
    var cs=getComputedStyle(e);
    if(cs.display!=='grid') return;
    var cols=cs.gridTemplateColumns;
    if(!cols || cols==='none') return;
    out.push({c:(e.className||e.tagName).slice(0,34),
              cols:cols, gap:cs.columnGap,
              left:Math.round(e.getBoundingClientRect().left),
              w:Math.round(e.getBoundingClientRect().width)});
  });
  return JSON.stringify(out);
})()"""
b = Browser(width=1440, height=900)
gaps = {}
try:
    for p in PAGES:
        b.goto(f"{ROOT}/{p}.html", wait=0.7)
        for g in json.loads(b.eval(PROBE)):
            gaps.setdefault(g["gap"], set()).add(g["c"].split()[0])
finally:
    b.close()
print("distinct column gutters in use:", len(gaps))
def px(v):
    try: return float(v.replace("px", ""))
    except ValueError: return -1.0
for k in sorted(gaps, key=px):
    print(f'  {k:>10s}  {", ".join(sorted(gaps[k]))[:96]}')
