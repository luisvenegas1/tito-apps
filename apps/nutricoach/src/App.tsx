import { Routes, Route, Navigate } from "react-router-dom";
import { Spinner } from "@titoapps/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { AuthPage } from "@/features/auth/AuthPage";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { LogHub } from "@/features/log/LogHub";
import { PhotoCapture } from "@/features/log/PhotoCapture";
import { ScaleMode } from "@/features/log/ScaleMode";
import { SearchFood } from "@/features/log/SearchFood";
import { CustomFood } from "@/features/log/CustomFood";
import { BarcodeScan } from "@/features/log/BarcodeScan";
import { LabelScan } from "@/features/log/LabelScan";
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
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!session) return <AuthPage />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/log" element={<LogHub />} />
        <Route path="/log/photo" element={<PhotoCapture />} />
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
