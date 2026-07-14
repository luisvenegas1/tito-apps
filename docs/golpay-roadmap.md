# GolPay — Visión de producto y roadmap

> Guía oficial del producto. Documento vivo: se actualiza al cerrar cada sprint.
> Última actualización: cierre de Sprint 1.

## Visión

GolPay es el sistema operativo de la mejenga: en segundos armás el partido de
siempre, sabés quién viene, cobrás sin perseguir, hacés equipos justos, registrás
al campeón y —con el tiempo— tu grupo tiene **memoria**: asistencia, pagos, nivel,
campeonatos y MVP de cada jugador. El organizador trabaja menos; el jugador entra
desde WhatsApp y todo fluye.

**Principios**
1. Cero fricción para el organizador.
2. El jugador entra sin cuenta (enlace + PIN).
3. Cada partido deja datos que mejoran el siguiente.

## Estado actual (post Sprint 1)

Ya funciona: crear partido (mejenga/torneo), import inteligente desde WhatsApp,
enlace público + PIN, reporte de pago del jugador y **bandeja de aprobación** del
organizador (con `payment_events`), niveles 1–3 (Recreativo/Intermedio/Avanzado),
jugadores frecuentes ("Mis jugadores") con posición/portero/notas/última
participación, **balanceador** con N equipos y porteros garantizados, publicación
de equipos, formato 12h y fix de rutas SPA en Vercel.

Lo que falta explotar: (1) saber quién realmente viene, (2) **resultados y
campeones**, (3) que los datos acumulados se vuelvan valor (perfil del jugador
como pilar), (4) el ciclo completo de plata (deudas que arrastran), (5) torneos.

## Decisiones de arquitectura aprobadas

- **Asistencia y pago son ejes independientes.** `match_players` tendrá un
  `attendance_status` propio (RSVP/check-in), separado del `payment_status`. Un
  jugador puede estar *confirmado* y *pendiente de pago* a la vez. Es la base de
  RSVP, check-in y estadísticas.
- **Persistir equipos + resultados históricamente.** Cada partido guarda sus
  equipos (`teams`/`team_members`) y su resultado (`match_results`). Esto habilita
  campeones, MVP y —a futuro— **estadísticas de combinaciones** (duplas, tríos,
  equipos históricos) sin rediseñar nada. Se diseña desde ya, se explota después.
- **Formatos de equipo variables.** GolPay NO asume cuadrangular. Según la cantidad
  de jugadores recomienda 2, 3, 4 o más equipos (ideal 5–6 por equipo, con cambios),
  repartiendo porteros disponibles, y el organizador siempre puede sobrescribir
  (número de equipos, jugadores por equipo, cambios, modo automático o manual). Solo
  es "cuadrangular" si se eligen 4 equipos.
- **La confirmación de asistencia va protegida por el PIN del partido** (igual que
  reportar pago), para que un tercero con el enlace no altere la lista ni la lista
  de espera.
- **Autenticación por email o username.** El organizador puede iniciar sesión con
  su correo o con un username único (case-insensitive). Se implementa como fase
  previa al Sprint 2 porque afecta el modelo de perfil y el login.

## El perfil del jugador es un PILAR del producto

No es solo nivel y posición. El perfil crece con cada partido y concentra:

- Nivel (Recreativo/Intermedio/Avanzado) y posición favorita; si puede ser portero.
- **Asistencia**: % e historial, rachas de asistencia.
- **Puntualidad de pago**: paga a tiempo %, deuda actual, historial.
- **Campeonatos** ganados y **MVP** obtenidos.
- **Rachas** (asistencia, victorias, MVP).
- **Disponibilidad por días** (qué días suele jugar).
- Notas del organizador; última participación.
- Base para **estadísticas futuras** y para el **rating de confiabilidad**.

Este perfil es también el primer candidato a reutilizarse en otras apps de Tito Apps.

---

## Roadmap por sprints

### Fase previa (Sprint 1.5) — Autenticación por email o username
- **Objetivo:** que el organizador entre con correo **o** username único; base del
  modelo de perfil.
- **Funcionalidades:** username único case-insensitive; login en un solo campo
  (email o username); reglas de username (3–24, letras/números/`-`/`_`, sin espacios,
  palabras reservadas bloqueadas); recuperación por email; cambio de username en
  ajustes; compatibilidad con cuentas sin username (se pide crear uno al entrar).
- **Cambios de BD:** `profiles.username` + índice único `lower(username)` +
  validación por CHECK; resolución segura username→email vía Edge Function
  (service_role, sin exponer el email).
- **Riesgos:** exposición de email (se evita con Edge Function); duplicados por
  case; cuentas legadas sin username.
- **Complejidad:** Media · **Impacto:** Medio (habilitador) · **Prioridad:** P0
  (bloquea el modelo de perfil).

### Sprint 2 — Asistencia, recurrencia, formatos variables y resultados
- **Objetivo:** armar el partido de siempre en segundos, saber quién viene, generar
  equipos en el **formato correcto según la cantidad de jugadores**, y registrar al
  campeón como parte normal del flujo.
- **Funcionalidades:**
  - RSVP desde el enlace (voy / no voy / tal vez, **protegido por el PIN**), cupo
    máximo, **lista de espera** con auto-promoción, cierre de lista.
  - Partidos **recurrentes / plantillas** ("crear como el lunes pasado" / duplicar).
  - **Check-in** el día (asistió / no asistió).
  - **Formatos variables de equipos:** al cerrar la lista o antes de generar, GolPay
    **recomienda** cuántos equipos según jugadores y porteros disponibles:
    - 10–12 → 2 equipos de 5–6.
    - 13–14 → 2 equipos con 1 cambio por equipo.
    - 15–18 → 3 equipos.
    - 20–24 → 4 equipos.
    - más → más equipos o cambios.
    El organizador **siempre sobrescribe**: elegir 2/3/4+ equipos, jugadores por
    equipo, cantidad de cambios, y modo automático o manual. **No se asume
    cuadrangular** salvo que se elijan 4 equipos.
  - **Resultados del partido** (cualquier formato): equipo **campeón**, **marcador
    opcional**, **MVP opcional**; **mostrar el campeón** cuando un jugador abre el
    enlace para pagar; **historial de campeones**.
- **Cambios de BD:**
  - `match_players.attendance_status` (enum: pendiente/confirmado/lista_espera/
    declinado/asistio/no_asistio), separado de `payment_status`.
  - `match_templates` (plantillas del organizador); campos de recurrencia en `matches`.
  - Config de formato en `matches` (equipos deseados, cambios) o en el armado.
  - `match_results` (match_id, `winner_team_id` → teams, `mvp_match_player_id` →
    match_players, `score` opcional, notas). Equipos ya persistidos en
    `teams`/`team_members` → base para campeones y combinaciones.
  - `get_public_match` devuelve el resultado/campeón cuando existe.
- **Cambios de UI:** vista pública con confirmación (PIN) + estado de cupo/lista y
  **cartel del campeón**; creación con "usar plantilla / duplicar"; check-in rápido;
  **recomendador de formato** antes de generar equipos (con override manual);
  pantalla de "registrar resultado" (campeón, MVP, marcador).
- **Balanceador:** soporta N equipos; reparte niveles y porteros; considera
  **titulares y cambios**; evita que un equipo quede claramente más fuerte; muestra
  **puntaje estimado por equipo**.
- **Riesgos:** modelar asistencia vs pago sin romper la bandeja; ligar el resultado
  a equipos publicados; la lógica de recomendación de formato con pocos/ muchos
  porteros.
- **Complejidad:** Media-Alta · **Impacto:** Alto · **Prioridad:** P0.

### Sprint 3 — Perfil del jugador, historial y estadísticas
- **Objetivo:** convertir los datos acumulados en el pilar del producto.
- **Funcionalidades:** ficha de jugador completa (asistencia %, pagos, campeonatos,
  MVP, rachas, disponibilidad por días, última vez); dashboard de estadísticas del
  grupo (partidos, recaudación, top asistentes, morosos, campeones); **rating de
  confiabilidad** (asistencia + pago); sugerencia de ajuste de nivel. Se deja
  **contemplado el diseño de estadísticas de combinaciones** (duplas que más ganan,
  quiénes juegan juntos, mejores equipos históricos) para implementarlas cuando haya
  suficiente historial.
- **Cambios de BD:** en su mayoría **agregaciones** sobre datos ya existentes
  (`payment_events`, asistencia, `match_results`, `team_members`); vistas/RPC de
  stats; opcional materializar si el volumen lo pide. `player_availability`
  (días) si se activa la disponibilidad.
- **Cambios de UI:** ficha del jugador; dashboard de stats; badges de confiabilidad
  en listas e import.
- **Riesgos:** performance de agregaciones; privacidad (nivel/rating privados del
  organizador).
- **Complejidad:** Media · **Impacto:** Alto · **Prioridad:** P0/P1.

### Sprint 4 — Pagos avanzados: saldos, deudas y comprobantes (F2)
- **Objetivo:** cerrar el ciclo de la plata.
- **Funcionalidades:** saldos acumulados por jugador (deuda que arrastra entre
  fechas); **comprobantes con Storage** (el F2 diferido); deep-link SINPE con monto;
  recordatorios de deuda; estado de cuenta por jugador; cobranza segmentada.
- **Cambios de BD:** saldo derivado de `match_players`/`payment_events` (o
  `player_balances`); **bucket de Storage + RLS** para comprobantes;
  `match_players.payment_proof_url`; RPC de subida segura para anónimos.
- **Cambios de UI:** estado de cuenta del jugador; indicadores de deuda; adjuntar
  comprobante al reportar; comprobante visible en la bandeja.
- **Riesgos:** **el mayor del roadmap** — subidas anónimas (tamaño/tipo/abuso, RLS);
  consistencia de saldos.
- **Complejidad:** Media-Alta · **Impacto:** Alto · **Prioridad:** P1.

### Sprint 5 — Torneos, combinaciones y engagement
- **Objetivo:** soportar torneos multi-fecha, explotar las estadísticas de
  combinaciones y sumar enganche.
- **Funcionalidades:** fixtures, resultados y tabla de posiciones para torneos
  multi-fecha; **estadísticas de combinaciones** (duplas/tríos/equipos históricos)
  ya con datos suficientes; resumen compartible (imagen para WhatsApp);
  notificaciones **PWA push**; engagement liviano (goleadores, votación de MVP).
- **Cambios de BD:** `tournaments`, `tournament_matches`, standings derivado;
  `push_subscriptions`; opcional `match_events` (goles).
- **Cambios de UI:** vista de torneo con tabla/calendario; explorador de
  combinaciones; generador de imagen resumen; suscripción a push.
- **Riesgos:** alcance amplio (acotar cuadrangular/torneo simple primero); push en
  iOS PWA es limitado.
- **Complejidad:** Alta · **Impacto:** Medio-Alto · **Prioridad:** P2.

*(Transversal: constructor de mensajes/deep-links de WhatsApp y recordatorios
programados se robustece en cada sprint.)*

---

## Reutilización en Tito Apps

- **Sistema de perfiles** (`frequent_players` → "miembros/contactos ligados a un
  owner"): SplitPay (personas del grupo), MoneyTrack (personas/categorías).
  Candidato a `@titoapps/profiles`.
- **Sistema de estadísticas** (agregaciones + tarjetas + dashboards):
  `@titoapps/stats`.
- **Sistema de notificaciones** (deep-links WhatsApp + recordatorios + push PWA):
  `@titoapps/notify`.
- **Patrón "confirmación en dos niveles"** (reportado→confirmado / la bandeja):
  reutilizable en SplitPay para confirmar quién pagó.
- **Import genérico** (pegar lista → entidades): más allá de WhatsApp/fútbol.
- **Componentes UI** (`@titoapps/ui`): extraer neutrales que estos sprints pedirán —
  `DataTable`, `SearchInput`, `Tabs`/`SegmentedControl`, `Avatar`, `StatCard`.
- **Utilidades** (`@titoapps/utils`): sumar helpers de dinero/saldos,
  `shareToWhatsApp`, export CSV.
- **Servicios**: subida a Storage con RLS, scheduling/recurrencia, y las políticas
  RLS como plantilla reusable.

## Orden de ejecución
Sprint 2 → 3 → 4 → 5. Cada sprint arranca con su plan detallado (objetivo,
funcionalidades, BD, UI, riesgos, complejidad, impacto, prioridad, pruebas) y se
implementa completo, manteniendo TypeScript, tests y build en verde.
