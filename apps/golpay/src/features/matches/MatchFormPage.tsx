import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/ui/TopBar";
import {
  createMatch, updateMatch, getMatch, listTemplates, createTemplate, MatchInput,
} from "./api";
import { useAuth } from "../auth/AuthProvider";
import type { MatchTemplate } from "@/lib/supabase/types";
import { Button } from "@titoapps/ui";
import { useDialog } from "@/components/ui/Dialog";
import { useGroupId } from "@/features/groups/useGroup";

const empty: MatchInput = {
  title: "Mejenga lunes",
  type: "mejenga",
  date: new Date().toISOString().slice(0, 10),
  time: "20:00",
  location: "",
  cost_mode: "fijo",
  cost_per_player: 2200,
  total_amount: null,
  notes: "",
};

export function MatchFormPage() {
  const { id } = useParams();
  const gid = useGroupId();
  const editing = Boolean(id);
  const nav = useNavigate();
  const qc = useQueryClient();
  const { session } = useAuth();
  const [form, setForm] = useState<MatchInput>(empty);
  const [busy, setBusy] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const dialog = useDialog();
  const { data: templates } = useQuery({ queryKey: ["templates"], queryFn: listTemplates, enabled: !editing });

  function applyTemplate(t: MatchTemplate) {
    setForm((f) => ({
      ...f, title: t.name, type: t.type, time: t.time, location: t.location,
      cost_per_player: t.cost_per_player, notes: t.notes,
    }));
  }

  useEffect(() => {
    if (id) {
      getMatch(id).then((m) =>
        setForm({
          title: m.title, type: m.type, date: m.date, time: m.time,
          location: m.location, cost_mode: m.cost_mode ?? "fijo",
          cost_per_player: m.cost_per_player, total_amount: m.total_amount, notes: m.notes,
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
        nav(`/g/${gid}/partido/${id}`);
      } else {
        const m = await createMatch(form, session.user.id, gid);
        if (saveAsTemplate) {
          await createTemplate({
            name: form.title, type: form.type, time: form.time, location: form.location,
            cost_per_player: form.cost_per_player, max_players: null, notes: form.notes,
          }, session.user.id);
        }
        await qc.invalidateQueries({ queryKey: ["matches", gid] });
        nav(`/g/${gid}/partido/${m.id}/importar`);
      }
    } catch (err: any) {
      dialog.alert({ title: "No se pudo guardar el partido", message: err.message ?? "Error al guardar" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <TopBar title={editing ? "Editar partido" : "Nuevo partido"} back backTo={editing ? `/g/${gid}/partido/${id}` : `/g/${gid}`} />
      <form onSubmit={save} className="space-y-4 p-4">
        {!editing && templates && templates.length > 0 && (
          <div>
            <label className="label">Usar plantilla (crear como una anterior)</label>
            <select
              className="input"
              defaultValue=""
              onChange={(e) => { const t = templates.find((x) => x.id === e.target.value); if (t) applyTemplate(t); }}
            >
              <option value="">— Elegir plantilla —</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}
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

        <div>
          <label className="label">Cobro</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              ["fijo", "Por jugador"],
              ["dividido", "Total ÷ jugadores"],
              ["gratis", "Sin cobro"],
            ] as const).map(([mode, txt]) => (
              <button
                type="button"
                key={mode}
                onClick={() => set("cost_mode", mode)}
                className={`btn px-1 py-2 text-xs leading-tight ${form.cost_mode === mode ? "bg-pitch-500 text-white" : "bg-gray-100 text-gray-600"}`}
              >
                {txt}
              </button>
            ))}
          </div>

          {form.cost_mode === "fijo" && (
            <div className="mt-2">
              <label className="label">Monto por jugador (₡)</label>
              <input className="input" type="number" min={0} value={form.cost_per_player}
                onChange={(e) => set("cost_per_player", Number(e.target.value))} />
            </div>
          )}
          {form.cost_mode === "dividido" && (
            <div className="mt-2">
              <label className="label">Monto total (₡)</label>
              <input className="input" type="number" min={0} value={form.total_amount ?? ""}
                placeholder="ej. 55000"
                onChange={(e) => set("total_amount", e.target.value ? Number(e.target.value) : null)} />
              <p className="mt-1 text-xs text-gray-400">
                Se reparte entre los que jueguen, redondeado hacia arriba a los ₡500.
              </p>
            </div>
          )}
          {form.cost_mode === "gratis" && (
            <p className="mt-2 text-xs text-gray-400">No se cobra cancha. Se esconde todo lo de pagos.</p>
          )}
        </div>

        <div>
          <label className="label">Observaciones</label>
          <textarea className="input" rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
        </div>

        {!editing && (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={saveAsTemplate} onChange={(e) => setSaveAsTemplate(e.target.checked)} />
            Guardar como plantilla para la próxima
          </label>
        )}
        <Button fullWidth disabled={busy}>
          {busy ? "Guardando…" : editing ? "Guardar cambios" : "Crear y agregar jugadores"}
        </Button>
      </form>
    </div>
  );
}
