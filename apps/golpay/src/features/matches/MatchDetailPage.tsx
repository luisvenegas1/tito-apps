import { useState, useMemo, useRef, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/ui/TopBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { copyToClipboard } from "@/components/ui/toast";
import {
  getMatch, listMatchPlayers, setPaymentStatus, updatePlayer, removePlayer, deleteMatch,
  setAttendance, setListClosed, getResult, saveResult, getProofUrl, recalcDivided,
} from "./api";
import { listPublishedTeams } from "../teams/api";
import { listGames } from "../tournaments/api";
import { computeStandings, championId } from "../tournaments/standings";
import { UnratedPlayersCard } from "../players/UnratedPlayersCard";
import { useDialog } from "@/components/ui/Dialog";
import { useAuth } from "../auth/AuthProvider";
import { crc, formatDate, formatTime } from "@/lib/utils/format";
import { perHead } from "@/lib/money";
import { computeTotals, pendingMessage, summaryMessage, inviteMessage } from "../payments/messages";
import { attendanceCounts, spotsLeft } from "../attendance/attendance";
import { matchSummary, shareToWhatsapp } from "../share/share";
import type { Match, MatchPlayer, PaymentStatus, AttendanceStatus } from "@/lib/supabase/types";
import { Button } from "@titoapps/ui";
import { teamLabel } from "@/lib/teamColors";
import { useGroupId } from "@/features/groups/useGroup";

const ORDER: Record<PaymentStatus, number> = {
  pendiente: 0, reportado: 1, parcial: 2, confirmado: 3, exonerado: 4, no_asistio: 5,
};

export function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const gid = useGroupId();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { session } = useAuth();
  const [toast, setToast] = useState<string | null>(null);
  const dialog = useDialog();

  const { data: match } = useQuery({ queryKey: ["match", id], queryFn: () => getMatch(id!) });
  const { data: players } = useQuery({ queryKey: ["players", id], queryFn: () => listMatchPlayers(id!) });

  if (!match || !players) return <p className="p-8 text-gray-400">Cargando…</p>;

  const totals = computeTotals(players);
  const activePlayers = players.filter(
    (p) => p.attendance_status !== "declinado" && p.attendance_status !== "no_asistio",
  );
  const perHeadNow = perHead(match.cost_mode, {
    costPerPlayer: match.cost_per_player,
    totalAmount: match.total_amount ?? 0,
    playerCount: activePlayers.length,
  });
  const isFree = match.cost_mode === "gratis";
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

  async function viewProof(path: string) {
    const url = await getProofUrl(path);
    if (url) window.open(url, "_blank");
    else flash("No se pudo abrir el comprobante");
  }

  async function reject(p: MatchPlayer) {
    const reason = await dialog.prompt({
      title: `Rechazar el pago de ${p.display_name}`,
      message: "Podés dejar un motivo para que el jugador sepa qué pasó.",
      placeholder: "Ej.: el comprobante no coincide",
      confirmLabel: "Rechazar",
      danger: true,
    });
    if (reason === null) return; // canceló
    if (reason.trim()) await updatePlayer(p.id, { note: reason.trim() });
    await change(p, "pendiente");
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
    await copyToClipboard(inviteMessage(match, publicUrl));
    flash("Enlace copiado");
  }

  return (
    <div className="pb-8">
      <TopBar
        title={match.title}
        back
        backTo={`/g/${gid}`}
        right={
          <Link to={`/g/${gid}/partido/${match.id}/editar`} className="text-sm text-gray-400 underline">Editar</Link>
        }
      />

      <div className="space-y-4 p-4">
        <div className="card">
          <div className="text-sm text-gray-500">
            {formatDate(match.date)} {match.time && `· ${formatTime(match.time)}`}
            {match.location && ` · ${match.location}`}
          </div>
          <div className="mt-1 text-sm">
            {match.type === "mejenga" ? "Mejenga" : "Torneo"}
            {match.cost_mode === "gratis" && " · Sin cobro"}
            {match.cost_mode === "fijo" && ` · ${crc(match.cost_per_player)} por jugador`}
            {match.cost_mode === "dividido" && (
              <> · {crc(match.total_amount ?? 0)} ÷ {activePlayers.length} = <b>{crc(perHeadNow)}</b> c/u</>
            )}
          </div>
        </div>

        {/* Totales de pago (no aplica si es gratis) */}
        {!isFree && (
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Confirmado" value={crc(totals.collected)} tone="green" />
            <Stat label="Pendiente" value={crc(totals.remaining)} tone="red" />
            <Stat label="Esperado" value={crc(totals.expected)} />
            <Stat label="Jugadores" value={`${totals.confirmed}/${totals.total} ✔`} />
          </div>
        )}

        {/* Reparto del total (modo dividido) */}
        {match.cost_mode === "dividido" && (
          <div className="card flex items-center justify-between text-sm">
            <span>
              {crc(match.total_amount ?? 0)} entre {activePlayers.length} → <b>{crc(perHeadNow)}</b> c/u
            </span>
            <button
              className="text-pitch-600 underline"
              onClick={async () => { await recalcDivided(match.id); refresh(); flash("Reparto actualizado"); }}
            >
              Recalcular
            </button>
          </div>
        )}

        {/* Bandeja de aprobación de pagos reportados */}
        {!isFree && (() => {
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
                      {p.payment_proof_path && (
                        <button className="text-xs text-pitch-600 underline" onClick={() => viewProof(p.payment_proof_path!)}>
                          📎 ver comprobante
                        </button>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button className="rounded-lg bg-pitch-500 px-3 py-1.5 text-sm font-medium text-white" onClick={() => change(p, "confirmado")}>
                        Aprobar
                      </button>
                      <button className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600" onClick={() => reject(p)}>
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Nivel solo importa para mejenga (equipos parejos). En torneo no. */}
        {match.type === "mejenga" && <UnratedPlayersCard players={players} />}

        {/* Asistencia + resultado */}
        <AttendanceAndResult match={match} players={players} onChange={refresh} gid={gid} />

        {/* Acciones */}
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={share}>Compartir enlace</Button>
          <Link to={`/g/${gid}/partido/${match.id}/importar`} className="btn-ghost">+ Importar</Link>
          {!isFree && (
            <>
              <button className="btn-ghost" onClick={() => copy(pendingMessage(match, players), "Pendientes")}>Copiar pendientes</button>
              <button className="btn-ghost" onClick={() => copy(summaryMessage(players), "Resumen")}>Copiar resumen</button>
            </>
          )}
          {match.type === "torneo" ? (
            <Link to={`/g/${gid}/partido/${match.id}/alineacion`} className="btn-ghost col-span-2 text-center">📋 Alineación</Link>
          ) : (
            <Link to={`/g/${gid}/partido/${match.id}/equipos`} className="btn-ghost col-span-2 text-center">⚖️ Armar equipos</Link>
          )}
        </div>

        {/* Lista de jugadores */}
        <div className="space-y-2">
          {sorted.map((p) => (
            <PlayerRow key={p.id} player={p} amountLabel={crc(p.amount_due)} onChange={change}
              onRemove={async () => {
                await removePlayer(p.id);
                // En "dividido", al irse alguien sube el reparto de los demás.
                if (match.cost_mode === "dividido") await recalcDivided(match.id);
                refresh();
              }}
              onAmount={async (v) => { await updatePlayer(p.id, { amount_due: v }); refresh(); }}
            />
          ))}
          {players.length === 0 && (
            <div className="card text-center text-gray-500">
              Sin jugadores. <Link to={`/g/${gid}/partido/${match.id}/importar`} className="text-pitch-600 underline">Importá la lista</Link>.
            </div>
          )}
        </div>

        <button
          className="mt-6 w-full text-center text-sm text-red-400 underline"
          onClick={async () => {
            const ok = await dialog.confirm({
              title: "¿Eliminar este partido?",
              message: "Se borran los jugadores, pagos y equipos de esta fecha. No se puede deshacer.",
              confirmLabel: "Eliminar",
              danger: true,
            });
            if (ok) { await deleteMatch(match.id); nav(`/g/${gid}`); }
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

function AttendanceAndResult({ match, players, onChange, gid }: {
  match: Match; players: MatchPlayer[]; onChange: () => void; gid: string;
}) {
  const [checkin, setCheckin] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const { data: result, refetch: refetchResult } = useQuery({ queryKey: ["result", match.id], queryFn: () => getResult(match.id) });
  const { data: teams } = useQuery({ queryKey: ["pubteams", match.id], queryFn: () => listPublishedTeams(match.id) });
  const { data: games } = useQuery({ queryKey: ["games", match.id], queryFn: () => listGames(match.id) });
  const counts = attendanceCounts(players);
  const left = spotsLeft(counts.confirmed, match.max_players);

  // El campeón se deduce de la tabla, no se elige a mano: el marcador ya se
  // cargó en Resultados.
  const champTeamId = useMemo(() => {
    if (!teams || teams.length < 2 || !games || games.length === 0) return null;
    const table = computeStandings(games, teams.map((t) => ({ ...t, name: teamLabel(t.color, t.name) })));
    return championId(table);
  }, [teams, games]);

  // El campeón a mostrar: el de la tabla si hay resultados cargados, si no el
  // que quedó guardado (p. ej. de un partido anterior a Resultados). Así el
  // 🏆 no desaparece del resumen por no haber cargado la cuadrangular.
  const effectiveChampId = champTeamId ?? result?.winner_team_id ?? null;
  const champTeam = effectiveChampId ? teams?.find((t) => t.id === effectiveChampId) ?? null : null;

  // Cuando la tabla cambia, sincronizamos winner_team_id en la BD (lo usan
  // Campeones y la página pública). El ref evita reescrituras en bucle.
  const savingWinner = useRef(false);
  useEffect(() => {
    if (champTeamId == null || result?.winner_team_id === champTeamId || savingWinner.current) return;
    savingWinner.current = true;
    saveResult({
      match_id: match.id,
      winner_team_id: champTeamId,
      mvp_match_player_id: result?.mvp_match_player_id ?? null,
      score: null,
    })
      .then(() => refetchResult())
      .finally(() => { savingWinner.current = false; });
  }, [champTeamId, result?.winner_team_id, result?.mvp_match_player_id, match.id, refetchResult]);

  async function toggleList() { await setListClosed(match.id, !match.list_closed); onChange(); }
  async function check(p: MatchPlayer, status: AttendanceStatus) { await setAttendance(p.id, status); onChange(); }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Asistencia</div>
        <button className="text-xs text-pitch-600 underline" onClick={toggleList}>
          {match.list_closed ? "Abrir lista" : "Cerrar lista"}
        </button>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
        <span>✅ {counts.confirmed} confirmados{match.max_players ? ` / ${match.max_players}` : ""}</span>
        {counts.waitlist > 0 && <span>⏳ {counts.waitlist} lista de espera</span>}
        {counts.maybe > 0 && <span>🤔 {counts.maybe} tal vez</span>}
        {counts.declined > 0 && <span>🚫 {counts.declined} no van</span>}
        {left != null && <span>{left > 0 ? `${left} libres` : "cupo lleno"}</span>}
      </div>

      <button className="text-xs text-pitch-600 underline" onClick={() => setCheckin(!checkin)}>
        {checkin ? "Ocultar check-in" : "Check-in del día"}
      </button>
      {checkin && (
        <div className="space-y-1">
          {players.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span>{p.display_name}</span>
              <div className="flex gap-1">
                <Act label="Asistió" primary={p.attendance_status === "asistio"} onClick={() => check(p, "asistio")} />
                <Act label="No asistió" primary={p.attendance_status === "no_asistio"} onClick={() => check(p, "no_asistio")} />
              </div>
            </div>
          ))}
        </div>
      )}

      <hr className="border-gray-100" />

      {/* Campeón automático + MVP a mano */}
      {(() => {
        const mvpName = result?.mvp_match_player_id
          ? players.find((p) => p.id === result.mvp_match_player_id)?.display_name ?? null
          : null;

        if (!teams || teams.length === 0) {
          return <p className="text-xs text-gray-400">Publicá los equipos para ver campeón y MVP.</p>;
        }

        return (
          <div className="space-y-2">
            {champTeam ? (
              <div className="rounded-xl bg-yellow-50 p-2.5 text-sm text-yellow-800">
                🏆 Campeón: <b>{teamLabel(champTeam.color, champTeam.name)}</b>
                <span className="text-xs text-yellow-700/70"> · según la tabla</span>
              </div>
            ) : (
              <p className="text-xs text-gray-400">
                Cargá los marcadores en{" "}
                <Link to={`/g/${gid}/partido/${match.id}/torneo`} className="text-pitch-600 underline">Resultados</Link>{" "}
                y el campeón sale solo.
              </p>
            )}

            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-2.5 text-sm">
              <span>⭐ MVP: {mvpName ? <b>{mvpName}</b> : <span className="text-gray-400">sin definir</span>}</span>
              <button className="text-pitch-600 underline" onClick={() => setShowResult(true)}>
                {mvpName ? "Cambiar" : "Elegir"}
              </button>
            </div>
          </div>
        );
      })()}

      {teams && teams.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <Link to={`/g/${gid}/partido/${match.id}/torneo`} className="btn-ghost text-center text-sm">📊 Resultados</Link>
          <button className="btn-ghost text-sm" onClick={() => {
            const champion = champTeam ? teamLabel(champTeam.color, champTeam.name) : null;
            const mvp = result?.mvp_match_player_id ? (players.find((p) => p.id === result.mvp_match_player_id)?.display_name ?? null) : null;
            shareToWhatsapp(matchSummary({
              title: match.title, dateLabel: formatDate(match.date),
              teams: teams.map((t) => ({ name: teamLabel(t.color, t.name), color: t.color })),
              champion, championColor: champTeam?.color ?? null, mvp, score: null,
            }));
          }}>📤 Compartir a WhatsApp</button>
        </div>
      )}

      {showResult && (
        <MvpModal
          match={match} players={players} winnerTeamId={champTeamId} initialMvp={result?.mvp_match_player_id ?? null}
          onClose={() => setShowResult(false)}
          onSaved={() => { setShowResult(false); refetchResult(); onChange(); }}
        />
      )}
    </div>
  );
}

/** Solo MVP: el campeón y el marcador salen de Resultados. */
function MvpModal({ match, players, winnerTeamId, initialMvp, onClose, onSaved }: {
  match: Match;
  players: MatchPlayer[];
  winnerTeamId: string | null;
  initialMvp: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mvp, setMvp] = useState(initialMvp ?? "");
  const [busy, setBusy] = useState(false);
  const dialog = useDialog();

  async function save() {
    setBusy(true);
    try {
      // Conservamos el campeón deducido de la tabla; solo cambia el MVP.
      await saveResult({
        match_id: match.id,
        winner_team_id: winnerTeamId,
        mvp_match_player_id: mvp || null,
        score: null,
      });
      onSaved();
    } catch (e: any) {
      dialog.alert({ title: "No se pudo guardar el MVP", message: e.message ?? "Error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded bg-gray-200" />
        <h3 className="mb-3 text-lg font-bold">MVP del partido</h3>
        <div className="space-y-3">
          <select className="input" value={mvp} onChange={(e) => setMvp(e.target.value)}>
            <option value="">Sin MVP</option>
            {players.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
          </select>
          <Button fullWidth onClick={save} disabled={busy}>{busy ? "…" : "Guardar MVP"}</Button>
        </div>
      </div>
    </div>
  );
}
