# 05 · Funcionalidades (catálogo detallado)

Catálogo completo de funcionalidades agrupadas por módulo. Cada funcionalidad tiene un identificador (`F-xx`) que se reutiliza en el [backlog](13-backlog.md).

## 5.1 Módulo Transacciones

| ID | Funcionalidad | Descripción |
|----|---------------|-------------|
| F-01 | Registrar gasto | Alta de un gasto con monto, moneda, categoría, naturaleza, responsable, ámbito, fecha, notas |
| F-02 | Registrar ingreso | Alta de ingreso mensual o puntual |
| F-03 | Captura rápida | Flujo de 3 toques para gasto diario (< 10 s) |
| F-04 | Editar / eliminar | Modificar o borrar un movimiento con confirmación |
| F-05 | Adjuntar recibo | Subir una imagen asociada al movimiento |
| F-06 | Duplicar movimiento | Crear uno nuevo a partir de otro existente |
| F-07 | Búsqueda y filtros | Filtrar por fecha, categoría, moneda, responsable, ámbito, naturaleza, texto |
| F-08 | Etiquetas (tags) | Etiquetas libres para cortes transversales (ej. "vacaciones") |

### Naturaleza del movimiento (`kind`)
- `expense` — gasto.
- `income` — ingreso.
- `receivable_charge` — cargo a una cuenta por cobrar (ej. compra de mamá).
- `receivable_payment` — abono a una cuenta por cobrar (ej. depósito de mamá).
- `advance` — dinero adelantado (yo pago algo que luego me devuelven).
- `reimbursement` — reembolso recibido.

### Responsable de pago (`paid_by`)
`me`, `partner`, `shared`, `other`. En `shared` se puede indicar el porcentaje o monto que asume cada parte.

### Ámbito (`scope`)
`personal`, `household`, `shared`. Permite separar el gasto personal del gasto del hogar en reportes y dashboard.

## 5.2 Módulo Categorías

| ID | Funcionalidad | Descripción |
|----|---------------|-------------|
| F-10 | Categorías predefinidas | Semilla con las categorías del Excel: préstamo casa, condominio, luz, teléfono, carro, seguros, tarjetas, fútbol, pensión complementaria, gastos personales |
| F-11 | Categorías personalizadas | Crear, renombrar, archivar categorías con ícono y color |
| F-12 | Subcategorías | Jerarquía opcional (ej. Carro → gasolina, mantenimiento, marchamo) |
| F-13 | Categoría por defecto | Sugerencia automática según patrón de uso |

## 5.3 Módulo Multi-moneda

| ID | Funcionalidad | Descripción |
|----|---------------|-------------|
| F-20 | Moneda por movimiento | Cada transacción guarda CRC o USD |
| F-21 | Tipo de cambio configurable | TC manual editable, con fecha de vigencia |
| F-22 | Moneda base | Elegir la moneda en que se muestran los totales globales |
| F-23 | Conversión en vistas | Mostrar equivalente en la otra moneda sin alterar el dato original |
| F-24 | Totales por moneda | Ver el desglose CRC vs USD sin mezclar |

## 5.4 Módulo Cuentas por cobrar

| ID | Funcionalidad | Descripción |
|----|---------------|-------------|
| F-30 | Crear cuenta | Alta de cuenta por cobrar (nombre, persona, moneda, notas) |
| F-31 | Registrar cargo | Aumentar el saldo (compra del tercero) |
| F-32 | Registrar abono | Disminuir el saldo (depósito del tercero); no es ingreso |
| F-33 | Saldo automático | Cálculo continuo del saldo pendiente |
| F-34 | Historial por cuenta | Libro con fecha, concepto, cargo, abono, saldo corriente, moneda, notas |
| F-35 | Múltiples cuentas | Crear tantas como se necesite (mamá, hermano, amigo, pareja) |
| F-36 | Estado de cuenta | Exportar/ver el estado de cuenta de un período |
| F-37 | Vínculo con tarjeta | Marcar que los cargos provienen de la extensión de una tarjeta propia |

## 5.5 Módulo Recurrencia y próximos pagos

| ID | Funcionalidad | Descripción |
|----|---------------|-------------|
| F-40 | Plantilla recurrente | Definir gasto/ingreso repetido: periodicidad, monto estimado, moneda, día de vencimiento, categoría |
| F-41 | Generación automática | Crear las instancias del período automáticamente |
| F-42 | Confirmar pago | Marcar una instancia como pagada (monto real puede diferir del estimado) |
| F-43 | Próximos pagos | Panel con estados: vence mañana, vence en N días, pagado, atrasado |
| F-44 | Omitir/posponer | Saltar o reprogramar una instancia sin borrar la plantilla |
| F-45 | Ajuste de monto | Editar el monto real al confirmar (ej. luz varía cada mes) |

## 5.6 Módulo Dashboard

| ID | Funcionalidad | Descripción |
|----|---------------|-------------|
| F-50 | Resumen del mes | Ingresos, gastos personales, gastos del hogar, disponible, déficit/superávit |
| F-51 | Pendiente por cobrar | Suma de saldos de todas las cuentas |
| F-52 | Próximos pagos (widget) | Vencimientos cercanos |
| F-53 | Resumen por categoría | Top categorías del mes con montos y % |
| F-54 | Resumen por moneda | CRC vs USD |
| F-55 | Gráficos | Barras/donas/líneas de gasto e ingreso |
| F-56 | Comparación mensual | Mes actual vs. meses anteriores |

## 5.7 Módulo Historial y reportes

| ID | Funcionalidad | Descripción |
|----|---------------|-------------|
| F-60 | Navegar por mes | Ver cualquier mes (ej. julio 2026, abril 2025) |
| F-61 | Navegar por año | Consolidado anual |
| F-62 | Comparar meses | Comparativa lado a lado |
| F-63 | Tendencias | Líneas de tendencia por categoría/total |
| F-64 | Reporte: tarjetas | ¿Cuánto gasté este año en tarjetas? |
| F-65 | Reporte: préstamo | ¿Cuánto he pagado del préstamo? |
| F-66 | Reporte: carro | ¿Cuánto gasté en carro? |
| F-67 | Reporte: mamá gastó | ¿Cuánto gastó mamá? |
| F-68 | Reporte: mamá debe | ¿Cuánto me debe actualmente? |
| F-69 | Reporte: recuperado | ¿Cuánto dinero recuperé este año? |
| F-70 | Exportar | Exportar a CSV/Excel un período o reporte |

## 5.8 Módulo Metas

| ID | Funcionalidad | Descripción |
|----|---------------|-------------|
| F-80 | Meta de ahorro | Objetivo de monto (ej. ahorrar ₡500.000) con fecha |
| F-81 | Meta de reducción | Reducir gasto en una categoría (ej. restaurantes, tarjetas) |
| F-82 | Progreso | Barra de avance y proyección de cumplimiento |
| F-83 | Alertas de meta | Aviso si el gasto amenaza la meta |

## 5.9 Módulo Notificaciones

| ID | Funcionalidad | Descripción |
|----|---------------|-------------|
| F-90 | Recordatorio de pago | Aviso de vencimiento (tarjeta, seguro, préstamo, condominio) |
| F-91 | Canales | Push de PWA y/o correo |
| F-92 | Preferencias | Elegir cuándo y qué recordar (ej. 3 días antes) |
| F-93 | Alertas financieras | Aviso de déficit del mes o de meta en riesgo |

## 5.10 Módulo Plataforma y cuenta

| ID | Funcionalidad | Descripción |
|----|---------------|-------------|
| F-100 | Autenticación | Registro/login con Supabase Auth |
| F-101 | PWA instalable | Instalar en móvil/escritorio |
| F-102 | Offline básico | Capturar sin conexión y sincronizar al reconectar |
| F-103 | Preferencias | Moneda base, TC, categorías, notificaciones |
| F-104 | Importar Excel | Carga inicial desde las hojas actuales (migración) |
| F-105 | Copia de seguridad | Exportar todos los datos |

## 5.11 Priorización (resumen)

Todas las funcionalidades anteriores están **dentro del MVP completo**, salvo las marcadas como futuras en [15](15-future-features.md). El orden de construcción sugerido está en el [backlog priorizado](13-backlog.md).
