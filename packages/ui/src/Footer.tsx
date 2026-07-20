import { cn } from "./utils/cn";

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
  className?: string;
}

/** Pie de página neutral: los nombres llegan por props, nunca hardcodeados. */
export function Footer({
  productName,
  companyName,
  developerName,
  developerUrl,
  year,
  className,
}: FooterProps) {
  const y = year ?? new Date().getFullYear();
  return (
    <footer className={cn("mt-10 border-t border-border px-4 py-6 text-center text-xs text-muted", className)}>
      <p>
        © {y} {productName ? `${productName} · ` : ""}
        {companyName}. Todos los derechos reservados.
      </p>
      {developerName && (
        <p className="mt-1">
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
        </p>
      )}
    </footer>
  );
}
