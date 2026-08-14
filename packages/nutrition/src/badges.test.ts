import { describe, it, expect } from "vitest";
import { evaluateBadges, badgeById, BADGES } from "./badges";

describe("evaluateBadges", () => {
  it("otorga el primer día completo", () => {
    const got = evaluateBadges({ daysComplete: 1, currentStreak: 1, bestStreak: 1, weeklyCompliancePct: 100 });
    expect(got).toContain("first_complete");
    expect(got).not.toContain("streak_3");
  });

  it("acumula badges de racha", () => {
    const got = evaluateBadges({ daysComplete: 12, currentStreak: 8, bestStreak: 8, weeklyCompliancePct: 95 });
    expect(got).toEqual(expect.arrayContaining(["first_complete", "streak_3", "streak_7", "complete_10", "weekly_90"]));
    expect(got).not.toContain("streak_14");
  });

  it("sin progreso no otorga nada", () => {
    expect(evaluateBadges({ daysComplete: 0, currentStreak: 0, bestStreak: 0, weeklyCompliancePct: 0 })).toEqual([]);
  });

  it("badgeById resuelve el catálogo", () => {
    expect(badgeById("streak_7")?.title).toContain("7 días");
    expect(badgeById("noexiste")).toBeUndefined();
    expect(BADGES.length).toBeGreaterThan(0);
  });
});
