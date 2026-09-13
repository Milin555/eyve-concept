#!/usr/bin/env python3
"""Give the four legal pages the structure the rest of the site has.

They were the only pages opting out of the 12-column grid: a 640px column of
prose with 664px of nothing beside it, thirty-one headings between them and not
one with an id, so neither the footer nor the grievance flow could link into a
clause. The currency date sat 85% down the page."""
import re, glob, unicodedata

PAGES = ["privacy-policy.html", "terms.html", "refund-policy.html", "shipping-policy.html"]


def slug(t):
    t = unicodedata.normalize("NFKD", re.sub(r"<[^>]+>", "", t))
    t = re.sub(r"[^a-zA-Z0-9\s-]", "", t).strip().lower()
    return re.sub(r"[\s-]+", "-", t)[:44]


for f in PAGES:
    s = open(f, encoding="utf-8").read()
    body_m = re.search(r'<div class="policy body-copy">(.*?)</div>', s, re.S)
    if not body_m:
        print("  no policy body in", f); continue
    body = body_m.group(1)

    # 1 — every heading gets an id, so a clause can be linked to
    heads = []
    def add_id(m):
        tag, attrs, text = m.group(1), m.group(2), m.group(3)
        if "id=" in attrs:
            heads.append((re.search(r'id="([^"]+)"', attrs).group(1), text)); return m.group(0)
        i = slug(text)
        heads.append((i, text))
        return f'<{tag}{attrs} id="{i}">{text}</{tag}>'
    body = re.sub(r"<(h2)([^>]*)>(.*?)</h2>", add_id, body, flags=re.S)

    # 2 — the currency date belongs at the head, where it is read
    upd = re.search(r'<p class="policy__upd">(.*?)</p>', body, re.S)
    if upd:
        body = body.replace(upd.group(0), "")

    # 3 — a contents rail, which is what turns the dead column into a column
    if heads:
        rail = ('<nav class="policy__toc" aria-label="On this page">'
                '<p class="policy__toc-h">On this page</p><ol>'
                + "".join(f'<li><a href="#{i}">{re.sub(r"<[^>]+>", "", t).strip()}</a></li>' for i, t in heads)
                + "</ol>"
                + (f'<p class="policy__upd">{upd.group(1)}</p>' if upd else "")
                + "</nav>")
    else:
        rail = ""

    new_block = (f'<div class="policy__grid">{rail}'
                 f'<div class="policy body-copy">{body.strip()}</div></div>')
    s = s[:body_m.start()] + new_block + s[body_m.end():]
    open(f, "w", encoding="utf-8").write(s)
    print(f"  {f:24s} {len(heads)} clauses, all linkable")
