#!/usr/bin/env python3
"""Generate the DeepSeek V4 Flash/Pro comparison blog cover."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


WIDTH = 1888
HEIGHT = 800
SCALE = 3

BACKGROUND = "#0f1b2d"
GRID = "#1a2a42"
CYAN = "#22d3ee"
AMBER = "#f59e0b"
CONNECTOR = "#475569"
WHITE = "#ffffff"

OUTPUT = (
    Path(__file__).resolve().parents[1]
    / "blog_new/source/images/deepseek-v4-flash-pro-comparison/cover-1888x800.png"
)

FONT_CANDIDATES = {
    "black": (
        Path("/System/Library/Fonts/Supplemental/Arial Black.ttf"),
        Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
        Path("/Library/Fonts/Arial Black.ttf"),
    ),
    "bold": (
        Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
        Path("/System/Library/Fonts/Supplemental/Arial Black.ttf"),
        Path("/Library/Fonts/Arial Bold.ttf"),
    ),
}


def scaled(value: float) -> int:
    return round(value * SCALE)


def choose_font(weight: str) -> Path | None:
    return next((path for path in FONT_CANDIDATES[weight] if path.exists()), None)


def fit_font(text: str, target_height: int, weight: str) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """Return the largest available font whose visible glyph height fits the target."""
    font_path = choose_font(weight)
    if font_path is None:
        return ImageFont.load_default(size=scaled(target_height))

    probe = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    low, high = 1, scaled(target_height * 2)
    best = ImageFont.truetype(str(font_path), low)

    while low <= high:
        size = (low + high) // 2
        font = ImageFont.truetype(str(font_path), size)
        bbox = probe.textbbox((0, 0), text, font=font)
        if bbox[3] - bbox[1] <= scaled(target_height):
            best = font
            low = size + 1
        else:
            high = size - 1

    return best


def draw_centered_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    center_x: int,
    visible_top: int,
    target_height: int,
    weight: str,
) -> None:
    font = fit_font(text, target_height, weight)
    bbox = draw.textbbox((0, 0), text, font=font)
    glyph_width = bbox[2] - bbox[0]
    x = scaled(center_x) - glyph_width / 2 - bbox[0]
    y = scaled(visible_top) - bbox[1]
    draw.text((round(x), round(y)), text, font=font, fill=WHITE)


def regular_hexagon(center_x: int, center_y: int, radius: int) -> list[tuple[int, int]]:
    return [
        (
            scaled(center_x + radius * math.cos(math.radians(-90 + index * 60))),
            scaled(center_y + radius * math.sin(math.radians(-90 + index * 60))),
        )
        for index in range(6)
    ]


def generate_cover() -> Path:
    canvas = Image.new("RGB", (scaled(WIDTH), scaled(HEIGHT)), BACKGROUND)
    draw = ImageDraw.Draw(canvas)

    for x in range(0, WIDTH + 1, 40):
        draw.line((scaled(x), 0, scaled(x), scaled(HEIGHT)), fill=GRID, width=scaled(1))
    for y in range(0, HEIGHT + 1, 40):
        draw.line((0, scaled(y), scaled(WIDTH), scaled(y)), fill=GRID, width=scaled(1))

    # The connector sits behind the three foreground symbols.
    draw.line(
        (scaled(500), scaled(400), scaled(1366), scaled(400)),
        fill=CONNECTOR,
        width=scaled(6),
    )

    lightning = [
        (scaled(347), scaled(255)),
        (scaled(235), scaled(421)),
        (scaled(315), scaled(421)),
        (scaled(280), scaled(555)),
        (scaled(435), scaled(345)),
        (scaled(354), scaled(345)),
    ]
    draw.polygon(lightning, fill=CYAN)

    draw.polygon(regular_hexagon(1558, 335, 220), fill=AMBER)

    # All three primary forms share a visible bottom edge around y=555.
    draw_centered_text(draw, "3×", 944, 315, 240, "black")
    draw_centered_text(draw, "FLASH", 330, 610, 60, "bold")
    draw_centered_text(draw, "PRO", 1558, 610, 60, "bold")

    output_image = canvas.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    output_image.save(OUTPUT, format="PNG", optimize=True)
    return OUTPUT


if __name__ == "__main__":
    print(generate_cover())
