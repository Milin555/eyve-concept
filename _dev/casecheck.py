#!/usr/bin/env python3
"""macOS is case-insensitive; GitHub Pages is not. Any reference whose case
differs from the file on disk works locally and 404s live."""
import re, glob, os, collections

refs = collections.Counter()
for f in glob.glob('*.html') + glob.glob('assets/css/*.css'):
    s = open(f, encoding='utf-8').read()
    for m in re.finditer(r'(?:src|href)="((?!https?:|mailto:|tel:|#|data:)[^"]+)"', s):
        refs[m.group(1).split('#')[0].split('?')[0]] += 1
    for m in re.finditer(r'srcset="([^"]+)"', s):
        for part in m.group(1).split(','):
            u = part.strip().split(' ')[0]
            if u and not u.startswith(('http', 'data:')):
                refs[u] += 1

on_disk = {}
for root, _, files in os.walk('.'):
    if '/.git' in root or root.startswith('./_dev'):
        continue
    for fn in files:
        p = os.path.relpath(os.path.join(root, fn), '.')
        on_disk[p.lower()] = p

bad = []
for r in sorted(refs):
    if not r or r.endswith('/'):
        continue
    actual = on_disk.get(r.lower())
    if actual is None:
        bad.append(('missing', r))
    elif actual != r:
        bad.append(('case   ', f'{r}  ->  on disk as {actual}'))

print('references checked:', len(refs))
for k, v in bad:
    print(f'  {k}: {v}')
print('every reference matches a file exactly, case included' if not bad
      else f'{len(bad)} references would 404 on a case-sensitive host')
