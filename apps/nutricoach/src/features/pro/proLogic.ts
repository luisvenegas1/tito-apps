import {
  dayCompliance,
  complianceStats,
  evaluateBadges,
  type DayCompliance,
  type DayStatusPoint,
  type ComplianceStats,
  type ExchangeCategoryDef,
  type BadgeStats,
} from "@titoapps/nutrition";
import type { PlanCategory, ExchangeEntry } from "@/lib/supabase/types";
import { todayISO } from "@/lib/date";

/** Categorías activas → definiciones para el motor de intercambios. */
export function toDefs(cats: PlanCategory[]): ExchangeCategoryDef[] {
  return cats
    .filter((c) => c.is_active)
    .map((c) => ({
      id: c.id,
      name: c.name,
      daily_target: c.daily_target,
      unit: c.unit,
      grams_per_exchange: c.grams_per_exchange,
    }));
}

/** Suma de intercambios consumidos por categoría en un conjunto de entradas. */
export function consumedByCategory(entries: ExchangeEntry[]): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const e of entries) acc[e.category_id] = (acc[e.category_id] ?? 0) + Number(e.amount);
  return acc;
}

/** Cumplimiento de un día a partir del plan y las entradas de ese día. */
export function computeDay(cats: PlanCategory[], entries: ExchangeEntry[]): DayCompliance {
  return dayCompliance(toDefs(cats), consumedByCategory(entries));
}

export interface RangeDay {
  date: string;
  day: DayCompliance;
}

/** Lista de fechas YYYY-MM-DD de los últimos `days` (cronológico ascendente). */
export function lastDates(days: number): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(todayISO(new Date(Date.now() - i * 86_400_000)));
  return out;
}

/** Cumplimiento por día para un rango, rellenando los días sin registro. */
export function computeRange(cats: PlanCategory[], entries: ExchangeEntry[], days: number): RangeDay[] {
  const byDate = new Map<string, ExchangeEntry[]>();
  for (const e of entries) {
    const arr = byDate.get(e.log_date) ?? [];
    arr.push(e);
    byDate.set(e.log_date, arr);
  }
  return lastDates(days).map((date) => ({ date, day: computeDay(cats, byDate.get(date) ?? []) }));
}

export function rangeStats(range: RangeDay[]): ComplianceStats {
  return complianceStats(range.map((r) => r.day));
}

export function statusPoints(range: RangeDay[]): DayStatusPoint[] {
  return range.map((r) => ({ date: r.date, status: r.day.status, complete: r.day.complete, pct: r.day.pct }));
}

/** Estadísticas para evaluar badges (usa la última semana para el % semanal). */
export function buildBadgeStats(range: RangeDay[]): BadgeStats {
  const stats = rangeStats(range);
  const week = range.slice(-7).map((r) => r.day);
  const weekLogged = week.filter((d) => d.anyLogged);
  const weeklyCompliancePct = weekLogged.length
    ? Math.round(weekLogged.reduce((s, d) => s + d.pct, 0) / weekLogged.length)
    : 0;
  return {
    daysComplete: stats.daysComplete,
    currentStreak: stats.current,
    bestStreak: stats.best,
    weeklyCompliancePct,
  };
}

export { evaluateBadges };
