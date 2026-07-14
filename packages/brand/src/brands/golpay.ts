import type { AppBrand } from "../types";

/**
 * GolPay: identidad deportiva, VERDE dominante.
 * Conserva su verde propio actual (#16A34A) para no alterar su apariencia.
 * (Decisión pendiente: unificar con el verde de Tito Apps #3CC54A si se desea.)
 */
export const golpayBrand: AppBrand = {
  id: "golpay",
  companyName: "Tito Apps",
  productName: "GolPay",
  shortName: "GolPay",
  description: "Organizá tu mejenga y cobrá sin perseguir a nadie.",
  tagline: "Fútbol entre amigos, sin complicaciones.",
  primaryColor: "#16A34A", // verde actual de GolPay (se mantiene idéntico)
  primaryColorHover: "#15803d", // = pitch-600, hover idéntico al de GolPay
  secondaryColor: "#172338", // azul oscuro de la familia Tito Apps
  accentColor: "#F97316",
  logoPath: "/logo.svg",
  iconPath: "/icon-512.png",
  faviconPath: "/favicon.ico",
  supportEmail: "hola@titoapps.com",
};
