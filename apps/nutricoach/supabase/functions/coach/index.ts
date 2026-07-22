// Edge Function: coach — nutricionista conversacional y proactivo.
// deno-lint-ignore-file no-explicit-any
import { corsHeaders, json } from "../_shared/cors.ts";
import { getProvider } from "../_shared/provider.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { messages = [], dayContext = {}, proactive = false } = await req.json();
    const provider = await getProvider();
    const r = await provider.coachReply(messages, dayContext, proactive);
    return json(r);
  } catch (e: any) {
    return json({ error: e?.message ?? "error" }, 500);
  }
});
