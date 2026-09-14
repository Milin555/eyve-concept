#!/usr/bin/env python3
"""Did any agent's CSS get lost to a concurrent write?

Five agents append to one stylesheet. Each mirrors its blocks to a private
parts file. Any selector present in a part but missing from the stylesheet was
overwritten by somebody else's read-modify-write."""
import re, os, glob, sys

PARTS = '/private/tmp/claude-501/-Users-milin-eyve-concept/ff224c5f-235a-4f7c-95ae-bfd9c1c3f46c/scratchpad/cssparts'
css_raw = open('assets/css/style.css', encoding='utf-8').read()
# A selector list may be written across several lines in one file and on one
# line in another. Compare on normalised whitespace, or every multi-line
# selector reads as lost.
css = ' '.join(css_raw.split())

def selectors(text):
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    out = []
    for m in re.finditer(r'(?m)^\s*([.#][A-Za-z][^{\n,]*(?:,\s*[^{\n]*)?)\s*\{', text):
        sel = ' '.join(m.group(1).split())
        if sel and not sel.startswith('@'):
            out.append(sel)
    return out

missing_total = 0
for f in sorted(glob.glob(os.path.join(PARTS, '*.css'))):
    name = os.path.basename(f)
    if name.startswith('style.baseline'):
        continue
    sels = selectors(open(f, encoding='utf-8').read())
    missing = [s for s in sels if ' '.join(s.split()) not in css]
    status = 'all present' if not missing else f'{len(missing)} MISSING'
    print(f'{name:24s} {len(sels):3d} rules  {status}')
    for s in missing[:8]:
        print(f'    lost: {s[:90]}')
    missing_total += len(missing)

print(f'\n{missing_total} rules lost to concurrent writes' if missing_total
      else '\nnothing lost — every mirrored rule is in the stylesheet')
