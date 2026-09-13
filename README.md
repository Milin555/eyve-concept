# EYVE — storefront concept

A 21-page e-commerce concept for a science-led Indian skincare brand. Hand-built
HTML, CSS and vanilla JavaScript. No framework, no build tooling, no
dependencies.

**Live:** https://milin555.github.io/eyve-concept/

---

> **Concept work, not a live store.** This is an unaffiliated design proposal.
> Product names, photography and branding belong to Eyve. The customer notes
> shown are written examples, labelled as such on every page they appear, and
> the registration numbers on the contact page are marked as placeholders.
> Every page carries `noindex` so this cannot appear in search alongside the
> brand's own site. No payment is processed anywhere.

---

## What's in it

| | |
|---|---|
| Home · Shop · About · The Science · Help | 5 |
| Product pages | 5 |
| Routines — the full Protocol, Pigmentation, Barrier | 3 |
| Bag · Checkout · Order confirmation | 3 |
| Contact · Returns · Shipping · Privacy · Terms | 5 |

Plus `sitemap.xml` and `robots.txt`.

## Built from the brand's own material

Everything factual on this site traces to EYVE's live store: the five
formulations and their prices, the claims printed on the packs, the directions
including the sunscreen's 08:00 / 13:00 clock, the founders — Anita Jasani, a
doctor and pharmacist, and Devam Jasani of IIT Bombay — and five creator reels.

**No efficacy percentage appears anywhere.** An earlier version of this concept
carried invented clinical data — "94% reported no tightness", a 4.7 rating over
1,362 reviews, sample sizes and a Franz diffusion study — printed directly
beneath copy promising that a claim we cannot source is a claim we remove. All
of it is gone. What replaced it is a specification block whose every figure is
stated on the brand's own labelling, and a note explaining the absence.

## The commerce is real

The bag persists in `localStorage` and survives navigation and refresh.

- **Routines are priced to beat the code.** `WELCOME15` takes 15% off single
  products and excludes routines, and each routine is cut 17–20% — so choosing
  the routine is never the worse deal. A bag that already holds every part of a
  routine is told so and offered the swap, with an undo.
- **Serviceability is checked, not promised.** A PIN code returns a delivery
  window, a named date and whether Cash on Delivery runs on that route. It
  gates the payment method: a prepaid-only route cannot select COD.
- **The ₹5,000 COD ceiling measures what the courier collects** — the payable
  amount plus shipping plus the ₹49 handling fee — and the fee is disclosed on
  the product page and in the bag, not sprung at checkout.
- Checkout validates a real Indian mobile (`[6-9]` and nine more digits), a
  real PIN code in a real postal circle, and a state chosen from all 28 states
  and 8 union territories.
- **No card fields anywhere.** Payment selection hands off to a gateway, which
  is how Indian D2C checkout actually works.

## Design notes

The palette is taken from the brand's own material — indigo `#3E388A` sampled
from the logo, warm sand `#D3BA92` from the product photography, on a cool
lavender-white.

Every module sits on one twelve-column grid with a single gutter. The type
scale is eight steps with four tracking roles; it was twenty-nine rendered
sizes and twenty-six tracking values before.

The centrepiece is a cross-section of skin where a vesicle descends through the
strata as you scroll, the barrier flashes as it is crossed, and the shell
dissolves at the dermis. The brand's claim is that actives travel deeper, so
the page performs the claim rather than asserting it.

Five creator reels play in a viewer that holds exactly one `<video>` at a time,
created on open and destroyed on close. **Nothing from `assets/video/` is
requested until somebody clicks a poster.**

## Running it

Open `index.html`, or:

```bash
python -m http.server 8848
```

## Tests

Six harnesses drive a real browser through the Chrome DevTools Protocol.

```bash
python3 _dev/check.py      # broken links, images, media
python3 _dev/journey.py    # 44 assertions across the whole funnel
python3 _dev/widths.py     # 21 pages x 17 widths, 320 to 2560
python3 _dev/a11y.py       # contrast, labels, landmarks, heading order
python3 _dev/typecheck.py  # every rendered size, tracking and leading
python3 _dev/gridcheck.py  # every grid's columns and gutter
```

`widths.py` asserts that nothing escapes its viewport and no line inside a
reveal mask is clipped — `overflow-x: hidden` was removed from `body` so that a
regression fails a test instead of being quietly cropped.

## Licence

Code is free to read and learn from. Brand assets are not mine to license.
