// Edge Function: parse-meal-text — interpreta una comida descrita en texto.
// deno-lint-ignore-file no-explicit-any
import { corsHeaders, json } from "../_shared/cors.ts";
import { getProvider } from "../_shared/provider.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { text, knownProducts } = await req.json();
    if (!text || typeof text !== "string" || !text.trim()) {
      return json({ error: "text requerido" }, 400);
    }
    const products = Array.isArray(knownProducts)
      ? (knownProducts.filter((p: unknown) => typeof p === "string") as string[])
      : undefined;

    // Comidas de texto usan un modelo más capaz (Sonnet por defecto), configurable
    // con el secreto AI_MODEL_MEAL. Si ese modelo falla (acceso, límites, etc.),
    // caemos al modelo por defecto (Haiku) para no bloquear el registro.
    let items;
    try {
      const provider = await getProvider(Deno.env.get("AI_MODEL_MEAL") ?? "claude-sonnet-5");
      items = await provider.parseMealText(text.trim(), products);
    } catch (mealErr: any) {
      console.error("parse-meal-text: modelo de comidas falló, uso Haiku:", mealErr?.message ?? mealErr);
      const fallback = await getProvider(); // modelo por defecto (Haiku)
      items = await fallback.parseMealText(text.trim(), products);
    }
    return json({ items });
  } catch (e: any) {
    return json({ error: e?.message ?? "error" }, 500);
  }
});
