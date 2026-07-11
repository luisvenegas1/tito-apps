# 03 · Propuesta de mejora

La propuesta se resume en una idea: **modelar bien la realidad financiera del usuario** y montar sobre ese modelo captura rápida, automatización e inteligencia. A continuación, cómo Money Track resuelve cada problema del documento [02](02-problems-current-system.md).

## 3.1 Solución al modelo de datos pobre

### Un movimiento con dimensiones ricas
Cada transacción deja de ser "una fila con monto" y pasa a tener dimensiones explícitas:

- **Naturaleza** (`kind`): `expense`, `income`, `receivable_charge`, `receivable_payment`, `advance`, `reimbursement`. Esto responde por sí solo preguntas como "¿cuánto adelanté?" o "¿cuánto recuperé?".
- **Responsable de pago** (`paid_by`): `me`, `partner`, `shared`, `other`. Resuelve P1 sin borrar historial. La luz que ahora paga la pareja se registra como gasto del hogar con `paid_by = partner`, no como ₡0.
- **Ámbito** (`scope`): `personal`, `household`, `shared`. Permite separar "mi gasto personal" del "gasto del hogar".
- **Moneda** (`currency`): `CRC` o `USD`, guardada en cada movimiento. Fin del sistema de colores (P3).

Con estas dimensiones, los reportes complejos se vuelven simples filtros sobre datos limpios.

### Cuentas por cobrar como libro contable propio
La deuda de mamá deja de contaminar gastos e ingresos (P2). Se modela como una entidad `receivable_account` con su propio libro de asientos:

```
Cuenta: Mamá (CRC)
──────────────────────────────────────────
Fecha        Concepto              Cargo      Abono      Saldo
2026-07-02   Compra supermercado   +₡135.000            ₡135.000
2026-07-08   Compra farmacia       +₡ 52.000            ₡187.000
2026-07-20   Depósito mamá                   −₡200.000  −₡ 13.000
──────────────────────────────────────────
Saldo pendiente: −₡13.000 (le debo yo ₡13.000)
```

- Los **cargos** aumentan el saldo (lo que me deben).
- Los **abonos** lo reducen; **no** se registran como ingreso.
- El **saldo pendiente** se calcula automáticamente y siempre es correcto.
- Se pueden crear cuentas ilimitadas (mamá, hermano, amigo, pareja) con la misma mecánica.

Esto convierte un cálculo manual y frágil en un libro que nunca se descuadra.

## 3.2 Solución a la operación manual

### Captura en menos de 10 segundos
Pantalla de "gasto rápido" pensada para el pulgar:
- Un teclado numérico grande para el monto.
- Chips de categorías frecuentes (aprendidas del uso).
- Moneda por defecto según categoría/última selección.
- Botón "Guardar" siempre visible.

Ejemplo: `Starbucks → ₡3.200 → Comida → Guardar`. Tres toques.

### Recurrencia automática
Plantillas de pagos recurrentes (`recurring_template`) que generan las instancias del mes solas (P5). El préstamo, el condominio y los seguros aparecen ya listos, solo hay que confirmarlos como pagados.

### Un solo sistema, no varias hojas
Gastos y cuentas por cobrar viven en la misma app con un dashboard unificado (P7). Se acabó saltar entre pestañas.

### Recordatorios integrados
Notificaciones (push de PWA y/o correo) para vencimientos (P8), alimentadas por los mismos datos de recurrencia y próximos pagos.

## 3.3 Solución a la falta de inteligencia

### Dashboard como página de inicio
Al abrir la app: ingresos del mes, gastos personales, gastos del hogar, disponible, pendiente por cobrar, próximos pagos, resumen por categoría, gráficos y comparación contra meses anteriores.

### Reportes por pregunta
En vez de tablas dinámicas manuales (P9), reportes que responden preguntas concretas: gasto anual en tarjetas, avance del préstamo, gasto en carro, cuánto gastó mamá, cuánto me debe hoy, cuánto recuperé este año.

### Metas con seguimiento
Objetivos de ahorro o de reducción por categoría (P10) con barra de progreso y proyección.

### Comparación y tendencias
Navegación por mes/año con comparativas y líneas de tendencia listas (P11).

## 3.4 Solución a integridad y seguridad

### Datos validados en origen
Tipos fuertes (TypeScript + esquema Postgres): un monto es numérico, una moneda es un enum, una fecha es una fecha. Se acaban los errores silenciosos y la mezcla de monedas (P12, P13).

### Privacidad por diseño
Supabase Auth + **Row Level Security** en cada tabla: cada usuario solo ve y modifica sus propios datos (P14). Ver [14 · Seguridad](14-security.md).

## 3.5 Tabla de trazabilidad problema → solución

| Problema | Solución en Money Track | Documento |
|----------|---------------------|-----------|
| P1 Quién paga | Campo `paid_by` + scope, historial intacto | 06 |
| P2 Deudas como gastos | Subsistema de cuentas por cobrar | 06 |
| P3 Moneda por color | `currency` por movimiento + tipo de cambio | 06 |
| P4 Naturaleza del movimiento | Campo `kind` con 6 tipos | 06 |
| P5 Recurrencia manual | Plantillas + generación automática | 05, 07 |
| P6 Captura lenta | Pantalla de gasto rápido (< 10 s) | 08 |
| P7 Hojas desconectadas | App unificada + dashboard | 08 |
| P8 Sin recordatorios | Notificaciones push/correo | 05 |
| P9 Reportes rígidos | Reportes por pregunta | 05 |
| P10 Sin metas | Módulo de metas | 05 |
| P11 Comparar meses | Historial con comparativas | 05, 08 |
| P12/P13 Integridad | Tipos fuertes + validación | 06, 07 |
| P14 Acceso | Auth + Row Level Security | 14 |

## 3.6 Qué hace a Money Track "más inteligente" (no una copia del Excel)

1. **Entiende responsabilidad:** sabe que un gasto en ₡0 para ti puede seguir siendo un gasto del hogar.
2. **Entiende contabilidad:** separa lo que gastas de lo que te deben.
3. **Entiende el tiempo:** genera lo recurrente y anticipa lo que vence.
4. **Entiende tus preguntas:** responde con reportes, no con fórmulas.
5. **Cuida tu dinero futuro:** metas y tendencias, no solo el pasado.
