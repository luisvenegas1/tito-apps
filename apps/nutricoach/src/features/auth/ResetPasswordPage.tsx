import { useState, useEffect } from "react";
import { Button } from "@titoapps/ui";
import { supabase } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { errorMessage } from "@/lib/errors";

/** Lee el motivo de error que Supabase deja en el hash del enlace vencido/inválido. */
function linkErrorFromHash(): boolean {
  const h = window.location.hash?.startsWith("#") ? window.location.hash.slice(1) : "";
  if (!h) return false;
  const p = new URLSearchParams(h);
  return !!(p.get("error") || p.get("error_code"));
}

/** Página a la que redirige el enlace de recuperación (redirectTo=/reset). */
export function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  // Si el enlace vino vencido/inválido, Supabase lo indica en el hash de la URL.
  const [linkInvalid, setLinkInvalid] = useState(false);

  useEffect(() => {
    if (linkErrorFromHash()) setLinkInvalid(true);
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setFailed(false);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMsg("¡Contraseña actualizada! Redirigiendo…");
      setTimeout(() => {
        window.location.href = "/";
      }, 1200);
    } catch (err) {
      // Sin sesión de recuperación válida = enlace vencido/usado: mostramos el estado claro.
      setLinkInvalid(true);
      setFailed(true);
      setMsg(errorMessage(err, "El enlace expiró o no es válido. Pedí uno nuevo."));
    } finally {
      setBusy(false);
    }
  }

  // Estado claro cuando el enlace ya no sirve.
  if (linkInvalid) {
    return (
      <div className="app-shell flex min-h-screen flex-col justify-center px-6">
        <div className="card mx-auto max-w-sm text-center">
          <div className="text-4xl">⏰</div>
          <h1 className="mt-2 text-xl font-extrabold text-green-700">Este enlace ya no es válido</h1>
          <p className="mt-2 text-sm text-slate-500">
            El enlace de recuperación venció o ya se usó (por ejemplo, si pediste otro más nuevo). Por seguridad,
            cada enlace sirve una sola vez y por tiempo limitado.
          </p>
          <a
            href="/"
            className="mt-5 inline-block rounded-token bg-primary px-5 py-2.5 font-semibold text-primary-contrast active:scale-[.98]"
          >
            Solicitar un enlace nuevo
          </a>
          <p className="mt-3 text-xs text-slate-400">
            En la pantalla de ingreso, tocá “¿Olvidaste tu contraseña?” para recibir uno nuevo.
          </p>
        </div>
      </div>
    );
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
        {msg && <p className={`text-sm ${failed ? "text-red-600" : "text-green-700"}`}>{msg}</p>}
        <Button fullWidth disabled={busy}>
          {busy ? "Guardando…" : "Guardar"}
        </Button>
      </form>
    </div>
  );
}
