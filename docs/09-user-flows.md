# 09 · Flujos de usuario

Recorridos clave paso a paso. Cada flujo indica la pantalla ([08 · UI/UX](08-ui-ux.md)) y la operación de datos ([06 · Modelo](06-database.md)) implicada.

## 9.1 Flujo: registrar un gasto diario (< 10 s) — el más importante

```
Abrir app ─▶ Tocar (+) ─▶ Teclear monto ─▶ Tocar chip categoría ─▶ Guardar
   S1           nav          S2                S2                    S2
```
1. El usuario abre la PWA (ya autenticado; sesión persistente).
2. Toca **(+)** en la barra → se abre **S2 Captura rápida** con el teclado en foco.
3. Teclea `3200`. La moneda por defecto (₡) ya está seleccionada.
4. Toca el chip **Comida**.
5. Toca **Guardar**. Se crea `transaction { kind:'expense', amount:3200, currency:'CRC', category:'Comida', paid_by:'me', scope:'personal', occurred_on: hoy }`.
6. Confirmación breve y regreso al dashboard con el total del día actualizado.

*Responsable, ámbito, notas y recibo quedan en valores por defecto; solo se tocan si hacen falta (modo detallado).*

## 9.2 Flujo: registrar un gasto del hogar que paga la pareja

Resuelve el problema P1 (no poner ₡0).
1. (+) → captura rápida → monto de la luz, categoría **Luz**.
2. Abrir "Pagado por" → seleccionar **Pareja**. El ámbito se ajusta a **Hogar**.
3. Guardar. Se crea `expense` con `paid_by='partner'`, `scope='household'`.
4. **Resultado:** la luz aparece en "Gastos del hogar" (costo real visible) pero **no** en "Gastos personales/Disponible" del usuario. El historial de luz sigue completo.

## 9.3 Flujo: cargo en la cuenta de mamá (compra con la extensión)

1. Ir a **S5 Por cobrar** → abrir cuenta **Mamá** (**S6**).
2. Tocar **+ Cargo** → concepto "Compra súper", monto `135.000`, moneda ₡, fecha.
3. Guardar. Se crea `transaction { kind:'receivable_charge', receivable_account_id: mamá, amount:135000 }`.
4. **Resultado:** el saldo de la cuenta sube a ₡135.000. **No** aparece como gasto personal del usuario. El dashboard actualiza "Pendiente por cobrar".

## 9.4 Flujo: abono de mamá (depósito para devolver dinero)

Resuelve P2 (un abono no es ingreso).
1. **S6** cuenta Mamá → tocar **− Abono** → monto `200.000`.
2. Guardar. Se crea `transaction { kind:'receivable_payment', receivable_account_id: mamá, amount:200000 }`.
3. **Resultado:** el saldo baja ₡200.000. Un tooltip aclara "Esto reduce la deuda, no cuenta como ingreso". Los ingresos del mes **no** cambian.

## 9.5 Flujo: pagar la tarjeta y conciliar con mamá (mensual)

1. Llega el corte de la tarjeta. El usuario paga la tarjeta (gasto propio de la porción que le corresponde) desde captura, categoría **Tarjetas**.
2. Los consumos de mamá ya están como **cargos** en su cuenta (registrados durante el mes).
3. Mamá deposita → se registra como **abono**.
4. El usuario abre **S6** y verifica que el **saldo pendiente** refleja exactamente lo que mamá aún debe. Cierre en < 2 min.

## 9.6 Flujo: configurar un pago recurrente (préstamo)

1. **S8 Recurrentes** → **Nueva plantilla**.
2. Nombre "Préstamo casa", categoría **Préstamo casa**, monto estimado, moneda, periodicidad **mensual**, día de vencimiento (ej. 5).
3. Guardar `recurring_template`.
4. El día 1 de cada mes, la Edge Function genera un `scheduled_payment` con `status='pending'` y `due_date` = día 5.
5. Aparece en **S7 Próximos pagos**.

## 9.7 Flujo: marcar un pago recurrente como pagado

1. **S7 Próximos pagos** → tocar "Préstamo · vence en 3 días".
2. Confirmar monto real (puede diferir del estimado) → **Marcar pagado**.
3. Se crea/enlaza una `transaction` (expense) y el `scheduled_payment.status='paid'`.
4. El dashboard actualiza gastos y disponible.

## 9.8 Flujo: cambiar tipo de cambio y ver totales en la otra moneda

1. **S11 Ajustes** → Tipo de cambio → ingresar TC vigente (ej. 1 USD = ₡520).
2. En el dashboard, cambiar **moneda base** a $ → los totales se muestran convertidos; los montos originales de cada movimiento no cambian.

## 9.9 Flujo: responder un reporte ("¿cuánto me debe mamá?")

1. **S9 Reportes** → tocar tarjeta "¿Cuánto me debe?".
2. La app consulta `receivable_balances` para la cuenta Mamá.
3. Muestra el saldo actual, su evolución y el detalle de cargos/abonos; opción de exportar.

## 9.10 Flujo: crear una meta y seguirla

1. **S10 Metas** → Nueva meta → tipo **Reducción**, categoría **Restaurantes**, objetivo mensual.
2. La app calcula el gasto acumulado del mes en esa categoría y muestra el progreso.
3. Si el gasto se acerca al límite, genera una **notificación** de meta en riesgo.

## 9.11 Flujo: captura sin conexión

1. Sin señal, el usuario registra un gasto normalmente (**S2**).
2. El movimiento se guarda en la cola local (IndexedDB) con un `client_uuid` y badge "pendiente de sincronizar".
3. Al reconectar, el Service Worker hace `upsert` idempotente a Supabase.
4. El badge desaparece; el dato queda confirmado.

## 9.12 Flujo: onboarding / migración inicial

1. Registro (**S12**) → se crean `profile` y categorías semilla.
2. **S11 Ajustes → Importar Excel**: el usuario sube sus hojas.
3. Una Edge Function mapea gastos/ingresos y la cuenta de mamá.
4. La app muestra un resumen de validación (totales del mes, saldo de mamá) para confirmar que coincide con el Excel antes de finalizar.

## 9.13 Mapa de flujos → objetivos de producto

| Flujo | Objetivo que cumple ([01](01-product-vision.md)) |
|-------|--------------------------------------------------|
| 9.1 Gasto rápido | Velocidad de captura < 10 s |
| 9.2 Gasto de la pareja | Cero pérdida de historial |
| 9.3–9.5 Cuenta de mamá | Conciliación de tarjeta < 2 min |
| 9.8 Moneda | Claridad multi-moneda |
| 9.12 Migración | Verdad única (reemplazar el Excel) |
