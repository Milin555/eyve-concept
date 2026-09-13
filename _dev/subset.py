#!/usr/bin/env python3
"""Subset the webfonts to the characters this site actually sets.

Google's "latin" subset carries every Latin language it supports. This site is
English with Indian place names and rupee prices, so most of those glyphs are
paid for and never drawn."""
import glob, re, html, os, subprocess, sys

def page_text():
    chars = set()
    for f in glob.glob('*.html'):
        s = open(f, encoding='utf-8').read()
        s = re.sub(r'(?is)<(script|style)[^>]*>.*?</\1>', ' ', s)
        s = re.sub(r'(?s)<!--.*?-->', ' ', s)
        # attribute values that get rendered
        for m in re.finditer(r'(?:alt|title|aria-label|placeholder|data-caption)="([^"]*)"', s):
            chars |= set(html.unescape(m.group(1)))
        s = re.sub(r'(?s)<[^>]+>', ' ', s)
        chars |= set(html.unescape(s))
    # anything the script writes at runtime
    for f in ('assets/js/main.js', 'assets/js/catalogue.js'):
        for m in re.finditer(r"'([^'\\]*)'|\"([^\"\\]*)\"", open(f, encoding='utf-8').read()):
            chars |= set(m.group(1) or m.group(2) or '')
    # digits, the punctuation a price or date needs, and a safety margin
    chars |= set('0123456789 .,:;!?\'"()[]{}/\\|-–—•·…“”‘’&@#%+*=<>~^`$₹°º©®™×÷−')
    chars |= set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')
    chars |= set('àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ')
    return ''.join(sorted(c for c in chars if c.isprintable() and c != ' ')) + ' '

text = page_text()
print(f'{len(text)} distinct characters in use')

total_before = total_after = 0
for f in sorted(glob.glob('assets/font/*.woff2')):
    if f.endswith('-rupee.woff2'):
        continue                       # already one glyph
    before = os.path.getsize(f)
    out = f.replace('.woff2', '.subset.woff2')
    cmd = [sys.executable, '-m', 'fontTools.subset', f,
           f'--text={text}', '--flavor=woff2', f'--output-file={out}',
           '--layout-features=kern,liga,calt,tnum,onum,frac,ccmp,locl',
           '--no-hinting', '--desubroutinize', '--name-IDs=1,2,3,4,5,6']
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode or not os.path.exists(out):
        print(f'  FAILED {os.path.basename(f)}: {r.stderr.strip()[:120]}')
        continue
    after = os.path.getsize(out)
    os.replace(out, f)
    total_before += before; total_after += after
    print(f'  {os.path.basename(f):30s} {before//1024:4d}KB -> {after//1024:4d}KB')

print(f'\nwebfonts: {total_before//1024}KB -> {total_after//1024}KB '
      f'({100*(total_before-total_after)//max(1,total_before)}% smaller)')
