#!/usr/bin/env python3
"""Make a thumbnail-sized variant for every image that appears in a small slot.

Gallery thumbs render at 196px and cart lines at 104px, but both were being
handed the 640px file because nothing narrower existed. A 400px variant covers
a 2x gallery thumb and is still twice what a cart line needs."""
from PIL import Image
import re, glob, os

wanted = set()
# gallery thumbs
for f in glob.glob('*.html'):
    s = open(f, encoding='utf-8').read()
    for m in re.finditer(r'<div class="gal__thumbs">(.*?)</div>', s, re.S):
        for im in re.finditer(r'src="assets/opt/([a-z0-9\-]+?)(?:-sm)?\.webp"', m.group(1)):
            wanted.add(im.group(1))
# anything the cart renders
for m in re.finditer(r"assets/opt/' \+ p\.img \+ '(-sm)?\.webp", open('assets/js/main.js', encoding='utf-8').read()):
    pass
for m in re.finditer(r'"img":\s*"([a-z0-9\-]+)"', open('assets/js/catalogue.js', encoding='utf-8').read()):
    wanted.add(m.group(1))

made, saved = 0, 0
for slug in sorted(wanted):
    src = None
    for cand in ('assets/opt/%s-lg.webp' % slug, 'assets/opt/%s-sm.webp' % slug, 'assets/opt/%s.webp' % slug):
        if os.path.exists(cand):
            src = cand; break
    if not src:
        print('  missing source for', slug); continue
    out = 'assets/opt/%s-xs.webp' % slug
    im = Image.open(src).convert('RGB')
    w = min(400, im.width)
    o = im if w == im.width else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    o.save(out, 'WEBP', quality=76, method=6)
    was = os.path.getsize('assets/opt/%s-sm.webp' % slug) if os.path.exists('assets/opt/%s-sm.webp' % slug) else os.path.getsize(src)
    saved += was - os.path.getsize(out); made += 1
    print('  %-24s %4dKB -> %3dKB  (%dpx)' % (slug, was // 1024, os.path.getsize(out) // 1024, w))

print('\n%d thumbnail variants, %dKB saved per full set' % (made, saved // 1024))
