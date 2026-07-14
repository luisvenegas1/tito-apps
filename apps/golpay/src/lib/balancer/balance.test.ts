import { describe, it, expect } from "vitest";
import { balanceTeams, DEFAULT_LEVEL, BalancePlayer } from "./balance";

function mk(n: number, levels: (number | null)[], keepers: number[] = []): BalancePlayer[] {
  return Array.from({ length: n }, (_, i) => ({
    id: String(i),
    name: `P${i}`,
    level: levels[i] ?? null,
    canGoalkeeper: keepers.includes(i),
  }));
}

const keeperCount = (team: { players: BalancePlayer[] }) =>
  team.players.filter((p) => p.canGoalkeeper).length;

describe("balanceTeams", () => {
  it("crea el número de equipos pedido y tamaños parejos", () => {
    const teams = balanceTeams(mk(24, Array(24).fill(2)), 4);
    expect(teams).toHaveLength(4);
    expect(teams.every((t) => t.players.length === 6)).toBe(true);
  });

  it("minimiza la diferencia de nivel entre 2 equipos", () => {
    const teams = balanceTeams(mk(6, [3, 3, 2, 2, 1, 1]), 2);
    expect(Math.abs(teams[0].score - teams[1].score)).toBeLessThanOrEqual(1);
  });

  it("usa nivel intermedio (2) para jugadores sin evaluar", () => {
    const teams = balanceTeams(mk(4, [null, null, null, null]), 2);
    expect(DEFAULT_LEVEL).toBe(2);
    expect(teams[0].score).toBe(DEFAULT_LEVEL * 2);
    expect(teams[1].score).toBe(DEFAULT_LEVEL * 2);
  });

  it("reparte los porteros en equipos distintos (2 equipos)", () => {
    const teams = balanceTeams(mk(8, Array(8).fill(2), [0, 1]), 2);
    expect(teams.filter((t) => keeperCount(t) >= 1)).toHaveLength(2);
  });

  it("mini-cuadrangular de 24 (niveles 1–3) queda parejo", () => {
    const levels = Array.from({ length: 24 }, (_, i) => (i % 3) + 1);
    const teams = balanceTeams(mk(24, levels), 4);
    const scores = teams.map((t) => t.score);
    expect(Math.max(...scores) - Math.min(...scores)).toBeLessThanOrEqual(1);
  });

  // ----- casos extremos nuevos -----

  it("los swaps NUNCA dejan un equipo sin portero (niveles dispares)", () => {
    const players = mk(8, [3, 1, 3, 3, 3, 1, 1, 1], [0, 1]);
    const teams = balanceTeams(players, 2);
    expect(teams.every((t) => keeperCount(t) >= 1)).toBe(true);
  });

  it("porteros < equipos: solo los que hay quedan repartidos", () => {
    const teams = balanceTeams(mk(12, Array(12).fill(2), [0, 1]), 4);
    expect(teams.filter((t) => keeperCount(t) >= 1)).toHaveLength(2);
  });

  it("porteros > equipos: cada equipo tiene al menos uno", () => {
    const teams = balanceTeams(mk(10, Array(10).fill(2), [0, 1, 2, 3, 4]), 2);
    expect(teams.every((t) => keeperCount(t) >= 1)).toBe(true);
  });

  it("3 equipos con niveles mixtos: spread bajo", () => {
    const levels = [3, 3, 3, 2, 2, 2, 1, 1, 1];
    const teams = balanceTeams(mk(9, levels), 3);
    const scores = teams.map((t) => t.score);
    expect(teams).toHaveLength(3);
    expect(Math.max(...scores) - Math.min(...scores)).toBeLessThanOrEqual(1);
  });

  it("todos recreativos: equipos iguales", () => {
    const teams = balanceTeams(mk(10, Array(10).fill(1)), 2);
    expect(teams[0].score).toBe(teams[1].score);
  });
});
