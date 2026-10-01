import { useState, type FormEvent } from "react";
import { Button, Input, useToast } from "@titoapps/ui";
import { errorMessage } from "@/lib/errors";
import { PageHeader } from "@/components/PageHeader";
import { useDeletePerson, usePeople, useSavePerson } from "@/features/data/core";

/** Personas sin cuenta (pareja, etc.): sirven para "lo pagó otra persona". */
export function PeoplePage() {
  const { data: people = [] } = usePeople();
  const save = useSavePerson();
  const del = useDeletePerson();
  const toast = useToast();
  const [name, setName] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await save.mutateAsync({ name, role: null });
      setName("");
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    }
  }

  return (
    <div>
      <PageHeader title="Personas" back />
      <div className="px-4 pt-4">
        <p className="text-sm text-muted">
          Personas que pagan algunos gastos (por ejemplo, tu pareja). No tienen acceso a la app. Para compartir una cuenta con alguien, usa Cuentas.
        </p>
        <form onSubmit={submit} className="mt-4 flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" required aria-label="Nombre" />
          <Button type="submit">Agregar</Button>
        </form>
        {people.length > 0 && (
          <ul className="card mt-4 divide-y divide-border p-0">
            {people.map((p) => (
              <li key={p.id} className="row">
                <span className="flex-1 font-medium">{p.name}</span>
                <button type="button" className="text-sm font-semibold text-deficit" onClick={() => del.mutate(p.id)}>
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
