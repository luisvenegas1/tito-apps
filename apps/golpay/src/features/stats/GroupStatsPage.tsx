import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { TopBar } from "@/components/ui/TopBar";
import { listFrequent } from "../players/api";
import { fetchStatsData, buildRows } from "./api";
import { playerStats, groupRankings, RankedPlayer } from "./stats";
import { topDuos, TeamAppearance } from "./combinations";
import { crc } from "@/lib/utils/format";

function Ranking({ title, rows, render }: {
  title: string;
  rows: RankedPlayer[];
  render: (p: RankedPlayer) => string;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="card">
      <div className="mb-1 text-sm font-semibold">{title}</div>
      <ol className="space-y-0.5 text-sm">
        {rows.slice(0, 5).map((p, i) => (
          <li key={p.id} className="flex justify-between">
            <Link to={`/jugador/${p.id}`} className="text-gray-700">{i + 1}. {p.name}</Link>
            <span className="text-gray-400">{render(p)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function GroupStatsPage() {
  const { data: players } = useQuery({ queryKey: ["frequent"], queryFn: listFrequent });
  const { data: data } = useQuery({ queryKey: ["statsData"], queryFn: fetchStatsData });

  if (!players || !data) return <p className="p-8 text-center text-gray-400">Cargando…</p>;

  const ranked: RankedPlayer[] = players
    .filter((p) => p.is_active)
    .map((p) => ({ id: p.id, name: p.name, stats: playerStats(buildRows(data, (mp) => mp.frequent_player_id === p.id)) }))
    .filter((r) => r.stats.invited > 0);

  const r = groupRankings(ranked);

  // Combinaciones: duplas con mejor rendimiento (mínimo de partidos juntos).
  const nameByFp = new Map(players.map((p) => [p.id, p.name]));
  const fpByMp = new Map(data.players.map((mp) => [mp.id, mp.frequent_player_id]));
  const winnerByMatch = new Map(data.results.map((res) => [res.match_id, res.winner_team_id]));
  const membersByTeam = new Map<string, string[]>();
  for (const tm of data.teamMembers) {
    const fp = fpByMp.get(tm.match_player_id) ?? null;
    if (!fp) continue;
    membersByTeam.set(tm.team_id, [...(membersByTeam.get(tm.team_id) ?? []), fp]);
  }
  const appearances: TeamAppearance[] = data.teams
    .filter((t) => winnerByMatch.has(t.match_id))
    .map((t) => ({ match_id: t.match_id, won: winnerByMatch.get(t.match_id) === t.id, members: membersByTeam.get(t.id) ?? [] }));
  const duos = topDuos(appearances, 3).slice(0, 5);

  const totalMatches = data.matches.length;
  const recaudado = data.players.filter((p) => p.payment_status === "confirmado").reduce((s, p) => s + p.amount_due, 0);
  const pendiente = data.players
    .filter((p) => ["pendiente", "reportado", "parcial"].includes(p.payment_status))
    .reduce((s, p) => s + p.amount_due, 0);

  return (
    <div className="pb-8">
      <TopBar title="Estadísticas del grupo" back backTo="/" />
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="card py-3"><div className="text-xs text-gray-400">Partidos</div><div className="text-lg font-bold">{totalMatches}</div></div>
          <div className="card py-3"><div className="text-xs text-gray-400">Recaudado</div><div className="text-lg font-bold text-pitch-600">{crc(recaudado)}</div></div>
          <div className="card py-3"><div className="text-xs text-gray-400">Pendiente</div><div className="text-lg font-bold text-red-500">{crc(pendiente)}</div></div>
        </div>

        <Ranking title="🏆 Más campeonatos" rows={r.byChampionships} render={(p) => `${p.stats.championships}`} />
        <Ranking title="⭐ Más MVPs" rows={r.byMvps} render={(p) => `${p.stats.mvps}`} />
        <Ranking title="✅ Top asistencia" rows={r.byAttendance} render={(p) => `${p.stats.attendancePct}%`} />
        <Ranking title="💚 Mejor puntualidad de pago" rows={r.byPayment} render={(p) => `${p.stats.paymentPct}%`} />
        <Ranking title="⚠️ Más pendientes" rows={r.byDebt} render={(p) => `${p.stats.pending}`} />

        {duos.length > 0 && (
          <div className="card">
            <div className="mb-1 text-sm font-semibold">🤝 Mejores duplas</div>
            <div className="mb-1 text-xs text-gray-400">Con al menos 3 partidos juntos.</div>
            <ol className="space-y-0.5 text-sm">
              {duos.map((d, i) => (
                <li key={d.a + d.b} className="flex justify-between">
                  <span className="text-gray-700">{i + 1}. {nameByFp.get(d.a) ?? "?"} + {nameByFp.get(d.b) ?? "?"}</span>
                  <span className="text-gray-400">{d.winPct}% ({d.wins}/{d.games})</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
