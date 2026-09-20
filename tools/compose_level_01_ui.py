"""Compose Level 1 play UI (720x1280) from real matted sprites + UI §6.2 coords."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(r"F:\fridge")
OUT = ROOT / "docs" / "ui_refs" / "03_play_l1_assets.png"

W, H = 720, 1280
CREAM = (246, 239, 230, 255)
WALNUT = (107, 74, 58, 255)
MILK = (255, 253, 248, 255)
FRIDGE_SHELL = (186, 205, 214, 255)
FRIDGE_GLOW = (232, 243, 246, 255)
INK = (61, 50, 41, 255)

Y_HUD = 96
Y_TRAY = 180
Y_BAG = 560


def font(size: int) -> ImageFont.FreeTypeFont:
    for p in (
        r"C:\Windows\Fonts\msyh.ttc",
        r"C:\Windows\Fonts\msyhbd.ttc",
        r"C:\Windows\Fonts\simhei.ttf",
        r"C:\Windows\Fonts\arial.ttf",
    ):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            continue
    return ImageFont.load_default()


def load_rgba(path: Path) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    return im


def crop_alpha(im: Image.Image, pad: int = 4) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    return im.crop((l, t, r, b))


def scale_to(im: Image.Image, w: int, h: int) -> Image.Image:
    return im.resize((w, h), Image.Resampling.LANCZOS)


def paste(base: Image.Image, sprite: Image.Image, cx: int, cy: int) -> None:
    x = int(cx - sprite.width / 2)
    y = int(cy - sprite.height / 2)
    base.alpha_composite(sprite, (x, y))


def rounded_rect(draw: ImageDraw.ImageDraw, box, radius, fill, outline=None, width=2):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def main() -> None:
    canvas = Image.new("RGBA", (W, H), CREAM)
    draw = ImageDraw.Draw(canvas)

    bag = crop_alpha(load_rgba(ROOT / "assets/ui/bag/bag_milk.png"))
    undo = crop_alpha(load_rgba(ROOT / "assets/ui/ui/icon_undo.png"))

    # HUD pill 第 1 关
    pill_w, pill_h = 200, 56
    pill_cx, pill_cy = W // 2, Y_HUD
    rounded_rect(
        draw,
        (pill_cx - pill_w // 2, pill_cy - pill_h // 2, pill_cx + pill_w // 2, pill_cy + pill_h // 2),
        28,
        MILK,
        (107, 74, 58, 64),
        2,
    )
    f28 = font(28)
    text = "第 1 关"
    tw = draw.textlength(text, font=f28)
    draw.text((pill_cx - tw / 2, pill_cy - 18), text, font=f28, fill=WALNUT)

    # Undo circle, no Hint
    ux, uy, ur = W - 72, Y_HUD, 40
    draw.ellipse((ux - ur, uy - ur, ux + ur, uy + ur), fill=MILK, outline=(107, 74, 58, 48), width=2)
    undo_i = scale_to(undo, 48, 48)
    paste(canvas, undo_i, ux, uy)

    # Fridge shell + one empty selected slot (cap4 scale 1.15)
    slot_w, slot_h = int(200 * 1.15), int(280 * 1.15)
    shell_w, shell_h = slot_w + 48, slot_h + 56
    tray_cx, tray_cy = W // 2, Y_TRAY + slot_h // 2
    sx0 = tray_cx - shell_w // 2
    sy0 = tray_cy - shell_h // 2
    rounded_rect(draw, (sx0, sy0, sx0 + shell_w, sy0 + shell_h), 36, FRIDGE_SHELL)
    glow = (
        tray_cx - slot_w // 2,
        tray_cy - slot_h // 2,
        tray_cx + slot_w // 2,
        tray_cy + slot_h // 2,
    )
    rounded_rect(draw, glow, 22, FRIDGE_GLOW)
    # 顶部一点高光，像 03_play 竖槽，不用浅盘 tray_empty
    draw.ellipse(
        (tray_cx - 36, glow[1] + 10, tray_cx + 36, glow[1] + 36),
        fill=(255, 255, 255, 70),
    )
    rounded_rect(
        draw,
        (glow[0] - 6, glow[1] - 6, glow[2] + 6, glow[3] + 6),
        24,
        None,
        WALNUT,
        4,
    )

    # Bag column: 4 milk tiles, top 100%, lower 60% + 0.92
    tile = 112
    overlap = 40
    n = 4
    stack_h = tile + overlap * (n - 1)
    bag_top = Y_BAG
    bag_cx = W // 2
    for i in range(n):
        is_top = i == n - 1
        size = tile if is_top else int(tile * 0.92)
        sprite = scale_to(bag, size, size)
        if not is_top:
            faded = sprite.copy()
            r, g, b, a = faded.split()
            r = r.point(lambda v: int(v * 0.72))
            g = g.point(lambda v: int(v * 0.72))
            b = b.point(lambda v: int(v * 0.72))
            faded = Image.merge("RGBA", (r, g, b, a))
            sprite = faded
        cy = bag_top + stack_h - tile // 2 - i * overlap
        paste(canvas, sprite, bag_cx, cy)

    # Caption: teach line, not a third button
    f24 = font(22)
    teach = "点最上面的，飞进已选中的格"
    tw = draw.textlength(teach, font=f24)
    draw.text((W // 2 - tw / 2, H - 72), teach, font=f24, fill=(107, 74, 58, 160))

    rgb = canvas.convert("RGB")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    rgb.save(OUT, "PNG")
    print("wrote", OUT, rgb.size)


if __name__ == "__main__":
    main()
