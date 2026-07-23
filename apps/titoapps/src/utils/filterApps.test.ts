import { describe, expect, it } from "vitest";
import { apps } from "@/data/apps";
import { filterApps } from "./filterApps";

describe("filterApps", () => {
  it("busca por nombre, descripción y categoría sin distinguir mayúsculas o espacios", () => {
    expect(filterApps(apps, "  GOLpay ", "all").map((app) => app.id)).toEqual(["golpay"]);
    expect(filterApps(apps, "gastos", "all").map((app) => app.id)).toEqual(["splitpay", "moneytrack"]);
    expect(filterApps(apps, "salud", "all").map((app) => app.id)).toEqual(["nutricoach"]);
  });
  it("filtra por categoría", () => expect(filterApps(apps, "", "finance").map((app) => app.id)).toEqual(["splitpay", "moneytrack"]));
  it("coloca las aplicaciones próximas al final", () => expect(filterApps(apps, "", "all").map((app) => app.id)).toEqual(["golpay", "splitpay", "nutricoach", "bingo", "moneytrack"]));
  it("filtra por estado", () => {
    expect(filterApps(apps, "", "all", "available").map((app) => app.id)).toEqual(["golpay", "splitpay", "nutricoach", "bingo"]);
    expect(filterApps(apps, "", "all", "coming-soon").map((app) => app.id)).toEqual(["moneytrack"]);
  });
});
