import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listMatches } from "./api";
import { useAuth } from "../auth/AuthProvider";
import { crc, formatDate } from "@/lib/utils/format";

export function DashboardPage() {
  const { signOut } = useAuth();
  const { data: matches, isLoading } = useQuery({ queryKey: ["matches"], queryFn: listMatches });

  const now = new Date().toISOString().slice(0, 10);
  const upcoming = (matches ?? []).filter((m) => m.date >= now);
  const past = (matches ?? []).filter((m) => m.date < now);

  return (
    <div className="pb-24">
      <header className="flex items-center justify-between px-4 py-4">
        <div>
          <h1 className="text-2xl font-extrabold text-pitch-600">GolPay ⚽</h1>
          <p className="text-sm text-gray-500">Tus partidos</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/frecuentes" className="btn-ghost text-sm">Jugadores</Link>
          <Link to="/campeones" className="btn-ghost text-sm">🏆</Link>
          <Link to="/ajustes" className="btn-ghost text-sm">Ajustes</Link>
          <button onClick={signOut} className="text-sm text-gray-400 underline">Salir</button>
        </div>
      </header>

      {isLoading && <p className="px-4 text-gray-400">Cargando…</p>}

      {!isLoading && (matches?.length ?? 0) === 0 && (
        <div className="card mx-4 text-center">
          <p className="text-gray-500">Todavía no tenés partidos.</p>
          <Link to="/partido/nuevo" className="btn-primary mt-3">Crear el primero</Link>
        </div>
      )}

      <Section title="Próximos" items={upcoming} />
      <Section title="Historial" items={past} muted />

      <Link
        to="/partido/nuevo"
        className="btn-primary fixed bottom-5 left-1/2 z-20 -translate-x-1/2 shadow-lg"
      >
        + Nuevo partido
      </Link>
    </div>
  );
}

function Section({ title, items, muted }: { title: string; items: any[]; muted?: boolean }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-2 px-4">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</h2>
      <div className="space-y-2">
        {items.map((m) => (
          <Link key={m.id} to={`/partido/${m.id}`} className={`card flex items-center justify-between ${muted ? "opacity-70" : ""}`}>
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
