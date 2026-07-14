import { describe, it, expect } from "vitest";
import { formatTime } from "./time";

describe("formatTime (12h a. m./p. m.)", () => {
  it("tarde -> p. m.", () => {
    expect(formatTime("20:00")).toBe("8:00 p. m.");
  });
  it("mañana con segundos -> a. m.", () => {
    expect(formatTime("08:05:00")).toBe("8:05 a. m.");
  });
  it("medianoche -> 12 a. m.", () => {
    expect(formatTime("00:30")).toBe("12:30 a. m.");
  });
  it("mediodía -> 12 p. m.", () => {
    expect(formatTime("12:00")).toBe("12:00 p. m.");
  });
  it("vacío o inválido", () => {
    expect(formatTime("")).toBe("");
    expect(formatTime(null)).toBe("");
    expect(formatTime("no")).toBe("no");
  });
});
