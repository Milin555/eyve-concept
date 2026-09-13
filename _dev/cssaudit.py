#!/usr/bin/env python3
"""Report classes used in markup that no rule defines, and rules nothing uses."""
import re, glob, sys

used = set()
for f in glob.glob('*.html'):
    s = open(f, encoding='utf-8').read()
    for m in re.finditer(r'class="([^"]+)"', s):
        for c in m.group(1).split():
            used.add(c)

css = open('assets/css/style.css', encoding='utf-8').read()
css_nc = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
# a leading digit means we matched a decimal like `0.5rem`, not a class
defined = set(c for c in re.findall(r'\.([A-Za-z0-9_-]+)', css_nc) if not c[0].isdigit())

ignore = {'js', 'is-in', 'grain', 'org', 'w3'}
# classes the script writes at runtime, so they never appear in the markup
runtime = {'line', 'line__fig', 'line__body', 'line__name', 'line__size', 'line__ctl',
           'line__price', 'line__qty', 'line__rm', 'line__was', 'qty--sm', 'xsell',
           'xsell__fig', 'xsell__body', 'xsell__meta', 'btn--ghost', 'btn--sm',
           'toast__act', 'promo__clear', 'pincheck__warn', 'reelv__video', 'formdone',
           'receipt__line', 'receipt__lines', 'upsell__h', 'upsell__p'}
missing = sorted(c for c in used - defined
                 if c not in ignore and not c.startswith('rv'))
print('--- used in HTML, no rule in CSS (%d) ---' % len(missing))
for c in missing:
    where = [f for f in glob.glob('*.html') if re.search(r'class="[^"]*\b%s\b' % re.escape(c), open(f, encoding='utf-8').read())]
    print(' ', c, '->', ', '.join(where[:4]))

# rules that nothing references (excluding state/utility prefixes)
orphan = sorted(c for c in defined - used - runtime
                if not c.startswith(('is-', 'has-', 'rv')))
print('\n--- defined in CSS, unused in HTML (%d) ---' % len(orphan))
print(' ', ', '.join(orphan))
