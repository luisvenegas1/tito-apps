import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, PageHeader, Input, FormField, EmptyState, Spinner } from "@titoapps/ui";
import { NumberInput } from "@/components/ui/NumberInput";
import { useAuth } from "@/features/auth/AuthProvider";
import { listMyFoods, createFood, deleteFood, type NewFood } from "./foodsApi";

const EMPTY = { name: "", kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0, serving_g: 0 };

/**
 * "Mis productos": los alimentos guardados del usuario (por 100 g). La IA los
 * reconoce cuando escribís una comida y usa estos valores exactos en vez de estimar.
 */
export function MyProductsPage() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);

  const foods = useQuery({
    queryKey: ["myFoods"],
    queryFn: () => listMyFoods(userId!),
    enabled: !!userId,
  });

  const create = useMutation({
    mutationFn: (f: NewFood) => createFood(userId!, f),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myFoods"] });
      setForm(EMPTY);
      setShowForm(false);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFood(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myFoods"] }),
  });

  const save = () => {
    if (!form.name.trim()) return;
    create.mutate({
      name: form.name.trim(),
      kcal: form.kcal,
      protein_g: form.protein_g,
      carb_g: form.carb_g,
      fat_g: form.fat_g,
      serving_g: form.serving_g > 0 ? form.serving_g : null,
      source: "custom",
    });
  };

  const list = foods.data ?? [];

  return (
    <div className="p-4">
      <PageHeader title="Mis productos" subtitle="Tus alimentos con valores exactos" onBack={() => history.back()} />

      <p className="mt-3 text-sm text-slate-500">
        Guardá acá tus productos habituales (por 100 g). Cuando escribas una comida, la IA los reconoce por nombre y
        usa estos valores en lugar de estimar. También aparecen acá los que escaneás por código de barras o etiqueta.
      </p>

      {!showForm ? (
        <Button variant="secondary" className="mt-4 w-full" onClick={() => setShowForm(true)}>
          + Agregar un producto
        </Button>
      ) : (
        <div className="mt-4 card space-y-3">
          <FormField label="Nombre (como lo vas a escribir)">
            <Input
              value={form.name}
              placeholder="Ej. Leche + Proteína Dos Pinos"
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Calorías (kcal/100g)">
              <NumberInput value={form.kcal} onValueChange={(n) => setForm((p) => ({ ...p, kcal: n }))} />
            </FormField>
            <FormField label="Proteína (g/100g)">
              <NumberInput value={form.protein_g} onValueChange={(n) => setForm((p) => ({ ...p, protein_g: n }))} />
            </FormField>
            <FormField label="Carbohidratos (g/100g)">
              <NumberInput value={form.carb_g} onValueChange={(n) => setForm((p) => ({ ...p, carb_g: n }))} />
            </FormField>
            <FormField label="Grasa (g/100g)">
              <NumberInput value={form.fat_g} onValueChange={(n) => setForm((p) => ({ ...p, fat_g: n }))} />
            </FormField>
          </div>
          <FormField label="Porción típica en g (opcional)">
            <NumberInput value={form.serving_g} onValueChange={(n) => setForm((p) => ({ ...p, serving_g: n }))} />
          </FormField>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={save} disabled={create.isPending || !form.name.trim()}>
              {create.isPending ? "Guardando…" : "Guardar producto"}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setForm(EMPTY); }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2 text-xs">
        <Link to="/log/barcode" className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">📷 Código de barras</Link>
        <Link to="/log/label" className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">🏷️ Etiqueta</Link>
      </div>

      <div className="mt-4">
        {foods.isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : list.length === 0 ? (
          <EmptyState title="Todavía no tenés productos" description="Agregá tus alimentos habituales para que la IA los use tal cual." />
        ) : (
          <ul className="space-y-2">
            {list.map((f) => (
              <li key={f.id} className="card flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800">{f.name}</div>
                  <div className="text-xs text-slate-400">
                    {f.kcal} kcal · P{f.protein_g} · C{f.carb_g} · G{f.fat_g} (por 100 g)
                  </div>
                </div>
                <button
                  onClick={() => remove.mutate(f.id)}
                  disabled={remove.isPending}
                  className="text-slate-300 hover:text-red-500"
                  aria-label={`Eliminar ${f.name}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
