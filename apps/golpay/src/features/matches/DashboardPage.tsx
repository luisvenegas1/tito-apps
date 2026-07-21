import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listMatches } from "./api";
import { crc, formatDate } from "@/lib/utils/format";
import { AvatarMenu } from "@/components/ui/AvatarMenu";
import { useGroupId } from "@/features/groups/useGroup";
import { useGroup } from "@/features/groups/useGroup";

export function DashboardPage() {
  const gid = useGroupId();
  const { data: group } = useGroup();
  const { data: matches, isLoading } = useQuery({ queryKey: ["matches", gid], queryFn: () => listMatches(gid) });

  const now = new Date().toISOString().slice(0, 10);
  const upcoming = (matches ?? []).filter((m) => m.date >= now);
  const past = (matches ?? []).filter((m) => m.date < now);

  return (
    <div className="pb-8">
      {/* El nombre del grupo va en su propio renglón: compartiendo fila con los
          botones le quedaban 80px y se partía en cinco líneas. */}
      <header className="px-4 py-4">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <Link to="/grupos" className="shrink-0 text-xs text-gray-400 underline">‹ Grupos</Link>
          <div className="flex shrink-0 items-center gap-2">
            <Link to={`/g/${gid}/jugadores`} className="btn-ghost text-sm">Jugadores</Link>
            <Link to={`/g/${gid}/estadisticas`} className="btn-ghost text-sm" title="Estadísticas">📊</Link>
            <Link to={`/g/${gid}/campeones`} className="btn-ghost text-sm" title="Campeones">🏆</Link>
            <Link to={`/g/${gid}/miembros`} className="btn-ghost text-sm" title="Miembros">👥</Link>
            <AvatarMenu />
          </div>
        </div>
        <h1 className="truncate text-2xl font-extrabold text-pitch-600" title={group?.name}>
          {group?.name ?? "GolPay"}
        </h1>
        <p className="text-sm text-gray-500">Tus partidos</p>
      </header>

      <div className="px-4">
        <Link to={`/g/${gid}/partido/nuevo`} className="btn-primary w-full text-center">+ Nuevo partido</Link>
      </div>

      {isLoading && <p className="mt-3 px-4 text-gray-400">Cargando…</p>}

      {!isLoading && (matches?.length ?? 0) === 0 && (
        <div className="card mx-4 text-center">
          <p className="text-gray-500">Todavía no tenés partidos.</p>
          <Link to={`/g/${gid}/partido/nuevo`} className="btn-primary mt-3">Crear el primero</Link>
        </div>
      )}

      <Section title="Próximos" items={upcoming} gid={gid} />
      <Section title="Historial" items={past} muted gid={gid} />

    </div>
  );
}

function Section({ title, items, muted, gid }: { title: string; items: any[]; muted?: boolean; gid: string }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-2 px-4">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</h2>
      <div className="space-y-2">
        {items.map((m) => (
          <Link key={m.id} to={`/g/${gid}/partido/${m.id}`} className={`card flex items-center justify-between ${muted ? "opacity-70" : ""}`}>
            <div>
              <div className="font-semibold">{m.title}</div>
              <div className="text-sm text-gray-500">
                {formatDate(m.date)} · {m.type === "mejenga" ? "Mejenga" : "Torneo"}
              </div>
            </div>
            <div className="text-right text-sm text-gray-500">{crc(m.cost_per_player)}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
