import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicMatch, reportPayment, PublicPlayer } from "./api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { crc, formatDate } from "@/lib/utils/format";

export function PublicMatchPage() {
  const { token } = useParams<{ token: string }>();
  const { data: match, isLoading, refetch } = useQuery({
    queryKey: ["public", token],
    queryFn: () => getPublicMatch(token!),
  });
  const [selected, setSelected] = useState<PublicPlayer | null>(null);

  if (isLoading) return <p className="p-8 text-center text-gray-400">Cargando…</p>;
  if (!match) return <p className="p-8 text-center text-gray-500">Partido no encontrado.</p>;

  return (
    <div className="pb-10">
      <div className="bg-pitch-500 px-5 py-6 text-white">
        <div className="text-3xl">⚽</div>
        <h1 className="mt-1 text-2xl font-extrabold">{match.title}</h1>
        <p className="text-sm opacity-90">
          {formatDate(match.date)} {match.time && `· ${match.time}`}
          {match.location && ` · ${match.location}`}
        </p>
        <p className="mt-1 font-semibold">{crc(match.cost_per_player)} por jugador</p>
      </div>

      <div className="p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-500">Tocá tu nombre para reportar tu pago</h2>
        <div className="space-y-2">
          {match.players.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className="card flex w-full items-center justify-between"
            >
              <span className="font-medium">{p.display_name}</span>
              <StatusBadge status={p.payment_status} />
            </button>
          ))}
        </div>

        {match.teams.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-semibold text-gray-500">Equipos</h2>
            <div className="grid grid-cols-2 gap-2">
              {match.teams.map((t) => (
                <div key={t.id} className="card">
                  <div className="font-bold text-pitch-600">{t.name}</div>
                  <ul className="mt-1 text-sm text-gray-600">
                    {t.members.map((m) => <li key={m}>{m}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selected && (
        <ReportModal
          token={token!}
          player={selected}
          others={match.players.filter((p) => p.id !== selected.id)}
          onClose={() => setSelected(null)}
          onDone={() => { setSelected(null); refetch(); }}
        />
      )}
    </div>
  );
}

function ReportModal({
  token, player, others, onClose, onDone,
}: {
  token: string;
  player: PublicPlayer;
  others: PublicPlayer[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [pin, setPin] = useState("");
  const [method, setMethod] = useState("SINPE");
  const [note, setNote] = useState("");
  const [covered, setCovered] = useState<string[]>([]);
  const [showOthers, setShowOthers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggle(id: string) {
    setCovered((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      await reportPayment({ token, pin, matchPlayerId: player.id, method, note, coveredIds: covered });
      onDone();
    } catch (e: any) {
      setErr(e.message ?? "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded bg-gray-200" />
        <h3 className="text-lg font-bold">Reportar pago de {player.display_name}</h3>
        <p className="text-sm text-gray-500">
          Confirmá que ya hiciste el SINPE. El organizador lo verificará después.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="label">PIN del partido</label>
            <input
              className="input tracking-widest"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="4 dígitos"
            />
          </div>
          <div>
            <label className="label">Método</label>
            <div className="flex gap-2">
              {["SINPE", "Efectivo", "Transferencia"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`btn px-3 py-1.5 text-sm ${method === m ? "bg-pitch-500 text-white" : "bg-gray-100 text-gray-600"}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <button className="text-sm text-pitch-600 underline" onClick={() => setShowOthers(!showOthers)}>
            {showOthers ? "Ocultar" : "Pagué por mí y por otra persona"}
          </button>
          {showOthers && (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl bg-gray-50 p-2">
              {others.map((o) => (
                <label key={o.id} className="flex items-center gap-2 py-1 text-sm">
                  <input type="checkbox" checked={covered.includes(o.id)} onChange={() => toggle(o.id)} />
                  {o.display_name}
                </label>
              ))}
            </div>
          )}

          <div>
            <label className="label">Nota (opcional)</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {err && <p className="text-sm text-red-500">{err}</p>}

          <button className="btn-primary w-full" disabled={busy || pin.length !== 4} onClick={submit}>
            {busy ? "…" : "Ya pagué ✅"}
          </button>
        </div>
      </div>
    </div>
  );
}
