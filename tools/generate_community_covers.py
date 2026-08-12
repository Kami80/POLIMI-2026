from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "community-photos"
WIDTH, HEIGHT = 1600, 900

IVORY = (242, 236, 226)
CREAM = (250, 247, 241)
NAVY = (10, 31, 53)
TERRACOTTA = (184, 74, 50)
SAGE = (52, 91, 74)
OCHRE = (154, 109, 47)
DUSTY_BLUE = (126, 155, 182)


COVERS = [
    ("persian-polimi-community-floating.webp", TERRACOTTA, SAGE, "community"),
    ("esfahan-to-italy-floating.webp", DUSTY_BLUE, TERRACOTTA, "esfahan"),
    ("biomedical-engineering-floating.webp", SAGE, DUSTY_BLUE, "biomedical"),
    ("electrical-engineering-floating.webp", OCHRE, DUSTY_BLUE, "electrical"),
    ("chemical-engineering-floating.webp", TERRACOTTA, OCHRE, "chemical"),
    ("hpc-computer-science-floating.webp", SAGE, DUSTY_BLUE, "computing"),
]


def mix(first: tuple[int, int, int], second: tuple[int, int, int], amount: float) -> tuple[int, int, int]:
    return tuple(round(a + (b - a) * amount) for a, b in zip(first, second))


def rgba(color: tuple[int, int, int], alpha: int) -> tuple[int, int, int, int]:
    return (*color, alpha)


def rounded_line(draw: ImageDraw.ImageDraw, points, fill, width=10):
    draw.line(points, fill=fill, width=width, joint="curve")
    radius = width // 2
    for point in (points[0], points[-1]):
        draw.ellipse((point[0] - radius, point[1] - radius, point[0] + radius, point[1] + radius), fill=fill)


def base_background(accent: tuple[int, int, int], secondary: tuple[int, int, int]) -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), IVORY)
    pixels = image.load()
    upper = mix(CREAM, accent, 0.12)
    lower = mix(IVORY, secondary, 0.10)
    for y in range(HEIGHT):
        vertical = y / (HEIGHT - 1)
        for x in range(WIDTH):
            horizontal = x / (WIDTH - 1)
            bias = min(1.0, max(0.0, vertical * 0.78 + horizontal * 0.10))
            pixels[x, y] = mix(upper, lower, bias)

    glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((-170, -230, 690, 630), fill=rgba(accent, 48))
    glow_draw.ellipse((1040, -170, 1810, 590), fill=rgba(secondary, 42))
    glow_draw.ellipse((410, 500, 1190, 1120), fill=rgba(CREAM, 105))
    glow = glow.filter(ImageFilter.GaussianBlur(95))
    image = Image.alpha_composite(image.convert("RGBA"), glow)

    return image


def floating_tile(layer: Image.Image, box: tuple[int, int, int, int], accent: tuple[int, int, int], radius: int):
    shadow = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shifted = (box[0], box[1] + 16, box[2], box[3] + 16)
    shadow_draw.rounded_rectangle(shifted, radius=radius, fill=rgba(NAVY, 30))
    shadow = shadow.filter(ImageFilter.GaussianBlur(22))
    layer.alpha_composite(shadow)

    draw = ImageDraw.Draw(layer)
    draw.rounded_rectangle(
        box,
        radius=radius,
        fill=rgba(CREAM, 100),
        outline=rgba(accent, 72),
        width=3,
    )
    draw.line((box[0] + radius, box[1] + 3, box[2] - radius, box[1] + 3), fill=rgba(CREAM, 145), width=3)


def draw_people_network(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float, color):
    centers = [(x, y - 55 * scale), (x - 66 * scale, y + 45 * scale), (x + 66 * scale, y + 45 * scale)]
    rounded_line(draw, [centers[0], centers[1], centers[2], centers[0]], color, round(8 * scale))
    for cx, cy in centers:
        r = 21 * scale
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=rgba(CREAM, 180), outline=color, width=round(7 * scale))


def draw_arch(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float, color):
    w, h = 170 * scale, 220 * scale
    box = (x - w / 2, y - h / 2, x + w / 2, y + h / 2)
    draw.rounded_rectangle(box, radius=round(84 * scale), outline=color, width=round(9 * scale))
    inner = (x - w * .27, y - h * .18, x + w * .27, y + h / 2)
    draw.rounded_rectangle(inner, radius=round(44 * scale), outline=rgba(NAVY, 48), width=round(6 * scale))
    draw.line((x - w / 2, y + h / 2, x + w / 2, y + h / 2), fill=color, width=round(9 * scale))


def heart_points(cx: float, cy: float, scale: float):
    points = []
    for step in range(121):
        t = math.tau * step / 120
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        points.append((cx + x * scale, cy - y * scale))
    return points


def draw_biomedical(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float, color):
    rounded_line(draw, heart_points(x, y, 6.5 * scale), color, round(8 * scale))
    pulse = [(x - 120 * scale, y), (x - 55 * scale, y), (x - 33 * scale, y - 34 * scale),
             (x - 6 * scale, y + 42 * scale), (x + 23 * scale, y - 15 * scale), (x + 47 * scale, y),
             (x + 120 * scale, y)]
    rounded_line(draw, pulse, rgba(NAVY, 60), round(7 * scale))


def draw_circuit(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float, color):
    paths = [
        [(x - 125 * scale, y - 70 * scale), (x - 45 * scale, y - 70 * scale), (x - 45 * scale, y - 8 * scale), (x + 36 * scale, y - 8 * scale)],
        [(x - 125 * scale, y + 70 * scale), (x - 15 * scale, y + 70 * scale), (x - 15 * scale, y + 20 * scale), (x + 92 * scale, y + 20 * scale)],
        [(x + 120 * scale, y - 82 * scale), (x + 72 * scale, y - 82 * scale), (x + 72 * scale, y + 86 * scale)],
    ]
    for path in paths:
        rounded_line(draw, path, color, round(8 * scale))
        for px, py in (path[0], path[-1]):
            r = 12 * scale
            draw.ellipse((px - r, py - r, px + r, py + r), fill=rgba(CREAM, 190), outline=color, width=round(6 * scale))
    draw.rounded_rectangle((x - 47 * scale, y - 47 * scale, x + 47 * scale, y + 47 * scale), radius=round(15 * scale), outline=rgba(NAVY, 60), width=round(8 * scale))


def draw_chemical(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float, color):
    flask = [(x - 32 * scale, y - 110 * scale), (x + 32 * scale, y - 110 * scale),
             (x + 32 * scale, y - 25 * scale), (x + 93 * scale, y + 87 * scale),
             (x + 78 * scale, y + 112 * scale), (x - 78 * scale, y + 112 * scale),
             (x - 93 * scale, y + 87 * scale), (x - 32 * scale, y - 25 * scale), (x - 32 * scale, y - 110 * scale)]
    rounded_line(draw, flask, color, round(9 * scale))
    draw.line((x - 70 * scale, y + 55 * scale, x + 70 * scale, y + 55 * scale), fill=rgba(NAVY, 52), width=round(7 * scale))
    for dx, dy, radius in [(-38, 75, 9), (15, 84, 12), (47, 66, 7)]:
        r = radius * scale
        draw.ellipse((x + dx * scale - r, y + dy * scale - r, x + dx * scale + r, y + dy * scale + r), fill=rgba(color[:3], 78))


def draw_chip(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float, color):
    outer = 92 * scale
    inner = 48 * scale
    draw.rounded_rectangle((x - outer, y - outer, x + outer, y + outer), radius=round(20 * scale), outline=color, width=round(9 * scale))
    draw.rounded_rectangle((x - inner, y - inner, x + inner, y + inner), radius=round(13 * scale), outline=rgba(NAVY, 58), width=round(7 * scale))
    for offset in (-58, -20, 20, 58):
        for x1, y1, x2, y2 in [
            (x + offset * scale, y - outer, x + offset * scale, y - 132 * scale),
            (x + offset * scale, y + outer, x + offset * scale, y + 132 * scale),
            (x - outer, y + offset * scale, x - 132 * scale, y + offset * scale),
            (x + outer, y + offset * scale, x + 132 * scale, y + offset * scale),
        ]:
            draw.line((x1, y1, x2, y2), fill=color, width=round(7 * scale))


def draw_person(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float, color):
    radius = 24 * scale
    draw.ellipse((x - radius, y - 68 * scale - radius, x + radius, y - 68 * scale + radius), outline=color, width=round(7 * scale))
    draw.arc((x - 61 * scale, y - 36 * scale, x + 61 * scale, y + 74 * scale), 188, 352, fill=color, width=round(8 * scale))


def draw_route(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float, color):
    points = []
    for step in range(35):
        t = step / 34
        px = x - 92 * scale + 184 * scale * t
        py = y + math.sin(t * math.pi * 2) * 28 * scale
        points.append((px, py))
    rounded_line(draw, points, color, round(7 * scale))
    for px, py in (points[0], points[-1]):
        radius = 16 * scale
        draw.ellipse((px - radius, py - radius, px + radius, py + radius), fill=rgba(CREAM, 178), outline=color, width=round(6 * scale))


def draw_dna(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float, color):
    left, right = [], []
    for step in range(33):
        t = step / 32
        py = y - 90 * scale + 180 * scale * t
        offset = math.sin(t * math.pi * 2) * 28 * scale
        left.append((x - offset, py))
        right.append((x + offset, py))
    rounded_line(draw, left, color, round(6 * scale))
    rounded_line(draw, right, color, round(6 * scale))
    for step in range(0, 33, 5):
        draw.line((left[step], right[step]), fill=rgba(NAVY, 44), width=round(5 * scale))


def draw_wave(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float, color):
    points = []
    for step in range(45):
        t = step / 44
        points.append((x - 95 * scale + 190 * scale * t, y + math.sin(t * math.pi * 4) * 34 * scale))
    rounded_line(draw, points, color, round(7 * scale))


def draw_molecule(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float, color):
    centers = [(x - 70 * scale, y + 30 * scale), (x, y - 55 * scale), (x + 76 * scale, y + 22 * scale), (x + 12 * scale, y + 76 * scale)]
    for first, second in ((0, 1), (1, 2), (1, 3), (2, 3)):
        draw.line((centers[first], centers[second]), fill=rgba(NAVY, 42), width=round(6 * scale))
    for index, (cx, cy) in enumerate(centers):
        radius = (19 if index == 1 else 14) * scale
        draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=rgba(CREAM, 172), outline=color, width=round(6 * scale))


def draw_server(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float, color):
    for offset in (-62, 0, 62):
        box = (x - 92 * scale, y + (offset - 25) * scale, x + 92 * scale, y + (offset + 25) * scale)
        draw.rounded_rectangle(box, radius=round(12 * scale), outline=color, width=round(6 * scale))
        dot = 7 * scale
        draw.ellipse((x + 57 * scale - dot, y + offset * scale - dot, x + 57 * scale + dot, y + offset * scale + dot), fill=color)


def draw_motif(layer: Image.Image, kind: str, accent: tuple[int, int, int], secondary: tuple[int, int, int]):
    draw = ImageDraw.Draw(layer)
    primary = rgba(accent, 118)
    secondary_line = rgba(secondary, 96)

    floating_tile(layer, (604, 132, 996, 524), accent, 84)
    floating_tile(layer, (190, 268, 446, 524), secondary, 62)
    floating_tile(layer, (1164, 216, 1416, 468), accent, 62)
    draw = ImageDraw.Draw(layer)

    if kind == "community":
        draw_people_network(draw, 800, 330, 1.12, primary)
        draw_person(draw, 318, 392, .78, secondary_line)
        draw_person(draw, 1290, 344, .74, primary)
    elif kind == "esfahan":
        draw_arch(draw, 800, 330, 1.02, primary)
        draw_route(draw, 318, 392, .72, secondary_line)
        draw_arch(draw, 1290, 342, .60, primary)
    elif kind == "biomedical":
        draw_biomedical(draw, 800, 332, 1.00, primary)
        draw_dna(draw, 318, 392, .68, secondary_line)
        draw_biomedical(draw, 1290, 342, .52, primary)
    elif kind == "electrical":
        draw_circuit(draw, 800, 332, 1.03, primary)
        draw_wave(draw, 318, 392, .74, secondary_line)
        draw_circuit(draw, 1290, 342, .52, primary)
    elif kind == "chemical":
        draw_chemical(draw, 800, 330, .98, primary)
        draw_molecule(draw, 318, 392, .72, secondary_line)
        draw_chemical(draw, 1290, 342, .52, primary)
    elif kind == "computing":
        draw_chip(draw, 800, 330, 1.00, primary)
        draw_server(draw, 318, 392, .69, secondary_line)
        draw_chip(draw, 1290, 342, .50, primary)


def build_cover(filename: str, accent: tuple[int, int, int], secondary: tuple[int, int, int], kind: str):
    image = base_background(accent, secondary)
    motif = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw_motif(motif, kind, accent, secondary)
    image = Image.alpha_composite(image, motif)

    # Keep the lower portion quiet because the app places titles and actions there.
    quiet = Image.new("RGBA", image.size, (0, 0, 0, 0))
    quiet_draw = ImageDraw.Draw(quiet)
    for y in range(520, HEIGHT):
        amount = (y - 520) / (HEIGHT - 520)
        quiet_draw.line((0, y, WIDTH, y), fill=rgba(IVORY, round(10 + 84 * amount)))
    image = Image.alpha_composite(image, quiet).convert("RGB")
    image.save(OUTPUT_DIR / filename, "WEBP", quality=86, method=6)


def create_preview(paths: list[Path]):
    thumb_w, thumb_h = 560, 315
    gap = 16
    preview = Image.new("RGB", (thumb_w * 2 + gap * 3, thumb_h * 3 + gap * 4), IVORY)
    for index, path in enumerate(paths):
        cover = Image.open(path).convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        x = gap + (index % 2) * (thumb_w + gap)
        y = gap + (index // 2) * (thumb_h + gap)
        preview.paste(cover, (x, y))
    preview.save(OUTPUT_DIR / "community-covers-floating-preview.webp", "WEBP", quality=84, method=6)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    outputs = []
    for filename, accent, secondary, kind in COVERS:
        build_cover(filename, accent, secondary, kind)
        outputs.append(OUTPUT_DIR / filename)
    create_preview(outputs)
    for output in outputs:
        print(f"{output.name}\t{output.stat().st_size}")


if __name__ == "__main__":
    main()
