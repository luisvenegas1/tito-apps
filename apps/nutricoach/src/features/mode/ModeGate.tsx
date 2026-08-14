import { Spinner } from "@titoapps/ui";
import { useMode } from "./useMode";
import { ModeSelect } from "./ModeSelect";

/**
 * Onboarding del modo: se muestra una sola vez, cuando el usuario aún no eligió
 * cómo quiere usar NutriCoach. Al elegir, se guarda en el perfil y entra a la app.
 */
export function ModeGate() {
  const { setMode, isSaving } = useMode();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <div className="text-center">
        <div className="text-4xl">🍎</div>
        <h1 className="mt-2 text-2xl font-bold text-slate-800">NutriCoach</h1>
        <p className="mt-1 text-slate-500">¿Cómo querés trabajar con tu alimentación?</p>
      </div>

      <ModeSelect disabled={isSaving} onSelect={(m) => void setMode(m)} />

      {isSaving && (
        <div className="flex items-center justify-center gap-2 text-slate-500">
          <Spinner /> Preparando tu experiencia…
        </div>
      )}

      <p className="text-center text-xs text-slate-400">
        Podés cambiar de modo cuando quieras desde Perfil. No se pierde ningún dato.
      </p>
    </div>
  );
}
