#!/usr/bin/env python3
"""
Regenera el Brand Kit de Tito Apps en PDF usando **Inter real** (tu Mac).

- Fuente de contenido: brand/docs/brand-guide.md (paleta parseada desde ahí).
- Genera: brand/docs/brand-guide.pdf (8 pág) y brand/docs/colors.pdf (2 pág).
- Antes de reemplazar: respalda los PDFs actuales en brand/Old/.
- Verifica que Inter (.ttf) esté instalada; si no, se detiene con instrucciones.
- NO toca packages/brand, GolPay, SplitPay ni MoneyTrack.

Uso:
    cd /Users/Tito/proyectosWeb
    pip3 install reportlab            # si hace falta
    python3 scripts/build-brand-pdfs.py
"""
import os, re, sys, glob, shutil, colorsys, datetime
from pathlib import Path

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_LEFT
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                    TableStyle, PageBreak, Preformatted, Flowable)
    from reportlab.lib.styles import ParagraphStyle
except ImportError:
    sys.exit("Falta reportlab. Instalalo con:  pip3 install reportlab")

# ---------------------------------------------------------------- rutas
def find_base():
    for cand in [Path.cwd(), Path(__file__).resolve().parent, *Path(__file__).resolve().parents]:
        if (cand / "brand" / "docs" / "brand-guide.md").exists():
            return cand
    sys.exit("No encontré brand/docs/brand-guide.md. Ejecutá el script desde el monorepo.")

BASE = find_base()
DOCS = BASE / "brand" / "docs"
OLD = BASE / "brand" / "Old"
MD = DOCS / "brand-guide.md"

# ---------------------------------------------------------------- Inter (.ttf)
FONT_DIRS = [Path.home() / "Library/Fonts", Path("/Library/Fonts"),
             Path("/System/Library/Fonts/Supplemental"),
             Path(__file__).resolve().parent / "fonts"]
if os.environ.get("INTER_FONT_DIR"):
    FONT_DIRS.insert(0, Path(os.environ["INTER_FONT_DIR"]))

def find_ttf(patterns):
    for d in FONT_DIRS:
        if not d.exists():
            continue
        for pat in patterns:
            hits = sorted(glob.glob(str(d / pat)))
            hits = [h for h in hits if h.lower().endswith(".ttf")]  # reportlab no incrusta OTF/CFF
            if hits:
                return hits[0]
    return None

INSTALL_MSG = """
====================================================================
  Inter (.ttf) no está instalada. El script se detuvo SIN cambios.
====================================================================
Instalá Inter en formato TTF (reportlab no incrusta el .otf de Inter):

  Opción A — Google Fonts (recomendada, trae .ttf):
    1. Abrí https://fonts.google.com/specimen/Inter
    2. "Get font" → "Download all" → descomprimí el zip.
    3. Instalá los estáticos (carpeta "static/"): Inter-Regular.ttf,
       Inter-Bold.ttf, Inter-SemiBold.ttf, Inter-ExtraBold.ttf, Inter-Italic.ttf
       (doble clic → "Instalar fuente" en Font Book).

  Opción B — sin instalar en el sistema:
    Poné los .ttf en una carpeta y exportá la ruta:
      export INTER_FONT_DIR=/ruta/a/tus/inter-ttf
    o dejalos en:  scripts/fonts/

  Opción C — Homebrew:
    brew install --cask font-inter
    (si instala .otf, usá igual la Opción A para tener .ttf)

Volvé a correr:  python3 scripts/build-brand-pdfs.py
"""

reg = find_ttf(["Inter-Regular.ttf", "Inter_*-Regular.ttf", "Inter*Regular*.ttf"])
bold = find_ttf(["Inter-Bold.ttf", "Inter_*-Bold.ttf", "Inter*Bold*.ttf"])
if not reg or not bold:
    sys.exit(INSTALL_MSG)
semi = find_ttf(["Inter-SemiBold.ttf", "Inter_*-SemiBold.ttf"]) or bold
xbold = find_ttf(["Inter-ExtraBold.ttf", "Inter_*-ExtraBold.ttf"]) or bold
ital = find_ttf(["Inter-Italic.ttf", "Inter_*-Italic.ttf"]) or reg

pdfmetrics.registerFont(TTFont("Inter", reg))
pdfmetrics.registerFont(TTFont("Inter-Bold", bold))
pdfmetrics.registerFont(TTFont("Inter-Semi", semi))
pdfmetrics.registerFont(TTFont("Inter-XBold", xbold))
pdfmetrics.registerFont(TTFont("Inter-It", ital))
BODY, BOLD, SEMI, XBOLD, ITAL, MONO = "Inter", "Inter-Bold", "Inter-Semi", "Inter-XBold", "Inter-It", "Courier"
print(f"Inter encontrada:\n  regular:  {reg}\n  bold:     {bold}\n  extrabold:{xbold}")

# ---------------------------------------------------------------- paleta desde el .md
def parse_palette(md_text):
    groups = {"principales": [], "neutros": [], "acentos": [], "grises": []}
    current = None
    for line in md_text.splitlines():
        s = line.strip()
        if s.startswith("###"):
            low = s.lower()
            current = ("principales" if "principal" in low else
                       "neutros" if "neutro" in low else
                       "acentos" if "acento" in low else
                       "grises" if "gris" in low else None)
            continue
        if current and s.startswith("|") and "#" in s:
            cells = [c.strip().strip("`") for c in s.strip("|").split("|")]
            hexes = [c for c in cells if re.fullmatch(r"#[0-9A-Fa-f]{6}", c)]
            if not hexes:
                continue
            hexv = hexes[0]
            name = cells[0]
            if name.lower() in ("color", "elemento"):
                continue
            hidx = cells.index(hexv)
            use = cells[1] if hidx > 1 and not cells[1].startswith("#") else ""
            groups[current].append((name, colors.HexColor(hexv), use))
    return groups

PAL = parse_palette(MD.read_text(encoding="utf-8"))
# Fallback defensivo si el parseo fallara:
if not PAL["principales"]:
    PAL["principales"] = [("Verde TitoApps", colors.HexColor("#3CC54A"), "Marca / acento"),
                          ("Tinta Profunda", colors.HexColor("#172338"), "Texto / logotipo")]

def get(group, needle, default):
    for n, c, _ in PAL.get(group, []):
        if needle.lower() in n.lower():
            return c
    return colors.HexColor(default)

GREEN = get("principales", "verde", "#3CC54A")
INK = get("principales", "tinta", "#172338")
SLATE50 = get("neutros", "slate 50", "#F8FAFC")
SLATE200 = get("neutros", "slate 200", "#E2E8F0")
SLATE400 = get("neutros", "slate 400", "#94A3B8")
SLATE600 = get("neutros", "slate 600", "#475569")
WHITE = colors.HexColor("#FFFFFF")
PURPLE = get("acentos", "morado", "#8B5CF6")

# ---------------------------------------------------------------- helpers color
def hx(c): return "#%02X%02X%02X" % (round(c.red*255), round(c.green*255), round(c.blue*255))
def rgb_str(c): return "rgb(%d, %d, %d)" % (round(c.red*255), round(c.green*255), round(c.blue*255))
def hsl_str(c):
    h, l, s = colorsys.rgb_to_hls(c.red, c.green, c.blue)
    return "hsl(%d, %d%%, %d%%)" % (round(h*360), round(s*100), round(l*100))

# ---------------------------------------------------------------- estilos
st = {
 "h1": ParagraphStyle("h1", fontName=XBOLD, fontSize=20, textColor=INK, spaceAfter=10, leading=24),
 "h2": ParagraphStyle("h2", fontName=BOLD, fontSize=13, textColor=GREEN, spaceBefore=14, spaceAfter=6, leading=16),
 "body": ParagraphStyle("body", fontName=BODY, fontSize=10, textColor=SLATE600, leading=15, spaceAfter=6, alignment=TA_LEFT),
 "small": ParagraphStyle("small", fontName=BODY, fontSize=8.5, textColor=SLATE400, leading=12),
 "note": ParagraphStyle("note", fontName=ITAL, fontSize=9, textColor=INK, leading=13, spaceBefore=4, spaceAfter=4, leftIndent=8, borderPadding=6, backColor=SLATE50),
}

class SafeZone(Flowable):
    def __init__(self, w=150*mm, h=42*mm): self.width, self.height = w, h
    def draw(self):
        c = self.canv
        c.setStrokeColor(SLATE400); c.setLineWidth(1); c.setDash(3, 3); c.rect(0, 0, self.width, self.height); c.setDash()
        m = 14*mm
        c.setStrokeColor(SLATE200); c.setFillColor(SLATE50); c.setLineWidth(1)
        c.roundRect(m, m, self.width-2*m, self.height-2*m, 4, fill=1)
        c.setFillColor(GREEN); c.circle(m+12*mm, self.height-m-6*mm, 3, fill=1)
        c.setFillColor(INK); c.setFont(BOLD, 16); c.drawString(m+8*mm, self.height/2-3*mm, "t.  titoapps")
        c.setFillColor(SLATE400); c.setFont(BODY, 8)
        c.drawString(2*mm, self.height/2, "X"); c.drawString(self.width-5*mm, self.height/2, "X")
        c.drawCentredString(self.width/2, self.height-5*mm, "X = diametro del punto verde")

def swatches(items, big=False):
    rows, style = [], [("FONTNAME", (0,0), (-1,-1), BODY), ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
                       ("LINEBELOW", (1,0), (-1,-1), 0.5, SLATE200),
                       ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6),
                       ("LEFTPADDING", (1,0), (-1,-1), 8)]
    for i, (name, col, uso) in enumerate(items):
        if big:
            rows.append(["", Paragraph(f"<b>{name}</b>", st["body"]),
                         Paragraph(f"{hx(col)}<br/>{rgb_str(col)}<br/>{hsl_str(col)}", st["small"]),
                         Paragraph(uso, st["small"])])
        else:
            rows.append(["", Paragraph(f"<b>{name}</b>", st["body"]), Paragraph(hx(col), st["small"]),
                         Paragraph(rgb_str(col), st["small"]), Paragraph(uso, st["small"])])
        style.append(("BACKGROUND", (0,i), (0,i), col))
        if hx(col) == "#FFFFFF":
            style.append(("BOX", (0,i), (0,i), 0.5, SLATE200))
    widths = [26*mm, 42*mm, 48*mm, 56*mm] if big else [16*mm, 40*mm, 26*mm, 40*mm, 40*mm]
    t = Table(rows, colWidths=widths, rowHeights=[(18*mm if big else 12*mm)]*len(rows))
    t.setStyle(TableStyle(style)); return t

def tbl(data, widths, header=True):
    s = [("FONTNAME", (0,0), (-1,-1), BODY), ("FONTSIZE", (0,0), (-1,-1), 9),
         ("TEXTCOLOR", (0,0), (-1,-1), SLATE600), ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
         ("LINEBELOW", (0,0), (-1,-1), 0.5, SLATE200),
         ("TOPPADDING", (0,0), (-1,-1), 5), ("BOTTOMPADDING", (0,0), (-1,-1), 5)]
    if header:
        s += [("FONTNAME", (0,0), (-1,0), BOLD), ("TEXTCOLOR", (0,0), (-1,0), INK), ("LINEBELOW", (0,0), (-1,0), 1, INK)]
    t = Table(data, colWidths=widths); t.setStyle(TableStyle(s)); return t

def cover(c, doc):
    c.saveState(); W, H = A4
    c.setFillColor(INK); c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(GREEN); c.rect(0, H-8*mm, W, 8*mm, fill=1, stroke=0)
    c.setFillColor(WHITE); c.setFont(XBOLD, 46); c.drawString(24*mm, H-90*mm, "tito")
    tw = c.stringWidth("tito", XBOLD, 46)
    c.setFillColor(GREEN); c.drawString(24*mm+tw, H-90*mm, "apps")
    aw = c.stringWidth("apps", XBOLD, 46)
    c.circle(24*mm+tw+aw+4*mm, H-78*mm, 3.2*mm, fill=1)
    c.setFillColor(WHITE); c.setFont(XBOLD, 22); c.drawString(24*mm, H-110*mm, "Manual de Marca")
    c.setFillColor(SLATE400); c.setFont(BODY, 12); c.drawString(24*mm, H-120*mm, "Apps que simplifican tu vida.")
    c.setFont(BODY, 10); c.drawString(24*mm, 24*mm, "Version 1.1  ·  Guia de identidad visual  ·  Tipografia: Inter")
    c.restoreState()

def footer(c, doc):
    c.saveState(); W, _ = A4
    c.setStrokeColor(SLATE200); c.setLineWidth(0.5); c.line(24*mm, 16*mm, W-24*mm, 16*mm)
    c.setFillColor(SLATE400); c.setFont(BODY, 8)
    c.drawString(24*mm, 11*mm, "TitoApps — Manual de Marca")
    c.drawRightString(W-24*mm, 11*mm, "pag. %d" % doc.page)
    c.setFillColor(GREEN); c.circle(W/2, 12.5*mm, 1.4*mm, fill=1); c.restoreState()

def code_style(name):
    return ParagraphStyle(name, fontName=MONO, fontSize=8, textColor=INK, leading=12, backColor=SLATE50, borderPadding=6)

# ---------------------------------------------------------------- guide
def build_guide():
    doc = SimpleDocTemplate(str(DOCS/"brand-guide.pdf"), pagesize=A4, leftMargin=24*mm, rightMargin=24*mm,
                            topMargin=22*mm, bottomMargin=22*mm, title="TitoApps — Manual de Marca", author="Tito Apps")
    S = [PageBreak(),
         Paragraph("1. Concepto", st["h1"]),
         Paragraph("TitoApps es un estudio de aplicaciones que hacen la vida cotidiana mas simple. La identidad se "
                   "construye sobre una idea central: <b>simplicidad amigable con caracter tecnologico</b>. Nada sobra. "
                   "Cada forma es geometrica, redondeada y calida, para transmitir cercania sin perder precision.", st["body"]),
         Paragraph("La marca gira en torno a un isotipo memorable —una <b>\"t\" minuscula con un punto verde</b>— "
                   "acompanado de un logotipo geometrico que combina con ese simbolo.", st["body"]),
         Paragraph("2. Significado del logo", st["h2"]),
         Paragraph("<b>El isotipo \"t.\"</b> — la \"t\" es la inicial de Tito; trazos redondeados que transmiten "
                   "movimiento y amabilidad. El <b>punto verde</b> arriba a la derecha es la \"chispa\": la accion. "
                   "Siempre va a la derecha.", st["body"]),
         Paragraph("<b>El logotipo \"titoapps\"</b> — una palabra en minusculas. \"tito\" en tinta (base, confianza) y "
                   "\"apps\" en verde (producto, energia). Letras monolineales, geometricas, redondeadas.", st["body"]),
         PageBreak(),
         Paragraph("3. Paleta de colores", st["h1"]),
         Paragraph("Principales", st["h2"]), swatches(PAL["principales"]),
         Paragraph("Neutros", st["h2"]), swatches(PAL["neutros"] + ([("Blanco", WHITE, "Fondos y logo invertido")]
                    if not any("blanco" in n.lower() for n, _, _ in PAL["neutros"]) else [])),
         Paragraph("Acentos (usar con moderacion)", st["h2"]), swatches(PAL["acentos"]),
         Paragraph("<b>Contraste:</b> Tinta sobre blanco y Blanco sobre Tinta cumplen AA/AAA. El Verde es acento; "
                   "para texto pequeno sobre blanco, preferir la Tinta.", st["note"]),
         PageBreak(),
         Paragraph("4. Tipografia", st["h1"]),
         Paragraph("<b>Tipografia unica — Inter.</b> Una sola familia para toda la plataforma: marca, UI, documentos y "
                   "contenido. Sans-serif de excelente legibilidad en pantalla y movil. Menos complejidad, mas consistencia.", st["body"]),
         tbl([["Rol", "Peso"], ["Display / Titulares", "ExtraBold (800)"], ["Encabezados", "Bold (700)"],
              ["Cuerpo destacado", "SemiBold (600) / Medium (500)"], ["Cuerpo", "Regular (400)"]], [70*mm, 82*mm]),
         Paragraph("Fallback: <font name='%s'>Inter, -apple-system, \"Segoe UI\", Roboto, Arial, sans-serif</font>" % MONO, st["small"]),
         Paragraph("El logotipo no depende de la fuente: esta trazado como vectores. El slogan se compone en Inter.", st["note"]),
         Paragraph("5. Versiones oficiales", st["h2"]),
         tbl([["Version", "Archivo", "Cuando usarla"], ["Vertical (principal)", "logo/logo.svg", "Uso por defecto"],
              ["Horizontal", "logo/logo-horizontal.svg", "Headers, firmas, anchos"],
              ["Solo texto", "logo/logo-wordmark.svg", "Isotipo ya cerca"],
              ["Solo icono", "icon/icon.svg", "Avatares, favicons, app icons"]], [40*mm, 55*mm, 57*mm]),
         PageBreak(),
         Paragraph("6. Zona de seguridad", st["h1"]),
         Paragraph("Manten un area libre alrededor del logo igual al <b>diametro del punto verde</b> (X). "
                   "Ningun texto, imagen o borde debe invadir esa zona.", st["body"]),
         Spacer(1, 4), SafeZone(), Spacer(1, 8),
         Paragraph("7. Tamano minimo", st["h2"]),
         tbl([["Elemento", "Digital", "Impreso"], ["Logo horizontal", "120 px ancho", "25 mm"],
              ["Logo vertical", "96 px ancho", "20 mm"], ["Solo texto", "90 px ancho", "18 mm"],
              ["Isotipo", "24 px", "6 mm"], ["Favicon", "16 px (minimo)", "—"]], [55*mm, 48*mm, 49*mm]),
         PageBreak(),
         Paragraph("8. Usos correctos e incorrectos", st["h1"])]
    ok = ["Usa siempre los archivos oficiales de brand/.", "Da al logo espacio de sobra (zona de seguridad).",
          "Fondos claros: full color o negro. Oscuros/fotos: blanco.", "El punto verde siempre arriba a la derecha.",
          "En correos usa PNG (logo-light/dark.png), no SVG."]
    bad = ["No cambies los colores ni recolorees \"apps\".", "No cambies proporciones ni lo estires.",
           "No rotes ni inclines el logo.", "No apliques sombras, degradados ni efectos.",
           "No muevas el punto verde a la izquierda.", "No reconstruyas el logotipo con otra fuente."]
    okp = [Paragraph(f"<font color='#16A34A'><b>Si</b></font>  {t}", st["small"]) for t in ok]
    badp = [Paragraph(f"<font color='#EF4444'><b>No</b></font>  {t}", st["small"]) for t in bad]
    n = max(len(okp), len(badp)); okp += [Paragraph("", st["small"])]*(n-len(okp)); badp += [Paragraph("", st["small"])]*(n-len(badp))
    tt = Table([[a, b] for a, b in zip(okp, badp)], colWidths=[76*mm, 76*mm])
    tt.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "TOP"), ("TOPPADDING", (0,0), (-1,-1), 4), ("BOTTOMPADDING", (0,0), (-1,-1), 4)]))
    S += [tt, PageBreak(),
          Paragraph("9. Estructura del Brand Kit", st["h1"]),
          Paragraph("Coincide exactamente con las carpetas reales:", st["body"]),
          Preformatted("brand/\n  logo/      logotipos (svg + png, todas las variantes)\n"
                       "  icon/      isotipo para iconos de app\n  favicon/   favicon + touch/android icons\n"
                       "  pwa/       maskable icons + site.webmanifest\n  social/    og-image / social-preview\n"
                       "  docs/      brand-guide.md, brand-guide.pdf, colors.pdf\n  Old/       versiones historicas (no usar)",
                       ParagraphStyle("tree", fontName=MONO, fontSize=9, textColor=INK, leading=13, backColor=SLATE50, borderPadding=8)),
          Paragraph("Cada subcarpeta tiene su README.md. El indice general esta en brand/README.md.", st["small"]),
          Paragraph("10. Como crece la identidad", st["h2"]),
          Paragraph("Tito Apps es la marca madre. Cada producto (GolPay verde, SplitPay azul, MoneyTrack por definir) "
                    "tiene color dominante propio pero comparte el sistema: tokens, escalas, Inter y componentes. Para una "
                    "nueva app: define su color, crea su AppBrand en packages/brand y reusa @titoapps/ui. brand/ es la unica "
                    "fuente de verdad.", st["body"]),
          PageBreak(),
          Paragraph("11. Implementacion rapida", st["h1"]),
          Paragraph("Fuente (Inter):", st["h2"]),
          Preformatted("@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');", code_style("c1")),
          Paragraph("Favicons y PWA (index.html):", st["h2"]),
          Preformatted('<link rel="icon" href="/favicon.ico" sizes="any">\n'
                       '<link rel="icon" type="image/svg+xml" href="/favicon.svg">\n'
                       '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">\n'
                       '<link rel="manifest" href="/site.webmanifest">\n'
                       '<meta name="theme-color" content="#172338">', code_style("c2")),
          Paragraph("Tokens de color (CSS):", st["h2"]),
          Preformatted(":root {\n  --tito-green: %s;\n  --tito-ink:   %s;\n  --accent-purple: %s;\n  --accent-orange: #F97316;\n}"
                       % (hx(GREEN), hx(INK), hx(PURPLE)), code_style("c3")),
          Spacer(1, 10),
          Paragraph("TitoApps — Simplicidad, velocidad, confianza. Pensado para ti.", st["note"])]
    doc.build(S, onFirstPage=cover, onLaterPages=footer)

def build_colors():
    doc = SimpleDocTemplate(str(DOCS/"colors.pdf"), pagesize=A4, leftMargin=24*mm, rightMargin=24*mm,
                            topMargin=24*mm, bottomMargin=22*mm, title="TitoApps — Paleta", author="Tito Apps")
    neutros = PAL["neutros"] + ([("Blanco", WHITE, "Fondos")] if not any("blanco" in n.lower() for n, _, _ in PAL["neutros"]) else [])
    S = [Paragraph("TitoApps — Paleta de color", st["h1"]),
         Paragraph("Valores oficiales en HEX, RGB y HSL.", st["body"]), Spacer(1, 6),
         Paragraph("Principales", st["h2"]), swatches(PAL["principales"], big=True),
         Paragraph("Neutros", st["h2"]), swatches(neutros, big=True), PageBreak(),
         Paragraph("Acentos", st["h2"]), swatches(PAL["acentos"], big=True),
         Paragraph("Escala de grises (monocromo tonal)", st["h2"]), swatches(PAL["grises"], big=True)]
    doc.build(S, onFirstPage=footer, onLaterPages=footer)

# ---------------------------------------------------------------- backup + build
def backup():
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    dest = OLD / f"pdf-backup-{stamp}"; dest.mkdir(parents=True, exist_ok=True)
    for f in ("brand-guide.pdf", "colors.pdf"):
        src = DOCS / f
        if src.exists():
            shutil.copy2(src, dest / f)
    print(f"Backup de PDFs actuales -> {dest}")

if __name__ == "__main__":
    print(f"Base del repo: {BASE}")
    backup()
    build_guide()
    build_colors()
    print("OK. Generados:")
    print(f"  {DOCS/'brand-guide.pdf'}")
    print(f"  {DOCS/'colors.pdf'}")
    print("Verificá la fuente con:  python3 scripts/check-fonts.py")
