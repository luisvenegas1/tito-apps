import { describe, it, expect } from "vitest";
import { findMatches, suggestMatches, findDuplicate, normalizeName } from "./matching";
import type { FrequentPlayer } from "@/lib/supabase/types";

function fp(over: Partial<FrequentPlayer>): FrequentPlayer {
  return {
    id: over.id ?? "x", owner_id: "o", name: over.name ?? "", nickname: over.nickname ?? null,
    phone: null, skill_level: over.skill_level ?? 3, preferred_position: null,
    can_be_goalkeeper: false, notes: null, is_active: over.is_active ?? true,
    available_days: [], suggested_level: null,
    last_played_at: null, created_at: "",
  };
}

describe("normalizeName", () => {
  it("ignora mayúsculas, acentos y puntos", () => {
    expect(normalizeName("TITO")).toBe("tito");
    expect(normalizeName("Andrés")).toBe("andres");
    expect(normalizeName("Sebas C.")).toBe("sebas c");
    expect(normalizeName("  Luis   Diego ")).toBe("luis diego");
  });
});

describe("findMatches", () => {
  const list = [
    fp({ id: "1", name: "Tito" }),
    fp({ id: "2", name: "Sebas Castro" }),
    fp({ id: "3", name: "Sebas Víquez" }),
    fp({ id: "4", name: "Gera", nickname: "Gerardo" }),
    fp({ id: "5", name: "Viejo", is_active: false }),
  ];

  it("'tito' y 'TITO' son EXACTOS con Tito", () => {
    expect(findMatches("tito", list)[0]).toMatchObject({ kind: "exact" });
    expect(findMatches("TITO", list)[0]).toMatchObject({ kind: "exact" });
  });

  it("'sebas c' es PROBABLE con Sebas Castro (inicial del apellido)", () => {
    const m = findMatches("sebas c", list);
    const castro = m.find((x) => x.player.id === "2");
    expect(castro?.kind).toBe("probable");
  });

  it("'Sebas C.' ignora el punto y sigue siendo probable", () => {
    expect(findMatches("Sebas C.", list).some((x) => x.player.id === "2")).toBe(true);
  });

  it("'sebas' propone ambos Sebas para confirmar", () => {
    const ids = findMatches("sebas", list).map((x) => x.player.id);
    expect(ids).toContain("2");
    expect(ids).toContain("3");
  });

  it("apodo exacto matchea", () => {
    expect(findMatches("Gerardo", list)[0]).toMatchObject({ kind: "exact", player: { id: "4" } });
  });

  it("ignora desactivados", () => {
    expect(findMatches("Viejo", list)).toHaveLength(0);
  });

  it("los exactos van primero", () => {
    const m = findMatches("sebas castro", list);
    expect(m[0].kind).toBe("exact");
  });

  it("suggestMatches sigue devolviendo jugadores", () => {
    expect(suggestMatches("tito", list).map((p) => p.id)).toContain("1");
  });
});

describe("findDuplicate", () => {
  const list = [fp({ id: "1", name: "Carlos" }), fp({ id: "2", name: "Ana", is_active: false })];
  it("detecta duplicado sin importar mayúsculas/espacios/acentos", () => {
    expect(findDuplicate("  carlos ", list)?.id).toBe("1");
    expect(findDuplicate("CÁRLOS", list)?.id).toBe("1"); // acentos ignorados
  });
  it("no cuenta al propio (excludeId)", () => {
    expect(findDuplicate("Carlos", list, "1")).toBeNull();
  });
  it("no matchea desactivados", () => {
    expect(findDuplicate("Ana", list)).toBeNull();
  });
});
