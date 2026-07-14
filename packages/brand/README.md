# @titoapps/brand

Identidad y sistema de marca de **Tito Apps**. Provee el tipo `AppBrand`, los
brands de cada producto, el motor de tokens (variables CSS en 3 capas), el
control de tema claro/oscuro, el preset de Tailwind y los assets de la marca madre.

## Principio rector

> **Simplicidad.** Antes de agregar una variante, una prop, un token o una
> configuración, preguntarse: *"¿Realmente simplifica la vida del desarrollador
> y del usuario?"* Si la respuesta no es un sí claro, no se agrega.

## Arquitectura de marca

Tito Apps es una **marca fuerte por sí misma**, no un simple endorser. Su
presencia es elegante y discreta. El usuario confía tanto en Tito Apps como en
cada producto.

```
Tito Apps
├── GolPay      (verde dominante)
├── SplitPay    (azul dominante)  · mascota del billete EXCLUSIVA de SplitPay
└── MoneyTrack  (identidad por definir)
```

Comparten: sistema de tokens, escalas, roles semánticos, API y accesibilidad de
componentes. Conservan propio: color primario/secundario, logo, mascota y acentos.

## Paleta oficial (marca madre)

| Rol | Hex |
|-----|-----|
| Primary (verde) | `#3CC54A` |
| Secondary (azul oscuro) | `#172338` |
| Accent (naranja) | `#F97316` |
| Accent secundario (morado, ocasional) | `#8B5CF6` |

Neutrales: escala slate `#F8FAFC → #020617`.
Semánticos: success `#16A34A` · warning `#F59E0B` · danger `#EF4444` · info `#0EA5E9`.

## Tipografía

Una sola familia: **Inter** para toda la plataforma. Escala 12 · 14 · 16 · 18 ·
20 · 24 · 30 · 36 · 48.

## Escalas

- **Espaciado** (base 4px): 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- **Radios**: 6 · 8 · 12 · 16 · full.
- **Sombras**: sm · md · lg (tintadas en azul oscuro, sutiles).
- **Motion**: 120 / 200 / 320 ms · easing `cubic-bezier(.2,0,0,1)`.

## Tokens (3 capas)

1. **Primitivos** (`--tt-p-*`): valores crudos, no cambian por tema.
2. **Semánticos** (`--tt-primary`, `--tt-surface`, `--tt-fg`…): roles; cambian
   por tema y por marca.
3. **Componente** (`--tt-button-*`, `--tt-input-*`): los usan los componentes.

Ver `src/tokens.css`. Los componentes de `@titoapps/ui` solo tocan las capas 2 y 3.

## Uso en una app

```ts
// 1. tailwind.config.js
import preset from "@titoapps/brand/tailwind-preset";
export default {
  presets: [preset],
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
};
```

```ts
// 2. Arranque de la app
import "@titoapps/brand/tokens.css";
import { applyBrand, setTheme, golpayBrand } from "@titoapps/brand";
applyBrand(golpayBrand);   // inyecta los colores de la marca
setTheme("light");          // o "dark"
```

## Dark mode

`darkMode: ["class", '[data-theme="dark"]']`. El modo intercambia **solo** los
tokens semánticos. Controlado por `setTheme("dark")` / `toggleTheme()`.

## Agregar una nueva app

1. Crear `src/brands/<app>.ts` con su `AppBrand`.
2. Exportarla en `src/index.ts`.
3. En la app: `applyBrand(<app>Brand)` + su `tailwind.config` con el preset.

## Assets

En `assets/` (marca madre). Hoy son **provisionales**; reemplazar por los
oficiales. La mascota de SplitPay no vive aquí.
