# NutriCoach

Tu nutricionista personal con IA. App del ecosistema **Tito Apps** (Turborepo + pnpm).

> La documentación oficial y las decisiones del proyecto viven en [`docs/NutriCoach-Bible.md`](./docs/NutriCoach-Bible.md).

## Stack

React 18 · Vite 5 · TypeScript · TailwindCSS · React Router 6 · TanStack Query 5 · Supabase (Postgres + Auth + Edge Functions) · Vitest · PWA. Paquetes compartidos: `@titoapps/ui`, `@titoapps/utils`, `@titoapps/brand`, `@titoapps/nutrition`, `@titoapps/health`.

## Puesta en marcha

```bash
pnpm install
cp apps/nutricoach/.env.example apps/nutricoach/.env.local   # VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
pnpm nutricoach:dev
```

## Base de datos

Aplicá la migración en tu proyecto Supabase:

```bash
# opción A: Supabase CLI enlazado
supabase db push
# opción B: correr manualmente
#   apps/nutricoach/supabase/migrations/0001_init.sql
```

## IA (Edge Functions)

Las funciones (`analyze-food`, `analyze-scale`, `analyze-label`, `coach`, `meal-plan`) aíslan las llamadas a modelos; la clave vive **solo** en el servidor. Sin clave, responden con stubs deterministas (demo sin costo).

```bash
supabase secrets set AI_PROVIDER=anthropic AI_API_KEY=sk-...   # o AI_PROVIDER=openai
bash apps/nutricoach/scripts/deploy-functions.sh
```

Detalle en [`supabase/functions/README.md`](./supabase/functions/README.md) y [`docs/ai.md`](./docs/ai.md).

## Funcionalidades

Dashboard con velocímetro de calorías · registro por foto, balanza, código de barras (Open Food Facts), etiqueta nutricional, búsqueda y personalizado · coach IA conversacional y proactivo · ideas de comida por macros faltantes · comidas frecuentes en un toque · objetivos con metas automáticas · historial con tendencias y adherencia · mantenimiento adaptativo · entrenamientos (manual + arquitectura de wearables) · plan de comidas por IA · exportación de datos. Ver [`docs/features.md`](./docs/features.md).

## Testing

```bash
pnpm --filter @titoapps/nutrition test   # motor de macros / stats / ideas
pnpm --filter @titoapps/health test      # normalización de actividad
pnpm --filter nutricoach test            # helpers de la app
```

## Estructura

Arquitectura limpia por features (`src/features/*`), lógica de cálculo en paquetes compartidos, IA server-side. Ver [`docs/architecture.md`](./docs/architecture.md).
