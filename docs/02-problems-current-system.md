# 02 · Problemas del sistema actual (Google Sheets)

El sistema actual funcionó durante años, pero llegó a su techo. Estos son los problemas concretos, agrupados por tipo. Cada uno se conecta con una solución en el documento [03 · Propuesta de mejora](03-improvement-proposal.md).

## 2.1 Problemas de modelo (lo que el Excel no puede representar)

### P1 — No distingue "quién paga" un gasto
Cuando el usuario vivía solo, todo lo pagaba él, así que el concepto no existía. Ahora la pareja paga luz, condominio y teléfono. La única forma de reflejarlo en la hoja fue poner **₡0** en esos rubros los últimos meses. Esto es engañoso: parece que el gasto **desapareció**, cuando en realidad **cambió de responsable**. Se pierde:
- El costo real del hogar (la luz sí se paga, solo que no la paga él).
- El historial comparable (no se puede comparar "luz 2024" contra "luz 2026" porque una está en ₡0 artificial).

### P2 — Trata las deudas de terceros como si fueran gastos/ingresos
La tarjeta extendida de mamá genera cargos que el usuario paga y luego ella le abona. En una hoja plana esto se mezcla con las finanzas propias:
- Si el cargo de mamá se registra como gasto, **infla los gastos** del usuario.
- Si el abono se registra como ingreso, **infla los ingresos**.
- El **saldo pendiente real** (cuánto me debe hoy) hay que calcularlo a mano y es fácil equivocarse.

Contablemente, esto es una **cuenta por cobrar**, no un gasto. El Excel no tiene esa noción.

### P3 — Multi-moneda basada en color
Los colores distinguen colones de dólares. Es frágil:
- Un color mal aplicado corrompe un total sin que nadie lo note.
- Las fórmulas de suma no entienden colores, así que mezclar monedas produce totales sin sentido.
- No hay un tipo de cambio central; cada conversión se hace ad hoc.

### P4 — No modela la naturaleza del movimiento
Todo es "una fila con un monto". Pero un adelanto de dinero, un reembolso recibido, un gasto compartido y un gasto personal se comportan distinto. Sin ese concepto, los reportes ("¿cuánto adelanté?", "¿cuánto recuperé?") son imposibles o manuales.

## 2.2 Problemas operativos (lo que cuesta trabajo cada mes)

### P5 — Recurrencia manual
Préstamo, condominio, seguros y demás se repiten cada mes. Hoy hay que **copiar y pegar** filas mes a mes. Es tedioso y se olvidan cosas.

### P6 — Captura lenta y de escritorio
Registrar un café en el momento requiere abrir Google Sheets, encontrar la hoja, la fila y la columna correctas. En el teléfono es incómodo. Resultado: gastos que no se anotan o se anotan tarde y mal.

### P7 — Múltiples hojas desconectadas
Gastos mensuales en una hoja, cuenta de mamá en otra. No hay una visión unificada. Para responder "¿cómo voy este mes en total?" hay que saltar entre pestañas y hacer cuentas mentales.

### P8 — Sin recordatorios
Los vencimientos (tarjeta, seguro, préstamo) viven en la memoria o en un calendario aparte. El Excel no avisa nada.

## 2.3 Problemas analíticos (lo que no se puede responder fácil)

### P9 — Reportes rígidos
Preguntas naturales como "¿cuánto llevo pagado del préstamo este año?" o "¿cuánto gasté en carro?" requieren construir tablas dinámicas a mano cada vez. No hay tendencias ni comparaciones listas.

### P10 — Sin metas ni seguimiento
No hay forma de fijar un objetivo ("ahorrar ₡500.000", "bajar restaurantes") y que el sistema mida el avance.

### P11 — Comparación entre meses difícil
Comparar julio contra abril, o ver la tendencia del año, implica trabajo manual y propenso a error.

## 2.4 Problemas de integridad y confianza

### P12 — Errores silenciosos
Una fórmula que se rompe al insertar una fila, un rango mal extendido, una celda sobreescrita. Los errores no avisan y contaminan los totales durante meses.

### P13 — Sin validación de datos
Nada impide escribir "3,200" en una celda de dólares, o dejar una moneda sin especificar. La calidad del dato depende 100% de la disciplina humana.

### P14 — Sin control de acceso real
Compartir la hoja es todo o nada. No hay privacidad por registro ni una capa de seguridad pensada para datos financieros.

## 2.5 Resumen: los 3 problemas raíz

Si se destilan los 14 problemas, hay **tres causas raíz** que justifican construir un producto nuevo en vez de mejorar el Excel:

1. **El modelo de datos es demasiado pobre.** Una fila plana no puede representar responsable de pago, naturaleza del movimiento, ni cuentas por cobrar. Sin un buen modelo, todo lo demás es un parche.
2. **La captura y la recurrencia son manuales.** El costo de mantener el sistema al día es alto, lo que degrada la calidad de los datos.
3. **No hay inteligencia sobre los datos.** Dashboard, reportes, metas y recordatorios son inexistentes o artesanales.

Money Track ataca las tres directamente.
