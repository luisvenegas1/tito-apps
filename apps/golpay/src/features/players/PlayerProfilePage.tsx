import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/ui/TopBar";
import { listFrequent, updateFrequent } from "./api";
import { fetchStatsData, buildRows } from "../stats/api";
import { playerStats, reliabilityScore, suggestLevel } from "../stats/stats";
import { playerBalance, BalanceRow } from "../payments/balances";
import { playerDebtMessage } from "../payments/collection";
import { useAuth } from "../auth/AuthProvider";
import { copyToClipboard } from "@/components/ui/toast";
import { levelLabel } from "@/lib/levels";
import { crc, formatDate } from "@/lib/utils/format";
import { Button } from "@titoapps/ui";

const DAYS = [
  ["lun", "L"], ["mar", "M"], ["mie", "M"], ["jue", "J"], ["vie", "V"], ["sab", "S"], ["dom", "D"],
] as const;

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card py-3">
      <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

export function PlayerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { profile } = useAuth();
  const { data: players } = useQuery({ queryKey: ["frequent"], queryFn: listFrequent });
  const { data: statsData } = useQuery({ queryKey: ["statsData"], queryFn: fetchStatsData });

  const player = (players ?? []).find((p) => p.id === id);
  if (!player || !statsData) return <p className="p-8 text-center text-gray-400">Cargando…</p>;

  const rows = buildRows(statsData, (mp) => mp.frequent_player_id === id);
  const s = playerStats(rows);
  const rel = reliabilityScore(s.attendancePct, s.paymentPct);
  const suggestion = suggestLevel(player.skill_level, s);

  const matchById = new Map(statsData.matches.map((m) => [m.id, m]));
  const balRows: BalanceRow[] = statsData.players
    .filter((mp) => mp.frequent_player_id === id)
    .map((mp) => {
      const m = matchById.get(mp.match_id);
      return {
        match_id: mp.match_id,
        label: `${m?.title ?? ""}${m?.date ? " " + formatDate(m.date) : ""}`.trim(),
        amount_due: mp.amount_due, amount_paid: mp.amount_paid, payment_status: mp.payment_status,
      };
    });
  const bal = playerBalance(balRows);

  async function applySuggestion(level: number) {
    await updateFrequent(player!.id, { skill_level: level });
    qc.invalidateQueries({ queryKey: ["frequent"] });
  }

  return (
    <div className="pb-8">
      <TopBar title={player.name} back backTo="/frecuentes" />
      <div className="space-y-4 p-4">
        <div className="card">
          <div className="text-lg font-bold">
            {player.name}{player.nickname && ` (${player.nickname})`}
            {player.can_be_goalkeeper && " 🧤"}
          </div>
          <div className="text-sm text-gray-500">
            {levelLabel(player.skill_level)} · {player.preferred_position ?? "sin posición"}
          </div>
          {player.available_days.length > 0 && (
            <div className="mt-1 text-xs text-gray-400">
              Disponible: {player.available_days.join(", ")}
            </div>
          )}
          {player.notes && <p className="mt-2 text-sm text-gray-500">“{player.notes}”</p>}
          {/* Rating de confiabilidad (privado del organizador) */}
          <div className="mt-3 rounded-xl bg-pitch-50 p-2 text-sm">
            <span className="font-semibold text-pitch-700">Confiabilidad: {rel.score}/100 · {rel.label}</span>
            <div className="text-xs text-gray-500">{rel.explanation}</div>
          </div>
        </div>

        {bal.debt > 0 && (
          <div className="card border-l-4 border-red-400">
            <div className="font-semibold">Estado de cuenta</div>
            <div className="text-sm text-gray-600">Debe <b>{crc(bal.debt)}</b> de {bal.unpaid.length} fecha(s).</div>
            <ul className="mt-1 text-xs text-gray-400">
              {bal.unpaid.map((u, i) => <li key={i}>{u.label}: {crc(u.amount)}</li>)}
            </ul>
            <Button size="sm" className="mt-2" onClick={() => {
              const sinpe = profile?.sinpe_number ? { number: profile.sinpe_number, name: profile.sinpe_name } : null;
              copyToClipboard(playerDebtMessage(player.name, bal.unpaid, bal.debt, crc, sinpe));
            }}>Copiar cobranza</Button>
          </div>
        )}

        {suggestion && (
          <div className="card border-l-4 border-yellow-400">
            <div className="text-sm font-semibold">Sugerencia de nivel</div>
            <div className="text-xs text-gray-500">
              Considerá subir a <b>{levelLabel(suggestion.level)}</b>. {suggestion.reason}
            </div>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => applySuggestion(suggestion.level)}>Subir nivel</Button>
              <Button size="sm" variant="ghost" onClick={() => { /* ignorar: no persiste */ }}>Ignorar</Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Jugados" value={s.played} />
          <Stat label="Asistencia" value={`${s.attendancePct}%`} />
          <Stat label="Racha" value={s.currentStreak} />
          <Stat label="Ausencias" value={s.absences} />
          <Stat label="Pago" value={`${s.paymentPct}%`} />
          <Stat label="Pendientes" value={s.pending} />
          <Stat label="Campeón" value={`🏆 ${s.championships}`} />
          <Stat label="MVP" value={`⭐ ${s.mvps}`} />
          <Stat label="Última" value={s.lastPlayed ? formatDate(s.lastPlayed) : "—"} />
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-500">Historial reciente</h2>
          <div className="space-y-1.5">
            {rows.slice(0, 15).map((r) => (
              <div key={r.match_id} className="card flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium">{formatDate(r.date)}</div>
                  <div className="text-xs text-gray-400">
                    {r.team_name ?? "sin equipo"} · {r.attendance_status} · {r.payment_status}
                  </div>
                </div>
                <div className="flex gap-1 text-sm">
                  {r.is_champion && <span title="Campeón">🏆</span>}
                  {r.is_mvp && <span title="MVP">⭐</span>}
                </div>
              </div>
            ))}
            {rows.length === 0 && <div className="card text-center text-gray-400">Sin partidos aún.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export { DAYS };
