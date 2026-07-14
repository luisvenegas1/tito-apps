import { describe, it, expect } from "vitest";
import { suggestMatches, findDuplicate } from "./matching";
import type { FrequentPlayer } from "@/lib/supabase/types";

function fp(over: Partial<FrequentPlayer>): FrequentPlayer {
  return {
    id: over.id ?? "x", owner_id: "o", name: over.name ?? "", nickname: over.nickname ?? null,
    phone: null, skill_level: over.skill_level ?? 2, preferred_position: null,
    can_be_goalkeeper: false, notes: null, is_active: over.is_active ?? true,
    last_played_at: null, created_at: "",
  };
}

describe("suggestMatches", () => {
  const list = [
    fp({ id: "1", name: "Luis Diego" }),
    fp({ id: "2", name: "Luis Carlos" }),
    fp({ id: "3", name: "Carlos" }),
    fp({ id: "4", name: "Gera", nickname: "Gerardo" }),
    fp({ id: "5", name: "Viejo", is_active: false }),
  ];

  it("coincidencia exacta", () => {
    expect(suggestMatches("Carlos", list).map((f) => f.id)).toContain("3");
  });
  it("ambigüedad: 'Luis' matchea varios", () => {
    const ids = suggestMatches("Luis", list).map((f) => f.id);
    expect(ids).toContain("1");
    expect(ids).toContain("2");
  });
  it("matchea por apodo", () => {
    expect(suggestMatches("Gerardo", list).map((f) => f.id)).toContain("4");
  });
  it("ignora jugadores desactivados", () => {
    expect(suggestMatches("Viejo", list)).toHaveLength(0);
  });
});

describe("findDuplicate", () => {
  const list = [fp({ id: "1", name: "Carlos" }), fp({ id: "2", name: "Ana", is_active: false })];
  it("detecta duplicado activo (case-insensitive)", () => {
    expect(findDuplicate("  carlos ", list)?.id).toBe("1");
  });
  it("no cuenta al propio (excludeId)", () => {
    expect(findDuplicate("Carlos", list, "1")).toBeNull();
  });
  it("no matchea desactivados", () => {
    expect(findDuplicate("Ana", list)).toBeNull();
  });
});
