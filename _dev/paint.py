#!/usr/bin/env python3
"""When does the page actually appear, on a connection somebody really has?

Every other harness here answers "is it correct". This one answers "is it
there yet", which is a different question and was the one nobody was asking.

It exists because of a bug that survived every check in this directory. The
scroll-reveal class `.rvimg` hides an element with `clip-path: inset(0 0 100%
0)` — a box of zero height. An IntersectionObserver measures the clipped box,
so such an element reported ratio 0.000 forever, and the only thing that could
ever give it height was the class it could only earn by intersecting. Every
image on every page therefore waited out the three-second failsafe in main.js
and the whole page arrived at once. The site looked slow and the images got
the blame; they had finished downloading inside a second.

Nothing caught it. check.py saw the images load. imgcheck.py saw them sized
correctly. widths.py screenshotted pages that had sat still long enough to
reveal themselves. So: measure the paint, and separately assert that no page
is relying on the failsafe to show its content.
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp import Browser

ROOT = "http://localhost:8848"
PAGES = ["index", "shop", "serum", "cleanser", "moisturiser", "sunscreen",
         "night-cream", "protocol", "pigment-routine", "barrier-routine",
         "science", "about", "faq", "contact", "cart", "checkout",
         "order-confirmed", "shipping-policy", "refund-policy",
         "privacy-policy", "terms"]

# A good Indian mobile connection, not a bad one. If the site is slow here it
# is slow everywhere that matters.
THROUGHPUT = int(9 * 1024 * 1024 / 8)
LATENCY = 40

# The failsafe in main.js fires at 3000ms. Sampling at 1500ms is late enough
# that a working observer has long since fired, and early enough that the
# failsafe cannot be what we are seeing.
SAMPLE_AT = 1500
LCP_BUDGET = 2500

PROBE = """new Promise(function(res){
  var out = {lcp: 0, el: ''};
  try {
    new PerformanceObserver(function (l) {
      var e = l.getEntries(), x = e[e.length - 1];
      out.lcp = Math.round(x.startTime);
      out.el = x.element ? (x.element.tagName + ' ' +
               (x.element.getAttribute('src') || '').split('/').pop()) : '';
    }).observe({type: 'largest-contentful-paint', buffered: true});
  } catch (e) {}
  setTimeout(function () {
    performance.getEntriesByType('paint').forEach(function (p) {
      if (p.name === 'first-contentful-paint') out.fcp = Math.round(p.startTime);
    });
    /* Anything still hidden that the visitor can already see is being held
       back by something, and the only thing that will release it is a timer.

       Mind the observer's own rootMargin: main.js uses `0px 0px -8% 0px`, so
       an element sitting in the bottom 8% of the viewport is deliberately not
       revealed yet. Counting those as stuck asserts a promise the design never
       made — it flagged one heading on science and one standfirst on about,
       both at 93% down the screen, and both perfectly correct. */
    var vh = innerHeight, edge = vh * 0.92, stuck = 0;
    document.querySelectorAll('.rv:not(.is-in), .rvimg:not(.is-in), .rvline:not(.is-in)')
      .forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < edge && r.bottom > 0) stuck++;
      });
    out.stuck = stuck;
    res(JSON.stringify(out));
  }, __SAMPLE_AT__);
})""".replace('__SAMPLE_AT__', str(SAMPLE_AT))


def main():
    bad = []
    b = Browser(width=1440, height=900)
    try:
        b.cmd('Network.enable')
        b.cmd('Network.emulateNetworkConditions', offline=False, latency=LATENCY,
              downloadThroughput=THROUGHPUT, uploadThroughput=THROUGHPUT)
        print(f'{"page":20s} {"FCP":>7s} {"LCP":>7s}  held back  largest element')
        for p in PAGES:
            b.cmd('Network.clearBrowserCache')
            if p in ("cart", "checkout"):
                b.goto(f"{ROOT}/index.html", wait=0.2)
                b.eval("localStorage.setItem('eyveBag',"
                       "JSON.stringify({serum:2,cleanser:1}));1")
            b.goto(f"{ROOT}/{p}.html", wait=0.05)
            d = json.loads(b.eval(PROBE))
            fcp, lcp, stuck = d.get('fcp', 0), d.get('lcp', 0), d.get('stuck', 0)
            flag = ''
            if stuck:
                flag = ' <-- waiting on the failsafe'
                bad.append(f'{p}: {stuck} element(s) on screen still hidden at {SAMPLE_AT}ms')
            if lcp > LCP_BUDGET:
                flag = flag or f' <-- over the {LCP_BUDGET}ms budget'
                bad.append(f'{p}: LCP {lcp}ms over the {LCP_BUDGET}ms budget')
            print(f'{p:20s} {fcp:6d}m {lcp:6d}m {stuck:10d}  {d.get("el","")[:28]}{flag}')
    finally:
        b.close()

    print()
    if bad:
        print(f'{len(bad)} problem(s):')
        for x in bad:
            print('  -', x)
        return 1
    print(f'every page paints inside {LCP_BUDGET}ms and nothing waits on the failsafe')
    return 0


if __name__ == '__main__':
    sys.exit(main())
