# Money Track — Identidad visual

Logo elegido: **Growth Bars** (barras ascendentes + línea de tendencia con flecha).

## Archivos

| Archivo | Uso |
|---------|-----|
| `money-track-icon.svg` | Ícono maestro (vectorial, esquinas redondeadas). Fuente de verdad. |
| `money-track-maskable.svg` | Versión full-bleed con zona segura, para íconos *maskable* de PWA/Android. |
| `favicon.svg` | Marca simplificada (línea + flecha) legible a tamaños mínimos. |
| `money-track-mono.svg` | Monocromática (un solo color, fondo transparente). Recolorea cambiando `fill`/`stroke`. |
| `money-track-lockup.svg` | Lockup horizontal (ícono + "MoneyTrack") para fondo claro. |
| `money-track-lockup-dark.svg` | Lockup horizontal para fondo oscuro. |
| `money-track-logo-concepts.html` | Comparativa de los 3 conceptos (referencia). |
| `icons/` | PNGs exportados: favicon 16/32/48, `favicon.ico`, apple-touch 180, icon 192/512, maskable 192/512. |
| `site.webmanifest` | Manifest PWA listo con íconos y colores. |

## Paleta

| Rol | Color |
|-----|-------|
| Navy (fondo/tinta) | `#0F172A` |
| Teal (acento oscuro / gradiente) | `#134E4A` · `#0E8A8A` |
| Emerald (primario / theme) | `#10B981` |
| Emerald 300 (acento claro) | `#34D399` |
| Mint (realces) | `#A7F3D0` |

- `theme_color`: `#10B981` · `background_color`: `#0F172A`

## Integración (Vite + PWA)

Copia `icons/`, `favicon.svg` y `site.webmanifest` a la carpeta `public/` del proyecto. En el `<head>` de `index.html`:

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/icons/favicon.ico" sizes="any" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<meta name="theme-color" content="#10B981" />
```

Con `vite-plugin-pwa`, pasa estos mismos íconos y colores en la sección `manifest` de la config en vez del `site.webmanifest` manual.

## Regenerar los PNG

Desde esta carpeta, con Node y `sharp` instalados, los PNG se exportan a partir de los SVG (ver el ícono maestro y el maskable como fuentes).
