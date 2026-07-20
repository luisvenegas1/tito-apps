import { describe, it, expect } from "vitest";
import { matchSummary } from "./share";

describe("matchSummary", () => {
  it("arma resumen con equipos, campeón y MVP", () => {
    const s = matchSummary({
      title: "Mejenga lunes",
      dateLabel: "lunes, 13 de julio",
      teams: [{ name: "Equipo 1", members: ["Luis", "Carlos"] }, { name: "Equipo 2", members: ["Ana"] }],
      champion: "Equipo 1",
      mvp: "Luis",
      score: "3-2",
    });
    expect(s).toContain("⚽ Mejenga lunes");
    expect(s).toContain("Equipo 1: Luis, Carlos");
    expect(s).toContain("🏆 Campeón: Equipo 1 (3-2)");
    expect(s).toContain("⭐ MVP: Luis");
  });

  it("sin resultado no muestra campeón", () => {
    const s = matchSummary({ title: "Mejenga", teams: [{ name: "E1" }] });
    expect(s).not.toContain("Campeón");
  });
});
