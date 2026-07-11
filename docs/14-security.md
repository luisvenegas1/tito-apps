# 14 · Seguridad y privacidad

La información financiera es sensible: montos, deudas familiares, patrones de gasto. La seguridad no es un añadido, es un requisito de base. Principio rector: **privado por defecto, verdad y autorización en la base de datos**.

## 14.1 Autenticación

- **Supabase Auth** gestiona identidad (email/contraseña; opción de proveedor social).
- Emite un **JWT** que viaja en cada petición; RLS lo lee mediante `auth.uid()`.
- Sesión persistente en el cliente para no re-loguear a diario (clave para la captura rápida), con expiración y refresco de tokens.
- Recuperación de contraseña y verificación de correo estándar de Supabase.

## 14.2 Row Level Security (RLS) — el pilar

**Toda** tabla de negocio tiene RLS activada y la misma política base: un usuario solo ve y modifica **sus** filas (`auth.uid() = user_id`).

```sql
-- Patrón aplicado a cada tabla (ejemplo: categories)
alter table categories enable row level security;

create policy "select own" on categories
  for select using (auth.uid() = user_id);
create policy "insert own" on categories
  for insert with check (auth.uid() = user_id);
create policy "update own" on categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on categories
  for delete using (auth.uid() = user_id);
```

Tablas cubiertas: `profiles`, `people`, `categories`, `receivable_accounts`, `transactions`, `recurring_templates`, `scheduled_payments`, `attachments`, `exchange_rates`, `goals`, `notifications`.

**Consecuencia:** aunque el cliente (o un atacante con la clave `anon`) pida filas de otro usuario, Postgres devuelve vacío. La autorización no depende del frontend.

### Vistas y RLS
Las vistas como `receivable_balances` se definen con `security_invoker = true` (o se filtran por `user_id`) para que respeten las políticas de las tablas subyacentes y no filtren datos.

## 14.3 Claves y secretos

- La clave **`anon`** vive en el cliente; es segura **porque** RLS restringe todo acceso.
- La clave **`service_role`** (omite RLS) **nunca** está en el cliente: solo en **Edge Functions** del lado servidor, para tareas como generación de recurrencia o importación.
- Variables de entorno gestionadas en Vercel/Supabase, fuera del repositorio.

## 14.4 Almacenamiento de recibos

- Bucket de **Supabase Storage privado** (no público).
- Políticas de Storage por usuario: solo el dueño accede a sus archivos.
- Los archivos se sirven con **URL firmada de expiración corta**, nunca con enlaces públicos permanentes.

## 14.5 Transporte y datos en reposo

- **HTTPS/TLS** en todo el tráfico (Vercel + Supabase).
- Datos en reposo cifrados por la plataforma gestionada.
- Backups automáticos de la base (Supabase) + exportación total del usuario (F-105) para portabilidad.

## 14.6 Validación e integridad

- **Doble validación:** Zod en cliente (UX) y `check`/tipos/constraints en Postgres (verdad).
- Constraints de negocio (ej. `receivable_needs_account`) impiden estados inválidos aunque el cliente falle.
- No hay borrados destructivos de datos históricos: se **archiva** (categorías, cuentas) para preservar el historial.

## 14.7 Privacidad

- Un solo usuario dueño de sus datos en el MVP; nada se comparte por defecto.
- `people` (pareja, mamá) son **referencias**, no cuentas con acceso: aparecer como "quien paga" o titular de una cuenta por cobrar **no** da acceso a la app.
- Minimización: se guarda solo lo necesario para la función financiera.

## 14.8 Multi-usuario futuro (preparación, no implementación)

Cuando la pareja quiera su propio acceso ([12 · Roadmap](12-roadmap.md), R14 en [11](11-risks.md)):
- Introducir el concepto de **espacio/hogar** (`household`) con **miembros** y **roles**.
- Migrar la clave de RLS de `user_id` a "pertenencia al hogar" con permisos granulares (ver todo / solo lo propio / editar).
- El modelo actual con `people` facilita esta evolución sin rehacer los datos.

Esto **no** se construye en el MVP, pero el diseño no lo bloquea.

## 14.9 Pruebas de seguridad (parte del Definition of Done)

- Prueba automatizada: el **usuario A no puede leer ni escribir** filas del usuario B en ninguna tabla.
- Prueba de Storage: A no puede acceder a los recibos de B.
- Revisión de políticas RLS en **cada migración** (checklist obligatorio).
- Verificación de que las Edge Functions con `service_role` filtran explícitamente por el usuario objetivo.
