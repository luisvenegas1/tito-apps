# Money Track — Diseño de Producto

> Aplicación web de finanzas personales para reemplazar y superar el sistema actual de hojas de cálculo de Google Sheets.

Este directorio contiene el diseño completo del producto **antes de escribir una sola línea de código de la aplicación**. El objetivo es diseñar un producto excelente: inteligente, moderno, muy fácil de usar y mucho más potente que el sistema actual basado en Excel.

## Cómo leer esta documentación

Los documentos están numerados en el orden lógico de lectura, desde la visión hasta el backlog ejecutable.

| # | Documento | Qué responde |
|---|-----------|--------------|
| 01 | [Visión de producto y análisis funcional](01-product-vision.md) | Qué es el producto, para quién, y análisis funcional completo |
| 02 | [Problemas del sistema actual](02-problems-current-system.md) | Qué falla hoy en las hojas de cálculo |
| 03 | [Propuesta de mejora](03-improvement-proposal.md) | Cómo la app resuelve cada problema de forma moderna |
| 04 | [MVP](04-mvp.md) | Alcance de la primera versión (completo desde el inicio) |
| 05 | [Funcionalidades](05-features.md) | Catálogo detallado de todas las funcionalidades |
| 06 | [Modelo de datos](06-database.md) | Esquema PostgreSQL, entidades, relaciones y RLS |
| 07 | [Arquitectura](07-architecture.md) | Stack, capas, decisiones técnicas, PWA |
| 08 | [Diseño de pantallas (UI/UX)](08-ui-ux.md) | Pantallas, componentes, sistema de diseño |
| 09 | [Flujos de usuario](09-user-flows.md) | Recorridos clave paso a paso |
| 10 | [Casos especiales](10-edge-cases.md) | Situaciones límite y cómo se resuelven |
| 11 | [Riesgos](11-risks.md) | Riesgos técnicos, de producto y de datos |
| 12 | [Roadmap](12-roadmap.md) | Plan por fases más allá del MVP |
| 13 | [Backlog priorizado](13-backlog.md) | Épicas e historias listas para desarrollar |
| 14 | [Seguridad](14-security.md) | RLS, privacidad, autenticación |
| 15 | [Funcionalidades futuras](15-future-features.md) | Visión de crecimiento a largo plazo |

## Resumen en una frase

Money Track convierte tus hojas de cálculo dispersas en un sistema financiero personal unificado que entiende **quién paga cada gasto**, maneja **dos monedas**, trata las deudas de terceros como **cuentas por cobrar** (no como gastos), automatiza **pagos recurrentes** y te da un **dashboard inteligente** con reportes, metas y recordatorios.

## Stack técnico (resumen)

- **Frontend:** React + Vite + TypeScript + Tailwind + PWA
- **Backend:** Supabase (PostgreSQL + Auth + Row Level Security)
- **Hosting:** Vercel
- **Estado:** cliente delgado, lógica de negocio en la base de datos y funciones

## Principios de diseño

1. **Registrar un gasto toma menos de 10 segundos.** La velocidad de captura es la característica número uno.
2. **El historial nunca se pierde.** Un gasto que "desapareció" solo cambió de responsable, no se borró.
3. **Las deudas no son gastos.** El dinero que otros te deben vive en su propio subsistema contable.
4. **Dos monedas, una verdad.** Cada movimiento guarda su moneda original; la conversión es una vista, no un dato destructivo.
5. **Privado por defecto.** Row Level Security en cada tabla; nadie ve datos de nadie más.
