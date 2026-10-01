import { describe, expect, it } from "vitest";
import { apps } from "@/data/apps";
import { filterApps } from "./filterApps";

describe("filterApps", () => {
  it("busca por nombre, descripción y categoría sin distinguir mayúsculas o espacios", () => {
    expect(filterApps(apps, "  GOLpay ", "all").map((app) => app.id)).toEqual(["golpay"]);
    expect(filterApps(apps, "gastos", "all").map((app) => app.id)).toEqual(["splitpay", "moneytrack"]);
    expect(filterApps(apps, "salud", "all").map((app) => app.id)).toEqual(["nutricoach", "trainsync"]);
  });
  it("filtra por categoría", () => expect(filterApps(apps, "", "finance").map((app) => app.id)).toEqual(["splitpay", "moneytrack"]));
  it("coloca las aplicaciones próximas al final", () => {
    const items = [...apps, { id: "pronto", name: "Pronto", shortDescription: "", category: "utilities", status: "coming-soon", icon: "" } as const];
    expect(filterApps(items, "", "all").map((app) => app.id).slice(-1)).toEqual(["pronto"]);
  });
  it("filtra por estado", () => {
    expect(filterApps(apps, "", "all", "available").map((app) => app.id)).toEqual(["golpay", "splitpay", "moneytrack", "nutricoach", "trainsync", "bingo"]);
    expect(filterApps(apps, "", "all", "coming-soon").map((app) => app.id)).toEqual([]);
  });
});
