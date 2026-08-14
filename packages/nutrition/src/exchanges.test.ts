import { describe, it, expect } from "vitest";
import {
  categoryProgress,
  dayCompliance,
  macrosToExchanges,
  currentStreak,
  bestStreak,
  complianceStats,
  type ExchangeCategoryDef,
  type DayStatusPoint,
} from "./exchanges";

const CARB: ExchangeCategoryDef = { id: "c", name: "Carbohidratos", daily_target: 3, unit: "carb_g", grams_per_exchange: 15 };
const PROT: ExchangeCategoryDef = { id: "p", name: "Proteínas", daily_target: 4, unit: "protein_g", grams_per_exchange: 7 };
const FAT: ExchangeCategoryDef = { id: "f", name: "Grasas", daily_target: 1, unit: "fat_g", grams_per_exchange: 5 };
const PLAN = [CARB, PROT, FAT];

describe("categoryProgress", () => {
  it("marca cumplida al llegar a la meta", () => {
    const p = categoryProgress(PROT, 4);
    expect(p.met).toBe(true);
    expect(p.remaining).toBe(0);
    expect(p.ratio).toBe(1);
  });

  it("conserva el consumo real por encima de la meta sin pasar de ratio 1", () => {
    const p = categoryProgress(PROT, 5);
    expect(p.met).toBe(true);
    expect(p.consumed).toBe(5); // valor real conservado
    expect(p.ratio).toBe(1); // no 1.25
    expect(p.remaining).toBe(0);
  });

  it("calcula faltante parcial", () => {
    const p = categoryProgress(CARB, 2);
    expect(p.met).toBe(false);
    expect(p.remaining).toBe(1);
    expect(p.ratio).toBeCloseTo(2 / 3, 5);
  });

  it("soporta fracciones", () => {
    const p = categoryProgress({ id: "x", name: "X", daily_target: 1.5 }, 0.5);
    expect(p.remaining).toBe(1);
    expect(p.met).toBe(false);
  });
});

describe("dayCompliance", () => {
  it("3/4/1 = 100% y completo", () => {
    const d = dayCompliance(PLAN, { c: 3, p: 4, f: 1 });
    expect(d.pct).toBe(100);
    expect(d.complete).toBe(true);
    expect(d.status).toBe("complete");
  });

  it("2/4/1 = parcial (no completo)", () => {
    const d = dayCompliance(PLAN, { c: 2, p: 4, f: 1 });
    expect(d.complete).toBe(false);
    expect(d.pct).toBe(89); // (0.667+1+1)/3
    expect(d.status).toBe("partial");
  });

  it("exceso: categorías cumplidas, valores reales conservados, sin pasar de 100%", () => {
    const d = dayCompliance(PLAN, { c: 4, p: 5, f: 2 });
    expect(d.complete).toBe(true);
    expect(d.pct).toBe(100);
    expect(d.categories.find((c) => c.id === "p")?.consumed).toBe(5);
  });

  it("día sin registro = none", () => {
    const d = dayCompliance(PLAN, {});
    expect(d.anyLogged).toBe(false);
    expect(d.status).toBe("none");
    expect(d.pct).toBe(0);
  });

  it("registro bajo = low", () => {
    const d = dayCompliance(PLAN, { c: 0.5 });
    expect(d.status).toBe("low");
  });
});

describe("macrosToExchanges", () => {
  it("convierte macros a intercambios redondeando a 0.5", () => {
    const ex = macrosToExchanges(PLAN, { carb_g: 30, protein_g: 21, fat_g: 5 });
    expect(ex.c).toBe(2); // 30/15
    expect(ex.p).toBe(3); // 21/7
    expect(ex.f).toBe(1); // 5/5
  });

  it("redondea a media porción", () => {
    const ex = macrosToExchanges([PROT], { protein_g: 5 }); // 5/7 = 0.71 → 0.5
    expect(ex.p).toBe(0.5);
  });

  it("categoría manual o sin equivalencia => 0", () => {
    const ex = macrosToExchanges([{ id: "m", name: "Agua", daily_target: 8, unit: "manual" }], { carb_g: 99 });
    expect(ex.m).toBe(0);
  });
});

describe("streaks", () => {
  const p = (complete: boolean): DayStatusPoint => ({
    date: "d",
    status: complete ? "complete" : "partial",
    complete,
    pct: complete ? 100 : 50,
  });

  it("racha actual cuenta días completos consecutivos desde el más reciente", () => {
    // más reciente primero
    expect(currentStreak([p(true), p(true), p(true), p(false), p(true)])).toBe(3);
  });

  it("un día no completo corta la racha actual", () => {
    expect(currentStreak([p(false), p(true), p(true)])).toBe(0);
  });

  it("mejor racha encuentra el mayor tramo", () => {
    expect(bestStreak([p(true), p(true), p(false), p(true), p(true), p(true)])).toBe(3);
  });
});

describe("complianceStats", () => {
  it("agrega promedio, días y categoría más difícil", () => {
    const days = [
      dayCompliance(PLAN, { c: 3, p: 4, f: 1 }), // completo
      dayCompliance(PLAN, { c: 1, p: 4, f: 1 }), // carbs flojo
      dayCompliance(PLAN, {}), // sin registro
    ];
    const s = complianceStats(days);
    expect(s.daysComplete).toBe(1);
    expect(s.daysNone).toBe(1);
    expect(s.daysPartial).toBe(1);
    expect(s.total).toBe(3);
    expect(s.hardestCategory).toBe("Carbohidratos");
    expect(s.avgCompliance).toBeGreaterThan(0);
  });
});
