import { useState } from "react";
import { Button, PageHeader, Input, Spinner, EmptyState } from "@titoapps/ui";
import { NumberInput } from "@/components/ui/NumberInput";
import type { PlanCategory, ExchangeUnit } from "@/lib/supabase/types";
import { usePlanCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "./usePro";

const UNIT_LABELS: Record<ExchangeUnit, string> = {
  manual: "Manual (solo cuento porciones)",
  carb_g: "Carbohidratos (g)",
  protein_g: "Proteína (g)",
  fat_g: "Grasa (g)",
  kcal: "Calorías (kcal)",
};

const UNIT_SUFFIX: Record<ExchangeUnit, string> = {
  manual: "",
  carb_g: "g de carbohidrato por intercambio",
  protein_g: "g de proteína por intercambio",
  fat_g: "g de grasa por intercambio",
  kcal: "kcal por intercambio",
};

/** Editor de una categoría (nombre, emoji, meta, equivalencia, notas, activo). */
function CategoryEditor({ cat }: { cat: PlanCategory }) {
  const upd = useUpdateCategory();
  const del = useDeleteCategory();
  const [name, setName] = useState(cat.name);
  const [emoji, setEmoji] = useState(cat.emoji ?? "");
  const [target, setTarget] = useState(cat.daily_target);
  const [unit, setUnit] = useState<ExchangeUnit>(cat.unit);
  const [per, setPer] = useState(cat.grams_per_exchange ?? 0);
  const [notes, setNotes] = useState(cat.notes ?? "");
  const [open, setOpen] = useState(false);

  const dirty =
    name !== cat.name ||
    emoji !== (cat.emoji ?? "") ||
    target !== cat.daily_target ||
    unit !== cat.unit ||
    per !== (cat.grams_per_exchange ?? 0) ||
    notes !== (cat.notes ?? "");

  const save = () =>
    upd.mutate({
      id: cat.id,
      patch: {
        name: name.trim() || cat.name,
        emoji: emoji.trim() || null,
        daily_target: target,
        unit,
        grams_per_exchange: unit === "manual" ? null : per > 0 ? per : null,
        notes: notes.trim() || null,
      },
    });

  return (
    <div className={`card space-y-2 ${cat.is_active ? "" : "opacity-60"}`}>
      <div className="flex items-center justify-between">
        <button onClick={() => setOpen(!open)} className="flex flex-1 items-center gap-2 text-left">
          <span className="text-xl" aria-hidden>{cat.emoji ?? "•"}</span>
          <span>
            <span className="font-semibold text-slate-800">{cat.name}</span>
            <span className="ml-2 text-sm text-slate-400">meta {cat.daily_target}/día</span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => upd.mutate({ id: cat.id, patch: { is_active: !cat.is_active } })}
            className={`rounded-full px-2 py-1 text-xs font-medium ring-1 ${cat.is_active ? "bg-green-50 text-green-700 ring-green-200" : "bg-slate-50 text-slate-500 ring-slate-200"}`}
          >
            {cat.is_active ? "Activa" : "Inactiva"}
          </button>
          <button onClick={() => setOpen(!open)} className="text-slate-400" aria-label="Editar">✏️</button>
        </div>
      </div>

      {open && (
        <div className="space-y-3 border-t border-slate-100 pt-3">
          <div className="flex gap-2">
            <div className="w-16">
              <label className="label">Emoji</label>
              <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🥖" />
            </div>
            <div className="flex-1">
              <label className="label">Nombre</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Meta diaria (intercambios)</label>
            <NumberInput value={target} onValueChange={setTarget} step={0.5} min={0} />
          </div>

          <div>
            <label className="label">Equivalencia (para foto / código de barras)</label>
            <select className="input" value={unit} onChange={(e) => setUnit(e.target.value as ExchangeUnit)}>
              {(Object.keys(UNIT_LABELS) as ExchangeUnit[]).map((u) => (
                <option key={u} value={u}>{UNIT_LABELS[u]}</option>
              ))}
            </select>
            {unit !== "manual" && (
              <div className="mt-2 flex items-center gap-2">
                <NumberInput value={per} onValueChange={setPer} min={0} className="w-24" />
                <span className="text-sm text-slate-400">{UNIT_SUFFIX[unit]}</span>
              </div>
            )}
            <p className="mt-1 text-xs text-slate-400">
              Cada nutricionista usa sus propias equivalencias. Definilas acá para que la app estime intercambios desde una foto o etiqueta.
            </p>
          </div>

          <div>
            <label className="label">Notas / reglas (opcional)</label>
            <textarea className="input min-h-[60px] resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej.: 1 fruta = 1 intercambio de carbohidrato" />
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={!dirty || upd.isPending}>{upd.isPending ? "Guardando…" : "Guardar"}</Button>
            <Button size="sm" variant="outline" onClick={() => del.mutate(cat.id)} disabled={del.isPending}>Eliminar</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProPlanConfigPage() {
  const { data: cats = [], isLoading } = usePlanCategories();
  const create = useCreateCategory();
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("");

  const addCategory = () => {
    const name = newName.trim();
    if (!name) return;
    create.mutate(
      { name, emoji: newEmoji.trim() || null, daily_target: 1, unit: "manual", sort_order: cats.length },
      { onSuccess: () => { setNewName(""); setNewEmoji(""); } },
    );
  };

  return (
    <div className="pb-8">
      <PageHeader title="Mi plan" subtitle="Las metas que te indicó tu profesional" />

      <div className="space-y-4 p-4">
        <p className="rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Ingresá las metas diarias de intercambios de tu plan. Podés agregar categorías (frutas, vegetales, agua, lácteos…) además de las básicas.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : cats.length === 0 ? (
          <EmptyState title="Sin categorías" description="Agregá tu primera categoría abajo." />
        ) : (
          <div className="space-y-3">
            {cats.map((c) => <CategoryEditor key={c.id} cat={c} />)}
          </div>
        )}

        <div className="card space-y-2">
          <h3 className="font-semibold text-slate-800">Agregar categoría</h3>
          <div className="flex gap-2">
            <Input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} placeholder="🍎" className="w-16" />
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre (ej. Frutas)" className="flex-1" />
          </div>
          <Button onClick={addCategory} disabled={!newName.trim() || create.isPending} className="w-full">
            {create.isPending ? "Agregando…" : "+ Agregar categoría"}
          </Button>
        </div>
      </div>
    </div>
  );
}
