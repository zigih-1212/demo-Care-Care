"""Generate simple brand PWA icons (no external deps beyond the stdlib).

A PWA needs real 192px and 512px PNG icons before a browser will offer the
"Install" button, and this repo has no image assets. Rather than commit a
binary blob I cannot regenerate, the icon is drawn procedurally here so it is
reproducible and reviewable.

The mark: a teal rounded square with a soft white ring — abstract, calm, and
recognisable at 32px. It is deliberately *not* a medical cross.
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

BRAND = (14, 124, 123)  # #0E7C7B
BRAND_DARK = (10, 92, 91)  # #0A5C5B
WHITE = (255, 255, 255)

OUT_DIR = Path(__file__).resolve().parent


def _png(path: Path, size: int) -> None:
    cx = cy = (size - 1) / 2
    ring_outer = size * 0.30
    ring_inner = size * 0.20
    corner = size * 0.22

    rows = bytearray()
    for y in range(size):
        rows.append(0)  # filter type 0 for this scanline
        for x in range(size):
            # Rounded-square mask (so the icon looks intentional as a maskable
            # icon rather than a hard rectangle).
            dx = max(corner - x, x - (size - 1 - corner), 0)
            dy = max(corner - y, y - (size - 1 - corner), 0)
            outside_corner = (dx * dx + dy * dy) > corner * corner
            if outside_corner:
                rows += bytes((255, 255, 255, 0))
                continue

            # Vertical gradient for a little depth.
            t = y / max(size - 1, 1)
            r = int(BRAND[0] + (BRAND_DARK[0] - BRAND[0]) * t)
            g = int(BRAND[1] + (BRAND_DARK[1] - BRAND[1]) * t)
            b = int(BRAND[2] + (BRAND_DARK[2] - BRAND[2]) * t)

            dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if ring_inner <= dist <= ring_outer:
                # Anti-alias the ring edges.
                edge = min(abs(dist - ring_inner), abs(dist - ring_outer))
                alpha = max(0.0, min(1.0, edge))
                r = int(r + (WHITE[0] - r) * alpha)
                g = int(g + (WHITE[1] - g) * alpha)
                b = int(b + (WHITE[2] - b) * alpha)

            rows += bytes((r, g, b, 255))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
    png += chunk(b"IDAT", zlib.compress(bytes(rows), 9))
    png += chunk(b"IEND", b"")
    path.write_bytes(png)


def main() -> None:
    _png(OUT_DIR / "icon-192.png", 192)
    _png(OUT_DIR / "icon-512.png", 512)
    print(f"Wrote {OUT_DIR / 'icon-192.png'}")
    print(f"Wrote {OUT_DIR / 'icon-512.png'}")


if __name__ == "__main__":
    main()
