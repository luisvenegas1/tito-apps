import { describe, it, expect } from "vitest";
import { titleCaseName } from "./names";

describe("titleCaseName", () => {
  it("capitaliza nombres simples", () => {
    expect(titleCaseName("gabrio")).toBe("Gabrio");
    expect(titleCaseName("chui")).toBe("Chui");
  });

  it("capitaliza nombre y apellido", () => {
    expect(titleCaseName("sebas castro")).toBe("Sebas Castro");
    expect(titleCaseName("isaac vindas")).toBe("Isaac Vindas");
  });

  it("respeta iniciales sueltas", () => {
    expect(titleCaseName("sebas c")).toBe("Sebas C");
  });

  it("arregla MAYÚSCULAS y mezclas", () => {
    expect(titleCaseName("FEDE VALERIO")).toBe("Fede Valerio");
    expect(titleCaseName("fAbIáN")).toBe("Fabián");
  });

  it("deja las partículas en minúscula salvo al inicio", () => {
    expect(titleCaseName("juan de la cruz")).toBe("Juan de la Cruz");
    expect(titleCaseName("de la o")).toBe("De la O");
  });

  it("maneja compuestos y prefijos", () => {
    expect(titleCaseName("jean-luc")).toBe("Jean-Luc");
    expect(titleCaseName("o'brien")).toBe("O'Brien");
    expect(titleCaseName("mcdonald")).toBe("McDonald");
  });

  it("colapsa espacios y recorta", () => {
    expect(titleCaseName("  luis   diego  ")).toBe("Luis Diego");
    expect(titleCaseName("   ")).toBe("");
  });
});
