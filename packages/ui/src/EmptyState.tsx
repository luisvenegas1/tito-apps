import { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

/** Estado vacío genérico (sin datos). */
export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-token bg-surface p-8 text-center ring-1 ring-border">
      {icon && <div className="mb-2 text-4xl">{icon}</div>}
      <h3 className="font-semibold text-fg">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
