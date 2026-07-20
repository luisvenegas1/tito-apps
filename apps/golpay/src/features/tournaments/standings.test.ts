import { describe, it, expect } from "vitest";
import { computeStandings, Game } from "./standings";

const teams = [{ id: "1", name: "E1" }, { id: "2", name: "E2" }, { id: "3", name: "E3" }];

describe("computeStandings", () => {
  it("calcula puntos, GD y ordena con desempates", () => {
    const games: Game[] = [
      { home_team_id: "1", away_team_id: "2", home_score: 3, away_score: 1 }, // E1 gana
      { home_team_id: "1", away_team_id: "3", home_score: 2, away_score: 2 }, // empate
      { home_team_id: "2", away_team_id: "3", home_score: 0, away_score: 1 }, // E3 gana
    ];
    const t = computeStandings(games, teams);
    const e1 = t.find((r) => r.teamId === "1")!;
    expect(e1.points).toBe(4); // 1 victoria + 1 empate
    expect(e1.goalDiff).toBe(2);
    // Orden: E1 (4 pts) primero
    expect(t[0].teamId).toBe("1");
    // E3 (4 pts, GD +1) vs E2 (0 pts) → E3 segundo
    expect(t[1].teamId).toBe("3");
    expect(t[2].teamId).toBe("2");
  });

  it("equipo sin juegos queda en 0", () => {
    const t = computeStandings([], teams);
    expect(t.every((r) => r.points === 0 && r.played === 0)).toBe(true);
  });
});
