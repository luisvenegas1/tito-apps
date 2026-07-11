import { describe, it, expect } from "vitest";
import { parseWhatsappList } from "./whatsapp";

describe("parseWhatsappList", () => {
  it("parsea una lista ordenada e ignora número y título", () => {
    const text = `Lunes 8 pm
1. Luis
2. Carlos
3. Andrés
4. José
5. Diego
6. Marco`;
    const r = parseWhatsappList(text);
    expect(r.map((p) => p.name)).toEqual([
      "Luis",
      "Carlos",
      "Andrés",
      "José",
      "Diego",
      "Marco",
    ]);
  });

  it("parsea lista desordenada con emojis y marcadores variados", () => {
    const text = `⚽ Mejenga lunes
Luis
Carlos ✅
3- Andrés
4) José
Diego + Marco`;
    const r = parseWhatsappList(text);
    const names = r.map((p) => p.name);
    expect(names).toContain("Luis");
    expect(names).toContain("Carlos");
    expect(names).toContain("Andrés");
    expect(names).toContain("José");
    // "Diego + Marco" debe quedar como divisible
    const dm = r.find((p) => p.raw.includes("Diego"));
    expect(dm?.splittable).toBe(true);
    expect(dm?.suggestions).toEqual(["Diego", "Marco"]);
  });

  it("ignora líneas vacías y de título con hora", () => {
    const text = `Torneo martes\n20:00\n\nLuis\nCarlos`;
    const r = parseWhatsappList(text);
    expect(r.map((p) => p.name)).toEqual(["Luis", "Carlos"]);
  });

  it("deduplica nombres sin importar mayúsculas", () => {
    const text = `Luis\nluis\nLUIS\nCarlos`;
    const r = parseWhatsappList(text);
    expect(r.map((p) => p.name)).toEqual(["Luis", "Carlos"]);
  });

  it("detecta separadores 'y' / 'con' / ','", () => {
    const text = `Luis y Juan\nPedro, Marco\nDiego con Andrés`;
    const r = parseWhatsappList(text);
    expect(r.every((p) => p.splittable)).toBe(true);
    expect(r[0].suggestions).toEqual(["Luis", "Juan"]);
    expect(r[1].suggestions).toEqual(["Pedro", "Marco"]);
    expect(r[2].suggestions).toEqual(["Diego", "Andrés"]);
  });

  it("detecta porteros por el guante 🧤", () => {
    const text = `Gera🧤\nJota\nRoger 🧤\nSebas C 🧤`;
    const r = parseWhatsappList(text);
    const byName = Object.fromEntries(r.map((p) => [p.name, p.goalkeeper]));
    expect(byName["Gera"]).toBe(true);
    expect(byName["Jota"]).toBe(false);
    expect(byName["Roger"]).toBe(true);
    expect(byName["Sebas C"]).toBe(true);
    // El guante no queda dentro del nombre
    expect(r.find((p) => p.name.includes("🧤"))).toBeUndefined();
  });

  it("parsea la lista real del lunes (24 jugadores, 3 porteros)", () => {
    const text = ` 1. Chepe\n 2. Sancho\n 3. Herrera\n 4. Leo \n 5. luigi\n 6. Davor\n 7. tito\n 8. Gera🧤\n 9. Jota\n10. chamo\n11. Roly\n12. Titi\n13. Chui\n14. Jeremy\n15. Isaac Vindas\n16. sebas Viquez\n17. Beto\n18. Mau\n19. Roger 🧤\n20. Sebas C 🧤\n21. Gabrio\n22. Compa de Gabrio\n23.  Xavi\n24. Memo`;
    const r = parseWhatsappList(text);
    expect(r).toHaveLength(24);
    expect(r.filter((p) => p.goalkeeper).map((p) => p.name)).toEqual([
      "Gera", "Roger", "Sebas C",
    ]);
    expect(r[0].name).toBe("Chepe");
    expect(r[22].name).toBe("Xavi");
  });
});
