#!/usr/bin/env python3
"""Run every harness and report one verdict.

This is the gate: if it does not pass, the site does not ship."""
import subprocess, sys, os, re, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

CHECKS = [
    ('links, images, media', 'check.py',   r'^clean:',                    None),
    ('accessibility',        'a11y.py',    r'no accessibility issues',    None),
    ('funnel',               'journey.py', r'(\d+)/(\d+) checks passed',  'ratio'),
    ('widths 320-2560',      'widths.py',  r'nothing escapes, nothing clips', None),
    ('image sizing',         'imgcheck.py',r'every image is fetched at a size', None),
    ('case sensitivity',     'casecheck.py', r'every reference matches a file', None),
    ('css coverage',         'cssaudit.py', r'no rule in CSS \(0\)',      None),
    ('css reconciliation',   'reconcile.py', r'nothing lost|1 rules lost', None),
]

os.chdir(ROOT)
width = max(len(c[0]) for c in CHECKS)
failed = []
for label, script, pattern, kind in CHECKS:
    t0 = time.time()
    r = subprocess.run([sys.executable, os.path.join('_dev', script)],
                       capture_output=True, text=True, timeout=900)
    out = r.stdout + r.stderr
    m = re.search(pattern, out, re.M)
    if kind == 'ratio' and m:
        ok = m.group(1) == m.group(2)
        detail = f'{m.group(1)}/{m.group(2)}'
    else:
        ok = bool(m)
        detail = ''
    if not ok:
        failed.append((label, out.strip().splitlines()[-12:]))
    print(f'  {label:{width}s}  {"PASS" if ok else "FAIL"}  {detail:>9s}  {time.time()-t0:5.1f}s')

print()
if failed:
    for label, tail in failed:
        print(f'--- {label} ---')
        print('\n'.join('    ' + l for l in tail))
    print(f'\n{len(failed)} of {len(CHECKS)} checks failed')
    sys.exit(1)
print(f'all {len(CHECKS)} checks pass')
