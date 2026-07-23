import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button, PageHeader, FormField, Select } from "@titoapps/ui";
import { NumberInput } from "@/components/ui/NumberInput";
import { computeDailyTargets, type GoalType, type ActivityLevel, type Sex } from "@titoapps/nutrition";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useActiveGoal, useSaveGoal } from "./useGoal";
import { useAddWeight, useLatestWeight } from "@/features/health/useHealth";
import { ageFromBirthDate } from "@/lib/date";
import type { ActivityAnswers } from "@/lib/ai/contracts";
import { ActivityQuestionnaire, DEFAULT_ANSWERS } from "./ActivityQuestionnaire";

// 3 objetivos claros (antes había 6 que se solapaban: "bajar grasa" y "déficit"
// daban lo mismo, igual que "ganar músculo" y "volumen").
const GOALS: { value: GoalType; label: string }[] = [
  { value: "lose_fat", label: "Bajar grasa" },
  { value: "maintain", label: "Mantener peso" },
  { value: "gain_muscle", label: "Ganar músculo" },
];

/** Mapea los objetivos antiguos a los 3 actuales (el cálculo de calorías es idéntico). */
function normalizeGoal(t?: GoalType | null): GoalType {
  if (t === "deficit") return "lose_fat";
  if (t === "bulk") return "gain_muscle";
  if (t === "custom") return "maintain";
  return t ?? "lose_fat";
}

export function GoalsPage() {
  const nav = useNavigate();
  const { data: profile } = useProfile();
  const { data: goal } = useActiveGoal();
  const updateProfile = useUpdateProfile();
  const saveGoal = useSaveGoal();
  const addWeight = useAddWeight();

  const [type, setType] = useState<GoalType>(normalizeGoal(goal?.type));
  const [sex, setSex] = useState<Sex>(profile?.sex ?? "male");
  const [age, setAge] = useState<number>(ageFromBirthDate(profile?.birth_date ?? null) ?? 30);
  const [height, setHeight] = useState<number>(profile?.height_cm ?? 170);
  // Peso ACTUAL: se toma del último peso registrado (no del objetivo). Solo se
  // registra un nuevo peso si el usuario lo cambia acá (ver submit).
  const { data: latestWeight } = useLatestWeight();
  const [weight, setWeight] = useState<number>(70);
  const weightTouched = useRef(false);
  useEffect(() => {
    if (!weightTouched.current && latestWeight != null) setWeight(latestWeight);
  }, [latestWeight]);
  const [targetWeight, setTargetWeight] = useState<number>(goal?.target_weight_kg ?? 68);

  // Nivel + respuestas de actividad (los maneja el cuestionario compartido).
  const [act, setAct] = useState<{ activity: ActivityLevel; answers: ActivityAnswers }>({
    activity: profile?.activity_level ?? "moderate",
    answers: (profile?.activity_answers as unknown as ActivityAnswers) ?? DEFAULT_ANSWERS,
  });

  const preview = computeDailyTargets({
    profile: { sex, age, height_cm: height, weight_kg: weight, activity: act.activity },
    goal: type,
  });

  const submit = async () => {
    const birth = new Date();
    birth.setFullYear(birth.getFullYear() - age);
    await updateProfile.mutateAsync({
      sex,
      height_cm: height,
      activity_level: act.activity,
      activity_answers: act.answers as unknown as Record<string, unknown>,
      activity_reviewed_at: new Date().toISOString(),
      birth_date: birth.toISOString().slice(0, 10),
    });
    // Solo registramos peso si el usuario lo cambió a un valor nuevo.
    // (Antes se registraba SIEMPRE, lo que anotaba pesos falsos al guardar el objetivo.)
    if (weight > 0 && weight !== latestWeight) {
      await addWeight.mutateAsync(weight);
    }
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
            <NumberInput value={age} onValueChange={setAge} />
          </FormField>
          <FormField label="Altura (cm)">
            <NumberInput value={height} onValueChange={setHeight} />
          </FormField>
          <FormField label="Peso actual (kg)">
            <NumberInput
              value={weight}
              onValueChange={(n) => {
                weightTouched.current = true;
                setWeight(n);
              }}
            />
          </FormField>
        </div>

        <ActivityQuestionnaire
          initialActivity={profile?.activity_level ?? null}
          initialAnswers={(profile?.activity_answers as unknown as ActivityAnswers) ?? null}
          onChange={setAct}
        />

        <FormField label="Peso objetivo (kg)">
          <NumberInput value={targetWeight} onValueChange={setTargetWeight} />
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
