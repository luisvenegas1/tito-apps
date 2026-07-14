import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "./AuthProvider";
import { useEffect } from "react";
import { Button } from "@titoapps/ui";

export function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    if (session) nav("/", { replace: true });
  }, [session, nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        setMsg("Revisá tu correo para confirmar la cuenta (si está activada la verificación).");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setMsg(err.message ?? "Error");
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
        {mode === "signup" && (
          <div>
            <label className="label">Nombre</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}
        <div>
          <label className="label">Correo</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label">Contraseña</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>
        {msg && <p className="text-sm text-pitch-600">{msg}</p>}
        <Button fullWidth disabled={busy}>
          {busy ? "…" : mode === "login" ? "Entrar" : "Crear cuenta"}
        </Button>
      </form>

      <button
        className="mt-4 text-center text-sm text-gray-500 underline"
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
      >
        {mode === "login" ? "¿No tenés cuenta? Registrate" : "¿Ya tenés cuenta? Entrá"}
      </button>
    </div>
  );
}
