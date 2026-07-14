#!/usr/bin/env python3
"""Verifica qué fuentes están embebidas en los PDFs del Brand Kit.
Uso:  python3 scripts/check-fonts.py"""
import re, sys
from pathlib import Path

def base(cur=Path(__file__).resolve()):
    for c in [Path.cwd(), *cur.parents]:
        if (c / "brand" / "docs" / "brand-guide.pdf").exists():
            return c
    sys.exit("No encontré brand/docs/brand-guide.pdf")

DOCS = base() / "brand" / "docs"
for name in ("brand-guide.pdf", "colors.pdf"):
    data = (DOCS / name).read_bytes()
    fonts = sorted({m.decode() for m in re.findall(rb"/BaseFont\s*/([A-Za-z0-9+,\-]+)", data)})
    inter = [f for f in fonts if "Inter" in f]
    print(f"\n{name}")
    print("  fuentes:", fonts)
    print("  ¿usa Inter?:", "SÍ ✅" if inter else "NO ❌  (revisá la instalación de Inter .ttf)")
