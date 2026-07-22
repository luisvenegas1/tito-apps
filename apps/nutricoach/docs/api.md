# Capa de datos y API

## Estrategia

- **Servidor:** Supabase (Postgres + Auth + Edge Functions + Storage).
- **Cliente de datos:** **TanStack Query 5** para todo lo remoto (cache, invalidación, estados de carga). Sin estado global extra: React Query es la fuente de verdad del servidor; `useState`/context solo para UI local.
- **Contratos IA:** Edge Functions tipadas (ver [ai.md](./ai.md)).

## Convenciones de `api.ts` (patrón del monorepo)

Cada feature tiene un `api.ts` que:

- Importa `supabase` de `@/lib/supabase/client`.
- Expone funciones `async` que hacen **una** operación de I/O y devuelven **tipos de dominio** (`@/lib/supabase/types`).
- Castea el resultado de PostgREST al tipo de dominio.
- Traduce errores de Postgres a mensajes entendibles (ej. `23505` → "ya existe").
- **No** contiene matemática de macros (eso es `@titoapps/nutrition`) ni JSX.
- Para updates, usa `.select()` y verifica que la fila volvió (evita 204 silenciosos por RLS — lección de GolPay).

Ejemplo de firma:

```ts
export async function addLogItems(
  logDate: string,
  items: NewLogItem[],
): Promise<LogItem[]> { /* upsert food_log del día + insert items */ }
```

## Query keys

Centralizadas en `src/lib/query.ts`:

```ts
export const qk = {
  profile: ['profile'] as const,
  goal: ['goal', 'active'] as const,
  log: (date: string) => ['log', date] as const,
  dashboard: (date: string) => ['dashboard', date] as const,
  foods: (q: string) => ['foods', q] as const,
  weights: ['weights'] as const,
  workouts: (date: string) => ['workouts', date] as const,
  coach: ['coach'] as const,
};
```

Invalidaciones típicas: al registrar comida → invalidar `log(date)` y `dashboard(date)`. Al pesarse → `weights` y `dashboard`.

## Hooks (por feature)

Los componentes consumen hooks, nunca `api.ts` directo:

- `useProfile()`, `useActiveGoal()`
- `useDailyLog(date)` — items del día + totales (suma con `@titoapps/nutrition`).
- `useDashboard(date)` — deriva consumido/meta/faltante + datos de macros/agua/peso.
- `useAddFood()` — mutación de registro (cualquier método).
- `useAnalyzePhoto()`, `useAnalyzeScale()`, `useAnalyzeLabel()` — invocan Edge Functions.
- `useCoach()` — historial + envío de mensajes.
- `useWeightLogs()`, `useWorkouts(date)`, `useWater(date)`.

## Edge Functions (server)

En `apps/nutricoach/supabase/functions/`:

- `analyze-food/` · `analyze-scale/` · `analyze-label/` · `coach/`

Cada una: valida el JWT del usuario (Supabase inyecta el header), parsea el body tipado, llama al adapter de proveedor, devuelve JSON del contrato. Bloque 1 entrega stubs deterministas; Bloque 2 conecta el proveedor real vía `AI_API_KEY`.

## Autenticación (igual que GolPay)

Supabase Auth con **login por correo o usuario**. El registro pide nombre, usuario, correo y contraseña; usuarios y correos son únicos (índice único `lower(username)` + unicidad de email de Supabase). Reglas y disponibilidad de username en `lib/username.ts` + RPC `username_available` (ver [database.md](./database.md)).

- **Login por correo:** directo en el cliente (`signInWithPassword`).
- **Login por usuario:** Edge Function `login` resuelve usuario → email en el servidor (con `service_role`, nunca expone el email) y devuelve tokens; mensaje genérico y timing uniforme (anti-enumeración + rate limit).
- **Perfil:** cambiar nombre (`updateFullName`), usuario (`changeUsername`) y contraseña (`changePassword`, reautentica con la actual). Recuperación por correo (`/reset`).
- **UsernameGate:** si una cuenta tiene sesión pero aún no eligió usuario (confirmación de correo activada), se le pide antes de entrar.
- **PasswordInput** (`components/ui/PasswordInput.tsx`): todos los campos de contraseña tienen toggle ver/ocultar (👁️ / 🙈).

`AuthProvider` expone `session`, `profile` (`username`, `full_name`), `refreshProfile` y `signOut`. Un trigger crea la fila `profiles` al registrarse copiando `full_name` de los metadatos.

## Errores y estados

- Errores de red/servidor → `Toast` de error + reintento de React Query.
- Estados de carga → `Skeleton` (contenido) o `Spinner` (acciones puntuales).
- Estados vacíos → `EmptyState` con call-to-action.
