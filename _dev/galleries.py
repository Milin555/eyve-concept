#!/usr/bin/env python3
"""Rebuild every product gallery so each frame shows the product on sale.

Several frames had drifted: a cleanser photographed as the moisturiser, a
Western stock model captioned as the serum, four of six night-cream frames
showing something else. Alt text that names the wrong product is worse than a
short gallery, so where the library is thin the gallery is shorter."""
import re, os

GALLERIES = {
 'serum.html': [
   ('prod-serum',          'Lipobright Pro serum bottle with gel texture'),
   ('life-serum-box',      'Lipobright Pro serum beside its carton on travertine'),
   ('life-serum-drop',     'Lipobright Pro serum tilted, a drop falling from the pump'),
   ('life-serum-stone',    'Lipobright Pro serum standing on top of its carton'),
   ('life-serum-beige',    'Lipobright Pro serum on a stone plinth'),
   ('life-serum-splash',   'Lipobright Pro serum in water, mid-splash'),
 ],
 'cleanser.html': [
   ('prod-cleanser',       'Hydrasyn cleanser bottle with gel texture'),
   ('shot-cl-pour',        'Hydrasyn bottle on its side, gel pouring from the pump'),
   ('shot-cl-plain',       'Hydrasyn cleanser photographed square on white'),
   ('shot-moist-model',    'A model resting beside the Hydrasyn cleanser'),
   ('life-cleanser-blue',  'Hydrasyn cleanser beside its carton on a beige ground'),
   ('life-cleanser-cream', 'Hydrasyn cleanser on a cream ground'),
 ],
 'moisturiser.html': [
   ('prod-moisturizer',    'Lipomist moisturiser bottle with cream texture'),
   ('shot-moi-blue',       'Lipomist moisturiser standing in shallow water'),
   ('life-rescue',         'A woman smiling, holding the Lipomist moisturiser beside her face'),
   ('box-lipomist',        'The Lipomist carton beside the moisturiser bottle'),
 ],
 'sunscreen.html': [
   ('prod-sunscreen',      'Liposhield SPF 50 bottle with cream texture'),
   ('shot-sun-top',        'The Liposhield bottle photographed from above on white'),
   ('shot-sun-smear',      'Liposhield on a cream smear against a sage-green ground'),
   ('shot-sun-kit',        'Liposhield with its open carton and the liposome leaflet'),
 ],
 'night-cream.html': [
   ('prod-revilipo',       'Revilipo Pro night cream bottle with cream texture'),
   ('shot-rev-pink',       'Revilipo Pro night cream standing in still water'),
   ('life-revilipo-box',   'Revilipo Pro night cream beside its carton'),
 ],
}

SEL_ON = ' class="is-sel" aria-pressed="true"'
SEL_OFF = ' class="" aria-pressed="false"'

for f, items in GALLERIES.items():
    s = open(f, encoding='utf-8').read()
    frames = []
    for slug, alt in items:
        sm = slug + '-sm' if os.path.exists('assets/opt/%s-sm.webp' % slug) else slug
        lg = slug + '-lg' if os.path.exists('assets/opt/%s-lg.webp' % slug) else slug
        frames.append((slug, alt, sm, lg))

    body = ''
    for i, (slug, alt, sm, lg) in enumerate(frames):
        body += ('<button type="button"%s data-full="assets/opt/%s.webp" aria-label="View: %s">\n'
                 '              <img src="assets/opt/%s.webp" alt="%s" width="600" height="750" '
                 'loading="lazy" decoding="async"></button>'
                 % (SEL_ON if i == 0 else SEL_OFF, slug, alt, sm, alt))

    out = re.sub(r'<div class="gal__thumbs">.*?</div>',
                 '<div class="gal__thumbs">' + body + '</div>', s, count=1, flags=re.S)
    assert out != s, f

    slug, alt, sm, lg = frames[0]
    out = re.sub(
        r'(<figure class="gal__main rvimg"><img id="galMain" )src="[^"]*" srcset="[^"]*" sizes="([^"]*)" alt="[^"]*"',
        lambda m: '%ssrc="assets/opt/%s.webp" srcset="assets/opt/%s.webp 640w, assets/opt/%s.webp 1200w" '
                  'sizes="%s" alt="%s"' % (m.group(1), sm, sm, lg, m.group(2), alt),
        out, count=1)
    open(f, 'w', encoding='utf-8').write(out)
    print('%-22s %d frames, every one showing the product' % (f, len(items)))
