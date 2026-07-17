import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/ui/TopBar";
import { listChampions } from "./api";
import { formatDate } from "@/lib/utils/format";

export function ChampionsPage() {
  const { data: rows, isLoading } = useQuery({ queryKey: ["champions"], queryFn: listChampions });

  return (
    <div className="pb-8">
      <TopBar title="🏆 Campeones" back />
      <div className="space-y-2 p-4">
        {isLoading && <p className="text-gray-400">Cargando…</p>}
        {!isLoading && (rows?.length ?? 0) === 0 && (
          <div className="card text-center text-gray-500">Todavía no hay resultados registrados.</div>
        )}
        {(rows ?? []).map((r) => (
          <div key={r.match_id} className="card">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{r.winner_team_name ?? "Sin campeón"}</div>
              {r.score && <span className="text-sm text-gray-400">{r.score}</span>}
            </div>
            <div className="text-xs text-gray-400">
              {r.title} · {formatDate(r.date)}
              {r.mvp_name && ` · MVP: ${r.mvp_name}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
