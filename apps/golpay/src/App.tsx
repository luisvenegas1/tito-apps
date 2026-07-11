import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./features/auth/AuthProvider";
import { LoginPage } from "./features/auth/LoginPage";
import { DashboardPage } from "./features/matches/DashboardPage";
import { MatchFormPage } from "./features/matches/MatchFormPage";
import { MatchDetailPage } from "./features/matches/MatchDetailPage";
import { ImportPage } from "./features/import/ImportPage";
import { TeamsPage } from "./features/teams/TeamsPage";
import { FrequentPlayersPage } from "./features/players/FrequentPlayersPage";
import { PublicMatchPage } from "./features/public/PublicMatchPage";

function Protected({ children }: { children: JSX.Element }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-gray-400">Cargando…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        {/* Público (jugador) */}
        <Route path="/j/:token" element={<PublicMatchPage />} />

        {/* Organizador */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Protected><DashboardPage /></Protected>} />
        <Route path="/partido/nuevo" element={<Protected><MatchFormPage /></Protected>} />
        <Route path="/partido/:id/editar" element={<Protected><MatchFormPage /></Protected>} />
        <Route path="/partido/:id" element={<Protected><MatchDetailPage /></Protected>} />
        <Route path="/partido/:id/importar" element={<Protected><ImportPage /></Protected>} />
        <Route path="/partido/:id/equipos" element={<Protected><TeamsPage /></Protected>} />
        <Route path="/frecuentes" element={<Protected><FrequentPlayersPage /></Protected>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
