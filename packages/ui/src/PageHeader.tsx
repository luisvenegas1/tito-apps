import { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  /** Subtítulo opcional bajo el título. */
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}

/** Encabezado de página sticky, con botón opcional de volver y slot derecho. */
export function PageHeader({ title, subtitle, onBack, right }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur">
      {onBack && (
        <button onClick={onBack} className="text-muted" aria-label="Volver">‹</button>
      )}
      <div className="flex-1 truncate">
        <h1 className="truncate text-lg font-bold text-fg">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
