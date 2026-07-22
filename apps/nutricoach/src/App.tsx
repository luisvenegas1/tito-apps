import { Routes, Route, Navigate } from "react-router-dom";
import { Spinner } from "@titoapps/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { AuthPage } from "@/features/auth/AuthPage";
import { ResetPasswordPage } from "@/features/auth/ResetPasswordPage";
import { UsernameGate } from "@/features/auth/UsernameGate";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { LogHub } from "@/features/log/LogHub";
import { PhotoCapture } from "@/features/log/PhotoCapture";
import { ScaleMode } from "@/features/log/ScaleMode";
import { SearchFood } from "@/features/log/SearchFood";
import { CustomFood } from "@/features/log/CustomFood";
import { BarcodeScan } from "@/features/log/BarcodeScan";
import { LabelScan } from "@/features/log/LabelScan";
import { TextMeal } from "@/features/log/TextMeal";
import { CoachPage } from "@/features/coach/CoachPage";
import { WorkoutsPage } from "@/features/workouts/WorkoutsPage";
import { ConnectDevicePage } from "@/features/workouts/ConnectDevicePage";
import { ConnectGuidePage } from "@/features/workouts/ConnectGuidePage";
import { GoalsPage } from "@/features/goals/GoalsPage";
import { HistoryPage } from "@/features/history/HistoryPage";
import { ProfilePage } from "@/features/profile/ProfilePage";
import { PlanPage } from "@/features/plan/PlanPage";
import { ExportPage } from "@/features/settings/ExportPage";

export default function App() {
  const { session, profile, loading } = useAuth();

  // El enlace de recuperación abre /reset (crea sesión de recovery); tiene prioridad.
  if (typeof window !== "undefined" && window.location.pathname === "/reset") {
    return <ResetPasswordPage />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!session) return <AuthPage />;

  // Sesión sin username (cuenta con confirmación de correo): pedirlo antes de entrar.
  if (profile && !profile.username) return <UsernameGate />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/log" element={<LogHub />} />
        <Route path="/log/photo" element={<PhotoCapture />} />
        <Route path="/log/text" element={<TextMeal />} />
        <Route path="/log/scale" element={<ScaleMode />} />
        <Route path="/log/barcode" element={<BarcodeScan />} />
        <Route path="/log/label" element={<LabelScan />} />
        <Route path="/log/search" element={<SearchFood />} />
        <Route path="/log/custom" element={<CustomFood />} />
        <Route path="/coach" element={<CoachPage />} />
        <Route path="/workouts" element={<WorkoutsPage />} />
        <Route path="/workouts/connect" element={<ConnectDevicePage />} />
        <Route path="/workouts/connect/guide" element={<ConnectGuidePage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
