import { useState } from "react";
import { Button } from "@titoapps/ui";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { validateUsername } from "@/lib/username";
import { errorMessage } from "@/lib/errors";
import { signInWithIdentifier, signUpWithUsername, requestPasswordReset } from "./authApi";

type Mode = "login" | "signup" | "forgot";

const TITLES: Record<Mode, { title: string; subtitle: string; cta: string }> = {
  login: { title: "Ingresar a la aplicación", subtitle: "Entrá con tu correo o usuario.", cta: "Entrar" },
  signup: { title: "Crear cuenta", subtitle: "Unite a NutriCoach en un minuto.", cta: "Crear cuenta" },
  forgot: { title: "Recuperar contraseña", subtitle: "Te enviamos un enlace por correo.", cta: "Enviar enlace" },
};

export function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [identifier, setIdentifier] = useState(""); // login: email o username
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const t = TITLES[mode];

  function switchTo(next: Mode) {
    setMode(next);
    setMsg(null);
    setFailed(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setFailed(false);
    try {
      if (mode === "login") {
        await signInWithIdentifier(identifier, password);
      } else if (mode === "signup") {
        const v = validateUsername(username);
        if (!v.ok) throw new Error(v.error);
        const { needsConfirmation } = await signUpWithUsername(email, password, username, name);
        setMsg(
          needsConfirmation
            ? "Revisá tu correo para confirmar la cuenta."
            : "¡Cuenta creada! Ya podés entrar.",
        );
      } else {
        await requestPasswordReset(email);
        setMsg("Si el correo existe, te enviamos un enlace para recuperar tu contraseña.");
      }
    } catch (err) {
      setFailed(true);
      setMsg(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell flex min-h-screen flex-col justify-center px-6">
      <div className="mb-6 text-center">
        {/* Logo oficial (tu ilustración). Respaldo al vector si faltara el PNG. */}
        <img
          src="/logo.png"
          onError={(e) => {
            e.currentTarget.src = "/logo.svg";
          }}
          alt="NutriCoach"
          className="mx-auto h-28 w-auto"
        />
        {/* Título pequeño que cambia según la página, para diferenciarlas. */}
        <p className="mt-3 text-base font-semibold text-slate-700">{t.title}</p>
        <p className="text-sm text-slate-400">{t.subtitle}</p>
      </div>

      <form onSubmit={submit} className="card space-y-4">
        {mode === "login" && (
          <>
            <div>
              <label className="label">Correo o usuario</label>
              <input
                className="input"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoCapitalize="none"
                required
              />
            </div>
            <PasswordInput
              label="Contraseña"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </>
        )}

        {mode === "signup" && (
          <>
            <div>
              <label className="label">Nombre</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Usuario</label>
              <input
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value.trim())}
                autoCapitalize="none"
                placeholder="ej. tito"
                required
              />
              <p className="mt-1 text-xs text-slate-400">3–24, letras/números/- /_, sin espacios.</p>
            </div>
            <div>
              <label className="label">Correo</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <PasswordInput
              label="Contraseña"
              autoComplete="new-password"
              hint="Mínimo 6 caracteres."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </>
        )}

        {mode === "forgot" && (
          <div>
            <label className="label">Correo</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        )}

        {msg && (
          <p
            className={`rounded-lg px-3 py-2 text-sm ${
              failed ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
            }`}
          >
            {msg}
          </p>
        )}
        <Button fullWidth disabled={busy}>
          {busy ? "…" : t.cta}
        </Button>
      </form>

      <div className="mt-4 flex flex-col items-center gap-2 text-sm text-slate-500">
        {mode === "login" && (
          <>
            <button onClick={() => switchTo("signup")} className="underline">
              ¿No tenés cuenta? Registrate
            </button>
            <button onClick={() => switchTo("forgot")} className="underline">
              ¿Olvidaste tu contraseña?
            </button>
          </>
        )}
        {mode !== "login" && (
          <button onClick={() => switchTo("login")} className="underline">
            Volver a iniciar sesión
          </button>
        )}
      </div>
    </div>
  );
}
