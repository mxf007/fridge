from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "ui" / "scene" / "bx_title.png"

W = 530
H = 240

TITLE = "今晚冰箱"
SUB = "果蔬合成小游戏合集"

BROWN = (145, 72, 46, 255)
CREAM = (255, 247, 229, 255)
CREAM_STROKE = (245, 226, 194, 255)
GLOW = (255, 224, 170, 255)
ORANGE = (255, 174, 66, 255)
SHADOW = (112, 58, 38, 92)


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(r"C:\Windows\Fonts\msyhbd.ttc", size=size)


def draw_title(im: Image.Image) -> None:
    shadow = Image.new("RGBA", im.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.text((W // 2, 86), TITLE, font=font(96), fill=SHADOW, stroke_width=20, stroke_fill=SHADOW, anchor="mm")
    shadow = shadow.filter(ImageFilter.GaussianBlur(6))
    im.alpha_composite(shadow)

    glow = Image.new("RGBA", im.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.text((W // 2, 80), TITLE, font=font(96), fill=(0, 0, 0, 0), stroke_width=20, stroke_fill=GLOW, anchor="mm")
    glow = glow.filter(ImageFilter.GaussianBlur(2))
    im.alpha_composite(glow)

    d = ImageDraw.Draw(im)
    d.text((W // 2, 78), TITLE, font=font(96), fill=BROWN, stroke_width=14, stroke_fill=CREAM, anchor="mm")


def draw_subtitle(im: Image.Image) -> None:
    pill = (96, 132, W - 96, 208)
    shadow = Image.new("RGBA", im.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((pill[0], pill[1] + 6, pill[2], pill[3] + 6), radius=38, fill=(180, 120, 76, 72))
    shadow = shadow.filter(ImageFilter.GaussianBlur(6))
    im.alpha_composite(shadow)

    d = ImageDraw.Draw(im)
    d.rounded_rectangle(pill, radius=38, fill=(255, 246, 220, 255), outline=CREAM_STROKE, width=6)
    d.text((W // 2, 170), SUB, font=font(44), fill=BROWN, stroke_width=8, stroke_fill=CREAM, anchor="mm")

    d.rounded_rectangle((52, 164, 83, 175), radius=6, fill=ORANGE)
    d.rounded_rectangle((W - 83, 164, W - 52, 175), radius=6, fill=ORANGE)


def draw_spark(im: Image.Image) -> None:
    spark = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(spark)
    d.line((30, 34, 48, 59), fill=ORANGE, width=14)
    d.line((17, 66, 46, 75), fill=ORANGE, width=14)
    d.line((52, 12, 66, 40), fill=ORANGE, width=14)
    spark = spark.filter(ImageFilter.GaussianBlur(0.6))
    im.alpha_composite(spark)


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw_spark(im)
    draw_title(im)
    draw_subtitle(im)
    im.save(OUT, "PNG", optimize=True, compress_level=9)
    print(f"wrote {OUT.relative_to(ROOT)} {W}x{H}")


if __name__ == "__main__":
    main()
