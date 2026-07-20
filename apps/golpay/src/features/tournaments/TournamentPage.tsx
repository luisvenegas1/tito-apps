import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/ui/TopBar";
import { listPublishedTeams } from "../teams/api";
import { listGames, createGame, deleteGame } from "./api";
import { computeStandings } from "./standings";
import { Button } from "@titoapps/ui";
import { teamLabel } from "@/lib/teamColors";

export function TournamentPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: teams } = useQuery({ queryKey: ["pubteams", id], queryFn: () => listPublishedTeams(id!) });
  const { data: games } = useQuery({ queryKey: ["games", id], queryFn: () => listGames(id!) });

  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [hs, setHs] = useState(0);
  const [as, setAs] = useState(0);

  const refresh = () => qc.invalidateQueries({ queryKey: ["games", id] });

  async function add() {
    if (!home || !away || home === away) return;
    await createGame(id!, { home_team_id: home, away_team_id: away, home_score: hs, away_score: as });
    setHome(""); setAway(""); setHs(0); setAs(0);
    refresh();
  }

  if (!teams) return <p className="p-8 text-center text-gray-400">Cargando…</p>;
  if (teams.length < 2) {
    return (
      <div><TopBar title="Minitorneo" back backTo={`/partido/${id}`} />
        <p className="p-8 text-center text-gray-500">Publicá al menos 2 equipos para armar el minitorneo.</p>
      </div>
    );
  }

  const nameById = new Map(teams.map((t) => [t.id, teamLabel(t.color, t.name)]));
  const table = computeStandings(games ?? [], teams.map((t) => ({ ...t, name: teamLabel(t.color, t.name) })));

  return (
    <div className="pb-8">
      <TopBar title="Minitorneo" back backTo={`/partido/${id}`} />
      <div className="space-y-4 p-4">
        {/* Tabla de posiciones */}
        <div className="card">
          <div className="mb-2 font-semibold">Tabla de posiciones</div>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-400">
              <tr><th className="text-left">Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>DG</th><th>Pts</th></tr>
            </thead>
            <tbody>
              {table.map((r) => (
                <tr key={r.teamId} className="border-t border-gray-100">
                  <td className="py-1 text-left font-medium">{r.teamName}</td>
                  <td className="text-center">{r.played}</td>
                  <td className="text-center">{r.wins}</td>
                  <td className="text-center">{r.draws}</td>
                  <td className="text-center">{r.losses}</td>
                  <td className="text-center">{r.goalDiff}</td>
                  <td className="text-center font-bold">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cargar juego */}
        <div className="card space-y-2">
          <div className="font-semibold">Cargar juego</div>
          <div className="flex items-center gap-2">
            <select className="input py-1.5" value={home} onChange={(e) => setHome(e.target.value)}>
              <option value="">Local</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{teamLabel(t.color, t.name)}</option>)}
            </select>
            <input className="input w-14 py-1.5 text-center" type="number" min={0} value={hs} onChange={(e) => setHs(Number(e.target.value))} />
            <span>-</span>
            <input className="input w-14 py-1.5 text-center" type="number" min={0} value={as} onChange={(e) => setAs(Number(e.target.value))} />
            <select className="input py-1.5" value={away} onChange={(e) => setAway(e.target.value)}>
              <option value="">Visita</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{teamLabel(t.color, t.name)}</option>)}
            </select>
          </div>
          <Button fullWidth onClick={add} disabled={!home || !away || home === away}>Agregar juego</Button>
        </div>

        {/* Juegos */}
        <div className="space-y-1.5">
          {(games ?? []).map((g) => (
            <div key={g.id} className="card flex items-center justify-between py-2 text-sm">
              <span>{nameById.get(g.home_team_id)} {g.home_score} - {g.away_score} {nameById.get(g.away_team_id)}</span>
              <button className="text-red-400" onClick={async () => { await deleteGame(g.id); refresh(); }}>✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
