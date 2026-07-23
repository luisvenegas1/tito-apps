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
    // Comidas de texto usan un modelo más capaz (Sonnet por defecto), configurable
    // con el secreto AI_MODEL_MEAL. El resto de funciones sigue en Haiku.
    const provider = await getProvider(Deno.env.get("AI_MODEL_MEAL") ?? "claude-sonnet-5");
    const products = Array.isArray(knownProducts)
      ? (knownProducts.filter((p: unknown) => typeof p === "string") as string[])
      : undefined;
    const items = await provider.parseMealText(text.trim(), products);
    return json({ items });
  } catch (e: any) {
    return json({ error: e?.message ?? "error" }, 500);
  }
});
