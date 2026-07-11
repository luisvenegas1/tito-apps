# 10 · Casos especiales

Situaciones límite que el diseño debe manejar bien. Cada caso indica la regla de negocio y su tratamiento.

## 10.1 Responsabilidad de pago y hogar

### C1 — Gasto que ahora paga la pareja (₡0 aparente)
**Situación:** la luz la paga la pareja desde hace meses.
**Regla:** se registra como `expense`, `scope='household'`, `paid_by='partner'` con su monto **real**, nunca ₡0.
**Efecto:** cuenta en "Gastos del hogar" (costo real), no en el disponible del usuario. Historial de luz intacto y comparable.

### C2 — Gasto compartido con split
**Situación:** una cena que se divide 50/50.
**Regla:** `paid_by='shared'`, `scope='shared'`, `shared_split = {"me":0.5,"partner":0.5}`.
**Efecto:** el dashboard imputa al usuario solo su porción en "gasto personal", pero muestra el total en "gasto del hogar/compartido".

### C3 — El usuario paga algo de la pareja (adelanto)
**Situación:** el usuario cubre un gasto que le corresponde a la pareja y luego se lo devuelven.
**Regla:** `kind='advance'`; cuando devuelven, `kind='reimbursement'` con `linked_transaction_id` al adelanto.
**Efecto:** no infla el gasto personal permanente; alimenta el reporte "cuánto recuperé".

## 10.2 Cuentas por cobrar

### C4 — Sobrepago del tercero (saldo negativo)
**Situación:** mamá deposita más de lo que debía.
**Regla:** el `balance` de `receivable_balances` queda negativo.
**Efecto:** la UI lo interpreta como "yo le debo a mamá ₡X"; se muestra con etiqueta clara y color distinto. No se bloquea; es válido.

### C5 — Cargo o abono en la moneda equivocada
**Situación:** la cuenta es en ₡ pero entra un movimiento en $.
**Regla:** cada cuenta tiene una moneda; un movimiento en otra moneda se convierte con el TC vigente **o** se impide y se sugiere crear una cuenta en esa moneda.
**Decisión MVP:** una cuenta = una moneda; si se necesita otra, se crea otra cuenta. Simple y sin ambigüedad.

### C6 — Abono que cubre varias compras
**Situación:** un solo depósito paga múltiples cargos.
**Regla:** el abono reduce el **saldo global** de la cuenta; no se aplica cargo por cargo (modelo de cuenta corriente, no de facturas).
**Efecto:** simple y fiel al Excel actual.

### C7 — Corrección de un cargo ya registrado
**Situación:** se registró mal el monto de una compra de mamá.
**Regla:** editar el movimiento (con auditoría de `updated_at`) o crear un contra-asiento. El saldo se recalcula solo (vista).

## 10.3 Multi-moneda

### C8 — Mes con gastos en ambas monedas
**Regla:** los totales por moneda se muestran separados (₡ y $) y, para un total único, se convierte a la moneda base con el TC vigente. La conversión se marca como "estimada" con el TC usado.

### C9 — Cambio del tipo de cambio a mitad de mes
**Regla:** `exchange_rates` guarda `valid_from`. Los reportes históricos usan el TC vigente en la fecha del movimiento (o el más reciente configurado), evitando reescribir el pasado.

### C10 — Ingreso en dólares, gastos en colones
**Regla:** cada uno guarda su moneda; el "disponible" se calcula en la moneda base con conversión. Nunca se mezcla sin convertir.

## 10.4 Recurrencia y próximos pagos

### C11 — Monto real distinto del estimado
**Situación:** la luz varía cada mes.
**Regla:** el `scheduled_payment` tiene `amount_est`; al confirmar se ingresa el monto real en la `transaction`. El estimado solo guía.

### C12 — Mes sin pagar un recurrente (omitido)
**Regla:** `status='skipped'` o posponer cambiando `due_date`. La plantilla sigue activa para el mes siguiente.

### C13 — Pago recurrente pagado por la pareja
**Regla:** al confirmar, se puede fijar `paid_by='partner'`. Igual que C1: cuenta como hogar, no como personal.

### C14 — Doble generación por reintentos
**Regla:** `unique(template_id, due_date)` impide crear dos veces el mismo pago. La generación es idempotente.

### C15 — Plantilla desactivada o finalizada
**Regla:** `is_active=false` o `end_on` en el pasado detiene futuras generaciones sin borrar el historial ya generado.

## 10.5 Datos y edición

### C16 — Eliminar una categoría con movimientos
**Regla:** no se borra; se **archiva** (`is_archived=true`). Los movimientos históricos conservan su categoría. `on delete set null` protege si se fuerza el borrado.

### C17 — Eliminar una persona vinculada a una cuenta
**Regla:** `on delete set null` en la FK; la cuenta por cobrar y su historial sobreviven.

### C18 — Movimiento con fecha en un mes ya "cerrado"
**Regla:** no hay cierres duros en el MVP; se permite registrar en meses pasados y los resúmenes se recalculan. (Un bloqueo opcional de meses cerrados es futuro.)

## 10.6 Plataforma / sincronización

### C19 — Captura offline y luego duplicado por red intermitente
**Regla:** `client_uuid` + `upsert` idempotente evita duplicados aunque la sincronización se reintente.

### C20 — Sesión expirada a mitad de captura
**Regla:** el borrador del formulario se preserva en estado local; tras re-autenticarse, el usuario continúa sin perder lo escrito.

### C21 — Zona horaria y cambio de día
**Regla:** las fechas de movimiento son tipo `date` (sin hora) en la zona local del usuario (`es-CR`), evitando que un gasto "salte" de día por UTC.

## 10.7 Seguridad

### C22 — Intento de acceso a datos de otro usuario
**Regla:** RLS bloquea a nivel de base de datos; aunque el cliente pida filas ajenas, Postgres devuelve vacío. Ver [14 · Seguridad](14-security.md).

### C23 — Recibo con información sensible
**Regla:** Storage con políticas por usuario; los archivos no son públicos, se sirven con URL firmada de expiración corta.
