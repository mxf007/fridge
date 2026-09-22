"""Matte generated food_* sources into assets/ui/food (keep existing UUID/meta)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

from matte_iso_sprites import fit, magenta_mask

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = Path(r"C:\Users\Administrator\.cursor\projects\f-fridge\assets")
OUT_DIR = ROOT / "assets" / "ui" / "food"

FOODS = [
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


def clean_fringe(im: Image.Image) -> Image.Image:
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            near = any(
                not (0 <= nx < w and 0 <= ny < h) or px[nx, ny][3] < 16
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1))
            )
            if not near:
                continue
            if r >= 140 and g <= 120 and b >= 70 and g < r * 0.55:
                px[x, y] = (0, 0, 0, 0)
            elif a < 40 and r > 150 and g < 130:
                px[x, y] = (0, 0, 0, 0)
    return im


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name in FOODS:
        src = SRC_DIR / f"food_{name}_src.png"
        dest = OUT_DIR / f"food_{name}.png"
        if not src.exists():
            print("missing", src)
            continue
        keyed = magenta_mask(Image.open(src))
        keyed = clean_fringe(keyed)
        out = fit(keyed, (256, 256), margin=0.08, mode="contain")
        out = clean_fringe(out)
        out.save(dest, "PNG")
        hot = sum(
            1
            for p in out.getdata()
            if p[3] > 10 and p[0] >= 150 and p[1] <= 110 and p[2] >= 70 and p[1] < p[0] * 0.48
        )
        print("ok", dest.name, out.size, "hot", hot)


if __name__ == "__main__":
    main()
