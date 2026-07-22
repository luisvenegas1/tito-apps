# Edge Functions — NutriCoach IA

Funciones (Deno) que aíslan las llamadas a modelos de IA. La clave del proveedor
vive **solo** en el servidor; el cliente nunca la ve. Ver `../../docs/ai.md`.

## Funciones

- `login` — login por **usuario**: resuelve usuario → email en el servidor (con `service_role`) y devuelve tokens. Nunca expone el email. Rate limit + timing uniforme.
- `analyze-food` — foto de un plato → alimentos + cantidades + macros.
- `analyze-scale` — foto sobre balanza → alimento + peso + valores por 100 g.
- `analyze-label` — foto de tabla nutricional → valores por 100 g.
- `coach` — nutricionista conversacional y proactivo.
- `meal-plan` — plan de comidas por IA (día/semana).

> `login` no necesita `AI_API_KEY`; usa las variables que Supabase inyecta (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Las de IA aplican al resto.

## Proveedor (abstracción)

`_shared/provider.ts` expone la interfaz `AIProvider` y `getProvider()`, que
selecciona el adapter por variables de entorno:

| Secreto | Valores | Default |
|---------|---------|---------|
| `AI_PROVIDER` | `anthropic` \| `openai` | `anthropic` |
| `AI_API_KEY` | clave del proveedor | — (sin clave → **stub** determinista) |
| `AI_MODEL` | override de modelo | `claude-sonnet-5` / `gpt-4o` |

Sin `AI_API_KEY` las funciones responden con datos simulados válidos (útil para
desarrollo/demo sin costo). Con la clave, usan visión real.

## Desplegar

```bash
supabase secrets set AI_PROVIDER=anthropic AI_API_KEY=sk-...   # o openai
supabase functions deploy analyze-food
supabase functions deploy analyze-scale
supabase functions deploy analyze-label
supabase functions deploy coach
```

## Prompts

Versionados en `_shared/prompts.ts` (`PROMPT_VERSION`). Salida siempre JSON estricto;
el escalado de macros y toda la aritmética se hacen en el cliente con `@titoapps/nutrition`.
El coach incluye salvaguardas: sin dietas extremas ni lenguaje de riesgo.
