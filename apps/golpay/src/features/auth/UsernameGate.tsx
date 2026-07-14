import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { changeUsername } from "./authApi";
import { validateUsername } from "@/lib/username";
import { Button } from "@titoapps/ui";

/** Se muestra cuando el organizador todavía no tiene username (cuentas legadas). */
export function UsernameGate() {
  const { refreshProfile, signOut } = useAuth();
  const [username, setUsername] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const v = validateUsername(username);
      if (!v.ok) throw new Error(v.error);
      await changeUsername(username);
      await refreshProfile();
    } catch (err: any) {
      setMsg(err.message ?? "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center px-6">
      <div className="mb-6 text-center">
        <div className="text-4xl">👋</div>
        <h1 className="mt-2 text-2xl font-extrabold text-pitch-600">Elegí tu usuario</h1>
        <p className="text-gray-500">Vas a poder entrar con tu correo o con este usuario.</p>
      </div>
      <form onSubmit={save} className="card space-y-4">
        <div>
          <label className="label">Usuario</label>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value.trim())} autoCapitalize="none" placeholder="ej. tito" required />
          <p className="mt-1 text-xs text-gray-400">3–24, letras/números/- /_, sin espacios.</p>
        </div>
        {msg && <p className="text-sm text-orange-500">{msg}</p>}
        <Button fullWidth disabled={busy}>{busy ? "…" : "Guardar usuario"}</Button>
      </form>
      <button onClick={signOut} className="mt-4 text-center text-sm text-gray-400 underline">Salir</button>
    </div>
  );
}
