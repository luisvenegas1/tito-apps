# Money Track

Finanzas personales (PWA) con cuentas compartidas: tus gastos e ingresos en ₡ y $, pagos fijos, metas, reportes y el libro de cargos y abonos con tu mamá (u otra persona), que ella puede ver y usar desde su propia cuenta.

- Diseño de producto: [`docs/01`–`15`](../../docs/README.md)
- Spec de esta implementación: [`docs/superpowers/specs/2026-09-30-moneytrack-design.md`](../../docs/superpowers/specs/2026-09-30-moneytrack-design.md)
- Identidad visual: [`branding/`](../../branding/README.md)

## Correr en local

Requiere Docker (Supabase local) y pnpm.

```bash
pnpm install
pnpm --filter moneytrack db:start      # Supabase local en puertos 5542x (no choca con otros proyectos)
cp apps/moneytrack/.env.example apps/moneytrack/.env.local
# VITE_SUPABASE_URL=http://127.0.0.1:55421 y VITE_SUPABASE_ANON_KEY = ANON_KEY que imprime db:start
pnpm moneytrack:dev                    # http://localhost:5176
```

Para probar la cuenta compartida en local: crea un usuario, crea la cuenta "Mamá" e invita a otro correo; abre el enlace en una ventana privada y regístrate con ese correo. Los correos de confirmación (si se activan) se ven en http://127.0.0.1:55424.

## Pruebas

```bash
pnpm --filter moneytrack test       # lógica pura: dinero, TC, resumen del mes, libro, pagos, CSV
pnpm --filter moneytrack test:rls   # RLS contra Supabase local: acreedor, deudora y un extraño
pnpm --filter moneytrack lint       # typecheck
```

## Producción

- **URL:** https://moneytrack.tito-apps.com (DNS en Cloudflare: CNAME `moneytrack` → Vercel, *DNS only*)
- **Vercel:** proyecto `moneytrack`, Root Directory `apps/moneytrack`, rama `main`
- **Supabase:** proyecto `akztimahpisflsfxbcnn`; migraciones con `supabase db push`, funciones `sync-rates` y `notify-due`; `CRON_SECRET` y la URL del proyecto viven en el Vault

## Desplegar

1. **Supabase:** crea un proyecto nuevo (solo para Money Track) y aplica las migraciones:
   ```bash
   cd apps/moneytrack
   supabase link --project-ref <PROJECT_REF>
   supabase db push
   ```
   En Authentication → URL Configuration, pon la URL de Vercel como *Site URL* y agrega `https://<tu-dominio>/**` a las redirecciones.
2. **Tareas diarias (tipo de cambio y recordatorios):** genera claves VAPID (`npx web-push generate-vapid-keys`) y un `CRON_SECRET` cualquiera, y luego:
   ```bash
   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... CRON_SECRET=...
   supabase functions deploy notify-due
   supabase functions deploy sync-rates
   ```
   Después corre `supabase/cron.sql` en el SQL Editor (con tu `PROJECT_REF` y `CRON_SECRET`).
   Sin el cron, los pagos igual se generan al abrir la app; lo que no llega son los avisos push.
3. **Vercel:** nuevo proyecto con *Root Directory* `apps/moneytrack`, framework Vite, y las variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y (opcional) `VITE_VAPID_PUBLIC_KEY`.

## Estructura

```
src/
  lib/            lógica pura y probada (money, rates, summary, ledger, payments, csv, offlineQueue)
  features/data/  consultas y mutaciones (TanStack Query) por dominio
  features/*      pantallas: dashboard, capture (+), transactions, accounts, payments, reports, goals…
supabase/
  migrations/     esquema, RLS, triggers de auditoría, RPCs (invitaciones, recurrencia, avisos)
  functions/      notify-due (cron diario: pagos + avisos + Web Push)
  tests/          pruebas de RLS
```

## Decisiones que conviene conocer

- **Privacidad:** las tablas privadas usan RLS "solo el dueño"; las cuentas compartidas usan RLS por membresía (acreedor o deudora). Ninguna política privada menciona las compartidas.
- **El libro compartido no se borra:** "eliminar" es un *soft delete* y todo cambio queda en `shared_entry_history` (lo escribe un trigger, no el cliente).
- **Las deudas no se convierten:** el saldo de una cuenta compartida se muestra por moneda (₡, $ y € por separado).
- **Tipo de cambio:** compra (para ingresos) y venta (para gastos), por moneda, congelado en cada movimiento con el de su fecha. El de referencia del BCCR se guarda **una vez al día para todos** en `reference_rates` (Edge Function `sync-rates`, disparada por pg_cron o por el primer usuario que abre la app si falta el de hoy). Los manuales de cada usuario le ganan en su fecha.
- **Pagos por otra persona:** un cargo marcado "Lo pagué con mi dinero" queda en tus movimientos como adelanto ligado, sin contar como gasto tuyo.
- **Los abonos no son ingreso** para el acreedor ni gasto para la deudora; los cargos son gasto de la deudora cuando ella los pasa a sus gastos.
- **Offline:** la captura rápida guarda en una cola local con `client_uuid` y sincroniza al reconectar (idempotente).
