import type { AppBrand } from "../types";

/**
 * Marca madre Tito Apps. Es una marca fuerte por sí misma; su presencia
 * es elegante y discreta, no invasiva. Identidad oficial: verde + azul oscuro.
 */
export const titoAppsBrand: AppBrand = {
  id: "titoapps",
  companyName: "Tito Apps",
  productName: "Tito Apps",
  shortName: "Tito Apps",
  description: "Estudio de aplicaciones que hacen la vida cotidiana más simple.",
  tagline: "Apps que simplifican tu vida.", // tagline oficial del Brand Kit
  primaryColor: "#3CC54A", // verde oficial
  secondaryColor: "#172338", // azul oscuro oficial
  accentColor: "#F97316", // naranja
  accentAltColor: "#8B5CF6", // morado (uso muy ocasional)
  logoPath: "/logo.svg",
  iconPath: "/icon.svg",
  faviconPath: "/favicon.svg",
  supportEmail: "hola@titoapps.com",
};
