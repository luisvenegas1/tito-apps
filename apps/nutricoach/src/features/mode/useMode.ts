import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthProvider";
import { useUpdateProfile } from "@/hooks/useProfile";
import type { NutritionMode } from "@/lib/supabase/types";

/**
 * Modo de uso de NutriCoach (Personal / Seguimiento Profesional).
 * La fuente de verdad es `profiles.nutrition_mode` (cargado en AuthProvider).
 * Cambiar de modo NO borra datos: cada modo conserva su propia configuración.
 */
export function useMode() {
  const { profile, refreshProfile } = useAuth();
  const update = useUpdateProfile();
  const qc = useQueryClient();

  const mode: NutritionMode | null = profile?.nutrition_mode ?? null;

  const setMode = async (m: NutritionMode) => {
    await update.mutateAsync({ nutrition_mode: m });
    await refreshProfile();
    // Refresca dashboards e historial para reflejar la nueva experiencia.
    qc.invalidateQueries();
  };

  return { mode, setMode, isSaving: update.isPending };
}
