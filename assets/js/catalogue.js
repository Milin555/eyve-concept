window.EYVE_CATALOGUE = {
  "cleanser": {
    "name": "Hydrasyn Ultra-Gentle Cleanser",
    "price": 799,
    "img": "prod-cleanser",
    "size": "100 ml",
    "url": "cleanser.html"
  },
  "serum": {
    "name": "Lipobright Pro Serum",
    "price": 1499,
    "img": "prod-serum",
    "size": "30 ml",
    "url": "serum.html"
  },
  "moisturiser": {
    "name": "Neo-Liposomal Moisturiser",
    "price": 1124,
    "img": "prod-moisturizer",
    "size": "50 g",
    "url": "moisturiser.html"
  },
  "sunscreen": {
    "name": "Liposhield SPF 50 PA++++",
    "price": 899,
    "img": "prod-sunscreen",
    "size": "50 g",
    "url": "sunscreen.html"
  },
  "night-cream": {
    "name": "Revilipo Pro Night Cream",
    "price": 1619,
    "img": "prod-revilipo",
    "size": "30 g",
    "url": "night-cream.html"
  },

  /* Routines. `parts` is what the set contains, `rrp` the sum of those parts.
     Every routine is discounted harder than any code we run, so choosing the
     routine is never the worse deal. */
  "protocol": {
    "name": "The EYVE Protocol",
    "price": 4749,
    "rrp": 5940,
    "img": "life-cleanser-duo",
    "size": "All five",
    "url": "protocol.html",
    "bundle": true,
    "parts": ["cleanser", "serum", "moisturiser", "sunscreen", "night-cream"]
  },
  "pigment-set": {
    "name": "The Pigmentation Routine",
    "price": 2649,
    "rrp": 3197,
    "img": "life-serum-box",
    "size": "Three steps",
    "url": "pigment-routine.html",
    "bundle": true,
    "parts": ["cleanser", "serum", "sunscreen"]
  },
  "barrier-set": {
    "name": "The Barrier Routine",
    "price": 2349,
    "rrp": 2822,
    "img": "life-cleanser-cream",
    "size": "Three steps",
    "url": "barrier-routine.html",
    "bundle": true,
    "parts": ["cleanser", "moisturiser", "sunscreen"]
  }
};

window.EYVE_FREE_SHIP = 999;
window.EYVE_SHIP = 69;
window.EYVE_COD = 49;
window.EYVE_COD_CAP = 5000;

/* The welcome code. Routines are excluded so a code can never beat a set. */
window.EYVE_PROMOS = {
  "WELCOME15": {
    "pct": 15,
    "label": "Welcome offer — first order",
    "excludesBundles": true
  }
};
