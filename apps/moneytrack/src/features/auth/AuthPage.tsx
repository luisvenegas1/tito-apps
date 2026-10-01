import { useState, type FormEvent } from "react";
import { Button, Input } from "@titoapps/ui";
import { supabase } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/errors";

type Mode = "login" | "signup" | "forgot";

/** Entrar, crear cuenta o recuperar contraseña. `presetEmail` llega desde una invitación. */
export function AuthPage({ presetEmail, intro }: { presetEmail?: string; intro?: string }) {
  const [mode, setMode] = useState<Mode>(presetEmail ? "signup" : "login");
  const [email, setEmail] = useState(presetEmail ?? "");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim() }, emailRedirectTo: window.location.href },
        });
        if (error) throw error;
        if (!data.session) setNotice("Te enviamos un correo para confirmar tu cuenta. Ábrelo y vuelve aquí.");
      } else {
        await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset` });
        setNotice("Si ese correo tiene cuenta, te llegará un enlace para cambiar la contraseña.");
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "login" ? "Entrar" : mode === "signup" ? "Crear cuenta" : "Recuperar contraseña";

  return (
    <div className="flex min-h-screen flex-col">
      <div className="hero px-6 pb-10 pt-14 text-white">
        <img src="/icon.svg" alt="" className="h-14 w-14 rounded-2xl ring-1 ring-white/10" />
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Money Track</h1>
        <p className="mt-2 max-w-xs text-white/70">{intro ?? "Lo que entra, lo que sale y lo que te deben, en un solo lugar."}</p>
      </div>

      <form onSubmit={submit} className="mx-auto -mt-5 w-full max-w-md flex-1 rounded-t-3xl bg-bg px-6 pt-7">
        <h2 className="text-xl font-bold">{title}</h2>
        <div className="mt-5 space-y-4">
          {mode === "signup" && (
            <label className="block">
              <span className="label">Tu nombre</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" required />
            </label>
          )}
          <label className="block">
            <span className="label">Correo</span>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              readOnly={Boolean(presetEmail)}
            />
          </label>
          {mode !== "forgot" && (
            <label className="block">
              <span className="label">Contraseña</span>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={6}
                required
              />
            </label>
          )}
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl bg-deficit/10 px-3 py-2 text-sm text-deficit">{error}</p>}
        {notice && <p className="mt-4 rounded-xl bg-mint/40 px-3 py-2 text-sm text-teal-deep">{notice}</p>}

        <Button type="submit" fullWidth size="lg" className="mt-6" disabled={busy}>
          {busy ? "Un momento…" : title}
        </Button>

        <div className="mt-6 flex flex-col items-center gap-3 pb-10 text-sm">
          {mode === "login" && (
            <>
              <button type="button" className="font-semibold text-primary" onClick={() => setMode("signup")}>
                No tengo cuenta: crear una
              </button>
              <button type="button" className="text-muted" onClick={() => setMode("forgot")}>
                Olvidé mi contraseña
              </button>
            </>
          )}
          {mode !== "login" && (
            <button type="button" className="font-semibold text-primary" onClick={() => setMode("login")}>
              Ya tengo cuenta: entrar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
