#!/usr/bin/env python3
"""Wordfire 2.3.1 Ember Circle features card. ASCII text only."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "infographic.png"
W, H = 1600, 900


def font(size: int, bold: bool = False):
    kit = Path.home() / "design-assets" / "fontshare"
    paths = []
    if bold:
        paths += [
            str(kit / "clash-display" / "otf" / "ClashDisplay-Semibold.otf"),
            r"C:\Windows\Fonts\segoeuib.ttf",
        ]
    else:
        paths += [
            str(kit / "satoshi" / "otf" / "Satoshi-Medium.otf"),
            r"C:\Windows\Fonts\segoeui.ttf",
        ]
    for path in paths:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main() -> None:
    img = Image.new("RGB", (W, H), (12, 8, 10))
    d = ImageDraw.Draw(img)
    for x in range(W):
        t = x / (W - 1)
        d.line([(x, 0), (x, 8)], fill=(int(255 * t), int(90 + 40 * (1 - t)), 40))
    d.rounded_rectangle((48, 48, W - 48, H - 48), radius=28, fill=(22, 14, 16), outline=(90, 42, 36), width=2)
    d.text((88, 88), "WORDFIRE", font=font(22), fill=(255, 140, 70))
    d.text((88, 130), "Ember Circle  2.3.1", font=font(64, True), fill=(255, 236, 220))
    d.text((88, 220), "One word at a time. The story belongs to the circle.", font=font(28), fill=(210, 180, 160))
    cards = [
        ("Local", "Pass-and-play on one device. No account."),
        ("Circle", "Remote circle over WebRTC data channels."),
        ("Signal", "The server only brokers the handshake."),
        ("Keep", "Grammar is implied. History stays with the circle."),
    ]
    x0 = 88
    for i, (title, body) in enumerate(cards):
        x = x0 + (i % 2) * 720
        y = 320 + (i // 2) * 180
        d.rounded_rectangle((x, y, x + 680, y + 150), radius=18, fill=(32, 18, 20), outline=(120, 60, 40))
        d.text((x + 28, y + 28), title, font=font(28, True), fill=(255, 170, 90))
        d.text((x + 28, y + 78), body, font=font(22), fill=(230, 210, 190))
    d.text((88, 800), "wordfire.jonbailey.xyz   |   MIT   |   card 2026-10-11", font=font(20), fill=(160, 120, 100))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
