#!/usr/bin/env python3
"""Put every module on one twelve-column grid.

Measured before this ran: sixteen bespoke grid definitions inside the same
1248px content width, using nine different gutters — 1, 23.04, 24, 34.56, 56,
57.6, 64, 72 and 80px. Exactly one of them landed on a consistent rhythm. That
is why no two sections shared a vertical line.

One gutter, twelve columns, and a short list of permitted splits."""
import re

TOKENS = """
  /* --- Grid ------------------------------------------------------------
     Twelve columns, one gutter, and a short list of permitted splits. Every
     module below subscribes to it, so divisions land on the same vertical
     lines the whole way down a page. */
  --gap:  clamp(1.1rem, 1.7vw, 1.5rem);
  --col:  calc((100% - 11 * var(--gap)) / 12);
  --sp2:  calc(var(--col) * 2  + var(--gap));
  --sp3:  calc(var(--col) * 3  + var(--gap) * 2);
  --sp4:  calc(var(--col) * 4  + var(--gap) * 3);
  --sp5:  calc(var(--col) * 5  + var(--gap) * 4);
  --sp6:  calc(var(--col) * 6  + var(--gap) * 5);
  --sp7:  calc(var(--col) * 7  + var(--gap) * 6);
  --sp8:  calc(var(--col) * 8  + var(--gap) * 7);
  --sp9:  calc(var(--col) * 9  + var(--gap) * 8);
"""

SPLITS = [
    ('.descent__grid',  'grid-template-columns: 1fr 1.05fr;',    'grid-template-columns: var(--sp5) var(--sp7);'),
    ('.founder__grid',  'grid-template-columns: 0.85fr 1.15fr;', 'grid-template-columns: var(--sp5) var(--sp7);'),
    ('.pdp__grid',      'grid-template-columns: 1.05fr 0.95fr;', 'grid-template-columns: var(--sp6) var(--sp6);'),
    ('.proto__grid',    'grid-template-columns: 1.05fr 0.95fr;', 'grid-template-columns: var(--sp6) var(--sp6);'),
    ('.sci__grid',      'grid-template-columns: 1.15fr 0.85fr;', 'grid-template-columns: var(--sp7) var(--sp5);'),
    ('.about__grid',    'grid-template-columns: 0.85fr 1.15fr;', 'grid-template-columns: var(--sp5) var(--sp7);'),
    ('.cart__grid',     'grid-template-columns: 1fr 22rem;',     'grid-template-columns: var(--sp8) var(--sp4);'),
    ('.contact__grid',  'grid-template-columns: 1.1fr 0.9fr;',   'grid-template-columns: var(--sp7) var(--sp5);'),
    ('.faq__grid',      'grid-template-columns: 20rem 1fr;',     'grid-template-columns: var(--sp3) var(--sp9);'),
    ('.pdp__tabs',      'grid-template-columns: 16rem 1fr;',     'grid-template-columns: var(--sp3) var(--sp9);'),
    ('.reelcard',       'grid-template-columns: minmax(0, 240px) 1fr;', 'grid-template-columns: var(--sp3) var(--sp9);'),
    ('.people__grid',   'grid-template-columns: repeat(2, minmax(0, 1fr));', 'grid-template-columns: var(--sp6) var(--sp6);'),
]


def rule_span(css, sel):
    m = re.search(r'(?m)^' + re.escape(sel) + r'\s*\{', css)
    if not m: return None
    st = m.start(); k = css.index('{', st) + 1; d = 1
    while d:
        if css[k] == '{': d += 1
        elif css[k] == '}': d -= 1
        k += 1
    return st, k


def main():
    p = 'assets/css/style.css'
    s = open(p, encoding='utf-8').read()
    assert '--gap:' not in s, 'grid tokens already installed'
    s = s.replace('  --rail: 110px;', TOKENS + '\n  --rail: 110px;', 1)

    n = 0
    for sel, old, new in SPLITS:
        span = rule_span(s, sel)
        if not span:
            print('  missing:', sel); continue
        a, b = span
        block = s[a:b]
        if old not in block:
            print('  template changed, skipped:', sel); continue
        block = block.replace(old, new)
        # one gutter everywhere; rows keep their own generous rhythm
        block = re.sub(r'\n(\s*)gap: (clamp\([^)]*\)|[\d.]+rem);',
                       r'\n\1row-gap: \2;\n\1column-gap: var(--gap);', block)
        s = s[:a] + block + s[b:]
        n += 1

    # the multi-column grids only need their gutter brought into line
    for old, new in [
        ('column-gap: clamp(1.25rem, 2.4vw, 2.25rem);', 'column-gap: var(--gap);'),
        ('.revs__grid:has(.rev--feature) { grid-template-columns: 1fr 1fr 0.9fr;',
         '.revs__grid:has(.rev--feature) { grid-template-columns: var(--sp4) var(--sp4) var(--sp4);'),
        ('.spec__grid {\n  margin-top: var(--s-4);\n  display: grid;\n  grid-template-columns: repeat(4, 1fr);\n  gap: var(--s-3);',
         '.spec__grid {\n  margin-top: var(--s-4);\n  display: grid;\n  grid-template-columns: repeat(4, var(--sp3));\n  gap: var(--gap);'),
    ]:
        if old in s: s = s.replace(old, new, 1); n += 1

    open(p, 'w', encoding='utf-8').write(s)
    print('modules moved onto the twelve-column grid:', n)


if __name__ == '__main__':
    main()
