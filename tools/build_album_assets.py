"""图鉴零件：木框、封门、食材色条、三枚章。

成品缩略由这些图拼出来，不按关出 30 张，也不画打开的食物架。
木框内腔（贴门的区域，相对整图像素）：
  album_frame 560×360，内腔 x=36..524, y=36..324。
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from generate_2_5d_foundation import save

ROOT = Path(__file__).resolve().parents[1]
ALBUM = ROOT / "assets" / "ui" / "album"
PREVIEW = ROOT / "docs" / "album_pieces_preview.png"

CREAM = (246, 239, 230, 255)
MILK = (255, 253, 248, 255)
WALNUT = (107, 74, 58, 255)
SAGE = (122, 158, 126, 255)
CORAL = (224, 122, 95, 255)
FRAME = (176, 130, 96, 255)
FRAME_DARK = (138, 98, 70, 255)
GLOW = (232, 243, 246, 255)
DOOR = (198, 202, 198, 255)
DOOR_EDGE = (168, 174, 172, 255)
HANDLE = (148, 152, 150, 255)
INK = (61, 50, 41, 255)

# 靠色不靠食物图标。牛奶用蓝标，其余用食材本色。
SWATCHES = [
    ("牛奶", (74, 132, 196)),
    ("青菜", (90, 150, 96)),
    ("水果", (224, 122, 95)),
    ("肉", (196, 112, 64)),
    ("酱", (150, 96, 62)),
    ("剩菜", (130, 96, 150)),
    ("葡萄", (150, 90, 170)),
    ("柠檬", (230, 190, 60)),
    ("猕猴桃", (130, 155, 60)),
    ("菠萝", (210, 165, 50)),
    ("西瓜", (70, 150, 100)),
    ("椰子", (166, 124, 90)),
]


def font(size: int) -> ImageFont.ImageFont:
    for name in ("msyh.ttc", "msyhbd.ttc", "simhei.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def round_rect(draw: ImageDraw.ImageDraw, box, radius: int, fill) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def cast_shadow(img: Image.Image, box, radius: int, blur: int = 10, alpha: int = 70, shift=(8, 10)) -> None:
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    x0, y0, x1, y1 = box
    dx, dy = shift
    sd.rounded_rectangle((x0 + dx, y0 + dy, x1 + dx, y1 + dy), radius=radius, fill=(INK[0], INK[1], INK[2], alpha))
    img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(blur)))


def make_frame() -> Image.Image:
    """胡桃木外框 + 冷光内腔。门外由 album_door 贴进内腔。"""
    img = Image.new("RGBA", (560, 360), (0, 0, 0, 0))
    body = (28, 16, 532, 328)
    cast_shadow(img, body, 40, blur=12, alpha=64, shift=(0, 12))
    draw = ImageDraw.Draw(img)
    round_rect(draw, body, 40, FRAME)
    round_rect(draw, (40, 28, 520, 316), 32, FRAME_DARK)
    round_rect(draw, (36, 36, 524, 324), 28, GLOW)
    # 上沿暖高光，和木框同一路
    draw.rounded_rectangle((52, 22, 508, 40), radius=8, fill=(214, 176, 142, 150))
    return img


def make_door(wide: bool) -> Image.Image:
    """封好的灰门，右缘一条竖把手。横屉用更扁的一张。"""
    w, h = (280, 150) if wide else (180, 240)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    pad = 8
    box = (pad, pad, w - pad, h - pad)
    cast_shadow(img, box, 18, blur=6, alpha=40, shift=(3, 4))
    draw = ImageDraw.Draw(img)
    round_rect(draw, box, 18, DOOR)
    # 上缘薄高光
    draw.rounded_rectangle((pad + 10, pad + 6, w - pad - 14, pad + 16), radius=6, fill=(255, 255, 255, 90))
    draw.rounded_rectangle(box, radius=18, outline=DOOR_EDGE, width=3)
    handle_h = max(28, int((h - pad * 2) * 0.46))
    hx1 = w - pad - 16
    hy0 = (h - handle_h) // 2
    round_rect(draw, (hx1, hy0, hx1 + 10, hy0 + handle_h), 5, HANDLE)
    return img


def make_swatch() -> Image.Image:
    """白条，运行时乘食材色。单独一张，避免把手被染色。"""
    img = Image.new("RGBA", (120, 28), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    round_rect(draw, (0, 0, 119, 27), 8, (255, 255, 255, 255))
    return img


def make_stamp(text: str, fill, ink) -> Image.Image:
    img = Image.new("RGBA", (220, 80), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    round_rect(draw, (2, 2, 218, 78), 18, fill)
    draw.rounded_rectangle((2, 2, 218, 78), radius=18, outline=ink, width=4)
    draw.rounded_rectangle((10, 10, 210, 70), radius=12, outline=(*ink[:3], 90), width=2)
    draw.text((110, 40), text, font=font(36), fill=ink, anchor="mm")
    return img


def make_badge_plus() -> Image.Image:
    """首通章。重玩不使用这张。"""
    w, h = 440, 112
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    round_rect(draw, (4, 8, w - 4, h - 8), 28, MILK)
    dash, gap = 14, 10
    y_top, y_bot = 12, h - 16
    x = 16
    while x < w - 20:
        draw.rectangle((x, y_top, min(x + dash, w - 16), y_top + 4), fill=FRAME)
        draw.rectangle((x, y_bot, min(x + dash, w - 16), y_bot + 4), fill=FRAME)
        x += dash + gap
    y = 24
    while y < h - 24:
        draw.rectangle((12, y, 16, min(y + dash, h - 20)), fill=FRAME)
        draw.rectangle((w - 16, y, w - 12, min(y + dash, h - 20)), fill=FRAME)
        y += dash + gap
    # 叶子
    leaf = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ld = ImageDraw.Draw(leaf)
    ld.ellipse((48, 28, 92, 88), fill=FRAME)
    img.alpha_composite(leaf)
    draw = ImageDraw.Draw(img)
    draw.line((70, 86, 70, 30), fill=WALNUT, width=4)
    draw.text((230, 56), "图鉴 +1", font=font(40), fill=WALNUT, anchor="mm")
    cx, cy, r = 360, 56, 22
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=CORAL)
    draw.line((cx - 10, cy, cx + 10, cy), fill=MILK, width=4)
    draw.line((cx, cy - 10, cx, cy + 10), fill=MILK, width=4)
    return img


def tint(swatch: Image.Image, color: tuple[int, int, int]) -> Image.Image:
    solid = Image.new("RGBA", swatch.size, (*color, 255))
    out = Image.new("RGBA", swatch.size, (0, 0, 0, 0))
    out.paste(solid, mask=swatch.getchannel("A"))
    return out


def paste_center(base: Image.Image, piece: Image.Image, box) -> None:
    x0, y0, x1, y1 = box
    pw, ph = x1 - x0, y1 - y0
    fitted = piece.resize((max(1, pw), max(1, ph)), Image.Resampling.LANCZOS)
    base.alpha_composite(fitted, (x0, y0))


def compose_fridge(kinds: list[tuple[int, int, int]], wide_row: bool = False) -> Image.Image:
    """按门数把封门贴进木框。超过 4 扇折两排。"""
    frame = make_frame()
    door = make_door(False)
    wide = make_door(True)
    swatch = make_swatch()
    inner = (48, 52, 512, 308)
    n = len(kinds)
    rows = 2 if n > 4 else 1
    per = (n + rows - 1) // rows
    ix0, iy0, ix1, iy1 = inner
    gap = 10
    row_h = (iy1 - iy0 - gap * (rows - 1)) // rows
    for r in range(rows):
        count = per if r < rows - 1 else n - per * (rows - 1)
        if count <= 0:
            continue
        cell_w = (ix1 - ix0 - gap * (count - 1)) // count
        y0 = iy0 + r * (row_h + gap)
        use_wide = wide_row and rows == 1
        sprite = wide if use_wide else door
        for c in range(count):
            x0 = ix0 + c * (cell_w + gap)
            box = (x0, y0, x0 + cell_w, y0 + row_h)
            paste_center(frame, sprite, box)
            # 色条贴在门心，避开右把手
            inset_x = int(cell_w * 0.16)
            inset_r = int(cell_w * 0.28)
            sw_h = max(8, int(row_h * 0.16))
            sy = y0 + (row_h - sw_h) // 2
            paste_center(frame, tint(swatch, kinds[r * per + c]), (x0 + inset_x, sy, x0 + cell_w - inset_r, sy + sw_h))
    return frame


def make_preview() -> Image.Image:
    img = Image.new("RGBA", (720, 1280), CREAM)
    draw = ImageDraw.Draw(img)
    draw.text((360, 64), "图鉴零件", font=font(40), fill=WALNUT, anchor="mm")
    draw.text((360, 108), "木框和封门共用，颜色只在门心色条上", font=font(22), fill=FRAME, anchor="mm")

    samples = [
        ("1 扇", [SWATCHES[0][1]]),
        ("2 扇", [SWATCHES[0][1], SWATCHES[1][1]]),
        ("4 扇", [s[1] for s in SWATCHES[:4]]),
        ("6 扇", [s[1] for s in (SWATCHES[6], SWATCHES[0], SWATCHES[1], SWATCHES[3], SWATCHES[9], SWATCHES[10])]),
    ]
    positions = [(40, 150), (380, 150), (40, 430), (380, 430)]
    for (title, colors), (x, y) in zip(samples, positions):
        thumb = compose_fridge(colors).resize((300, 193), Image.Resampling.LANCZOS)
        img.alpha_composite(thumb, (x, y))
        draw.text((x + 150, y + 214), title, font=font(22), fill=WALNUT, anchor="mm")

    draw.text((360, 700), "食材色条", font=font(26), fill=WALNUT, anchor="mm")
    swatch = make_swatch()
    for i, (name, color) in enumerate(SWATCHES):
        col, row = i % 6, i // 6
        x = 48 + col * 112
        y = 740 + row * 88
        bar = tint(swatch, color).resize((88, 22), Image.Resampling.LANCZOS)
        img.alpha_composite(bar, (x + 4, y))
        draw.text((x + 48, y + 48), name, font=font(18), fill=WALNUT, anchor="mm")

    stamps = [
        make_stamp("利落", (232, 241, 232, 255), SAGE).resize((180, 65), Image.Resampling.LANCZOS),
        make_stamp("完美", (255, 246, 232, 255), WALNUT).resize((180, 65), Image.Resampling.LANCZOS),
        make_badge_plus().resize((248, 63), Image.Resampling.LANCZOS),
    ]
    xs = [28, 228, 436]
    for piece, x in zip(stamps, xs):
        img.alpha_composite(piece, (x, 990))

    draw.text((360, 1120), "利落章  ·  完美章  ·  首通图鉴 +1", font=font(22), fill=FRAME, anchor="mm")
    draw.text((360, 1188), "未收关不画锁，也不做打开的冰箱", font=font(22), fill=FRAME, anchor="mm")
    return img


def publish_library() -> None:
    """把零件写进 library，并登记 uuid。脚本生成的 meta 标了 imported，编辑器不会再导一遍。"""
    import json
    import shutil
    import time

    library = ROOT / "library"
    info_path = library / ".assets-info1.0.0.json"
    data_path = library / ".assets-data.json"
    info = json.loads(info_path.read_text(encoding="utf-8"))
    data = json.loads(data_path.read_text(encoding="utf-8"))
    now = time.time() * 1000
    folder_uuid = "7a91c0de-4e2b-4f88-a6d3-1c5b9e0f4a27"
    folder_meta = ALBUM.with_suffix(".meta")
    if not folder_meta.exists():
        folder_meta.write_text(
            json.dumps(
                {
                    "ver": "1.2.0",
                    "importer": "directory",
                    "imported": True,
                    "uuid": folder_uuid,
                    "files": [],
                    "subMetas": {},
                    "userData": {},
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
    info["map"][str(ALBUM)] = {"time": now, "uuid": folder_uuid}
    info["map"][str(folder_meta)] = {"time": now, "uuid": folder_uuid}
    data[folder_uuid] = {"url": "db://assets/ui/album", "value": {}, "versionCode": 1}

    for png in sorted(ALBUM.glob("*.png")):
        meta = json.loads(png.with_suffix(".png.meta").read_text(encoding="utf-8"))
        uuid = meta["uuid"]
        with Image.open(png) as image:
            width, height = image.size
        dest_dir = library / uuid[:2]
        dest_dir.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(png, dest_dir / f"{uuid}.png")
        (dest_dir / f"{uuid}.json").write_text(
            json.dumps({"__type__": "cc.ImageAsset", "content": {"fmt": "0", "w": 0, "h": 0}}, indent=2) + "\n",
            encoding="utf-8",
        )
        (dest_dir / f"{uuid}@6c48a.json").write_text(
            json.dumps(
                {"__type__": "cc.Texture2D", "content": {"base": "2,2,2,2,0,0", "mipmaps": [uuid]}},
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        half_w = width / 2
        half_h = height / 2
        (dest_dir / f"{uuid}@f9941.json").write_text(
            json.dumps(
                {
                    "__type__": "cc.SpriteFrame",
                    "content": {
                        "name": png.stem,
                        "atlas": "",
                        "rect": {"x": 0, "y": 0, "width": width, "height": height},
                        "offset": {"x": 0, "y": 0},
                        "originalSize": {"width": width, "height": height},
                        "rotated": False,
                        "capInsets": [0, 0, 0, 0],
                        "vertices": {
                            "rawPosition": [-half_w, -half_h, 0, half_w, -half_h, 0, -half_w, half_h, 0, half_w, half_h, 0],
                            "indexes": [0, 1, 2, 2, 1, 3],
                            "uv": [0, height, width, height, 0, 0, width, 0],
                            "nuv": [0, 0, 1, 0, 0, 1, 1, 1],
                            "minPos": {"x": -half_w, "y": -half_h, "z": 0},
                            "maxPos": {"x": half_w, "y": half_h, "z": 0},
                        },
                        "texture": f"{uuid}@6c48a",
                        "packable": True,
                        "pixelsToUnit": 100,
                        "pivot": {"x": 0.5, "y": 0.5},
                        "meshType": 0,
                    },
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        info["map"][str(png)] = {"time": now, "uuid": uuid}
        info["map"][str(png) + ".meta"] = {"time": now, "uuid": uuid}
        data[uuid] = {"url": f"db://assets/ui/album/{png.name}", "value": {"depends": []}, "versionCode": 1}
        print("library", uuid, png.name, width, height)

    info_path.write_text(json.dumps(info, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    data_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    ALBUM.mkdir(parents=True, exist_ok=True)
    save(ALBUM / "album_frame.png", make_frame(), "e3012f55-9340-4b85-ae10-2091d7f20061")
    save(ALBUM / "album_door.png", make_door(False), "e3022f55-9340-4b85-ae10-2091d7f20062")
    save(ALBUM / "album_door_wide.png", make_door(True), "e3032f55-9340-4b85-ae10-2091d7f20063")
    save(ALBUM / "album_swatch.png", make_swatch(), "e3042f55-9340-4b85-ae10-2091d7f20064")
    save(ALBUM / "album_stamp_sage.png", make_stamp("利落", (232, 241, 232, 255), SAGE), "e3052f55-9340-4b85-ae10-2091d7f20065")
    save(ALBUM / "album_stamp_walnut.png", make_stamp("完美", (255, 246, 232, 255), WALNUT), "e3062f55-9340-4b85-ae10-2091d7f20066")
    save(ALBUM / "album_badge_plus.png", make_badge_plus(), "e3072f55-9340-4b85-ae10-2091d7f20067")
    make_preview().save(PREVIEW)
    publish_library()
    print("wrote", ALBUM)
    print("preview", PREVIEW)


if __name__ == "__main__":
    main()
