/**
 * Datos de referencia de cada usuario: perfil, categorías, personas y tipo de cambio.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireUserId, supabase } from "@/lib/supabase/client";
import { check } from "@/lib/errors";
import { qk } from "@/lib/query";
import { useEffect } from "react";
import { todayISO } from "@/lib/dates";
import type { Category, Currency, ExchangeRate, ForeignCurrency, Person, Profile, TxnKind } from "@/lib/supabase/types";

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

/**
 * Tipos de cambio para calcular: la referencia global del BCCR (si el usuario
 * la usa) + los que escribió a mano. En la misma fecha gana el manual.
 */
export function useRates() {
  const { data: profile } = useProfile();
  const useReference = profile?.auto_rates ?? true;
  return useQuery({
    queryKey: [...qk.rates, useReference],
    queryFn: async () => {
      const manual = (check(await supabase.from("exchange_rates").select("*")) as ManualRate[]).map(
        (r): ExchangeRate => ({ id: r.id, currency: r.currency, buy: Number(r.buy), sell: Number(r.sell), valid_from: r.valid_from, source: "manual" }),
      );
      const reference = useReference
        ? (check(await supabase.from("reference_rates").select("currency, rate_date, buy, sell")) as ReferenceRate[]).map(
            (r): ExchangeRate => ({
              id: `${r.currency}-${r.rate_date}`,
              currency: r.currency,
              buy: Number(r.buy),
              sell: Number(r.sell),
              valid_from: r.rate_date,
              source: "bccr",
            }),
          )
        : [];
      return [...manual, ...reference].sort((a, b) => b.valid_from.localeCompare(a.valid_from));
    },
    staleTime: 5 * 60_000,
  });
}

interface ManualRate {
  id: string;
  currency: ForeignCurrency;
  buy: number;
  sell: number;
  valid_from: string;
}
interface ReferenceRate {
  currency: ForeignCurrency;
  rate_date: string;
  buy: number;
  sell: number;
}

export function useSaveRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: { currency: ForeignCurrency; buy: number; sell: number; valid_from: string }) => {
      const uid = await requireUserId();
      check(await supabase.from("exchange_rates").upsert({ user_id: uid, ...r }, { onConflict: "user_id,currency,valid_from" }));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.rates }),
  });
}

export function useDeleteRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => check(await supabase.from("exchange_rates").delete().eq("id", id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.rates }),
  });
}

/**
 * Pide al servidor que guarde el tipo de cambio de hoy del BCCR. El servidor
 * solo consulta la API si nadie lo ha hecho hoy (lo comparten todos los usuarios).
 */
export async function requestTodayRates(): Promise<void> {
  const { error } = await supabase.functions.invoke("sync-rates", { body: {} });
  if (error) throw new Error("No se pudo traer el tipo de cambio del BCCR. Inténtalo más tarde.");
}

let ensuredToday: string | null = null;

/**
 * Al abrir la app: si el tipo de cambio de hoy ya está en la base, no hace nada.
 * Solo si falta (el pg_cron no corrió todavía) le pide al servidor que lo traiga:
 * el primer usuario del día lo guarda para todos.
 */
export function useEnsureTodayRates() {
  const qc = useQueryClient();
  useEffect(() => {
    const today = todayISO();
    if (ensuredToday === today) return;
    ensuredToday = today;
    (async () => {
      const { data } = await supabase.from("reference_rates").select("rate_date").eq("currency", "USD").gte("rate_date", today).limit(1);
      if (data && data.length > 0) return; // ya está guardado: no se llama a la API
      await requestTodayRates();
      qc.invalidateQueries({ queryKey: qk.rates });
    })().catch(() => {
      ensuredToday = null; // sin red: se reintenta en la próxima apertura
    });
  }, [qc]);
}

/** Moneda base del usuario (CRC por defecto mientras carga). */
export function useBaseCurrency(): Currency {
  return useProfile().data?.base_currency ?? "CRC";
}
