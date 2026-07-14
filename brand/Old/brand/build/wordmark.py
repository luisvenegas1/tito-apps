#!/usr/bin/env python3
"""Geometric rounded logotype generator for 'titoapps'.
Monoline, round caps/joins, x-height = 100. Baseline at y=140.
Every glyph returns (svg, absolute_advance_x)."""

W = 26
R = W / 2
XTOP = 40
BASE = 140
MID = 90
ASC = 6
DESC = 184
BOWL_R = 37

def stroke(d, col):
    return (f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{W}" '
            f'stroke-linecap="round" stroke-linejoin="round"/>')

def ring(cx, cy, r, col):
    return (f'<path d="M {cx-r} {cy} A {r} {r} 0 1 1 {cx+r} {cy} '
            f'A {r} {r} 0 1 1 {cx-r} {cy} Z" fill="none" stroke="{col}" '
            f'stroke-width="{W}" stroke-linejoin="round"/>')

def dot(cx, cy, col):
    return f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="{col}"/>'

def g_t(x, c):
    sx = x + 24
    d = f'M {sx} {ASC} L {sx} {BASE-30} Q {sx} {BASE} {sx+30} {BASE}'
    bar = stroke(f'M {x+2} {XTOP+10} L {x+58} {XTOP+10}', c)
    return stroke(d, c) + bar, x + 74

def g_i(x, c):
    sx = x + R
    return stroke(f'M {sx} {XTOP} L {sx} {BASE}', c) + dot(sx, XTOP-28, c), x + 2*R + 6

def g_o(x, c):
    cx = x + BOWL_R
    return ring(cx, MID, BOWL_R, c), x + 2*BOWL_R + 8

def g_a(x, c):
    cx = x + BOWL_R
    sx = cx + BOWL_R
    return ring(cx, MID, BOWL_R, c) + stroke(f'M {sx} {XTOP} L {sx} {BASE}', c), sx + R + 6

def g_p(x, c):
    sx = x + R
    cx = sx + BOWL_R
    return (stroke(f'M {sx} {XTOP} L {sx} {DESC}', c) + ring(cx, MID, BOWL_R, c),
            cx + BOWL_R + R + 4)

def g_s(x, c):
    p = [
        (x+62, XTOP+16),
        (x+60, XTOP-2), (x+34, XTOP-4), (x+18, XTOP+12),
        (x+2,  XTOP+26), (x+8,  MID-4),  (x+32, MID+2),
        (x+52, MID+7),  (x+66, MID+16), (x+64, MID+32),
        (x+62, BASE-2), (x+34, BASE+4), (x+16, BASE-14),
    ]
    d = (f'M {p[0][0]} {p[0][1]} '
         f'C {p[1][0]} {p[1][1]} {p[2][0]} {p[2][1]} {p[3][0]} {p[3][1]} '
         f'C {p[4][0]} {p[4][1]} {p[5][0]} {p[5][1]} {p[6][0]} {p[6][1]} '
         f'C {p[7][0]} {p[7][1]} {p[8][0]} {p[8][1]} {p[9][0]} {p[9][1]} '
         f'C {p[10][0]} {p[10][1]} {p[11][0]} {p[11][1]} {p[12][0]} {p[12][1]}')
    return stroke(d, c), x + 70

GLYPHS = {'t': g_t, 'i': g_i, 'o': g_o, 'a': g_a, 'p': g_p, 's': g_s}
KERN = 16

def build(word, col):
    x = 0; parts = []
    for ch in word:
        el, adv = GLYPHS[ch](x, col)
        parts.append(el); x = adv + KERN
    return "".join(parts), x - KERN

def wordmark(ink="#172338", green="#3CC54A"):
    tito, w1 = build("tito", ink)
    apps, w2 = build("apps", green)
    gap = 30
    body = tito + f'<g transform="translate({w1+gap} 0)">{apps}</g>'
    return body, w1 + gap + w2, DESC

if __name__ == "__main__":
    body, total, h = wordmark()
    pad = 40
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" '
           f'viewBox="{-pad} 0 {total+2*pad} {h+pad}">'
           f'<rect x="{-pad}" y="0" width="{total+2*pad}" height="{h+pad}" fill="#fff"/>'
           f'{body}</svg>')
    open("build/wordmark_test.svg", "w").write(svg)
    print("total width", total)
