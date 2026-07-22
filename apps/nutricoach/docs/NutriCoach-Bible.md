# NutriCoach — Bible

> **Fuente oficial del proyecto.** Toda decisión importante de producto, arquitectura, base de datos, IA o UX se documenta aquí o en los archivos enlazados desde aquí. Si algo no está escrito, no es oficial.

Versión del documento: 1.0
Última actualización: 2026-07-21
Estado: MVP en construcción (Bloque 1 — fundaciones)

---

## 1. Qué es NutriCoach

NutriCoach es un **nutricionista personal impulsado por IA**, no una app de conteo de calorías. El conteo de calorías es un medio, no el fin. El fin es que el usuario **baje grasa, gane músculo, mantenga peso, mejore hábitos y aprenda a comer mejor** con la mínima fricción posible.

Principio rector del producto: **la IA hace el trabajo, el usuario casi no escribe.**

NutriCoach es parte del ecosistema **Tito Apps** (monorepo Turborepo + pnpm) y debe ser la aplicación de mayor calidad del ecosistema.

## 2. Los 5 diferenciadores (por qué no es otra MyFitnessPal)

1. **Modo balanza** — el usuario fotografía el alimento sobre una balanza; la IA identifica alimento + peso y calcula todos los macros. Variante: foto de la tabla nutricional del empaque → cálculo automático para el peso consumido. (Ver [ai.md](./ai.md).)
2. **Registro con cero (o casi cero) tipeo** — foto, código de barras, comidas frecuentes aprendidas, recetas guardadas. Escribir es el último recurso, no el primero.
3. **Coach proactivo** — la IA no solo responde ("¿puedo comer pizza hoy?"); observa tendencias y genera recomendaciones sin que se le pida.
4. **Maintenance adaptativo** — el TDEE/mantenimiento no es una fórmula estática: se recalibra con la tendencia real de peso vs. ingesta (inspirado en MacroFactor). El usuario no tiene que "adivinar" su déficit.
5. **Ideas de comida por macros faltantes** — a media tarde NutriCoach sabe que te faltan 40 g de proteína / 300 kcal y te sugiere qué comer para cerrar el día bien.

## 3. Índice de documentación

| Documento | Contenido |
|-----------|-----------|
| [vision.md](./vision.md) | Producto, objetivos, filosofía, público, diferenciación competitiva, principios de UX. |
| [architecture.md](./architecture.md) | Estructura del monorepo, packages compartidos, arquitectura limpia, flujo de datos, decisiones (ADR). |
| [database.md](./database.md) | Modelo de datos Supabase, tablas, relaciones, RLS, migraciones. |
| [features.md](./features.md) | Especificación funcional de cada feature del MVP y del roadmap. |
| [ai.md](./ai.md) | Arquitectura de IA: visión (foto/balanza/etiqueta), coach, abstracción de proveedor, prompts, edge functions. |
| [ui.md](./ui.md) | Sistema de diseño, tokens, componentes, pantallas, el velocímetro, accesibilidad. |
| [api.md](./api.md) | Capa de datos (TanStack Query), contratos de Edge Functions, convenciones de `api.ts`. |
| [development.md](./development.md) | Setup, scripts, convenciones de código, testing, y el roadmap por bloques. |

## 4. Estado del proyecto (bloques)

- **Bloque 1 — Fundaciones (completo):** documentación, scaffold de la app en el monorepo, `packages/nutrition` (motor puro de macros/energía con tests), marca `nutricoach`, migración inicial de base de datos, tipos de dominio, data layer y dashboard con velocímetro. Registro de comida y coach cableados contra Edge Functions (stubs) con abstracción de proveedor.
- **Bloque 2 — IA en vivo (completo):** adapters reales de proveedor (OpenAI + Anthropic) en las Edge Functions con visión + JSON mode, seleccionados por variable de entorno (stub como fallback sin clave); compresión de imagen en cliente; **código de barras** con `BarcodeDetector` + Open Food Facts (mapper puro testeado); **OCR de etiqueta nutricional**; corrección manual pulida (editar/quitar/agregar). 22 tests en verde, app typechequea limpio.
- **Bloque 3 — Hábitos e inteligencia (completo):** mantenimiento adaptativo (regresión ingesta/peso, estilo MacroFactor), estadísticas de adherencia y racha, ideas de comida por macros faltantes (librería curada + motor de ranking), comidas frecuentes aprendidas (re-registro en un toque) e historial semana/mes con gráficos SVG de calorías y peso. 35 tests en verde, app typechequea limpio.
- **Bloque 4 — Salud y entrenamientos (completo):** paquete compartido `@titoapps/health` (normalización de actividad, catálogo MET + `estimateCalories`, adapters Apple/Google/Garmin/Fitbit, `HealthProvider`, dedupe por `external_id`); feature de entrenamientos con registro manual y estimación automática de calorías; pantalla de conexión de dispositivos con el pipeline de importación probado end-to-end vía un proveedor mock.
- **Bloque 5 — Cierre y pulido (completo):** exportación de datos (CSV/JSON, portabilidad), plan de comidas por IA (día/semana, edge function `meal-plan` + stub/adapters), primer `HealthProvider` real (`FitbitProvider`, testeado con fetch mock), `ErrorBoundary` global, toggle de unidades, y deploy-readiness (README de la app + script de despliegue de funciones). **48 tests en verde, app typechequea limpio.**

### Estado: MVP completo. Pendiente de operación (requiere credenciales del dueño)
- Configurar `AI_API_KEY` y desplegar las Edge Functions (`bash apps/nutricoach/scripts/deploy-functions.sh`).
- Crear el proyecto Supabase, aplicar `0001_init.sql` y setear `VITE_SUPABASE_*`.
- OAuth real de wearables: el `FitbitProvider` ya normaliza; falta el flujo OAuth (client id/secret) para emitir el token.

El detalle vive en [development.md](./development.md#roadmap).

## 5. Decisiones no negociables

- **Nunca duplicar lógica.** El cálculo de macros/energía vive en `packages/nutrition`, no en componentes ni en la app.
- **Reutilizar `@titoapps/ui`, `@titoapps/utils`, `@titoapps/brand`.** Solo se crea un componente/paquete nuevo cuando aporta reutilización real.
- **Las claves de IA nunca tocan el cliente.** Toda llamada a un modelo pasa por Supabase Edge Functions.
- **RLS siempre activo.** Ninguna tabla de usuario es accesible sin política. Ver [database.md](./database.md).
- **Componentes pequeños, hooks reutilizables, sin archivos gigantes.** Ver [architecture.md](./architecture.md).
- **UX primero: nada de pantallas llenas de números.** Ver [ui.md](./ui.md).

## 6. Glosario

- **Macros:** proteína, carbohidratos, grasa (y sub-métricas: azúcar, fibra, sodio).
- **TDEE:** gasto energético diario total. **BMR:** metabolismo basal.
- **Log:** un registro de comida de un día. **Log item:** un alimento dentro de un log.
- **Faltantes (remaining):** meta diaria menos lo consumido, por métrica.
- **Modo balanza:** flujo de registro por foto de alimento sobre balanza.
