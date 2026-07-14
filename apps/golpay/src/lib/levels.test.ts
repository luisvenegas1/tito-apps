import { describe, it, expect } from "vitest";
import { LEVELS, LEVEL_LABELS, DEFAULT_SKILL_LEVEL, levelLabel } from "./levels";

describe("niveles 1–3", () => {
  it("etiquetas sin términos despectivos", () => {
    expect(LEVEL_LABELS[1]).toBe("Recreativo");
    expect(LEVEL_LABELS[2]).toBe("Intermedio");
    expect(LEVEL_LABELS[3]).toBe("Avanzado");
  });
  it("son exactamente 1, 2 y 3", () => {
    expect(LEVELS).toEqual([1, 2, 3]);
  });
  it("default es 2 (Intermedio)", () => {
    expect(DEFAULT_SKILL_LEVEL).toBe(2);
    expect(levelLabel(DEFAULT_SKILL_LEVEL)).toBe("Intermedio");
  });
  it("levelLabel maneja null/sin evaluar", () => {
    expect(levelLabel(null)).toBe("Sin evaluar");
    expect(levelLabel(9)).toBe("Sin evaluar");
    expect(levelLabel(3)).toBe("Avanzado");
  });
});
