import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/ui/TopBar";
import { listPublishedTeams } from "../teams/api";
import { listGames, createGame, deleteGame, MatchGame } from "./api";
import { computeStandings } from "./standings";
import { roundRobin, pairKey, Pairing } from "./fixtures";
import { Button } from "@titoapps/ui";
import { colorOf, teamLabel } from "@/lib/teamColors";
import { useGroupId } from "@/features/groups/useGroup";

/** Punto de color + nombre del equipo, para no confundirse entre marcadores. */
function TeamTag({ color, name }: { color: string | null; name: string }) {
  const c = colorOf(color);
  return (
    <span className="inline-flex items-center gap-1.5">
      {c && <span className={`h-3 w-3 shrink-0 rounded-full ${c.dot}`} />}
      <span className={`font-semibold ${c ? c.text : ""}`}>{teamLabel(color, name)}</span>
    </span>
  );
}

export function TournamentPage() {
  const { id } = useParams<{ id: string }>();
  const gid = useGroupId();
  const qc = useQueryClient();
  const { data: teams } = useQuery({ queryKey: ["pubteams", id], queryFn: () => listPublishedTeams(id!) });
  const { data: games } = useQuery({ queryKey: ["games", id], queryFn: () => listGames(id!) });

  const refresh = () => qc.invalidateQueries({ queryKey: ["games", id] });

  if (!teams) return <p className="p-8 text-center text-gray-400">Cargando…</p>;
  if (teams.length < 2) {
    return (
      <div>
        <TopBar title="Resultados" back backTo={`/g/${gid}/partido/${id}`} />
        <p className="p-8 text-center text-gray-500">Publicá al menos 2 equipos para cargar resultados.</p>
      </div>
    );
  }

  const nameById = new Map(teams.map((t) => [t.id, teamLabel(t.color, t.name)]));
  const colorById = new Map(teams.map((t) => [t.id, t.color]));
  const table = computeStandings(games ?? [], teams.map((t) => ({ ...t, name: teamLabel(t.color, t.name) })));

  return (
    <div className="pb-8">
      <TopBar title="Resultados" back backTo={`/g/${gid}/partido/${id}`} />
      <div className="space-y-4 p-4">
        {/* Tabla de posiciones: solo tiene sentido con 3+ equipos */}
        {teams.length > 2 && (
          <div className="card">
            <div className="mb-2 font-semibold">Tabla de posiciones</div>
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400">
                <tr><th className="text-left">Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>DG</th><th>Pts</th></tr>
              </thead>
              <tbody>
                {table.map((r) => (
                  <tr key={r.teamId} className="border-t border-gray-100">
                    <td className="py-1 text-left"><TeamTag color={colorById.get(r.teamId) ?? null} name={r.teamName} /></td>
                    <td className="text-center">{r.played}</td>
                    <td className="text-center">{r.wins}</td>
                    <td className="text-center">{r.draws}</td>
                    <td className="text-center">{r.losses}</td>
                    <td className="text-center">{r.goalDiff}</td>
                    <td className="text-center font-bold">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {teams.length === 2 ? (
          <SingleMatch
            matchId={id!}
            teamA={teams[0]}
            teamB={teams[1]}
            game={(games ?? [])[0] ?? null}
            onDone={refresh}
          />
        ) : (
          <Fixtures
            matchId={id!}
            teams={teams}
            games={games ?? []}
            nameById={nameById}
            onDone={refresh}
          />
        )}
      </div>
    </div>
  );
}

/** Dos equipos: un solo marcador, sin local/visita. */
function SingleMatch({
  matchId, teamA, teamB, game, onDone,
}: {
  matchId: string;
  teamA: { id: string; name: string; color: string | null };
  teamB: { id: string; name: string; color: string | null };
  game: MatchGame | null;
  onDone: () => void;
}) {
  const [a, setA] = useState<string>(game ? String(game.home_score) : "");
  const [b, setB] = useState<string>(game ? String(game.away_score) : "");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (a === "" || b === "") return;
    setBusy(true);
    try {
      // Un partido = un juego. Si ya había, lo reemplazamos.
      if (game) await deleteGame(game.id);
      await createGame(matchId, {
        home_team_id: teamA.id, away_team_id: teamB.id,
        home_score: Number(a), away_score: Number(b),
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-3">
      <div className="font-semibold">Marcador</div>
      <div className="flex items-center justify-center gap-3">
        <TeamTag color={teamA.color} name={teamA.name} />
        <ScoreBox value={a} onChange={setA} />
        <span className="text-gray-400">-</span>
        <ScoreBox value={b} onChange={setB} />
        <TeamTag color={teamB.color} name={teamB.name} />
      </div>
      <Button fullWidth onClick={save} disabled={busy || a === "" || b === ""}>
        {game ? "Actualizar marcador" : "Guardar marcador"}
      </Button>
    </div>
  );
}

/** 3+ equipos: cuadrangular (todos contra todos) o partido suelto. */
function Fixtures({
  matchId, teams, games, nameById, onDone,
}: {
  matchId: string;
  teams: { id: string; name: string; color: string | null }[];
  games: MatchGame[];
  nameById: Map<string, string>;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"cuadrangular" | "partido">("cuadrangular");

  // Resultado ya cargado para cada par (sin importar el orden).
  const gameByPair = useMemo(() => {
    const m = new Map<string, MatchGame>();
    for (const g of games) m.set(pairKey(g.home_team_id, g.away_team_id), g);
    return m;
  }, [games]);

  const pairings = roundRobin(teams.map((t) => t.id));
  const played = pairings.filter((p) => gameByPair.has(pairKey(p.a, p.b))).length;

  return (
    <>
      <div className="flex gap-2">
        {(["cuadrangular", "partido"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`btn flex-1 ${mode === m ? "bg-pitch-500 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            {m === "cuadrangular" ? "Todos contra todos" : "Partido suelto"}
          </button>
        ))}
      </div>

      {mode === "cuadrangular" ? (
        <div className="card space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Todos contra todos</span>
            <span className="text-xs text-gray-400">{played} de {pairings.length} jugados</span>
          </div>
          <p className="text-xs text-gray-400">Cargá cada resultado y se guarda solo.</p>
          <div className="space-y-1.5">
            {pairings.map((p) => (
              <FixtureRow
                key={pairKey(p.a, p.b)}
                matchId={matchId}
                pairing={p}
                teams={teams}
                existing={gameByPair.get(pairKey(p.a, p.b)) ?? null}
                onDone={onDone}
              />
            ))}
          </div>
        </div>
      ) : (
        <SinglePicker matchId={matchId} teams={teams} onDone={onDone} />
      )}

      {/* Juegos cargados, con opción de borrar */}
      {games.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Juegos cargados</div>
          {games.map((g) => (
            <div key={g.id} className="card flex items-center justify-between py-2 text-sm">
              <span>{nameById.get(g.home_team_id)} {g.home_score} - {g.away_score} {nameById.get(g.away_team_id)}</span>
              <button className="text-red-400" onClick={async () => { await deleteGame(g.id); onDone(); }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/** Una fila de la cuadrangular: dos marcadores con guardado automático. */
function FixtureRow({
  matchId, pairing, teams, existing, onDone,
}: {
  matchId: string;
  pairing: Pairing;
  teams: { id: string; name: string; color: string | null }[];
  existing: MatchGame | null;
  onDone: () => void;
}) {
  const tA = teams.find((t) => t.id === pairing.a)!;
  const tB = teams.find((t) => t.id === pairing.b)!;
  // Si ya se jugó, precargamos respetando el orden con que se guardó.
  const flip = existing ? existing.home_team_id === pairing.b : false;
  const [a, setA] = useState<string>(existing ? String(flip ? existing.away_score : existing.home_score) : "");
  const [b, setB] = useState<string>(existing ? String(flip ? existing.home_score : existing.away_score) : "");
  const [busy, setBusy] = useState(false);

  const dirty = a !== "" && b !== "";

  async function save() {
    if (!dirty) return;
    setBusy(true);
    try {
      if (existing) await deleteGame(existing.id);
      await createGame(matchId, {
        home_team_id: tA.id, away_team_id: tB.id,
        home_score: Number(a), away_score: Number(b),
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`flex items-center gap-2 rounded-xl border p-2 ${existing ? "border-pitch-200 bg-pitch-50/50" : "border-gray-100"}`}>
      <div className="flex flex-1 items-center justify-end gap-1.5 text-sm">
        <TeamTag color={tA.color} name={tA.name} />
      </div>
      <ScoreBox value={a} onChange={setA} onBlur={save} />
      <span className="text-gray-400">-</span>
      <ScoreBox value={b} onChange={setB} onBlur={save} />
      <div className="flex flex-1 items-center gap-1.5 text-sm">
        <TeamTag color={tB.color} name={tB.name} />
      </div>
      {busy && <span className="text-xs text-gray-400">…</span>}
      {existing && !busy && <span className="text-pitch-500" title="Guardado">✓</span>}
    </div>
  );
}

/** Partido suelto: elegís los dos equipos y el marcador. */
function SinglePicker({
  matchId, teams, onDone,
}: {
  matchId: string;
  teams: { id: string; name: string; color: string | null }[];
  onDone: () => void;
}) {
  const [x, setX] = useState("");
  const [y, setY] = useState("");
  const [xs, setXs] = useState("");
  const [ys, setYs] = useState("");
  const [busy, setBusy] = useState(false);

  const ready = x && y && x !== y && xs !== "" && ys !== "";

  async function add() {
    if (!ready) return;
    setBusy(true);
    try {
      await createGame(matchId, {
        home_team_id: x, away_team_id: y, home_score: Number(xs), away_score: Number(ys),
      });
      setX(""); setY(""); setXs(""); setYs("");
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-2">
      <div className="font-semibold">Partido suelto</div>
      <p className="text-xs text-gray-400">Un juego entre dos equipos. Cargá otro para la segunda cancha.</p>
      <div className="flex items-center gap-2">
        <select className="input py-1.5" value={x} onChange={(e) => setX(e.target.value)}>
          <option value="">Equipo</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{teamLabel(t.color, t.name)}</option>)}
        </select>
        <ScoreBox value={xs} onChange={setXs} />
        <span className="text-gray-400">-</span>
        <ScoreBox value={ys} onChange={setYs} />
        <select className="input py-1.5" value={y} onChange={(e) => setY(e.target.value)}>
          <option value="">Equipo</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{teamLabel(t.color, t.name)}</option>)}
        </select>
      </div>
      <Button fullWidth onClick={add} disabled={busy || !ready}>Agregar juego</Button>
    </div>
  );
}

function ScoreBox({
  value, onChange, onBlur,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
}) {
  return (
    <input
      // type="text" a propósito: el spinner de type=number roba ancho y
      // recorta el dígito. inputMode numeric igual abre el teclado numérico.
      type="text"
      inputMode="numeric"
      className="h-10 w-11 shrink-0 rounded-lg border border-gray-200 text-center text-base leading-none"
      placeholder="–"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, "").slice(0, 2))}
      onBlur={onBlur}
    />
  );
}
