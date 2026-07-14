import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/ui/TopBar";
import {
  listFrequent, createFrequent, updateFrequent, setActive, findDuplicate, FrequentInput,
} from "./api";
import { useAuth } from "../auth/AuthProvider";
import type { FrequentPlayer, PreferredPosition } from "@/lib/supabase/types";
import { LEVELS, LEVEL_LABELS, DEFAULT_SKILL_LEVEL } from "@/lib/levels";
import { formatDate } from "@/lib/utils/format";
import { Button } from "@titoapps/ui";

const POSITIONS: PreferredPosition[] = ["portero", "defensa", "medio", "delantero"];

const emptyInput: FrequentInput = {
  name: "", nickname: null, phone: null, skill_level: DEFAULT_SKILL_LEVEL,
  preferred_position: null, can_be_goalkeeper: false, notes: null,
};

export function FrequentPlayersPage() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const { data: players } = useQuery({ queryKey: ["frequent"], queryFn: listFrequent });
  const [editing, setEditing] = useState<FrequentPlayer | "new" | null>(null);
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["frequent"] });

  const all = players ?? [];
  const q = query.toLowerCase().trim();
  const filtered = all.filter((p) => {
    if (!showInactive && !p.is_active) return false;
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || (p.nickname ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="pb-24">
      <TopBar title="Mis jugadores" back />
      <div className="space-y-2 p-4">
        <p className="text-sm text-gray-500">
          El nivel es privado: sólo vos lo ves. Se usa para armar equipos parejos.
        </p>
        <input
          className="input"
          placeholder="Buscar por nombre o apodo…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-gray-500">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Ver desactivados
        </label>

        {filtered.map((p) => (
          <button key={p.id} onClick={() => setEditing(p)}
            className={`card flex w-full items-center justify-between ${p.is_active ? "" : "opacity-60"}`}>
            <div className="text-left">
              <div className="font-medium">
                {p.name}{p.nickname && ` (${p.nickname})`}
                {!p.is_active && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">desactivado</span>}
              </div>
              <div className="text-xs text-gray-400">
                {p.skill_level ? LEVEL_LABELS[p.skill_level as 1 | 2 | 3] : "Sin evaluar"}
                {" · "}{p.preferred_position ?? "sin posición"}
                {p.can_be_goalkeeper && " · 🧤"}
                {p.last_played_at && ` · últ.: ${formatDate(p.last_played_at.slice(0, 10))}`}
              </div>
            </div>
            <span className="text-gray-300">›</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="card text-center text-gray-500">
            {q ? "Sin resultados." : "Todavía no hay jugadores."}
          </div>
        )}
      </div>

      <Button
        onClick={() => setEditing("new")}
        className="fixed bottom-5 left-1/2 -translate-x-1/2 shadow-lg"
      >
        + Agregar jugador
      </Button>

      {editing && (
        <PlayerModal
          initial={editing === "new" ? null : editing}
          existing={all}
          onClose={() => setEditing(null)}
          onSave={async (input) => {
            if (editing === "new") await createFrequent(input, session!.user.id);
            else await updateFrequent(editing.id, input);
            refresh(); setEditing(null);
          }}
          onToggleActive={
            editing !== "new"
              ? async () => { await setActive(editing.id, !editing.is_active); refresh(); setEditing(null); }
              : undefined
          }
        />
      )}
    </div>
  );
}

function PlayerModal({
  initial, existing, onClose, onSave, onToggleActive,
}: {
  initial: FrequentPlayer | null;
  existing: FrequentPlayer[];
  onClose: () => void;
  onSave: (input: FrequentInput) => void;
  onToggleActive?: () => void;
}) {
  const [f, setF] = useState<FrequentInput>(
    initial
      ? {
          name: initial.name, nickname: initial.nickname, phone: initial.phone,
          skill_level: initial.skill_level, preferred_position: initial.preferred_position,
          can_be_goalkeeper: initial.can_be_goalkeeper, notes: initial.notes,
        }
      : emptyInput,
  );

  const duplicate = findDuplicate(f.name, existing, initial?.id);

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded bg-gray-200" />
        <h3 className="mb-3 text-lg font-bold">{initial ? "Editar jugador" : "Nuevo jugador"}</h3>

        <div className="space-y-3">
          <input className="input" placeholder="Nombre" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          {duplicate && (
            <p className="text-sm text-orange-500">
              Ya existe un jugador activo llamado “{duplicate.name}”. Cambiá el nombre para evitar duplicados.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <input className="input" placeholder="Apodo" value={f.nickname ?? ""} onChange={(e) => setF({ ...f, nickname: e.target.value || null })} />
            <input className="input" placeholder="Teléfono" value={f.phone ?? ""} onChange={(e) => setF({ ...f, phone: e.target.value || null })} />
          </div>

          <div>
            <label className="label">Nivel (privado)</label>
            <div className="flex gap-1.5">
              {LEVELS.map((n) => (
                <button key={n} onClick={() => setF({ ...f, skill_level: n })}
                  className={`h-10 flex-1 rounded-lg text-sm font-semibold ${f.skill_level === n ? "bg-pitch-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                  {LEVEL_LABELS[n]}
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

          <div>
            <label className="label">Notas (opcional)</label>
            <textarea className="input" rows={2} value={f.notes ?? ""} onChange={(e) => setF({ ...f, notes: e.target.value || null })} />
          </div>

          <Button fullWidth onClick={() => onSave(f)} disabled={!f.name.trim() || Boolean(duplicate)}>Guardar</Button>
          {onToggleActive && (
            <button className="w-full text-center text-sm text-gray-500 underline" onClick={onToggleActive}>
              {initial?.is_active ? "Desactivar jugador" : "Reactivar jugador"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
