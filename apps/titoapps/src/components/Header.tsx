import { NavLink } from "react-router-dom";
import { BrandMark } from "./BrandMark";

export function Header() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-token-sm px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isActive ? "bg-primary/10 text-primary" : "text-muted hover:bg-surface-subtle hover:text-fg"}`;
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <NavLink to="/" aria-label="Tito Apps, inicio" className="flex items-center gap-3 rounded-token-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <BrandMark compact />
          <span className="hidden sm:block"><strong className="block text-sm text-fg">Tito Apps</strong><span className="block text-xs text-muted">Apps que simplifican tu vida</span></span>
        </NavLink>
        <nav aria-label="Navegación principal" className="flex items-center gap-1">
          <NavLink to="/" end className={linkClass}>Aplicaciones</NavLink>
          <NavLink to="/about" className={linkClass}>Acerca de</NavLink>
          <span className="ml-1 hidden h-9 w-24 rounded-token border border-dashed border-border sm:block" aria-hidden="true" title="Espacio reservado" />
        </nav>
      </div>
    </header>
  );
}
