import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./features/auth/AuthProvider";
import { LoginPage } from "./features/auth/LoginPage";
import { ResetPasswordPage } from "./features/auth/ResetPasswordPage";
import { ProfilePage } from "./features/auth/ProfilePage";
import { UsernameGate } from "./features/auth/UsernameGate";
import { GroupsPage } from "./features/groups/GroupsPage";
import { MembersPage } from "./features/groups/MembersPage";
import { InvitePage } from "./features/groups/InvitePage";
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
import { LineupPage } from "./features/lineup/LineupPage";
import { PublicMatchPage } from "./features/public/PublicMatchPage";
import { Footer } from "@titoapps/ui";
import { DialogProvider } from "./components/ui/Dialog";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { APP_VERSION } from "./lib/appVersion";

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
    <ErrorBoundary>
    <DialogProvider>
      <div className="app-shell md:pb-14">
        <Routes>
          {/* Público (jugador) */}
          <Route path="/j/:token" element={<PublicMatchPage />} />

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset" element={<ResetPasswordPage />} />

          {/* Invitación: la pantalla decide si hace falta iniciar sesión */}
          <Route path="/invitacion/:token" element={<InvitePage />} />

          <Route path="/" element={<Protected><GroupsPage autoEnter /></Protected>} />
          {/* Lista explícita: acá nunca saltamos al grupo único. */}
          <Route path="/grupos" element={<Protected><GroupsPage /></Protected>} />
          <Route path="/perfil" element={<Protected><ProfilePage /></Protected>} />

          {/* Todo lo del organizador vive dentro de un grupo. El grupo va en la
              URL para que un enlace compartido abra el grupo correcto. */}
          <Route path="/g/:gid" element={<Protected><DashboardPage /></Protected>} />
          <Route path="/g/:gid/miembros" element={<Protected><MembersPage /></Protected>} />
          <Route path="/g/:gid/partido/nuevo" element={<Protected><MatchFormPage /></Protected>} />
          <Route path="/g/:gid/partido/:id/editar" element={<Protected><MatchFormPage /></Protected>} />
          <Route path="/g/:gid/partido/:id" element={<Protected><MatchDetailPage /></Protected>} />
          <Route path="/g/:gid/partido/:id/importar" element={<Protected><ImportPage /></Protected>} />
          <Route path="/g/:gid/partido/:id/equipos" element={<Protected><TeamsPage /></Protected>} />
          <Route path="/g/:gid/partido/:id/torneo" element={<Protected><TournamentPage /></Protected>} />
          <Route path="/g/:gid/partido/:id/alineacion" element={<Protected><LineupPage /></Protected>} />
          <Route path="/g/:gid/jugadores" element={<Protected><FrequentPlayersPage /></Protected>} />
          <Route path="/g/:gid/jugador/:id" element={<Protected><PlayerProfilePage /></Protected>} />
          <Route path="/g/:gid/campeones" element={<Protected><ChampionsPage /></Protected>} />
          <Route path="/g/:gid/estadisticas" element={<Protected><GroupStatsPage /></Protected>} />

          {/* Rutas viejas sin grupo: al selector, en vez de romper. */}
          <Route path="/ajustes" element={<Navigate to="/perfil" replace />} />
          <Route path="/frecuentes" element={<Navigate to="/grupos" replace />} />
          <Route path="/campeones" element={<Navigate to="/grupos" replace />} />
          <Route path="/estadisticas" element={<Navigate to="/grupos" replace />} />
          <Route path="/partido/*" element={<Navigate to="/grupos" replace />} />
          <Route path="/jugador/*" element={<Navigate to="/grupos" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Footer
          mode="fixed-desktop"
          productName="GolPay"
          companyName="Tito Apps"
          developerName="Luis Diego Venegas"
          developerUrl="https://wa.me/50688238325"
          version={APP_VERSION}
        />
      </div>
    </DialogProvider>
    </ErrorBoundary>
  );
}
