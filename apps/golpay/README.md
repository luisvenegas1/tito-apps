# GolPay ⚽

Organizá tu mejenga y cobrá sin perseguir a nadie. App web (mobile-first, PWA) para
controlar pagos de partidos de fútbol y armar equipos balanceados.

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- Supabase (Postgres, Auth, RLS, Funciones RPC)
- TanStack Query
- Deploy en Vercel

## Puesta en marcha

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Crear un proyecto en [Supabase](https://supabase.com), y en el **SQL Editor**
   ejecutar el contenido de `supabase/migrations/0001_init.sql`.

3. Copiar `.env.example` a `.env.local` y completar con los datos de tu proyecto
   (Project Settings → API):

   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

4. Correr en desarrollo:

   ```bash
   npm run dev
   ```

5. Tests de lógica (parser y balanceador):

   ```bash
   npm test
   ```

## Cómo funciona el acceso

- **Organizador**: cuenta con Supabase Auth (correo + contraseña). Ve y administra
  sólo sus propios partidos (protegido con Row Level Security).
- **Jugador**: entra por el enlace público `/j/:token` que compartís en WhatsApp.
  Selecciona su nombre e ingresa el **PIN de 4 dígitos** del partido para reportar
  su pago. No necesita cuenta. El jugador sólo puede **reportar** (amarillo); el
  organizador **confirma** (verde). Toda la escritura del jugador pasa por funciones
  RPC `SECURITY DEFINER` (`report_payment`), nunca por acceso directo a las tablas.

## Estructura

```
src/
  lib/
    parser/     # parser de listas de WhatsApp (+ tests)
    balancer/   # algoritmo de equipos 2-4+ (+ tests)
    supabase/   # cliente y tipos
    utils/      # formato de colones, PIN, colores de estado
  features/
    auth/       # login/registro + contexto de sesión
    matches/    # dashboard, formulario y detalle (pantalla estrella)
    import/     # pegar lista + vista previa editable
    payments/   # totales y mensajes de WhatsApp
    teams/      # generador de equipos
    players/    # jugadores frecuentes + emparejamiento
    public/     # vista del jugador (enlace + PIN)
  components/ui/  # badges, topbar, clipboard
supabase/
  migrations/   # esquema + RLS + funciones RPC
```

## Estados de pago (semáforo)

- 🟢 Verde — confirmado por el organizador
- 🟡 Amarillo — reportado por el jugador (pendiente de confirmar)
- 🟠 Naranja — pago parcial
- 🔴 Rojo — pendiente
- ⚪ Gris — invitado / no asistió

## Notas de seguridad

- El nivel de habilidad de cada jugador es privado (sólo el organizador lo ve).
- El PIN se guarda **hasheado** (bcrypt vía `pgcrypto`), nunca en texto plano.
- `public_token` es un UUID aleatorio, no enumerable.
- No se almacenan datos bancarios.

## Roadmap (post-MVP)

Modo oscuro, historial avanzado con saldos acumulados, recalcular cuota de torneo
en un clic, integración real con WhatsApp, y planes de pago.
