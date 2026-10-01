/**
 * Datos de referencia de cada usuario: perfil, categorías, personas y tipo de cambio.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireUserId, supabase } from "@/lib/supabase/client";
import { check } from "@/lib/errors";
import { qk } from "@/lib/query";
import type { Category, Currency, ExchangeRate, Person, Profile, TxnKind } from "@/lib/supabase/types";

export function useProfile() {
  return useQuery({
    queryKey: qk.profile,
    queryFn: async () => {
      const uid = await requireUserId();
      return check(await supabase.from("profiles").select("*").eq("id", uid).single()) as Profile;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<Profile, "id">>) => {
      const uid = await requireUserId();
      check(await supabase.from("profiles").update(patch).eq("id", uid));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.profile }),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: qk.categories,
    queryFn: async () =>
      check(await supabase.from("categories").select("*").order("sort_order").order("name")) as Category[],
    staleTime: 5 * 60_000,
  });
}

/** Mapa id → categoría (incluye archivadas, para mostrar movimientos viejos). */
export function useCategoryMap(): Map<string, Category> {
  const { data } = useCategories();
  return new Map((data ?? []).map((c) => [c.id, c]));
}

export function useSaveCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: { id?: string; name: string; icon: string | null; kind_hint: TxnKind; is_archived?: boolean }) => {
      if (c.id) {
        check(await supabase.from("categories").update({ name: c.name.trim(), icon: c.icon, kind_hint: c.kind_hint, is_archived: c.is_archived ?? false }).eq("id", c.id));
      } else {
        const uid = await requireUserId();
        check(await supabase.from("categories").insert({ user_id: uid, name: c.name.trim(), icon: c.icon, kind_hint: c.kind_hint, sort_order: 50 }));
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.categories }),
  });
}

export function usePeople() {
  return useQuery({
    queryKey: qk.people,
    queryFn: async () => check(await supabase.from("people").select("*").order("name")) as Person[],
    staleTime: 5 * 60_000,
  });
}

export function useSavePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { name: string; role: string | null }) => {
      const uid = await requireUserId();
      check(await supabase.from("people").insert({ user_id: uid, name: p.name.trim(), role: p.role }));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.people }),
  });
}

export function useDeletePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => check(await supabase.from("people").delete().eq("id", id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.people }),
  });
}

export function useRates() {
  return useQuery({
    queryKey: qk.rates,
    queryFn: async () =>
      (check(await supabase.from("exchange_rates").select("*").order("valid_from", { ascending: false })) as ExchangeRate[]).map(
        (r) => ({ ...r, crc_per_usd: Number(r.crc_per_usd) }),
      ),
    staleTime: 5 * 60_000,
  });
}

export function useSaveRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: { crc_per_usd: number; valid_from: string }) => {
      const uid = await requireUserId();
      check(await supabase.from("exchange_rates").upsert({ user_id: uid, ...r }, { onConflict: "user_id,valid_from" }));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.rates }),
  });
}

/** Moneda base del usuario (CRC por defecto mientras carga). */
export function useBaseCurrency(): Currency {
  return useProfile().data?.base_currency ?? "CRC";
}
