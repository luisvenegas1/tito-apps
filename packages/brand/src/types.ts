/**
 * Identidad de marca por aplicación.
 * Cada app de Tito Apps define su propio AppBrand.
 * Los componentes de @titoapps/ui NO conocen estos valores: los reciben
 * como variables CSS (design tokens) inyectadas por applyBrand().
 */
export type AppBrand = {
  /** Identificador corto y único, ej. "golpay". */
  id: string;
  /** Siempre "Tito Apps" (empresa paraguas). */
  companyName: "Tito Apps";
  /** Nombre visible del producto, ej. "GolPay". */
  productName: string;
  /** Nombre corto (headers, PWA). */
  shortName: string;
  /** Descripción breve del producto. */
  description: string;
  /** Eslogan. */
  tagline: string;
  /** Color primario de marca (hex). */
  primaryColor: string;
  /** Color secundario de marca (hex). */
  secondaryColor: string;
  /** Ruta al logo (relativa a /public de la app). */
  logoPath: string;
  /** Ruta al ícono. */
  iconPath: string;
  /** Ruta al favicon. */
  faviconPath: string;
  /** Correo de soporte (opcional). */
  supportEmail?: string;
};
