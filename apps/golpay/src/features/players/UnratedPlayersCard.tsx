import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listFrequent, updateFrequent } from "./api";
import { LEVELS, LEVEL_LABELS, SkillLevel, LEVEL_SCALE_HINT } from "@/lib/levels";
import type { MatchPlayer } from "@/lib/supabase/types";
import { useGroupId } from "@/features/groups/useGroup";

/**
 * Muestra los jugadores del partido cuyo perfil todavía no tiene nivel
 * (típicamente los recién importados) para calificarlos antes de armar equipos.
 * Desaparece solo cuando no queda ninguno sin nivel.
 */
export function UnratedPlayersCard({ players }: { players: MatchPlayer[] }) {
  const qc = useQueryClient();
  const gid = useGroupId();
  const { data: frequent } = useQuery({ queryKey: ["frequent", gid], queryFn: () => listFrequent(gid) });

  if (!frequent) return null;

  const byId = new Map(frequent.map((f) => [f.id, f]));
  const pending = players
    .map((p) => (p.frequent_player_id ? byId.get(p.frequent_player_id) : undefined))
    .filter((f): f is NonNullable<typeof f> => Boolean(f) && f!.skill_level == null)
    // sin duplicados si el mismo perfil aparece dos veces
    .filter((f, i, arr) => arr.findIndex((x) => x.id === f.id) === i);

  if (pending.length === 0) return null;

  async function setLevel(id: string, level: SkillLevel) {
    await updateFrequent(id, { skill_level: level });
    qc.invalidateQueries({ queryKey: ["frequent", gid] });
  }

  return (
    <div className="card border-l-4 border-purple-400">
      <div className="mb-1 flex items-center gap-2 font-semibold">
        <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-purple-400 px-1.5 text-sm text-white">
          {pending.length}
        </span>
        Jugadores sin nivel
      </div>
      <p className="mb-2 text-xs text-gray-400">
        Asignales un nivel para que los equipos queden parejos. {LEVEL_SCALE_HINT}.
      </p>
      <div className="space-y-2">
        {pending.map((f) => (
          <div key={f.id} className="border-t border-gray-100 pt-2 first:border-0 first:pt-0">
            <div className="mb-1 text-sm font-medium">
              {f.name}{f.can_be_goalkeeper && " 🧤"}
            </div>
            <div className="grid grid-cols-5 gap-1">
              {LEVELS.map((n) => (
                <button
                  key={n}
                  onClick={() => setLevel(f.id, n)}
                  className="rounded-lg bg-gray-100 px-1 py-1.5 text-[11px] font-medium leading-tight text-gray-600 hover:bg-purple-100"
                >
                  {LEVEL_LABELS[n]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
