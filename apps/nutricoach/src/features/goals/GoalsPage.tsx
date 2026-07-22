import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, PageHeader, Input, FormField, Select } from "@titoapps/ui";
import { computeDailyTargets, type GoalType, type ActivityLevel, type Sex } from "@titoapps/nutrition";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useActiveGoal, useSaveGoal } from "./useGoal";
import { useAddWeight } from "@/features/health/useHealth";
import { ageFromBirthDate } from "@/lib/date";

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

  const preview = computeDailyTargets({
    profile: { sex, age, height_cm: height, weight_kg: weight, activity },
    goal: type,
  });

  const submit = async () => {
    // Guardamos perfil (aprox. birth_date desde edad) y peso inicial.
    const birth = new Date();
    birth.setFullYear(birth.getFullYear() - age);
    await updateProfile.mutateAsync({
      sex,
      height_cm: height,
      activity_level: activity,
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
        <FormField label="Nivel de actividad">
          <Select value={activity} onChange={(e) => setActivity(e.target.value as ActivityLevel)}>
            {ACTIVITIES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </Select>
        </FormField>
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
