import { describe, it, expect } from "vitest";
import { LEVELS, LEVEL_LABELS, DEFAULT_SKILL_LEVEL, levelLabel } from "./levels";

describe("niveles 1–5", () => {
  it("etiquetas sin términos despectivos", () => {
    expect(LEVEL_LABELS[1]).toBe("Recreativo");
    expect(LEVEL_LABELS[2]).toBe("Casual");
    expect(LEVEL_LABELS[3]).toBe("Intermedio");
    expect(LEVEL_LABELS[4]).toBe("Avanzado");
    expect(LEVEL_LABELS[5]).toBe("Élite");
  });
  it("son exactamente 1..5", () => {
    expect(LEVELS).toEqual([1, 2, 3, 4, 5]);
  });
  it("el default del formulario es Intermedio (3)", () => {
    expect(DEFAULT_SKILL_LEVEL).toBe(3);
    expect(levelLabel(DEFAULT_SKILL_LEVEL)).toBe("Intermedio");
  });
  it("levelLabel maneja null y fuera de rango", () => {
    expect(levelLabel(null)).toBe("Sin evaluar");
    expect(levelLabel(0)).toBe("Sin evaluar");
    expect(levelLabel(9)).toBe("Sin evaluar");
    expect(levelLabel(5)).toBe("Élite");
  });
});
