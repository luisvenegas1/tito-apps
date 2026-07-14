import type { AppBrand } from "../types";

/**
 * SplitPay: AZUL dominante (identidad verde/azul).
 *
 * IMPORTANTE: solo se define aquí su paleta como dato. La mascota del billete,
 * sus logos e íconos son EXCLUSIVOS de SplitPay y NO viven en este paquete ni
 * se comparten con otros productos. SplitPay no se migra todavía.
 */
export const splitpayBrand: AppBrand = {
  id: "splitpay",
  companyName: "Tito Apps",
  productName: "SplitPay",
  shortName: "SplitPay",
  description: "Dividí gastos con tu grupo, sin cuentas raras.",
  tagline: "Cuentas claras entre amigos.",
  primaryColor: "#2563EB", // azul dominante
  secondaryColor: "#16A34A", // verde de acompañamiento
  accentColor: "#F97316",
  logoPath: "/logo.svg", // el logo/mascota real permanece en la app SplitPay
  iconPath: "/icon.svg",
  faviconPath: "/favicon.svg",
  supportEmail: "hola@titoapps.com",
};
