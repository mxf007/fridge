"""把餐盘牛奶重采样到实际绘制尺寸。

第一关一列盘子宽 188，牛奶按 bagFoodSize 画出约 63×110（设计像素）。
源图 550×939，运行时用线性过滤、不开 mipmap 缩上去，蓝标上的字会被跳过。

手机上 720 画布通常再放大约 2 倍，所以默认出 126×220。
63×110 只在设计分辨率上是 1:1，上屏后还会被拉大。

用法：
  python tools/resize_plate_milk.py          # 126×220，写回 assets/ui/food/food_milk.png
  python tools/resize_plate_milk.py --scale 1
大图留在 tools/sprite_src/food_milk.png，重复运行仍从大图采样。
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSET = ROOT / "assets" / "ui" / "food" / "food_milk.png"
META = ASSET.with_suffix(".png.meta")
MASTER = ROOT / "tools" / "sprite_src" / "food_milk.png"
PLATE = (63, 110)
SPRITE_ID = "f9941"


def trim_alpha(im: Image.Image, threshold: int = 8) -> Image.Image:
    im = im.convert("RGBA")
    alpha = im.getchannel("A")
    mask = alpha.point(lambda a: 255 if a > threshold else 0)
    box = mask.getbbox()
    if box is None:
        raise SystemExit("food_milk.png has no opaque pixels")
    return im.crop(box)


def ensure_master() -> Image.Image:
    MASTER.parent.mkdir(parents=True, exist_ok=True)
    if MASTER.exists():
        return Image.open(MASTER).convert("RGBA")
    src = Image.open(ASSET).convert("RGBA")
    if src.size[0] < PLATE[0] * 4:
        raise SystemExit(f"{ASSET} is already small ({src.size}); master missing at {MASTER}")
    src.save(MASTER, "PNG")
    return src


def rewrite_meta(width: int, height: int) -> None:
    meta = json.loads(META.read_text(encoding="utf-8"))
    frame = meta["subMetas"][SPRITE_ID]["userData"]
    half_w = width / 2
    half_h = height / 2
    frame["trimX"] = 0
    frame["trimY"] = 0
    frame["offsetX"] = 0
    frame["offsetY"] = 0
    frame["width"] = width
    frame["height"] = height
    frame["rawWidth"] = width
    frame["rawHeight"] = height
    frame["vertices"] = {
        "rawPosition": [
            -half_w, -half_h, 0,
            half_w, -half_h, 0,
            -half_w, half_h, 0,
            half_w, half_h, 0,
        ],
        "indexes": [0, 1, 2, 2, 1, 3],
        "uv": [0, height, width, height, 0, 0, width, 0],
        "nuv": [0, 1, 1, 1, 0, 0, 1, 0],
        "minPos": [-half_w, -half_h, 0],
        "maxPos": [half_w, half_h, 0],
    }
    META.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--scale", type=int, choices=(1, 2), default=2)
    args = parser.parse_args()
    size = (PLATE[0] * args.scale, PLATE[1] * args.scale)
    trimmed = trim_alpha(ensure_master())
    out = trimmed.resize(size, Image.Resampling.LANCZOS)
    out.save(ASSET, "PNG")
    rewrite_meta(size[0], size[1])
    print(f"master {MASTER.name} {trimmed.size} -> {ASSET.name} {out.size}")


if __name__ == "__main__":
    main()
