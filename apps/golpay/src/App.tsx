import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./features/auth/AuthProvider";
import { LoginPage } from "./features/auth/LoginPage";
import { ResetPasswordPage } from "./features/auth/ResetPasswordPage";
import { SettingsPage } from "./features/auth/SettingsPage";
import { UsernameGate } from "./features/auth/UsernameGate";
import { DashboardPage } from "./features/matches/DashboardPage";
import { MatchFormPage } from "./features/matches/MatchFormPage";
import { MatchDetailPage } from "./features/matches/MatchDetailPage";
import { ImportPage } from "./features/import/ImportPage";
import { TeamsPage } from "./features/teams/TeamsPage";
import { FrequentPlayersPage } from "./features/players/FrequentPlayersPage";
import { PlayerProfilePage } from "./features/players/PlayerProfilePage";
import { ChampionsPage } from "./features/matches/ChampionsPage";
import { GroupStatsPage } from "./features/stats/GroupStatsPage";
import { TournamentPage } from "./features/tournaments/TournamentPage";
import { PublicMatchPage } from "./features/public/PublicMatchPage";
import { Footer } from "@titoapps/ui";

function Protected({ children }: { children: JSX.Element }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-gray-400">Cargando…</div>;
  if (!session) return <Navigate to="/login" replace />;
  // Cuentas legadas sin username: exigir crear uno antes de continuar.
  if (profile && !profile.username) return <UsernameGate />;
  return children;
}

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        {/* Público (jugador) */}
        <Route path="/j/:token" element={<PublicMatchPage />} />

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset" element={<ResetPasswordPage />} />

        {/* Organizador */}
        <Route path="/" element={<Protected><DashboardPage /></Protected>} />
        <Route path="/ajustes" element={<Protected><SettingsPage /></Protected>} />
        <Route path="/partido/nuevo" element={<Protected><MatchFormPage /></Protected>} />
        <Route path="/partido/:id/editar" element={<Protected><MatchFormPage /></Protected>} />
        <Route path="/partido/:id" element={<Protected><MatchDetailPage /></Protected>} />
        <Route path="/partido/:id/importar" element={<Protected><ImportPage /></Protected>} />
        <Route path="/partido/:id/equipos" element={<Protected><TeamsPage /></Protected>} />
        <Route path="/partido/:id/torneo" element={<Protected><TournamentPage /></Protected>} />
        <Route path="/frecuentes" element={<Protected><FrequentPlayersPage /></Protected>} />
        <Route path="/jugador/:id" element={<Protected><PlayerProfilePage /></Protected>} />
        <Route path="/campeones" element={<Protected><ChampionsPage /></Protected>} />
        <Route path="/estadisticas" element={<Protected><GroupStatsPage /></Protected>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Footer
        productName="GolPay"
        companyName="Tito Apps"
        developerName="Luis Diego Venegas"
        developerUrl="https://wa.me/50688238325"
      />
    </div>
  );
}
