"""Build WeChat share / milestone card art for step C."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from generate_2_5d_foundation import save

ROOT = Path(__file__).resolve().parents[1]
FX = ROOT / "assets" / "ui" / "fx"

CREAM = (246, 239, 230, 255)
MILK = (255, 253, 248, 255)
WALNUT = (107, 74, 58, 255)
SAGE = (122, 158, 126, 255)
CORAL = (232, 109, 94, 255)
FRAME = (176, 130, 96, 255)
GLOW = (232, 244, 248, 255)


def font(size: int) -> ImageFont.ImageFont:
    for name in ("msyh.ttc", "msyhbd.ttc", "simhei.ttf", "arial.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def round_rect(draw: ImageDraw.ImageDraw, box, radius: int, fill) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def draw_mini_fridge(img: Image.Image, cx: int, cy: int, scale: float = 1.0) -> None:
    draw = ImageDraw.Draw(img)
    w, h = int(120 * scale), int(160 * scale)
    x0, y0 = cx - w // 2, cy - h // 2
    # shadow
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((x0 + 6, y0 + 10, x0 + w + 6, y0 + h + 10), radius=18, fill=(61, 50, 41, 60))
    img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(8)))
    draw = ImageDraw.Draw(img)
    round_rect(draw, (x0, y0, x0 + w, y0 + h), 18, FRAME)
    round_rect(draw, (x0 + 10, y0 + 12, x0 + w - 10, y0 + h - 14), 12, GLOW)
    # sealed doors
    door_h = (h - 36) // 3
    for i in range(3):
        ty = y0 + 18 + i * (door_h + 4)
        round_rect(draw, (x0 + 18, ty, x0 + w - 18, ty + door_h), 8, (210, 218, 222, 255))
        draw.line((x0 + 28, ty + door_h // 2, x0 + w - 28, ty + door_h // 2), fill=(176, 130, 96, 120), width=2)


def make_share_win() -> Image.Image:
    """Victory share card — cream board + fridge + step callout."""
    img = Image.new("RGBA", (720, 900), (0, 0, 0, 0))
    # soft wall wash
    wash = Image.new("RGBA", img.size, (241, 225, 203, 255))
    img = Image.alpha_composite(img, wash)

    card = Image.new("RGBA", img.size, (0, 0, 0, 0))
    cd = ImageDraw.Draw(card)
    round_rect(cd, (40, 48, 680, 852), 36, CREAM)
    round_rect(cd, (48, 56, 672, 844), 32, MILK)
    # sage ribbon
    round_rect(cd, (40, 48, 680, 140), 36, SAGE)
    round_rect(cd, (40, 100, 680, 140), 0, SAGE)
    img = Image.alpha_composite(img, card)
    draw = ImageDraw.Draw(img)
    draw.text((360, 94), "今晚冰箱收好了", font=font(42), fill=MILK, anchor="mm")

    draw_mini_fridge(img, 360, 360, 1.35)

    draw.text((360, 560), "我把今晚的冰箱收好了", font=font(34), fill=WALNUT, anchor="mm")
    # step chip
    round_rect(draw, (220, 600, 500, 700), 28, (255, 248, 240, 255))
    draw.rounded_rectangle((220, 600, 500, 700), radius=28, outline=CORAL, width=4)
    draw.text((360, 650), "分享步数", font=font(36), fill=CORAL, anchor="mm")

    draw.text((360, 780), "让好友也收这一层", font=font(28), fill=FRAME, anchor="mm")
    return img


def make_share_milestone() -> Image.Image:
    """Milestone card background — Sage edge + cream fill (no baked copy)."""
    img = Image.new("RGBA", (560, 420), (0, 0, 0, 0))
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((12, 18, 548, 410), radius=36, fill=(61, 50, 41, 70))
    img = Image.alpha_composite(img, shadow.filter(ImageFilter.GaussianBlur(10)))
    draw = ImageDraw.Draw(img)
    round_rect(draw, (0, 0, 560, 420), 36, SAGE)
    round_rect(draw, (10, 10, 550, 410), 30, CREAM)
    # top mosaic strip (缩略拼图气质)
    for i in range(3):
        x = 70 + i * 140
        round_rect(draw, (x, 36, x + 100, 110), 16, GLOW)
        draw.rounded_rectangle((x, 36, x + 100, 110), radius=16, outline=FRAME, width=3)
        # mini doors
        for r in range(2):
            ty = 48 + r * 28
            round_rect(draw, (x + 14, ty, x + 86, ty + 22), 6, (210, 218, 222, 255))
    return img


def main() -> None:
    FX.mkdir(parents=True, exist_ok=True)
    save(FX / "share_win.png", make_share_win(), "d1402f55-9340-4b85-ae10-2091d7f20040")
    save(FX / "share_milestone.png", make_share_milestone(), "d1412f55-9340-4b85-ae10-2091d7f20041")
    print("wrote share_win.png + share_milestone.png")


if __name__ == "__main__":
    main()
