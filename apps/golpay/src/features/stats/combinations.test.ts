import { describe, it, expect } from "vitest";
import { topDuos, TeamAppearance } from "./combinations";

describe("topDuos", () => {
  it("cuenta partidos y victorias juntos, respeta el mínimo", () => {
    const apps: TeamAppearance[] = [
      { match_id: "1", won: true, members: ["A", "B", "C"] },
      { match_id: "2", won: true, members: ["A", "B", "D"] },
      { match_id: "3", won: false, members: ["A", "B", "E"] },
      { match_id: "4", won: true, members: ["A", "C"] },
    ];
    const duos = topDuos(apps, 3);
    // Solo A|B juega 3 veces (mínimo 3); A|C juega 2 → excluido.
    expect(duos).toHaveLength(1);
    expect(duos[0]).toMatchObject({ a: "A", b: "B", games: 3, wins: 2, winPct: 67 });
  });

  it("ordena por % de victoria", () => {
    const apps: TeamAppearance[] = [
      { match_id: "1", won: true, members: ["A", "B"] },
      { match_id: "2", won: true, members: ["A", "B"] },
      { match_id: "3", won: true, members: ["C", "D"] },
      { match_id: "4", won: false, members: ["C", "D"] },
    ];
    const duos = topDuos(apps, 2);
    expect(duos[0].winPct).toBe(100);
  });
});
