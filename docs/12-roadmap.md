# 12 · Roadmap

El MVP es completo desde el inicio, así que el roadmap se organiza en **fases de construcción del MVP** (para entregar valor cada semana) seguidas de **fases post-MVP** (crecimiento a largo plazo). Los tiempos son estimaciones para un desarrollo enfocado; ajústense a la disponibilidad real.

## 12.1 Fase 0 — Cimientos (semana 1)
Preparar el terreno técnico.
- Proyecto React + Vite + TS + Tailwind; configuración PWA base.
- Proyecto Supabase; esquema del [doc 06](06-database.md) vía migraciones; enums y tablas.
- **RLS activada** en todas las tablas + pruebas de aislamiento.
- Auth (login/registro) y `profiles` con categorías semilla.
- **Entregable:** iniciar sesión y ver una app vacía segura.

## 12.2 Fase 1 — Línea de flotación (semanas 2-3)
Lo mínimo que ya reemplaza el Excel.
- Captura rápida (< 10 s) + CRUD de transacciones.
- Categorías (semilla + personalizadas).
- Multi-moneda por movimiento + TC configurable.
- **Cuentas por cobrar** completas (cargos, abonos, saldo, libro).
- Dashboard v1 (resumen del mes + pendiente por cobrar).
- **Entregable:** el usuario puede llevar el mes y la cuenta de mamá sin Excel.

## 12.3 Fase 2 — Automatización e inteligencia (semanas 4-5)
- Recurrencia (plantillas + generación por Edge Function/pg_cron).
- Próximos pagos con estados.
- Dashboard v2 (gráficos, comparación mensual, por categoría/moneda).
- Historial con filtros, navegación por mes/año, comparaciones y tendencias.
- **Entregable:** la app anticipa y analiza, no solo registra.

## 12.4 Fase 3 — Reportes, metas y notificaciones (semanas 6-7)
- Reportes por pregunta (tarjetas, préstamo, carro, mamá gastó/debe, recuperado).
- Metas (ahorro y reducción) con progreso.
- Notificaciones (push PWA + correo) de vencimientos y alertas.
- Exportar datos (CSV/Excel) y respaldo.
- **Entregable:** MVP completo según [doc 04](04-mvp.md).

## 12.5 Fase 4 — Pulido y migración (semana 8)
- Importador de Excel asistido con validación.
- Offline robusto (cola + sync idempotente).
- Accesibilidad, modo oscuro, rendimiento, observabilidad (Sentry).
- Pruebas end-to-end de los flujos clave.
- **Entregable:** listo para uso diario real; Excel archivado.

## 12.6 Hitos de verificación (Definition of Done del MVP)
Al cerrar la Fase 4 deben cumplirse los 8 criterios del [doc 04 §4.3](04-mvp.md): captura < 10 s, totales que cuadran con el Excel, cuenta de mamá exacta, recurrencia automática, dashboard comparativo, reportes clave, RLS verificada y PWA instalable con captura offline.

## 12.7 Post-MVP — crecimiento (trimestres siguientes)
Ver detalle en [15 · Funcionalidades futuras](15-future-features.md).

| Trimestre | Tema | Contenido |
|-----------|------|-----------|
| T+1 | Presupuestos | Presupuesto por categoría con alertas y proyección |
| T+1 | Hogar compartido | La pareja como usuaria; espacios compartidos con permisos |
| T+2 | Captura inteligente | OCR de recibos, escaneo de facturas |
| T+2 | Estados de cuenta | Importar/parsear estados de cuenta bancarios |
| T+3 | Conexión bancaria / SINPE | Sincronización de movimientos (según disponibilidad de APIs en CR) |
| T+3 | Patrimonio | Activos, deudas, patrimonio neto; seguimiento de créditos |
| T+4 | Inversiones | Portafolio y rendimiento |
| T+4 | Metas financieras avanzadas | Proyecciones, escenarios |

## 12.8 Principio de secuenciación
Cada fase deja la app **usable y valiosa**. Nunca se construye una capa que dependa de otra inexistente. La secuencia protege contra el riesgo R1 (sobrealcance): si en cualquier punto hay que pausar, lo ya entregado sirve por sí solo.
