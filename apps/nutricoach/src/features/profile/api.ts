import { supabase } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";

/** Devuelve el perfil del usuario actual, creándolo si no existe. */
export async function getOrCreateProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data as Profile;

  const { data: created, error: insErr } = await supabase
    .from("profiles")
    .insert({ user_id: userId, units: "metric" })
    .select("*")
    .single();
  if (insErr) throw new Error(insErr.message);
  return created as Profile;
}

export type ProfilePatch = Partial<
  Pick<Profile, "display_name" | "sex" | "birth_date" | "height_cm" | "activity_level" | "units">
>;

export async function updateProfile(userId: string, patch: ProfilePatch): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Profile;
}
