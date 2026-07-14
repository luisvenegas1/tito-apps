import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@titoapps/ui";

/** Página a la que redirige el enlace de recuperación (redirectTo=/reset). */
export function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMsg("Contraseña actualizada. Redirigiendo…");
      setTimeout(() => nav("/", { replace: true }), 1200);
    } catch (err: any) {
      setMsg(err.message ?? "El enlace expiró o no es válido. Pedí uno nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center px-6">
      <h1 className="mb-4 text-center text-2xl font-extrabold text-pitch-600">Nueva contraseña</h1>
      <form onSubmit={save} className="card space-y-4">
        <div>
          <label className="label">Nueva contraseña</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
        </div>
        {msg && <p className="text-sm text-pitch-600">{msg}</p>}
        <Button fullWidth disabled={busy}>Guardar</Button>
      </form>
    </div>
  );
}
