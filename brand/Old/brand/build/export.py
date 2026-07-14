#!/usr/bin/env python3
import os, re, io
import cairosvg
from PIL import Image
import compose as C

OUT = "brand"
def w(path, s):
    full = os.path.join(OUT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, "w").write(s)
    return full

def dims(s):
    m = re.search(r'width="([\d.]+)" height="([\d.]+)"', s)
    return float(m.group(1)), float(m.group(2))

def square_wrap(inner_svg, size, bg=None, fit=0.86):
    iw, ih = dims(inner_svg)
    sc = min(size * fit / iw, size * fit / ih)
    dw, dh = iw * sc, ih * sc
    x = (size - dw) / 2; y = (size - dh) / 2
    body = inner_svg.split('>', 1)[1].rsplit('</svg>', 1)[0]
    rect = f'<rect width="{size}" height="{size}" fill="{bg}"/>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" '
            f'viewBox="0 0 {size} {size}">{rect}'
            f'<svg x="{x}" y="{y}" width="{dw}" height="{dh}" '
            f'viewBox="0 0 {iw} {ih}">{body}</svg></svg>')

def png(svg_str, out, width=None, height=None):
    full = os.path.join(OUT, out)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    cairosvg.svg2png(bytestring=svg_str.encode(), write_to=full,
                     output_width=width, output_height=height)
    return full

# ============ LOGO ============
horiz = C.horizontal('full')
w("logo/logo.svg", horiz)
w("logo/logo-horizontal.svg", horiz)
w("logo/logo-vertical.svg", C.vertical('full', tagline=True))
w("logo/logo-wordmark.svg", C.wordmark_only('full'))
w("logo/logo-white.svg", C.horizontal('white'))
w("logo/logo-black.svg", C.horizontal('ink'))
w("logo/logo-grayscale.svg", C.horizontal('grayscale'))
w("logo/logo-monochrome-black.svg", C.horizontal('mono_black'))
w("logo/logo-monochrome-white.svg", C.horizontal('white'))

# logo PNGs (square 3000)
png(square_wrap(horiz, 3000), "logo/logo.png", 3000, 3000)
png(square_wrap(horiz, 3000, bg='#FFFFFF'), "logo/logo-light.png", 3000, 3000)
png(square_wrap(C.horizontal('white'), 3000, bg='#172338'), "logo/logo-dark.png", 3000, 3000)

# ============ ICON ============
icon_sq = C.icon_only('full', square=True)
w("icon/icon.svg", icon_sq)
w("icon/icon-white.svg", C.icon_only('white', square=True))
w("icon/icon-black.svg", C.icon_only('mono_black', square=True))
png(icon_sq, "icon/icon.png", 1024, 1024)
png(C.tile(1024, '#FFFFFF', '#172338', '#3CC54A', frac=0.60), "icon/icon-light.png", 1024, 1024)
png(C.tile(1024, '#172338', '#FFFFFF', '#3CC54A', frac=0.60), "icon/icon-dark.png", 1024, 1024)

# ============ FAVICON / APP ICONS (navy tile, white t, green dot) ============
NAVY, WHITE, GREEN = '#172338', '#FFFFFF', '#3CC54A'
fav_svg = C.tile(512, NAVY, WHITE, GREEN, frac=0.58, radius_frac=0.22)
w("favicon/favicon.svg", fav_svg)
for sz, name in [(16, "favicon/favicon-16x16.png"), (32, "favicon/favicon-32x32.png"),
                 (48, "favicon/favicon-48x48.png"),
                 (180, "favicon/apple-touch-icon.png"),
                 (192, "favicon/android-chrome-192x192.png"),
                 (512, "favicon/android-chrome-512x512.png")]:
    png(fav_svg, name, sz, sz)

# favicon.ico (16/32/48)
imgs = []
for sz in (16, 32, 48):
    b = cairosvg.svg2png(bytestring=fav_svg.encode(), output_width=sz, output_height=sz)
    imgs.append(Image.open(io.BytesIO(b)).convert("RGBA"))
imgs[0].save(os.path.join(OUT, "favicon/favicon.ico"), format="ICO",
             sizes=[(16, 16), (32, 32), (48, 48)])

# ============ PWA MASKABLE (full-bleed navy, safe zone) ============
mask = C.tile(512, NAVY, WHITE, GREEN, frac=0.50, bleed=True)
w("pwa/maskable-icon.svg", mask)
png(mask, "pwa/maskable-icon-512.png", 512, 512)
png(mask, "pwa/maskable-icon-192.png", 192, 192)

# ============ SOCIAL ============
png(C.social(1200, 630, 'light'), "social/social-preview.png", 1200, 630)
png(C.social(1200, 630, 'dark'), "social/og-image.png", 1200, 630)
w("social/social-preview.svg", C.social(1200, 630, 'light'))
w("social/og-image.svg", C.social(1200, 630, 'dark'))

print("EXPORT DONE")
