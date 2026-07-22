import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  console.warn(
    "[NutriCoach] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copiá .env.example a .env.local.",
  );
}

// Sin generic de Database: usamos nuestras interfaces de dominio (types.ts)
// y casteamos los resultados en cada api.ts (patrón del monorepo).
export const supabase = createClient(url ?? "", anonKey ?? "");
