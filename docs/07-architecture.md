# 07 · Arquitectura

## 7.1 Vista general

Money Track es una **PWA de una sola página (SPA)** que habla directamente con Supabase. No hay un backend propio en el MVP: Supabase provee base de datos, autenticación, almacenamiento y funciones. Esto reduce la superficie de mantenimiento y aprovecha RLS para la seguridad.

```
┌─────────────────────────────────────────────────────────┐
│                     Cliente (PWA)                        │
│  React + Vite + TypeScript + Tailwind                    │
│  ┌───────────┐ ┌────────────┐ ┌───────────────────────┐  │
│  │  UI /     │ │  Estado    │ │  Capa de datos        │  │
│  │  Pantallas│ │(TanStack   │ │ (supabase-js client)  │  │
│  │           │ │ Query +    │ │                       │  │
│  │           │ │ Zustand)   │ │                       │  │
│  └───────────┘ └────────────┘ └──────────┬────────────┘  │
│         Service Worker (offline + push)   │               │
└───────────────────────────────────────────┼──────────────┘
                                             │ HTTPS / WSS
                    ┌────────────────────────▼───────────────────────┐
                    │                   Supabase                      │
                    │  ┌──────────┐ ┌──────┐ ┌─────────┐ ┌─────────┐  │
                    │  │PostgreSQL│ │ Auth │ │ Storage │ │  Edge   │  │
                    │  │  + RLS   │ │      │ │(recibos)│ │Functions│  │
                    │  └──────────┘ └──────┘ └─────────┘ └────┬────┘  │
                    │        ▲  pg_cron (recurrencia)         │       │
                    └────────┼──────────────────────────────── ┼──────┘
                             │                                 │
                     Hosting: Vercel (frontend)     Notificaciones (push/email)
```

## 7.2 Stack técnico

### Frontend
- **React 18 + Vite** — SPA rápida, build óptimo.
- **TypeScript** — tipos fuertes de punta a punta; los enums del modelo de datos se reflejan en tipos generados desde Supabase.
- **Tailwind CSS** — sistema de diseño utilitario (ver [08 · UI/UX](08-ui-ux.md)).
- **TanStack Query** — fetching, caché e invalidación de datos del servidor.
- **Zustand** — estado de UI ligero (filtros, formulario de captura rápida, tema).
- **React Hook Form + Zod** — formularios y validación en cliente (espejo de las reglas del backend).
- **Recharts** — gráficos del dashboard.
- **PWA** (`vite-plugin-pwa` + Workbox) — instalable, offline y push.

### Backend (Supabase)
- **PostgreSQL** — base de datos con el esquema del [documento 06](06-database.md).
- **Row Level Security** — seguridad por fila en cada tabla.
- **Supabase Auth** — email/contraseña y/o proveedor social; emite JWT que RLS usa vía `auth.uid()`.
- **Storage** — recibos e imágenes, con políticas por usuario.
- **Edge Functions (Deno)** — lógica que no debe vivir en el cliente: generación de recurrencia, envío de notificaciones, cálculos sensibles, importación de Excel.
- **pg_cron** — dispara la generación mensual de pagos recurrentes y la evaluación de recordatorios.

### Hosting / Infra
- **Vercel** — hosting del frontend con CI/CD desde Git.
- **Supabase Cloud** — base de datos gestionada, backups automáticos.
- **Variables de entorno** — claves `anon` en cliente (seguras gracias a RLS); claves `service_role` solo en Edge Functions.

## 7.3 Capas y responsabilidades

| Capa | Responsabilidad | No hace |
|------|-----------------|---------|
| UI / Pantallas | Render, interacción, captura rápida | Reglas de negocio duras |
| Estado servidor (TanStack Query) | Sincronizar con Postgres, caché | Persistir verdad |
| Estado UI (Zustand) | Filtros, tema, borrador de formulario | Guardar datos financieros |
| Capa de datos (supabase-js) | CRUD, RPC a funciones SQL | Autorizar (lo hace RLS) |
| PostgreSQL + RLS | Verdad, integridad, autorización | Presentación |
| Edge Functions | Recurrencia, notificaciones, import | UI |

**Regla de oro:** la **verdad y la autorización viven en Postgres**. El cliente es reemplazable; la base de datos es la fuente de verdad.

## 7.4 Lógica de negocio: dónde vive cada cosa

- **Cálculos de saldo de cuentas por cobrar:** vista SQL `receivable_balances` (nunca en el cliente).
- **Resúmenes del dashboard:** funciones SQL (`rpc`) que agregan por mes y convierten moneda con el TC vigente.
- **Generación de recurrencia:** Edge Function programada por `pg_cron` el día 1 de cada mes (y bajo demanda).
- **Evaluación de próximos pagos / atrasos:** función que actualiza `status` en `scheduled_payments` según la fecha.
- **Validación:** doble — Zod en el cliente (UX inmediata) y `check`/tipos en Postgres (verdad).

## 7.5 Estrategia PWA y offline

- **Instalable:** manifest + íconos; funciona como app en móvil y escritorio.
- **Offline de lectura:** el Service Worker cachea la app y los últimos datos consultados (estrategia stale-while-revalidate vía TanStack Query persistido).
- **Captura offline:** un gasto creado sin conexión se guarda en una **cola local** (IndexedDB) y se sincroniza al reconectar. Se marca visualmente como "pendiente de sincronizar".
- **Push:** notificaciones de vencimiento mediante Web Push; el token se guarda por usuario.

## 7.6 Sincronización y conflictos

- Escrituras optimistas con reconciliación de TanStack Query.
- Para la cola offline, cada movimiento lleva un `client_uuid`; al sincronizar se hace `upsert` idempotente para evitar duplicados si la red falla a medias.

## 7.7 Rendimiento

- Índices por `(user_id, occurred_on)`, `(user_id, kind)`, `(user_id, category_id)` para reportes rápidos.
- Paginación por rango de fecha en el historial.
- Materialización opcional (vista materializada) de resúmenes mensuales si el volumen crece (optimización futura, innecesaria al inicio).

## 7.8 Observabilidad y calidad

- **Errores:** Sentry (o equivalente) en frontend y Edge Functions.
- **Tipos generados:** `supabase gen types typescript` mantiene el cliente sincronizado con el esquema.
- **Migraciones:** versionadas con Supabase CLI (`supabase migration`), nunca cambios manuales en producción.
- **Pruebas:** unitarias de utilidades (conversión de moneda, cálculo de saldos) y pruebas de políticas RLS (un usuario no ve datos de otro).

## 7.9 Decisiones arquitectónicas clave (ADR resumidas)

| Decisión | Alternativa descartada | Razón |
|----------|------------------------|-------|
| Sin backend propio, todo en Supabase | API Node/Express dedicada | Menos mantenimiento; RLS cubre autorización |
| Libro único `transactions` para todo | Tablas separadas por tipo | Unifica lógica y reportes; `kind` diferencia |
| Saldo por vista, no almacenado | Columna `balance` mantenida | Evita descuadres; siempre correcto |
| Recurrencia por Edge Function + pg_cron | Generar en cliente al abrir | Confiable aunque el usuario no abra la app |
| Moneda en el dato + TC configurable | Guardar todo convertido | Preserva la verdad; conversión reversible |
