import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { updatePlayer } from "../matches/api";
import type { MatchPlayer, FrequentPlayer } from "@/lib/supabase/types";

/**
 * Porteros del partido. Tres conceptos distintos que antes estaban mezclados:
 *
 *  1. PORTERO FIJO   → el perfil tiene preferred_position = "portero".
 *                      Es su puesto; ataja siempre.
 *  2. PUEDE ATAJAR   → can_be_goalkeeper = true pero juega en otra posición.
 *                      Es un recurso de emergencia, NO un portero.
 *  3. ATAJA HOY      → match_players.is_goalkeeper. Lo decide el organizador.
 *
 * Los del grupo 2 solo se ofrecen cuando faltan porteros, y siempre eligiendo
 * a mano: pueden estar lesionados o simplemente no querer atajar ese día.
 */
export function KeepersCard({
  matchId, players, frequent, numTeams,
}: {
  matchId: string;
  players: MatchPlayer[];
  frequent: FrequentPlayer[];
  numTeams: number;
}) {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const profileById = new Map(frequent.map((f) => [f.id, f]));
  const profileOf = (p: MatchPlayer) =>
    p.frequent_player_id ? profileById.get(p.frequent_player_id) ?? null : null;

  /** ¿Es portero de puesto, o solo alguien que puede sacar del apuro? */
  const isFixedKeeper = (p: MatchPlayer) => profileOf(p)?.preferred_position === "portero";
  const canKeep = (p: MatchPlayer) => Boolean(profileOf(p)?.can_be_goalkeeper);

  const active = players.filter(
    (p) => p.attendance_status !== "declinado" && p.attendance_status !== "no_asistio",
  );

  const assigned = active.filter((p) => p.is_goalkeeper);
  const fixed = assigned.filter(isFixedKeeper);
  const emergency = assigned.filter((p) => !isFixedKeeper(p));

  // Solo se ofrecen si faltan porteros.
  const available = active.filter((p) => !p.is_goalkeeper && canKeep(p) && !isFixedKeeper(p));

  const missing = numTeams - assigned.length;
  const extra = assigned.length - numTeams;

  async function setKeeper(p: MatchPlayer, value: boolean) {
    setBusyId(p.id);
    try {
      await updatePlayer(p.id, { is_goalkeeper: value });
      await qc.invalidateQueries({ queryKey: ["players", matchId] });
    } finally {
      setBusyId(null);
    }
  }

  const chip = (p: MatchPlayer, tone: "fixed" | "emergency") => (
    <button
      key={p.id}
      disabled={busyId === p.id}
      onClick={() => setKeeper(p, false)}
      title="Quitar de portero"
      className={
        tone === "fixed"
          ? "rounded-full bg-pitch-50 px-2.5 py-1 text-xs font-medium text-pitch-700 ring-1 ring-pitch-200 disabled:opacity-50"
          : "rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 ring-1 ring-orange-300 disabled:opacity-50"
      }
    >
      🧤 {p.display_name} {tone === "emergency" && "(no es portero) "}✕
    </button>
  );

  return (
    <div className={`card ${missing > 0 || extra > 0 ? "border-l-4 border-orange-400" : ""}`}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-semibold">Porteros</span>
        <span className={`text-sm ${missing > 0 || extra > 0 ? "text-orange-500" : "text-gray-400"}`}>
          {assigned.length} de {numTeams}
        </span>
      </div>

      {assigned.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {fixed.map((p) => chip(p, "fixed"))}
          {emergency.map((p) => chip(p, "emergency"))}
        </div>
      ) : (
        <p className="mb-2 text-sm text-gray-400">Todavía no hay ninguno asignado.</p>
      )}

      {/* Sobran porteros: normalmente porque alguien que solo PUEDE atajar
          quedó marcado. Se lo señalamos en vez de decidir por él. */}
      {extra > 0 && emergency.length > 0 && (
        <p className="text-sm text-orange-600">
          Sobra{extra > 1 ? "n" : ""} {extra} para {numTeams} equipos.
          {" "}Quitá a quien no vaya a atajar tocando su ✕ — los naranja no son porteros de puesto.
        </p>
      )}

      {missing > 0 && (
        <>
          <p className="mb-1.5 text-sm text-orange-600">
            {missing === 1 ? "Falta 1 portero" : `Faltan ${missing} porteros`} para {numTeams} equipos.
            {available.length > 0 ? " ¿Quién ataja?" : ""}
          </p>
          {available.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {available.map((p) => (
                  <button
                    key={p.id}
                    disabled={busyId === p.id}
                    onClick={() => setKeeper(p, true)}
                    className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-300 disabled:opacity-50"
                  >
                    + {p.display_name}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-gray-400">
                Estos <b>pueden</b> atajar pero juegan en otra posición. Elegí vos: alguno
                puede estar lesionado o no querer.
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-400">
              Nadie más en la lista tiene marcado “puede jugar de portero”. Podés activarlo
              en el perfil del jugador, o armar los equipos igual y definirlo en la cancha.
            </p>
          )}
        </>
      )}
    </div>
  );
}
