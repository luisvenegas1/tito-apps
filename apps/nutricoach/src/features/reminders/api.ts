import { supabase } from "@/lib/supabase/client";
import type { ReminderSettings } from "./settings";
import type { PushSub } from "./push";

export interface ReminderConfigRow {
  reminder_enabled: boolean;
  reminder_time: string;
  reminder_water: boolean;
  reminder_protein: boolean;
  reminder_calories: boolean;
  reminder_tz: string;
}

/** Lee la config de recordatorios del perfil (fuente de verdad para el push). */
export async function getReminderConfig(userId: string): Promise<ReminderConfigRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("reminder_enabled, reminder_time, reminder_water, reminder_protein, reminder_calories, reminder_tz")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ReminderConfigRow) ?? null;
}

/** Guarda la config en el perfil (para que el cron del servidor sepa a quién notificar). */
export async function saveReminderConfig(userId: string, s: ReminderSettings): Promise<void> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Costa_Rica";
  const { error } = await supabase
    .from("profiles")
    .update({
      reminder_enabled: s.enabled,
      reminder_time: s.time,
      reminder_water: s.water,
      reminder_protein: s.protein,
      reminder_calories: s.calories,
      reminder_tz: tz,
    })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function savePushSubscription(userId: string, sub: PushSub): Promise<void> {
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { user_id: userId, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      { onConflict: "endpoint" },
    );
  if (error) throw new Error(error.message);
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw new Error(error.message);
}
