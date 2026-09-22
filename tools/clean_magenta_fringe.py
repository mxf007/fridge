"""Clean magenta/red key fringe on RGBA sprites without greying beige clay."""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def is_fringe(r: int, g: int, b: int, a: int) -> bool:
    if a < 6:
        return False
    # crushed dark magenta
    if g <= 45 and r >= 70 and b >= 20 and r >= g * 2 and (b >= g or r - g >= 40):
        return True
    # mid pink/red halo (beige body has g typically >= 160)
    if r >= 145 and g <= 150 and (r - g) >= 28 and g < 160:
        return True
    # faint AA
    if a < 100 and r >= 130 and g <= 160 and (r - g) >= 22 and b >= g - 20:
        return True
    # classic hot magenta
    if r >= 150 and g <= 110 and b >= 60 and g < r * 0.5:
        return True
    return False


def clean(path: Path) -> None:
    im = Image.open(path).convert("RGBA")
    px = im.load()
    w, h = im.size
    marked = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()

    for y in range(h):
        for x in range(w):
            if px[x, y][3] >= 12:
                continue
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < w and 0 <= ny < h and is_fringe(*px[nx, ny]):
                    i = ny * w + nx
                    if not marked[i]:
                        marked[i] = 1
                        q.append((nx, ny))

    while q:
        x, y = q.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if not (0 <= nx < w and 0 <= ny < h):
                continue
            i = ny * w + nx
            if marked[i]:
                continue
            if is_fringe(*px[nx, ny]):
                marked[i] = 1
                q.append((nx, ny))

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and g <= 40 and r >= 80 and b >= 25 and r > g * 2:
                marked[y * w + x] = 1

    cleared = 0
    for y in range(h):
        for x in range(w):
            if marked[y * w + x]:
                px[x, y] = (0, 0, 0, 0)
                cleared += 1

    # neutralize leftover purple-black contact shadow on the outline
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            near = any(
                not (0 <= nx < w and 0 <= ny < h) or px[nx, ny][3] < 16
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1))
            )
            if not near:
                continue
            if r <= 60 and g <= 40 and b <= 55 and b >= g - 5 and r >= g:
                if a < 140:
                    px[x, y] = (0, 0, 0, 0)
                else:
                    lum = max(8, (r + g + b) // 3)
                    px[x, y] = (lum, lum, lum, min(a, 180))

    bbox = im.getbbox()
    if bbox:
        pad = 4
        out = im.crop((
            max(0, bbox[0] - pad),
            max(0, bbox[1] - pad),
            min(w, bbox[2] + pad),
            min(h, bbox[3] + pad),
        ))
    else:
        out = im
    out.save(path, "PNG")
    print(f"ok {path.name} cleared={cleared} size={out.size} center={out.getpixel((out.width // 2, out.height // 2))}")


def main() -> None:
    for rel in (
        "assets/ui/scene/prop_cloth.png",
        "assets/ui/board/fridge_shell.png",
    ):
        path = ROOT / rel
        if path.exists():
            clean(path)


if __name__ == "__main__":
    main()
