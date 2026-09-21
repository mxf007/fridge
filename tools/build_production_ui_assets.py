"""Matte generated production UI sources into Cocos-ready transparent sprites."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

from generate_2_5d_foundation import write_meta
from matte_iso_sprites import fit, magenta_mask


ROOT = Path(__file__).resolve().parents[1]
SOURCES = Path(r"C:\Users\Administrator\.cursor\projects\f-fridge\assets")
BOARD = ROOT / "assets" / "ui" / "board"
SCENE = ROOT / "assets" / "ui" / "scene"
FX = ROOT / "assets" / "ui" / "fx"
BAG = ROOT / "assets" / "ui" / "bag"


def build(source: str, target: Path, size: tuple[int, int], margin: float, mode: str, uuid: str) -> None:
    keyed = magenta_mask(Image.open(SOURCES / source))
    if mode == "stretch":
        alpha = keyed.getchannel("A")
        x_hits = [
            x for x in range(alpha.width)
            if sum(1 for y in range(alpha.height) if alpha.getpixel((x, y)) > 32) >= alpha.height * 0.02
        ]
        y_hits = [
            y for y in range(alpha.height)
            if sum(1 for x in range(alpha.width) if alpha.getpixel((x, y)) > 32) >= alpha.width * 0.02
        ]
        bbox = (
            min(x_hits), min(y_hits), max(x_hits) + 1, max(y_hits) + 1
        ) if x_hits and y_hits else keyed.getbbox()
        cropped = keyed.crop(bbox) if bbox else keyed
        inset_x = max(1, int(size[0] * margin))
        inset_y = max(1, int(size[1] * margin))
        resized = cropped.resize(
            (size[0] - inset_x * 2, size[1] - inset_y * 2),
            Image.Resampling.LANCZOS,
        )
        output = Image.new("RGBA", size, (0, 0, 0, 0))
        output.paste(resized, (inset_x, inset_y), resized)
    else:
        output = fit(keyed, size, margin, mode)
    output.save(target, "PNG")
    write_meta(target, uuid, True)


def set_slice_borders(path: Path, left: int, right: int, top: int, bottom: int) -> None:
    meta_path = path.with_suffix(path.suffix + ".meta")
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    data = meta["subMetas"]["f9941"]["userData"]
    data["borderLeft"] = left
    data["borderRight"] = right
    data["borderTop"] = top
    data["borderBottom"] = bottom
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def build_glow(
    source: str,
    target: Path,
    size: tuple[int, int],
    uuid: str,
    opacity_scale: float,
) -> None:
    src = Image.open(SOURCES / source).convert("RGB")
    alpha = Image.new("L", src.size)
    alpha_pixels = alpha.load()
    source_pixels = src.load()
    for y in range(src.height):
        for x in range(src.width):
            green = source_pixels[x, y][1]
            alpha_pixels[x, y] = max(0, min(255, int((green - 12) * 1.18 * opacity_scale)))
    threshold = alpha.point(lambda value: 255 if value > 4 else 0)
    bbox = threshold.getbbox()
    if bbox:
        alpha = alpha.crop(bbox)
    alpha = alpha.resize((size[0] - 8, size[1] - 8), Image.Resampling.LANCZOS)
    output = Image.new("RGBA", size, (255, 250, 238, 0))
    cream = Image.new("RGBA", alpha.size, (255, 250, 238, 255))
    output.paste(cream, (4, 4), alpha)
    output.save(target, "PNG")
    write_meta(target, uuid, True)


def main() -> None:
    BOARD.mkdir(parents=True, exist_ok=True)
    SCENE.mkdir(parents=True, exist_ok=True)
    FX.mkdir(parents=True, exist_ok=True)
    BAG.mkdir(parents=True, exist_ok=True)
    build(
        "bag-tray-source.png",
        BAG / "bag_tray.png",
        (256, 256),
        0.04,
        "contain",
        "d1122f55-9340-4b85-ae10-2091d7f20012",
    )

    shell = BOARD / "fridge_shell.png"
    build(
        "fridge-shell-wide-source.png",
        shell,
        (648, 360),
        0.01,
        "stretch",
        "d1062f55-9340-4b85-ae10-2091d7f20006",
    )
    set_slice_borders(shell, 92, 92, 72, 72)

    build(
        "fridge-cavity-source.png",
        BOARD / "tray_empty.png",
        (200, 280),
        0.015,
        "stretch",
        "6f229be7-9378-4d91-a617-1d2d45218e74",
    )
    build(
        "fridge-block-source.png",
        BOARD / "tray_block.png",
        (200, 120),
        0.015,
        "stretch",
        "d1082f55-9340-4b85-ae10-2091d7f20008",
    )
    build(
        "fridge-door-source.png",
        BOARD / "tray_door.png",
        (200, 280),
        0.015,
        "stretch",
        "d1092f55-9340-4b85-ae10-2091d7f20009",
    )
    build(
        "worktop-top-plain-source.png",
        SCENE / "worktop_top.png",
        (720, 380),
        0.005,
        "contain",
        "d1022f55-9340-4b85-ae10-2091d7f20002",
    )
    build(
        "worktop-front-source.png",
        SCENE / "worktop_front.png",
        (720, 150),
        0.005,
        "stretch",
        "d1032f55-9340-4b85-ae10-2091d7f20003",
    )
    build_glow(
        "fx-fly-trail-source.png",
        FX / "fx_fly_trail.png",
        (128, 256),
        "d1102f55-9340-4b85-ae10-2091d7f20010",
        0.72,
    )
    build_glow(
        "fx-land-soft-source.png",
        FX / "fx_land_soft.png",
        (128, 128),
        "d1112f55-9340-4b85-ae10-2091d7f20011",
        0.38,
    )


if __name__ == "__main__":
    main()
