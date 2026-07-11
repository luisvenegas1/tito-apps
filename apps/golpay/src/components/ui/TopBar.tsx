import { useNavigate } from "react-router-dom";
import { ReactNode } from "react";

export function TopBar({ title, back, right }: { title: string; back?: boolean; right?: ReactNode }) {
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur">
      {back && (
        <button onClick={() => nav(-1)} className="text-gray-500" aria-label="Volver">
          ‹
        </button>
      )}
      <h1 className="flex-1 truncate text-lg font-bold">{title}</h1>
      {right}
    </header>
  );
}
