#!/usr/bin/env python3
"""Accessibility sweep: contrast, landmarks, labels, focus order, heading order."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp import Browser

ROOT = "http://localhost:8848"
PAGES = ["index","shop","serum","cleanser","moisturiser","sunscreen","night-cream","protocol","pigment-routine","barrier-routine",
         "science","about","faq","contact","cart","checkout","order-confirmed",
         "shipping-policy","refund-policy","privacy-policy","terms"]

PROBE = r"""
(function(){
  function lum(c){
    var m=c.match(/[\d.]+/g); if(!m) return null;
    var a=[m[0],m[1],m[2]].map(function(v){v=v/255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4);});
    return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];
  }
  function bgOf(el){
    while(el && el !== document.documentElement){
      var b=getComputedStyle(el).backgroundColor;
      // a translucent wash is not the ground — keep walking to the opaque one
      var al=b.match(/rgba?\([^)]*?,\s*([\d.]+)\)/);
      if(b && b!=='rgba(0, 0, 0, 0)' && b!=='transparent' && (!al || +al[1] >= 0.85)) return b;
      el=el.parentElement;
    }
    return 'rgb(255,255,255)';
  }
  var out={contrast:[],labels:[],headings:[],landmarks:{},dupIds:[],tabindex:[],links:[]};

  document.querySelectorAll('p,li,span,a,b,dt,dd,h1,h2,h3,h4,button,label,cite,blockquote,figcaption').forEach(function(el){
    if(!el.textContent.trim()) return;
    if(el.offsetParent===null && getComputedStyle(el).position!=='fixed') return;
    if(el.children.length && !Array.prototype.some.call(el.childNodes,function(n){return n.nodeType===3 && n.textContent.trim();})) return;
    // text sitting over a photograph cannot be measured against a CSS colour
    for(var a=el; a && a!==document.documentElement; a=a.parentElement){
      var cs2=getComputedStyle(a);
      if(cs2.backgroundImage && cs2.backgroundImage!=='none') return;
      if(a.querySelector && a.matches('.reel__fig, .band, .lede-hero__fig')) return;
    }
    var cs=getComputedStyle(el);
    var f=lum(cs.color), b=lum(bgOf(el));
    if(f===null||b===null) return;
    var ratio=(Math.max(f,b)+0.05)/(Math.min(f,b)+0.05);
    var size=parseFloat(cs.fontSize), bold=parseInt(cs.fontWeight,10)>=700;
    var large=size>=24 || (size>=18.66 && bold);
    var need=large?3:4.5;
    if(ratio < need)
      out.contrast.push({t:el.textContent.trim().slice(0,42), r:+ratio.toFixed(2), need:need,
                         px:+size.toFixed(1), sel:(el.tagName+'.'+(el.className||'')).slice(0,50)});
  });

  // A link inside prose must be tellable from the prose. Colour alone is not
  // enough, and identical colour is not even that. WCAG 1.4.1.
  document.querySelectorAll('p a, li a, dd a, blockquote a').forEach(function(a){
    if(a.closest('nav,.crumbs,.ftr,.hdr,.tlink')) return;
    if(a.classList.contains('tlink') || a.classList.contains('btn')) return;
    var p = a.parentElement;
    if(!p || !a.textContent.trim()) return;
    // 1.4.1 is about a link embedded in running text. A link that IS the whole
    // element is distinguished by its own size and weight, not by colour.
    if(p.textContent.trim() === a.textContent.trim()) return;
    if(a.closest('h1,h2,h3,h4,h5,h6')) return;
    var ac = getComputedStyle(a), pc = getComputedStyle(p);
    var underlined = ac.textDecorationLine.indexOf('underline') > -1 ||
                     parseFloat(ac.borderBottomWidth) > 0.5;
    var weightier = parseInt(ac.fontWeight,10) - parseInt(pc.fontWeight,10) >= 200;
    if(underlined || weightier) return;
    if(ac.color !== pc.color) return;          // a different colour, at least
    out.links.push((a.textContent.trim().slice(0,34)) + '  [' + ac.color + ' on prose of the same colour]');
  });

  document.querySelectorAll('input,select,textarea').forEach(function(el){
    if(el.type==='hidden') return;
    var ok = (el.id && document.querySelector('label[for="'+el.id+'"]')) ||
             el.closest('label') || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
    if(!ok) out.labels.push(el.name || el.id || el.type);
  });
  document.querySelectorAll('button,a').forEach(function(el){
    // a hidden or aria-hidden control is not in the accessibility tree
    if(el.hidden || el.closest('[hidden]') || el.getAttribute('aria-hidden')==='true') return;
    if(el.offsetParent===null && getComputedStyle(el).position!=='fixed') return;
    var t=(el.textContent||'').trim();
    if(!t && !el.getAttribute('aria-label') && !el.querySelector('img[alt]:not([alt=""])'))
      out.labels.push('unnamed '+el.tagName+' .'+(el.className||'').slice(0,30));
  });

  var last=0;
  document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(function(h){
    var lvl=+h.tagName[1];
    if(last && lvl>last+1) out.headings.push('jump h'+last+'->h'+lvl+': '+h.textContent.trim().slice(0,38));
    last=lvl;
  });
  out.landmarks={main:document.querySelectorAll('main').length,
                 header:document.querySelectorAll('header').length,
                 nav:document.querySelectorAll('nav').length,
                 footer:document.querySelectorAll('footer').length,
                 h1:document.querySelectorAll('h1').length};

  var seen={};
  document.querySelectorAll('[id]').forEach(function(e){
    if(seen[e.id]) out.dupIds.push(e.id); seen[e.id]=1;
  });
  document.querySelectorAll('[tabindex]').forEach(function(e){
    if(+e.getAttribute('tabindex')>0) out.tabindex.push(e.tagName);
  });
  return JSON.stringify(out);
})()
"""

b = Browser(width=1280, height=900)
issues = 0
try:
    for p in PAGES:
        if p in ("cart", "checkout", "order-confirmed"):
            b.goto(f"{ROOT}/index.html", wait=0.3)
            b.eval("localStorage.setItem('eyveBag', JSON.stringify({serum:2,cleanser:1}));"
                   "localStorage.setItem('eyveOrder','EYV-284913');1")
        b.goto(f"{ROOT}/{p}.html", wait=0.7)
        d = json.loads(b.eval(PROBE))
        msgs = []
        seen = set()
        for c in d["contrast"]:
            k = (c["sel"], c["r"])
            if k in seen: continue
            seen.add(k)
            msgs.append(f'contrast {c["r"]}:1 (needs {c["need"]}) {c["px"]}px  {c["sel"]}  "{c["t"]}"')
        for l in sorted(set(d["labels"])): msgs.append(f'unlabelled control: {l}')
        for l in sorted(set(d.get("links", []))): msgs.append(f'link indistinguishable from its prose: {l}')
        for h in d["headings"]: msgs.append(f'heading {h}')
        for i in sorted(set(d["dupIds"])): msgs.append(f'duplicate id: {i}')
        for t in set(d["tabindex"]): msgs.append(f'positive tabindex on {t}')
        lm = d["landmarks"]
        if lm["main"] != 1: msgs.append(f'{lm["main"]} <main> elements')
        if lm["h1"] != 1: msgs.append(f'{lm["h1"]} <h1> elements')
        if msgs:
            print(f'\n{p}')
            for m in msgs[:14]: print('  -', m)
            if len(msgs) > 14: print(f'  … and {len(msgs)-14} more')
            issues += len(msgs)
finally:
    b.close()
print(f'\n{issues} accessibility issues' if issues else '\nno accessibility issues found')
