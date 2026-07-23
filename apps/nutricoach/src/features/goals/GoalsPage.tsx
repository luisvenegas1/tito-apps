import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, PageHeader, Input, FormField, Select, Spinner } from "@titoapps/ui";
import { computeDailyTargets, type GoalType, type ActivityLevel, type Sex } from "@titoapps/nutrition";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useActiveGoal, useSaveGoal } from "./useGoal";
import { useAddWeight } from "@/features/health/useHealth";
import { ageFromBirthDate } from "@/lib/date";
import { ai } from "@/lib/ai/client";
import { errorMessage } from "@/lib/errors";
import type { ActivityAnswers } from "@/lib/ai/contracts";

const GOALS: { value: GoalType; label: string }[] = [
  { value: "lose_fat", label: "Bajar grasa" },
  { value: "gain_muscle", label: "Ganar músculo" },
  { value: "maintain", label: "Mantener peso" },
  { value: "deficit", label: "Déficit calórico" },
  { value: "bulk", label: "Volumen" },
  { value: "custom", label: "Personalizado" },
];

const ACTIVITIES: { value: ActivityLevel; label: string }[] = [
  { value: "sedentary", label: "Sedentario" },
  { value: "light", label: "Ligero" },
  { value: "moderate", label: "Moderado" },
  { value: "active", label: "Activo" },
  { value: "very_active", label: "Muy activo" },
];
const ACTIVITY_LABEL = Object.fromEntries(ACTIVITIES.map((a) => [a.value, a.label])) as Record<ActivityLevel, string>;

const DEFAULT_ANSWERS: ActivityAnswers = {
  trainingDays: 3,
  trainingType: "both",
  trainingMinutes: 60,
  otherSports: "",
  dailyMovement: "sitting",
};

export function GoalsPage() {
  const nav = useNavigate();
  const { data: profile } = useProfile();
  const { data: goal } = useActiveGoal();
  const updateProfile = useUpdateProfile();
  const saveGoal = useSaveGoal();
  const addWeight = useAddWeight();

  const [type, setType] = useState<GoalType>(goal?.type ?? "lose_fat");
  const [sex, setSex] = useState<Sex>(profile?.sex ?? "male");
  const [age, setAge] = useState<number>(ageFromBirthDate(profile?.birth_date ?? null) ?? 30);
  const [height, setHeight] = useState<number>(profile?.height_cm ?? 170);
  const [weight, setWeight] = useState<number>(goal?.target_weight_kg ?? 70);
  const [activity, setActivity] = useState<ActivityLevel>(profile?.activity_level ?? "moderate");
  const [targetWeight, setTargetWeight] = useState<number>(goal?.target_weight_kg ?? 68);

  // Cuestionario de actividad (la IA lo traduce a un nivel).
  const [answers, setAnswers] = useState<ActivityAnswers>(
    (profile?.activity_answers as unknown as ActivityAnswers) ?? DEFAULT_ANSWERS,
  );
  const [suggested, setSuggested] = useState<ActivityLevel | null>(profile?.activity_level ?? null);
  const [reason, setReason] = useState<string>("");
  const [classifying, setClassifying] = useState(false);
  const [classifyError, setClassifyError] = useState<string | null>(null);
  const [showOverride, setShowOverride] = useState(false);

  const setAns = <K extends keyof ActivityAnswers>(k: K, v: ActivityAnswers[K]) =>
    setAnswers((prev) => ({ ...prev, [k]: v }));

  const classify = async () => {
    setClassifying(true);
    setClassifyError(null);
    try {
      const res = await ai.classifyActivity({ answers });
      setSuggested(res.activity);
      setActivity(res.activity);
      setReason(res.reason);
      setShowOverride(false);
    } catch (err) {
      setClassifyError(errorMessage(err));
    } finally {
      setClassifying(false);
    }
  };

  const overridden = suggested != null && activity !== suggested;

  const preview = computeDailyTargets({
    profile: { sex, age, height_cm: height, weight_kg: weight, activity },
    goal: type,
  });

  const submit = async () => {
    const birth = new Date();
    birth.setFullYear(birth.getFullYear() - age);
    await updateProfile.mutateAsync({
      sex,
      height_cm: height,
      activity_level: activity,
      activity_answers: answers as unknown as Record<string, unknown>,
      activity_reviewed_at: new Date().toISOString(),
      birth_date: birth.toISOString().slice(0, 10),
    });
    await addWeight.mutateAsync(weight);
    await saveGoal.mutateAsync({
      type,
      target_weight_kg: targetWeight,
      rate_kg_per_week: 0.5,
      targets: preview,
    });
    nav("/");
  };

  return (
    <div className="p-4">
      <PageHeader title="Tu objetivo" subtitle="La IA calcula tus metas diarias" />
      <div className="mt-4 space-y-3">
        <FormField label="¿Qué querés lograr?">
          <Select value={type} onChange={(e) => setType(e.target.value as GoalType)}>
            {GOALS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </Select>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Sexo">
            <Select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
              <option value="male">Hombre</option>
              <option value="female">Mujer</option>
            </Select>
          </FormField>
          <FormField label="Edad">
            <Input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} />
          </FormField>
          <FormField label="Altura (cm)">
            <Input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))} />
          </FormField>
          <FormField label="Peso actual (kg)">
            <Input type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
          </FormField>
        </div>

        {/* --- Cuestionario de actividad (en vez de elegir el nivel a ojo) --- */}
        <div className="card space-y-3">
          <div>
            <div className="metric-label text-slate-600">Tu actividad</div>
            <p className="text-xs text-slate-400">
              Contanos tu semana y la IA determina tu nivel para calcular tus calorías.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Días de entreno / semana">
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={7}
                value={answers.trainingDays}
                onChange={(e) => setAns("trainingDays", Number(e.target.value))}
              />
            </FormField>
            <FormField label="Minutos por sesión">
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={answers.trainingMinutes}
                onChange={(e) => setAns("trainingMinutes", Number(e.target.value))}
              />
            </FormField>
          </div>

          <FormField label="Tipo de entrenamiento">
            <Select
              value={answers.trainingType}
              onChange={(e) => setAns("trainingType", e.target.value as ActivityAnswers["trainingType"])}
            >
              <option value="strength">Fuerza / pesas</option>
              <option value="cardio">Cardio</option>
              <option value="both">Ambos</option>
              <option value="none">Ninguno</option>
            </Select>
          </FormField>

          <FormField label="Otros deportes (fútbol, correr, ciclismo…)">
            <Input
              value={answers.otherSports}
              placeholder="Ej. fútbol 2 veces, correr 1 vez"
              onChange={(e) => setAns("otherSports", e.target.value)}
            />
          </FormField>

          <FormField label="En un día normal…">
            <Select
              value={answers.dailyMovement}
              onChange={(e) => setAns("dailyMovement", e.target.value as ActivityAnswers["dailyMovement"])}
            >
              <option value="sitting">Paso la mayoría sentado/a</option>
              <option value="mixed">Mitad sentado, mitad de pie</option>
              <option value="onfeet">Mayormente de pie / en movimiento</option>
            </Select>
          </FormField>

          <Button variant="secondary" className="w-full" onClick={classify} disabled={classifying}>
            {classifying ? (
              <span className="inline-flex items-center gap-2">
                <Spinner /> Calculando tu nivel…
              </span>
            ) : suggested ? (
              "Recalcular mi nivel"
            ) : (
              "Calcular mi nivel con IA"
            )}
          </Button>
          {classifyError && <p className="text-sm text-red-600">{classifyError}</p>}

          {suggested && (
            <div className="rounded-xl bg-green-50 p-3">
              <div className="text-sm text-slate-600">
                Según tus respuestas, tu nivel es:{" "}
                <b className="text-green-700">{ACTIVITY_LABEL[suggested]}</b>
              </div>
              {reason && <p className="mt-1 text-xs text-slate-500">{reason}</p>}

              {!showOverride ? (
                <button
                  onClick={() => setShowOverride(true)}
                  className="mt-2 text-xs text-slate-400 underline"
                >
                  Cambiarlo manualmente
                </button>
              ) : (
                <div className="mt-3">
                  <FormField label="Nivel de actividad (manual)">
                    <Select value={activity} onChange={(e) => setActivity(e.target.value as ActivityLevel)}>
                      {ACTIVITIES.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  {overridden && (
                    <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      ⚠️ El nivel sugerido es <b>{ACTIVITY_LABEL[suggested]}</b>. Cambiarlo altera el cálculo de tus
                      calorías; se recomienda dejarlo en el sugerido salvo que estés seguro.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <FormField label="Peso objetivo (kg)">
          <Input type="number" value={targetWeight} onChange={(e) => setTargetWeight(Number(e.target.value))} />
        </FormField>

        <div className="card bg-green-50/60">
          <div className="metric-label mb-2 text-green-700">Tus metas diarias</div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <Metric v={preview.calorie_target} l="kcal" />
            <Metric v={preview.protein_g} l="Prot" />
            <Metric v={preview.carb_g} l="Carbs" />
            <Metric v={preview.fat_g} l="Grasa" />
          </div>
        </div>

        <Button className="w-full" onClick={submit} disabled={saveGoal.isPending}>
          {saveGoal.isPending ? "Guardando…" : "Guardar objetivo"}
        </Button>
      </div>
    </div>
  );
}

function Metric({ v, l }: { v: number; l: string }) {
  return (
    <div>
      <div className="text-lg font-bold text-slate-900 tabular-nums">{v}</div>
      <div className="text-xs text-slate-400">{l}</div>
    </div>
  );
}
