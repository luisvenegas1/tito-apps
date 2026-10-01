import type { ReactNode } from "react";
import { Spinner } from "@titoapps/ui";

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-semibold">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex justify-center py-16">
      <Spinner />
    </div>
  );
}

export function ErrorNote({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : "No se pudo cargar.";
  return (
    <div className="m-4 rounded-2xl border border-deficit/30 bg-deficit/5 p-4 text-sm">
      <p className="text-deficit">{msg}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 font-semibold text-primary">
          Reintentar
        </button>
      )}
    </div>
  );
}
