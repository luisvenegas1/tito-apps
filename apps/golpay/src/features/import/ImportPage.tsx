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

interface Row {
  name: string;
  splittable: boolean;
  suggestions?: string[];
  isGoalkeeper: boolean;
  frequentPlayerId: string | null;
  known: boolean; // ya existía en la BD
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

  /** Empareja un nombre con un perfil; devuelve el perfil si hay match confiable. */
  function matchProfile(name: string): FrequentPlayer | null {
    if (!frequent) return null;
    const lower = name.toLowerCase().trim();
    const exact = frequent.find(
      (f) => f.name.toLowerCase() === lower || (f.nickname ?? "").toLowerCase() === lower,
    );
    if (exact) return exact;
    const suggestions = suggestMatches(name, frequent);
    return suggestions.length === 1 ? suggestions[0] : null;
  }

  function buildRow(name: string, gk: boolean, splittable = false, suggestions?: string[]): Row {
    const profile = matchProfile(name);
    return {
      name,
      splittable,
      suggestions,
      // El guante detectado manda; si no, el valor "de siempre" del perfil.
      isGoalkeeper: gk || (profile?.can_be_goalkeeper ?? false),
      frequentPlayerId: profile?.id ?? null,
      known: Boolean(profile),
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

  return (
    <div className="pb-8">
      <TopBar title="Importar jugadores" back />
      <div className="space-y-4 p-4">
        {!rows && (
          <>
            <p className="text-sm text-gray-500">
              Pegá la lista de WhatsApp. Detectamos nombres, ignoramos números y emojis,
              y marcamos como portero a quien tenga el 🧤.
            </p>
            <textarea
              className="input font-mono text-sm"
              rows={10}
              placeholder={"Lunes 8 pm\n1. Chepe\n2. Gera🧤\n3. Roger 🧤"}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button className="btn-primary w-full" onClick={preview} disabled={!text.trim()}>
              Ver vista previa
            </button>
          </>
        )}

        {rows && (
          <>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{rows.length} jugadores · {keeperCount} 🧤</span>
              <button className="text-pitch-600 underline" onClick={() => setRows(null)}>
                Volver a pegar
              </button>
            </div>

            <div className="space-y-1.5">
              {rows.map((r, i) => (
                <div key={i} className="card flex items-center gap-2 px-2.5 py-2">
                  {r.known && (
                    <span className="text-sm text-pitch-500" title="Perfil guardado">✓</span>
                  )}
                  <input
                    className="input min-w-0 flex-1 py-1.5 text-sm"
                    value={r.name}
                    onChange={(e) => editName(i, e.target.value)}
                  />
                  {/* Dropdown compacto Portero / Campo, pre-cargado */}
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
              ))}
            </div>

            <button className="btn-ghost w-full" onClick={addRow}>+ Agregar jugador</button>
            <p className="text-center text-xs text-gray-400">
              Los jugadores nuevos se guardan como perfil para la próxima vez.
            </p>
            <button className="btn-primary w-full" onClick={confirm} disabled={busy}>
              {busy ? "Guardando…" : `Confirmar ${rows.length} jugadores`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
