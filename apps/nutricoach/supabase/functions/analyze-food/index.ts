// Edge Function: analyze-food — análisis de foto de un plato.
// deno-lint-ignore-file no-explicit-any
import { corsHeaders, json } from "../_shared/cors.ts";
import { getProvider } from "../_shared/provider.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { imageBase64, hint } = await req.json();
    if (!imageBase64) return json({ error: "imageBase64 requerido" }, 400);
    const provider = await getProvider();
    const items = await provider.analyzeFoodPhoto(imageBase64, hint);
    return json({ items });
  } catch (e: any) {
    return json({ error: e?.message ?? "error" }, 500);
  }
});
