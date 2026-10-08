"""Lossy-ish PNG shrink for opaque scene backgrounds (256-color + dither)."""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]

PRESETS: dict[str, list[Path]] = {
    "bg_home": [
        ROOT / "assets" / "ui" / "scene" / "bg_home.png",
        ROOT / "docs" / "v1" / "scene" / "bg_home.png",
    ],
    "bg_play": [
        ROOT / "assets" / "ui" / "scene" / "bg_play.png",
    ],
}

DEFAULT_OPTS = {"colors": 256, "size": None}
PRESET_OPTS: dict[str, dict] = {
    "bg_home": {"colors": 256, "size": None},
    "bg_play": {"colors": 28, "size": (720, 1280)},
}


def compress(path: Path, *, colors: int, size: tuple[int, int] | None) -> tuple[int, int]:
    before = path.stat().st_size
    im = Image.open(path).convert("RGB")
    if size is not None and im.size != size:
        im = im.resize(size, Image.Resampling.LANCZOS)
    q = im.quantize(
        colors=colors,
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.FLOYDSTEINBERG,
    )
    out = q.convert("RGBA")
    fd_path = path.with_suffix(".png.tmp")
    out.save(fd_path, "PNG", optimize=True, compress_level=9)
    after = fd_path.stat().st_size
    force = size is not None or colors < 256
    if after >= before and not force:
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
        opts = {**DEFAULT_OPTS, **PRESET_OPTS.get(name, {})}
        for path in paths:
            if not path.is_file():
                print("skip", path)
                continue
            before, after = compress(path, colors=opts["colors"], size=opts["size"])
            pct = 100 * (1 - after / before) if before else 0
            print(f"{path.relative_to(ROOT)}: {before} -> {after} ({pct:.1f}% smaller)")


if __name__ == "__main__":
    main()
