import { describe, it, expect } from "vitest";
import {
  LEVELS, LEVEL_LABELS, DEFAULT_SKILL_LEVEL, levelLabel, levelLabelLong, isSkillLevel,
} from "./levels";

describe("niveles 1–5", () => {
  it("la etiqueta es el número pelado", () => {
    expect(LEVEL_LABELS[1]).toBe("1");
    expect(LEVEL_LABELS[3]).toBe("3");
    expect(LEVEL_LABELS[5]).toBe("5");
  });

  it("son exactamente 1..5", () => {
    expect(LEVELS).toEqual([1, 2, 3, 4, 5]);
  });

  it("el default del formulario es el medio", () => {
    expect(DEFAULT_SKILL_LEVEL).toBe(3);
    expect(levelLabel(DEFAULT_SKILL_LEVEL)).toBe("3");
  });

  it("levelLabel maneja null y fuera de rango", () => {
    expect(levelLabel(null)).toBe("Sin evaluar");
    expect(levelLabel(undefined)).toBe("Sin evaluar");
    expect(levelLabel(0)).toBe("Sin evaluar");
    expect(levelLabel(9)).toBe("Sin evaluar");
    expect(levelLabel(2.5)).toBe("Sin evaluar");
  });

  it("la versión larga se lee sola en un renglón", () => {
    expect(levelLabelLong(4)).toBe("Nivel 4");
    expect(levelLabelLong(null)).toBe("Sin evaluar");
  });

  it("isSkillLevel discrimina bien", () => {
    expect(isSkillLevel(1)).toBe(true);
    expect(isSkillLevel(5)).toBe(true);
    expect(isSkillLevel(6)).toBe(false);
    expect(isSkillLevel("3")).toBe(false);
    expect(isSkillLevel(null)).toBe(false);
  });
});
