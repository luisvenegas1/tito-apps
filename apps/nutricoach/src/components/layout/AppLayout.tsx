import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { AppFooter } from "./AppFooter";
import { useReminders } from "@/features/reminders/useReminders";

export function AppLayout() {
  useReminders(); // programador de recordatorios locales
  return (
    <div className="app-shell">
      <Outlet />
      {/* Flujo (no fijo): aparece al final del contenido, por encima de la barra inferior. */}
      <AppFooter mode="flow" />
      <BottomNav />
    </div>
  );
}
