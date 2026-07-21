import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { signInWithIdentifier, signUpWithUsername, requestPasswordReset } from "./authApi";
import { validateUsername } from "@/lib/username";
import { Button } from "@titoapps/ui";
import { takePendingInvite } from "../groups/pendingInvite";
import { errorMessage } from "@/lib/errors";
import { PasswordInput } from "@/components/ui/PasswordInput";

type Mode = "login" | "signup" | "forgot";

export function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [identifier, setIdentifier] = useState(""); // login: email o username
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    if (!session) return;
    // Si venías de una invitación, volvemos ahí en vez de al inicio.
    const pending = takePendingInvite();
    nav(pending ? `/invitacion/${pending}` : "/", { replace: true });
  }, [session, nav]);

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
    } catch (err: unknown) {
      setFailed(true);
      setMsg(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <div className="text-5xl">⚽</div>
        <h1 className="mt-2 text-3xl font-extrabold text-pitch-600">GolPay</h1>
        <p className="text-gray-500">Organizá tu mejenga y cobrá sin perseguir a nadie.</p>
      </div>

      <form onSubmit={submit} className="card space-y-4">
        {mode === "login" && (
          <>
            <div>
              <label className="label">Correo o usuario</label>
              <input className="input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoCapitalize="none" required />
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
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value.trim())} autoCapitalize="none" placeholder="ej. tito" required />
              <p className="mt-1 text-xs text-gray-400">3–24, letras/números/- /_, sin espacios.</p>
            </div>
            <div>
              <label className="label">Correo</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
        )}

        {msg && (
          <p
            className={`rounded-lg px-3 py-2 text-sm ${
              failed ? "bg-red-50 text-red-600" : "bg-pitch-50 text-pitch-700"
            }`}
          >
            {msg}
          </p>
        )}
        <Button fullWidth disabled={busy}>
          {busy ? "…" : mode === "login" ? "Entrar" : mode === "signup" ? "Crear cuenta" : "Enviar enlace"}
        </Button>
      </form>

      <div className="mt-4 flex flex-col items-center gap-2 text-sm text-gray-500">
        {mode === "login" && (
          <>
            <button onClick={() => { setMode("signup"); setMsg(null); setFailed(false); }} className="underline">¿No tenés cuenta? Registrate</button>
            <button onClick={() => { setMode("forgot"); setMsg(null); setFailed(false); }} className="underline">¿Olvidaste tu contraseña?</button>
          </>
        )}
        {mode !== "login" && (
          <button onClick={() => { setMode("login"); setMsg(null); setFailed(false); }} className="underline">Volver a iniciar sesión</button>
        )}
      </div>
    </div>
  );
}
