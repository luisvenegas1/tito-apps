# 13 · Backlog priorizado

Backlog en formato épica → historia de usuario, priorizado por fase ([12 · Roadmap](12-roadmap.md)) y con referencia a funcionalidades ([05](05-features.md)). Prioridad: **P0** (imprescindible/línea de flotación), **P1** (MVP completo), **P2** (post-MVP).

Formato de historia: *Como [rol], quiero [acción] para [beneficio].* Cada una incluye criterios de aceptación (CA) resumidos.

## Épica A — Cimientos y cuenta (Fase 0)

**A1 · Autenticación** · P0 · F-100
Como usuario, quiero registrarme e iniciar sesión para proteger mis datos.
CA: registro con email; sesión persistente; recuperar contraseña; al crear cuenta se generan `profile` + categorías semilla.

**A2 · Seguridad RLS** · P0 · [14](14-security.md)
Como usuario, quiero que solo yo vea mis datos.
CA: RLS activa en todas las tablas; prueba automatizada de que un usuario B no ve datos de A.

**A3 · Preferencias base** · P0 · F-103
Como usuario, quiero fijar mi moneda base y TC inicial.
CA: guardar `base_currency` y un `exchange_rate` inicial.

## Épica B — Transacciones (Fase 1)

**B1 · Captura rápida** · P0 · F-03
Como usuario, quiero registrar un gasto en menos de 10 segundos.
CA: monto + categoría + guardar en ≤ 3 toques; moneda y responsable por defecto; fecha = hoy; medición de tiempo < 10 s.

**B2 · CRUD de transacciones** · P0 · F-01, F-02, F-04
Como usuario, quiero crear, editar y borrar gastos e ingresos.
CA: alta con todas las dimensiones; edición con auditoría; borrado con confirmación.

**B3 · Dimensiones del movimiento** · P0 · F-01
Como usuario, quiero indicar naturaleza, responsable y ámbito.
CA: `kind`, `paid_by`, `scope`, `payer_person_id`, `shared_split` persistidos; valores por defecto sensatos.

**B4 · Recibo adjunto** · P1 · F-05
Como usuario, quiero adjuntar la foto de un recibo.
CA: subida a Storage privado; vista con URL firmada.

**B5 · Búsqueda y filtros** · P1 · F-07, F-08
Como usuario, quiero filtrar mis movimientos.
CA: filtros por fecha, categoría, moneda, responsable, ámbito, naturaleza y texto; etiquetas.

## Épica C — Categorías (Fase 1)

**C1 · Categorías semilla y personalizadas** · P0 · F-10, F-11
Como usuario, quiero las categorías de mi Excel y crear nuevas.
CA: semilla con las 10 categorías; crear/renombrar/archivar con ícono y color.

**C2 · Subcategorías** · P1 · F-12
CA: jerarquía padre/hijo; reportes agregables por padre.

## Épica D — Multi-moneda (Fase 1)

**D1 · Moneda por movimiento** · P0 · F-20
CA: cada transacción guarda CRC o USD; nunca se convierte de forma destructiva.

**D2 · Tipo de cambio y conversión** · P0 · F-21, F-22, F-23, F-24
Como usuario, quiero ver totales en ₡ y $ con conversión.
CA: TC editable con vigencia; totales por moneda separados; conversión a moneda base con TC vigente y marca de "estimado".

## Épica E — Cuentas por cobrar (Fase 1) — diferenciador clave

**E1 · Crear y gestionar cuentas** · P0 · F-30, F-35
Como usuario, quiero crear cuentas por cobrar (mamá, hermano…).
CA: alta con nombre, persona, moneda; múltiples cuentas; activar/desactivar.

**E2 · Cargos y abonos** · P0 · F-31, F-32
Como usuario, quiero registrar cargos y abonos.
CA: cargo aumenta saldo; abono lo reduce y **no** cuenta como ingreso (verificado en dashboard); mensaje aclaratorio en abono.

**E3 · Saldo e historial (libro)** · P0 · F-33, F-34
Como usuario, quiero ver el saldo pendiente y el historial tipo libro.
CA: saldo calculado por vista `receivable_balances`; historial con fecha, concepto, cargo, abono, saldo corriente, notas.

**E4 · Estado de cuenta y vínculo con tarjeta** · P1 · F-36, F-37
CA: exportar estado por período; marcar cuenta como ligada a una extensión de tarjeta.

## Épica F — Recurrencia y próximos pagos (Fase 2)

**F1 · Plantillas recurrentes** · P0 · F-40
CA: definir periodicidad, monto estimado, moneda, día de vencimiento, categoría, responsable.

**F2 · Generación automática** · P0 · F-41
Como usuario, quiero que los pagos del mes se generen solos.
CA: Edge Function + pg_cron genera `scheduled_payments` idempotentes (`unique(template_id, due_date)`), sin depender de que abra la app.

**F3 · Próximos pagos y estados** · P0 · F-42, F-43, F-44, F-45
CA: panel con estados (vence mañana, en N días, pagado, atrasado); marcar pagado con monto real; posponer/omitir.

## Épica G — Dashboard (Fases 1-2)

**G1 · Resumen del mes** · P0 · F-50, F-51, F-52
CA: ingresos, gastos personales, gastos del hogar, disponible, déficit/superávit, pendiente por cobrar, próximos pagos.

**G2 · Gráficos y comparación** · P1 · F-53, F-54, F-55, F-56
CA: por categoría, por moneda, gráficos y comparación vs. mes anterior.

## Épica H — Historial y reportes (Fases 2-3)

**H1 · Navegación e historial** · P1 · F-60, F-61, F-62, F-63
CA: navegar por mes/año; comparar meses; tendencias.

**H2 · Reportes por pregunta** · P1 · F-64…F-69
CA: tarjetas que responden gasto en tarjetas, avance del préstamo, gasto en carro, cuánto gastó/debe mamá, cuánto recuperé.

**H3 · Exportar** · P1 · F-70, F-105
CA: exportar período/reporte a CSV/Excel; respaldo total.

## Épica I — Metas (Fase 3)

**I1 · Crear y seguir metas** · P1 · F-80, F-81, F-82
CA: metas de ahorro y de reducción por categoría; barra de progreso y proyección.

**I2 · Alertas de meta** · P1 · F-83, F-93
CA: aviso cuando el gasto amenaza una meta.

## Épica J — Notificaciones (Fase 3)

**J1 · Recordatorios de pago** · P1 · F-90, F-91, F-92
CA: push PWA y/o correo; anticipación configurable; alertas de déficit.

## Épica K — Plataforma (Fases 0-4)

**K1 · PWA instalable** · P0 · F-101
CA: manifest + service worker; instalable en móvil y escritorio.

**K2 · Offline y sincronización** · P1 · F-102
CA: captura offline en cola (IndexedDB) con `client_uuid`; sync `upsert` idempotente; indicador de estado.

**K3 · Importar Excel** · P1 · F-104
CA: importación asistida con pantalla de validación (totales y saldo de mamá deben coincidir) antes de confirmar.

## Épica L — Post-MVP (Fase Roadmap) · P2
Presupuestos, hogar compartido (pareja como usuaria), OCR de recibos, estados de cuenta, conexión bancaria/SINPE, patrimonio, inversiones, metas avanzadas. Detalle en [15](15-future-features.md).

## Orden de ataque recomendado (resumen)

```
A1 A2 A3  →  B1 B2 B3 C1 D1 D2  →  E1 E2 E3 G1   (línea de flotación: ya sin Excel)
   →  F1 F2 F3 G2 H1  →  H2 H3 I1 I2 J1  →  B4 B5 C2 E4 K1 K2 K3  →  L (post-MVP)
```

La regla: **nunca empezar una historia cuya dependencia no esté cerrada**, y priorizar siempre lo que acerca al usuario a abandonar el Excel.
