"""Lossy-ish PNG shrink for opaque scene backgrounds (256-color + dither)."""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
COLORS = 256

PRESETS: dict[str, list[Path]] = {
    "bg_home": [
        ROOT / "assets" / "ui" / "scene" / "bg_home.png",
        ROOT / "docs" / "v1" / "scene" / "bg_home.png",
    ],
    "bg_play": [
        ROOT / "assets" / "ui" / "scene" / "bg_play.png",
        ROOT / "docs" / "v1" / "scene" / "bg_play.png",
    ],
}


def compress(path: Path) -> tuple[int, int]:
    before = path.stat().st_size
    im = Image.open(path).convert("RGB")
    q = im.quantize(
        colors=COLORS,
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.FLOYDSTEINBERG,
    )
    out = q.convert("RGBA")
    fd_path = path.with_suffix(".png.tmp")
    out.save(fd_path, "PNG", optimize=True, compress_level=9)
    after = fd_path.stat().st_size
    if after >= before:
        fd_path.unlink(missing_ok=True)
        return before, before
    fd_path.replace(path)
    return before, after


def main() -> None:
    names = sys.argv[1:] if len(sys.argv) > 1 else ["bg_home"]
    for name in names:
        paths = PRESETS.get(name)
        if not paths:
            print("unknown preset", name, "— choose:", ", ".join(PRESETS))
            continue
        for path in paths:
            if not path.is_file():
                print("skip", path)
                continue
            before, after = compress(path)
            pct = 100 * (1 - after / before) if before else 0
            print(f"{path.relative_to(ROOT)}: {before} -> {after} ({pct:.1f}% smaller)")


if __name__ == "__main__":
    main()
