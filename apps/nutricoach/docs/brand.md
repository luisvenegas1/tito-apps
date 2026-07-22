# Brand kit — NutriCoach

Identidad visual de NutriCoach dentro del ecosistema **Tito Apps**.

## Personaje

Un aguacate-coach: cuerpo de aguacate con **vincha deportiva** (naranja) y cara amable. Transmite salud + acompañamiento (coach), sin ser una app fría de números. El logo lo entregó el usuario; para íconos pequeños se usa una versión **vectorial redibujada** (nítida a cualquier tamaño).

## Colores

| Rol | Hex | Uso |
|-----|-----|-----|
| Verde primario | `#3FA535` | Marca, botones, acentos "Nutri". |
| Verde contorno / hover | `#2F7D34` | Bordes del personaje, hover del primario. |
| Verde claro (cuerpo) | `#C3DB57` | Relleno del aguacate. |
| Azul marino (secundario) | `#1E3A5F` | Wordmark "Coach", textos fuertes. |
| Naranja (acento) | `#F26E36` | Vincha, silbato, detalles de energía. |
| Café (semilla) | `#8B5A2B` | Semilla del aguacate. |
| Fondo de ícono | `#F1FBEA` | Verde muy claro del app icon. |

Estos valores están en `packages/brand/src/brands/nutricoach.ts` (`nutricoachBrand`) y se inyectan como design tokens con `applyBrand`.

## Tipografía

**Inter** (heredada de Tito Apps). Wordmark en peso 800: "Nutri" en verde `#3FA535` + "Coach" en azul `#1E3A5F`.

## Archivos (en `apps/nutricoach/public/`)

| Archivo | Qué es |
|---------|--------|
| `logo.svg` | Logo completo (personaje + wordmark) — usado en el login. |
| `mascot.svg` / `favicon.svg` | Solo el personaje, vectorial. |
| `icon.svg` | Personaje sobre cuadro redondeado (base de los íconos de app). |
| `icon-192.png`, `icon-512.png` | Íconos PWA (manifest). |
| `apple-touch-icon.png` | Ícono para iOS (180×180). |
| `favicon.ico`, `favicon-32.png`, `favicon-16.png` | Favicons. |

### Usar tu imagen original

El login carga `/logo.png` y, si no existe, cae al `/logo.svg` redibujado. Para usar **tu PNG original**, guardalo como `apps/nutricoach/public/logo.png` y aparece automáticamente. Igual, si querés regenerar los íconos desde tu PNG en vez del vector, se puede.

## Uso

- No deformar el personaje ni cambiarle los colores de la vincha.
- Sobre fondos oscuros, usar el personaje con su contorno verde (ya lo tiene).
- El favicon/ícono pequeño usa solo el personaje (sin wordmark) para que se lea.
