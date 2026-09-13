"""Minimal Chrome DevTools Protocol client — stdlib only.

Launches headless Chrome, speaks raw RFC6455 over a socket, exposes just enough
to drive a page: navigate, evaluate JS, capture full-page PNGs at any viewport.
"""
import base64, json, os, re, socket, subprocess, struct, time, urllib.request, tempfile, shutil, signal, sys

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


class WS:
    def __init__(self, url):
        m = re.match(r"ws://([^:/]+):(\d+)(/.*)", url)
        host, port, path = m.group(1), int(m.group(2)), m.group(3)
        self.s = socket.create_connection((host, port))
        self.s.settimeout(60)
        key = base64.b64encode(os.urandom(16)).decode()
        req = (f"GET {path} HTTP/1.1\r\nHost: {host}:{port}\r\nUpgrade: websocket\r\n"
               f"Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n")
        self.s.sendall(req.encode())
        buf = b""
        while b"\r\n\r\n" not in buf:
            buf += self.s.recv(4096)
        self.rest = buf.split(b"\r\n\r\n", 1)[1]

    def _recv(self, n):
        while len(self.rest) < n:
            c = self.s.recv(max(4096, n - len(self.rest)))
            if not c:
                raise IOError("socket closed")
            self.rest += c
        out, self.rest = self.rest[:n], self.rest[n:]
        return out

    def send(self, payload: str):
        data = payload.encode()
        n = len(data)
        hdr = b"\x81"
        if n < 126:
            hdr += bytes([0x80 | n])
        elif n < 65536:
            hdr += bytes([0x80 | 126]) + struct.pack(">H", n)
        else:
            hdr += bytes([0x80 | 127]) + struct.pack(">Q", n)
        mask = os.urandom(4)
        masked = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
        self.s.sendall(hdr + mask + masked)

    def recv(self) -> str:
        chunks = []
        while True:
            b0, b1 = self._recv(2)
            fin, op, ln = b0 & 0x80, b0 & 0x0F, b1 & 0x7F
            if ln == 126:
                ln = struct.unpack(">H", self._recv(2))[0]
            elif ln == 127:
                ln = struct.unpack(">Q", self._recv(8))[0]
            chunks.append(self._recv(ln))
            if fin:
                break
        return b"".join(chunks).decode("utf-8", "replace")

    def close(self):
        try:
            self.s.close()
        except Exception:
            pass


class Browser:
    def __init__(self, port=0, width=1440, height=900, scale=2):
        if not port:                       # grab a free port so parallel runs cannot collide
            _s = socket.socket(); _s.bind(("127.0.0.1", 0)); port = _s.getsockname()[1]; _s.close()
        self.port = port
        self.profile = tempfile.mkdtemp(prefix="cdp-")
        self.proc = subprocess.Popen(
            [CHROME, "--headless=new", f"--remote-debugging-port={port}",
             f"--user-data-dir={self.profile}", "--disable-gpu", "--hide-scrollbars",
             "--no-first-run", "--no-default-browser-check", "--disable-extensions",
             "--force-device-scale-factor=1", "--font-render-hinting=none",
             f"--window-size={width},{height}", "about:blank"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        ws_url = None
        for _ in range(120):
            try:
                d = json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list"))
                for t in d:
                    if t.get("type") == "page":
                        ws_url = t["webSocketDebuggerUrl"]
                        break
                if ws_url:
                    break
            except Exception:
                pass
            time.sleep(0.25)
        if not ws_url:
            raise RuntimeError("chrome did not start")
        self.ws = WS(ws_url)
        self.id = 0
        self.cmd("Page.enable")
        self.cmd("Runtime.enable")
        self.cmd("Network.enable")
        self.cmd("Log.enable")
        self.set_viewport(width, height, scale)

    def cmd(self, method, **params):
        self.id += 1
        mid = self.id
        self.ws.send(json.dumps({"id": mid, "method": method, "params": params}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == mid:
                if "error" in msg:
                    raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get("result", {})

    def set_viewport(self, w, h, scale=2, mobile=False):
        self.scale = scale or 1
        self.cmd("Emulation.setDeviceMetricsOverride", width=w, height=h,
                 deviceScaleFactor=scale, mobile=mobile)

    def goto(self, url, wait=1.2):
        self.cmd("Page.navigate", url=url)
        deadline = time.time() + 25
        while time.time() < deadline:
            try:
                r = self.eval("document.readyState")
                if r == "complete":
                    break
            except Exception:
                pass
            time.sleep(0.2)
        time.sleep(wait)

    def eval(self, expr):
        r = self.cmd("Runtime.evaluate", expression=expr, returnByValue=True, awaitPromise=True)
        if r.get("exceptionDetails"):
            raise RuntimeError(json.dumps(r["exceptionDetails"])[:400])
        return r["result"].get("value")

    # Chrome's compositor surface caps at 16384 DEVICE pixels; past that a
    # capture comes back blank. The band is therefore in CSS pixels divided by
    # the device scale factor, and tall pages are stitched from several.
    CAP_DEVICE_PX = 15600

    def shot(self, path, full=True, quality=None):
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        if not full:
            data = base64.b64decode(self.cmd("Page.captureScreenshot", format="png")["data"])
            open(path, "wb").write(data)
            return path

        h = self.eval("Math.ceil(document.documentElement.scrollHeight)")
        # clientWidth, not cssContentSize: the latter counts horizontally
        # scrollable children and photographs the page wider than it is
        w = self.eval("document.documentElement.clientWidth")

        def grab(y, height):
            r = self.cmd("Page.captureScreenshot", format="png", captureBeyondViewport=True,
                         clip={"x": 0, "y": y, "width": w, "height": height, "scale": 1})
            return base64.b64decode(r["data"])

        band = int(self.CAP_DEVICE_PX / max(1, getattr(self, 'scale', 1)))
        if h <= band:
            open(path, "wb").write(grab(0, h))
            return path

        from io import BytesIO
        try:
            from PIL import Image
        except ImportError:                       # no stitcher available
            open(path, "wb").write(grab(0, band))
            return path
        Image.MAX_IMAGE_PIXELS = None
        bands, y = [], 0
        while y < h:
            bh = min(band, h - y)
            bands.append(Image.open(BytesIO(grab(y, bh))).convert("RGB"))
            y += bh
        total = sum(b.height for b in bands)
        out = Image.new("RGB", (bands[0].width, total), "white")
        oy = 0
        for band in bands:
            out.paste(band, (0, oy)); oy += band.height
        out.save(path)
        return path

    def close(self):
        try:
            self.ws.close()
            self.proc.terminate()
            self.proc.wait(timeout=5)
        except Exception:
            try: self.proc.kill()
            except Exception: pass
        shutil.rmtree(self.profile, ignore_errors=True)
