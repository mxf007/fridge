"""Generate the reusable 2.5D scene foundation sprites.

These assets are intentionally neutral: gameplay color belongs to the visible
top food, while the wall, worktop, hidden layers, and shadows only establish
depth.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SCENE = ROOT / "assets" / "ui" / "scene"
BAG = ROOT / "assets" / "ui" / "bag"


def noisy_fill(size: tuple[int, int], base: tuple[int, int, int], amount: int, seed: int) -> Image.Image:
    random.seed(seed)
    image = Image.new("RGB", size, base)
    pixels = image.load()
    for y in range(size[1]):
        for x in range(size[0]):
            delta = random.randint(-amount, amount)
            pixels[x, y] = tuple(max(0, min(255, channel + delta)) for channel in base)
    return image.filter(ImageFilter.GaussianBlur(0.45))


def make_wall() -> Image.Image:
    image = noisy_fill((720, 1280), (241, 225, 203), 4, 2109)
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for y in range(1280):
        alpha = int(18 * (y / 1280))
        draw.line((0, y, 720, y), fill=(173, 132, 96, alpha))
    return Image.alpha_composite(image.convert("RGBA"), overlay)


def make_worktop_top() -> Image.Image:
    image = Image.new("RGBA", (720, 380), (0, 0, 0, 0))
    shadow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((20, 56, 700, 372), radius=46, fill=(61, 50, 41, 54))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    image = Image.alpha_composite(image, shadow)
    draw = ImageDraw.Draw(image)
    draw.polygon([(20, 62), (700, 62), (674, 342), (46, 342)], fill=(243, 234, 219, 255))
    draw.line([(42, 82), (678, 82)], fill=(255, 253, 248, 170), width=8)
    draw.line([(48, 338), (672, 338)], fill=(180, 151, 126, 70), width=4)
    return image


def make_worktop_front() -> Image.Image:
    image = Image.new("RGBA", (720, 150), (0, 0, 0, 0))
    shadow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((18, 20, 702, 142), radius=34, fill=(61, 50, 41, 55))
    shadow = shadow.filter(ImageFilter.GaussianBlur(12))
    image = Image.alpha_composite(image, shadow)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((20, 4, 700, 126), radius=30, fill=(224, 207, 188, 255))
    draw.rounded_rectangle((38, 14, 682, 35), radius=10, fill=(255, 255, 255, 70))
    draw.line((48, 118, 672, 118), fill=(143, 112, 91, 55), width=3)
    return image


def make_hidden_tray() -> Image.Image:
    image = Image.new("RGBA", (256, 96), (0, 0, 0, 0))
    shadow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((20, 22, 236, 88), radius=25, fill=(61, 50, 41, 75))
    shadow = shadow.filter(ImageFilter.GaussianBlur(7))
    image = Image.alpha_composite(image, shadow)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((16, 8, 240, 78), radius=24, fill=(231, 219, 202, 255))
    draw.rounded_rectangle((24, 14, 232, 62), radius=18, fill=(247, 240, 229, 255))
    draw.line((34, 20, 222, 20), fill=(255, 255, 255, 145), width=4)
    for x in (108, 122, 136):
        draw.rounded_rectangle((x, 68, x + 10, 73), radius=2, fill=(152, 126, 106, 105))
    return image


def make_fridge_shadow() -> Image.Image:
    image = Image.new("RGBA", (680, 400), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((30, 34, 650, 372), radius=64, fill=(61, 50, 41, 80))
    return image.filter(ImageFilter.GaussianBlur(24))


def write_meta(path: Path, uuid: str, has_alpha: bool) -> None:
    with Image.open(path) as image:
        width, height = image.size
    name = path.stem
    meta = {
        "ver": "1.0.27",
        "importer": "image",
        "imported": True,
        "uuid": uuid,
        "files": [".json", ".png"],
        "subMetas": {
            "6c48a": {
                "importer": "texture",
                "uuid": f"{uuid}@6c48a",
                "displayName": name,
                "id": "6c48a",
                "name": "texture",
                "userData": {
                    "wrapModeS": "clamp-to-edge",
                    "wrapModeT": "clamp-to-edge",
                    "imageUuidOrDatabaseUri": uuid,
                    "isUuid": True,
                    "visible": False,
                    "minfilter": "linear",
                    "magfilter": "linear",
                    "mipfilter": "none",
                    "anisotropy": 0,
                },
                "ver": "1.0.22",
                "imported": True,
                "files": [".json"],
                "subMetas": {},
            },
            "f9941": {
                "importer": "sprite-frame",
                "uuid": f"{uuid}@f9941",
                "displayName": name,
                "id": "f9941",
                "name": "spriteFrame",
                "userData": {
                    "trimType": "none",
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
                            -width / 2, -height / 2, 0,
                            width / 2, -height / 2, 0,
                            -width / 2, height / 2, 0,
                            width / 2, height / 2, 0,
                        ],
                        "indexes": [0, 1, 2, 2, 1, 3],
                        "uv": [0, height, width, height, 0, 0, width, 0],
                        "nuv": [0, 0, 1, 0, 0, 1, 1, 1],
                        "minPos": [-width / 2, -height / 2, 0],
                        "maxPos": [width / 2, height / 2, 0],
                    },
                    "isUuid": True,
                    "imageUuidOrDatabaseUri": f"{uuid}@6c48a",
                    "atlasUuid": "",
                },
                "ver": "1.0.12",
                "imported": True,
                "files": [".json"],
                "subMetas": {},
            },
        },
        "userData": {
            "type": "sprite-frame",
            "hasAlpha": has_alpha,
            "fixAlphaTransparencyArtifacts": False,
            "redirect": f"{uuid}@6c48a",
        },
    }
    path.with_suffix(path.suffix + ".meta").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def save(path: Path, image: Image.Image, uuid: str, has_alpha: bool = True) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path)
    write_meta(path, uuid, has_alpha)


def main() -> None:
    save(SCENE / "bg_play_wall.png", make_wall(), "d1012f55-9340-4b85-ae10-2091d7f20001")
    save(SCENE / "worktop_top.png", make_worktop_top(), "d1022f55-9340-4b85-ae10-2091d7f20002")
    save(SCENE / "worktop_front.png", make_worktop_front(), "d1032f55-9340-4b85-ae10-2091d7f20003")
    save(SCENE / "fridge_shadow.png", make_fridge_shadow(), "d1042f55-9340-4b85-ae10-2091d7f20004")
    save(BAG / "bag_hidden.png", make_hidden_tray(), "d1052f55-9340-4b85-ae10-2091d7f20005")


if __name__ == "__main__":
    main()
