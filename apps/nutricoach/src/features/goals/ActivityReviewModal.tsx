import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@titoapps/ui";
import type { ActivityLevel } from "@titoapps/nutrition";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";

const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: "Sedentario",
  light: "Ligero",
  moderate: "Moderado",
  active: "Activo",
  very_active: "Muy activo",
};

const REVIEW_DAYS = 30;

/**
 * Pop-up de revisión periódica: cada ~30 días pregunta si el usuario sigue con
 * el mismo plan de actividad. "Sí" solo actualiza la fecha de revisión; "No"
 * lo lleva a recalcular su nivel en /goals.
 */
export function ActivityReviewModal() {
  const nav = useNavigate();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const [dismissed, setDismissed] = useState(false);

  const level = profile?.activity_level ?? null;
  const reviewedAt = profile?.activity_reviewed_at ?? null;
  const daysSince = reviewedAt ? (Date.now() - new Date(reviewedAt).getTime()) / 86_400_000 : Infinity;
  const due = !!level && daysSince >= REVIEW_DAYS;

  if (dismissed || !due) return null;

  const answers = (profile?.activity_answers ?? {}) as Record<string, unknown>;
  const otherSports = typeof answers.otherSports === "string" ? answers.otherSports : "";
  const trainingDays = typeof answers.trainingDays === "number" ? answers.trainingDays : null;

  const keepSame = async () => {
    await updateProfile.mutateAsync({ activity_reviewed_at: new Date().toISOString() });
    setDismissed(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6" role="dialog" aria-modal="true">
      <div className="card w-full max-w-sm text-center">
        <div className="text-4xl">📅</div>
        <h2 className="mt-2 text-lg font-bold text-slate-800">¿Seguís con el mismo plan de actividad?</h2>
        <p className="mt-1 text-sm text-slate-500">Pasó un mes desde tu último cálculo. Un chequeo rápido para mantener tus calorías bien ajustadas.</p>

        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
          <div className="text-slate-500">Tu plan actual</div>
          <div className="font-semibold text-slate-800">
            {level ? ACTIVITY_LABEL[level] : "—"}
            {trainingDays != null ? ` · ${trainingDays} día(s) de entreno` : ""}
          </div>
          {otherSports && <div className="mt-0.5 text-xs text-slate-400">Otros: {otherSports}</div>}
        </div>

        <div className="mt-4 space-y-2">
          <Button fullWidth onClick={keepSame} disabled={updateProfile.isPending}>
            {updateProfile.isPending ? "…" : "Sí, sigo igual"}
          </Button>
          <Button variant="outline" fullWidth onClick={() => { setDismissed(true); nav("/goals"); }}>
            No, recalcular mi nivel
          </Button>
        </div>
      </div>
    </div>
  );
}
