// Edge Function: meal-plan — plan de comidas generado por IA a partir de las metas.
// deno-lint-ignore-file no-explicit-any
import { corsHeaders, json } from "../_shared/cors.ts";
import { getProvider } from "../_shared/provider.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    if (!body?.targets) return json({ error: "targets requerido" }, 400);
    const provider = await getProvider();
    const r = await provider.mealPlan(body);
    return json(r);
  } catch (e: any) {
    return json({ error: e?.message ?? "error" }, 500);
  }
});
