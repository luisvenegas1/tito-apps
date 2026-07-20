import { useState } from "react";
import { TopBar } from "@/components/ui/TopBar";
import { useAuth } from "./AuthProvider";
import { changeUsername, updateSinpe } from "./authApi";
import { validateUsername } from "@/lib/username";
import { Button } from "@titoapps/ui";

export function SettingsPage() {
  const { profile, refreshProfile, signOut } = useAuth();
  const [username, setUsername] = useState(profile?.username ?? "");
  const [sinpeNumber, setSinpeNumber] = useState(profile?.sinpe_number ?? "");
  const [sinpeName, setSinpeName] = useState(profile?.sinpe_name ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveSinpe() {
    setBusy(true); setMsg(null);
    try {
      await updateSinpe(sinpeNumber, sinpeName);
      await refreshProfile();
      setMsg("SINPE actualizado.");
    } catch (err: any) {
      setMsg(err.message ?? "Error");
    } finally {
      setBusy(false);
    }
  }

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
      <TopBar title="Ajustes" back backTo="/" />
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

        <div className="card space-y-3">
          <div className="font-semibold">SINPE Móvil</div>
          <p className="text-xs text-gray-400">Se muestra al jugador con el monto exacto y botón de copiar. No asumimos ningún banco.</p>
          <div>
            <label className="label">Número SINPE</label>
            <input className="input" inputMode="numeric" value={sinpeNumber} onChange={(e) => setSinpeNumber(e.target.value)} placeholder="8888-8888" />
          </div>
          <div>
            <label className="label">Nombre (opcional)</label>
            <input className="input" value={sinpeName} onChange={(e) => setSinpeName(e.target.value)} />
          </div>
          <Button onClick={saveSinpe} disabled={busy}>Guardar SINPE</Button>
        </div>

        <button onClick={signOut} className="w-full text-center text-sm text-red-400 underline">Cerrar sesión</button>
      </div>
    </div>
  );
}
