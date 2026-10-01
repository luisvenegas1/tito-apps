# Money Track — Spec de diseño (MVP completo + cuentas compartidas)

- **Fecha:** 2026-09-30
- **Estado:** implementado (ver §11 para lo que cambió al construir)
- **Base:** documentos de producto en [`docs/01`–`docs/15`](../../README.md). Este spec **no los repite**: fija las decisiones tomadas en la sesión de diseño y describe lo que cambia respecto a ellos. Donde este spec y un doc numerado se contradigan, manda este spec.

## 1. Objetivo y criterios de éxito

Construir Money Track en `apps/moneytrack` con el **alcance completo de [04 · MVP](../../04-mvp.md)**, más una capacidad nueva: **la mamá de Luis Diego es usuaria completa** (lleva sus propias finanzas en la app) y ambos comparten una **cuenta corriente** (cargos de la extensión de tarjeta y abonos).

**Hecho cuando:**
1. Se cumplen los 8 criterios de [04 §4.3](../../04-mvp.md).
2. La mamá entra por invitación y ve el saldo correcto de la cuenta compartida.
3. Una prueba automatizada demuestra que la mamá **no** puede leer ninguna fila privada de Luis (ni viceversa) y que un tercer usuario no ve nada de ninguno.

## 2. Decisiones tomadas

| # | Decisión | Alternativas descartadas |
|---|----------|--------------------------|
| D1 | Alcance = MVP completo de doc 04, construido por fases (§7) | Solo "línea de flotación"; solo cuenta de mamá |
| D2 | La mamá es **usuaria completa** con sus propias finanzas | Solo lectura; ver + reportar abonos |
| D3 | En la cuenta compartida **ambos registran todo** (cargos y abonos), con autoría visible y auditoría | Abonos con confirmación; solo lectura para ella |
| D4 | **Libro compartido como entidad propia** (`shared_*`), separado de `transactions` | Abrir RLS de `transactions` (doc 06 + política extra); espacios/hogares con miembros |
| D5 | Moneda **por movimiento** en el libro compartido; saldo **por moneda**, sin conversión | Una moneda por cuenta; convertir deudas con TC |
| D6 | Un cargo es **gasto de la deudora** (opt-in "Agregar a mis gastos"); los abonos no son gasto ni ingreso para nadie | Crear gasto automático; contar abonos como ingreso |
| D7 | Proyecto Supabase **nuevo y propio** | Reutilizar el de GolPay/NutriCoach |
| D8 | Sin Zustand (TanStack Query + estado React, igual que GolPay) | Zustand como en doc 07 |

## 3. Modelo de datos

### 3.1 Sin cambios respecto a doc 06
Cada usuario tiene su propio conjunto privado, con RLS `auth.uid() = user_id`: `profiles`, `people`, `categories`, `transactions`, `recurring_templates`, `scheduled_payments`, `attachments`, `exchange_rates`, `goals`, `notifications`.

### 3.2 Cambios en tablas existentes
- **Se elimina** `receivable_accounts` y la vista `receivable_balances`.
- **`txn_kind`** queda: `expense, income, advance, reimbursement` (se quitan `receivable_charge` y `receivable_payment`).
- **`transactions`**: se quita `receivable_account_id` y la constraint `receivable_needs_account`. Se agrega:
  ```sql
  shared_entry_id uuid references shared_entries(id) on delete set null,
  unique (user_id, shared_entry_id)   -- un cargo se pasa a gastos una sola vez
  ```
  Además se agrega `client_uuid uuid unique` (cola offline, doc 07 §7.6).

### 3.3 Tablas nuevas

```sql
create type shared_entry_type as enum ('charge', 'payment');

create table shared_accounts (
  id             uuid primary key default gen_random_uuid(),
  creditor_id    uuid not null references auth.users(id) on delete cascade,
  debtor_id      uuid references auth.users(id) on delete set null, -- null hasta aceptar
  creditor_label text not null,  -- cómo ve la deudora al acreedor: 'Luis'
  debtor_label   text not null,  -- cómo ve el acreedor a la deudora: 'Mamá'
  linked_card    text,
  notes          text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  check (debtor_id is null or debtor_id <> creditor_id)
);

create table shared_account_invites (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references shared_accounts(id) on delete cascade,
  email       text not null,
  token_hash  text not null unique,      -- se guarda el hash, nunca el token
  expires_at  timestamptz not null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

create table shared_entries (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references shared_accounts(id) on delete cascade,
  type        shared_entry_type not null,
  amount      numeric(14,2) not null check (amount > 0),
  currency    currency_code not null,
  occurred_on date not null,
  concept     text not null,
  note        text,
  client_uuid uuid unique,
  created_by  uuid references auth.users(id) on delete set null, -- trigger lo fija; null si el usuario se borró
  updated_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index on shared_entries (account_id, occurred_on);

create table shared_entry_history (
  id         bigint generated always as identity primary key,
  entry_id   uuid not null references shared_entries(id) on delete cascade,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  action     text not null check (action in ('update', 'delete', 'restore')),
  old_row    jsonb not null
);
```

### 3.4 Vista de saldo

```sql
create view shared_balances with (security_invoker = true) as
select e.account_id, e.currency,
       sum(case when e.type = 'charge' then e.amount else -e.amount end) as balance
from shared_entries e
where e.deleted_at is null
group by e.account_id, e.currency;
```
`balance > 0` = la deudora debe al acreedor. Se muestra por moneda ("₡185.000 · $42").

### 3.5 Reglas en la base (triggers)
- `shared_entries` **before insert**: `created_by := auth.uid()`.
- Las funciones de trigger que escriben en `shared_entry_history` son `security definer` (el cliente no tiene política `insert` en esa tabla).
- `shared_entries` **before update**: `updated_by := auth.uid()`, `updated_at := now()`; prohíbe cambiar `account_id`, `created_by` y `created_at`; escribe la fila anterior en `shared_entry_history` con `action` = `delete` si pasa `deleted_at` de null a valor, `restore` en el caso inverso, `update` en los demás.
- `shared_accounts` **before update**: prohíbe cambiar `creditor_id` y `debtor_id` desde el cliente (solo la Edge Function `accept_invite`, con `service_role`, fija `debtor_id`).
- No hay borrado físico de `shared_entries` ni de `shared_accounts` desde el cliente (sin política `delete`): se usa `deleted_at` / `is_active`.

## 4. Seguridad (RLS)

Función auxiliar `is_shared_member(account_id uuid) returns boolean` (`security definer`, `stable`, `search_path` fijo): verdadero si `auth.uid()` es `creditor_id` o `debtor_id` de la cuenta.

| Tabla | select | insert | update | delete |
|-------|--------|--------|--------|--------|
| `shared_accounts` | miembro | `creditor_id = auth.uid()` y `debtor_id is null` | solo acreedor (trigger protege ids) | — |
| `shared_account_invites` | acreedor de la cuenta | acreedor de la cuenta | — | acreedor (revocar) |
| `shared_entries` | miembro | miembro | miembro | — |
| `shared_entry_history` | miembro (vía entry) | solo trigger | — | — |

- Ninguna política de las tablas privadas (§3.1) menciona cuentas compartidas: la frontera de privacidad no cambia.
- `transactions.shared_entry_id` apunta a un entry que la dueña de la transacción puede leer; la FK no expone datos al otro miembro.
- **Edge Function `accept_invite`**: recibe el token, compara su hash, exige que el email del usuario autenticado coincida con `invites.email`, que no haya expirado ni esté aceptada, y que la cuenta no tenga ya `debtor_id`. Fija `debtor_id` y `accepted_at`.

## 5. Comportamiento

### 5.1 Efecto contable
- **Acreedor (Luis):** cargos y abonos **no** son gastos ni ingresos. Solo alimentan "Pendiente por cobrar". Cuando paga la tarjeta, registra como gasto únicamente sus propias compras; la porción de la mamá ya vive en el libro compartido.
- **Deudora (mamá):** cada cargo es potencialmente **su** gasto. "Agregar a mis gastos" crea una `transaction` privada suya (`kind='expense'`, monto y moneda del cargo, categoría elegida, `shared_entry_id`). Sus abonos son pago de deuda: no se registran como gasto.
- Si un cargo ya pasado a gastos se **edita o elimina** en el libro, la transacción privada **no** se toca. La UI de la deudora muestra un aviso ("el cargo cambió / fue eliminado") con acción para sincronizar o borrar su gasto.

### 5.2 Invitación
1. El acreedor crea la cuenta (`debtor_label`, `creditor_label`, email). Puede registrar movimientos de inmediato.
2. Se genera el token y se envía el correo: `inviteUserByEmail` si el email no tiene cuenta; correo con enlace `/invite/:token` si ya la tiene.
3. La deudora abre el enlace, se registra o inicia sesión y llama a `accept_invite`. Ve el libro completo, incluido lo registrado antes de aceptar.
4. Las invitaciones expiran a los 14 días. El acreedor puede reenviar o revocar.

### 5.3 Pantallas (deltas sobre doc 08)
- La pestaña "Por cobrar" se llama **"Cuentas"** y tiene dos grupos: **Me deben** (soy acreedor) y **Debo** (soy deudor). Es el mismo componente; cambian el texto y el signo.
- **Libro (S6):** saldo por moneda; **+ Cargo** / **− Abono**; cada fila con iniciales de quién la registró y un indicador "editado" que abre el historial; franja de estado de invitación en el lado del acreedor. Para la deudora, cada cargo tiene "Agregar a mis gastos" o un ✓ si ya lo hizo.
- **Captura rápida (+):** selector "¿Dónde va?". Acreedor: *Mis gastos* / *Cargo a {debtor_label}* / *Abono de {debtor_label}*. Deudora: *Mis gastos* / *Compré con la extensión de {creditor_label}* (crea cargo + gasto propio en una sola RPC transaccional) / *Le pagué a {creditor_label}*.
- **Dashboard:** el acreedor ve "Pendiente por cobrar" y la deudora "Pendiente por pagar". La deudora además ve el aviso "N compras con la extensión sin categorizar".
- **Reportes:** "¿Cuánto gastó mamá?", "¿Cuánto me debe?" y "¿Cuánto recuperé este año?" se calculan sobre `shared_entries` (cargos, saldo y abonos del año).

### 5.4 Casos límite
- Un usuario puede ser acreedor en unas cuentas y deudor en otras.
- Si la deudora borra su usuario, `debtor_id` pasa a null y la cuenta vuelve a "sin invitar", con todo el historial intacto.
- Monto 0 o negativo: rechazado por `check`.
- Si un usuario borrado había registrado movimientos, estos se conservan con `created_by = null` y la UI los muestra como "usuario eliminado".
- Ediciones concurrentes: gana la última escritura; ambas quedan en el historial.

## 6. Arquitectura

La de [07 · Arquitectura](../../07-architecture.md), con estos ajustes:
- **Ubicación:** `apps/moneytrack/`, con la estructura de `apps/golpay`: `src/features/<dominio>/`, `src/lib/`, `supabase/migrations/00NN_*.sql`, `supabase/functions/`, `vercel.json`. Scripts `moneytrack:dev|build|test` en el `package.json` raíz.
- **Paquetes compartidos:** `@titoapps/ui`, `@titoapps/brand` (`moneytrack.ts`) y `@titoapps/utils`.
- **Estado:** TanStack Query + estado local de React. Sin Zustand.
- **Edge Functions:** `accept_invite`, `send_invite`, `generate_recurring` (pg_cron, día 1 y bajo demanda), `notify_due` (pg_cron, diario).
- **RPCs SQL:** `month_summary(month date)`, `charge_and_expense(...)` (captura combinada de la deudora) y `add_charge_to_expenses(entry_id, category_id)`.

## 7. Fases de construcción

Cada fase tiene su propio plan de implementación y deja la app usable.

| Fase | Contenido | Entregable |
|------|-----------|------------|
| **0 · Cimientos** | Scaffold de `apps/moneytrack`; migraciones de §3 y doc 06; RLS + pruebas de aislamiento; auth; `profiles` + categorías semilla; PWA base; deploy en Vercel; identidad visual (color y logo) | Entrar a una app vacía y segura |
| **1 · Línea de flotación** | Captura rápida; CRUD de movimientos; ₡/$ + TC; cuentas compartidas, invitación, libro, historial y "Agregar a mis gastos"; dashboard v1 | Llevar el mes y la cuenta con la mamá sin Excel; ella ya puede entrar |
| **2 · Automatización** | Recurrentes; próximos pagos; dashboard v2 con gráficos; historial con filtros y navegación por mes/año | La app anticipa pagos |
| **3 · Análisis** | Reportes por pregunta; metas; notificaciones (push + correo); exportar CSV | MVP completo |
| **4 · Pulido** | Importador de Excel con validación; offline con cola; recibos adjuntos; modo oscuro; E2E | Excel archivado |

## 8. Pruebas

- **Vitest (lógica pura):** saldo corriente del libro por moneda, totales del mes, conversión con TC, estado de pagos programados.
- **RLS contra Supabase local** (`supabase start`, requiere Docker), con tres usuarios (acreedor, deudora, extraño):
  - el extraño no lee ni escribe nada de los otros dos;
  - la deudora lee y escribe la cuenta compartida, pero lee **0 filas** de cada tabla privada del acreedor (y viceversa);
  - nadie puede borrar físicamente un `shared_entry`; un soft delete deja una fila en `shared_entry_history`;
  - el cliente no puede cambiar `creditor_id`/`debtor_id`;
  - `accept_invite` rechaza tokens expirados, ya usados o de otro email.
- **E2E (Fase 4):** captura < 10 s, invitación completa y "Compré con la extensión".

## 9. Fuera de alcance de este spec
- **Identidad visual** de MoneyTrack (color y logo): se decide al inicio de la Fase 0.
- **Formato del Excel** para el importador: se define en la Fase 4 con el archivo real.
- Todo lo de [15 · Funcionalidades futuras](../../15-future-features.md), incluido el hogar compartido con la pareja como usuaria.

## 10. Documentos actualizados por este spec
- [06 · Modelo de datos](../../06-database.md): cuentas por cobrar → cuentas compartidas.
- [07 · Arquitectura](../../07-architecture.md): sin Zustand; ADR del libro compartido.
- [14 · Seguridad](../../14-security.md): RLS por membresía para `shared_*`; la mamá como usuaria.

## 11. Cambios durante la implementación
- **Invitaciones sin Edge Functions:** `create_invite`, `invite_preview` y `accept_invite` son RPCs SQL `security definer`; la verificación de correo usa el email del JWT. No hace falta `service_role` para aceptar.
- **Envío de la invitación por enlace** (WhatsApp o copiar), en vez de correo automático: es como de verdad se le manda algo a la mamá, y evita configurar SMTP. El enlace solo funciona con el correo invitado.
- **Recurrencia en SQL:** `generate_scheduled_payments()` es una función SQL idempotente. La llama la app al abrir (respaldo) y la Edge Function `notify-due` por pg_cron, que además crea los avisos (`build_due_notifications`) y envía Web Push.
- **Resumen del mes en el cliente** (`src/lib/summary.ts`, con pruebas) en vez de la RPC `month_summary`: el volumen es pequeño y así la regla queda probada con Vitest.
- **Avisos por push e in-app**; el correo queda para después.
- **Permisos explícitos** (`0005_grants.sql`): las versiones recientes de Supabase ya no otorgan DML por defecto a `authenticated` ni a `service_role`.

## 12. Ajustes tras la primera revisión (2026-09-30)
- **Euros:** `currency_code` incluye `EUR` en todo (movimientos, cuentas compartidas, metas, pagos fijos).
- **Tipo de cambio con compra y venta** por moneda (`exchange_rates.currency, buy, sell, source`). Los gastos se convierten con la **venta** y los ingresos con la **compra**.
- **Actualización automática con el BCCR:** la app consulta una vez al día la API pública de Hacienda (`api.hacienda.go.cr/indicadores/tc`, tipo de cambio de referencia del BCCR, CORS abierto). No pisa valores escritos a mano (`source = 'manual'`), así el usuario puede usar el de su banco (por ejemplo, BAC). No se lee la página de BAC: no tiene API pública y raspar su sitio sería frágil.
- **"Lo pagué con mi dinero"** al crear un cargo como acreedor: `charge_and_expense(..., p_kind => 'advance')` crea el cargo y un movimiento privado ligado. Aparece en Movimientos, pero no cuenta en gastos ni en "salió de tu bolsillo": es una cuenta por cobrar (el inicio lo muestra aparte como "pagaste por otras personas").
- **Botón "Pagar"** en los próximos pagos del inicio.
- **Contraseñas con botón para mostrarlas** (registro, entrada y cambio).
