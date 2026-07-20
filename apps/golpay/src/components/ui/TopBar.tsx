import { Link, useNavigate } from "react-router-dom";
import { ReactNode } from "react";

export function TopBar({
  title,
  back,
  backTo,
  right,
}: {
  title: string;
  /** Muestra la flecha de volver. */
  back?: boolean;
  /** Destino explícito al volver (recomendado). Sin esto usa el historial. */
  backTo?: string;
  right?: ReactNode;
}) {
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur">
      {back && (
        <button
          onClick={() => (backTo ? nav(backTo) : nav(-1))}
          className="text-xl leading-none text-gray-500"
          aria-label="Volver"
        >
          ‹
        </button>
      )}
      <h1 className="flex-1 truncate text-lg font-bold">{title}</h1>
      {right}
      <Link to="/" className="shrink-0 text-lg" title="Ir al inicio" aria-label="Inicio">
        🏠
      </Link>
    </header>
  );
}
