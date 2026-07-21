import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { createGroup, renameGroup } from "./api";
import { useGroups } from "./useGroup";
import { AvatarMenu } from "@/components/ui/AvatarMenu";
import { Button } from "@titoapps/ui";
import { useDialog } from "@/components/ui/Dialog";
import { errorMessage } from "@/lib/errors";

/**
 * Pantalla de entrada: los grupos donde estás.
 *
 * `autoEnter` (solo en "/") salta directo cuando hay un único grupo, para no
 * agregar un clic de más todos los días. En "/grupos" NUNCA salta: si no,
 * quien tiene un solo grupo queda encerrado y no puede crear el segundo.
 */
export function GroupsPage({ autoEnter = false }: { autoEnter?: boolean }) {
  const { data: groups, isLoading } = useGroups();
  const [creating, setCreating] = useState(false);
  const qc = useQueryClient();
  const dialog = useDialog();

  async function rename(id: string, current: string) {
    const name = await dialog.prompt({
      title: "Nombre del grupo",
      message: "Como le dicen ustedes: “Partido Sombrero”, “Jaggermasters”…",
      defaultValue: current,
      confirmLabel: "Guardar",
    });
    if (name === null || !name.trim() || name.trim() === current) return;
    await renameGroup(id, name);
    qc.invalidateQueries({ queryKey: ["groups"] });
    qc.invalidateQueries({ queryKey: ["group", id] });
  }

  if (isLoading) return <p className="p-8 text-center text-gray-400">Cargando…</p>;

  if (autoEnter && !creating && groups && groups.length === 1) {
    return <Navigate to={`/g/${groups[0].id}`} replace />;
  }

  return (
    <div className="pb-8">
      <header className="flex items-center justify-between px-4 py-4">
        <div>
          <h1 className="text-2xl font-extrabold text-pitch-600">GolPay ⚽</h1>
          <p className="text-sm text-gray-500">Tus grupos</p>
        </div>
        <AvatarMenu />
      </header>

      <div className="space-y-2 px-4">
        {(groups ?? []).map((g) => (
          <div key={g.id} className="card flex items-center justify-between gap-2">
            <Link to={`/g/${g.id}`} className="min-w-0 flex-1">
              <div className="truncate font-semibold">{g.name}</div>
              <div className="text-xs text-gray-400">
                {g.role === "owner" ? "Sos el creador" : "Administrador"}
              </div>
            </Link>
            {/* Renombrar acá también: es donde uno lo busca, no en Miembros. */}
            {g.role === "owner" && (
              <button
                className="shrink-0 text-xs text-gray-400 underline"
                onClick={() => rename(g.id, g.name)}
              >
                Renombrar
              </button>
            )}
            <Link to={`/g/${g.id}`} className="shrink-0 text-gray-300">›</Link>
          </div>
        ))}

        {(groups?.length ?? 0) === 0 && !creating && (
          <div className="card text-center">
            <p className="text-gray-500">Todavía no tenés grupos.</p>
            <p className="mt-1 text-xs text-gray-400">
              Un grupo es una mejenga fija: sus partidos, sus jugadores y quién los organiza.
            </p>
          </div>
        )}

        {creating ? (
          <NewGroupForm onDone={() => setCreating(false)} />
        ) : (
          <button className="btn-ghost w-full" onClick={() => setCreating(true)}>
            + Nuevo grupo
          </button>
        )}
      </div>
    </div>
  );
}

function NewGroupForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();
  const nav = useNavigate();

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const id = await createGroup(name);
      await qc.invalidateQueries({ queryKey: ["groups"] });
      nav(`/g/${id}`);
    } catch (e: any) {
      setError(errorMessage(e, "No se pudo crear el grupo"));
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-2">
      <label className="label">Nombre del grupo</label>
      <input
        className="input"
        autoFocus
        placeholder="Partido Sombrero"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) save(); }}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={save} disabled={busy || !name.trim()}>
          {busy ? "Creando…" : "Crear"}
        </Button>
        <Button variant="ghost" onClick={onDone} disabled={busy}>Cancelar</Button>
      </div>
    </div>
  );
}

/** Se usa desde GroupsPage cuando querés crear aunque ya tengas grupos. */
export function NewGroupPage() {
  const nav = useNavigate();
  return (
    <div className="p-4">
      <NewGroupForm onDone={() => nav("/")} />
    </div>
  );
}
