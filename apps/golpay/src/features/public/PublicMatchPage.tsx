import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicMatch, reportPayment, uploadProof, PublicPlayer, PublicSinpe } from "./api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { copyToClipboard } from "@/components/ui/toast";
import { crc, formatDate, formatTime } from "@/lib/utils/format";
import { colorOf, teamLabel } from "@/lib/teamColors";
import { Button } from "@titoapps/ui";

export function PublicMatchPage() {
  const { token } = useParams<{ token: string }>();
  const { data: match, isLoading, refetch } = useQuery({
    queryKey: ["public", token],
    queryFn: () => getPublicMatch(token!),
  });
  const [selected, setSelected] = useState<PublicPlayer | null>(null);

  if (isLoading) return <p className="p-8 text-center text-gray-400">Cargando…</p>;
  if (!match) return <p className="p-8 text-center text-gray-500">Partido no encontrado.</p>;

  const isFree = match.cost_mode === "gratis";

    return (
    <div className="pb-10">
      <div className="bg-pitch-500 px-5 py-6 text-white">
        <div className="text-3xl">⚽</div>
        <h1 className="mt-1 text-2xl font-extrabold">{match.title}</h1>
        <p className="text-sm opacity-90">
          {formatDate(match.date)} {match.time && `· ${formatTime(match.time)}`}
          {match.location && ` · ${match.location}`}
        </p>
        {match.cost_mode === "fijo" && (
          <p className="mt-1 font-semibold">{crc(match.cost_per_player)} por jugador</p>
        )}
        {match.cost_mode === "dividido" && match.players.length > 0 && (
          <p className="mt-1 font-semibold">
            {crc(match.total_amount ?? 0)} ÷ {match.players.length} = {crc(match.players[0].amount_due)} c/u
          </p>
        )}
      </div>

      {/* Campeón — celebración sutil, no bloquea el pago */}
      {match.result?.winner_team_name && (() => {
        // El backend manda el color si lo hay, si no el nombre viejo.
        const w = match.result!.winner_team_name;
        const champ = match.teams.find((t) => t.color === w || t.name === w);
        return (
          <div className="champ-pop bg-gradient-to-b from-yellow-100 to-yellow-50 px-5 py-4 text-center text-yellow-800">
            <div className="text-3xl">🏆</div>
            <div className="text-lg font-extrabold">¡{teamLabel(w, w)} campeón!</div>
            {match.result!.score && <div className="text-sm">{match.result!.score}</div>}
            {match.result!.mvp_name && <div className="text-sm">⭐ MVP: {match.result!.mvp_name}</div>}
            {champ && champ.members.length > 0 && (
              <div className="mt-1 text-xs">{champ.members.join(" · ")}</div>
            )}
            <div className="mt-1 text-xs opacity-70">¡Grande el equipo! 🎉</div>
          </div>
        );
      })()}

      <div className="p-4">
        <div className="mb-3 text-xs text-gray-500">
          {match.players.length} jugadores
          {match.max_players ? ` de ${match.max_players}` : ""}
        </div>

        {/* Equipos primero: es lo que todos vienen a ver. */}
        {match.teams.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-gray-500">Equipos</h2>
            <div className="grid grid-cols-2 gap-2">
              {match.teams.map((t) => {
                const c = colorOf(t.color);
                return (
                  <div key={t.id} className="card">
                    <div className="flex items-center gap-1.5">
                      {c && <span className={`h-3 w-3 shrink-0 rounded-full ${c.dot}`} />}
                      <span className={`font-bold ${c ? c.text : "text-pitch-600"}`}>
                        {teamLabel(t.color, t.name)}
                      </span>
                    </div>
                    <ul className="mt-1 text-sm text-gray-600">
                      {t.members.map((m) => <li key={m}>{m}</li>)}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <h2 className="mb-2 text-sm font-semibold text-gray-500">
          {isFree ? "Jugadores" : "Tocá tu nombre para reportar tu pago"}
        </h2>
        <div className="space-y-2">
          {match.players.map((p) =>
            isFree ? (
              <div key={p.id} className="card font-medium">{p.display_name}{p.is_goalkeeper && " 🧤"}</div>
            ) : (
              <button key={p.id} onClick={() => setSelected(p)} className="card flex w-full items-center justify-between gap-2">
                <span className="font-medium">{p.display_name}{p.is_goalkeeper && " 🧤"}</span>
                <StatusBadge status={p.payment_status} />
              </button>
            ),
          )}
        </div>

      </div>

      {selected && (
        <PlayerSheet
          token={token!}
          player={selected}
          others={match.players.filter((p) => p.id !== selected.id)}
          sinpe={match.sinpe}
          amount={selected.amount_due}
          onClose={() => setSelected(null)}
          onDone={() => { setSelected(null); refetch(); }}
        />
      )}
    </div>
  );
}

function PlayerSheet({
  token, player, others, sinpe, amount, onClose, onDone,
}: {
  token: string;
  player: PublicPlayer;
  others: PublicPlayer[];
  sinpe: PublicSinpe | null;
  amount: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [method, setMethod] = useState("SINPE");
  const [note, setNote] = useState("");
  const [covered, setCovered] = useState<string[]>([]);
  const [showOthers, setShowOthers] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function toggle(id: string) {
    setCovered((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }

  async function pay() {
    setBusy(true); setErr(null);
    try {
      let proofPath: string | null = null;
      if (file) proofPath = await uploadProof({ token, matchPlayerId: player.id, file });
      await reportPayment({ token, matchPlayerId: player.id, method, note, coveredIds: covered, proofPath });
      onDone();
    } catch (e: any) {
      setErr(e.message ?? "Error");
    } finally {
      setBusy(false);
    }
  }

  async function copySinpe() {
    if (sinpe?.number) { await copyToClipboard(sinpe.number); setInfo("SINPE copiado"); }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded bg-gray-200" />
        <h3 className="text-lg font-bold">{player.display_name}</h3>

        <div className="mt-4 space-y-4">
          {/* Pago */}
          <div>
            <label className="label">Reportar pago</label>
            <div className="flex gap-2">
              {["SINPE", "Efectivo", "Transferencia"].map((m) => (
                <button key={m} onClick={() => setMethod(m)}
                  className={`btn px-3 py-1.5 text-sm ${method === m ? "bg-pitch-500 text-white" : "bg-gray-100 text-gray-600"}`}>
                  {m}
                </button>
              ))}
            </div>
            <button className="mt-2 text-sm text-pitch-600 underline" onClick={() => setShowOthers(!showOthers)}>
              {showOthers ? "Ocultar" : "Pagué por mí y por otra persona"}
            </button>
            {showOthers && (
              <div className="mt-1 max-h-40 space-y-1 overflow-y-auto rounded-xl bg-gray-50 p-2">
                {others.map((o) => (
                  <label key={o.id} className="flex items-center gap-2 py-1 text-sm">
                    <input type="checkbox" checked={covered.includes(o.id)} onChange={() => toggle(o.id)} />
                    {o.display_name}
                  </label>
                ))}
              </div>
            )}
            {sinpe?.number && (
              <div className="mt-2 flex items-center justify-between rounded-xl bg-gray-50 p-2 text-sm">
                <span>SINPE <b>{sinpe.number}</b>{sinpe.name && ` · ${sinpe.name}`} · {crc(amount)}</span>
                <button type="button" className="text-pitch-600 underline" onClick={copySinpe}>Copiar</button>
              </div>
            )}
            {/* Confirmación del "Copiar": antes se mostraba en el bloque de
                asistencia, que ya no existe. */}
            {info && <p className="mt-1 text-sm text-pitch-600">{info}</p>}
            <input className="input mt-2" placeholder="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <label className="mt-2 block text-sm text-gray-600">
              Comprobante (opcional)
              <input type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-xs"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <Button fullWidth className="mt-3" disabled={busy} onClick={pay}>
              {busy ? "…" : "Ya pagué ✅"}
            </Button>
          </div>

          {err && <p className="text-sm text-red-500">{err}</p>}
        </div>
      </div>
    </div>
  );
}
