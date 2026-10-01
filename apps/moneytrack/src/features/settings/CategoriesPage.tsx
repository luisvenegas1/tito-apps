import { useState, type FormEvent } from "react";
import { Button, Input, Modal, useToast } from "@titoapps/ui";
import { errorMessage } from "@/lib/errors";
import { PageHeader } from "@/components/PageHeader";
import { Segmented } from "@/components/Segmented";
import { Loading } from "@/components/Empty";
import { useCategories, useSaveCategory } from "@/features/data/core";
import type { Category, TxnKind } from "@/lib/supabase/types";

export function CategoriesPage() {
  const q = useCategories();
  const [editing, setEditing] = useState<Partial<Category> | null>(null);
  const list = q.data ?? [];
  const groups: { title: string; items: Category[] }[] = [
    { title: "Gastos", items: list.filter((c) => c.kind_hint !== "income" && !c.is_archived) },
    { title: "Ingresos", items: list.filter((c) => c.kind_hint === "income" && !c.is_archived) },
    { title: "Archivadas", items: list.filter((c) => c.is_archived) },
  ];

  return (
    <div>
      <PageHeader title="Categorías" back action={<button type="button" className="px-3 text-sm font-semibold text-primary" onClick={() => setEditing({ kind_hint: "expense" })}>Nueva</button>} />
      {q.isLoading ? (
        <Loading />
      ) : (
        <div className="px-4 pb-8">
          {groups.filter((g) => g.items.length > 0).map((g) => (
            <section key={g.title}>
              <h2 className="section-title">{g.title}</h2>
              <ul className="card divide-y divide-border p-0">
                {g.items.map((c) => (
                  <li key={c.id}>
                    <button type="button" className="row w-full text-left hover:bg-surface-subtle" onClick={() => setEditing(c)}>
                      <span className="w-7 text-xl" aria-hidden>{c.icon}</span>
                      <span className="flex-1 font-medium">{c.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <CategorySheet category={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function CategorySheet({ category, onClose }: { category: Partial<Category> | null; onClose: () => void }) {
  const save = useSaveCategory();
  const toast = useToast();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [kind, setKind] = useState<TxnKind>("expense");
  const [ref, setRef] = useState<Partial<Category> | null>(null);
  if (category !== ref) {
    setRef(category);
    if (category) {
      setName(category.name ?? "");
      setIcon(category.icon ?? "");
      setKind(category.kind_hint === "income" ? "income" : "expense");
    }
  }

  const submit = async (e: FormEvent, archive?: boolean) => {
    e.preventDefault();
    try {
      await save.mutateAsync({ id: category?.id, name, icon: icon.trim() || null, kind_hint: kind, is_archived: archive ?? category?.is_archived ?? false });
      toast.show(archive === true ? "Categoría archivada" : archive === false ? "Categoría restaurada" : "Categoría guardada", "success");
      onClose();
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    }
  };

  return (
    <Modal open={Boolean(category)} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <h2 className="text-lg font-bold">{category?.id ? "Editar categoría" : "Nueva categoría"}</h2>
        <div className="flex gap-2">
          <label className="w-20">
            <span className="label">Ícono</span>
            <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🍔" className="text-center text-xl" maxLength={4} />
          </label>
          <label className="flex-1">
            <span className="label">Nombre</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        </div>
        <Segmented label="Tipo" className="w-full" value={kind} onChange={setKind} options={[{ value: "expense", label: "Gasto" }, { value: "income", label: "Ingreso" }]} />
        <Button type="submit" fullWidth>Guardar</Button>
        {category?.id && (
          <Button type="button" variant="outline" fullWidth onClick={(e) => submit(e as unknown as FormEvent, !category.is_archived)}>
            {category.is_archived ? "Restaurar" : "Archivar (se conserva en el historial)"}
          </Button>
        )}
      </form>
    </Modal>
  );
}
