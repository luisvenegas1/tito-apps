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
});
