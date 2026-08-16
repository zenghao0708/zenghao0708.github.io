#!/usr/bin/env python3
"""Draw the DeepSeek V4 Flash/Pro comparison cover with Pillow."""

from __future__ import annotations

import math
from pathlib import Path
from typing import Iterable, Sequence

from PIL import Image, ImageDraw, ImageFilter, ImageFont


CANVAS_WIDTH = 3776
CANVAS_HEIGHT = 1600
OUTPUT_WIDTH = 1888
OUTPUT_HEIGHT = 800

TOP_BACKGROUND = (16, 26, 61)
BOTTOM_BACKGROUND = (7, 11, 28)
BADGE_BACKGROUND = (13, 19, 48, 228)
CYAN = (34, 211, 238)
AMBER = (245, 158, 11)
WHITE = (255, 255, 255)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = (
    ROOT
    / "blog_new/source/images/deepseek-v4-flash-pro-comparison/cover-1888x800.png"
)

# Each candidate is (path, face index). Hiragino Sans GB W6 is the built-in
# Chinese bold fallback on this Mac; Arial Black gives the Latin labels more mass.
FONT_CANDIDATES = {
    "chinese_bold": (
        (Path("/System/Library/Fonts/PingFang.ttc"), 1),
        (Path("/System/Library/Fonts/Hiragino Sans GB.ttc"), 2),
        (Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf"), 0),
    ),
    "latin_black": (
        (Path("/System/Library/Fonts/Supplemental/Arial Black.ttf"), 0),
        (Path("/System/Library/Fonts/Helvetica.ttc"), 1),
        (Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf"), 0),
    ),
}

Point = tuple[float, float]
FontFace = tuple[Path, int]


def choose_font(weight: str) -> FontFace | None:
    return next(
        (
            (path, face_index)
            for path, face_index in FONT_CANDIDATES[weight]
            if path.exists()
        ),
        None,
    )


def load_font(face: FontFace | None, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    if face is None:
        return ImageFont.load_default(size=size)
    path, face_index = face
    return ImageFont.truetype(str(path), size=size, index=face_index)


def fit_font(
    text: str,
    target_height: int,
    weight: str,
    max_width: int | None = None,
) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """Fit by visible glyph bounds rather than nominal point size."""
    face = choose_font(weight)
    probe = ImageDraw.Draw(Image.new("L", (1, 1)))
    low, high = 1, target_height * 3
    best = load_font(face, low)

    while low <= high:
        size = (low + high) // 2
        font = load_font(face, size)
        bbox = probe.textbbox((0, 0), text, font=font)
        glyph_width = bbox[2] - bbox[0]
        glyph_height = bbox[3] - bbox[1]
        fits_width = max_width is None or glyph_width <= max_width
        if glyph_height <= target_height and fits_width:
            best = font
            low = size + 1
        else:
            high = size - 1

    return best


def draw_text_by_visible_top(
    draw: ImageDraw.ImageDraw,
    xy: Point,
    text: str,
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    fill: tuple[int, int, int, int],
    anchor: str = "left",
) -> tuple[int, int, int, int]:
    bbox = draw.textbbox((0, 0), text, font=font)
    glyph_width = bbox[2] - bbox[0]
    x, visible_top = xy
    if anchor == "center":
        x -= glyph_width / 2
    draw.text((round(x - bbox[0]), round(visible_top - bbox[1])), text, font=font, fill=fill)
    return (
        round(x),
        round(visible_top),
        round(x + glyph_width),
        round(visible_top + bbox[3] - bbox[1]),
    )


def alpha_composite_mask(
    canvas: Image.Image,
    color: tuple[int, int, int],
    mask: Image.Image,
) -> None:
    layer = Image.new("RGBA", canvas.size, (*color, 0))
    layer.putalpha(mask)
    canvas.alpha_composite(layer)


def ellipse_glow(
    canvas: Image.Image,
    bbox: tuple[int, int, int, int],
    color: tuple[int, int, int],
    alpha: int,
    blur: int,
) -> None:
    mask = Image.new("L", canvas.size, 0)
    ImageDraw.Draw(mask).ellipse(bbox, fill=alpha)
    alpha_composite_mask(canvas, color, mask.filter(ImageFilter.GaussianBlur(blur)))


def vertical_gradient() -> Image.Image:
    gradient = Image.new("RGB", (1, CANVAS_HEIGHT))
    pixels = []
    for y in range(CANVAS_HEIGHT):
        ratio = y / (CANVAS_HEIGHT - 1)
        pixels.append(
            tuple(
                round(top + (bottom - top) * ratio)
                for top, bottom in zip(TOP_BACKGROUND, BOTTOM_BACKGROUND)
            )
        )
    gradient.putdata(pixels)
    return gradient.resize((CANVAS_WIDTH, CANVAS_HEIGHT)).convert("RGBA")


def cubic_points(p0: Point, p1: Point, p2: Point, p3: Point, steps: int = 24) -> list[Point]:
    points = []
    for index in range(1, steps + 1):
        t = index / steps
        inverse = 1 - t
        points.append(
            (
                inverse**3 * p0[0]
                + 3 * inverse**2 * t * p1[0]
                + 3 * inverse * t**2 * p2[0]
                + t**3 * p3[0],
                inverse**3 * p0[1]
                + 3 * inverse**2 * t * p1[1]
                + 3 * inverse * t**2 * p2[1]
                + t**3 * p3[1],
            )
        )
    return points


def bezier_shape(start: Point, curves: Sequence[tuple[Point, Point, Point]]) -> list[Point]:
    points = [start]
    current = start
    for control_1, control_2, end in curves:
        points.extend(cubic_points(current, control_1, control_2, end))
        current = end
    return points


def transform_points(
    points: Iterable[Point],
    center: Point,
    width: int,
    height: int,
    facing: str,
) -> list[Point]:
    center_x, center_y = center
    transformed = []
    for x, y in points:
        if facing == "left":
            x = 1 - x
        transformed.append(
            (center_x + (x - 0.5) * width, center_y + (y - 0.5) * height)
        )
    return transformed


def whale_parts() -> tuple[list[Point], list[Point], list[Point]]:
    body = bezier_shape(
        (0.17, 0.51),
        (
            ((0.25, 0.25), (0.53, 0.13), (0.78, 0.23)),
            ((0.91, 0.28), (0.985, 0.36), (0.99, 0.46)),
            ((1.00, 0.57), (0.92, 0.65), (0.80, 0.69)),
            ((0.61, 0.78), (0.37, 0.74), (0.22, 0.62)),
            ((0.18, 0.59), (0.16, 0.55), (0.17, 0.51)),
        ),
    )
    tail = bezier_shape(
        (0.22, 0.50),
        (
            ((0.13, 0.46), (0.08, 0.31), (0.06, 0.15)),
            ((0.05, 0.08), (0.02, 0.035), (0.00, 0.02)),
            ((0.17, 0.03), (0.28, 0.14), (0.28, 0.30)),
            ((0.29, 0.39), (0.27, 0.46), (0.22, 0.50)),
            ((0.28, 0.57), (0.28, 0.69), (0.23, 0.79)),
            ((0.18, 0.90), (0.09, 0.98), (0.01, 0.99)),
            ((0.04, 0.91), (0.05, 0.80), (0.06, 0.70)),
            ((0.07, 0.60), (0.12, 0.53), (0.22, 0.50)),
        ),
    )
    fin = bezier_shape(
        (0.52, 0.66),
        (
            ((0.58, 0.73), (0.64, 0.89), (0.70, 0.96)),
            ((0.73, 0.83), (0.75, 0.72), (0.72, 0.65)),
            ((0.65, 0.68), (0.58, 0.69), (0.52, 0.66)),
        ),
    )
    return body, tail, fin


def draw_whale(
    canvas: Image.Image,
    center: Point,
    width: int,
    color: tuple[int, int, int],
    facing: str,
) -> None:
    height = round(width * 0.46)
    body, tail, fin = whale_parts()
    mask = Image.new("L", canvas.size, 0)
    mask_draw = ImageDraw.Draw(mask)
    for shape in (tail, body, fin):
        mask_draw.polygon(
            transform_points(shape, center, width, height, facing),
            fill=255,
        )

    broad_glow = mask.filter(ImageFilter.GaussianBlur(44))
    broad_glow = broad_glow.point(lambda value: value * 58 // 255)
    alpha_composite_mask(canvas, color, broad_glow)

    tight_glow = mask.filter(ImageFilter.GaussianBlur(14))
    tight_glow = tight_glow.point(lambda value: value * 90 // 255)
    alpha_composite_mask(canvas, color, tight_glow)
    alpha_composite_mask(canvas, color, mask)

    detail = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    detail_draw = ImageDraw.Draw(detail)
    top_contour = transform_points(
        bezier_shape(
            (0.26, 0.34),
            (
                ((0.43, 0.18), (0.73, 0.18), (0.89, 0.34)),
            ),
        ),
        center,
        width,
        height,
        facing,
    )
    detail_draw.line(top_contour, fill=(*WHITE, 70), width=max(3, width // 180), joint="curve")

    eye_x, eye_y = transform_points(((0.88, 0.42),), center, width, height, facing)[0]
    eye_radius = max(6, round(width * 0.011))
    detail_draw.ellipse(
        (
            eye_x - eye_radius,
            eye_y - eye_radius,
            eye_x + eye_radius,
            eye_y + eye_radius,
        ),
        fill=(7, 11, 28, 210),
    )
    glint_radius = max(2, eye_radius // 3)
    detail_draw.ellipse(
        (
            eye_x - glint_radius,
            eye_y - glint_radius,
            eye_x + glint_radius,
            eye_y + glint_radius,
        ),
        fill=(*WHITE, 210),
    )

    mouth = transform_points(
        bezier_shape(
            (0.91, 0.55),
            (
                ((0.95, 0.56), (0.98, 0.54), (0.995, 0.51)),
            ),
        ),
        center,
        width,
        height,
        facing,
    )
    detail_draw.line(mouth, fill=(7, 11, 28, 115), width=max(3, width // 220), joint="curve")
    canvas.alpha_composite(detail)


def draw_tapered_line(
    draw: ImageDraw.ImageDraw,
    start: Point,
    end: Point,
    width: int,
    fill: tuple[int, int, int, int],
) -> None:
    x1, y1 = start
    x2, y2 = end
    half = width / 2
    draw.polygon(
        (
            (x1, y1 - half * 0.35),
            (x2 - half, y2 - half),
            (x2, y2),
            (x2 - half, y2 + half),
            (x1, y1 + half * 0.35),
        ),
        fill=fill,
    )


def draw_speed_lines(canvas: Image.Image) -> None:
    glow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    lines = (
        ((178, 608), (596, 608), 14, 150),
        ((246, 700), (574, 700), 11, 105),
        ((330, 790), (548, 790), 8, 66),
    )
    for start, end, width, alpha in lines:
        draw_tapered_line(glow_draw, start, end, width, (*CYAN, alpha))
    canvas.alpha_composite(glow.filter(ImageFilter.GaussianBlur(12)))
    canvas.alpha_composite(glow)


def draw_power_rings(canvas: Image.Image) -> None:
    rings = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(rings)
    center_x, center_y = 2945, 704
    ring_specs = (
        (410, 195, 338, 9, 84),
        (545, 20, 154, 7, 56),
        (680, 205, 330, 5, 36),
    )
    for radius, start, end, width, alpha in ring_specs:
        bbox = (
            center_x - radius,
            center_y - radius,
            center_x + radius,
            center_y + radius,
        )
        draw.arc(bbox, start=start, end=end, fill=(*AMBER, alpha), width=width)
        draw.arc(bbox, start=start + 180, end=end + 180, fill=(*AMBER, alpha), width=width)
    canvas.alpha_composite(rings.filter(ImageFilter.GaussianBlur(18)))
    canvas.alpha_composite(rings)


def draw_diagonal_divider(canvas: Image.Image) -> None:
    start = (CANVAS_WIDTH * 0.45, 0)
    end = (CANVAS_WIDTH * 0.55, CANVAS_HEIGHT)
    delta_x, delta_y = end[0] - start[0], end[1] - start[1]
    length = math.hypot(delta_x, delta_y)
    normal = (-delta_y / length, delta_x / length)

    for side, color in ((1, CYAN), (-1, AMBER)):
        glow_mask = Image.new("L", canvas.size, 0)
        glow_draw = ImageDraw.Draw(glow_mask)
        glow_offset = 10 * side
        glow_start = (
            start[0] + normal[0] * glow_offset,
            start[1] + normal[1] * glow_offset,
        )
        glow_end = (
            end[0] + normal[0] * glow_offset,
            end[1] + normal[1] * glow_offset,
        )
        glow_draw.line((glow_start, glow_end), fill=64, width=40)
        alpha_composite_mask(
            canvas,
            color,
            glow_mask.filter(ImageFilter.GaussianBlur(24)),
        )

    divider = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    divider_draw = ImageDraw.Draw(divider)
    for side, color in ((1, CYAN), (-1, AMBER)):
        offset = 2 * side
        line_start = (start[0] + normal[0] * offset, start[1] + normal[1] * offset)
        line_end = (end[0] + normal[0] * offset, end[1] + normal[1] * offset)
        divider_draw.line((line_start, line_end), fill=(*color, 255), width=4)
    canvas.alpha_composite(divider)


def draw_capsule(
    canvas: Image.Image,
    center: Point,
    size: tuple[int, int],
    color: tuple[int, int, int],
    label: str,
) -> None:
    center_x, center_y = center
    width, height = size
    bbox = (
        round(center_x - width / 2),
        round(center_y - height / 2),
        round(center_x + width / 2),
        round(center_y + height / 2),
    )

    border_mask = Image.new("L", canvas.size, 0)
    border_draw = ImageDraw.Draw(border_mask)
    border_draw.rounded_rectangle(bbox, radius=height // 2, outline=92, width=22)
    alpha_composite_mask(
        canvas,
        color,
        border_mask.filter(ImageFilter.GaussianBlur(20)),
    )

    capsule = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(capsule)
    draw.rounded_rectangle(
        bbox,
        radius=height // 2,
        fill=BADGE_BACKGROUND,
        outline=(*color, 255),
        width=6,
    )
    inset = 18
    draw.arc(
        (bbox[0] + inset, bbox[1] + inset, bbox[2] - inset, bbox[3] - inset),
        start=200,
        end=340,
        fill=(*WHITE, 28),
        width=3,
    )
    font = fit_font(label, target_height=108, weight="latin_black", max_width=width - 96)
    draw_text_by_visible_top(
        draw,
        (center_x, center_y - 54),
        label,
        font,
        (*WHITE, 255),
        anchor="center",
    )
    canvas.alpha_composite(capsule)


def draw_vs_badge(canvas: Image.Image) -> None:
    center_x, center_y = CANVAS_WIDTH // 2, 700
    radius = 300

    shadow_mask = Image.new("L", canvas.size, 0)
    shadow_draw = ImageDraw.Draw(shadow_mask)
    shadow_draw.ellipse(
        (center_x - radius, center_y - radius, center_x + radius, center_y + radius),
        fill=205,
    )
    alpha_composite_mask(
        canvas,
        (0, 0, 0),
        shadow_mask.filter(ImageFilter.GaussianBlur(76)),
    )

    outer_ring = Image.new("L", canvas.size, 0)
    outer_draw = ImageDraw.Draw(outer_ring)
    outer_draw.ellipse(
        (
            center_x - radius - 20,
            center_y - radius - 20,
            center_x + radius + 20,
            center_y + radius + 20,
        ),
        outline=42,
        width=40,
    )
    alpha_composite_mask(
        canvas,
        WHITE,
        outer_ring.filter(ImageFilter.GaussianBlur(16)),
    )

    badge = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(badge)
    bbox = (
        center_x - radius,
        center_y - radius,
        center_x + radius,
        center_y + radius,
    )
    draw.ellipse(bbox, fill=(13, 19, 48, 255), outline=(*WHITE, 255), width=12)
    draw.ellipse(
        (bbox[0] + 28, bbox[1] + 28, bbox[2] - 28, bbox[3] - 28),
        outline=(*WHITE, 26),
        width=4,
    )

    font = fit_font("VS", target_height=300, weight="latin_black", max_width=430)
    bbox_text = draw.textbbox((0, 0), "VS", font=font)
    glyph_height = bbox_text[3] - bbox_text[1]
    draw_text_by_visible_top(
        draw,
        (center_x, center_y - glyph_height / 2),
        "VS",
        font,
        (*WHITE, 255),
        anchor="center",
    )
    canvas.alpha_composite(badge)


def draw_typography(canvas: Image.Image) -> None:
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    eyebrow = "DEEPSEEK 模型实测"
    eyebrow_font = fit_font(
        eyebrow,
        target_height=80,
        weight="chinese_bold",
        max_width=1040,
    )
    draw_text_by_visible_top(
        draw,
        (128, 104),
        eyebrow,
        eyebrow_font,
        (*WHITE, 205),
    )

    subtitle = "价格差 3 倍，效果差多少？"
    subtitle_font = fit_font(
        subtitle,
        target_height=88,
        weight="chinese_bold",
        max_width=1740,
    )
    draw_text_by_visible_top(
        draw,
        (CANVAS_WIDTH / 2, 1038),
        subtitle,
        subtitle_font,
        (*WHITE, 217),
        anchor="center",
    )
    canvas.alpha_composite(layer)


def generate_cover() -> Path:
    canvas = vertical_gradient()

    # Soft faction glows are intentionally subtle; the saturated shapes remain dominant.
    ellipse_glow(canvas, (110, 260, 1510, 1170), CYAN, alpha=29, blur=170)
    ellipse_glow(canvas, (2260, 190, 3730, 1250), AMBER, alpha=27, blur=190)

    dots = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    dot_draw = ImageDraw.Draw(dots)
    for y in range(28, CANVAS_HEIGHT, 56):
        for x in range(28, CANVAS_WIDTH, 56):
            dot_draw.point((x, y), fill=(*WHITE, 45))
    canvas.alpha_composite(dots)

    draw_diagonal_divider(canvas)
    draw_speed_lines(canvas)
    draw_power_rings(canvas)

    draw_whale(canvas, center=(CANVAS_WIDTH * 0.22, CANVAS_HEIGHT * 0.44), width=720, color=CYAN, facing="right")
    draw_whale(canvas, center=(CANVAS_WIDTH * 0.78, CANVAS_HEIGHT * 0.44), width=1040, color=AMBER, facing="left")

    draw_capsule(canvas, center=(CANVAS_WIDTH * 0.22, 1230), size=(900, 184), color=CYAN, label="V4-FLASH")
    draw_capsule(canvas, center=(CANVAS_WIDTH * 0.78, 1230), size=(760, 184), color=AMBER, label="V4-PRO")

    draw_vs_badge(canvas)
    draw_typography(canvas)

    output_image = canvas.convert("RGB").resize(
        (OUTPUT_WIDTH, OUTPUT_HEIGHT),
        Image.Resampling.LANCZOS,
    )
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    output_image.save(OUTPUT, format="PNG", optimize=True)
    return OUTPUT


if __name__ == "__main__":
    print(generate_cover())
