#!/usr/bin/env python3
"""Compose TitoApps logo lockups (icon + geometric wordmark + slogan)."""
import wordmark as WM

# ---- Isotipo (from the supplied logo, local coords) ----
ICON_D = ("M -80 -170 C -80 -192 -62 -210 -40 -210 L 8 -210 C 30 -210 48 -192 48 -170 "
          "L 48 -95 L 120 -95 C 142 -95 160 -77 160 -55 L 160 -18 C 160 4 142 22 120 22 "
          "L 48 22 L 48 132 C 48 187 69 211 118 211 L 136 211 C 159 211 178 230 178 253 "
          "L 178 275 C 178 298 159 317 136 317 L 100 317 C 6 317 -80 262 -80 142 L -80 22 "
          "L -136 22 C -158 22 -176 4 -176 -18 L -176 -55 C -176 -77 -158 -95 -136 -95 "
          "L -80 -95 Z")
IC = dict(minx=-176, miny=-210, maxx=282, maxy=317)
IC_W = IC['maxx'] - IC['minx']   # 458
IC_H = IC['maxy'] - IC['miny']   # 527
DOT = dict(cx=220, cy=-105, r=62)

SCHEMES = {
    'full':      dict(ink='#172338', green='#3CC54A'),
    'white':     dict(ink='#FFFFFF', green='#FFFFFF'),
    'ink':       dict(ink='#172338', green='#172338'),
    'grayscale': dict(ink='#1E2632', green='#9AA3AD'),
    'mono_black':dict(ink='#000000', green='#000000'),
}

def icon(ink, dot, tx=0, ty=0, s=1.0):
    return (f'<g transform="translate({tx} {ty}) scale({s})">'
            f'<path d="{ICON_D}" fill="{ink}"/>'
            f'<circle cx="{DOT["cx"]}" cy="{DOT["cy"]}" r="{DOT["r"]}" fill="{dot}"/></g>')

def wm(ink, green, tx=0, ty=0, s=1.0):
    body, total, h = WM.wordmark(ink, green)
    return f'<g transform="translate({tx} {ty}) scale({s})">{body}</g>', total

def slogan(col, accent, cx, y, size=54):
    return (f'<text x="{cx}" y="{y}" text-anchor="middle" '
            f'font-family="Manrope, Carlito, \'DejaVu Sans\', sans-serif" '
            f'font-size="{size}" font-weight="500" letter-spacing="0.5" fill="{col}">'
            f'Apps que simplifican tu vida<tspan fill="{accent}">.</tspan></text>')

def svg(w, h, body, bg=None, extra=""):
    rect = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
            f'viewBox="0 0 {w} {h}">{rect}{extra}{body}</svg>')

# ---------- Lockups ----------
def horizontal(scheme, tagline=False, pad=48):
    sc = SCHEMES[scheme]
    s = 0.34
    icon_w = IC_W * s          # ~155.7
    icon_h = IC_H * s          # ~179.2
    # wordmark baseline coords: xheight 40..140, ascender 6, descender 184
    wm_body, wm_w = wm(sc['ink'], sc['green'])
    gap = 62
    # place icon: left edge at pad
    ix = pad - IC['minx'] * s
    # align icon center to wordmark x-height center (90)
    iy = 90 - ((IC['miny'] + IC['maxy']) / 2) * s
    icon_el = icon(sc['ink'], sc['green'], ix, iy, s)
    wx = pad + icon_w + gap
    wm_el = f'<g transform="translate({wx} 0)">{wm_body}</g>'
    body = icon_el + wm_el
    w = wx + wm_w + pad
    top = min(iy + IC['miny'] * s, 6)
    if tagline:
        h_base = 184
        sy = h_base + 78
        body += slogan(sc['ink'], sc['green'], (wx + wx + wm_w) / 2, sy)
        h = sy + 40
    else:
        h = 184 + pad
    # normalize top padding
    shift = pad - top
    body = f'<g transform="translate(0 {shift})">{body}</g>'
    h = h + shift
    return svg(round(w, 1), round(h, 1), body)

def vertical(scheme, tagline=True, pad=60):
    sc = SCHEMES[scheme]
    s = 0.46
    icon_w = IC_W * s
    icon_h = IC_H * s
    wm_s = 0.62
    wm_body, wm_w = wm(sc['ink'], sc['green'])
    wm_w *= wm_s
    content_w = max(icon_w, wm_w)
    cx = pad + content_w / 2
    # icon centered top
    ix = cx - ((IC['minx'] + IC['maxx']) / 2) * s
    iy = pad - IC['miny'] * s
    icon_el = icon(sc['ink'], sc['green'], ix, iy, s)
    icon_bottom = pad + icon_h
    # wordmark centered below
    gap1 = 54
    wy = icon_bottom + gap1
    wx = cx - wm_w / 2
    wm_el = f'<g transform="translate({wx} {wy}) scale({wm_s})">{wm_body}</g>'
    # wordmark baseline is at 140*wm_s below wy; descender 184
    body = icon_el + wm_el
    bottom = wy + 184 * wm_s
    if tagline:
        sy = bottom + 46
        body += slogan(sc['ink'], sc['green'], cx, sy, size=40)
        bottom = sy + 18
    w = content_w + 2 * pad
    h = bottom + pad
    return svg(round(w, 1), round(h, 1), body)

def wordmark_only(scheme, pad=40):
    sc = SCHEMES[scheme]
    wm_body, wm_w = wm(sc['ink'], sc['green'])
    w = wm_w + 2 * pad
    # visual top ~6, bottom 184
    top = 6; bot = 184
    body = f'<g transform="translate({pad} {pad - top})">{wm_body}</g>'
    h = (bot - top) + 2 * pad
    return svg(round(w, 1), round(h, 1), body)

def icon_only(scheme, pad=40, square=False):
    sc = SCHEMES[scheme]
    if square:
        # center icon in square with breathing room
        box = max(IC_W, IC_H) + 2 * pad
        ix = box / 2 - (IC['minx'] + IC['maxx']) / 2
        iy = box / 2 - (IC['miny'] + IC['maxy']) / 2
        body = icon(sc['ink'], sc['green'], ix, iy, 1)
        return svg(round(box, 1), round(box, 1), body)
    w = IC_W + 2 * pad
    h = IC_H + 2 * pad
    ix = pad - IC['minx']
    iy = pad - IC['miny']
    body = icon(sc['ink'], sc['green'], ix, iy, 1)
    return svg(round(w, 1), round(h, 1), body)

IC_CX = (IC['minx'] + IC['maxx']) / 2   # 53
IC_CY = (IC['miny'] + IC['maxy']) / 2   # 53.5

def tile(size, bg, ink, dot, frac=0.60, radius_frac=0.22, bleed=False):
    """Square icon tile. bleed=True -> full-bleed bg (for maskable, no rounding)."""
    sc = frac * size / IC_H
    tx = size / 2 - IC_CX * sc
    ty = size / 2 - IC_CY * sc
    if bleed:
        rect = f'<rect width="{size}" height="{size}" fill="{bg}"/>'
    elif bg:
        r = size * radius_frac
        rect = f'<rect width="{size}" height="{size}" rx="{r}" ry="{r}" fill="{bg}"/>'
    else:
        rect = ''
    body = rect + icon(ink, dot, tx, ty, sc)
    return svg(size, size, body)

def social(w, h, mode='light'):
    """1200x630 style banner."""
    if mode == 'light':
        bg, ink, green, sl = '#FFFFFF', '#172338', '#3CC54A', '#4B5563'
    else:
        bg, ink, green, sl = '#172338', '#FFFFFF', '#3CC54A', '#AEB6C2'
    s = 0.60
    icon_w = IC_W * s
    wm_body, wm_w = wm(ink, green)
    wm_s = 0.86
    wm_w *= wm_s
    gap = 70
    block_w = icon_w + gap + wm_w
    cx = w / 2
    x0 = cx - block_w / 2
    icon_cy = h / 2 - 40
    ix = x0 - IC['minx'] * s
    iy = icon_cy - IC_CY * s
    icon_el = icon(ink, green, ix, iy, s)
    wx = x0 + icon_w + gap
    # align wordmark x-height centre (90*wm_s) to icon_cy
    wy = icon_cy - 90 * wm_s
    wm_el = f'<g transform="translate({wx} {wy}) scale({wm_s})">{wm_body}</g>'
    sy = h / 2 + 150
    sl_el = (f'<text x="{cx}" y="{sy}" text-anchor="middle" '
             f'font-family="Manrope, Carlito, sans-serif" font-size="46" '
             f'font-weight="500" letter-spacing="1" fill="{sl}">'
             f'Apps que simplifican tu vida<tspan fill="{green}">.</tspan></text>')
    body = icon_el + wm_el + sl_el
    return svg(w, h, body, bg=bg)

if __name__ == "__main__":
    # contact sheet
    tiles = []
    y = 0
    rows = [
        ("horizontal full", horizontal('full'), '#FFFFFF'),
        ("horizontal tagline", horizontal('full', tagline=True), '#FFFFFF'),
        ("horizontal white", horizontal('white'), '#172338'),
        ("vertical full", vertical('full'), '#FFFFFF'),
        ("wordmark full", wordmark_only('full'), '#FFFFFF'),
        ("icon full", icon_only('full', square=True), '#FFFFFF'),
        ("grayscale", horizontal('grayscale'), '#FFFFFF'),
    ]
    import re
    parts = []
    yoff = 0
    CW = 1200
    for name, s, bg in rows:
        m = re.search(r'width="([\d.]+)" height="([\d.]+)"', s)
        w0, h0 = float(m.group(1)), float(m.group(2))
        scale = min(CW / w0, 300 / h0)
        dw, dh = w0 * scale, h0 * scale
        inner = s.split('>', 1)[1].rsplit('</svg>', 1)[0]
        parts.append(f'<g transform="translate(0 {yoff})">'
                     f'<rect width="{CW}" height="{dh+40}" fill="{bg}"/>'
                     f'<g transform="translate(20 20) scale({scale})" '
                     f'viewBox="0 0 {w0} {h0}">'
                     f'<svg x="0" y="0" width="{w0}" height="{h0}" '
                     f'viewBox="0 0 {w0} {h0}">{inner}</svg></g></g>')
        yoff += dh + 40
    sheet = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{CW}" height="{yoff}" '
             f'viewBox="0 0 {CW} {yoff}">{"".join(parts)}</svg>')
    open("build/contact.svg", "w").write(sheet)
    print("ok", yoff)
