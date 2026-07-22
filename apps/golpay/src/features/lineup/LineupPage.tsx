import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/ui/TopBar";
import { getMatch, listMatchPlayers } from "../matches/api";
import { listFrequent } from "../players/api";
import { fetchStatsData, buildRows } from "../stats/api";
import { playerStats, reliabilityScore } from "../stats/stats";
import { FORMATIONS, suggestLineup, LineupPlayer, Line } from "@/lib/formations";
import { copyToClipboard } from "@/components/ui/toast";
import { shareToWhatsapp } from "../share/share";
import { formatDate } from "@/lib/utils/format";
import { useGroupId } from "@/features/groups/useGroup";
import { Button } from "@titoapps/ui";

const LINE_LABEL: Record<Line, string> = {
  portero: "Portero", defensa: "Defensa", medio: "Medio", delantero: "Delantero",
};
const LINE_EMOJI: Record<Line, string> = {
  portero: "🧤", defensa: "🛡️", medio: "⚙️", delantero: "⚽",
};

export function LineupPage() {
  const { id } = useParams<{ id: string }>();
  const gid = useGroupId();
  const [formationId, setFormationId] = useState("442");
  const [toast, setToast] = useState<string | null>(null);

  const { data: match } = useQuery({ queryKey: ["match", id], queryFn: () => getMatch(id!) });
  const { data: players } = useQuery({ queryKey: ["players", id], queryFn: () => listMatchPlayers(id!) });
  const { data: frequent } = useQuery({ queryKey: ["frequent", gid], queryFn: () => listFrequent(gid) });
  const { data: statsData } = useQuery({ queryKey: ["statsData", gid], queryFn: () => fetchStatsData(gid) });

  const formation = FORMATIONS.find((f) => f.id === formationId)!;

  // Jugadores del partido → LineupPlayer con posición del perfil y responsabilidad.
  const lineupPlayers = useMemo<LineupPlayer[]>(() => {
    if (!players) return [];
    const fpById = new Map((frequent ?? []).map((f) => [f.id, f]));
    return players
      .filter((p) => p.attendance_status !== "declinado" && p.attendance_status !== "no_asistio")
      .map((p) => {
        const fp = p.frequent_player_id ? fpById.get(p.frequent_player_id) : undefined;
        let reliability = 50; // sin historial, neutro
        if (fp && statsData) {
          const s = playerStats(buildRows(statsData, (mp) => mp.frequent_player_id === fp.id));
          reliability = reliabilityScore(s.attendancePct, s.paymentPct).score;
        }
        return {
          id: p.id,
          name: p.display_name,
          preferred: (fp?.preferred_position ?? null) as Line | null,
          reliability,
          canGoalkeeper: p.is_goalkeeper || (fp?.can_be_goalkeeper ?? false),
        };
      });
  }, [players, frequent, statsData]);

  const lineup = useMemo(() => suggestLineup(lineupPlayers, formation), [lineupPlayers, formation]);

  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 1800); }

  function lineupText(): string {
    const titulares = lineup.slots
      .map((s) => `${LINE_EMOJI[s.line]} ${s.player ? s.player.name : "—"}`)
      .join("\n");
    const banca = lineup.bench.length ? `\n\nBanca: ${lineup.bench.map((p) => p.name).join(", ")}` : "";
    return `📋 ${match?.title ?? "Alineación"}${match?.date ? " · " + formatDate(match.date) : ""}\nFormación ${formation.label}\n\n${titulares}${banca}`;
  }

  return (
    <div className="pb-8">
      <TopBar title="Alineación" back backTo={`/g/${gid}/partido/${id}`} />
      <div className="space-y-4 p-4">
        <div className="card">
          <label className="label">Formación</label>
          <div className="grid grid-cols-3 gap-2">
            {FORMATIONS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFormationId(f.id)}
                className={`btn py-2 text-sm ${formationId === f.id ? "bg-pitch-500 text-white" : "bg-gray-100 text-gray-600"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Sugerencia por responsabilidad (asistencia y pago) y posición del perfil. Ajustá a gusto en la cancha.
          </p>
        </div>

        {lineupPlayers.length === 0 ? (
          <div className="card text-center text-gray-500">
            Importá la lista del torneo para ver la alineación sugerida.
          </div>
        ) : (
          <>
            {(["portero", "defensa", "medio", "delantero"] as Line[]).map((line) => {
              const slots = lineup.slots.filter((s) => s.line === line);
              if (slots.length === 0) return null;
              return (
                <div key={line} className="card">
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {LINE_EMOJI[line]} {LINE_LABEL[line]}
                  </div>
                  <div className="space-y-1">
                    {slots.map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className={s.player ? "font-medium" : "text-orange-400"}>
                          {s.player ? s.player.name : "Falta jugador"}
                        </span>
                        {s.player && (
                          <span className="text-xs text-gray-400">
                            {s.player.preferred && s.player.preferred !== line ? "otra posición · " : ""}
                            resp. {s.player.reliability}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {lineup.bench.length > 0 && (
              <div className="card">
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Banca</div>
                <div className="text-sm text-gray-600">{lineup.bench.map((p) => p.name).join(", ")}</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button className="btn-ghost" onClick={async () => { await copyToClipboard(lineupText()); flash("Alineación copiada"); }}>
                📋 Copiar
              </button>
              <Button onClick={() => shareToWhatsapp(lineupText())}>📤 WhatsApp</Button>
            </div>
          </>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
