# Notificaciones (Web Push)

Permite que los recordatorios lleguen **con la app cerrada**. Arquitectura:

```
Cliente (RemindersCard) ── suscribe ──▶ push_subscriptions (BD)
        │  guarda config (hora/tz/qué recordar) en profiles
        ▼
cron (cada 15 min) ▶ Edge Function send-reminders
        │  busca perfiles cuya hora local == ahora, calcula faltantes del día
        ▼  web-push (VAPID) ▶ Service Worker (src/sw.ts) ▶ notificación del sistema
```

Piezas:

- **Service worker** `src/sw.ts` (vite-plugin-pwa `injectManifest`): precache + eventos `push`/`notificationclick`.
- **BD** (`0003_push.sql`): tabla `push_subscriptions` + columnas `reminder_*` en `profiles` (config es fuente de verdad del servidor).
- **Cliente** (`features/reminders/`): `push.ts` (suscripción), `api.ts` (guardar config + suscripción), `RemindersCard` (UI). Además, `useReminders` dispara recordatorios locales cuando la app está abierta.
- **Servidor** (`send-reminders`): cron; envía `web-push` con `VAPID_*`.

## Puesta en marcha

1. **Generar llaves VAPID** (una vez):

   ```bash
   npx web-push generate-vapid-keys
   ```

2. **Cliente:** poné la pública en `apps/nutricoach/.env.local`:

   ```
   VITE_VAPID_PUBLIC_KEY=BASE64URL_PUBLICA
   ```

3. **Servidor:** guardá los secretos en Supabase:

   ```bash
   supabase secrets set \
     VAPID_PUBLIC_KEY=BASE64URL_PUBLICA \
     VAPID_PRIVATE_KEY=BASE64URL_PRIVADA \
     VAPID_SUBJECT=mailto:tu-correo@dominio.com
   ```

4. **Base de datos:** aplicá `supabase/migrations/0003_push.sql` (SQL Editor).

5. **Desplegar** la función:

   ```bash
   supabase functions deploy send-reminders --project-ref <ref>
   ```

6. **Agendar el cron** cada 15 minutos (debe coincidir con `WINDOW_MIN` de la función):
   - En el Dashboard: Edge Functions → `send-reminders` → **Schedules/Cron** → `*/15 * * * *`.
   - O con pg_cron + pg_net llamando a la URL de la función con el header de service role.

## Notas

- El push funciona en Android/desktop (Chrome/Edge/Firefox) y en iOS **solo si la PWA está instalada** (Agregar a inicio) con iOS 16.4+.
- Sin VAPID configurado, los recordatorios siguen funcionando **localmente** con la app abierta (no requiere nada de esto).
- La ventana del cron (15 min) evita depender del minuto exacto; `reminder_last_sent` evita duplicados por día.
