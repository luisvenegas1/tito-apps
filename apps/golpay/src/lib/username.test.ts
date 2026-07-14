import { describe, it, expect } from "vitest";
import { validateUsername, looksLikeEmail } from "./username";

describe("validateUsername", () => {
  it("acepta válidos", () => {
    expect(validateUsername("tito").ok).toBe(true);
    expect(validateUsername("Luis_Diego-7").ok).toBe(true);
  });
  it("rechaza por longitud", () => {
    expect(validateUsername("ab").ok).toBe(false);
    expect(validateUsername("a".repeat(25)).ok).toBe(false);
  });
  it("rechaza espacios y caracteres inválidos", () => {
    expect(validateUsername("con espacio").ok).toBe(false);
    expect(validateUsername("tito!").ok).toBe(false);
    expect(validateUsername("niño").ok).toBe(false);
  });
  it("rechaza reservadas (case-insensitive)", () => {
    expect(validateUsername("admin").ok).toBe(false);
    expect(validateUsername("GolPay").ok).toBe(false);
    expect(validateUsername("TITOAPPS").ok).toBe(false);
  });
});

describe("looksLikeEmail", () => {
  it("distingue email de username", () => {
    expect(looksLikeEmail("tito@mail.com")).toBe(true);
    expect(looksLikeEmail("tito")).toBe(false);
    expect(looksLikeEmail("a@b")).toBe(false);
  });
});
