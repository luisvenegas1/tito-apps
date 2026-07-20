import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/ui/TopBar";
import { listMatchPlayers } from "../matches/api";
import { listFrequent } from "../players/api";
import { balanceTeams, rescore, BalancePlayer, Team, DEFAULT_LEVEL } from "@/lib/balancer/balance";
import { publishTeams } from "./api";
import { levelLabel } from "@/lib/levels";
import { recommendFormat } from "@/lib/formats";
import { Button } from "@titoapps/ui";
import { TEAM_COLORS, defaultColors, colorOf, TeamColorId } from "@/lib/teamColors";
import { teamsMessageWithTitle } from "./share";
import { copyToClipboard } from "@/components/ui/toast";
import { getMatch } from "../matches/api";
import { formatDate } from "@/lib/utils/format";

export function TeamsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: players } = useQuery({ queryKey: ["players", id], queryFn: () => listMatchPlayers(id!) });
  const { data: frequent } = useQuery({ queryKey: ["frequent"], queryFn: listFrequent });

  const [numTeams, setNumTeams] = useState(2);
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  // Color de camiseta por equipo. Se puede cambiar antes de publicar.
  const [colors, setColors] = useState<TeamColorId[]>(defaultColors(6));
  const { data: match } = useQuery({ queryKey: ["match", id], queryFn: () => getMatch(id!) });

  // Mapea jugadores del partido a BalancePlayer.
  // Portero: el valor por partido (is_goalkeeper). Nivel: del perfil vinculado.
  const balancePlayers = useMemo<BalancePlayer[]>(() => {
    if (!players) return [];
    const levelById = new Map((frequent ?? []).map((f) => [f.id, f.skill_level]));
    return players
      .filter((p) => p.attendance_status !== "declinado" && p.attendance_status !== "no_asistio")
      .map((p) => ({
        id: p.id,
        name: p.display_name,
        level: p.frequent_player_id ? levelById.get(p.frequent_player_id) ?? null : null,
        canGoalkeeper: p.is_goalkeeper,
      }));
  }, [players, frequent]);

  const keeperCount = balancePlayers.filter((p) => p.canGoalkeeper).length;
  const rec = recommendFormat(balancePlayers.length, keeperCount);

  // Precarga la recomendación una vez que hay jugadores (antes de generar).
  const [applied, setApplied] = useState(false);
  useEffect(() => {
    if (!applied && balancePlayers.length > 0 && !teams) {
      setNumTeams(rec.teams);
      setApplied(true);
    }
  }, [applied, balancePlayers.length, teams, rec.teams]);

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
      await publishTeams(id, teams, colors.slice(0, teams.length));
      setMsg("Equipos publicados. Los jugadores ya los pueden ver.");
    } catch (e: any) {
      setMsg(e.message ?? "Error");
    } finally {
      setBusy(false);
    }
  }

  async function copyForWhatsapp() {
    if (!teams) return;
    const text = teamsMessageWithTitle(
      match?.title ?? "Mejenga",
      match?.date ? formatDate(match.date) : "",
      teams.map((t, i) => ({
        color: colors[i] ?? null,
        name: `Equipo ${i + 1}`,
        players: t.players.map((p) => p.name),
      })),
    );
    const ok = await copyToClipboard(text);
    setMsg(ok ? "Equipos copiados: pegalos en el grupo." : "No se pudo copiar");
  }

  /** Evita que dos equipos queden con el mismo color: intercambia. */
  function setTeamColor(index: number, color: TeamColorId) {
    setColors((cur) => {
      const next = [...cur];
      const taken = next.indexOf(color);
      if (taken !== -1 && taken !== index) next[taken] = next[index];
      next[index] = color;
      return next;
    });
  }

  const maxTeams = Math.max(2, Math.min(6, Math.floor(balancePlayers.length / 2)));

  return (
    <div className="pb-10">
      <TopBar title="Armar equipos" back backTo={`/partido/${id}`} />
      <div className="space-y-4 p-4">
        <div className="card">
          {/* Recomendación de formato (el organizador puede sobrescribir) */}
          <div className="mb-3 rounded-xl bg-pitch-50 p-3 text-sm">
            <div className="font-semibold text-pitch-700">Recomendado: {rec.label}</div>
            <div className="text-xs text-gray-500">
              {balancePlayers.length} jugadores · {keeperCount} 🧤
              {rec.substitutesPerTeam > 0 && ` · ~${rec.substitutesPerTeam} cambio(s) por equipo`}
            </div>
            {rec.keeperWarning && <div className="mt-1 text-xs text-orange-500">{rec.keeperWarning}</div>}
            {numTeams !== rec.teams && (
              <button className="mt-1 text-xs text-pitch-600 underline" onClick={() => setNumTeams(rec.teams)}>
                Usar recomendación ({rec.teams} equipos)
              </button>
            )}
          </div>
          <label className="label">¿Cuántos equipos? (podés cambiarlo)</label>
          <div className="flex gap-2">
            {Array.from({ length: maxTeams - 1 }, (_, i) => i + 2).map((n) => (
              <button key={n} onClick={() => setNumTeams(n)}
                className={`btn flex-1 ${numTeams === n ? "bg-pitch-500 text-white" : "bg-gray-100 text-gray-600"}`}>
                {n}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Sin nivel registrado usan {levelLabel(DEFAULT_LEVEL)}.
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
                  <div className="mb-1 flex items-center justify-between">
                    <span className={`font-bold ${colorOf(colors[ti])?.text ?? "text-pitch-600"}`}>
                      {colorOf(colors[ti])?.label ?? `Equipo ${ti + 1}`}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">nivel {t.score}</span>
                  </div>
                  {/* Color de camiseta: cambia según lo que lleven ese día. */}
                  <div className="mb-2 flex flex-wrap gap-1">
                    {TEAM_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        title={c.label}
                        aria-label={c.label}
                        onClick={() => setTeamColor(ti, c.id)}
                        className={`h-5 w-5 rounded-full ${c.dot} ${
                          colors[ti] === c.id ? "ring-2 ring-pitch-500 ring-offset-1" : "opacity-60"
                        }`}
                      />
                    ))}
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

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={publish} disabled={busy}>
                {busy ? "Publicando…" : "Publicar equipos"}
              </Button>
              <button className="btn-ghost" onClick={copyForWhatsapp}>📋 Copiar para WhatsApp</button>
            </div>
            {msg && <p className="text-center text-sm text-pitch-600">{msg}</p>}
          </>
        )}
      </div>
    </div>
  );
}
