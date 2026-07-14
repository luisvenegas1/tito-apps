import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/ui/TopBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { copyToClipboard } from "@/components/ui/toast";
import {
  getMatch, listMatchPlayers, setPaymentStatus, updatePlayer, removePlayer, setMatchPin, deleteMatch,
} from "./api";
import { useAuth } from "../auth/AuthProvider";
import { crc, formatDate, formatTime, generatePin } from "@/lib/utils/format";
import { computeTotals, pendingMessage, summaryMessage, inviteMessage } from "../payments/messages";
import type { MatchPlayer, PaymentStatus } from "@/lib/supabase/types";
import { Button } from "@titoapps/ui";

const ORDER: Record<PaymentStatus, number> = {
  pendiente: 0, reportado: 1, parcial: 2, confirmado: 3, exonerado: 4, no_asistio: 5,
};

export function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { session } = useAuth();
  const [toast, setToast] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);

  const { data: match } = useQuery({ queryKey: ["match", id], queryFn: () => getMatch(id!) });
  const { data: players } = useQuery({ queryKey: ["players", id], queryFn: () => listMatchPlayers(id!) });

  if (!match || !players) return <p className="p-8 text-gray-400">Cargando…</p>;

  const totals = computeTotals(players);
  const sorted = [...players].sort(
    (a, b) => ORDER[a.payment_status] - ORDER[b.payment_status] || a.display_name.localeCompare(b.display_name),
  );

  const refresh = () => qc.invalidateQueries({ queryKey: ["players", id] });

  async function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }

  async function change(p: MatchPlayer, status: PaymentStatus) {
    if (!session) return;
    await setPaymentStatus(p, status, session.user.id);
    refresh();
  }

  function reportedAtLabel(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${d.toLocaleDateString("es-CR", { day: "numeric", month: "short" })} · ${formatTime(`${hh}:${mm}`)}`;
  }

  async function copy(text: string, label: string) {
    const ok = await copyToClipboard(text);
    flash(ok ? `${label} copiado` : "No se pudo copiar");
  }

  const publicUrl = `${window.location.origin}/j/${match.public_token}`;

  async function share() {
    if (!match) return;
    const newPin = generatePin();
    await setMatchPin(match.id, newPin);
    setPin(newPin);
    const msg = inviteMessage(match, publicUrl, newPin);
    await copyToClipboard(msg);
    flash(`Enlace + PIN ${newPin} copiado`);
  }

  return (
    <div className="pb-8">
      <TopBar
        title={match.title}
        back
        right={
          <Link to={`/partido/${match.id}/editar`} className="text-sm text-gray-400 underline">Editar</Link>
        }
      />

      <div className="space-y-4 p-4">
        <div className="card">
          <div className="text-sm text-gray-500">
            {formatDate(match.date)} {match.time && `· ${formatTime(match.time)}`}
            {match.location && ` · ${match.location}`}
          </div>
          <div className="mt-1 text-sm">
            {match.type === "mejenga" ? "Mejenga" : "Torneo"} · {crc(match.cost_per_player)} por jugador
          </div>
        </div>

        {/* Totales */}
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Confirmado" value={crc(totals.collected)} tone="green" />
          <Stat label="Pendiente" value={crc(totals.remaining)} tone="red" />
          <Stat label="Esperado" value={crc(totals.expected)} />
          <Stat label="Jugadores" value={`${totals.confirmed}/${totals.total} ✔`} />
        </div>

        {/* Bandeja de aprobación de pagos reportados */}
        {(() => {
          const reported = players.filter((p) => p.payment_status === "reportado");
          if (reported.length === 0) return null;
          return (
            <div className="card border-l-4 border-yellow-400">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-yellow-400 px-1.5 text-sm text-white">
                  {reported.length}
                </span>
                Pendientes de aprobar
              </div>
              <div className="space-y-2">
                {reported.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 border-t border-gray-100 pt-2 first:border-0 first:pt-0">
                    <div className="min-w-0">
                      <div className="font-medium">{p.display_name}</div>
                      <div className="text-xs text-gray-400">
                        {crc(p.amount_due)}
                        {p.reported_at && ` · ${reportedAtLabel(p.reported_at)}`}
                        {p.payment_method && ` · ${p.payment_method}`}
                      </div>
                      {p.note && <div className="text-xs text-gray-400">“{p.note}”</div>}
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button className="rounded-lg bg-pitch-500 px-3 py-1.5 text-sm font-medium text-white" onClick={() => change(p, "confirmado")}>
                        Aprobar
                      </button>
                      <button className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600" onClick={() => change(p, "pendiente")}>
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Acciones */}
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={share}>Compartir enlace + PIN</Button>
          <Link to={`/partido/${match.id}/importar`} className="btn-ghost">+ Importar</Link>
          <button className="btn-ghost" onClick={() => copy(pendingMessage(match, players), "Pendientes")}>Copiar pendientes</button>
          <button className="btn-ghost" onClick={() => copy(summaryMessage(players), "Resumen")}>Copiar resumen</button>
          <Link to={`/partido/${match.id}/equipos`} className="btn-ghost col-span-2 text-center">⚖️ Armar equipos</Link>
        </div>

        {pin && (
          <div className="card bg-pitch-50 text-sm">
            PIN del partido: <span className="font-bold tracking-widest">{pin}</span> — compartilo junto al enlace.
          </div>
        )}

        {/* Lista de jugadores */}
        <div className="space-y-2">
          {sorted.map((p) => (
            <PlayerRow key={p.id} player={p} amountLabel={crc(p.amount_due)} onChange={change}
              onRemove={async () => { await removePlayer(p.id); refresh(); }}
              onAmount={async (v) => { await updatePlayer(p.id, { amount_due: v }); refresh(); }}
            />
          ))}
          {players.length === 0 && (
            <div className="card text-center text-gray-500">
              Sin jugadores. <Link to={`/partido/${match.id}/importar`} className="text-pitch-600 underline">Importá la lista</Link>.
            </div>
          )}
        </div>

        <button
          className="mt-6 w-full text-center text-sm text-red-400 underline"
          onClick={async () => {
            if (confirm("¿Eliminar este partido?")) { await deleteMatch(match.id); nav("/"); }
          }}
        >
          Eliminar partido
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  const color = tone === "green" ? "text-pitch-600" : tone === "red" ? "text-red-500" : "text-gray-900";
  return (
    <div className="card py-3">
      <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

function PlayerRow({
  player, amountLabel, onChange, onRemove, onAmount,
}: {
  player: MatchPlayer;
  amountLabel: string;
  onChange: (p: MatchPlayer, s: PaymentStatus) => void;
  onRemove: () => void;
  onAmount: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card">
      <div className="flex items-center justify-between" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-3">
          <StatusBadge status={player.payment_status} />
          <span className="font-medium">
            {player.display_name}
            {player.is_goalkeeper && <span title="Portero"> 🧤</span>}
          </span>
        </div>
        <span className="text-sm text-gray-400">{amountLabel}</span>
      </div>

      {open && (
        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          <div className="flex flex-wrap gap-1.5">
            <Act label="Confirmar" onClick={() => onChange(player, "confirmado")} primary />
            <Act label="Pendiente" onClick={() => onChange(player, "pendiente")} />
            <Act label="Parcial" onClick={() => onChange(player, "parcial")} />
            <Act label="Invitado" onClick={() => onChange(player, "exonerado")} />
            <Act label="No asistió" onClick={() => onChange(player, "no_asistio")} />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              defaultValue={player.amount_due}
              className="input py-1.5"
              onBlur={(e) => onAmount(Number(e.target.value))}
            />
            <button className="px-2 text-sm text-red-400" onClick={onRemove}>Quitar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Act({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1 text-xs font-medium ${primary ? "bg-pitch-500 text-white" : "bg-gray-100 text-gray-700"}`}
    >
      {label}
    </button>
  );
}
