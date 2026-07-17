import { describe, it, expect } from "vitest";
import { recommendTeams, recommendFormat } from "./formats";

describe("recommendTeams", () => {
  it("rangos del roadmap", () => {
    expect(recommendTeams(8)).toBe(2);
    expect(recommendTeams(10)).toBe(2);
    expect(recommendTeams(12)).toBe(2);
    expect(recommendTeams(13)).toBe(2);
    expect(recommendTeams(14)).toBe(2);
    expect(recommendTeams(15)).toBe(3);
    expect(recommendTeams(18)).toBe(3);
    expect(recommendTeams(20)).toBe(4);
    expect(recommendTeams(24)).toBe(4);
    expect(recommendTeams(30)).toBe(5); // >24 → más
  });
});

describe("recommendFormat", () => {
  it("12 jugadores → 2 equipos de 6", () => {
    const r = recommendFormat(12, 2);
    expect(r.teams).toBe(2);
    expect(r.minPerTeam).toBe(6);
    expect(r.maxPerTeam).toBe(6);
    expect(r.substitutesPerTeam).toBe(1);
  });
  it("14 jugadores → 2 equipos con cambio", () => {
    const r = recommendFormat(14, 2);
    expect(r.teams).toBe(2);
    expect(r.minPerTeam).toBe(7);
    expect(r.substitutesPerTeam).toBe(2);
  });
  it("avisa si faltan porteros", () => {
    const r = recommendFormat(24, 2);
    expect(r.teams).toBe(4);
    expect(r.keeperWarning).toMatch(/portero/);
  });
  it("sin aviso si hay suficientes porteros", () => {
    const r = recommendFormat(24, 4);
    expect(r.keeperWarning).toBeUndefined();
  });
});
