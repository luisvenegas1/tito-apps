import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, PageHeader, Input, FormField } from "@titoapps/ui";
import { NumberInput } from "@/components/ui/NumberInput";
import { scaleMacros } from "@titoapps/nutrition";
import { useAuth } from "@/features/auth/AuthProvider";
import { createFood } from "./foodsApi";
import { useAddFood } from "./useLog";
import { mealByHour } from "./helpers";

/** Crear alimento personalizado (por 100 g) y registrarlo. */
export function CustomFood() {
  const nav = useNavigate();
  const { session } = useAuth();
  const add = useAddFood();
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ name: "", kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0 });
  const [grams, setGrams] = useState(100);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((prev) => ({ ...prev, [k]: k === "name" ? e.target.value : Number(e.target.value) }));
  const setNum = (k: "kcal" | "protein_g" | "carb_g" | "fat_g") => (n: number) =>
    setF((prev) => ({ ...prev, [k]: n }));

  const submit = async () => {
    if (!f.name.trim()) return;
    setSaving(true);
    try {
      const food = await createFood(session!.user.id, f);
      const m = scaleMacros(food, grams);
      add.mutate(
        [
          {
            food_id: food.id,
            name: food.name,
            grams,
            meal: mealByHour(),
            kcal: m.kcal,
            protein_g: m.protein_g,
            carb_g: m.carb_g,
            fat_g: m.fat_g,
            source: "custom" as const,
          },
        ],
        { onSuccess: () => nav("/") },
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <PageHeader title="Alimento personalizado" subtitle="Valores por 100 g" />
      <div className="mt-4 space-y-3">
        <FormField label="Nombre">
          <Input value={f.name} onChange={set("name")} placeholder="Ej. Batido casero" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Calorías (kcal)">
            <NumberInput value={f.kcal} onValueChange={setNum("kcal")} />
          </FormField>
          <FormField label="Proteína (g)">
            <NumberInput value={f.protein_g} onValueChange={setNum("protein_g")} />
          </FormField>
          <FormField label="Carbohidratos (g)">
            <NumberInput value={f.carb_g} onValueChange={setNum("carb_g")} />
          </FormField>
          <FormField label="Grasa (g)">
            <NumberInput value={f.fat_g} onValueChange={setNum("fat_g")} />
          </FormField>
        </div>
        <FormField label="Cantidad consumida (g)">
          <NumberInput value={grams} onValueChange={setGrams} />
        </FormField>
        <Button className="w-full" onClick={submit} disabled={saving || add.isPending}>
          Guardar y registrar
        </Button>
      </div>
    </div>
  );
}
