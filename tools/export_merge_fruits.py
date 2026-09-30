"""Blue-screen matte for merge fruit sprites (fast chroma, no flood)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

SRC = Path(r"C:\Users\Administrator\.cursor\projects\f-fridge\assets")
OUT = Path(r"F:\fridge\assets\resources\merge\ui")

SPECS = [
    ("fruit_01_cherry.png", "fruit_01.png", 64),
    ("fruit_02_strawberry.png", "fruit_02.png", 80),
    ("fruit_03_grape.png", "fruit_03.png", 96),
    ("fruit_04_orange.png", "fruit_04.png", 112),
    ("fruit_05_lemon.png", "fruit_05.png", 136),
    ("fruit_06_kiwi.png", "fruit_06.png", 160),
    ("fruit_07_peach.png", "fruit_07.png", 192),
    ("fruit_08_pineapple.png", "fruit_08.png", 224),
    ("fruit_09_coconut.png", "fruit_09.png", 256),
    ("fruit_10_hami.png", "fruit_10.png", 288),
    ("fruit_11_watermelon.png", "fruit_11.png", 328),
]

UUIDS = {
    "fruit_01.png": "a1010001-4e01-4a01-8a01-000000000001",
    "fruit_02.png": "a1010002-4e02-4a02-8a02-000000000002",
    "fruit_03.png": "a1010003-4e03-4a03-8a03-000000000003",
    "fruit_04.png": "a1010004-4e04-4a04-8a04-000000000004",
    "fruit_05.png": "a1010005-4e05-4a05-8a05-000000000005",
    "fruit_06.png": "a1010006-4e06-4a06-8a06-000000000006",
    "fruit_07.png": "a1010007-4e07-4a07-8a07-000000000007",
    "fruit_08.png": "a1010008-4e08-4a08-8a08-000000000008",
    "fruit_09.png": "a1010009-4e09-4a09-8a09-000000000009",
    "fruit_10.png": "a1010010-4e10-4a10-8a10-000000000010",
    "fruit_11.png": "a1010011-4e11-4a11-8a11-000000000011",
}


def is_blue_screen(r: int, g: int, b: int) -> bool:
    # 生成图蓝幕常带青绿漂移 ~ (0, 110, 250)，r 接近 0
    if r < 45 and b > 180 and b > g + 35:
        return True
    if r < 55 and g < 155 and b > 200 and b > g + 25:
        return True
    return False


def chroma_key(im: Image.Image) -> Image.Image:
    src = im.convert("RGBA")
    # 先缩小加速，再放大 mask 回原尺寸
    work = src.resize((512, 512), Image.Resampling.BILINEAR)
    sp = work.load()
    w, h = work.size
    mask = Image.new("L", (w, h), 0)
    mp = mask.load()
    rgb = Image.new("RGBA", (w, h))
    rp = rgb.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = sp[x, y]
            if is_blue_screen(r, g, b):
                mp[x, y] = 0
                rp[x, y] = (0, 0, 0, 0)
            else:
                # 去蓝溢色
                if b > r + 25 and b > g + 15 and r < 80:
                    b = max(r, g)
                mp[x, y] = 255
                rp[x, y] = (r, g, b, 255)

    # mask 腐蚀 1px：去掉蓝边毛刺
    eroded = Image.new("L", (w, h), 0)
    ep = eroded.load()
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            if mp[x, y] == 0:
                continue
            if mp[x - 1, y] and mp[x + 1, y] and mp[x, y - 1] and mp[x, y + 1]:
                ep[x, y] = 255

    out_small = Image.new("RGBA", (w, h))
    op = out_small.load()
    for y in range(h):
        for x in range(w):
            if ep[x, y] == 0:
                op[x, y] = (0, 0, 0, 0)
            else:
                op[x, y] = rp[x, y]

    # 放大回原图尺寸（alpha 用最近邻更利落）
    color = out_small.resize(src.size, Image.Resampling.BILINEAR)
    alpha = out_small.split()[-1].resize(src.size, Image.Resampling.NEAREST)
    color.putalpha(alpha)
    return color


def clip_circle(im: Image.Image, ratio: float = 0.92) -> Image.Image:
    """把外形收成正圆，和圆形碰撞一致。梗、叶冠超出的部分裁掉。"""
    out = im.copy()
    px = out.load()
    w, h = out.size
    cx = (w - 1) / 2
    cy = (h - 1) / 2
    radius = min(w, h) * ratio / 2
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if dist >= radius:
                px[x, y] = (0, 0, 0, 0)
            elif dist > radius - 1.25:
                fade = (radius - dist) / 1.25
                px[x, y] = (r, g, b, int(a * fade))
    return out


def fit_square(im: Image.Image, size: int, fill_ratio: float = 0.90) -> Image.Image:
    bb = im.split()[-1].getbbox()
    if not bb:
        return Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cropped = im.crop(bb)
    cw, ch = cropped.size
    target = int(size * fill_ratio)
    scale = target / max(cw, ch)
    nw = max(1, int(cw * scale))
    nh = max(1, int(ch * scale))
    resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(resized, ((size - nw) // 2, (size - nh) // 2), resized)
    # 最终再清一次残留蓝点
    px = canvas.load()
    w, h = canvas.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and is_blue_screen(r, g, b):
                px[x, y] = (0, 0, 0, 0)
    return canvas


def write_meta(path: Path, base_uuid: str, size: int) -> None:
    name = path.stem
    tex = f"{base_uuid}@6c48a"
    sf = f"{base_uuid}@f9941"
    meta = f"""{{
  "ver": "1.0.27",
  "importer": "image",
  "imported": true,
  "uuid": "{base_uuid}",
  "files": [
    ".json",
    ".png"
  ],
  "subMetas": {{
    "6c48a": {{
      "importer": "texture",
      "uuid": "{tex}",
      "displayName": "{name}",
      "id": "6c48a",
      "name": "texture",
      "userData": {{
        "wrapModeS": "clamp-to-edge",
        "wrapModeT": "clamp-to-edge",
        "imageUuidOrDatabaseUri": "{base_uuid}",
        "isUuid": true,
        "visible": false,
        "minfilter": "linear",
        "magfilter": "linear",
        "mipfilter": "none",
        "anisotropy": 0
      }},
      "ver": "1.0.22",
      "imported": true,
      "files": [
        ".json"
      ],
      "subMetas": {{}}
    }},
    "f9941": {{
      "importer": "sprite-frame",
      "uuid": "{sf}",
      "displayName": "{name}",
      "id": "f9941",
      "name": "spriteFrame",
      "userData": {{
        "trimType": "auto",
        "trimThreshold": 1,
        "rotated": false,
        "offsetX": 0,
        "offsetY": 0,
        "trimX": 0,
        "trimY": 0,
        "width": {size},
        "height": {size},
        "rawWidth": {size},
        "rawHeight": {size},
        "borderTop": 0,
        "borderBottom": 0,
        "borderLeft": 0,
        "borderRight": 0,
        "packable": true,
        "pixelsToUnit": 100,
        "pivotX": 0.5,
        "pivotY": 0.5,
        "meshType": 0,
        "isUuid": true,
        "imageUuidOrDatabaseUri": "{tex}",
        "atlasUuid": ""
      }},
      "ver": "1.0.12",
      "imported": true,
      "files": [
        ".json"
      ],
      "subMetas": {{}}
    }}
  }},
  "userData": {{
    "type": "sprite-frame",
    "hasAlpha": true,
    "fixAlphaTransparencyArtifacts": true,
    "redirect": "{tex}"
  }}
}}
"""
    path.with_suffix(".png.meta").write_text(meta, encoding="utf-8")


def audit(path: Path) -> str:
    im = Image.open(path).convert("RGBA")
    px = im.load()
    w, h = im.size
    blue = opaque = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 10:
                continue
            opaque += 1
            if is_blue_screen(r, g, b):
                blue += 1
    return f"{path.name}: opaque%={100 * opaque / (w * h):.1f} leftover_blue={blue} corner={px[0, 0]}"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for src_name, out_name, size in SPECS:
        src = SRC / src_name
        im = Image.open(src)
        cut = chroma_key(im)
        bb = cut.split()[-1].getbbox()
        if not bb or (bb[2] - bb[0]) < 80:
            raise RuntimeError(f"matte failed for {src_name}, bbox={bb}")
        final = clip_circle(fit_square(cut, size, 0.96), 0.92)
        out = OUT / out_name
        final.save(out, "PNG")
        print(audit(out), flush=True)


if __name__ == "__main__":
    main()
