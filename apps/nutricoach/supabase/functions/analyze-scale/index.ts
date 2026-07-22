// Edge Function: analyze-scale — foto del alimento sobre una balanza.
// deno-lint-ignore-file no-explicit-any
import { corsHeaders, json } from "../_shared/cors.ts";
import { getProvider } from "../_shared/provider.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) return json({ error: "imageBase64 requerido" }, 400);
    const provider = await getProvider();
    const r = await provider.analyzeScalePhoto(imageBase64);
    return json({ food: { name: r.name }, grams: r.grams, gramsConfidence: r.gramsConfidence, per100g: r.per100g });
  } catch (e: any) {
    return json({ error: e?.message ?? "error" }, 500);
  }
});
