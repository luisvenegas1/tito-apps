# Conexión de wearables

Guía para conectar relojes/pulseras con NutriCoach. La versión ilustrada dentro de la
app está en `/workouts/connect/guide` (`features/workouts/ConnectGuidePage.tsx`).

## Por qué no es "directo"

Ni Amazfit ni el Apple Watch ofrecen una API de nube apta para leer tu historial desde una
web/PWA:

- **Amazfit / Zepp:** Zepp OS solo expone datos en tiempo real en el reloj; no hay API de
  historial para terceros.
- **Apple Watch:** los datos viven en Apple Health (HealthKit), solo iOS y sin acceso web.

## La vía real: Strava

Ambos dispositivos sincronizan sus actividades a **Strava**, que sí tiene una API pública
OAuth consumible desde una Edge Function. Es la ruta recomendada.

```
Reloj  →  App del reloj (Zepp / Salud)  →  Strava  →  NutriCoach
```

Implementado en `StravaProvider` (`@titoapps/health`). Atribuye cada actividad al dispositivo
real (`amazfit` / `apple_health`) para no requerir cambios de esquema en `workouts.source`.

### Amazfit (vía Zepp)

1. Abrí la app **Zepp** y verificá que tu reloj esté sincronizado.
2. Zepp → Perfil → Añadir cuentas → **Strava** → Conectar y autorizar.
3. Activá la sincronización automática de entrenamientos a Strava.
4. NutriCoach → Entrenamientos → Conectar dispositivo → **Strava** → autorizar.

### Apple Watch (vía Salud)

1. Los entrenamientos del Apple Watch ya se guardan en la app **Salud**.
2. Instalá **Strava** y en Ajustes → Salud → Strava activá los permisos.
3. Registrá/sincronizá tus entrenamientos con Strava.
4. NutriCoach → Entrenamientos → Conectar dispositivo → **Strava** → autorizar.

### Fitbit (directo)

Fitbit sí tiene API propia: `FitbitProvider` (`@titoapps/health`) se conecta directo con OAuth.

## Pendiente de operación

Falta el flujo **OAuth** (registrar la app en Strava/Fitbit para obtener client id/secret y
emitir el token). Los proveedores ya normalizan y están testeados; solo falta emitir el token.

## Alternativa (futuro)

Para métricas más allá de entrenamientos (sueño, FC continua), un **agregador** (Terra, Sahha,
Rook) integra Zepp/Amazfit + Apple Health con una sola API. Se añadiría como otro `HealthProvider`.
