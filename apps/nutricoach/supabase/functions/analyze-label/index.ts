// Edge Function: analyze-label — foto de la tabla nutricional del empaque.
// deno-lint-ignore-file no-explicit-any
import { corsHeaders, json } from "../_shared/cors.ts";
import { getProvider } from "../_shared/provider.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) return json({ error: "imageBase64 requerido" }, 400);
    const provider = await getProvider();
    const r = await provider.analyzeLabelPhoto(imageBase64);
    return json(r);
  } catch (e: any) {
    return json({ error: e?.message ?? "error" }, 500);
  }
});
