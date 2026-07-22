import { supabase } from "@/lib/supabase/client";
import { ai } from "@/lib/ai/client";
import type { CoachMessage } from "@/lib/supabase/types";
import type { CoachDayContext, CoachResponse } from "@/lib/ai/contracts";

export async function listCoachMessages(userId: string): Promise<CoachMessage[]> {
  const { data, error } = await supabase
    .from("ai_messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at")
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as CoachMessage[];
}

async function persist(userId: string, role: "user" | "assistant", content: string, context: object | null) {
  const { error } = await supabase
    .from("ai_messages")
    .insert({ user_id: userId, role, content, context });
  if (error) throw new Error(error.message);
}

/** Envía un mensaje al coach con el contexto del día y persiste la conversación. */
export async function sendToCoach(
  userId: string,
  history: CoachMessage[],
  message: string,
  dayContext: CoachDayContext,
): Promise<CoachResponse> {
  await persist(userId, "user", message, dayContext);
  const res = await ai.coach({
    messages: [
      ...history.filter((m) => m.role !== "system").map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: message },
    ],
    dayContext,
  });
  await persist(userId, "assistant", res.reply, null);
  return res;
}

/** Recomendación proactiva del día (no persiste; es efímera en el dashboard). */
export async function getProactiveTip(dayContext: CoachDayContext): Promise<CoachResponse> {
  return ai.coach({ messages: [], dayContext, proactive: true });
}
