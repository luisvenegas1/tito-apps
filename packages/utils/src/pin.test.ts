import { describe, it, expect } from "vitest";
import { generatePin } from "./pin";

describe("generatePin", () => {
  it("produce 4 dígitos por defecto, solo números", () => {
    for (let i = 0; i < 50; i++) {
      const pin = generatePin();
      expect(pin).toHaveLength(4);
      expect(pin).toMatch(/^[0-9]{4}$/);
    }
  });

  it("respeta el largo indicado", () => {
    expect(generatePin(6)).toMatch(/^[0-9]{6}$/);
  });
});
