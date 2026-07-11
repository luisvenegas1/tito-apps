import { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}

/** Encabezado de página sticky, con botón opcional de volver y slot derecho. */
export function PageHeader({ title, onBack, right }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur">
      {onBack && (
        <button onClick={onBack} className="text-muted" aria-label="Volver">‹</button>
      )}
      <h1 className="flex-1 truncate text-lg font-bold text-fg">{title}</h1>
      {right}
    </header>
  );
}
