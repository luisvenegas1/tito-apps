import { describe, it, expect } from "vitest";
import { teamsMessage, teamsMessageWithTitle } from "./share";

describe("teamsMessage", () => {
  it("arma el formato del grupo: emoji pegado y nombres con espacio", () => {
    const text = teamsMessage([
      { color: "negro", name: "Equipo 1", players: ["Sánchez", "Chino", "Roly", "Chamo", "Memo", "Leo"] },
      { color: "azul", name: "Equipo 2", players: ["Juanpi", "SebasC", "Jota", "Fabián", "Jimmy", "Mau"] },
      { color: "rojo", name: "Equipo 3", players: ["Roger", "Luigi", "Sergio", "Jeremy", "Tito", "Herrera"] },
      { color: "blanco", name: "Equipo 4", players: ["Gera", "Javi", "Isaac", "Tito", "Cristian", "Fede"] },
    ]);
    expect(text).toBe(
      "⚫Sánchez Chino Roly Chamo Memo Leo\n" +
      "🔵Juanpi SebasC Jota Fabián Jimmy Mau\n" +
      "🔴Roger Luigi Sergio Jeremy Tito Herrera\n" +
      "⚪Gera Javi Isaac Tito Cristian Fede",
    );
  });

  it("cae al nombre del equipo si no hay color", () => {
    expect(teamsMessage([{ color: null, name: "Equipo 1", players: ["Tito", "Leo"] }]))
      .toBe("Equipo 1: Tito Leo");
  });

  it("ignora nombres vacíos", () => {
    expect(teamsMessage([{ color: "verde", name: "E1", players: ["Tito", "  ", ""] }]))
      .toBe("🟢Tito");
  });

  it("agrega encabezado con título y fecha", () => {
    const text = teamsMessageWithTitle("Mejenga lunes", "lunes, 20 de julio", [
      { color: "negro", name: "E1", players: ["Tito"] },
    ]);
    expect(text).toBe("⚽ Mejenga lunes · lunes, 20 de julio\n\n⚫Tito");
  });
});
