import { useState } from "react";
import { Button } from "@titoapps/ui";
import { supabase } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/ui/PasswordInput";

/** Página a la que redirige el enlace de recuperación (redirectTo=/reset). */
export function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMsg("Contraseña actualizada. Redirigiendo…");
      setTimeout(() => {
        window.location.href = "/";
      }, 1200);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "El enlace expiró o no es válido. Pedí uno nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell flex min-h-screen flex-col justify-center px-6">
      <h1 className="mb-4 text-center text-2xl font-extrabold text-green-700">Nueva contraseña</h1>
      <form onSubmit={save} className="card space-y-4">
        <PasswordInput
          label="Nueva contraseña"
          autoComplete="new-password"
          hint="Mínimo 6 caracteres."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        {msg && <p className="text-sm text-green-700">{msg}</p>}
        <Button fullWidth disabled={busy}>
          Guardar
        </Button>
      </form>
    </div>
  );
}
