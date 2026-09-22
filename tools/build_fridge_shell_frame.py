"""Build a refined landscape fridge_shell.png — soft appliance bezel, no feet."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

from generate_2_5d_foundation import write_meta

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "ui" / "board" / "fridge_shell.png"
UUID = "d1062f55-9340-4b85-ae10-2091d7f20006"
W, H = 648, 360

# 暖厨房上的冷灰银：略带奶油，不要死灰
BASE = (198, 196, 192)
HI = (232, 228, 222)
MID = (186, 184, 180)
SH = (148, 146, 142)
INNER = (172, 176, 178)
LIP = (214, 216, 218)


def build() -> Image.Image:
    margin = 6
    outer = [margin, margin, W - 1 - margin, H - 1 - margin]
    outer_r = 48
    # 更瘦的边框，给木框让位
    border = 34

    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    # soft drop under shell (baked into asset bottom, low alpha)
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle(
        [outer[0] + 10, outer[3] - 18, outer[2] - 10, outer[3] + 4],
        radius=20,
        fill=(61, 50, 41, 55),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(6))
    img = Image.alpha_composite(img, shadow)

    body = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(body)
    # depth plate
    bd.rounded_rectangle(
        [outer[0] + 3, outer[1] + 4, outer[2] + 1, outer[3] + 2],
        radius=outer_r,
        fill=(*SH, 200),
    )
    bd.rounded_rectangle(outer, radius=outer_r, fill=(*BASE, 255))

    # top-left soft highlight
    hi_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(hi_layer).rounded_rectangle(outer, radius=outer_r, fill=(*HI, 255))
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle(outer, radius=outer_r, fill=255)
    grad = Image.new("L", (W, H), 0)
    gp = grad.load()
    for y in range(H):
        ty = 1.0 - min(1.0, max(0.0, (y - margin) / max(1.0, (H - 2 * margin) * 0.55)))
        tx_fade = 0.55 + 0.45 * (1.0 - min(1.0, max(0.0, (0 - margin) / max(1.0, W * 0.5))))
        v = int(110 * ty * tx_fade)
        for x in range(W):
            xf = 1.0 - min(1.0, max(0.0, (x - margin) / max(1.0, (W - 2 * margin) * 0.7)))
            gp[x, y] = int(v * (0.35 + 0.65 * xf))
    body = Image.composite(hi_layer, body, ImageChops.multiply(mask, grad))

    # subtle bottom shade on body
    sh_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh_layer).rounded_rectangle(outer, radius=outer_r, fill=(*SH, 255))
    g2 = Image.new("L", (W, H), 0)
    g2p = g2.load()
    for y in range(H):
        ty = min(1.0, max(0.0, (y - (H * 0.45)) / max(1.0, H * 0.55)))
        v = int(70 * ty)
        for x in range(W):
            g2p[x, y] = v
    body = Image.composite(sh_layer, body, ImageChops.multiply(mask, g2))
    img = Image.alpha_composite(img, body)

    d = ImageDraw.Draw(img)
    # recessed well wall
    well = [outer[0] + border, outer[1] + border - 1, outer[2] - border, outer[3] - border + 1]
    well_r = 28
    d.rounded_rectangle(well, radius=well_r, fill=(*INNER, 255))
    # bright inner lip
    lip = [well[0] + 4, well[1] + 4, well[2] - 4, well[3] - 4]
    d.rounded_rectangle(lip, radius=well_r - 3, fill=(*LIP, 255))
    # soft inner shadow band under top lip
    band = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(band).rounded_rectangle(lip, radius=well_r - 3, fill=(90, 100, 108, 55))
    band_mask = Image.new("L", (W, H), 0)
    bmp = band_mask.load()
    for y in range(H):
        if y < lip[1] or y > lip[1] + 28:
            continue
        v = int(255 * (1.0 - (y - lip[1]) / 28.0))
        for x in range(max(0, lip[0]), min(W, lip[2] + 1)):
            bmp[x, y] = v
    band.putalpha(ImageChops.multiply(band.split()[-1], band_mask))
    img = Image.alpha_composite(img, band)

    # punch clean hole
    hole = [lip[0] + 5, lip[1] + 5, lip[2] - 5, lip[3] - 5]
    hole_r = max(16, well_r - 6)
    hole_m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(hole_m).rounded_rectangle(hole, radius=hole_r, fill=255)
    hole_m = hole_m.filter(ImageFilter.GaussianBlur(0.65))
    px = img.load()
    hm = hole_m.load()
    for y in range(H):
        for x in range(W):
            hv = hm[x, y]
            if hv >= 200:
                px[x, y] = (0, 0, 0, 0)
            elif hv > 0:
                r, g, b, a = px[x, y]
                na = int(a * (1 - hv / 255))
                px[x, y] = (0, 0, 0, 0) if na < 10 else (r, g, b, na)

    # crisp outer alpha
    rgb = img.convert("RGB")
    a = img.split()[-1]
    # keep soft AA but kill speckles
    ap = a.load()
    for y in range(H):
        for x in range(W):
            v = ap[x, y]
            if v < 18:
                ap[x, y] = 0
    return Image.merge("RGBA", (*rgb.split(), a))


def main() -> None:
    img = build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG")
    write_meta(OUT, UUID, True)
    meta = json.loads(OUT.with_suffix(".png.meta").read_text(encoding="utf-8"))
    d = meta["subMetas"]["f9941"]["userData"]
    d.update(
        borderLeft=38,
        borderRight=38,
        borderTop=36,
        borderBottom=38,
        width=W,
        height=H,
        rawWidth=W,
        rawHeight=H,
        trimType="none",
    )
    OUT.with_suffix(".png.meta").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("ok", OUT, img.size)


if __name__ == "__main__":
    main()
