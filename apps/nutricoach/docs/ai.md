# Arquitectura de IA

## Principio de seguridad

**Ninguna clave de proveedor de IA toca el cliente.** Todas las llamadas a modelos pasan por **Supabase Edge Functions** (Deno, server-side). El cliente invoca la función con `supabase.functions.invoke(name, { body })` y recibe una respuesta tipada. Contratos en `apps/nutricoach/src/lib/ai/contracts.ts`.

## Abstracción de proveedor

Las Edge Functions dependen de una interfaz `AIProvider`, no de un SDK concreto. Esto permite cambiar de proveedor de visión/LLM (OpenAI, Anthropic, Google) sin tocar la app ni el contrato.

```
app (cliente)
  └─ lib/ai/client.ts  → functions.invoke('analyze-food', { body })
        └─ Edge Function 'analyze-food'  (Deno)
              └─ provider adapter (OpenAI | Anthropic | Google)   ← clave server-side
```

El proveedor concreto se selecciona por variable de entorno de la función (`AI_PROVIDER` = `anthropic`|`openai`, `AI_API_KEY`, `AI_MODEL` opcional). **Bloque 2 implementó los adapters reales** (`_shared/openai.ts` y `_shared/anthropic.ts`) con visión + salida JSON; sin `AI_API_KEY` la función cae al stub determinista (útil para desarrollo/demo sin costo). Prompts versionados en `_shared/prompts.ts` (`PROMPT_VERSION`). Detalle de despliegue en `supabase/functions/README.md`.

## Edge Functions (contratos)

### `analyze-food` — análisis de foto
Request: `{ imageBase64: string, hint?: string }`
Response: `{ items: Array<{ name, grams, kcal, protein_g, carb_g, fat_g, fiber_g?, sugar_g?, sodium_mg?, confidence }> }`

El modelo de visión identifica los alimentos del plato y estima cantidad en gramos. La app permite corrección manual de cada item antes de confirmar.

### `analyze-scale` — modo balanza
Request: `{ imageBase64: string }`
Response: `{ food: { name }, grams: number | null, gramsConfidence: number, per100g: {...} }`

La IA intenta leer el número de la balanza y reconocer el alimento. Si `grams` es `null` o `gramsConfidence` es baja, la UI pide el peso a mano. Luego la app escala `per100g` × `grams` con `@titoapps/nutrition`.

### `analyze-label` — tabla nutricional
Request: `{ imageBase64: string, consumedGrams?: number }`
Response: `{ per100g: {...}, servingSize_g?: number }`

OCR + parsing de la tabla del empaque. Con el peso consumido, la app calcula los valores exactos. Ideal para productos sin código de barras.

### `coach` — coach conversacional y proactivo
Request: `{ messages: Array<{ role, content }>, dayContext: DayContext }`
Response: `{ reply: string, suggestions?: Array<{ label, action }> }`

`DayContext` incluye macros consumidos/faltantes, objetivo, peso reciente y entrenamientos del día, para respuestas concretas. Modo proactivo: se llama sin mensaje de usuario, con un prompt de sistema que pide una recomendación breve del día.

## Reparto de trabajo IA vs. cálculo local

La IA hace lo que solo ella puede: **identificar y estimar cantidad** (visión) y **razonar/aconsejar** (coach). La **matemática de macros la hace `@titoapps/nutrition` en el cliente** (barato, instantáneo, determinista, editable). Esto reduce costo de tokens, evita errores aritméticos del modelo y hace el resultado corregible al instante.

## Prompts (lineamientos)

- **Visión:** pedir salida JSON estricta (schema del contrato), gramos como número, `confidence` 0–1. Prohibir texto libre fuera del JSON. Incluir el `hint` del usuario si existe.
- **Coach:** system prompt con rol de "nutricionista personal empático y basado en evidencia". Recibe `dayContext`. Respuestas breves, accionables, sin culpa. Nunca prescribe dietas extremas ni conductas de riesgo.
- Versionar los prompts en la Edge Function y registrar cambios importantes en [NutriCoach-Bible.md](./NutriCoach-Bible.md).

## Salvaguardas

- El coach **no** promueve déficits peligrosos, ayunos extremos, ni lenguaje que refuerce trastornos alimentarios. Si detecta señales de conducta de riesgo, responde con empatía y sugiere apoyo profesional en vez de reforzar.
- Rangos de seguridad: mínimos calóricos y de proteína razonables; la app avisa (no bloquea) si una meta personalizada cae fuera de rango saludable.
- La estimación de la IA es **aproximada por diseño**; la UI siempre deja claro que es editable y muestra `confidence` cuando es baja.

## Costos y rendimiento

- El escalado local evita rellamar al modelo por cada ajuste de peso.
- Cache de resultados de barcode/etiqueta en `foods` para no reanalizar.
- Las llamadas de visión se comprimen (imagen redimensionada en cliente antes de subir).
