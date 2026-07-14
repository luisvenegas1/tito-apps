/**
 * Identidad de marca por aplicación dentro de Tito Apps.
 *
 * Arquitectura de marca: Tito Apps es una marca fuerte por sí misma
 * (no un simple "endorsed brand"). Su presencia es elegante y discreta.
 *
 *   Tito Apps
 *   ├── GolPay      (verde dominante)
 *   ├── SplitPay    (azul dominante)
 *   └── MoneyTrack  (identidad por definir)
 *
 * Los componentes de @titoapps/ui NO conocen estos valores: los reciben
 * como design tokens (variables CSS) inyectados por applyBrand().
 */
export type AppBrand = {
  /** Identificador corto y único, ej. "golpay". */
  id: string;
  /** Siempre "Tito Apps" (marca madre). */
  companyName: "Tito Apps";
  /** Nombre visible del producto, ej. "GolPay". */
  productName: string;
  /** Nombre corto (headers, PWA). */
  shortName: string;
  /** Descripción breve del producto. */
  description: string;
  /** Eslogan. */
  tagline: string;
  /** Color primario (hex). Es el color dominante del producto. */
  primaryColor: string;
  /** Hover del primario (hex). Opcional; si falta, se calcula oscureciendo primaryColor. */
  primaryColorHover?: string;
  /** Color secundario (hex). */
  secondaryColor: string;
  /** Acento (hex). Opcional; por defecto hereda el naranja de Tito Apps. */
  accentColor?: string;
  /** Acento secundario (hex). Uso muy ocasional. */
  accentAltColor?: string;
  /** Ruta al logo (relativa a /public de la app). */
  logoPath: string;
  /** Ruta al ícono. */
  iconPath: string;
  /** Ruta al favicon. */
  faviconPath: string;
  /** Correo de soporte (opcional). */
  supportEmail?: string;
};
