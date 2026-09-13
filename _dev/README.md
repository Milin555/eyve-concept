# Test harnesses

Six checks that drive a real browser through the Chrome DevTools Protocol.
There is no framework and no package to install: `cdp.py` speaks raw RFC6455
over a socket, so the only requirement is Chrome and Python 3.

Serve the site first:

```bash
python -m http.server 8848
```

| | |
|---|---|
| `check.py` | broken links, images and media across every page |
| `journey.py` | 63 assertions across the whole funnel — cart maths, promo, COD ceiling and route, PIN serviceability, the routine swap, the receipt |
| `widths.py` | 21 pages × 17 widths, 320 to 2560: nothing may escape its viewport, no line inside a reveal mask may clip |
| `a11y.py` | contrast, form labels, landmarks, heading order, duplicate ids |
| `casecheck.py` | references whose case differs from the file on disk — invisible on macOS, a 404 on GitHub Pages |
| `typecheck.py` | every rendered font size, tracking and leading |
| `gridcheck.py` | every grid's columns and gutter |
| `voids.py` | two-column blocks where one column ends well short of the other |
| `cssaudit.py` | classes with no rule, rules with no class |
| `weigh.py` | what each page actually costs on a cold load |

Screenshots go to `_shots/` by default; set `EYVE_SHOTS` to put them elsewhere.
`tile.py` slices a tall capture into readable pieces.

Three are build tools rather than checks: `optimise.py` re-encodes oversized
images, `subset.py` cuts the webfonts down to the characters the site actually
sets, and `galleries.py` rebuilds the product galleries from one table so that
no frame can drift onto a page selling something else.
