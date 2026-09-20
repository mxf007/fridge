"""Chroma-key isolated sprites (magenta #FF00E5) into transparent UI cuts."""
from __future__ import annotations

from pathlib import Path
from PIL import Image

ROOT = Path(r"F:\fridge")
ISO = Path(r"C:\Users\Administrator\.cursor\projects\f-fridge\assets")
OUT = ROOT / "docs" / "ui_cuts"
ASSETS = ROOT / "assets" / "ui"


def is_screen_pink(r: int, g: int, b: int) -> bool:
    """Hot-pink / magenta backdrop, including drifted #F304A0 screens."""
    if r < 165 or g > 88 or b < 95:
        return False
    if g > int(r * 0.32):
        return False
    if b < int(r * 0.32):
        return False
    return True


def magenta_mask(im: Image.Image) -> Image.Image:
    """Key backdrop by flooding pink from the image border. Keeps clay purple."""
    from collections import deque

    src = im.convert("RGBA")
    sp = src.load()
    w, h = src.size
    marked = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()

    def push(x: int, y: int) -> None:
        i = y * w + x
        if marked[i]:
            return
        r, g, b, _a = sp[x, y]
        if not is_screen_pink(r, g, b):
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

    # 1px dilate so anti-aliased pink fringe goes with the backdrop
    dilated = bytearray(marked)
    for y in range(h):
        for x in range(w):
            if marked[y * w + x]:
                continue
            r, g, b, _a = sp[x, y]
            if not is_screen_pink(r, g, b) and not (r > 150 and g < 110 and b > 90 and g < r * 0.5):
                continue
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < w and 0 <= ny < h and marked[ny * w + nx]:
                    dilated[y * w + x] = 1
                    break

    out = Image.new("RGBA", (w, h))
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = sp[x, y]
            if dilated[y * w + x]:
                op[x, y] = (0, 0, 0, 0)
                continue
            edge = False
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < w and 0 <= ny < h and dilated[ny * w + nx]:
                    edge = True
                    break
            if edge and is_screen_pink(r, g, b):
                op[x, y] = (0, 0, 0, 0)
            elif edge:
                # despill: pull magenta toward clay luminance
                lum = int(0.3 * r + 0.59 * g + 0.11 * b)
                op[x, y] = (
                    (r + lum) // 2,
                    min(255, g + (lum - g) // 3),
                    (b + lum) // 2,
                    a,
                )
            else:
                op[x, y] = (r, g, b, a)
    return out


def fit(im: Image.Image, size, margin=0.08, mode="contain") -> Image.Image:
    tw, th = size
    src = im.convert("RGBA")
    bbox = src.getbbox()
    if bbox:
        src = src.crop(bbox)
    sw, sh = src.size
    inner_w = max(1, int(tw * (1 - 2 * margin)))
    inner_h = max(1, int(th * (1 - 2 * margin)))
    if mode == "fill":
        scale = max(inner_w / max(sw, 1), inner_h / max(sh, 1))
        nw, nh = max(1, int(sw * scale)), max(1, int(sh * scale))
        src = src.resize((nw, nh), Image.Resampling.LANCZOS)
        left = (nw - inner_w) // 2
        top = (nh - inner_h) // 2
        src = src.crop((left, top, left + inner_w, top + inner_h))
        canvas = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
        ox, oy = (tw - inner_w) // 2, (th - inner_h) // 2
        canvas.paste(src, (ox, oy), src)
        return canvas
    scale = min(inner_w / max(sw, 1), inner_h / max(sh, 1))
    nw, nh = max(1, int(sw * scale)), max(1, int(sh * scale))
    src = src.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    canvas.paste(src, ((tw - nw) // 2, (th - nh) // 2), src)
    return canvas


def process(src_name: str, dest_rel: str, size, margin=0.08, mode="contain"):
    src = ISO / src_name
    if not src.exists():
        print("missing", src)
        return
    keyed = magenta_mask(Image.open(src))
    out = fit(keyed, size, margin, mode)
    dest = OUT / dest_rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.save(dest, "PNG")
    asset = ASSETS / dest_rel
    asset.parent.mkdir(parents=True, exist_ok=True)
    out.save(asset, "PNG")
    print("ok", dest_rel, out.size)


def main():
    jobs = [
        ("iso_food_milk.png", "food/food_milk.png", (256, 256)),
        ("iso_food_veg.png", "food/food_veg.png", (256, 256)),
        ("iso_food_fruit.png", "food/food_fruit.png", (256, 256)),
        ("iso_food_meat.png", "food/food_meat.png", (256, 256)),
        ("iso_food_sauce.png", "food/food_sauce.png", (256, 256)),
        ("iso_food_leftover.png", "food/food_leftover.png", (256, 256)),
        ("iso_bag_milk.png", "bag/bag_milk.png", (256, 256), 0.06),
        ("iso_bag_veg.png", "bag/bag_veg.png", (256, 256), 0.06),
        ("iso_bag_fruit.png", "bag/bag_fruit.png", (256, 256), 0.06),
        ("iso_bag_meat.png", "bag/bag_meat.png", (256, 256), 0.06),
        ("iso_bag_sauce.png", "bag/bag_sauce.png", (256, 256), 0.06),
        ("iso_bag_leftover.png", "bag/bag_leftover.png", (256, 256), 0.06),
        ("iso_tray_empty.png", "board/tray_empty.png", (200, 280), 0.06),
        ("iso_tray_sealed.png", "board/tray_sealed.png", (200, 280), 0.06),
        ("iso_tray_lid.png", "board/tray_lid.png", (200, 80), 0.04),
        ("iso_buffer_slot.png", "board/buffer_slot.png", (160, 160), 0.04),
        ("iso_buffer_board.png", "board/buffer_board.png", (720, 220), 0.02),
        ("iso_icon_undo.png", "ui/icon_undo.png", (80, 80), 0.04),
        ("iso_icon_hint.png", "ui/icon_hint.png", (80, 80), 0.04),
        ("iso_btn_primary.png", "ui/btn_primary.png", (624, 96), 0.0, "fill"),
        ("iso_btn_secondary.png", "ui/btn_secondary.png", (624, 96), 0.0, "fill"),
    ]
    iso_dir = OUT / "_iso"
    iso_dir.mkdir(parents=True, exist_ok=True)
    for job in jobs:
        src, rel, size = job[0], job[1], job[2]
        m = job[3] if len(job) > 3 else 0.08
        mode = job[4] if len(job) > 4 else "contain"
        p = ISO / src
        if p.exists():
            Image.open(p).save(iso_dir / src)
        process(src, rel, size, m, mode)


if __name__ == "__main__":
    main()
