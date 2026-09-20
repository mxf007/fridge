"""Key iso_bag_tray_* (magenta or cream studio) into 256 bag sprites."""
from __future__ import annotations

import shutil
from collections import deque
from pathlib import Path

from PIL import Image

from matte_iso_sprites import fit, magenta_mask

ISO = Path(r"C:\Users\Administrator\.cursor\projects\f-fridge\assets")
ROOT = Path(r"F:\fridge")
CUTS = ROOT / "docs" / "ui_cuts"
ASSETS = ROOT / "assets" / "ui"

KINDS = [
    "milk",
    "veg",
    "fruit",
    "meat",
    "sauce",
    "leftover",
    "grape",
    "lemon",
    "kiwi",
    "pineapple",
    "watermelon",
    "coconut",
]


def is_magenta(r: int, g: int, b: int) -> bool:
    if r < 165 or g > 110 or b < 90:
        return False
    if g > int(r * 0.45):
        return False
    return True


def cream_mask(im: Image.Image, thresh: int = 42) -> Image.Image:
    src = im.convert("RGBA")
    sp = src.load()
    w, h = src.size
    samples = [sp[2, 2], sp[w - 3, 2], sp[2, h - 3], sp[w - 3, h - 3]]
    br = sum(p[0] for p in samples) // 4
    bg = sum(p[1] for p in samples) // 4
    bb = sum(p[2] for p in samples) // 4

    def near(r: int, g: int, b: int) -> bool:
        return abs(r - br) + abs(g - bg) + abs(b - bb) <= thresh

    marked = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()

    def push(x: int, y: int) -> None:
        i = y * w + x
        if marked[i]:
            return
        r, g, b, _a = sp[x, y]
        if not near(r, g, b):
            return
        marked[i] = 1
        q.append((x, y))

    for x in range(w):
        push(x, 0)
        push(x, h - 1)
    for y in range(h):
        push(0, y)
        push(w - 1, y)
    while q:
        x, y = q.popleft()
        if x > 0:
            push(x - 1, y)
        if x + 1 < w:
            push(x + 1, y)
        if y > 0:
            push(x, y - 1)
        if y + 1 < h:
            push(x, y + 1)

    out = Image.new("RGBA", (w, h))
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = sp[x, y]
            if marked[y * w + x]:
                op[x, y] = (0, 0, 0, 0)
            else:
                op[x, y] = (r, g, b, a)
    return out


def key(im: Image.Image) -> Image.Image:
    r, g, b, _a = im.convert("RGBA").getpixel((4, 4))
    if is_magenta(r, g, b):
        return magenta_mask(im)
    return cream_mask(im)


def write_meta(dest: Path, uuid: str, name: str) -> None:
    template = (ASSETS / "bag" / "bag_veg.png.meta").read_text(encoding="utf-8")
    text = template.replace("f56ca46f-d09a-4eef-8c54-72aba7419d20", uuid)
    text = text.replace("bag_veg", name)
    dest.write_text(text, encoding="utf-8")


NEW_UUID = {
    "grape": "3c8e1f70-9a24-4d5b-b6c1-8e2f0a4d7b19",
    "lemon": "4d9f2081-ab35-4e6c-87d2-9f3a1b5e8c20",
    "kiwi": "5e0a3192-bc46-4f7d-98e3-a04b2c6f9d31",
    "pineapple": "6f1b42a3-cd57-408e-a9f4-b15c3d70ae42",
    "watermelon": "701c53b4-de68-419f-8a05-c26d4e81bf53",
    "coconut": "812d64c5-ef79-42a0-8b16-d37e5f92c064",
}


def main() -> None:
    iso_out = CUTS / "_iso"
    iso_out.mkdir(parents=True, exist_ok=True)
    (CUTS / "bag").mkdir(parents=True, exist_ok=True)
    (ASSETS / "bag").mkdir(parents=True, exist_ok=True)
    for kind in KINDS:
        src = ISO / f"iso_bag_tray_{kind}.png"
        if not src.exists():
            print("missing", src)
            continue
        shutil.copy2(src, iso_out / f"iso_bag_tray_{kind}.png")
        keyed = key(Image.open(src))
        out = fit(keyed, (256, 256), 0.06)
        rel = f"bag/bag_{kind}.png"
        dest = CUTS / rel
        asset = ASSETS / rel
        out.save(dest, "PNG")
        out.save(asset, "PNG")
        if kind in NEW_UUID and not (ASSETS / "bag" / f"bag_{kind}.png.meta").exists():
            write_meta(ASSETS / "bag" / f"bag_{kind}.png.meta", NEW_UUID[kind], f"bag_{kind}")
        print("ok", rel, out.size, "bbox", keyed.getbbox())


if __name__ == "__main__":
    main()
