import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/ui/TopBar";
import { listFrequent, createFrequent, updateFrequent, deleteFrequent, FrequentInput } from "./api";
import { useAuth } from "../auth/AuthProvider";
import type { FrequentPlayer, PreferredPosition } from "@/lib/supabase/types";

const POSITIONS: PreferredPosition[] = ["portero", "defensa", "medio", "delantero"];

const emptyInput: FrequentInput = {
  name: "", nickname: null, phone: null, skill_level: 3,
  preferred_position: null, can_be_goalkeeper: false,
};

export function FrequentPlayersPage() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const { data: players } = useQuery({ queryKey: ["frequent"], queryFn: listFrequent });
  const [editing, setEditing] = useState<FrequentPlayer | "new" | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["frequent"] });

  return (
    <div className="pb-24">
      <TopBar title="Jugadores frecuentes" back />
      <p className="px-4 pt-3 text-sm text-gray-500">
        El nivel es privado: sólo vos lo ves. Se usa para armar equipos parejos.
      </p>

      <div className="space-y-2 p-4">
        {(players ?? []).map((p) => (
          <button key={p.id} onClick={() => setEditing(p)} className="card flex w-full items-center justify-between">
            <div className="text-left">
              <div className="font-medium">{p.name}{p.nickname && ` (${p.nickname})`}</div>
              <div className="text-xs text-gray-400">
                Nivel {p.skill_level ?? "—"} · {p.preferred_position ?? "sin posición"}
                {p.can_be_goalkeeper && " · 🧤"}
              </div>
            </div>
            <span className="text-gray-300">›</span>
          </button>
        ))}
        {(players?.length ?? 0) === 0 && (
          <div className="card text-center text-gray-500">Todavía no hay jugadores frecuentes.</div>
        )}
      </div>

      <button
        onClick={() => setEditing("new")}
        className="btn-primary fixed bottom-5 left-1/2 -translate-x-1/2 shadow-lg"
      >
        + Agregar jugador
      </button>

      {editing && (
        <PlayerModal
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (input) => {
            if (editing === "new") await createFrequent(input, session!.user.id);
            else await updateFrequent(editing.id, input);
            refresh(); setEditing(null);
          }}
          onDelete={editing !== "new" ? async () => { await deleteFrequent(editing.id); refresh(); setEditing(null); } : undefined}
        />
      )}
    </div>
  );
}

function PlayerModal({
  initial, onClose, onSave, onDelete,
}: {
  initial: FrequentPlayer | null;
  onClose: () => void;
  onSave: (input: FrequentInput) => void;
  onDelete?: () => void;
}) {
  const [f, setF] = useState<FrequentInput>(
    initial
      ? {
          name: initial.name, nickname: initial.nickname, phone: initial.phone,
          skill_level: initial.skill_level, preferred_position: initial.preferred_position,
          can_be_goalkeeper: initial.can_be_goalkeeper,
        }
      : emptyInput,
  );

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded bg-gray-200" />
        <h3 className="mb-3 text-lg font-bold">{initial ? "Editar jugador" : "Nuevo jugador"}</h3>

        <div className="space-y-3">
          <input className="input" placeholder="Nombre" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className="input" placeholder="Apodo" value={f.nickname ?? ""} onChange={(e) => setF({ ...f, nickname: e.target.value || null })} />
            <input className="input" placeholder="Teléfono" value={f.phone ?? ""} onChange={(e) => setF({ ...f, phone: e.target.value || null })} />
          </div>

          <div>
            <label className="label">Nivel (privado)</label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setF({ ...f, skill_level: n })}
                  className={`h-10 flex-1 rounded-lg font-bold ${f.skill_level === n ? "bg-pitch-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Posición</label>
            <div className="flex gap-1.5">
              {POSITIONS.map((p) => (
                <button key={p} onClick={() => setF({ ...f, preferred_position: f.preferred_position === p ? null : p })}
                  className={`btn flex-1 px-1 py-1.5 text-xs capitalize ${f.preferred_position === p ? "bg-pitch-500 text-white" : "bg-gray-100 text-gray-600"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={f.can_be_goalkeeper} onChange={(e) => setF({ ...f, can_be_goalkeeper: e.target.checked })} />
            Puede jugar de portero 🧤
          </label>

          <button className="btn-primary w-full" onClick={() => onSave(f)} disabled={!f.name.trim()}>Guardar</button>
          {onDelete && <button className="w-full text-center text-sm text-red-400 underline" onClick={onDelete}>Eliminar</button>}
        </div>
      </div>
    </div>
  );
}
