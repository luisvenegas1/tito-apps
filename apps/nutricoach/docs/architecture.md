# Arquitectura

## Contexto: monorepo Tito Apps

NutriCoach vive en el monorepo existente (`Turborepo` + `pnpm workspaces`). No se crea un repo nuevo.

```
proyectosWeb/
├── apps/
│   ├── golpay/
│   ├── titoapps/
│   ├── ui-playground/
│   └── nutricoach/        ← NUEVA app
├── packages/
│   ├── ui/                 @titoapps/ui      (componentes neutrales)
│   ├── utils/              @titoapps/utils   (helpers puros)
│   ├── brand/              @titoapps/brand   (design tokens + marcas)
│   ├── nutrition/          @titoapps/nutrition ← Bloque 1 (motor de macros)
│   └── health/             @titoapps/health    ← Bloque 4 (normalización de actividad)
├── turbo.json
├── pnpm-workspace.yaml   (packages: apps/*, packages/*)
└── package.json
```

Convenciones heredadas del monorepo (se respetan al pie de la letra):

- Apps con nombre simple (`nutricoach`), dependencias compartidas como `workspace:*`.
- Stack por app: React 18, Vite 5, TypeScript 5, TailwindCSS 3, React Router 6, TanStack Query 5, Supabase JS, Vitest, vite-plugin-pwa.
- Alias `@/` → `src/`.
- Estructura **feature-based**: `src/features/<feature>/` con su `api.ts`, componentes, hooks y tests colocalizados.
- Tipos de dominio escritos a mano en `src/lib/supabase/types.ts` (no se usa el generic `Database` del cliente; se castea en cada `api.ts`, igual que GolPay).
- Migraciones SQL numeradas en `apps/nutricoach/supabase/migrations/NNNN_nombre.sql`.

## Packages compartidos: cuándo crear uno

Regla: **un package nuevo solo si la lógica es (a) pura, (b) reutilizable por otra app y (c) merece tests propios.**

- ✅ **`packages/nutrition`** (se crea ahora): matemática de energía y macros — BMR/TDEE, objetivos, escalado por peso, faltantes del día, scoring de calidad. Pura, testeable, potencialmente útil a cualquier app de salud. Es el antídoto contra la duplicación de lógica.
- 🔜 **`packages/ai`** (futuro, Bloque 2): abstracción de proveedor de IA y tipos de contrato de las Edge Functions, si una segunda app lo necesita. Por ahora vive en la app para evitar sobreingeniería.
- 🔜 **`packages/charts`** (futuro): wrappers de gráficos si el velocímetro/tendencias se reutilizan. Por ahora en la app.
- ✅ **`packages/health`** (creado en Bloque 4): normalización de actividad/entrenamientos — `NormalizedWorkout`, catálogo MET + `estimateCalories`, adapters puros por proveedor (Apple/Google/Garmin/Fitbit), interfaz `HealthProvider` y `dedupeByExternalId`. Puro y testeado; deja lista la integración con wearables sin tocar la app.

No se crean paquetes vacíos "por si acaso". Se promueven cuando aparece el segundo consumidor real.

## Arquitectura limpia (capas dentro de la app)

```
UI (componentes, pantallas)         ← solo presentación + interacción
  └─ hooks (useDashboard, useDailyLog, useCoach…)   ← orquestan estado/servidor
       └─ api.ts por feature          ← I/O con Supabase / Edge Functions
            └─ @titoapps/nutrition     ← cálculo puro (sin I/O, sin React)
            └─ lib/supabase/client     ← cliente Supabase
```

Reglas:

- **Los componentes no llaman a Supabase directo.** Pasan por un hook, que pasa por `api.ts`.
- **La matemática no vive en componentes ni en hooks.** Vive en `@titoapps/nutrition` (puro) o en helpers de `lib/`.
- **`api.ts` no contiene reglas de negocio de cálculo.** Solo I/O y mapeo de filas ↔ tipos de dominio.
- **Archivos pequeños.** Si un componente pasa de ~150 líneas o hace más de una cosa, se parte.

## Estructura interna de la app

```
apps/nutricoach/src/
├── main.tsx                # bootstrap: brand, QueryClient, router, PWA
├── App.tsx                 # layout + rutas
├── index.css               # tailwind + tokens
├── lib/
│   ├── supabase/
│   │   ├── client.ts       # createClient (VITE_SUPABASE_*)
│   │   └── types.ts        # tipos de dominio (a mano)
│   ├── ai/
│   │   ├── client.ts       # invoker de Edge Functions (functions.invoke)
│   │   └── contracts.ts    # tipos de request/response de cada función IA
│   └── query.ts            # QueryClient + keys
├── components/             # layout, navegación, primitivos específicos de la app
│   └── gauge/              # velocímetro (CalorieGauge)
├── hooks/                  # hooks transversales (useSession, useProfile)
└── features/
    ├── auth/
    ├── dashboard/          # velocímetro + tarjetas de macros
    ├── log/                # registro de comida (foto, buscar, barcode, custom, balanza)
    ├── coach/              # chat + recomendaciones proactivas
    ├── goals/              # objetivos y metas
    ├── history/            # diario/semanal/mensual, tendencias
    ├── recipes/            # recetas y comidas frecuentes
    └── workouts/           # entrenamientos (manual + arquitectura para wearables)
```

## Flujo de datos (ejemplo: registrar comida por foto)

1. UI (`log/PhotoCapture.tsx`) toma la imagen y llama a `useAnalyzePhoto()`.
2. El hook llama a `log/api.ts → analyzePhoto()`, que invoca la Edge Function `analyze-food` vía `lib/ai/client`.
3. La Edge Function (server-side, con la clave del proveedor) llama al modelo de visión y devuelve `{ items: [{ name, grams, confidence }] }`.
4. La app escala macros con `@titoapps/nutrition` (a partir de `grams` + datos por 100 g) y muestra una tarjeta editable (corrección manual).
5. Al confirmar, `log/api.ts → addLogItems()` inserta filas en `log_items`; TanStack Query invalida `['log', date]` y el dashboard se actualiza.

## ADR — decisiones de arquitectura registradas

- **ADR-001 — Tipos de dominio a mano.** Se sigue el patrón de GolPay (sin generic `Database`). Menos acoplamiento a la generación de tipos; el `api.ts` castea. Revisable si el schema crece mucho.
- **ADR-002 — IA solo server-side.** Todas las llamadas a modelos pasan por Edge Functions. El cliente nunca ve claves. Contratos tipados en `lib/ai/contracts.ts`.
- **ADR-003 — Motor de nutrición como package.** El cálculo se aísla en `@titoapps/nutrition` para no duplicar y para poder testearlo sin React.
- **ADR-004 — Escalado de macros en cliente.** El escalado (macros por gramo × gramos) se hace en cliente con datos ya conocidos; la IA solo aporta identificación y estimación de cantidad. Barato, instantáneo, editable.
- **ADR-005 — Maintenance adaptativo diferido a Bloque 3.** La fórmula estática (Mifflin-St Jeor) se usa en el MVP; el adaptativo (regresión peso/ingesta) se añade cuando haya datos históricos suficientes.
