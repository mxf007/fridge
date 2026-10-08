"""Tight-crop bx_title.png from its existing alpha."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "assets" / "ui" / "scene" / "bx_title.png"
ALPHA_CROP_THRESHOLD = 16
PAD = 4


def main() -> None:
    before = TARGET.stat().st_size
    im = Image.open(TARGET).convert("RGBA")
    w, h = im.size
    alpha = im.getchannel("A")
    crop_mask = alpha.point(lambda a: 255 if a >= ALPHA_CROP_THRESHOLD else 0)
    bbox = crop_mask.getbbox()
    if bbox:
        left = max(0, bbox[0] - PAD)
        top = max(0, bbox[1] - PAD)
        right = min(w, bbox[2] + PAD)
        bottom = min(h, bbox[3] + PAD)
        im = im.crop((left, top, right, bottom))
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            if px[x, y][3] == 0:
                px[x, y] = (0, 0, 0, 0)
    tmp = TARGET.with_suffix(".png.tmp")
    im.save(tmp, "PNG", optimize=True, compress_level=9)
    after = tmp.stat().st_size
    tmp.replace(TARGET)
    print(f"{TARGET.relative_to(ROOT)}: {before} -> {after} bytes, {w}x{h}, cropped")


if __name__ == "__main__":
    main()
