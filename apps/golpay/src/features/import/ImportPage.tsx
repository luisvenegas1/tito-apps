import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/ui/TopBar";
import { parseWhatsappList } from "@/lib/parser/whatsapp";
import { getMatch, listMatchPlayers } from "../matches/api";
import { suggestMatches } from "../players/api";
import { importPlayers, listFrequentForMatch, ImportRow } from "./api";
import { useAuth } from "../auth/AuthProvider";
import type { FrequentPlayer } from "@/lib/supabase/types";
import { levelLabel } from "@/lib/levels";
import { Button } from "@titoapps/ui";

interface Row {
  name: string;
  splittable: boolean;
  suggestions?: string[];
  isGoalkeeper: boolean;
  frequentPlayerId: string | null;
  known: boolean; // vinculado a un perfil existente
  candidates: FrequentPlayer[]; // coincidencias ambiguas sin resolver
}

export function ImportPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { session } = useAuth();
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: match } = useQuery({ queryKey: ["match", id], queryFn: () => getMatch(id!) });
  const { data: existing } = useQuery({ queryKey: ["players", id], queryFn: () => listMatchPlayers(id!) });
  const { data: frequent } = useQuery({ queryKey: ["frequent"], queryFn: listFrequentForMatch });

  function profileById(pid: string | null): FrequentPlayer | null {
    return pid ? (frequent ?? []).find((f) => f.id === pid) ?? null : null;
  }

  function buildRow(name: string, gk: boolean, splittable = false, suggestions?: string[]): Row {
    let frequentPlayerId: string | null = null;
    let candidates: FrequentPlayer[] = [];
    if (frequent && name.trim()) {
      const lower = name.toLowerCase().trim();
      const exact = frequent.find(
        (f) => f.is_active && (f.name.toLowerCase() === lower || (f.nickname ?? "").toLowerCase() === lower),
      );
      if (exact) {
        frequentPlayerId = exact.id;
      } else {
        const matches = suggestMatches(name, frequent);
        if (matches.length === 1) frequentPlayerId = matches[0].id;
        else if (matches.length > 1) candidates = matches; // ambiguo: el usuario elige
      }
    }
    const profile = profileById(frequentPlayerId);
    return {
      name,
      splittable,
      suggestions,
      isGoalkeeper: gk || (profile?.can_be_goalkeeper ?? false),
      frequentPlayerId,
      known: Boolean(frequentPlayerId),
      candidates,
    };
  }

  function preview() {
    const parsed = parseWhatsappList(text);
    setRows(parsed.map((p) => buildRow(p.name, p.goalkeeper, p.splittable, p.suggestions)));
  }

  function splitRow(i: number) {
    setRows((rs) => {
      if (!rs) return rs;
      const row = rs[i];
      if (!row.suggestions) return rs;
      const newRows = row.suggestions.map((n) => buildRow(n, row.isGoalkeeper));
      return [...rs.slice(0, i), ...newRows, ...rs.slice(i + 1)];
    });
  }

  function editName(i: number, name: string) {
    setRows((rs) => rs?.map((r, idx) => (idx === i ? { ...buildRow(name, false), name } : r)) ?? rs);
  }

  function toggleKeeper(i: number, value: boolean) {
    setRows((rs) => rs?.map((r, idx) => (idx === i ? { ...r, isGoalkeeper: value } : r)) ?? rs);
  }

  /** Resuelve una coincidencia ambigua: elegir un perfil o marcar como nuevo. */
  function resolveCandidate(i: number, pid: string | null) {
    setRows((rs) =>
      rs?.map((r, idx) => {
        if (idx !== i) return r;
        const profile = profileById(pid);
        return {
          ...r,
          frequentPlayerId: pid,
          known: Boolean(pid),
          isGoalkeeper: r.isGoalkeeper || (profile?.can_be_goalkeeper ?? false),
        };
      }) ?? rs,
    );
  }

  function removeRow(i: number) {
    setRows((rs) => rs?.filter((_, idx) => idx !== i) ?? rs);
  }

  function addRow() {
    setRows((rs) => [...(rs ?? []), buildRow("", false)]);
  }

  async function confirm() {
    if (!rows || !match || !session) return;
    setBusy(true);
    try {
      const existingNames = new Set((existing ?? []).map((p) => p.display_name.toLowerCase()));
      const seen = new Set<string>();
      const toImport: ImportRow[] = [];
      for (const r of rows) {
        const name = r.name.trim();
        const key = name.toLowerCase();
        if (!name || existingNames.has(key) || seen.has(key)) continue;
        seen.add(key);
        toImport.push({ name, isGoalkeeper: r.isGoalkeeper, frequentPlayerId: r.frequentPlayerId });
      }
      await importPlayers(match.id, toImport, match.cost_per_player, session.user.id);
      nav(`/partido/${match.id}`);
    } catch (err: any) {
      alert(err.message ?? "Error");
    } finally {
      setBusy(false);
    }
  }

  const keeperCount = rows?.filter((r) => r.isGoalkeeper).length ?? 0;
  const knownCount = rows?.filter((r) => r.known).length ?? 0;

  return (
    <div className="pb-8">
      <TopBar title="Importar jugadores" back />
      <div className="space-y-4 p-4">
        {!rows && (
          <>
            <p className="text-sm text-gray-500">
              Pegá la lista de WhatsApp. Detectamos nombres, ignoramos números y emojis,
              y marcamos como portero a quien tenga el 🧤. Reconocemos a tus jugadores frecuentes.
            </p>
            <textarea
              className="input font-mono text-sm"
              rows={10}
              placeholder={"Lunes 8 pm\n1. Chepe\n2. Gera🧤\n3. Roger 🧤"}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <Button fullWidth onClick={preview} disabled={!text.trim()}>
              Ver vista previa
            </Button>
          </>
        )}

        {rows && (
          <>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{rows.length} jugadores · {knownCount} conocidos · {keeperCount} 🧤</span>
              <button className="text-pitch-600 underline" onClick={() => setRows(null)}>
                Volver a pegar
              </button>
            </div>

            <div className="space-y-1.5">
              {rows.map((r, i) => {
                const profile = r.frequentPlayerId ? profileById(r.frequentPlayerId) : null;
                return (
                  <div key={i} className="card space-y-1.5 px-2.5 py-2">
                    <div className="flex items-center gap-2">
                      {r.known ? (
                        <span className="shrink-0 text-sm text-pitch-500"
                          title={profile ? `Perfil: ${levelLabel(profile.skill_level)}${profile.preferred_position ? ", " + profile.preferred_position : ""}` : "Perfil guardado"}>
                          ✓
                        </span>
                      ) : r.candidates.length === 0 && r.name.trim() ? (
                        <span className="shrink-0 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">nuevo</span>
                      ) : null}
                      <input
                        className="input min-w-0 flex-1 py-1.5 text-sm"
                        value={r.name}
                        onChange={(e) => editName(i, e.target.value)}
                      />
                      <select
                        className={`w-24 shrink-0 rounded-lg border px-1.5 py-1.5 text-sm ${r.isGoalkeeper ? "border-pitch-500 bg-pitch-50 font-medium text-pitch-700" : "border-gray-200 text-gray-600"}`}
                        value={r.isGoalkeeper ? "gk" : "field"}
                        onChange={(e) => toggleKeeper(i, e.target.value === "gk")}
                      >
                        <option value="field">Campo</option>
                        <option value="gk">🧤 Portero</option>
                      </select>
                      {r.splittable && (
                        <button className="shrink-0 text-xs text-pitch-600 underline" onClick={() => splitRow(i)}>
                          Separar
                        </button>
                      )}
                      <button className="shrink-0 px-1 text-red-400" onClick={() => removeRow(i)} aria-label="Eliminar">✕</button>
                    </div>

                    {/* Resolver coincidencia ambigua */}
                    {r.candidates.length > 0 && !r.frequentPlayerId && (
                      <div className="flex items-center gap-2 pl-6">
                        <span className="text-xs text-orange-500">¿Quién es?</span>
                        <select
                          className="flex-1 rounded-lg border border-orange-300 bg-orange-50 px-1.5 py-1 text-xs"
                          value=""
                          onChange={(e) => resolveCandidate(i, e.target.value || null)}
                        >
                          <option value="">Elegir…</option>
                          {r.candidates.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}{c.nickname ? ` (${c.nickname})` : ""}
                            </option>
                          ))}
                          <option value="">Es nuevo</option>
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button className="btn-ghost w-full" onClick={addRow}>+ Agregar jugador</button>
            <p className="text-center text-xs text-gray-400">
              Los conocidos reutilizan su nivel y posición. Los nuevos se guardan como perfil.
            </p>
            <Button fullWidth onClick={confirm} disabled={busy}>
              {busy ? "Guardando…" : `Confirmar ${rows.length} jugadores`}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
