import { useState } from "react";
import { TopBar } from "@/components/ui/TopBar";
import { useAuth } from "./AuthProvider";
import { changeUsername, updateSinpe, updateFullName, changePassword } from "./authApi";
import { validateUsername } from "@/lib/username";
import { Button } from "@titoapps/ui";
import { errorMessage } from "@/lib/errors";

/** Iniciales para el avatar grande de la cabecera. */
function initials(name: string | null | undefined, fallback: string): string {
  const src = (name ?? "").trim() || fallback;
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-3">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function ProfilePage() {
  const { session, profile, refreshProfile, signOut } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [username, setUsername] = useState(profile?.username ?? "");
  const [sinpeNumber, setSinpeNumber] = useState(profile?.sinpe_number ?? "");
  const [sinpeName, setSinpeName] = useState(profile?.sinpe_name ?? "");

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");

  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  /** Corre una acción mostrando el resultado en un solo lugar. */
  async function run(key: string, fn: () => Promise<void>, okText: string) {
    setBusy(key);
    setMsg(null);
    try {
      await fn();
      await refreshProfile();
      setMsg({ kind: "ok", text: okText });
    } catch (e: any) {
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

  return (
    <div className="pb-8">
      <TopBar title="Mi perfil" back backTo="/" />

      <div className="space-y-4 p-4">
        {/* Cabecera */}
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-pitch-100 text-lg font-bold text-pitch-700 ring-1 ring-pitch-200">
            {initials(profile?.full_name, profile?.username ?? "?")}
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-bold">
              {profile?.full_name || profile?.username || "Mi cuenta"}
            </div>
            <div className="truncate text-sm text-gray-500">{session?.user.email}</div>
          </div>
        </div>

        {msg && (
          <p
            className={`rounded-lg px-3 py-2 text-sm ${
              msg.kind === "ok" ? "bg-pitch-50 text-pitch-700" : "bg-red-50 text-red-600"
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
            <p className="mt-1 text-xs text-gray-400">Se mantiene único. 3–24, letras/números/- /_.</p>
          </div>
          <div className="flex gap-2">
            <Button
              disabled={busy !== null || fullName === (profile?.full_name ?? "")}
              onClick={() => run("name", () => updateFullName(fullName), "Nombre actualizado.")}
            >
              {busy === "name" ? "Guardando…" : "Guardar nombre"}
            </Button>
            <Button
              variant="ghost"
              disabled={busy !== null || username === (profile?.username ?? "")}
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

        <Section
          title="SINPE Móvil"
          hint="Se le muestra al jugador con el monto exacto y botón de copiar. No asumimos ningún banco."
        >
          <div>
            <label className="label">Número SINPE</label>
            <input
              className="input"
              inputMode="numeric"
              value={sinpeNumber}
              onChange={(e) => setSinpeNumber(e.target.value)}
              placeholder="8888-8888"
            />
          </div>
          <div>
            <label className="label">Nombre (opcional)</label>
            <input className="input" value={sinpeName} onChange={(e) => setSinpeName(e.target.value)} />
          </div>
          <Button
            disabled={busy !== null}
            onClick={() => run("sinpe", () => updateSinpe(sinpeNumber, sinpeName), "SINPE actualizado.")}
          >
            {busy === "sinpe" ? "Guardando…" : "Guardar SINPE"}
          </Button>
        </Section>

        <Section title="Contraseña" hint="Te pedimos la actual para confirmar que sos vos.">
          <div>
            <label className="label">Contraseña actual</label>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Nueva</label>
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Repetir</label>
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
              />
            </div>
          </div>
          {passwordProblem && <p className="text-sm text-orange-500">{passwordProblem}</p>}
          <Button
            disabled={busy !== null || !current || !next || !repeat || Boolean(passwordProblem)}
            onClick={() =>
              run(
                "pass",
                async () => {
                  await changePassword(current, next);
                  setCurrent(""); setNext(""); setRepeat("");
                },
                "Contraseña actualizada.",
              )
            }
          >
            {busy === "pass" ? "Guardando…" : "Cambiar contraseña"}
          </Button>
        </Section>

        <button onClick={signOut} className="w-full text-center text-sm text-red-400 underline">
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
