import { NavLink } from "react-router-dom";

const ITEMS = [
  { to: "/", label: "Inicio", icon: "🏠", end: true },
  { to: "/history", label: "Historial", icon: "📊" },
  { to: "/log", label: "", icon: "＋", center: true },
  { to: "/coach", label: "Coach", icon: "💬" },
  { to: "/profile", label: "Perfil", icon: "👤" },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-slate-100 bg-white/95 backdrop-blur">
      <div className="flex items-center justify-around px-2 py-2">
        {ITEMS.map((it) =>
          it.center ? (
            <NavLink
              key={it.to}
              to={it.to}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-2xl text-white shadow-lg active:scale-95"
              aria-label="Registrar comida"
            >
              {it.icon}
            </NavLink>
          ) : (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-1 text-xs ${
                  isActive ? "text-green-600" : "text-slate-400"
                }`
              }
            >
              <span className="text-lg" aria-hidden>
                {it.icon}
              </span>
              {it.label}
            </NavLink>
          ),
        )}
      </div>
    </nav>
  );
}
