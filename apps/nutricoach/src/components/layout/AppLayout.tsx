import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { AppFooter } from "./AppFooter";
import { useReminders } from "@/features/reminders/useReminders";
import { useStravaAutoSync } from "@/features/workouts/useStravaAutoSync";

export function AppLayout() {
  useReminders(); // programador de recordatorios locales
  useStravaAutoSync(); // sincroniza Strava al abrir (máx. 1/hora)
  return (
    <div className="app-shell">
      <Outlet />
      {/* Flujo (no fijo): aparece al final del contenido, por encima de la barra inferior. */}
      <AppFooter mode="flow" />
      <BottomNav />
    </div>
  );
}
