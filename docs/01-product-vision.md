# 01 · Visión de producto y análisis funcional

## 1.1 Visión

**Money Track** es una aplicación web personal (PWA) que centraliza el control financiero de una persona y su hogar. Nace de un sistema real de Google Sheets que evolucionó durante años y que hoy ya no representa la realidad del usuario: pasó de vivir solo a vivir en pareja, maneja dos monedas, y lleva una cuenta corriente con su mamá a través de una tarjeta de crédito extendida.

La visión no es "digitalizar el Excel". Es construir un **sistema financiero personal** que entiende conceptos que una hoja de cálculo no puede representar bien: la responsabilidad de un gasto (quién paga), la naturaleza de un movimiento (gasto vs. préstamo vs. reembolso), y las cuentas por cobrar como un libro contable propio.

> **Frase de visión:** "Abro la app y en 5 segundos entiendo cuánto tengo, cuánto debo pagar, cuánto me deben y qué viene. Registrar un gasto me toma menos que sacar el Excel."

## 1.2 Usuario y contexto

**Usuario primario:** Luis Diego — profesional que lleva sus finanzas con disciplina, cómodo con herramientas digitales, dueño de un préstamo de casa, carro, seguros, tarjetas y una pensión complementaria.

**Actores secundarios:**
- **Pareja:** convive y asume ciertos gastos del hogar (luz, condominio, teléfono). No necesariamente es usuaria de la app en el MVP, pero sí es una **entidad** dentro del modelo (paga gastos, puede tener cuentas).
- **Mamá:** tiene una extensión de tarjeta, genera cargos que el usuario paga y luego abona. Es el caso estrella de "cuenta por cobrar".
- **Otros terceros futuros:** hermano, amigos, etc. — el sistema de cuentas por cobrar debe ser genérico.

**Contexto de uso:**
- Uso diario en el **teléfono** para captura rápida de gastos (parado en una fila, saliendo de un café).
- Uso semanal/mensual en **escritorio** para revisar dashboard, conciliar la tarjeta, cerrar el mes y ver reportes.

## 1.3 Análisis funcional

El sistema se organiza en **siete dominios funcionales**. Cada uno corresponde a una necesidad real detectada en el sistema actual.

### A. Transacciones (gastos e ingresos)
El corazón del sistema. Cada movimiento de dinero es una transacción con:
- Monto y **moneda** (colones o dólares).
- **Categoría** (préstamo casa, condominio, luz, teléfono, carro, seguros, tarjetas, fútbol, pensión complementaria, gastos personales, etc.).
- **Tipo/naturaleza:** gasto personal, gasto del hogar, gasto compartido, ingreso, dinero adelantado, cargo a cuenta por cobrar, reembolso recibido.
- **Responsable de pago:** yo, mi pareja, compartido, otra persona.
- Fecha, notas, y opcionalmente un adjunto (recibo).

**Cálculos automáticos requeridos:** total de gastos, total de ingresos, disponible, déficit/superávit, gastos por categoría, gastos por moneda, y desgloses por responsable de pago.

### B. Responsabilidad de pago (quién paga)
Concepto nuevo que el Excel no modela bien. Un gasto no desaparece porque ahora lo pague la pareja: cambia su **responsable**. Esto permite:
- Ver el gasto real del hogar (todo lo que se paga, sin importar por quién).
- Ver mi gasto personal (solo lo que yo pago).
- Mantener el historial intacto: "luz = ₡0 para mí en junio" porque la paga la pareja, no porque el servicio se canceló.

### C. Multi-moneda
Colones y dólares conviven. En el Excel se distinguen por color, lo cual es frágil. En la app:
- Cada movimiento **almacena su moneda original** (nunca se convierte de forma destructiva).
- Existe un **tipo de cambio configurable** (manual en MVP, con opción de actualización automática futura).
- Los totales se muestran en la moneda base elegida, con conversión a la otra cuando se necesita.

### D. Cuentas por cobrar (libro de terceros)
El subsistema más importante y diferenciador. Modela relaciones de deuda con terceros como una **cuenta corriente**:
- **Cargos** (+) aumentan lo que la persona me debe (ej. compra de mamá con la extensión).
- **Abonos** (−) reducen la deuda (ej. depósito de mamá).
- El **saldo pendiente** se calcula solo.
- Un abono **NO es un ingreso**: solo reduce la cuenta por cobrar (evita inflar los ingresos del mes).
- Se pueden crear múltiples cuentas (mamá, hermano, amigo, pareja).

### E. Recurrencia y próximos pagos
Muchos gastos se repiten cada mes (préstamo, condominio, seguros). El sistema:
- Permite definir **plantillas recurrentes** con periodicidad, monto estimado, moneda y día de vencimiento.
- **Genera automáticamente** las instancias del mes.
- Muestra un panel de **próximos pagos** con estados: vence mañana, vence en N días, pagado, atrasado.

### F. Análisis (dashboard, historial, reportes, metas)
La capa de inteligencia sobre los datos:
- **Dashboard:** foto del mes actual (ingresos, gastos personales, gastos del hogar, disponible, pendiente por cobrar, próximos pagos, resumen por categoría, gráficos, comparación vs. meses anteriores).
- **Historial:** navegar por mes (julio 2026, abril 2025), por año, comparar meses, ver tendencias.
- **Reportes:** preguntas concretas ("¿cuánto gasté este año en tarjetas?", "¿cuánto he pagado del préstamo?", "¿cuánto me debe mi mamá?", "¿cuánto recuperé este año?").
- **Metas:** objetivos de ahorro o de reducción de gasto por categoría, con seguimiento.

### G. Recordatorios y notificaciones
Avisos de pagos próximos (tarjeta, seguro, préstamo, condominio) para no llegar tarde.

## 1.4 Alcance funcional en una tabla

| Dominio | Necesidad del usuario | Estado en Excel | Estado en Money Track |
|--------|----------------------|-----------------|-------------------|
| Transacciones | Registrar gastos e ingresos rápido | Manual, lento, propenso a error | Captura < 10 s, validada |
| Responsable de pago | Saber quién paga cada gasto | Inexistente (se ponía ₡0) | Campo explícito con historial |
| Multi-moneda | Colones y dólares | Colores frágiles | Moneda por movimiento + TC |
| Cuentas por cobrar | Deuda de mamá como cuenta corriente | Hoja aparte manual | Libro contable dedicado |
| Recurrencia | Gastos mensuales repetidos | Copiar/pegar cada mes | Generación automática |
| Análisis | Entender mis finanzas | Fórmulas rígidas | Dashboard + reportes + metas |
| Recordatorios | No olvidar pagos | Memoria/calendario aparte | Notificaciones integradas |

## 1.5 Objetivos de producto (medibles)

1. **Velocidad de captura:** registrar un gasto en **< 10 segundos** desde abrir la app.
2. **Verdad única:** una sola fuente de datos reemplaza ≥ 2 hojas de cálculo.
3. **Cero pérdida de historial:** ningún gasto se borra por cambio de responsable.
4. **Conciliación de tarjeta:** cerrar la cuenta de mamá (saldo pendiente correcto) en **< 2 minutos** al mes.
5. **Claridad multi-moneda:** ver totales correctos en ambas monedas sin ambigüedad de color.
