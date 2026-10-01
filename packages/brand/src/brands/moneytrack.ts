import type { AppBrand } from "../types";

/**
 * MoneyTrack: logo "Growth Bars" (branding/README.md).
 * Navy + teal de fondo, esmeralda como color de marca.
 * Para botones usamos esmeralda 600 (#059669): el #10B981 del manifest no da
 * contraste AA con texto blanco.
 */
export const moneytrackBrand: AppBrand = {
  id: "moneytrack",
  companyName: "Tito Apps",
  productName: "MoneyTrack",
  shortName: "MoneyTrack",
  description: "Finanzas personales: gastos, ingresos, cuentas compartidas y metas.",
  tagline: "Tus finanzas, claras.",
  primaryColor: "#059669",
  primaryColorHover: "#047857",
  secondaryColor: "#0F172A",
  accentColor: "#34D399",
  accentAltColor: "#134E4A",
  logoPath: "/logo.svg",
  iconPath: "/icon-512.png",
  faviconPath: "/favicon.ico",
};
