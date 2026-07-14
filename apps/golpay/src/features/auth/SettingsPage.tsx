import { useState } from "react";
import { TopBar } from "@/components/ui/TopBar";
import { useAuth } from "./AuthProvider";
import { changeUsername } from "./authApi";
import { validateUsername } from "@/lib/username";
import { Button } from "@titoapps/ui";

export function SettingsPage() {
  const { profile, refreshProfile, signOut } = useAuth();
  const [username, setUsername] = useState(profile?.username ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const v = validateUsername(username);
      if (!v.ok) throw new Error(v.error);
      await changeUsername(username);
      await refreshProfile();
      setMsg("Usuario actualizado.");
    } catch (err: any) {
      setMsg(err.message ?? "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <TopBar title="Ajustes" back />
      <div className="space-y-4 p-4">
        <div className="card space-y-3">
          <div className="text-sm text-gray-500">{profile?.full_name}</div>
          <div>
            <label className="label">Usuario</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value.trim())} autoCapitalize="none" />
            <p className="mt-1 text-xs text-gray-400">Se mantiene único. 3–24, letras/números/- /_.</p>
          </div>
          {msg && <p className="text-sm text-pitch-600">{msg}</p>}
          <Button onClick={save} disabled={busy || username === profile?.username}>Guardar</Button>
        </div>
        <button onClick={signOut} className="w-full text-center text-sm text-red-400 underline">Cerrar sesión</button>
      </div>
    </div>
  );
}
