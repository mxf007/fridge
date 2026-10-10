"""Remove outer matte around list_bg pill; keep bordered bar + art."""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "assets" / "ui" / "scene" / "list_bg.png"


def color_dist(a: tuple[int, int, int], b: tuple[int, int, int]) -> int:
    return abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2])


def is_outer_matte(r: int, g: int, b: int, refs: list[tuple[int, int, int]]) -> bool:
    if max(r, g, b) - min(r, g, b) > 28:
        return False
    for ref in refs:
        if color_dist((r, g, b), ref) <= 36:
            return True
    return False


def flood_outer_bg(im: Image.Image) -> None:
    w, h = im.size
    px = im.load()
    refs = [px[0, 0][:3], px[w - 1, 0][:3], px[0, h - 1][:3], px[w - 1, h - 1][:3]]
    seen = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            r, g, b, _ = px[x, y]
            if is_outer_matte(r, g, b, refs):
                seen[y][x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if seen[y][x]:
                continue
            r, g, b, _ = px[x, y]
            if is_outer_matte(r, g, b, refs):
                seen[y][x] = True
                q.append((x, y))
    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if nx < 0 or ny < 0 or nx >= w or ny >= h or seen[ny][nx]:
                continue
            r, g, b, _ = px[nx, ny]
            if is_outer_matte(r, g, b, refs):
                seen[ny][nx] = True
                q.append((nx, ny))


def main() -> None:
    before = TARGET.stat().st_size
    im = Image.open(TARGET).convert("RGBA")
    flood_outer_bg(im)
    tmp = TARGET.with_suffix(".png.tmp")
    im.save(tmp, "PNG", optimize=True, compress_level=9)
    after = tmp.stat().st_size
    tmp.replace(TARGET)
    a = im.getchannel("A").getextrema()
    print(f"{TARGET.relative_to(ROOT)}: {before} -> {after}, alpha {a}")


if __name__ == "__main__":
    main()
