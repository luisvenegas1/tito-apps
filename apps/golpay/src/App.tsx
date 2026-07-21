import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./features/auth/AuthProvider";
import { LoginPage } from "./features/auth/LoginPage";
import { ResetPasswordPage } from "./features/auth/ResetPasswordPage";
import { ProfilePage } from "./features/auth/ProfilePage";
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
import { DialogProvider } from "./components/ui/Dialog";

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
    <DialogProvider>
      <div className="app-shell md:pb-14">
      <Routes>
        {/* Público (jugador) */}
        <Route path="/j/:token" element={<PublicMatchPage />} />

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset" element={<ResetPasswordPage />} />

        {/* Organizador */}
        <Route path="/" element={<Protected><DashboardPage /></Protected>} />
        <Route path="/perfil" element={<Protected><ProfilePage /></Protected>} />
        {/* Ruta vieja: cualquier enlace guardado sigue funcionando. */}
        <Route path="/ajustes" element={<Navigate to="/perfil" replace />} />
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
        mode="fixed-desktop"
        productName="GolPay"
        companyName="Tito Apps"
        developerName="Luis Diego Venegas"
        developerUrl="https://wa.me/50688238325"
        version={__APP_VERSION__}
      />
      </div>
    </DialogProvider>
  );
}
