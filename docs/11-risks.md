# 11 · Riesgos

Riesgos identificados con su probabilidad, impacto y mitigación. Prioridad = combinación de ambos.

## 11.1 Riesgos de producto

### R1 — Sobrealcance del MVP "completo" (Alta / Alto)
Elegir un MVP completo desde el inicio es potente pero puede alargar demasiado la primera entrega y agotar el impulso.
**Mitigación:** aunque el alcance sea completo, construir en el **orden del backlog** ([13](13-backlog.md)) para que cada semana haya algo usable. Definir una "línea de flotación" (transacciones + cuenta de mamá + dashboard) que ya reemplaza el Excel, y tratar el resto como incrementos rápidos.

### R2 — La captura no llega a "< 10 s" (Media / Alto)
Si registrar un gasto sigue siendo tedioso, el usuario vuelve al Excel o deja de anotar.
**Mitigación:** tratar la captura rápida como característica número uno; prototipar y cronometrar el flujo con datos reales antes de dar por bueno el diseño; valores por defecto agresivos.

### R3 — Complejidad conceptual expuesta al usuario (Media / Medio)
`kind`, `scope`, `paid_by` son potentes pero pueden abrumar.
**Mitigación:** ocultarlos tras valores por defecto y modo detallado opcional; lenguaje humano en la UI ("¿Quién lo pagó?") en vez de jerga.

## 11.2 Riesgos técnicos

### R4 — Errores en cálculos de moneda (Media / Alto)
La conversión CRC↔USD mal hecha corrompe totales y confianza.
**Mitigación:** centralizar la conversión en funciones SQL/utilidades con pruebas unitarias; nunca convertir de forma destructiva; mostrar el TC usado.

### R5 — Descuadres en cuentas por cobrar (Baja / Alto)
Es el dato más sensible (dinero real entre familia).
**Mitigación:** el saldo se **calcula** por vista, nunca se almacena; pruebas que reproduzcan el saldo del Excel; contra-asientos en vez de ediciones destructivas.

### R6 — RLS mal configurada expone datos (Baja / Crítico)
Una política ausente o incorrecta filtra información financiera.
**Mitigación:** RLS activada por defecto en todas las tablas; pruebas automáticas de aislamiento (usuario A no ve datos de B); revisión de políticas en cada migración. Ver [14](14-security.md).

### R7 — Recurrencia no se genera si depende del cliente (Media / Medio)
Si la generación ocurriera al abrir la app, un mes sin abrir rompería los próximos pagos.
**Mitigación:** generación por Edge Function + `pg_cron`, independiente de que el usuario abra la app; idempotencia con `unique(template_id, due_date)`.

### R8 — Sincronización offline duplica o pierde datos (Media / Medio)
**Mitigación:** cola con `client_uuid` y `upsert` idempotente; indicadores visibles de estado de sincronización; pruebas de reconexión.

### R9 — Migración desde Excel imprecisa (Alta / Medio)
Las hojas usan color para moneda y estructura irregular; el import puede equivocarse.
**Mitigación:** importación asistida con pantalla de validación (totales y saldo de mamá deben coincidir); permitir corrección manual antes de confirmar.

## 11.3 Riesgos de datos y privacidad

### R10 — Pérdida de datos (Baja / Crítico)
**Mitigación:** backups automáticos de Supabase; función de exportación total (F-105); no borrados duros (archivar).

### R11 — Recibos con datos sensibles (Media / Medio)
**Mitigación:** Storage privado con URLs firmadas de corta duración; no exponer archivos públicamente.

### R12 — Dependencia de un solo proveedor (Supabase/Vercel) (Baja / Medio)
**Mitigación:** el modelo es PostgreSQL estándar y el frontend es una SPA portable; exportaciones periódicas; evitar características propietarias no esenciales.

## 11.4 Riesgos operativos / personales

### R13 — Abandono por falta de hábito (Media / Alto)
Toda app de finanzas compite con la inercia.
**Mitigación:** notificaciones útiles (no molestas), captura rapidísima, dashboard gratificante; que la app "valga la pena abrir" cada día.

### R14 — Multi-usuario futuro (pareja) mal anticipado (Media / Medio)
Si mañana la pareja quiere su propio acceso, un modelo demasiado centrado en un usuario costará caro.
**Mitigación:** modelar `people` desde ya y dejar el camino para "espacios/hogares" compartidos en el roadmap ([12](12-roadmap.md)), sin construirlo aún.

## 11.5 Matriz resumen

| ID | Riesgo | Prob. | Impacto | Prioridad |
|----|--------|-------|---------|-----------|
| R1 | Sobrealcance MVP | Alta | Alto | 🔴 |
| R2 | Captura lenta | Media | Alto | 🔴 |
| R6 | RLS expone datos | Baja | Crítico | 🔴 |
| R4 | Errores de moneda | Media | Alto | 🟠 |
| R5 | Descuadre por cobrar | Baja | Alto | 🟠 |
| R9 | Migración imprecisa | Alta | Medio | 🟠 |
| R13 | Abandono por hábito | Media | Alto | 🟠 |
| R7 | Recurrencia en cliente | Media | Medio | 🟡 |
| R8 | Sync offline | Media | Medio | 🟡 |
| R3 | Complejidad UX | Media | Medio | 🟡 |
| R11 | Recibos sensibles | Media | Medio | 🟡 |
| R14 | Multi-usuario futuro | Media | Medio | 🟡 |
| R10 | Pérdida de datos | Baja | Crítico | 🟡 |
| R12 | Vendor lock-in | Baja | Medio | 🟢 |
