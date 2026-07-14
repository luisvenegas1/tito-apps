# Tito Apps — Brand Kit oficial

Única **fuente de verdad** de la identidad visual de Tito Apps.

> **Regla de oro:** si cambia un logo, un color o un ícono, primero se actualiza
> `brand/`. Luego `packages/brand` (el paquete de código) consume esos cambios.
> **Nunca al revés.**

## Identidad

- **Marca:** TitoApps — *"Apps que simplifican tu vida."*
- **Verde:** `#3CC54A` · **Tinta profunda (azul oscuro):** `#172338`
- **Acentos:** naranja `#F97316` · morado `#8B5CF6` (uso ocasional) · azul `#2563EB`
- **Tipografía única:** Inter (toda la plataforma).

## Estructura

```
brand/
├── logo/      # logotipos (svg + png, todas las variantes)
├── icon/      # isotipo para íconos de app
├── favicon/   # favicon + touch/android icons
├── pwa/       # maskable icons + site.webmanifest
├── social/    # og-image / social-preview
├── docs/      # brand-guide.md, brand-guide.pdf, colors.pdf
└── Old/       # versiones históricas (archivo, no usar)
```

Cada subcarpeta tiene su `README.md` con el listado exacto de archivos. El manual
completo está en `docs/brand-guide.md` (+ PDF).

## Relación con el código

`packages/brand` solo contiene lo que el código necesita (tokens, `applyBrand`,
preset de Tailwind, `AppBrand`, `brands/`, SVG mínimos de UI). Esos SVG mínimos se
**sincronizan desde aquí**; no se diseñan en el paquete.
