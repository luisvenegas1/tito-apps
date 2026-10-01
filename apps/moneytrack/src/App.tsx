import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { AuthPage } from "@/features/auth/AuthPage";
import { ResetPasswordPage } from "@/features/auth/ResetPasswordPage";
import { AcceptInvitePage } from "@/features/accounts/AcceptInvitePage";
import { OnboardingPage } from "@/features/onboarding/OnboardingPage";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { TransactionsPage } from "@/features/transactions/TransactionsPage";
import { TransactionFormPage } from "@/features/transactions/TransactionFormPage";
import { AccountsPage } from "@/features/accounts/AccountsPage";
import { AccountDetailPage } from "@/features/accounts/AccountDetailPage";
import { PaymentsPage } from "@/features/payments/PaymentsPage";
import { RecurringPage } from "@/features/payments/RecurringPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { GoalsPage } from "@/features/goals/GoalsPage";
import { NotificationsPage } from "@/features/notifications/NotificationsPage";
import { MorePage } from "@/features/settings/MorePage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { CategoriesPage } from "@/features/settings/CategoriesPage";
import { PeoplePage } from "@/features/settings/PeoplePage";
import { DataPage } from "@/features/settings/DataPage";
import { useProfile } from "@/features/data/core";
import { pendingInvite } from "@/features/data/shared";
import { ErrorNote, Loading } from "@/components/Empty";

export default function App() {
  const { session, loading } = useAuth();
  const { pathname } = useLocation();

  // Rutas públicas
  if (pathname === "/reset") return <ResetPasswordPage />;
  if (pathname.startsWith("/invitacion/")) {
    return (
      <Routes>
        <Route path="/invitacion/:token" element={<AcceptInvitePage />} />
      </Routes>
    );
  }

  if (loading) return <Loading />;
  if (!session) return <AuthPage />;
  return <SignedIn />;
}

function SignedIn() {
  const profile = useProfile();
  const navigate = useNavigate();

  // Invitación pendiente (entró por el enlace, se registró y confirmó el correo).
  useEffect(() => {
    const token = pendingInvite.get();
    if (token) navigate(`/invitacion/${token}`, { replace: true });
  }, [navigate]);

  if (profile.isLoading) return <Loading />;
  if (profile.error || !profile.data) return <ErrorNote error={profile.error ?? new Error("No se pudo cargar tu perfil.")} onRetry={() => profile.refetch()} />;
  if (!profile.data.onboarded) return <OnboardingPage />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/movimientos" element={<TransactionsPage />} />
        <Route path="/movimientos/:id" element={<TransactionFormPage />} />
        <Route path="/cuentas" element={<AccountsPage />} />
        <Route path="/cuentas/:id" element={<AccountDetailPage />} />
        <Route path="/pagos" element={<PaymentsPage />} />
        <Route path="/recurrentes" element={<RecurringPage />} />
        <Route path="/reportes" element={<ReportsPage />} />
        <Route path="/metas" element={<GoalsPage />} />
        <Route path="/avisos" element={<NotificationsPage />} />
        <Route path="/mas" element={<MorePage />} />
        <Route path="/ajustes" element={<SettingsPage />} />
        <Route path="/categorias" element={<CategoriesPage />} />
        <Route path="/personas" element={<PeoplePage />} />
        <Route path="/datos" element={<DataPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
