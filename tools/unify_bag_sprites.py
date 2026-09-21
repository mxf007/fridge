"""Rebuild every bag_*.png on one tray, one seat, one canvas.

The tray is bag_tray_lower.png so the stack top matches the cream layers.
Food sprites keep their own clay mesh, but share the same well size and angle.
"""
from __future__ import annotations

import json
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_2_5d_foundation import write_meta

ROOT = Path(r"F:\fridge")
BAG = ROOT / "assets" / "ui" / "bag"
FOOD = ROOT / "assets" / "ui" / "food"

CANVAS = 256
TRAY_H = 187
# Food sits in the recessed well, same box for every kind.
FOOD_BOX = (150, 138)
FOOD_BOTTOM = 198

TINT = {
    "veg": (176, 198, 156),
    "fruit": (224, 150, 142),
    "meat": (210, 158, 146),
    "sauce": (220, 170, 112),
    "leftover": (206, 190, 168),
    "grape": (190, 164, 200),
    "lemon": (228, 208, 132),
    "kiwi": (168, 196, 124),
    "pineapple": (222, 190, 104),
    "watermelon": (214, 136, 142),
    "coconut": (232, 216, 188),
}


def uuid_of(path: Path) -> str:
    meta = json.loads(path.with_suffix(path.suffix + ".meta").read_text(encoding="utf-8"))
    return meta["uuid"]


def key_backdrop(im: Image.Image) -> Image.Image:
    src = im.convert("RGBA")
    alpha = src.getchannel("A")
    if alpha.getextrema()[0] < 250:
        return src
    sp = src.load()
    w, h = src.size

    def dark(r: int, g: int, b: int) -> bool:
        return r < 28 and g < 28 and b < 28

    marked = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()

    def push(x: int, y: int) -> None:
        i = y * w + x
        if marked[i]:
            return
        r, g, b, _a = sp[x, y]
        if not dark(r, g, b):
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
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h:
                push(nx, ny)

    out = Image.new("RGBA", (w, h))
    op = out.load()
    for y in range(h):
        for x in range(w):
            if marked[y * w + x]:
                op[x, y] = (0, 0, 0, 0)
            else:
                op[x, y] = sp[x, y]
    return out


def crop(im: Image.Image) -> Image.Image:
    box = im.getbbox()
    return im.crop(box) if box else im


def tint_tray(tray: Image.Image, rgb: tuple[int, int, int] | None) -> Image.Image:
    if rgb is None:
        return tray
    tr, tg, tb = rgb
    bands = tray.split()
    bands = (
        bands[0].point(lambda v, c=tr: (v * c) // 255),
        bands[1].point(lambda v, c=tg: (v * c) // 255),
        bands[2].point(lambda v, c=tb: (v * c) // 255),
        bands[3],
    )
    return Image.merge("RGBA", bands)


def fit_food(im: Image.Image) -> Image.Image:
    im = crop(key_backdrop(im))
    box_w, box_h = FOOD_BOX
    scale = min(box_w / im.width, box_h / im.height)
    size = (max(1, round(im.width * scale)), max(1, round(im.height * scale)))
    return im.resize(size, Image.Resampling.LANCZOS)


def master_tray() -> Image.Image:
    tray = Image.open(BAG / "bag_tray_lower.png").convert("RGBA")
    tray = tray.resize((CANVAS, TRAY_H), Image.Resampling.LANCZOS)
    return tray


def compose(kind: str, tray: Image.Image) -> Image.Image:
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    tinted = tint_tray(tray, TINT.get(kind))
    canvas.paste(tinted, (0, CANVAS - TRAY_H), tinted)

    shadow = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow)
    draw.ellipse((78, 162, 178, 196), fill=(70, 52, 40, 80))
    shadow = shadow.filter(ImageFilter.GaussianBlur(2))
    canvas = Image.alpha_composite(canvas, shadow)

    food = fit_food(Image.open(FOOD / f"food_{kind}.png"))
    x = (CANVAS - food.width) // 2
    y = FOOD_BOTTOM - food.height
    canvas.alpha_composite(food, (x, y))
    return canvas


def main() -> None:
    tray = master_tray()
    kinds = ["milk", "veg", "fruit", "meat", "sauce", "leftover", "grape", "lemon", "kiwi", "pineapple", "watermelon", "coconut"]
    for kind in kinds:
        dest = BAG / f"bag_{kind}.png"
        image = compose(kind, tray)
        image.save(dest)
        write_meta(dest, uuid_of(dest), True)
        print(kind, image.size)


if __name__ == "__main__":
    main()
