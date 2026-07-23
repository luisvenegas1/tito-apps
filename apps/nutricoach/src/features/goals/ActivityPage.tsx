import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, PageHeader, Skeleton, EmptyState } from "@titoapps/ui";
import { computeDailyTargets, type ActivityLevel, type Sex } from "@titoapps/nutrition";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useActiveGoal, useSaveGoal } from "./useGoal";
import { useLatestWeight } from "@/features/health/useHealth";
import { ageFromBirthDate } from "@/lib/date";
import type { ActivityAnswers } from "@/lib/ai/contracts";
import { ActivityQuestionnaire, DEFAULT_ANSWERS } from "./ActivityQuestionnaire";

/**
 * Editar SOLO el nivel de actividad (desde el perfil), con el mismo cuestionario
 * + IA que la primera vez. Al guardar recalcula las calorías con el nuevo nivel
 * y reinicia el contador de revisión (activity_reviewed_at = ahora).
 */
export function ActivityPage() {
  const nav = useNavigate();
  const { data: profile, isLoading } = useProfile();
  const { data: goal } = useActiveGoal();
  const { data: latestWeight } = useLatestWeight();
  const updateProfile = useUpdateProfile();
  const saveGoal = useSaveGoal();

  const [act, setAct] = useState<{ activity: ActivityLevel; answers: ActivityAnswers }>({
    activity: profile?.activity_level ?? "moderate",
    answers: (profile?.activity_answers as unknown as ActivityAnswers) ?? DEFAULT_ANSWERS,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <PageHeader title="Tu actividad" subtitle="Recalculá tu nivel" onBack={() => history.back()} />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Sin objetivo aún no hay calorías que recalcular: mandamos a configurarlo.
  if (!goal) {
    return (
      <div className="p-4">
        <PageHeader title="Tu actividad" subtitle="Recalculá tu nivel" onBack={() => history.back()} />
        <EmptyState
          title="Primero definí tu objetivo"
          description="Necesitamos tu objetivo para calcular tus calorías según tu actividad."
          action={
            <Link to="/goals">
              <Button>Configurar objetivo</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const sex: Sex = profile?.sex ?? "male";
  const age = ageFromBirthDate(profile?.birth_date ?? null) ?? 30;
  const height = profile?.height_cm ?? 170;
  const weight = latestWeight ?? goal.target_weight_kg ?? 70;

  const newTargets = computeDailyTargets({
    profile: { sex, age, height_cm: height, weight_kg: weight, activity: act.activity },
    goal: goal.type,
  });

  const save = async () => {
    await updateProfile.mutateAsync({
      activity_level: act.activity,
      activity_answers: act.answers as unknown as Record<string, unknown>,
      activity_reviewed_at: new Date().toISOString(), // reinicia el contador de 30 días
    });
    await saveGoal.mutateAsync({
      type: goal.type,
      target_weight_kg: goal.target_weight_kg,
      rate_kg_per_week: goal.rate_kg_per_week,
      targets: newTargets,
    });
    nav("/profile");
  };

  return (
    <div className="p-4">
      <PageHeader title="Tu actividad" subtitle="Recalculá tu nivel con la IA" onBack={() => history.back()} />
      <div className="mt-4 space-y-3">
        <ActivityQuestionnaire
          initialActivity={profile?.activity_level ?? null}
          initialAnswers={(profile?.activity_answers as unknown as ActivityAnswers) ?? null}
          onChange={setAct}
        />

        <div className="card bg-green-50/60">
          <div className="metric-label mb-2 text-green-700">Tus calorías con este nivel</div>
          <div className="text-center">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">{newTargets.calorie_target}</span>
            <span className="ml-1 text-sm text-slate-400">kcal / día</span>
            {goal.calorie_target !== newTargets.calorie_target && (
              <p className="mt-1 text-xs text-slate-500">Antes: {goal.calorie_target} kcal</p>
            )}
          </div>
        </div>

        <Button className="w-full" onClick={save} disabled={saveGoal.isPending || updateProfile.isPending}>
          {saveGoal.isPending || updateProfile.isPending ? "Guardando…" : "Guardar nivel de actividad"}
        </Button>
      </div>
    </div>
  );
}
