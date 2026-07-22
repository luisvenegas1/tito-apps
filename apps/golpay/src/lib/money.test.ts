import { describe, it, expect } from "vitest";
import { ceilTo, perHeadDivided, perHead } from "./money";

describe("ceilTo", () => {
  it("redondea hacia arriba al múltiplo", () => {
    expect(ceilTo(4818, 500)).toBe(5000);
    expect(ceilTo(5000, 500)).toBe(5000);
    expect(ceilTo(4501, 500)).toBe(5000);
    expect(ceilTo(4500, 500)).toBe(4500);
  });
});

describe("perHeadDivided", () => {
  it("el caso del torneo: 55000 entre 11 = 5000", () => {
    expect(perHeadDivided(55000, 11)).toBe(5000);
  });
  it("redondea el reparto hacia arriba a 500", () => {
    // 50000 / 11 = 4545,45 → sube a 5000
    expect(perHeadDivided(50000, 11)).toBe(5000);
    // 48000 / 12 = 4000 exacto
    expect(perHeadDivided(48000, 12)).toBe(4000);
  });
  it("sin jugadores o sin monto, 0", () => {
    expect(perHeadDivided(55000, 0)).toBe(0);
    expect(perHeadDivided(0, 11)).toBe(0);
  });
});

describe("perHead por modo", () => {
  it("fijo usa el monto por jugador", () => {
    expect(perHead("fijo", { costPerPlayer: 2200, totalAmount: 0, playerCount: 20 })).toBe(2200);
  });
  it("dividido reparte el total", () => {
    expect(perHead("dividido", { costPerPlayer: 0, totalAmount: 55000, playerCount: 11 })).toBe(5000);
  });
  it("gratis siempre 0", () => {
    expect(perHead("gratis", { costPerPlayer: 2200, totalAmount: 55000, playerCount: 11 })).toBe(0);
  });
});
