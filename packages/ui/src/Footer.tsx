import { cn } from "./utils/cn";
import { InstallAppLink } from "./InstallAppLink";

export interface FooterProps {
  /** Nombre del producto, ej. "GolPay". Opcional. */
  productName?: string;
  /** Empresa, ej. "Tito Apps". */
  companyName: string;
  /** Quién lo desarrolló. */
  developerName?: string;
  /** Enlace del desarrollador (WhatsApp, sitio, etc.). */
  developerUrl?: string;
  /** Año; por defecto el actual (para que no quede viejo). */
  year?: number;
  /** Versión de la app, ej. "1.0.0". Se muestra como "v1.0.0". */
  version?: string;
  /** Muestra el enlace para instalar la PWA. Por defecto sí. */
  showInstall?: boolean;
  /**
   * Cómo se ancla:
   *  - "flow": al final del contenido (por defecto).
   *  - "fixed": siempre fijo al fondo de la pantalla.
   *  - "fixed-desktop": en móvil va al final del contenido (no roba pantalla)
   *    y a partir de `md` queda fijo abajo.
   */
  mode?: "flow" | "fixed" | "fixed-desktop";
  className?: string;
}

const FLOW = "mt-10 px-4 py-6 text-xs";
const FIXED = "fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md bg-surface/95 px-4 py-2.5 text-[11px] leading-tight backdrop-blur";
const FIXED_DESKTOP =
  "mt-10 px-4 py-6 text-xs " +
  "md:fixed md:inset-x-0 md:bottom-0 md:z-20 md:mx-auto md:mt-0 md:max-w-md " +
  "md:bg-surface/95 md:px-4 md:py-2.5 md:text-[11px] md:leading-tight md:backdrop-blur";

/** Pie de página neutral: los nombres llegan por props, nunca hardcodeados. */
export function Footer({
  productName,
  companyName,
  developerName,
  developerUrl,
  year,
  version,
  showInstall = true,
  mode = "flow",
  className,
}: FooterProps) {
  const y = year ?? new Date().getFullYear();
  const anchor = mode === "fixed" ? FIXED : mode === "fixed-desktop" ? FIXED_DESKTOP : FLOW;
  return (
    <footer className={cn("border-t border-border text-center text-muted", anchor, className)}>
      <p>
        © {y} {productName ? `${productName} · ` : ""}
        {companyName}. Todos los derechos reservados.
      </p>
      <p className="mt-1 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5">
        {developerName && (
          <span>
            Desarrollado por{" "}
            {developerUrl ? (
              <a
                href={developerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline"
              >
                {developerName}
              </a>
            ) : (
              <span className="font-medium">{developerName}</span>
            )}{" "}
            para {companyName}
          </span>
        )}
        {version && (
          <>
            <span aria-hidden>·</span>
            <span>v{version}</span>
          </>
        )}
        {showInstall && (
          <>
            <span aria-hidden>·</span>
            <InstallAppLink className="font-medium text-primary underline" />
          </>
        )}
      </p>
    </footer>
  );
}
