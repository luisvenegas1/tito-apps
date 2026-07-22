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
  primaryColor: "#3FA535", // verde del wordmark "Nutri"
  primaryColorHover: "#2F7D34", // verde oscuro del contorno
  secondaryColor: "#1E3A5F", // azul marino del wordmark "Coach"
  accentColor: "#F26E36", // naranja de la vincha / silbato
  logoPath: "/logo.svg",
  iconPath: "/icon-512.png",
  faviconPath: "/favicon.ico",
  supportEmail: "hola@titoapps.com",
};
