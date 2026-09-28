"""冰箱槽位用的扁牛奶盒。盘子仍用 food_milk.png。

竖格座位大约 131×86，按 82% 塞进去大约 88×71。
画布按宽高比 1.25 出图，裁掉空边后大约 254×203。字按这个尺寸写粗。
"""
from __future__ import annotations

import json
import uuid
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSET = ROOT / "assets" / "ui" / "food" / "food_milk_slot.png"
META = ASSET.with_suffix(".png.meta")
W, H = 280, 224
SCALE = 3
FONT = Path(r"C:\Windows\Fonts\msyhbd.ttc")

CREAM = (252, 247, 239, 255)
CREAM_SHADE = (236, 226, 214, 255)
SIDE = (206, 196, 184, 255)
SIDE_EDGE = (186, 174, 160, 255)
BLUE = (49, 109, 176, 255)
BLUE_DARK = (36, 86, 148, 255)
CAP = (46, 102, 170, 255)
WHITE = (255, 255, 255, 255)
OUTLINE = (92, 74, 58, 38)


def poly(draw: ImageDraw.ImageDraw, pts, fill) -> None:
    draw.polygon(pts, fill=fill)


def main() -> None:
    s = SCALE
    canvas = Image.new("RGBA", (W * s, H * s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    def p(x: float, y: float) -> tuple[float, float]:
        return (x * s, y * s)

    # 右侧窄侧面，正面尽量宽，整盒偏扁。
    front = [p(16, 62), p(214, 62), p(214, 208), p(16, 208)]
    side = [p(214, 74), p(262, 86), p(262, 196), p(214, 208)]
    gable = [p(16, 62), p(58, 28), p(176, 28), p(214, 68), p(214, 62)]
    cap = [p(78, 14), p(168, 14), p(168, 36), p(78, 36)]

    poly(draw, side, SIDE)
    draw.line([p(214, 74), p(262, 86), p(262, 196), p(214, 208)], fill=SIDE_EDGE, width=2 * s)
    poly(draw, gable, CREAM)
    draw.polygon([p(176, 28), p(214, 68), p(214, 62), p(196, 34)], fill=CREAM_SHADE)
    poly(draw, front, CREAM)
    draw.polygon([p(16, 168), p(214, 168), p(214, 208), p(16, 208)], fill=(244, 236, 226, 255))
    draw.rounded_rectangle([p(78, 12), p(168, 38)], radius=6 * s, fill=CAP)
    draw.rounded_rectangle([p(86, 12), p(160, 20)], radius=3 * s, fill=(78, 140, 204, 255))

    draw.rounded_rectangle([p(28, 96), p(202, 162)], radius=4 * s, fill=BLUE)
    draw.rectangle([p(28, 96), p(202, 108)], fill=(72, 136, 198, 255))
    draw.rectangle([p(28, 150), p(202, 162)], fill=BLUE_DARK)

    font = ImageFont.truetype(str(FONT), 52 * s)
    text = "牛奶"
    box = draw.textbbox((0, 0), text, font=font)
    tw, th = box[2] - box[0], box[3] - box[1]
    tx = (28 + 202) / 2 * s - tw / 2 - box[0]
    ty = (96 + 162) / 2 * s - th / 2 - box[1] - 1 * s
    draw.text((tx, ty), text, font=font, fill=WHITE)

    # 盒沿一条很淡的边，小尺寸上轮廓还在。
    outline = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(outline)
    od.line([p(16, 62), p(58, 28), p(176, 28), p(214, 68), p(214, 208), p(16, 208), p(16, 62)], fill=OUTLINE, width=3 * s)
    od.line([p(214, 68), p(214, 208)], fill=OUTLINE, width=2 * s)
    canvas = Image.alpha_composite(canvas, outline)

    rough = canvas.resize((W, H), Image.Resampling.LANCZOS)
    alpha = rough.getchannel("A")
    mask = alpha.point(lambda a: 255 if a > 8 else 0)
    box = mask.getbbox()
    if box is None:
        raise SystemExit("slot milk has no opaque pixels")
    pad = 2
    left = max(0, box[0] - pad)
    top = max(0, box[1] - pad)
    right = min(W, box[2] + pad)
    bottom = min(H, box[3] + pad)
    out = rough.crop((left, top, right, bottom))
    ASSET.parent.mkdir(parents=True, exist_ok=True)
    out.save(ASSET, "PNG")
    write_meta(out.size[0], out.size[1])
    print(f"wrote {ASSET} {out.size[0]}x{out.size[1]}")


def write_meta(width: int, height: int) -> None:
    if META.exists():
        meta = json.loads(META.read_text(encoding="utf-8"))
        uid = meta["uuid"]
    else:
        uid = str(uuid.uuid4())
    half_w = width / 2
    half_h = height / 2
    meta = {
        "ver": "1.0.27",
        "importer": "image",
        "imported": False,
        "uuid": uid,
        "files": [".json", ".png"],
        "subMetas": {
            "6c48a": {
                "importer": "texture",
                "uuid": f"{uid}@6c48a",
                "displayName": "food_milk_slot",
                "id": "6c48a",
                "name": "texture",
                "userData": {
                    "wrapModeS": "clamp-to-edge",
                    "wrapModeT": "clamp-to-edge",
                    "imageUuidOrDatabaseUri": uid,
                    "isUuid": True,
                    "visible": False,
                    "minfilter": "linear",
                    "magfilter": "linear",
                    "mipfilter": "none",
                    "anisotropy": 0,
                },
                "ver": "1.0.22",
                "imported": False,
                "files": [".json"],
                "subMetas": {},
            },
            "f9941": {
                "importer": "sprite-frame",
                "uuid": f"{uid}@f9941",
                "displayName": "food_milk_slot",
                "id": "f9941",
                "name": "spriteFrame",
                "userData": {
                    "trimType": "auto",
                    "trimThreshold": 1,
                    "rotated": False,
                    "offsetX": 0,
                    "offsetY": 0,
                    "trimX": 0,
                    "trimY": 0,
                    "width": width,
                    "height": height,
                    "rawWidth": width,
                    "rawHeight": height,
                    "borderTop": 0,
                    "borderBottom": 0,
                    "borderLeft": 0,
                    "borderRight": 0,
                    "packable": True,
                    "pixelsToUnit": 100,
                    "pivotX": 0.5,
                    "pivotY": 0.5,
                    "meshType": 0,
                    "vertices": {
                        "rawPosition": [
                            -half_w, -half_h, 0,
                            half_w, -half_h, 0,
                            -half_w, half_h, 0,
                            half_w, half_h, 0,
                        ],
                        "indexes": [0, 1, 2, 2, 1, 3],
                        "uv": [0, height, width, height, 0, 0, width, 0],
                        "nuv": [0, 0, 1, 0, 0, 1, 1, 1],
                        "minPos": [-half_w, -half_h, 0],
                        "maxPos": [half_w, half_h, 0],
                    },
                    "isUuid": True,
                    "imageUuidOrDatabaseUri": f"{uid}@6c48a",
                    "atlasUuid": "",
                },
                "ver": "1.0.12",
                "imported": False,
                "files": [".json"],
                "subMetas": {},
            },
        },
        "userData": {
            "type": "sprite-frame",
            "hasAlpha": True,
            "fixAlphaTransparencyArtifacts": False,
            "redirect": f"{uid}@6c48a",
        },
    }
    META.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"uuid {uid}@f9941")


if __name__ == "__main__":
    main()
