import { useState, type FormEvent } from "react";
import { Button } from "@titoapps/ui";
import { supabase } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/errors";
import { PasswordInput } from "@/components/PasswordInput";

export function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(errorMessage(error));
    else setDone(true);
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md px-6 pt-16">
      <h1 className="text-2xl font-extrabold">Nueva contraseña</h1>
      {done ? (
        <>
          <p className="mt-4 text-muted">Listo, ya puedes usar tu nueva contraseña.</p>
          <a href="/" className="mt-6 inline-block font-semibold text-primary">Ir a Money Track</a>
        </>
      ) : (
        <>
          <label className="mt-6 block">
            <span className="label">Contraseña nueva</span>
            <PasswordInput minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
          </label>
          {error && <p role="alert" className="mt-3 text-sm text-deficit">{error}</p>}
          <Button type="submit" fullWidth className="mt-6">Guardar contraseña</Button>
        </>
      )}
    </form>
  );
}
