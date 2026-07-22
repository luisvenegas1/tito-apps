# Sistema de diseño y UX

## Base: @titoapps/brand + @titoapps/ui

NutriCoach **no** inventa su propio sistema visual. Usa:

- **`@titoapps/brand`** — design tokens en 3 capas (primitivos → semánticos → componente) vía variables CSS, con `applyBrand(nutricoachBrand)` en el bootstrap. Se añade la marca `nutricoach` a `packages/brand/src/brands/`.
- **`@titoapps/ui`** — catálogo neutral: `Button`, `Card`, `Input`, `Select`, `Modal`, `Dialog`, `Toast`, `FormField`, `Badge`, `Spinner`, `Skeleton`, `EmptyState`, `PageHeader`, `Footer`, etc. Los componentes no conocen colores; el tema llega por tokens.

Solo se crean componentes en `apps/nutricoach/src/components/` cuando son específicos de esta app (ej. el velocímetro) y no tiene sentido generalizarlos aún.

## Marca NutriCoach

- **Color primario:** verde salud (se alinea con el verde del ecosistema Tito Apps, `--tt-p-green-500`), con acento para energía. La semántica de progreso (verde/amarillo/naranja/rojo) usa los tokens de sistema (`success/warning/accent/danger`).
- **Tipografía:** Inter (heredada del sistema).
- **Tono visual:** limpio, mucho espacio en blanco, tarjetas suaves, esquinas redondeadas, sombras sutiles.

## Principios de UX

1. **Un dato grande manda.** El velocímetro y las calorías restantes dominan; el resto es secundario.
2. **Menos números visibles.** Valores clave grandes + barras finas; el detalle numérico se revela al tocar.
3. **Acción principal siempre a mano.** Botón "Registrar comida" flotante/persistente.
4. **Registro en ≤3 toques** para el camino feliz (foto o frecuente).
5. **Estados vacíos amables** (`EmptyState`) que enseñan qué hacer.
6. **Skeletons, no spinners** para carga de contenido (percepción de velocidad).
7. **Feedback humano** vía `Toast` ("Registrado ✔, te falta proteína").

## Velocímetro (CalorieGauge)

Componente propio en `src/components/gauge/CalorieGauge.tsx`. SVG semicircular (180°).

- **Arco de fondo** en gradiente conceptual verde→amarillo→naranja→rojo (segmentado).
- **Aguja** que apunta según `consumed / target` (clamp a 0–1.2 para permitir mostrar exceso).
- **Color activo** según porcentaje: <70% verde, 70–90% amarillo, 90–100% naranja, >100% rojo (mismos cortes que [features.md](./features.md#dashboard)).
- **Centro:** consumidas (grande), meta y restantes (secundarias). Restantes en rojo si es negativo.
- **Accesible:** `role="img"` + `aria-label` con los valores; no depende solo del color (también texto).
- **Sin dependencias externas** (SVG puro), para no acoplar a una librería de charts todavía.

## Navegación

- **Móvil-first, PWA.** Barra inferior con: Inicio (dashboard), Historial, **Registrar (+)** central, Coach, Perfil.
- Rutas con React Router 6. Layout con `Outlet`.

## Accesibilidad

- Contraste AA en texto sobre tarjetas.
- El color nunca es el único portador de información (el velocímetro también muestra número y etiqueta).
- Tamaños táctiles ≥44px.

## Pantallas del MVP

| Ruta | Pantalla | Estado |
|------|----------|--------|
| `/` | Dashboard (velocímetro + macros + coach del día) | ✅ |
| `/log` | Registro (hub de métodos) | 🔷 |
| `/log/photo`, `/log/scale`, `/log/label`, `/log/search`, `/log/custom` | Métodos de registro | 🔷 |
| `/coach` | Chat del coach | 🔷 |
| `/history` | Historial (diario; semanal/mensual en Bloque 3) | 🔷 |
| `/goals` | Objetivos y metas | ✅ |
| `/profile` | Perfil, unidades, peso | ✅ |
| `/auth` | Login / registro (Supabase) | ✅ |
