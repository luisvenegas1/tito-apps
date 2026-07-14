# ui-playground

Entorno aislado para desarrollar y revisar los componentes de `@titoapps/ui`
sobre los design tokens de `@titoapps/brand`, **sin depender de GolPay**.

```bash
pnpm install                      # desde la raíz del monorepo
pnpm --filter ui-playground dev   # http://localhost:5180
```

Incluye un selector de marca (Tito Apps / GolPay / SplitPay) que llama a
`applyBrand()` en caliente, y un toggle claro/oscuro (`setTheme`). Sirve para
verificar que un componente se ve bien en cada marca antes de usarlo en una app.
