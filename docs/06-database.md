# 06 · Modelo de datos (PostgreSQL / Supabase)

Este documento define el esquema de la base de datos: entidades, relaciones, tipos y políticas de seguridad a nivel de fila (RLS). El diseño prioriza **integridad**, **historial inmutable** y **consultas de reporte eficientes**.

## 6.1 Principios del modelo

1. **Todo cuelga de un usuario.** Cada tabla de negocio tiene `user_id` (dueño) para RLS.
2. **La moneda vive en el dato.** Nunca se convierte de forma destructiva; se guarda el monto y su moneda original.
3. **Los movimientos son el libro mayor.** Gastos, ingresos, cargos y abonos son todos filas de `transactions`, diferenciadas por `kind`.
4. **Las cuentas por cobrar son un subsistema.** Sus asientos también son `transactions` (kind `receivable_charge`/`receivable_payment`) ligadas a una `receivable_account`. Esto unifica el libro y evita duplicar lógica.
5. **La recurrencia genera datos, no los reemplaza.** Una plantilla produce instancias reales que luego se confirman.

## 6.2 Diagrama entidad-relación (conceptual)

```
                         ┌──────────────┐
                         │   profiles   │  (1:1 con auth.users)
                         └──────┬───────┘
                                │ user_id
      ┌───────────────┬─────────┼──────────────┬───────────────┐
      │               │         │              │               │
┌───────────┐  ┌────────────┐  ┌──────────────────┐  ┌───────────────┐
│categories │  │  people    │  │recurring_templates│  │receivable_    │
│           │  │(pareja,mamá│  │                  │  │accounts       │
└─────┬─────┘  │ hermano…)  │  └────────┬─────────┘  └──────┬────────┘
      │        └─────┬──────┘           │ genera            │
      │              │                  ▼                   │
      │              │           ┌───────────────────────────────┐
      └──────────────┴──────────►│        transactions           │◄─── receivable_account_id
                                 │ (expense/income/receivable_*/  │
                                 │  advance/reimbursement)        │
                                 └───────────────┬───────────────┘
                                                 │ attachment
                                          ┌──────▼───────┐
                                          │ attachments  │
                                          └──────────────┘

   ┌──────────┐     ┌────────────────┐     ┌─────────────────┐
   │  goals   │     │exchange_rates  │     │ notifications   │
   └──────────┘     └────────────────┘     └─────────────────┘
```

## 6.3 Enumeraciones (tipos)

```sql
create type currency_code    as enum ('CRC', 'USD');
create type txn_kind         as enum (
  'expense', 'income',
  'receivable_charge', 'receivable_payment',
  'advance', 'reimbursement'
);
create type paid_by          as enum ('me', 'partner', 'shared', 'other');
create type txn_scope        as enum ('personal', 'household', 'shared');
create type recurrence_freq  as enum ('monthly', 'weekly', 'biweekly', 'yearly', 'custom');
create type payment_status   as enum ('pending', 'paid', 'overdue', 'skipped');
create type goal_type        as enum ('savings', 'spend_reduction');
```

## 6.4 Tablas

### profiles
Extiende `auth.users` con preferencias del usuario.

```sql
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  base_currency currency_code not null default 'CRC',
  locale        text default 'es-CR',
  created_at    timestamptz not null default now()
);
```

### people
Terceros y convivientes referenciables (pareja, mamá, hermano, amigo). Sirve para `paid_by = other/partner` y como titular de cuentas por cobrar.

```sql
create table people (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  role       text,               -- 'partner' | 'mother' | 'sibling' | 'friend' | ...
  created_at timestamptz not null default now()
);
```

### categories
Categorías de gasto/ingreso, con semilla inicial y personalización.

```sql
create table categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  parent_id   uuid references categories(id) on delete set null, -- subcategorías
  kind_hint   txn_kind default 'expense',
  icon        text,
  color       text,
  is_archived boolean not null default false,
  sort_order  int default 0,
  created_at  timestamptz not null default now(),
  unique (user_id, name, parent_id)
);
```

Semilla sugerida: `Préstamo casa, Condominio, Luz, Teléfono, Carro, Seguros, Tarjetas de crédito, Fútbol, Pensión complementaria, Gastos personales, Comida, Restaurantes`.

### receivable_accounts
Cuentas por cobrar (el subsistema estrella).

```sql
create table receivable_accounts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  person_id    uuid references people(id) on delete set null,
  name         text not null,          -- 'Mamá', 'Hermano', 'Amigo'
  currency     currency_code not null default 'CRC',
  linked_card  text,                   -- tarjeta cuya extensión usa el tercero (opcional)
  notes        text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);
```

El **saldo** no se almacena: se calcula desde las transacciones (ver vista `receivable_balances`). Esto evita descuadres.

### transactions
El libro mayor. Toda entrada de dinero es una fila aquí.

```sql
create table transactions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  kind                  txn_kind not null,
  amount                numeric(14,2) not null check (amount >= 0),
  currency              currency_code not null,
  occurred_on           date not null,
  category_id           uuid references categories(id) on delete set null,
  paid_by               paid_by,             -- para expense/household
  payer_person_id       uuid references people(id) on delete set null, -- si paid_by='other'
  scope                 txn_scope,           -- personal | household | shared
  shared_split          jsonb,               -- {"me":0.5,"partner":0.5} cuando aplica
  receivable_account_id uuid references receivable_accounts(id) on delete cascade,
  recurring_template_id uuid references recurring_templates(id) on delete set null,
  linked_transaction_id uuid references transactions(id) on delete set null, -- adelanto↔reembolso
  note                  text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- Integridad por naturaleza:
  constraint receivable_needs_account check (
    (kind in ('receivable_charge','receivable_payment')) = (receivable_account_id is not null)
  )
);

create index on transactions (user_id, occurred_on);
create index on transactions (user_id, kind);
create index on transactions (user_id, category_id);
create index on transactions (receivable_account_id);
```

**Notas de diseño clave:**
- Un **cargo de mamá** = fila `kind='receivable_charge'`, `receivable_account_id = <mamá>`. **No** afecta gastos personales.
- Un **depósito de mamá** = fila `kind='receivable_payment'`. **No** es ingreso.
- Un **adelanto** (`advance`) puede vincularse a su **reembolso** (`reimbursement`) vía `linked_transaction_id` para el reporte "cuánto recuperé".
- La **luz que paga la pareja** = `kind='expense'`, `scope='household'`, `paid_by='partner'`. Sigue existiendo con su monto real; solo cambia el responsable. Nunca se pone en ₡0.

### recurring_templates
Plantillas de movimientos repetidos.

```sql
create table recurring_templates (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          txn_kind not null default 'expense',
  name          text not null,           -- 'Préstamo casa', 'Condominio'
  category_id   uuid references categories(id) on delete set null,
  amount_est    numeric(14,2),           -- estimado; el real se ajusta al confirmar
  currency      currency_code not null,
  paid_by       paid_by,
  scope         txn_scope,
  frequency     recurrence_freq not null default 'monthly',
  due_day       int,                     -- día del mes de vencimiento (1-31)
  start_on      date not null,
  end_on        date,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
```

### scheduled_payments
Instancias generadas por una plantilla (alimenta "próximos pagos"). Cuando se confirma, se materializa/enlaza una `transaction`.

```sql
create table scheduled_payments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  template_id    uuid not null references recurring_templates(id) on delete cascade,
  due_date       date not null,
  amount_est     numeric(14,2),
  currency       currency_code not null,
  status         payment_status not null default 'pending',
  transaction_id uuid references transactions(id) on delete set null, -- al pagar
  created_at     timestamptz not null default now(),
  unique (template_id, due_date)
);

create index on scheduled_payments (user_id, status, due_date);
```

### attachments
Recibos e imágenes (apuntan a Supabase Storage).

```sql
create table attachments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid references transactions(id) on delete cascade,
  storage_path   text not null,
  mime_type      text,
  created_at     timestamptz not null default now()
);
```

### exchange_rates
Tipo de cambio configurable con vigencia.

```sql
create table exchange_rates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  from_ccy    currency_code not null,
  to_ccy      currency_code not null,
  rate        numeric(14,6) not null check (rate > 0),
  valid_from  date not null default current_date,
  created_at  timestamptz not null default now()
);
```

### goals
Metas de ahorro y de reducción de gasto.

```sql
create table goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        goal_type not null,
  name        text not null,
  category_id uuid references categories(id) on delete set null, -- para spend_reduction
  target_amount numeric(14,2),
  currency    currency_code not null default 'CRC',
  target_date date,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
```

### notifications
Recordatorios y alertas.

```sql
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,        -- 'payment_due' | 'deficit' | 'goal_risk'
  title       text not null,
  body        text,
  ref_table   text,                 -- 'scheduled_payments' | 'goals' | ...
  ref_id      uuid,
  due_at      timestamptz,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
```

## 6.5 Vistas y cálculos derivados

### Saldo de cuentas por cobrar
```sql
create view receivable_balances as
select
  ra.id as receivable_account_id,
  ra.user_id,
  ra.name,
  ra.currency,
  coalesce(sum(case when t.kind = 'receivable_charge'  then t.amount else 0 end), 0)
  - coalesce(sum(case when t.kind = 'receivable_payment' then t.amount else 0 end), 0)
    as balance
from receivable_accounts ra
left join transactions t on t.receivable_account_id = ra.id
group by ra.id, ra.user_id, ra.name, ra.currency;
```
Un `balance` positivo = el tercero me debe; negativo = yo le debo.

### Resumen mensual (para el dashboard)
Se calcula por consulta agregada sobre `transactions` filtrando por mes, con:
- **Ingresos:** `sum(amount) where kind='income'`.
- **Gastos personales:** `sum where kind='expense' and scope='personal' and paid_by in ('me','shared')`.
- **Gastos del hogar:** `sum where kind='expense' and scope='household'` (incluye los que paga la pareja, para ver el costo real).
- **Disponible:** ingresos − gastos que yo pago.
- **Déficit/superávit:** ingresos − gastos que yo pago (mismo cálculo, con signo).
- Conversión a moneda base con `exchange_rates` cuando hay mezcla CRC/USD.

> Los cálculos que involucran conversión de moneda se implementan como **funciones SQL** o en una capa de servicio, usando el TC vigente. Nunca se sobreescribe el monto original.

## 6.6 Row Level Security (RLS)

Todas las tablas de negocio activan RLS con la misma política base: **cada usuario solo accede a sus filas**.

```sql
alter table transactions enable row level security;

create policy "own rows - select" on transactions
  for select using (auth.uid() = user_id);
create policy "own rows - insert" on transactions
  for insert with check (auth.uid() = user_id);
create policy "own rows - update" on transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows - delete" on transactions
  for delete using (auth.uid() = user_id);
```

Se repite el patrón para `categories`, `people`, `receivable_accounts`, `recurring_templates`, `scheduled_payments`, `attachments`, `exchange_rates`, `goals`, `notifications` y `profiles`. Detalles y matices (multi-usuario futuro para la pareja) en [14 · Seguridad](14-security.md).

## 6.7 Integridad y reglas de negocio en la base

- **Cargos/abonos exigen cuenta:** el `check` `receivable_needs_account` garantiza que ningún cargo/abono quede huérfano y que ningún gasto normal contamine una cuenta por cobrar.
- **Montos no negativos:** `amount >= 0`; el signo lo da el `kind`, no el monto.
- **Unicidad de instancia recurrente:** `unique(template_id, due_date)` evita generar dos veces el mismo pago del mes.
- **`updated_at` automático:** trigger que actualiza `updated_at` en cada `update` de `transactions`.

## 6.8 Migración desde el Excel

`F-104` importa las hojas actuales. Estrategia:
1. Mapear cada hoja mensual a filas `transactions` (`kind='expense'/'income'`), infiriendo `currency` desde el color/columna.
2. Mapear la hoja de mamá a una `receivable_account` + sus `receivable_charge`/`receivable_payment`.
3. Validar que el saldo importado de mamá coincide con el del Excel (criterio de Done del MVP).
