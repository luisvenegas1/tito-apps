import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, PageHeader, Input } from "@titoapps/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useAddWeight, useWeights } from "@/features/health/useHealth";

export function ProfilePage() {
  const { session, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: weights = [] } = useWeights();
  const addWeight = useAddWeight();
  const updateProfile = useUpdateProfile();
  const [w, setW] = useState("");

  const logWeight = () => {
    const kg = Number(w);
    if (kg > 0) addWeight.mutate(kg, { onSuccess: () => setW("") });
  };

  return (
    <div className="p-4">
      <PageHeader title="Perfil" subtitle={session?.user.email ?? ""} />

      <div className="mt-4 space-y-3">
        <div className="card">
          <div className="metric-label mb-2">Registrar peso de hoy</div>
          <div className="flex gap-2">
            <Input type="number" placeholder="kg" value={w} onChange={(e) => setW(e.target.value)} className="flex-1" />
            <Button onClick={logWeight} disabled={addWeight.isPending}>
              Guardar
            </Button>
          </div>
        </div>

        <div className="card">
          <div className="metric-label mb-2">Historial de peso</div>
          {weights.length === 0 ? (
            <p className="text-sm text-slate-400">Aún no registrás tu peso.</p>
          ) : (
            <ul className="space-y-1 text-sm text-slate-600">
              {weights.slice(0, 8).map((wl) => (
                <li key={wl.id} className="flex justify-between">
                  <span>{new Date(wl.logged_at).toLocaleDateString()}</span>
                  <span className="font-semibold">{wl.weight_kg} kg</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link to="/goals" className="card block active:scale-[.98]">
          <div className="font-medium text-slate-800">Editar objetivo y metas</div>
          <div className="text-xs text-slate-400">Recalcular calorías y macros</div>
        </Link>

        <Link to="/workouts" className="card block active:scale-[.98]">
          <div className="font-medium text-slate-800">Entrenamientos</div>
          <div className="text-xs text-slate-400">Registrar actividad y conectar dispositivos</div>
        </Link>

        <Link to="/export" className="card block active:scale-[.98]">
          <div className="font-medium text-slate-800">Exportar mis datos</div>
          <div className="text-xs text-slate-400">Descargar todo en CSV o JSON</div>
        </Link>

        {profile && (
          <div className="card">
            <div className="metric-label mb-2">Unidades</div>
            <div className="flex gap-2">
              {(["metric", "imperial"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => updateProfile.mutate({ units: u })}
                  disabled={updateProfile.isPending}
                  className={`flex-1 rounded-xl py-2 text-sm font-medium ring-1 ${
                    profile.units === u
                      ? "bg-green-600 text-white ring-green-600"
                      : "bg-white text-slate-600 ring-slate-200"
                  }`}
                >
                  {u === "metric" ? "Métrico (kg)" : "Imperial (lb)"}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">Tus datos se guardan de forma privada (RLS activo).</p>
          </div>
        )}

        <Button variant="secondary" className="w-full" onClick={() => signOut()}>
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
