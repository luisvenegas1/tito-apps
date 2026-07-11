# Plan de migración de SplitPay a Tito Apps

> Estado: **pendiente**. SplitPay permanece por ahora en `/splitpay` en la raíz,
> con su propio repositorio Git, sin cambios. Este documento describe cómo se
> incorporará más adelante, sin arriesgar el proyecto real.

## Situación actual de SplitPay

- Vive en `/splitpay` (fuera de `apps/`).
- Tiene **su propio `.git`** → por eso está excluido del monorepo vía `.gitignore` (`/splitpay/`).
- Es un proyecto en **JavaScript** (`vite.config.js`), no TypeScript.
- Tiene identidad visual propia: mascota del billete, logos, íconos, verde/azul.
- Base de datos Supabase propia e independiente.
- Deploy Vercel propio.

## Principios de la migración (cuando se haga)

1. **No romper SplitPay.** Se migra solo cuando GolPay y los `packages/` compartidos estén estables.
2. **La mascota del billete es EXCLUSIVA de SplitPay.** No se usa como logo de Tito Apps ni se copia a GolPay/MoneyTrack.
3. Conserva su base de datos, su `.env.local` y su proyecto Vercel.
4. Su identidad va en su propio `AppBrand` (verde/azul + mascota), igual que las demás apps.

## Pasos propuestos (futuros)

1. Hacer un commit/tag de respaldo en el repo actual de SplitPay.
2. Copiar (no mover aún) SplitPay a `apps/splitpay`, quitando su `.git` interno
   una vez integrado al git del monorepo.
3. Eliminar los `vite.config.js.timestamp-*.mjs` sueltos (archivos temporales de Vite).
4. Decidir si se mantiene en JS o se migra gradualmente a TS (no bloqueante).
5. Crear su `AppBrand` en `packages/brand` (mascota + colores).
6. Adoptar `packages/ui` y `packages/email-templates` de forma incremental,
   verificando después de cada cambio.
7. Retirar `/splitpay` de la raíz y del `.gitignore` una vez que `apps/splitpay` funcione.

## Verificación

En cada paso: `pnpm --filter splitpay dev` / `build`, revisión visual de la mascota
y logos, y prueba de su flujo principal antes de continuar.
