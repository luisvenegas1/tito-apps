# 04 · MVP (versión completa desde el inicio)

Según lo decidido, el MVP es **completo desde el inicio**: la primera versión ya cubre la mayoría de las funcionalidades para que la app sea inmediatamente más potente que el Excel y reemplace de una vez el sistema de hojas de cálculo. Lo único que queda fuera del MVP es la visión de largo plazo (integraciones bancarias, OCR, inversiones), que vive en [15 · Funcionalidades futuras](15-future-features.md).

> **Criterio de MVP completo:** al terminar la v1, el usuario debe poder **abandonar por completo Google Sheets** sin perder ninguna capacidad que hoy tiene, y ganar varias nuevas.

## 4.1 Qué incluye el MVP

### Núcleo transaccional
- Registrar, editar y eliminar **gastos** e **ingresos**.
- Dimensiones completas por movimiento: monto, **moneda** (CRC/USD), **categoría**, **naturaleza** (`kind`), **responsable de pago** (`paid_by`), **ámbito** (`scope`), fecha, notas.
- **Captura rápida** (< 10 s) optimizada para móvil.
- Adjuntar un recibo (imagen) a un movimiento (almacenamiento simple; el OCR es futuro).

### Multi-moneda
- Moneda por movimiento.
- **Tipo de cambio configurable** (manual).
- Totales en colones y en dólares, con conversión automática en las vistas.

### Cuentas por cobrar
- Crear cuentas (mamá, hermano, amigo, pareja…).
- Registrar **cargos** y **abonos**.
- **Saldo pendiente** automático e historial completo por cuenta.
- Abonos que **no** cuentan como ingreso.

### Recurrencia y próximos pagos
- Plantillas de pagos **recurrentes** (mensual y otras periodicidades).
- **Generación automática** de las instancias del período.
- Panel de **próximos pagos** con estados: vence mañana, vence en N días, pagado, atrasado.

### Dashboard
- Ingresos del mes, gastos personales, gastos del hogar, disponible, déficit/superávit.
- Pendiente por cobrar (suma de saldos).
- Próximos pagos.
- Resumen por categoría y por moneda.
- **Gráficos** y **comparación contra meses anteriores**.

### Historial y reportes
- Navegación por **mes** y por **año**.
- Comparar meses y ver **tendencias**.
- **Reportes por pregunta**: gasto anual en tarjetas, avance del préstamo, gasto en carro, cuánto gastó/debe mamá, cuánto recuperé en el año.

### Metas
- Crear metas de **ahorro** y de **reducción de gasto por categoría**.
- Seguimiento con progreso.

### Notificaciones
- Recordatorios de pagos próximos (push de PWA y/o correo).

### Seguridad y plataforma
- Autenticación (Supabase Auth).
- **Row Level Security** en todas las tablas.
- **PWA** instalable, uso offline básico de lectura y captura (sincroniza al reconectar).

## 4.2 Qué NO incluye el MVP (queda para roadmap/futuro)

Estas capacidades son deseables pero no bloquean el reemplazo del Excel:

- Conexión con bancos / SINPE.
- Lectura automática de estados de cuenta.
- **OCR** de facturas / escaneo de recibos (más allá de guardar la imagen).
- Presupuestos avanzados por sobre-categoría.
- Inversiones, patrimonio, créditos como módulos dedicados.
- Multi-usuario colaborativo real (la pareja como usuaria con su propio login y permisos compartidos).

Ver el detalle y las fases en [12 · Roadmap](12-roadmap.md) y [15 · Funcionalidades futuras](15-future-features.md).

## 4.3 Definición de "Hecho" (Definition of Done) del MVP

El MVP se considera terminado cuando:

1. El usuario registra un gasto real en **menos de 10 segundos** en su teléfono.
2. Los **totales del mes** (ingresos, gastos personales, gastos del hogar, disponible, déficit/superávit) coinciden con el Excel para un mes de prueba migrado.
3. La **cuenta de mamá** reproduce exactamente el saldo pendiente que hoy lleva la hoja, con cargos y abonos.
4. Un **pago recurrente** (ej. préstamo) se genera solo el mes siguiente.
5. El **dashboard** muestra la comparación contra el mes anterior con datos reales.
6. Un **reporte** responde "¿cuánto me debe mamá hoy?" y "¿cuánto pagué del préstamo este año?" sin trabajo manual.
7. Otro usuario de prueba **no puede ver** ningún dato (RLS verificado).
8. La app es **instalable como PWA** y permite capturar un gasto sin conexión.

## 4.4 Métrica de éxito del MVP

- **Adopción real:** el usuario deja de abrir Google Sheets para sus finanzas durante 30 días seguidos.
- **Velocidad:** tiempo medio de captura de gasto < 10 s.
- **Confianza:** 0 descuadres en la cuenta de mamá tras un ciclo completo (cargos, abonos, cierre).
