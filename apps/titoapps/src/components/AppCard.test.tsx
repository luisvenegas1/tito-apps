import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { TitoApp } from "@/types/app";
import { AppCard } from "./AppCard";

const base: TitoApp = { id: "demo", name: "Demo", shortDescription: "Descripción", category: "utilities", status: "available", icon: "/demo.svg" };
describe("AppCard", () => {
  it("renderiza aplicaciones disponibles con su enlace correcto", () => expect(renderToStaticMarkup(<AppCard app={{ ...base, url: "https://example.com/app" }} />)).toContain('href="https://example.com/app"'));
  it("no hace navegable una aplicación sin URL", () => { const html = renderToStaticMarkup(<AppCard app={base} />); expect(html).not.toContain("<a "); expect(html).toContain("URL pendiente"); });
  it("muestra Próximamente", () => expect(renderToStaticMarkup(<AppCard app={{ ...base, status: "coming-soon" }} />)).toContain("Próximamente"));
});
