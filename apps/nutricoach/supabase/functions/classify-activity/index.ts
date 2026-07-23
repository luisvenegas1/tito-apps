// Edge Function: classify-activity — determina el nivel de actividad del usuario
// a partir de las respuestas de un cuestionario (días de entreno, deportes, etc.).
// deno-lint-ignore-file no-explicit-any
import { corsHeaders, json } from "../_shared/cors.ts";
import { getProvider } from "../_shared/provider.ts";

const LEVELS = ["sedentary", "light", "moderate", "active", "very_active"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { answers } = await req.json();
    if (!answers || typeof answers !== "object") {
      return json({ error: "answers requerido" }, 400);
    }
    const provider = await getProvider();
    const r = await provider.classifyActivity(answers as Record<string, unknown>);
    // Salvaguarda: si el modelo devuelve algo fuera del enum, caemos a "moderate".
    const activity = LEVELS.includes(r.activity) ? r.activity : "moderate";
    return json({ activity, reason: r.reason, confidence: r.confidence });
  } catch (e: any) {
    return json({ error: e?.message ?? "error" }, 500);
  }
});
