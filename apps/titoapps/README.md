# Tito Apps

Portal oficial del ecosistema Tito Apps.

## Desarrollo

Desde la raíz del monorepo:

```bash
pnpm --filter titoapps dev
pnpm --filter titoapps build
pnpm --filter titoapps test
```

## Registrar una aplicación

Los tipos están en `src/types/app.ts` y el registro central en `src/data/apps.ts`. Para agregar una aplicación:

1. Coloca su icono SVG o PNG en `public/apps/` (usa un nombre estable y texto alternativo provisto por la tarjeta).
2. Agrega un objeto a `apps` con un `id` único, nombre, descripción, categoría, estado e icono.
3. Usa `url` únicamente cuando exista una URL pública verificada. Sin URL, la tarjeta no navega.
4. Usa `featured: true` para destacarla e `isNew: true` para mostrar “Nuevo”.

Ejemplo de una quinta aplicación:

```ts
{
  id: "taskflow",
  name: "TaskFlow",
  shortDescription: "Organiza tus tareas cotidianas.",
  category: "productivity",
  status: "beta",
  icon: "/apps/taskflow.svg",
  url: "https://url-publica-verificada.example",
  featured: true,
  isNew: true,
}
```

Las categorías admitidas y sus etiquetas en español se centralizan en `src/data/apps.ts`. Los estados son `available`, `beta` y `coming-soon`.

Los iconos actuales de las aplicaciones son placeholders neutrales y reemplazables, ya que no se encontraron assets oficiales para todas ellas. Las URLs temporales de GolPay y SplitPay están centralizadas en `src/data/apps.ts` para poder sustituirlas fácilmente cuando estén disponibles los dominios definitivos.
