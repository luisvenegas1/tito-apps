import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

export function PageHeader({ title, back, action }: { title: string; back?: boolean | string; action?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-bg/90 px-4 py-3 backdrop-blur">
      {back && (
        <button
          type="button"
          onClick={() => (typeof back === "string" ? navigate(back) : navigate(-1))}
          className="-ml-2 rounded-full p-2 text-muted hover:bg-surface-subtle"
          aria-label="Volver"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}
      <h1 className="flex-1 truncate text-lg font-bold">{title}</h1>
      {action}
    </header>
  );
}
