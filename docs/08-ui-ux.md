# 08 · Diseño de pantallas (UI/UX)

## 8.1 Principios de diseño de interfaz

1. **Móvil primero.** La captura diaria ocurre en el teléfono; el escritorio es para análisis.
2. **Velocidad sobre completitud.** El camino más corto (registrar un gasto) es el más pulido.
3. **Claridad de dinero.** Los montos son grandes y legibles; la moneda siempre visible; nunca se depende del color solo (accesibilidad).
4. **Jerarquía por color con significado, no decorativo.** CRC y USD tienen un distintivo textual (₡/$) además de color.
5. **Menos formularios, más chips y valores por defecto.**

## 8.2 Sistema de diseño (resumen)

- **Tipografía:** una sans legible (Inter). Montos con números tabulares.
- **Color:**
  - Neutros para fondo y estructura.
  - Verde = ingreso/positivo/superávit.
  - Rojo = gasto/déficit.
  - Azul = cuentas por cobrar / pendiente.
  - Ámbar = próximos pagos / vencimientos.
- **Componentes base:** tarjeta de resumen, chip de categoría, selector de moneda, fila de transacción, badge de estado (pagado/atrasado), barra de progreso (metas), teclado numérico.
- **Modo claro y oscuro.**
- **Accesibilidad:** contraste AA, íconos con etiqueta, doble codificación (color + texto).

## 8.3 Navegación

Barra inferior (móvil) / lateral (escritorio) con 5 destinos:

```
[ Inicio ]  [ Movimientos ]  [ (+) ]  [ Por cobrar ]  [ Más ]
   Dashboard   Historial     Captura    Cuentas       Reportes,
                             rápida                    Metas, Ajustes
```

El botón central **(+)** es el acceso directo a la captura rápida, siempre a un toque.

## 8.4 Inventario de pantallas

### S1 — Dashboard (Inicio)
La pantalla más importante. De arriba a abajo:
- **Encabezado:** mes actual + selector de mes, moneda base.
- **Tarjetas de resumen:** Ingresos del mes · Gastos personales · Gastos del hogar · Disponible · Déficit/Superávit.
- **Tarjeta "Pendiente por cobrar":** suma de saldos + acceso a cuentas.
- **Próximos pagos:** lista corta con estados (vence mañana, en 3 días, atrasado).
- **Resumen por categoría:** top categorías con barra y %.
- **Gráficos:** gasto por categoría (dona), evolución del mes (línea), comparación vs. mes anterior (barras).
- **Por moneda:** mini-desglose CRC vs USD.

```
┌──────────────────────────────────────────┐
│  Julio 2026            ▼      Base: ₡     │
├──────────────────────────────────────────┤
│ ┌────────────┐ ┌────────────┐            │
│ │ Ingresos   │ │ Disponible │            │
│ │ ₡1.850.000 │ │  ₡ 420.000 │            │
│ └────────────┘ └────────────┘            │
│ ┌────────────┐ ┌────────────┐            │
│ │ G.personal │ │ G. hogar   │            │
│ │ ₡ 610.000  │ │ ₡ 820.000  │            │
│ └────────────┘ └────────────┘            │
│ ┌──────────────────────────────────────┐ │
│ │ Pendiente por cobrar     ₡ 430.000 → │ │
│ └──────────────────────────────────────┘ │
│  Próximos pagos                           │
│   • Tarjeta BAC   vence mañana   ⚠        │
│   • Condominio    en 3 días                │
│   • Préstamo      pagado ✓                 │
│  Por categoría   [dona]   vs mes anterior │
└──────────────────────────────────────────┘
```

### S2 — Captura rápida (Nuevo gasto)
Objetivo: **< 10 segundos**. Se abre desde el botón (+).
- **Teclado numérico grande** con el monto en foco inmediato.
- **Selector de moneda** (₡/$) como toggle prominente, recordando la última.
- **Chips de categorías frecuentes** (las más usadas primero).
- **Responsable** por defecto = "Yo" (colapsado; se despliega si se necesita).
- Botón **Guardar** fijo abajo. Fecha = hoy por defecto.

```
┌──────────────────────────┐
│  Nuevo gasto        ✕    │
│                          │
│        ₡ 3.200           │
│  ┌───┬───┬───┐           │
│  │ 1 │ 2 │ 3 │  [₡] [$]  │
│  │ 4 │ 5 │ 6 │           │
│  │ 7 │ 8 │ 9 │           │
│  │ . │ 0 │ ⌫ │           │
│  └───┴───┴───┘           │
│  [Comida][Café][Carro]…  │
│  Pagado por: Yo ▾        │
│  ┌────────────────────┐  │
│  │      Guardar       │  │
│  └────────────────────┘  │
└──────────────────────────┘
```
Un modo "detallado" (enlace pequeño) abre el formulario completo (ámbito, notas, adjuntar recibo, fecha).

### S3 — Movimientos (Historial)
- Lista por fecha, con filtros (categoría, moneda, responsable, ámbito, naturaleza, texto).
- Selector de período (mes/año), comparación y tendencias.
- Cada fila muestra categoría, monto+moneda, responsable y un ícono de naturaleza.
- Toque en una fila → detalle/edición.

### S4 — Detalle / edición de movimiento
Formulario completo: monto, moneda, categoría/subcategoría, naturaleza, responsable (y persona si "otra"), ámbito, split si compartido, fecha, notas, recibo. Botones editar/duplicar/eliminar.

### S5 — Cuentas por cobrar (lista)
- Tarjetas por cuenta (Mamá, Hermano…): nombre, **saldo pendiente**, moneda, último movimiento.
- Botón "Nueva cuenta".

### S6 — Detalle de cuenta por cobrar (libro)
El estado de cuenta corriente:
- Encabezado con **saldo pendiente** grande y moneda.
- Botones **+ Cargo** y **− Abono**.
- Tabla/lista tipo libro: fecha · concepto · cargo · abono · saldo corriente · notas.
- Filtro por período y exportar estado de cuenta.

```
┌──────────────────────────────────────────┐
│  Mamá                    Saldo: ₡430.000 │
│  [ + Cargo ]      [ − Abono ]            │
├──────────────────────────────────────────┤
│ 02/07 Compra súper   +135.000    135.000 │
│ 08/07 Farmacia        +52.000    187.000 │
│ 20/07 Depósito mamá             −200.000 │
│                                  ...      │
└──────────────────────────────────────────┘
```

### S7 — Próximos pagos
Lista dedicada de vencimientos con estados y acciones (marcar pagado, posponer, ajustar monto). Agrupada por: atrasados, esta semana, este mes.

### S8 — Recurrentes (plantillas)
Gestión de pagos recurrentes: crear/editar plantillas (préstamo, condominio, seguros), ver próximas generaciones, activar/desactivar.

### S9 — Reportes
Galería de reportes por pregunta (tarjetas clicables):
- ¿Cuánto gasté este año en tarjetas?
- ¿Cuánto he pagado del préstamo?
- ¿Cuánto gasté en carro?
- ¿Cuánto gastó mamá? · ¿Cuánto me debe? · ¿Cuánto recuperé este año?
Cada reporte abre una vista con gráfico, total y detalle exportable.

### S10 — Metas
- Lista de metas con barra de progreso y proyección.
- Crear meta (ahorro o reducción por categoría), objetivo, fecha.

### S11 — Ajustes
Moneda base, tipo de cambio, categorías, personas, notificaciones (canales y anticipación), tema, importar Excel, exportar datos, cuenta/seguridad.

### S12 — Autenticación
Login/registro (Supabase Auth), recuperar contraseña.

## 8.5 Estados de las pantallas
Cada pantalla contempla: **cargando** (skeletons), **vacío** (con llamada a la acción, ej. "Registra tu primer gasto"), **error** (con reintento) y **offline** (banner + cola de sincronización).

## 8.6 Micro-interacciones que refuerzan la propuesta
- Al guardar un gasto: confirmación breve + monto sumado al día.
- Al registrar un **abono** de mamá: el saldo baja con animación; un tooltip aclara "esto no cuenta como ingreso".
- Cambiar responsable a "Pareja" en la luz: aparece nota "sigue contando como gasto del hogar".
- Próximo pago "vence mañana": color ámbar y acción rápida "Marcar pagado".
