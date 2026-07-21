import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";

/** Iniciales a partir del nombre; cae al usuario si no hay nombre. */
function initials(name: string | null | undefined, fallback: string): string {
  const src = (name ?? "").trim() || fallback;
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Avatar circular arriba a la derecha con menú, igual que en SplitPay.
 * Formato compartido entre las apps de Tito Apps.
 */
export function AvatarMenu() {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al tocar afuera o con Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = profile?.full_name || profile?.username || "Mi cuenta";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-pitch-100 text-sm font-bold text-pitch-700 ring-1 ring-pitch-200"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Mi cuenta"
        title={label}
      >
        {initials(profile?.full_name, profile?.username ?? "?")}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-gray-200"
        >
          <div className="border-b border-gray-100 px-3 py-2">
            <div className="truncate text-sm font-semibold">{label}</div>
            {profile?.username && (
              <div className="truncate text-xs text-gray-400">@{profile.username}</div>
            )}
          </div>
          <Link
            to="/perfil"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            role="menuitem"
          >
            Mi perfil
          </Link>
          <button
            onClick={() => { setOpen(false); signOut(); }}
            className="block w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-gray-50"
            role="menuitem"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
