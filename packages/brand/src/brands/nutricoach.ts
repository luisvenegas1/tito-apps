import type { AppBrand } from "../types";

/**
 * NutriCoach: nutricionista personal con IA.
 * Verde salud dominante (alineado a la familia Tito Apps) con acento naranja
 * para energía. La semántica de progreso (verde/amarillo/naranja/rojo) usa
 * los tokens de sistema, no estos colores de marca.
 */
export const nutricoachBrand: AppBrand = {
  id: "nutricoach",
  companyName: "Tito Apps",
  productName: "NutriCoach",
  shortName: "NutriCoach",
  description: "Tu nutricionista personal con IA. Comé mejor sin contar todo.",
  tagline: "La IA hace las cuentas. Vos solo comé mejor.",
  primaryColor: "#16A34A", // verde salud
  primaryColorHover: "#15803d",
  secondaryColor: "#172338", // azul oscuro de la familia Tito Apps
  accentColor: "#F97316", // naranja energía
  logoPath: "/logo.svg",
  iconPath: "/icon-512.png",
  faviconPath: "/favicon.ico",
  supportEmail: "hola@titoapps.com",
};
