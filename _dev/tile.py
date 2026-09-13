#!/usr/bin/env python3
"""Slice a tall screenshot into readable, model-friendly tiles."""
import sys, os
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
src = sys.argv[1]
W = int(sys.argv[2]) if len(sys.argv) > 2 else 880
TILE = int(sys.argv[3]) if len(sys.argv) > 3 else 1500
im = Image.open(src).convert("RGB")
im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
base = os.path.splitext(src)[0]
n = 0
for y in range(0, im.height, TILE):
    n += 1
    im.crop((0, y, W, min(y + TILE, im.height))).save(f"{base}--t{n}.png")
    print(f"{base}--t{n}.png")
