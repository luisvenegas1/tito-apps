// @titoapps/nutrition — sistema de INTERCAMBIOS / porciones (Seguimiento Profesional).
// Puro (sin React, sin I/O). El profesional define metas y equivalencias; acá NO se
// hardcodea "1 grasa = X g": las equivalencias siempre llegan en los datos del plan.
// Toda fórmula nueva entra con test.

export type ExchangeUnit = "carb_g" | "protein_g" | "fat_g" | "kcal" | "manual";

/** Definición de una categoría del plan (carbohidratos, proteínas, grasas, …). */
export interface ExchangeCategoryDef {
  id: string;
  name: string;
  /** Meta diaria de intercambios. Permite fracciones (0.5, 1.5, …). */
  daily_target: number;
  /** Cómo convertir macros detectados → intercambios (opcional). */
  unit?: ExchangeUnit;
  /** Cuánto de `unit` equivale a 1 intercambio (ej. 15 g de carbohidrato). */
  grams_per_exchange?: number | null;
}

export interface CategoryProgress {
  id: string;
  name: string;
  target: number;
  /** Consumo REAL del día (puede superar la meta). */
  consumed: number;
  /** consumed >= target (con target > 0). */
  met: boolean;
  /** max(0, target - consumed). */
  remaining: number;
  /** min(1, consumed/target) — usado para el % de cumplimiento (no supera 1). */
  ratio: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Progreso de UNA categoría. Conserva el consumo real aunque supere la meta. */
export function categoryProgress(def: ExchangeCategoryDef, consumed: number): CategoryProgress {
  const target = Math.max(0, def.daily_target || 0);
  const c = Math.max(0, round2(consumed || 0));
  const met = target > 0 ? c >= target : c > 0;
  const remaining = target > 0 ? Math.max(0, round2(target - c)) : 0;
  const ratio = target > 0 ? Math.min(1, c / target) : c > 0 ? 1 : 0;
  return { id: def.id, name: def.name, target, consumed: c, met, remaining, ratio };
}

export type DayStatus = "complete" | "partial" | "low" | "none";

export interface DayCompliance {
  /** 0..100 — promedio del ratio de las categorías con meta > 0. */
  pct: number;
  status: DayStatus;
  /** Todas las categorías con meta cumplidas. */
  complete: boolean;
  anyLogged: boolean;
  categories: CategoryProgress[];
}

/**
 * Cumplimiento del día. % = promedio de min(1, consumido/meta) de las categorías
 * activas con meta > 0. Superar la meta NO sube el % arriba de 100, pero el
 * consumo real se conserva en cada categoría. Un día "completo" = todas cumplidas.
 */
export function dayCompliance(
  defs: ExchangeCategoryDef[],
  consumedById: Record<string, number>,
): DayCompliance {
  const cats = defs.map((d) => categoryProgress(d, consumedById[d.id] ?? 0));
  const withTarget = cats.filter((c) => c.target > 0);
  const anyLogged = cats.some((c) => c.consumed > 0);
  const pct = withTarget.length
    ? Math.round((withTarget.reduce((s, c) => s + c.ratio, 0) / withTarget.length) * 100)
    : 0;
  const complete = withTarget.length > 0 && withTarget.every((c) => c.met);
  let status: DayStatus = "none";
  if (anyLogged) status = complete ? "complete" : pct >= 50 ? "partial" : "low";
  return { pct, status, complete, anyLogged, categories: cats };
}

/**
 * Convierte macros detectados (foto / código de barras / etiqueta / texto) a
 * intercambios por categoría usando la equivalencia definida en el plan.
 * Redondea a 0.5 intercambio (medias porciones). Categorías 'manual' → 0.
 */
export function macrosToExchanges(
  defs: ExchangeCategoryDef[],
  macros: { protein_g?: number; carb_g?: number; fat_g?: number; kcal?: number },
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of defs) {
    const unit = d.unit ?? "manual";
    const per = d.grams_per_exchange ?? 0;
    if (unit === "manual" || !(per > 0)) {
      out[d.id] = 0;
      continue;
    }
    const amount =
      unit === "carb_g"
        ? macros.carb_g ?? 0
        : unit === "protein_g"
          ? macros.protein_g ?? 0
          : unit === "fat_g"
            ? macros.fat_g ?? 0
            : macros.kcal ?? 0;
    out[d.id] = Math.round((amount / per) * 2) / 2;
  }
  return out;
}

export interface DayStatusPoint {
  date: string;
  status: DayStatus;
  complete: boolean;
  pct: number;
}

/**
 * Racha actual: días consecutivos COMPLETOS empezando por el más reciente.
 * `pointsDesc` va del día más reciente al más antiguo. Un día sin registro
 * (o parcial) corta la racha.
 */
export function currentStreak(pointsDesc: DayStatusPoint[]): number {
  let n = 0;
  for (const p of pointsDesc) {
    if (p.complete) n++;
    else break;
  }
  return n;
}

/** Mejor racha histórica de días completos consecutivos (orden cronológico). */
export function bestStreak(pointsChrono: DayStatusPoint[]): number {
  let best = 0;
  let run = 0;
  for (const p of pointsChrono) {
    if (p.complete) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}

export interface ComplianceStats {
  /** % promedio sobre los días CON registro. */
  avgCompliance: number;
  daysComplete: number;
  daysPartial: number;
  daysNone: number;
  total: number;
  hardestCategory: string | null;
  bestCategory: string | null;
  current: number;
  best: number;
}

/**
 * Estadísticas agregadas de un rango de días (cada uno con su compliance ya
 * calculado, en orden cronológico). Deriva categoría más difícil / mejor y rachas.
 */
export function complianceStats(daysChrono: DayCompliance[]): ComplianceStats {
  const logged = daysChrono.filter((d) => d.anyLogged);
  const avg = logged.length
    ? Math.round(logged.reduce((s, d) => s + d.pct, 0) / logged.length)
    : 0;
  const daysComplete = daysChrono.filter((d) => d.status === "complete").length;
  const daysNone = daysChrono.filter((d) => d.status === "none").length;
  const daysPartial = daysChrono.length - daysComplete - daysNone;

  const sums = new Map<string, { name: string; sum: number; n: number }>();
  for (const d of logged) {
    for (const c of d.categories) {
      if (c.target <= 0) continue;
      const e = sums.get(c.id) ?? { name: c.name, sum: 0, n: 0 };
      e.sum += c.ratio;
      e.n++;
      sums.set(c.id, e);
    }
  }
  let hardest: string | null = null;
  let bestC: string | null = null;
  let lo = Infinity;
  let hi = -Infinity;
  for (const { name, sum, n } of sums.values()) {
    const avgR = n ? sum / n : 0;
    if (avgR < lo) {
      lo = avgR;
      hardest = name;
    }
    if (avgR > hi) {
      hi = avgR;
      bestC = name;
    }
  }

  const points: DayStatusPoint[] = daysChrono.map((d, i) => ({
    date: String(i),
    status: d.status,
    complete: d.complete,
    pct: d.pct,
  }));
  return {
    avgCompliance: avg,
    daysComplete,
    daysPartial,
    daysNone,
    total: daysChrono.length,
    hardestCategory: hardest,
    bestCategory: bestC,
    current: currentStreak([...points].reverse()),
    best: bestStreak(points),
  };
}
