# TitoApps — Manual de Marca

**Apps que simplifican tu vida.**

Versión 1.0 · Guía de identidad visual

---

## 1. Concepto

TitoApps es un estudio de aplicaciones que hacen la vida cotidiana más simple. La identidad se construye sobre una idea central: **simplicidad amigable con carácter tecnológico**. Nada sobra. Cada forma es geométrica, redondeada y cálida, para transmitir cercanía sin perder precisión.

La marca gira en torno a un isotipo memorable —una **"t" minúscula con un punto verde**— acompañado de un logotipo geométrico dibujado a medida que combina perfectamente con ese símbolo.

---

## 2. Significado del logo

**El isotipo "t·"**

- La **"t"** es la inicial de *Tito*. Sus trazos redondeados y su base curvada hacia la derecha transmiten movimiento, amabilidad y una sensación humana, no rígida.
- El **punto verde** situado arriba a la derecha funciona como "chispa": representa la acción, el encendido de una app, la señal de que algo está *vivo y funcionando*. Es el elemento distintivo y siempre va a la derecha.
- Juntos, símbolo y punto forman una unidad sencilla que se reconoce incluso a 16 px.

**El logotipo "titoapps"**

- Se escribe en **una sola palabra en minúsculas**, sin espacio, reforzando la idea de simplicidad y accesibilidad.
- **"tito"** en tinta profunda (la base, la confianza) y **"apps"** en verde (el producto, la energía). El cambio de color divide el nombre sin romper la unidad.
- Las letras son **monolineales, geométricas y de terminaciones redondeadas**, en armonía con el isotipo.

---

## 3. Paleta de colores

### Colores principales

| Color | Uso | HEX | RGB |
|---|---|---|---|
| Verde TitoApps | Color de marca / acento, "apps", el punto | `#3CC54A` | `rgb(60, 197, 74)` |
| Tinta Profunda | Logotipo "tito", texto principal | `#172338` | `rgb(23, 35, 56)` |

### Neutros

| Color | Uso | HEX | RGB |
|---|---|---|---|
| Slate 600 | Texto secundario | `#475569` | `rgb(71, 85, 105)` |
| Slate 400 | Texto atenuado / placeholders | `#94A3B8` | `rgb(148, 163, 184)` |
| Slate 200 | Bordes y divisores | `#E2E8F0` | `rgb(226, 232, 240)` |
| Slate 50 | Fondos suaves | `#F8FAFC` | `rgb(248, 250, 252)` |
| Blanco | Fondos y logo invertido | `#FFFFFF` | `rgb(255, 255, 255)` |

### Acentos (usar con moderación, para detalles y tags)

| Color | Sugerido para | HEX | RGB |
|---|---|---|---|
| Azul | Información, enlaces | `#2563EB` | `rgb(37, 99, 235)` |
| Morado | Etiquetas "Pro" / destacados | `#7C3AED` | `rgb(124, 58, 237)` |
| Naranja | Advertencias / promociones | `#F97316` | `rgb(249, 115, 22)` |

### Escala de grises (versión monocroma tonal)

| Elemento | HEX | RGB |
|---|---|---|
| Tinta | `#1E2632` | `rgb(30, 38, 50)` |
| Acento gris (sustituye al verde) | `#9AA3AD` | `rgb(154, 163, 173)` |

> **Contraste:** la Tinta Profunda sobre blanco y el Blanco sobre Tinta cumplen holgadamente AA/AAA. El Verde TitoApps se usa como acento; para texto pequeño sobre blanco, preferir la Tinta.

---

## 4. Tipografía

**Tipografía principal — Manrope**
Sans-serif geométrica y moderna. Se usa para titulares, UI y todo lo que sea marca.

- Display / Titulares: ExtraBold (800)
- Encabezados: Bold (700)
- Cuerpo destacado: Medium (500)
- Cuerpo: Regular (400)

**Tipografía secundaria — Inter**
Para textos largos, documentos y contenido denso donde prima la legibilidad.

**Fallback del sistema:** `Manrope, Inter, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`

> El **logotipo** de la marca no depende de la fuente: está **trazado como vectores** (paths), por lo que se ve idéntico en cualquier dispositivo aunque Manrope no esté instalada. El slogan sí se compone en Manrope.

```css
/* Vía Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=Inter:wght@400;500;600&display=swap');
```

---

## 5. Versiones oficiales

| Versión | Archivo | Cuándo usarla |
|---|---|---|
| Horizontal (principal) | `logo/logo.svg` · `logo-horizontal.svg` | Uso por defecto: webs, headers, firmas |
| Vertical | `logo/logo-vertical.svg` | Espacios cuadrados o estrechos, portadas |
| Solo texto (wordmark) | `logo/logo-wordmark.svg` | Cuando el isotipo ya aparece cerca |
| Solo icono (isotipo) | `icon/icon.svg` | Avatares, favicons, app icons |

**Variantes de color** (todas disponibles en horizontal):

| Variante | Archivo | Fondo recomendado |
|---|---|---|
| Full color | `logo/logo.svg` | Claro |
| Blanco | `logo/logo-white.svg` · `logo-monochrome-white.svg` | Oscuro / foto |
| Negro (tinta) | `logo/logo-black.svg` | Claro, un solo color |
| Monocromo negro puro | `logo/logo-monochrome-black.svg` | Grabado, fax, sello |
| Escala de grises | `logo/logo-grayscale.svg` | Documentos B/N |

---

## 6. Zona de seguridad (espaciado)

Mantén siempre un área libre alrededor del logo para que respire y no compita con otros elementos.

- **Regla:** el margen mínimo en los cuatro lados equivale al **diámetro del punto verde** del isotipo (llámalo `X`).
- Ningún texto, imagen o borde debe invadir esa zona.
- En el lockup horizontal, esa misma medida `X` define también la separación entre el isotipo y el logotipo.

```
┌───────────────────────────────┐
│      ← X →                     │   X = diámetro del punto verde
│   ┌───────────────────────┐    │
│ X │   t·   titoapps       │ X  │
│   └───────────────────────┘    │
│              ← X →              │
└───────────────────────────────┘
```

---

## 7. Tamaño mínimo

Para garantizar legibilidad, no reduzcas el logo por debajo de estos valores:

| Elemento | Digital | Impreso |
|---|---|---|
| Logo horizontal completo | 120 px de ancho | 25 mm |
| Logo vertical | 96 px de ancho | 20 mm |
| Solo texto (wordmark) | 90 px de ancho | 18 mm |
| Isotipo (icono) | 24 px | 6 mm |
| Favicon | 16 px (mínimo absoluto) | — |

Por debajo del tamaño mínimo del logo completo, usa **solo el isotipo**.

---

## 8. Usos correctos

- Usa siempre los archivos oficiales de esta carpeta.
- Da al logo espacio de sobra (ver zona de seguridad).
- Sobre fondos claros: versión full color o negra. Sobre fondos oscuros o fotos: versión blanca.
- El punto verde va **siempre arriba a la derecha**.
- Para íconos de app y favicons, usa las teselas con fondo tinta (`favicon/`) que garantizan contraste.
- En correos (Supabase, newsletters) usa **PNG** (`logo/logo-light.png` o `logo-dark.png`), no SVG: muchos clientes de correo no renderizan SVG.

## 9. Usos incorrectos

- ❌ No cambies los colores del logo ni recolorees "apps".
- ❌ No cambies las proporciones ni lo estires/comprimas.
- ❌ No rotes ni inclines el logo.
- ❌ No apliques sombras, degradados, contornos ni efectos.
- ❌ No muevas el punto verde ni lo pongas a la izquierda.
- ❌ No coloques el logo full color sobre fondos de bajo contraste o fotos cargadas (usa la versión blanca).
- ❌ No reconstruyas el logotipo con otra fuente: usa el vector oficial.
- ❌ No encierres el logo en cajas ni lo pegues a otros elementos sin respetar la zona de seguridad.

---

## 10. Estructura de archivos

```
brand/
├── logo/
│   ├── logo.svg                    # principal (horizontal, full color)
│   ├── logo-horizontal.svg
│   ├── logo-vertical.svg
│   ├── logo-wordmark.svg           # solo texto
│   ├── logo-white.svg
│   ├── logo-black.svg
│   ├── logo-grayscale.svg
│   ├── logo-monochrome-black.svg
│   ├── logo-monochrome-white.svg
│   ├── logo.png                    # 3000×3000, transparente
│   ├── logo-light.png              # sobre fondo blanco
│   └── logo-dark.png               # sobre fondo tinta
├── icon/
│   ├── icon.svg
│   ├── icon-white.svg
│   ├── icon-black.svg
│   ├── icon.png                    # 1024, transparente
│   ├── icon-light.png              # tesela clara
│   └── icon-dark.png               # tesela oscura
├── favicon/
│   ├── favicon.svg
│   ├── favicon.ico                 # 16/32/48
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── favicon-48x48.png
│   ├── apple-touch-icon.png        # 180×180
│   ├── android-chrome-192x192.png
│   └── android-chrome-512x512.png
├── pwa/
│   ├── maskable-icon.svg
│   ├── maskable-icon-192.png
│   └── maskable-icon-512.png
├── social/
│   ├── social-preview.png          # 1200×630, claro
│   ├── og-image.png                # 1200×630, oscuro
│   ├── social-preview.svg
│   └── og-image.svg
└── brand-guide.md
```

---

## 11. Implementación rápida

**Favicons y PWA (index.html):**

```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#172338">

<!-- Open Graph -->
<meta property="og:image" content="/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
```

**site.webmanifest:**

```json
{
  "name": "TitoApps",
  "short_name": "TitoApps",
  "description": "Apps que simplifican tu vida.",
  "theme_color": "#172338",
  "background_color": "#FFFFFF",
  "display": "standalone",
  "icons": [
    { "src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/maskable-icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/maskable-icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**Tokens de color (CSS):**

```css
:root {
  --tito-green: #3CC54A;
  --tito-ink:   #172338;
  --slate-600:  #475569;
  --slate-400:  #94A3B8;
  --slate-200:  #E2E8F0;
  --slate-50:   #F8FAFC;
}
```

---

*TitoApps — Simplicidad, velocidad, confianza. Pensado para ti.*
