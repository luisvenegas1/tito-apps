import { describe, it, expect } from "vitest";
import { formatDate } from "./date";

describe("formatDate", () => {
  it("formato por defecto es-CR (día de semana, día y mes)", () => {
    // 2026-07-13 es lunes
    expect(formatDate("2026-07-13")).toBe("lunes, 13 de julio");
  });

  it("respeta otro locale", () => {
    expect(formatDate("2026-07-13", "en-US")).toBe("Monday, July 13");
  });

  it("devuelve el string original si la fecha es inválida", () => {
    expect(formatDate("no-es-fecha")).toBe("no-es-fecha");
  });
});
