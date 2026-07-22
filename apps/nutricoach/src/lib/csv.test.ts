import { describe, it, expect } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("genera encabezado y filas", () => {
    const csv = toCsv([
      { date: "2026-07-20", kcal: 2000 },
      { date: "2026-07-21", kcal: 1850 },
    ]);
    expect(csv).toBe("date,kcal\n2026-07-20,2000\n2026-07-21,1850");
  });

  it("escapa comas, comillas y saltos de línea", () => {
    const csv = toCsv([{ name: 'Pollo, "asado"', note: "línea1\nlínea2" }]);
    expect(csv).toContain('"Pollo, ""asado"""');
    expect(csv).toContain('"línea1\nlínea2"');
  });

  it("respeta el orden de columnas dado", () => {
    const csv = toCsv([{ a: 1, b: 2 }], ["b", "a"]);
    expect(csv.split("\n")[0]).toBe("b,a");
  });

  it("cadena vacía si no hay filas", () => {
    expect(toCsv([])).toBe("");
  });
});
