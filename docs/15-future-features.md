# 15 · Funcionalidades futuras

Visión de crecimiento más allá del MVP. Estas capacidades **no** están en la primera versión, pero el modelo de datos y la arquitectura se diseñaron para no bloquearlas. Orden alineado con el [roadmap](12-roadmap.md).

## 15.1 Presupuestos
Definir un presupuesto por categoría (o sobre-categoría) y período, con alertas al acercarse al límite y proyección de cierre de mes. Se apoya en las categorías y en los resúmenes ya existentes; agrega una tabla `budgets` y comparaciones presupuesto vs. real.

## 15.2 Hogar compartido (la pareja como usuaria)
Convertir `people` en miembros reales de un **espacio/hogar** con login propio y permisos. Permite que la pareja registre y vea gastos compartidos, con RLS basada en pertenencia al hogar en vez de un solo `user_id`. Es la evolución natural del caso "quién paga".

## 15.3 Captura inteligente: OCR de recibos y escaneo de facturas
Tomar una foto del recibo y **extraer automáticamente** monto, fecha y comercio para prellenar la captura. Reduce aún más el tiempo de registro. Requiere un servicio de OCR (Edge Function que llama a un proveedor de visión) sobre los recibos ya almacenados.

## 15.4 Lectura automática de estados de cuenta
Importar y **parsear estados de cuenta** (PDF/CSV del banco o de la tarjeta) para conciliar movimientos y detectar consumos de la extensión de mamá sin registrarlos a mano. Alimenta tanto los gastos propios como las cuentas por cobrar.

## 15.5 Conexión con bancos y SINPE
Sincronización directa de movimientos bancarios y de SINPE Móvil (según la disponibilidad de APIs/agregadores en Costa Rica). Convertiría la captura manual en verificación/categorización. Es el salto más ambicioso y dependiente de terceros.

## 15.6 Patrimonio y créditos
Registrar **activos** (propiedades, vehículos, ahorros) y **pasivos** (préstamo de casa, tarjetas, otros créditos) para calcular el **patrimonio neto** y su evolución. El préstamo de la casa deja de ser solo un gasto mensual y pasa a mostrar saldo pendiente y avance de amortización.

## 15.7 Inversiones
Módulo de portafolio: instrumentos, aportes, valor de mercado y rendimiento. Se integra con patrimonio para una foto financiera completa. Incluye la pensión complementaria como instrumento de largo plazo.

## 15.8 Metas financieras avanzadas
Más allá de ahorro/reducción: metas con **proyecciones y escenarios** ("si reduzco tarjetas un 15%, alcanzo la meta en 4 meses"), metas ligadas a patrimonio y simulaciones.

## 15.9 Otras ideas candidatas
- **Reglas de categorización automática** (si el comercio contiene "Starbucks" → Café).
- **Multi-moneda ampliada** (más de dos monedas, TC automático vía API de tipo de cambio).
- **Widgets/atajos del teléfono** para captura desde la pantalla de inicio.
- **Informe mensual automático** enviado por correo (aprovecha las notificaciones y reportes).
- **Modo compartido de solo lectura** para un contador o asesor.

## 15.10 Cómo el diseño actual habilita el futuro

| Futuro | Qué ya lo facilita |
|--------|--------------------|
| Hogar compartido | `people` y separación por `user_id` (migrable a `household`) |
| OCR / escaneo | `attachments` ya guarda recibos; solo falta el extractor |
| Estados de cuenta | Libro único `transactions` + cuentas por cobrar para conciliar |
| Patrimonio/créditos | Préstamo ya modelado; se añade dimensión de saldo/amortización |
| Presupuestos | Categorías y resúmenes mensuales ya existen |
| Inversiones | Pensión complementaria ya es categoría; se extiende a instrumentos |

La conclusión: el MVP no es un callejón sin salida, es la base de una plataforma financiera personal que puede crecer sin reescribirse.
