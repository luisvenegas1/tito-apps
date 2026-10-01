import { createContext, useContext, useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { cn, useToast } from "@titoapps/ui";
import { useQueryClient } from "@tanstack/react-query";
import { CaptureSheet } from "@/features/capture/CaptureSheet";
import { useEnsureScheduledPayments } from "@/features/data/planning";
import { flushQueue, onQueueChange, pendingCount } from "@/lib/offlineQueue";

const CaptureCtx = createContext<() => void>(() => {});
/** Abre la captura rápida desde cualquier pantalla. */
export const useOpenCapture = () => useContext(CaptureCtx);

const NAV = [
  { to: "/", label: "Inicio", end: true, icon: "M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" },
  { to: "/movimientos", label: "Movimientos", icon: "M4 6h16M4 12h16M4 18h10" },
  { to: "/cuentas", label: "Cuentas", icon: "M17 20h5v-2a4 4 0 00-5-3.9M9 20H2v-2a4 4 0 014-4h2a4 4 0 014 4v2zm3-13a3 3 0 11-6 0 3 3 0 016 0zm8 2a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" },
  { to: "/mas", label: "Más", icon: "M5 12h.01M12 12h.01M19 12h.01" },
];

export function AppLayout() {
  const [captureOpen, setCaptureOpen] = useState(false);
  const [pending, setPending] = useState(pendingCount());
  const [online, setOnline] = useState(navigator.onLine);
  const qc = useQueryClient();
  const toast = useToast();
  useEnsureScheduledPayments(true);

  // Cola offline: enviar al reconectar y al abrir la app.
  useEffect(() => {
    const sync = async () => {
      setOnline(navigator.onLine);
      const sent = await flushQueue();
      if (sent > 0) {
        qc.invalidateQueries();
        toast.show(sent === 1 ? "Se sincronizó 1 movimiento" : `Se sincronizaron ${sent} movimientos`, "success");
      }
    };
    const off = () => setOnline(false);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", off);
    const unsub = onQueueChange(() => setPending(pendingCount()));
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", off);
      unsub();
    };
  }, [qc, toast]);

  return (
    <CaptureCtx.Provider value={() => setCaptureOpen(true)}>
      <div className="app-shell">
        {(!online || pending > 0) && (
          <div className="bg-warning/15 px-4 py-2 text-center text-sm font-medium text-amber-800 dark:text-amber-300" role="status">
            {!online ? "Sin conexión. " : ""}
            {pending > 0 ? `${pending} pendiente${pending === 1 ? "" : "s"} de sincronizar.` : "Puedes seguir registrando gastos."}
          </div>
        )}
        <Outlet />
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="Principal">
        <div className="mx-auto flex max-w-xl items-center justify-around px-2 py-1.5">
          {NAV.slice(0, 2).map((n) => <NavItem key={n.to} {...n} />)}
          <button
            type="button"
            onClick={() => setCaptureOpen(true)}
            className="flex h-14 w-14 -translate-y-3 items-center justify-center rounded-2xl bg-primary text-primary-contrast shadow-token-lg ring-4 ring-bg transition active:scale-95"
            aria-label="Registrar movimiento"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          {NAV.slice(2).map((n) => <NavItem key={n.to} {...n} />)}
        </div>
      </nav>

      <CaptureSheet open={captureOpen} onClose={() => setCaptureOpen(false)} />
    </CaptureCtx.Provider>
  );
}

function NavItem({ to, label, icon, end }: { to: string; label: string; icon: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => cn("flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-semibold", isActive ? "text-primary" : "text-muted")}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={icon} />
      </svg>
      {label}
    </NavLink>
  );
}
