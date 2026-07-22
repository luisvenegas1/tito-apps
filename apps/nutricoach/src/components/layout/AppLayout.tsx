import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { AppFooter } from "./AppFooter";

export function AppLayout() {
  return (
    <div className="app-shell">
      <Outlet />
      {/* Flujo (no fijo): aparece al final del contenido, por encima de la barra inferior. */}
      <AppFooter mode="flow" />
      <BottomNav />
    </div>
  );
}
