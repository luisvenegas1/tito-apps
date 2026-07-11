# @titoapps/ui

Catálogo de componentes **neutral** de Tito Apps. Los componentes no contienen
colores, nombres ni textos de ningún producto: el tema se aplica mediante
**design tokens** (variables CSS) que provee `@titoapps/brand`.

## Cómo se usa (a partir de Fase 4)

En cada app:

```ts
// 1. tailwind.config.js -> agregar el preset y escanear el paquete
import preset from "@titoapps/brand/tailwind-preset";
export default {
  presets: [preset],
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
};
```

```ts
// 2. En el arranque de la app
import "@titoapps/brand/tokens.css";
import { applyBrand, golpayBrand } from "@titoapps/brand";
applyBrand(golpayBrand);
```

```tsx
// 3. Usar los componentes
import { Button, Card, FormField, Input } from "@titoapps/ui";
```

## Componentes

Button, Input, Select, Checkbox, Card, Badge, Modal, Dialog, Toast
(`ToastProvider` + `useToast`), Spinner, Skeleton, FormField, CurrencyInput
(símbolo de moneda configurable), DateInput, EmptyState, PageHeader.

## Regla

No agregar aquí componentes específicos de un dominio (por ejemplo, nada de
fútbol/pagos de GolPay). Eso vive dentro de cada app.
