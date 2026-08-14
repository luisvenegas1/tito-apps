import { supabase } from "@/lib/supabase/client";
import type { PlanCategory, ExchangeEntry, ExchangeSource, UserBadge, Meal } from "@/lib/supabase/types";

// =====================================================================
// Plan (categorías con metas y equivalencias)
// =====================================================================

/** Plan por defecto (sistema de intercambios estándar, TODO editable por el usuario). */
const DEFAULT_PLAN: Array<Pick<PlanCategory, "name" | "emoji" | "daily_target" | "unit" | "grams_per_exchange" | "sort_order">> = [
  { name: "Carbohidratos", emoji: "🥖", daily_target: 3, unit: "carb_g", grams_per_exchange: 15, sort_order: 0 },
  { name: "Proteínas", emoji: "🥩", daily_target: 4, unit: "protein_g", grams_per_exchange: 7, sort_order: 1 },
  { name: "Grasas", emoji: "🥑", daily_target: 1, unit: "fat_g", grams_per_exchange: 5, sort_order: 2 },
];

export async function listPlanCategories(userId: string): Promise<PlanCategory[]> {
  const { data, error } = await supabase
    .from("plan_categories")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order")
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as PlanCategory[];
}

/** Devuelve el plan del usuario; si nunca configuró, siembra el plan por defecto. */
export async function getOrSeedPlan(userId: string): Promise<PlanCategory[]> {
  const existing = await listPlanCategories(userId);
  if (existing.length > 0) return existing;
  const rows = DEFAULT_PLAN.map((c) => ({ ...c, user_id: userId }));
  const { data, error } = await supabase.from("plan_categories").insert(rows).select("*");
  if (error) throw new Error(error.message);
  return (data ?? []) as PlanCategory[];
}

export type NewCategory = Pick<PlanCategory, "name"> &
  Partial<Pick<PlanCategory, "emoji" | "daily_target" | "unit" | "grams_per_exchange" | "notes" | "sort_order" | "is_active">>;

export async function createCategory(userId: string, c: NewCategory): Promise<PlanCategory> {
  const { data, error } = await supabase
    .from("plan_categories")
    .insert({
      user_id: userId,
      name: c.name,
      emoji: c.emoji ?? null,
      daily_target: c.daily_target ?? 0,
      unit: c.unit ?? "manual",
      grams_per_exchange: c.grams_per_exchange ?? null,
      notes: c.notes ?? null,
      sort_order: c.sort_order ?? 99,
      is_active: c.is_active ?? true,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as PlanCategory;
}

export type CategoryPatch = Partial<
  Pick<PlanCategory, "name" | "emoji" | "daily_target" | "unit" | "grams_per_exchange" | "notes" | "is_active" | "sort_order">
>;

export async function updateCategory(id: string, patch: CategoryPatch): Promise<void> {
  const { error } = await supabase.from("plan_categories").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from("plan_categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// =====================================================================
// Intercambios consumidos
// =====================================================================

export async function listExchangeEntries(userId: string, logDate: string): Promise<ExchangeEntry[]> {
  const { data, error } = await supabase
    .from("exchange_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("log_date", logDate)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as ExchangeEntry[];
}

/** Todas las entradas dentro de un rango (para historial/estadísticas). */
export async function listExchangeEntriesRange(
  userId: string,
  fromDate: string,
  toDate: string,
): Promise<ExchangeEntry[]> {
  const { data, error } = await supabase
    .from("exchange_entries")
    .select("*")
    .eq("user_id", userId)
    .gte("log_date", fromDate)
    .lte("log_date", toDate)
    .order("log_date");
  if (error) throw new Error(error.message);
  return (data ?? []) as ExchangeEntry[];
}

export interface NewExchangeEntry {
  category_id: string;
  amount: number;
  name?: string | null;
  meal?: Meal | null;
  source: ExchangeSource;
  note?: string | null;
}

export async function addExchangeEntries(
  userId: string,
  logDate: string,
  entries: NewExchangeEntry[],
): Promise<ExchangeEntry[]> {
  const rows = entries
    .filter((e) => e.amount !== 0)
    .map((e) => ({
      user_id: userId,
      category_id: e.category_id,
      log_date: logDate,
      amount: e.amount,
      name: e.name ?? null,
      meal: e.meal ?? null,
      source: e.source,
      note: e.note ?? null,
    }));
  if (rows.length === 0) return [];
  const { data, error } = await supabase.from("exchange_entries").insert(rows).select("*");
  if (error) throw new Error(error.message);
  return (data ?? []) as ExchangeEntry[];
}

export type ExchangeEntryPatch = Partial<Pick<ExchangeEntry, "amount" | "name" | "meal" | "category_id" | "note">>;

export async function updateExchangeEntry(id: string, patch: ExchangeEntryPatch): Promise<void> {
  const { error } = await supabase.from("exchange_entries").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteExchangeEntry(id: string): Promise<void> {
  const { error } = await supabase.from("exchange_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// =====================================================================
// Badges
// =====================================================================

export async function listUserBadges(userId: string): Promise<UserBadge[]> {
  const { data, error } = await supabase
    .from("user_badges")
    .select("*")
    .eq("user_id", userId)
    .order("earned_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as UserBadge[];
}

/** Otorga badges nuevos (idempotente por índice único user_id+badge_id). */
export async function grantBadges(userId: string, badgeIds: string[]): Promise<void> {
  if (badgeIds.length === 0) return;
  const rows = badgeIds.map((badge_id) => ({ user_id: userId, badge_id }));
  const { error } = await supabase
    .from("user_badges")
    .upsert(rows, { onConflict: "user_id,badge_id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}
