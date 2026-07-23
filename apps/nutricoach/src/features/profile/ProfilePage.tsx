import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button, PageHeader, Input } from "@titoapps/ui";
import { qk } from "@/lib/query";
import { useAuth } from "@/features/auth/AuthProvider";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useAddWeight, useWeights, useDeleteWeight } from "@/features/health/useHealth";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { validateUsername } from "@/lib/username";
import { errorMessage } from "@/lib/errors";
import { changeUsername, updateFullName, changePassword } from "@/features/auth/authApi";
import { RemindersCard } from "@/features/reminders/RemindersCard";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-3">
      <div>
        <h2 className="font-semibold text-slate-800">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function ProfilePage() {
  const { session, profile: authProfile, refreshProfile, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: weights = [] } = useWeights();
  const addWeight = useAddWeight();
  const deleteWeight = useDeleteWeight();
  const updateUnits = useUpdateProfile();
  const qc = useQueryClient();

  const [fullName, setFullName] = useState(authProfile?.full_name ?? "");
  const [username, setUsername] = useState(authProfile?.username ?? "");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [w, setW] = useState("");

  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function run(key: string, fn: () => Promise<void>, okText: string) {
    setBusy(key);
    setMsg(null);
    try {
      await fn();
      await refreshProfile();
      await qc.invalidateQueries({ queryKey: qk.profile });
      setMsg({ kind: "ok", text: okText });
    } catch (e) {
      setMsg({ kind: "err", text: errorMessage(e, "No se pudo guardar") });
    } finally {
      setBusy(null);
    }
  }

  const passwordProblem =
    next && next.length < 8
      ? "La nueva contraseña debe tener al menos 8 caracteres."
      : next && repeat && next !== repeat
        ? "Las contraseñas nuevas no coinciden."
        : null;

  const logWeight = () => {
    const kg = Number(w);
    if (kg > 0) addWeight.mutate(kg, { onSuccess: () => setW("") });
  };

  return (
    <div className="pb-8">
      <PageHeader title="Mi perfil" subtitle={session?.user.email ?? ""} />

      <div className="space-y-4 p-4">
        {msg && (
          <p
            className={`rounded-lg px-3 py-2 text-sm ${
              msg.kind === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
            }`}
          >
            {msg.text}
          </p>
        )}

        <Section title="Datos personales">
          <div>
            <label className="label">Nombre completo</label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="label">Usuario</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value.trim())}
              autoCapitalize="none"
            />
            <p className="mt-1 text-xs text-slate-400">Se mantiene único. 3–24, letras/números/- /_.</p>
          </div>
          <div className="flex gap-2">
            <Button
              disabled={busy !== null || fullName === (authProfile?.full_name ?? "")}
              onClick={() => run("name", () => updateFullName(fullName), "Nombre actualizado.")}
            >
              {busy === "name" ? "Guardando…" : "Guardar nombre"}
            </Button>
            <Button
              variant="ghost"
              disabled={busy !== null || username === (authProfile?.username ?? "")}
              onClick={() =>
                run(
                  "user",
                  async () => {
                    const v = validateUsername(username);
                    if (!v.ok) throw new Error(v.error);
                    await changeUsername(username);
                  },
                  "Usuario actualizado.",
                )
              }
            >
              {busy === "user" ? "Guardando…" : "Guardar usuario"}
            </Button>
          </div>
        </Section>

        <Section title="Contraseña" hint="Te pedimos la actual para confirmar que sos vos.">
          <PasswordInput
            label="Contraseña actual"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <PasswordInput
              label="Nueva"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
            <PasswordInput
              label="Repetir"
              autoComplete="new-password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
            />
          </div>
          {passwordProblem && <p className="text-sm text-orange-500">{passwordProblem}</p>}
          <Button
            disabled={busy !== null || !current || !next || !repeat || Boolean(passwordProblem)}
            onClick={() =>
              run(
                "pass",
                async () => {
                  await changePassword(current, next);
                  setCurrent("");
                  setNext("");
                  setRepeat("");
                },
                "Contraseña actualizada.",
              )
            }
          >
            {busy === "pass" ? "Guardando…" : "Cambiar contraseña"}
          </Button>
        </Section>

        <Section title="Peso">
          <div className="flex gap-2">
            <Input type="number" placeholder="kg" value={w} onChange={(e) => setW(e.target.value)} className="flex-1" />
            <Button onClick={logWeight} disabled={addWeight.isPending}>
              Guardar
            </Button>
          </div>
          {weights.length > 0 && (
            <ul className="space-y-1 text-sm text-slate-600">
              {weights.slice(0, 6).map((wl) => (
                <li key={wl.id} className="flex items-center justify-between">
                  <span>{new Date(wl.logged_at).toLocaleDateString()}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-semibold">{wl.weight_kg} kg</span>
                    <button
                      onClick={() => deleteWeight.mutate(wl.id)}
                      disabled={deleteWeight.isPending}
                      className="text-slate-300 hover:text-red-500"
                      aria-label="Eliminar este registro de peso"
                    >
                      ✕
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {profile && (
          <Section title="Unidades">
            <div className="flex gap-2">
              {(["metric", "imperial"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => updateUnits.mutate({ units: u })}
                  disabled={updateUnits.isPending}
                  className={`flex-1 rounded-xl py-2 text-sm font-medium ring-1 ${
                    profile.units === u
                      ? "bg-green-600 text-white ring-green-600"
                      : "bg-white text-slate-600 ring-slate-200"
                  }`}
                >
                  {u === "metric" ? "Métrico (kg)" : "Imperial (lb)"}
                </button>
              ))}
            </div>
          </Section>
        )}

        <RemindersCard />

        <Link to="/goals" className="card block active:scale-[.98]">
          <div className="font-medium text-slate-800">Editar objetivo y metas</div>
          <div className="text-xs text-slate-400">Recalcular calorías y macros</div>
        </Link>

        <Link to="/activity" className="card block active:scale-[.98]">
          <div className="font-medium text-slate-800">Actualizar mi actividad</div>
          <div className="text-xs text-slate-400">Recalcular tu nivel con la IA (reinicia el chequeo mensual)</div>
        </Link>

        <Link to="/workouts" className="card block active:scale-[.98]">
          <div className="font-medium text-slate-800">Entrenamientos</div>
          <div className="text-xs text-slate-400">Registrar actividad y conectar dispositivos</div>
        </Link>

        <Link to="/export" className="card block active:scale-[.98]">
          <div className="font-medium text-slate-800">Exportar mis datos</div>
          <div className="text-xs text-slate-400">Descargar todo en CSV o JSON</div>
        </Link>

        <Link to="/help" className="card block active:scale-[.98]">
          <div className="font-medium text-slate-800">❓ Ayuda · Cómo usar la app</div>
          <div className="text-xs text-slate-400">Guía paso a paso de todo lo que podés hacer</div>
        </Link>

        <button onClick={signOut} className="w-full text-center text-sm text-red-400 underline">
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
