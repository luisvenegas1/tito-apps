import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/ui/TopBar";
import { createMatch, updateMatch, getMatch, setMatchPin, MatchInput } from "./api";
import { useAuth } from "../auth/AuthProvider";
import { generatePin } from "@/lib/utils/format";
import { Button } from "@titoapps/ui";

const empty: MatchInput = {
  title: "Mejenga lunes",
  type: "mejenga",
  date: new Date().toISOString().slice(0, 10),
  time: "20:00",
  location: "",
  cost_per_player: 2200,
  max_players: null,
  notes: "",
};

export function MatchFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const nav = useNavigate();
  const qc = useQueryClient();
  const { session } = useAuth();
  const [form, setForm] = useState<MatchInput>(empty);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (id) {
      getMatch(id).then((m) =>
        setForm({
          title: m.title, type: m.type, date: m.date, time: m.time,
          location: m.location, cost_per_player: m.cost_per_player,
          max_players: m.max_players, notes: m.notes,
        }),
      );
    }
  }, [id]);

  function set<K extends keyof MatchInput>(k: K, v: MatchInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    try {
      if (editing && id) {
        await updateMatch(id, form);
        await qc.invalidateQueries({ queryKey: ["match", id] });
        nav(`/partido/${id}`);
      } else {
        const m = await createMatch(form, session.user.id);
        // PIN inicial automático
        await setMatchPin(m.id, generatePin());
        await qc.invalidateQueries({ queryKey: ["matches"] });
        nav(`/partido/${m.id}/importar`);
      }
    } catch (err: any) {
      alert(err.message ?? "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <TopBar title={editing ? "Editar partido" : "Nuevo partido"} back />
      <form onSubmit={save} className="space-y-4 p-4">
        <div>
          <label className="label">Nombre / descripción</label>
          <input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} required />
        </div>

        <div>
          <label className="label">Tipo</label>
          <div className="grid grid-cols-2 gap-2">
            {(["mejenga", "torneo"] as const).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => set("type", t)}
                className={`btn ${form.type === t ? "bg-pitch-500 text-white" : "bg-gray-100 text-gray-600"}`}
              >
                {t === "mejenga" ? "Mejenga" : "Torneo"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Fecha</label>
            <input className="input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required />
          </div>
          <div>
            <label className="label">Hora</label>
            <input className="input" type="time" value={form.time ?? ""} onChange={(e) => set("time", e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Lugar</label>
          <input className="input" value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} placeholder="Cancha de siempre" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Costo por jugador (₡)</label>
            <input className="input" type="number" min={0} value={form.cost_per_player} onChange={(e) => set("cost_per_player", Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Máx. jugadores</label>
            <input className="input" type="number" min={0} value={form.max_players ?? ""} onChange={(e) => set("max_players", e.target.value ? Number(e.target.value) : null)} placeholder="opcional" />
          </div>
        </div>

        <div>
          <label className="label">Observaciones</label>
          <textarea className="input" rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
        </div>

        <Button fullWidth disabled={busy}>
          {busy ? "Guardando…" : editing ? "Guardar cambios" : "Crear y agregar jugadores"}
        </Button>
      </form>
    </div>
  );
}
