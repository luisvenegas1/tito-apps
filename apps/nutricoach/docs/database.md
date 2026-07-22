# Base de datos (Supabase / Postgres)

Todas las tablas de usuario tienen **RLS activo** con la regla base `user_id = auth.uid()`. La migración inicial es `apps/nutricoach/supabase/migrations/0001_init.sql`.

## Convenciones

- PK `id uuid default gen_random_uuid()`.
- `user_id uuid not null references auth.users(id) on delete cascade` en toda tabla de usuario.
- `created_at timestamptz not null default now()`, `updated_at` con trigger cuando aplica.
- Enums como `text` con `check(...)` (patrón GolPay) para simplicidad y portabilidad.
- Cantidades nutricionales **por 100 g** en el catálogo (`foods`), y **absolutas** en lo consumido (`log_items`). El escalado se hace en la app con `@titoapps/nutrition`.

## Modelo (resumen)

```
auth.users
  └─ profiles (1:1)         datos personales, unidades
  └─ goals (1:N, 1 activo)  objetivo + metas calculadas
  └─ food_logs (1:N)        un día de registro
        └─ log_items (1:N)  alimentos consumidos
  └─ foods (1:N)            catálogo del usuario + custom + cache de barcode
  └─ recipes (1:N)
        └─ recipe_items (1:N)
  └─ weight_logs (1:N)
  └─ water_logs (1:N)
  └─ workouts (1:N)
  └─ ai_messages (1:N)      historial del coach
```

## Tablas

### profiles
Datos del usuario y preferencias. `sex`, `birth_date`, `height_cm`, `activity_level` (`sedentary|light|moderate|active|very_active`), `units` (`metric|imperial`), `display_name`.

### goals
Objetivo activo y metas derivadas. `type` (`lose_fat|gain_muscle|maintain|deficit|bulk|custom`), `target_weight_kg`, `rate_kg_per_week`, y las metas diarias calculadas: `calorie_target`, `protein_g`, `carb_g`, `fat_g`, más opcionales `fiber_g`, `sugar_g_max`, `sodium_mg_max`, `water_ml`. Solo un goal `is_active = true` por usuario (índice único parcial).

### foods
Catálogo. Sirve para: alimentos custom del usuario, resultados de búsqueda cacheados, y productos por código de barras. Campos por 100 g: `kcal`, `protein_g`, `carb_g`, `fat_g`, `fiber_g`, `sugar_g`, `sodium_mg`. Metadatos: `name`, `brand`, `barcode` (nullable, único por usuario), `source` (`custom|barcode|ai|search`), `serving_g` (porción sugerida).

### food_logs
Un día de registro por usuario: `log_date date`. Único `(user_id, log_date)`. Agrega totales cacheables opcionales (o se calculan por vista). Contiene items.

### log_items
Un alimento consumido. `food_log_id`, `food_id` (nullable, si vino de foto/IA sin catálogo), `name` (snapshot), `grams`, `meal` (`breakfast|lunch|dinner|snack`), y **macros absolutos snapshot** (`kcal`, `protein_g`, `carb_g`, `fat_g`, `fiber_g`, `sugar_g`, `sodium_mg`), `source` (`photo|scale|label|barcode|search|custom|recipe`), `confidence` (nullable, para items de IA).

> Guardamos macros snapshot en el item (no solo referencia a `foods`) para que editar un alimento del catálogo no reescriba la historia.

### recipes / recipe_items
Recetas guardadas del usuario y sus ingredientes. Los macros de la receta se calculan sumando items con `@titoapps/nutrition` y se pueden registrar como un `log_item` de `source='recipe'`.

### weight_logs
`weight_kg`, `logged_at`. Base para tendencias y (Bloque 3) maintenance adaptativo.

### water_logs
`ml`, `logged_at`. El dashboard agrega el total del día.

### workouts
`type`, `name`, `duration_min`, `kcal_burned`, `performed_at`, `source` (`manual|apple_health|google_health|garmin|fitbit|amazfit`). En el MVP solo `manual`; el campo `source` y `external_id` dejan la puerta lista para sincronización de wearables (Bloque 4).

### ai_messages
Historial del coach: `role` (`user|assistant|system`), `content`, `context` (jsonb con snapshot de macros del día para reproducibilidad), `created_at`.

## RLS (patrón)

Cada tabla:

```sql
alter table public.<t> enable row level security;

create policy "<t>_select_own" on public.<t>
  for select using (user_id = auth.uid());
create policy "<t>_insert_own" on public.<t>
  for insert with check (user_id = auth.uid());
create policy "<t>_update_own" on public.<t>
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "<t>_delete_own" on public.<t>
  for delete using (user_id = auth.uid());
```

`log_items`, `recipe_items` (tablas hijas sin `user_id` directo) validan la propiedad vía join al padre con `exists (...)`.

## Índices

- `food_logs (user_id, log_date)` único.
- `log_items (food_log_id)`.
- `weight_logs (user_id, logged_at desc)`.
- `foods (user_id, barcode)` único parcial `where barcode is not null`.
- `goals (user_id) where is_active` único parcial.

## Vistas / RPC (futuro)

- `daily_totals(user_id, date)` — vista o RPC que suma macros del día para el dashboard sin traer todos los items. En el MVP se suma en cliente; se promueve a vista si el volumen lo pide.
