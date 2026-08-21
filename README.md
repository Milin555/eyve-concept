# EYVE — storefront concept

A 19-page e-commerce concept for a science-led Indian skincare brand. Hand-built
HTML, CSS and vanilla JavaScript. No framework, no build tooling, no
dependencies. About 1.3 MB in total.

**Live:** https://milin555.github.io/eyve-concept/

---

> **Concept work, not a live store.** This is an unaffiliated design proposal.
> Product names, photography and branding belong to Eyve. Customer reviews and
> the assessment figures shown are written examples for demonstration and are
> not real data. Every page carries `noindex` so this cannot appear in search
> alongside the brand's own site. No payment is processed anywhere.

---

## What's in it

| | |
|---|---|
| Home · Shop · About · The Science · The Protocol · Help | 6 |
| Product pages | 5 |
| Bag · Checkout · Order confirmation | 3 |
| Contact · Returns · Shipping · Privacy · Terms | 5 |

Plus `sitemap.xml` and `robots.txt`.

## The cart is real

Persists in `localStorage`, survives navigation and refresh. Live subtotal, free
shipping over ₹999, ₹69 below that, and a ₹49 Cash-on-Delivery handling fee that
appears only when COD is selected. Checkout validates email, a 10-digit mobile
and a 6-digit PIN, then clears the bag and issues an order number.

**No card fields anywhere.** Payment method selection hands off to a gateway,
which is how Indian D2C checkout actually works.

## Design notes

The palette is taken from the brand's own material — indigo `#3E388A` sampled
from the logo, warm sand `#D3BA92` sampled from the product photography, set on
a cool lavender-white so the warm images have something to sit against.

Headings use light tracked capitals, echoing the lettering on the bottles. A
serif carries body copy; a monospace carries every number, label and
measurement.

The centrepiece is a cross-section of skin where a vesicle descends through the
strata as you scroll, the barrier flashes as it is crossed, and the shell
dissolves at the dermis to release its payload. The brand's claim is that
actives travel deeper — so the page performs the claim rather than asserting it.

## Running it

Open `index.html`, or:

```bash
python -m http.server 8080
```

## Built from a generator

Content lives in `_dev/data.py`, templates in `_dev/build.py`:

```bash
python _dev/build.py
```

Change a price once and it updates across every page, the cart, checkout and the
structured data. The `_dev/` directory is not published.

## Tests

Six suites run against a real browser — 98 checks covering console errors, every
interactive control, the mobile menu, keyboard navigation, ARIA wiring, cart
arithmetic, checkout validation, the no-JavaScript fallback, reduced motion,
content integrity, and layout at 13 viewport widths from 320px to 2560px.

```bash
python _dev/smoke.py  _dev/check.py  _dev/a11y.py
python _dev/journey.py  _dev/integrity.py  _dev/qa2.py
```

## Licence

Code is free to read and learn from. Brand assets are not mine to license.
