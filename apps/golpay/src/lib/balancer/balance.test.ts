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

describe("balanceTeams", () => {
  it("crea el número de equipos pedido", () => {
    const players = mk(24, Array(24).fill(3));
    const teams = balanceTeams(players, 4);
    expect(teams).toHaveLength(4);
    expect(teams.every((t) => t.players.length === 6)).toBe(true);
  });

  it("minimiza la diferencia de nivel entre 2 equipos", () => {
    const players = mk(6, [5, 4, 3, 3, 2, 1]);
    const teams = balanceTeams(players, 2);
    const diff = Math.abs(teams[0].score - teams[1].score);
    expect(diff).toBeLessThanOrEqual(1);
  });

  it("reparte los porteros en equipos distintos", () => {
    const players = mk(8, Array(8).fill(3), [0, 1]);
    const teams = balanceTeams(players, 2);
    const teamsWithKeeper = teams.filter((t) =>
      t.players.some((p) => p.canGoalkeeper),
    );
    expect(teamsWithKeeper).toHaveLength(2);
  });

  it("usa nivel promedio para jugadores sin evaluar", () => {
    const players = mk(4, [null, null, null, null]);
    const teams = balanceTeams(players, 2);
    expect(teams[0].score).toBe(DEFAULT_LEVEL * 2);
    expect(teams[1].score).toBe(DEFAULT_LEVEL * 2);
  });

  it("mini-cuadrangular de 24 queda parejo (spread bajo)", () => {
    const levels = Array.from({ length: 24 }, (_, i) => (i % 5) + 1);
    const players = mk(24, levels);
    const teams = balanceTeams(players, 4);
    const scores = teams.map((t) => t.score);
    const spread = Math.max(...scores) - Math.min(...scores);
    expect(spread).toBeLessThanOrEqual(2);
  });
});
