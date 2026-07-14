import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/ui/TopBar";
import { listMatchPlayers } from "../matches/api";
import { listFrequent } from "../players/api";
import { balanceTeams, rescore, BalancePlayer, Team, DEFAULT_LEVEL } from "@/lib/balancer/balance";
import { publishTeams } from "./api";
import { levelLabel } from "@/lib/levels";
import { Button } from "@titoapps/ui";

export function TeamsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: players } = useQuery({ queryKey: ["players", id], queryFn: () => listMatchPlayers(id!) });
  const { data: frequent } = useQuery({ queryKey: ["frequent"], queryFn: listFrequent });

  const [numTeams, setNumTeams] = useState(2);
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Mapea jugadores del partido a BalancePlayer.
  // Portero: el valor por partido (is_goalkeeper). Nivel: del perfil vinculado.
  const balancePlayers = useMemo<BalancePlayer[]>(() => {
    if (!players) return [];
    const levelById = new Map((frequent ?? []).map((f) => [f.id, f.skill_level]));
    return players
      .filter((p) => p.payment_status !== "no_asistio")
      .map((p) => ({
        id: p.id,
        name: p.display_name,
        level: p.frequent_player_id ? levelById.get(p.frequent_player_id) ?? null : null,
        canGoalkeeper: p.is_goalkeeper,
      }));
  }, [players, frequent]);

  function generate() {
    setTeams(balanceTeams(balancePlayers, numTeams));
  }

  function move(playerId: string, toTeam: number) {
    setTeams((ts) => {
      if (!ts) return ts;
      let moved: BalancePlayer | undefined;
      const cleared = ts.map((t) => {
        const found = t.players.find((p) => p.id === playerId);
        if (found) moved = found;
        return { ...t, players: t.players.filter((p) => p.id !== playerId) };
      });
      if (moved) cleared[toTeam].players.push(moved);
      return rescore(cleared);
    });
  }

  async function publish() {
    if (!teams || !id) return;
    setBusy(true);
    try {
      await publishTeams(id, teams);
      setMsg("Equipos publicados. Los jugadores ya los pueden ver.");
    } catch (e: any) {
      setMsg(e.message ?? "Error");
    } finally {
      setBusy(false);
    }
  }

  const maxTeams = Math.max(2, Math.min(6, Math.floor(balancePlayers.length / 2)));

  return (
    <div className="pb-10">
      <TopBar title="Armar equipos" back />
      <div className="space-y-4 p-4">
        <div className="card">
          <label className="label">¿Cuántos equipos?</label>
          <div className="flex gap-2">
            {Array.from({ length: maxTeams - 1 }, (_, i) => i + 2).map((n) => (
              <button key={n} onClick={() => setNumTeams(n)}
                className={`btn flex-1 ${numTeams === n ? "bg-pitch-500 text-white" : "bg-gray-100 text-gray-600"}`}>
                {n}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            {balancePlayers.length} jugadores. Los que no tienen nivel registrado usan nivel {levelLabel(DEFAULT_LEVEL)}.
          </p>
          <Button fullWidth className="mt-3" onClick={generate} disabled={balancePlayers.length < numTeams}>
            {teams ? "Regenerar" : "Generar equipos"}
          </Button>
        </div>

        {teams && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {teams.map((t, ti) => (
                <div key={ti} className="card">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-bold text-pitch-600">Equipo {ti + 1}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">nivel {t.score}</span>
                  </div>
                  <ul className="space-y-1">
                    {t.players.map((p) => (
                      <li key={p.id} className="flex items-center justify-between text-sm">
                        <span>{p.name}{p.canGoalkeeper && " 🧤"}</span>
                        <select
                          className="rounded border border-gray-200 text-xs"
                          value={ti}
                          onChange={(e) => move(p.id, Number(e.target.value))}
                        >
                          {teams.map((_, idx) => <option key={idx} value={idx}>E{idx + 1}</option>)}
                        </select>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <Button fullWidth onClick={publish} disabled={busy}>
              {busy ? "Publicando…" : "Publicar equipos"}
            </Button>
            {msg && <p className="text-center text-sm text-pitch-600">{msg}</p>}
          </>
        )}
      </div>
    </div>
  );
}
