import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/ui/TopBar";
import {
  listFrequent, createFrequent, updateFrequent, setActive, findDuplicate,
  duplicateGroups, mergeFrequent, FrequentInput,
} from "./api";
import { useAuth } from "../auth/AuthProvider";
import type { FrequentPlayer, PreferredPosition } from "@/lib/supabase/types";
import { LEVELS, LEVEL_LABELS, DEFAULT_SKILL_LEVEL, levelLabel } from "@/lib/levels";
import { formatDate } from "@/lib/utils/format";
import { Button } from "@titoapps/ui";
import { titleCaseName } from "@/lib/names";
import { useDialog } from "@/components/ui/Dialog";

const POSITIONS: PreferredPosition[] = ["portero", "defensa", "medio", "delantero"];
const DAYS: [string, string][] = [
  ["lun", "L"], ["mar", "M"], ["mie", "X"], ["jue", "J"], ["vie", "V"], ["sab", "S"], ["dom", "D"],
];

const emptyInput: FrequentInput = {
  name: "", nickname: null, phone: null, skill_level: DEFAULT_SKILL_LEVEL,
  preferred_position: null, can_be_goalkeeper: false, notes: null, available_days: [],
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
    <div className="pb-8">
      <TopBar title="Mis jugadores" back backTo="/" />
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
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-500">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Ver desactivados
          </label>
          <Button size="sm" onClick={() => setEditing("new")}>+ Agregar jugador</Button>
        </div>

        <DuplicatesCard players={all} onMerged={refresh} />

        {filtered.map((p) => (
          <div key={p.id} className={`card flex items-center justify-between gap-2 ${p.is_active ? "" : "opacity-60"}`}>
            <button onClick={() => setEditing(p)} className="min-w-0 flex-1 text-left">
              <div className="font-medium">
                {p.name}{p.nickname && ` (${p.nickname})`}
                {!p.is_active && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">desactivado</span>}
              </div>
              <div className="text-xs text-gray-400">
                {levelLabel(p.skill_level)}
                {" · "}{p.preferred_position ?? "sin posición"}
                {p.can_be_goalkeeper && " · 🧤"}
                {p.last_played_at && ` · últ.: ${formatDate(p.last_played_at.slice(0, 10))}`}
              </div>
            </button>
            <Link to={`/jugador/${p.id}`} className="shrink-0 text-lg" title="Ver perfil">📊</Link>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="card text-center text-gray-500">
            {q ? "Sin resultados." : "Todavía no hay jugadores."}
          </div>
        )}
      </div>

      {editing && (
        <PlayerModal
          initial={editing === "new" ? null : editing}
          existing={all}
          onClose={() => setEditing(null)}
          onSave={async (input) => {
            // Devolvemos el error para que el modal lo muestre: antes se perdía
            // en la consola y parecía que "no dejaba guardar".
            try {
              if (editing === "new") await createFrequent(input, session!.user.id);
              else await updateFrequent(editing.id, input);
              refresh(); setEditing(null);
              return null;
            } catch (e: any) {
              return e.message ?? "No se pudo guardar";
            }
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

/**
 * Duplicados que ya están en la base (mismo nombre normalizado). Fusionarlos
 * es lo que habilita el índice único: mientras existan, la BD no puede
 * garantizar que no se creen más.
 */
function DuplicatesCard({ players, onMerged }: { players: FrequentPlayer[]; onMerged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialog = useDialog();
  const groups = duplicateGroups(players);
  if (groups.length === 0) return null;

  async function merge(keep: FrequentPlayer, drops: FrequentPlayer[]) {
    if (drops.length === 0) return;
    const ok = await dialog.confirm({
      title: `¿Conservar este perfil de “${keep.name}”?`,
      message:
        `Los partidos ${drops.length === 1 ? "del otro perfil" : `de los otros ${drops.length} perfiles`} ` +
        "pasan a este, y el duplicado se elimina.\n\nEsta acción no se puede deshacer.",
      confirmLabel: "Fusionar",
      danger: true,
    });
    if (!ok) return;
    setBusy(true); setError(null);
    try {
      for (const d of drops) await mergeFrequent(keep.id, d.id);
      onMerged();
    } catch (e: any) {
      setError(e.message ?? "Error al fusionar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card border-l-4 border-orange-400">
      <div className="mb-1 font-semibold">Posibles duplicados</div>
      <p className="mb-2 text-xs text-gray-400">
        Elegí cuál conservar. El otro cede sus partidos y desaparece.
      </p>
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g[0].id} className="border-t border-gray-100 pt-2 first:border-0 first:pt-0">
            <div className="mb-1 text-sm font-medium">“{g[0].name}” × {g.length}</div>
            <div className="space-y-1">
              {g.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-xs text-gray-500">
                  <span className="min-w-0 truncate">
                    {levelLabel(p.skill_level)} · {p.preferred_position ?? "sin posición"}
                    {p.last_played_at && ` · últ.: ${formatDate(p.last_played_at.slice(0, 10))}`}
                  </span>
                  <button
                    disabled={busy}
                    className="shrink-0 rounded-md bg-pitch-500 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                    onClick={() => merge(p, g.filter((o) => o.id !== p.id))}
                  >
                    Conservar este
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-orange-500">{error}</p>}
    </div>
  );
}

function PlayerModal({
  initial, existing, onClose, onSave, onToggleActive,
}: {
  initial: FrequentPlayer | null;
  existing: FrequentPlayer[];
  onClose: () => void;
  onSave: (input: FrequentInput) => Promise<string | null>;
  onToggleActive?: () => void;
}) {
  const [f, setF] = useState<FrequentInput>(
    initial
      ? {
          name: initial.name, nickname: initial.nickname, phone: initial.phone,
          skill_level: initial.skill_level, preferred_position: initial.preferred_position,
          can_be_goalkeeper: initial.can_be_goalkeeper, notes: initial.notes,
          available_days: initial.available_days,
        }
      : emptyInput,
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /** Deja el nombre como se va a guardar, apenas salís del campo. */
  function normalizeField(key: "name" | "nickname") {
    setF((cur) => {
      const raw = cur[key];
      if (!raw) return cur;
      const clean = titleCaseName(raw);
      return { ...cur, [key]: key === "nickname" && !clean ? null : clean };
    });
  }

  async function submit() {
    // Guardamos exactamente lo que se ve (ya normalizado al salir del campo).
    const input: FrequentInput = {
      ...f,
      name: titleCaseName(f.name),
      nickname: f.nickname ? titleCaseName(f.nickname) : null,
    };
    setSaving(true);
    setSaveError(null);
    const err = await onSave(input);
    setSaving(false);
    if (err) setSaveError(err);
  }

  function toggleDay(d: string) {
    setF((cur) => ({
      ...cur,
      available_days: cur.available_days.includes(d)
        ? cur.available_days.filter((x) => x !== d)
        : [...cur.available_days, d],
    }));
  }

  const duplicate = findDuplicate(f.name, existing, initial?.id);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded bg-gray-200" />
        <h3 className="mb-3 text-lg font-bold">{initial ? "Editar jugador" : "Nuevo jugador"}</h3>

        <div className="space-y-3">
          <input
            className="input"
            placeholder="Nombre"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            onBlur={() => normalizeField("name")}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input"
              placeholder="Apodo"
              value={f.nickname ?? ""}
              onChange={(e) => setF({ ...f, nickname: e.target.value || null })}
              onBlur={() => normalizeField("nickname")}
            />
            <input className="input" placeholder="Teléfono" value={f.phone ?? ""} onChange={(e) => setF({ ...f, phone: e.target.value || null })} />
          </div>

          <div>
            <label className="label">Nivel (privado)</label>
            <div className="grid grid-cols-3 gap-1.5">
              {LEVELS.map((n) => (
                <button key={n} type="button" onClick={() => setF({ ...f, skill_level: n })}
                  className={`h-10 rounded-lg text-xs font-semibold ${f.skill_level === n ? "bg-pitch-500 text-white" : "bg-gray-100 text-gray-500"}`}>
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
            <label className="label">Disponibilidad habitual</label>
            <div className="flex gap-1.5">
              {DAYS.map(([d, short]) => (
                <button key={d} type="button" onClick={() => toggleDay(d)}
                  className={`h-9 flex-1 rounded-lg text-sm font-semibold ${f.available_days.includes(d) ? "bg-pitch-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                  {short}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Notas (opcional)</label>
            <textarea className="input" rows={2} value={f.notes ?? ""} onChange={(e) => setF({ ...f, notes: e.target.value || null })} />
          </div>

          <div className="space-y-2">
            {saveError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{saveError}</p>
            )}
            {duplicate && (
              <p className="text-sm text-orange-500">
                No se puede guardar: “{duplicate.name}” ya usa ese nombre.
                {initial ? " Si son la misma persona, fusionalos desde “Posibles duplicados”." : ""}
              </p>
            )}
            <Button fullWidth onClick={submit} disabled={saving || !f.name.trim() || Boolean(duplicate)}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
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
