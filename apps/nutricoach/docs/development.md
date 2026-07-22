# Desarrollo

## Requisitos

- Node 18+, pnpm 9.15 (definido en el monorepo).
- Cuenta Supabase (proyecto propio de NutriCoach o compartido).
- (Bloque 2) Clave de un proveedor de IA con visión.

## Setup

```bash
# desde la raíz del monorepo
pnpm install

# variables de entorno de la app
cp apps/nutricoach/.env.example apps/nutricoach/.env.local
#   VITE_SUPABASE_URL=...
#   VITE_SUPABASE_ANON_KEY=...

# correr solo NutriCoach
pnpm --filter nutricoach dev
```

Scripts del monorepo añadidos en `package.json` raíz: `nutricoach:dev`, `nutricoach:build`, `nutricoach:test`.

## Base de datos

```bash
# aplicar migraciones (con Supabase CLI enlazado al proyecto)
supabase db push          # o correr apps/nutricoach/supabase/migrations/*.sql en orden
```

Las Edge Functions se despliegan con `supabase functions deploy analyze-food` (etc.) en Bloque 2, tras configurar los secretos `AI_PROVIDER` y `AI_API_KEY`.

## Convenciones de código

- **TypeScript estricto.** Sin `any` salvo en el borde de I/O, y siempre casteado a un tipo de dominio.
- **Feature-based.** Todo lo de una feature vive junto (`src/features/<f>/`).
- **Componentes pequeños** (~≤150 líneas, una responsabilidad). Si crece, se parte.
- **Sin lógica de cálculo en UI/hooks.** Va a `@titoapps/nutrition` o `lib/`.
- **Sin duplicar.** Antes de escribir un helper, buscar en `@titoapps/utils` y `@titoapps/nutrition`.
- **Nombres en inglés para código, español para UI y docs.**
- Imports con alias `@/`.

## Testing

- **Vitest.** El foco de tests está en lo que puede romper silenciosamente: `@titoapps/nutrition` (matemática) tiene cobertura alta; los `api.ts` y hooks se testean en puntos críticos.
- `pnpm --filter @titoapps/nutrition test` corre el motor.
- Regla: **toda fórmula nueva en `nutrition` entra con su test.**

## Definición de "hecho" por feature

1. UI accesible y responsive (móvil-first).
2. Datos vía hook → `api.ts` → Supabase, con estados de carga/error/vacío.
3. Cálculos vía `@titoapps/nutrition` (con tests si hay fórmula nueva).
4. RLS verificado (nadie ve datos ajenos).
5. Documentado si tomó una decisión no obvia.

## Roadmap

### Bloque 1 — Fundaciones (este entregable)
Documentación · scaffold app · `packages/nutrition` con tests · marca nutricoach · migración `0001_init.sql` · tipos de dominio · data layer (React Query) · **dashboard con velocímetro** · hub de registro y métodos cableados · objetivos · perfil/peso/agua · coach con contexto (IA stub) · Edge Functions stub.

### Bloque 2 — IA en vivo ✅ (completo)
Adapters reales de proveedor (OpenAI + Anthropic) en las Edge Functions con visión + JSON, seleccionados por `AI_PROVIDER`/`AI_API_KEY` con stub de fallback · compresión de imagen en cliente (`lib/image.ts`) · corrección manual pulida en foto · código de barras (`BarcodeDetector` + Open Food Facts, mapper puro testeado) · OCR de etiqueta nutricional. Para activar IA real: `supabase secrets set AI_API_KEY=...` y desplegar las funciones (ver `supabase/functions/README.md`).

### Bloque 3 — Hábitos e inteligencia ✅ (completo)
Comidas frecuentes aprendidas (`features/log/frequents.ts` + hub, re-registro en un toque) · ideas de comida por faltantes (`rankMealIdeas` + `foodLibrary`, card en dashboard) · maintenance adaptativo (`adaptiveMaintenance`, regresión ingesta/peso) · historial semana/mes con gráficos SVG propios (`components/charts`) · adherencia y racha (`adherence`, `loggingStreak`). Motor ampliado en `packages/nutrition/src/{stats,ideas}.ts` con tests (35 en total).

### Bloque 4 — Salud y wearables ✅ (completo)
`packages/health` (normalización + MET + adapters + `HealthProvider` + dedupe, con tests) · feature de entrenamientos (`features/workouts`) con registro manual y estimación automática de kcal · pantalla de conexión de dispositivos con importación probada end-to-end vía `MockWearableProvider` y dedupe por `source + external_id` (upsert). Integrar un wearable real = implementar su `HealthProvider` con OAuth/SDK y mapear con los adapters puros. **43 tests en verde.**

### Bloque 5 — Cierre y pulido ✅ (completo)
Exportación de datos (`lib/csv.ts` + `features/settings`, CSV/JSON, con tests) · plan de comidas por IA (`meal-plan` edge function + `features/plan`) · primer proveedor real `FitbitProvider` en `@titoapps/health` (testeado con fetch mock) · `ErrorBoundary` global · toggle de unidades · `README.md` de la app y `scripts/deploy-functions.sh`. **48 tests en verde.**

### Pendiente de operación (requiere credenciales)
- Desplegar Edge Functions y setear `AI_API_KEY` (`bash apps/nutricoach/scripts/deploy-functions.sh`).
- Proyecto Supabase + `0001_init.sql` + `VITE_SUPABASE_*`.
- OAuth de wearables (client id/secret) para emitir el token que consume `FitbitProvider`.

### Siguientes ideas (futuro)
- **Alertas/recordatorios contextuales** (idea del usuario): ej. a las 6pm, si falta mucha agua para la meta, avisar "te faltan XXX ml de agua para tu objetivo de hoy, tomá un poco más". Aplica también a proteína/calorías. Opciones: (a) recordatorios locales con `Notification` + service worker mientras la PWA está instalada; (b) push real vía backend (Edge Function + Web Push) para que llegue con la app cerrada. El cálculo de faltantes ya existe (`computeRemaining`, dashboard). Arrancar por recordatorios locales configurables (hora + tipo).
- **Web Push ✅ (implementado)** — service worker + `send-reminders` (cron) + suscripciones en BD. Setup en [push.md](./push.md): generar VAPID, secretos, migración `0003_push.sql`, desplegar y agendar cron `*/15 * * * *`.
- Planes con lista de compras, y promover `packages/charts` cuando haya un segundo consumidor de gráficos.

## Forma de trabajo

Desarrollo autónomo por bloques grandes. Al final de cada bloque se entrega un resumen con: qué se construyó, decisiones tomadas, archivos importantes, cómo probarlo y qué quedó pendiente. No se pide aprobación por cada pantalla. Las decisiones de arquitectura razonables se toman y se documentan aquí o en el ADR de [architecture.md](./architecture.md#adr).
