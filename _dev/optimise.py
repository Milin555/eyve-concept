#!/usr/bin/env python3
"""Re-encode oversized images. The hero alone was 359KB — half the homepage —
because it was written at quality 90 from a source larger than any slot that
displays it."""
from PIL import Image
import os, glob, sys

# slot widths actually requested by the markup, per size suffix
TARGET = {'-xl': 1700, '-lg': 1200, '-sm': 640, '': 640}
Q = 74           # webp quality; measured indistinguishable from 84 on these
BUDGET = 90_000  # anything over this gets looked at


def suffix(name):
    for s in ('-xl', '-lg', '-sm'):
        if name.endswith(s + '.webp'):
            return s
    return ''


changed, before, after = 0, 0, 0
for f in sorted(glob.glob('assets/opt/*.webp')):
    size = os.path.getsize(f)
    if size < BUDGET:
        continue
    im = Image.open(f).convert('RGB')
    s = suffix(os.path.basename(f))
    cap = TARGET[s]
    w = min(im.width, cap)
    o = im if w == im.width else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    o.save(f, 'WEBP', quality=Q, method=6)
    new = os.path.getsize(f)
    before += size; after += new; changed += 1
    print(f'{os.path.basename(f):28s} {size//1024:4d}KB -> {new//1024:4d}KB   {im.size[0]}x{im.size[1]} -> {o.size[0]}x{o.size[1]}')

print(f'\n{changed} images re-encoded: {before//1024}KB -> {after//1024}KB '
      f'({100*(before-after)//max(1,before)}% smaller)')
