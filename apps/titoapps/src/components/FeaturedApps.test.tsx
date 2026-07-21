import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { apps } from "@/data/apps";
import { FeaturedApps } from "./FeaturedApps";

describe("FeaturedApps", () => {
  it("renderiza solamente las aplicaciones marcadas featured", () => { const html = renderToStaticMarkup(<FeaturedApps items={apps} />); expect(html).toContain("GolPay"); expect(html).toContain("NutriCoach"); expect(html).not.toContain("SplitPay"); });
});
