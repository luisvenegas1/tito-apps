// Edge Function: parse-meal-text — interpreta una comida descrita en texto.
// deno-lint-ignore-file no-explicit-any
import { corsHeaders, json } from "../_shared/cors.ts";
import { getProvider } from "../_shared/provider.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string" || !text.trim()) {
      return json({ error: "text requerido" }, 400);
    }
    const provider = await getProvider();
    const items = await provider.parseMealText(text.trim());
    return json({ items });
  } catch (e: any) {
    return json({ error: e?.message ?? "error" }, 500);
  }
});
